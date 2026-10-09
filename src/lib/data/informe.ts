import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InformeRivalDatos, JugadorRival, PedidoSofascore } from "@/types/informe";

/** La Mac se considera conectada si mandó señal en los últimos 2 minutos. */
const CONECTADA_MS = 2 * 60 * 1000;

export interface InformeSofascore {
  informe: InformeRivalDatos | null;
  pedido: PedidoSofascore | null;
  macConectada: boolean;
  plantel: JugadorRival[];
}

export async function getInformeSofascore(
  partidoId: string,
  rivalId: string | null,
  cuerpoTecnicoId: string,
): Promise<InformeSofascore> {
  const supabase = createClient();
  const [informe, pedido, mac, plantel] = await Promise.all([
    supabase.from("informes_rival_datos").select("*").eq("partido_id", partidoId).maybeSingle(),
    supabase
      .from("pedidos_sofascore")
      .select("*")
      .eq("partido_id", partidoId)
      .eq("tipo", "informe_rival")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("estado_mac")
      .select("ultima_senal")
      .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
      .maybeSingle(),
    rivalId
      ? supabase.from("jugadores_rivales").select("*").eq("equipo_id", rivalId)
      : Promise.resolve({ data: [] as JugadorRival[], error: null }),
  ]);
  const error = informe.error ?? pedido.error ?? mac.error ?? plantel.error;
  if (error) {
    console.error("[getInformeSofascore]", error.message);
    throw new Error("No se pudo cargar el informe del rival");
  }
  return {
    informe: informe.data,
    pedido: pedido.data,
    macConectada: Boolean(
      mac.data && Date.now() - new Date(mac.data.ultima_senal).getTime() < CONECTADA_MS,
    ),
    plantel: plantel.data ?? [],
  };
}

export type AnalisisPropio = import("@/types/database").Tables<"analisis_propio">;

export interface SofascorePropio {
  analisis: AnalisisPropio | null;
  pedido: PedidoSofascore | null;
  macConectada: boolean;
}

/** Análisis de nuestro equipo (Sofascore), el último pedido y si la Mac está conectada. */
export async function getSofascorePropio(
  temporadaId: string,
  cuerpoTecnicoId: string,
): Promise<SofascorePropio> {
  const supabase = createClient();
  const [analisis, pedido, mac] = await Promise.all([
    supabase.from("analisis_propio").select("*").eq("temporada_id", temporadaId).maybeSingle(),
    supabase
      .from("pedidos_sofascore")
      .select("*")
      .eq("temporada_id", temporadaId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("estado_mac")
      .select("ultima_senal")
      .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
      .maybeSingle(),
  ]);
  const error = analisis.error ?? pedido.error ?? mac.error;
  if (error) {
    console.error("[getSofascorePropio]", error.message);
    throw new Error("No se pudieron cargar los datos de Sofascore");
  }
  return {
    analisis: analisis.data,
    pedido: pedido.data,
    macConectada: Boolean(
      mac.data && Date.now() - new Date(mac.data.ultima_senal).getTime() < CONECTADA_MS,
    ),
  };
}
