# Shared authentication primitives

`cookies.cjs` centralizes the HttpOnly, SameSite, path, expiry, and cookie-header handling used by Netlify auth handlers. It accepts the app's existing cookie parser and serializer so the backend packages do not need duplicate cookie behavior or new runtime dependencies.

Each app keeps its own identity rules and JWT payload validation because its account roles differ. Shared SSO ticket policy is the next part of the consolidation; app handlers remain responsible for mapping those identities to product permissions.
