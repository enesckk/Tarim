import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { withTransaction } from '../../database/database-client.js';
import crypto from 'crypto';

const CROP_MAPPING: Record<string, string[]> = {
  wheat: ['wheat', 'bread wheat', 'Triticum aestivum'],
  barley: ['barley', 'Hordeum vulgare'],
  maize: ['maize', 'corn', 'Zea mays'],
  oat: ['oat', 'oats', 'Avena sativa'],
  triticale: ['triticale', 'x Triticosecale'],
  chickpea: ['chickpea', 'garbanzo', 'Cicer arietinum'],
  red_lentil: ['lentil', 'Lens culinaris'],
  green_lentil: ['lentil', 'Lens culinaris'],
  bean: ['common bean', 'kidney bean', 'Phaseolus vulgaris'],
  cowpea: ['cowpea', 'Vigna unguiculata'],
  cotton: ['cotton', 'Gossypium hirsutum', 'Gossypium barbadense'],
  sunflower: ['sunflower', 'Helianthus annuus'],
  sugar_beet: ['sugar beet', 'sugarbeet', 'Beta vulgaris'],
  tomato: ['tomato', 'Lycopersicon esculentum', 'Solanum lycopersicum'],
  pepper: ['pepper', 'sweet pepper', 'bell pepper', 'Capsicum annuum'],
  eggplant: ['eggplant', 'aubergine', 'Solanum melongena'],
  cucumber: ['cucumber', 'Cucumis sativus'],
  zucchini: ['zucchini', 'courgette', 'Cucurbita pepo'],
  watermelon: ['watermelon', 'Citrullus lanatus'],
  melon: ['melon', 'cantaloupe', 'Cucumis melo'],
  onion: ['onion', 'Allium cepa'],
  garlic: ['garlic', 'Allium sativum'],
  potato: ['potato', 'Solanum tuberosum'],
  lettuce: ['lettuce', 'Lactuca sativa'],
  spinach: ['spinach', 'Spinacia oleracea'],
  cabbage: ['cabbage', 'Brassica oleracea'],
  cauliflower: ['cauliflower', 'Brassica oleracea var. botrytis'],
  broccoli: ['broccoli', 'Brassica oleracea var. italica'],
  carrot: ['carrot', 'Daucus carota'],
  radish: ['radish', 'Raphanus sativus'],
  parsley: ['parsley', 'Petroselinum crispum'],
  dill: ['dill', 'Anethum graveolens'],
  rocket: ['arugula', 'rocket', 'roquette', 'Eruca vesicaria', 'Eruca sativa'],
  alfalfa: ['alfalfa', 'lucerne', 'Medicago sativa'],
  vetch: ['common vetch', 'vetch', 'Vicia sativa'],
  sainfoin: ['sainfoin', 'Onobrychis viciifolia'],
  silage_maize: ['maize', 'Zea mays'],
  cumin: ['cumin', 'Cuminum cyminum'],
  fennel: ['fennel', 'Foeniculum vulgare'],
  thyme: ['thyme', 'Thymus vulgaris'],
  sage: ['sage', 'Salvia officinalis'],
  lavender: ['lavender', 'Lavandula angustifolia', 'Lavandula officinalis'],
  pistachio: ['pistachio', 'Pistacia vera'],
  olive: ['olive', 'Olea europaea'],
  grape: ['grape', 'Vitis vinifera'],
  pomegranate: ['pomegranate', 'Punica granatum'],
  almond: ['almond', 'Prunus dulcis'],
  walnut: ['walnut', 'Juglans regia'],
  fig: ['fig', 'Ficus carica'],
  apricot: ['apricot', 'Prunus armeniaca'],
  peach: ['peach', 'Prunus persica'],
  plum: ['plum', 'Prunus domestica'],
  apple: ['apple', 'Malus domestica'],
  pear: ['pear', 'Pyrus communis'],
};

async function run() {
  const { values } = parseArgs({
    options: {
      all: { type: 'boolean' },
      crop: { type: 'string' },
      overwrite: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
    },
  });

  const isDryRun = values['dry-run'];
  if (!values.all && !values.crop) {
    console.error('Lütfen --all veya --crop <isim> belirtin.');
    process.exit(1);
  }

  const csvPath = path.join(process.cwd(), 'data/ecocrop/EcoCrop_DB.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV bulunamadı: data/ecocrop/EcoCrop_DB.csv');
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const headerStr = content.substring(0, content.indexOf('\n'));
  const header = headerStr.split(',');

  function parseCSV(text: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [''];
    let r = 0;
    let inQuote = false;
    for (let i = 0, l = text.length; i < l; i++) {
      const char = text[i];
      const nextChar = text[i+1];
      if (char === '"') {
        if (inQuote && nextChar === '"') {
          row[r] += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        row[++r] = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuote) {
        if (char === '\r') i++;
        result.push(row);
        row = [''];
        r = 0;
      } else {
        if (char !== '\r' || inQuote) {
           row[r] += char;
        }
      }
    }
    if (row.length > 1 || row[0] !== '') {
      result.push(row);
    }
    return result;
  }

  const allRows = parseCSV(content);
  const rows = allRows.slice(1);

  const report = {
    totalRequested: 0,
    successfulImports: 0,
    notFound: [] as string[],
    missingFields: 0,
    nullFieldsCount: 0,
    sourceCount: 1,
    totalCompletenessScore: 0,
    approvedProducts: 0,
    draftProducts: 0
  };

  const targets = values.crop ? [values.crop] : Object.keys(CROP_MAPPING);
  report.totalRequested = targets.length;

  for (const internalCode of targets) {
    const mappings = CROP_MAPPING[internalCode];
    if (!mappings) {
      console.warn(`Bilinmeyen ürün kodu: ${internalCode}`);
      report.notFound.push(internalCode);
      continue;
    }

    let foundRow: string[] | null = null;
    for (const row of rows) {
      const sciName = row[1]?.toLowerCase() || '';
      const comName = row[5]?.toLowerCase() || '';
      const isMatch = mappings.some(m => {
        const nm = m.toLowerCase();
        return sciName.includes(nm) || comName.includes(nm);
      });
      if (isMatch) {
        foundRow = row;
        break;
      }
    }

    if (!foundRow) {
      report.notFound.push(internalCode);
      continue;
    }

    const getVal = (colName: string) => {
      const idx = header.indexOf(colName);
      if (idx === -1) return null;
      const val = foundRow![idx]?.trim();
      return (val === '' || val === 'NA' || val === undefined) ? null : val;
    };

    const identity = {
      scientific_name: getVal('ScientificName'),
      common_name: getVal('COMNAME'),
      family: getVal('FAMNAME'),
      life_cycle: getVal('LIFO'),
      growth_habit: getVal('HABI'),
      crop_category: getVal('CAT'),
    };

    const climate = {
      minimum_temperature: getVal('TMIN'),
      optimum_minimum_temperature: getVal('TOPMN'),
      optimum_maximum_temperature: getVal('TOPMX'),
      maximum_temperature: getVal('TMAX'),
      minimum_rainfall: getVal('RMIN'),
      optimum_rainfall_minimum: getVal('ROPMN'),
      optimum_rainfall_maximum: getVal('ROPMX'),
      maximum_rainfall: getVal('RMAX'),
      minimum_altitude: null,
      maximum_altitude: getVal('ALTMX'),
      climate_type: getVal('CLIZ')
    };

    const soil = {
      minimum_ph: getVal('PHMIN'),
      maximum_ph: getVal('PHMAX'),
      soil_texture: getVal('TEXT'),
      drainage: getVal('DRA'),
      light_requirement: getVal('LIOPMN')
    };

    let totalFields = 0;
    let filledFields = 0;
    
    const allFieldsMap: Record<string, { cat: string, val: any, origKey: string }> = {};
    for (const [k, v] of Object.entries(identity)) allFieldsMap[k] = { cat: 'identity', val: v, origKey: k };
    for (const [k, v] of Object.entries(climate)) allFieldsMap[k] = { cat: 'climate', val: v, origKey: k };
    for (const [k, v] of Object.entries(soil)) allFieldsMap[k] = { cat: 'soil', val: v, origKey: k };

    const tracesToInsert: any[] = [];
    for (const [field, data] of Object.entries(allFieldsMap)) {
      totalFields++;
      if (data.val === null || data.val === undefined) {
        report.nullFieldsCount++;
        report.missingFields++;
      } else {
        filledFields++;
        let normalized = data.val;
        if (field.includes('temperature') && !isNaN(Number(data.val))) normalized = Number(data.val);
        if (field.includes('rainfall') && !isNaN(Number(data.val))) normalized = Number(data.val);
        if (field.includes('altitude') && !isNaN(Number(data.val))) normalized = Number(data.val);
        if (field.includes('ph') && !isNaN(Number(data.val))) normalized = Number(data.val);
        tracesToInsert.push({
          category: data.cat,
          field_name: field,
          provider: 'ECOCROP',
          provider_version: 'v1.0 (Zenodo/OpenCLIM)',
          provider_field: data.origKey,
          original_value: data.val.toString(),
          normalized_value: normalized.toString()
        });
      }
    }

    const completeness = (filledFields / totalFields) * 100;
    report.totalCompletenessScore += completeness;

    if (!isDryRun) {
      try {
        await withTransaction(async (client) => {
          const res = await client.query('SELECT crop_knowledge_id as id FROM ck_general_information WHERE identity_code = $1 LIMIT 1', [internalCode]);
          if (res.rows.length === 0) {
            console.warn(`Veritabanında crop_knowledge_id bulunamadı: ${internalCode}, atlanıyor.`);
            return;
          }
          const knowledgeId = res.rows[0].id;
          const verRes = await client.query('SELECT COALESCE(MAX(version_number), 0) + 1 as next_v FROM ck_crop_snapshots WHERE crop_knowledge_id = $1', [knowledgeId]);
          const nextVersion = verRes.rows[0].next_v;
          const snapId = crypto.randomUUID();
          await client.query(`
            INSERT INTO ck_crop_snapshots (id, crop_knowledge_id, internal_crop_code, version_number, status, completeness_score)
            VALUES ($1, $2, $3, $4, 'draft', $5)
          `, [snapId, knowledgeId, internalCode, nextVersion, completeness]);

          for (const trace of tracesToInsert) {
            await client.query(`
              INSERT INTO ck_field_traces (snapshot_id, category, field_name, provider, provider_version, provider_field, original_value, normalized_value)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [snapId, trace.category, trace.field_name, trace.provider, trace.provider_version, trace.provider_field, trace.original_value, trace.normalized_value]);
          }
        });
        report.successfulImports++;
        report.draftProducts++;
      } catch (e: any) {
        console.error(`IMPORT ERROR [${internalCode}]:`, e.message || e);
      }
    } else {
      console.log(`[DRY-RUN] ${internalCode} import edilecek. Completeness: %${completeness.toFixed(1)}`);
      report.successfulImports++;
      report.draftProducts++;
    }
  }

  const avgComp = report.successfulImports > 0 ? (report.totalCompletenessScore / report.successfulImports) : 0;

  console.log(`\n==================================================`);
  console.log(`10. RAPOR`);
  console.log(`==================================================`);
  console.log(`Toplam ürün: ${report.totalRequested}`);
  console.log(`Başarılı import: ${report.successfulImports}`);
  console.log(`Bulunamayan ürün: ${report.notFound.length}${report.notFound.length > 0 ? ` (${report.notFound.join(', ')})` : ''}`);
  console.log(`Eksik alan (toplam ürünlerdeki field başına): ${report.missingFields}`);
  console.log(`NULL alan sayısı: ${report.nullFieldsCount}`);
  console.log(`Kaynak sayısı: ${report.sourceCount}`);
  console.log(`Completion ortalaması: %${avgComp.toFixed(2)}`);
  console.log(`Approved ürün: ${report.approvedProducts}`);
  console.log(`Draft ürün: ${report.draftProducts}`);
  console.log(`==================================================`);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
