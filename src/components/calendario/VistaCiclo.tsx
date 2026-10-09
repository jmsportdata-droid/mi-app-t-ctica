import Link from "next/link";
import { etiquetaMD, rangoFechas, SEMANA_TIPO, type PartidoReferencia } from "@/lib/calendario";
import { cn } from "@/lib/utils/cn";
import type { Actividad } from "@/types/calendario";
import type { ResumenSesion } from "@/types/sesion";
import { INFO_ORIENTACION } from "@/types/tarea";
import { TarjetaActividad } from "./TarjetaActividad";

interface Props {
  desde: string;
  hasta: string;
  hoy: string;
  actividades: Actividad[];
  partidos: PartidoReferencia[];
  /** Resumen de la sesión de cada entrenamiento (por id de actividad) */
  resumenes: Map<string, ResumenSesion>;
  /** Número de sesión de cada entrenamiento en el microciclo */
  numeroSesion: Map<string, number>;
}

const DIA_SEMANA = new Intl.DateTimeFormat("es-UY", { weekday: "short", timeZone: "UTC" });
const DIA_MES = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const aFecha = (f: string) => new Date(`${f}T00:00:00Z`);

/**
 * Los días del ciclo en columnas (tablet y computadora) o uno abajo del otro
 * (celular), con la etiqueta de día de partido (MD-3, MD, MD+1…).
 */
export function VistaCiclo({
  desde,
  hasta,
  hoy,
  actividades,
  partidos,
  resumenes,
  numeroSesion,
}: Props) {
  const dias = rangoFechas(desde, hasta);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div
        className="flex flex-col gap-3 md:grid md:gap-2 md:[grid-template-columns:repeat(var(--dias),minmax(9.5rem,1fr))]"
        style={{ "--dias": dias.length } as React.CSSProperties}
      >
        {dias.map((fecha) => {
          const etiqueta = etiquetaMD(fecha, partidos);
          const delDia = actividades.filter((a) => a.fecha === fecha);
          const esHoy = fecha === hoy;
          const esPartido = etiqueta?.offset === 0;
          const tipo = etiqueta ? SEMANA_TIPO[etiqueta.texto] : undefined;
          return (
            <section
              key={fecha}
              aria-label={`${DIA_SEMANA.format(aFecha(fecha))} ${DIA_MES.format(aFecha(fecha))}`}
              className={cn(
                "flex min-h-40 flex-col rounded-xl border bg-white p-2 shadow-sm",
                esHoy ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200",
                esPartido && "bg-slate-50",
              )}
            >
              <header className="mb-2 flex items-center justify-between gap-2 px-1">
                <div className="leading-tight">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {DIA_SEMANA.format(aFecha(fecha))}
                    {esHoy && <span className="ml-1 text-brand-700">· hoy</span>}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {DIA_MES.format(aFecha(fecha))}
                  </p>
                </div>
                {etiqueta && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums",
                      esPartido ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {etiqueta.texto}
                  </span>
                )}
              </header>
              {tipo && (
                <p className="mb-2 px-1 text-[11px] leading-snug text-slate-500" title={tipo.foco}>
                  <span className="font-semibold text-slate-700">
                    {INFO_ORIENTACION[tipo.orientacion].label}
                  </span>{" "}
                  · {tipo.foco}
                </p>
              )}

              <div className="flex flex-1 flex-col gap-1.5">
                {delDia.map((a) => (
                  <TarjetaActividad
                    key={a.id}
                    actividad={a}
                    resumen={resumenes.get(a.id)}
                    numeroSesion={numeroSesion.get(a.id)}
                  />
                ))}
              </div>

              <Link
                href={`/calendario/nueva?fecha=${fecha}`}
                className="mt-2 rounded-lg border border-dashed border-slate-300 py-1.5 text-center text-sm font-medium text-slate-500 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                aria-label={`Agregar actividad el ${DIA_MES.format(aFecha(fecha))}`}
              >
                + Agregar
              </Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
