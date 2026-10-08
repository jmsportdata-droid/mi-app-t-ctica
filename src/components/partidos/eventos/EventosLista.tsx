"use client";

import { useState, useTransition } from "react";
import { eliminarEvento } from "@/app/(dashboard)/partidos/avanzado-actions";
import { INFO_EVENTO, type EventoPartido } from "@/types/evento";

interface Props {
  partidoId: string;
  eventos: EventoPartido[];
  nombreJugador: (id: string | null) => string | null;
  onEliminado: (id: string) => void;
}

export function EventosLista({ partidoId, eventos, nombreJugador, onEliminado }: Props) {
  if (eventos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Todavía no hay eventos registrados.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-slate-100">
      {eventos.map((e) => (
        <FilaEvento
          key={e.id}
          partidoId={partidoId}
          evento={e}
          jugador={nombreJugador(e.jugador_id)}
          onEliminado={onEliminado}
        />
      ))}
    </ol>
  );
}

function FilaEvento({
  partidoId,
  evento,
  jugador,
  onEliminado,
}: {
  partidoId: string;
  evento: EventoPartido;
  jugador: string | null;
  onEliminado: (id: string) => void;
}) {
  const info = INFO_EVENTO[evento.tipo];
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function borrar() {
    startTransition(async () => {
      try {
        const r = await eliminarEvento(partidoId, evento.id);
        if (r.ok) onEliminado(evento.id);
        else setError(r.error);
      } catch {
        setError("Error de conexión");
      }
    });
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="w-10 shrink-0 pt-0.5 text-right font-mono text-sm font-semibold text-slate-900">
        {evento.minuto}&apos;
      </span>
      <span
        className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
        style={{ backgroundColor: info.color }}
      >
        {info.label}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {jugador && <p className="font-medium text-slate-900">{jugador}</p>}
        {evento.descripcion ? (
          <p className="text-slate-600">{evento.descripcion}</p>
        ) : (
          !jugador && <p className="italic text-slate-400">Sin descripción</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {confirmando ? (
        <div className="flex shrink-0 items-center gap-1 text-xs">
          <button
            type="button"
            onClick={borrar}
            disabled={pendiente}
            className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pendiente ? "Borrando…" : "Borrar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={pendiente}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          aria-label={`Eliminar evento del minuto ${evento.minuto}`}
          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
          </svg>
        </button>
      )}
    </li>
  );
}
