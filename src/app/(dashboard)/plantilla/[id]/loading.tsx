import { Skeleton } from "@/components/ui/Skeleton";
import { DetalleSkeleton } from "@/components/jugadores/Skeletons";

export default function JugadorLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-4 w-20" />
      <DetalleSkeleton />
    </>
  );
}
