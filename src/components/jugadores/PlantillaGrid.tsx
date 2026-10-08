"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  ESTADOS_DISPONIBILIDAD,
  SIN_REGISTRO,
  type EstadoDelDia,
  type EstadoDisponibilidad,
} from "@/types/disponibilidad";
import { POSICIONES, POSICION_LABEL, type Jugador, type Posicion } from "@/types/jugador";
import { JugadorCard } from "./JugadorCard";

function agruparPorPosicion(jugadores: Jugador[]): Record<Posicion, Jugador[]> {
  const grupos: Record<Posicion, Jugador[]> = { POR: [], DEF: [], CEN: [], DEL: [] };
  for (const jugador of jugadores) grupos[jugador.posicion].push(jugador);
  return grupos;
}

interface Props {
  jugadores: Jugador[];
  /** Estado de hoy por id de jugador (los que no figuran están disponibles) */
  estados: Record<string, EstadoDelDia>;
}

export function PlantillaGrid({ jugadores, estados }: Props) {
  const [filtro, setFiltro] = useState<EstadoDisponibilidad | null>(null);
  const estadoDe = (id: string) => estados[id] ?? SIN_REGISTRO;

  const visibles = filtro ? jugadores.filter((j) => estadoDe(j.id).estado === filtro) : jugadores;
  const grupos = agruparPorPosicion(visibles);

  const opciones = [
    { valor: null, label: "Todos", cantidad: jugadores.length, punto: null },
    ...ESTADOS_DISPONIBILIDAD.map((e) => ({
      valor: e.valor,
      label: e.label,
      cantidad: jugadores.filter((j) => estadoDe(j.id).estado === e.valor).length,
      punto: e.punto,
    })),
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado de hoy">
        {opciones.map((o) => (
          <button
            key={o.label}
            type="button"
            aria-pressed={filtro === o.valor}
            onClick={() => setFiltro(o.valor)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
              filtro === o.valor
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
            )}
          >
            {o.punto && <span className={cn("h-2 w-2 rounded-full", o.punto)} aria-hidden />}
            {o.label}
            <span className="tabular-nums opacity-70">{o.cantidad}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
          No hay jugadores con ese estado hoy.
        </p>
      )}

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
              <JugadorCard key={jugador.id} jugador={jugador} estado={estadoDe(jugador.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
