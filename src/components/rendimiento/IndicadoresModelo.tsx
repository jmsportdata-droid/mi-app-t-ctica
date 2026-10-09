"use client";

import { useState } from "react";
import {
  cargarIndicadoresSugeridos,
  eliminarIndicador,
  guardarIndicador,
} from "@/app/(dashboard)/rendimiento/actions";
import { KPIS_INDICADOR, MOMENTOS_INDICE, kpiDe, type Indicador } from "@/lib/indice-modelo";
import type { MomentoJuego } from "@/types/modelo-juego";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

interface Principio {
  id: string;
  nombre: string;
  momento: MomentoJuego;
}

/** Cómo se mide cada momento del modelo: un KPI del post partido con su objetivo. */
export function IndicadoresModelo({
  indicadores,
  principios,
}: {
  indicadores: Indicador[];
  principios: Principio[];
}) {
  const sugeridos = useAccion();
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-900">Indicadores del modelo</h2>
          <p className="text-xs text-slate-500">
            Cada indicador es un KPI del post partido con su objetivo (y, si querés, el principio
            que mide). En cada partido vale 100 si se cumplió y, si no, qué tan cerca quedó. El
            índice del momento es el promedio de sus indicadores.
          </p>
        </div>
        {indicadores.length === 0 && (
          <Button
            cargando={sugeridos.pendiente}
            onClick={() => sugeridos.ejecutar(() => cargarIndicadoresSugeridos())}
          >
            Cargar los sugeridos
          </Button>
        )}
      </div>
      {sugeridos.error && <p className="text-sm text-red-600">{sugeridos.error}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {MOMENTOS_INDICE.map((m) => (
          <div key={m.valor} className="space-y-2 rounded-xl bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-800">{m.label}</h3>
            {indicadores
              .filter((i) => i.momento === m.valor)
              .map((i) => (
                <FilaIndicador
                  key={i.id}
                  indicador={i}
                  principios={principios.filter((p) => p.momento === m.valor)}
                />
              ))}
            <FilaIndicador
              key={`nuevo-${indicadores.length}`}
              momento={m.valor}
              principios={principios.filter((p) => p.momento === m.valor)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function FilaIndicador({
  indicador,
  momento,
  principios,
}: {
  indicador?: Indicador;
  momento?: MomentoJuego;
  principios: Principio[];
}) {
  const accion = useAccion();
  const [kpi, setKpi] = useState(indicador?.kpi ?? "");
  const [objetivo, setObjetivo] = useState(indicador ? String(indicador.objetivo) : "");
  const [principio, setPrincipio] = useState(indicador?.principio_id ?? "");
  const def = kpi ? kpiDe(kpi) : null;
  const nuevo = !indicador;

  function guardar(k = kpi, o = objetivo, p = principio) {
    if (!k || o.trim() === "") return;
    accion.ejecutar(() =>
      guardarIndicador(indicador?.id ?? null, {
        momento: indicador?.momento ?? momento!,
        principio_id: p || null,
        kpi: k,
        objetivo: Number(o.replace(",", ".")),
      }),
    );
  }

  return (
    <div className="space-y-1 rounded-lg bg-white p-2 ring-1 ring-inset ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kpi}
          onChange={(e) => {
            setKpi(e.target.value);
            if (!nuevo) guardar(e.target.value);
          }}
          aria-label="KPI"
          className={`${claseControl()} min-w-0 flex-1 py-1 text-sm`}
        >
          <option value="">{nuevo ? "+ Agregar indicador…" : "Elegí un KPI"}</option>
          {KPIS_INDICADOR.map((k) => (
            <option key={k.clave} value={k.clave}>
              {k.label}
            </option>
          ))}
        </select>
        {kpi && (
          <>
            <span className="text-xs text-slate-500">{def?.masEsMejor ? "≥" : "≤"}</span>
            <input
              inputMode="decimal"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              onBlur={() => !nuevo && guardar()}
              placeholder="Objetivo"
              aria-label="Objetivo"
              className={`${claseControl()} w-20 py-1 text-sm tabular-nums`}
            />
            {def?.sufijo && <span className="text-xs text-slate-500">{def.sufijo}</span>}
          </>
        )}
        {nuevo && kpi && (
          <Button
            className="px-2.5 py-1 text-xs"
            cargando={accion.pendiente}
            onClick={() => guardar()}
          >
            Agregar
          </Button>
        )}
        {!nuevo && (
          <button
            type="button"
            disabled={accion.pendiente}
            onClick={() => accion.ejecutar(() => eliminarIndicador(indicador!.id))}
            className="text-xs text-slate-500 hover:text-red-600"
          >
            Borrar
          </button>
        )}
      </div>
      {kpi && principios.length > 0 && (
        <select
          value={principio}
          onChange={(e) => {
            setPrincipio(e.target.value);
            if (!nuevo) guardar(kpi, objetivo, e.target.value);
          }}
          aria-label="Principio que mide"
          className={`${claseControl()} w-full py-1 text-xs`}
        >
          <option value="">Sin principio (mide el momento)</option>
          {principios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      )}
      {accion.error && <p className="text-xs text-red-600">{accion.error}</p>}
    </div>
  );
}
