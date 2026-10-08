"use server";

import { z } from "zod";
import { getEstadisticasJugador } from "@/lib/data/estadisticas";
import { getClienteAutenticado, SESION_EXPIRADA } from "@/lib/supabase/auth";
import type { EstadisticasJugador } from "@/types/jugador";

export type FichaJugadorResult =
  { ok: true; estadisticas: EstadisticasJugador } | { ok: false; error: string };

const idSchema = z.string().uuid();

/** Datos del popup "Ver": cifras del jugador en la temporada. */
export async function obtenerFichaJugador(jugadorId: string): Promise<FichaJugadorResult> {
  if (!idSchema.safeParse(jugadorId).success) return { ok: false, error: "Jugador no válido" };
  if (!(await getClienteAutenticado())) return SESION_EXPIRADA;

  try {
    return { ok: true, estadisticas: await getEstadisticasJugador(jugadorId) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo cargar la ficha" };
  }
}
