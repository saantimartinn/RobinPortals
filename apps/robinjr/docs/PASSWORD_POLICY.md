# Password storage policy

All account creation, password changes and password resets store bcrypt hashes with an independent salt and cost 12 in `password_hash`. Login accepts bcrypt hashes only. The former recoverable password format is not accepted by any authentication handler.

Passwords must fit within bcrypt's 72 UTF-8 byte limit; longer values are rejected rather than silently truncated. Password-change and recovery routes require at least eight characters. Existing bcrypt hashes are retained. A credential originally created from more than 72 UTF-8 bytes must be reset, because the old bcrypt implementation truncated it and hash-only authentication now rejects that oversized input.

## Existing credentials and rollout

Before deploying hash-only authentication, pause password changes/resets, privately review existing credentials, and migrate the legacy records with [`dev/migrate-legacy-passwords.cjs`](../../../dev/migrate-legacy-passwords.cjs) from the monorepo root. This script is not part of the public HTTP API.

The operation defaults to preview mode. Select the application and explicitly confirm its Supabase URL with `--app=portal` (or `robinjr`, `admin`, `community`) and `--expect-url=https://PROJECT.supabase.co`. Only `--apply` enables updates. Supply that application's server credentials through the private operator environment, never through command-line credential values or Git.

The migration preserves passwords, leaves existing bcrypt hashes untouched, paginates by ID, and conditionally updates each original credential to avoid overwriting concurrent changes. It prints counts only. Empty or oversized legacy values are reported as blocked and require an account reset; conflicts must be reviewed. Rerun preview and require zero remaining legacy records before publishing hash-only login. Reopen password writes only after the new deployment is live. Rollback must keep hashed storage.

The script has been tested with synthetic data. Production migration and deployment require a separately reviewed operation; preparing this code does not change deployed accounts.
