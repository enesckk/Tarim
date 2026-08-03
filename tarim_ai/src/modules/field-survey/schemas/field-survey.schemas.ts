import { z } from 'zod';
import { parcelQuerySchema } from '../../parcel/schemas/parcel-query.schema.js';

const surveyorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  organization: z.string().optional(),
});

const parcelObservationsSchema = z
  .object({
    machineAccess: z
      .enum([
        'verified_accessible',
        'accessible_with_limitations',
        'seasonally_accessible',
        'difficult',
        'impossible',
        'unknown',
      ])
      .optional(),
    vehicleType: z.string().optional(),
    accessRoadType: z.string().optional(),
    turningAreaAvailable: z.boolean().optional(),
    drainageObservation: z
      .enum([
        'adequate',
        'moderately_limited',
        'poor',
        'waterlogging_observed',
        'unknown',
      ])
      .optional(),
    bedrockOutcrop: z
      .enum([
        'not_observed',
        'isolated',
        'scattered',
        'frequent',
        'extensive',
        'unknown',
      ])
      .optional(),
    surfaceStoniness: z
      .enum(['none', 'low', 'medium', 'high', 'very_high', 'unknown'])
      .optional(),
    notes: z.string().optional(),
  })
  .optional();

export const createFieldSurveySchema = z.object({
  parcelQuery: parcelQuerySchema,
  surveyDate: z.string().min(1),
  surveyor: surveyorSchema,
  weatherConditions: z
    .object({
      recentRainfall: z
        .enum(['none', 'light', 'moderate', 'heavy', 'unknown'])
        .optional(),
      soilSurfaceCondition: z
        .enum(['dry', 'moist', 'wet', 'unknown'])
        .optional(),
    })
    .optional(),
  notes: z.array(z.string()).optional(),
  parcelObservations: parcelObservationsSchema,
  previousSurveyId: z.string().uuid().optional().nullable(),
  actorId: z.string().optional(),
});

export const patchFieldSurveySchema = z.object({
  weatherConditions: z
    .object({
      recentRainfall: z
        .enum(['none', 'light', 'moderate', 'heavy', 'unknown'])
        .optional(),
      soilSurfaceCondition: z
        .enum(['dry', 'moist', 'wet', 'unknown'])
        .optional(),
    })
    .optional(),
  notes: z.array(z.string()).optional(),
  parcelObservations: parcelObservationsSchema,
  surveyDate: z.string().min(1).optional(),
  photos: z
    .array(
      z.object({
        fileReference: z.string().min(1),
        sampleId: z.string().uuid().optional().nullable(),
        caption: z.string().optional(),
        takenAt: z.string().optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        category: z.enum([
          'parcel_overview',
          'soil_profile',
          'surface_stoniness',
          'bedrock_outcrop',
          'access_route',
          'drainage',
          'other',
        ]),
      }),
    )
    .optional(),
  actorId: z.string().optional(),
});

export const addSampleSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().finite().nonnegative().optional().nullable(),
  }),
  rootableSoilDepthCm: z.number().optional().nullable(),
  surfaceStoniness: z
    .enum(['none', 'low', 'medium', 'high', 'very_high', 'unknown'])
    .optional(),
  estimatedSurfaceStonePercent: z.number().min(0).max(100).optional().nullable(),
  bedrockObserved: z.boolean().optional(),
  bedrockOutcrop: z
    .enum([
      'not_observed',
      'isolated',
      'scattered',
      'frequent',
      'extensive',
      'unknown',
    ])
    .optional(),
  estimatedOutcropPercent: z.number().min(0).max(100).optional().nullable(),
  drainageObservation: z
    .enum([
      'adequate',
      'moderately_limited',
      'poor',
      'waterlogging_observed',
      'unknown',
    ])
    .optional(),
  soilMoistureCondition: z.enum(['dry', 'moist', 'wet', 'unknown']).optional(),
  samplingMethod: z
    .enum([
      'soil_auger',
      'profile_pit',
      'manual_probe',
      'existing_excavation',
      'other',
    ])
    .optional(),
  depthMeasurementMethod: z
    .enum([
      'soil_auger',
      'profile_pit',
      'manual_probe',
      'existing_excavation',
      'other',
    ])
    .optional(),
  notes: z.string().optional(),
});

const reviewerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum([
    'agricultural_engineer',
    'soil_scientist',
    'authorized_expert',
    'administrator',
  ]),
});

export const approveSurveySchema = z.object({
  reviewer: reviewerSchema,
  comments: z.string().optional(),
});

export const rejectSurveySchema = z.object({
  reviewer: reviewerSchema,
  reason: z.string().min(1),
});

export const listParcelSurveysSchema = parcelQuerySchema;
