const { Client } = require('pg');
const crypto = require('crypto');

const CROPS = [
  { code: 'wheat', type: 'Seasonal' },
  { code: 'barley', type: 'Seasonal' },
  { code: 'maize', type: 'Seasonal' },
  { code: 'oat', type: 'Seasonal' },
  { code: 'triticale', type: 'Seasonal' },
  { code: 'chickpea', type: 'Seasonal' },
  { code: 'red_lentil', type: 'Seasonal' },
  { code: 'green_lentil', type: 'Seasonal' },
  { code: 'bean', type: 'Seasonal' },
  { code: 'cowpea', type: 'Seasonal' },
  { code: 'cotton', type: 'Seasonal' },
  { code: 'sunflower', type: 'Seasonal' },
  { code: 'sugar_beet', type: 'Seasonal' },
  { code: 'tomato', type: 'Seasonal' },
  { code: 'pepper', type: 'Seasonal' },
  { code: 'eggplant', type: 'Seasonal' },
  { code: 'cucumber', type: 'Seasonal' },
  { code: 'zucchini', type: 'Seasonal' },
  { code: 'watermelon', type: 'Seasonal' },
  { code: 'melon', type: 'Seasonal' },
  { code: 'onion', type: 'Seasonal' },
  { code: 'garlic', type: 'Seasonal' },
  { code: 'potato', type: 'Seasonal' },
  { code: 'lettuce', type: 'Seasonal' },
  { code: 'spinach', type: 'Seasonal' },
  { code: 'cabbage', type: 'Seasonal' },
  { code: 'cauliflower', type: 'Seasonal' },
  { code: 'broccoli', type: 'Seasonal' },
  { code: 'carrot', type: 'Seasonal' },
  { code: 'radish', type: 'Seasonal' },
  { code: 'parsley', type: 'Seasonal' },
  { code: 'dill', type: 'Seasonal' },
  { code: 'rocket', type: 'Seasonal' },
  { code: 'alfalfa', type: 'Seasonal' },
  { code: 'vetch', type: 'Seasonal' },
  { code: 'sainfoin', type: 'Seasonal' },
  { code: 'silage_maize', type: 'Seasonal' },
  { code: 'cumin', type: 'Seasonal' },
  { code: 'fennel', type: 'Seasonal' },
  { code: 'thyme', type: 'Seasonal' },
  { code: 'sage', type: 'Seasonal' },
  { code: 'lavender', type: 'Seasonal' },
  { code: 'pistachio', type: 'Perennial' },
  { code: 'olive', type: 'Perennial' },
  { code: 'grape', type: 'Perennial' },
  { code: 'pomegranate', type: 'Perennial' },
  { code: 'almond', type: 'Perennial' },
  { code: 'walnut', type: 'Perennial' },
  { code: 'fig', type: 'Perennial' },
  { code: 'apricot', type: 'Perennial' },
  { code: 'peach', type: 'Perennial' },
  { code: 'plum', type: 'Perennial' },
  { code: 'apple', type: 'Perennial' },
  { code: 'pear', type: 'Perennial' }
];

async function seed() {
  const c = new Client('postgresql://tarim:tarim@localhost:5433/tarim_ai');
  try {
    await c.connect();
    const now = new Date().toISOString();
    
    await c.query('BEGIN');
    
    for (const crop of CROPS) {
      // 1. Ensure crop exists in ck_crop_knowledge
      let ckRes = await c.query(`
        SELECT ck.id FROM ck_crop_knowledge ck
        JOIN ck_general_information gi ON gi.crop_knowledge_id = ck.id
        WHERE gi.identity_code = $1
      `, [crop.code]);
      
      let ckId;
      if (ckRes.rows.length === 0) {
        ckId = crypto.randomUUID();
        const giId = crypto.randomUUID();
        
        await c.query(`
          INSERT INTO ck_crop_knowledge (id, crop_code, version, verification_status, created_at, updated_at, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [ckId, crop.code, 1, 'Approved', now, now, true]);
        
        await c.query(`
          INSERT INTO ck_general_information (id, crop_knowledge_id, identity_code, name_tr, name_en, crop_group, lifecycle, growing_type, verification_status, created_at, updated_at, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [giId, ckId, crop.code, crop.code, crop.code, 'Various', crop.type, 'OpenField', 'Approved', now, now, true]);
      } else {
        ckId = ckRes.rows[0].id;
        
        // Update the lifecycle if it was different
        await c.query(`
          UPDATE ck_general_information SET lifecycle = $1 WHERE crop_knowledge_id = $2
        `, [crop.type, ckId]);
      }
      
      // 2. Insert Regional Profile
      const rpId = crypto.randomUUID();
      await c.query(`
        INSERT INTO ck_regional_profiles (id, crop_knowledge_id, region_type, region_name, version, review_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (crop_knowledge_id, region_type, region_name) DO NOTHING
      `, [rpId, ckId, 'Province', 'Gaziantep', 1, 'Draft', now, now]);
      
      // Get the actual rpId if it existed
      const actualRpRes = await c.query(`
        SELECT id FROM ck_regional_profiles 
        WHERE crop_knowledge_id = $1 AND region_type = 'Province' AND region_name = 'Gaziantep'
      `, [ckId]);
      const actualRpId = actualRpRes.rows[0].id;
      
      // 3. Production Calendar
      await c.query(`
        INSERT INTO ck_regional_production_calendars (id, regional_profile_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (regional_profile_id) DO NOTHING
      `, [crypto.randomUUID(), actualRpId, now, now]);
      
      // 4. Production Scenarios
      const scenarios = [
        { name: 'Açık Tarla - Sulamalı', type: 'Open Field', water: 'Irrigated' },
        { name: 'Açık Tarla - Kuru', type: 'Open Field', water: 'Rainfed' }
      ];
      for (const sc of scenarios) {
        await c.query(`
          INSERT INTO ck_regional_production_scenarios (id, regional_profile_id, scenario_name, growing_type, water_regime, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (regional_profile_id, scenario_name) DO NOTHING
        `, [crypto.randomUUID(), actualRpId, sc.name, sc.type, sc.water, now, now]);
      }
      
      // 5. Notes
      await c.query(`
        INSERT INTO ck_regional_notes (id, regional_profile_id, note_type, note_content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [crypto.randomUUID(), actualRpId, 'Yerel Üretim Yoğunluğu', 'Bilgi bekleniyor', now, now]);
      
      // 6. Sources
      await c.query(`
        INSERT INTO ck_regional_sources (id, regional_profile_id, source_type, source_name, review_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [crypto.randomUUID(), actualRpId, 'Gaziantep İl Tarım', 'Gaziantep İl Tarım ve Orman Müdürlüğü Kayıtları', 'Draft', now, now]);
      
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
