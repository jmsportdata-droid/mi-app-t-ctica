import Link from "next/link";
import {
  MINIMOS_CON_SIN,
  conSin,
  por90,
  type ConSin,
  type JugadorPartido,
  type PartidoRend,
  type ResumenJugador,
} from "@/lib/rendimiento";
import { cn } from "@/lib/utils/cn";

const f = (x: number | null, d = 2) =>
  x === null
    ? "—"
    : x.toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Diferencia de xG por 90 con el jugador menos sin él (positivo: el equipo rinde más con él). */
export function impacto(c: ConSin): number | null {
  const con = por90(c.con.xgf - c.con.xgc, c.con.minutos);
  const sin = por90(c.sin.xgf - c.sin.xgc, c.sin.minutos);
  return con === null || sin === null ? null : con - sin;
}

/** Tarjeta del con y sin de un jugador (en la vista individual). */
export function TarjetaConSin({ datos }: { datos: ConSin }) {
  const filas: [string, (t: ConSin["con"]) => number, boolean][] = [
    ["Goles a favor /90", (t) => t.gf, true],
    ["Goles en contra /90", (t) => t.gc, false],
    ["xG a favor /90", (t) => t.xgf, true],
    ["xG en contra /90", (t) => t.xgc, false],
  ];
  const imp = impacto(datos);
  const suficiente =
    datos.con.minutos >= MINIMOS_CON_SIN.con && datos.sin.minutos >= MINIMOS_CON_SIN.sin;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        El equipo con él y sin él
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        {Math.round(datos.con.minutos)}′ con él en cancha y {Math.round(datos.sin.minutos)}′ sin él.
        {!suficiente && " Todavía son pocos minutos para sacar conclusiones."}
      </p>
      <table className="w-full max-w-lg text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-1 text-left font-semibold" />
            <th className="py-1 text-right font-semibold">Con él</th>
            <th className="py-1 text-right font-semibold">Sin él</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([label, v, masEsMejor]) => {
            const con = por90(v(datos.con), datos.con.minutos);
            const sin = por90(v(datos.sin), datos.sin.minutos);
            const mejor = con !== null && sin !== null && (masEsMejor ? con > sin : con < sin);
            return (
              <tr key={label} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-700">{label}</td>
                <td
                  className={cn(
                    "py-1.5 text-right tabular-nums",
                    mejor && "font-bold text-emerald-700",
                  )}
                >
                  {f(con)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">{f(sin)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {imp !== null && (
        <p className="mt-3 text-sm">
          Diferencia de xG por 90 con él:{" "}
          <b
            className={cn(
              "tabular-nums",
              imp > 0 ? "text-emerald-700" : imp < 0 ? "text-red-600" : "",
            )}
          >
            {imp > 0 ? "+" : ""}
            {f(imp)}
          </b>{" "}
          {imp > 0
            ? "(el equipo rinde mejor con él)"
            : imp < 0
              ? "(el equipo rinde mejor sin él)"
              : ""}
        </p>
      )}
    </section>
  );
}

/** Ranking de con y sin: cómo cambia el equipo con cada jugador en cancha. */
export function VistaConSin({
  resumen,
  partidos,
  jugadorPartidos,
}: {
  resumen: ResumenJugador[];
  partidos: PartidoRend[];
  jugadorPartidos: JugadorPartido[];
}) {
  const filas = resumen
    .filter((r) => r.minutos > 0)
    .map((r) => {
      const c = conSin(r.jugador.id, partidos, jugadorPartidos);
      return { r, c, imp: impacto(c) };
    })
    .sort((a, b) => (b.imp ?? -99) - (a.imp ?? -99));
  const sinTiros = partidos.every((p) => !p.tiros?.length);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Con y sin cada jugador</h2>
      <p className="mb-3 max-w-3xl text-xs text-slate-500">
        Goles y xG del equipo (a favor y en contra) por 90 minutos con el jugador en cancha y sin
        él, con los minutos exactos de entrada y salida. «Impacto» es la diferencia de xG (a favor
        menos en contra) por 90 entre con y sin. Es orientativo: depende del rival, del resultado y
        de con quién juega. Desde {MINIMOS_CON_SIN.con}′ con él y {MINIMOS_CON_SIN.sin}′ sin él.
      </p>
      {sinTiros ? (
        <p className="text-sm text-slate-500">Hace falta al menos un post partido con datos.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-2 text-left font-semibold">Jugador</th>
                <th className="px-2 py-2 text-right font-semibold">Min con</th>
                <th className="px-2 py-2 text-right font-semibold">GF-GC /90 con</th>
                <th className="px-2 py-2 text-right font-semibold">GF-GC /90 sin</th>
                <th className="px-2 py-2 text-right font-semibold">xG dif /90 con</th>
                <th className="px-2 py-2 text-right font-semibold">xG dif /90 sin</th>
                <th className="px-2 py-2 text-right font-semibold">Impacto</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ r, c, imp }) => {
                const ok =
                  c.con.minutos >= MINIMOS_CON_SIN.con && c.sin.minutos >= MINIMOS_CON_SIN.sin;
                const dif = (t: ConSin["con"], a: number, b: number) => {
                  const x = por90(a - b, t.minutos);
                  return x === null ? "—" : `${x > 0 ? "+" : ""}${f(x)}`;
                };
                return (
                  <tr
                    key={r.jugador.id}
                    className={cn(
                      "border-b border-slate-100 last:border-0",
                      !ok && "text-slate-400",
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <Link
                        href={`/rendimiento?vista=individual&jugador=${r.jugador.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.jugador.nombre}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {Math.round(c.con.minutos)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {dif(c.con, c.con.gf, c.con.gc)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {dif(c.sin, c.sin.gf, c.sin.gc)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {dif(c.con, c.con.xgf, c.con.xgc)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {dif(c.sin, c.sin.xgf, c.sin.xgc)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-1.5 text-right font-bold tabular-nums",
                        ok && imp !== null && imp > 0.2 && "text-emerald-700",
                        ok && imp !== null && imp < -0.2 && "text-red-600",
                      )}
                    >
                      {imp === null ? "—" : `${imp > 0 ? "+" : ""}${f(imp)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
