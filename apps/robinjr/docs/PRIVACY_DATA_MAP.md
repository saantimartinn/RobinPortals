# Privacy and personal-data map

This is a technical data-flow inventory, not a legal-compliance declaration. Legal
counsel/privacy ownership must confirm lawful basis, notices, consent where required,
processor agreements, international transfers, retention periods and data-subject
request procedures.

## Data flows

| Data | Origin | Destination | Purpose | Current retention | Legal/consent question to validate | Minimization | Deletion path |
|---|---|---|---|---|---|---|---|
| Account identifiers, name, email, phone, city | Notion webhook, signup, onboarding/profile | Application DB; email provider; selected Google/finance flows | Account, contact and service delivery | No global expiry defined; session cookie is 7 days | Contract/pre-contract basis, notice and marketing separation | Logs now keep IDs/counts, not contact values | No self-service erasure workflow found; DB and processors require coordinated manual procedure |
| Birth date and annual birthday event | DNI onboarding extraction | Application DB, in-app notification, assigned advisor through Resend | Show the birthday to the advisor, congratulate the student and prompt a personal follow-up | One technical event per student and birthday year; source birth date follows account retention | Confirm transparency and the appropriate basis for this optional relationship message, especially for minors | Email contains only the student's name and is sent only to the assigned canonical advisor | Delete with the user record; notification and recipient rows require the coordinated account-closure process |
| DNI/passport number and images | Onboarding upload | Application DB/Storage, Google Drive, Anthropic OCR, Holded where invoicing requires tax identity | Identity extraction, contract and invoicing | No expiry defined | Necessity, special handling, OCR disclosure, age/guardian context | Browser uploads with a short-lived signed ticket; backend verifies ownership, MIME and 10 MB cap; DB stores paths rather than base64; still high-risk duplication | Remove DB metadata plus Storage and Drive objects; provider retention must be confirmed |
| Postal address, country and EU status | Onboarding/contract | Application DB, contract PDF, Google Drive, Holded | Contract and tax treatment | No expiry defined | Statutory invoicing/contract retention and proportionality | Only fields required for contract/tax should reach Holded | Coordinated DB/Drive/Holded process subject to statutory hold |
| Contract and signature | Onboarding | Application DB/Storage, Google Drive, Resend recipients | Evidence of agreement and service terms | No expiry defined | Signature validity, guardian authority and statutory retention | One canonical stored document plus delivery copies | Storage/Drive/email copies; preserve only where legal hold applies |
| Academic system, subjects, interests, questionnaire, careers and application phase | User/admin input | Application DB, Anthropic career suggestions/admin assistant, Google Sheets | Guidance and application operations | No expiry defined | Transparency for profiling/recommendations and human review | Send only fields required for each prompt; catalogue has no PII | DB plus Sheets/provider copies; define account-closure policy |
| Academic documents/records | User/admin upload | Application Storage and Google Drive; advisor receives a panel notification without attachment | Application processing and review | No expiry defined | Necessity and retention of the auxiliary Drive copy | Browser uploads directly with a short-lived signed ticket; DB stores paths only; email excludes the binary; 20 MB cap | Remove DB metadata plus Storage and Drive copies |
| Meet transcript and meeting history | Google Meet/Drive | Anthropic, application user history, Google Drive transcript folder | Meeting summary and case history | No expiry defined | Recording/transcription notice and participant consent | Transcript previews removed from persistent logs; full text still required for summarization | Delete Drive transcript and compiled history; provider source retention separately |
| AI/admin chat and messages | User/admin chat | Application DB and Anthropic | Assistance and conversation continuity | AI chat cleanup deletes records older than 7 days | Notice, acceptable-use and whether support review occurs | Context windows are truncated; avoid documents unless required | Scheduled application cleanup; Anthropic retention/settings still to verify |
| Payments | User/admin, Revolut webhook | Application DB, Revolut, Holded, Google Sheets | Payment, reconciliation and invoicing | Financial retention not defined in code | Statutory accounting retention and role access | Logs retain provider/internal IDs, not card metadata | Revolut/Holded/Sheets/DB deletion or restriction subject to legal hold |
| Email content and attachments | Application workflows | Resend and recipients | Transactional delivery | Provider/mailbox retention unknown | Processor terms, recipient correctness and attachment necessity | Fallback logs no longer persist recipient, subject, body or attachment | Provider/mailbox deletion cannot be guaranteed by application alone |
| Operational logs | Functions/providers | Netlify logs and `webhook_log` | Troubleshooting, retries and audit | No general expiry defined | Legitimate-interest assessment, access and retention | Allowlisted structured logs; persistent payloads exclude known PII fields/previews | Define and authorize retention job after legal/operational decision |

## Processors and external systems found

- Supabase/Postgres and Storage: primary application records and files.
- Netlify: hosting, Functions and runtime logs.
- Anthropic: OCR, chat, CV, career and transcript processing.
- Google Workspace: Drive, Sheets, Calendar and Meet.
- Revolut: checkout and payment processing.
- Holded: contacts, invoices and invoice PDFs.
- Resend/email recipients: transactional messages and attachments.
- Notion and Meet: inbound client and meeting data.

## Technical changes in this phase

- persistent webhook/email/integration logs now keep technical IDs, result codes and
  counts rather than transcript previews, webhook bodies, names, recipients, subjects,
  provider metadata or error details;
- provider error responses are no longer returned from the email helper;
- meeting ingestion responses do not echo identity hints;
- CI rejects known PII fields in persistent log payloads.

Historical rows may still contain data written by older code. They were not inspected,
changed or deleted because no Supabase operation is authorized. Retention and cleanup
must be approved with an exact scope and recovery plan.
