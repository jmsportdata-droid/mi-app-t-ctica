import { z } from "zod";
import { RUTA_IMAGEN } from "@/lib/storage/config";

/** Ruta opcional de una imagen subida a Storage (<cuerpo_tecnico_id>/<uuid>.<ext>). */
export const rutaImagenSchema = z.string().regex(RUTA_IMAGEN, "Imagen no válida").nullable();

/** Fecha ISO "YYYY-MM-DD". */
export const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Ingresá una fecha válida");

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
