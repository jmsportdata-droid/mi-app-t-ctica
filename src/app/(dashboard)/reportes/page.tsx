import type { Metadata } from "next";
import Link from "next/link";
import { cicloDe, numeroMicrociclo } from "@/lib/calendario";
import { requerirTemporada } from "@/lib/contexto";
import { getReferenciasPartidos } from "@/lib/data/calendario";
import { getJugadores } from "@/lib/data/jugadores";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getSesionesReporte } from "@/lib/data/reportes";
import { calcularReporte } from "@/lib/reportes";
import { diaMes, nombreDia } from "@/lib/semana";
import { formatearSegundos } from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import { formatearDia, hoyISO, sumarDias } from "@/lib/utils/fecha";
import { INFO_MOMENTO } from "@/types/modelo-juego";
import { ESTADOS_ASISTENCIA } from "@/types/sesion";
import { INFO_TIPO_TAREA } from "@/types/tarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { BotonImprimir } from "@/components/microciclo/BotonImprimir";

export const metadata: Metadata = { title: "Reportes de entrenamiento" };

const CLASE_NAV =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";
const NOMBRE_MES = new Intl.DateTimeFormat("es-UY", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function mesSiguiente(mes: string, delta: number): string {
  const [anio, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio ?? 1970, (m ?? 1) - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Minutos redondeados para mostrar. */
const minutos = (seg: number) => formatearSegundos(Math.round(seg / 60) * 60);

interface Props {
  searchParams: { periodo?: string; partido?: string; mes?: string };
}

export default async function ReportesPage({ searchParams }: Props) {
  const { temporada, cuerpoTecnico } = await requerirTemporada();
  const hoy = hoyISO();
  const esMes = searchParams.periodo === "mes";
  const partidos = await getReferenciasPartidos(temporada.id);

  // Período: un microciclo (de partido a partido) o un mes calendario
  let desde: string;
  let hasta: string;
  let titulo: string;
  let hrefAnterior: string | null;
  let hrefSiguiente: string | null;
  if (esMes) {
    const mes =
      searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes)
        ? searchParams.mes
        : hoy.slice(0, 7);
    desde = `${mes}-01`;
    hasta = sumarDias(`${mesSiguiente(mes, 1)}-01`, -1);
    titulo = NOMBRE_MES.format(new Date(`${desde}T00:00:00Z`));
    hrefAnterior = `?periodo=mes&mes=${mesSiguiente(mes, -1)}`;
    hrefSiguiente = `?periodo=mes&mes=${mesSiguiente(mes, 1)}`;
  } else {
    const ciclo = cicloDe(partidos, hoy, searchParams.partido ?? null);
    const numero = numeroMicrociclo(partidos, ciclo);
    desde = ciclo.desde;
    hasta = ciclo.hasta;
    titulo = numero ? `Microciclo ${numero}` : "Microciclo";
    hrefAnterior = ciclo.anterior && `?partido=${ciclo.anterior}`;
    hrefSiguiente = ciclo.siguiente && `?partido=${ciclo.siguiente}`;
  }

  const [sesiones, { principios }, jugadores] = await Promise.all([
    // También las 4 semanas previas, para ver qué principios no se trabajaron
    getSesionesReporte(
      temporada.id,
      sumarDias(hasta, -27) < desde ? sumarDias(hasta, -27) : desde,
      hasta,
    ),
    getModeloJuego(cuerpoTecnico.id),
    getJugadores(temporada.id),
  ]);
  const r = calcularReporte({
    sesiones,
    desde,
    hasta,
    principios,
    partidos,
    agrupar: esMes ? "semana" : "dia",
  });
  const nombreJugador = new Map(jugadores.map((j) => [j.id, j.nombre]));
  const sinDatos = r.sesiones === 0;
  const maxMomento = Math.max(...r.porMomento.map((m) => m.segundos), r.sinObjetivo, 1);
  const maxTipo = Math.max(...r.porTipo.map((t) => t.segundos), 1);
  const maxVolumen = Math.max(...r.volumen.map((v) => v.segundos), 1);
  const maxPrincipio = Math.max(...r.principios.map((p) => p.segundos), 1);

  return (
    <>
      <PageHeader
        titulo={`Reporte de entrenamiento · ${titulo}`}
        descripcion={`Del ${formatearDia(desde)} al ${formatearDia(hasta)}. Lo planificado sale de las sesiones; lo real, de las sesiones cerradas.`}
        acciones={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
              <Link
                href="/reportes"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  !esMes ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                Microciclo
              </Link>
              <Link
                href="/reportes?periodo=mes"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  esMes ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                Mes
              </Link>
            </div>
            {hrefAnterior ? (
              <Link href={hrefAnterior} className={CLASE_NAV} aria-label="Anterior">
                ←
              </Link>
            ) : (
              <span className={`${CLASE_NAV} pointer-events-none opacity-40`} aria-hidden>
                ←
              </span>
            )}
            {hrefSiguiente ? (
              <Link href={hrefSiguiente} className={CLASE_NAV} aria-label="Siguiente">
                →
              </Link>
            ) : (
              <span className={`${CLASE_NAV} pointer-events-none opacity-40`} aria-hidden>
                →
              </span>
            )}
            <BotonImprimir />
          </div>
        }
      />

      {sinDatos && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-slate-600 print:hidden">
          Todavía no hay sesiones armadas en este período. El reporte se completa solo a medida que
          el cuerpo técnico arma las sesiones del microciclo y las cierra después de entrenar.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi
          label="Sesiones"
          valor={sinDatos ? "—" : String(r.sesiones)}
          detalle={sinDatos ? null : `${r.sesionesCerradas} cerradas`}
        />
        <Kpi label="Planificado" valor={sinDatos ? "—" : minutos(r.segundosPlanificados)} />
        <Kpi
          label="Real"
          valor={r.sesionesCerradas === 0 ? "—" : `${r.minutosReales}′`}
          detalle="de las sesiones cerradas"
        />
        <Kpi label="Tareas distintas" valor={sinDatos ? "—" : String(r.tareasDistintas)} />
        <Kpi
          label="Semana tipo"
          valor={r.encajeTotal === null ? "—" : `${r.encajeTotal}%`}
          detalle="del tiempo acorde al día"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque
          titulo="Minutos por momento del juego"
          ayuda="El tiempo de cada tarea se reparte entre los momentos de sus objetivos."
          vacio={r.porMomento.length === 0 && r.sinObjetivo === 0}
        >
          <ul className="space-y-2.5">
            {r.porMomento.map((m) => (
              <Barra
                key={m.momento}
                label={INFO_MOMENTO[m.momento].label}
                color={INFO_MOMENTO[m.momento].punto}
                valor={m.segundos}
                max={maxMomento}
                texto={minutos(m.segundos)}
              />
            ))}
            {r.sinObjetivo > 0 && (
              <Barra
                label="Sin objetivo del modelo (físico, entrada en calor…)"
                color="bg-slate-300"
                valor={r.sinObjetivo}
                max={maxMomento}
                texto={minutos(r.sinObjetivo)}
              />
            )}
          </ul>
        </Bloque>

        <Bloque
          titulo={esMes ? "Volumen por semana" : "Volumen por día"}
          ayuda="Minutos planificados en las sesiones."
          vacio={r.volumen.length === 0}
        >
          <ul className="space-y-2.5">
            {r.volumen.map((v) => (
              <Barra
                key={v.clave}
                label={
                  esMes
                    ? `Semana del ${diaMes(v.clave)}`
                    : `${nombreDia(v.clave)} ${diaMes(v.clave)}`
                }
                color="bg-brand-500"
                valor={v.segundos}
                max={maxVolumen}
                texto={minutos(v.segundos)}
              />
            ))}
          </ul>
        </Bloque>

        <Bloque
          titulo="Principios más trabajados"
          ayuda="Minutos por principio, con los subprincipios que más se tocaron."
          vacio={r.principios.length === 0}
        >
          <ul className="space-y-3">
            {r.principios.slice(0, 8).map((p) => (
              <li key={p.id} className="space-y-1">
                <Barra
                  label={p.nombre}
                  color={INFO_MOMENTO[p.momento].punto}
                  valor={p.segundos}
                  max={maxPrincipio}
                  texto={minutos(p.segundos)}
                />
                {p.subs.length > 0 && (
                  <p className="text-xs text-slate-500">{p.subs.slice(0, 3).join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        </Bloque>

        <Bloque
          titulo="Principios sin trabajar"
          ayuda="Ningún minuto en las 4 semanas previas al cierre del período."
          vacio={sinDatos}
        >
          {r.sinTrabajar.length === 0 ? (
            <p className="text-sm text-emerald-700">
              Se trabajaron todos los principios del modelo.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {r.sinTrabajar.map((p) => (
                <li
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200"
                >
                  <span
                    className={cn("h-2 w-2 rounded-full", INFO_MOMENTO[p.momento].punto)}
                    aria-hidden
                  />
                  {p.nombre}
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Tipos de tarea" vacio={r.porTipo.length === 0}>
          <ul className="space-y-2.5">
            {r.porTipo.map((t) => (
              <Barra
                key={t.tipo}
                label={`${INFO_TIPO_TAREA[t.tipo].label} (${t.tareas})`}
                color="bg-slate-500"
                valor={t.segundos}
                max={maxTipo}
                texto={minutos(t.segundos)}
              />
            ))}
          </ul>
        </Bloque>

        <Bloque
          titulo="Por día de la semana tipo"
          ayuda="m² por jugador promedio y cuánto del tiempo tuvo la orientación física que pide el día."
          vacio={r.porMD.length === 0}
        >
          <Tabla
            columnas={["Día", "Sesiones", "Minutos", "m²/jugador", "Encaje"]}
            filas={r.porMD.map((d) => [
              d.md,
              String(d.sesiones),
              minutos(d.segundos),
              d.m2PorJugador === null ? "—" : `${d.m2PorJugador} m²`,
              d.encaje === null ? "—" : `${d.encaje}%`,
            ])}
          />
        </Bloque>

        <Bloque titulo="Tareas más usadas" vacio={r.masUsadas.length === 0}>
          <Tabla
            columnas={["Tarea", "Tipo", "Veces", "Minutos"]}
            filas={r.masUsadas.map((t) => [
              t.nombre,
              INFO_TIPO_TAREA[t.tipo].label,
              String(t.veces),
              minutos(t.segundos),
            ])}
          />
        </Bloque>

        <Bloque
          titulo="Asistencia"
          ayuda="De las sesiones cerradas."
          vacio={r.asistencia.length === 0}
        >
          <Tabla
            columnas={["Jugador", ...ESTADOS_ASISTENCIA.map((e) => e.label), "% completo"]}
            filas={r.asistencia
              .map((a) => ({
                ...a,
                nombre: nombreJugador.get(a.jugadorId) ?? "Jugador dado de baja",
              }))
              .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
              .map((a) => [
                a.nombre,
                ...ESTADOS_ASISTENCIA.map((e) => String(a.conteo[e.valor])),
                `${Math.round((a.conteo.completo / a.total) * 100)}%`,
              ])}
          />
        </Bloque>
      </div>
    </>
  );
}

function Kpi({ label, valor, detalle }: { label: string; valor: string; detalle?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      {detalle && <p className="text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

function Bloque({
  titulo,
  ayuda,
  vacio,
  children,
}: {
  titulo: string;
  ayuda?: string;
  vacio: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{titulo}</h2>
      {ayuda && <p className="mt-0.5 text-xs text-slate-500">{ayuda}</p>}
      <div className="mt-4">
        {vacio ? (
          <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-400">
            Sin datos todavía
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Barra({
  label,
  color,
  valor,
  max,
  texto,
}: {
  label: string;
  color: string;
  valor: number;
  max: number;
  texto: string;
}) {
  return (
    <li className="list-none space-y-1">
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-slate-700 first-letter:uppercase">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-500">{texto}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.max(2, Math.round((valor / max) * 100))}%` }}
        />
      </div>
    </li>
  );
}

function Tabla({ columnas, filas }: { columnas: string[]; filas: string[][] }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {columnas.map((c, i) => (
              <th key={c} className={cn("px-1 py-2 font-semibold", i > 0 && "text-right")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {f.map((celda, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-1 py-2",
                    j === 0 ? "text-slate-800" : "text-right tabular-nums text-slate-600",
                  )}
                >
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
