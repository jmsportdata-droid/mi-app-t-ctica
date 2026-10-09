"use client";

import { useState } from "react";
import { guardarEnfoqueSesion } from "@/app/(dashboard)/microciclo/actions";
import { cn } from "@/lib/utils/cn";
import type { PrincipioJuego } from "@/types/modelo-juego";
import { ORIENTACIONES, type OrientacionFisica } from "@/types/tarea";
import { useAccion } from "@/components/ui/useAccion";
import { SelectorObjetivos } from "@/components/tareas/SelectorObjetivos";

/**
 * Qué se trabaja en la sesión: el tipo de entrenamiento (viene el del día según
 * el manual, se puede cambiar) y los principios del modelo. Con eso se ordena el
 * banco de tareas al agregar ejercicios.
 */
export function EnfoqueSesion({
  actividadId,
  orientacionGuardada,
  orientacionDelDia,
  md,
  principios,
  elegidos,
}: {
  actividadId: string;
  orientacionGuardada: OrientacionFisica | null;
  orientacionDelDia?: OrientacionFisica;
  md?: string;
  principios: PrincipioJuego[];
  elegidos: string[];
}) {
  const accion = useAccion();
  const [orientacion, setOrientacion] = useState<OrientacionFisica | null>(
    orientacionGuardada ?? orientacionDelDia ?? null,
  );
  const [lista, setLista] = useState(elegidos);

  function guardar(o: OrientacionFisica | null, p: string[]) {
    accion.ejecutar(() => guardarEnfoqueSesion(actividadId, { orientacion: o, principios: p }));
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold text-slate-900">Qué trabajamos</h2>
        <p className="text-xs text-slate-500">
          Con esto el banco de tareas te muestra primero los ejercicios que encajan.
          {accion.pendiente && " Guardando…"}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">
          Tipo de entrenamiento
          {orientacionDelDia && md && (
            <span className="ml-1 font-normal text-slate-500">
              (el manual pone{" "}
              {ORIENTACIONES.find((o) => o.valor === orientacionDelDia)?.label.toLowerCase()} el{" "}
              {md})
            </span>
          )}
        </p>
        <div
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label="Tipo de entrenamiento"
        >
          {ORIENTACIONES.map((o) => {
            const activo = orientacion === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                role="radio"
                aria-checked={activo}
                disabled={accion.pendiente}
                onClick={() => {
                  const nueva = activo ? null : o.valor;
                  setOrientacion(nueva);
                  guardar(nueva, lista);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset",
                  activo
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">
          Principios del modelo que queremos trabajar
        </p>
        <SelectorObjetivos
          principios={principios}
          value={lista}
          onChange={(ids) => {
            setLista(ids);
            guardar(orientacion, ids);
          }}
        />
      </div>
      {accion.error && <p className="text-sm text-red-600">{accion.error}</p>}
    </section>
  );
}
