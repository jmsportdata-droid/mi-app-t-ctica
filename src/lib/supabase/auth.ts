import "server-only";
import { getSesion, type Contexto } from "@/lib/contexto";
import { createClient } from "./server";

export const SESION_EXPIRADA = {
  ok: false,
  error: "Tu sesión venció. Volvé a iniciar sesión.",
} as const;

export const SOLO_ENTRENADOR = {
  ok: false,
  error: "Solo el entrenador puede hacer este cambio.",
} as const;

export const SIN_TEMPORADA = {
  ok: false,
  error: "Primero creá una temporada en Cuerpo técnico.",
} as const;

/** Cliente de servidor si hay un usuario autenticado; null en caso contrario. */
export async function getClienteAutenticado() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

/**
 * Para Server Actions: cliente de servidor + contexto del usuario (cuerpo técnico y
 * temporada seleccionada). null si no hay sesión o el usuario no tiene cuerpo técnico.
 */
export async function getAccion(): Promise<{
  supabase: ReturnType<typeof createClient>;
  contexto: Contexto;
} | null> {
  const sesion = await getSesion();
  if (sesion.estado !== "ok") return null;
  return { supabase: createClient(), contexto: sesion };
}
