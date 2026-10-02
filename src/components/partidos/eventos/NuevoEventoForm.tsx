"use client";

import { useState, useTransition, type FormEvent } from "react";
import { crearEvento } from "@/app/(dashboard)/partidos/avanzado-actions";
import { cn } from "@/lib/utils/cn";
import { INFO_EVENTO, MINUTO_MAX, type EventoPartido, type TipoEvento } from "@/types/evento";
import type { Jugador } from "@/types/jugador";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { CampoFutbol } from "@/components/campo/CampoFutbol";

interface Props {
  partidoId: string;
  tipo: TipoEvento;
  jugadores: Jugador[];
  minutoSugerido: number;
  onCreado: (evento: EventoPartido) => void;
  onCancelar: () => void;
}

const redondear = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;

export function NuevoEventoForm({ partidoId, tipo, jugadores, minutoSugerido, onCreado, onCancelar }: Props) {
  const info = INFO_EVENTO[tipo];
  const [minuto, setMinuto] = useState(String(minutoSugerido));
  const [jugadorId, setJugadorId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function marcarPunto(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setPunto({
      x: redondear(((e.clientX - r.left) / r.width) * 100),
      y: redondear(((e.clientY - r.top) / r.height) * 100),
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const valorMinuto = Number(minuto);
    if (minuto.trim() === "" || !Number.isInteger(valorMinuto) || valorMinuto < 0 || valorMinuto > MINUTO_MAX) {
      setError(`El minuto debe ser un número entero entre 0 y ${MINUTO_MAX}`);
      return;
    }

    startTransition(async () => {
      try {
        const r = await crearEvento(partidoId, {
          tipo,
          minuto: valorMinuto,
          descripcion: descripcion.trim() || null,
          jugador_id: jugadorId || null,
          x: punto?.x ?? null,
          y: punto?.y ?? null,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        onCreado(r.evento);
      } catch {
        setError("Error de conexión. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border-2 bg-white p-4 shadow-sm"
      style={{ borderColor: info.color }}
      aria-label={`Nuevo evento: ${info.label}`}
    >
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: info.color }} aria-hidden />
        Nuevo evento · {info.label}
      </h3>

      <div className="grid gap-4 md:grid-cols-[1fr_160px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
            <div className="space-y-1.5">
              <label htmlFor="evento-minuto" className="block text-sm font-medium text-slate-700">
                Minuto
              </label>
              <input
                id="evento-minuto"
                type="number"
                inputMode="numeric"
                min={0}
                max={MINUTO_MAX}
                value={minuto}
                onChange={(e) => setMinuto(e.target.value)}
                autoFocus
                className={claseControl()}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="evento-jugador" className="block text-sm font-medium text-slate-700">
                Jugador <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <select
                id="evento-jugador"
                value={jugadorId}
                onChange={(e) => setJugadorId(e.target.value)}
                className={claseControl()}
              >
                <option value="">— Sin jugador —</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.numero !== null ? `${j.numero}. ` : ""}
                    {j.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="evento-descripcion" className="block text-sm font-medium text-slate-700">
              Descripción
            </label>
            <input
              id="evento-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              placeholder="Ej. Remate de cabeza tras córner"
              className={claseControl()}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" cargando={pendiente}>
              Añadir evento
            </Button>
            <Button type="button" variante="ghost" onClick={onCancelar} disabled={pendiente}>
              Cancelar
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Posición <span className="font-normal text-slate-400">(opcional)</span>
          </p>
          <CampoFutbol onClick={marcarPunto} className="cursor-crosshair">
            {punto && (
              <span
                className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: `${punto.x}%`, top: `${punto.y}%`, backgroundColor: info.color }}
              />
            )}
          </CampoFutbol>
          <button
            type="button"
            onClick={() => setPunto(null)}
            className={cn("mt-1 text-xs text-slate-500 hover:text-slate-800", !punto && "invisible")}
          >
            Quitar posición
          </button>
        </div>
      </div>
    </form>
  );
}
