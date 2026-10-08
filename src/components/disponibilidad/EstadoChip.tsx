import { cn } from "@/lib/utils/cn";
import { formatearFecha } from "@/lib/utils/edad";
import { INFO_ESTADO, type EstadoDisponibilidad } from "@/types/disponibilidad";

interface Props {
  estado: EstadoDisponibilidad;
  fechaRegreso?: string | null;
  className?: string;
}

/** Estado de disponibilidad con su color y, si corresponde, la fecha estimada de vuelta. */
export function EstadoChip({ estado, fechaRegreso, className }: Props) {
  const info = INFO_ESTADO[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        info.chip,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", info.punto)} aria-hidden />
      {info.label}
      {fechaRegreso && <span className="font-normal">· vuelve {formatearFecha(fechaRegreso)}</span>}
    </span>
  );
}
