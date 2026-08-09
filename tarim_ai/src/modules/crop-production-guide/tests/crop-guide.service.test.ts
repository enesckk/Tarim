import { describe, it, expect, beforeEach } from 'vitest';
import { CropGuideService } from '../services/crop-guide.service.js';
import { InMemoryCropGuideRepository } from '../repositories/crop-guide.repository.js';
import { ApiError } from '../../../utils/api-error.js';

describe('CropGuideService', () => {
  let repository: InMemoryCropGuideRepository;
  let service: CropGuideService;

  beforeEach(() => {
    repository = new InMemoryCropGuideRepository();
    service = new CropGuideService(repository);

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

  it('should return all guides', async () => {
    const guides = await service.getAllGuides();
    expect(guides.length).toBe(1);
    expect(guides[0].cropCode).toBe('bugday');
  });

  it('should return a guide by cropCode', async () => {
    const guide = await service.getGuideByCropCode('bugday');
    expect(guide.cropCode).toBe('bugday');
    expect(guide.generalInfo.scientificName).toBe('Triticum aestivum');
  });

  it('should throw ApiError if guide not found', async () => {
    await expect(service.getGuideByCropCode('misir')).rejects.toThrow(ApiError);
  });
});
