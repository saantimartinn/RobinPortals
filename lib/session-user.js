// Central administrators are authenticated by the common Robin portal and do
// not need a duplicate row in RobinJr's local users table.
async function getSessionUser(sb, session, columns = '*') {
  if (session?.auth_source === 'application_admin') {
    return {
      data: {
        id: session.uid,
        lead_id: session.lead_id || null,
        username: session.username || session.email || null,
        email: session.email || null,
        role: 'application_admin',
        auth_source: 'application_admin',
        visible_tabs: Array.isArray(session.visible_tabs) ? session.visible_tabs : [],
        nombre: session.nombre || null,
        apellidos: session.apellidos || null,
      },
      error: null,
    };
  }

  return sb.from('users').select(columns).eq('id', session.uid).single();
}

module.exports = { getSessionUser };
