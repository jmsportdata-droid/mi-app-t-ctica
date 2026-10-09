import Link from "next/link";
import type { Reporte } from "@/lib/reportes";
import { formatearSegundos } from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import { INFO_MOMENTO, type PrincipioJuego } from "@/types/modelo-juego";
import { INFO_TIPO_TAREA } from "@/types/tarea";

const min = (seg: number) => Math.round(seg / 60);

/**
 * Pantallazo del microciclo mientras se arma: tareas y minutos, tipos de tarea,
 * principios trabajados (y los que pide el plan del partido), y cómo viene el
 * volumen de las últimas 4 semanas.
 */
export function ResumenMicrociclo({
  semana,
  previas,
  principios,
  delPlan,
}: {
  semana: Reporte;
  previas: Reporte;
  principios: PrincipioJuego[];
  /** Principios que el plan del partido pide reforzar en la semana */
  delPlan: string[];
}) {
  const nombre = new Map(principios.map((p) => [p.id, p]));
  const trabajados = new Set(semana.principios.flatMap((p) => [p.id, ...p.subs]));
  const pendientesPlan = delPlan.filter((id) => {
    const p = nombre.get(id);
    return p && !trabajados.has(id) && !(p.padre_id && trabajados.has(p.padre_id));
  });
  const semanasPrevias = previas.volumen.filter((v) => v.segundos > 0);
  const promedioPrevio = semanasPrevias.length
    ? semanasPrevias.reduce((a, v) => a + v.segundos, 0) / semanasPrevias.length
    : null;
  const maxTipo = Math.max(1, ...semana.porTipo.map((t) => t.segundos));
  const maxMomento = Math.max(1, ...semana.porMomento.map((m) => m.segundos));
  const maxSemana = Math.max(
    1,
    ...previas.volumen.map((v) => v.segundos),
    semana.segundosPlanificados,
  );
  const tareas = semana.porTipo.reduce((a, t) => a + t.tareas, 0);

  return (
    <details open className="group mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-slate-400 transition-transform group-open:rotate-90">▸</span>
        <span className="font-semibold text-slate-900">Resumen de la semana</span>
        <span className="text-sm text-slate-600">
          {semana.sesiones} bloques con ejercicios · {tareas} tareas ·{" "}
          {semana.segundosPlanificados > 0 ? formatearSegundos(semana.segundosPlanificados) : "0′"}
          {semana.encajeTotal !== null && ` · ${semana.encajeTotal}% acorde a la semana tipo`}
        </span>
        <Link
          href="/reportes"
          className="ml-auto text-xs font-medium text-brand-700 hover:underline"
        >
          Reportes de entrenamiento →
        </Link>
      </summary>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tipos de tarea
          </h3>
          {semana.porTipo.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay ejercicios cargados.</p>
          ) : (
            <ul className="space-y-1.5">
              {semana.porTipo.map((t) => (
                <li key={t.tipo} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="truncate text-slate-700">{INFO_TIPO_TAREA[t.tipo].label}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {t.tareas} · {min(t.segundos)}′
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(100 * t.segundos) / maxTipo}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Momentos y principios
          </h3>
          {semana.porMomento.length > 0 && (
            <ul className="space-y-1.5">
              {semana.porMomento.map((m) => (
                <li key={m.momento} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span
                        className={cn("h-2 w-2 rounded-full", INFO_MOMENTO[m.momento].punto)}
                        aria-hidden
                      />
                      {INFO_MOMENTO[m.momento].label}
                    </span>
                    <span className="tabular-nums text-slate-500">{min(m.segundos)}′</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-500"
                      style={{ width: `${(100 * m.segundos) / maxMomento}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {semana.principios.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {semana.principios.slice(0, 10).map((p) => (
                <li
                  key={p.id}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                >
                  {p.nombre} · {min(p.segundos)}′
                </li>
              ))}
            </ul>
          )}
          {pendientesPlan.length > 0 && (
            <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
              <b>El plan del partido pide reforzar y todavía no está:</b>{" "}
              {pendientesPlan.map((id) => nombre.get(id)?.nombre).join(" · ")}
            </p>
          )}
          {semana.sinTrabajar.length > 0 && (
            <p className="text-xs text-slate-500">
              <b>Sin trabajar en las últimas 4 semanas:</b>{" "}
              {semana.sinTrabajar
                .slice(0, 6)
                .map((p) => p.nombre)
                .join(" · ")}
              {semana.sinTrabajar.length > 6 && ` y ${semana.sinTrabajar.length - 6} más`}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Volumen: esta semana vs las 4 anteriores
          </h3>
          <div className="flex h-24 items-end gap-2" aria-hidden>
            {previas.volumen.map((v) => (
              <div key={v.clave} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-slate-300"
                  style={{ height: `${(100 * v.segundos) / maxSemana}%` }}
                />
                <span className="text-[10px] text-slate-400">
                  {v.clave.slice(8, 10)}/{v.clave.slice(5, 7)}
                </span>
              </div>
            ))}
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand-600"
                style={{ height: `${(100 * semana.segundosPlanificados) / maxSemana}%` }}
              />
              <span className="text-[10px] font-semibold text-brand-700">Esta</span>
            </div>
          </div>
          <p className="text-sm text-slate-700">
            {min(semana.segundosPlanificados)}′ planificados
            {promedioPrevio !== null && (
              <>
                {" "}
                vs {min(promedioPrevio)}′ de promedio
                <span
                  className={cn(
                    "ml-1 font-semibold",
                    semana.segundosPlanificados > promedioPrevio * 1.15
                      ? "text-amber-700"
                      : semana.segundosPlanificados < promedioPrevio * 0.85
                        ? "text-sky-700"
                        : "text-slate-500",
                  )}
                >
                  ({semana.segundosPlanificados >= promedioPrevio ? "+" : ""}
                  {Math.round(
                    (100 * (semana.segundosPlanificados - promedioPrevio)) / promedioPrevio,
                  )}
                  %)
                </span>
              </>
            )}
          </p>
          {previas.porTipo.length > 0 && (
            <p className="text-xs text-slate-500">
              <b>Lo más trabajado antes:</b>{" "}
              {previas.porTipo
                .slice(0, 3)
                .map((t) => `${INFO_TIPO_TAREA[t.tipo].label} (${min(t.segundos)}′)`)
                .join(" · ")}
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
