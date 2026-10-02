import { POSICIONES, POSICION_LABEL, type Jugador, type Posicion } from "@/types/jugador";
import { JugadorCard } from "./JugadorCard";

function agruparPorPosicion(jugadores: Jugador[]): Record<Posicion, Jugador[]> {
  const grupos: Record<Posicion, Jugador[]> = { POR: [], DEF: [], CEN: [], DEL: [] };
  for (const jugador of jugadores) grupos[jugador.posicion].push(jugador);
  return grupos;
}

export function PlantillaGrid({ jugadores }: { jugadores: Jugador[] }) {
  const grupos = agruparPorPosicion(jugadores);

  return (
    <div className="space-y-10">
      {POSICIONES.filter((p) => grupos[p].length > 0).map((posicion) => (
        <section key={posicion} aria-labelledby={`grupo-${posicion}`}>
          <h2
            id={`grupo-${posicion}`}
            className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            {POSICION_LABEL[posicion]}
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
              {grupos[posicion].length}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {grupos[posicion].map((jugador) => (
              <JugadorCard key={jugador.id} jugador={jugador} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
