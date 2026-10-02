import { z } from "zod";
import { rutaDesdeUrlPublica, type Bucket } from "@/lib/storage/config";

/** URL de imagen opcional que debe pertenecer al bucket indicado de nuestro proyecto. */
export function urlImagenSchema(bucket: Bucket) {
  return z
    .string()
    .url("URL de imagen no válida")
    .refine((url) => rutaDesdeUrlPublica(url, bucket) !== null, "URL de imagen no válida")
    .nullable();
}

/** Texto opcional: cadenas vacías se guardan como null. */
export function textoOpcionalSchema(max: number, etiqueta: string) {
  return z
    .string()
    .trim()
    .max(max, `${etiqueta} no puede superar ${max} caracteres`)
    .nullable()
    .transform((v) => (v ? v : null));
}

/** Convierte los issues de Zod en un mapa campo → primer mensaje de error. */
export function erroresDeZod<T>(error: z.ZodError<T>): Partial<Record<keyof T, string>> {
  const errores: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const campo = issue.path[0] as keyof T | undefined;
    if (campo !== undefined && !errores[campo]) errores[campo] = issue.message;
  }
  return errores;
}
