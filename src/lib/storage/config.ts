/** Buckets privados: la primera carpeta de cada ruta es el id del cuerpo técnico. */
export const BUCKETS = {
  fotosJugadores: "fotos-jugadores",
  escudos: "escudos",
  graficosTareas: "graficos-tareas",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const LISTA_BUCKETS: readonly Bucket[] = Object.values(BUCKETS);

export function esBucket(valor: string): valor is Bucket {
  return (LISTA_BUCKETS as readonly string[]).includes(valor);
}

export const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;
/** Los gráficos de tareas generados con IA pesan más que una foto o un escudo. */
const MAX_BYTES_BUCKET: Partial<Record<Bucket, number>> = {
  "graficos-tareas": 5 * 1024 * 1024,
};

export function maxBytesDe(bucket: Bucket): number {
  return MAX_BYTES_BUCKET[bucket] ?? IMAGEN_MAX_BYTES;
}
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
export function validarImagen(archivo: File, bucket: Bucket): string | null {
  if (!esTipoPermitido(archivo.type)) return "Solo se admiten imágenes PNG o JPG";
  const max = maxBytesDe(bucket);
  if (archivo.size > max) return `La imagen no puede superar ${max / 1024 / 1024} MB`;
  return null;
}

export function extensionDe(archivo: File): string {
  return esTipoPermitido(archivo.type) ? EXTENSION[archivo.type] : "bin";
}

/** Ruta válida de un objeto: <cuerpo_tecnico_id>/<uuid>.<png|jpg> */
export const RUTA_IMAGEN = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg)$/;

/**
 * URL de la app que sirve la imagen (src/app/imagenes). Los buckets son privados:
 * la ruta verifica la sesión y Storage aplica los permisos del cuerpo técnico.
 */
export function urlImagen(bucket: Bucket, ruta: string | null | undefined): string | null {
  return ruta ? `/imagenes/${bucket}/${ruta}` : null;
}
