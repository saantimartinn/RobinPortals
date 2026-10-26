// Server-side booking availability helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const BOOKING_BUFFER_MIN = 15;
const BOOKING_BUFFER_MS = BOOKING_BUFFER_MIN * 60000;

function overlapsWithBookingBuffer(startMs, endMs, eventStartMs, eventEndMs) {
  return startMs < eventEndMs + BOOKING_BUFFER_MS
    && endMs + BOOKING_BUFFER_MS > eventStartMs;
}

function evaluateSlot(events, startAt, durationMin, availabilityTitle = 'RobinJr') {
  const requestedStart = new Date(startAt);
  const requestedEnd = new Date(requestedStart.getTime() + Number(durationMin) * 60000);
  const title = String(availabilityTitle).toLowerCase();

  const overlapsRequested = (calendarEvent) => {
    const eventStart = new Date(calendarEvent.start).getTime();
    const eventEnd = new Date(calendarEvent.end).getTime();
    return overlapsWithBookingBuffer(requestedStart.getTime(), requestedEnd.getTime(), eventStart, eventEnd);
  };
  const coversRequested = (calendarEvent) =>
    new Date(calendarEvent.start).getTime() <= requestedStart.getTime()
    && new Date(calendarEvent.end).getTime() >= requestedEnd.getTime();
  const isAvailabilityWindow = (calendarEvent) =>
    String(calendarEvent.summary || '').trim().toLowerCase() === title;

  const insideWindow = (events || []).some((event) => isAvailabilityWindow(event) && coversRequested(event));
  const occupied = (events || []).some((event) =>
    !isAvailabilityWindow(event)
    && event.transparency !== 'transparent'
    && overlapsRequested(event)
  );
  return { available: insideWindow && !occupied, insideWindow, occupied };
}

module.exports = { evaluateSlot, overlapsWithBookingBuffer, BOOKING_BUFFER_MIN, BOOKING_BUFFER_MS };
