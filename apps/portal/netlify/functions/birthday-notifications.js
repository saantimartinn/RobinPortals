/**
 * Función programada diaria que felicita a los alumnos por su cumpleaños y
 * avisa por correo al asesor asignado. Los registros anuales y las claves de
 * deduplicación hacen que los reintentos no creen avisos o emails repetidos.
 */
const { getSupabase } = require('../../lib/supabase');
const { sendEmail } = require('../../lib/email');
const { json } = require('../../lib/http');
const { isApplicationAdmin } = require('../../lib/authorization');
const { canonicalAdvisorEmail, isAdminEmail } = require('../../lib/admins');

const MADRID_TIME_ZONE = 'Europe/Madrid';

function madridDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return { year: Number(get('year')), month: get('month'), day: get('day') };
}

function isBirthdayOn(fechaNacimiento, dateParts) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fechaNacimiento || ''));
  return !!match && match[2] === dateParts.month && match[3] === dateParts.day;
}

function studentName(user) {
  return [user?.nombre, user?.apellidos]
    .map((part) => String(part || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 180) || 'el alumno';
}

function firstName(user) {
  return String(user?.nombre || '').replace(/\s+/g, ' ').trim().split(' ')[0].slice(0, 80) || 'alumno';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isScheduledEvent(event) {
  try { return !!JSON.parse(event?.body || '{}').next_run; }
  catch (_) { return false; }
}

async function ensureBirthdayEvent(sb, user, year, advisorEmail) {
  const row = { user_id: user.id, birthday_year: year, advisor_email: advisorEmail || null };
  const { error: insertError } = await sb.from('birthday_events').insert(row);
  if (insertError && insertError.code !== '23505') throw insertError;
  if (advisorEmail) {
    const { error: advisorUpdateError } = await sb.from('birthday_events')
      .update({ advisor_email: advisorEmail, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('birthday_year', year)
      .is('advisor_email_sent_at', null);
    if (advisorUpdateError) throw advisorUpdateError;
  }
  const { data, error } = await sb.from('birthday_events')
    .select('user_id, birthday_year, notification_id, advisor_email, advisor_email_sent_at')
    .eq('user_id', user.id)
    .eq('birthday_year', year)
    .single();
  if (error) throw error;
  return data;
}

async function ensureBirthdayNotification(sb, user, year) {
  const dedupeKey = `birthday:${year}:${user.id}`;
  const { data: notification, error } = await sb.from('notifications')
    .upsert({
      title: `¡Feliz cumpleaños, ${firstName(user)}! 🎉`,
      content: 'Todo el equipo de Project Robin te desea un día increíble. ¡Disfrútalo mucho!',
      type: 'info',
      event_kind: 'birthday',
      dedupe_key: dedupeKey,
      created_by: 'system:birthday',
    }, { onConflict: 'dedupe_key' })
    .select('id')
    .single();
  if (error) throw error;
  const { error: recipientError } = await sb.from('notification_recipients')
    .upsert({ notification_id: notification.id, user_id: user.id, status: 'pending' }, {
      onConflict: 'notification_id,user_id',
      ignoreDuplicates: true,
    });
  if (recipientError) throw recipientError;
  return notification.id;
}

async function notifyAdvisor(sb, eventRow, user, year) {
  if (!eventRow.advisor_email || eventRow.advisor_email_sent_at) return false;
  const name = studentName(user);
  const subject = `Es el cumpleaños de "${name}"`;
  const text = `Es el cumpleaños de "${name}". Felicítalo.`;
  const htmlName = escapeHtml(name);
  const result = await sendEmail({
    to: eventRow.advisor_email,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;color:#1B2F6E"><h2>${escapeHtml(subject)}</h2><p>Es el cumpleaños de <strong>"${htmlName}"</strong>. Felicítalo.</p></div>`,
    tag: 'birthday_advisor',
    idempotencyKey: `birthday-advisor/${year}/${user.id}`,
  });
  if (!result.sent) return false;
  const now = new Date().toISOString();
  const { error } = await sb.from('birthday_events')
    .update({ advisor_email_sent_at: now, updated_at: now })
    .eq('user_id', user.id)
    .eq('birthday_year', year);
  if (error) throw error;
  return true;
}

exports.handler = async (event) => {
  if (!isScheduledEvent(event)) return json({ error: 'not_found' }, { statusCode: 404 });
  try {
    const sb = getSupabase();
    const today = madridDateParts();
    const { data: users, error } = await sb.from('users')
      .select('id, nombre, apellidos, fecha_nacimiento, assigned_to, role')
      .not('fecha_nacimiento', 'is', null);
    if (error) throw error;

    const birthdays = (users || []).filter((user) => !isApplicationAdmin(user) && isBirthdayOn(user.fecha_nacimiento, today));
    const summary = { birthdays: birthdays.length, notifications: 0, advisor_emails: 0, errors: 0 };
    for (const user of birthdays) {
      try {
        const assigned = canonicalAdvisorEmail(user.assigned_to);
        const advisorEmail = isAdminEmail(assigned) ? assigned : null;
        let eventRow = await ensureBirthdayEvent(sb, user, today.year, advisorEmail);
        const notificationId = await ensureBirthdayNotification(sb, user, today.year);
        if (eventRow.notification_id !== String(notificationId)) {
          const { error: notificationUpdateError } = await sb.from('birthday_events')
            .update({ notification_id: String(notificationId), updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('birthday_year', today.year);
          if (notificationUpdateError) throw notificationUpdateError;
          eventRow = { ...eventRow, notification_id: String(notificationId) };
        }
        summary.notifications++;
        if (await notifyAdvisor(sb, eventRow, user, today.year)) summary.advisor_emails++;
      } catch (birthdayError) {
        summary.errors++;
        console.error('birthday-notifications user error', birthdayError && birthdayError.message);
      }
    }
    return json({ ok: true, ...summary });
  } catch (error) {
    console.error('birthday-notifications error', error && error.message);
    return json({ ok: false, error: 'birthday_notifications_failed' }, { statusCode: 500 });
  }
};

module.exports.madridDateParts = madridDateParts;
module.exports.isBirthdayOn = isBirthdayOn;
module.exports.studentName = studentName;
module.exports.isScheduledEvent = isScheduledEvent;
