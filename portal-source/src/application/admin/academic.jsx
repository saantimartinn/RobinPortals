// Admin workspace module for academic; AdminPortal composes these views.
import { GraduationCap } from "lucide-react";
import { Badge, Card, CardContent, CardHeader } from "../../ui.jsx";
import academicSystemsConfig from "../../../../shared/academic-systems.cjs";

const { academicSystemLabel, academicLevelLabel } = academicSystemsConfig;

export function AdminPerfilAcademico({ client }) {
  const subjects = Array.isArray(client.academic_subjects) ? client.academic_subjects : [];
  const systemLabel = academicSystemLabel(client.academic_system);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Perfil académico" icon={GraduationCap}
          subtitle="Sistema y asignaturas indicados por el alumno durante el onboarding" />
        <CardContent>
          {!client.academic_system ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <GraduationCap className="h-7 w-7 mx-auto text-slate-300" />
              <div className="text-sm font-semibold text-slate-600 mt-3">Perfil académico pendiente</div>
              <div className="text-xs text-slate-400 mt-1">El alumno todavía no ha indicado su sistema ni sus asignaturas.</div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1.5">Sistema académico</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                  {systemLabel}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="text-xs font-medium text-slate-500">Asignaturas</div>
                  <Badge tone="slate">{subjects.length} {subjects.length === 1 ? "asignatura" : "asignaturas"}</Badge>
                </div>
                {subjects.length === 0 ? (
                  <div className="text-sm text-slate-400">No hay asignaturas registradas.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subjects.map((subject, index) => (
                      <div key={`${subject.name}-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 break-words">{subject.name}</div>
                          {subject.level && <div className="text-xs text-slate-500 mt-1">{academicLevelLabel(client.academic_system, subject.level)}</div>}
                        </div>
                        <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 grid place-items-center text-xs font-bold flex-shrink-0">{index + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
