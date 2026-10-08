import { Skeleton } from "@/components/ui/Skeleton";

export function JugadorCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="mt-4 h-8 w-full rounded-lg" />
    </div>
  );
}

export function PlantillaSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-label="Cargando plantel">
      {[4, 3].map((cantidad, grupo) => (
        <section key={grupo}>
          <Skeleton className="mb-4 h-4 w-32" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: cantidad }, (_, i) => (
              <JugadorCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function DetalleSkeleton() {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      role="status"
      aria-label="Cargando jugador"
    >
      <div className="flex items-center gap-5">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div
      className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      role="status"
      aria-label="Cargando formulario"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  );
}
