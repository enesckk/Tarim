export const CRITICAL_WRITE_OPERATIONS = [
  'field-survey.create',
  'field-survey.sample.add',
  'field-survey.submit',
  'field-survey.start-review',
  'field-survey.approve',
  'field-survey.reject',
  'field-survey.return-to-draft',
  'field-survey.patch',
  'calibration.bootstrap',
  'calibration.profile.create',
  'calibration.profile.update',
  'calibration.profile.submit',
  'calibration.profile.start-review',
  'calibration.profile.review.add',
  'calibration.profile.approve',
  'calibration.profile.reject',
  'calibration.profile.publish',
  'calibration.impact.run',
  'calibration.profile.revision.create',
  'calibration.profile.rollback',
  'seasonal-crop-analysis.create',
] as const;

export type CriticalWriteOperation = (typeof CRITICAL_WRITE_OPERATIONS)[number];

type RouteMatcher = {
  method: string;
  pattern: RegExp;
  operation: CriticalWriteOperation;
  extractParams: (match: RegExpMatchArray) => Record<string, string>;
};

const ROUTES: RouteMatcher[] = [
  {
    method: 'POST',
    pattern: /^\/api\/field-surveys\/?$/,
    operation: 'field-survey.create',
    extractParams: () => ({}),
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/field-surveys\/([^/]+)\/?$/,
    operation: 'field-survey.patch',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/field-surveys\/([^/]+)\/samples\/?$/,
    operation: 'field-survey.sample.add',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/field-surveys\/([^/]+)\/submit\/?$/,
    operation: 'field-survey.submit',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/field-surveys\/([^/]+)\/start-review\/?$/,
    operation: 'field-survey.start-review',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/field-surveys\/([^/]+)\/approve\/?$/,
    operation: 'field-survey.approve',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/field-surveys\/([^/]+)\/reject\/?$/,
    operation: 'field-survey.reject',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/field-surveys\/([^/]+)\/return-to-draft\/?$/,
    operation: 'field-survey.return-to-draft',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/bootstrap\/?$/,
    operation: 'calibration.bootstrap',
    extractParams: () => ({}),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/crop-requirements\/?$/,
    operation: 'calibration.profile.create',
    extractParams: () => ({}),
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/?$/,
    operation: 'calibration.profile.update',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/submit\/?$/,
    operation: 'calibration.profile.submit',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern:
      /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/start-review\/?$/,
    operation: 'calibration.profile.start-review',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/reviews\/?$/,
    operation: 'calibration.profile.review.add',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/approve\/?$/,
    operation: 'calibration.profile.approve',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/reject\/?$/,
    operation: 'calibration.profile.reject',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/publish\/?$/,
    operation: 'calibration.profile.publish',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern:
      /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/impact-analysis\/?$/,
    operation: 'calibration.impact.run',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern:
      /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/create-revision\/?$/,
    operation: 'calibration.profile.revision.create',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/calibration-management\/crop-requirements\/([^/]+)\/rollback\/?$/,
    operation: 'calibration.profile.rollback',
    extractParams: (m) => ({ id: m[1]! }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/seasonal-crop-analysis\/?$/,
    operation: 'seasonal-crop-analysis.create',
    extractParams: () => ({}),
  },
];

export function resolveCriticalOperation(
  method: string,
  path: string,
): { operation: CriticalWriteOperation; params: Record<string, string> } | null {
  const normalized = path.split('?')[0] ?? path;
  for (const route of ROUTES) {
    if (route.method !== method.toUpperCase()) continue;
    const match = normalized.match(route.pattern);
    if (!match) continue;
    return {
      operation: route.operation,
      params: route.extractParams(match),
    };
  }
  return null;
}

export function extractResourceIdFromBody(
  operation: string,
  body: unknown,
  params: Record<string, string>,
): string | null {
  if (params.id) return params.id;
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj.id === 'string') return obj.id;
  if (obj.profile && typeof obj.profile === 'object') {
    const id = (obj.profile as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  if (obj.survey && typeof obj.survey === 'object') {
    const id = (obj.survey as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  if (typeof obj.analysisId === 'string') return obj.analysisId;
  void operation;
  return null;
}
