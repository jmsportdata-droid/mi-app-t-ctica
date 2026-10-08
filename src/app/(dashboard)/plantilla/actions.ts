"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { borrarImagenes } from "@/lib/storage/server";
import { BUCKETS } from "@/lib/storage/config";
import { erroresDeZod, jugadorSchema, type JugadorErrores } from "@/lib/validations/jugador";
import type { JugadorInput } from "@/types/jugador";

export type ActionResult =
  { ok: true; id: string } | { ok: false; error: string; errores?: JugadorErrores };

const SESION_EXPIRADA: ActionResult = {
  ok: false,
  error: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
};

function errorDeBD(error: PostgrestError): ActionResult {
  if (error.code === "23505") {
    return {
      ok: false,
      error: "Revisa los campos marcados",
      errores: { numero: "Ese dorsal ya está asignado a otro jugador" },
    };
  }
  console.error("[jugadores action]", error.code, error.message);
  return { ok: false, error: "No se pudo guardar el jugador. Inténtalo de nuevo." };
}

/** Crea (id = null) o actualiza un jugador. Valida de nuevo en servidor. */
export async function guardarJugador(
  id: string | null,
  input: JugadorInput,
): Promise<ActionResult> {
  const parsed = jugadorSchema.safeParse(input);
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
      .from("jugadores")
      .insert(parsed.data)
      .select("id")
      .single();
    if (error) return errorDeBD(error);

    revalidatePath("/plantilla", "layout");
    return { ok: true, id: data.id };
  }

  // Foto anterior, para borrarla de Storage si se ha cambiado o quitado.
  const { data: anterior } = await supabase
    .from("jugadores")
    .select("foto_url")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("jugadores")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .single();
  if (error) return errorDeBD(error);

  if (anterior?.foto_url && anterior.foto_url !== parsed.data.foto_url) {
    await borrarImagenes(supabase, BUCKETS.fotosJugadores, [anterior.foto_url]);
  }

  revalidatePath("/plantilla", "layout");
  return { ok: true, id: data.id };
}

export async function eliminarJugador(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return SESION_EXPIRADA;

  const { data, error } = await supabase
    .from("jugadores")
    .delete()
    .eq("id", id)
    .select("foto_url")
    .maybeSingle();
  if (error) return errorDeBD(error);

  await borrarImagenes(supabase, BUCKETS.fotosJugadores, [data?.foto_url]);

  revalidatePath("/plantilla", "layout");
  return { ok: true, id };
}
