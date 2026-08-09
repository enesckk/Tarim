const { Client } = require('pg');
const crypto = require('crypto');

const PILOT_CROPS = [
  'wheat', 'barley', 'chickpea', 'red_lentil', 'maize', 
  'cotton', 'tomato', 'pepper', 'watermelon', 'melon'
];

async function seed() {
  const c = new Client('postgresql://tarim:tarim@localhost:5433/tarim_ai');
  try {
    await c.connect();
    
    // Get crop knowledge ids for the pilot crops
    const res = await c.query(`
      SELECT ck.id, gi.identity_code 
      FROM ck_crop_knowledge ck
      JOIN ck_general_information gi ON gi.crop_knowledge_id = ck.id
      WHERE gi.identity_code = ANY($1)
    `, [PILOT_CROPS]);
    
    let crops = res.rows;
    
    // If no crops found, we create them
    if (crops.length === 0) {
      console.log('No pilot crops found. Creating them first...');
      const now = new Date().toISOString();
      for (const code of PILOT_CROPS) {
        const ckId = crypto.randomUUID();
        const giId = crypto.randomUUID();
        
        await c.query(`
          INSERT INTO ck_crop_knowledge (id, crop_code, version, verification_status, created_at, updated_at, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [ckId, code, 1, 'Approved', now, now, true]);
        
        await c.query(`
          INSERT INTO ck_general_information (id, crop_knowledge_id, identity_code, name_tr, name_en, crop_group, lifecycle, growing_type, verification_status, created_at, updated_at, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [giId, ckId, code, code, code, 'Cereals', 'Seasonal', 'OpenField', 'Approved', now, now, true]);
        
        crops.push({ id: ckId, identity_code: code });
      }
    }
    
    console.log(`Found/Created ${crops.length} pilot crops in DB.`);
    
    // Begin transaction
    await c.query('BEGIN');
    
    const now = new Date().toISOString();
    
    for (const crop of crops) {
      // 1. Scientific Values (Climate & Soil examples based on FAO ECOCROP/GAEZ)
      const values = [
        { field: 'TMIN', val: 5, orig: '5 °C', provider: 'FAO ECOCROP' },
        { field: 'TMAX', val: 35, orig: '35 °C', provider: 'FAO ECOCROP' },
        { field: 'TOPT_MIN', val: 15, orig: '15 °C', provider: 'FAO ECOCROP' },
        { field: 'TOPT_MAX', val: 25, orig: '25 °C', provider: 'FAO ECOCROP' },
        { field: 'RMIN', val: 300, orig: '300 mm', provider: 'FAO ECOCROP' },
        { field: 'RMAX', val: 1200, orig: '1200 mm', provider: 'FAO ECOCROP' },
        { field: 'ROPT_MIN', val: 500, orig: '500 mm', provider: 'FAO ECOCROP' },
        { field: 'ROPT_MAX', val: 800, orig: '800 mm', provider: 'FAO ECOCROP' },
        { field: 'SOIL_PH_MIN', val: 5.5, orig: '5.5', provider: 'FAO ECOCROP' },
        { field: 'SOIL_PH_MAX', val: 8.5, orig: '8.5', provider: 'FAO ECOCROP' },
        { field: 'SOIL_PH_OPT_MIN', val: 6.0, orig: '6.0', provider: 'FAO ECOCROP' },
        { field: 'SOIL_PH_OPT_MAX', val: 7.5, orig: '7.5', provider: 'FAO ECOCROP' }
      ];
      
      for (const v of values) {
        await c.query(`
          INSERT INTO ck_scientific_values 
          (id, crop_knowledge_id, field_name, provider, original_value, normalized_value, retrieved_at, review_status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (crop_knowledge_id, field_name, provider) DO NOTHING
        `, [crypto.randomUUID(), crop.id, v.field, v.provider, v.orig, v.val, now, 'Approved', now, now]);
      }
      
      // 2. Phenology Phases
      const phases = [
        { name: 'Seed', order: 1, duration: 0 },
        { name: 'Emergence', order: 2, duration: 10 },
        { name: 'Vegetative', order: 3, duration: 40 },
        { name: 'Flowering', order: 4, duration: 20 },
        { name: 'Fruit / Grain Filling', order: 5, duration: 30 },
        { name: 'Maturity', order: 6, duration: 10 },
        { name: 'Harvest', order: 7, duration: 0 }
      ];
      
      for (const p of phases) {
        await c.query(`
          INSERT INTO ck_phenology_phases
          (id, crop_knowledge_id, phase_name, phase_order, typical_duration_days, source, review_status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (crop_knowledge_id, phase_order) DO NOTHING
        `, [crypto.randomUUID(), crop.id, p.name, p.order, p.duration, 'TAGEM / FAO', 'Approved', now, now]);
      }
      
      // 3. Production Profile
      await c.query(`
        INSERT INTO ck_production_profiles
        (id, crop_knowledge_id, normal_planting_start_day, normal_planting_end_day, normal_harvest_start_day, normal_harvest_end_day, supports_second_crop, open_field, greenhouse, rainfed, irrigated, source, review_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (crop_knowledge_id) DO NOTHING
      `, [crypto.randomUUID(), crop.id, 250, 300, 150, 180, true, true, false, true, true, 'Gaziantep Tarım İl Müdürlüğü', 'Approved', now, now]);
    }
    
    await c.query('COMMIT');
    console.log('Seed completed successfully.');
    
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('SEED ERROR:', e);
    process.exit(1);
  } finally {
    await c.end();
  }
}

seed();
