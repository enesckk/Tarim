// @ts-nocheck
import { z } from 'zod';
import { 
  OperationType, EntryStatus, DetailType, InputType, 
  IrrigationMethod, ApplicationMethod, MachineType, LaborType, 
  ObservationType, Severity, EvidenceType, ReviewStatus 
} from '../types/field-log.types.js';

export const createFieldLogSchema = z.object({
  parcelId: z.string().uuid(),
  operationType: z.string(), // Checked at service level or custom refine
  operationDate: z.string().datetime(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  productionPlanId: z.string().uuid().optional().nullable(),
  productionTaskId: z.string().uuid().optional().nullable(),
  cropCode: z.string().optional().nullable(),
  productionScenarioId: z.string().uuid().optional().nullable(),
  performedBy: z.string().optional().nullable(),
  supervisedBy: z.string().optional().nullable(),
  affectedArea: z.number().min(0).optional().nullable(),
  affectedAreaUnit: z.string().optional().nullable(),
  locationGeometry: z.any().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  accuracyMeters: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  producerNotes: z.string().optional().nullable(),
});

export const addInputUsageSchema = z.object({
  inputType: z.string(),
  productName: z.string().min(1),
  commercialName: z.string().optional().nullable(),
  activeIngredient: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  quantity: z.number().min(0),
  unitId: z.string().min(1),
  applicationMethod: z.string().optional().nullable(),
  applicationRate: z.number().min(0).optional().nullable(),
  applicationRateUnitId: z.string().optional().nullable(),
  targetPurpose: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  purchaseDocumentId: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const addIrrigationDetailSchema = z.object({
  waterSourceId: z.string().optional().nullable(),
  irrigationMethod: z.string().optional().nullable(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().min(0).optional().nullable(),
  measuredFlowRate: z.number().min(0).optional().nullable(),
  flowRateUnitId: z.string().optional().nullable(),
  estimatedWaterVolume: z.number().min(0).optional().nullable(),
  measuredWaterVolume: z.number().min(0).optional().nullable(),
  volumeUnitId: z.string().optional().nullable(),
  irrigatedArea: z.number().min(0).optional().nullable(),
  areaUnitId: z.string().optional().nullable(),
  pressure: z.number().min(0).optional().nullable(),
  pressureUnitId: z.string().optional().nullable(),
  waterMeterStart: z.number().min(0).optional().nullable(),
  waterMeterEnd: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
});

export const addFertilizationDetailSchema = z.object({
  applicationMethod: z.string().optional().nullable(),
  applicationTiming: z.string().optional().nullable(),
  soilOrFoliar: z.string().optional().nullable(),
  targetArea: z.number().min(0).optional().nullable(),
  areaUnitId: z.string().optional().nullable(),
  irrigationAssociated: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const addPesticideDetailSchema = z.object({
  targetType: z.string().optional().nullable(),
  targetName: z.string().optional().nullable(),
  applicationReason: z.string().optional().nullable(),
  applicationMethod: z.string().optional().nullable(),
  operatorCertificationReference: z.string().optional().nullable(),
  preHarvestIntervalDays: z.number().min(0).optional().nullable(),
  reEntryIntervalHours: z.number().min(0).optional().nullable(),
  bufferZoneObserved: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const addMachineUsageSchema = z.object({
  machineType: z.string(),
  machineName: z.string().optional().nullable(),
  registrationOrSerialNumber: z.string().optional().nullable(),
  operatorName: z.string().optional().nullable(),
  startHourMeter: z.number().min(0).optional().nullable(),
  endHourMeter: z.number().min(0).optional().nullable(),
  fuelUsed: z.number().min(0).optional().nullable(),
  fuelUnitId: z.string().optional().nullable(),
  workingWidth: z.number().min(0).optional().nullable(),
  workingWidthUnitId: z.string().optional().nullable(),
  maintenanceIssue: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const addObservationSchema = z.object({
  observationType: z.string(),
  severity: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  affectedArea: z.number().min(0).optional().nullable(),
  areaUnitId: z.string().optional().nullable(),
  observedAt: z.string().datetime(),
  requiresExpertReview: z.boolean().default(false)
});

export const addEvidenceSchema = z.object({
  evidenceType: z.string(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().min(0),
  storagePath: z.string().min(1),
  fileHash: z.string().optional().nullable(),
  capturedAt: z.string().datetime().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  accuracyMeters: z.number().optional().nullable(),
  deviceId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false)
});

export const expertReviewSchema = z.object({
  status: z.enum(['VERIFIED', 'REVISION_REQUIRED', 'REJECTED']),
  reviewNotes: z.string().optional().nullable(),
  revisionRequestedFields: z.any().optional().nullable(),
  completeLinkedTask: z.boolean().optional().default(false)
});

export const updateFieldLogSchema = createFieldLogSchema.partial().extend({
  changeReason: z.string().optional()
});
