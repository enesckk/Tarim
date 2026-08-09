import { z } from 'zod';

export const cropProductionGuideSchema = z.object({
  id: z.string().uuid(),
  cropCode: z.string().min(1),
  generalInfo: z.object({
    scientificName: z.string(),
    category: z.string(),
    lifeCycle: z.string(),
    harvestDuration: z.string(),
    plantingPeriod: z.string(),
    harvestPeriod: z.string(),
    waterRequirement: z.string(),
    irrigationTypes: z.array(z.string()),
    rootStructure: z.string(),
    soilRequirements: z.string(),
    climateRequirements: z.string(),
    nutrientRequirements: z.string(),
    mechanization: z.string(),
  }),
  expertNotes: z.object({
    recommendations: z.array(z.string()),
    commonMistakes: z.array(z.string()),
    keyPoints: z.array(z.string()),
  }),
  fertilizationReference: z.object({
    nitrogen: z.string(),
    phosphorus: z.string(),
    potassium: z.string(),
    microElements: z.string(),
    applicationPeriods: z.array(z.string()),
  }),
  irrigationReference: z.object({
    irrigationTypes: z.array(z.string()),
    criticalPeriods: z.array(z.string()),
  }),
  harvestInfo: z.object({
    harvestTime: z.string(),
    maturitySigns: z.array(z.string()),
    harvestMethod: z.string(),
    storage: z.string(),
    transport: z.string(),
  }),
  sourceType: z.string(),
  sourceName: z.string(),
  sourceVersion: z.string(),
  reviewStatus: z.string(),
  approvedBy: z.string().nullable(),
  lastReviewDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productionCalendarTaskSchema = z.object({
  id: z.string().uuid(),
  taskName: z.string(),
  description: z.string(),
  priority: z.enum(['High', 'Medium', 'Low', 'Critical']),
  estimatedTime: z.string().nullable(),
  conditions: z.string().nullable(),
  risks: z.string().nullable(),
  sequenceOrder: z.number(),
});

export const diseaseAndPestSchema = z.object({
  id: z.string().uuid(),
  diseaseName: z.string(),
  symptoms: z.string(),
  riskPeriod: z.string(),
  prevention: z.string(),
  firstResponse: z.string(),
  referenceSource: z.string().nullable(),
});

export const fullCropProductionGuideSchema = cropProductionGuideSchema.extend({
  calendar: z.array(productionCalendarTaskSchema),
  diseases: z.array(diseaseAndPestSchema),
});

export type CropProductionGuide = z.infer<typeof cropProductionGuideSchema>;
export type ProductionCalendarTask = z.infer<typeof productionCalendarTaskSchema>;
export type DiseaseAndPest = z.infer<typeof diseaseAndPestSchema>;
export type FullCropProductionGuide = z.infer<typeof fullCropProductionGuideSchema>;
