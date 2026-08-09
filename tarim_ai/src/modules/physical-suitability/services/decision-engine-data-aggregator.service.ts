import { WaterManagementService } from '../../water-management/services/water-management.service.js';

export interface AggregatedParcelData {
  parcelId: string;
  soil: Record<string, any>;
  water: Record<string, any>;
  climate: Record<string, any>;
  terrain: Record<string, any>;
}

export class DecisionEngineDataAggregatorService {
  private readonly waterManagementService = new WaterManagementService();

  async aggregateForParcel(parcelId: string): Promise<AggregatedParcelData> {
    const data: AggregatedParcelData = {
      parcelId,
      soil: {
        soil_ph: 6.5,
        soil_ec: 1.2,
        organic_matter: 2.5,
        texture: 'Loam'
      },
      water: {},
      climate: {
        temperature_mean: 18.5,
        precipitation_annual: 600,
      },
      terrain: {
        slope: 2,
        elevation: 500,
      }
    };

    try {
      const waterSources = await this.waterManagementService.getSourcesByParcel(parcelId);
      if (waterSources && waterSources.length > 0) {
        const bestSource = waterSources[0];
        if (bestSource && bestSource.latestReport && bestSource.latestReport.results) {
          for (const res of bestSource.latestReport.results) {
            data.water[res.parameterName.toLowerCase()] = res.value;
          }
        }
      }
    } catch (e) {
      console.error('Failed to get water sources', e);
    }

    return data;
  }
}
