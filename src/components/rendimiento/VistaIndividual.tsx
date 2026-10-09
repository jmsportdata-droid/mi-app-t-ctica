import Link from "next/link";
import { indiceAereo } from "@/lib/aereo";
import {
  LINEAS,
  MINUTOS_MINIMOS,
  mediaMovil,
  perfilJugador,
  type Alerta,
  type JugadorPartido,
  type PartidoRend,
  type ResumenJugador,
  type Valoracion,
} from "@/lib/rendimiento";
import { cn } from "@/lib/utils/cn";
import { BarraPorcentaje, GraficoEvolucion } from "./Graficos";
import { SelectorParametro } from "./Filtros";

const fechaCorta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;
const num = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined
    ? "—"
    : x.toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Ficha de rendimiento de un jugador: uso, notas, perfil cada 90′ frente a su línea y físico. */
export function VistaIndividual({
  resumen,
  elegido,
  partidos,
  jugadorPartidos,
  valoraciones,
  alertas,
}: {
  resumen: ResumenJugador[];
  elegido: ResumenJugador;
  partidos: PartidoRend[];
  jugadorPartidos: JugadorPartido[];
  valoraciones: Valoracion[];
  alertas: Alerta[];
}) {
  const j = elegido.jugador;
  const porPartido = partidos.map((p) => ({
    p,
    jp: jugadorPartidos.find((x) => x.partidoId === p.id && x.jugadorId === j.id) ?? null,
    ct: valoraciones.find((v) => v.partidoId === p.id && v.jugadorId === j.id)?.nota ?? null,
  }));
  const notas = porPartido.map((x) => x.jp?.nota ?? null);
  const medias = mediaMovil(notas);
  const perfil = perfilJugador(elegido, resumen);
  const velMax = Math.max(
    0,
    ...jugadorPartidos
      .filter((x) => x.jugadorId === j.id)
      .map((x) => (typeof x.stats.vel_max === "number" ? x.stats.vel_max : 0)),
  );
  const ext = j.estadisticas_externas;
  const indice = indiceAereo({
    altura_cm: j.altura_cm,
    minutos: ext.minutos,
    aereos_90: ext.aereos_90,
    aereos_pct: ext.aereos_pct,
    cabezazos_abp: ext.cabezazos_abp,
  });
  const suyas = alertas.filter((a) => a.jugadorId === j.id);
  const linea = LINEAS.find((l) => l.valor === j.posicion)?.label ?? j.posicion;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SelectorParametro
          parametro="jugador"
          label="Jugador"
          valor={j.id}
          opciones={[...resumen]
            .sort((a, b) => b.minutos - a.minutos)
            .map((r) => ({
              valor: r.jugador.id,
              label: `${r.jugador.numero ? `${r.jugador.numero}. ` : ""}${r.jugador.nombre} (${r.minutos}′)`,
              grupo: LINEAS.find((l) => l.valor === r.jugador.posicion)?.label,
            }))}
        />
        <Link
          href={`/plantilla/${j.id}`}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Ficha del jugador →
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            {j.numero !== null && <span className="mr-2 text-slate-400">{j.numero}</span>}
            {j.nombre}
          </h2>
          <span className="text-sm text-slate-500">
            {[linea, elegido.edad !== null && `${elegido.edad} años`, j.nacionalidad]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {j.formado_en_club && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
              Formado en el club
            </span>
          )}
          {j.fecha_debut && (
            <span className="text-xs text-slate-500">
              Debut: {j.fecha_debut.split("-").reverse().join("/")}
            </span>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {(
            [
              ["PJ", elegido.partidos],
              ["Titular", elegido.titular],
              ["Minutos", elegido.minutos],
              ["% min.", `${elegido.pctMinutos}%`],
              ["Goles", elegido.goles],
              ["Asist.", elegido.asistencias],
              ["Tarjetas", `${elegido.amarillas}A${elegido.rojas ? ` ${elegido.rojas}R` : ""}`],
              ["Nota", num(elegido.nota)],
              ["Nota CT", num(elegido.notaCt)],
            ] as [string, string | number][]
          ).map(([label, valor]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="text-lg font-bold tabular-nums text-slate-900">{valor}</dd>
            </div>
          ))}
        </dl>
        {suyas.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {suyas.map((a) => (
              <li
                key={a.texto}
                className={a.nivel === "alerta" ? "text-red-700" : "text-amber-800"}
              >
                ⚠ {a.texto}
              </li>
            ))}
          </ul>
        )}
      </section>

      {partidos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Minutos por partido
            </h3>
            <GraficoEvolucion
              className="h-32"
              puntos={porPartido.map((x) => ({
                etiqueta: `${fechaCorta(x.p.fecha)} ${x.p.rival}`,
                valor: x.jp?.minutos ?? 0,
              }))}
              formato={(v) => `${v ?? 0}′`}
            />
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Nota automática vs nota del cuerpo técnico
            </h3>
            <p className="text-xs text-slate-500">
              Barras: Sofascore · puntos: cuerpo técnico · línea: media de 5
            </p>
            <GraficoEvolucion
              className="h-32"
              puntos={porPartido.map((x, i) => ({
                etiqueta: `${fechaCorta(x.p.fecha)} ${x.p.rival}`,
                valor: x.jp?.nota ?? null,
                media: medias[i] ?? null,
                referencia: x.ct,
              }))}
              formato={(v) => num(v)}
            />
          </section>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Perfil de {linea.toLowerCase()}, cada 90′
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Comparado con los {linea.toLowerCase()} del plantel con al menos {MINUTOS_MINIMOS}′. La
          barra es su percentil dentro de la línea (100 = el mejor).
        </p>
        {elegido.minutos < MINUTOS_MINIMOS ? (
          <p className="text-sm text-slate-500">
            Todavía tiene {elegido.minutos}′: el perfil se muestra desde los {MINUTOS_MINIMOS}′.
          </p>
        ) : (
          <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
            {perfil.map((f) => (
              <li key={f.metrica.clave} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800">{f.metrica.label}</span>
                  <span className="tabular-nums">
                    <b>
                      {f.valor === null
                        ? "—"
                        : f.metrica.tipo === "%"
                          ? `${f.valor}%`
                          : num(f.valor, f.metrica.decimales ?? 1)}
                    </b>
                    <span className="ml-1.5 text-xs text-slate-500">
                      línea{" "}
                      {f.promedioLinea === null
                        ? "—"
                        : f.metrica.tipo === "%"
                          ? `${Math.round(f.promedioLinea)}%`
                          : num(f.promedioLinea, f.metrica.decimales ?? 1)}
                    </span>
                  </span>
                </div>
                {f.percentil !== null ? (
                  <div className="flex items-center gap-2">
                    <BarraPorcentaje
                      valor={f.percentil}
                      className={cn(
                        f.percentil >= 67
                          ? "bg-emerald-600"
                          : f.percentil >= 34
                            ? "bg-slate-400"
                            : "bg-amber-500",
                      )}
                    />
                    <span className="w-10 text-right text-xs tabular-nums text-slate-500">
                      p{f.percentil}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Faltan compañeros de línea para comparar.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {velMax > 0 && (
          <p className="mt-3 text-sm text-slate-600">
            Velocidad máxima registrada: <b className="tabular-nums">{num(velMax)} km/h</b>
          </p>
        )}
      </section>

      {typeof ext.minutos === "number" && ext.minutos > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Últimos partidos según Sofascore
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Totales que se actualizan desde el Plantel (incluyen partidos sin post partido en la
            app).
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                ["Minutos", ext.minutos],
                ["Nota", ext.nota ?? "—"],
                ["Goles", ext.goles ?? 0],
                ["xG", ext.xg ?? 0],
                [
                  "Aéreos",
                  `${ext.aereos_ganados ?? 0}${ext.aereos_pct != null ? ` (${ext.aereos_pct}%)` : ""}`,
                ],
                ["Duelos ganados", ext.duelos_ganados ?? 0],
                ["Índice aéreo", indice === null ? "—" : `${indice}/100`],
              ] as [string, string | number][]
            ).map(([label, valor]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="font-semibold tabular-nums text-slate-900">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
