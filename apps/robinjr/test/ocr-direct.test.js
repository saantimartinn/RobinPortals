const test = require('node:test');
const assert = require('node:assert/strict');
const { extractDniFields } = require('../lib/ocr');

test('Robin Jr lee el DNI con la API directa y el modelo configurado', async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.ROBINJR__ANTHROPIC_API_KEY;
  const previousModel = process.env.ROBINJR__ANTHROPIC_MODEL;
  process.env.ROBINJR__ANTHROPIC_API_KEY = 'test-key';
  process.env.ROBINJR__ANTHROPIC_MODEL = 'claude-sonnet-5-5';
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['x-api-key'], 'test-key');
    assert.equal(options.headers['anthropic-version'], '2023-06-01');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'claude-sonnet-5-5');
    assert.equal(body.messages[0].content.filter((part) => part.type === 'image').length, 2);
    return {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"nombre":"Ana","apellidos":"López","direccion":"Calle Mayor 1","fecha_nacimiento":"2008-01-02","dni_numero":"12345678z","confidence":0.9}' }] }),
    };
  };
  try {
    const fields = await extractDniFields({
      anverso: { base64: 'AA==', mimetype: 'image/jpeg' },
      reverso: { base64: 'AA==', mimetype: 'image/jpeg' },
      docType: 'dni',
    });
    assert.equal(fields.nombre, 'Ana');
    assert.equal(fields.dni_numero, '12345678Z');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.ROBINJR__ANTHROPIC_API_KEY;
    else process.env.ROBINJR__ANTHROPIC_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.ROBINJR__ANTHROPIC_MODEL;
    else process.env.ROBINJR__ANTHROPIC_MODEL = previousModel;
  }
});
