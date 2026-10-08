"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { INFO_EVENTO, TIPOS_EVENTO, type EventoPartido, type TipoEvento } from "@/types/evento";
import { CampoFutbol } from "@/components/campo/CampoFutbol";

interface Props {
  eventos: EventoPartido[];
  nombreJugador: (id: string | null) => string | null;
}

/** Mapa de los eventos sobre el campo, con filtro por tipo en la leyenda. */
export function EventosCampo({ eventos, nombreJugador }: Props) {
  const [ocultos, setOcultos] = useState<Set<TipoEvento>>(new Set());

  const conPosicion = eventos.filter((e) => e.x !== null && e.y !== null);
  const visibles = conPosicion.filter((e) => !ocultos.has(e.tipo));
  const sinPosicion = eventos.length - conPosicion.length;

  function alternar(tipo: TipoEvento) {
    setOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
      <CampoFutbol>
        {visibles.map((e) => {
          const info = INFO_EVENTO[e.tipo];
          const jugador = nombreJugador(e.jugador_id);
          const texto = `${e.minuto}' ${info.label}${jugador ? ` · ${jugador}` : ""}${e.descripcion ? ` — ${e.descripcion}` : ""}`;
          return (
            <span
              key={e.id}
              title={texto}
              aria-label={texto}
              role="img"
              className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[9px] font-bold text-white shadow ring-2 ring-white"
              style={{ left: `${e.x}%`, top: `${e.y}%`, backgroundColor: info.color }}
            >
              {e.minuto}
            </span>
          );
        })}
      </CampoFutbol>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Leyenda (pulsa para filtrar)</p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_EVENTO.map((t) => {
            const total = conPosicion.filter((e) => e.tipo === t.valor).length;
            const activo = !ocultos.has(t.valor);
            return (
              <button
                key={t.valor}
                type="button"
                aria-pressed={activo}
                onClick={() => alternar(t.valor)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-opacity",
                  activo ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50 opacity-50",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: t.color }}
                  aria-hidden
                />
                {t.label} <span className="tabular-nums text-slate-500">({total})</span>
              </button>
            );
          })}
        </div>
        {sinPosicion > 0 && (
          <p className="text-xs text-slate-500">
            {sinPosicion} evento{sinPosicion === 1 ? "" : "s"} sin posición en el campo (no se
            muestra
            {sinPosicion === 1 ? "" : "n"}).
          </p>
        )}
        <p className="text-xs text-slate-400">Arriba: portería rival · Abajo: nuestra portería.</p>
      </div>
    </div>
  );
}
