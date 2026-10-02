"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAtributos, getEstadisticasJugador } from "@/lib/data/atributos";
import { getClienteAutenticado, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { atributosSchema } from "@/lib/validations/avanzado";
import type { EstadisticasJugador, JugadorAtributos, ValoresAtributos } from "@/types/atributos";

export type FichaJugadorResult =
  | { ok: true; atributos: JugadorAtributos | null; estadisticas: EstadisticasJugador }
  | { ok: false; error: string };

const idSchema = z.string().uuid();

/** Datos del popup "Ver": atributos y cifras del jugador. */
export async function obtenerFichaJugador(jugadorId: string): Promise<FichaJugadorResult> {
  if (!idSchema.safeParse(jugadorId).success) return { ok: false, error: "Jugador no válido" };
  if (!(await getClienteAutenticado())) return SESION_EXPIRADA;

  try {
    const [atributos, estadisticas] = await Promise.all([
      getAtributos(jugadorId),
      getEstadisticasJugador(jugadorId),
    ]);
    return { ok: true, atributos, estadisticas };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo cargar la ficha" };
  }
}

export async function guardarAtributos(
  jugadorId: string,
  valores: ValoresAtributos,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = atributosSchema.safeParse(valores);
  if (!idSchema.safeParse(jugadorId).success || !parsed.success) {
    return { ok: false, error: "Los atributos deben ser números enteros entre 0 y 100" };
  }

  const supabase = await getClienteAutenticado();
  if (!supabase) return SESION_EXPIRADA;

  const { error } = await supabase
    .from("jugador_atributos")
    .upsert(
      { jugador_id: jugadorId, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "jugador_id" },
    );
  if (error) {
    console.error("[guardarAtributos]", error.code, error.message);
    return {
      ok: false,
      error: error.code === "23503" ? "El jugador ya no existe" : "No se pudieron guardar los atributos",
    };
  }

  revalidatePath(`/plantilla/${jugadorId}`);
  return { ok: true };
}
