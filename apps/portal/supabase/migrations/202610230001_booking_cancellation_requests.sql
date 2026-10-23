-- A request leaves the Meet event and booked slot intact until an advisor approves it.
alter table public.bookings
  add column if not exists cancellation_requested_at timestamptz;
