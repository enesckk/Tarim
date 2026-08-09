// @ts-nocheck
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { CropGuideService } from '../services/crop-guide.service.js';
import { InMemoryCropGuideRepository } from '../repositories/crop-guide.repository.js';
import { createCropGuideRouter } from '../routes/crop-guide.routes.js';
import type { Request, Response } from 'express';

describe('Crop Guide Routes', () => {
  let repository: InMemoryCropGuideRepository;
  let service: CropGuideService;
  let router: any;

  beforeAll(() => {
    repository = new InMemoryCropGuideRepository();
    service = new CropGuideService(repository);
    router = createCropGuideRouter(service);

    repository.setGuide('bugday', {
      id: '123e4567-e89b-12d3-a456-426614174000',
      cropCode: 'bugday',
      generalInfo: {
        scientificName: 'Triticum aestivum',
        category: 'Tahıl',
        lifeCycle: 'Yıllık',
        harvestDuration: 'Orta',
        plantingPeriod: 'Sonbahar',
        harvestPeriod: 'Yaz',
        waterRequirement: 'Düşük',
        irrigationTypes: ['Yağmurlama'],
        rootStructure: 'Saçak',
        soilRequirements: 'Tınlı',
        climateRequirements: 'Ilıman',
        nutrientRequirements: 'N, P, K',
        mechanization: 'Tamamen',
      },
      expertNotes: {
        recommendations: ['Zamanında ekim'],
        commonMistakes: ['Aşırı sulama'],
        keyPoints: ['Yabancı ot'],
      },
      fertilizationReference: {
        nitrogen: 'Orta',
        phosphorus: 'Yüksek',
        potassium: 'Düşük',
        microElements: 'Zn',
        applicationPeriods: ['Ekim', 'Kardeşlenme'],
      },
      irrigationReference: {
        irrigationTypes: ['Yağmurlama'],
        criticalPeriods: ['Sapa kalkma', 'Süt olum'],
      },
      harvestInfo: {
        harvestTime: 'Haziran-Temmuz',
        maturitySigns: ['Sarı renk', 'Tanede sertlik'],
        harvestMethod: 'Biçerdöver',
        storage: 'Silo',
        transport: 'Kamyon',
      },
      sourceType: 'Fao',
      sourceName: 'Ecocrop',
      sourceVersion: '1.0',
      reviewStatus: 'Approved',
      approvedBy: 'Admin',
      lastReviewDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calendar: [],
      diseases: [],
    });
  });

  it('service should fetch guides', async () => {
    const guides = await service.getAllGuides();
    expect(guides.length).toBe(1);
    expect(guides[0].cropCode).toBe('bugday');
  });
});
