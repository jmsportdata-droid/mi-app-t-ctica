import { Skeleton } from "@/components/ui/Skeleton";
import { PartidosSkeleton } from "@/components/partidos/PartidosSkeleton";

export default function PartidosLoading() {
  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <PartidosSkeleton />
    </>
  );
}
