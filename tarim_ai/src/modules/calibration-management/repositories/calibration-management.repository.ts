import type {
  CalibrationAuditEvent,
  CropRequirementProfile,
} from '../types/calibration-management.types.js';

export interface CalibrationManagementRepository {
  createProfile(profile: CropRequirementProfile): Promise<CropRequirementProfile>;
  updateProfile(
    profile: CropRequirementProfile,
    options?: { expectedVersion?: number },
  ): Promise<CropRequirementProfile>;
  findProfileById(id: string): Promise<CropRequirementProfile | null>;
  listProfilesByCropId(cropId: string): Promise<CropRequirementProfile[]>;
  findActivePublishedByCropId(
    cropId: string,
  ): Promise<CropRequirementProfile | null>;
  findByBootstrapKey(key: string): Promise<CropRequirementProfile | null>;
  appendAudit(event: CalibrationAuditEvent): Promise<CalibrationAuditEvent>;
  listAuditByProfileId(profileId: string): Promise<CalibrationAuditEvent[]>;
  publishAtomic?(input: {
    previous: CropRequirementProfile | null;
    next: CropRequirementProfile;
    actor: import('../types/calibration-management.types.js').ExpertActor;
    reason: string;
    audits: CalibrationAuditEvent[];
  }): Promise<CropRequirementProfile>;
  clear?(): void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryCalibrationManagementRepository
  implements CalibrationManagementRepository
{
  private readonly profiles = new Map<string, CropRequirementProfile>();
  private readonly audits: CalibrationAuditEvent[] = [];

  async createProfile(
    profile: CropRequirementProfile,
  ): Promise<CropRequirementProfile> {
    const stored = clone(profile);
    this.profiles.set(stored.id, stored);
    return clone(stored);
  }

  async updateProfile(
    profile: CropRequirementProfile,
    _options?: { expectedVersion?: number },
  ): Promise<CropRequirementProfile> {
    if (!this.profiles.has(profile.id)) {
      throw new Error(`Profile not found: ${profile.id}`);
    }
    const stored = clone(profile);
    this.profiles.set(stored.id, stored);
    return clone(stored);
  }

  async findProfileById(id: string): Promise<CropRequirementProfile | null> {
    const found = this.profiles.get(id);
    return found ? clone(found) : null;
  }

  async listProfilesByCropId(cropId: string): Promise<CropRequirementProfile[]> {
    return [...this.profiles.values()]
      .filter((p) => p.cropId === cropId)
      .map(clone)
      .sort((a, b) => b.version - a.version);
  }

  async findActivePublishedByCropId(
    cropId: string,
  ): Promise<CropRequirementProfile | null> {
    const published = [...this.profiles.values()].filter(
      (p) => p.cropId === cropId && p.status === 'published',
    );
    if (published.length === 0) return null;
    published.sort((a, b) => {
      const pub = (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
      if (pub !== 0) return pub;
      return b.version - a.version;
    });
    return clone(published[0]!);
  }

  async findByBootstrapKey(key: string): Promise<CropRequirementProfile | null> {
    const found = [...this.profiles.values()].find((p) => p.bootstrapKey === key);
    return found ? clone(found) : null;
  }

  async appendAudit(
    event: CalibrationAuditEvent,
  ): Promise<CalibrationAuditEvent> {
    const stored = clone(event);
    this.audits.push(stored);
    return clone(stored);
  }

  async listAuditByProfileId(
    profileId: string,
  ): Promise<CalibrationAuditEvent[]> {
    return this.audits
      .filter((e) => e.profileId === profileId)
      .map(clone)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  clear(): void {
    this.profiles.clear();
    this.audits.length = 0;
  }
}

let shared: InMemoryCalibrationManagementRepository | null = null;

export function getSharedCalibrationManagementRepository(): InMemoryCalibrationManagementRepository {
  if (!shared) shared = new InMemoryCalibrationManagementRepository();
  return shared;
}

export function resetSharedCalibrationManagementRepository(): void {
  shared?.clear();
  shared = null;
}
