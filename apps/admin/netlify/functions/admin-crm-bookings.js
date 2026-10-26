// Netlify handler for /api/admin/crm/bookings: consultation bookings made on the website, read
// from the hello@ calendar so the lead inbox can show their date and time.
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { findAdminForSession } = require('../../lib/admin-auth');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const { isConfigured, listWebBookings } = require('../../lib/google-calendar');

const DAY_MS = 24 * 60 * 60 * 1000;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  try {
    const session = readSessionFromEvent(event);
    const admin = session && await findAdminForSession(getSupabase(), session);
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!isConfigured('hello@project-robin.com')) return json({ error: 'booking_calendar_not_configured' }, { statusCode: 503 });
    const now = Date.now();
    const bookings = await listWebBookings(new Date(now - 365 * DAY_MS).toISOString(), new Date(now + 180 * DAY_MS).toISOString());
    return json({ bookings });
  } catch (error) {
    return serverError(error, 'crm.bookings');
  }
};
