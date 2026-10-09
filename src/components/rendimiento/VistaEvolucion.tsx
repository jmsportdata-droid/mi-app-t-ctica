import Link from "next/link";
import { GRUPOS_KPI, formatearKpi, promedioKpi } from "@/lib/post-partido";
import { resultado, resumenEquipo, serieKpi, type PartidoRend } from "@/lib/rendimiento";
import { cn } from "@/lib/utils/cn";
import { GraficoEvolucion } from "./Graficos";

const CLASE_RESULTADO = {
  G: "bg-emerald-600 text-white",
  E: "bg-slate-400 text-white",
  P: "bg-red-600 text-white",
} as const;

const fechaCorta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

/** Resumen de resultados y la evolución de cada KPI con su media móvil de 5. */
export function VistaEvolucion({ partidos }: { partidos: PartidoRend[] }) {
  const r = resumenEquipo(partidos);
  const todos = partidos.map((p) => ({ propio: p.propio, rival: p.rival_stats }));
  const tarjetas: [string, string, string?][] = [
    ["Partidos", String(r.pj)],
    ["Puntos", String(r.puntos), `${r.g}G ${r.e}E ${r.p}P`],
    ["Rendimiento", r.rendimiento === null ? "—" : `${r.rendimiento}%`],
    ["Goles a favor", String(r.gf), r.pj ? `${(r.gf / r.pj).toFixed(1)} por partido` : undefined],
    ["Goles en contra", String(r.gc), r.pj ? `${(r.gc / r.pj).toFixed(1)} por partido` : undefined],
    ["Vallas invictas", String(r.vallas)],
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tarjetas.map(([label, valor, detalle]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</dd>
            {detalle && <dd className="text-xs text-slate-500">{detalle}</dd>}
          </div>
        ))}
      </dl>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Partido a partido
        </h2>
        <ol className="flex flex-wrap gap-1.5">
          {partidos.map((p) => {
            const res = resultado(p);
            return (
              <li key={p.id}>
                <Link
                  href={`/partidos/${p.id}?tab=post`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                  title={`${p.rival} · ${p.competicion ?? ""}`}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold",
                      res ? CLASE_RESULTADO[res] : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {res ?? "?"}
                  </span>
                  <span className="text-slate-500">{fechaCorta(p.fecha)}</span>
                  <span className="max-w-[9rem] truncate font-medium text-slate-800">
                    {p.esLocal ? "" : "@ "}
                    {p.rival}
                  </span>
                  {p.gf !== null && (
                    <span className="font-semibold tabular-nums">
                      {p.gf}-{p.gc}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand-500" aria-hidden />
          Nosotros
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" aria-hidden />
          Rival
        </span>
        <span>
          <span
            className="mr-1 inline-block h-0.5 w-4 translate-y-[-3px] bg-slate-900"
            aria-hidden
          />
          Media de los últimos 5
        </span>
      </div>

      {GRUPOS_KPI.map((g) => (
        <section key={g.titulo} className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{g.titulo}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {g.kpis.map((k) => {
              const serie = serieKpi(k, partidos);
              if (serie.every((s) => s.nos === null)) return null;
              const ultimo = [...serie].reverse().find((s) => s.nos !== null);
              const prom = promedioKpi(k, todos);
              return (
                <div
                  key={k.clave}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  title={k.ayuda}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-medium text-slate-800">{k.label}</h3>
                    <span className="text-xs tabular-nums text-slate-500">
                      prom. {formatearKpi(k, prom)}
                    </span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-slate-900">
                    {formatearKpi(k, ultimo?.nos ?? null)}
                    <span className="ml-1 text-xs font-normal text-slate-500">último</span>
                  </p>
                  <GraficoEvolucion
                    puntos={serie.map((s) => ({
                      etiqueta: `${fechaCorta(s.fecha)} ${s.rival}`,
                      valor: s.nos,
                      media: s.media,
                      referencia: s.ellos,
                    }))}
                    formato={(x) => formatearKpi(k, x)}
                  />
                  <p className="text-[11px] text-slate-400">
                    {k.masEsMejor ? "Más es mejor" : "Menos es mejor"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
