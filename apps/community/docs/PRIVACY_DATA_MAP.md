# Datos personales

Supabase contiene identidad, email, ciudad, perfil, relaciones sociales, mensajes,
solicitudes, retos y estado de suscripción. El hash bcrypt no debe salir en APIs.
Stripe recibe datos de pago en su propia interfaz, no campos de tarjeta en React.
CV con IA envía al proveedor Anthropic el contenido necesario del documento/perfil.
Resend procesa destinatarios y contenido de correo transaccional.

No se incluyen datos reales ni exports en Git. Establecer retención y borrado de
mensajes, CV y logs antes de producción. El fallback de email registra solo etiqueta,
pero otros logs heredados requieren revisión específica.
