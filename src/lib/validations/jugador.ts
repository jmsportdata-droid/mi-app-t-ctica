import { z } from "zod";
import { POSICIONES, type JugadorInput } from "@/types/jugador";
import { calcularEdad } from "@/lib/utils/edad";
import { rutaImagenSchema } from "./comun";

export { erroresDeZod } from "./comun";

export const jugadorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  fecha_nac: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Introduce una fecha válida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Introduce una fecha válida")
    .refine((v) => {
      const edad = calcularEdad(v);
      return edad !== null && edad >= 5 && edad <= 60;
    }, "La edad debe estar entre 5 y 60 años"),
  posicion: z.enum(POSICIONES, {
    errorMap: () => ({ message: "Selecciona una posición" }),
  }),
  numero: z
    .number({ invalid_type_error: "El dorsal debe ser un número" })
    .int("El dorsal debe ser un número entero")
    .min(1, "El dorsal debe estar entre 1 y 99")
    .max(99, "El dorsal debe estar entre 1 y 99")
    .nullable(),
  foto_ruta: rutaImagenSchema,
}) satisfies z.ZodType<JugadorInput>;

export type JugadorErrores = Partial<Record<keyof JugadorInput, string>>;
