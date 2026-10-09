"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { textoOpcionalSchema } from "@/lib/validations/comun";
import { LISTA_FORMACIONES, type Formacion } from "@/types/alineacion";
import {
  BLOQUES_ANALISIS,
  CESPEDES,
  SITUACIONES,
  VALORACIONES,
  VIDEOS_VESTUARIO,
  type FaseAnalisis,
  type SituacionPartido,
  type TipoCesped,
  type TipoVideoVestuario,
  type ValoracionAnalisis,
} from "@/types/partido";
import type { ResultadoAutoguardado } from "@/components/ui/AutoSaveField";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();
const urlSchema = z
  .string()
  .trim()
  .max(500, "El link no puede superar 500 caracteres")
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), "Pegá un link que empiece con https://");

function enumDe<T extends string>(valores: readonly T[]) {
  return z.enum(valores as unknown as [T, ...T[]]);
}
const formacionSchema = enumDe<Formacion>(LISTA_FORMACIONES).nullable();
const faseSchema = enumDe<FaseAnalisis>(
  BLOQUES_ANALISIS.flatMap((b) => b.fases.map((f) => f.valor)),
);
const valoracionSchema = enumDe<ValoracionAnalisis>(VALORACIONES.map((v) => v.valor)).nullable();
const situacionSchema = enumDe<SituacionPartido>(SITUACIONES.map((s) => s.valor));
const tipoVideoSchema = enumDe<TipoVideoVestuario>(VIDEOS_VESTUARIO.map((v) => v.valor));

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  console.error(`[partido ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar(partidoId: string) {
  revalidatePath(`/partidos/${partidoId}`);
  revalidatePath("/partidos");
  revalidatePath("/hoy");
}

// ---------- Previa: condiciones, árbitro y contexto del rival -----

const texto = (max: number) => textoOpcionalSchema(max, "El texto");
/** Número opcional con coma o punto decimal ("4,5"). */
const numero = (min: number, max: number, decimales: boolean) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= min && v <= max), {
      message: `Ingresá un número entre ${min} y ${max}`,
    })
    .refine((v) => v === null || decimales || Number.isInteger(v), "Ingresá un número entero");

const CAMPOS_PREVIA = {
  cancha_largo: numero(80, 130, false),
  cancha_ancho: numero(50, 100, false),
  estado_cancha: texto(300),
  clima: texto(300),
  condiciones_notas: texto(1000),
  arbitro: texto(100),
  arbitro_amarillas: numero(0, 20, true),
  arbitro_rojas: numero(0, 5, true),
  arbitro_penales: numero(0, 5, true),
  arbitro_notas: texto(1000),
  rival_racha: texto(300),
  rival_calendario: texto(1000),
  rival_bajas: texto(1000),
  rival_dt: texto(100),
  rival_dt_tendencias: texto(1000),
  rival_notas: texto(2000),
} as const;

export type CampoPrevia = keyof typeof CAMPOS_PREVIA;

function esCampoPrevia(campo: string): campo is CampoPrevia {
  return campo in CAMPOS_PREVIA;
}

/** Guardado automático de un campo de la previa (la fila se crea al primer guardado). */
export async function guardarCampoPrevia(
  partidoId: string,
  campo: string,
  valor: string,
): Promise<ResultadoAutoguardado> {
  if (!idSchema.safeParse(partidoId).success || !esCampoPrevia(campo)) {
    return { ok: false, error: "Campo no válido" };
  }
  const parsed = CAMPOS_PREVIA[campo].safeParse(valor);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Valor no válido" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("partido_previa")
    .upsert({ partido_id: partidoId, [campo]: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, `previa.${campo}`);
  revalidar(partidoId);
  return { ok: true, valor: parsed.data === null ? null : String(parsed.data) };
}

export async function guardarCesped(partidoId: string, cesped: string | null): Promise<Resultado> {
  const parsed = enumDe<TipoCesped>(CESPEDES.map((c) => c.valor))
    .nullable()
    .safeParse(cesped);
  if (!idSchema.safeParse(partidoId).success || !parsed.success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("partido_previa")
    .upsert({ partido_id: partidoId, cesped: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "previa.cesped");
  revalidar(partidoId);
  return { ok: true };
}

export async function guardarFormacionRival(
  partidoId: string,
  formacion: string | null,
): Promise<Resultado> {
  const parsed = formacionSchema.safeParse(formacion);
  if (!idSchema.safeParse(partidoId).success || !parsed.success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("partidos")
    .update({ formacion_rival: parsed.data })
    .eq("id", partidoId);
  if (error) return errorDeBD(error, "formación rival");
  revalidar(partidoId);
  return { ok: true };
}

// ---------- Resultado --------------------------------------------

const golesSchema = z.number().int().min(0).max(50).nullable();
const resultadoSchema = z
  .object({
    goles_favor: golesSchema,
    goles_contra: golesSchema,
    penales_favor: golesSchema,
    penales_contra: golesSchema,
  })
  .refine(
    (v) => (v.goles_favor === null) === (v.goles_contra === null),
    "Cargá los goles de los dos",
  )
  .refine(
    (v) => (v.penales_favor === null) === (v.penales_contra === null),
    "Cargá los penales de los dos (o dejalos vacíos)",
  );

export type ResultadoInput = z.input<typeof resultadoSchema>;

/** Guarda el resultado; con goles cargados, el partido pasa a jugado. */
export async function guardarResultado(
  partidoId: string,
  input: ResultadoInput,
): Promise<Resultado> {
  const parsed = resultadoSchema.safeParse(input);
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá el resultado" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("partidos")
    .update({
      ...parsed.data,
      estado: parsed.data.goles_favor === null ? "planificado" : "jugado",
    })
    .eq("id", partidoId);
  if (error) return errorDeBD(error, "resultado");
  revalidar(partidoId);
  return { ok: true };
}

// ---------- Análisis de video del rival ---------------------------

const analisisSchema = z.object({
  fase: faseSchema,
  texto: z
    .string()
    .trim()
    .min(2, "Escribí la conclusión")
    .max(1000, "La conclusión no puede superar 1000 caracteres"),
  valoracion: valoracionSchema,
  clip_url: urlSchema,
  referencia: textoOpcionalSchema(40, "La referencia"),
});

export type AnalisisInput = z.input<typeof analisisSchema>;

/** Crea (id = null) o edita una conclusión del análisis del rival. */
export async function guardarAnalisis(
  partidoId: string,
  id: string | null,
  input: AnalisisInput,
): Promise<Resultado> {
  const parsed = analisisSchema.safeParse(input);
  if (!idSchema.safeParse(partidoId).success || (id && !idSchema.safeParse(id).success)) {
    return { ok: false, error: "Datos no válidos" };
  }
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  if (id) {
    const { error } = await supabase.from("analisis_rival").update(parsed.data).eq("id", id);
    if (error) return errorDeBD(error, "análisis");
  } else {
    const { count } = await supabase
      .from("analisis_rival")
      .select("id", { count: "exact", head: true })
      .eq("partido_id", partidoId)
      .eq("fase", parsed.data.fase);
    const { error } = await supabase
      .from("analisis_rival")
      .insert({ ...parsed.data, partido_id: partidoId, orden: (count ?? 0) + 1 });
    if (error) return errorDeBD(error, "análisis");
  }
  revalidar(partidoId);
  return { ok: true };
}

export async function eliminarAnalisis(partidoId: string, id: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !idSchema.safeParse(id).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("analisis_rival").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar análisis");
  revalidar(partidoId);
  return { ok: true };
}

// ---------- Escenarios y plan B -----------------------------------

const escenarioSchema = z.object({
  situacion: situacionSchema,
  desde_minuto: z.number().int().min(0).max(130).nullable(),
  formacion: formacionSchema,
  respuesta: z
    .string()
    .trim()
    .min(2, "Escribí qué hacemos en esa situación")
    .max(2000, "La respuesta no puede superar 2000 caracteres"),
  cambios: z
    .array(z.object({ sale: z.string().uuid(), entra: z.string().uuid() }))
    .max(5, "Máximo 5 cambios por escenario"),
});

export type EscenarioInput = z.input<typeof escenarioSchema>;

export async function guardarEscenario(
  partidoId: string,
  id: string | null,
  input: EscenarioInput,
): Promise<Resultado> {
  const parsed = escenarioSchema.safeParse(input);
  if (!idSchema.safeParse(partidoId).success || (id && !idSchema.safeParse(id).success)) {
    return { ok: false, error: "Datos no válidos" };
  }
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  if (id) {
    const { error } = await supabase.from("escenarios_partido").update(parsed.data).eq("id", id);
    if (error) return errorDeBD(error, "escenario");
  } else {
    const { count } = await supabase
      .from("escenarios_partido")
      .select("id", { count: "exact", head: true })
      .eq("partido_id", partidoId);
    const { error } = await supabase
      .from("escenarios_partido")
      .insert({ ...parsed.data, partido_id: partidoId, orden: (count ?? 0) + 1 });
    if (error) return errorDeBD(error, "escenario");
  }
  revalidar(partidoId);
  return { ok: true };
}

export async function eliminarEscenario(partidoId: string, id: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success || !idSchema.safeParse(id).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("escenarios_partido").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar escenario");
  revalidar(partidoId);
  return { ok: true };
}

// ---------- Videos del vestuario ---------------------------------

const videoSchema = z.object({
  url: urlSchema,
  duracion: textoOpcionalSchema(20, "La duración"),
  notas: textoOpcionalSchema(1000, "Las notas"),
  visible_jugadores: z.boolean(),
});

export type VideoInput = z.input<typeof videoSchema>;

export async function guardarVideoVestuario(
  partidoId: string,
  tipo: string,
  input: VideoInput,
): Promise<Resultado> {
  const parsedTipo = tipoVideoSchema.safeParse(tipo);
  const parsed = videoSchema.safeParse(input);
  if (!idSchema.safeParse(partidoId).success || !parsedTipo.success) {
    return { ok: false, error: "Datos no válidos" };
  }
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  if (parsed.data.visible_jugadores && !parsed.data.url) {
    return { ok: false, error: "Pegá el link del video antes de mostrarlo a los jugadores." };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("videos_vestuario")
    .upsert(
      { partido_id: partidoId, tipo: parsedTipo.data, ...parsed.data },
      { onConflict: "partido_id,tipo" },
    );
  if (error) return errorDeBD(error, "video vestuario");
  revalidar(partidoId);
  return { ok: true };
}
