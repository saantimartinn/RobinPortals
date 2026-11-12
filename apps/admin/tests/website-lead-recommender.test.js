const test = require('node:test');
const assert = require('node:assert/strict');

test('website webhook maps recommender contacts and Meta landing campaigns to CRM', async () => {
  const ingestPath = require.resolve('../lib/crm-lead-ingest');
  const handlerPath = require.resolve('../netlify/functions/website-lead');
  const originalIngest = require(ingestPath);
  const originalSecret = process.env.WEBSITE_LEAD_INGEST_SECRET;
  let captured;
  require.cache[ingestPath].exports = {
    ...originalIngest,
    ingestCrmLead: async (input) => { captured = input; return { result: 'created', lead: { id: 'lead-1' } }; },
  };
  delete require.cache[handlerPath];
  process.env.WEBSITE_LEAD_INGEST_SECRET = 'test-secret';

  try {
    const { handler } = require(handlerPath);
    const response = await handler({
      httpMethod: 'POST', headers: { 'x-robin-lead-secret': 'test-secret' },
      body: JSON.stringify({
        form_name: 'recomendador', campaign: 'Recomendador', createOnlyEmail: true,
        submissionId: 'matching-session-1', page_url: 'https://project-robin.com/rbmt/',
        createdAt: '2026-10-12T10:00:00.000Z',
        fields: {
          name: 'Ana García', email: 'ana@example.com', phone: '+34 600 000 000',
          course: '2º de Bachillerato', colegio: 'Colegio Robin', ciudad: 'Madrid', pais: 'España',
        },
      }),
    });
    assert.equal(response.statusCode, 200);
    assert.equal(captured.createOnlyEmail, true);
    assert.equal(captured.email, 'ana@example.com');
    assert.equal(captured.phone, '+34 600 000 000');
    assert.equal(captured.school, 'Colegio Robin');
    assert.equal(captured.course, '2º de Bachillerato');
    assert.equal(captured.campaign, 'Recomendador');
    assert.equal(captured.externalId, 'matching-session-1');
    assert.equal(captured.createdAt, '2026-10-12T10:00:00.000Z');
    assert.equal(captured.payload.form_name, 'recomendador');
    assert.equal(captured.payload.page_url, 'https://project-robin.com/rbmt/');
    assert.match(captured.comment, /pa[ií]s: España/i);

    for (const [pageUrl, source, campaign] of [
      ['/webinar21-11/', 'meta', 'Webinar 21-11'],
      ['https://project-robin.com/vaparaaholanda/?utm_source=google', 'meta', 'Portugal'],
      ['/veteaholanda/', 'meta', 'Campaña continua Candela'],
      ['/contacto/', 'website', 'Otra campaña'],
      ['/veteaholanda-extra/', 'website', 'Otra campaña'],
    ]) {
      const result = await handler({
        httpMethod: 'POST', headers: { 'x-robin-lead-secret': 'test-secret' },
        body: JSON.stringify({ name: 'Lead de prueba', email: 'landing@example.com', page_url: pageUrl, campaign: 'Otra campaña' }),
      });
      assert.equal(result.statusCode, 200, pageUrl);
      assert.equal(captured.source, source, pageUrl);
      assert.equal(captured.campaign, campaign, pageUrl);
      assert.equal(captured.payload.page_url, pageUrl, pageUrl);
    }
  } finally {
    require.cache[ingestPath].exports = originalIngest;
    delete require.cache[handlerPath];
    if (originalSecret === undefined) delete process.env.WEBSITE_LEAD_INGEST_SECRET;
    else process.env.WEBSITE_LEAD_INGEST_SECRET = originalSecret;
  }
});
