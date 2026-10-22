# Seguridad del navegador

Cookie HttpOnly, Secure, SameSite=Lax, path `/`, vigencia de siete días. API del mismo
origen y comprobación de Origin/Referer en mutaciones que la incluyen. El helper
permite solicitudes sin estas cabeceras, tal como el original; no es un token CSRF.

Se conservan X-Frame-Options=SAMEORIGIN, X-Content-Type-Options=nosniff y política
strict-origin-when-cross-origin. No se añade una CSP estricta sin inventariar fuentes,
imágenes, estilos inline y enlaces de terceros. Es trabajo pendiente.

Solo dist es público: el SQL, documentación, .env y backend no se sirven como estáticos.
