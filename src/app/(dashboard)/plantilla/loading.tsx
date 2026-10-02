import { Skeleton } from "@/components/ui/Skeleton";
import { PlantillaSkeleton } from "@/components/jugadores/Skeletons";

export default function PlantillaLoading() {
  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <PlantillaSkeleton />
    </>
  );
}
