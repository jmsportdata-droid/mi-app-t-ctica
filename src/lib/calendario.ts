import { sumarDias } from "@/lib/utils/fecha";
import type { OrientacionFisica } from "@/types/tarea";

/** Partido como referencia del calendario. */
export interface PartidoReferencia {
  id: string;
  fecha: string;
}

/** Días entre dos fechas "YYYY-MM-DD" (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Todas las fechas de desde a hasta, inclusive. */
export function rangoFechas(desde: string, hasta: string): string[] {
  const total = diasEntre(desde, hasta);
  return Array.from({ length: Math.max(0, total + 1) }, (_, i) => sumarDias(desde, i));
}

/** Días posteriores a un partido que se nombran MD+n (después, MD-n del próximo). */
const MAX_POST_PARTIDO = 2;

export interface EtiquetaMD {
  /** "MD", "MD-3", "MD+1"… */
  texto: string;
  /** 0 = día de partido; negativo = antes; positivo = después */
  offset: number;
}

/**
 * Día relativo al partido: MD el día del partido, MD+1/MD+2 los días después,
 * y MD-n los días previos al próximo. Si queda en el medio, gana el más cercano
 * (con empate, el próximo partido).
 */
export function etiquetaMD(fecha: string, partidos: PartidoReferencia[]): EtiquetaMD | null {
  let anterior: string | null = null;
  let proximo: string | null = null;
  for (const p of partidos) {
    if (p.fecha === fecha) return { texto: "MD", offset: 0 };
    if (p.fecha < fecha && (!anterior || p.fecha > anterior)) anterior = p.fecha;
    if (p.fecha > fecha && (!proximo || p.fecha < proximo)) proximo = p.fecha;
  }
  const despues = anterior ? diasEntre(anterior, fecha) : null;
  const antes = proximo ? diasEntre(fecha, proximo) : null;

  if (despues !== null && despues <= MAX_POST_PARTIDO && (antes === null || despues < antes)) {
    return { texto: `MD+${despues}`, offset: despues };
  }
  if (antes !== null) return { texto: `MD-${antes}`, offset: -antes };
  return null;
}

export interface Ciclo {
  desde: string;
  hasta: string;
  /** Partido con el que termina el ciclo; null si no hay próximo partido */
  partido: PartidoReferencia | null;
  /** Para navegar: id del partido que cierra el ciclo anterior / siguiente */
  anterior: string | null;
  siguiente: string | null;
}

const DIAS_SIN_PARTIDO = 7;

/** Valor de navegación para el período posterior al último partido. */
export const DESPUES_DEL_ULTIMO = "despues";

/**
 * Ciclo "de partido a partido": del día después del partido anterior hasta el día
 * del partido. Sin partido elegido, el ciclo que contiene `hoy`. Si ya no quedan
 * partidos, una semana desde el día después del último.
 */
export function cicloDe(
  partidos: PartidoReferencia[],
  hoy: string,
  partidoId?: string | null,
): Ciclo {
  const ordenados = [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  let i: number;
  if (partidoId === DESPUES_DEL_ULTIMO) {
    i = -1;
  } else {
    i = partidoId ? ordenados.findIndex((p) => p.id === partidoId) : -1;
    if (i === -1) i = ordenados.findIndex((p) => p.fecha >= hoy);
  }

  if (i === -1) {
    // Sin partidos por delante
    const ultimo = ordenados.at(-1);
    const desde = ultimo ? sumarDias(ultimo.fecha, 1) : hoy;
    return {
      desde,
      hasta: sumarDias(desde, DIAS_SIN_PARTIDO - 1),
      partido: null,
      anterior: ultimo?.id ?? null,
      siguiente: null,
    };
  }

  const partido = ordenados[i]!;
  const previo = ordenados[i - 1];
  return {
    desde: previo ? sumarDias(previo.fecha, 1) : sumarDias(partido.fecha, -(DIAS_SIN_PARTIDO - 1)),
    hasta: partido.fecha,
    partido,
    anterior: previo?.id ?? null,
    siguiente: ordenados[i + 1]?.id ?? DESPUES_DEL_ULTIMO,
  };
}

/**
 * Fecha equivalente en otro ciclo: el día con la misma etiqueta (lo de MD-2 va al
 * MD-2 del destino, lo de MD+1 al MD+1). Si no hay partidos para etiquetar, se
 * respeta la posición dentro del ciclo. null si ese día no existe en el destino.
 */
export function fechaEquivalente(
  fecha: string,
  origen: Pick<Ciclo, "desde">,
  destino: Pick<Ciclo, "desde" | "hasta">,
  partidos: PartidoReferencia[],
): string | null {
  const etiqueta = etiquetaMD(fecha, partidos);
  const dias = rangoFechas(destino.desde, destino.hasta);
  if (etiqueta) {
    return dias.find((d) => etiquetaMD(d, partidos)?.texto === etiqueta.texto) ?? null;
  }
  const posicion = diasEntre(origen.desde, fecha);
  return dias[posicion] ?? null;
}

/** Un día de la semana tipo del manual: orientación física y foco táctico. */
export interface DiaSemanaTipo {
  orientacion: OrientacionFisica;
  foco: string;
}

/** Semana tipo del manual del cuerpo técnico, por etiqueta de día de partido. */
export const SEMANA_TIPO: Partial<Record<string, DiaSemanaTipo>> = {
  "MD+1": { orientacion: "recuperacion", foco: "Recuperación (o libre)" },
  "MD-4": { orientacion: "tension", foco: "Sistema defensivo · fuerza y contacto" },
  "MD-3": { orientacion: "duracion", foco: "Sistema ofensivo: salida, progresión y finalización" },
  "MD-2": { orientacion: "velocidad", foco: "Transiciones · pico de velocidad" },
  "MD-1": { orientacion: "activacion", foco: "Pelota parada · bajo volumen" },
};

/**
 * Número del microciclo en la temporada: el del partido que lo cierra (1 = el
 * que termina en el primer partido). Después del último, uno más. Sin partidos, null.
 */
export function numeroMicrociclo(partidos: PartidoReferencia[], ciclo: Ciclo): number | null {
  if (partidos.length === 0) return null;
  const ordenados = [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!ciclo.partido) return ordenados.length + 1;
  return ordenados.findIndex((p) => p.id === ciclo.partido?.id) + 1;
}

type ActividadOrdenable = {
  id: string;
  tipo: string;
  fecha: string;
  hora_inicio: string | null;
  creado_en: string;
};

/** Número de sesión de cada entrenamiento en cancha del ciclo: vuelve a 1 en cada microciclo. */
export function numerarSesiones(actividades: ActividadOrdenable[]): Map<string, number> {
  const entrenamientos = actividades
    .filter((a) => a.tipo === "entrenamiento")
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? "") ||
        a.creado_en.localeCompare(b.creado_en),
    );
  return new Map(entrenamientos.map((a, i) => [a.id, i + 1]));
}
