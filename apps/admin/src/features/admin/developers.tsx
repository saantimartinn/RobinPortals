import { ReleaseTests } from "@/features/admin/release-tests";
import { DeveloperLogs } from "@/features/admin/developer-logs";

const sections = [
  {
    href: "/desarrolladores/tests",
    title: "Tests",
    description: "Ejecuta las pruebas de los portales y revisa sus resultados antes de publicar.",
  },
  {
    href: "/desarrolladores/logs",
    title: "Logs",
    description: "Consulta los eventos de Robin y los registros de Netlify y Supabase.",
  },
] as const;

export function DeveloperWorkspace({ path }: { path: string }) {
  const actualPath = path === "/desarrolladores" ? "/desarrolladores/tests" : path;
  const section = sections.find(({ href }) => actualPath === href);

  return <div className="page developer-workspace">
    <div className="title"><div><span>Desarrolladores</span><h1>{section?.title || "Tests"}</h1><p>{section?.description}</p></div></div>
    {actualPath === "/desarrolladores/logs" ? <DeveloperLogs /> : <ReleaseTests />}
  </div>;
}
