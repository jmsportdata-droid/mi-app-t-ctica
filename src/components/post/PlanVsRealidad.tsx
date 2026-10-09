"use client";

import { useState } from "react";
import { guardarPlanVsReal } from "@/app/(dashboard)/partidos/post-actions";
import {
  CUMPLIMIENTOS,
  type Cumplimiento,
  type EvaluacionPlan,
  type InsightsPost,
} from "@/lib/post-partido";
import { cn } from "@/lib/utils/cn";
import { MOMENTOS_PLAN, type PlanPartido } from "@/types/partido";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

interface Item {
  clave: string;
  titulo: string;
  texto: string;
}

/** Lo que se planificó, frente a lo que pasó: el cuerpo técnico marca si se cumplió. */
export function PlanVsRealidad({
  plan,
  evaluaciones,
  sugerencias,
  partidoId,
}: {
  plan: PlanPartido | null;
  evaluaciones: Record<string, EvaluacionPlan>;
  sugerencias: InsightsPost["plan_vs_real"];
  partidoId: string;
}) {
  const items: Item[] = [];
  if (plan?.objetivo) items.push({ clave: "objetivo", titulo: "Objetivo", texto: plan.objetivo });
  plan?.claves.forEach((c, i) =>
    items.push({ clave: `clave_${i + 1}`, titulo: `Clave ${i + 1}`, texto: c }),
  );
  for (const m of MOMENTOS_PLAN) {
    const texto = plan?.[`${m.prefijo}_plantel`] || plan?.[`${m.prefijo}_ct`];
    if (texto) items.push({ clave: m.prefijo, titulo: m.label, texto });
  }
  if (plan?.abp_plantel || plan?.abp_ct)
    items.push({
      clave: "abp",
      titulo: "Pelota parada",
      texto: (plan.abp_plantel || plan.abp_ct)!,
    });
  const porClave = new Map((sugerencias ?? []).map((s) => [s.clave, s]));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Plan vs realidad</h2>
      <p className="mb-4 text-xs text-slate-500">
        Cada parte del plan, y si se cumplió. Con el borrador de Claude se completa lo que no
        evaluaron todavía.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Este partido no tiene plan cargado (paso 5): no hay nada que contrastar.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <FilaPlan
              key={it.clave}
              partidoId={partidoId}
              item={it}
              evaluacion={evaluaciones[it.clave] ?? null}
              sugerencia={porClave.get(it.clave) ?? null}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilaPlan({
  partidoId,
  item,
  evaluacion,
  sugerencia,
}: {
  partidoId: string;
  item: Item;
  evaluacion: EvaluacionPlan | null;
  sugerencia: { cumplimiento: string; evidencia: string } | null;
}) {
  const accion = useAccion();
  const [cumplimiento, setCumplimiento] = useState<Cumplimiento | null>(
    evaluacion?.cumplimiento ?? null,
  );
  const [nota, setNota] = useState(evaluacion?.nota ?? "");
  const guardar = (c: Cumplimiento | null, n: string) =>
    accion.ejecutar(() => guardarPlanVsReal(partidoId, item.clave, { cumplimiento: c, nota: n }));
  const sugerido = CUMPLIMIENTOS.find((c) => c.valor === sugerencia?.cumplimiento);

  return (
    <li className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[1fr_1fr]">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {item.titulo}
        </h3>
        <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-sm text-slate-800">
          {item.texto}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cumplimiento">
          {CUMPLIMIENTOS.map((c) => {
            const activo = cumplimiento === c.valor;
            return (
              <button
                key={c.valor}
                type="button"
                role="radio"
                aria-checked={activo}
                disabled={accion.pendiente}
                onClick={() => {
                  const nuevo = activo ? null : c.valor;
                  setCumplimiento(nuevo);
                  guardar(nuevo, nota);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                  activo ? c.chip : "bg-white text-slate-500 ring-slate-300 hover:bg-slate-50",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => {
            if (nota !== (evaluacion?.nota ?? "")) guardar(cumplimiento, nota);
          }}
          rows={2}
          maxLength={500}
          placeholder="Qué pasó (dato o clip que lo muestra)…"
          aria-label={`Qué pasó con: ${item.titulo}`}
          className={claseControl()}
        />
        {!evaluacion && sugerencia && sugerido && (
          <p className="text-xs text-slate-500">
            Claude sugiere <b>{sugerido.label.toLowerCase()}</b>: {sugerencia.evidencia}
          </p>
        )}
        {accion.error && <p className="text-xs text-red-600">{accion.error}</p>}
      </div>
    </li>
  );
}
