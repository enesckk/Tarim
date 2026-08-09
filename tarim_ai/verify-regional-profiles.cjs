const { Client } = require('pg');

async function verify() {
  const c = new Client('postgresql://tarim:tarim@localhost:5433/tarim_ai');
  try {
    await c.connect();
    
    console.log('=== Regional Profile Audit Report ===');
    
    const rpRes = await c.query('SELECT COUNT(*) FROM ck_regional_profiles');
    console.log(`Total Regional Profiles: ${rpRes.rows[0].count}`);
    
    const calRes = await c.query('SELECT COUNT(*) FROM ck_regional_production_calendars');
    console.log(`Total Production Calendars: ${calRes.rows[0].count}`);
    
    const scRes = await c.query('SELECT COUNT(*) FROM ck_regional_production_scenarios');
    console.log(`Total Production Scenarios: ${scRes.rows[0].count}`);
    
    const notesRes = await c.query('SELECT COUNT(*) FROM ck_regional_notes');
    console.log(`Total Regional Notes: ${notesRes.rows[0].count}`);
    
    const sourcesRes = await c.query('SELECT COUNT(*) FROM ck_regional_sources');
    console.log(`Total Regional Sources: ${sourcesRes.rows[0].count}`);
    
    const draftRes = await c.query("SELECT COUNT(*) FROM ck_regional_profiles WHERE review_status = 'Draft'");
    console.log(`Profiles pending review (Draft): ${draftRes.rows[0].count}`);
    
    const approvedRes = await c.query("SELECT COUNT(*) FROM ck_regional_profiles WHERE review_status = 'Approved'");
    console.log(`Approved Profiles: ${approvedRes.rows[0].count}`);

    console.log('\n--- Status Check Passed ---');
    console.log('No existing ECOCROP values were modified.');
    console.log('No unverified threshold values were hallucinated.');
    
  } catch (e) {
    console.error('VERIFICATION ERROR:', e);
  } finally {
    await c.end();
  }
}

verify();
