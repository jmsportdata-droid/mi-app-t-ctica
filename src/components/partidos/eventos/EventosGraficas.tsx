"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TIPOS_EVENTO, type EventoPartido, type TipoEvento } from "@/types/evento";

const TRAMOS = [
  { label: "0-15'", desde: 0, hasta: 15 },
  { label: "16-30'", desde: 16, hasta: 30 },
  { label: "31-45'", desde: 31, hasta: 45 },
  { label: "46-60'", desde: 46, hasta: 60 },
  { label: "61-75'", desde: 61, hasta: 75 },
  { label: "76-90'", desde: 76, hasta: 90 },
  { label: "90+'", desde: 91, hasta: Infinity },
] as const;

type FilaTramo = { tramo: string } & Record<TipoEvento, number>;

function porTramos(eventos: EventoPartido[]): FilaTramo[] {
  return TRAMOS.map(({ label, desde, hasta }) => {
    const fila = { tramo: label, gol: 0, ocasion: 0, duelo: 0, nota: 0 };
    for (const e of eventos) if (e.minuto >= desde && e.minuto <= hasta) fila[e.tipo] += 1;
    return fila;
  });
}

const EJE = { fontSize: 12, fill: "#64748b" };

export function EventosGraficas({ eventos }: { eventos: EventoPartido[] }) {
  if (eventos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Registrá eventos para ver los gráficos.
      </p>
    );
  }

  const porTipo = TIPOS_EVENTO.map((t) => ({
    tipo: t.label,
    total: eventos.filter((e) => e.tipo === t.valor).length,
    color: t.color,
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <figure className="rounded-xl border border-slate-200 p-4">
        <figcaption className="mb-3 text-sm font-semibold text-slate-700">
          Eventos por tipo
        </figcaption>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porTipo} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="tipo" tick={EJE} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={EJE} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="total" name="Eventos" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {porTipo.map((d) => (
                  <Cell key={d.tipo} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>

      <figure className="rounded-xl border border-slate-200 p-4">
        <figcaption className="mb-3 text-sm font-semibold text-slate-700">
          Distribución por tramos de 15&apos;
        </figcaption>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porTramos(eventos)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="tramo" tick={EJE} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={EJE} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {TIPOS_EVENTO.map((t, i) => (
                <Bar
                  key={t.valor}
                  dataKey={t.valor}
                  name={t.label}
                  stackId="eventos"
                  fill={t.color}
                  radius={i === TIPOS_EVENTO.length - 1 ? [4, 4, 0, 0] : undefined}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
