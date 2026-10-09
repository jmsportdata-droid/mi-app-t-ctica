import { z } from "zod";
import {
  COMPETITIVIDADES,
  ESPACIOS,
  ORIENTACIONES,
  TIPOS_TAREA,
  VIAS,
  type TareaInput,
} from "@/types/tarea";
import { rutaImagenSchema, textoOpcionalSchema } from "./comun";

function enumDe<T extends string>(lista: readonly { valor: T }[]) {
  return lista.map((x) => x.valor) as [T, ...T[]];
}

function enteroOpcional(min: number, max: number, etiqueta: string) {
  return z
    .number({ invalid_type_error: `${etiqueta}: ingresá un número` })
    .int(`${etiqueta}: ingresá un número entero`)
    .min(min, `${etiqueta}: mínimo ${min}`)
    .max(max, `${etiqueta}: máximo ${max}`)
    .nullable();
}

/** Duración en segundos; NaN = el texto no tenía el formato m:ss. */
function duracionOpcional(min: number, max: number) {
  return z
    .number({ invalid_type_error: "Usá minutos o minutos:segundos (ej. 2:30)" })
    .int()
    .min(min, "Es muy corta")
    .max(max, "Es muy larga")
    .nullable();
}

const idsSchema = z.array(z.string().uuid()).max(30);

export const tareaSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre tiene que tener al menos 2 caracteres")
      .max(120, "El nombre no puede superar 120 caracteres"),
    tipo: z.enum(enumDe(TIPOS_TAREA), { errorMap: () => ({ message: "Elegí el tipo de tarea" }) }),
    via: z.enum(enumDe(VIAS)).nullable(),
    competitividad: z.enum(enumDe(COMPETITIVIDADES)).nullable(),
    orientacion_fisica: z.enum(enumDe(ORIENTACIONES)).nullable(),
    formato: textoOpcionalSchema(60, "El formato"),
    jugadores: enteroOpcional(1, 40, "Jugadores"),
    series: enteroOpcional(1, 50, "Series"),
    duracion_seg: duracionOpcional(5, 7200),
    pausa_seg: duracionOpcional(0, 1800),
    espacio: z.enum(enumDe(ESPACIOS)).nullable(),
    largo_m: enteroOpcional(1, 120, "Largo"),
    ancho_m: enteroOpcional(1, 90, "Ancho"),
    descripcion: textoOpcionalSchema(3000, "La descripción"),
    grafico_ruta: rutaImagenSchema,
    video_url: z
      .string()
      .trim()
      .max(500, "El link no puede superar 500 caracteres")
      .nullable()
      .transform((v) => (v ? v : null))
      .refine(
        (v) => v === null || /^https?:\/\//i.test(v),
        "Pegá un link que empiece con https://",
      ),
    objetivos: idsSchema,
    contenidos: idsSchema,
  })
  .refine((v) => v.espacio !== "medidas" || (v.largo_m !== null && v.ancho_m !== null), {
    message: "Cargá el largo y el ancho",
    path: ["largo_m"],
  })
  .refine((v) => v.pausa_seg === null || v.series !== null, {
    message: "La pausa va entre series: cargá las series",
    path: ["pausa_seg"],
  })
  .refine((v) => v.series === null || v.duracion_seg !== null, {
    message: "Cargá la duración de cada serie",
    path: ["duracion_seg"],
  }) satisfies z.ZodType<TareaInput, z.ZodTypeDef, unknown>;

export type TareaErrores = Partial<Record<keyof TareaInput, string>>;

export const promptSchema = textoOpcionalSchema(3000, "El prompt");
