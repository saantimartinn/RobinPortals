-- CRM project only: odcjxzxfaclwwoynfqui. Does not change schema or contact details.
-- Repairs webinar landings and the audited Candela lead misclassified as Webinar.
begin;

with pages as (
  select id,
    regexp_replace(
      regexp_replace(lower(split_part(split_part(trim(coalesce(
        nullif(source_payload ->> 'page_url', ''),
        substring(coalesce(comment, body_text, '') from '(?im)^p[áa]gina:\s*([^\r\n]+)'),
        ''
      )), '?', 1), '#', 1)), '^https?://[^/]+', ''), '/+$', ''
    ) as path
  from public.crm_leads
), targets as (
  select id, case
    when path in ('/webinar21-11', '/webianr21-11') then 'Webinar 21-11'
    when id = 'f1106531-2279-40d0-a378-c77244ed2c78'::uuid and path = '/veteaholanda'
      then 'Campaña continua Candela'
  end as campaign
  from pages
)
update public.crm_leads as lead
set source_payload = coalesce(lead.source_payload, '{}'::jsonb)
      || jsonb_build_object('source', 'meta', 'campaign_name', targets.campaign),
    campaign_notion_urls = array[targets.campaign],
    source_updated_at = now()
from targets
where lead.id = targets.id and targets.campaign is not null
  and (lead.source_payload ->> 'source' is distinct from 'meta'
    or lead.source_payload ->> 'campaign_name' is distinct from targets.campaign
    or lead.campaign_notion_urls is distinct from array[targets.campaign])
returning lead.id, lead.source_payload ->> 'source' as source,
  lead.source_payload ->> 'campaign_name' as campaign;

commit;
