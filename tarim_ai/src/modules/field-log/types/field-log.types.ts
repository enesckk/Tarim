export type EntryStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'VERIFIED' 
  | 'REVISION_REQUIRED' 
  | 'REJECTED' 
  | 'CANCELLED';

export type OperationType = 
  | 'LAND_PREPARATION' | 'PLOUGHING' | 'SOIL_TILLAGE' | 'SEEDBED_PREPARATION' 
  | 'SOWING' | 'TRANSPLANTING' | 'IRRIGATION' | 'FERTILIZATION' 
  | 'FOLIAR_APPLICATION' | 'PESTICIDE_APPLICATION' | 'HERBICIDE_APPLICATION' 
  | 'FUNGICIDE_APPLICATION' | 'BIOLOGICAL_CONTROL' | 'WEED_CONTROL' 
  | 'PRUNING' | 'THINNING' | 'HOEING' | 'MULCHING' | 'DRAINAGE_WORK' 
  | 'SOIL_AMENDMENT' | 'FIELD_INSPECTION' | 'DISEASE_OBSERVATION' 
  | 'PEST_OBSERVATION' | 'WEATHER_DAMAGE' | 'FROST_DAMAGE' | 'HAIL_DAMAGE' 
  | 'FLOOD_DAMAGE' | 'HARVEST' | 'POST_HARVEST' | 'TRANSPORT' | 'STORAGE' 
  | 'MAINTENANCE' | 'OTHER';

export type DetailType = 
  | 'MEASUREMENT' | 'INPUT_USAGE' | 'MACHINE_USAGE' | 'LABOR' 
  | 'DURATION' | 'WATER_USAGE' | 'OBSERVATION' | 'RESULT' | 'OTHER';

export type InputType = 
  | 'SEED' | 'SEEDLING' | 'FERTILIZER' | 'SOIL_AMENDMENT' 
  | 'PESTICIDE' | 'HERBICIDE' | 'FUNGICIDE' | 'BIOLOGICAL_PRODUCT' 
  | 'ADJUVANT' | 'MULCH' | 'FUEL' | 'WATER' | 'OTHER';

export type IrrigationMethod = 
  | 'DRIP' | 'SPRINKLER' | 'FURROW' | 'FLOOD' | 'CENTER_PIVOT' 
  | 'MICRO_SPRINKLER' | 'MANUAL' | 'OTHER';

export type ApplicationMethod = 
  | 'BROADCAST' | 'BAND_PLACEMENT' | 'FERTIGATION' | 'FOLIAR' 
  | 'SIDE_DRESSING' | 'SOIL_INCORPORATION' | 'OTHER';

export type MachineType = 
  | 'TRACTOR' | 'PLOUGH' | 'CULTIVATOR' | 'SEEDER' | 'PLANTER' 
  | 'SPRAYER' | 'FERTILIZER_SPREADER' | 'HARVESTER' | 'TRAILER' 
  | 'PUMP' | 'DRONE' | 'HAND_TOOL' | 'OTHER';

export type LaborType = 
  | 'FAMILY' | 'MUNICIPAL' | 'CONTRACTED' | 'SEASONAL' | 'COOPERATIVE' | 'OTHER';

export type ObservationType = 
  | 'PLANT_GROWTH' | 'GERMINATION' | 'EMERGENCE' | 'WILTING' | 'YELLOWING' 
  | 'LEAF_DAMAGE' | 'PEST_SIGN' | 'DISEASE_SIGN' | 'WEED_PRESSURE' 
  | 'WATER_STRESS' | 'WATERLOGGING' | 'SOIL_CRUST' | 'EROSION' | 'FROST_DAMAGE' 
  | 'HAIL_DAMAGE' | 'OTHER';

export type Severity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export type EvidenceType = 
  | 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'INVOICE' | 'DELIVERY_NOTE' 
  | 'LAB_REPORT' | 'MACHINE_SCREENSHOT' | 'WATER_METER_PHOTO' | 'OTHER';

export type ReviewStatus = 'PENDING' | 'IN_REVIEW' | 'REVISION_REQUIRED' | 'VERIFIED' | 'REJECTED';

export type TaskCompletionStatus = 
  | 'ON_TIME' | 'EARLY' | 'LATE' | 'PARTIALLY_COMPLETED' 
  | 'DIFFERENT_OPERATION' | 'NOT_LINKED_TO_TASK';

// Entities
export interface FieldLogEntry {
  id: string;
  entryCode: string;
  producerId: string;
  userId: string;
  parcelId: string;
  productionPlanId: string | null;
  productionTaskId: string | null;
  cropCode: string | null;
  productionScenarioId: string | null;
  operationType: OperationType;
  operationDate: string;
  startedAt: string | null;
  completedAt: string | null;
  status: EntryStatus;
  performedBy: string | null;
  supervisedBy: string | null;
  affectedArea: number | null;
  affectedAreaUnit: string | null;
  locationGeometry: any | null; // GeoJSON
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  weatherSnapshotId: string | null;
  description: string | null;
  producerNotes: string | null;
  expertNotes: string | null;
  source: string | null;
  verificationStatus: string | null;
  reviewStatus: ReviewStatus | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
  isActive: boolean;
}

export interface FieldLogOperationDetail {
  id: string;
  fieldLogEntryId: string;
  detailType: DetailType;
  parameterCode: string;
  rawValue: string | null;
  numericValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  unitId: string | null;
  normalizedValue: number | null;
  normalizedUnitId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

export interface FieldLogInputUsage {
  id: string;
  fieldLogEntryId: string;
  inputType: InputType;
  productName: string;
  commercialName: string | null;
  activeIngredient: string | null;
  registrationNumber: string | null;
  batchNumber: string | null;
  quantity: number;
  unitId: string;
  normalizedQuantity: number | null;
  normalizedUnitId: string | null;
  applicationMethod: string | null;
  applicationRate: number | null;
  applicationRateUnitId: string | null;
  targetPurpose: string | null;
  supplier: string | null;
  purchaseDocumentId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
  isActive: boolean;
}

export interface FieldLogIrrigationDetail {
  id: string;
  fieldLogEntryId: string;
  waterSourceId: string | null;
  irrigationMethod: IrrigationMethod | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  measuredFlowRate: number | null;
  flowRateUnitId: string | null;
  estimatedWaterVolume: number | null;
  measuredWaterVolume: number | null;
  volumeUnitId: string | null;
  irrigatedArea: number | null;
  areaUnitId: string | null;
  pressure: number | null;
  pressureUnitId: string | null;
  waterMeterStart: number | null;
  waterMeterEnd: number | null;
  weatherAtApplication: any | null;
  notes: string | null;
}

export interface FieldLogFertilizationDetail {
  id: string;
  fieldLogEntryId: string;
  applicationMethod: ApplicationMethod | null;
  applicationTiming: string | null;
  soilOrFoliar: string | null;
  targetArea: number | null;
  areaUnitId: string | null;
  weatherCondition: any | null;
  irrigationAssociated: boolean | null;
  notes: string | null;
}

export interface FieldLogPesticideDetail {
  id: string;
  fieldLogEntryId: string;
  targetType: string | null;
  targetName: string | null;
  applicationReason: string | null;
  applicationMethod: string | null;
  operatorCertificationReference: string | null;
  preHarvestIntervalDays: number | null;
  reEntryIntervalHours: number | null;
  weatherCondition: any | null;
  windCondition: any | null;
  bufferZoneObserved: boolean | null;
  notes: string | null;
}

export interface FieldLogMachineUsage {
  id: string;
  fieldLogEntryId: string;
  machineType: MachineType;
  machineName: string | null;
  registrationOrSerialNumber: string | null;
  operatorName: string | null;
  startHourMeter: number | null;
  endHourMeter: number | null;
  fuelUsed: number | null;
  fuelUnitId: string | null;
  workingWidth: number | null;
  workingWidthUnitId: string | null;
  maintenanceIssue: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

export interface FieldLogLaborUsage {
  id: string;
  fieldLogEntryId: string;
  workerCount: number | null;
  totalLaborHours: number | null;
  laborType: LaborType | null;
  crewLeader: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

export interface FieldLogObservation {
  id: string;
  fieldLogEntryId: string;
  observationType: ObservationType;
  severity: Severity | null;
  description: string | null;
  affectedArea: number | null;
  areaUnitId: string | null;
  observedAt: string;
  requiresExpertReview: boolean;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

export interface FieldLogEvidence {
  id: string;
  fieldLogEntryId: string;
  evidenceType: EvidenceType;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  fileHash: string | null;
  capturedAt: string | null;
  uploadedAt: string;
  uploadedBy: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  deviceId: string | null;
  description: string | null;
  isPrimary: boolean;
  verificationStatus: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface FieldLogReview {
  id: string;
  fieldLogEntryId: string;
  reviewerId: string;
  reviewerRole: string | null;
  status: ReviewStatus;
  reviewNotes: string | null;
  reviewedAt: string;
  revisionRequestedFields: any | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

export interface FieldLogRevision {
  id: string;
  fieldLogEntryId: string;
  revisionNumber: number;
  previousEntryId: string | null;
  changeReason: string | null;
  changedBy: string;
  changedAt: string;
  changeSummaryJson: any | null;
}

export interface FieldLogAuditEvent {
  id: string;
  fieldLogEntryId: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  correlationId: string | null;
  requestId: string | null;
  userId: string | null;
  createdAt: string;
}
