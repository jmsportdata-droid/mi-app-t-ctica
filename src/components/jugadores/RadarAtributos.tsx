"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { GrupoAtributos, ValoresAtributos } from "@/types/atributos";

interface Props {
  grupo: GrupoAtributos;
  valores: ValoresAtributos | null;
}

function media(grupo: GrupoAtributos, valores: ValoresAtributos): number {
  const total = grupo.atributos.reduce((suma, a) => suma + valores[a.campo], 0);
  return Math.round(total / grupo.atributos.length);
}

/** Radar de un grupo de atributos + lista con barras de progreso. */
export function RadarAtributos({ grupo, valores }: Props) {
  const datos = grupo.atributos.map((a) => ({ atributo: a.label, valor: valores?.[a.campo] ?? 0 }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`radar-${grupo.clave}`}>
      <div className="flex items-baseline justify-between">
        <h3 id={`radar-${grupo.clave}`} className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {grupo.titulo}
        </h3>
        {valores && (
          <span className="text-lg font-bold tabular-nums" style={{ color: grupo.color }}>
            {media(grupo, valores)}
          </span>
        )}
      </div>

      <div className="h-52" role="img" aria-label={`Radar de atributos: ${grupo.titulo}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={datos} outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="atributo" tick={{ fontSize: 11, fill: "#475569" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            <Radar
              dataKey="valor"
              stroke={grupo.color}
              fill={grupo.color}
              fillOpacity={valores ? 0.3 : 0}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {grupo.atributos.map((a) => {
          const valor = valores?.[a.campo];
          return (
            <li key={a.campo}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-600">{a.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{valor ?? "—"}</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={a.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={valor ?? 0}
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${valor ?? 0}%`, backgroundColor: grupo.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
