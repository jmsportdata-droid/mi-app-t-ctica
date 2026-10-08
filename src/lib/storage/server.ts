import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Bucket } from "./config";

type SupabaseServer = ReturnType<typeof createClient>;

/**
 * Borra de Storage las imágenes indicadas por ruta.
 * Los fallos solo se registran: una imagen huérfana no debe romper la operación principal.
 */
export async function borrarImagenes(
  supabase: SupabaseServer,
  bucket: Bucket,
  rutas: Array<string | null | undefined>,
): Promise<void> {
  const validas = rutas.filter((ruta): ruta is string => Boolean(ruta));
  if (validas.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(validas);
  if (error) console.error(`[storage remove ${bucket}]`, error.message);
}
