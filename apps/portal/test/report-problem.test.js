const assert = require('node:assert/strict');
const test = require('node:test');

const emailModule = require('../lib/email');
const originalSendEmail = emailModule.sendEmail;
let delivered = [];
let deliveryResult = { sent: true, id: 'test-email' };
emailModule.sendEmail = async (message) => {
  delivered.push(message);
  return deliveryResult;
};
const { handler } = require('../netlify/functions/report-problem');

function request(body) {
  return {
    httpMethod: 'POST',
    headers: { host: 'robinportals.netlify.app', origin: 'https://robinportals.netlify.app' },
    body: JSON.stringify(body),
  };
}

test('envía un reporte anónimo al buzón indicado por Robin', async () => {
  delivered = [];
  const response = await handler(request({
    kind: 'problem',
    email: 'alumna@example.org',
    message: 'Al subir el DNI recibo un error inesperado.',
    page: '/portal/',
  }));
  assert.equal(response.statusCode, 200);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].to, 'santiago.martin.ab@gmail.com');
  assert.equal(delivered[0].reply_to, 'alumna@example.org');
  assert.match(delivered[0].text, /Al subir el DNI/);
});

test('rechaza un reporte incompleto sin enviar correo', async () => {
  delivered = [];
  const response = await handler(request({ kind: 'problem', email: 'not-an-email', message: 'hola', page: '/portal/' }));
  assert.equal(response.statusCode, 400);
  assert.equal(delivered.length, 0);
});

test('informa si el proveedor no entrega el correo', async () => {
  deliveryResult = { sent: false, reason: 'provider_error' };
  const response = await handler(request({ kind: 'suggestion', email: 'alumna@example.org', message: 'Sería genial tener una sección de consejos.', page: '/portal/' }));
  assert.equal(response.statusCode, 502);
  emailModule.sendEmail = originalSendEmail;
});
