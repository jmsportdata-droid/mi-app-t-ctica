"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { borrarImagenes } from "@/lib/storage/server";
import { BUCKETS } from "@/lib/storage/config";
import { erroresDeZod } from "@/lib/validations/comun";
import { equipoSchema, type EquipoErrores } from "@/lib/validations/equipo";
import type { EquipoInput } from "@/types/equipo";

export type EquipoActionResult =
  { ok: true; id: string } | { ok: false; error: string; errores?: EquipoErrores };

const SESION_EXPIRADA: EquipoActionResult = {
  ok: false,
  error: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
};

function errorDeBD(error: PostgrestError): EquipoActionResult {
  if (error.code === "23505") {
    return {
      ok: false,
      error: "Revisa los campos marcados",
      errores: { nombre: "Ya existe un equipo con ese nombre" },
    };
  }
  if (error.code === "23503") {
    return {
      ok: false,
      error:
        "No se puede eliminar: este equipo tiene partidos asociados. Elimina antes esos partidos.",
    };
  }
  console.error("[equipos action]", error.code, error.message);
  return { ok: false, error: "No se pudo completar la operación. Inténtalo de nuevo." };
}

/** Crea (id = null) o actualiza un equipo. Valida de nuevo en servidor. */
export async function guardarEquipo(
  id: string | null,
  input: EquipoInput,
): Promise<EquipoActionResult> {
  const parsed = equipoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos marcados", errores: erroresDeZod(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return SESION_EXPIRADA;

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
    .select("escudo_url")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("equipos")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .single();
  if (error) return errorDeBD(error);

  if (anterior?.escudo_url && anterior.escudo_url !== parsed.data.escudo_url) {
    await borrarImagenes(supabase, BUCKETS.escudosEquipos, [anterior.escudo_url]);
  }

  revalidatePath("/equipos", "layout");
  revalidatePath("/partidos", "layout");
  return { ok: true, id: data.id };
}

export async function eliminarEquipo(id: string): Promise<EquipoActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return SESION_EXPIRADA;

  const { data, error } = await supabase
    .from("equipos")
    .delete()
    .eq("id", id)
    .select("escudo_url")
    .maybeSingle();
  if (error) return errorDeBD(error);

  await borrarImagenes(supabase, BUCKETS.escudosEquipos, [data?.escudo_url]);

  revalidatePath("/equipos", "layout");
  revalidatePath("/partidos", "layout");
  return { ok: true, id };
}
