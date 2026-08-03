import type { CropKnowledge } from '../../crop-recommendation/knowledge/schemas/crop-knowledge.schema.js';
import type { CropKnowledgeService } from '../../crop-recommendation/services/crop-knowledge.service.js';
import { CropPhysicalCompatibilityEngine } from '../../crop-physical-compatibility/services/crop-physical-compatibility.engine.js';
import { resolveCropPhysicalCompatibilityCalibration } from '../../crop-physical-compatibility/constants/crop-physical-compatibility-calibration.js';
import type { ParcelPhysicalEvidence } from '../../crop-physical-compatibility/types/crop-physical-compatibility.types.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import { currentPersistenceMeta } from '../../database/persistence-factory.js';
import type { CalibrationManagementRepository } from '../repositories/calibration-management.repository.js';
import type {
  CropRequirementProfile,
  ExpertActor,
} from '../types/calibration-management.types.js';
import {
  CalibrationAuditService,
  CropRequirementProfileService,
} from './crop-requirement-profile.service.js';

export {
  defaultUnvalidatedSource,
  requirementSupportPaths,
} from './calibration-validation.helpers.js';

/** Deterministic Güngürge-like fixture for impact analysis when no parcels provided. */
export function defaultImpactEvidence(): ParcelPhysicalEvidence {
  return {
    terrainReal: true,
    terrainMock: false,
    terrain: {
      provider: 'copernicus-dem',
      dataset: 'COPERNICUS_30',
      meanSlopePercent: 5.7,
      p90SlopePercent: 6.4,
      maximumSlopePercent: 6.7,
      ruggednessClass: 'low',
      mechanization: 'suitable',
      coverageStatus: 'complete',
      spatialConfidence: 'high',
    },
    field: {
      surveyId: 'impact-fixture',
      rootableSoilDepth: {
        verified: true,
        minimumCm: 28,
        meanCm: 34.2,
        medianCm: 35,
        maximumCm: 40,
        measurementCount: 5,
        confidence: 'medium',
      },
      surfaceStoniness: 'medium',
      bedrockOutcrop: 'not_observed',
      machineAccess: 'verified_accessible',
      drainage: 'adequate',
    },
    surface: {
      providerReal: true,
      probableRockClassification: 'low',
      probableRockScore: 5,
    },
    soilMock: false,
    soilProvider: 'soilgrids',
  };
}

export class ImpactAnalysisService {
  private readonly profiles: CropRequirementProfileService;
  private readonly audit: CalibrationAuditService;
  private readonly engine = new CropPhysicalCompatibilityEngine();
  private readonly calibration = new ScoreCalibrationService();

  constructor(
    private readonly repo: CalibrationManagementRepository,
    private readonly cropKnowledge: CropKnowledgeService,
  ) {
    this.profiles = new CropRequirementProfileService(repo);
    this.audit = new CalibrationAuditService(repo);
  }

  async run(input: {
    profileId: string;
    actor: ExpertActor;
    cropIds?: string[];
    includeDetails?: boolean;
    existingScores?: Record<string, { score: number; rank: number }>;
  }) {
    const candidate = await this.profiles.getById(input.profileId);
    const crop = this.cropKnowledge.getById(candidate.cropId);
    const baselinePublished = await this.repo.findActivePublishedByCropId(
      candidate.cropId,
    );

    await this.audit.record({
      type: 'IMPACT_ANALYSIS_STARTED',
      actor: input.actor,
      profileId: candidate.id,
      cropId: candidate.cropId,
      reason: 'Dry-run impact analysis',
    });

    const evidence = defaultImpactEvidence();
    const calibProfile = this.calibration.getProfile();
    const compatCal = resolveCropPhysicalCompatibilityCalibration(
      calibProfile.cropPhysicalCompatibility,
    );

    const baselineCrop: CropKnowledge = baselinePublished
      ? ({
          ...crop,
          physicalRequirements: baselinePublished.requirements,
        } as CropKnowledge)
      : crop;

    const candidateCrop: CropKnowledge = {
      ...crop,
      physicalRequirements: candidate.requirements,
    } as CropKnowledge;

    const score = input.existingScores?.[candidate.cropId]?.score ?? null;
    const rank = input.existingScores?.[candidate.cropId]?.rank ?? null;

    const baselineResult = this.engine.evaluateCrop({
      crop: baselineCrop,
      evidence,
      calibration: compatCal,
      calibrationVersion: calibProfile.version,
      existingScore: score,
    }).result;

    const candidateResult = this.engine.evaluateCrop({
      crop: candidateCrop,
      evidence,
      calibration: compatCal,
      calibrationVersion: calibProfile.version,
      existingScore: score,
    }).result;

    const changedComponents: string[] = [];
    const componentKeys = [
      'rootableSoilDepth',
      'slope',
      'ruggedness',
      'surfaceStoniness',
      'bedrockOutcrop',
      'drainage',
    ] as const;
    for (const key of componentKeys) {
      if (
        baselineResult.components[key].classification !==
        candidateResult.components[key].classification
      ) {
        changedComponents.push(key);
      }
    }
    if (
      baselineResult.components.mechanization.combined !==
      candidateResult.components.mechanization.combined
    ) {
      changedComponents.push('mechanization');
    }

    const classificationChanged =
      baselineResult.classification !== candidateResult.classification;
    const confidenceChanged =
      baselineResult.confidence !== candidateResult.confidence;

    const comparison = {
      parcel: {
        label: 'Güngürge 108/7 fixture',
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      cropId: candidate.cropId,
      baseline: {
        classification: baselineResult.classification,
        confidence: baselineResult.confidence,
        matchedRule: baselineResult.audit.matchedOverallRule.code,
        ...(input.includeDetails ? { result: baselineResult } : {}),
      },
      candidate: {
        classification: candidateResult.classification,
        confidence: candidateResult.confidence,
        matchedRule: candidateResult.audit.matchedOverallRule.code,
        ...(input.includeDetails ? { result: candidateResult } : {}),
      },
      changed: classificationChanged || changedComponents.length > 0,
      changedComponents,
      scoreBefore: score,
      scoreAfter: score,
      rankBefore: rank,
      rankAfter: rank,
    };

    const summary = {
      totalComparisons: 1,
      classificationChangedCount: classificationChanged ? 1 : 0,
      confidenceChangedCount: confidenceChanged ? 1 : 0,
      scoreChangedCount: 0,
      rankChangedCount: 0,
      completedAt: new Date().toISOString(),
      fixtureCount: 1,
    };

    const now = summary.completedAt;
    const updated: CropRequirementProfile = {
      ...candidate,
      impactAnalysis: { ...summary, completedAt: now },
      updatedAt: now,
    };

    await this.repo.updateProfile(updated);
    await this.audit.record({
      type: 'IMPACT_ANALYSIS_COMPLETED',
      actor: input.actor,
      profileId: candidate.id,
      cropId: candidate.cropId,
      reason: 'Dry-run impact analysis completed',
      metadata: summary,
    });

    return {
      profile: {
        id: candidate.id,
        cropId: candidate.cropId,
        version: candidate.version,
        status: candidate.status,
      },
      baselineProfile: baselinePublished
        ? {
            id: baselinePublished.id,
            version: baselinePublished.version,
            status: baselinePublished.status,
            source: 'published',
          }
        : {
            id: null,
            version: null,
            status: 'static_fallback',
            source: 'static_unvalidated_fallback',
          },
      comparisons: [comparison],
      summary,
      persistence: {
        type: currentPersistenceMeta().type,
        durable: currentPersistenceMeta().durable,
        provider: currentPersistenceMeta().provider,
      },
    };
  }
}

export class ProfileComparisonService {
  constructor(private readonly profiles: CropRequirementProfileService) {}

  async compare(id: string, otherId: string) {
    const a = await this.profiles.getById(id);
    const b = await this.profiles.getById(otherId);
    const reqA = (a.requirements ?? {}) as Record<string, unknown>;
    const reqB = (b.requirements ?? {}) as Record<string, unknown>;

    const paths = new Set([...Object.keys(reqA), ...Object.keys(reqB)]);
    const changes: Array<{
      path: string;
      type:
        | 'added'
        | 'removed'
        | 'increased'
        | 'decreased'
        | 'status_changed'
        | 'source_changed'
        | 'unchanged';
      left: unknown;
      right: unknown;
    }> = [];

    for (const path of paths) {
      if (['source', 'validationStatus', 'notes'].includes(path)) continue;
      const left = reqA[path];
      const right = reqB[path];
      if (left === undefined && right !== undefined) {
        changes.push({ path, type: 'added', left, right });
      } else if (left !== undefined && right === undefined) {
        changes.push({ path, type: 'removed', left, right });
      } else if (JSON.stringify(left) === JSON.stringify(right)) {
        changes.push({ path, type: 'unchanged', left, right });
      } else {
        const lMin = (left as { minimumCm?: number })?.minimumCm;
        const rMin = (right as { minimumCm?: number })?.minimumCm;
        if (typeof lMin === 'number' && typeof rMin === 'number') {
          changes.push({
            path,
            type: rMin > lMin ? 'increased' : 'decreased',
            left,
            right,
          });
        } else {
          changes.push({ path, type: 'status_changed', left, right });
        }
      }
    }

    const statusChanges = Object.keys(a.fieldValidationStatus).map((field) => ({
      path: `fieldValidationStatus.${field}`,
      type:
        a.fieldValidationStatus[field as keyof typeof a.fieldValidationStatus] ===
        b.fieldValidationStatus[field as keyof typeof b.fieldValidationStatus]
          ? ('unchanged' as const)
          : ('status_changed' as const),
      left: a.fieldValidationStatus[field as keyof typeof a.fieldValidationStatus],
      right: b.fieldValidationStatus[field as keyof typeof b.fieldValidationStatus],
    }));

    return {
      left: { id: a.id, cropId: a.cropId, version: a.version, status: a.status },
      right: { id: b.id, cropId: b.cropId, version: b.version, status: b.status },
      requirementChanges: changes,
      validationStatusChanges: statusChanges,
      sourceCount: { left: a.sources.length, right: b.sources.length },
      reviewCount: { left: a.reviews.length, right: b.reviews.length },
    };
  }
}
