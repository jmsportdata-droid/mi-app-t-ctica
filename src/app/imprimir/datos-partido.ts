import "server-only";
import { notFound } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { getTemporada } from "@/lib/data/cuerpo-tecnico";
import { getJugadores } from "@/lib/data/jugadores";
import { getDetallePartido, getPartido } from "@/lib/data/partidos";

/** Todo lo de un partido para las páginas de impresión. */
export async function datosPartidoParaImprimir(id: string) {
  const contexto = await requerirContexto();
  const partido = await getPartido(id);
  if (!partido) notFound();
  const [temporada, detalle, jugadores] = await Promise.all([
    getTemporada(partido.temporada_id),
    getDetallePartido(partido.id),
    getJugadores(partido.temporada_id),
  ]);
  if (!temporada) notFound();
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const titulares = (detalle.alineacion?.titulares ?? []).filter((x): x is string => Boolean(x));
  const suplentes = detalle.alineacion?.suplentes ?? [];
  const convocados = [...titulares, ...suplentes]
    .map((x) => porId.get(x))
    .filter((j) => j !== undefined)
    .sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99) || a.nombre.localeCompare(b.nombre, "es"));
  const rival = partido.rival?.nombre ?? "Rival";
  const titulo = partido.es_local
    ? `${temporada.club} vs ${rival}`
    : `${rival} vs ${temporada.club}`;
  return { contexto, partido, temporada, detalle, jugadores, porId, convocados, titulo, rival };
}

/** Estilos comunes de las páginas para imprimir. */
export const estiloImpresion = (orientacion: "portrait" | "landscape") =>
  `@page { size: A4 ${orientacion}; margin: 10mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
