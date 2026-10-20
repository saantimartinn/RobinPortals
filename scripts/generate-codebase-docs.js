// Maintenance utility for generate codebase docs; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'docs', 'codebase');
const textExtensions = new Set(['.cjs', '.css', '.html', '.js', '.jsx', '.json', '.md', '.mjs', '.toml', '.yml']);

const folderDetails = {
  '.': ['Robin Platform — árbol navegable', 'Punto de entrada para entender el repositorio completo antes de bajar a una capa concreta.', 'Cuando necesites localizar dónde vive una responsabilidad o seguir el flujo completo de una petición.'],
  '.github': ['Automatización de GitHub', 'Configuración de automatizaciones asociadas al repositorio.', 'Cuando cambies procesos que se ejecutan a partir de commits o pull requests.'],
  '.github/workflows': ['Workflows de GitHub Actions', 'Pipelines que validan el repositorio antes y después de integrar cambios.', 'Cuando añadas o retires un gate, una versión de runtime o un paso de build.'],
  docs: ['Documentación técnica', 'Documentación mantenida sobre arquitectura, seguridad, operación, datos e inventarios.', 'Cuando necesites comprender decisiones y contratos antes de modificar código.'],
  lib: ['Servicios backend compartidos', 'Reglas de dominio, autorización, validación y adaptadores usados por las Netlify Functions.', 'Cuando la lógica sea reutilizable o no pertenezca al borde HTTP de un endpoint.'],
  netlify: ['Runtime de Netlify', 'Entrypoints serverless, protección Edge y estructura desplegada por Netlify.', 'Cuando trabajes en rutas API, tareas programadas o protección previa a los endpoints.'],
  'netlify/functions': ['Netlify Functions', 'Entrypoints HTTP y programados. Validan la petición y delegan la lógica reutilizable a `lib/`.', 'Cuando necesites añadir, cambiar o diagnosticar un endpoint o cron concreto.'],
  'netlify/edge-functions': ['Netlify Edge Functions', 'Protecciones ligeras ejecutadas antes de determinadas rutas API.', 'Cuando cambies límites de abuso o su aplicación por ruta.'],
  'portal-source': ['Frontend React/Vite', 'Proyecto frontend independiente que genera el portal publicado en `/portal/`.', 'Cuando cambies dependencias, build o configuración del frontend.'],
  'portal-source/public': ['Recursos públicos del portal', 'Archivos copiados sin transformación al build público.', 'Cuando añadas una descarga o recurso que deba conservar su nombre.'],
  'portal-source/public/recursos': ['Recursos descargables', 'Guías e imágenes disponibles para alumnos desde el portal.', 'Cuando sustituyas o añadas material descargable.'],
  'portal-source/src': ['Código fuente del frontend', 'Composición React, sesión, cliente API, estilos y utilidades del navegador.', 'Cuando cambies comportamiento o presentación del portal.'],
  'portal-source/src/application': ['Experiencia de aplicación', 'Pantallas principales de alumnos y administración, organizadas por dominio.', 'Cuando cambies una sección funcional del portal autenticado.'],
  'portal-source/src/application/documents': ['Frontend de documentos', 'Reglas de presentación y estado de documentos.', 'Cuando cambies fases, documentos por defecto o etiquetas de estado.'],
  'portal-source/src/application/onboarding': ['Frontend de onboarding', 'Flujo guiado de incorporación del alumno.', 'Cuando cambies pasos, formularios o navegación del onboarding.'],
  'portal-source/src/application/payments': ['Frontend de pagos', 'Presentación de pagos, facturas y justificantes.', 'Cuando cambies formato o experiencia visual de pagos.'],
  'portal-source/src/assets': ['Activos visuales fuente', 'Logotipos importados y procesados por Vite.', 'Cuando sustituyas identidad visual utilizada desde componentes.'],
  'portal-source/src/shared': ['Widgets frontend compartidos', 'Componentes reutilizados por varias superficies autenticadas.', 'Cuando un cambio visual o de interacción afecte a más de un portal.'],
  scripts: ['Scripts de calidad y documentación', 'Gates estáticos y generadores ejecutados localmente y en CI.', 'Cuando cambies una regla de calidad o un inventario generado.'],
  shared: ['Reglas compartidas entre runtimes', 'Configuración de dominio consumida tanto por Node.js como por el frontend.', 'Cuando backend y frontend deban aplicar exactamente la misma regla.'],
  test: ['Pruebas automatizadas', 'Regresiones unitarias y de límites arquitectónicos ejecutadas por Node.js.', 'Cuando cambies comportamiento o quieras fijar un contrato antes de refactorizar.'],
};

const knownFilePurposes = {
  '.env.example': 'Inventario de variables de entorno permitidas, siempre sin valores reales.',
  '.gitignore': 'Evita versionar dependencias, builds, secretos y artefactos locales.',
  'README.md': 'Portada del proyecto con arranque local y enlaces de documentación.',
  'package.json': 'Dependencias y metadatos del backend y de los scripts raíz.',
  'package-lock.json': 'Resolución reproducible de dependencias raíz; se regenera con npm.',
  'lint.config.cjs': 'Patrones y carpetas usados por el lint de seguridad local.',
  'netlify.toml': 'Fuente de verdad de build, redirects, headers, Edge Functions y schedules de Netlify.',
  '.github/workflows/ci.yml': 'Pipeline principal: instala, valida inventarios, ejecuta tests y construye el frontend.',
  'portal-source/package.json': 'Dependencias y comandos Vite del frontend.',
  'portal-source/package-lock.json': 'Resolución reproducible de dependencias del frontend.',
  'portal-source/index.html': 'Documento HTML base en el que Vite monta React.',
  'portal-source/vite.config.js': 'Configuración de compilación y desarrollo de Vite.',
  'portal-source/tailwind.config.js': 'Rutas de contenido y tema de Tailwind CSS.',
  'portal-source/postcss.config.js': 'Transformaciones CSS aplicadas durante el build.',
  'portal-source/src/api.js': 'Cliente único de las rutas `/api/*` consumidas por el navegador.',
  'portal-source/src/app.jsx': 'Raíz de autenticación y selección entre portal de alumno y administración.',
  'portal-source/src/main.jsx': 'Arranque de React en el DOM.',
  'portal-source/src/session.js': 'Clasificación frontend de la sesión y del principal administrativo.',
  'portal-source/src/index.css': 'Estilos globales y configuración base de Tailwind.',
  'portal-source/src/theme.js': 'Tokens de color compartidos por los componentes.',
  'portal-source/src/ui.jsx': 'Primitivas visuales reutilizables como botones y campos.',
  'portal-source/src/application-steps.js': 'Definición de fases y pasos visibles del expediente.',
  'portal-source/src/questionnaire-data.js': 'Preguntas y opciones del cuestionario de perfil.',
  'portal-source/src/browser-utils.js': 'Utilidades que dependen de APIs disponibles solo en navegador.',
  'portal-source/src/client-utils.js': 'Formato, logging seguro e imágenes auxiliares del frontend.',
  'portal-source/src/application/AdminPortal.jsx': 'Composición principal del portal de administración.',
  'portal-source/src/application/ApplicationPortals.jsx': 'Superficies principales de la experiencia del alumno.',
  'portal-source/src/application/ClientSections.jsx': 'Secciones de pagos, carreras y documentos del alumno.',
  'portal-source/src/application/onboarding/OnboardingFlow.jsx': 'Flujo completo de pantallas y formularios de onboarding.',
  'portal-source/src/application/payments/InvoiceReceipt.jsx': 'Justificante de pago preparado para impresión.',
  'portal-source/src/shared/PortalWidgets.jsx': 'Widgets reutilizados por las experiencias autenticadas.',
  'shared/application-roles.cjs': 'Regla canónica que hace equivalentes los roles `admin` y `supervisor`.',
  'shared/contract-content.cjs': 'Contenido contractual compartido por pantalla y PDF.',
  'shared/financial-config.cjs': 'Importes, fiscalidad y cálculo de cuotas de aplicación.',
  'shared/password-policy.cjs': 'Política de contraseñas compartida por backend y frontend.',
};

function normalize(file) {
  return file.replace(/\\/g, '/');
}

function comparePaths(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function trackedFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  );
  return [...new Set(output.split('\0').filter(Boolean).map(normalize))]
    .filter((file) => !file.startsWith('docs/codebase/'))
    .filter((file) => fs.existsSync(path.join(root, file)))
    .sort(comparePaths);
}

function read(file) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) return '';
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function humanize(filename) {
  return path.basename(filename, path.extname(filename)).replace(/[-_]/g, ' ');
}

function headerSummary(source) {
  const block = /^\s*\/\*\*([\s\S]*?)\*\//.exec(source);
  if (!block) return '';
  const lines = block[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*?\s?/, '').trim())
    .filter((line) => line && !line.startsWith('@'));
  return lines.slice(0, 2).join(' ').replace(/\s+/g, ' ').slice(0, 240);
}

function markdownHeading(source) {
  const match = /^#\s+(.+)$/m.exec(source);
  return match ? match[1].trim() : '';
}

function purposeForFile(file, source) {
  if (knownFilePurposes[file]) return knownFilePurposes[file];
  const extension = path.extname(file).toLowerCase();
  if (file.startsWith('netlify/functions/')) {
    return headerSummary(source) || `Entrypoint serverless para ${humanize(file)}.`;
  }
  if (file.startsWith('netlify/edge-functions/')) {
    return headerSummary(source) || `Protección Edge para ${humanize(file)}.`;
  }
  if (file.startsWith('lib/')) {
    return headerSummary(source) || `Servicio backend compartido para ${humanize(file)}.`;
  }
  if (file.startsWith('scripts/')) {
    return headerSummary(source) || `Gate o generador de CI para ${humanize(file)}.`;
  }
  if (file.startsWith('test/')) return `Pruebas automatizadas de ${humanize(file)}.`;
  if (file.startsWith('docs/')) {
    const heading = markdownHeading(source);
    return heading ? `Documenta: ${heading}.` : `Documentación técnica de ${humanize(file)}.`;
  }
  if (file.startsWith('portal-source/public/')) return `Recurso público del portal: ${path.basename(file)}.`;
  if (file.startsWith('portal-source/src/assets/')) return `Activo visual fuente: ${path.basename(file)}.`;
  if (file.startsWith('portal-source/src/')) return headerSummary(source) || `Módulo frontend de ${humanize(file)}.`;
  if (file.startsWith('shared/')) return `Regla de dominio compartida para ${humanize(file)}.`;
  if (extension === '.json') return `Configuración o datos versionados de ${humanize(file)}.`;
  return `Archivo mantenido del repositorio: ${path.basename(file)}.`;
}

function whenToChange(file) {
  if (file.startsWith('netlify/functions/')) return 'Al cambiar ese endpoint, webhook o trabajo programado.';
  if (file.startsWith('netlify/edge-functions/')) return 'Al cambiar la protección Edge de las rutas asociadas.';
  if (file.startsWith('lib/')) return 'Al cambiar lógica backend compartida o una integración.';
  if (file.startsWith('portal-source/src/')) return 'Al cambiar esa parte de la experiencia React.';
  if (file.startsWith('portal-source/public/')) return 'Al sustituir o añadir ese recurso público.';
  if (file.startsWith('shared/')) return 'Al cambiar una regla que debe coincidir entre runtimes.';
  if (file.startsWith('test/')) return 'Al fijar o actualizar el comportamiento cubierto.';
  if (file.startsWith('scripts/')) return 'Al cambiar el gate, inventario o criterio de CI.';
  if (file.startsWith('docs/')) return 'Al actualizar la decisión, contrato o procedimiento descrito.';
  if (file.endsWith('package-lock.json')) return 'Solo como resultado de un cambio intencional de dependencias.';
  if (file.endsWith('package.json')) return 'Al cambiar dependencias, scripts o requisitos de Node.js.';
  if (file === 'netlify.toml') return 'Al cambiar despliegue, rutas, cabeceras o schedules.';
  if (file.startsWith('.github/workflows/')) return 'Al cambiar los pasos obligatorios de GitHub Actions.';
  return 'Cuando cambie la responsabilidad indicada.';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function relationsForFile(file, source, routes) {
  const relations = [];
  if (file.startsWith('netlify/functions/')) {
    const functionName = path.basename(file, '.js');
    for (const route of routes.get(functionName) || []) relations.push(`ruta \`${route}\``);
    const tables = unique([...source.matchAll(/\.from\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]));
    for (const table of tables.slice(0, 4)) relations.push(`tabla \`${table}\``);
    const services = unique([...source.matchAll(/require\(['"]\.\.\/\.\.\/lib\/([^'"]+)['"]\)/g)].map((match) => match[1]));
    for (const service of services.slice(0, 4)) relations.push(`\`lib/${service}\``);
  } else {
    const dependencies = unique([
      ...[...source.matchAll(/require\(['"](\.{1,2}\/[^'"]+)['"]\)/g)].map((match) => match[1]),
      ...[...source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((match) => match[1]),
    ]);
    relations.push(...dependencies.slice(0, 6).map((dependency) => `\`${dependency}\``));
  }
  return relations.slice(0, 8).join('<br>') || '—';
}

function routesByFunction() {
  const config = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  const result = new Map();
  for (const block of config.split('[[redirects]]').slice(1)) {
    const from = /\bfrom\s*=\s*"([^"]+)"/.exec(block);
    const target = /\bto\s*=\s*"\/\.netlify\/functions\/([^"]+)"/.exec(block);
    if (!from || !target) continue;
    if (!result.has(target[1])) result.set(target[1], []);
    result.get(target[1]).push(from[1]);
  }
  for (const match of config.matchAll(/\[functions\."([^"]+)"\]([\s\S]*?)(?=\r?\n\[|$)/g)) {
    const schedule = /schedule\s*=\s*"([^"]+)"/.exec(match[2]);
    if (!schedule) continue;
    if (!result.has(match[1])) result.set(match[1], []);
    result.get(match[1]).push(`cron: ${schedule[1]}`);
  }
  return result;
}

function directorySet(files) {
  const directories = new Set(['.']);
  for (const file of files) {
    let current = normalize(path.posix.dirname(file));
    while (current && current !== '.') {
      directories.add(current);
      current = path.posix.dirname(current);
    }
  }
  return [...directories].sort(comparePaths);
}

function parentDirectory(directory) {
  return directory === '.' ? null : path.posix.dirname(directory);
}

function outputFile(directory) {
  return directory === '.'
    ? path.join(outputRoot, 'README.md')
    : path.join(outputRoot, directory, 'README.md');
}

function sourceLink(readmeFile, file) {
  let relative = normalize(path.relative(path.dirname(readmeFile), path.join(root, file)));
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function folderInfo(directory) {
  return folderDetails[directory] || [
    path.basename(directory),
    `Contenido mantenido de \`${directory}/\`.`,
    'Cuando necesites trabajar en esta parte concreta del repositorio.',
  ];
}

function cell(value) {
  return String(value || '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function render(directory, files, directories, routes) {
  const [title, purpose, enterWhen] = folderInfo(directory);
  const readmeFile = outputFile(directory);
  const directFiles = files.filter((file) => path.posix.dirname(file) === directory);
  const children = directories.filter((candidate) => candidate !== '.' && parentDirectory(candidate) === directory);
  const parent = parentDirectory(directory);
  const lines = [`# ${title}`, ''];
  if (parent != null) lines.push('[← Subir un nivel](../README.md)', '');
  lines.push(`**Ruta real:** \`${directory === '.' ? './' : `${directory}/`}\``, '', purpose, '', `**Entra aquí:** ${enterWhen}`, '');

  if (directory === '.') {
    lines.push(
      '## Cómo recorrer el código',
      '',
      '1. Empieza por la configuración raíz para entender build y despliegue.',
      '2. Sigue `portal-source/` para la experiencia del navegador.',
      '3. Sigue una llamada desde `netlify/functions/` hacia los servicios de `lib/`.',
      '4. Consulta `shared/` para reglas idénticas en frontend y backend.',
      '5. Usa `test/` y `scripts/` para saber qué contrato protege CI.',
      '',
      `Este árbol cubre ${files.length} archivos mantenidos en ${directories.length} carpetas. Los propios READMEs generados se excluyen para evitar una referencia recursiva.`,
      '',
    );
  }

  if (directory === 'netlify/functions') {
    lines.push(
      '## Antes de añadir o cambiar una Function',
      '',
      'Mantén aquí solo el borde HTTP o programado: método, origen, sesión, autorización, validación de entrada y respuesta. Extrae a `lib/` cualquier lógica reutilizable. Si añades una ruta, actualiza `netlify.toml`, tests y los inventarios generados.',
      '',
    );
  }

  if (children.length) {
    lines.push('## Subcarpetas', '', '| Carpeta | Qué contiene | Entra aquí cuando |', '|---|---|---|');
    for (const child of children) {
      const [childTitle, childPurpose, childWhen] = folderInfo(child);
      const name = path.posix.basename(child);
      lines.push(`| [\`${name}/\`](${name}/README.md) | ${cell(childPurpose)} | ${cell(childWhen)} |`);
    }
    lines.push('');
  }

  if (directFiles.length) {
    lines.push('## Archivos', '', '| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |', '|---|---|---|---|');
    for (const file of directFiles) {
      const source = read(file);
      const link = sourceLink(readmeFile, file);
      lines.push(`| [\`${path.basename(file)}\`](${link}) | ${cell(purposeForFile(file, source))} | ${cell(relationsForFile(file, source, routes))} | ${cell(whenToChange(file))} |`);
    }
    lines.push('');
  }

  lines.push('---', '', 'Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.', '');
  return lines.join('\n');
}

const files = trackedFiles();
const directories = directorySet(files);
const routes = routesByFunction();
const safeDocsRoot = path.join(root, 'docs') + path.sep;
if (!path.resolve(outputRoot).startsWith(safeDocsRoot)) throw new Error('unsafe documentation output path');
fs.rmSync(outputRoot, { recursive: true, force: true });

for (const directory of directories) {
  const target = outputFile(directory);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, render(directory, files, directories, routes), 'utf8');
}

console.log(`Codebase tree generated: ${files.length} files across ${directories.length} directories.`);
