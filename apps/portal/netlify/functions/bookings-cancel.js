/** Request, approve, reject or directly cancel a future Google Meet booking. */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin, isDeveloperAdmin, normalizeEmail } = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const { deleteCalendarEvent } = require('../../lib/google-calendar');

const ACTIONS = new Set(['request', 'approve', 'reject', 'cancel']);

function createBookingCancelHandler(deps = {}) {
  const database = deps.getSupabase || getSupabase;
  const sessionFromEvent = deps.readSessionFromEvent || readSessionFromEvent;
  const removeCalendarEvent = deps.deleteCalendarEvent || deleteCalendarEvent;
  return async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = sessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  const { booking_id: bookingId, action } = parseJsonBody(event) || {};
  if (!/^[0-9a-f-]{36}$/i.test(String(bookingId || '')) || !ACTIONS.has(action)) {
    return json({ error: 'invalid_request' }, { statusCode: 400 });
  }

  try {
    const sb = database();
    const { data: actor, error: actorError } = await sb.from('users')
      .select('id, email, username, role').eq('id', session.uid).single();
    if (actorError || !actor) return json({ error: 'unauthorized' }, { statusCode: 401 });

    const { data: booking, error: bookingError } = await sb.from('bookings')
      .select('id, user_id, admin_email, start_at, status, cancellation_requested_at, calendar_event_id')
      .eq('id', bookingId).maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return json({ error: 'booking_not_found' }, { statusCode: 404 });

    const admin = isApplicationAdmin(actor);
    const studentOwner = !admin && String(booking.user_id) === String(actor.id);
    const assignedAdmin = admin && (isDeveloperAdmin(actor) || normalizeEmail(actor) === normalizeEmail(booking.admin_email));
    if (action === 'request' ? !studentOwner : !assignedAdmin) {
      return json({ error: 'forbidden' }, { statusCode: 403 });
    }
    if (booking.status !== 'scheduled' || new Date(booking.start_at).getTime() <= Date.now()) {
      return json({ error: 'booking_not_active' }, { statusCode: 409 });
    }

    if (action === 'request') {
      if (booking.cancellation_requested_at) return json({ ok: true, booking });
      const { data, error } = await sb.from('bookings')
        .update({ cancellation_requested_at: new Date().toISOString() })
        .eq('id', booking.id).eq('user_id', actor.id).eq('status', 'scheduled')
        .is('cancellation_requested_at', null).select().maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'booking_changed' }, { statusCode: 409 });
      return json({ ok: true, booking: data });
    }

    if (action === 'reject') {
      if (!booking.cancellation_requested_at) return json({ error: 'no_pending_request' }, { statusCode: 409 });
      const { data, error } = await sb.from('bookings')
        .update({ cancellation_requested_at: null })
        .eq('id', booking.id).eq('status', 'scheduled')
        .eq('cancellation_requested_at', booking.cancellation_requested_at)
        .select().maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'booking_changed' }, { statusCode: 409 });
      return json({ ok: true, booking: data });
    }

    if (action === 'approve' && !booking.cancellation_requested_at) {
      return json({ error: 'no_pending_request' }, { statusCode: 409 });
    }
    // Google sends cancellation updates to the invited student and advisor.
    // A missing event is safe to retry; never mark the booking cancelled if Google fails.
    try {
      await removeCalendarEvent(booking.admin_email, booking.calendar_event_id);
    } catch (error) {
      console.error('bookings-cancel calendar error', error);
      return json({ error: 'calendar_cancel_failed' }, { statusCode: 502 });
    }
    let update = sb.from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_requested_at: null })
      .eq('id', booking.id).eq('status', 'scheduled');
    const { data, error } = await update.select().maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'booking_changed' }, { statusCode: 409 });
    return json({ ok: true, booking: data });
  } catch (error) {
    console.error('bookings-cancel error', error);
    return serverError(error);
  }
  };
}

exports.handler = createBookingCancelHandler();
exports.createBookingCancelHandler = createBookingCancelHandler;
