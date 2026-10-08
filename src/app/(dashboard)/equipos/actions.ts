"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { borrarImagenes } from "@/lib/storage/server";
import { BUCKETS } from "@/lib/storage/config";
import { erroresDeZod } from "@/lib/validations/comun";
import { equipoSchema, type EquipoErrores } from "@/lib/validations/equipo";
import type { EquipoInput } from "@/types/equipo";

export type EquipoActionResult =
  { ok: true; id: string } | { ok: false; error: string; errores?: EquipoErrores };

function errorDeBD(error: PostgrestError): EquipoActionResult {
  if (error.code === "23505") {
    return {
      ok: false,
      error: "Revisá los campos marcados",
      errores: { nombre: "Ya existe un equipo con ese nombre" },
    };
  }
  if (error.code === "23503") {
    return {
      ok: false,
      error: "No se puede eliminar: este equipo tiene partidos. Primero eliminá esos partidos.",
    };
  }
  console.error("[equipos action]", error.code, error.message);
  return { ok: false, error: "No se pudo completar la operación. Probá de nuevo." };
}

/** Crea (id = null) o actualiza un equipo. Valida de nuevo en servidor. */
export async function guardarEquipo(
  id: string | null,
  input: EquipoInput,
): Promise<EquipoActionResult> {
  const parsed = equipoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }

  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  if (!id) {
    const { data, error } = await supabase
      .from("equipos")
      .insert(parsed.data)
      .select("id")
      .single();
    if (error) return errorDeBD(error);

    revalidatePath("/equipos", "layout");
    return { ok: true, id: data.id };
  }

  // Escudo anterior, para borrarlo de Storage si se ha cambiado o quitado.
  const { data: anterior } = await supabase
    .from("equipos")
    .select("escudo_ruta")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("equipos")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .single();
  if (error) return errorDeBD(error);

  if (anterior?.escudo_ruta && anterior.escudo_ruta !== parsed.data.escudo_ruta) {
    await borrarImagenes(supabase, BUCKETS.escudos, [anterior.escudo_ruta]);
  }

  revalidatePath("/equipos", "layout");
  revalidatePath("/partidos", "layout");
  return { ok: true, id: data.id };
}

export async function eliminarEquipo(id: string): Promise<EquipoActionResult> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const { data, error } = await supabase
    .from("equipos")
    .delete()
    .eq("id", id)
    .select("escudo_ruta")
    .maybeSingle();
  if (error) return errorDeBD(error);

  await borrarImagenes(supabase, BUCKETS.escudos, [data?.escudo_ruta]);

  revalidatePath("/equipos", "layout");
  revalidatePath("/partidos", "layout");
  return { ok: true, id };
}
