import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EstadisticasJugador, JugadorAtributos } from "@/types/atributos";

const MINUTOS_POR_PARTIDO = 90;

export async function getAtributos(jugadorId: string): Promise<JugadorAtributos | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jugador_atributos")
    .select("*")
    .eq("jugador_id", jugadorId)
    .maybeSingle();

  if (error) {
    console.error("[getAtributos]", error.message);
    throw new Error("No se pudieron cargar los atributos");
  }
  return data;
}

/**
 * Cifras del jugador a partir de los partidos marcados como "jugado":
 *  - Partidos: convocado (titular o banquillo) en la alineación guardada
 *  - Titular:  en el once inicial
 *  - Minutos:  estimación de 90' por partido como titular
 *  - Goles:    eventos de tipo "gol" asignados al jugador
 */
export async function getEstadisticasJugador(jugadorId: string): Promise<EstadisticasJugador> {
  const supabase = createClient();

  const [jugados, goles] = await Promise.all([
    supabase.from("partidos").select("id").eq("estado", "jugado"),
    supabase
      .from("eventos_partido")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "gol")
      .eq("jugador_id", jugadorId),
  ]);
  if (jugados.error || goles.error) {
    console.error("[getEstadisticasJugador]", (jugados.error ?? goles.error)?.message);
    throw new Error("No se pudieron cargar las estadísticas");
  }

  const ids = jugados.data.map((p) => p.id);
  let partidos = 0;
  let titular = 0;

  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("alineacion_partido")
      .select("titulares, suplentes")
      .in("partido_id", ids);
    if (error) {
      console.error("[getEstadisticasJugador] alineaciones", error.message);
      throw new Error("No se pudieron cargar las estadísticas");
    }
    for (const a of data) {
      const esTitular = a.titulares.includes(jugadorId);
      if (esTitular) titular += 1;
      if (esTitular || a.suplentes.includes(jugadorId)) partidos += 1;
    }
  }

  return { partidos, titular, minutos: titular * MINUTOS_POR_PARTIDO, goles: goles.count ?? 0 };
}
