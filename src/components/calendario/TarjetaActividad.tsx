import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { horaCorta } from "@/lib/utils/fecha";
import { INFO_ACTIVIDAD, type Actividad } from "@/types/calendario";

/** Actividad dentro de un día del calendario. Tocarla lleva a editarla. */
export function TarjetaActividad({ actividad }: { actividad: Actividad }) {
  const info = INFO_ACTIVIDAD[actividad.tipo];
  const inicio = horaCorta(actividad.hora_inicio);
  const fin = horaCorta(actividad.hora_fin);
  const citacion = horaCorta(actividad.hora_citacion);

  return (
    <Link
      href={`/calendario/${actividad.id}/editar`}
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
      <span className="mt-0.5 block font-medium leading-snug">{actividad.titulo}</span>
      {citacion && <span className="block text-xs opacity-80">Citación {citacion}</span>}
      {actividad.lugar && (
        <span className="block truncate text-xs opacity-80">{actividad.lugar}</span>
      )}
    </Link>
  );
}
