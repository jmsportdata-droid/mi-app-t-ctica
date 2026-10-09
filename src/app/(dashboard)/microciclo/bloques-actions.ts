"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccion, SESION_EXPIRADA, SIN_TEMPORADA } from "@/lib/supabase/auth";
import { BLOQUE_DE, BLOQUES_PALETA, bloquesDelEsqueleto } from "@/lib/bloques";
import { etiquetaMD, rangoFechas } from "@/lib/calendario";
import { getReferenciasPartidos } from "@/lib/data/calendario";
import { fechaSchema } from "@/lib/validations/comun";
import { INFO_ACTIVIDAD, type TipoActividad } from "@/types/calendario";

type Resultado = { ok: true } | { ok: false; error: string };

const tipoSchema = z.enum(BLOQUES_PALETA.map((b) => b.tipo) as [TipoActividad, ...TipoActividad[]]);

function revalidar() {
  revalidatePath("/microciclo", "layout");
  revalidatePath("/calendario", "layout");
}

/** Fila nueva de un bloque con su título y horario sugeridos. */
function filaBloque(temporadaId: string, tipo: TipoActividad, fecha: string) {
  const b = BLOQUE_DE.get(tipo);
  const info = INFO_ACTIVIDAD[tipo];
  return {
    temporada_id: temporadaId,
    tipo,
    titulo: info.label,
    fecha,
    hora_inicio: b?.inicio ? `${b.inicio}:00` : null,
    hora_fin: b?.fin ? `${b.fin}:00` : null,
    visible_jugadores: info.visible,
  };
}

/** Crea un bloque (arrastrado desde la paleta) en un día. */
export async function crearBloque(fecha: string, tipo: string): Promise<Resultado> {
  const f = fechaSchema.safeParse(fecha);
  const t = tipoSchema.safeParse(tipo);
  if (!f.success || !t.success) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  if (!accion.contexto.temporada) return SIN_TEMPORADA;
  const { error } = await accion.supabase
    .from("actividades")
    .insert(filaBloque(accion.contexto.temporada.id, t.data, f.data));
  if (error) {
    console.error("[crearBloque]", error.code, error.message);
    return { ok: false, error: "No se pudo crear el bloque. Probá de nuevo." };
  }
  revalidar();
  return { ok: true };
}

/** Mueve un bloque a otro día (los partidos se mueven desde Partidos). */
export async function moverBloque(id: string, fecha: string): Promise<Resultado> {
  const f = fechaSchema.safeParse(fecha);
  if (!z.string().uuid().safeParse(id).success || !f.success) {
    return { ok: false, error: "Datos no válidos" };
  }
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { data, error } = await accion.supabase
    .from("actividades")
    .update({ fecha: f.data })
    .eq("id", id)
    .is("partido_id", null)
    .select("id");
  if (error) {
    console.error("[moverBloque]", error.code, error.message);
    return { ok: false, error: "No se pudo mover. Probá de nuevo." };
  }
  if (!data?.length) return { ok: false, error: "Los partidos se mueven desde Partidos." };
  revalidar();
  return { ok: true };
}

/**
 * Llena los días vacíos del rango con el esqueleto tipo del manual según el
 * día de partido (MD-4, MD-3…). No toca los días que ya tienen algo.
 */
export async function armarEsqueletoTipo(
  desde: string,
  hasta: string,
): Promise<{ ok: true; creados: number; dias: number } | { ok: false; error: string }> {
  const d = fechaSchema.safeParse(desde);
  const h = fechaSchema.safeParse(hasta);
  if (!d.success || !h.success || d.data > h.data) return { ok: false, error: "Datos no válidos" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const temporada = accion.contexto.temporada;
  if (!temporada) return SIN_TEMPORADA;
  const { supabase } = accion;
  const [partidos, { data: existentes, error: errorLeer }] = await Promise.all([
    getReferenciasPartidos(temporada.id),
    supabase
      .from("actividades")
      .select("fecha")
      .eq("temporada_id", temporada.id)
      .gte("fecha", d.data)
      .lte("fecha", h.data),
  ]);
  if (errorLeer) return { ok: false, error: "No se pudo leer la semana." };
  const ocupados = new Set((existentes ?? []).map((a) => a.fecha));
  const filas = rangoFechas(d.data, h.data)
    .filter((f) => !ocupados.has(f))
    .flatMap((f) =>
      bloquesDelEsqueleto(etiquetaMD(f, partidos)?.texto ?? null).map((tipo) =>
        filaBloque(temporada.id, tipo, f),
      ),
    );
  if (filas.length === 0) return { ok: true, creados: 0, dias: 0 };
  const { error } = await supabase.from("actividades").insert(filas);
  if (error) {
    console.error("[armarEsqueletoTipo]", error.code, error.message);
    return { ok: false, error: "No se pudo armar el esqueleto. Probá de nuevo." };
  }
  revalidar();
  return { ok: true, creados: filas.length, dias: new Set(filas.map((x) => x.fecha)).size };
}
