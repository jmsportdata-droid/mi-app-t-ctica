import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Miembro, Temporada } from "@/types/cuerpo-tecnico";

const ORDEN_ROL: Record<Miembro["rol"], number> = {
  entrenador: 0,
  ayudante: 1,
  preparador_fisico: 2,
  analista: 3,
};

/** Miembros del cuerpo técnico: entrenador primero, después por rol y nombre. */
export async function getMiembros(cuerpoTecnicoId: string): Promise<Miembro[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("miembros")
    .select("*")
    .eq("cuerpo_tecnico_id", cuerpoTecnicoId);

  if (error) {
    console.error("[getMiembros]", error.message);
    throw new Error("No se pudieron cargar los miembros");
  }
  return data.sort(
    (a, b) => ORDEN_ROL[a.rol] - ORDEN_ROL[b.rol] || a.nombre.localeCompare(b.nombre, "es"),
  );
}

/** Memoizado por petición. */
export const getTemporada = cache(async (id: string): Promise<Temporada | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("temporadas").select("*").eq("id", id).maybeSingle();

  if (error) {
    // 22P02: id con formato no válido para uuid → tratar como no encontrado
    if (error.code === "22P02") return null;
    console.error("[getTemporada]", error.message);
    throw new Error("No se pudo cargar la temporada");
  }
  return data;
});
