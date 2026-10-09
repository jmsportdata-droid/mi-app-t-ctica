import { createClient } from "@/lib/supabase/client";
import { extensionDe, validarImagen, type Bucket } from "./config";

/** Estado de un campo de imagen en un formulario. */
export interface ImagenValor {
  /** Archivo nuevo seleccionado y pendiente de subir */
  archivo: File | null;
  /** Ruta ya guardada en el bucket (o null si no hay imagen / se ha quitado) */
  ruta: string | null;
}

export interface ImagenResuelta {
  ruta: string | null;
  /** Ruta del archivo subido en esta operación (para limpiarlo si algo falla después) */
  rutaSubida: string | null;
}

/**
 * Sube el archivo pendiente (si lo hay) a la carpeta del cuerpo técnico y devuelve su ruta.
 * Se sube desde el navegador para no pasar por el límite de 1 MB de las Server Actions.
 */
export async function resolverImagen(
  bucket: Bucket,
  cuerpoTecnicoId: string,
  valor: ImagenValor,
): Promise<ImagenResuelta> {
  if (!valor.archivo) return { ruta: valor.ruta, rutaSubida: null };

  const errorValidacion = validarImagen(valor.archivo, bucket);
  if (errorValidacion) throw new Error(errorValidacion);

  const supabase = createClient();
  const ruta = `${cuerpoTecnicoId}/${crypto.randomUUID()}.${extensionDe(valor.archivo)}`;

  const { error } = await supabase.storage.from(bucket).upload(ruta, valor.archivo, {
    cacheControl: "31536000",
    contentType: valor.archivo.type,
    upsert: false,
  });
  if (error) {
    console.error("[storage upload]", error.message);
    throw new Error("No se pudo subir la imagen. Probá de nuevo.");
  }

  return { ruta, rutaSubida: ruta };
}

/** Borra un archivo recién subido cuando el guardado posterior ha fallado. */
async function descartarSubida(bucket: Bucket, ruta: string | null): Promise<void> {
  if (!ruta) return;
  const { error } = await createClient().storage.from(bucket).remove([ruta]);
  if (error) console.error("[storage cleanup]", error.message);
}

type ErrorGuardado = { ok: false; error: string; errores?: undefined };

/**
 * Sube la imagen pendiente y ejecuta `guardar` con la ruta final.
 * Si el guardado falla o lanza, borra la imagen recién subida para no dejar huérfanos.
 */
export async function guardarConImagen<R extends { ok: boolean }>(
  bucket: Bucket,
  cuerpoTecnicoId: string,
  imagen: ImagenValor,
  guardar: (ruta: string | null) => Promise<R>,
): Promise<R | ErrorGuardado> {
  let resuelta: ImagenResuelta;
  try {
    resuelta = await resolverImagen(bucket, cuerpoTecnicoId, imagen);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo subir la imagen" };
  }

  try {
    const resultado = await guardar(resuelta.ruta);
    if (!resultado.ok) await descartarSubida(bucket, resuelta.rutaSubida);
    return resultado;
  } catch {
    await descartarSubida(bucket, resuelta.rutaSubida);
    return { ok: false, error: "Error de conexión. Revisá tu conexión y probá de nuevo." };
  }
}
