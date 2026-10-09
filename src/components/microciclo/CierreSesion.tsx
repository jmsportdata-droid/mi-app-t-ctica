"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarSesion, reabrirSesion } from "@/app/(dashboard)/microciclo/actions";
import { cn } from "@/lib/utils/cn";
import type { EstadoDelDia } from "@/types/disponibilidad";
import { INFO_ESTADO } from "@/types/disponibilidad";
import type { Jugador } from "@/types/jugador";
import {
  ESTADOS_ASISTENCIA,
  type Asistencia,
  type EstadoAsistencia,
  type Sesion,
} from "@/types/sesion";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";

/** Estado de asistencia sugerido según la disponibilidad del día. */
function sugerido(estado: EstadoDelDia | undefined): EstadoAsistencia {
  if (!estado) return "completo";
  if (estado.estado === "limitado") return "diferenciado";
  if (estado.estado === "baja" || estado.estado === "sancionado") return "ausente";
  return "completo";
}

/** Cierre de la sesión: minutos reales, observaciones y asistencia. */
export function CierreSesion({
  actividadId,
  sesion,
  jugadores,
  disponibilidad,
  asistencia,
  minutosPlanificados,
}: {
  actividadId: string;
  sesion: Sesion | null;
  jugadores: Jugador[];
  disponibilidad: Record<string, EstadoDelDia>;
  asistencia: Asistencia[];
  minutosPlanificados: number;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cerrada = sesion?.cerrada ?? false;
  const [abierto, setAbierto] = useState(false);
  const cargada = new Map(asistencia.map((a) => [a.jugador_id, a.estado]));
  const [minutos, setMinutos] = useState(
    String(sesion?.minutos_reales ?? (minutosPlanificados || "")),
  );
  const [observaciones, setObservaciones] = useState(sesion?.observaciones_cierre ?? "");
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>(() =>
    Object.fromEntries(
      jugadores.map((j) => [j.id, cargada.get(j.id) ?? sugerido(disponibilidad[j.id])]),
    ),
  );

  function ejecutar(accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setAbierto(false);
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  const conteo = ESTADOS_ASISTENCIA.map((e) => ({
    ...e,
    cantidad: Object.values(estados).filter((x) => x === e.valor).length,
  }));

  if (cerrada && !abierto) {
    return (
      <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Sesión cerrada</h2>
          <div className="flex gap-2">
            <Button variante="secondary" className="px-3 py-1.5" onClick={() => setAbierto(true)}>
              Editar cierre
            </Button>
            <Button
              variante="ghost"
              className="px-3 py-1.5"
              cargando={pendiente}
              onClick={() => ejecutar(() => reabrirSesion(actividadId))}
            >
              Reabrir
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-700">
          {sesion?.minutos_reales !== null && sesion?.minutos_reales !== undefined && (
            <>
              <strong>{sesion.minutos_reales}′</strong> reales ·{" "}
            </>
          )}
          {conteo
            .filter((c) => c.cantidad > 0)
            .map((c) => `${c.cantidad} ${c.label.toLowerCase()}`)
            .join(" · ")}
        </p>
        {sesion?.observaciones_cierre && (
          <p className="whitespace-pre-line text-sm text-slate-600">
            {sesion.observaciones_cierre}
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </section>
    );
  }

  if (!abierto) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-semibold text-slate-900">Cierre de la sesión</h2>
          <p className="text-sm text-slate-500">
            Después de entrenar: minutos reales y quién hizo la sesión.
          </p>
        </div>
        <Button variante="secondary" onClick={() => setAbierto(true)}>
          Cerrar sesión
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Cierre de la sesión</h2>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          <span className="block">Minutos reales</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={400}
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
            className={claseControl()}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          <span className="block">Observaciones</span>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            maxLength={2000}
            placeholder="Cómo salió, qué se cambió, quién terminó con molestias…"
            className={claseControl()}
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-700">Asistencia</h3>
          <p className="text-xs text-slate-500">
            {conteo.map((c) => `${c.cantidad} ${c.label.toLowerCase()}`).join(" · ")}
          </p>
        </div>
        {jugadores.length === 0 ? (
          <p className="text-sm text-slate-500">No hay jugadores en el plantel de la temporada.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {jugadores.map((j) => {
              const disp = disponibilidad[j.id];
              return (
                <li key={j.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="w-7 text-right text-xs font-semibold tabular-nums text-slate-400">
                    {j.numero ?? ""}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                    {j.nombre}
                    {disp && disp.estado !== "disponible" && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500">
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", INFO_ESTADO[disp.estado].punto)}
                          aria-hidden
                        />
                        {INFO_ESTADO[disp.estado].label}
                      </span>
                    )}
                  </span>
                  <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={j.nombre}>
                    {ESTADOS_ASISTENCIA.map((e) => {
                      const activo = estados[j.id] === e.valor;
                      return (
                        <button
                          key={e.valor}
                          type="button"
                          role="radio"
                          aria-checked={activo}
                          onClick={() => setEstados((x) => ({ ...x, [j.id]: e.valor }))}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                            activo
                              ? e.boton
                              : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50",
                          )}
                        >
                          {e.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          cargando={pendiente}
          onClick={() =>
            ejecutar(() =>
              cerrarSesion(actividadId, {
                minutos_reales: minutos.trim() === "" ? null : Number(minutos),
                observaciones_cierre: observaciones,
                asistencia: Object.entries(estados).map(([jugador_id, estado]) => ({
                  jugador_id,
                  estado,
                  nota: null,
                })),
              }),
            )
          }
        >
          Guardar cierre
        </Button>
        <Button variante="ghost" onClick={() => setAbierto(false)} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
