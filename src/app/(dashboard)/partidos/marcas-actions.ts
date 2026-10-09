"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();
const rivalesSchema = z.array(idSchema).max(11, "Como máximo 11 marcas").nullable();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  console.error(`[marcas ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

/** Los rivales a marcar al hombre (null: volver a los sugeridos). */
export async function guardarRivalesMarcas(
  partidoId: string,
  rivales: string[] | null,
): Promise<Resultado> {
  const parsed = rivalesSchema.safeParse(rivales);
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("marcas_partido")
    .upsert({ partido_id: partidoId, rivales: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "rivales");
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}

/** Fija a mano quién marca a un rival (null: que lo elija la sugerencia). */
export async function fijarMarca(
  partidoId: string,
  rivalId: string,
  jugadorId: string | null,
): Promise<Resultado> {
  if (
    !idSchema.safeParse(partidoId).success ||
    !idSchema.safeParse(rivalId).success ||
    (jugadorId !== null && !idSchema.safeParse(jugadorId).success)
  ) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { data, error: errorLeer } = await supabase
    .from("marcas_partido")
    .select("parejas")
    .eq("partido_id", partidoId)
    .maybeSingle();
  if (errorLeer) return errorDeBD(errorLeer, "leer");
  const parejas = { ...((data?.parejas ?? {}) as Record<string, string>) };
  if (jugadorId) {
    // Un jugador marca a un solo rival: se lo saca de donde estaba
    for (const [r, j] of Object.entries(parejas)) if (j === jugadorId) delete parejas[r];
    parejas[rivalId] = jugadorId;
  } else {
    delete parejas[rivalId];
  }
  const { error } = await supabase
    .from("marcas_partido")
    .upsert({ partido_id: partidoId, parejas }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "pareja");
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}

/** Descarta los cambios a mano: vuelve a la sugerencia automática. */
export async function reiniciarMarcas(partidoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("marcas_partido")
    .delete()
    .eq("partido_id", partidoId);
  if (error) return errorDeBD(error, "reiniciar");
  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}
