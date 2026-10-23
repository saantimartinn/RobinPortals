// Routing of the project-robin.com Cloudflare Worker (infra/cloudflare/project-robin-router.js).
import assert from 'node:assert/strict';
import test from 'node:test';
import { upstreamFor } from '../../infra/cloudflare/project-robin-router.js';

const route = (path) => upstreamFor(new URL(`https://project-robin.com${path}`))?.toString() || 'web';

test('app paths go to the apps site unchanged, with their query', () => {
  assert.equal(route('/portal/'), 'https://robin-portals.netlify.app/portal/');
  assert.equal(route('/portal/api/me'), 'https://robin-portals.netlify.app/portal/api/me');
  assert.equal(route('/robinjr/?sso_ticket=x'), 'https://robin-portals.netlify.app/robinjr/?sso_ticket=x');
  assert.equal(route('/therobinplan/api/stripe/webhook'), 'https://robin-portals.netlify.app/therobinplan/api/stripe/webhook');
  assert.equal(route('/admin'), 'https://robin-portals.netlify.app/admin');
  assert.equal(route('/admin/crm'), 'https://robin-portals.netlify.app/admin/crm');
  assert.equal(route('/login'), 'https://robin-portals.netlify.app/login');
  assert.equal(route('/api/admin/crm/leads'), 'https://robin-portals.netlify.app/api/admin/crm/leads');
  assert.equal(route('/api/internal/crm/x'), 'https://robin-portals.netlify.app/api/internal/crm/x');
});

test('everything else stays on the website', () => {
  for (const path of ['/', '/contacto/', '/blog/holanda', '/api/book', '/api/availability', '/portales', '/administracion', '/loginx']) {
    assert.equal(route(path), 'web', path);
  }
});
