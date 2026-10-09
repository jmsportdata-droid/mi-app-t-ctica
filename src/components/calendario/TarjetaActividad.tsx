import Link from "next/link";
import { formatearSegundos } from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import { horaCorta } from "@/lib/utils/fecha";
import { INFO_ACTIVIDAD, llevaEjercicios, type Actividad } from "@/types/calendario";
import type { ResumenSesion } from "@/types/sesion";

/**
 * Actividad dentro de un día del microciclo. Un entrenamiento abre su sesión;
 * el resto, la edición de la actividad.
 */
export function TarjetaActividad({
  actividad,
  resumen,
  numeroSesion,
}: {
  actividad: Actividad;
  resumen?: ResumenSesion;
  numeroSesion?: number;
}) {
  const info = INFO_ACTIVIDAD[actividad.tipo];
  const inicio = horaCorta(actividad.hora_inicio);
  const fin = horaCorta(actividad.hora_fin);
  const citacion = horaCorta(actividad.hora_citacion);
  const esEntrenamiento = llevaEjercicios(actividad.tipo);

  return (
    <Link
      href={
        esEntrenamiento
          ? `/microciclo/sesion/${actividad.id}`
          : `/calendario/${actividad.id}/editar`
      }
      className={cn(
        "block rounded-lg px-2.5 py-2 text-sm ring-1 ring-inset transition-shadow hover:shadow-md",
        info.color,
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums">
          {inicio ?? "Todo el día"}
          {fin && `–${fin}`}
        </span>
        {!actividad.visible_jugadores && (
          <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
            Solo CT
          </span>
        )}
      </span>
      <span className="mt-0.5 block font-medium leading-snug">
        {numeroSesion && <span className="opacity-70">S{numeroSesion} · </span>}
        {actividad.titulo}
      </span>
      {citacion && <span className="block text-xs opacity-80">Citación {citacion}</span>}
      {actividad.lugar && (
        <span className="block truncate text-xs opacity-80">{actividad.lugar}</span>
      )}
      {esEntrenamiento && (
        <span className="mt-1.5 flex items-center justify-between gap-2 border-t border-black/10 pt-1.5 text-xs">
          {resumen && resumen.tareas > 0 ? (
            <span className="font-medium">
              {resumen.tareas} {resumen.tareas === 1 ? "tarea" : "tareas"}
              {resumen.segundos > 0 && ` · ${formatearSegundos(resumen.segundos)}`}
            </span>
          ) : (
            <span className="font-medium opacity-80">+ Armar sesión</span>
          )}
          {resumen?.cerrada && (
            <span className="rounded bg-white/70 px-1 text-[10px] font-semibold uppercase">
              Cerrada
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
