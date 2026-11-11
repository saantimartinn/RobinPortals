# Reliable meeting history

Repair Meet transcript intake and the adviser assistant in Portal and Robin Jr. Admin shares Portal's database and must not run a duplicate collector. Preserve original transcripts and individual summaries; never ask the model to rewrite prior meetings. Queue long processing outside Netlify's scheduled-function time limit, retry temporary failures, and avoid attaching ambiguous calls to a student. Keep existing manual-note entry and historical text compatible.

Enable only transcript jobs, independently of the site's legacy scheduled jobs. Google authorization currently has Calendar and Drive read scopes, but no Meet settings scope; automatic generation needs manual activation in Meet or a separate authorization. No real transcript has yet been found, so synthetic integration tests must be distinguished from a real call.

The focused student's assistant context must include full meeting summaries and existing history, with other clients represented compactly. Existing assignment checks remain authoritative.

## Approach

Use shared server modules and a private Postgres queue/history table with atomic leases and completion. Scheduled discovery only lists/enqueues files and dispatches a background worker. This avoids inline LLM calls timing out and prevents concurrent jobs from overwriting history. Keep Drive originals and the existing `users.historial` compatibility field.
