-- Account-wide receipt for the existing 2026 portal announcement. Only server code writes it.
alter table public.users
  add column if not exists portal_update_notice_seen_at timestamptz;
