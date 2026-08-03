import type { EcocropProfileSource, ReviewStatus } from '../types/models.js';

const ALLOWED: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ['reviewed', 'rejected'],
  reviewed: ['approved', 'rejected', 'draft'],
  approved: ['rejected', 'reviewed'],
  rejected: ['draft'],
};

export function assertEcocropTransition(
  from: ReviewStatus,
  to: ReviewStatus,
): void {
  if (!ALLOWED[from].includes(to)) {
    throw new Error(`Invalid ECOCROP status transition: ${from} → ${to}`);
  }
}

export function reviewEcocropProfile(
  profile: EcocropProfileSource,
  to: ReviewStatus,
  reviewer: string,
): EcocropProfileSource {
  assertEcocropTransition(profile.status, to);
  if (to === 'approved' && profile.thresholds.length === 0) {
    throw new Error('Cannot approve ECOCROP profile without source-backed thresholds');
  }
  return {
    ...profile,
    status: to,
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
  };
}

/**
 * Only approved profiles may seed Crop Knowledge Base.
 */
export function selectApprovedEcocropForKnowledge(
  profiles: EcocropProfileSource[],
): EcocropProfileSource[] {
  return profiles.filter((p) => p.status === 'approved');
}
