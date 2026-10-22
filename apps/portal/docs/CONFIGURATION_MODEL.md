# Configuration and content model

ROBIN uses the smallest source of truth appropriate to each kind of value. Not every
constant belongs in a database, and secrets never belong in source control.

| Category | Current source of truth | Examples | Change process |
|---|---|---|---|
| Financial rules | `shared/financial-config.cjs` | application totals, currency, VAT, fiscal identity | reviewed deploy; amounts paid per customer remain canonical in `payments` |
| Legal contract content | `shared/contract-content.cjs` | contract clauses and fiscal text | legal review plus deploy |
| Security/authorization | backend modules plus secrets in environment | advisor allowlist, roles, JWT settings | security review plus deploy; credentials only in environment |
| Operational configuration | environment variables documented in `.env.example` | booking window, Google targets, Notion responsibility mapping, email inboxes | change Netlify environment and redeploy |
| Provider credentials/IDs | environment variables | OAuth tokens, webhook secrets, Drive/Sheets IDs | secret/config rotation procedure; never DB or committed source |
| Product catalog content | frontend modules | questionnaire, application steps and FAQs | normal reviewed deploy while product owners change it infrequently |
| Admin-editable content | existing backend tables | tasks, careers, documents, payments and notifications | application admin UI; no source edit |
| Stable technical policy | code modules | validation limits, retry caps, supported MIME/types, theme tokens | tested deploy |

## Decisions in this phase

- `shared/financial-config.cjs` remains the only financial/fiscal rule source.
  Google Sheets now derives its net tax factor from `FISCAL.iva` instead of a second
  hard-coded `1.21`.
- Operational support recipients use `SUPPORT_INBOXES` (CSV) and `TEAM_EMAIL`.
  Omitting them preserves the existing `hello@project-robin.com` and
  `projectrobinn@gmail.com` behavior.
- Advisor identities remain in `lib/admins.js`: they participate in authorization
  and token selection, so changing them deserves a code/security review. Their OAuth
  tokens remain environment-only.
- Questionnaire, application steps and FAQ stay in source. There is no demonstrated need
  for independent runtime editing, por lo que moverlos a datos añadiría otra dependencia.
- Tareas, carreras, documentos, pagos y notificaciones permanecen gestionados por backend.
- Booking settings remain environment configuration and are audited in Phase 27.

## Known inconsistency

The Mentoría contract text states 800 EUR while the canonical charge is 450 EUR.
This is a business/legal decision already recorded in Phase 14 and is not silently
resolved by code cleanup.

No Supabase query or database change was made for this classification.
