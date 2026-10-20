const test = require('node:test');
const assert = require('node:assert/strict');
const { canUseRobinPlan } = require('../backend/lib/application-permissions');

test('los administradores no Pro necesitan la pestaña de The Robin Plan', () => {
  assert.equal(canUseRobinPlan({ is_application_admin: true, is_pro_admin: false, visible_tabs: ['crm.to_contact'] }), false);
  assert.equal(canUseRobinPlan({ is_application_admin: true, is_pro_admin: false, visible_tabs: ['platform.robin_plan'] }), true);
  assert.equal(canUseRobinPlan({ is_application_admin: true, is_pro_admin: true, visible_tabs: [] }), true);
  assert.equal(canUseRobinPlan({ is_application_admin: false, is_pro_admin: true, visible_tabs: ['platform.robin_plan'] }), false);
  assert.equal(canUseRobinPlan(null), false);
});
