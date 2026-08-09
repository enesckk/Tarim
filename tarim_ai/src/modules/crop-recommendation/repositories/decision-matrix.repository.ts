import { query } from '../../database/database-client.js';
import { CriteriaCatalog, DecisionRule, DataSourcePriority } from '../types/decision-matrix.types.js';

export class DecisionMatrixRepository {
  
  async getCriteriaCatalog(): Promise<CriteriaCatalog[]> {
    const res = await query('SELECT * FROM ck_criteria_catalog ORDER BY category, code');
    return res.rows as CriteriaCatalog[];
  }

  async getDecisionRules(cropKnowledgeId: string): Promise<DecisionRule[]> {
    const res = await query(`
      SELECT r.*, row_to_json(c.*) as criterion
      FROM ck_decision_rules r
      JOIN ck_criteria_catalog c ON c.id = r.criterion_id
      WHERE r.crop_knowledge_id = $1
      ORDER BY c.category, c.code
    `, [cropKnowledgeId]);

    const rules = res.rows;
    if (rules.length === 0) return [];

    const ruleIds = rules.map(r => r.id);
    const placeholders = ruleIds.map((_, i) => `$${i+1}`).join(',');
    const prioRes = await query(`
      SELECT * FROM ck_data_source_priorities
      WHERE rule_id IN (${placeholders})
      ORDER BY priority_rank ASC
    `, ruleIds);

    const prioritiesByRuleId = prioRes.rows.reduce((acc, p) => {
      if (!acc[p.rule_id]) acc[p.rule_id] = [];
      acc[p.rule_id].push(p);
      return acc;
    }, {} as Record<string, DataSourcePriority[]>);

    return rules.map(r => ({
      ...r,
      source_priorities: prioritiesByRuleId[r.id] || []
    })) as DecisionRule[];
  }
  async getScientificData(cropId: string): Promise<any> {
    // Note: cropId here is the identity_code from JSON or uuid. We need the uuid from ck_general_information if cropId is a string code.
    const ckRes = await query(`
      SELECT ck.id 
      FROM ck_crop_knowledge ck
      JOIN ck_general_information gi ON gi.crop_knowledge_id = ck.id
      WHERE gi.identity_code = $1 OR ck.id::text = $1
      LIMIT 1
    `, [cropId]);
    
    if (ckRes.rows.length === 0) return null;
    const cropKnowledgeId = ckRes.rows[0].id;
    
    const valuesRes = await query('SELECT * FROM ck_scientific_values WHERE crop_knowledge_id = $1', [cropKnowledgeId]);
    const phasesRes = await query('SELECT * FROM ck_phenology_phases WHERE crop_knowledge_id = $1 ORDER BY phase_order', [cropKnowledgeId]);
    const prodRes = await query('SELECT * FROM ck_production_profiles WHERE crop_knowledge_id = $1', [cropKnowledgeId]);
    
    // Calculate simple completion rates
    const values = valuesRes.rows;
    const hasValues = values.length > 0;
    const hasPhases = phasesRes.rows.length > 0;
    const hasProd = prodRes.rows.length > 0;
    
    const completion = {
      profile: hasValues || hasPhases || hasProd ? 100 : 0,
      climate: values.some(v => v.field_name.startsWith('T') || v.field_name.startsWith('R')) ? 100 : 0,
      soil: values.some(v => v.field_name.startsWith('SOIL')) ? 100 : 0,
      water: 0,
      production: hasProd ? 100 : 0,
      phenology: hasPhases ? 100 : 0
    };
    
    return {
      scientific_values: values,
      phenology_phases: phasesRes.rows,
      production_profile: prodRes.rows[0] || null,
      completion
    };
  }

  async getRegionalProfile(cropId: string, regionName: string): Promise<any> {
    const ckRes = await query(`
      SELECT ck.id 
      FROM ck_crop_knowledge ck
      JOIN ck_general_information gi ON gi.crop_knowledge_id = ck.id
      WHERE gi.identity_code = $1 OR ck.id::text = $1
      LIMIT 1
    `, [cropId]);
    
    if (ckRes.rows.length === 0) return null;
    const cropKnowledgeId = ckRes.rows[0].id;

    const rpRes = await query(`
      SELECT * FROM ck_regional_profiles 
      WHERE crop_knowledge_id = $1 AND region_name = $2
    `, [cropKnowledgeId, regionName]);

    if (rpRes.rows.length === 0) return null;
    const rpId = rpRes.rows[0].id;

    const calRes = await query('SELECT * FROM ck_regional_production_calendars WHERE regional_profile_id = $1', [rpId]);
    const scRes = await query('SELECT * FROM ck_regional_production_scenarios WHERE regional_profile_id = $1', [rpId]);
    const notesRes = await query('SELECT * FROM ck_regional_notes WHERE regional_profile_id = $1', [rpId]);
    const sourcesRes = await query('SELECT * FROM ck_regional_sources WHERE regional_profile_id = $1', [rpId]);

    return {
      profile: rpRes.rows[0],
      calendar: calRes.rows[0] || null,
      scenarios: scRes.rows,
      notes: notesRes.rows,
      sources: sourcesRes.rows
    };
  }
}

let _shared: DecisionMatrixRepository;
export function getDecisionMatrixRepository() {
  if (!_shared) _shared = new DecisionMatrixRepository();
  return _shared;
}
