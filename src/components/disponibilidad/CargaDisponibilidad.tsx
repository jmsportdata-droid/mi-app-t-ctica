"use client";

import { useState, useTransition } from "react";
import { marcarDisponibilidad } from "@/app/(dashboard)/plantilla/disponibilidad/actions";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { cn } from "@/lib/utils/cn";
import { formatearFecha } from "@/lib/utils/edad";
import {
  ESTADOS_DISPONIBILIDAD,
  SIN_REGISTRO,
  type EstadoDelDia,
  type EstadoDisponibilidad,
} from "@/types/disponibilidad";
import { POSICIONES, POSICION_LABEL, type Jugador } from "@/types/jugador";
import { Avatar } from "@/components/ui/Avatar";

type JugadorResumen = Pick<Jugador, "id" | "nombre" | "numero" | "posicion" | "foto_ruta">;

interface Props {
  fecha: string;
  jugadores: JugadorResumen[];
  estadosIniciales: Record<string, EstadoDelDia>;
}

/** Carga rápida del estado de todo el plantel en un día: un toque por jugador. */
export function CargaDisponibilidad({ fecha, jugadores, estadosIniciales }: Props) {
  const [estados, setEstados] = useState(estadosIniciales);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const estadoDe = (id: string) => estados[id] ?? SIN_REGISTRO;

  function guardar(jugadorId: string, nuevo: EstadoDelDia) {
    const anterior = estadoDe(jugadorId);
    setEstados((prev) => ({ ...prev, [jugadorId]: nuevo }));
    setErrores((prev) => {
      const copia = { ...prev };
      delete copia[jugadorId];
      return copia;
    });
    setGuardando((prev) => ({ ...prev, [jugadorId]: true }));

    startTransition(async () => {
      let error: string | null = null;
      try {
        const r = await marcarDisponibilidad({
          jugadorId,
          fecha,
          estado: nuevo.estado,
          fechaRegreso: nuevo.fecha_regreso,
        });
        if (!r.ok) error = r.error;
      } catch {
        error = "Error de conexión. Probá de nuevo.";
      }
      setGuardando((prev) => ({ ...prev, [jugadorId]: false }));
      if (error) {
        setEstados((prev) => ({ ...prev, [jugadorId]: anterior }));
        setErrores((prev) => ({ ...prev, [jugadorId]: error }));
      }
    });
  }

  function elegirEstado(jugadorId: string, estado: EstadoDisponibilidad) {
    const actual = estadoDe(jugadorId);
    if (actual.estado === estado) return;
    // Al pasar entre limitado/baja/sancionado se conserva la fecha de vuelta cargada
    const fechaRegreso = estado === "disponible" ? null : actual.fecha_regreso;
    guardar(jugadorId, { estado, fecha_regreso: fechaRegreso, desde: fecha });
  }

  function cambiarRegreso(jugadorId: string, valor: string) {
    const actual = estadoDe(jugadorId);
    guardar(jugadorId, { ...actual, fecha_regreso: valor === "" ? null : valor, desde: fecha });
  }

  const conteo = Object.fromEntries(ESTADOS_DISPONIBILIDAD.map((e) => [e.valor, 0])) as Record<
    EstadoDisponibilidad,
    number
  >;
  for (const j of jugadores) conteo[estadoDe(j.id).estado] += 1;

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ESTADOS_DISPONIBILIDAD.map((e) => (
          <div key={e.valor} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span className={cn("h-2 w-2 rounded-full", e.punto)} aria-hidden />
              {e.label}
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {conteo[e.valor]}
            </dd>
          </div>
        ))}
      </dl>

      {POSICIONES.map((linea) => {
        const grupo = jugadores.filter((j) => j.posicion === linea);
        if (grupo.length === 0) return null;
        return (
          <section key={linea} aria-labelledby={`linea-${linea}`}>
            <h2
              id={`linea-${linea}`}
              className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
            >
              {POSICION_LABEL[linea]}
            </h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
              {grupo.map((j) => {
                const actual = estadoDe(j.id);
                const arrastrado = actual.desde !== null && actual.desde < fecha;
                return (
                  <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                      <Avatar
                        src={urlImagen(BUCKETS.fotosJugadores, j.foto_ruta)}
                        nombre={j.nombre}
                        className="!h-10 !w-10 text-sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          <span className="mr-1.5 tabular-nums text-slate-400">
                            {j.numero ?? "–"}
                          </span>
                          {j.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {guardando[j.id]
                            ? "Guardando…"
                            : arrastrado
                              ? `Desde el ${formatearFecha(actual.desde)}`
                              : actual.desde
                                ? "Cargado este día"
                                : "Sin cambios cargados"}
                        </p>
                        {errores[j.id] && <p className="text-xs text-red-600">{errores[j.id]}</p>}
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1"
                      role="radiogroup"
                      aria-label={`Estado de ${j.nombre}`}
                    >
                      {ESTADOS_DISPONIBILIDAD.map((e) => {
                        const elegido = actual.estado === e.valor;
                        return (
                          <button
                            key={e.valor}
                            type="button"
                            role="radio"
                            aria-checked={elegido}
                            onClick={() => elegirEstado(j.id, e.valor)}
                            className={cn(
                              "min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
                              elegido
                                ? cn("shadow-sm ring-1", e.boton)
                                : "text-slate-600 hover:bg-white",
                            )}
                          >
                            {e.label}
                          </button>
                        );
                      })}
                    </div>

                    {actual.estado !== "disponible" && (
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        Vuelve
                        <input
                          type="date"
                          min={fecha}
                          value={actual.fecha_regreso ?? ""}
                          onChange={(e) => cambiarRegreso(j.id, e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
