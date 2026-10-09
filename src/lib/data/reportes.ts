import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SesionReporte } from "@/lib/reportes";

/** Entrenamientos con sesión entre dos fechas, con sus tareas y asistencia. */
export async function getSesionesReporte(
  temporadaId: string,
  desde: string,
  hasta: string,
): Promise<SesionReporte[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("actividades")
    .select(
      `id, fecha,
       sesiones(cerrada, minutos_reales,
         sesion_tareas(tarea_id, tiempo_total_seg, espacio, largo_m, ancho_m, jugadores,
           tareas(nombre, tipo, orientacion_fisica, tareas_objetivos(principio_id))),
         asistencia_sesion(jugador_id, estado))`,
    )
    .eq("temporada_id", temporadaId)
    .eq("tipo", "entrenamiento")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true });
  if (error) {
    console.error("[getSesionesReporte]", error.message);
    throw new Error("No se pudo cargar el reporte");
  }

  return (data ?? []).flatMap((a) => {
    const s = a.sesiones;
    if (!s) return [];
    return [
      {
        actividadId: a.id,
        fecha: a.fecha,
        cerrada: s.cerrada,
        minutosReales: s.minutos_reales,
        tareas: s.sesion_tareas.flatMap((t) =>
          t.tareas
            ? [
                {
                  tareaId: t.tarea_id,
                  nombre: t.tareas.nombre,
                  tipo: t.tareas.tipo,
                  orientacion: t.tareas.orientacion_fisica,
                  objetivos: t.tareas.tareas_objetivos.map((o) => o.principio_id),
                  segundos: t.tiempo_total_seg ?? 0,
                  espacio: t.espacio,
                  largo_m: t.largo_m,
                  ancho_m: t.ancho_m,
                  jugadores: t.jugadores,
                },
              ]
            : [],
        ),
        asistencia: s.asistencia_sesion.map((x) => ({ jugadorId: x.jugador_id, estado: x.estado })),
      },
    ];
  });
}
