"use client";

import Link from "next/link";
import {
  fijarMarca,
  guardarRivalesMarcas,
  reiniciarMarcas,
} from "@/app/(dashboard)/partidos/marcas-actions";
import {
  alertasMarcas,
  emparejarMarcas,
  puntajeAereo,
  UMBRAL_DUELO,
  type JugadorAereo,
  type NivelDuelo,
} from "@/lib/marcas";
import { cn } from "@/lib/utils/cn";
import type { MarcasPartido } from "@/lib/data/marcas";
import type { Jugador } from "@/types/jugador";
import type { InformeRivalDatos, JugadorRival } from "@/types/informe";
import { useAccion } from "@/components/ui/useAccion";

/** Cuántos rivales se marcan al hombre si el cuerpo técnico no elige. */
const MARCAS_POR_DEFECTO = 6;
/** Candidatos del rival que se muestran para elegir a quién marcar. */
const CANDIDATOS_RIVAL = 16;

type Stats = Record<string, number | null | undefined>;

const NIVEL: Record<NivelDuelo, { label: string; clase: string }> = {
  ventaja: { label: "Ventaja", clase: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  parejo: { label: "Parejo", clase: "bg-amber-100 text-amber-800 ring-amber-200" },
  desventaja: { label: "Desventaja", clase: "bg-red-100 text-red-800 ring-red-200" },
};

function aereoDe(
  id: string,
  nombre: string,
  dorsal: number | null,
  altura: number | null,
  e: Stats,
): JugadorAereo {
  return {
    id,
    nombre,
    dorsal,
    altura_cm: altura,
    ...puntajeAereo({
      altura_cm: altura,
      minutos: e.minutos,
      aereos_90: e.aereos_90,
      aereos_pct: e.aereos_pct,
      cabezazos_abp: e.cabezazos_abp,
    }),
  };
}

/**
 * Quién marca a quién en la pelota quieta defensiva: sugiere las parejas con el
 * índice aéreo de los dos planteles (Sofascore), marca en color la ventaja de
 * cada duelo y avisa de los que perdemos. Los cambios a mano se guardan.
 */
export function EmparejamientoMarcas({
  partidoId,
  plantelRival,
  informe,
  jugadores,
  titulares,
  convocados,
  marcas,
}: {
  partidoId: string;
  plantelRival: JugadorRival[];
  informe: InformeRivalDatos | null;
  jugadores: Jugador[];
  titulares: string[];
  convocados: string[];
  marcas: MarcasPartido;
}) {
  const accion = useAccion();
  const datos = (informe?.datos ?? {}) as {
    once?: { jugadores?: { id: number | string }[] };
    pelota_parada?: { favor?: { rematadores?: [string, number][] } };
  };

  // Rival: jugadores de campo, con su puntaje y sus remates en ABP
  const remates = new Map(datos.pelota_parada?.favor?.rematadores ?? []);
  const enElOnce = new Set((datos.once?.jugadores ?? []).map((j) => String(j.id)));
  const rivales = plantelRival
    .filter((j) => j.posicion !== "G")
    .map((j) => ({
      ...aereoDe(j.id, j.corto ?? j.nombre, j.dorsal, j.altura_cm, j.estadisticas as Stats),
      sofascoreId: j.sofascore_id,
      minutos: (j.estadisticas as Stats).minutos ?? 0,
      remates: remates.get(j.corto ?? "") ?? 0,
    }))
    .sort((a, b) => b.puntaje - a.puntaje);
  const sugeridos = (() => {
    const base = enElOnce.size
      ? rivales.filter((r) => enElOnce.has(r.sofascoreId))
      : rivales.filter((r) => r.minutos > 0);
    return base.slice(0, MARCAS_POR_DEFECTO).map((r) => r.id);
  })();
  const aMarcar = new Set(marcas.rivales ?? sugeridos);
  const candidatosRival = [
    ...rivales.filter((r) => aMarcar.has(r.id)),
    ...rivales.filter((r) => !aMarcar.has(r.id) && r.minutos > 0),
  ].slice(0, Math.max(CANDIDATOS_RIVAL, aMarcar.size));

  // Nuestros: los titulares; si no hay, los convocados; si no, todo el plantel
  const fuente = titulares.length
    ? { ids: new Set(titulares), texto: "los titulares" }
    : convocados.length
      ? { ids: new Set(convocados), texto: "los convocados (todavía no hay once)" }
      : { ids: null, texto: "todo el plantel (todavía no hay convocatoria)" };
  const propios = jugadores
    .filter((j) => j.posicion !== "POR" && (fuente.ids ? fuente.ids.has(j.id) : true))
    .map((j) => aereoDe(j.id, j.nombre, j.numero, j.altura_cm, j.estadisticas_sofascore as Stats));
  const sinDatos = propios.filter((p) => p.estimado).length;

  const { parejas, libres } = emparejarMarcas(
    rivales.filter((r) => aMarcar.has(r.id)),
    propios,
    marcas.parejas,
  );
  const alertas = alertasMarcas(parejas);
  const hayCambios = marcas.rivales !== null || Object.keys(marcas.parejas).length > 0;

  function alternarRival(id: string) {
    const x = new Set(aMarcar);
    if (x.has(id)) x.delete(id);
    else if (x.size < 11) x.add(id);
    accion.ejecutar(() => guardarRivalesMarcas(partidoId, [...x]));
  }

  if (plantelRival.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
        <h2 className="mb-1 font-semibold text-slate-900">Emparejamiento de marcas</h2>
        Generá el informe del rival desde Sofascore (paso 2) para traer su plantel con altura y
        juego aéreo. Con eso se sugiere quién marca a quién.
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h2 className="font-semibold text-slate-900">Emparejamiento de marcas (ABP defensiva)</h2>
          <p className="text-xs text-slate-500">
            Puntaje aéreo 0-100: altura, aéreos ganados cada 90′, % de aéreos y remates de cabeza en
            ABP (Sofascore, últimos partidos). El más peligroso de ellos va con nuestro mejor
            cabeceador, y así. Con «~» el puntaje sale solo de la altura (jugó menos de 90′).
            Candidatos nuestros: {fuente.texto}, sin arqueros.
          </p>
        </div>
        {hayCambios && (
          <button
            type="button"
            disabled={accion.pendiente}
            onClick={() => accion.ejecutar(() => reiniciarMarcas(partidoId))}
            className="text-sm font-medium text-slate-600 hover:underline disabled:opacity-50"
          >
            Volver a la sugerencia
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          A quién marcamos al hombre ({aMarcar.size})
          {!marcas.rivales && enElOnce.size > 0 && (
            <span className="ml-1 font-normal normal-case">
              · sugeridos del once probable del rival
            </span>
          )}
        </h3>
        <ul className="flex flex-wrap gap-1.5">
          {candidatosRival.map((r) => {
            const activo = aMarcar.has(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={activo}
                  disabled={accion.pendiente}
                  onClick={() => alternarRival(r.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-60",
                    activo
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  {r.dorsal !== null && `${r.dorsal}. `}
                  {r.nombre} · {r.estimado ? "~" : ""}
                  {r.puntaje}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {parejas.length > 0 && (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-2 text-left font-semibold">Rival</th>
                <th className="px-2 py-2 text-right font-semibold">Altura</th>
                <th className="px-2 py-2 text-right font-semibold">Puntaje</th>
                <th className="px-2 py-2 text-center font-semibold">Duelo</th>
                <th className="px-2 py-2 text-left font-semibold">Lo marca</th>
                <th className="px-2 py-2 text-right font-semibold">Altura</th>
              </tr>
            </thead>
            <tbody>
              {parejas.map((p) => {
                const r = rivales.find((x) => x.id === p.rival.id);
                return (
                  <tr key={p.rival.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2">
                      <span className="mr-1.5 inline-block w-5 text-right text-xs font-bold tabular-nums text-slate-500">
                        {p.rival.dorsal ?? "—"}
                      </span>
                      <span className="font-medium text-slate-900">{p.rival.nombre}</span>
                      {r && r.remates > 0 && (
                        <span className="ml-1.5 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">
                          {r.remates} remates en ABP
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                      {p.rival.altura_cm ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">
                      {p.rival.estimado ? "~" : ""}
                      {p.rival.puntaje}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {p.nivel && p.diferencia !== null ? (
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                            NIVEL[p.nivel].clase,
                          )}
                          title={`Diferencia de puntaje: ${p.diferencia > 0 ? "+" : ""}${p.diferencia}`}
                        >
                          {NIVEL[p.nivel].label} {p.diferencia > 0 ? "+" : ""}
                          {p.diferencia}
                        </span>
                      ) : (
                        <span className="text-xs text-red-600">Sin marca</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <select
                        aria-label={`Quién marca a ${p.rival.nombre}`}
                        value={p.manual && p.propio ? p.propio.id : ""}
                        disabled={accion.pendiente}
                        onChange={(e) =>
                          accion.ejecutar(() =>
                            fijarMarca(partidoId, p.rival.id, e.target.value || null),
                          )
                        }
                        className={cn(
                          "w-full max-w-[16rem] rounded-lg border-slate-300 py-1 text-sm",
                          p.manual && "border-brand-400 bg-brand-50/40",
                        )}
                      >
                        <option value="">
                          {!p.manual && p.propio
                            ? `Sugerido: ${p.propio.dorsal !== null ? `${p.propio.dorsal}. ` : ""}${p.propio.nombre} (${p.propio.estimado ? "~" : ""}${p.propio.puntaje})`
                            : "Sugerencia automática"}
                        </option>
                        {[...propios]
                          .sort((a, b) => b.puntaje - a.puntaje)
                          .map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.dorsal !== null ? `${j.dorsal}. ` : ""}
                              {j.nombre} ({j.estimado ? "~" : ""}
                              {j.puntaje})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                      {p.propio?.altura_cm ?? "—"}
                      {p.difAltura !== null && (
                        <span
                          className={cn(
                            "ml-1 text-xs",
                            p.difAltura < 0 ? "text-red-600" : "text-emerald-700",
                          )}
                        >
                          ({p.difAltura > 0 ? "+" : ""}
                          {p.difAltura})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Alertas</h3>
          {alertas.length === 0 ? (
            <p className="text-sm text-emerald-700">
              Ningún duelo en desventaja (más de {UMBRAL_DUELO} puntos abajo).
            </p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-800">
              {alertas.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Libres para las zonas</h3>
          <p className="mb-2 text-xs text-slate-500">
            Los que no marcan a nadie, mejor puntaje primero: los de arriba para primer palo y punto
            penal.
          </p>
          {libres.length === 0 ? (
            <p className="text-sm text-slate-500">No queda nadie libre.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {libres.map((j) => (
                <li
                  key={j.id}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {j.dorsal !== null && `${j.dorsal}. `}
                  {j.nombre} · {j.estimado ? "~" : ""}
                  {j.puntaje}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {sinDatos > 0 && (
        <p className="text-xs text-slate-500">
          {sinDatos} de los nuestros no tienen minutos en Sofascore y se estiman por altura.
          Actualizá los datos desde el{" "}
          <Link href="/plantilla" className="font-medium text-brand-700 hover:underline">
            Plantel
          </Link>
          .
        </p>
      )}
      {accion.error && <p className="text-sm text-red-600">{accion.error}</p>}
    </section>
  );
}
