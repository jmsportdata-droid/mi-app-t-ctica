import {
  GRUPOS_KPI,
  formatearKpi,
  promedioKpi,
  tendencia,
  valorRival,
  xgPorTramo,
  type DefinicionKpi,
  type Stats,
  type Tiro,
} from "@/lib/post-partido";
import { cn } from "@/lib/utils/cn";

export interface Incidencia {
  tipo: "gol" | "tarjeta" | "cambio";
  minuto: number | null;
  extra?: number | null;
  propio: boolean;
  jugador?: string | null;
  asistencia?: string | null;
  clase?: string | null;
  color?: string | null;
  entra?: string | null;
  sale?: string | null;
}

const minuto = (i: { minuto: number | null; extra?: number | null }) =>
  `${i.minuto ?? "?"}${i.extra ? `+${i.extra}` : ""}′`;

/** KPI de un partido por momento, enfrentados con el rival y con nuestro promedio. */
export function KpisEnfrentados({
  propio,
  rival,
  anteriores,
}: {
  propio: Stats;
  rival: Stats;
  anteriores: { propio: Stats; rival: Stats }[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {GRUPOS_KPI.map((g) => {
        const filas = g.kpis.filter(
          (k) => k.valor(propio, rival) !== null || valorRival(k, propio, rival) !== null,
        );
        if (filas.length === 0) return null;
        return (
          <div key={g.titulo} className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {g.titulo}
            </h3>
            <ul className="space-y-2.5">
              {filas.map((k) => (
                <FilaKpi
                  key={k.clave}
                  k={k}
                  nos={k.valor(propio, rival)}
                  ellos={valorRival(k, propio, rival)}
                  promedio={promedioKpi(k, anteriores)}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function FilaKpi({
  k,
  nos,
  ellos,
  promedio,
}: {
  k: DefinicionKpi;
  nos: number | null;
  ellos: number | null;
  promedio: number | null;
}) {
  const max = Math.max(nos ?? 0, ellos ?? 0) || 1;
  const t = tendencia(k, nos, promedio);
  return (
    <li className="grid grid-cols-[3.5rem_1fr_3.5rem] items-end gap-2" title={k.ayuda}>
      <span className="text-right text-sm font-bold tabular-nums text-slate-900">
        {formatearKpi(k, nos)}
      </span>
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium text-slate-700">{k.label}</span>
          {promedio !== null && (
            <span
              className={cn(
                "whitespace-nowrap tabular-nums",
                t === 1 ? "text-emerald-700" : t === -1 ? "text-red-600" : "text-slate-400",
              )}
            >
              {t === 1 ? "▲ " : t === -1 ? "▼ " : ""}prom. {formatearKpi(k, promedio)}
            </span>
          )}
        </div>
        <div className="flex h-2 gap-px overflow-hidden rounded-full bg-slate-100">
          <div className="flex flex-1 justify-end">
            <div
              className="h-full rounded-l-full bg-brand-600"
              style={{ width: `${(100 * (nos ?? 0)) / max}%` }}
            />
          </div>
          <div className="flex-1">
            <div
              className="h-full rounded-r-full bg-slate-400"
              style={{ width: `${(100 * (ellos ?? 0)) / max}%` }}
            />
          </div>
        </div>
      </div>
      <span className="text-sm tabular-nums text-slate-600">{formatearKpi(k, ellos)}</span>
    </li>
  );
}

export function XgPorTramos({ tiros }: { tiros: Tiro[] }) {
  const tramos = xgPorTramo(tiros);
  const max = Math.max(0.3, ...tramos.flatMap((t) => [t.propio, t.rival]));
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        xG por tramos de 15′
      </h3>
      <div className="grid grid-cols-6 gap-3">
        {tramos.map((t) => (
          <div key={t.tramo} className="flex flex-col items-center gap-1">
            <div className="flex h-28 items-end gap-1" aria-hidden>
              <div
                className="w-4 rounded-t bg-brand-600"
                style={{ height: `${(100 * t.propio) / max}%` }}
              />
              <div
                className="w-4 rounded-t bg-slate-400"
                style={{ height: `${(100 * t.rival) / max}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-slate-700">
              {t.propio.toFixed(2)} – {t.rival.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500">{t.tramo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Incidencias({ incidencias }: { incidencias: Incidencia[] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Incidencias
      </h3>
      <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
        {incidencias.map((i, n) => (
          <li key={n} className={cn("flex items-baseline gap-2", i.propio ? "" : "text-slate-500")}>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
              {minuto(i)}
            </span>
            {i.tipo === "gol" && (
              <span>
                <b>Gol {i.propio ? "nuestro" : "del rival"}</b>: {i.jugador}
                {i.clase === "penalty" && " (penal)"}
                {i.clase === "ownGoal" && " (en contra)"}
                {i.asistencia && ` · asistencia de ${i.asistencia}`}
              </span>
            )}
            {i.tipo === "tarjeta" && (
              <span className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "inline-block h-3 w-2 translate-y-0.5 rounded-[2px]",
                    i.color === "yellow" ? "bg-yellow-400" : "bg-red-600",
                  )}
                  aria-hidden
                />
                {i.color === "yellow"
                  ? "Amarilla"
                  : i.color === "yellowRed"
                    ? "Doble amarilla"
                    : "Roja"}
                : {i.jugador}
              </span>
            )}
            {i.tipo === "cambio" && (
              <span>
                Cambio: entra <b className="font-medium">{i.entra}</b> por {i.sale}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
