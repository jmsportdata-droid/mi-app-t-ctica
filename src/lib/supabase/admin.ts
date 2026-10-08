import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Cliente con la service role key: saltea RLS. Solo para crear, modificar o borrar
 * cuentas de Auth (miembros del cuerpo técnico), siempre después de verificar en la
 * acción que quien lo pide es el entrenador.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY. Revisá tu .env.local");
  }
  return createClient<Database>(getSupabaseEnv().url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
