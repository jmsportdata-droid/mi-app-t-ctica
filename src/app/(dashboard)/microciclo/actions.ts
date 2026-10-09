"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { textoOpcionalSchema } from "@/lib/validations/comun";
import { ESPACIOS, ORIENTACIONES, type EspacioTarea, type OrientacionFisica } from "@/types/tarea";
import { ESTADOS_ASISTENCIA, type EstadoAsistencia } from "@/types/sesion";
import type { ResultadoAutoguardado } from "@/components/ui/AutoSaveField";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  if (error.hint === "solo_entrenamiento") {
    return { ok: false, error: "Este bloque no lleva ejercicios." };
  }
  if (error.hint === "sesion_vacia") {
    return { ok: false, error: "Agregá tareas a la sesión antes de guardarla como plantilla." };
  }
  if (error.code === "23505") return { ok: false, error: "Ya hay una plantilla con ese nombre." };
  console.error(`[microciclo ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar() {
  revalidatePath("/microciclo", "layout");
  revalidatePath("/calendario", "layout");
}

export async function agregarTareaSesion(actividadId: string, tareaId: string): Promise<Resultado> {
  if (!idSchema.safeParse(actividadId).success || !idSchema.safeParse(tareaId).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.rpc("agregar_tarea_sesion", {
    p_actividad: actividadId,
    p_tarea: tareaId,
  });
  if (error) return errorDeBD(error, "agregar");
  revalidar();
  return { ok: true };
}

export async function quitarTareaSesion(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("sesion_tareas").delete().eq("id", id);
  if (error) return errorDeBD(error, "quitar");
  revalidar();
  return { ok: true };
}

/** Sube o baja una tarea dentro de la sesión (renumera todas para evitar empates). */
export async function moverTareaSesion(
  id: string,
  direccion: "arriba" | "abajo",
): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const { data: fila } = await supabase
    .from("sesion_tareas")
    .select("actividad_id")
    .eq("id", id)
    .maybeSingle();
  if (!fila) return { ok: false, error: "Esa tarea ya no está en la sesión." };
  const { data: hermanas, error } = await supabase
    .from("sesion_tareas")
    .select("id")
    .eq("actividad_id", fila.actividad_id)
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: true });
  if (error) return errorDeBD(error, "mover");

  const ids = hermanas.map((h) => h.id);
  const i = ids.indexOf(id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];

  const resultados = await Promise.all(
    ids.map((x, orden) =>
      supabase
        .from("sesion_tareas")
        .update({ orden: orden + 1 })
        .eq("id", x),
    ),
  );
  const fallo = resultados.find((r) => r.error)?.error;
  if (fallo) return errorDeBD(fallo, "mover");
  revalidar();
  return { ok: true };
}

const entero = (min: number, max: number) =>
  z
    .number({ invalid_type_error: "Revisá los números (el tiempo va como 2:30)" })
    .int("Revisá los números")
    .min(min, `Mínimo ${min}`)
    .max(max, `Máximo ${max}`)
    .nullable();

const ajusteSchema = z
  .object({
    series: entero(1, 50),
    duracion_seg: entero(5, 7200),
    pausa_seg: entero(0, 1800),
    jugadores: entero(1, 40),
    espacio: z.enum(ESPACIOS.map((e) => e.valor) as [EspacioTarea, ...EspacioTarea[]]).nullable(),
    largo_m: entero(1, 120),
    ancho_m: entero(1, 90),
    notas: textoOpcionalSchema(500, "La nota"),
  })
  .refine((v) => v.pausa_seg === null || v.series !== null, "La pausa va entre series")
  .refine((v) => v.series === null || v.duracion_seg !== null, "Cargá la duración de cada serie");

export type AjusteTareaSesion = z.input<typeof ajusteSchema>;

/** Ajusta el tiempo, el espacio o los jugadores de la tarea solo para esta sesión. */
export async function ajustarTareaSesion(id: string, input: AjusteTareaSesion): Promise<Resultado> {
  const parsed = ajusteSchema.safeParse(input);
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("sesion_tareas").update(parsed.data).eq("id", id);
  if (error) return errorDeBD(error, "ajustar");
  revalidar();
  return { ok: true };
}

const CAMPOS_TEXTO = { objetivo: 300, notas: 2000 } as const;

/** Objetivo o notas de la sesión (crea la sesión si todavía no existe). */
export async function guardarTextoSesion(
  actividadId: string,
  campo: keyof typeof CAMPOS_TEXTO,
  valor: string,
): Promise<ResultadoAutoguardado> {
  const parsed = textoOpcionalSchema(CAMPOS_TEXTO[campo], "El texto").safeParse(valor);
  if (!idSchema.safeParse(actividadId).success || !parsed.success) {
    return {
      ok: false,
      error: parsed.success ? "Datos no válidos" : parsed.error.issues[0]!.message,
    };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("sesiones")
    .upsert({ actividad_id: actividadId, [campo]: parsed.data });
  if (error) return errorDeBD(error, "texto");
  revalidar();
  return { ok: true, valor: parsed.data };
}

const mdSchema = z
  .string()
  .regex(/^MD([+-][1-9])?$/)
  .nullable();

export async function guardarComoPlantilla(
  actividadId: string,
  nombre: string,
  md: string | null,
): Promise<Resultado> {
  const parsedNombre = z
    .string()
    .trim()
    .min(2, "Poné un nombre de al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres")
    .safeParse(nombre);
  if (!parsedNombre.success) return { ok: false, error: parsedNombre.error.issues[0]!.message };
  if (!idSchema.safeParse(actividadId).success || !mdSchema.safeParse(md).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.rpc("guardar_plantilla_sesion", {
    p_actividad: actividadId,
    p_nombre: parsedNombre.data,
    // Los tipos generados no marcan el parámetro como opcional, pero acepta null
    p_md: md as string,
  });
  if (error) return errorDeBD(error, "guardar plantilla");
  revalidar();
  return { ok: true };
}

export async function aplicarPlantilla(
  plantillaId: string,
  actividadId: string,
): Promise<Resultado> {
  if (!idSchema.safeParse(plantillaId).success || !idSchema.safeParse(actividadId).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.rpc("aplicar_plantilla_sesion", {
    p_plantilla: plantillaId,
    p_actividad: actividadId,
  });
  if (error) return errorDeBD(error, "aplicar plantilla");
  revalidar();
  return { ok: true };
}

export async function eliminarPlantilla(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("plantillas_sesion").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar plantilla");
  revalidar();
  return { ok: true };
}

const cierreSchema = z.object({
  minutos_reales: z
    .number({ invalid_type_error: "Cargá los minutos" })
    .int()
    .min(0)
    .max(400, "Máximo 400 minutos")
    .nullable(),
  observaciones_cierre: textoOpcionalSchema(2000, "Las observaciones"),
  valoraciones: z
    .array(
      z.object({
        id: z.string().uuid(),
        valoracion: z.enum(["funciono", "regular", "no_funciono"]).nullable(),
        comentario: textoOpcionalSchema(500, "El comentario"),
      }),
    )
    .max(40)
    .default([]),
  asistencia: z
    .array(
      z.object({
        jugador_id: z.string().uuid(),
        estado: z.enum(
          ESTADOS_ASISTENCIA.map((e) => e.valor) as [EstadoAsistencia, ...EstadoAsistencia[]],
        ),
        nota: textoOpcionalSchema(200, "La nota"),
      }),
    )
    .max(80),
});

export type CierreSesionInput = z.input<typeof cierreSchema>;

/** Cierra la sesión: minutos reales, observaciones y asistencia de cada jugador. */
export async function cerrarSesion(
  actividadId: string,
  input: CierreSesionInput,
): Promise<Resultado> {
  const parsed = cierreSchema.safeParse(input);
  if (!idSchema.safeParse(actividadId).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { asistencia, valoraciones, ...cierre } = parsed.data;

  const { error } = await supabase
    .from("sesiones")
    .upsert({ actividad_id: actividadId, ...cierre, cerrada: true });
  if (error) return errorDeBD(error, "cerrar");

  const { error: errorBorrar } = await supabase
    .from("asistencia_sesion")
    .delete()
    .eq("actividad_id", actividadId);
  if (errorBorrar) return errorDeBD(errorBorrar, "asistencia");
  if (asistencia.length > 0) {
    const { error: errorAsistencia } = await supabase
      .from("asistencia_sesion")
      .insert(asistencia.map((a) => ({ ...a, actividad_id: actividadId })));
    if (errorAsistencia) return errorDeBD(errorAsistencia, "asistencia");
  }
  // Valoración de cada ejercicio (para aprender qué funciona)
  for (const v of valoraciones) {
    const { error: errorValoracion } = await supabase
      .from("sesion_tareas")
      .update({ valoracion: v.valoracion, comentario: v.comentario })
      .eq("id", v.id)
      .eq("actividad_id", actividadId);
    if (errorValoracion) return errorDeBD(errorValoracion, "valoración");
  }
  revalidar();
  revalidatePath("/tareas", "layout");
  return { ok: true };
}

export async function reabrirSesion(actividadId: string): Promise<Resultado> {
  if (!idSchema.safeParse(actividadId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("sesiones")
    .update({ cerrada: false })
    .eq("actividad_id", actividadId);
  if (error) return errorDeBD(error, "reabrir");
  revalidar();
  return { ok: true };
}

const enfoqueSchema = z.object({
  orientacion: z
    .enum(ORIENTACIONES.map((o) => o.valor) as [OrientacionFisica, ...OrientacionFisica[]])
    .nullable(),
  principios: z.array(z.string().uuid()).max(12, "Elegí hasta 12 principios"),
});

export type EnfoqueSesionInput = z.input<typeof enfoqueSchema>;

/** Tipo de entrenamiento y principios que se quieren trabajar en la sesión. */
export async function guardarEnfoqueSesion(
  actividadId: string,
  input: EnfoqueSesionInput,
): Promise<Resultado> {
  const parsed = enfoqueSchema.safeParse(input);
  if (!idSchema.safeParse(actividadId).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("sesiones")
    .upsert({ actividad_id: actividadId, ...parsed.data });
  if (error) return errorDeBD(error, "enfoque");
  revalidar();
  return { ok: true };
}
