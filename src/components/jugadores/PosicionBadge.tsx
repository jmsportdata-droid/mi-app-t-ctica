import { cn } from "@/lib/utils/cn";
import type { Posicion } from "@/types/jugador";

export const POSICION_COLOR: Record<Posicion, string> = {
  POR: "bg-amber-100 text-amber-800 ring-amber-200",
  DEF: "bg-sky-100 text-sky-800 ring-sky-200",
  CEN: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  DEL: "bg-rose-100 text-rose-800 ring-rose-200",
};

export function PosicionBadge({ posicion }: { posicion: Posicion }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        POSICION_COLOR[posicion],
      )}
    >
      {posicion}
    </span>
  );
}
