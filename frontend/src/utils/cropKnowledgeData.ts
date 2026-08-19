export interface CropKnowledgeItem {
  id: string
  name: string
  scientificName?: string
  category?: string
  growingType?: string
  seasonalOrPerennial?: string
  regionalNote?: string
  profileStatus?: string
  slug?: string
  internalCropCode?: string
  sourceMetadata?: Record<string, any>
  climate?: {
    temperature?: { absoluteMinC?: number; optimalMinC?: number; optimalMaxC?: number; absoluteMaxC?: number }
    annualPrecipitationMm?: { minimum?: number; optimalMin?: number; optimalMax?: number; maximum?: number }
    growingSeasonPrecipitationMm?: { minimum?: number; optimalMin?: number; optimalMax?: number; maximum?: number }
    frostTolerance?: string
    heatTolerance?: string
    droughtTolerance?: string
    irrigationDependency?: string
    [key: string]: any
  }
  soil?: {
    ph?: { absoluteMin?: number; optimalMin?: number; optimalMax?: number; absoluteMax?: number }
    preferredTextures?: string[]
    acceptedTextures?: string[]
    minimumOrganicMatterPercent?: number
    preferredOrganicMatterPercent?: number
    maximumElectricalConductivityDsM?: number
    salinityTolerance?: string
    requiredDrainage?: string
    minimumSoilDepthCm?: number
    calciumCarbonateTolerance?: string
    [key: string]: any
  }
  [key: string]: any
}

export const REGIONAL_CROPS_DATABASE: CropKnowledgeItem[] = [
  {
    "id": "alfalfa",
    "name": "Yonca",
    "scientificName": "Medicago sativa",
    "category": "field_crop",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "alfalfa",
    "internalCropCode": "alfalfa",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "almond",
    "name": "Badem",
    "scientificName": "Prunus dulcis",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "almond",
    "internalCropCode": "almond",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "anise",
    "name": "Anason",
    "scientificName": "Pimpinella anisum",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -5,
        "optimalMinC": 16,
        "optimalMaxC": 28,
        "absoluteMaxC": 35
      },
      "annualPrecipitationMm": {
        "minimum": 280,
        "optimalMin": 380,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "low_medium",
      "heatTolerance": "high",
      "droughtTolerance": "medium_high",
      "irrigationDependency": "low_medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.3,
        "optimalMin": 6.8,
        "optimalMax": 7.7,
        "absoluteMax": 8.3
      },
      "preferredTextures": [
        "sandy_loam",
        "loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 1.2,
      "salinityTolerance": "low_medium",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 45,
      "calciumCarbonateTolerance": "medium_high"
    },
    "sourceMetadata": {
      "regionalNote": "İlaç, alkol ve gıda sanayisinde sözleşmeli tarıma son derece uygun baharat bitkisi."
    }
  },
  {
    "id": "apple",
    "name": "Elma",
    "scientificName": "Malus domestica",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "apple",
    "internalCropCode": "apple",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "apricot",
    "name": "Kayısı",
    "scientificName": "Prunus armeniaca",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "apricot",
    "internalCropCode": "apricot",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "araban_garlic",
    "name": "Araban Sarımsağı (Coğrafi İşaretli)",
    "scientificName": "Allium sativum var. Araban",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -12,
        "optimalMinC": 14,
        "optimalMaxC": 26,
        "absoluteMaxC": 35
      },
      "annualPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 450,
        "optimalMax": 650,
        "maximum": 850
      },
      "frostTolerance": "high",
      "heatTolerance": "medium_high",
      "droughtTolerance": "medium",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 6.6,
        "optimalMax": 7.6,
        "absoluteMax": 8.2
      },
      "preferredTextures": [
        "sandy_loam",
        "loam",
        "silt_loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "salinityTolerance": "low",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "medium_high"
    },
    "sourceMetadata": {
      "regionalNote": "Bölgenin AB coğrafi işaret tescilli beyaz başlı, yüksek allisin oranlı dev sarımsağı."
    }
  },
  {
    "id": "barley",
    "name": "Arpa",
    "scientificName": "Hordeum vulgare",
    "category": "field_crop",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": -2,
        "optimalMinC": 10,
        "optimalMaxC": 22,
        "absoluteMaxC": 34
      },
      "annualPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 300,
        "optimalMax": 600,
        "maximum": 850
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 120,
        "optimalMin": 180,
        "optimalMax": 400,
        "maximum": 600
      },
      "frostTolerance": "high",
      "heatTolerance": "medium",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.8,
        "absoluteMax": 8.6
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "silt_loam",
        "clay"
      ],
      "minimumOrganicMatterPercent": 0.8,
      "preferredOrganicMatterPercent": 1.8,
      "maximumElectricalConductivityDsM": 5,
      "salinityTolerance": "high",
      "requiredDrainage": "moderate",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "high"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.2,
        "optimalMin": 0.35,
        "optimalMax": 0.75
      },
      "activeVegetationNdmi": {
        "minimum": -0.15,
        "optimalMin": -0.05,
        "optimalMax": 0.25
      },
      "maximumActiveSeasonBsi": 0.25,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "medium",
      "fertilityDemand": "low",
      "mechanizationSuitability": "high"
    },
    "hardConstraints": [
      {
        "code": "SOIL_PH_TOO_HIGH",
        "field": "soil.ph",
        "operator": "greater_than",
        "value": 8.6,
        "severity": "critical",
        "group": "PH",
        "message": "Aşırı yüksek pH arpa gelişimini sınırlandırabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 10,
          "endMonth": 11,
          "label": "Kışlık ekim"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Çimlenme",
          "startOffsetDays": 0,
          "endOffsetDays": 18,
          "temperature": {
            "absoluteMinC": 2,
            "optimalMinC": 6,
            "optimalMaxC": 16,
            "absoluteMaxC": 26
          },
          "waterSensitivity": "medium",
          "weight": 0.15,
          "frostSensitivity": "low",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 19,
          "endOffsetDays": 90,
          "temperature": {
            "absoluteMinC": 0,
            "optimalMinC": 6,
            "optimalMaxC": 16,
            "absoluteMaxC": 26
          },
          "waterSensitivity": "low",
          "weight": 0.25,
          "frostSensitivity": "low",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 91,
          "endOffsetDays": 120,
          "temperature": {
            "absoluteMinC": 8,
            "optimalMinC": 12,
            "optimalMaxC": 22,
            "absoluteMaxC": 30
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "medium",
          "heatSensitivity": "medium"
        },
        {
          "id": "yieldFormation",
          "label": "Tane doldurma",
          "startOffsetDays": 121,
          "endOffsetDays": 160,
          "temperature": {
            "absoluteMinC": 10,
            "optimalMinC": 14,
            "optimalMaxC": 26,
            "absoluteMaxC": 34
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "medium"
        }
      ],
      "cycleLengthDays": {
        "minimum": 130,
        "typical": 160,
        "maximum": 190
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 25,
        "preferredMinimumCm": 40,
        "optimalMinimumCm": 60,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 10,
        "acceptableMaximumMeanPercent": 18,
        "maximumMeanPercent": 30,
        "maximumP90Percent": 40,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "low"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "medium"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "medium"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate",
          "moderately_limited"
        ],
        "acceptable": [],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "medium"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "barley",
    "internalCropCode": "barley",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "bean",
    "name": "Fasulye",
    "scientificName": "Phaseolus vulgaris",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "bean",
    "internalCropCode": "bean",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "black_cumin",
    "name": "Çörek Otu (Nigella)",
    "scientificName": "Nigella sativa",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -8,
        "optimalMinC": 16,
        "optimalMaxC": 30,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 500,
        "maximum": 700
      },
      "frostTolerance": "medium",
      "heatTolerance": "high",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 6.8,
        "optimalMax": 7.9,
        "absoluteMax": 8.5
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 1.0,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "high"
    },
    "sourceMetadata": {
      "regionalNote": "Tıbbi aromatik ve unlu mamuller sanayisinde kıraç şartlarda yüksek karlı alternatif."
    }
  },
  {
    "id": "broccoli",
    "name": "Brokoli",
    "scientificName": "Brassica oleracea",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "broccoli",
    "internalCropCode": "broccoli",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "cabbage",
    "name": "Lahana",
    "scientificName": "Brassica oleracea",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "cabbage",
    "internalCropCode": "cabbage",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "caper",
    "name": "Kapari (Gebre Otu)",
    "scientificName": "Capparis spinosa",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -12,
        "optimalMinC": 18,
        "optimalMaxC": 38,
        "absoluteMaxC": 48
      },
      "annualPrecipitationMm": {
        "minimum": 150,
        "optimalMin": 250,
        "optimalMax": 450,
        "maximum": 650
      },
      "frostTolerance": "medium",
      "heatTolerance": "extreme",
      "droughtTolerance": "extreme",
      "irrigationDependency": "none"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.8,
        "optimalMin": 7.5,
        "optimalMax": 8.6,
        "absoluteMax": 9.2
      },
      "preferredTextures": [
        "stony",
        "sandy_loam",
        "loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 0.4,
      "salinityTolerance": "very_high",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "very_high"
    },
    "sourceMetadata": {
      "regionalNote": "Erozyon kontrolü ve kıraç alanlarda ihracata yönelik salamura tomurcuk üretimi."
    }
  },
  {
    "id": "carrot",
    "name": "Havuç",
    "scientificName": "Daucus carota",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "carrot",
    "internalCropCode": "carrot",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "cauliflower",
    "name": "Karnabahar",
    "scientificName": "Brassica oleracea",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "cauliflower",
    "internalCropCode": "cauliflower",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "cherry",
    "name": "Kiraz (0900 Ziraat)",
    "scientificName": "Prunus avium",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -18,
        "optimalMinC": 14,
        "optimalMaxC": 30,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 400,
        "optimalMin": 550,
        "optimalMax": 800,
        "maximum": 1100
      },
      "frostTolerance": "high",
      "heatTolerance": "medium",
      "droughtTolerance": "low_medium",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.5,
        "absoluteMax": 8.0
      },
      "preferredTextures": [
        "loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 1.8,
      "salinityTolerance": "low",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 100,
      "calciumCarbonateTolerance": "low_medium"
    },
    "sourceMetadata": {
      "regionalNote": "İhracatlık standartta iri meyve tutumu için mikroklimalı vadilerde sulama ile ideal."
    }
  },
  {
    "id": "chickpea",
    "name": "Nohut",
    "scientificName": "Cicer arietinum",
    "category": "field_crop",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 5,
        "optimalMinC": 15,
        "optimalMaxC": 28,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 150,
        "optimalMin": 200,
        "optimalMax": 350,
        "maximum": 500
      },
      "frostTolerance": "low",
      "heatTolerance": "high",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6,
        "optimalMin": 6.5,
        "optimalMax": 8,
        "absoluteMax": 8.5
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1,
      "preferredOrganicMatterPercent": 2,
      "maximumElectricalConductivityDsM": 3.5,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 50,
      "calciumCarbonateTolerance": "high"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.25,
        "optimalMin": 0.4,
        "optimalMax": 0.75
      },
      "activeVegetationNdmi": {
        "minimum": -0.1,
        "optimalMin": 0,
        "optimalMax": 0.25
      },
      "maximumActiveSeasonBsi": 0.2,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "high",
      "fertilityDemand": "low",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "DRAINAGE_TOO_POOR",
        "field": "soil.drainage",
        "operator": "equal",
        "value": "poor",
        "severity": "major",
        "group": "DRAINAGE",
        "message": "Zayıf drenaj nohut için önemli bir kısıt oluşturabilir."
      },
      {
        "code": "SOIL_PH_TOO_LOW",
        "field": "soil.ph",
        "operator": "less_than",
        "value": 6,
        "severity": "major",
        "group": "PH",
        "message": "Düşük pH nodül oluşumu ve gelişimi sınırlandırabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 2,
          "endMonth": 3,
          "label": "İlkbahar ekim"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Çimlenme",
          "startOffsetDays": 0,
          "endOffsetDays": 20,
          "temperature": {
            "absoluteMinC": 5,
            "optimalMinC": 10,
            "optimalMaxC": 20,
            "absoluteMaxC": 30
          },
          "waterSensitivity": "low",
          "weight": 0.15,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 21,
          "endOffsetDays": 70,
          "temperature": {
            "absoluteMinC": 8,
            "optimalMinC": 14,
            "optimalMaxC": 26,
            "absoluteMaxC": 34
          },
          "waterSensitivity": "low",
          "weight": 0.25,
          "frostSensitivity": "low",
          "heatSensitivity": "medium"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 71,
          "endOffsetDays": 100,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 18,
            "optimalMaxC": 28,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "high"
        },
        {
          "id": "yieldFormation",
          "label": "Bakla oluşumu",
          "startOffsetDays": 101,
          "endOffsetDays": 130,
          "temperature": {
            "absoluteMinC": 14,
            "optimalMinC": 18,
            "optimalMaxC": 30,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "high"
        }
      ],
      "cycleLengthDays": {
        "minimum": 110,
        "typical": 130,
        "maximum": 150
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 30,
        "preferredMinimumCm": 50,
        "optimalMinimumCm": 70,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 8,
        "acceptableMaximumMeanPercent": 15,
        "maximumMeanPercent": 25,
        "maximumP90Percent": 35,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "medium"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "medium"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "chickpea",
    "internalCropCode": "chickpea",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "coriander",
    "name": "Kişniş (Aşotu)",
    "scientificName": "Coriandrum sativum",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -8,
        "optimalMinC": 15,
        "optimalMaxC": 27,
        "absoluteMaxC": 35
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "medium",
      "heatTolerance": "medium_high",
      "droughtTolerance": "medium_high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 6.7,
        "optimalMax": 7.6,
        "absoluteMax": 8.2
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "silt_loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 1.2,
      "salinityTolerance": "low_medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "medium_high"
    },
    "sourceMetadata": {
      "regionalNote": "Tohumu baharat, yaprakları taze sebze olarak çift yönlü kazanç sağlayan mahsul."
    }
  },
  {
    "id": "corn",
    "name": "Mısır",
    "scientificName": "Zea mays",
    "category": "field_crop",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 10,
        "optimalMinC": 18,
        "optimalMaxC": 30,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 450,
        "optimalMin": 550,
        "optimalMax": 800,
        "maximum": 1100
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 400,
        "optimalMax": 600,
        "maximum": 850
      },
      "frostTolerance": "low",
      "heatTolerance": "medium",
      "droughtTolerance": "low",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.2,
        "absoluteMax": 8
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "silt_loam"
      ],
      "acceptedTextures": [
        "sandy_loam"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "preferredOrganicMatterPercent": 2.5,
      "maximumElectricalConductivityDsM": 2.5,
      "salinityTolerance": "low",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 60,
      "calciumCarbonateTolerance": "medium"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.35,
        "optimalMin": 0.5,
        "optimalMax": 0.85
      },
      "activeVegetationNdmi": {
        "minimum": 0,
        "optimalMin": 0.1,
        "optimalMax": 0.4
      },
      "maximumActiveSeasonBsi": 0.15,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": true,
      "drainageImportance": "high",
      "fertilityDemand": "high",
      "mechanizationSuitability": "high"
    },
    "hardConstraints": [
      {
        "code": "SOIL_PH_TOO_HIGH",
        "field": "soil.ph",
        "operator": "greater_than",
        "value": 8,
        "severity": "major",
        "group": "PH",
        "message": "Yüksek pH mısır besin alımını sınırlandırabilir."
      },
      {
        "code": "FROST_RISK_HIGH",
        "field": "climate.frostRisk",
        "operator": "equal",
        "value": "high",
        "severity": "major",
        "group": "FROST",
        "message": "Yüksek don riski mısır için önemli bir kısıt oluşturabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 4,
          "endMonth": 5,
          "label": "İlkbahar ekim"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Çimlenme",
          "startOffsetDays": 0,
          "endOffsetDays": 15,
          "temperature": {
            "absoluteMinC": 10,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 36
          },
          "waterSensitivity": "medium",
          "weight": 0.1,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 16,
          "endOffsetDays": 60,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 18,
            "optimalMaxC": 30,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "high",
          "weight": 0.25,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 61,
          "endOffsetDays": 85,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 22,
            "optimalMaxC": 32,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "high",
          "weight": 0.35,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        },
        {
          "id": "yieldFormation",
          "label": "Koçan doldurma",
          "startOffsetDays": 86,
          "endOffsetDays": 130,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 20,
            "optimalMaxC": 32,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "medium",
          "heatSensitivity": "high"
        }
      ],
      "cycleLengthDays": {
        "minimum": 110,
        "typical": 130,
        "maximum": 150
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 40,
        "preferredMinimumCm": 60,
        "optimalMinimumCm": 90,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 6,
        "acceptableMaximumMeanPercent": 12,
        "maximumMeanPercent": 20,
        "maximumP90Percent": 30,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "none",
        "acceptableMaximum": "low",
        "maximum": "medium",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "not_observed",
        "maximum": "isolated",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "verified_accessible",
        "importance": "high"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "corn",
    "internalCropCode": "corn",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "cotton",
    "name": "Pamuk",
    "scientificName": "Gossypium hirsutum",
    "category": "field_crop",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 15,
        "optimalMinC": 22,
        "optimalMaxC": 34,
        "absoluteMaxC": 42
      },
      "annualPrecipitationMm": {
        "minimum": 400,
        "optimalMin": 500,
        "optimalMax": 800,
        "maximum": 1100
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "low",
      "heatTolerance": "high",
      "droughtTolerance": "medium",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.5,
        "absoluteMax": 8.5
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "silt_loam"
      ],
      "acceptedTextures": [
        "sandy_loam",
        "clay"
      ],
      "minimumOrganicMatterPercent": 1,
      "preferredOrganicMatterPercent": 2,
      "maximumElectricalConductivityDsM": 4,
      "salinityTolerance": "medium",
      "requiredDrainage": "moderate",
      "minimumSoilDepthCm": 70,
      "calciumCarbonateTolerance": "high"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.3,
        "optimalMin": 0.45,
        "optimalMax": 0.8
      },
      "activeVegetationNdmi": {
        "minimum": -0.05,
        "optimalMin": 0.05,
        "optimalMax": 0.35
      },
      "maximumActiveSeasonBsi": 0.18,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": true,
      "drainageImportance": "medium",
      "fertilityDemand": "high",
      "mechanizationSuitability": "high"
    },
    "hardConstraints": [
      {
        "code": "TEMP_TOO_LOW",
        "field": "climate.growingSeasonMeanC",
        "operator": "less_than",
        "value": 18,
        "severity": "major",
        "group": "TEMPERATURE",
        "message": "Büyüme dönemi sıcaklığı pamuk için düşük kalabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 4,
          "endMonth": 5,
          "label": "İlkbahar ekim"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Çimlenme",
          "startOffsetDays": 0,
          "endOffsetDays": 20,
          "temperature": {
            "absoluteMinC": 15,
            "optimalMinC": 20,
            "optimalMaxC": 32,
            "absoluteMaxC": 40
          },
          "waterSensitivity": "medium",
          "weight": 0.1,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 21,
          "endOffsetDays": 70,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 22,
            "optimalMaxC": 34,
            "absoluteMaxC": 42
          },
          "waterSensitivity": "medium",
          "weight": 0.25,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 71,
          "endOffsetDays": 110,
          "temperature": {
            "absoluteMinC": 18,
            "optimalMinC": 24,
            "optimalMaxC": 34,
            "absoluteMaxC": 42
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "yieldFormation",
          "label": "Koza oluşumu",
          "startOffsetDays": 111,
          "endOffsetDays": 160,
          "temperature": {
            "absoluteMinC": 18,
            "optimalMinC": 24,
            "optimalMaxC": 36,
            "absoluteMaxC": 42
          },
          "waterSensitivity": "high",
          "weight": 0.35,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        }
      ],
      "cycleLengthDays": {
        "minimum": 140,
        "typical": 160,
        "maximum": 190
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 45,
        "preferredMinimumCm": 70,
        "optimalMinimumCm": 90,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 6,
        "acceptableMaximumMeanPercent": 12,
        "maximumMeanPercent": 20,
        "maximumP90Percent": 30,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "none",
        "acceptableMaximum": "low",
        "maximum": "medium",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "not_observed",
        "maximum": "isolated",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "verified_accessible",
        "importance": "high"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "cotton",
    "internalCropCode": "cotton",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "cowpea",
    "name": "Börülce",
    "scientificName": "Vigna unguiculata",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "cowpea",
    "internalCropCode": "cowpea",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "cucumber",
    "name": "Salatalık",
    "scientificName": "Cucumis sativus",
    "category": "vegetable",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 12,
        "optimalMinC": 20,
        "optimalMaxC": 30,
        "absoluteMaxC": 35
      },
      "annualPrecipitationMm": {
        "minimum": 450,
        "optimalMin": 550,
        "optimalMax": 800,
        "maximum": 1000
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 400,
        "optimalMax": 600,
        "maximum": 800
      },
      "frostTolerance": "low",
      "heatTolerance": "medium",
      "droughtTolerance": "low",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7,
        "absoluteMax": 7.5
      },
      "preferredTextures": [
        "loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1.8,
      "preferredOrganicMatterPercent": 3,
      "maximumElectricalConductivityDsM": 2,
      "salinityTolerance": "low",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 50,
      "calciumCarbonateTolerance": "low"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.35,
        "optimalMin": 0.5,
        "optimalMax": 0.85
      },
      "activeVegetationNdmi": {
        "minimum": 0,
        "optimalMin": 0.1,
        "optimalMax": 0.4
      },
      "maximumActiveSeasonBsi": 0.12,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": true,
      "drainageImportance": "high",
      "fertilityDemand": "high",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "SOIL_PH_TOO_HIGH",
        "field": "soil.ph",
        "operator": "greater_than",
        "value": 7.8,
        "severity": "major",
        "group": "PH",
        "message": "Yüksek pH salatalık için uygun olmayabilir."
      },
      {
        "code": "SOIL_EC_TOO_HIGH",
        "field": "soil.electricalConductivityDsM",
        "operator": "greater_than",
        "value": 2.5,
        "severity": "major",
        "group": "SALINITY",
        "message": "Tuzluluk salatalık için kritik bir kısıt oluşturabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 4,
          "endMonth": 5,
          "label": "Açık tarla dikimi"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Tesis / tutma",
          "startOffsetDays": 0,
          "endOffsetDays": 15,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 18,
            "optimalMaxC": 28,
            "absoluteMaxC": 34
          },
          "waterSensitivity": "high",
          "weight": 0.15,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 16,
          "endOffsetDays": 40,
          "temperature": {
            "absoluteMinC": 14,
            "optimalMinC": 18,
            "optimalMaxC": 30,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "high",
          "weight": 0.25,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 41,
          "endOffsetDays": 70,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 20,
            "optimalMaxC": 30,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        },
        {
          "id": "yieldFormation",
          "label": "Meyve oluşumu",
          "startOffsetDays": 71,
          "endOffsetDays": 100,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 20,
            "optimalMaxC": 30,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        }
      ],
      "cycleLengthDays": {
        "minimum": 80,
        "typical": 100,
        "maximum": 120
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 30,
        "preferredMinimumCm": 50,
        "optimalMinimumCm": 70,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 5,
        "acceptableMaximumMeanPercent": 10,
        "maximumMeanPercent": 15,
        "maximumP90Percent": 22,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "very_low",
        "acceptableMaximumClass": "low",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "none",
        "acceptableMaximum": "low",
        "maximum": "medium",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "not_observed",
        "maximum": "isolated",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "verified_accessible",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [],
        "notPreferred": [
          "moderately_limited",
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "cucumber",
    "internalCropCode": "cucumber",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "cumin",
    "name": "Kimyon",
    "scientificName": "Cuminum cyminum",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "cumin",
    "internalCropCode": "cumin",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "dill",
    "name": "Dereotu",
    "scientificName": "Anethum graveolens",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "dill",
    "internalCropCode": "dill",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "durum_wheat",
    "name": "Makarnalık Sert Buğday (Svevo & Burgos)",
    "scientificName": "Triticum durum",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -16,
        "optimalMinC": 14,
        "optimalMaxC": 28,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 280,
        "optimalMin": 400,
        "optimalMax": 600,
        "maximum": 800
      },
      "frostTolerance": "very_high",
      "heatTolerance": "high",
      "droughtTolerance": "high",
      "irrigationDependency": "low_medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 7.0,
        "optimalMax": 8.0,
        "absoluteMax": 8.6
      },
      "preferredTextures": [
        "clay_loam",
        "clay",
        "loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1.2,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 70,
      "calciumCarbonateTolerance": "high"
    },
    "sourceMetadata": {
      "regionalNote": "Gaziantep bulgur ve makarna sanayisinin dünyaca ünlü yüksek proteinli altın sarısı buğdayı."
    }
  },
  {
    "id": "eggplant",
    "name": "Patlıcan",
    "scientificName": "Solanum melongena",
    "category": "vegetable",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 12,
        "optimalMinC": 22,
        "optimalMaxC": 32,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 400,
        "optimalMin": 500,
        "optimalMax": 750,
        "maximum": 950
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "low",
      "heatTolerance": "high",
      "droughtTolerance": "low",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.2,
        "absoluteMax": 7.8
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "preferredOrganicMatterPercent": 2.5,
      "maximumElectricalConductivityDsM": 2.5,
      "salinityTolerance": "low",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 55,
      "calciumCarbonateTolerance": "medium"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.35,
        "optimalMin": 0.5,
        "optimalMax": 0.85
      },
      "activeVegetationNdmi": {
        "minimum": -0.05,
        "optimalMin": 0.05,
        "optimalMax": 0.35
      },
      "maximumActiveSeasonBsi": 0.15,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": true,
      "drainageImportance": "high",
      "fertilityDemand": "high",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "SOIL_PH_TOO_HIGH",
        "field": "soil.ph",
        "operator": "greater_than",
        "value": 8,
        "severity": "major",
        "group": "PH",
        "message": "Yüksek pH patlıcan gelişimini sınırlandırabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 4,
          "endMonth": 5,
          "label": "Açık tarla dikimi"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Tesis / tutma",
          "startOffsetDays": 0,
          "endOffsetDays": 20,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 18,
            "optimalMaxC": 30,
            "absoluteMaxC": 36
          },
          "waterSensitivity": "high",
          "weight": 0.15,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 21,
          "endOffsetDays": 60,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 20,
            "optimalMaxC": 32,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "high",
          "weight": 0.2,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 61,
          "endOffsetDays": 100,
          "temperature": {
            "absoluteMinC": 18,
            "optimalMinC": 22,
            "optimalMaxC": 32,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "yieldFormation",
          "label": "Meyve oluşumu",
          "startOffsetDays": 101,
          "endOffsetDays": 160,
          "temperature": {
            "absoluteMinC": 18,
            "optimalMinC": 22,
            "optimalMaxC": 34,
            "absoluteMaxC": 40
          },
          "waterSensitivity": "high",
          "weight": 0.35,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        }
      ],
      "cycleLengthDays": {
        "minimum": 140,
        "typical": 160,
        "maximum": 190
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 35,
        "preferredMinimumCm": 55,
        "optimalMinimumCm": 75,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 5,
        "acceptableMaximumMeanPercent": 10,
        "maximumMeanPercent": 18,
        "maximumP90Percent": 25,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "very_low",
        "acceptableMaximumClass": "low",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "none",
        "acceptableMaximum": "low",
        "maximum": "medium",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "not_observed",
        "maximum": "isolated",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "verified_accessible",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [],
        "notPreferred": [
          "moderately_limited",
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "eggplant",
    "internalCropCode": "eggplant",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "fennel",
    "name": "Rezene",
    "scientificName": "Foeniculum vulgare",
    "category": "field_crop",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "fennel",
    "internalCropCode": "fennel",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "fenugreek",
    "name": "Çemen Otu (Boyotu)",
    "scientificName": "Trigonella foenum-graecum",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -6,
        "optimalMinC": 15,
        "optimalMaxC": 28,
        "absoluteMaxC": 36
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 500,
        "maximum": 700
      },
      "frostTolerance": "medium",
      "heatTolerance": "high",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 6.8,
        "optimalMax": 7.8,
        "absoluteMax": 8.4
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 1.0,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "high"
    },
    "sourceMetadata": {
      "regionalNote": "Hem toprağa azot bağlayan hem de baharat ve pastırma sanayisinde yüksek değerli baklagil."
    }
  },
  {
    "id": "fig",
    "name": "İncir",
    "scientificName": "Ficus carica",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "fig",
    "internalCropCode": "fig",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "garlic",
    "name": "Sarımsak",
    "scientificName": "Allium sativum",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "garlic",
    "internalCropCode": "garlic",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "gaziantep_eggplant",
    "name": "Antep Dolmalık Patlıcanı",
    "scientificName": "Solanum melongena var. Antep",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": 12,
        "optimalMinC": 22,
        "optimalMaxC": 33,
        "absoluteMaxC": 40
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 400,
        "optimalMax": 650,
        "maximum": 850
      },
      "frostTolerance": "none",
      "heatTolerance": "high",
      "droughtTolerance": "medium",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.4,
        "absoluteMax": 8.0
      },
      "preferredTextures": [
        "loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 1.8,
      "salinityTolerance": "low_medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 60,
      "calciumCarbonateTolerance": "medium"
    },
    "sourceMetadata": {
      "regionalNote": "Gaziantep mutfağının vazgeçilmezi; oyularak güneşte kurutulan tescilli dolmalık kuru patlıcan."
    }
  },
  {
    "id": "gaziantep_pepper",
    "name": "Antep Biberi (İsot & Salçalık)",
    "scientificName": "Capsicum annuum var. Gaziantep",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": 10,
        "optimalMinC": 20,
        "optimalMaxC": 32,
        "absoluteMaxC": 39
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 400,
        "optimalMax": 600,
        "maximum": 800
      },
      "frostTolerance": "low",
      "heatTolerance": "high",
      "droughtTolerance": "medium",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.5,
        "absoluteMax": 8.2
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "salinityTolerance": "low_medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 60,
      "calciumCarbonateTolerance": "medium_high"
    },
    "sourceMetadata": {
      "regionalNote": "Coğrafi işaretli Gaziantep kurutmalık, pul biber (isot) ve salça sanayisinin ana hammaddesi."
    }
  },
  {
    "id": "grape",
    "name": "Üzüm",
    "scientificName": "Vitis vinifera",
    "category": "perennial",
    "growingType": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": 5,
        "optimalMinC": 15,
        "optimalMaxC": 30,
        "absoluteMaxC": 40
      },
      "annualPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 400,
        "optimalMax": 700,
        "maximum": 1000
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 150,
        "optimalMin": 200,
        "optimalMax": 400,
        "maximum": 600
      },
      "frostTolerance": "medium",
      "heatTolerance": "high",
      "droughtTolerance": "medium",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.5,
        "absoluteMax": 8.5
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "silt_loam",
        "sand"
      ],
      "minimumOrganicMatterPercent": 1,
      "preferredOrganicMatterPercent": 2,
      "maximumElectricalConductivityDsM": 3.5,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 80,
      "calciumCarbonateTolerance": "high"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.3,
        "optimalMin": 0.45,
        "optimalMax": 0.8
      },
      "activeVegetationNdmi": {
        "minimum": -0.05,
        "optimalMin": 0.05,
        "optimalMax": 0.3
      },
      "maximumActiveSeasonBsi": 0.2,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": true,
        "expectedCycle": "perennial",
        "bareSoilBeforePlantingAcceptable": false
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "high",
      "fertilityDemand": "medium",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "DRAINAGE_TOO_POOR",
        "field": "soil.drainage",
        "operator": "equal",
        "value": "poor",
        "severity": "critical",
        "group": "DRAINAGE",
        "message": "Zayıf drenaj bağ için kritik bir kısıt oluşturabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 2,
          "endMonth": 3,
          "label": "Tesis dönemi"
        }
      ],
      "growthStages": [
        {
          "id": "dormancy",
          "label": "Dormansi",
          "startOffsetDays": 0,
          "endOffsetDays": 50,
          "temperature": {
            "absoluteMinC": -2,
            "optimalMinC": 2,
            "optimalMaxC": 12,
            "absoluteMaxC": 22
          },
          "waterSensitivity": "low",
          "weight": 0.15,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "budbreak",
          "label": "Tomurcuklanma",
          "startOffsetDays": 51,
          "endOffsetDays": 80,
          "temperature": {
            "absoluteMinC": 5,
            "optimalMinC": 10,
            "optimalMaxC": 20,
            "absoluteMaxC": 28
          },
          "waterSensitivity": "medium",
          "weight": 0.2,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 81,
          "endOffsetDays": 110,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 34
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "yieldFormation",
          "label": "Olgunlaşma",
          "startOffsetDays": 111,
          "endOffsetDays": 200,
          "temperature": {
            "absoluteMinC": 15,
            "optimalMinC": 18,
            "optimalMaxC": 32,
            "absoluteMaxC": 40
          },
          "waterSensitivity": "medium",
          "weight": 0.35,
          "frostSensitivity": "low",
          "heatSensitivity": "medium"
        }
      ],
      "cycleLengthDays": {
        "minimum": 180,
        "typical": 200,
        "maximum": 230
      },
      "perennial": {
        "isPerennial": true,
        "dormancyMonths": [
          12,
          1,
          2
        ],
        "chillingRequirementHours": 400,
        "establishmentYears": 3,
        "economicLifeYears": 30
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 50,
        "preferredMinimumCm": 80,
        "optimalMinimumCm": 100,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 8,
        "acceptableMaximumMeanPercent": 15,
        "maximumMeanPercent": 25,
        "maximumP90Percent": 35,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "grape",
    "internalCropCode": "grape",
    "seasonalOrPerennial": "perennial"
  },
  {
    "id": "green_lentil",
    "name": "Yeşil Mercimek",
    "scientificName": "Lens culinaris",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "green_lentil",
    "internalCropCode": "green_lentil",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "hawthorn",
    "name": "Alıç (Sarı & Kırmızı)",
    "scientificName": "Crataegus azarolus / monogyna",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -25,
        "optimalMinC": 13,
        "optimalMaxC": 33,
        "absoluteMaxC": 43
      },
      "annualPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 300,
        "optimalMax": 500,
        "maximum": 750
      },
      "frostTolerance": "very_high",
      "heatTolerance": "high",
      "droughtTolerance": "very_high",
      "irrigationDependency": "none"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 7.0,
        "optimalMax": 8.4,
        "absoluteMax": 8.9
      },
      "preferredTextures": [
        "sandy_loam",
        "loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "clay",
        "stony"
      ],
      "minimumOrganicMatterPercent": 0.5,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 50,
      "calciumCarbonateTolerance": "very_high"
    },
    "sourceMetadata": {
      "regionalNote": "Şehitkamil kıraç tepelerinde doğal yetişen, tıbbi sirke ve ekstrakt sanayisinde yüksek primli meyve."
    }
  },
  {
    "id": "lavender",
    "name": "Lavanta",
    "scientificName": "Lavandula",
    "category": "field_crop",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "lavender",
    "internalCropCode": "lavender",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "lentil",
    "name": "Mercimek",
    "scientificName": "Lens culinaris",
    "category": "field_crop",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 2,
        "optimalMinC": 12,
        "optimalMaxC": 26,
        "absoluteMaxC": 35
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 320,
        "optimalMax": 520,
        "maximum": 700
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 140,
        "optimalMin": 180,
        "optimalMax": 320,
        "maximum": 480
      },
      "frostTolerance": "medium",
      "heatTolerance": "medium",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.8,
        "absoluteMax": 8.4
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1,
      "preferredOrganicMatterPercent": 2,
      "maximumElectricalConductivityDsM": 3,
      "salinityTolerance": "low",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "medium"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.2,
        "optimalMin": 0.35,
        "optimalMax": 0.7
      },
      "activeVegetationNdmi": {
        "minimum": -0.1,
        "optimalMin": 0,
        "optimalMax": 0.25
      },
      "maximumActiveSeasonBsi": 0.22,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "high",
      "fertilityDemand": "low",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "SOIL_EC_TOO_HIGH",
        "field": "soil.electricalConductivityDsM",
        "operator": "greater_than",
        "value": 4,
        "severity": "major",
        "group": "SALINITY",
        "message": "Tuzluluk mercimek için önemli bir kısıt oluşturabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 10,
          "endMonth": 11,
          "label": "Sonbahar ekim"
        },
        {
          "startMonth": 2,
          "endMonth": 3,
          "label": "Erken ilkbahar ekim"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Çimlenme",
          "startOffsetDays": 0,
          "endOffsetDays": 18,
          "temperature": {
            "absoluteMinC": 4,
            "optimalMinC": 8,
            "optimalMaxC": 18,
            "absoluteMaxC": 28
          },
          "waterSensitivity": "low",
          "weight": 0.15,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 19,
          "endOffsetDays": 80,
          "temperature": {
            "absoluteMinC": 4,
            "optimalMinC": 10,
            "optimalMaxC": 22,
            "absoluteMaxC": 30
          },
          "waterSensitivity": "low",
          "weight": 0.25,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 81,
          "endOffsetDays": 110,
          "temperature": {
            "absoluteMinC": 10,
            "optimalMinC": 14,
            "optimalMaxC": 24,
            "absoluteMaxC": 32
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "medium"
        },
        {
          "id": "yieldFormation",
          "label": "Bakla oluşumu",
          "startOffsetDays": 111,
          "endOffsetDays": 140,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "medium"
        }
      ],
      "cycleLengthDays": {
        "minimum": 120,
        "typical": 140,
        "maximum": 170
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 25,
        "preferredMinimumCm": 40,
        "optimalMinimumCm": 60,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 10,
        "acceptableMaximumMeanPercent": 18,
        "maximumMeanPercent": 30,
        "maximumP90Percent": 40,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "low"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "medium"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "medium"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "medium"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "lentil",
    "internalCropCode": "lentil",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "lettuce",
    "name": "Marul",
    "scientificName": "Lactuca sativa",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "lettuce",
    "internalCropCode": "lettuce",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "mahaleb",
    "name": "Mahlep (İdris Ağacı)",
    "scientificName": "Prunus mahaleb",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -22,
        "optimalMinC": 14,
        "optimalMaxC": 34,
        "absoluteMaxC": 42
      },
      "annualPrecipitationMm": {
        "minimum": 220,
        "optimalMin": 350,
        "optimalMax": 600,
        "maximum": 850
      },
      "frostTolerance": "very_high",
      "heatTolerance": "high",
      "droughtTolerance": "very_high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.5,
        "optimalMin": 7.2,
        "optimalMax": 8.3,
        "absoluteMax": 8.9
      },
      "preferredTextures": [
        "loam",
        "stony_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 0.8,
      "salinityTolerance": "medium",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 60,
      "calciumCarbonateTolerance": "very_high"
    },
    "sourceMetadata": {
      "regionalNote": "Kireçli zeminlerde hem sert çekirdekli meyvelere anaç hem de değerli tohum baharatı."
    }
  },
  {
    "id": "melon",
    "name": "Kavun",
    "scientificName": "Cucumis melo",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "melon",
    "internalCropCode": "melon",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "mint",
    "name": "Gaziantep Kuru Nanesi",
    "scientificName": "Mentha spicata var. Gaziantep",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -15,
        "optimalMinC": 18,
        "optimalMaxC": 30,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 350,
        "optimalMin": 550,
        "optimalMax": 800,
        "maximum": 1100
      },
      "frostTolerance": "high",
      "heatTolerance": "high",
      "droughtTolerance": "low_medium",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 6.7,
        "optimalMax": 7.6,
        "absoluteMax": 8.2
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "silt_loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 2.0,
      "salinityTolerance": "low",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "medium"
    },
    "sourceMetadata": {
      "regionalNote": "Yılda 3-4 biçim yapılan, Gaziantep yemeklerinin baş tacı aromatik kuru nane."
    }
  },
  {
    "id": "mulberry",
    "name": "Dut (Beyaz & Karadut)",
    "scientificName": "Morus alba / Morus nigra",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -20,
        "optimalMinC": 15,
        "optimalMaxC": 34,
        "absoluteMaxC": 44
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 400,
        "optimalMax": 650,
        "maximum": 900
      },
      "frostTolerance": "high",
      "heatTolerance": "high",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.8,
        "absoluteMax": 8.5
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 1.0,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 80,
      "calciumCarbonateTolerance": "high"
    },
    "sourceMetadata": {
      "regionalNote": "Gaziantep pekmez, pestil ve kuru dut üretiminde yüksek ekonomik getiri sağlar."
    }
  },
  {
    "id": "oat",
    "name": "Yulaf",
    "scientificName": "Avena sativa",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "oat",
    "internalCropCode": "oat",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "olive",
    "name": "Zeytin",
    "scientificName": "Olea europaea",
    "category": "perennial",
    "growingType": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": 5,
        "optimalMinC": 15,
        "optimalMaxC": 32,
        "absoluteMaxC": 42
      },
      "annualPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 400,
        "optimalMax": 700,
        "maximum": 1000
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 100,
        "optimalMin": 150,
        "optimalMax": 350,
        "maximum": 550
      },
      "frostTolerance": "medium",
      "heatTolerance": "high",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6,
        "optimalMin": 6.5,
        "optimalMax": 8,
        "absoluteMax": 8.5
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "clay",
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 0.8,
      "preferredOrganicMatterPercent": 1.8,
      "maximumElectricalConductivityDsM": 4,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 80,
      "calciumCarbonateTolerance": "high"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.3,
        "optimalMin": 0.4,
        "optimalMax": 0.75
      },
      "activeVegetationNdmi": {
        "minimum": -0.1,
        "optimalMin": 0,
        "optimalMax": 0.25
      },
      "maximumActiveSeasonBsi": 0.22,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": true,
        "expectedCycle": "perennial",
        "bareSoilBeforePlantingAcceptable": false
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "high",
      "fertilityDemand": "low",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "FROST_RISK_HIGH",
        "field": "climate.frostRisk",
        "operator": "equal",
        "value": "high",
        "severity": "major",
        "group": "FROST",
        "message": "Yüksek don riski zeytin için önemli bir kısıt oluşturabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 2,
          "endMonth": 4,
          "label": "Tesis dönemi"
        }
      ],
      "growthStages": [
        {
          "id": "dormancy",
          "label": "Kış dinlenmesi",
          "startOffsetDays": 0,
          "endOffsetDays": 50,
          "temperature": {
            "absoluteMinC": -4,
            "optimalMinC": 4,
            "optimalMaxC": 14,
            "absoluteMaxC": 24
          },
          "waterSensitivity": "low",
          "weight": 0.15,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "budbreak",
          "label": "Tomurcuklanma",
          "startOffsetDays": 51,
          "endOffsetDays": 85,
          "temperature": {
            "absoluteMinC": 8,
            "optimalMinC": 12,
            "optimalMaxC": 22,
            "absoluteMaxC": 30
          },
          "waterSensitivity": "low",
          "weight": 0.2,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 86,
          "endOffsetDays": 115,
          "temperature": {
            "absoluteMinC": 14,
            "optimalMinC": 18,
            "optimalMaxC": 28,
            "absoluteMaxC": 34
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "medium",
          "heatSensitivity": "high"
        },
        {
          "id": "yieldFormation",
          "label": "Meyve gelişimi",
          "startOffsetDays": 116,
          "endOffsetDays": 240,
          "temperature": {
            "absoluteMinC": 14,
            "optimalMinC": 18,
            "optimalMaxC": 32,
            "absoluteMaxC": 40
          },
          "waterSensitivity": "low",
          "weight": 0.35,
          "frostSensitivity": "low",
          "heatSensitivity": "low"
        }
      ],
      "cycleLengthDays": {
        "minimum": 220,
        "typical": 240,
        "maximum": 270
      },
      "perennial": {
        "isPerennial": true,
        "dormancyMonths": [
          12,
          1
        ],
        "chillingRequirementHours": 200,
        "establishmentYears": 4,
        "economicLifeYears": 50
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 50,
        "preferredMinimumCm": 80,
        "optimalMinimumCm": 100,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 10,
        "acceptableMaximumMeanPercent": 18,
        "maximumMeanPercent": 30,
        "maximumP90Percent": 40,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "medium"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "olive",
    "internalCropCode": "olive",
    "seasonalOrPerennial": "perennial"
  },
  {
    "id": "onion",
    "name": "Soğan",
    "scientificName": "Allium cepa",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "onion",
    "internalCropCode": "onion",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "parsley",
    "name": "Maydanoz",
    "scientificName": "Petroselinum crispum",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "parsley",
    "internalCropCode": "parsley",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "peach",
    "name": "Şeftali",
    "scientificName": "Prunus persica",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "peach",
    "internalCropCode": "peach",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "pear",
    "name": "Armut",
    "scientificName": "Pyrus",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "pear",
    "internalCropCode": "pear",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "pepper",
    "name": "Biber",
    "scientificName": "Capsicum annuum",
    "category": "vegetable",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 12,
        "optimalMinC": 20,
        "optimalMaxC": 30,
        "absoluteMaxC": 36
      },
      "annualPrecipitationMm": {
        "minimum": 400,
        "optimalMin": 500,
        "optimalMax": 700,
        "maximum": 900
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "low",
      "heatTolerance": "medium",
      "droughtTolerance": "low",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7,
        "absoluteMax": 7.5
      },
      "preferredTextures": [
        "loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "clay_loam",
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "preferredOrganicMatterPercent": 2.5,
      "maximumElectricalConductivityDsM": 2,
      "salinityTolerance": "low",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 50,
      "calciumCarbonateTolerance": "low"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.35,
        "optimalMin": 0.5,
        "optimalMax": 0.8
      },
      "activeVegetationNdmi": {
        "minimum": -0.05,
        "optimalMin": 0.05,
        "optimalMax": 0.3
      },
      "maximumActiveSeasonBsi": 0.15,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": true,
      "drainageImportance": "high",
      "fertilityDemand": "high",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "SOIL_PH_TOO_HIGH",
        "field": "soil.ph",
        "operator": "greater_than",
        "value": 7.8,
        "severity": "major",
        "group": "PH",
        "message": "Yüksek pH biber besin alımını sınırlandırabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 4,
          "endMonth": 5,
          "label": "Açık tarla dikimi"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Tesis / tutma",
          "startOffsetDays": 0,
          "endOffsetDays": 20,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 34
          },
          "waterSensitivity": "high",
          "weight": 0.15,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 21,
          "endOffsetDays": 60,
          "temperature": {
            "absoluteMinC": 14,
            "optimalMinC": 18,
            "optimalMaxC": 30,
            "absoluteMaxC": 36
          },
          "waterSensitivity": "high",
          "weight": 0.2,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 61,
          "endOffsetDays": 100,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 20,
            "optimalMaxC": 30,
            "absoluteMaxC": 36
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        },
        {
          "id": "yieldFormation",
          "label": "Meyve oluşumu",
          "startOffsetDays": 101,
          "endOffsetDays": 160,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 20,
            "optimalMaxC": 32,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "high",
          "weight": 0.35,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        }
      ],
      "cycleLengthDays": {
        "minimum": 140,
        "typical": 160,
        "maximum": 190
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 30,
        "preferredMinimumCm": 50,
        "optimalMinimumCm": 70,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 5,
        "acceptableMaximumMeanPercent": 10,
        "maximumMeanPercent": 18,
        "maximumP90Percent": 25,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "very_low",
        "acceptableMaximumClass": "low",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "none",
        "acceptableMaximum": "low",
        "maximum": "medium",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "not_observed",
        "maximum": "isolated",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "verified_accessible",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [],
        "notPreferred": [
          "moderately_limited",
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "pepper",
    "internalCropCode": "pepper",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "persimmon",
    "name": "Trabzon Hurması (Cennet Meyvesi)",
    "scientificName": "Diospyros kaki",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -14,
        "optimalMinC": 15,
        "optimalMaxC": 32,
        "absoluteMaxC": 40
      },
      "annualPrecipitationMm": {
        "minimum": 350,
        "optimalMin": 500,
        "optimalMax": 800,
        "maximum": 1100
      },
      "frostTolerance": "medium",
      "heatTolerance": "high",
      "droughtTolerance": "medium",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.5,
        "absoluteMax": 8.2
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1.2,
      "salinityTolerance": "low_medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 90,
      "calciumCarbonateTolerance": "medium"
    },
    "sourceMetadata": {
      "regionalNote": "Kurutmalık ve taze tüketimde Gaziantep ve çevresinde hızla yayılan karlı alternatif."
    }
  },
  {
    "id": "pistachio",
    "name": "Antep fıstığı",
    "scientificName": "Pistacia vera",
    "category": "perennial",
    "growingType": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": 5,
        "optimalMinC": 18,
        "optimalMaxC": 35,
        "absoluteMaxC": 45
      },
      "annualPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 300,
        "optimalMax": 550,
        "maximum": 750
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 80,
        "optimalMin": 120,
        "optimalMax": 280,
        "maximum": 450
      },
      "frostTolerance": "medium",
      "heatTolerance": "high",
      "droughtTolerance": "high",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.5,
        "optimalMin": 7,
        "optimalMax": 8.2,
        "absoluteMax": 8.8
      },
      "preferredTextures": [
        "clay_loam",
        "loam",
        "sandy_loam"
      ],
      "acceptedTextures": [
        "clay",
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 0.8,
      "preferredOrganicMatterPercent": 1.5,
      "maximumElectricalConductivityDsM": 4,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 100,
      "calciumCarbonateTolerance": "high"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.25,
        "optimalMin": 0.4,
        "optimalMax": 0.7
      },
      "activeVegetationNdmi": {
        "minimum": -0.15,
        "optimalMin": -0.05,
        "optimalMax": 0.2
      },
      "maximumActiveSeasonBsi": 0.25,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": true,
        "expectedCycle": "perennial",
        "bareSoilBeforePlantingAcceptable": false
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "high",
      "fertilityDemand": "low",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "SOIL_DEPTH_LOW",
        "field": "soil.depthCm",
        "operator": "less_than",
        "value": 60,
        "severity": "major",
        "group": "DEPTH",
        "message": "Sığ toprak derinliği Antep fıstığı için önemli bir kısıt oluşturabilir."
      },
      {
        "code": "DRAINAGE_TOO_POOR",
        "field": "soil.drainage",
        "operator": "equal",
        "value": "poor",
        "severity": "major",
        "group": "DRAINAGE",
        "message": "Zayıf drenaj kök sağlığını olumsuz etkileyebilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir.",
        "Alternans olasılığı bu sürümde yalnızca limitation olarak değerlendirilir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 11,
          "endMonth": 2,
          "label": "Tesis dönemi (kış-ilkbahar)"
        }
      ],
      "growthStages": [
        {
          "id": "dormancy",
          "label": "Dormansi / soğuklama",
          "startOffsetDays": 0,
          "endOffsetDays": 60,
          "temperature": {
            "absoluteMinC": -5,
            "optimalMinC": 2,
            "optimalMaxC": 12,
            "absoluteMaxC": 22
          },
          "waterSensitivity": "low",
          "weight": 0.15,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "budbreak",
          "label": "Tomurcuklanma",
          "startOffsetDays": 61,
          "endOffsetDays": 90,
          "temperature": {
            "absoluteMinC": 4,
            "optimalMinC": 10,
            "optimalMaxC": 20,
            "absoluteMaxC": 30
          },
          "waterSensitivity": "medium",
          "weight": 0.2,
          "frostSensitivity": "high",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 91,
          "endOffsetDays": 120,
          "temperature": {
            "absoluteMinC": 10,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 36
          },
          "waterSensitivity": "medium",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "yieldFormation",
          "label": "Meyve gelişimi",
          "startOffsetDays": 121,
          "endOffsetDays": 220,
          "temperature": {
            "absoluteMinC": 16,
            "optimalMinC": 22,
            "optimalMaxC": 35,
            "absoluteMaxC": 45
          },
          "waterSensitivity": "medium",
          "weight": 0.35,
          "frostSensitivity": "low",
          "heatSensitivity": "low"
        }
      ],
      "cycleLengthDays": {
        "minimum": 200,
        "typical": 220,
        "maximum": 250
      },
      "perennial": {
        "isPerennial": true,
        "dormancyMonths": [
          12,
          1,
          2
        ],
        "chillingRequirementHours": 600,
        "establishmentYears": 5,
        "economicLifeYears": 40
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 60,
        "preferredMinimumCm": 90,
        "optimalMinimumCm": 120,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 8,
        "acceptableMaximumMeanPercent": 15,
        "maximumMeanPercent": 25,
        "maximumP90Percent": 35,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "pistachio",
    "internalCropCode": "pistachio",
    "seasonalOrPerennial": "perennial"
  },
  {
    "id": "plum",
    "name": "Erik",
    "scientificName": "Prunus domestica",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "plum",
    "internalCropCode": "plum",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "pomegranate",
    "name": "Nar",
    "scientificName": "Punica granatum",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "pomegranate",
    "internalCropCode": "pomegranate",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "potato",
    "name": "Patates",
    "scientificName": "Solanum tuberosum",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "potato",
    "internalCropCode": "potato",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "quince",
    "name": "Ayva (Eşme & Yerli)",
    "scientificName": "Cydonia oblonga",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -18,
        "optimalMinC": 15,
        "optimalMaxC": 32,
        "absoluteMaxC": 41
      },
      "annualPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 450,
        "optimalMax": 700,
        "maximum": 950
      },
      "frostTolerance": "high",
      "heatTolerance": "high",
      "droughtTolerance": "medium",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.2,
        "optimalMin": 6.8,
        "optimalMax": 7.8,
        "absoluteMax": 8.4
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "sandy_clay_loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 1.2,
      "salinityTolerance": "low_medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 80,
      "calciumCarbonateTolerance": "medium_high"
    },
    "sourceMetadata": {
      "regionalNote": "Killi-tınlı topraklarda düzenli damla sulamayla üstün rekolte ve depolama kalitesi."
    }
  },
  {
    "id": "radish",
    "name": "Turp",
    "scientificName": "Raphanus sativus",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "radish",
    "internalCropCode": "radish",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "red_lentil",
    "name": "Kırmızı Mercimek",
    "scientificName": "Lens culinaris",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "red_lentil",
    "internalCropCode": "red_lentil",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "rocket",
    "name": "Roka",
    "scientificName": "Eruca vesicaria",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "rocket",
    "internalCropCode": "rocket",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "rosemary",
    "name": "Biberiye",
    "scientificName": "Salvia rosmarinus",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -10,
        "optimalMinC": 16,
        "optimalMaxC": 35,
        "absoluteMaxC": 44
      },
      "annualPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 300,
        "optimalMax": 500,
        "maximum": 750
      },
      "frostTolerance": "medium",
      "heatTolerance": "very_high",
      "droughtTolerance": "very_high",
      "irrigationDependency": "none"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.5,
        "optimalMin": 7.0,
        "optimalMax": 8.4,
        "absoluteMax": 8.8
      },
      "preferredTextures": [
        "sandy_loam",
        "loam",
        "stony"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 0.8,
      "salinityTolerance": "medium_high",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 45,
      "calciumCarbonateTolerance": "very_high"
    },
    "sourceMetadata": {
      "regionalNote": "Uçucu yağ ve kozmetik sanayisinde yüksek katma değerli çok yıllık aromatik çalı."
    }
  },
  {
    "id": "safflower",
    "name": "Aspir (Yağlık & Boyalık)",
    "scientificName": "Carthamus tinctorius",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -12,
        "optimalMinC": 17,
        "optimalMaxC": 34,
        "absoluteMaxC": 42
      },
      "annualPrecipitationMm": {
        "minimum": 220,
        "optimalMin": 300,
        "optimalMax": 500,
        "maximum": 700
      },
      "frostTolerance": "high",
      "heatTolerance": "very_high",
      "droughtTolerance": "extreme",
      "irrigationDependency": "none"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.8,
        "optimalMax": 8.2,
        "absoluteMax": 8.8
      },
      "preferredTextures": [
        "clay_loam",
        "loam",
        "clay"
      ],
      "acceptedTextures": [
        "sandy_loam"
      ],
      "minimumOrganicMatterPercent": 0.8,
      "salinityTolerance": "high",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 80,
      "calciumCarbonateTolerance": "very_high"
    },
    "sourceMetadata": {
      "regionalNote": "Derin kök sistemiyle kurak tarlalarda ve nadas alanlarında nadası azaltan yağ bitkisi."
    }
  },
  {
    "id": "sage",
    "name": "Adaçayı",
    "scientificName": "Salvia officinalis",
    "category": "field_crop",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "sage",
    "internalCropCode": "sage",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "sainfoin",
    "name": "Korunga",
    "scientificName": "Onobrychis viciifolia",
    "category": "field_crop",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "sainfoin",
    "internalCropCode": "sainfoin",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "sesame",
    "name": "Susam (Gaziantep Tahinlik)",
    "scientificName": "Sesamum indicum",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": 15,
        "optimalMinC": 25,
        "optimalMaxC": 36,
        "absoluteMaxC": 44
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "none",
      "heatTolerance": "very_high",
      "droughtTolerance": "high",
      "irrigationDependency": "low_medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.8,
        "optimalMin": 6.5,
        "optimalMax": 7.8,
        "absoluteMax": 8.4
      },
      "preferredTextures": [
        "sandy_loam",
        "loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 0.9,
      "salinityTolerance": "low_medium",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 60,
      "calciumCarbonateTolerance": "high"
    },
    "sourceMetadata": {
      "regionalNote": "Buğday ve arpa hasadı sonrası ikinci ürün olarak ekilen, helva ve tahin sanayisinin ana girdisi."
    }
  },
  {
    "id": "silage_maize",
    "name": "Silajlık Mısır",
    "scientificName": "Zea mays",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "silage_maize",
    "internalCropCode": "silage_maize",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "snake_melon",
    "name": "Gaziantep Acuru",
    "scientificName": "Cucumis melo var. flexuosus",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": 12,
        "optimalMinC": 22,
        "optimalMaxC": 34,
        "absoluteMaxC": 42
      },
      "annualPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "none",
      "heatTolerance": "very_high",
      "droughtTolerance": "high",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.8,
        "absoluteMax": 8.3
      },
      "preferredTextures": [
        "sandy_loam",
        "loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "clay"
      ],
      "minimumOrganicMatterPercent": 1.0,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 50,
      "calciumCarbonateTolerance": "high"
    },
    "sourceMetadata": {
      "regionalNote": "Gaziantep turşuluk ve taze dolmalık üretiminde yüksek pazar talebi olan yerli çeşit."
    }
  },
  {
    "id": "sour_cherry",
    "name": "Vişne (Kütahya)",
    "scientificName": "Prunus cerasus",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -22,
        "optimalMinC": 13,
        "optimalMaxC": 30,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 350,
        "optimalMin": 500,
        "optimalMax": 750,
        "maximum": 1000
      },
      "frostTolerance": "very_high",
      "heatTolerance": "medium",
      "droughtTolerance": "medium",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.6,
        "absoluteMax": 8.2
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "salinityTolerance": "low",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 80,
      "calciumCarbonateTolerance": "medium"
    },
    "sourceMetadata": {
      "regionalNote": "Şehitkamil yüksek rakımlı yayla köylerinde meyve suyu ve dondurulmuş gıda pazarına uygun."
    }
  },
  {
    "id": "spinach",
    "name": "Ispanak",
    "scientificName": "Spinacia oleracea",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "spinach",
    "internalCropCode": "spinach",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "sugar_beet",
    "name": "Şeker Pancarı",
    "scientificName": "Beta vulgaris",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "sugar_beet",
    "internalCropCode": "sugar_beet",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "sumac",
    "name": "Gaziantep Dağ Sumağı",
    "scientificName": "Rhus coriaria",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -15,
        "optimalMinC": 16,
        "optimalMaxC": 36,
        "absoluteMaxC": 45
      },
      "annualPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 800
      },
      "frostTolerance": "high",
      "heatTolerance": "very_high",
      "droughtTolerance": "very_high",
      "irrigationDependency": "none"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.5,
        "optimalMin": 7.0,
        "optimalMax": 8.2,
        "absoluteMax": 8.8
      },
      "preferredTextures": [
        "sandy_loam",
        "loam",
        "stony"
      ],
      "acceptedTextures": [
        "clay_loam",
        "clay"
      ],
      "minimumOrganicMatterPercent": 0.6,
      "salinityTolerance": "high",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 50,
      "calciumCarbonateTolerance": "very_high"
    },
    "sourceMetadata": {
      "regionalNote": "Kıraç, eğimli ve taşlık yamaçlarda sıfır sulama ile en yüksek katma değerli baharat üretimi."
    }
  },
  {
    "id": "sunflower",
    "name": "Ayçiçeği",
    "scientificName": "Helianthus annuus",
    "category": "field_crop",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 8,
        "optimalMinC": 18,
        "optimalMaxC": 30,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 400,
        "optimalMax": 650,
        "maximum": 900
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 280,
        "optimalMax": 450,
        "maximum": 650
      },
      "frostTolerance": "low",
      "heatTolerance": "high",
      "droughtTolerance": "medium",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.5,
        "absoluteMax": 8.3
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1,
      "preferredOrganicMatterPercent": 2,
      "maximumElectricalConductivityDsM": 3,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 60,
      "calciumCarbonateTolerance": "medium"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.3,
        "optimalMin": 0.45,
        "optimalMax": 0.8
      },
      "activeVegetationNdmi": {
        "minimum": -0.05,
        "optimalMin": 0.05,
        "optimalMax": 0.3
      },
      "maximumActiveSeasonBsi": 0.18,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "high",
      "fertilityDemand": "medium",
      "mechanizationSuitability": "high"
    },
    "hardConstraints": [
      {
        "code": "SOIL_DEPTH_LOW",
        "field": "soil.depthCm",
        "operator": "less_than",
        "value": 40,
        "severity": "major",
        "group": "DEPTH",
        "message": "Sığ toprak derinliği ayçiçeği kök gelişimini sınırlandırabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 3,
          "endMonth": 4,
          "label": "İlkbahar ekim"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Çimlenme",
          "startOffsetDays": 0,
          "endOffsetDays": 15,
          "temperature": {
            "absoluteMinC": 8,
            "optimalMinC": 14,
            "optimalMaxC": 26,
            "absoluteMaxC": 34
          },
          "waterSensitivity": "medium",
          "weight": 0.15,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 16,
          "endOffsetDays": 60,
          "temperature": {
            "absoluteMinC": 10,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 36
          },
          "waterSensitivity": "medium",
          "weight": 0.25,
          "frostSensitivity": "low",
          "heatSensitivity": "medium"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 61,
          "endOffsetDays": 90,
          "temperature": {
            "absoluteMinC": 14,
            "optimalMinC": 18,
            "optimalMaxC": 30,
            "absoluteMaxC": 38
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "medium"
        },
        {
          "id": "yieldFormation",
          "label": "Tane doldurma",
          "startOffsetDays": 91,
          "endOffsetDays": 130,
          "temperature": {
            "absoluteMinC": 14,
            "optimalMinC": 18,
            "optimalMaxC": 32,
            "absoluteMaxC": 40
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "high"
        }
      ],
      "cycleLengthDays": {
        "minimum": 110,
        "typical": 130,
        "maximum": 150
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 40,
        "preferredMinimumCm": 60,
        "optimalMinimumCm": 80,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 8,
        "acceptableMaximumMeanPercent": 15,
        "maximumMeanPercent": 25,
        "maximumP90Percent": 35,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "medium"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "medium"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "sunflower",
    "internalCropCode": "sunflower",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "terebinth",
    "name": "Menengiç (Çitlembik / Bıttım)",
    "scientificName": "Pistacia terebinthus",
    "category": "perennial",
    "growingType": "perennial",
    "seasonalOrPerennial": "perennial",
    "climate": {
      "temperature": {
        "absoluteMinC": -16,
        "optimalMinC": 16,
        "optimalMaxC": 36,
        "absoluteMaxC": 46
      },
      "annualPrecipitationMm": {
        "minimum": 200,
        "optimalMin": 300,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "high",
      "heatTolerance": "very_high",
      "droughtTolerance": "extreme",
      "irrigationDependency": "none"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.5,
        "optimalMin": 7.2,
        "optimalMax": 8.5,
        "absoluteMax": 9.0
      },
      "preferredTextures": [
        "stony",
        "sandy_loam",
        "loam"
      ],
      "acceptedTextures": [
        "clay_loam",
        "clay"
      ],
      "minimumOrganicMatterPercent": 0.5,
      "salinityTolerance": "high",
      "requiredDrainage": "very_good",
      "minimumSoilDepthCm": 40,
      "calciumCarbonateTolerance": "very_high"
    },
    "sourceMetadata": {
      "regionalNote": "Menengiç kahvesi, bıttım sabunu ve Antep fıstığı aşılamasında bölgenin temel anaç ağacı."
    }
  },
  {
    "id": "thyme",
    "name": "Kekik",
    "scientificName": "Thymus vulgaris",
    "category": "field_crop",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "thyme",
    "internalCropCode": "thyme",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "tomato",
    "name": "Domates",
    "scientificName": "Solanum lycopersicum",
    "category": "vegetable",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 10,
        "optimalMinC": 20,
        "optimalMaxC": 30,
        "absoluteMaxC": 38
      },
      "annualPrecipitationMm": {
        "minimum": 400,
        "optimalMin": 500,
        "optimalMax": 700,
        "maximum": 900
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 550,
        "maximum": 750
      },
      "frostTolerance": "low",
      "heatTolerance": "medium",
      "droughtTolerance": "low",
      "irrigationDependency": "high"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7,
        "absoluteMax": 7.8
      },
      "preferredTextures": [
        "loam",
        "sandy_loam",
        "clay_loam"
      ],
      "acceptedTextures": [
        "silt_loam"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "preferredOrganicMatterPercent": 2.5,
      "maximumElectricalConductivityDsM": 2.5,
      "salinityTolerance": "low",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 60,
      "calciumCarbonateTolerance": "medium"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.35,
        "optimalMin": 0.5,
        "optimalMax": 0.85
      },
      "activeVegetationNdmi": {
        "minimum": -0.05,
        "optimalMin": 0.05,
        "optimalMax": 0.35
      },
      "maximumActiveSeasonBsi": 0.15,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": true,
      "drainageImportance": "high",
      "fertilityDemand": "high",
      "mechanizationSuitability": "medium"
    },
    "hardConstraints": [
      {
        "code": "SOIL_PH_TOO_HIGH",
        "field": "soil.ph",
        "operator": "greater_than",
        "value": 8,
        "severity": "critical",
        "group": "PH",
        "message": "Yüksek pH ürün gelişimini önemli ölçüde sınırlandırabilir."
      },
      {
        "code": "SOIL_EC_TOO_HIGH",
        "field": "soil.electricalConductivityDsM",
        "operator": "greater_than",
        "value": 3.5,
        "severity": "major",
        "group": "SALINITY",
        "message": "Yüksek EC tuzluluk baskısı oluşturabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 4,
          "endMonth": 5,
          "label": "Açık tarla dikimi"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Tesis / tutma",
          "startOffsetDays": 0,
          "endOffsetDays": 20,
          "temperature": {
            "absoluteMinC": 10,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "high",
          "weight": 0.15,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 21,
          "endOffsetDays": 55,
          "temperature": {
            "absoluteMinC": 12,
            "optimalMinC": 18,
            "optimalMaxC": 28,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "high",
          "weight": 0.2,
          "frostSensitivity": "high",
          "heatSensitivity": "medium"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 56,
          "endOffsetDays": 90,
          "temperature": {
            "absoluteMinC": 15,
            "optimalMinC": 20,
            "optimalMaxC": 30,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        },
        {
          "id": "yieldFormation",
          "label": "Meyve oluşumu",
          "startOffsetDays": 91,
          "endOffsetDays": 140,
          "temperature": {
            "absoluteMinC": 15,
            "optimalMinC": 20,
            "optimalMaxC": 30,
            "absoluteMaxC": 36
          },
          "waterSensitivity": "high",
          "weight": 0.35,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        }
      ],
      "cycleLengthDays": {
        "minimum": 120,
        "typical": 140,
        "maximum": 170
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 40,
        "preferredMinimumCm": 60,
        "optimalMinimumCm": 80,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 5,
        "acceptableMaximumMeanPercent": 10,
        "maximumMeanPercent": 18,
        "maximumP90Percent": 25,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "very_low",
        "acceptableMaximumClass": "low",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "none",
        "acceptableMaximum": "low",
        "maximum": "medium",
        "importance": "high"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "not_observed",
        "maximum": "isolated",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "verified_accessible",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [],
        "notPreferred": [
          "moderately_limited",
          "poor",
          "waterlogging_observed"
        ],
        "importance": "high"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "tomato",
    "internalCropCode": "tomato",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "triticale",
    "name": "Tritikale",
    "scientificName": "Triticosecale",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "triticale",
    "internalCropCode": "triticale",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "turnip",
    "name": "Şalgam (Mor Havuç / Şalgam Turpu)",
    "scientificName": "Brassica rapa subsp. rapa",
    "category": "annual",
    "growingType": "annual",
    "seasonalOrPerennial": "seasonal",
    "climate": {
      "temperature": {
        "absoluteMinC": -7,
        "optimalMinC": 13,
        "optimalMaxC": 24,
        "absoluteMaxC": 32
      },
      "annualPrecipitationMm": {
        "minimum": 300,
        "optimalMin": 400,
        "optimalMax": 600,
        "maximum": 800
      },
      "frostTolerance": "high",
      "heatTolerance": "medium",
      "droughtTolerance": "low_medium",
      "irrigationDependency": "medium"
    },
    "soil": {
      "ph": {
        "absoluteMin": 6.0,
        "optimalMin": 6.5,
        "optimalMax": 7.5,
        "absoluteMax": 8.0
      },
      "preferredTextures": [
        "sandy_loam",
        "loam",
        "silt_loam"
      ],
      "acceptedTextures": [
        "clay_loam"
      ],
      "minimumOrganicMatterPercent": 1.5,
      "salinityTolerance": "medium",
      "requiredDrainage": "good",
      "minimumSoilDepthCm": 45,
      "calciumCarbonateTolerance": "medium"
    },
    "sourceMetadata": {
      "regionalNote": "Sonbahar ekimiyle geleneksel şalgam suyu üretiminde yüksek hacimli endüstriyel kök bitkisi."
    }
  },
  {
    "id": "vetch",
    "name": "Fiğ",
    "scientificName": "Vicia sativa",
    "category": "field_crop",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "vetch",
    "internalCropCode": "vetch",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "walnut",
    "name": "Ceviz",
    "scientificName": "Juglans regia",
    "category": "perennial",
    "growingType": "perennial",
    "profileStatus": "identity_only",
    "slug": "walnut",
    "internalCropCode": "walnut",
    "seasonalOrPerennial": "perennial",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "watermelon",
    "name": "Karpuz",
    "scientificName": "Citrullus lanatus",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "watermelon",
    "internalCropCode": "watermelon",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  },
  {
    "id": "wheat",
    "name": "Buğday",
    "scientificName": "Triticum aestivum",
    "category": "field_crop",
    "growingType": "annual",
    "climate": {
      "temperature": {
        "absoluteMinC": 0,
        "optimalMinC": 12,
        "optimalMaxC": 24,
        "absoluteMaxC": 35
      },
      "annualPrecipitationMm": {
        "minimum": 250,
        "optimalMin": 350,
        "optimalMax": 650,
        "maximum": 900
      },
      "growingSeasonPrecipitationMm": {
        "minimum": 150,
        "optimalMin": 220,
        "optimalMax": 450,
        "maximum": 650
      },
      "frostTolerance": "medium",
      "heatTolerance": "medium",
      "droughtTolerance": "medium",
      "irrigationDependency": "low"
    },
    "soil": {
      "ph": {
        "absoluteMin": 5.5,
        "optimalMin": 6,
        "optimalMax": 7.5,
        "absoluteMax": 8.5
      },
      "preferredTextures": [
        "loam",
        "clay_loam",
        "silt_loam"
      ],
      "acceptedTextures": [
        "sandy_loam",
        "clay"
      ],
      "minimumOrganicMatterPercent": 1,
      "preferredOrganicMatterPercent": 2,
      "maximumElectricalConductivityDsM": 4,
      "salinityTolerance": "medium",
      "requiredDrainage": "moderate",
      "minimumSoilDepthCm": 50,
      "calciumCarbonateTolerance": "high"
    },
    "remoteSensing": {
      "activeVegetationNdvi": {
        "minimum": 0.25,
        "optimalMin": 0.4,
        "optimalMax": 0.8
      },
      "activeVegetationNdmi": {
        "minimum": -0.1,
        "optimalMin": 0,
        "optimalMax": 0.3
      },
      "maximumActiveSeasonBsi": 0.2,
      "seasonalInterpretation": {
        "requiresPersistentVegetation": false,
        "expectedCycle": "annual",
        "bareSoilBeforePlantingAcceptable": true
      }
    },
    "management": {
      "irrigationRequired": false,
      "drainageImportance": "medium",
      "fertilityDemand": "medium",
      "mechanizationSuitability": "high"
    },
    "hardConstraints": [
      {
        "code": "SOIL_PH_TOO_HIGH",
        "field": "soil.ph",
        "operator": "greater_than",
        "value": 8.5,
        "severity": "critical",
        "group": "PH",
        "message": "Yüksek pH ürün gelişimini önemli ölçüde sınırlandırabilir."
      },
      {
        "code": "SOIL_EC_TOO_HIGH",
        "field": "soil.electricalConductivityDsM",
        "operator": "greater_than",
        "value": 6,
        "severity": "major",
        "group": "SALINITY",
        "message": "Yüksek elektriksel iletkenlik tuzluluk baskısı oluşturabilir."
      }
    ],
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Değerler geliştirme amaçlı başlangıç kurallarıdır.",
        "Ziraat mühendisi doğrulaması gerektirir."
      ]
    },
    "phenology": {
      "hemisphere": "northern",
      "plantingWindows": [
        {
          "startMonth": 10,
          "endMonth": 11,
          "label": "Kışlık ekim"
        }
      ],
      "growthStages": [
        {
          "id": "germination",
          "label": "Çimlenme",
          "startOffsetDays": 0,
          "endOffsetDays": 20,
          "temperature": {
            "absoluteMinC": 4,
            "optimalMinC": 8,
            "optimalMaxC": 18,
            "absoluteMaxC": 28
          },
          "waterSensitivity": "medium",
          "weight": 0.15,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "vegetative",
          "label": "Vejetatif gelişme",
          "startOffsetDays": 21,
          "endOffsetDays": 100,
          "temperature": {
            "absoluteMinC": 0,
            "optimalMinC": 8,
            "optimalMaxC": 18,
            "absoluteMaxC": 28
          },
          "waterSensitivity": "medium",
          "weight": 0.25,
          "frostSensitivity": "medium",
          "heatSensitivity": "low"
        },
        {
          "id": "flowering",
          "label": "Çiçeklenme",
          "startOffsetDays": 101,
          "endOffsetDays": 130,
          "temperature": {
            "absoluteMinC": 8,
            "optimalMinC": 14,
            "optimalMaxC": 24,
            "absoluteMaxC": 32
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "high",
          "heatSensitivity": "high"
        },
        {
          "id": "yieldFormation",
          "label": "Tane doldurma",
          "startOffsetDays": 131,
          "endOffsetDays": 180,
          "temperature": {
            "absoluteMinC": 10,
            "optimalMinC": 16,
            "optimalMaxC": 28,
            "absoluteMaxC": 35
          },
          "waterSensitivity": "high",
          "weight": 0.3,
          "frostSensitivity": "low",
          "heatSensitivity": "high"
        }
      ],
      "cycleLengthDays": {
        "minimum": 150,
        "typical": 180,
        "maximum": 220
      },
      "perennial": {
        "isPerennial": false,
        "dormancyMonths": [],
        "chillingRequirementHours": null,
        "establishmentYears": null,
        "economicLifeYears": null
      }
    },
    "physicalRequirements": {
      "rootableSoilDepth": {
        "minimumCm": 30,
        "preferredMinimumCm": 50,
        "optimalMinimumCm": 70,
        "importance": "high"
      },
      "slope": {
        "preferredMaximumMeanPercent": 8,
        "acceptableMaximumMeanPercent": 15,
        "maximumMeanPercent": 25,
        "maximumP90Percent": 35,
        "importance": "medium"
      },
      "ruggedness": {
        "preferredMaximumClass": "low",
        "acceptableMaximumClass": "medium",
        "importance": "medium"
      },
      "surfaceStoninessTolerance": {
        "preferredMaximum": "low",
        "acceptableMaximum": "medium",
        "maximum": "high",
        "importance": "medium"
      },
      "bedrockOutcropTolerance": {
        "preferredMaximum": "not_observed",
        "acceptableMaximum": "isolated",
        "maximum": "scattered",
        "importance": "high"
      },
      "machineAccessRequirement": {
        "minimum": "accessible_with_limitations",
        "importance": "medium"
      },
      "drainageRequirement": {
        "preferred": [
          "adequate"
        ],
        "acceptable": [
          "moderately_limited"
        ],
        "notPreferred": [
          "poor",
          "waterlogging_observed"
        ],
        "importance": "medium"
      },
      "source": "initial-agronomic-knowledge-base",
      "validationStatus": "unvalidated",
      "notes": [
        "Başlangıç fiziksel uygunluk değerleridir; saha / uzman doğrulaması yoktur.",
        "Bu alan crop skorunu değiştirmez."
      ]
    },
    "profileStatus": "approved_for_analysis",
    "slug": "wheat",
    "internalCropCode": "wheat",
    "seasonalOrPerennial": "seasonal"
  },
  {
    "id": "zucchini",
    "name": "Kabak",
    "scientificName": "Cucurbita pepo",
    "category": "vegetable",
    "growingType": "annual",
    "profileStatus": "identity_only",
    "slug": "zucchini",
    "internalCropCode": "zucchini",
    "seasonalOrPerennial": "seasonal",
    "sourceMetadata": {
      "version": "1.0",
      "reviewStatus": "development",
      "sources": [],
      "notes": [
        "Created as part of Gaziantep Master List audit"
      ]
    }
  }
];
