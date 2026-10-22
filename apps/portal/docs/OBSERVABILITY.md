# Observability

Critical server flows emit one-line JSON records through `lib/observability.js`.
Netlify can index these records without parsing free-form messages.

## Record contract

Every record includes:

- `timestamp`, `level`, `request_id`, `operation`, `result`, `duration_ms`;
- when applicable: `actor_id`, `actor_role`, `entity_type`, `entity_id`;
- for external services: `integration`, `attempt`, `error_code` and aggregate `count`.

The request ID is reused from `x-nf-request-id` or `x-request-id`; local/scheduled
operations receive a generated UUID. Start and outcome records therefore share a
correlation key.

## Privacy boundary

The logger uses an allowlist and accepts only scalar context values. It discards
unknown keys, objects and arrays. Do not add request bodies, emails, names, document
contents, CV text, prompts, provider payloads, URLs, cookies, authorization headers
or secrets to the allowlist. Error messages are not recorded: only explicit codes,
provider codes or safe machine-style messages are normalized into `error_code`.

## Covered operations

- `auth.login`
- `payments.verify` and `webhook.revolut`
- `onboarding.checkout`
- `bookings.create`
- `webhook.notion` and `webhook.meet`
- `integrations.queue_retry` and `integrations.retry`
- `ai.cv`

## Alerts

No new monitoring vendor or credential is introduced in this cleanup. In the
Netlify log drain/observability provider, configure alerts for:

- any `level=error` in `auth.login`, payments, onboarding or bookings;
- `result=retry_failed` or repeated `result=retry_pending`;
- `result=degraded` for the payment provider, Google Calendar or webhook secret configuration;
- a sustained rise in `result=rejected` for authentication or webhook operations.

Use `request_id` to reconstruct the operation and `entity_id` only to locate the
corresponding internal record. Application logs are not a datastore.
