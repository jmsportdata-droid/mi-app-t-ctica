import "server-only";
import { createClient } from "./server";

export const SESION_EXPIRADA = {
  ok: false,
  error: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
} as const;

/** Cliente de servidor si hay un usuario autenticado; null en caso contrario. */
export async function getClienteAutenticado() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}
