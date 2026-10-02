import { Skeleton } from "@/components/ui/Skeleton";
import { FormSkeleton } from "@/components/jugadores/Skeletons";

export default function EditarEquipoLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-4 w-20" />
      <div className="mb-8 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      <FormSkeleton />
    </>
  );
}
