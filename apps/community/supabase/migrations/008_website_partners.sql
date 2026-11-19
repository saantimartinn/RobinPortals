-- Official website catalogue, checked against project-robin.com and
-- Partners Robin.docx on 19 November 2026. No example/demo partners.
begin;
lock table public.partners in share row exclusive mode;

alter table public.partners add column if not exists products text[] not null default array['community'];
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'partners_products' and conrelid = 'public.partners'::regclass) then
    alter table public.partners add constraint partners_products
      check (cardinality(products) > 0 and products <@ array['community', 'pack_llegada']::text[]);
  end if;
end $$;

create temporary table robin_website_partners (
  key text primary key, name text, contact_url text, logo_url text,
  discount text, sort_order integer
) on commit drop;

insert into robin_website_partners values
  ('cjp', 'CJP', 'https://www.cjp.nl/', '/therobinplan/partner-logos/cjp.png', null, 1),
  ('revolut', 'Revolut', 'https://www.revolut.com/', '/therobinplan/partner-logos/revolut.png', null, 2),
  ('socialhub', 'The Social Hub', 'https://www.thesocialhub.co/', '/therobinplan/partner-logos/the-social-hub.png', null, 3),
  ('linkmaas', 'Linkmaas', 'https://www.instagram.com/link.maas/', '/therobinplan/partner-logos/linkmaas.png', null, 4),
  ('circo', 'The Circo', 'https://www.thecirco.nl/', '/therobinplan/partner-logos/the-circo.png', null, 5),
  ('studentexperience', 'Student Experience', 'https://studentexperience.com/locations/4/amsterdam-ndsm', '/therobinplan/partner-logos/student-experience.png', null, 6),
  ('scopemaastricht', 'Scope Maastricht', 'https://www.scope-maastricht.nl/', '/therobinplan/partner-logos/scope-maastricht.png', null, 7),
  ('hispaniagroningen', 'Hispania Groningen', 'https://www.hispaniagroningen.com/', '/therobinplan/partner-logos/hispania-groningen.png', null, 8),
  ('swapfiets', 'Swapfiets', 'https://swapfiets.nl/en-NL/students', '/therobinplan/partner-logos/swapfiets.png', '20 € adicionales de descuento con el código ROBIN', 9),
  ('translayte', 'Translayte', 'https://translayte.com/certified-translations?ref=281516', '/therobinplan/partner-logos/translayte.png', null, 10),
  ('britishcouncil', 'British Council', 'https://www.britishcouncil.es/', '/therobinplan/partner-logos/british-council.png', null, 11);

-- Match old spellings (LinkMaas / Link-Maas and The Student Experience),
-- keeping their IDs and operator-managed content. Ambiguous matches need review.
do $$ begin
  if exists (
    select source.key from robin_website_partners source join public.partners p
      on regexp_replace(regexp_replace(lower(trim(p.name)), '^the[[:space:]]+', ''), '[^a-z0-9]', '', 'g') = source.key
    group by source.key having count(*) > 1
  ) then
    raise exception 'Multiple existing partners match a website entry; resolve the duplicates before importing.';
  end if;
end $$;

update public.partners p set
  name = source.name,
  contact_url = source.contact_url,
  logo_url = source.logo_url,
  discount = coalesce(source.discount, p.discount),
  sort_order = source.sort_order,
  products = case when 'pack_llegada' = any(p.products) then p.products else array_append(p.products, 'pack_llegada') end
from robin_website_partners source
where regexp_replace(regexp_replace(lower(trim(p.name)), '^the[[:space:]]+', ''), '[^a-z0-9]', '', 'g') = source.key;

insert into public.partners (name, category, contact_url, logo_url, discount, sort_order, products)
select source.name, 'other', source.contact_url, source.logo_url, source.discount, source.sort_order, array['pack_llegada']
from robin_website_partners source
where not exists (
  select 1 from public.partners p
  where regexp_replace(regexp_replace(lower(trim(p.name)), '^the[[:space:]]+', ''), '[^a-z0-9]', '', 'g') = source.key
);

commit;
notify pgrst, 'reload schema';
