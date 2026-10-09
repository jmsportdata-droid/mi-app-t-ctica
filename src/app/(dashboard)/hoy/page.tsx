import type { Metadata } from "next";
import Link from "next/link";
import { cicloDe, diasEntre, etiquetaMD, numerarSesiones, SEMANA_TIPO } from "@/lib/calendario";
import { requerirContexto } from "@/lib/contexto";
import { getActividades, getReferenciasPartidos } from "@/lib/data/calendario";
import { getDisponibilidadDelDia } from "@/lib/data/disponibilidad";
import { getJugadores } from "@/lib/data/jugadores";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getSesionesReporte } from "@/lib/data/reportes";
import { getResumenSesiones } from "@/lib/data/sesiones";
import { calcularReporte } from "@/lib/reportes";
import { formatearSegundos } from "@/lib/tareas";
import { cn } from "@/lib/utils/cn";
import { formatearDia, horaCorta, hoyISO, sumarDias } from "@/lib/utils/fecha";
import { INFO_ACTIVIDAD, llevaEjercicios } from "@/types/calendario";
import { INFO_ESTADO } from "@/types/disponibilidad";
import { INFO_MOMENTO } from "@/types/modelo-juego";
import { INFO_ORIENTACION } from "@/types/tarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { TarjetaActividad } from "@/components/calendario/TarjetaActividad";

export const metadata: Metadata = { title: "Hoy" };

const CLASE_BOTON =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

/** Pantalla de inicio: lo del día, la sesión, quién no está y lo que viene. */
export default async function HoyPage() {
  const { temporada, cuerpoTecnico, miembro } = await requerirContexto();
  const hoy = hoyISO();
  const manana = sumarDias(hoy, 1);

  if (!temporada) {
    return (
      <EmptyState
        titulo="No hay una temporada activa"
        descripcion="Creá o activá una temporada para empezar a cargar el día a día."
        accion={
          <Link href="/cuerpo-tecnico" className={CLASE_BOTON}>
            Ir a Cuerpo técnico
          </Link>
        }
      />
    );
  }

  const partidos = await getReferenciasPartidos(temporada.id);
  const ciclo = cicloDe(partidos, hoy);
  const proximo = partidos.find((p) => p.fecha >= hoy) ?? null;

  const [
    actividadesCiclo,
    disponibilidad,
    jugadores,
    sesiones4,
    { principios },
    actividadesProximo,
  ] = await Promise.all([
    getActividades(
      temporada.id,
      ciclo.desde < hoy ? ciclo.desde : hoy,
      manana > ciclo.hasta ? manana : ciclo.hasta,
    ),
    getDisponibilidadDelDia(temporada.id, hoy),
    getJugadores(temporada.id),
    getSesionesReporte(temporada.id, sumarDias(hoy, -27), hoy),
    getModeloJuego(cuerpoTecnico.id),
    proximo ? getActividades(temporada.id, proximo.fecha, proximo.fecha) : Promise.resolve([]),
  ]);

  const deHoy = actividadesCiclo.filter((a) => a.fecha === hoy);
  const deManana = actividadesCiclo.filter((a) => a.fecha === manana);
  const entrenamientosHoy = deHoy.filter((a) => llevaEjercicios(a.tipo));
  const resumenes = await getResumenSesiones(entrenamientosHoy.map((a) => a.id));
  const numeroSesion = numerarSesiones(
    actividadesCiclo.filter((a) => a.fecha >= ciclo.desde && a.fecha <= ciclo.hasta),
  );

  const md = etiquetaMD(hoy, partidos)?.texto ?? null;
  const diaTipo = md ? SEMANA_TIPO[md] : undefined;
  const actividadPartido = proximo
    ? actividadesProximo.find((a) => a.partido_id === proximo.id)
    : undefined;
  const faltan = proximo ? diasEntre(hoy, proximo.fecha) : null;

  const noDisponibles = jugadores
    .map((j) => ({ jugador: j, estado: disponibilidad[j.id] }))
    .filter((x) => x.estado && x.estado.estado !== "disponible");

  // Sesiones de los últimos 7 días con tareas y sin cerrar
  const sinCerrar = sesiones4.filter(
    (x) => x.fecha < hoy && x.fecha >= sumarDias(hoy, -7) && !x.cerrada && x.tareas.length > 0,
  );

  // Alerta del modelo: solo si ya se vienen armando sesiones
  const reporte4 =
    sesiones4.length > 0
      ? calcularReporte({
          sesiones: sesiones4,
          desde: sumarDias(hoy, -27),
          hasta: hoy,
          principios,
          partidos,
          agrupar: "semana",
        })
      : null;

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Hola, {miembro.nombre.split(" ")[0]}</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 first-letter:uppercase">
            {formatearDia(hoy)}
          </h1>
          {(md || diaTipo) && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {md && (
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                  {md}
                </span>
              )}
              {diaTipo && (
                <>
                  <strong className="text-slate-900">
                    {INFO_ORIENTACION[diaTipo.orientacion].label}
                  </strong>
                  {diaTipo.foco}
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/microciclo" className={CLASE_BOTON}>
            Microciclo
          </Link>
          <Link href="/calendario/semana" className={CLASE_BOTON}>
            Compartir semana
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Bloque
            titulo="Hoy"
            accion={
              <Link
                href={`/calendario/nueva?fecha=${hoy}`}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                + Agregar actividad
              </Link>
            }
          >
            {deHoy.length === 0 ? (
              <p className="text-sm text-slate-500">No hay actividades cargadas para hoy.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {deHoy.map((a) => (
                  <TarjetaActividad
                    key={a.id}
                    actividad={a}
                    resumen={resumenes.get(a.id)}
                    numeroSesion={numeroSesion.get(a.id)}
                  />
                ))}
              </div>
            )}
          </Bloque>

          {entrenamientosHoy.length > 0 && (
            <Bloque titulo="Sesión del día">
              <ul className="space-y-3">
                {entrenamientosHoy.map((a) => {
                  const r = resumenes.get(a.id);
                  const n = numeroSesion.get(a.id);
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {n ? `Sesión ${n}` : "Sesión"}
                          {horaCorta(a.hora_inicio) && ` · ${horaCorta(a.hora_inicio)}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {!r || r.tareas === 0
                            ? "Todavía sin tareas"
                            : `${r.tareas} tareas · ${formatearSegundos(r.segundos)} planificados`}
                          {r?.cerrada ? " · cerrada" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/microciclo/sesion/${a.id}`} className={CLASE_BOTON}>
                          {!r || r.tareas === 0
                            ? "Armar sesión"
                            : r.cerrada
                              ? "Ver sesión"
                              : "Ver o cerrar"}
                        </Link>
                        {r && r.tareas > 0 && (
                          <Link
                            href={`/imprimir/sesion/${a.id}`}
                            target="_blank"
                            className={CLASE_BOTON}
                          >
                            Planilla PDF ↗
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Bloque>
          )}

          <Bloque
            titulo="Mañana"
            accion={
              deManana.length > 0 && (
                <a
                  href={`/compartir/dia?fecha=${manana}&descargar=1`}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  ↓ Imagen para el grupo
                </a>
              )
            }
          >
            {deManana.length === 0 ? (
              <p className="text-sm text-slate-500">Nada cargado para mañana.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {deManana.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", INFO_ACTIVIDAD[a.tipo].punto)}
                      aria-hidden
                    />
                    <span className="w-24 shrink-0 tabular-nums text-slate-500">
                      {horaCorta(a.hora_inicio) ?? "Todo el día"}
                    </span>
                    <span className="font-medium text-slate-800">{a.titulo}</span>
                    {a.hora_citacion && (
                      <span className="ml-auto text-xs text-slate-500">
                        Citación {horaCorta(a.hora_citacion)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Bloque>
        </div>

        <aside className="space-y-6">
          {sinCerrar.length > 0 && (
            <Bloque titulo="Sesiones sin cerrar">
              <p className="mb-2 text-xs text-slate-500">
                Cargá los minutos reales y la asistencia para que sumen en los reportes.
              </p>
              <ul className="space-y-1.5 text-sm">
                {sinCerrar.map((x) => (
                  <li key={x.actividadId}>
                    <Link
                      href={`/microciclo/sesion/${x.actividadId}`}
                      className="font-medium text-brand-700 hover:underline first-letter:uppercase"
                    >
                      {formatearDia(x.fecha)}
                    </Link>
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          <Bloque titulo="Próximo partido">
            {!proximo ? (
              <p className="text-sm text-slate-500">
                No hay partidos cargados por delante.{" "}
                <Link href="/partidos/nuevo" className="font-medium text-brand-700 hover:underline">
                  Cargar partido
                </Link>
              </p>
            ) : (
              <Link
                href={`/partidos/${proximo.id}`}
                className="block rounded-xl bg-slate-900 p-4 text-white hover:bg-slate-800"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {faltan === 0 ? "Hoy" : faltan === 1 ? "Mañana" : `En ${faltan} días`}
                </p>
                <p className="mt-1 text-lg font-bold">{actividadPartido?.titulo ?? "Partido"}</p>
                <p className="text-sm text-slate-300 first-letter:uppercase">
                  {formatearDia(proximo.fecha)}
                  {actividadPartido?.hora_inicio && ` · ${horaCorta(actividadPartido.hora_inicio)}`}
                </p>
                {actividadPartido?.lugar && (
                  <p className="text-sm text-slate-300">{actividadPartido.lugar}</p>
                )}
              </Link>
            )}
          </Bloque>

          <Bloque
            titulo="Disponibilidad"
            accion={
              <Link
                href="/plantilla/disponibilidad"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Cargar
              </Link>
            }
          >
            {jugadores.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no hay plantel cargado.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  <strong className="text-2xl font-bold text-slate-900">
                    {jugadores.length - noDisponibles.length}
                  </strong>{" "}
                  de {jugadores.length} disponibles
                </p>
                {noDisponibles.length > 0 && (
                  <ul className="space-y-1.5 text-sm">
                    {noDisponibles.map(({ jugador, estado }) => (
                      <li key={jugador.id} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            INFO_ESTADO[estado!.estado].punto,
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-slate-800">
                          {jugador.nombre}
                        </span>
                        <span className="text-xs text-slate-500">
                          {INFO_ESTADO[estado!.estado].label}
                          {estado!.fecha_regreso &&
                            ` · vuelve ${estado!.fecha_regreso.slice(8, 10)}/${estado!.fecha_regreso.slice(5, 7)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Bloque>

          {reporte4 && reporte4.sinTrabajar.length > 0 && (
            <Bloque
              titulo="Sin trabajar en 4 semanas"
              accion={
                <Link
                  href="/reportes"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  Reportes
                </Link>
              }
            >
              <ul className="flex flex-wrap gap-2">
                {reporte4.sinTrabajar.map((p) => (
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
            </Bloque>
          )}
        </aside>
      </div>
    </>
  );
}

function Bloque({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}
