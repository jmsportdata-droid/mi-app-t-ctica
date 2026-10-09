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
