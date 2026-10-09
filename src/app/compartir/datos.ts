import "server-only";
import { requerirTemporada } from "@/lib/contexto";
import { getActividades, getReferenciasPartidos } from "@/lib/data/calendario";
import { armarDias, type DiaCompartido } from "@/lib/semana";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function fechaValida(valor: string | null): string | null {
  return valor && FECHA.test(valor) && !Number.isNaN(Date.parse(valor)) ? valor : null;
}

/** Días del rango como los ven los jugadores (solo actividades visibles). */
export async function diasCompartidos(
  desde: string,
  hasta: string,
): Promise<{ dias: DiaCompartido[]; club: string; firma: string }> {
  const { temporada, cuerpoTecnico } = await requerirTemporada();
  const [actividades, partidos] = await Promise.all([
    getActividades(temporada.id, desde, hasta),
    getReferenciasPartidos(temporada.id),
  ]);
  return {
    dias: armarDias(
      desde,
      hasta,
      actividades.filter((a) => a.visible_jugadores),
      partidos,
    ),
    club: temporada.club,
    firma: cuerpoTecnico.nombre,
  };
}

/** Descarga con nombre de archivo si se pide (?descargar=1); si no, se muestra. */
export function conDescarga(respuesta: Response, descargar: boolean, nombre: string): Response {
  if (descargar) {
    respuesta.headers.set("Content-Disposition", `attachment; filename="${nombre}"`);
  }
  respuesta.headers.set("Cache-Control", "private, no-store");
  return respuesta;
}
