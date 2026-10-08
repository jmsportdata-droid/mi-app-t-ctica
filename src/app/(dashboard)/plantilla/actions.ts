"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA, SIN_TEMPORADA } from "@/lib/supabase/auth";
import { borrarImagenes } from "@/lib/storage/server";
import { BUCKETS } from "@/lib/storage/config";
import { erroresDeZod, jugadorSchema, type JugadorErrores } from "@/lib/validations/jugador";
import type { JugadorInput } from "@/types/jugador";

export type ActionResult =
  { ok: true; id: string } | { ok: false; error: string; errores?: JugadorErrores };

function errorDeBD(error: PostgrestError): ActionResult {
  if (error.code === "23505") {
    return {
      ok: false,
      error: "Revisá los campos marcados",
      errores: { numero: "Ese número ya lo tiene otro jugador" },
    };
  }
  console.error("[jugadores action]", error.code, error.message);
  return { ok: false, error: "No se pudo guardar el jugador. Probá de nuevo." };
}

/** Crea (id = null) o actualiza un jugador. Valida de nuevo en servidor. */
export async function guardarJugador(
  id: string | null,
  input: JugadorInput,
): Promise<ActionResult> {
  const parsed = jugadorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }

  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;

  if (!id) {
    if (!contexto.temporada) return SIN_TEMPORADA;
    const { data, error } = await supabase
      .from("jugadores")
      .insert({ ...parsed.data, temporada_id: contexto.temporada.id })
      .select("id")
      .single();
    if (error) return errorDeBD(error);

    revalidatePath("/plantilla", "layout");
    return { ok: true, id: data.id };
  }

  // Foto anterior, para borrarla de Storage si se ha cambiado o quitado.
  const { data: anterior } = await supabase
    .from("jugadores")
    .select("foto_ruta")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("jugadores")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .single();
  if (error) return errorDeBD(error);

  if (anterior?.foto_ruta && anterior.foto_ruta !== parsed.data.foto_ruta) {
    await borrarImagenes(supabase, BUCKETS.fotosJugadores, [anterior.foto_ruta]);
  }

  revalidatePath("/plantilla", "layout");
  return { ok: true, id: data.id };
}

export async function eliminarJugador(id: string): Promise<ActionResult> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const { data, error } = await supabase
    .from("jugadores")
    .delete()
    .eq("id", id)
    .select("foto_ruta")
    .maybeSingle();
  if (error) return errorDeBD(error);

  await borrarImagenes(supabase, BUCKETS.fotosJugadores, [data?.foto_ruta]);

  revalidatePath("/plantilla", "layout");
  return { ok: true, id };
}
