import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EstadoDelDia, RegistroDisponibilidad } from "@/types/disponibilidad";

/**
 * Estado de cada jugador de la temporada en un día (se arrastra el último cargado).
 * Los jugadores sin registros no aparecen: se consideran disponibles.
 */
export async function getDisponibilidadDelDia(
  temporadaId: string,
  fecha: string,
): Promise<Record<string, EstadoDelDia>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("disponibilidad_del_dia", {
    p_temporada: temporadaId,
    p_fecha: fecha,
  });
  if (error) {
    console.error("[getDisponibilidadDelDia]", error.message);
    throw new Error("No se pudo cargar la disponibilidad");
  }
  return Object.fromEntries(
    data.map((d) => [
      d.jugador_id,
      { estado: d.estado, fecha_regreso: d.fecha_regreso, desde: d.desde },
    ]),
  );
}

/** Últimos cambios de estado de un jugador, del más reciente al más viejo. */
export async function getHistorialDisponibilidad(
  jugadorId: string,
  limite = 15,
): Promise<RegistroDisponibilidad[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("disponibilidad")
    .select("*")
    .eq("jugador_id", jugadorId)
    .order("fecha", { ascending: false })
    .limit(limite);
  if (error) {
    console.error("[getHistorialDisponibilidad]", error.message);
    throw new Error("No se pudo cargar el historial de disponibilidad");
  }
  return data;
}
