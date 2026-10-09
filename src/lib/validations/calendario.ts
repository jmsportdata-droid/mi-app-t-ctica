import { z } from "zod";
import {
  TIPOS_CARGABLES,
  type ActividadInput,
  type ActividadPartidoInput,
  type TipoActividad,
} from "@/types/calendario";
import { fechaSchema, textoOpcionalSchema } from "./comun";

/** "HH:MM" o "HH:MM:SS" → "HH:MM"; vacío → null. */
export const horaSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.slice(0, 5)))
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida")
      .nullable(),
  )
  .nullable();

const TIPOS = TIPOS_CARGABLES.map((t) => t.valor) as [TipoActividad, ...TipoActividad[]];

const camposComunes = {
  hora_citacion: horaSchema,
  indicaciones: textoOpcionalSchema(500, "Las indicaciones"),
  notas_internas: textoOpcionalSchema(2000, "Las notas internas"),
  visible_jugadores: z.boolean(),
};

export const actividadSchema = z
  .object({
    tipo: z.enum(TIPOS, { errorMap: () => ({ message: "Elegí el tipo de actividad" }) }),
    titulo: z
      .string()
      .trim()
      .min(1, "Poné un título")
      .max(80, "El título no puede superar 80 caracteres"),
    fecha: fechaSchema,
    hora_inicio: horaSchema,
    hora_fin: horaSchema,
    lugar: textoOpcionalSchema(100, "El lugar"),
    ...camposComunes,
  })
  .refine((v) => !v.hora_fin || !v.hora_inicio || v.hora_fin > v.hora_inicio, {
    message: "Tiene que ser después del inicio",
    path: ["hora_fin"],
  }) satisfies z.ZodType<ActividadInput, z.ZodTypeDef, unknown>;

export type ActividadErrores = Partial<Record<keyof ActividadInput, string>>;

/** De la actividad de un partido solo se editan citación, indicaciones, notas y visibilidad. */
export const actividadPartidoSchema = z.object(camposComunes) satisfies z.ZodType<
  ActividadPartidoInput,
  z.ZodTypeDef,
  unknown
>;
