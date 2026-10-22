-- Career cards no longer own document requirements. Keep existing student
-- documents, but detach them from career templates and clear legacy templates.
begin;

update public.documents
set career_template_id = null
where career_template_id is not null;

update public.career_templates
set required_docs = '[]'::jsonb
where required_docs is distinct from '[]'::jsonb;

commit;
