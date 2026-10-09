import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ContenidoTecnico, ModeloJuego, PrincipioJuego } from "@/types/modelo-juego";

export interface DatosModeloJuego {
  modelo: ModeloJuego | null;
  principios: PrincipioJuego[];
  contenidos: ContenidoTecnico[];
}

/** Modelo de juego del cuerpo técnico. Memoizado por petición. */
export const getModeloJuego = cache(async (cuerpoTecnicoId: string): Promise<DatosModeloJuego> => {
  const supabase = createClient();
  const [modelo, principios, contenidos] = await Promise.all([
    supabase
      .from("modelos_juego")
      .select("*")
      .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
      .maybeSingle(),
    supabase.from("principios_juego").select("*").eq("cuerpo_tecnico_id", cuerpoTecnicoId),
    supabase
      .from("contenidos_tecnicos")
      .select("*")
      .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true }),
  ]);
  const error = modelo.error ?? principios.error ?? contenidos.error;
  if (error) {
    console.error("[getModeloJuego]", error.message);
    throw new Error("No se pudo cargar el modelo de juego");
  }
  return {
    modelo: modelo.data,
    principios: principios.data ?? [],
    contenidos: contenidos.data ?? [],
  };
});
