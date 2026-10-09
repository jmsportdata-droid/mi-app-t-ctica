import Link from "next/link";
import {
  LINEA_A_POSICION,
  METRICAS_EQUIPO,
  METRICAS_JUGADOR,
  MINUTOS_LIGA,
  formatearLiga,
  rankingEquipo,
  rankingJugador,
  type JugadorLiga,
} from "@/lib/liga";
import type { ReferenciaLiga } from "@/lib/data/rendimiento";
import type { ResumenJugador } from "@/lib/rendimiento";
import { cn } from "@/lib/utils/cn";
import { BarraPorcentaje } from "./Graficos";
import { SelectorParametro } from "./Filtros";

const colorPercentil = (p: number) =>
  p >= 67 ? "bg-emerald-600" : p >= 34 ? "bg-slate-400" : "bg-amber-500";

/** Percentiles contra la liga: el equipo frente a los demás y nuestros jugadores frente a los de su puesto. */
export function VistaLiga({
  referencias,
  elegida,
  resumen,
  jugadorElegido,
}: {
  referencias: ReferenciaLiga[];
  elegida: ReferenciaLiga;
  resumen: (ResumenJugador & { sofascoreId: string | null })[];
  jugadorElegido: string | null;
}) {
  const nuestro = elegida.equipos.find((e) => e.propio);
  const porId = new Map(elegida.jugadores.map((j) => [j.id, j]));
  const nuestros = resumen
    .map((r) => ({ r, liga: r.sofascoreId ? porId.get(r.sofascoreId) : undefined }))
    .filter((x): x is { r: (typeof resumen)[number]; liga: JugadorLiga } => Boolean(x.liga))
    .sort((a, b) => b.liga.minutos - a.liga.minutos);
  const elegido = nuestros.find((x) => x.r.jugador.id === jugadorElegido) ?? nuestros[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {referencias.length > 1 ? (
          <SelectorParametro
            parametro="liga"
            label="Competencia"
            valor={elegida.idTorneo}
            opciones={referencias.map((r) => ({ valor: r.idTorneo, label: r.competicion }))}
          />
        ) : (
          <p className="text-sm font-medium text-slate-700">{elegida.competicion}</p>
        )}
        <p className="text-xs text-slate-500">
          {elegida.equipos.length} equipos y {elegida.jugadores.length} jugadores · Sofascore,
          temporada completa
        </p>
      </div>

      {nuestro ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            El equipo en la liga ({nuestro.partidos} partidos)
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {METRICAS_EQUIPO.map((g) => (
              <div
                key={g.titulo}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {g.titulo}
                </h3>
                <ul className="space-y-2.5">
                  {g.metricas.map((m) => {
                    const r = rankingEquipo(m, elegida.equipos, nuestro);
                    if (r.valor === null) return null;
                    return (
                      <li key={m.clave} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-medium text-slate-800">{m.label}</span>
                          <span className="tabular-nums">
                            <b>{formatearLiga(m, r.valor)}</b>
                            <span className="ml-1.5 text-xs text-slate-500">
                              {r.puesto}º de {r.de} · liga {formatearLiga(m, r.promedio)}
                            </span>
                          </span>
                        </div>
                        {r.percentil !== null && (
                          <BarraPorcentaje
                            valor={r.percentil}
                            className={colorPercentil(r.percentil)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-slate-500">Nuestro equipo no aparece en esta competencia.</p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Nuestros jugadores en la liga</h2>
        <p className="text-xs text-slate-500">
          Cada 90′ frente a los jugadores del mismo puesto con al menos {MINUTOS_LIGA}′. La barra es
          el percentil (100 = el mejor de la liga). Se vinculan por su id de Sofascore (se completa
          al actualizar el plantel o traer un post partido).
        </p>
        {nuestros.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ningún jugador del plantel está vinculado con Sofascore todavía. Actualizá los datos
            desde el{" "}
            <Link href="/plantilla" className="font-medium text-brand-700 hover:underline">
              Plantel
            </Link>
            .
          </p>
        ) : (
          elegido && (
            <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
              <ul className="max-h-[32rem] space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                {nuestros.map(({ r, liga }) => {
                  const nota = rankingJugador(
                    METRICAS_JUGADOR[liga.posicion].at(-1)!,
                    elegida.jugadores,
                    liga,
                  );
                  return (
                    <li key={r.jugador.id}>
                      <Link
                        href={`/rendimiento?vista=liga&liga=${elegida.idTorneo}&jugador=${r.jugador.id}`}
                        scroll={false}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm",
                          r.jugador.id === elegido.r.jugador.id
                            ? "bg-brand-50 font-semibold"
                            : "hover:bg-slate-50",
                        )}
                      >
                        <span className="truncate">{r.jugador.nombre}</span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {liga.minutos}′{nota.percentil !== null && ` · p${nota.percentil}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  {elegido.r.jugador.nombre}
                </h3>
                <p className="mb-3 text-xs text-slate-500">
                  {elegido.liga.minutos}′ en la liga ·{" "}
                  {
                    { G: "arqueros", D: "defensores", M: "mediocampistas", F: "delanteros" }[
                      elegido.liga.posicion
                    ]
                  }
                  {LINEA_A_POSICION[elegido.r.jugador.posicion] !== elegido.liga.posicion &&
                    " (puesto según Sofascore)"}
                  {elegido.liga.minutos < MINUTOS_LIGA &&
                    ` · tiene menos de ${MINUTOS_LIGA}′: sin percentil`}
                </p>
                <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
                  {METRICAS_JUGADOR[elegido.liga.posicion].map((m) => {
                    const r = rankingJugador(m, elegida.jugadores, elegido.liga);
                    return (
                      <li key={m.clave} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-medium text-slate-800">{m.label}</span>
                          <span className="tabular-nums">
                            <b>{formatearLiga(m, r.valor)}</b>
                            <span className="ml-1.5 text-xs text-slate-500">
                              {r.puesto ? `${r.puesto}º de ${r.de}` : ""}
                            </span>
                          </span>
                        </div>
                        {r.percentil !== null && elegido.liga.minutos >= MINUTOS_LIGA ? (
                          <div className="flex items-center gap-2">
                            <BarraPorcentaje
                              valor={r.percentil}
                              className={colorPercentil(r.percentil)}
                            />
                            <span className="w-10 text-right text-xs tabular-nums text-slate-500">
                              p{r.percentil}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">Sin percentil.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
}
