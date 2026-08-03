import type { IrrigationScenario, ManagementNeed } from './scenario.types.js';
import type { CropKnowledge } from '../types/crop.types.js';
import type { ClimateProfile } from '../../environment/climate/types/climate.types.js';

export class IrrigationScenarioService {
  buildManagementNeeds(
    crop: CropKnowledge,
    climate: ClimateProfile,
    scenario: IrrigationScenario,
  ): ManagementNeed[] {
    const needs: ManagementNeed[] = [];

    if (scenario === 'rainfed' && crop.climate.irrigationDependency === 'high') {
      needs.push({
        code: 'IRRIGATION_REQUIRED',
        priority: 'critical',
        message:
          'Sulamasız senaryoda yüksek sulama bağımlılığı nedeniyle ürün su stresi riski yüksektir.',
      });
    } else if (
      scenario !== 'full' &&
      (crop.climate.irrigationDependency === 'high' ||
        climate.water.estimatedIrrigationNeed === 'high')
    ) {
      needs.push({
        code: 'IRRIGATION_REQUIRED',
        priority: 'high',
        message: 'Mevcut verilere göre kritik dönemlerde sulama ihtiyacı değerlendirilmelidir.',
      });
    }

    if (scenario === 'full') {
      needs.push({
        code: 'IRRIGATION_WATER_QUALITY_UNKNOWN',
        priority: 'medium',
        message:
          'Düzenli sulama varsayılmıştır; sulama suyu miktarı ve kalitesi bilinmemektedir.',
      });
    }

    return needs;
  }
}
