const ADMIN_AREAS = [
  ['home.summary','/admin/','Resumen','Revisa los indicadores, las prioridades y las próximas llamadas. Las tarjetas resumen tu actividad; los filtros cambian el periodo consultado.'],
  ['home.leads','/admin/bandeja-leads','Bandeja de leads','Busca y filtra los contactos recibidos. Abre una ficha para consultar su origen, datos de contacto, notas y seguimiento.'],
  ['home.students','/admin/alumnos-global','Vista global de alumnos','Consulta y filtra los alumnos de todos los asesores. Ver una ficha aquí no te concede permiso para modificar su expediente: solo puedes gestionar clientes propios o compartidos.'],
  ['home.analytics','/admin/analitica-global','Analíticas generales','Consulta las métricas de actividad y sus periodos. Revisa siempre las fechas y filtros antes de comparar resultados.'],
  ['home.settings','/admin/configuracion','Configuración','Gestiona tu foto y contraseña y consulta los administradores. Los permisos, los vínculos y la activación de tutoriales los gestiona el PRO.'],
  ['crm.to_contact','/admin/crm','CRM · Por contactar','Organiza los contactos pendientes. Abre una tarjeta para registrar el seguimiento y utiliza los filtros para localizar el contacto adecuado.'],
  ['crm.contacted','/admin/crm/contactados','CRM · Contactados','Consulta las conversaciones ya iniciadas, sus notas y próximos pasos. Verifica el contacto antes de registrar una acción.'],
  ['crm.clients','/admin/crm/clientes','CRM · Clientes','Consulta los contactos convertidos en clientes y su seguimiento comercial. La asignación del expediente se mantiene en el portal correspondiente.'],
  ['crm.lost','/admin/bandeja-leads?view=lost&section=definitive','CRM · Lost','Revisa los contactos descartados y el motivo de cierre. Los filtros separan los contactos y periodos de seguimiento.'],
  ['analytics.sales','/admin/analiticas/ventas','Ventas','Consulta las ventas y cobros del periodo seleccionado. Los filtros de fecha y asesor determinan las cifras mostradas.'],
  ['analytics.campaigns','/admin/campanas','Campañas','Consulta el rendimiento de las campañas y su atribución. Compara resultados dentro del mismo periodo y con los mismos filtros.'],
  ['analytics.web','/admin/web','Web','Consulta visitas, formularios y conversiones. Los selectores permiten acotar fechas y páginas.'],
  ['analytics.operations','/admin/analiticas/operaciones','Operaciones','Revisa los indicadores operativos, los alumnos y el avance de los procesos.'],
];
const step = (id,title,description,target,extra={}) => ({id,title,description,target,...extra});

function tutorialSteps(portal,user) {
  if (portal === 'admin') {
    const allowed=new Set(Array.isArray(user.visible_tabs)?user.visible_tabs:ADMIN_AREAS.map(row=>row[0]));
    return [step('welcome','Tu espacio de administración','Este recorrido es obligatorio. Puedes volver a los pasos anteriores, pero debes completarlo antes de continuar. Solo recorrerás las áreas que tienes habilitadas.','body'),
      step('navigation','Navegación entre áreas','La barra superior cambia entre Inicio, CRM, métricas y los portales autorizados. El menú lateral muestra las secciones del área actual.','header'),
      ...ADMIN_AREAS.filter(([key])=>allowed.has(key)).map(([id,path,title,description])=>step(id,title,description,'.page',{path})),
      ...(allowed.has('platform.student_portal')?[step('portal-link','Portal del Alumno y RobinJr','En los portales encontrarás tus clientes propios y los que un PRO haya compartido contigo. Cada portal tiene un recorrido específico en su primer acceso autorizado.','header')]:[]),
      ...(allowed.has('platform.robin_plan')?[step('community-link','Robin Community','Accede a la comunidad desde la barra superior. Su recorrido explica usuarios, contenidos y servicios.','header')]:[])];
  }
  if (portal === 'community') {
    const sections=[['panel','Panel general','Revisa suscriptores, actividad y solicitudes.'],['usuarios','Usuarios','Busca por nombre o correo y filtra por ciudad. Asignarme este cliente te permite tomar un cliente sin responsable: será propio de tu perfil. Puedes consultar todas las fichas, pero solo modificar tus clientes propios y compartidos.'],['eventos','Eventos','Consulta y gestiona encuentros: título, fecha, lugar, aforo y publicación.'],['grupos','Grupos','Gestiona los grupos de la comunidad y sus datos.'],['asociaciones','Asociaciones','Consulta y edita asociaciones y su información de contacto.'],['empleos','Empleos','Gestiona ofertas de empleo y sus fechas de publicación.'],['ofertas','Ofertas','Gestiona beneficios y ofertas disponibles para suscriptores.'],['viajes','Viajes','Consulta y gestiona los viajes publicados.'],['mentores','Mentores','Gestiona el directorio de mentores y sus datos.'],['partners','Partners','Mantén el directorio y las ventajas de los partners.'],['codigos','Códigos','Configura códigos, descuento, duración y límites de uso.'],['notificaciones','Notificaciones','Prepara el mensaje, elige destinatarios y comprueba la selección antes de enviar.'],['retos','Retos','Gestiona los retos y revisa sus entregas antes de validarlas.'],['faqs','FAQs','Mantén las preguntas y respuestas publicadas para los suscriptores.']];
    return [step('welcome','Administración de Robin Community','Completa este recorrido para conocer todas las secciones disponibles. No se enviará ni guardará ninguna acción por recorrerlas.','.student-sidebar'),...sections.map(([section,title,description])=>step(section,title,description,'#subscription-admin-content',{section}))];
  }
  const junior=portal==='robinjr';
  return [
    step('welcome',junior?'Tu administración de RobinJr':'Tu administración del Portal','Completa este recorrido antes de continuar. Te mostrará las funciones disponibles sin modificar datos.','.robin-cross-nav'),
    step('summary','Resumen y prioridades','Los indicadores muestran actividad, cobros y fases. Pulsa una alerta para abrir su alumno. El selector de alertas ordena por urgencia, días o nombre.','.admin-content',{section:'inicio'}),
    step('clients','Clientes propios y compartidos','Busca por nombre, correo o identificador. Una etiqueta distingue los clientes que un PRO comparte contigo. Los propios conservan tu calendario; los compartidos, el del PRO.','input[aria-label="Buscar en mis clientes"]',{section:'clientes'}),
    step('folders','Carpetas y asignación','Crea carpetas para organizar tu cartera. Arrastra una tarjeta para moverla. Asignar cliente conserva la asignación directa; compartir lo gestiona tu PRO.','.client-folder-browser',{section:'clientes'}),
    step('context','Comprueba el expediente','Al abrir un cliente, comprueba su nombre e identificador. Cambiar cliente conserva la sección y descarta el contexto anterior del copiloto.','.admin-client-context',{section:'estado'}),
    step('progress','Progreso del alumno','Cada fase es un botón y se guarda al pulsar. El alumno verá la fase seleccionada. En Pack Llegada verás el estado del servicio y los accesos a pagos y llamadas.','.admin-content',{section:'estado'}),
    step('profile','Perfil y datos personales',junior?'Consulta los datos personales, cumpleaños, intereses y notas comerciales. Los datos personales son de solo lectura. La experiencia internacional se guarda desde su propia tarjeta.':'Corrige los datos y pulsa Guardar cambios. Descartar cambios restaura el borrador. Las notas comerciales y la experiencia internacional se guardan con sus propios botones.',junior?'.admin-content':'button|Guardar cambios',{section:'perfil'}),
    step('orientation','Orientación e historial','Las sugerencias ayudan a orientar: aprobar o descartar registra tu valoración. Modificar formulario permite corregir respuestas. El historial contiene también las reuniones anteriores del cliente compartido.','.admin-content',{section:'perfil'}),
    step('careers','Carreras y requisitos','Crea o edita programas con documentos, eventos y fechas límite. La biblioteca es compartida: editar una plantilla afecta a los alumnos que la tienen asignada.','.admin-content',{section:'carreras'}),
    step('career-assignment','Asignar una carrera','Asignar al alumno vincula la carrera a su expediente. Quitar asignación la retira de ese alumno; la papelera de biblioteca elimina la plantilla con confirmación.','button|Asignar al alumno',{section:'carreras'}),
    step('documents','Solicitar y revisar documentos','Añade una solicitud con nombre, obligatoriedad y plantilla opcional. Abre Ver archivo antes de Validar o marcar No validado. La papelera solicita eliminar el documento.','button|Añadir solicitud',{section:'documentos'}),
    step('payments','Pagos y cuotas','Importe abre la edición de una cuota pendiente. Desbloquear la habilita y avisa al alumno por correo. Justificante permite imprimir o guardar el comprobante.','button|Desbloquear',{section:'pagos'}),
    step('extras','Servicios adicionales','Añadir pago crea un cargo extra disponible para el alumno. Revisa concepto, importe, IVA, unidades u horas y fecha antes de confirmar.','button|Añadir pago',{section:'pagos'}),
    step('student-chat','Chat que ve el alumno','Si escribes al alumno, la IA se pausa. Enter envía y Shift + Enter añade una línea. Devolver a la IA reanuda la atención automática.','.admin-content textarea',{section:'chat'}),
    step('calls','Llamadas y calendario','Entrar a Meet abre la reunión. Cancelar o aprobar una cancelación avisa a los invitados. Para un cliente compartido se sigue utilizando el calendario del PRO.','.admin-content',{section:'reservas'}),
    step('academic','Perfil académico','Selecciona sistema y niveles, añade asignaturas y marca preferencias con los pulgares. Guarda los cambios antes de salir.','.admin-content',{section:'academico'}),
    step('notifications','Notificaciones','Elige aviso informativo o cambio de términos, escribe el contenido y selecciona destinatarios. Enviar notificación tiene un efecto real: revisa quién la recibirá.','button|Enviar notificación',{section:'notificaciones'}),
    step('faqs','Preguntas frecuentes','Nueva pregunta abre el editor. Guardar publica según la casilla de visibilidad. Las preguntas Base Robin no tienen edición ni borrado desde aquí.','button|Nueva pregunta',{section:'faqs'}),
    step('assistant','Copiloto del equipo','El botón flotante abre tus consultas internas. Notas resume y añade una reunión al historial. Ese panel es distinto del chat que lee el alumno.','.admin-assistant-launcher'),
    step('support','Ayuda y cierre de sesión','Reportar problema permite comunicar una incidencia o sugerencia. El botón de salida cierra tu sesión. Al finalizar este paso podrás trabajar normalmente.','.robin-cross-nav')];
}
module.exports={tutorialSteps};
