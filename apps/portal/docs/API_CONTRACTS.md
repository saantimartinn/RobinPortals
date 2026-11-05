# API contracts and validation

`API_INVENTORY.md` is the current endpoint catalogue. It is generated from
`netlify.toml` and the current Function source files. The count is generated rather
than hard-coded because domain endpoint splits can change it.

## Response convention

- Successful JSON responses use a domain object and, for mutations, `ok: true`.
- Client errors use `{ "error": "stable_snake_case_code" }`.
- `400` means malformed/invalid input, `401` no valid session/signature, `403`
  insufficient permission, `404` absent or deliberately hidden resource, `409`
  business conflict, `422` unreadable supported content, `502/503` unavailable
  integration and `500` an unexpected server failure.
- Provider webhooks may use plain bodies only where the provider contract requires it.
- Production responses must not expose stack traces, credentials or provider payloads.

## Shared input validators

`lib/validation.js` provides small, dependency-free validators for:

- UUID, email, ISO date and bounded strings;
- finite/bounded numbers and enums;
- base64 data URLs, canonical MIME and maximum decoded size;
- bounded offset/limit pagination.

Adoption is intentionally gradual. Current critical uses cover Revolut payment-attempt IDs,
booking dates/duration, signed upload metadata, document MIME/20 MB limit, identity-image
MIME/10 MB limit and manually adjusted payment amounts. Document and DNI/passport binaries
are uploaded directly to private Storage; Netlify only authorizes a short-lived ticket and
verifies the resulting object before using it. Existing identifiers are not
forced to UUID until the real schema contract has been verified without touching the
production database.

## Conversión de Mentoría

`POST /api/admin/clients/convert-mentoria` recibe
`{ "user_id": "<uuid>", "target_type": "general|delft|llegada" }` y devuelve
`{ "ok": true, "user_id": "<uuid>", "target_type": "...", "credit_eur": 666.33,
"source_payment_id": "<uuid>" }`. Requiere cookie, origen válido, admin con acceso
al Portal del Alumno y expediente asignado, salvo el admin desarrollador.

Los conflictos `409` incluyen `client_not_mentoria`, `mentoria_payment_required`
y `paid_mentoria_installment_missing`. La Function llama a una única transacción
SQL que conserva el pago y el contrato anteriores; una repetición tras convertir
devuelve conflicto. `/api/me` expone `mentoria_credit_eur` y
`first_payment_amount` al alumno convertido. La firma del nuevo contrato es
obligatoria antes de cobrar la diferencia. Véase
[Mentoría y conversión](MENTORIA_CONVERSION.md).

## Inventory maintenance

Run:

```bash
node scripts/generate-api-inventory.js
```

The CI gate regenerates the catalogue and rejects stale output. Static inference is
conservative: review auth, role and integration columns when changing an endpoint.
