# Configuration and content model

Robin Jr uses the smallest source of truth appropriate to each kind of value. Not every
constant belongs in a database, and secrets never belong in source control.

| Category | Current source of truth | Examples | Change process |
|---|---|---|---|
| Financial rules | `shared/financial-config.cjs` | Current Robin Jr installments: 500 €, 500 € and 499 € (1.499 € total); historical plans remain versioned | reviewed deploy; amounts paid per customer remain canonical in `payments` |
| Legal contract content | `shared/contract-content.cjs` | contract clauses and fiscal text | legal review plus deploy |
| Security/authorization | backend modules plus secrets in environment | advisor allowlist, roles, JWT settings | security review plus deploy; credentials only in environment |
| Operational configuration | environment variables documented in `.env.example` | booking horizon, Google targets, Notion responsibility mapping, email inboxes | change Netlify environment and redeploy; Robin Jr booking title and 60-minute slots stay fixed in code |
| Provider credentials/IDs | environment variables | OAuth tokens, webhook secrets, Drive/Sheets IDs | secret/config rotation procedure; never DB or committed source |
| Product catalog content | frontend modules | questionnaire, application steps and FAQs | normal reviewed deploy while product owners change it infrequently |
| Admin-editable content | existing backend tables | tasks, career cards and assignments, documents/deadlines, payments and notifications | application admin UI; no source edit |
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
- Career cards hold academic details (including subjects and requirements); document deadlines belong to documents and are not linked to career cards.
- Robin Jr booking availability uses Calendar events named `RobinJr` in consecutive 60-minute slots. Only the lookup horizon is configurable.

## Known inconsistency

Legacy contract wording may describe other Project Robin products. It is not the source of
the Robin Jr payment plan; legal templates should only be changed with an explicit product
and legal review.

La conversión de Mentoría a General, Delft o Llegada de 666,33 € pertenece solo
al Portal del Alumno. Robin Jr no expone ese botón ni aplica ese crédito. Su
plantilla histórica de Mentoría todavía menciona 800 € y el total heredado de
`APPLICATION_TOTALS.mentoria` es 450 €; las altas actuales de Robin Jr usan el
plan propio de tres cuotas independientemente de `tipo`. Esta diferencia debe
resolverse como decisión de producto separada antes de ofrecer Mentoría en Robin Jr.

Esta sección describe reglas de código; confirma el esquema y las migraciones de
cada entorno antes de modificar datos de Robin Jr.
