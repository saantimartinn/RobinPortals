-- Convierte un cliente de Mentoría ya pagada en General, Delft o Llegada.
-- La cuota abonada de 666,33 € se conserva con su factura como pago histórico.
-- El nuevo plan reutiliza installment=1; un segundo intento falla por tipo.
create or replace function public.convert_paid_mentoria_client(
  p_user_id uuid,
  p_target_type text,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  client_row public.users%rowtype;
  mentor_payment public.payments%rowtype;
  archive_installment integer;
  original_invoice_number text;
  previous_contract jsonb;
begin
  if p_target_type not in ('general', 'delft', 'llegada') then
    raise exception 'invalid_target_type';
  end if;

  select * into client_row from public.users where id = p_user_id for update;
  if not found then raise exception 'client_not_found'; end if;
  if lower(coalesce(client_row.tipo, '')) <> 'mentoria' then
    raise exception 'client_not_mentoria';
  end if;
  if client_row.pago_completed is distinct from true then
    raise exception 'mentoria_payment_required';
  end if;

  select * into mentor_payment from public.payments
  where user_id = p_user_id and installment = 1 for update;
  if not found or mentor_payment.status <> 'paid'
      or mentor_payment.amount <> 666.33
      or mentor_payment.payment_data ->> 'annulled_at' is not null then
    raise exception 'paid_mentoria_installment_missing';
  end if;

  select greatest(4, coalesce(max(installment), 3) + 1)
    into archive_installment from public.payments where user_id = p_user_id;
  original_invoice_number := coalesce(
    mentor_payment.invoice_number,
    format('PR-%s-%s-01',
      extract(year from coalesce(mentor_payment.paid_at, mentor_payment.created_at, now()))::integer,
      upper(right(regexp_replace(coalesce(client_row.lead_id, client_row.id::text), '[^a-zA-Z0-9]', '', 'g'), 6))
    )
  );

  update public.payments set
    installment = archive_installment,
    concept = 'Mentoría abonada · crédito aplicado',
    invoice_number = original_invoice_number,
    payment_data = coalesce(mentor_payment.payment_data, '{}'::jsonb)
      || jsonb_build_object('mentoria_credit_source', true, 'original_installment', 1)
  where id = mentor_payment.id;

  previous_contract := coalesce(client_row.contract_data, '{}'::jsonb);
  update public.users set
    tipo = p_target_type,
    contract_signed = false,
    contract_signed_at = null,
    contract_data = jsonb_build_object(
      'mentoria_upgrade', jsonb_build_object(
        'credit_eur', 666.33,
        'source_payment_id', mentor_payment.id,
        'target_type', p_target_type,
        'converted_at', now(),
        'converted_by', p_admin_id
      ),
      'previous_contracts', coalesce(previous_contract -> 'previous_contracts', '[]'::jsonb)
        || jsonb_build_array(previous_contract - 'previous_contracts')
    ),
    pago_completed = false,
    pago_completed_at = null,
    pago_data = null,
    requires_onboarding = true
  where id = p_user_id;

  return jsonb_build_object('user_id', p_user_id, 'target_type', p_target_type,
    'credit_eur', 666.33, 'source_payment_id', mentor_payment.id);
end;
$$;

revoke all on function public.convert_paid_mentoria_client(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.convert_paid_mentoria_client(uuid, text, uuid) to service_role;
