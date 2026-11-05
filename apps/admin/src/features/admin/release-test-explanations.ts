// The popup explains what a green result proves, including the parts still untested.
export type ReleaseTestExplanation = {
  checks: string;
  execution: string;
  pass: string;
  limit: string;
};

export const releaseTestExplanations: Record<string, ReleaseTestExplanation> = {
  profile_classification: {
    checks: "Que Alumno y Robin Jr conservan los campos de tipo de cliente, origen, documento UE, número de carreras, fase y respuestas del cuestionario.",
    execution: "Consulta en modo lectura esas columnas de users en las dos bases, sin descargar perfiles personales al panel.",
    pass: "Ambas consultas responden y las columnas necesarias para clasificar el perfil están disponibles.",
    limit: "No decide una clasificación nueva para un alumno ni verifica la calidad de respuestas reales.",
  },
  student_sync: {
    checks: "Que las fichas de Alumno y Robin Jr tienen los identificadores y carpetas de Drive usados por la sincronización, y que existe el registro de eventos de integración.",
    execution: "Consulta users de ambos portales y webhook_log del portal en modo lectura.",
    pass: "Las tres lecturas terminan sin errores de esquema o conexión.",
    limit: "No crea ni modifica carpetas en Drive ni fuerza una sincronización de un alumno real.",
  },
  lead_ingest: {
    checks: "Que la entrada de leads puede guardar origen, fecha, correo y teléfono en el CRM, y el origen conservado en los leads de próximos cursos.",
    execution: "Valida las columnas de crm_leads y crm_future_leads. Crea un lead TEST con correo único y curso de 1º Bachillerato, comprueba su clasificación en 2028-29 y elimina únicamente esa fila. La suite de código comprueba la extracción del curso desde web y Meta.",
    pass: "El lead ficticio entra en próximos cursos, se asigna a 2028-29 y se elimina sin dejar rastro.",
    limit: "No envía un formulario web ni un lead desde Meta; esas entregas externas requieren eventos reales.",
  },
  crm_management: {
    checks: "Que el CRM acepta un lead nuevo y permite registrar y volver a leer un mensaje en su historial.",
    execution: "Crea un lead TEST con correo único, llama a las funciones reales de alta y lectura de mensajes y borra el lead junto con sus registros de prueba. La suite de código valida también las reglas de duración de llamadas.",
    pass: "El mensaje se guarda sin duración, aparece al consultar el historial y todos los datos TEST se eliminan.",
    limit: "No cambia la fase ni la asignación de un lead real, ni envía comunicaciones externas.",
  },
  lost_future: {
    checks: "Que el CRM guarda la fase Lost y su motivo, y puede trasladar un lead al archivo de próximos cursos conservando su historial.",
    execution: "Crea un lead TEST, lo marca Lost mediante la función real del CRM y llama a la función que lo traslada a 2028-29. Relee el archivo, comprueba la fase original y elimina el registro TEST.",
    pass: "La fase y el motivo se guardan, el archivo referencia el lead original y conserva Lost en su copia; el registro de prueba se borra.",
    limit: "No recupera un lead archivado ni modifica ninguno real.",
  },
  lead_to_client: {
    checks: "Que el origen CRM, las tres bases de destino y sus tablas de notas comerciales están preparados para crear cuentas desde un lead.",
    execution: "Lee las columnas usadas por la conversión en CRM, Alumno, Robin Jr y Community; comprueba que cada destino tiene crm_client_notes y que la contraseña inicial configurada cumple la política. La suite de código prueba la creación en los tres destinos con un mismo correo.",
    pass: "Las siete lecturas responden sin error y la contraseña inicial es válida. Una migración pendiente en cualquier portal marca error.",
    limit: "No convierte un lead real ni envía correos de acceso. La conversión funcional se prueba con datos simulados en la suite de código.",
  },
  crm_email: {
    checks: "Que el CRM puede consultar plantillas y borradores y que la cuenta Gmail compartida conserva el permiso de enviar.",
    execution: "Lee crm_email_drafts y crm_email_templates, renueva el acceso OAuth y verifica el alcance gmail.send mediante Google.",
    pass: "Tablas disponibles y Gmail confirma permiso de envío.",
    limit: "No envía un correo a nadie ni comprueba su entrega o apertura.",
  },
  admin_users: {
    checks: "Que el listado de administradores rechaza una petición sin sesión y responde a un admin autenticado.",
    execution: "Valida las tablas de roles y llama dos veces a la función real: primero sin cookie y después con sesión administrativa. Comprueba que solo se devuelven cuentas administrativas y que aparece la cuenta actual.",
    pass: "La petición sin sesión recibe 403 y el administrador obtiene una lista válida.",
    limit: "No modifica roles ni prueba cada permiso individual desde un navegador.",
  },
  dashboard_reports: {
    checks: "Que el dashboard comercial puede generar un informe personal de 30 días a partir de CRM y Portal.",
    execution: "Comprueba las fuentes de leads, actividad y pagos, y llama a la función real del informe con una sesión administrativa. Valida periodo, indicadores, series y alcance personal sin mostrar datos de clientes en el resultado del test.",
    pass: "La función devuelve un informe válido con CRM y Portal disponibles.",
    limit: "No compara cada importe con Holded ni verifica visualmente las gráficas; las conexiones de Meta y Holded tienen pruebas separadas.",
  },
  meta_data: {
    checks: "Que la credencial de Meta puede autenticar la cuenta y consultar datos de campañas de la cuenta publicitaria.",
    execution: "Consulta /me y el endpoint de insights por campaña de los últimos siete días, con un máximo de un registro. Si no hay ID de cuenta configurado, busca una cuenta publicitaria activa. Cuando el CRM tiene anuncios con ID, intenta resolver al menos uno a su campaña con la misma consulta que usa el informe.",
    pass: "Meta confirma la identidad, devuelve una lista válida de campañas y, si hay anuncios recientes en el CRM, permite resolver uno de ellos.",
    limit: "No compara el gasto con el dashboard ni comprueba que los webhooks de nuevos leads estén llegando; tampoco altera anuncios.",
  },
  holded_data: {
    checks: "Que la credencial de Holded de Admin responde a una lectura real.",
    execution: "Solicita el catálogo de impuestos con la misma clave utilizada por el módulo de facturas.",
    pass: "Holded devuelve un catálogo con formato válido.",
    limit: "No crea facturas reales ni reconcilia todas las cuentas. La factura demo se prueba por separado.",
  },
  portal_data: {
    checks: "Que el dashboard administrativo del Portal puede cargar alumnos, pagos, reservas y actividad.",
    execution: "Valida users, payments y bookings; llama a la función real del dashboard con sesión administrativa y comprueba la forma de sus secciones sin mostrar datos personales en el resultado del test.",
    pass: "El dashboard devuelve la cuenta administrativa correcta y listas válidas de alumnos, pagos, reservas y actividad.",
    limit: "No sustituye el recorrido de onboarding, el cobro sandbox ni una reserva real.",
  },
  web_analytics: {
    checks: "Que la medición propia de la web recibe eventos con sesión y que la función SQL de informes responde.",
    execution: "Consulta el último evento, cuenta los eventos con session_id de las últimas 72 horas y ejecuta web_stats para ese periodo.",
    pass: "Existe al menos un evento con sesión reciente y web_stats devuelve una respuesta sin error.",
    limit: "No compara estos datos con GA4 ni comprueba que cada visitante acepte cookies. Una web sin tráfico consentido durante 72 horas marcará error.",
  },
  ai_history: {
    checks: "Que un mensaje de un alumno aparece en el historial consultado por su asesor.",
    execution: "Crea una cuenta TEST asignada al administrador, guarda un mensaje ficticio y lo consulta con la función real del chat de asesor. Borra el mensaje y la cuenta al terminar.",
    pass: "La función devuelve la misma cuenta y el mensaje TEST, y la limpieza se completa.",
    limit: "No genera respuestas de la IA ni evalúa su calidad; tampoco envía una intervención del asesor al alumno.",
  },
  call_booking: {
    checks: "Que una cuenta del Portal asignada a un asesor puede consultar su disponibilidad en Google Calendar.",
    execution: "Crea una cuenta TEST, la asigna al administrador, llama a la función real de disponibilidad para dos días y elimina la cuenta. La suite de código prueba persistencia y cancelación de reservas.",
    pass: "Calendar está conectado y la función devuelve dos días con listas válidas de huecos.",
    limit: "No ocupa un hueco, no envía una invitación real y no comprueba la conexión Calendar de todos los asesores.",
  },
  code_suite: {
    checks: "Que el código exacto del despliegue superó todos los tests del sitio, Alumno, Robin Jr, Community y Admin.",
    execution: "En local lanza site/test-all.mjs. En producción el botón comprueba la prueba de ejecución incorporada al despliegue: Netlify ejecuta la suite durante el build y rechaza el despliegue si falla.",
    pass: "La suite termina sin fallos y el resultado incorporado corresponde al commit publicado.",
    limit: "En producción no vuelve a lanzar Node al pulsar el botón: verifica el resultado del build del commit publicado. Muchas pruebas usan servicios simulados y no recorren pantallas.",
  },
  frontend_build: {
    checks: "Que la configuración de Netlify coincide con el repositorio y que las cuatro interfaces compiladas están publicadas.",
    execution: "En local compila los cuatro portales en una carpeta temporal. En producción verifica la prueba del build aprobado y vuelve a solicitar por HTTP cada interfaz y su JavaScript publicado.",
    pass: "Las cuatro compilaciones terminaron sin errores y las cuatro páginas y sus archivos JavaScript responden correctamente.",
    limit: "En producción no recompila al pulsar: la compilación se ejecuta durante el despliegue. No comprueba la apariencia visual ni todos los recorridos del navegador.",
  },
  login_admin: {
    checks: "Comprueba que la sesión con la que has abierto Admin es válida y corresponde a un usuario con permiso administrativo.",
    execution: "Lee la cookie de sesión, valida su firma y busca el usuario en la base de datos antes de ejecutar el test.",
    pass: "La sesión es válida y la cuenta administrativa existe.",
    limit: "No vuelve a introducir usuario y contraseña. Esa comprobación corresponde al test de login con credenciales.",
  },
  login_credentials: {
    checks: "Verifica que una cuenta TEST del Portal del Alumno puede iniciar sesión con usuario y contraseña y recibir una sesión válida.",
    execution: "Crea una cuenta temporal identificada por un ID único en la base habitual, llama al endpoint real de login, valida la cookie y consulta el estado de onboarding. Después borra exactamente esa cuenta.",
    pass: "El login devuelve la cuenta correcta, su cookie identifica al mismo usuario y la cuenta de prueba se elimina.",
    limit: "Comprueba el login de Alumno. El acceso compartido hacia Robin Jr y Community se verifica con las pruebas automatizadas de código, pero este test no abre sus pantallas en un navegador.",
  },
  clients_portal: {
    checks: "Comprueba que un administrador puede cargar su listado de clientes en Alumno.",
    execution: "Valida el acceso a users y llama a la misma función que usa el panel de clientes con una sesión administrativa; solo muestra el número de filas recibidas.",
    pass: "La función devuelve una lista válida de clientes visibles para ese administrador.",
    limit: "No crea ni modifica clientes, ni abre una ficha en el navegador.",
  },
  clients_jr: {
    checks: "Comprueba que un administrador puede cargar su listado de clientes en Robin Jr.",
    execution: "Valida el acceso a users y llama a la función real de clientes de Robin Jr con una sesión administrativa; solo muestra el recuento.",
    pass: "La función devuelve una lista válida de clientes visibles para ese administrador.",
    limit: "No comprueba altas, cambios de fase ni el contenido de una ficha en el navegador.",
  },
  clients_community: {
    checks: "Comprueba que el panel Community puede cargar el listado de usuarios para un administrador autorizado.",
    execution: "Valida el acceso a subscribers y llama a la función real del panel con la sesión compartida y la sesión de Community; solo muestra el recuento.",
    pass: "La función devuelve una lista válida de usuarios visibles para ese administrador.",
    limit: "No comprueba la activación, renovación ni cancelación de una suscripción.",
  },
  clients_crm: {
    checks: "Comprueba que el CRM puede devolver su listado de leads a un administrador.",
    execution: "Valida el acceso a crm_leads y llama a la función real del listado CRM con una sesión administrativa; solo muestra el recuento.",
    pass: "La función devuelve una lista válida de leads visibles.",
    limit: "No crea leads ni prueba su conversión a cliente; esas rutas tienen otras comprobaciones.",
  },
  database_separation: {
    checks: "Comprueba que Alumno, Robin Jr y Community tienen destinos de base de datos distintos.",
    execution: "Compara las tres direcciones de Supabase configuradas en el servidor; no lee ni cambia registros.",
    pass: "Las tres direcciones son distintas.",
    limit: "No inspecciona las cuentas contables ni valida el contenido de cada base.",
  },
  onboarding_portal: {
    checks: "Comprueba que existen los campos que siguen las etapas del onboarding de Alumno y que se puede calcular su plan de cuotas.",
    execution: "Consulta el esquema de users y calcula las cuotas de un alumno ficticio de tipo general con una carrera.",
    pass: "Los campos están disponibles y el plan devuelve cuotas con importes positivos.",
    limit: "No crea un alumno, no sube un DNI y no recorre el contrato ni el pago.",
  },
  onboarding_jr: {
    checks: "Comprueba los campos de seguimiento y el cálculo de cuotas del onboarding de Robin Jr.",
    execution: "Consulta el esquema de users de Robin Jr y calcula un plan general para un alumno ficticio.",
    pass: "Los campos existen y todas las cuotas calculadas tienen importes positivos.",
    limit: "No recorre las pantallas ni completa un alta real de prueba.",
  },
  dni_portal: {
    checks: "Comprueba que el extractor de DNI del Portal del Alumno puede leer un documento ficticio.",
    execution: "Envía directamente al OCR real dos imágenes sintéticas: anverso y reverso. Consulta Anthropic con la configuración de Alumno.",
    pass: "Devuelve ALEX, PRUEBA MARTIN, 2008-03-12, 00000000T y la dirección ficticia esperada.",
    limit: "No prueba la subida del archivo, su almacenamiento privado, las fotos reales ni el guardado de datos en un alumno.",
  },
  dni_jr: {
    checks: "Comprueba el extractor de DNI de Robin Jr con el mismo documento ficticio.",
    execution: "Envía anverso y reverso directamente al OCR real, usando las credenciales y el modelo de Robin Jr.",
    pass: "El OCR devuelve los cinco datos esperados del documento sintético.",
    limit: "No comprueba la subida desde el móvil ni la persistencia del DNI en la ficha.",
  },
  recommender_portal: {
    checks: "Comprueba que el recomendador de Alumno genera carreras mediante IA para un perfil académico ficticio.",
    execution: "Le pasa intereses en programación e ingeniería, rasgos analíticos y asignaturas favoritas; llama a Anthropic sin crear un cliente.",
    pass: "El resultado procede de la IA y contiene diez códigos de carrera distintos. La lista de respaldo no cuenta como éxito.",
    limit: "No evalúa la calidad de las recomendaciones para un alumno real ni las guarda en su ficha.",
  },
  recommender_jr: {
    checks: "Comprueba la generación con IA del recomendador de Robin Jr.",
    execution: "Usa el mismo perfil ficticio y ejecuta el módulo de recomendación propio de Robin Jr.",
    pass: "Devuelve diez carreras distintas y declara que la fuente fue la IA.",
    limit: "No revisa la calidad académica del resultado ni el flujo de aprobación del asesor.",
  },
  payment_portal: {
    checks: "Comprueba la presencia de la configuración de Revolut y Holded del Portal del Alumno.",
    execution: "Lee en el servidor la URL y clave de Revolut, la clave de Holded y la subcuenta general. En producción comprueba que la URL no sea sandbox.",
    pass: "Todas esas variables están definidas y la URL tiene el entorno esperado.",
    limit: "No llama a Revolut ni a Holded; una clave presente todavía podría estar caducada. No hace cobros ni facturas.",
  },
  payment_jr: {
    checks: "Comprueba la configuración de pagos de Robin Jr y que comparte la cuenta de Revolut de Alumno.",
    execution: "Compara URL y clave de Revolut con las de Alumno y verifica que existen la clave de Holded y la subcuenta Robin Jr.",
    pass: "La configuración está presente y ambas plataformas comparten la misma URL y clave de Revolut.",
    limit: "No comprueba un cobro, una factura ni el ingreso en la cuenta bancaria.",
  },
  payment_community: {
    checks: "Comprueba que los nuevos pagos de Community tienen la misma configuración de Revolut y su propia cuenta de Holded.",
    execution: "Compara URL y clave de Revolut con Alumno; verifica la clave de Holded y la subcuenta de suscripciones.",
    pass: "Las variables están presentes y la configuración de Revolut coincide con Alumno.",
    limit: "No inicia una suscripción ni prueba renovaciones, Stripe histórico o facturación efectiva.",
  },
  payment_sandbox_order: {
    checks: "Comprueba que la clave de Revolut sandbox puede crear una orden de 1,00 € y que la API devuelve un checkout válido.",
    execution: "Desde el servidor actual crea una orden marcada como TEST, la vuelve a consultar para comprobar importe y moneda, y la cancela. Usa la URL fija de sandbox y la credencial de pruebas configurada en Admin.",
    pass: "La orden se crea, se recupera con 1,00 € y EUR, y queda cancelada.",
    limit: "No introduce una tarjeta de prueba, no confirma un cobro, no llama al webhook ni cambia el estado de un cliente.",
  },
  holded_demo_invoice: {
    checks: "Comprueba que Holded demo conserva las subcuentas de ingresos de Alumno (70500001), Community (70500005) y Robin Jr (70500006) en facturas ficticias.",
    execution: "Verifica la cuenta DEMO y las tres subcuentas, crea un contacto TEST y una factura de 1,00 € sin impuestos por portal, relee cada factura y elimina las tres facturas y el contacto por ID.",
    pass: "Las tres facturas se guardan con el contacto y la subcuenta esperados y todos los registros TEST se eliminan.",
    limit: "No usa el generador fiscal de los portales, no valida IVA ni una factura nacida de un cobro Revolut. Esos pasos pertenecen a la prueba conjunta.",
  },
  onboarding_end_to_end: {
    checks: "Verifica las etapas previas al pago en Alumno y Robin Jr: alta TEST, origen, guardado de DNI ficticio, contrato y perfil.",
    execution: "Crea una cuenta temporal con dos marcadores técnicos en cada base habitual. Llama a las funciones reales de cada etapa y comprueba el siguiente paso. Omite para estas cuentas los envíos de correo, Drive, Sheets y Storage; borra exactamente las cuentas creadas.",
    pass: "Ambos portales llegan al paso de pago con DNI, contrato y perfil completados y eliminan sus cuentas TEST.",
    limit: "No abre el frontend en un navegador, no llama al OCR ni confirma un pago. El OCR tiene sus propios tests. Los efectos externos omitidos no están incluidos en este resultado.",
  },
  payment_sandbox: {
    checks: "Verifica el pago inicial de Alumno con una orden de Revolut sandbox, el webhook firmado, el estado del cliente y una factura del mismo pago en Holded demo.",
    execution: "Crea un usuario TEST en la base habitual y un checkout sandbox con el importe real de la primera cuota. Abre el enlace con la VISA ficticia 4929 4205 7359 5709, fecha de caducidad 12/30 y CVV 123. Revolut acepta cualquier fecha futura y cualquier CVV de tres cifras en sandbox. Al pulsar Verificar, recupera la orden, reproduce el evento ORDER_COMPLETED con el secreto de firma del webhook sandbox, vuelve a verificar el pago para comprobar idempotencia, genera una factura con el código fiscal del Portal en Holded demo y valida la subcuenta 70500001. Finalmente elimina la factura, el contacto, las cuotas y el usuario TEST.",
    pass: "La orden queda completada, el webhook y la verificación aceptan el pago una sola vez, el cliente queda pagado y la factura demo corresponde al mismo pago y a la subcuenta de Alumno. La limpieza termina correctamente.",
    limit: "El evento firmado se entrega al handler desde la prueba, tanto en local como en producción; no verifica la entrega de red desde Revolut. La prueba cubre el pago inicial de Alumno; Robin Jr y Community tienen pruebas separadas de configuración y subcuenta.",
  },
};
