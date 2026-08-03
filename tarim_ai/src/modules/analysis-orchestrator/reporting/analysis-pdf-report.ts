import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { AnalysisResultResponse } from '../types/analysis.types.js';

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');
const FONT_REGULAR = join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = join(FONT_DIR, 'DejaVuSans-Bold.ttf');

const GREEN = '#1b5e3b';
const GREEN_SOFT = '#e8f3ec';
const GREEN_LINE = '#9bc4ab';
const INK = '#14201a';
const MUTED = '#5b6b62';
const RULE = '#d7e3db';
const WHITE = '#ffffff';
const CARD_BG = '#f7faf8';

const LIMITATION_TR: Record<string, string> = {
  official_parcel_service_unavailable:
    'Resmi parsel servisi (TKGM) kullanılamadı; sınır canlı kayıttan alınamadı.',
  verified_geometry_fallback_used:
    'Doğrulanmış yedek parsel geometrisi kullanıldı.',
  nasa_power_is_regional:
    'İklim verisi bölgesel model tahminidir; noktasal saha ölçümü değildir.',
  soilgrids_is_estimated:
    'Toprak profili model tahminidir; laboratuvar ölçümü yerine geçmez.',
  field_survey_missing: 'Onaylı saha ölçümü yok; sonuçlar uzaktan algılama ve modellere dayanır.',
  report_generation_missing: 'PDF rapor üretimi henüz tamamlanamadı.',
  laboratory_soil_analysis_missing: 'Laboratuvar toprak analizi yok.',
  irrigation_water_analysis_missing: 'Sulama suyu analizi yok.',
  soil_analysis_pdf_uploaded_values_not_extracted:
    'Toprak analizi PDF yüklendi; sayısal değerler otomatik çıkarılmadı.',
  irrigation_water_pdf_uploaded_values_not_extracted:
    'Sulama suyu PDF yüklendi; EC/SAR/pH otomatik çıkarılmadı.',
  sentinel_credentials_missing: 'Uydu görüntü kaynağı kimlik bilgileri eksik.',
  sentinel_pipeline_failed: 'Uydu görüntü işlem hattı başarısız oldu.',
  terrain_is_mock: 'Arazi/eğim verisi demo kaynaktan geldi.',
  terrain_data_unavailable: 'Arazi (yükseklik/eğim) verisi alınamadı.',
  terrain_service_not_configured: 'Arazi profili servisi yapılandırılmamış.',
  climate_is_mock: 'İklim verisi demo kaynaktan geldi.',
  climate_data_unavailable: 'İklim verisi alınamadı.',
  climate_service_not_configured: 'İklim servisi yapılandırılmamış.',
  soil_is_mock: 'Toprak verisi demo kaynaktan geldi.',
  soil_data_unavailable: 'Toprak verisi alınamadı.',
  soil_service_not_configured: 'Toprak servisi yapılandırılmamış.',
  field_survey_service_not_configured: 'Saha ölçümü servisi yapılandırılmamış.',
  land_usability_analysis_failed: 'Arazi uygunluğu değerlendirmesi başarısız oldu.',
  land_usability_service_not_configured: 'Arazi uygunluğu servisi yapılandırılmamış.',
  crop_compatibility_failed: 'Ürün uyumluluğu hesaplaması başarısız oldu.',
  crop_recommendations_failed: 'Ürün tavsiyeleri oluşturulamadı.',
  crop_recommendation_service_not_configured: 'Ürün tavsiye servisi yapılandırılmamış.',
};

const LABEL_TR: Record<string, string> = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
  suitable: 'Uygun',
  limited: 'Sınırlı',
  unsuitable: 'Uygun değil',
  flat: 'Düz',
  gentle: 'Hafif eğimli',
  moderate: 'Orta eğimli',
  steep: 'Dik',
  very_steep: 'Çok dik',
  insufficient_data: 'Yetersiz veri',
  insufficient: 'Yetersiz',
  favorable: 'Elverişli',
  generally_favorable: 'Genel olarak elverişli',
  conditionally_suitable: 'Koşullu uygun',
  recommendation_with_caution: 'Dikkatli öneri',
  not_recommended: 'Önerilmez',
  completed: 'Tamamlandı',
  partial_completed: 'Kısmen tamamlandı',
  missing: 'Eksik',
  failed: 'Başarısız',
  regional_gridded_estimate: 'Bölgesel grid tahmini',
  model_estimate: 'Model tahmini',
  measured: 'Ölçüm',
  estimated: 'Tahmini',
  suitable_for_preliminary_recommendation: 'Ön değerlendirme için uygun',
  field_verification_required: 'Saha doğrulaması gerekli',
  strong_physical_constraints: 'Fiziksel kısıtlar nedeniyle sınırlı',
  increasing: 'Artış',
  decreasing: 'Azalış',
  stable: 'Stabil',
  REAL_TERRAIN_PROFILE_AVAILABLE: 'Gerçek arazi profili mevcut',
  REAL_TERRAIN_FAVORABLE: 'Arazi profili elverişli',
  TERRAIN_SLOPE_GENERALLY_FAVORABLE: 'Eğim genel olarak elverişli',
  TERRAIN_MECHANIZATION_GENERALLY_SUITABLE: 'Mekanizasyon genel olarak uygun',
  LOW_TERRAIN_RUGGEDNESS: 'Düşük arazi engebeliliği',
  MODELED_SOIL_PROFILE_AVAILABLE: 'Model toprak profili mevcut',
  FIELD_SURVEY_MISSING: 'Onaylı saha ölçümü yok',
  STEEP_AREA_RATIO: 'Dik alan oranı yüksek',
  REPEATED_AGRICULTURAL_ACTIVITY_SIGNAL: 'Tekrarlayan tarımsal aktivite sinyali',
  LOW_PROBABLE_ROCK_SIGNAL: 'Düşük yüzey kayalılığı ihtimali',
  MODERATE_PROBABLE_ROCK_SIGNAL: 'Orta düzey yüzey kayalılığı ihtimali',
  HIGH_PROBABLE_ROCK_SIGNAL: 'Yüksek yüzey kayalılığı ihtimali',
  LOW_VEGETATION_VIGOR_SIGNAL: 'Düşük bitki örtüsü canlılığı',
  MODERATE_VEGETATION_VIGOR_SIGNAL: 'Orta düzey bitki örtüsü canlılığı',
  HIGH_VEGETATION_VIGOR_SIGNAL: 'Yüksek bitki örtüsü canlılığı',
  LOW_SOIL_MOISTURE_SIGNAL: 'Düşük toprak nemi sinyali',
  HIGH_SOIL_MOISTURE_SIGNAL: 'Yüksek toprak nemi sinyali',
  BARE_SOIL_SIGNAL: 'Çıplak toprak sinyali',
  STABLE_VEGETATION_TREND: 'İstikrarlı bitki örtüsü eğilimi',
  DECLINING_VEGETATION_TREND: 'Azalan bitki örtüsü eğilimi',
  IMPROVING_VEGETATION_TREND: 'İyileşen bitki örtüsü eğilimi',
  parcel: 'Parsel',
  satellite: 'Uydu görüntüsü',
  terrain: 'Arazi yapısı',
  climate: 'İklim',
  soil: 'Toprak',
  fieldSurvey: 'Saha ölçümü',
  field_survey: 'Saha ölçümü',
  landUsability: 'Arazi uygunluğu',
  land_usability: 'Arazi uygunluğu',
  cropRecommendations: 'Ürün önerileri',
  crop_recommendations: 'Ürün önerileri',
};

function tr(value: unknown): string {
  if (value == null || value === '') return '—';
  const s = String(value);
  return LABEL_TR[s] ?? LIMITATION_TR[s] ?? s.replaceAll('_', ' ');
}

function num(value: unknown, digits = 1, suffix = ''): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
}

function dateTr(value: unknown, withTime = false): string {
  if (typeof value !== 'string' || !value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return withTime
    ? d.toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pick(record: Record<string, unknown> | null | undefined, ...keys: string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

export function reportPdfPath(analysisId: string): string {
  return join(process.cwd(), 'storage', 'analyses', analysisId, 'report.pdf');
}

export function fontsAvailable(): boolean {
  return existsSync(FONT_REGULAR) && existsSync(FONT_BOLD);
}

type Doc = InstanceType<typeof PDFDocument>;

function contentWidth(doc: Doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: Doc, needed = 80) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function drawBrandMark(doc: Doc, x: number, y: number, size = 22) {
  doc.save();
  doc.roundedRect(x, y, size, size, 5).fill(WHITE);
  doc
    .moveTo(x + size * 0.28, y + size * 0.68)
    .lineTo(x + size * 0.5, y + size * 0.28)
    .lineTo(x + size * 0.72, y + size * 0.68)
    .closePath()
    .fill(GREEN);
  doc.restore();
}

function drawHeaderBand(doc: Doc, subtitle: string) {
  const bandH = 76;
  doc.save();
  doc.rect(0, 0, doc.page.width, bandH).fill(GREEN);
  doc.rect(0, bandH - 4, doc.page.width, 4).fill(GREEN_LINE);
  drawBrandMark(doc, doc.page.margins.left, 24, 28);
  doc
    .font('Bold')
    .fontSize(16)
    .fillColor(WHITE)
    .text('AI Destekli Arazi Analizi', doc.page.margins.left + 40, 26, {
      width: contentWidth(doc) - 40,
    });
  doc
    .font('Regular')
    .fontSize(9)
    .fillColor('#d8ebe0')
    .text(subtitle, doc.page.margins.left + 40, 48, {
      width: contentWidth(doc) - 40,
    });
  doc.restore();
  doc.y = bandH + 18;
}

function section(doc: Doc, index: number, title: string) {
  ensureSpace(doc, 44);
  doc.moveDown(0.45);
  const y = doc.y;
  doc.circle(doc.page.margins.left + 7, y + 8, 7).fill(GREEN_SOFT);
  doc.circle(doc.page.margins.left + 7, y + 8, 7).strokeColor(GREEN).lineWidth(1).stroke();
  doc.font('Bold').fontSize(8).fillColor(GREEN).text(String(index), doc.page.margins.left, y + 4, {
    width: 14,
    align: 'center',
  });
  doc.font('Bold').fontSize(12).fillColor(GREEN).text(title, doc.page.margins.left + 22, y);
  doc
    .moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .strokeColor(RULE)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.55);
  doc.font('Regular').fontSize(9).fillColor(INK);
}

function kv(doc: Doc, label: string, value: string) {
  ensureSpace(doc, 16);
  const x = doc.page.margins.left;
  const labelWidth = 168;
  const y = doc.y;
  doc.font('Bold').fillColor(MUTED).text(label, x, y, { width: labelWidth, continued: false });
  doc
    .font('Regular')
    .fillColor(INK)
    .text(value || '—', x + labelWidth, y, {
      width: contentWidth(doc) - labelWidth,
    });
  doc.moveDown(0.12);
}

function bullet(doc: Doc, text: string, tone: 'neutral' | 'good' | 'warn' = 'neutral') {
  ensureSpace(doc, 18);
  const x = doc.page.margins.left;
  const y = doc.y;
  const color = tone === 'good' ? GREEN : tone === 'warn' ? '#b45309' : GREEN_LINE;
  doc.circle(x + 3, y + 5, 2.2).fill(color);
  doc
    .font('Regular')
    .fontSize(9)
    .fillColor(INK)
    .text(text, x + 12, y, {
      width: contentWidth(doc) - 12,
    });
}

function paragraph(doc: Doc, text: string) {
  ensureSpace(doc, 24);
  doc.font('Regular').fontSize(9).fillColor(MUTED).text(text, {
    width: contentWidth(doc),
    align: 'left',
  });
  doc.moveDown(0.2);
}

function drawKpiCards(
  doc: Doc,
  cards: Array<{ label: string; value: string; hint: string }>,
) {
  ensureSpace(doc, 84);
  const gap = 10;
  const cardW = (contentWidth(doc) - gap * (cards.length - 1)) / cards.length;
  const cardH = 72;
  const y = doc.y;
  cards.forEach((card, index) => {
    const x = doc.page.margins.left + index * (cardW + gap);
    doc.save();
    doc.roundedRect(x, y, cardW, cardH, 8).fill(CARD_BG);
    doc.roundedRect(x, y, cardW, cardH, 8).strokeColor(RULE).lineWidth(1).stroke();
    doc.rect(x, y, 4, cardH).fill(GREEN);
    doc.font('Bold').fontSize(7.5).fillColor(MUTED).text(card.label.toUpperCase(), x + 12, y + 10, {
      width: cardW - 20,
    });
    doc.font('Bold').fontSize(13).fillColor(GREEN).text(card.value, x + 12, y + 26, {
      width: cardW - 20,
    });
    doc.font('Regular').fontSize(7.5).fillColor(MUTED).text(card.hint, x + 12, y + 48, {
      width: cardW - 20,
    });
    doc.restore();
  });
  doc.y = y + cardH + 14;
}

async function bufferFromDoc(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function addPageChrome(doc: Doc, analysisId: string) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const pageNo = i - range.start + 1;
    const total = range.count;
    const bottom = doc.page.height - 28;
    doc
      .moveTo(doc.page.margins.left, bottom - 10)
      .lineTo(doc.page.width - doc.page.margins.right, bottom - 10)
      .strokeColor(RULE)
      .lineWidth(0.8)
      .stroke();
    doc
      .font('Regular')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(`Analiz ${analysisId}`, doc.page.margins.left, bottom - 4, {
        width: contentWidth(doc) * 0.65,
        lineBreak: false,
      });
    doc
      .font('Regular')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(`Sayfa ${pageNo} / ${total}`, doc.page.margins.left, bottom - 4, {
        width: contentWidth(doc),
        align: 'right',
        lineBreak: false,
      });
  }
}

function embedImages(doc: Doc, analysisId: string) {
  const dir = join(process.cwd(), 'storage', 'analyses', analysisId);
  const layers: Array<{ file: string; title: string }> = [
    { file: 'true-color.png', title: 'Gerçek renk' },
    { file: 'ndvi.png', title: 'Bitki gelişimi (NDVI)' },
    { file: 'ndmi.png', title: 'Nem göstergesi (NDMI)' },
    { file: 'bsi.png', title: 'Çıplak yüzey (BSI)' },
  ];
  const available = layers.filter((l) => existsSync(join(dir, l.file)));
  if (!available.length) return;

  section(doc, 9, 'Uydu katman görüntüleri');
  paragraph(
    doc,
    'Görüntüler seçilen Sentinel-2 gözleminden üretilmiştir. Verim veya kesinlik garantisi içermez.',
  );

  const gap = 12;
  const usableWidth = contentWidth(doc);
  const cellW = (usableWidth - gap) / 2;
  const cellH = 126;
  let col = 0;
  let rowY = doc.y;

  for (const layer of available) {
    ensureSpace(doc, cellH + 34);
    if (col === 0) rowY = doc.y;
    const x = doc.page.margins.left + col * (cellW + gap);
    doc.save();
    doc.roundedRect(x, rowY, cellW, cellH + 22, 8).fill(CARD_BG);
    doc.roundedRect(x, rowY, cellW, cellH + 22, 8).strokeColor(RULE).lineWidth(1).stroke();
    doc.font('Bold').fontSize(8).fillColor(GREEN).text(layer.title, x + 8, rowY + 6, {
      width: cellW - 16,
    });
    try {
      doc.image(join(dir, layer.file), x + 8, rowY + 20, {
        fit: [cellW - 16, cellH - 8],
        align: 'center',
        valign: 'center',
      });
    } catch {
      doc.font('Regular').fontSize(8).fillColor(MUTED).text('Görüntü eklenemedi', x + 8, rowY + 50);
    }
    doc.restore();
    col += 1;
    if (col >= 2) {
      col = 0;
      doc.y = rowY + cellH + 34;
    }
  }
  if (col !== 0) doc.y = rowY + cellH + 34;
}

/**
 * Builds a Turkish PDF buffer covering all major analysis sections.
 */
export async function buildAnalysisPdfBuffer(
  result: AnalysisResultResponse,
): Promise<Buffer> {
  if (!fontsAvailable()) {
    throw new Error(
      `PDF fonts missing. Expected ${FONT_REGULAR} and ${FONT_BOLD}`,
    );
  }

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 48, bottom: 52, left: 44, right: 44 },
    bufferPages: true,
    info: {
      Title: `AI Destekli Arazi Analizi — ${result.analysisId}`,
      Author: 'Şehitkamil Tarım Operasyon Platformu',
      Subject: 'Parsel bazlı ön değerlendirme raporu',
    },
  });
  doc.registerFont('Regular', FONT_REGULAR);
  doc.registerFont('Bold', FONT_BOLD);

  const parcel = result.parcel;
  const sat = result.satellite;
  const selected = sat?.selectedObservation ?? null;
  const terrain = result.terrain;
  const climate = result.climate;
  const soil = result.soil;
  const field = result.fieldSurvey;
  const usability = result.landUsability;
  const confidence = result.confidence;
  const crops = result.cropRecommendations ?? [];
  const topCrop = crops[0];

  drawHeaderBand(
    doc,
    parcel
      ? `${[parcel.province, parcel.district, parcel.neighborhood].filter(Boolean).join(' / ')} · Ada ${parcel.block} / Parsel ${parcel.parcel}`
      : 'Parsel ön değerlendirme raporu',
  );

  paragraph(
    doc,
    'Bu rapor yapay zekâ destekli otomatik bir ön değerlendirmedir. Kesin tarımsal karar, gübreleme programı veya verim garantisi yerine geçmez.',
  );

  drawKpiCards(doc, [
    {
      label: 'Uygunluk',
      value: usability?.score != null ? num(usability.score, 0, ' / 100') : '—',
      hint: tr(usability?.classification),
    },
    {
      label: 'Önerilen ürün',
      value: topCrop?.cropName || topCrop?.cropId || '—',
      hint: topCrop ? `Skor ${num(topCrop.score, 1)}` : 'Öneri yok',
    },
    {
      label: 'Veri güveni',
      value: tr(confidence?.level),
      hint: result.recommendationsArePreliminary ? 'Ön öneri' : 'Standart çıktı',
    },
  ]);

  kv(doc, 'Analiz kimliği', result.analysisId);
  kv(doc, 'Durum', tr(result.status));
  kv(doc, 'Oluşturulma', dateTr(result.generatedAt, true));

  section(doc, 1, 'Parsel bilgileri');
  if (!parcel) {
    paragraph(doc, 'Parsel bilgisi alınamadı.');
  } else {
    kv(
      doc,
      'Konum',
      [parcel.province, parcel.district, parcel.neighborhood].filter(Boolean).join(' / '),
    );
    kv(doc, 'Ada / Parsel', `${parcel.block} / ${parcel.parcel}`);
    kv(
      doc,
      'Alan',
      typeof parcel.areaSquareMeters === 'number'
        ? `${num(parcel.areaSquareMeters, 0, ' m²')} (${num(parcel.areaSquareMeters / 1000, 2, ' da')})`
        : '—',
    );
    kv(
      doc,
      'Merkez',
      parcel.centroid
        ? `${parcel.centroid.latitude.toFixed(5)}, ${parcel.centroid.longitude.toFixed(5)}`
        : '—',
    );
    kv(doc, 'Kaynak', `${parcel.provider}${parcel.verified ? ' · doğrulanmış' : ''}`);
    if (parcel.fallbackUsed) {
      paragraph(
        doc,
        `Yedek geometri kullanıldı${parcel.fallbackReason ? `: ${parcel.fallbackReason}` : '.'}`,
      );
    }
  }

  section(doc, 2, 'Uydu verisi');
  if (!sat) {
    paragraph(doc, 'Uydu verisi alınamadı.');
  } else {
    kv(doc, 'Seçilen çekim tarihi', dateTr(selected?.date ?? sat.latestObservationDate, true));
    kv(
      doc,
      'Zaman serisi aralığı',
      sat.dateRange ? `${dateTr(sat.dateRange.from)} – ${dateTr(sat.dateRange.to)}` : '—',
    );
    kv(doc, 'Bulut örtüsü', selected ? `%${selected.cloudCoverage}` : '—');
    kv(doc, 'Çözünürlük', selected ? `${selected.resolutionMeters} m` : '—');
    kv(doc, 'Kullanılabilir gözlem', String(sat.usableObservationCount ?? '—'));

    const ndvi = selected?.ndvi?.statistics;
    const ndmi = selected?.ndmi?.statistics;
    const bsi = selected?.bsi?.statistics;
    if (ndvi) {
      kv(doc, 'NDVI (ort / medyan)', `${num(ndvi.mean, 3)} / ${num(ndvi.median, 3)}`);
    }
    if (ndmi) {
      kv(doc, 'NDMI (ort / medyan)', `${num(ndmi.mean, 3)} / ${num(ndmi.median, 3)}`);
    }
    if (bsi) {
      kv(doc, 'BSI (ort / medyan)', `${num(bsi.mean, 3)} / ${num(bsi.median, 3)}`);
    }

    const trend = asRecord(sat.trend);
    if (trend) {
      paragraph(doc, 'Trend özeti:');
      for (const key of ['ndvi', 'ndmi', 'bsi'] as const) {
        const t = asRecord(trend[key]);
        if (!t) continue;
        bullet(
          doc,
          `${key.toUpperCase()}: yön ${tr(t.direction)} · değişim ${num(t.change, 4)} · son ${num(t.last, 4)}`,
        );
      }
    }
    for (const w of sat.warnings ?? []) bullet(doc, tr(w), 'warn');
  }

  section(doc, 3, 'Arazi yapısı');
  if (!terrain) {
    paragraph(doc, 'Arazi profili alınamadı.');
  } else {
    kv(doc, 'Kaynak', terrain.source);
    kv(doc, 'Çözünürlük', `${terrain.resolutionMeters} m`);
    kv(
      doc,
      'Yükseklik (min / ort / max)',
      `${num(terrain.elevation?.minMeters, 1, ' m')} / ${num(terrain.elevation?.meanMeters, 1, ' m')} / ${num(terrain.elevation?.maxMeters, 1, ' m')}`,
    );
    kv(
      doc,
      'Eğim (ort / max)',
      `${num(terrain.slope?.meanDegrees, 1, '°')} / ${num(terrain.slope?.maxDegrees, 1, '°')}`,
    );
    kv(doc, 'Eğim sınıfı', tr(terrain.slope?.class));
    const mech = asRecord(terrain.mechanizationSuitability);
    kv(doc, 'Mekanizasyon', tr(pick(mech, 'classification', 'class')));
    for (const w of terrain.warnings ?? []) bullet(doc, tr(w), 'warn');
  }

  section(doc, 4, 'İklim');
  if (!climate) {
    paragraph(doc, 'İklim verisi alınamadı.');
  } else {
    kv(doc, 'Kaynak', `${climate.source} · ${tr(climate.dataNature)}`);
    const temperature = asRecord(climate.temperature);
    const precipitation = asRecord(climate.precipitation);
    const humidity = asRecord(climate.humidity);
    const wind = asRecord(climate.wind);
    kv(doc, 'Yıllık ortalama sıcaklık', num(pick(temperature, 'annualMeanC'), 1, ' °C'));
    kv(
      doc,
      'Yaz / kış ortalaması',
      `${num(pick(temperature, 'summerMeanC'), 1, ' °C')} / ${num(pick(temperature, 'winterMeanC'), 1, ' °C')}`,
    );
    kv(doc, 'Don riski', tr(pick(temperature, 'frostRisk')));
    kv(doc, 'Aşırı sıcak riski', tr(pick(temperature, 'extremeHeatRisk')));
    kv(
      doc,
      'Yıllık yağış',
      num(pick(precipitation, 'annualTotalMm', 'annualMm', 'annualMeanMm', 'totalMm'), 0, ' mm'),
    );
    kv(doc, 'Yaz yağışı', num(pick(precipitation, 'summerTotalMm', 'summerMm'), 0, ' mm'));
    if (humidity) kv(doc, 'Nem', num(pick(humidity, 'annualMeanPercent', 'meanPercent'), 0, ' %'));
    if (wind) kv(doc, 'Rüzgar', num(pick(wind, 'annualMeanMs', 'meanMs'), 1, ' m/s'));
    for (const w of climate.warnings ?? []) bullet(doc, tr(w), 'warn');
  }

  section(doc, 5, 'Toprak');
  if (!soil) {
    paragraph(doc, 'Toprak verisi alınamadı.');
  } else {
    kv(doc, 'Kaynak', `${soil.source} · ${tr(soil.dataNature)}`);
    kv(doc, 'Uzamsal çözünürlük', `${soil.spatialResolutionMeters} m`);
    const props = soil.properties ?? {
      ph: {},
      clayPercent: {},
      sandPercent: {},
      siltPercent: {},
      organicCarbon: {},
      bulkDensity: {},
      coarseFragments: {},
    };
    const ph = asRecord(props.ph);
    const clay = asRecord(props.clayPercent);
    const sand = asRecord(props.sandPercent);
    const silt = asRecord(props.siltPercent);
    const oc = asRecord(props.organicCarbon);
    kv(doc, 'pH', num(pick(ph, 'mean', 'value'), 2));
    kv(
      doc,
      'Kil / Kum / Silt',
      `${num(pick(clay, 'mean', 'value'), 1, ' %')} / ${num(pick(sand, 'mean', 'value'), 1, ' %')} / ${num(pick(silt, 'mean', 'value'), 1, ' %')}`,
    );
    kv(doc, 'Organik karbon', num(pick(oc, 'mean', 'value'), 2));
    for (const w of soil.warnings ?? []) bullet(doc, tr(w), 'warn');
  }

  section(doc, 6, 'Saha ölçümü');
  if (!field) {
    paragraph(doc, 'Saha ölçümü kaydı yok.');
  } else {
    kv(doc, 'Durum', tr(field.status));
    kv(doc, 'Anket kimliği', field.surveyId ?? '—');
    kv(doc, 'Onay tarihi', dateTr(field.approvedAt, true));
    kv(doc, 'Örnek sayısı', String(field.sampleCount ?? 0));
    for (const note of field.notes ?? []) bullet(doc, note);
  }

  section(doc, 7, 'Arazi uygunluğu');
  if (!usability) {
    paragraph(doc, 'Arazi uygunluğu değerlendirilemedi.');
  } else {
    kv(doc, 'Sınıflandırma', tr(usability.classification));
    kv(doc, 'Skor', num(usability.score, 0));
    if (usability.explanation) paragraph(doc, tr(usability.explanation));
    if (usability.positiveFactors?.length) {
      paragraph(doc, 'Olumlu / destekleyici faktörler:');
      for (const f of usability.positiveFactors) {
        bullet(doc, `${tr(f.factor)}${f.description ? `: ${f.description}` : ''}`, 'good');
      }
    }
    if (usability.limitingFactors?.length) {
      paragraph(doc, 'Sınırlayıcı faktörler:');
      for (const f of usability.limitingFactors) {
        bullet(
          doc,
          `${tr(f.factor)} (${tr(f.severity)})${f.description ? `: ${f.description}` : ''}`,
          'warn',
        );
      }
    }
  }

  section(doc, 8, 'Ürün tavsiyeleri');
  if (!crops.length) {
    paragraph(doc, 'Ürün tavsiyesi üretilmedi.');
  } else {
    paragraph(
      doc,
      result.recommendationsArePreliminary
        ? 'Öneriler ön değerlendirme niteliğindedir; saha ve laboratuvar doğrulaması önerilir.'
        : 'Ürün önerileri uygunluk skoruna göre sıralanmıştır.',
    );
    for (const crop of crops.slice(0, 12)) {
      ensureSpace(doc, 42);
      const y = doc.y;
      doc.roundedRect(doc.page.margins.left, y, contentWidth(doc), 2, 0).fill(GREEN_SOFT);
      doc
        .font('Bold')
        .fontSize(10)
        .fillColor(GREEN)
        .text(`#${crop.rank}  ${crop.cropName || crop.cropId}`, doc.page.margins.left, y + 8);
      kv(doc, 'Skor / sınıf', `${num(crop.score, 1)} · ${tr(crop.classification)}`);
      if (crop.explanation) paragraph(doc, String(crop.explanation));
      if (crop.positiveFactors?.length) {
        bullet(doc, `Olumlu: ${crop.positiveFactors.slice(0, 4).map(tr).join('; ')}`, 'good');
      }
      if (crop.limitingFactors?.length) {
        bullet(doc, `Sınırlayıcı: ${crop.limitingFactors.slice(0, 4).map(tr).join('; ')}`, 'warn');
      }
      doc.moveDown(0.35);
    }
  }

  embedImages(doc, result.analysisId);

  section(doc, 10, 'Sınırlamalar');
  const limitations = (result.limitations ?? []).filter((x) => x !== 'report_generation_missing');
  if (!limitations.length) {
    paragraph(doc, 'Kayıtlı sınırlama yok.');
  } else {
    for (const item of limitations) bullet(doc, LIMITATION_TR[item] ?? tr(item), 'warn');
  }

  section(doc, 11, 'Önerilen sonraki adımlar');
  const actions = result.recommendedNextActions ?? [];
  if (!actions.length) {
    paragraph(doc, 'Ek adım önerisi yok.');
  } else {
    for (const action of actions) bullet(doc, action);
  }

  section(doc, 12, 'Veri kaynakları');
  const sources = result.dataSources ?? [];
  if (!sources.length) {
    paragraph(doc, 'Kaynak listesi yok.');
  } else {
    for (const source of sources) {
      ensureSpace(doc, 28);
      doc.font('Bold').fontSize(9).fillColor(GREEN).text(tr(source.label || source.key));
      kv(doc, 'Durum / kalite', `${tr(source.status)} · ${tr(source.quality)}`);
      kv(
        doc,
        'Tür',
        `${tr(source.dataType)}${source.isEstimated ? ' · tahmini' : ''}${source.isMeasured ? ' · ölçüm' : ''}${source.isApproved ? ' · onaylı' : ''}`,
      );
      if (source.warning) bullet(doc, source.warning, 'warn');
      doc.moveDown(0.15);
    }
  }

  section(doc, 13, 'Güven özeti');
  if (!confidence) {
    paragraph(doc, 'Güven bilgisi yok.');
  } else {
    kv(doc, 'Düzey', tr(confidence.level));
    if (confidence.explanation) paragraph(doc, confidence.explanation);
    kv(
      doc,
      'Mevcut kaynaklar',
      (confidence.availableSources ?? []).map(tr).join(', ') || '—',
    );
    kv(
      doc,
      'Eksik kaynaklar',
      (confidence.missingSources ?? []).map(tr).join(', ') || '—',
    );
    kv(
      doc,
      'Saha ölçümü',
      confidence.approvedFieldSurveyAvailable
        ? 'Onaylı saha ölçümü mevcut'
        : 'Onaylı saha ölçümü yok',
    );
  }

  ensureSpace(doc, 36);
  doc.moveDown(0.8);
  doc.font('Regular').fontSize(8).fillColor(MUTED).text(
    'Rapor; uydu, iklim, toprak ve isteğe bağlı saha/laboratuvar girdilerine dayalı ön değerlendirmedir. Operasyonel karar öncesi uzman ve saha doğrulaması önerilir.',
    { width: contentWidth(doc) },
  );

  addPageChrome(doc, result.analysisId);
  return bufferFromDoc(doc);
}

export async function writeAnalysisPdf(
  result: AnalysisResultResponse,
  targetPath = reportPdfPath(result.analysisId),
): Promise<string> {
  const buffer = await buildAnalysisPdfBuffer(result);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, buffer);
  return targetPath;
}

export async function ensureAnalysisPdf(
  result: AnalysisResultResponse,
): Promise<{ path: string; created: boolean }> {
  const path = reportPdfPath(result.analysisId);
  const existed = existsSync(path);
  // Always regenerate so report template / translation updates apply immediately.
  await writeAnalysisPdf(result, path);
  return { path, created: !existed };
}
