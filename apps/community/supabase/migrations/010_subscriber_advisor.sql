-- Community keeps its own subscribers. Sharing never changes the main advisor.
alter table public.subscribers add column if not exists assigned_to text;
create index if not exists subscribers_advisor on public.subscribers(assigned_to);
