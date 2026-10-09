import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { PedidoSofascore } from "@/types/informe";

export type AsistentePlan = Tables<"asistente_plan">;

export interface DatosAsistentePlan {
  asistente: AsistentePlan | null;
  pedido: PedidoSofascore | null;
}

/** El último análisis del asistente para el plan y su pedido a la Mac. */
export async function getAsistentePlan(partidoId: string): Promise<DatosAsistentePlan> {
  const supabase = createClient();
  const [asistente, pedido] = await Promise.all([
    supabase.from("asistente_plan").select("*").eq("partido_id", partidoId).maybeSingle(),
    supabase
      .from("pedidos_sofascore")
      .select("*")
      .eq("partido_id", partidoId)
      .eq("tipo", "plan_asistente")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const error = asistente.error ?? pedido.error;
  if (error) {
    console.error("[getAsistentePlan]", error.message);
    throw new Error("No se pudo cargar el asistente del plan");
  }
  return { asistente: asistente.data, pedido: pedido.data };
}
