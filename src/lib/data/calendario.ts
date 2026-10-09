import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PartidoReferencia } from "@/lib/calendario";
import type { Actividad } from "@/types/calendario";

/** Actividades de la temporada entre dos fechas, por día y hora. */
export async function getActividades(
  temporadaId: string,
  desde: string,
  hasta: string,
): Promise<Actividad[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("actividades")
    .select("*")
    .eq("temporada_id", temporadaId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true, nullsFirst: true })
    .order("creado_en", { ascending: true });

  if (error) {
    console.error("[getActividades]", error.message);
    throw new Error("No se pudo cargar el calendario");
  }
  return data;
}

/** Memoizado por petición. */
export const getActividad = cache(async (id: string): Promise<Actividad | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("actividades").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    console.error("[getActividad]", error.message);
    throw new Error("No se pudo cargar la actividad");
  }
  return data;
});

/** Fechas de los partidos de la temporada: referencia para los ciclos y las etiquetas MD. */
export const getReferenciasPartidos = cache(
  async (temporadaId: string): Promise<PartidoReferencia[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("partidos")
      .select("id, fecha")
      .eq("temporada_id", temporadaId)
      .order("fecha", { ascending: true });
    if (error) {
      console.error("[getReferenciasPartidos]", error.message);
      throw new Error("No se pudieron cargar los partidos");
    }
    return data;
  },
);

/** Token del link de jugadores de la temporada, o null si todavía no se creó. */
export async function getEnlaceJugadores(temporadaId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("enlaces_jugadores")
    .select("token")
    .eq("temporada_id", temporadaId)
    .maybeSingle();
  if (error) {
    console.error("[getEnlaceJugadores]", error.message);
    return null;
  }
  return data?.token ?? null;
}
