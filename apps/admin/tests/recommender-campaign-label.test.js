const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { transformSync } = require('esbuild');

test('la campaña Recomendador aparece literalmente en las tablas de leads', async () => {
  const source = readFileSync(require.resolve('../src/features/admin/lead-shared.tsx'), 'utf8');
  const compiled = transformSync(source, { loader: 'tsx', format: 'esm' }).code;
  const module = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const lead = { source: 'Página web', campaign: 'Recomendador', formName: 'recomendador', pageUrl: 'https://project-robin.com/rbmt/' };
  assert.equal(module.campaignOrOrigin(lead), 'Recomendador');
  assert.equal(module.inboxCampaignLabel(lead), 'Recomendador');
});
