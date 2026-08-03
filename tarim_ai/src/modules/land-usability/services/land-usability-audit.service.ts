import type { DecisionOutcome } from './physical-suitability.service.js';
import type { ResolvedEvidenceBundle } from './evidence-resolution.service.js';
import type { LandUsabilityAudit } from '../types/land-usability.types.js';

export class LandUsabilityAuditService {
  build(
    bundle: ResolvedEvidenceBundle,
    outcome: DecisionOutcome,
    calibrationVersion: string,
    fieldSurveyAudit?: LandUsabilityAudit['fieldSurvey'],
  ): LandUsabilityAudit {
    return {
      decisionRulesEvaluated: outcome.evaluatedRules,
      matchedRules: [outcome.matchedRule],
      rejectedRules: outcome.rejectedRules,
      evidenceUsed: [
        ...bundle.supportingEvidence.map((e) => e.code),
        ...bundle.limitingFactors.map((e) => e.code),
      ],
      evidenceIgnored: bundle.ignoredEvidence.map((e) => e.code),
      unknowns: bundle.unknownFactors.map((e) => e.code),
      calibrationVersion,
      ...(fieldSurveyAudit ? { fieldSurvey: fieldSurveyAudit } : {}),
    };
  }
}
