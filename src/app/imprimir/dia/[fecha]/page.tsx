import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirTemporada } from "@/lib/contexto";
import { getActividades, getReferenciasPartidos } from "@/lib/data/calendario";
import { getDisponibilidadDelDia } from "@/lib/data/disponibilidad";
import { getJugadores } from "@/lib/data/jugadores";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getSesionCompleta, getUbicacionSesion } from "@/lib/data/sesiones";
import { etiquetaMD, SEMANA_TIPO } from "@/lib/calendario";
import { formatearSegundos } from "@/lib/tareas";
import { formatearDia, horaCorta } from "@/lib/utils/fecha";
import { INFO_ACTIVIDAD, llevaEjercicios } from "@/types/calendario";
import { INFO_ESTADO } from "@/types/disponibilidad";
import { indiceObjetivos } from "@/types/modelo-juego";
import { INFO_ORIENTACION } from "@/types/tarea";
import { BotonImprimir } from "@/components/microciclo/BotonImprimir";
import { PlanillaSesion } from "@/components/microciclo/PlanillaSesion";

export const metadata: Metadata = { title: "Día de entrenamiento" };

/** El día completo: la agenda con todos los bloques y la planilla de cada uno con ejercicios. */
export default async function DiaImprimirPage({ params }: { params: { fecha: string } }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.fecha)) notFound();
  const fecha = params.fecha;
  const { temporada, cuerpoTecnico } = await requerirTemporada();
  const [actividades, partidos, { principios, contenidos }, jugadores, disponibilidad] =
    await Promise.all([
      getActividades(temporada.id, fecha, fecha),
      getReferenciasPartidos(temporada.id),
      getModeloJuego(cuerpoTecnico.id),
      getJugadores(temporada.id),
      getDisponibilidadDelDia(temporada.id, fecha),
    ]);
  const bloques = [...actividades].sort((a, b) =>
    (a.hora_inicio ?? "99").localeCompare(b.hora_inicio ?? "99"),
  );
  const conEjercicios = await Promise.all(
    bloques
      .filter((a) => llevaEjercicios(a.tipo))
      .map(async (a) => ({
        actividad: a,
        ubicacion: await getUbicacionSesion(temporada.id, a),
        completa: await getSesionCompleta(a.id),
      })),
  );
  const indice = indiceObjetivos(principios);
  const nombreContenido = new Map(contenidos.map((c) => [c.id, c.nombre]));
  const md = etiquetaMD(fecha, partidos)?.texto ?? null;
  const tipo = md ? SEMANA_TIPO[md] : undefined;
  const noDisponibles = jugadores
    .map((j) => ({ j, d: disponibilidad[j.id] }))
    .filter((x) => x.d && x.d.estado !== "disponible");
  const minutos = (id: string) => {
    const c = conEjercicios.find((x) => x.actividad.id === id);
    const s = c?.completa.tareas.reduce((t, x) => t + (x.tiempo_total_seg ?? 0), 0) ?? 0;
    return s > 0 ? formatearSegundos(s) : null;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 8mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[297mm] items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          En el diálogo elegí <strong>Guardar como PDF</strong> y orientación horizontal.
        </p>
        <BotonImprimir />
      </div>

      <article className="mx-auto mb-4 max-w-[297mm] break-after-page bg-white p-6 text-slate-900 shadow print:mb-0 print:max-w-none print:p-0 print:shadow-none">
        <header
          className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-lg px-5 py-3 text-white"
          style={{ backgroundColor: temporada.color_principal }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
              {temporada.club} · Día de entrenamiento
            </p>
            <h1 className="text-xl font-bold capitalize">{formatearDia(fecha)}</h1>
          </div>
          <p className="text-sm font-semibold">
            {[md, tipo && `${INFO_ORIENTACION[tipo.orientacion].label} · ${tipo.foco}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>

        {bloques.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No hay nada cargado este día.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-300">
                <th className="py-1.5 pr-3 font-semibold">Horario</th>
                <th className="py-1.5 pr-3 font-semibold">Bloque</th>
                <th className="py-1.5 pr-3 font-semibold">Lugar</th>
                <th className="py-1.5 pr-3 font-semibold">Contenido</th>
                <th className="py-1.5 font-semibold">Indicaciones y notas</th>
              </tr>
            </thead>
            <tbody>
              {bloques.map((a) => {
                const c = conEjercicios.find((x) => x.actividad.id === a.id);
                const inicio = horaCorta(a.hora_inicio);
                const fin = horaCorta(a.hora_fin);
                return (
                  <tr key={a.id} className="border-b border-slate-200 align-top">
                    <td className="py-2 pr-3 font-semibold tabular-nums">
                      {inicio ? (fin ? `${inicio}–${fin}` : inicio) : "Todo el día"}
                      {a.hora_citacion && (
                        <span className="block text-xs font-normal text-slate-500">
                          Citación {horaCorta(a.hora_citacion)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-semibold">{INFO_ACTIVIDAD[a.tipo].label}</span>
                      {a.titulo !== INFO_ACTIVIDAD[a.tipo].label && (
                        <span className="block text-xs text-slate-600">{a.titulo}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-700">{a.lugar ?? "—"}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {c
                        ? c.completa.tareas.length
                          ? `${c.completa.tareas.length} tareas${minutos(a.id) ? ` · ${minutos(a.id)}` : ""}: ${c.completa.tareas.map((t) => t.tarea.nombre).join(", ")}`
                          : "Sin ejercicios cargados"
                        : "—"}
                    </td>
                    <td className="py-2 text-xs text-slate-700">
                      {a.indicaciones && <p>{a.indicaciones}</p>}
                      {a.notas_internas && <p className="text-slate-500">CT: {a.notas_internas}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {noDisponibles.length > 0 && (
          <p className="mt-4 text-sm">
            <span className="font-semibold">No disponibles: </span>
            {noDisponibles
              .map(({ j, d }) => `${j.nombre} (${INFO_ESTADO[d!.estado].label.toLowerCase()})`)
              .join(" · ")}
          </p>
        )}
      </article>

      {conEjercicios
        .filter((c) => c.completa.tareas.length > 0)
        .map((c) => (
          <div key={c.actividad.id} className="mb-4 print:mb-0">
            <PlanillaSesion
              temporada={temporada}
              actividad={c.actividad}
              ubicacion={c.ubicacion}
              sesion={c.completa.sesion}
              tareas={c.completa.tareas}
              indice={indice}
              nombreContenido={nombreContenido}
            />
          </div>
        ))}
    </div>
  );
}
