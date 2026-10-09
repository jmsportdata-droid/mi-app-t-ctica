import Link from "next/link";
import { MOMENTOS_INDICE, indicePartido, type Indicador } from "@/lib/indice-modelo";
import { mediaMovil, resultado, type PartidoRend } from "@/lib/rendimiento";
import { cn } from "@/lib/utils/cn";
import type { MomentoJuego } from "@/types/modelo-juego";
import { GraficoEvolucion } from "./Graficos";
import { IndicadoresModelo } from "./IndicadoresModelo";

const color = (x: number | null) =>
  x === null
    ? "bg-slate-100 text-slate-400"
    : x >= 80
      ? "bg-emerald-100 text-emerald-800"
      : x >= 60
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

const fechaCorta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

/** Índice de cumplimiento del modelo de juego por partido y por momento. */
export function VistaModelo({
  partidos,
  indicadores,
  planes,
  principios,
}: {
  partidos: PartidoRend[];
  indicadores: Indicador[];
  planes: Record<string, Record<string, { cumplimiento: string | null }>>;
  principios: { id: string; nombre: string; momento: MomentoJuego }[];
}) {
  const filas = partidos.map((p) => ({
    p,
    i: indicePartido(indicadores, p.propio, p.rival_stats, planes[p.id]),
  }));
  const globales = filas.map((f) => f.i.global);
  const medias = mediaMovil(globales);
  const promedio = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };

  return (
    <div className="space-y-6">
      {indicadores.length > 0 && partidos.length > 0 && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Índice del modelo
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{promedio(globales) ?? "—"}</dd>
            </div>
            {MOMENTOS_INDICE.map((m) => (
              <div
                key={m.valor}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {m.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">
                  {promedio(filas.map((f) => f.i.porMomento[m.valor] ?? null)) ?? "—"}
                </dd>
              </div>
            ))}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Plan cumplido
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">
                {promedio(filas.map((f) => f.i.plan)) ?? "—"}
              </dd>
            </div>
          </dl>

          {partidos.length > 1 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Índice partido a partido (línea: media de 5)
              </h2>
              <GraficoEvolucion
                className="h-36"
                puntos={filas.map((f, n) => ({
                  etiqueta: `${fechaCorta(f.p.fecha)} ${f.p.rival}`,
                  valor: f.i.global,
                  media: medias[n] ?? null,
                }))}
                formato={(x) => (x === null ? "—" : String(Math.round(x)))}
              />
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 text-left font-semibold">Partido</th>
                    <th className="px-2 py-2 text-center font-semibold">Índice</th>
                    {MOMENTOS_INDICE.map((m) => (
                      <th key={m.valor} className="px-2 py-2 text-center font-semibold">
                        {m.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-semibold">Objetivos</th>
                    <th className="px-2 py-2 text-center font-semibold">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filas].reverse().map(({ p, i }) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-1.5">
                        <Link href={`/partidos/${p.id}?tab=post`} className="hover:underline">
                          <span className="mr-1.5 text-xs text-slate-500">
                            {fechaCorta(p.fecha)}
                          </span>
                          <span className="font-medium">{p.rival}</span>
                          {p.gf !== null && (
                            <span className="ml-1.5 tabular-nums text-slate-500">
                              {p.gf}-{p.gc} {resultado(p)}
                            </span>
                          )}
                        </Link>
                      </td>
                      {[i.global, ...MOMENTOS_INDICE.map((m) => i.porMomento[m.valor] ?? null)].map(
                        (x, n) => (
                          <td key={n} className="px-2 py-1.5 text-center">
                            <span
                              className={cn(
                                "inline-block min-w-[2.75rem] rounded px-1.5 py-0.5 text-xs font-bold tabular-nums",
                                color(x),
                                n === 0 && "text-sm",
                              )}
                            >
                              {x ?? "—"}
                            </span>
                          </td>
                        ),
                      )}
                      <td className="px-2 py-1.5 text-center text-xs tabular-nums text-slate-600">
                        {i.medidos ? `${i.cumplidos}/${i.medidos}` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span
                          className={cn(
                            "inline-block min-w-[2.75rem] rounded px-1.5 py-0.5 text-xs font-bold",
                            color(i.plan),
                          )}
                        >
                          {i.plan ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Verde: 80 o más · amarillo: 60-79 · rojo: menos de 60. «Plan» sale de plan vs realidad
              del post partido (se cumplió = 100, a medias = 50, no = 0).
            </p>
          </section>
        </>
      )}
      {partidos.length === 0 && indicadores.length > 0 && (
        <p className="text-sm text-slate-500">
          Con el primer post partido aparece el índice de cumplimiento.
        </p>
      )}
      <IndicadoresModelo indicadores={indicadores} principios={principios} />
    </div>
  );
}
