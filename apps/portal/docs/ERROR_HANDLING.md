# Error-handling policy

Every `catch` must do at least one of the following:

- return or show a meaningful error;
- abort the critical operation;
- record a structured warning/error and continue intentionally;
- contain a comment explaining why the exception is safely ignorable.

Literal empty catches are rejected by `node scripts/check-empty-catches.js`.

## Classification

| Class | Treatment | Typical examples |
|---|---|---|
| A — safely ignorable | Explicit comment or warning | optional JSON parsing, cleanup of an obsolete object, browser history cleanup |
| B — degraded but usable | Structured warning/result | optional dashboard panels, AI briefing, Drive copy, email delivery |
| C — visible/retryable | UI error or persistent retry | Sheets, Holded, signed Storage URL, recoverable provider failures |
| D — abort | non-2xx / thrown error | authentication, authorization, primary DB write, Revolut fulfillment, Calendar booking creation |

## Integration decisions

- Supabase writes that define business state are class D.
- Revolut webhook persistence is class D and returns `500` for retry.
- Calendar event creation for a booking is class D.
- Holded and Google Sheets are class C via `integration_retry`.
- Resend and Drive are class B until an idempotent delivery/outbox contract exists.
- AI is class D when its answer is the requested endpoint result and class B for an optional briefing.

## Client behavior

Background polling and optional UI refreshes may continue after failure, but they must call `reportClientError`. Mutations that already own an error state should also show it to the user. The generic reporter never includes payloads, tokens, documents or personal data.
