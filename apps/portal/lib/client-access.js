const access = require('../../../packages/admin-collaboration/access.cjs');
module.exports = {
  canManageClient: (db, actor, id) => access.canManageClient(db, actor, id, 'portal'),
  scopeClients: (query, actor) => access.scopeClients(query, actor, 'portal'),
};
