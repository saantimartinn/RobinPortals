# Password policy

Initial passwords use bcrypt. Manually changed passwords are stored with the
`plain:v1:` marker in the existing `password_hash` column, without a hash.
Login accepts both formats during the transition.

## Canonical policy

- minimum: 8 characters;
- maximum: 72 UTF-8 bytes, retained for consistency with existing accounts;
- no mandatory uppercase, digit, symbol or periodic rotation rules;
- bcrypt work factor remains 12 in `lib/auth.js`.

`shared/password-policy.cjs` is consumed by password change and the Notion bootstrap
gate. Invalid new credentials return
`weak_password`; an invalid configured bootstrap returns
`weak_bootstrap_password_configuration` and fails closed.

Login deliberately does not apply the new-credential policy. It must continue to
verify existing hashes, including credentials created under the historical six-
character rule or passwords whose suffix bcrypt previously ignored after 72 bytes.
Users can move to the current policy when changing their password.

## Lifecycle audit

| Flow | State |
|---|---|
| Application bootstrap | password comes from required `NOTION_BOOTSTRAP_PASSWORD`; canonical policy enforced, no hard-coded fallback |
| Password change | authenticated endpoint, current password required, canonical policy enforced; new value is stored without a hash |
| Password recovery | no recovery/reset endpoint found in the repository |
| Sessions | signed HTTP-only secure cookie, seven-day expiry |

The shared Notion bootstrap credential is still a residual risk even though it is
environment-only and validated. Replacing it requires an activation/reset delivery
flow and user-communication decision; inventing that flow is outside cleanup.
Login/change abuse protection is handled separately in Phase 30.

No password values were read, logged or committed. No Supabase access or database
change was performed.
