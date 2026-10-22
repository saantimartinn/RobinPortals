-- Logos públicos de partners. Las escrituras se realizan exclusivamente desde
-- el backend con service role; el navegador sólo consume la URL pública.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-logos',
  'partner-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Recursos iniciales versionados con el frontend. La normalización permite
-- reconocer variantes como "The Circo", "THE CIRCO" o "Link-Maas".
update public.partners
set logo_url = '/therobinplan/partner-logos/the-circo.png'
where regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') = 'thecirco';

update public.partners
set logo_url = '/therobinplan/partner-logos/link-maas.jpg'
where regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') = 'linkmaas';
