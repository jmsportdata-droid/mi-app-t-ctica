import { getSupabaseEnv } from "@/lib/supabase/env";

export const BUCKETS = {
  fotosJugadores: "player-photos",
  escudosEquipos: "team-logos",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGEN_TIPOS = ["image/png", "image/jpeg"] as const;
export const IMAGEN_ACCEPT = IMAGEN_TIPOS.join(",");

const EXTENSION: Record<(typeof IMAGEN_TIPOS)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

function esTipoPermitido(tipo: string): tipo is (typeof IMAGEN_TIPOS)[number] {
  return (IMAGEN_TIPOS as readonly string[]).includes(tipo);
}

/** Devuelve un mensaje de error si el archivo no es válido, o null si lo es. */
export function validarImagen(archivo: File): string | null {
  if (!esTipoPermitido(archivo.type)) return "Solo se admiten imágenes PNG o JPG";
  if (archivo.size > IMAGEN_MAX_BYTES) return "La imagen no puede superar 2 MB";
  return null;
}

export function extensionDe(archivo: File): string {
  return esTipoPermitido(archivo.type) ? EXTENSION[archivo.type] : "bin";
}

function prefijoPublico(bucket: Bucket): string {
  return `${getSupabaseEnv().url}/storage/v1/object/public/${bucket}/`;
}

/** Extrae la ruta interna del objeto a partir de su URL pública (null si no es de este bucket). */
export function rutaDesdeUrlPublica(url: string, bucket: Bucket): string | null {
  const prefijo = prefijoPublico(bucket);
  if (!url.startsWith(prefijo)) return null;
  const ruta = decodeURIComponent(url.slice(prefijo.length).split("?")[0] ?? "");
  return ruta && !ruta.includes("..") ? ruta : null;
}
