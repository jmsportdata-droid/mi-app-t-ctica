import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { PedidoSofascore } from "@/types/informe";

/** La Mac se considera conectada si mandó señal en los últimos 2 minutos. */
const CONECTADA_MS = 2 * 60 * 1000;
/** Partidos anteriores con los que se compara (promedio). */
const PREVIOS = 5;

export type EstadisticasPartido = Tables<"estadisticas_partido">;
export type PostPartido = Tables<"post_partido">;

export interface JugadorPost extends Tables<"estadisticas_jugador_partido"> {
  jugador: { nombre: string; numero: number | null; posicion: string } | null;
}

export interface PartidoPrevio {
  partidoId: string;
  fecha: string;
  rival: string;
  propio: Record<string, number>;
  rival_stats: Record<string, number>;
}

export interface DatosPostPartido {
  estadisticas: EstadisticasPartido | null;
  jugadores: JugadorPost[];
  post: PostPartido | null;
  previos: PartidoPrevio[];
  pedido: PedidoSofascore | null;
  macConectada: boolean;
}

/** Todo lo del post partido: datos de la fuente, evaluación y los partidos anteriores. */
export async function getPostPartido(
  partidoId: string,
  temporadaId: string,
  fecha: string,
  cuerpoTecnicoId: string,
): Promise<DatosPostPartido> {
  const supabase = createClient();
  const [estadisticas, jugadores, post, previos, pedido, mac] = await Promise.all([
    supabase.from("estadisticas_partido").select("*").eq("partido_id", partidoId).maybeSingle(),
    supabase
      .from("estadisticas_jugador_partido")
      .select("*, jugador:jugadores(nombre, numero, posicion)")
      .eq("partido_id", partidoId),
    supabase.from("post_partido").select("*").eq("partido_id", partidoId).maybeSingle(),
    supabase
      .from("estadisticas_partido")
      .select(
        "partido_id, propio, rival, partido:partidos!inner(fecha, temporada_id, rival:equipos(nombre))",
      )
      .eq("partido.temporada_id", temporadaId)
      .lt("partido.fecha", fecha),
    supabase
      .from("pedidos_sofascore")
      .select("*")
      .eq("partido_id", partidoId)
      .eq("tipo", "post_partido")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("estado_mac")
      .select("ultima_senal")
      .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
      .maybeSingle(),
  ]);
  const error =
    estadisticas.error ??
    jugadores.error ??
    post.error ??
    previos.error ??
    pedido.error ??
    mac.error;
  if (error) {
    console.error("[getPostPartido]", error.message);
    throw new Error("No se pudo cargar el post partido");
  }
  return {
    estadisticas: estadisticas.data,
    jugadores: (jugadores.data ?? []) as JugadorPost[],
    post: post.data,
    previos: (previos.data ?? [])
      .flatMap((p) =>
        p.partido
          ? [
              {
                partidoId: p.partido_id,
                fecha: p.partido.fecha,
                rival: p.partido.rival?.nombre ?? "Rival",
                propio: p.propio as Record<string, number>,
                rival_stats: p.rival as Record<string, number>,
              },
            ]
          : [],
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, PREVIOS),
    pedido: pedido.data,
    macConectada: Boolean(
      mac.data && Date.now() - new Date(mac.data.ultima_senal).getTime() < CONECTADA_MS,
    ),
  };
}
