const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const check = process.argv.includes('--check');
const skip = new Set(['node_modules','.git','.maintenance','dist','.netlify','artifacts']);
function walk(dir='.') {
  return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=> {
    if(skip.has(e.name)||e.name==='.env'||e.name.startsWith('.env.')&&e.name!=='.env.example')return [];
    const p=path.posix.join(dir,e.name);
    if(p==='docs/codebase')return [];
    return e.isDirectory()?walk(p):[p];
  });
}
const files=walk();
const generated=new Map();
const descriptions={frontend:'Frontend React/Vite: código que se ejecuta en el navegador.',backend:'Backend Node: API y acceso a proveedores; nunca se publica como contenido estático.',functions:'Entradas HTTP de Netlify. Conservan los contratos /api existentes.',lib:'Servicios y utilidades del servidor compartidos por handlers.',src:'Aplicación, funcionalidades y componentes del navegador.',application:'Composición del shell de suscriptores y selección de plan.',api:'Cliente HTTP del mismo origen; cookies HttpOnly.',shared:'Tema, catálogos, utilidades y componentes reutilizables.',features:'Funcionalidades agrupadas por dominio.',auth:'Inicio de sesión y alta.',admin:'Administración de suscriptores, contenidos, descuentos y notificaciones.',community:'Comunidad, eventos, mensajes y retos.',career:'Empleo, mentorías y creación de CV.',levels:'Progreso y beneficios de suscripción.',profile:'Perfil y ajustes.',services:'Servicios personales y solicitudes.',subscription:'Suscripción, pagos, portada y soporte.',supabase:'Definición de datos independiente del portal de alumnos.',migrations:'SQL estructural versionado, sin cuentas predeterminadas.',seeds:'Contenido de ejemplo opcional; no se ejecuta durante el build.',test:'Pruebas automatizadas sin credenciales ni proveedores reales.',scripts:'Verificación, documentación y tareas explícitas de operador.',docs:'Documentación mantenida y mapas generados.','.github':'Automatización del repositorio.',workflows:'CI en GitHub Actions.',public:'Recursos públicos copiados al build.',recursos:'Recursos descargables del producto conservados del original.',assets:'Recursos gráficos importados por React.'};
function purpose(file) {
  if(file.endsWith('.md'))return 'Documentación';
  if(file.endsWith('.sql'))return file.includes('seeds')?'Datos demo opcionales':'Esquema de base de datos';
  if(file.startsWith('backend/functions/'))return 'Handler HTTP: '+path.basename(file,'.js');
  if(file.startsWith('backend/lib/'))return 'Servicio servidor: '+path.basename(file,'.js');
  if(file.startsWith('frontend/src/'))return 'Módulo frontend: '+path.basename(file).replace(/\.jsx?$/,'');
  if(/\.(png|pdf)$/.test(file))return 'Recurso público';
  return 'Configuración, herramienta o prueba';
}
function link(from,to){return path.posix.relative(path.posix.dirname(from),to)||'.';}
const fm='docs/FILE_MAP.md';
generated.set(fm,'# Mapa de archivos\n\nGenerado con `npm run docs:generate`.\n\n| Archivo | Responsabilidad |\n|---|---|\n'+files.filter(f=>!f.startsWith('docs/')).map(f=>`| [${f}](${link(fm,f)}) | ${purpose(f)} |`).join('\n')+'\n');
const cm='docs/COMPONENT_MAP.md';
generated.set(cm,'# Mapa del frontend\n\nGenerado desde imports del código.\n\n| Módulo | Dependencias locales |\n|---|---|\n'+files.filter(f=>f.startsWith('frontend/src/')&&/\.jsx?$/.test(f)).map(f=>{
  const ast=parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']});
  const deps=[...new Set(ast.program.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value.startsWith('.')).map(n=>n.source.value))];
  return `| [${f}](${link(cm,f)}) | ${deps.map(d=>'`'+d+'`').join(', ')||'—'} |`;
}).join('\n')+'\n');
const api='docs/API_INVENTORY.md';
const routes=[...fs.readFileSync('netlify.toml','utf8').matchAll(/from = "(\/api\/[^"\n]+)"\s+to = "\/\.netlify\/functions\/([^"\n]+)"/g)];
generated.set(api,'# Inventario API\n\nGenerado desde Netlify y los handlers. Los controles por rol y ownership están en el código; una sesión no implica acceso a cualquier registro.\n\n| Ruta | Handler | Métodos detectados | Acceso inicial |\n|---|---|---|---|\n'+routes.map(m=>{
  const f=`backend/functions/${m[2]}.js`, s=fs.readFileSync(f,'utf8');
  const methods=[...new Set([...s.matchAll(/httpMethod\s*[!=]==?\s*['"]([A-Z]+)['"]/g)].map(x=>x[1]))];
  const access=m[2]==='stripe-webhook'?'Firma Stripe':s.includes('readSessionFromEvent')?'Sesión suscriptor/admin':'Público';
  return `| \`${m[1]}\` | [${m[2]}](${link(api,f)}) | ${methods.join(', ')||'Ver handler'} | ${access} |`;
}).join('\n')+'\n');
const dirs=new Set(['.']);
for(const f of [...files,...generated.keys()]) {let d=path.posix.dirname(f);while(d!=='.'){dirs.add(d);d=path.posix.dirname(d);}}
const allFiles=[...new Set([...files,...generated.keys()])];
for(const dir of [...dirs].sort()){
  const out=path.posix.join('docs/codebase',dir,'README.md');
  const children=[...dirs].filter(d=>d!=='.'&&path.posix.dirname(d)===dir).sort();
  const own=allFiles.filter(f=>path.posix.dirname(f)===dir).sort();
  const title=dir==='.'?'Árbol navegable del repositorio':dir;
  let body=`# ${title}\n\n${descriptions[path.posix.basename(dir)]||'Mapa de responsabilidades y enlaces al código.'}\n\n`;
  if(dir!=='.')body+=`[Subir](../README.md) · [Código](${link(out,dir)})\n\n`;
  if(children.length)body+='## Carpetas\n\n'+children.map(d=>`- [${path.posix.basename(d)}](${link(out,path.posix.join('docs/codebase',d,'README.md'))}): ${descriptions[path.posix.basename(d)]||'Ver detalle.'}`).join('\n')+'\n\n';
  if(own.length)body+='## Archivos\n\n'+own.map(f=>`- [${path.posix.basename(f)}](${link(out,f)}): ${purpose(f)}.`).join('\n')+'\n';
  generated.set(out,body.trimEnd()+'\n');
}
let stale=0;
for(const [file,body] of generated){
  if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==body){console.error('Stale documentation: '+file);stale++;}}
  else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);}
}
if(stale)process.exitCode=1;
else console.log(`${generated.size} generated documentation files ${check?'verified':'written'}.`);
