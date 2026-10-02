import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { rutaDesdeUrlPublica, type Bucket } from "./config";

type SupabaseServer = ReturnType<typeof createClient>;

/**
 * Borra de Storage las imágenes indicadas por URL pública.
 * Los fallos solo se registran: una imagen huérfana no debe romper la operación principal.
 */
export async function borrarImagenes(
  supabase: SupabaseServer,
  bucket: Bucket,
  urls: Array<string | null | undefined>,
): Promise<void> {
  const rutas = urls
    .map((url) => (url ? rutaDesdeUrlPublica(url, bucket) : null))
    .filter((ruta): ruta is string => ruta !== null);
  if (rutas.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(rutas);
  if (error) console.error(`[storage remove ${bucket}]`, error.message);
}
