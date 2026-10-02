import { cn } from "@/lib/utils/cn";
import { ESTADO_LABEL, type EstadoPartido } from "@/types/partido";

export function EstadoBadge({ estado }: { estado: EstadoPartido }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        estado === "planificado"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-slate-100 text-slate-600 ring-slate-200",
      )}
    >
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", estado === "planificado" ? "bg-sky-500" : "bg-slate-400")}
      />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
