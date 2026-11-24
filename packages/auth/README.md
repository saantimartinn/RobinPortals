# Shared authentication primitives

`cookies.cjs` centralizes the HttpOnly, SameSite, path, expiry, and cookie-header handling used by Netlify auth handlers. It accepts the app's existing cookie parser and serializer so the backend packages do not need duplicate cookie behavior or new runtime dependencies.

Each app keeps its own identity rules and JWT payload validation because its account roles differ. Shared SSO ticket policy is the next part of the consolidation; app handlers remain responsible for mapping those identities to product permissions.

## Passwords

Each application's `lib/auth.js` (Community: `backend/lib/auth.js`) hashes passwords with bcrypt cost 12 and accepts only bcrypt at login. Every password change and recovery uses that same helper. Passwords over 72 UTF-8 bytes are rejected before hashing or verification.

The former plaintext storage helper has been removed. The explicit maintenance script `dev/migrate-legacy-passwords.cjs` can preview or migrate legacy records; it is never called by login handlers and does not run during builds. See [rollout instructions](../../apps/portal/docs/PASSWORD_POLICY.md).
