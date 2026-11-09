// Automated checks for crm lead ingest test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { detectedCourse, ingestCrmLead, isFirstBachillerato } = require('../lib/crm-lead-ingest');

function crmForRecommender({ existingLead = null, existingFuture = null } = {}) {
  const writes = [];
  const crm = {
    from(table) {
      return {
        select() { return this; },
        ilike() { return this; },
        limit: async () => ({ data: table === 'crm_leads' ? (existingLead ? [existingLead] : []) : (existingFuture ? [existingFuture] : []), error: null }),
        insert(row) {
          writes.push({ table, row });
          return { select: () => ({ single: async () => ({ data: { id: 'new-lead', ...row }, error: null }) }) };
        },
        update() { throw new Error('An existing lead must not be modified'); },
      };
    },
  };
  return { crm, writes };
}

test('recognizes first-year Bachillerato variants for automatic 2028-29 routing', () => {
  for (const value of ['1º de Bachillerato', '1º Bachillerato', '1 Bach', '1o de bachillerato', 'Primero de Bachillerato', 'Primer Bachillerato']) {
    assert.equal(isFirstBachillerato(value), true, value);
  }
  for (const value of ['2º de Bachillerato', 'ESO', 'Universidad', '1º de carrera']) {
    assert.equal(isFirstBachillerato(value), false, value);
  }
});

test('extracts the course from website, Meta and labelled comment payloads', () => {
  assert.equal(detectedCourse({ course: '1º de Bachillerato' }), '1º de Bachillerato');
  assert.equal(detectedCourse({ payload: { questionnaire: { curso_actual: '1 Bach' } } }), '1 Bach');
  assert.equal(detectedCourse({ payload: { field_data: { en_que_curso_estas: 'Primero de Bachillerato' } } }), 'Primero de Bachillerato');
  assert.equal(detectedCourse({ comment: 'Interés: Business\nCurso: 1º Bachillerato' }), '1º Bachillerato');
});

test('recommender leaves an existing email untouched in current or future leads', async () => {
  for (const existing of [{ existingLead: { id: 'current' } }, { existingFuture: { id: 'future' } }]) {
    const { crm, writes } = crmForRecommender(existing);
    const result = await ingestCrmLead({
      source: 'website', createOnlyEmail: true, name: 'Ana García', email: 'ANA@example.com',
      phone: '+34 600 000 000', course: '2º de Bachillerato', campaign: 'Recomendador',
    }, crm);
    assert.equal(result.result, 'skipped_existing');
    assert.deepEqual(writes, []);
  }
});

test('recommender creates a normal website lead with contact, course and campaign', async () => {
  const { crm, writes } = crmForRecommender();
  const result = await ingestCrmLead({
    source: 'website', createOnlyEmail: true, name: 'Ana García', email: 'ANA@example.com',
    phone: '+34 600 000 000', school: 'Colegio Robin', course: '2º de Bachillerato',
    campaign: 'Recomendador', payload: { form_name: 'recomendador' },
  }, crm);
  assert.equal(result.result, 'created');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].table, 'crm_leads');
  assert.equal(writes[0].row.email, 'ana@example.com');
  assert.equal(writes[0].row.phone, '+34 600 000 000');
  assert.equal(writes[0].row.school_name, 'Colegio Robin');
  assert.equal(writes[0].row.source_payload.source, 'website');
  assert.equal(writes[0].row.source_payload.course, '2º de Bachillerato');
  assert.equal(writes[0].row.source_payload.campaign_name, 'Recomendador');
  assert.deepEqual(writes[0].row.campaign_notion_urls, ['Recomendador']);
});
