import { Skeleton } from "@/components/ui/Skeleton";
import { FormSkeleton } from "@/components/jugadores/Skeletons";

export default function EditarJugadorLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="mb-8 space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <FormSkeleton />
    </>
  );
}
