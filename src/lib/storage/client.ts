import { createClient } from "@/lib/supabase/client";
import { extensionDe, validarImagen, type Bucket } from "./config";

/** Estado de un campo de imagen en un formulario. */
export interface ImagenValor {
  /** Archivo nuevo seleccionado y pendiente de subir */
  archivo: File | null;
  /** URL ya guardada (o null si no hay imagen / se ha quitado) */
  url: string | null;
}

export interface ImagenResuelta {
  url: string | null;
  /** Ruta del archivo subido en esta operación (para limpiarlo si algo falla después) */
  rutaSubida: string | null;
}

/**
 * Sube el archivo pendiente (si lo hay) y devuelve la URL pública final.
 * Se sube desde el navegador para no pasar por el límite de 1 MB de las Server Actions.
 */
export async function resolverImagen(bucket: Bucket, valor: ImagenValor): Promise<ImagenResuelta> {
  if (!valor.archivo) return { url: valor.url, rutaSubida: null };

  const errorValidacion = validarImagen(valor.archivo);
  if (errorValidacion) throw new Error(errorValidacion);

  const supabase = createClient();
  const ruta = `${crypto.randomUUID()}.${extensionDe(valor.archivo)}`;

  const { error } = await supabase.storage.from(bucket).upload(ruta, valor.archivo, {
    cacheControl: "31536000",
    contentType: valor.archivo.type,
    upsert: false,
  });
  if (error) {
    console.error("[storage upload]", error.message);
    throw new Error("No se pudo subir la imagen. Inténtalo de nuevo.");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(ruta);
  return { url: data.publicUrl, rutaSubida: ruta };
}

/** Borra un archivo recién subido cuando el guardado posterior ha fallado. */
async function descartarSubida(bucket: Bucket, ruta: string | null): Promise<void> {
  if (!ruta) return;
  const { error } = await createClient().storage.from(bucket).remove([ruta]);
  if (error) console.error("[storage cleanup]", error.message);
}

type ErrorGuardado = { ok: false; error: string; errores?: undefined };

/**
 * Sube la imagen pendiente y ejecuta `guardar` con la URL final.
 * Si el guardado falla o lanza, borra la imagen recién subida para no dejar huérfanos.
 */
export async function guardarConImagen<R extends { ok: boolean }>(
  bucket: Bucket,
  imagen: ImagenValor,
  guardar: (url: string | null) => Promise<R>,
): Promise<R | ErrorGuardado> {
  let resuelta: ImagenResuelta;
  try {
    resuelta = await resolverImagen(bucket, imagen);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo subir la imagen" };
  }

  try {
    const resultado = await guardar(resuelta.url);
    if (!resultado.ok) await descartarSubida(bucket, resuelta.rutaSubida);
    return resultado;
  } catch {
    await descartarSubida(bucket, resuelta.rutaSubida);
    return { ok: false, error: "Error de conexión. Comprueba tu red e inténtalo de nuevo." };
  }
}
