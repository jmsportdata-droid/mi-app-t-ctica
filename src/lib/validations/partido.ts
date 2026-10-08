import { z } from "zod";
import { esUrlHttps, slidesEmbedUrl, vimeoEmbedUrl } from "@/lib/embeds";
import {
  CAMPOS_INFORME,
  CAMPOS_PLAN,
  ESTADOS_PARTIDO,
  TAGS_INFORME,
  type CampoInforme,
  type CampoPlan,
  type PartidoInput,
  type SufijoPlan,
} from "@/types/partido";
import { textoOpcionalSchema } from "./comun";

export const partidoSchema = z.object({
  rival_id: z.string({ required_error: "Selecciona un rival" }).uuid("Selecciona un rival"),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Introduce una fecha válida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Introduce una fecha válida"),
  estadio: textoOpcionalSchema(100, "El estadio"),
  competicion: textoOpcionalSchema(80, "La competición"),
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
    .refine((v) => vimeoEmbedUrl(v) !== null, "Pega un enlace válido de Vimeo"),
);
const urlSlides = nulable(
  z
    .string()
    .max(URL_MAX)
    .refine((v) => slidesEmbedUrl(v) !== null, "Pega un enlace válido de Google Slides"),
);
const urlHttps = nulable(
  z.string().max(URL_MAX).refine(esUrlHttps, "Introduce una URL válida que empiece por https://"),
);
const notas = nulable(z.string().max(10_000, "Las notas no pueden superar 10.000 caracteres"));

const SCHEMA_POR_SUFIJO: Record<SufijoPlan, z.ZodType<string | null, z.ZodTypeDef, string>> = {
  notas,
  vimeo: urlVimeo,
  imagen1: urlHttps,
  imagen2: urlHttps,
  pdf: urlHttps,
};

export function esCampoPlan(campo: string): campo is CampoPlan {
  return (CAMPOS_PLAN as readonly string[]).includes(campo);
}

export function schemaCampoPlan(campo: CampoPlan) {
  const sufijo = campo.slice(campo.indexOf("_") + 1) as SufijoPlan;
  return SCHEMA_POR_SUFIJO[sufijo];
}

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
