-- Community profile and mentor images use authenticated server routes.
-- The browser receives short-lived signed URLs; the bucket remains private.
alter table public.subscribers
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-private-images',
  'community-private-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
