const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCoverHtml } = require('../lib/contract-email');

test('el correo del contrato conserva los datos y escapa el contenido del cliente', () => {
  const html = buildCoverHtml({
    clienteNombre: '<Cliente> & Familia', alumnoNombre: '<script>alumno</script>',
    fechaStr: '18 de noviembre de 2026', leadId: 'PR-123', tipoTitulo: 'Contrato — Pack Llegada',
  });
  assert.ok(html.includes('&lt;Cliente&gt; &amp; Familia'));
  assert.ok(html.includes('&lt;script&gt;alumno&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  for (const value of ['18 de noviembre de 2026', 'PR-123', 'Contrato — Pack Llegada']) assert.ok(html.includes(value), value);
});
