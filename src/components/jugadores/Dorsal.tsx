import { cn } from "@/lib/utils/cn";

const TAMANOS = {
  sm: "h-6 min-w-6 rounded-md px-1.5 text-xs",
  md: "h-12 w-12 rounded-xl text-lg",
  lg: "h-20 w-20 rounded-xl text-3xl",
} as const;

interface DorsalProps {
  numero: number | null;
  tamano?: keyof typeof TAMANOS;
}

export function Dorsal({ numero, tamano = "md" }: DorsalProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-slate-900 font-bold tabular-nums text-white",
        TAMANOS[tamano],
      )}
      aria-label={numero !== null ? `Número ${numero}` : "Sin número"}
    >
      {numero ?? "–"}
    </span>
  );
}
