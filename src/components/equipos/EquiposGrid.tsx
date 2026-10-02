import type { Equipo } from "@/types/equipo";
import { EquipoCard } from "./EquipoCard";

export const CLASE_GRID_EQUIPOS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function EquiposGrid({ equipos }: { equipos: Equipo[] }) {
  return (
    <div className={CLASE_GRID_EQUIPOS}>
      {equipos.map((equipo) => (
        <EquipoCard key={equipo.id} equipo={equipo} />
      ))}
    </div>
  );
}
