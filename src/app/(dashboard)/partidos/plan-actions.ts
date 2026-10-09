"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAccion, SESION_EXPIRADA } from "@/lib/supabase/auth";
import { fechaSchema, textoOpcionalSchema } from "@/lib/validations/comun";
import { horaSchema } from "@/lib/validations/calendario";
import {
  CAMPOS_LISTA_PLAN,
  CAMPOS_TEXTO_PLAN,
  type CampoListaPlan,
  type CampoTextoPlan,
} from "@/types/partido";
import type { ResultadoAutoguardado } from "@/components/ui/AutoSaveField";

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  console.error(`[plan ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

function revalidar(partidoId: string) {
  revalidatePath(`/partidos/${partidoId}`);
}

// ---------- Plan de partido --------------------------------------

function esCampoTexto(campo: string): campo is CampoTextoPlan {
  return campo in CAMPOS_TEXTO_PLAN;
}

/** Guardado automático de un texto del plan (la fila se crea al primer guardado). */
export async function guardarTextoPlan(
  partidoId: string,
  campo: string,
  valor: string,
): Promise<ResultadoAutoguardado> {
  if (!idSchema.safeParse(partidoId).success || !esCampoTexto(campo)) {
    return { ok: false, error: "Campo no válido" };
  }
  const parsed = textoOpcionalSchema(CAMPOS_TEXTO_PLAN[campo], "El texto").safeParse(valor);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("planes_partido")
    .upsert({ partido_id: partidoId, [campo]: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, campo);
  revalidar(partidoId);
  return { ok: true, valor: parsed.data };
}

const clavesSchema = z
  .array(z.string().trim().max(200, "Cada clave puede tener hasta 200 caracteres"))
  .max(3)
  .transform((v) => v.filter(Boolean));

/** Las 3 claves del partido. */
export async function guardarClavesPlan(partidoId: string, claves: string[]): Promise<Resultado> {
  const parsed = clavesSchema.safeParse(claves);
  if (!idSchema.safeParse(partidoId).success || !parsed.success) {
    return {
      ok: false,
      error: parsed.success ? "Datos no válidos" : parsed.error.issues[0]!.message,
    };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("planes_partido")
    .upsert({ partido_id: partidoId, claves: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "claves");
  revalidar(partidoId);
  return { ok: true };
}

/** Principios o jugadores de un momento del plan, o los principios del microciclo. */
export async function guardarListaPlan(
  partidoId: string,
  campo: string,
  ids: string[],
): Promise<Resultado> {
  const parsed = z.array(z.string().uuid()).max(30).safeParse(ids);
  if (
    !idSchema.safeParse(partidoId).success ||
    !(CAMPOS_LISTA_PLAN as readonly string[]).includes(campo) ||
    !parsed.success
  ) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("planes_partido")
    .upsert(
      { partido_id: partidoId, [campo as CampoListaPlan]: [...new Set(parsed.data)] },
      { onConflict: "partido_id" },
    );
  if (error) return errorDeBD(error, campo);
  revalidar(partidoId);
  return { ok: true };
}

const jugadoresClaveSchema = z
  .array(
    z.object({
      nombre: z.string().trim().min(1, "Poné el nombre del jugador").max(80),
      dorsal: z.number().int().min(0).max(99).nullable(),
      como: z.string().trim().max(500, "Hasta 500 caracteres"),
      responsable: z.string().uuid().nullable(),
    }),
  )
  .max(6, "Hasta 6 jugadores clave");

export type JugadorClaveInput = z.input<typeof jugadoresClaveSchema>[number];

export async function guardarJugadoresClave(
  partidoId: string,
  jugadores: JugadorClaveInput[],
): Promise<Resultado> {
  const parsed = jugadoresClaveSchema.safeParse(jugadores);
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("planes_partido")
    .upsert({ partido_id: partidoId, jugadores_clave: parsed.data }, { onConflict: "partido_id" });
  if (error) return errorDeBD(error, "jugadores clave");
  revalidar(partidoId);
  return { ok: true };
}

// ---------- Concentración ----------------------------------------

const concentracionSchema = z.object({
  lugar: textoOpcionalSchema(150, "El lugar"),
  entrada_fecha: fechaSchema.nullable(),
  entrada_hora: horaSchema,
  salida_fecha: fechaSchema.nullable(),
  salida_hora: horaSchema,
  notas: textoOpcionalSchema(1000, "Las notas"),
});

export type ConcentracionInput = z.input<typeof concentracionSchema>;

/**
 * Guarda la concentración y mantiene su actividad en el calendario (se crea
 * con la fecha de entrada, para que salga en la semana que se comparte).
 */
export async function guardarConcentracion(
  partidoId: string,
  input: ConcentracionInput,
): Promise<Resultado> {
  const parsed = concentracionSchema.safeParse(input);
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const datos = parsed.data;

  const [{ data: partido }, { data: actual }] = await Promise.all([
    supabase.from("partidos").select("temporada_id, fecha").eq("id", partidoId).maybeSingle(),
    supabase
      .from("concentraciones")
      .select("actividad_id")
      .eq("partido_id", partidoId)
      .maybeSingle(),
  ]);
  if (!partido) return { ok: false, error: "Ese partido ya no existe." };

  // Actividad del calendario: se crea o se actualiza con la entrada
  let actividadId = actual?.actividad_id ?? null;
  if (datos.entrada_fecha) {
    const actividad = {
      tipo: "concentracion" as const,
      titulo: "Concentración",
      fecha: datos.entrada_fecha,
      hora_inicio: datos.entrada_hora,
      hora_citacion: datos.entrada_hora,
      lugar: datos.lugar,
      visible_jugadores: true,
    };
    if (actividadId) {
      const { data: actualizada } = await supabase
        .from("actividades")
        .update(actividad)
        .eq("id", actividadId)
        .select("id")
        .maybeSingle();
      if (!actualizada) actividadId = null;
    }
    if (!actividadId) {
      const { data: nueva, error } = await supabase
        .from("actividades")
        .insert({ ...actividad, temporada_id: partido.temporada_id })
        .select("id")
        .single();
      if (error) return errorDeBD(error, "actividad concentración");
      actividadId = nueva.id;
    }
  }

  const { error } = await supabase
    .from("concentraciones")
    .upsert(
      { partido_id: partidoId, ...datos, actividad_id: actividadId },
      { onConflict: "partido_id" },
    );
  if (error) return errorDeBD(error, "concentración");

  revalidar(partidoId);
  revalidatePath("/calendario", "layout");
  revalidatePath("/microciclo", "layout");
  return { ok: true };
}

/** Sin concentración: borra habitaciones y la actividad del calendario que se creó. */
export async function quitarConcentracion(partidoId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { data, error } = await supabase
    .from("concentraciones")
    .delete()
    .eq("partido_id", partidoId)
    .select("actividad_id")
    .maybeSingle();
  if (error) return errorDeBD(error, "quitar concentración");
  if (data?.actividad_id) await supabase.from("actividades").delete().eq("id", data.actividad_id);
  revalidar(partidoId);
  revalidatePath("/calendario", "layout");
  revalidatePath("/microciclo", "layout");
  return { ok: true };
}

export async function agregarHabitacion(partidoId: string, capacidad: number): Promise<Resultado> {
  const parsedCapacidad = z.number().int().min(1).max(4).safeParse(capacidad);
  if (!idSchema.safeParse(partidoId).success || !parsedCapacidad.success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { count } = await supabase
    .from("habitaciones")
    .select("id", { count: "exact", head: true })
    .eq("partido_id", partidoId);
  const n = (count ?? 0) + 1;
  const { error } = await supabase.from("habitaciones").insert({
    partido_id: partidoId,
    nombre: `Habitación ${n}`,
    capacidad: parsedCapacidad.data,
    orden: n,
  });
  if (error) return errorDeBD(error, "habitación");
  revalidar(partidoId);
  return { ok: true };
}

export async function renombrarHabitacion(
  partidoId: string,
  id: string,
  nombre: string,
): Promise<ResultadoAutoguardado> {
  const parsed = z.string().trim().min(1, "Poné un nombre").max(40).safeParse(nombre);
  if (!idSchema.safeParse(id).success || !parsed.success) {
    return {
      ok: false,
      error: parsed.success ? "Datos no válidos" : parsed.error.issues[0]!.message,
    };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase
    .from("habitaciones")
    .update({ nombre: parsed.data })
    .eq("id", id);
  if (error) return errorDeBD(error, "renombrar habitación");
  revalidar(partidoId);
  return { ok: true, valor: parsed.data };
}

export async function eliminarHabitacion(partidoId: string, id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { error } = await accion.supabase.from("habitaciones").delete().eq("id", id);
  if (error) return errorDeBD(error, "eliminar habitación");
  revalidar(partidoId);
  return { ok: true };
}

/** Pone al jugador en la habitación (y lo saca de la que tenía); null = sin habitación. */
export async function asignarHabitacion(
  partidoId: string,
  jugadorId: string,
  habitacionId: string | null,
): Promise<Resultado> {
  if (
    !idSchema.safeParse(partidoId).success ||
    !idSchema.safeParse(jugadorId).success ||
    (habitacionId && !idSchema.safeParse(habitacionId).success)
  ) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;
  const { data: habitaciones, error } = await supabase
    .from("habitaciones")
    .select("id, capacidad, jugadores")
    .eq("partido_id", partidoId);
  if (error) return errorDeBD(error, "asignar");

  const destino = habitaciones.find((h) => h.id === habitacionId);
  if (habitacionId && !destino) return { ok: false, error: "Esa habitación ya no existe." };
  if (
    destino &&
    !destino.jugadores.includes(jugadorId) &&
    destino.jugadores.length >= destino.capacidad
  ) {
    return { ok: false, error: "La habitación está completa." };
  }

  for (const h of habitaciones) {
    const tiene = h.jugadores.includes(jugadorId);
    const debeTener = h.id === habitacionId;
    if (tiene === debeTener) continue;
    const jugadores = debeTener
      ? [...h.jugadores, jugadorId]
      : h.jugadores.filter((j) => j !== jugadorId);
    const { error: e } = await supabase.from("habitaciones").update({ jugadores }).eq("id", h.id);
    if (e) return errorDeBD(e, "asignar");
  }
  revalidar(partidoId);
  return { ok: true };
}

/**
 * Copia las habitaciones de la última concentración de la temporada, solo con
 * los jugadores convocados ahora. Reemplaza las habitaciones actuales.
 */
export async function repetirUltimasHabitaciones(
  partidoId: string,
): Promise<{ ok: true; copiadas: number } | { ok: false; error: string }> {
  if (!idSchema.safeParse(partidoId).success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase } = accion;

  const { data: partido } = await supabase
    .from("partidos")
    .select("temporada_id, fecha")
    .eq("id", partidoId)
    .maybeSingle();
  if (!partido) return { ok: false, error: "Ese partido ya no existe." };

  const { data: anteriores } = await supabase
    .from("partidos")
    .select("id")
    .eq("temporada_id", partido.temporada_id)
    .lt("fecha", partido.fecha)
    .order("fecha", { ascending: false })
    .limit(15);
  const ids = (anteriores ?? []).map((p) => p.id);
  const { data: conHabitaciones } = ids.length
    ? await supabase.from("habitaciones").select("partido_id").in("partido_id", ids)
    : { data: [] };
  const usados = new Set((conHabitaciones ?? []).map((h) => h.partido_id));
  // La más reciente: los ids vienen ordenados por fecha descendente
  const anterior = ids.find((id) => usados.has(id));
  if (!anterior) return { ok: false, error: "No hay una concentración anterior con habitaciones." };

  const [{ data: previas }, { data: alineacion }] = await Promise.all([
    supabase.from("habitaciones").select("*").eq("partido_id", anterior).order("orden"),
    supabase
      .from("alineacion_partido")
      .select("titulares, suplentes")
      .eq("partido_id", partidoId)
      .maybeSingle(),
  ]);
  const convocados = new Set(
    [...(alineacion?.titulares ?? []), ...(alineacion?.suplentes ?? [])].filter(
      Boolean,
    ) as string[],
  );

  await supabase.from("habitaciones").delete().eq("partido_id", partidoId);
  const nuevas = (previas ?? []).map((h, i) => ({
    partido_id: partidoId,
    nombre: h.nombre,
    capacidad: h.capacidad,
    jugadores: h.jugadores.filter((j) => convocados.has(j)),
    orden: i + 1,
  }));
  if (nuevas.length > 0) {
    const { error } = await supabase.from("habitaciones").insert(nuevas);
    if (error) return errorDeBD(error, "repetir habitaciones");
  }
  revalidar(partidoId);
  return { ok: true, copiadas: nuevas.length };
}
