"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { cicloDe, fechaEquivalente } from "@/lib/calendario";
import { getAccion, SESION_EXPIRADA, SIN_TEMPORADA } from "@/lib/supabase/auth";
import { erroresDeZod } from "@/lib/validations/comun";
import {
  actividadPartidoSchema,
  actividadSchema,
  type ActividadErrores,
} from "@/lib/validations/calendario";
import { fechaSchema } from "@/lib/validations/comun";
import { hoyISO, sumarDias } from "@/lib/utils/fecha";
import type { Actividad, ActividadInput, ActividadPartidoInput } from "@/types/calendario";

export type ActividadActionResult =
  | { ok: true; id: string; fecha: string }
  | { ok: false; error: string; errores?: ActividadErrores };

type Resultado = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

function errorDeBD(error: PostgrestError, contexto: string): { ok: false; error: string } {
  if (error.hint === "tiene_sesion") {
    return {
      ok: false,
      error: "Este entrenamiento tiene una sesión armada: no puede cambiar de tipo.",
    };
  }
  console.error(`[calendario ${contexto}]`, error.code, error.message);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
}

/** Los campos que se copian al duplicar una actividad. */
function copiaDe(a: Actividad) {
  return {
    temporada_id: a.temporada_id,
    tipo: a.tipo,
    titulo: a.titulo,
    hora_inicio: a.hora_inicio,
    hora_fin: a.hora_fin,
    hora_citacion: a.hora_citacion,
    lugar: a.lugar,
    indicaciones: a.indicaciones,
    notas_internas: a.notas_internas,
    visible_jugadores: a.visible_jugadores,
  };
}

function revalidar() {
  revalidatePath("/calendario", "layout");
  revalidatePath("/microciclo", "layout");
}

/** Crea (id = null) o actualiza una actividad cargada a mano. */
export async function guardarActividad(
  id: string | null,
  input: ActividadInput,
): Promise<ActividadActionResult> {
  const parsed = actividadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos marcados", errores: erroresDeZod(parsed.error) };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;

  let consulta;
  if (id) {
    // Las actividades de partido no cambian de tipo (se editan con guardarActividadPartido)
    consulta = supabase.from("actividades").update(parsed.data).eq("id", id).is("partido_id", null);
  } else {
    if (!contexto.temporada) return SIN_TEMPORADA;
    consulta = supabase
      .from("actividades")
      .insert({ ...parsed.data, temporada_id: contexto.temporada.id });
  }
  const { data, error } = await consulta.select("id, fecha").single();
  if (error) {
    if (error.code === "PGRST116") return { ok: false, error: "Esa actividad ya no existe." };
    return errorDeBD(error, "guardar");
  }

  revalidar();
  return { ok: true, id: data.id, fecha: data.fecha };
}

/** Citación, indicaciones, notas y visibilidad de la actividad de un partido. */
export async function guardarActividadPartido(
  id: string,
  input: ActividadPartidoInput,
): Promise<ActividadActionResult> {
  const parsed = actividadPartidoSchema.safeParse(input);
  if (!idSchema.safeParse(id).success || !parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos marcados",
      errores: parsed.success ? {} : erroresDeZod(parsed.error),
    };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;

  const { data, error } = await accion.supabase
    .from("actividades")
    .update(parsed.data)
    .eq("id", id)
    .not("partido_id", "is", null)
    .select("id, fecha")
    .single();
  if (error) return errorDeBD(error, "partido");

  revalidar();
  return { ok: true, id: data.id, fecha: data.fecha };
}

export async function eliminarActividad(id: string): Promise<Resultado> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Actividad no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;

  // Las de partido se borran con el partido
  const { error } = await accion.supabase
    .from("actividades")
    .delete()
    .eq("id", id)
    .is("partido_id", null);
  if (error) return errorDeBD(error, "eliminar");

  revalidar();
  return { ok: true };
}

/** Copia una actividad a otro día (misma hora, lugar e indicaciones). */
export async function duplicarActividad(id: string, fecha: string): Promise<ActividadActionResult> {
  if (!idSchema.safeParse(id).success || !fechaSchema.safeParse(fecha).success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;

  const { data: origen } = await accion.supabase
    .from("actividades")
    .select("*")
    .eq("id", id)
    .is("partido_id", null)
    .maybeSingle();
  if (!origen) return { ok: false, error: "Esa actividad ya no existe." };

  const { data, error } = await accion.supabase
    .from("actividades")
    .insert({ ...copiaDe(origen), fecha })
    .select("id, fecha")
    .single();
  if (error) return errorDeBD(error, "duplicar");
  if (origen.tipo === "entrenamiento") {
    const { error: errorSesion } = await accion.supabase.rpc("copiar_sesion", {
      p_origen: origen.id,
      p_destino: data.id,
    });
    if (errorSesion) return errorDeBD(errorSesion, "duplicar sesión");
  }

  revalidar();
  return { ok: true, id: data.id, fecha: data.fecha };
}

/**
 * Copia al ciclo indicado las actividades del ciclo anterior (salvo partidos),
 * cada una al día con la misma etiqueta (MD-2 → MD-2, MD+1 → MD+1). No repite
 * las que ya existen ese día con el mismo tipo, título y hora.
 */
export async function copiarCicloAnterior(
  /** El ciclo que se está viendo: el partido que lo cierra y una fecha dentro de él */
  partidoId: string | null,
  fecha: string,
): Promise<{ ok: true; copiadas: number; salteadas: number } | { ok: false; error: string }> {
  if (!fechaSchema.safeParse(fecha).success) return { ok: false, error: "Fecha no válida" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.temporada) return SIN_TEMPORADA;
  const temporadaId = contexto.temporada.id;

  const { data: partidos, error: errorPartidos } = await supabase
    .from("partidos")
    .select("id, fecha")
    .eq("temporada_id", temporadaId);
  if (errorPartidos) return errorDeBD(errorPartidos, "copiar partidos");

  const hoy = hoyISO();
  const destino = cicloDe(partidos, fecha, partidoId);
  // Sin partido anterior (primer ciclo de la temporada): la semana previa
  const origen = destino.anterior
    ? cicloDe(partidos, hoy, destino.anterior)
    : { desde: sumarDias(destino.desde, -7), hasta: sumarDias(destino.desde, -1) };
  const desdeOrigen = origen.desde;
  const hastaOrigen = origen.hasta;

  const { data: actividades, error } = await supabase
    .from("actividades")
    .select("*")
    .eq("temporada_id", temporadaId)
    .gte("fecha", desdeOrigen)
    .lte("fecha", destino.hasta);
  if (error) return errorDeBD(error, "copiar actividades");

  const existentes = new Set(
    actividades
      .filter((a) => a.fecha >= destino.desde)
      .map((a) => `${a.fecha}|${a.tipo}|${a.titulo}|${a.hora_inicio ?? ""}`),
  );

  let salteadas = 0;
  const nuevas = actividades
    .filter((a) => a.fecha >= desdeOrigen && a.fecha <= hastaOrigen && a.partido_id === null)
    .flatMap((a) => {
      const fecha = fechaEquivalente(a.fecha, { desde: desdeOrigen }, destino, partidos);
      const clave = `${fecha}|${a.tipo}|${a.titulo}|${a.hora_inicio ?? ""}`;
      if (!fecha || existentes.has(clave)) {
        salteadas += 1;
        return [];
      }
      existentes.add(clave);
      return [{ origen: a.id, fila: { ...copiaDe(a), fecha } }];
    });

  // De a una para saber qué entrenamiento nuevo corresponde a cuál y copiar su sesión
  for (const { origen: idOrigen, fila } of nuevas) {
    const { data: nueva, error: errorInsert } = await supabase
      .from("actividades")
      .insert(fila)
      .select("id")
      .single();
    if (errorInsert) return errorDeBD(errorInsert, "copiar insertar");
    if (fila.tipo === "entrenamiento") {
      const { error: errorSesion } = await supabase.rpc("copiar_sesion", {
        p_origen: idOrigen,
        p_destino: nueva.id,
      });
      if (errorSesion) return errorDeBD(errorSesion, "copiar sesión");
    }
  }

  revalidar();
  return { ok: true, copiadas: nuevas.length, salteadas };
}

/** Crea el link de jugadores de la temporada o lo regenera (el anterior deja de andar). */
export async function regenerarEnlaceJugadores(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  if (!accion.contexto.temporada) return SIN_TEMPORADA;
  const { data, error } = await accion.supabase.rpc("regenerar_enlace_jugadores", {
    p_temporada: accion.contexto.temporada.id,
  });
  if (error) return errorDeBD(error, "link jugadores");
  revalidar();
  return { ok: true, token: data };
}
