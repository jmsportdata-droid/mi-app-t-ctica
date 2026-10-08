import type { PartidoConRival } from "@/types/partido";
import type { ClubPropio } from "./Enfrentamiento";
import { PartidoCard } from "./PartidoCard";

export const CLASE_GRID_PARTIDOS = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

/** Próximos (planificados, del más cercano al más lejano) y jugados (del más reciente). */
export function PartidosGrid({
  partidos,
  club,
}: {
  partidos: PartidoConRival[];
  club: ClubPropio;
}) {
  const proximos = partidos.filter((p) => p.estado === "planificado");
  const jugados = partidos.filter((p) => p.estado === "jugado").reverse();

  return (
    <div className="space-y-10">
      <Grupo titulo="Próximos" partidos={proximos} club={club} />
      <Grupo titulo="Jugados" partidos={jugados} club={club} />
    </div>
  );
}

function Grupo({
  titulo,
  partidos,
  club,
}: {
  titulo: string;
  partidos: PartidoConRival[];
  club: ClubPropio;
}) {
  if (partidos.length === 0) return null;
  const id = `grupo-${titulo.toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        {titulo}
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
          {partidos.length}
        </span>
      </h2>
      <div className={CLASE_GRID_PARTIDOS}>
        {partidos.map((partido) => (
          <PartidoCard key={partido.id} partido={partido} club={club} />
        ))}
      </div>
    </section>
  );
}
