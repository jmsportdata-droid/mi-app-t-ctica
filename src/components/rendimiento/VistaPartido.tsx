import Link from "next/link";
import type { JugadorPartido, PartidoRend, ResumenJugador } from "@/lib/rendimiento";
import { formatearDia } from "@/lib/utils/fecha";
import { KpisEnfrentados } from "@/components/post/KpisPartido";
import { SelectorParametro } from "./Filtros";

/** Un partido frente al rival y frente a nuestro promedio de los 5 anteriores. */
export function VistaPartido({
  partidos,
  elegido,
  jugadorPartidos,
  resumen,
  club,
}: {
  partidos: PartidoRend[];
  elegido: PartidoRend;
  jugadorPartidos: JugadorPartido[];
  resumen: ResumenJugador[];
  club: string;
}) {
  const i = partidos.findIndex((p) => p.id === elegido.id);
  const anteriores = partidos
    .slice(Math.max(0, i - 5), i)
    .map((p) => ({ propio: p.propio, rival: p.rival_stats }));
  const porId = new Map(resumen.map((r) => [r.jugador.id, r.jugador]));
  const destacados = jugadorPartidos
    .filter((j) => j.partidoId === elegido.id && j.nota !== null && j.minutos >= 20)
    .sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SelectorParametro
          parametro="partido"
          label="Partido"
          valor={elegido.id}
          opciones={[...partidos].reverse().map((p) => ({
            valor: p.id,
            label: `${p.fecha.slice(8, 10)}/${p.fecha.slice(5, 7)} · ${p.esLocal ? "" : "@ "}${p.rival}${p.gf !== null ? ` (${p.gf}-${p.gc})` : ""}`,
            grupo: p.competicion ?? "Sin competencia",
          }))}
        />
        <Link
          href={`/partidos/${elegido.id}?tab=post`}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Ver el post partido completo →
        </Link>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {elegido.esLocal ? `${club} vs ${elegido.rival}` : `${elegido.rival} vs ${club}`}
            {elegido.gf !== null && (
              <span className="ml-2 tabular-nums">
                {elegido.esLocal ? `${elegido.gf}-${elegido.gc}` : `${elegido.gc}-${elegido.gf}`}
              </span>
            )}
          </h2>
          <p className="text-sm capitalize text-slate-500">
            {[elegido.competicion, formatearDia(elegido.fecha)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <span>
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-600" aria-hidden /> {club}
          </span>
          <span>
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" aria-hidden />{" "}
            {elegido.rival}
          </span>
          <span className="text-xs text-slate-500">
            {anteriores.length
              ? `▲ ▼ contra nuestro promedio de los ${anteriores.length} partidos anteriores`
              : "Es el primer partido con datos: todavía no hay promedio."}
          </span>
        </div>
        <KpisEnfrentados
          propio={elegido.propio}
          rival={elegido.rival_stats}
          anteriores={anteriores}
        />
      </section>

      {destacados.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Notas del partido
          </h2>
          <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {destacados.map((j) => {
              const info = porId.get(j.jugadorId);
              return (
                <li key={j.jugadorId}>
                  <Link
                    href={`/rendimiento?vista=individual&jugador=${j.jugadorId}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm hover:bg-slate-100"
                  >
                    <span className="truncate">
                      <span className="mr-1 text-xs font-bold text-slate-500">
                        {info?.numero ?? ""}
                      </span>
                      {info?.nombre ?? "Jugador"}
                      <span className="ml-1 text-xs text-slate-400">{j.minutos}′</span>
                    </span>
                    <span className="font-bold tabular-nums">{j.nota?.toFixed(1)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
