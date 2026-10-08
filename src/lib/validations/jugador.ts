import { z } from "zod";
import {
  MAX_POSICIONES,
  PIES_HABILES,
  POSICIONES,
  POSICIONES_ESPECIFICAS,
  type JugadorInput,
  type PieHabil,
  type PosicionEspecifica,
} from "@/types/jugador";
import { calcularEdad } from "@/lib/utils/edad";
import { fechaSchema, rutaImagenSchema, textoOpcionalSchema } from "./comun";

export { erroresDeZod } from "./comun";

const CODIGOS = POSICIONES_ESPECIFICAS.map((p) => p.codigo) as [
  PosicionEspecifica,
  ...PosicionEspecifica[],
];
const PIES = PIES_HABILES.map((p) => p.valor) as [PieHabil, ...PieHabil[]];

export const jugadorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre tiene que tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  fecha_nac: fechaSchema
    .refine((v) => {
      const edad = calcularEdad(v);
      return edad !== null && edad >= 5 && edad <= 60;
    }, "La edad tiene que estar entre 5 y 60 años")
    .nullable(),
  posicion: z.enum(POSICIONES, {
    errorMap: () => ({ message: "Elegí una posición" }),
  }),
  numero: z
    .number({ invalid_type_error: "El número de camiseta tiene que ser un número" })
    .int("El número de camiseta tiene que ser entero")
    .min(1, "El número de camiseta va del 1 al 99")
    .max(99, "El número de camiseta va del 1 al 99")
    .nullable(),
  foto_ruta: rutaImagenSchema,
  posiciones: z
    .array(z.enum(CODIGOS))
    .max(MAX_POSICIONES, `Elegí hasta ${MAX_POSICIONES} posiciones`)
    .transform((p) => Array.from(new Set(p))),
  pie_habil: z.enum(PIES).nullable(),
  altura_cm: z
    .number({ invalid_type_error: "La altura tiene que ser un número" })
    .int("La altura va en centímetros, sin decimales")
    .min(140, "La altura va de 140 a 220 cm")
    .max(220, "La altura va de 140 a 220 cm")
    .nullable(),
  nacionalidad: textoOpcionalSchema(60, "La nacionalidad"),
}) satisfies z.ZodType<JugadorInput, z.ZodTypeDef, unknown>;

export type JugadorErrores = Partial<Record<keyof JugadorInput, string>>;
