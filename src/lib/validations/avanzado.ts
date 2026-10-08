import { z } from "zod";
import { videoEmbedUrl, vimeoEmbedUrl } from "@/lib/embeds";
import { CAMPOS_ABP, CATEGORIAS_ABP, TIPOS_ABP } from "@/types/abp";
import { LISTA_FORMACIONES, TITULARES, type Formacion } from "@/types/alineacion";
import { ATRIBUTOS, type Atributo } from "@/types/atributos";
import { MINUTO_MAX, TIPOS_EVENTO } from "@/types/evento";

/** Convierte una lista readonly de literales en la tupla que exige z.enum. */
function enumDe<T extends string>(valores: readonly T[]) {
  return z.enum(valores as [T, ...T[]]);
}

// ---------- Atributos de jugador ---------------------------------

const valorAtributo = z
  .number({ invalid_type_error: "Debe ser un número" })
  .int("Debe ser un número entero")
  .min(0, "Mínimo 0")
  .max(100, "Máximo 100");

export const atributosSchema = z.object(
  Object.fromEntries(ATRIBUTOS.map((a) => [a, valorAtributo])) as Record<
    Atributo,
    typeof valorAtributo
  >,
);

// ---------- Alineación -------------------------------------------

const uuid = z.string().uuid();

export const alineacionSchema = z
  .object({
    formacion: enumDe<Formacion>(LISTA_FORMACIONES),
    titulares: z.array(uuid.nullable()).length(TITULARES),
    suplentes: z.array(uuid).max(30),
  })
  .refine(
    ({ titulares, suplentes }) => {
      const ids = [...titulares.filter((t): t is string => t !== null), ...suplentes];
      return new Set(ids).size === ids.length;
    },
    { message: "Un jugador no puede estar dos veces en la alineación" },
  );

// ---------- ABP --------------------------------------------------

export const claveAbpSchema = z
  .object({
    tipo: enumDe(TIPOS_ABP.map((t) => t.valor)),
    categoria: enumDe(CATEGORIAS_ABP.map((c) => c.valor)),
    indice: z.number().int().min(1),
  })
  .refine(
    ({ categoria, indice }) =>
      indice <= (CATEGORIAS_ABP.find((c) => c.valor === categoria)?.tarjetas ?? 0),
    { message: "Tarjeta no válida" },
  );

export const campoAbpSchema = enumDe(CAMPOS_ABP);

/** Texto opcional: vacío → null. */
const nulable = (schema: z.ZodType<string>) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(schema.nullable());

export const SCHEMA_VALOR_ABP = {
  descripcion: nulable(z.string().max(2000, "Máximo 2.000 caracteres")),
  vimeo_url: nulable(
    z
      .string()
      .max(2000)
      .refine((v) => vimeoEmbedUrl(v) !== null, "Pega un enlace válido de Vimeo"),
  ),
} as const;

// ---------- Vídeo y eventos del partido --------------------------

export const videoPartidoSchema = nulable(
  z
    .string()
    .max(2000)
    .refine((v) => videoEmbedUrl(v) !== null, "Pega un enlace válido de Vimeo o YouTube"),
);

const coordenada = z.number().min(0).max(100).nullable();

export const eventoSchema = z.object({
  tipo: enumDe(TIPOS_EVENTO.map((t) => t.valor)),
  minuto: z
    .number({ invalid_type_error: "Indica el minuto" })
    .int("El minuto debe ser un número entero")
    .min(0, "El minuto no puede ser negativo")
    .max(MINUTO_MAX, `El minuto máximo es ${MINUTO_MAX}`),
  descripcion: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .nullable()
    .transform((v) => (v ? v : null)),
  jugador_id: uuid.nullable(),
  x: coordenada,
  y: coordenada,
});
