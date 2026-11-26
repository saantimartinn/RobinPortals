-- Apply to the Portal users database (the Admin identity database).
-- No existing account is automatically linked or forced through a tutorial.
create table public.admin_links (
  pro_admin_id uuid not null references public.users(id) on delete cascade,
  admin_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pro_admin_id, admin_id),
  check (pro_admin_id <> admin_id)
);

create table public.admin_client_shares (
  pro_admin_id uuid not null,
  admin_id uuid not null,
  portal text not null check (portal in ('portal','robinjr','community')),
  client_id uuid not null,
  owner_email text not null check (owner_email = lower(owner_email)),
  created_at timestamptz not null default now(),
  primary key (pro_admin_id, admin_id, portal, client_id),
  foreign key (pro_admin_id, admin_id) references public.admin_links(pro_admin_id,admin_id) on delete cascade
);
create index admin_shares_recipient on public.admin_client_shares(admin_id,portal);
create index admin_shares_client on public.admin_client_shares(portal,client_id);

create table public.admin_tutorials (
  admin_id uuid not null references public.users(id) on delete cascade,
  portal text not null check (portal in ('admin','portal','robinjr','community')),
  revision integer not null default 1 check (revision > 0),
  completed_revision integer not null default 0,
  step integer not null default 0 check (step >= 0),
  updated_at timestamptz not null default now(),
  primary key (admin_id,portal)
);

create table public.admin_meeting_mail (
  id uuid primary key default gen_random_uuid(),
  portal text not null check (portal in ('portal','robinjr')),
  meeting_id uuid not null,
  admin_id uuid not null references public.users(id) on delete cascade,
  pro_admin_id uuid not null,
  client_id uuid not null,
  status text not null default 'pending' check (status in ('pending','sent','revoked')),
  lease_until timestamptz,
  attempts integer not null default 0,
  sent_at timestamptz,
  unique (portal,meeting_id,admin_id)
);

-- Refreshing a tour is independent of changing a user's permissions.
create function public.require_admin_tutorial(p_admin_id uuid, p_portals text[])
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  insert into public.admin_tutorials(admin_id,portal)
  select p_admin_id,unnest(p_portals)
  on conflict (admin_id,portal) do update
    set revision=admin_tutorials.revision+1,step=0,updated_at=now();
end; $$;

create function public.claim_admin_meeting_mail(p_portal text,p_limit integer default 20)
returns setof public.admin_meeting_mail language sql security invoker set search_path=public,pg_temp as $$
  with pending as (
    select id from public.admin_meeting_mail
    where portal=p_portal and status='pending' and (lease_until is null or lease_until < now())
    order by id limit least(greatest(p_limit,1),50) for update skip locked
  )
  update public.admin_meeting_mail m set lease_until=now()+interval '2 minutes',attempts=m.attempts+1
  from pending p where m.id=p.id returning m.*;
$$;

alter table public.admin_links enable row level security;
alter table public.admin_client_shares enable row level security;
alter table public.admin_tutorials enable row level security;
alter table public.admin_meeting_mail enable row level security;
revoke all on public.admin_links,public.admin_client_shares,public.admin_tutorials,public.admin_meeting_mail from public,anon,authenticated;
grant all on public.admin_links,public.admin_client_shares,public.admin_tutorials,public.admin_meeting_mail to service_role;
revoke all on function public.require_admin_tutorial(uuid,text[]),public.claim_admin_meeting_mail(text,integer) from public,anon,authenticated;
grant execute on function public.require_admin_tutorial(uuid,text[]),public.claim_admin_meeting_mail(text,integer) to service_role;

-- Account creation, its initial link and first-login tutorials are atomic.
create function public.create_admin_profile(p_actor uuid,p_name text,p_email text,p_username text,p_password_hash text,p_attach boolean)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare new_id uuid;
begin
  insert into public.users(nombre,email,username,role,password_hash,requires_onboarding)
  values(p_name,p_email,p_username,'admin',p_password_hash,false) returning id into new_id;
  if p_attach then
    insert into public.admin_links(pro_admin_id,admin_id) values(p_actor,new_id);
    perform public.require_admin_tutorial(new_id,array['admin','portal','robinjr','community']);
  end if;
  return new_id;
end; $$;
revoke all on function public.create_admin_profile(uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.create_admin_profile(uuid,text,text,text,text,boolean) to service_role;
