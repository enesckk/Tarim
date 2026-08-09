import { randomUUID } from 'crypto';
import type { FieldLogRepository } from '../repositories/field-log.repository.js';
import type { FieldLogEvidence, EvidenceType } from '../types/field-log.types.js';

export class FieldLogEvidenceService {
  constructor(private readonly repository: FieldLogRepository) {}

  async processEvidence(params: {
    fieldLogEntryId: string;
    evidenceType: EvidenceType;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string; // The raw storage path, e.g., 's3://tarim-ai-bucket/...'
    fileHash: string | null;
    uploadedBy: string;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    deviceId?: string;
    description?: string;
    isPrimary?: boolean;
    capturedAt?: string;
  }): Promise<FieldLogEvidence> {
    
    // Duplicate detection by hash
    if (params.fileHash) {
      const existing = await this.repository.getEvidenceByHash(params.fileHash);
      if (existing.length > 0) {
        // Just link the existing file metadata to avoid re-uploading
        const dup = existing[0];
        // But we want a new DB record pointing to the same storage path
        params.storagePath = dup.storagePath; 
      }
    }

    const evidence: FieldLogEvidence = {
      id: randomUUID(),
      fieldLogEntryId: params.fieldLogEntryId,
      evidenceType: params.evidenceType,
      fileName: params.fileName,
      fileType: params.fileType,
      fileSize: params.fileSize,
      storagePath: params.storagePath,
      fileHash: params.fileHash || null,
      capturedAt: params.capturedAt || null,
      uploadedAt: new Date().toISOString(),
      uploadedBy: params.uploadedBy,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
      accuracyMeters: params.accuracyMeters || null,
      deviceId: params.deviceId || null,
      description: params.description || null,
      isPrimary: params.isPrimary || false,
      verificationStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    await this.repository.addEvidence(evidence);

    // Audit log
    await this.repository.addAuditEvent({
      id: randomUUID(),
      fieldLogEntryId: params.fieldLogEntryId,
      eventType: 'field_log.evidence_added',
      previousStatus: null,
      newStatus: null,
      reason: `Added evidence: ${params.fileName}`,
      correlationId: null,
      requestId: null,
      userId: params.uploadedBy,
      createdAt: new Date().toISOString()
    });

    return evidence;
  }

  // Helper to sanitize the response so internal storage paths don't leak
  sanitizeEvidenceForClient(evidence: FieldLogEvidence): Omit<FieldLogEvidence, 'storagePath'> {
    const { storagePath, ...safeEvidence } = evidence;
    return safeEvidence;
  }
}
