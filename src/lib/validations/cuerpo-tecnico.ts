import { z } from "zod";
import {
  PASSWORD_MIN,
  ROLES,
  type MiembroInput,
  type Rol,
  type TemporadaInput,
} from "@/types/cuerpo-tecnico";
import { fechaSchema, rutaImagenSchema } from "./comun";

const texto = (min: number, max: number, etiqueta: string) =>
  z
    .string()
    .trim()
    .min(min, `${etiqueta} tiene que tener al menos ${min} caracteres`)
    .max(max, `${etiqueta} no puede superar ${max} caracteres`);

export const rolSchema = z.enum(ROLES.map((r) => r.valor) as [Rol, ...Rol[]], {
  errorMap: () => ({ message: "Elegí un rol" }),
});

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres`)
  .max(72, "La contraseña no puede superar 72 caracteres");

const nombrePersona = texto(2, 80, "El nombre");

/** Fechas de inicio y fin: el fin tiene que ser posterior. */
const fechasOrdenadas = (v: { fecha_inicio: string; fecha_fin: string }) =>
  v.fecha_fin > v.fecha_inicio;
const ERROR_FECHAS = {
  message: "Tiene que ser posterior a la fecha de inicio",
  path: ["fecha_fin"],
};

const camposTemporada = {
  club: texto(2, 80, "El club"),
  etiqueta: texto(1, 20, "La temporada"),
  fecha_inicio: fechaSchema,
  fecha_fin: fechaSchema,
};

export const temporadaSchema = z
  .object({
    ...camposTemporada,
    color_principal: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elegí un color"),
    escudo_ruta: rutaImagenSchema,
  })
  .refine(fechasOrdenadas, ERROR_FECHAS) satisfies z.ZodType<TemporadaInput, z.ZodTypeDef, unknown>;

export type TemporadaErrores = Partial<Record<keyof TemporadaInput, string>>;

/** Alta inicial: el cuerpo técnico, quien lo crea y su primera temporada. */
export const altaCuerpoTecnicoSchema = z
  .object({
    nombre: texto(2, 80, "El nombre del cuerpo técnico"),
    mi_nombre: nombrePersona,
    ...camposTemporada,
  })
  .refine(fechasOrdenadas, ERROR_FECHAS);

export type AltaCuerpoTecnicoInput = z.input<typeof altaCuerpoTecnicoSchema>;
export type AltaCuerpoTecnicoErrores = Partial<Record<keyof AltaCuerpoTecnicoInput, string>>;

export const miembroSchema = z.object({
  nombre: nombrePersona,
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  rol: rolSchema,
  password: passwordSchema,
}) satisfies z.ZodType<MiembroInput, z.ZodTypeDef, unknown>;

export type MiembroErrores = Partial<Record<keyof MiembroInput, string>>;
