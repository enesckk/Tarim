// @ts-nocheck
import { GoogleGenAI } from '@google/genai';
import { getEnv } from '../../environment/shared/config/env.js';

export interface SoilPdfExtractionResult {
  ph: number | null;
  ecDsM: number | null;
  organicMatterPercent: number | null;
  clayPercent: number | null;
  sandPercent: number | null;
  siltPercent: number | null;
}

export interface IrrigationPdfExtractionResult {
  ecDsM: number | null;
  sar: number | null;
  ph: number | null;
}

export class PdfExtractorService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  public get isEnabled(): boolean {
    return this.ai !== null;
  }

  public async extractSoilData(pdfBase64: string): Promise<SoilPdfExtractionResult> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const prompt = `
Aşağıdaki toprak analizi PDF dökümanını incele. İçerisinden şu sayısal değerleri bul ve sadece JSON formatında dön:
- ph
- ecDsM (tuzluluk, Elektriksel İletkenlik vb.)
- organicMatterPercent (organik madde yüzdesi)
- clayPercent (kil yüzdesi)
- sandPercent (kum yüzdesi)
- siltPercent (silt/mil yüzdesi)

Eğer bir değer belgede bulunmuyorsa veya çıkarılamıyorsa null olarak bırak. Hiçbir açıklama metni ekleme, sadece JSON dön.
Örnek Çıktı:
{
  "ph": 7.2,
  "ecDsM": 1.5,
  "organicMatterPercent": 2.1,
  "clayPercent": 30,
  "sandPercent": 40,
  "siltPercent": 30
}
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: pdfBase64,
                mimeType: 'application/pdf',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    try {
      const parsed = JSON.parse(text) as SoilPdfExtractionResult;
      return {
        ph: parsed.ph ?? null,
        ecDsM: parsed.ecDsM ?? null,
        organicMatterPercent: parsed.organicMatterPercent ?? null,
        clayPercent: parsed.clayPercent ?? null,
        sandPercent: parsed.sandPercent ?? null,
        siltPercent: parsed.siltPercent ?? null,
      };
    } catch (err) {
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }

  public async extractIrrigationData(pdfBase64: string): Promise<IrrigationPdfExtractionResult> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const prompt = `
Aşağıdaki sulama suyu analizi PDF dökümanını incele. İçerisinden şu sayısal değerleri bul ve sadece JSON formatında dön:
- ecDsM (Tuzluluk, Elektriksel İletkenlik dS/m)
- sar (Sodyum Absorpsiyon Oranı)
- ph

Eğer bir değer belgede bulunmuyorsa veya çıkarılamıyorsa null olarak bırak. Hiçbir açıklama metni ekleme, sadece JSON dön.
Örnek Çıktı:
{
  "ecDsM": 1.2,
  "sar": 2.5,
  "ph": 7.5
}
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: pdfBase64,
                mimeType: 'application/pdf',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    try {
      const parsed = JSON.parse(text) as IrrigationPdfExtractionResult;
      return {
        ecDsM: parsed.ecDsM ?? null,
        sar: parsed.sar ?? null,
        ph: parsed.ph ?? null,
      };
    } catch (err) {
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }
}
