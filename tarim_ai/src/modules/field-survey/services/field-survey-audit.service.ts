import type { FieldSurvey } from '../types/field-survey.types.js';
import type { AuditEvent } from '../types/field-survey.types.js';

export function appendAuditEvent(
  survey: FieldSurvey,
  event: Omit<AuditEvent, 'timestamp'> & { timestamp?: string },
): FieldSurvey {
  const timestamp = event.timestamp ?? new Date().toISOString();
  return {
    ...survey,
    audit: {
      events: [...survey.audit.events, { ...event, timestamp }],
    },
  };
}

export class FieldSurveyAuditService {
  created(survey: FieldSurvey, actorId?: string): FieldSurvey {
    return appendAuditEvent(survey, {
      type: 'SURVEY_CREATED',
      actorId: actorId ?? survey.surveyor.id,
    });
  }

  sampleAdded(survey: FieldSurvey, sampleId: string, actorId?: string): FieldSurvey {
    return appendAuditEvent(survey, {
      type: 'SAMPLE_ADDED',
      sampleId,
      actorId,
    });
  }

  submitted(survey: FieldSurvey, actorId?: string): FieldSurvey {
    return appendAuditEvent(survey, { type: 'SURVEY_SUBMITTED', actorId });
  }

  reviewStarted(survey: FieldSurvey, actorId?: string): FieldSurvey {
    return appendAuditEvent(survey, { type: 'SURVEY_UNDER_REVIEW', actorId });
  }

  approved(survey: FieldSurvey, reviewerId: string): FieldSurvey {
    return appendAuditEvent(survey, {
      type: 'SURVEY_APPROVED',
      reviewerId,
    });
  }

  rejected(survey: FieldSurvey, reviewerId: string): FieldSurvey {
    return appendAuditEvent(survey, {
      type: 'SURVEY_REJECTED',
      reviewerId,
    });
  }

  archived(survey: FieldSurvey, actorId?: string): FieldSurvey {
    return appendAuditEvent(survey, { type: 'SURVEY_ARCHIVED', actorId });
  }

  updated(survey: FieldSurvey, actorId?: string): FieldSurvey {
    return appendAuditEvent(survey, { type: 'SURVEY_UPDATED', actorId });
  }
}
