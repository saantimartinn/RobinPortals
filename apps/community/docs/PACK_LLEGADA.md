# Pack Llegada inside Robin Community

## Identity and access

The Portal's `users.tipo = 'llegada'` and signed contract identify the product.
`apps/portal/shared/arrival-pack.cjs` exposes its entitlement through `/portal/api/me`.
A conflicting contract variant (for example `general_noes`) is not a Llegada
contract. Unsigned contracts, administrators and external identities do not qualify.

Community's existing SSO first checks for a matching subscriber. An active or
trialing Community subscription keeps the full experience and also receives the
Pack's calls/payments. Otherwise SSO reuses the Portal user ID in the existing
Community cookie, with `auth_source = application_arrival`. No subscriber,
password, second login or booking identity is created.

Ordinary Community APIs reject that restricted session by default. Only `me`,
support, FAQs and eligible partners opt in, and revalidate the common Portal cookie and current
product on each request. The shared `shared/product-access.cjs` view policy
limits navigation to Inicio, Llamadas, Partners, Pagos, Soporte, FAQs and Ajustes. URL
parameters cannot grant another module. Calls/payments use the existing Portal
APIs, which derive ownership from their own authenticated session.

The sidebar also includes **Tu habitación**, which opens an informational popup
while accommodation is unavailable. It does not create a new page or API.
The [partners catalogue](PARTNERS.md) uses the public website's logos and links;
new partners are enabled only for Llegada, preserving existing Community access.

Pack Llegada onboarding retains request/origin, identity, contract and first
payment. It does not collect the academic questionnaire. The existing
`packages/onboarding/flow.mjs` policy is used for login, resumed onboarding,
navigation, payment fulfillment and progress numbering;
existing profile flags or answers are not overwritten to bypass the form.

## Existing integrations

- `BookingsPortal.Reservas` and the Portal booking APIs retain the assigned
  advisor, Google Calendar availability, Google Meet, email invitations,
  rollback on persistence failure and database collision protection.
- The existing limit of one future booking per student still applies, including
  a cancellation request awaiting the advisor's approval. Rescheduling follows
  that cancellation-and-new-reservation workflow; no second scheduler exists.
- Llegada displays slots and meetings in the browser's IANA timezone. Date
  grouping uses the slot's real timestamp, including daylight-saving offsets.
- Payments use Portal `payments`, existing Revolut checkout/verification and the
  existing payment receipt. Reading with `product=llegada` does **not** run
  `ensurePayments`, insert rows or reprice existing installments. Missing rows
  are shown as unregistered, with the contractual amount separately identified.
- A pending first payment links to the existing onboarding payment flow.
  Later unlocked, existing payments open the existing checkout and return to
  Community. Webhook and return verification remain authoritative/idempotent.
- Support reuses `service_requests`, its admin queue and existing email delivery.
  Llegada can submit support requests, not premium service keys or categories.
- Settings reuse the common password-change flow and show Portal personal data.
  Contractual personal-data corrections continue through the assigned advisor.

## Contract audit

Sources: `apps/portal/shared/contract-content.cjs` (`LLEGADA` and shared duration /
payment clauses), `financial-config.cjs` and `lib/payments.js`.

- Base price: **€1,700 including VAT**. Initial installment: **€850**, payable at
  first contact/acceptance; services start after receipt. Base balance: **€850**
  at signature/confirmation of the accommodation contract.
- Explicit extras can change the balance: application review €150; private-flat
  housing €450. Existing custom/paid ledger amounts take precedence in the UI.
- An actual prior mentorship payment can credit €666.33 against the first
  installment; the existing pricing logic is retained, never replaced by €850.
- The contract allows seven business days after a payment is unlocked. The UI
  uses recorded due dates rather than inventing a due date or public holidays.
- The contract specifies **no numeric call allowance**. No additional quota is
  introduced. The first-payment condition and service end are enforced before
  creating a Calendar event.
- Current service ends on **14 September 2027** (Madrid time). Management and
  historical calls remain accessible afterwards. An operator can record an
  explicitly agreed extension in `users.contract_data.arrival_service_end_at`
  as an ISO timestamp. The contract's one-time late-grades reactivation remains
  an operator-reviewed contractual decision; it is not granted by the browser.

The current contract also expressly mentions Community access and association /
event recommendations until that date. This implementation follows the requested
reduced feature list and does not rewrite signed contracts. Review the commercial
wording against that reduced scope before production rollout.

## Migration and rollout

Apply `supabase/migrations/007_arrival_pack_access.sql` to the **Community**
database before releasing the code. It adds `portal_user_id` to the existing
support table, enforces exactly one owner and keeps subscriber ownership/FKs.
It also adds FAQ product audiences, defaulting old FAQs to Community. No accounts,
charges, notifications or commercial FAQ answers are seeded by this migration.

In the existing FAQ administration, select Pack Llegada only for approved answers
that apply to this product. Shared answers can select both products. Until then,
Llegada's FAQ screen correctly shows an empty state.

No new secrets, environment variables, calendar configuration or payment provider
are required. Production migration, deployment, emails, meetings and charges are
not executed by this implementation or its tests.

## Validation

Run root `npm test`, Community `npm run check`, both frontend builds and each
app's `docs:check`. Arrival tests cover SSO precedence, restricted API access,
session/account switching, support ownership, FAQ audiences, payment reads and
booking contract checks. The browser validation uses an isolated local fixture
server: it exercises booking/navigation/receipts, errors, mobile and full/multiple
product views without contacting live Calendar, payment or mail providers.
The migration was also exercised against isolated PostgreSQL (PGlite), including
preservation of existing rows, ownership constraints and FAQ audience defaults.
