import type { CropKnowledge } from '../../crop-recommendation/knowledge/schemas/crop-knowledge.schema.js';
import {
  resolveCropPhysicalCompatibilityCalibration,
  type CropPhysicalCompatibilityCalibration,
} from '../constants/crop-physical-compatibility-calibration.js';
import type {
  CompatibilityFactor,
  CropPhysicalCompatibilityCheck,
  CropPhysicalCompatibilityResult,
  ParcelPhysicalEvidence,
} from '../types/crop-physical-compatibility.types.js';
import { CropRequirementResolutionService } from './crop-requirement-resolution.service.js';
import { DepthCompatibilityService } from './depth-compatibility.service.js';
import { TerrainCompatibilityService } from './terrain-compatibility.service.js';
import {
  BedrockCompatibilityService,
  DrainageCompatibilityService,
  MechanizationCompatibilityService,
  StoninessCompatibilityService,
} from './stoniness-compatibility.service.js';
import {
  CompatibilityConfidenceService,
  OverallClassificationService,
} from './compatibility-confidence.service.js';
import {
  CompatibilityAuditService,
  CompatibilityValidationService,
  buildConflicts,
} from './compatibility-validation.service.js';

export class CropPhysicalCompatibilityEngine {
  constructor(
    private readonly requirements = new CropRequirementResolutionService(),
    private readonly depth = new DepthCompatibilityService(),
    private readonly terrain = new TerrainCompatibilityService(),
    private readonly stoniness = new StoninessCompatibilityService(),
    private readonly bedrock = new BedrockCompatibilityService(),
    private readonly mechanization = new MechanizationCompatibilityService(),
    private readonly drainage = new DrainageCompatibilityService(),
    private readonly confidence = new CompatibilityConfidenceService(),
    private readonly overall = new OverallClassificationService(),
    private readonly audit = new CompatibilityAuditService(),
    private readonly validation = new CompatibilityValidationService(),
  ) {}

  evaluateCrop(input: {
    crop: CropKnowledge;
    evidence: ParcelPhysicalEvidence;
    calibration: CropPhysicalCompatibilityCalibration;
    calibrationVersion: string;
    existingScore: number | null;
  }): {
    result: CropPhysicalCompatibilityResult;
    checks: CropPhysicalCompatibilityCheck[];
  } {
    const resolved = this.requirements.resolve(input.crop);
    const ignoredEvidence: CompatibilityFactor[] = [];

    if (input.evidence.terrainMock) {
      ignoredEvidence.push({
        code: 'MOCK_TERRAIN_NOT_USED',
        reason: 'Mock DEM cannot support crop physical compatibility.',
      });
    }
    if (input.evidence.soilMock) {
      ignoredEvidence.push({
        code: 'MOCK_SOIL_NOT_USED',
        reason: 'Mock soil cannot verify depth or drainage.',
      });
    }

    if (!resolved.valid || !resolved.requirements) {
      const unknownComponent = {
        classification: 'unknown' as const,
        importance: 'high' as const,
        observedValue: null,
        requirement: null,
        source: 'unavailable',
        sourceType: 'unknown',
        confidence: 'unknown' as const,
        matchedRule: 'REQUIREMENTS_INVALID_OR_MISSING',
        message: resolved.issues.join('; ') || 'Requirements missing',
      };
      const mech = {
        terrain: { classification: null, source: 'unavailable' },
        fieldAccess: { classification: null, source: 'unavailable' },
        combined: 'unknown' as const,
        conflict: false,
        component: unknownComponent,
      };
      const partial = {
        classification: 'insufficient_data' as const,
        confidence: 'insufficient' as const,
        recommendationImpactApplied: false as const,
        components: {
          rootableSoilDepth: unknownComponent,
          slope: unknownComponent,
          ruggedness: unknownComponent,
          mechanization: mech,
          surfaceStoniness: unknownComponent,
          bedrockOutcrop: unknownComponent,
          drainage: unknownComponent,
        },
        supportingFactors: [] as CompatibilityFactor[],
        limitingFactors: [] as CompatibilityFactor[],
        unknownFactors: [
          {
            code: 'CROP_PHYSICAL_REQUIREMENTS_INVALID',
            severity: 'critical' as const,
            message: resolved.issues.join('; '),
          },
        ],
        ignoredEvidence,
        requiredFieldChecks: [],
        conflicts: [],
      };
      const audit = this.audit.build({
        cropId: input.crop.id,
        result: partial,
        existingScore: input.existingScore,
        calibrationVersion: input.calibrationVersion,
        requirementsKeys: [],
      });
      audit.matchedOverallRule = {
        code: 'REQUIREMENTS_INVALID_OR_MISSING',
        inputs: { issues: resolved.issues },
        result: 'insufficient_data',
      };
      const result: CropPhysicalCompatibilityResult = { ...partial, audit };
      return {
        result,
        checks: this.validation.buildChecks({
          cropId: input.crop.id,
          resolved,
          result,
          evidence: input.evidence,
        }),
      };
    }

    const req = resolved.requirements;
    const depthC = this.depth.evaluate(req, input.evidence);
    const slopeC = this.terrain.evaluateSlope(
      req,
      input.evidence,
      input.calibration,
    );
    const ruggedC = this.terrain.evaluateRuggedness(req, input.evidence);
    const stoneC = this.stoniness.evaluate(req, input.evidence);
    const bedrockC = this.bedrock.evaluate(req, input.evidence);
    const mech = this.mechanization.evaluate(req, input.evidence);
    const drainC = this.drainage.evaluate(req, input.evidence);

    const componentList = [
      depthC,
      slopeC,
      ruggedC,
      mech.component,
      stoneC,
      bedrockC,
      drainC,
    ];

    const conflicts = buildConflicts(
      input.evidence,
      mech.conflict,
      depthC,
    );

    const conf = this.confidence.resolve({
      components: componentList,
      evidence: input.evidence,
      calibration: input.calibration,
      requirementsComplete: resolved.complete,
      requirementsValidated: resolved.validationStatus === 'validated',
      hasConflict: conflicts.some((c) => c.code !== 'FIELD_AND_TERRAIN_EVIDENCE_CONSISTENT'),
    });

    const overall = this.overall.classify({
      components: componentList,
      confidence: conf,
      calibration: input.calibration,
      requirementsComplete: resolved.complete,
      requirementsValidated: resolved.validationStatus === 'validated',
    });

    const supportingFactors: CompatibilityFactor[] = [];
    const limitingFactors: CompatibilityFactor[] = [];
    const unknownFactors: CompatibilityFactor[] = [];

    for (const c of componentList) {
      if (c.classification === 'preferred' || c.classification === 'acceptable') {
        supportingFactors.push({
          code: c.matchedRule,
          severity: 'supporting',
          message: c.message,
          source: c.source,
          observedValue:
            typeof c.observedValue === 'string' || typeof c.observedValue === 'number'
              ? c.observedValue
              : null,
        });
      } else if (
        c.classification === 'limited' ||
        c.classification === 'strongly_limited'
      ) {
        limitingFactors.push({
          code: c.matchedRule,
          severity: c.classification === 'strongly_limited' ? 'critical' : 'important',
          message: c.message,
          source: c.source,
        });
      } else if (c.classification === 'unknown') {
        unknownFactors.push({
          code: c.matchedRule,
          severity: 'important',
          message: c.message,
          requiresFieldVerification: true,
        });
      } else if (c.classification === 'caution') {
        limitingFactors.push({
          code: c.matchedRule,
          severity: 'important',
          message: c.message,
          source: c.source,
        });
      }
    }

    for (const conflict of conflicts) {
      if (conflict.code === 'FIELD_AND_TERRAIN_EVIDENCE_CONSISTENT') {
        supportingFactors.push(conflict);
      }
    }

    const requiredFieldChecks: CropPhysicalCompatibilityResult['requiredFieldChecks'] =
      [];
    if (depthC.classification === 'unknown') {
      requiredFieldChecks.push({
        code: 'ROOTABLE_SOIL_DEPTH_MEASUREMENT',
        priority: 'high',
        required: true,
        reason: 'Köklenebilir derinlik doğrulanmalı.',
      });
    }
    if (stoneC.classification === 'unknown') {
      requiredFieldChecks.push({
        code: 'SURFACE_STONINESS_INSPECTION',
        priority: 'medium',
        required: false,
        reason: 'Yüzey taşlılığı saha ile doğrulanmalı.',
      });
    }
    if (drainC.classification === 'unknown') {
      requiredFieldChecks.push({
        code: 'DRAINAGE_FIELD_INSPECTION',
        priority: 'routine',
        required: false,
        reason: 'Drenaj saha gözlemi önerilir.',
      });
    }

    const partial = {
      classification: overall.classification,
      confidence: conf,
      recommendationImpactApplied: false as const,
      components: {
        rootableSoilDepth: depthC,
        slope: slopeC,
        ruggedness: ruggedC,
        mechanization: mech,
        surfaceStoniness: stoneC,
        bedrockOutcrop: bedrockC,
        drainage: drainC,
      },
      supportingFactors: dedupe(supportingFactors),
      limitingFactors: dedupe(limitingFactors),
      unknownFactors: dedupe(unknownFactors),
      ignoredEvidence: dedupe(ignoredEvidence),
      requiredFieldChecks,
      conflicts,
    };

    const audit = this.audit.build({
      cropId: input.crop.id,
      result: partial,
      existingScore: input.existingScore,
      calibrationVersion: input.calibrationVersion,
      requirementsKeys: Object.keys(req).filter(
        (k) => !['source', 'validationStatus', 'notes'].includes(k),
      ),
    });
    audit.overallRulesEvaluated = overall.evaluatedRules;
    audit.matchedOverallRule = {
      code: overall.matchedRule,
      inputs: {
        classification: overall.classification,
        confidence: conf,
      },
      result: overall.classification,
    };

    const result: CropPhysicalCompatibilityResult = { ...partial, audit };
    return {
      result,
      checks: this.validation.buildChecks({
        cropId: input.crop.id,
        resolved,
        result,
        evidence: input.evidence,
      }),
    };
  }
}

function dedupe(items: CompatibilityFactor[]): CompatibilityFactor[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.code)) return false;
    seen.add(i.code);
    return true;
  });
}

export { resolveCropPhysicalCompatibilityCalibration };
