import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Equipo } from "@/types/equipo";

export async function getEquipos(): Promise<Equipo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[getEquipos]", error.message);
    throw new Error("No se pudieron cargar los equipos");
  }
  return data;
}

/** Memoizado por petición. */
export const getEquipo = cache(async (id: string): Promise<Equipo | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("equipos").select("*").eq("id", id).maybeSingle();

  if (error) {
    // 22P02: id con formato no válido para uuid → tratar como no encontrado
    if (error.code === "22P02") return null;
    console.error("[getEquipo]", error.message);
    throw new Error("No se pudo cargar el equipo");
  }
  return data;
});
