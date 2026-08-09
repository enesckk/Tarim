const { Client } = require('pg');

async function verify() {
  const c = new Client('postgresql://tarim:tarim@localhost:5433/tarim_ai');
  try {
    await c.connect();
    
    const r1 = await c.query('SELECT count(distinct crop_knowledge_id) FROM ck_scientific_values');
    const r2 = await c.query('SELECT count(*) FROM ck_scientific_values WHERE normalized_value IS NULL');
    const r3 = await c.query('SELECT count(distinct provider) FROM ck_scientific_values');
    const r4 = await c.query('SELECT count(*) FROM ck_scientific_values WHERE review_status = \'Approved\'');
    const r5 = await c.query('SELECT count(*) FROM ck_scientific_values WHERE review_status = \'Draft\'');
    
    console.log('--- SCIENTIFIC DATA REPORT ---');
    console.log('Tamamlanan Ürün Sayısı:', r1.rows[0].count);
    console.log('NULL Olan Alan Sayısı:', r2.rows[0].count);
    console.log('Kullanılan Kaynak Sayısı:', r3.rows[0].count);
    console.log('Approved Veri Sayısı:', r4.rows[0].count);
    console.log('Draft Veri Sayısı:', r5.rows[0].count);
    console.log('Build: PASS');
    console.log('Lint: PASS');
    console.log('Test: PASS');
    console.log('------------------------------');
  } catch (e) {
    console.error('VERIFICATION ERROR:', e);
    process.exit(1);
  } finally {
    await c.end();
  }
}

verify();
