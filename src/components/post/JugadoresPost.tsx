import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { JugadorPost } from "@/lib/data/post-partido";
import { NotaCuerpoTecnico } from "./NotaCuerpoTecnico";

type Stats = Record<string, number | null | undefined>;

const n = (x: number | null | undefined, d = 0) =>
  x === null || x === undefined
    ? "—"
    : x.toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d });

function claseNota(nota: number | null) {
  if (nota === null) return "text-slate-400";
  if (nota >= 7.5) return "bg-emerald-100 text-emerald-800";
  if (nota >= 6.8) return "bg-slate-100 text-slate-800";
  return "bg-amber-100 text-amber-800";
}

/** Minutos, nota, goles, tarjetas y estadísticas de cada uno de nuestros jugadores en el partido. */
export function JugadoresPost({
  partidoId,
  jugadores,
  valoraciones,
}: {
  partidoId: string;
  jugadores: JugadorPost[];
  valoraciones: Record<string, number>;
}) {
  if (jugadores.length === 0) return null;
  const filas = [...jugadores].sort(
    (a, b) => Number(b.titular) - Number(a.titular) || b.minutos - a.minutos,
  );
  const hayFisico = filas.some((j) => (j.stats as Stats).km);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Nuestros jugadores</h2>
      <p className="mb-3 text-xs text-slate-500">
        Se cargan solos con el post partido y alimentan Rendimiento y la Memoria del ciclo. «Nota
        CT» es la del cuerpo técnico (1 a 10): en Rendimiento se compara con la automática.
      </p>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-2 py-2 text-right font-semibold">Nº</th>
              <th className="px-2 py-2 text-left font-semibold">Jugador</th>
              <th className="px-2 py-2 text-right font-semibold">Min</th>
              <th className="px-2 py-2 text-center font-semibold">Nota</th>
              <th className="px-2 py-2 text-center font-semibold" title="Nota del cuerpo técnico">
                Nota CT
              </th>
              <th className="px-2 py-2 text-right font-semibold">G</th>
              <th className="px-2 py-2 text-right font-semibold">A</th>
              <th className="px-2 py-2 text-center font-semibold">Tarj.</th>
              <th className="px-2 py-2 text-right font-semibold">xG</th>
              <th className="px-2 py-2 text-right font-semibold">Pases</th>
              <th className="px-2 py-2 text-right font-semibold">Duelos</th>
              <th className="px-2 py-2 text-right font-semibold">Recup.</th>
              <th className="px-2 py-2 text-right font-semibold">Pérd.</th>
              {hayFisico && (
                <>
                  <th className="px-2 py-2 text-right font-semibold">Km</th>
                  <th className="px-2 py-2 text-right font-semibold">Sprints</th>
                  <th className="px-2 py-2 text-right font-semibold">Vel. máx.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((j) => {
              const s = j.stats as Stats;
              const nota = j.nota === null ? null : Number(j.nota);
              const duelos = (s.duelos_ganados ?? 0) + (s.duelos_perdidos ?? 0);
              return (
                <tr key={j.jugador_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums text-slate-500">
                    {j.jugador?.numero ?? "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <Link
                      href={`/plantilla/${j.jugador_id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {j.jugador?.nombre ?? "Jugador"}
                    </Link>
                    {!j.titular && <span className="ml-1.5 text-xs text-slate-400">suplente</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{j.minutos}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-block min-w-[2.5rem] rounded px-1.5 py-0.5 text-xs font-bold tabular-nums",
                        claseNota(nota),
                      )}
                    >
                      {nota === null ? "—" : n(nota, 1)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NotaCuerpoTecnico
                      partidoId={partidoId}
                      jugadorId={j.jugador_id}
                      nombre={j.jugador?.nombre ?? "el jugador"}
                      inicial={valoraciones[j.jugador_id] ?? null}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{j.goles || ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{j.asistencias || ""}</td>
                  <td className="px-2 py-1.5 text-center text-xs">
                    {j.rojas > 0 ? (
                      <span className="font-semibold text-red-700">Roja</span>
                    ) : j.amarillas > 0 ? (
                      <span className="font-semibold text-yellow-700">
                        {j.amarillas === 2 ? "2 amarillas" : "Amarilla"}
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{n(s.xg, 2)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {s.pases_precisos ?? 0}/{s.pases ?? 0}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {s.duelos_ganados ?? 0}/{duelos}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{s.recuperaciones ?? 0}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{s.perdidas ?? 0}</td>
                  {hayFisico && (
                    <>
                      <td className="px-2 py-1.5 text-right tabular-nums">{n(s.km, 1)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{n(s.sprints)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {s.vel_max ? `${n(s.vel_max, 1)} km/h` : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
