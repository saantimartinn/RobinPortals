# Arquitectura frontend

Entrada: `frontend/src/main.jsx` → `app.jsx`. La aplicación consulta `/api/me`,
muestra login/alta si no hay sesión y compone SubscriberPortal o SubscriberAdmin.

| Carpeta | Responsabilidad |
|---|---|
| application | Shell, navegación y selección de plan |
| features/auth | Formularios de alta e inicio de sesión |
| features/subscription | Inicio, estado de suscripción, pagos y soporte |
| features/community | Social, mensajes, eventos, grupos, viajes y retos |
| features/career | Empleo, mentorías y CV con IA |
| features/services | Servicios personales y solicitudes |
| features/levels | Progreso y beneficios |
| features/profile | Perfil y ajustes |
| features/admin | Usuarios, contenidos, descuentos y notificaciones |
| shared | UI, tema, constantes, utilidades y avisos |
| api | Cliente HTTP del mismo origen |

No se importan SDKs de Supabase/Stripe ni secretos en el navegador. Los precios,
permisos y estados financieros deben verificarse en el backend. Los niveles
mostrados en UI no son una barrera de autorización.

El código original se separó por dependencias léxicas y se verifican bindings,
imports y ciclos automáticamente. Véase [mapa generado](COMPONENT_MAP.md).
