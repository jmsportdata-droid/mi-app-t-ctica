import { Skeleton } from "@/components/ui/Skeleton";
import { CLASE_GRID_PARTIDOS } from "./PartidosGrid";

export function PartidoCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {[0, 1].map((i) => (
          <div key={i} className={`flex flex-col items-center gap-2 ${i === 1 ? "col-start-3" : ""}`}>
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="mt-4 h-8 w-full rounded-lg" />
    </div>
  );
}

export function PartidosSkeleton() {
  return (
    <div role="status" aria-label="Cargando partidos">
      <Skeleton className="mb-4 h-4 w-24" />
      <div className={CLASE_GRID_PARTIDOS}>
        {Array.from({ length: 6 }, (_, i) => (
          <PartidoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DetallePartidoSkeleton() {
  return (
    <div role="status" aria-label="Cargando partido">
      <Skeleton className="mb-4 h-4 w-20" />
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Skeleton className="mx-auto h-24 w-24 rounded-full" />
          <Skeleton className="h-6 w-8" />
          <Skeleton className="mx-auto h-24 w-24 rounded-full" />
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mb-6 flex gap-4 border-b border-slate-200 pb-3">
        {["w-28", "w-32", "w-24"].map((w) => (
          <Skeleton key={w} className={`h-5 ${w}`} />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
