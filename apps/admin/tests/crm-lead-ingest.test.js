// Automated checks for crm lead ingest test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { detectedCourse, ingestCrmLead, isFirstBachillerato } = require('../lib/crm-lead-ingest');

function crmForRecommender({ existingLead = null, existingFuture = null, allowUpdates = false } = {}) {
  const writes = [];
  const crm = {
    from(table) {
      return {
        select() { return this; },
        ilike() { return this; },
        contains() { return this; },
        eq() { return this; },
        limit: async () => ({ data: table === 'crm_leads' ? (existingLead ? [existingLead] : []) : (existingFuture ? [existingFuture] : []), error: null }),
        insert(row) {
          writes.push({ table, row });
          return { select: () => ({ single: async () => ({ data: { id: 'new-lead', ...row }, error: null }) }) };
        },
        update(row) {
          if (!allowUpdates) throw new Error('An existing lead must not be modified');
          writes.push({ table, row });
          return { eq: () => ({ select: () => ({ single: async () => ({ data: { ...existingLead, ...row }, error: null }) }) }) };
        },
      };
    },
  };
  return { crm, writes };
}

test('una reserva en contacto de un lead inscrito en la secuencia conserva captación, campaña y el mismo registro', async () => {
  const existingLead = { id: 'original-30d-lead', name: 'Nombre original', email: 'lead@example.org', source_created_at: '2026-09-10T10:00:00Z', crm_stage: 'Por contactar', owner_names: [], source_payload: { source: 'meta', campaign_name: 'Campaña continua Candela', reactivation_30d: { campaign_id: 'holanda-inactive-30d-v1' } } };
  const { crm, writes } = crmForRecommender({ existingLead, allowUpdates: true });
  const result = await ingestCrmLead({ source: 'website', email: 'lead@example.org', name: 'Formulario nuevo', payload: { form_name: 'reserva', page_url: '/contacto/' } }, crm);
  assert.equal(result.result, 'updated'); assert.equal(result.lead.id, existingLead.id); assert.equal(writes.length, 1);
  assert.equal(result.lead.source_created_at, existingLead.source_created_at); assert.equal(result.lead.source_payload.campaign_name, 'Campaña continua Candela'); assert.equal(result.lead.source_payload.source, 'meta');
  assert.equal(result.lead.source_payload.retargeting_reservation.page_url, '/contacto/');
  assert.equal(result.lead.source_payload.exclude_from_acquisition, undefined);
});

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

test('la ingestión persiste Meta y la campaña de la landing por encima de valores heredados', async () => {
  for (const [page_url, expected] of [
    ['/webinar21-11/', 'Webinar 21-11'],
    ['/webianr21-11/', 'Webinar 21-11'],
    ['/veteaholanda/', 'Campaña continua Candela'],
  ]) {
    const { crm, writes } = crmForRecommender();
    await ingestCrmLead({
      source: 'website', name: 'Lead de prueba', email: 'landing@example.com',
      campaign: 'Campaña incorrecta', payload: { page_url, campaign_name: 'Campaña incorrecta' },
    }, crm);
    assert.equal(writes[0].row.source_payload.source, 'meta');
    assert.equal(writes[0].row.source_payload.campaign_name, expected);
    assert.deepEqual(writes[0].row.campaign_notion_urls, [expected]);
    assert.equal(writes[0].row.source_payload.page_url, page_url);
  }
});

test('las nuevas reservas de retargeting se guardan sin sumar captación, incluso en 1º de Bachillerato', async () => {
  for (const page_url of ['/retarwebinar21-11/', 'https://project-robin.com/RETARWEBINAR21-11?utm_source=meta']) {
    const { crm, writes } = crmForRecommender();
    const result = await ingestCrmLead({
      source: 'website', name: 'Reserva de prueba', email: 'retargeting@example.com',
      externalId: 'booking-1', createdAt: '2026-11-24T12:00:00Z', course: '1º de Bachillerato',
      payload: { form_name: 'reserva', page_url },
    }, crm);
    assert.equal(result.result, 'created');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].table, 'crm_leads');
    assert.equal(result.lead.source_payload.exclude_from_acquisition, true);
    assert.deepEqual(result.lead.source_payload.retargeting_reservation, {
      form_name: 'reserva', page_url, email: 'retargeting@example.com', external_id: 'booking-1', received_at: '2026-11-24T12:00:00Z',
    });
  }
});

test('una reserva reactiva el mismo contacto sin cambiar su captación, asesor, fase ni fecha original', async () => {
  const existingLead = Object.freeze({
    id: 'existing-lead', name: 'Contacto original', email: 'known@example.com', phone: '+34600000000',
    source_created_at: '2026-10-18T12:00:00Z', created_at: '2026-10-18T12:00:00Z',
    owner_names: ['Manuel'], crm_stage: 'Contactado', campaign_notion_urls: ['Webinar 21-11'],
    source_payload: { source: 'meta', campaign_name: 'Webinar 21-11', external_id: 'original-meta-id', page_url: '/webinar21-11/', form_name: 'contacto' },
  });
  const { crm, writes } = crmForRecommender({ existingLead, allowUpdates: true });
  const result = await ingestCrmLead({
    source: 'website', createOnlyEmail: true, name: 'Nombre nuevo', email: 'known@example.com',
    owner: 'María', campaign: 'Otra campaña', createdAt: '2026-11-24T12:00:00Z', course: '1º de Bachillerato',
    payload: { form_name: 'reserva', page_url: 'https://project-robin.com/retarwebinar21-11/' },
  }, crm);
  assert.equal(result.result, 'updated');
  assert.equal(result.lead.id, 'existing-lead');
  assert.equal(writes.length, 1);
  assert.deepEqual(Object.keys(writes[0].row).sort(), ['source_payload', 'source_updated_at']);
  assert.deepEqual(result.lead.owner_names, ['Manuel']);
  assert.equal(result.lead.crm_stage, 'Contactado');
  assert.equal(result.lead.source_created_at, existingLead.source_created_at);
  assert.deepEqual(result.lead.campaign_notion_urls, ['Webinar 21-11']);
  assert.equal(result.lead.source_payload.exclude_from_acquisition, undefined);
  assert.equal(result.lead.source_payload.retargeting_reservation.received_at, '2026-11-24T12:00:00Z');
  const { retargeting_reservation, ...acquisition } = result.lead.source_payload;
  assert.deepEqual(acquisition, existingLead.source_payload);
  assert.equal(existingLead.source_payload.retargeting_reservation, undefined);
});

test('otras URLs y los formularios sin reserva mantienen la clasificación anterior', async () => {
  for (const payload of [
    { form_name: 'contacto', page_url: '/retarwebinar21-11/' },
    { form_name: 'reserva', page_url: '/retarwebinar21-11-extra/' },
    { form_name: 'reserva', page_url: '/contacto/?next=/retarwebinar21-11/' },
    { form_name: 'reserva', page_url: 'https://example.com/retarwebinar21-11/' },
    { form_name: 'reserva', page_url: 'javascript:/retarwebinar21-11/' },
    { form_name: 'reserva', page_url: '/webinar21-11/' },
  ]) {
    const { crm } = crmForRecommender();
    const result = await ingestCrmLead({ source: 'website', email: 'normal@example.com', payload }, crm);
    assert.equal(result.lead.source_payload.retargeting_reservation, undefined);
    assert.equal(result.lead.source_payload.exclude_from_acquisition, undefined);
  }
});

test('repetir una reserva conserva la exclusión del nuevo registro de retargeting', async () => {
  const input = { source: 'website', email: 'retargeting@example.com', payload: { form_name: 'reserva', page_url: '/retarwebinar21-11/' } };
  const first = await ingestCrmLead(input, crmForRecommender().crm);
  const { crm, writes } = crmForRecommender({ existingLead: first.lead, allowUpdates: true });
  const repeated = await ingestCrmLead(input, crm);
  assert.equal(repeated.result, 'updated');
  assert.equal(repeated.lead.id, first.lead.id);
  assert.equal(repeated.lead.source_payload.exclude_from_acquisition, true);
  assert.equal(writes.length, 1);
});
