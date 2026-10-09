import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JugadorPartido, PartidoRend, Valoracion } from "@/lib/rendimiento";
import type { Stats } from "@/lib/post-partido";

export interface DatosRendimiento {
  partidos: PartidoRend[];
  jugadorPartidos: JugadorPartido[];
  valoraciones: Valoracion[];
}

/** Los post partidos de la temporada (equipo y jugadores) y las notas del cuerpo técnico. */
export async function getRendimiento(temporadaId: string): Promise<DatosRendimiento> {
  const supabase = createClient();
  const [partidos, jugadores, valoraciones] = await Promise.all([
    supabase
      .from("estadisticas_partido")
      .select(
        "partido_id, propio, rival, partido:partidos!inner(fecha, competicion, es_local, goles_favor, goles_contra, temporada_id, rival:equipos(nombre))",
      )
      .eq("partido.temporada_id", temporadaId),
    supabase
      .from("estadisticas_jugador_partido")
      .select("*, partido:partidos!inner(temporada_id)")
      .eq("partido.temporada_id", temporadaId),
    supabase
      .from("valoraciones_jugador")
      .select("partido_id, jugador_id, nota, partido:partidos!inner(temporada_id)")
      .eq("partido.temporada_id", temporadaId),
  ]);
  const error = partidos.error ?? jugadores.error ?? valoraciones.error;
  if (error) {
    console.error("[getRendimiento]", error.message);
    throw new Error("No se pudo cargar el rendimiento");
  }
  return {
    partidos: (partidos.data ?? [])
      .flatMap((p) =>
        p.partido
          ? [
              {
                id: p.partido_id,
                fecha: p.partido.fecha,
                rival: p.partido.rival?.nombre ?? "Rival",
                competicion: p.partido.competicion,
                esLocal: p.partido.es_local,
                gf: p.partido.goles_favor,
                gc: p.partido.goles_contra,
                propio: p.propio as Stats,
                rival_stats: p.rival as Stats,
              },
            ]
          : [],
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    jugadorPartidos: (jugadores.data ?? []).map((j) => ({
      partidoId: j.partido_id,
      jugadorId: j.jugador_id,
      titular: j.titular,
      minutos: j.minutos,
      nota: j.nota === null ? null : Number(j.nota),
      goles: j.goles,
      asistencias: j.asistencias,
      amarillas: j.amarillas,
      rojas: j.rojas,
      stats: j.stats as Stats,
    })),
    valoraciones: (valoraciones.data ?? []).map((v) => ({
      partidoId: v.partido_id,
      jugadorId: v.jugador_id,
      nota: Number(v.nota),
    })),
  };
}
