# Booking availability

## Algorithm in plain language

1. The endpoint authenticates an application client and reads the assigned advisor.
2. It asks that advisor's Google Calendar for events in the requested date range.
3. An event titled exactly `RobinJr` is an availability window. Time outside
   those explicit windows is unavailable.
4. Each window is divided from its own start into 60-minute slots.
5. Opaque timed calendar events block overlapping slots. Transparent and all-day
   events do not. Slots less than 30 minutes in the future are omitted.
6. Results are deduplicated, sorted and grouped by date in `Europe/Madrid`.
7. When the client confirms, `bookings-create` fetches the calendar again and applies
   the same window-title rule before creating Meet and persisting the booking. A stale
   or occupied slot returns `409 slot_unavailable`.

If Calendar listing fails, the availability response is fail-safe closed: it marks
`calendar_connected: false` and returns no slots. Booking creation also refuses to
continue when its final availability check fails.

## Effective configuration

| Variable | Default | Validation | Effect |
|---|---|---|---|
| `BOOKING_MAX_DAYS` | `14` | integer from 1 to 31 | default and hard maximum for the requested horizon |

The frontend currently requests 14 days. Availability title and duration are fixed
to `RobinJr` and 60 minutes so deployment environment values cannot change the
reservation model.

`BOOKING_HOURS_START`, `BOOKING_HOURS_END` and `BOOKING_WORKDAYS` were removed. The
code read them but never used them, and the current inverse-calendar design already
expresses working hours through explicit advisor windows. Applying a second code-side
schedule would risk hiding a window the advisor deliberately created.
