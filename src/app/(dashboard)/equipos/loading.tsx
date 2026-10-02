import { Skeleton } from "@/components/ui/Skeleton";
import { EquiposSkeleton } from "@/components/equipos/EquiposSkeleton";

export default function EquiposLoading() {
  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <EquiposSkeleton />
    </>
  );
}
