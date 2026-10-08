import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AbpPartido } from "@/types/abp";
import type { AlineacionPartido } from "@/types/alineacion";
import type { EventoPartido } from "@/types/evento";
import type { InformeRival, PartidoConRival, PlanPartido } from "@/types/partido";

const SELECT_CON_RIVAL = "*, rival:equipos(id, nombre, escudo_ruta, estadio)";

export async function getPartidos(temporadaId: string): Promise<PartidoConRival[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("partidos")
    .select(SELECT_CON_RIVAL)
    .eq("temporada_id", temporadaId)
    .order("fecha", { ascending: true });

  if (error) {
    console.error("[getPartidos]", error.message);
    throw new Error("No se pudieron cargar los partidos");
  }
  return data;
}

/** Memoizado por petición: lo usan generateMetadata y la página. */
export const getPartido = cache(async (id: string): Promise<PartidoConRival | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("partidos")
    .select(SELECT_CON_RIVAL)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // 22P02: id con formato no válido para uuid → tratar como no encontrado
    if (error.code === "22P02") return null;
    console.error("[getPartido]", error.message);
    throw new Error("No se pudo cargar el partido");
  }
  return data;
});

export interface DetallePartido {
  plan: PlanPartido | null;
  informe: InformeRival | null;
  abp: AbpPartido[];
  alineacion: AlineacionPartido | null;
  eventos: EventoPartido[];
}

/** Contenido de las pestañas del partido (las filas 1:1 se crean al primer guardado). */
export async function getDetallePartido(partidoId: string): Promise<DetallePartido> {
  const supabase = createClient();
  const [plan, informe, abp, alineacion, eventos] = await Promise.all([
    supabase.from("plan_partido").select("*").eq("partido_id", partidoId).maybeSingle(),
    supabase.from("informe_rival").select("*").eq("partido_id", partidoId).maybeSingle(),
    supabase.from("abp_partido").select("*").eq("partido_id", partidoId),
    supabase.from("alineacion_partido").select("*").eq("partido_id", partidoId).maybeSingle(),
    supabase
      .from("eventos_partido")
      .select("*")
      .eq("partido_id", partidoId)
      .order("minuto", { ascending: true })
      .order("creado_en", { ascending: true }),
  ]);

  const error = plan.error ?? informe.error ?? abp.error ?? alineacion.error ?? eventos.error;
  if (error) {
    console.error("[getDetallePartido]", error.message);
    throw new Error("No se pudo cargar el detalle del partido");
  }
  return {
    plan: plan.data,
    informe: informe.data,
    abp: abp.data ?? [],
    alineacion: alineacion.data as AlineacionPartido | null,
    eventos: eventos.data ?? [],
  };
}
