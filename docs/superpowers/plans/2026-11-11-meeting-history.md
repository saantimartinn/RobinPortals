# Meeting History Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, followed by one independent final review.

**Goal:** Import each meeting once, preserve its transcript and summary, and provide useful adviser context.
**Architecture:** Shared intake/worker/history modules; private Supabase ledger with atomic leases/completion; thin app handlers. Portal and Robin Jr own collectors; Admin reads Portal data.
**Tech Stack:** Node, Netlify Functions, Supabase Postgres, Google Drive/Meet, Anthropic.
**Spec:** `docs/superpowers/specs/2026-11-11-meeting-history-design.md`

## Global Constraints

- Never commit credentials or raw student data.
- Do not enable unrelated scheduled jobs or duplicate collectors against Portal's database.
- Preserve prior history verbatim and reject ambiguous student matching.
- Google auto-generation requires additional authorization or manual activation.

## Review Focus

- Simultaneous delivery/worker retries must not duplicate or overwrite meetings.
- A transcript created late must not be assigned solely to the nearest booking.
- A failed AI call must preserve raw text and permit retry.
- Switching focused students must not carry another student's chat context.
- Long history must reach the focused assistant without the old 1,200-character cutoff.

### Task 1: Scheduled discovery and durable meeting processing

Files: `site/app-env.cjs`, `site/test/app-env.test.cjs`, `packages/meeting-history/`, app `lib/meeting-history.js`, `meet-transcript-poll.js`, background handlers, Supabase migrations.

- [x] Add failing tests for modern scheduled events and per-job opt-in; run `node --test site/test/app-env.test.cjs`.
- [x] Implement scoped transcript opt-in and scheduled-event adaptation while preserving ordinary HTTP behavior.
- [x] Add failing shared-worker tests for deduplication, retry, student matching and preserved summaries.
- [x] Implement database queue/leases/completion, shared discovery and background processing with private endpoint authentication.
- [x] Run task tests and transaction-based database checks; expect no duplicate completion and unchanged legacy history.

### Task 2: Intake compatibility and assistant context

Files: app `meet-transcript.js`, `admin-historial-add.js`, `admin-assistant.js`, Google helpers, health endpoints and shared context helpers.

- [x] Add failing tests for append-only summaries, focused long history and rejected out-of-scope focus.
- [x] Route manual notes/webhooks through the durable ledger and retain existing permission checks.
- [x] Include focused history/meeting summaries, make Google prerequisites and actual processing state visible in health diagnostics.
- [x] Run focused tests and verify source compatibility.

### Task 3: Verification and production activation

- [ ] Run `npm test` and isolated `npm run site:build`.
- [x] Apply verified migrations to Portal and Robin Jr, enable only their transcript flags, and leave Admin's collector disabled.
- [x] Independent final review, address important findings with regression tests.
- [ ] Push, verify deployment and protected endpoints; run read-only health/discovery checks. Clearly report whether a real-call transcript was available.

## Execution ledger

- Design and scope follow the user's authorization to repair the diagnosed processing/context failures. Work remains in the existing checkout so local review uses the same project.
- Task 1: scheduled-adapter regressions RED→GREEN; queue/migration transaction tests passed on both schemas, including wrong-lease rejection, idempotency, two independent meetings and preserved legacy history. No synthetic users persisted.
- Task 2: focused full-history and assignment tests, worker authentication, manual-note compatibility, and real Anthropic synthetic summarization passed. Google identities match all three expected advisers; Meet scopes remain pending consent.
- Task 3: independent reviewer found three Important issues: Drive prefix search, shared-document ownership and delayed-call attribution. All were reproduced with regressions and fixed. Comment wording was updated with the intake documentation.
- Ruling: all discovery runs in the background worker; the scheduled function only dispatches it, avoiding Netlify's short scheduled runtime. Cost: discovery starts after dispatch rather than inside the cron invocation.
- Ruling: documents without an authoritative call timestamp explicitly show the document date and never inherit a nearby booking. Cost: an unknown call date/booking remains unknown rather than being inferred.
- Authorization: the user requested automatic generation. A local PKCE/state/account-verified flow is prepared at port 9394, with grants stored only under ignored `.netlify/`. The Google Cloud redirect URI was filled in; saving it and granting each account's consent remain user actions.
