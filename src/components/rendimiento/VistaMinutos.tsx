import Link from "next/link";
import { minutosPorLinea, type ResumenJugador } from "@/lib/rendimiento";
import { cn } from "@/lib/utils/cn";
import { ESTADOS_DISPONIBILIDAD, type EstadoDelDia } from "@/types/disponibilidad";
import { BarraPorcentaje, GraficoDispersion } from "./Graficos";

const apellido = (n: string) => n.split(" ").slice(-1)[0] ?? n;

/** Minutos por jugador y por línea, edad, juveniles, extranjeros y disponibilidad. */
export function VistaMinutos({
  resumen,
  partidosConDatos,
  disponibilidad,
  inicioTemporada,
}: {
  resumen: ResumenJugador[];
  partidosConDatos: number;
  disponibilidad: Record<string, EstadoDelDia>;
  inicioTemporada: string;
}) {
  const total = resumen.reduce((a, r) => a + r.minutos, 0);
  const usados = resumen.filter((r) => r.minutos > 0);
  const pct = (f: (r: ResumenJugador) => boolean) =>
    total ? Math.round((100 * resumen.filter(f).reduce((a, r) => a + r.minutos, 0)) / total) : null;
  const conEdad = usados.filter((r) => r.edad !== null);
  const edadMedia = conEdad.length
    ? conEdad.reduce((a, r) => a + r.edad! * r.minutos, 0) /
      Math.max(
        1,
        conEdad.reduce((a, r) => a + r.minutos, 0),
      )
    : null;
  const debutantes = resumen.filter(
    (r) => r.jugador.fecha_debut && r.jugador.fecha_debut >= inicioTemporada,
  );
  const estados = ESTADOS_DISPONIBILIDAD.map((e) => ({
    ...e,
    cantidad: resumen.filter(
      (r) => (disponibilidad[r.jugador.id]?.estado ?? "disponible") === e.valor,
    ).length,
  }));
  const ordenados = [...resumen].sort((a, b) => b.minutos - a.minutos);
  const edades = resumen.map((r) => r.edad).filter((e): e is number => e !== null);

  const tarjetas: [string, string, string][] = [
    ["Jugadores usados", `${usados.length}/${resumen.length}`, "con minutos en el período"],
    [
      "Minutos de formados en el club",
      pct((r) => r.jugador.formado_en_club) === null
        ? "—"
        : `${pct((r) => r.jugador.formado_en_club)}%`,
      `${resumen.filter((r) => r.jugador.formado_en_club).length} juveniles en el plantel`,
    ],
    [
      "Minutos de extranjeros",
      pct((r) => r.extranjero) === null ? "—" : `${pct((r) => r.extranjero)}%`,
      `${resumen.filter((r) => r.extranjero).length} en el plantel`,
    ],
    [
      "Edad media en cancha",
      edadMedia === null ? "—" : edadMedia.toFixed(1),
      "ponderada por minutos",
    ],
    ["Debutantes", String(debutantes.length), "debut en Primera esta temporada"],
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tarjetas.map(([label, valor, detalle]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</dd>
            <dd className="text-xs text-slate-500">{detalle}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Minutos por línea
          </h2>
          <ul className="space-y-3">
            {minutosPorLinea(resumen).map((l) => (
              <li key={l.valor} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-800">{l.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {l.minutos}′ · {l.pct}% · {l.usados} usados
                  </span>
                </div>
                <BarraPorcentaje valor={l.pct} />
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Disponibilidad hoy
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {estados.map((e) => (
              <li key={e.valor} className={cn("rounded-xl px-4 py-3 ring-1 ring-inset", e.chip)}>
                <p className="text-2xl font-bold tabular-nums">{e.cantidad}</p>
                <p className="text-xs font-medium">{e.label}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/plantilla"
            className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline"
          >
            Cargar la disponibilidad en el Plantel →
          </Link>
        </section>
      </div>

      {usados.length > 0 && edades.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Edad y minutos
          </h2>
          <p className="mb-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>
              <span
                className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400"
                aria-hidden
              />
              Formado en el club
            </span>
            <span>
              <span
                className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-brand-500/70"
                aria-hidden
              />
              Extranjero
            </span>
          </p>
          <GraficoDispersion
            ejeX="Edad"
            ejeY="Minutos"
            minX={Math.min(...edades, 17)}
            maxX={Math.max(...edades, 35)}
            puntos={resumen
              .filter((r) => r.edad !== null)
              .map((r) => ({
                id: r.jugador.id,
                x: r.edad!,
                y: r.minutos,
                etiqueta: apellido(r.jugador.nombre),
                destacado: r.jugador.formado_en_club,
                marcado: r.extranjero,
              }))}
          />
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Minutos por jugador ({partidosConDatos} partidos con datos)
        </h2>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-2 text-left font-semibold">Jugador</th>
                <th className="w-48 px-2 py-2 text-left font-semibold">% de los minutos</th>
                <th className="px-2 py-2 text-right font-semibold">Min</th>
                <th className="px-2 py-2 text-right font-semibold">PJ</th>
                <th className="px-2 py-2 text-right font-semibold">Tit.</th>
                <th className="px-2 py-2 text-right font-semibold">G</th>
                <th className="px-2 py-2 text-right font-semibold">A</th>
                <th className="px-2 py-2 text-right font-semibold">AM</th>
                <th className="px-2 py-2 text-right font-semibold">Nota</th>
                <th className="px-2 py-2 text-right font-semibold">Nota CT</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((r) => (
                <tr key={r.jugador.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5">
                    <Link
                      href={`/rendimiento?vista=individual&jugador=${r.jugador.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      <span className="mr-1.5 inline-block w-5 text-right text-xs font-bold text-slate-500">
                        {r.jugador.numero ?? ""}
                      </span>
                      {r.jugador.nombre}
                    </Link>
                    {r.jugador.formado_en_club && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">
                        JUV
                      </span>
                    )}
                    {r.edad !== null && (
                      <span className="ml-1.5 text-xs text-slate-400">{r.edad} años</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <BarraPorcentaje valor={r.pctMinutos} />
                      <span className="w-9 text-right text-xs tabular-nums text-slate-500">
                        {r.pctMinutos}%
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.minutos}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.partidos}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.titular}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.goles || ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.asistencias || ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {r.amarillas || ""}
                    {r.rojas ? ` · ${r.rojas}R` : ""}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                    {r.nota === null ? "—" : r.nota.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {r.notaCt === null ? "—" : r.notaCt.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
