import { z } from "zod";
import { esUrlHttps, slidesEmbedUrl, vimeoEmbedUrl } from "@/lib/embeds";
import {
  CAMPOS_INFORME,
  ESTADOS_PARTIDO,
  TAGS_INFORME,
  type CampoInforme,
  type PartidoInput,
} from "@/types/partido";
import { textoOpcionalSchema } from "./comun";
import { horaSchema } from "./calendario";

export const partidoSchema = z.object({
  rival_id: z.string({ required_error: "Elegí un rival" }).uuid("Elegí un rival"),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Ingresá una fecha válida"),
  hora: horaSchema,
  estadio: textoOpcionalSchema(100, "El estadio"),
  competicion: textoOpcionalSchema(80, "La competencia"),
  es_local: z.boolean(),
  estado: z.enum(ESTADOS_PARTIDO),
}) satisfies z.ZodType<PartidoInput, z.ZodTypeDef, unknown>;

export type PartidoErrores = Partial<Record<keyof PartidoInput, string>>;

// ---------- Campos con guardado automático -----------------------

/** Texto opcional: vacío → null. */
const nulable = (schema: z.ZodType<string>) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(schema.nullable());

const URL_MAX = 2000;

const urlVimeo = nulable(
  z
    .string()
    .max(URL_MAX)
    .refine((v) => vimeoEmbedUrl(v) !== null, "Pegá un enlace válido de Vimeo"),
);
const urlSlides = nulable(
  z
    .string()
    .max(URL_MAX)
    .refine((v) => slidesEmbedUrl(v) !== null, "Pegá un enlace válido de Google Slides"),
);
export const SCHEMA_CAMPO_INFORME: Record<
  CampoInforme,
  z.ZodType<string | null, z.ZodTypeDef, string>
> = {
  slides_url: urlSlides,
  vimeo_url: urlVimeo,
};

export function esCampoInforme(campo: string): campo is CampoInforme {
  return (CAMPOS_INFORME as readonly string[]).includes(campo);
}

const VALORES_TAGS = TAGS_INFORME.map((t) => t.valor) as [
  (typeof TAGS_INFORME)[number]["valor"],
  ...(typeof TAGS_INFORME)[number]["valor"][],
];

export const tagsSchema = z
  .array(z.enum(VALORES_TAGS))
  .max(TAGS_INFORME.length)
  .transform((tags) => Array.from(new Set(tags)));
