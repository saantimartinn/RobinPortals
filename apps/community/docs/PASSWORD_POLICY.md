# Password storage policy

Subscriber signup, password changes and recovery use bcrypt with an independent salt and cost 12. Login rejects recoverable plaintext storage. The server rejects values exceeding 72 UTF-8 bytes to prevent bcrypt truncation. Password changes and recovery require at least eight characters.

Supabase stores only hashes for custom `subscribers` credentials. Supabase Auth, where used by another application, owns its hashing and must receive the original password over the server API rather than a browser-generated hash.

The migration and deployment procedure is documented in [Portal password policy](../../portal/docs/PASSWORD_POLICY.md). Select `--app=community` to review and migrate `subscribers`; other apps use `users`. No production migration has been executed as part of preparing this source change.
