import type { EtiquetaObjetivo, MomentoJuego } from "@/types/modelo-juego";
import type { TareaDeSesion } from "@/types/sesion";
import type { OrientacionFisica, Tarea } from "@/types/tarea";

/** Tipos de tarea que acompañan cualquier día: no se comparan con la orientación. */
const NEUTRAS = new Set<Tarea["tipo"]>(["entrada_en_calor", "pre_sesion", "arqueros"]);

/** ¿La tarea está pensada para otra orientación física que la del día? */
export function noEncajaConElDia(
  tarea: Pick<Tarea, "tipo" | "orientacion_fisica">,
  orientacionDelDia: OrientacionFisica | undefined,
): boolean {
  return Boolean(
    orientacionDelDia &&
    tarea.orientacion_fisica &&
    !NEUTRAS.has(tarea.tipo) &&
    tarea.orientacion_fisica !== orientacionDelDia,
  );
}

export interface ReparticionMomentos {
  porMomento: Map<MomentoJuego, number>;
  /** Segundos de tareas sin objetivos del modelo (físicas, entrada en calor…) */
  sinObjetivo: number;
  total: number;
}

/**
 * Tiempo de la sesión por momento del juego: el tiempo de cada tarea se reparte
 * en partes iguales entre los momentos de sus objetivos.
 */
export function repartirPorMomento(
  tareas: Pick<TareaDeSesion, "tiempo_total_seg" | "tarea">[],
  indice: Map<string, EtiquetaObjetivo>,
): ReparticionMomentos {
  const porMomento = new Map<MomentoJuego, number>();
  let sinObjetivo = 0;
  let total = 0;
  for (const t of tareas) {
    const segundos = t.tiempo_total_seg ?? 0;
    total += segundos;
    const momentos = [
      ...new Set(
        t.tarea.objetivos
          .map((id) => indice.get(id)?.momento)
          .filter((m): m is MomentoJuego => m !== undefined),
      ),
    ];
    if (momentos.length === 0) {
      sinObjetivo += segundos;
      continue;
    }
    for (const m of momentos) {
      porMomento.set(m, (porMomento.get(m) ?? 0) + segundos / momentos.length);
    }
  }
  return { porMomento, sinObjetivo, total };
}

// ---------- Encaje de una tarea del banco con la sesión ---------------

/** Tipos de tarea propios de cada bloque (los demás bloques aceptan cualquiera). */
export const TAREAS_DEL_BLOQUE: Partial<Record<string, readonly Tarea["tipo"][]>> = {
  pre_sesion: ["pre_sesion", "entrada_en_calor"],
  gimnasio: ["fuerza"],
  pelota_quieta: ["pelota_parada"],
  recuperacion: ["recuperacion"],
};

/** En cancha no se proponen primero las de gimnasio, recuperación ni pre sesión. */
const FUERA_DE_CANCHA = new Set<Tarea["tipo"]>(["fuerza", "recuperacion", "pre_sesion"]);

export interface EnfoqueSesion {
  tipoBloque: string;
  orientacion: OrientacionFisica | null;
  /** Principios elegidos para la sesión, con sus subprincipios y padres ya incluidos */
  principios: ReadonlySet<string>;
}

export interface Encaje {
  puntaje: number;
  /** Por qué encaja ("2 principios", "orientación", "tipo de bloque") */
  motivos: string[];
}

/**
 * Cuánto encaja una tarea con lo que se quiere trabajar: principios en común
 * (lo que más pesa), la orientación física del día y el tipo de bloque.
 */
export function encajeTarea(
  tarea: Pick<Tarea, "tipo" | "orientacion_fisica"> & { objetivos: string[] },
  enfoque: EnfoqueSesion,
): Encaje {
  const motivos: string[] = [];
  let puntaje = 0;
  const comunes = tarea.objetivos.filter((o) => enfoque.principios.has(o)).length;
  if (comunes > 0) {
    puntaje += 3 * Math.min(comunes, 3);
    motivos.push(comunes === 1 ? "1 principio" : `${comunes} principios`);
  }
  if (enfoque.orientacion && tarea.orientacion_fisica === enfoque.orientacion) {
    puntaje += 2;
    motivos.push("orientación");
  } else if (enfoque.orientacion && noEncajaConElDia(tarea, enfoque.orientacion)) {
    puntaje -= 2;
  }
  const propios = TAREAS_DEL_BLOQUE[enfoque.tipoBloque];
  if (propios) {
    if (propios.includes(tarea.tipo)) {
      puntaje += 3;
      motivos.push("tipo de bloque");
    } else puntaje -= 3;
  } else if (enfoque.tipoBloque === "entrenamiento" && FUERA_DE_CANCHA.has(tarea.tipo)) {
    puntaje -= 3;
  }
  return { puntaje, motivos };
}

/** Los principios elegidos más sus subprincipios y su principio padre. */
export function ampliarPrincipios(
  elegidos: readonly string[],
  principios: readonly { id: string; padre_id: string | null }[],
): Set<string> {
  const set = new Set(elegidos);
  for (const p of principios) {
    if (p.padre_id && set.has(p.padre_id)) set.add(p.id);
    if (p.padre_id && elegidos.includes(p.id)) set.add(p.padre_id);
  }
  return set;
}
