import { Skeleton } from "@/components/ui/Skeleton";
import { CLASE_GRID_EQUIPOS } from "./EquiposGrid";

export function EquipoCardSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="mt-4 h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 flex w-full gap-2 border-t border-slate-100 pt-4">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function EquiposSkeleton() {
  return (
    <div className={CLASE_GRID_EQUIPOS} role="status" aria-label="Cargando equipos">
      {Array.from({ length: 8 }, (_, i) => (
        <EquipoCardSkeleton key={i} />
      ))}
    </div>
  );
}
