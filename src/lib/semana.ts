import { etiquetaMD, rangoFechas, type PartidoReferencia } from "@/lib/calendario";
import { horaCorta, sumarDias } from "@/lib/utils/fecha";
import type { Actividad } from "@/types/calendario";

/** Lo que ve el jugador de cada actividad (sin notas internas). */
export type ActividadCompartida = Pick<
  Actividad,
  | "id"
  | "tipo"
  | "titulo"
  | "fecha"
  | "hora_inicio"
  | "hora_fin"
  | "hora_citacion"
  | "lugar"
  | "indicaciones"
>;

/** Lunes de la semana de una fecha "YYYY-MM-DD". */
export function lunesDe(fecha: string): string {
  const dia = (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;
  return sumarDias(fecha, -dia);
}

/** "13/10" */
export function diaMes(fecha: string): string {
  return `${Number(fecha.slice(8, 10))}/${Number(fecha.slice(5, 7))}`;
}

const NOMBRE_DIA = new Intl.DateTimeFormat("es-UY", { weekday: "long", timeZone: "UTC" });
export const nombreDia = (fecha: string) => NOMBRE_DIA.format(new Date(`${fecha}T00:00:00Z`));

export interface ItemDia {
  id: string;
  titulo: string;
  /** "10:00" o "10:00–11:30" */
  hora: string | null;
  esPartido: boolean;
  indicaciones: string | null;
}

export interface DiaCompartido {
  fecha: string;
  md: string | null;
  /** Lugar principal del día (el de la primera actividad con lugar) */
  lugar: string | null;
  /** La citación más temprana del día */
  citacion: string | null;
  items: ItemDia[];
  libre: boolean;
}

/**
 * Los días de la semana como se comparten con los jugadores: lugar, citación y
 * actividades con horario. Un día sin actividades (o marcado como libre) es LIBRE.
 */
export function armarDias(
  desde: string,
  hasta: string,
  actividades: ActividadCompartida[],
  partidos: PartidoReferencia[],
): DiaCompartido[] {
  return rangoFechas(desde, hasta).map((fecha) => {
    const delDia = actividades
      .filter((a) => a.fecha === fecha)
      .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""));
    const items = delDia
      .filter((a) => a.tipo !== "libre")
      .map((a) => {
        const inicio = horaCorta(a.hora_inicio);
        const fin = horaCorta(a.hora_fin);
        return {
          id: a.id,
          titulo: a.titulo,
          hora: inicio ? (fin ? `${inicio}–${fin}` : inicio) : null,
          esPartido: a.tipo === "partido",
          indicaciones: a.indicaciones,
        };
      });
    const citaciones = delDia
      .map((a) => horaCorta(a.hora_citacion))
      .filter((h): h is string => Boolean(h))
      .sort();
    return {
      fecha,
      md: etiquetaMD(fecha, partidos)?.texto ?? null,
      lugar: delDia.find((a) => a.lugar)?.lugar ?? null,
      citacion: citaciones[0] ?? null,
      items,
      libre: items.length === 0,
    };
  });
}

/** Paleta de la presentación del cuerpo técnico (hasta personalizarla por club). */
export const PALETA = {
  fondo: "#0f2b44",
  fondoClaro: "#17334b",
  acento: "#7f96ab",
  suave: "#b7cadb",
  texto: "#ffffff",
} as const;
