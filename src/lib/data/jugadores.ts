import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Jugador } from "@/types/jugador";

export async function getJugadores(): Promise<Jugador[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jugadores")
    .select("*")
    .order("numero", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[getJugadores]", error.message);
    throw new Error("No se pudieron cargar los jugadores");
  }
  return data;
}

/** Memoizado por petición: lo usan generateMetadata y la página. */
export const getJugador = cache(async (id: string): Promise<Jugador | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("jugadores").select("*").eq("id", id).maybeSingle();

  if (error) {
    // 22P02: id con formato no válido para uuid → tratar como no encontrado
    if (error.code === "22P02") return null;
    console.error("[getJugador]", error.message);
    throw new Error("No se pudo cargar el jugador");
  }
  return data;
});
