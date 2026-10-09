import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JugadorPartido, PartidoRend, Valoracion } from "@/lib/rendimiento";
import type { Stats } from "@/lib/post-partido";
import type { EquipoLiga, JugadorLiga } from "@/lib/liga";
import type { Indicador } from "@/lib/indice-modelo";
import type { PedidoSofascore } from "@/types/informe";

/** La Mac se considera conectada si mandó señal en los últimos 2 minutos. */
const CONECTADA_MS = 2 * 60 * 1000;

export interface DatosRendimiento {
  partidos: PartidoRend[];
  jugadorPartidos: JugadorPartido[];
  valoraciones: Valoracion[];
  /** Plan vs realidad de cada partido */
  planes: Record<string, Record<string, { cumplimiento: string | null }>>;
}

/** Los post partidos de la temporada (equipo y jugadores) y las notas del cuerpo técnico. */
export async function getRendimiento(temporadaId: string): Promise<DatosRendimiento> {
  const supabase = createClient();
  const [partidos, jugadores, valoraciones, planes] = await Promise.all([
    supabase
      .from("estadisticas_partido")
      .select(
        "partido_id, propio, rival, tiros, incidencias, partido:partidos!inner(fecha, competicion, es_local, goles_favor, goles_contra, temporada_id, rival:equipos(nombre))",
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
    supabase
      .from("post_partido")
      .select("partido_id, plan_vs_real, partido:partidos!inner(temporada_id)")
      .eq("partido.temporada_id", temporadaId),
  ]);
  const error = partidos.error ?? jugadores.error ?? valoraciones.error ?? planes.error;
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
                tiros:
                  (p.tiros as unknown as {
                    minuto: number | null;
                    propio: boolean;
                    xg: number;
                  }[]) ?? [],
                goles: (
                  (p.incidencias as unknown as {
                    tipo: string;
                    minuto: number | null;
                    propio: boolean;
                  }[]) ?? []
                )
                  .filter((i) => i.tipo === "gol")
                  .map((i) => ({ minuto: i.minuto, propio: i.propio })),
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
    planes: Object.fromEntries(
      (planes.data ?? []).map((p) => [
        p.partido_id,
        p.plan_vs_real as Record<string, { cumplimiento: string | null }>,
      ]),
    ),
  };
}

export interface ReferenciaLiga {
  idTorneo: string;
  competicion: string;
  generadoEn: string;
  equipos: EquipoLiga[];
  jugadores: JugadorLiga[];
}

/** Estadísticas de temporada de toda la liga (para los percentiles). */
export async function getReferenciasLiga(temporadaId: string): Promise<ReferenciaLiga[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("referencias_liga")
    .select("*")
    .eq("temporada_id", temporadaId)
    .order("generado_en", { ascending: false });
  if (error) {
    console.error("[getReferenciasLiga]", error.message);
    throw new Error("No se pudieron cargar los datos de la liga");
  }
  return (data ?? []).map((r) => ({
    idTorneo: r.id_torneo,
    competicion: r.competicion,
    generadoEn: r.generado_en,
    equipos: r.equipos as unknown as EquipoLiga[],
    jugadores: r.jugadores as unknown as JugadorLiga[],
  }));
}

/** Indicadores del modelo de juego del cuerpo técnico. */
export async function getIndicadores(cuerpoTecnicoId: string): Promise<Indicador[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("indicadores_modelo")
    .select("id, momento, principio_id, kpi, objetivo")
    .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
    .order("momento")
    .order("orden")
    .order("creado_en");
  if (error) {
    console.error("[getIndicadores]", error.message);
    throw new Error("No se pudieron cargar los indicadores del modelo");
  }
  return (data ?? []).map((i) => ({ ...i, objetivo: Number(i.objetivo) }));
}

export interface PedidosTemporada {
  liga: PedidoSofascore | null;
  importacion: PedidoSofascore | null;
  macConectada: boolean;
}

/** Los últimos pedidos de la temporada a la Mac (liga e importación). */
export async function getPedidosTemporada(
  temporadaId: string,
  cuerpoTecnicoId: string,
): Promise<PedidosTemporada> {
  const supabase = createClient();
  const ultimo = (tipo: "liga" | "importar_temporada") =>
    supabase
      .from("pedidos_sofascore")
      .select("*")
      .eq("temporada_id", temporadaId)
      .eq("tipo", tipo)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
  const [liga, importacion, mac] = await Promise.all([
    ultimo("liga"),
    ultimo("importar_temporada"),
    supabase
      .from("estado_mac")
      .select("ultima_senal")
      .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
      .maybeSingle(),
  ]);
  const error = liga.error ?? importacion.error ?? mac.error;
  if (error) {
    console.error("[getPedidosTemporada]", error.message);
    throw new Error("No se pudieron cargar los pedidos");
  }
  return {
    liga: liga.data,
    importacion: importacion.data,
    macConectada: Boolean(
      mac.data && Date.now() - new Date(mac.data.ultima_senal).getTime() < CONECTADA_MS,
    ),
  };
}
