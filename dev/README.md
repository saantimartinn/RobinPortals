# Desarrollo local

Desde la raíz del monorepo:

```sh
npm run dev:all
```

Netlify Dev arranca cada app con su propio puerto y carga las claves desde el `.env` ignorado de esa app. Si `Web-robin` está presente, también se arranca en 8892 como repositorio independiente; su `/login` redirige al portal local en 8891.

| App | URL local |
| --- | --- |
| Robin Jr | http://127.0.0.1:8888 |
| Community | http://127.0.0.1:8889 |
| Admin | http://127.0.0.1:8890 |
| Portal | http://127.0.0.1:8891 |
| Web independiente | http://127.0.0.1:8892 |

Los archivos `.env` de cada app contienen credenciales reales y están ignorados por Git. Las llamadas locales a Supabase, Stripe, correo u otros servicios usarán esos servicios reales; limita las pruebas a acciones reversibles y cuentas de prueba.

Para cambiar puertos o destino del login web, edita `dev/.env`. Este archivo contiene solo URLs locales, nunca secretos.
