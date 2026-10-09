import { indiceAereo, type DatosAereos } from "./aereo";

/**
 * Emparejamiento de marcas en la pelota quieta defensiva.
 *
 * Cada jugador tiene un puntaje aéreo (el índice aéreo; si jugó poco, una
 * estimación por altura). La sugerencia ordena a los rivales a marcar y a
 * nuestros candidatos de mayor a menor y los empareja en ese orden: así el
 * peor duelo queda lo más parejo posible (el más peligroso de ellos contra
 * nuestro mejor cabeceador, y así). Las parejas fijadas a mano se respetan.
 */

export interface JugadorAereo {
  id: string;
  nombre: string;
  dorsal: number | null;
  altura_cm: number | null;
  /** 0-100 */
  puntaje: number;
  /** true si no hay minutos suficientes y el puntaje sale solo de la altura */
  estimado: boolean;
}

export type NivelDuelo = "ventaja" | "parejo" | "desventaja";

export interface Pareja {
  rival: JugadorAereo;
  propio: JugadorAereo | null;
  /** Fijada a mano por el cuerpo técnico */
  manual: boolean;
  /** Puntaje propio menos el del rival (null sin marcador) */
  diferencia: number | null;
  /** Centímetros a favor (negativo: el rival es más alto) */
  difAltura: number | null;
  nivel: NivelDuelo | null;
}

/** Diferencia de puntaje desde la que un duelo deja de ser parejo. */
export const UMBRAL_DUELO = 8;

/**
 * Puntaje aéreo para emparejar. Con menos de 90′ no hay índice: se estima con
 * la altura y valores medios de la liga (2 aéreos ganados cada 90′, 45%).
 */
export function puntajeAereo(d: DatosAereos): { puntaje: number; estimado: boolean } {
  const indice = indiceAereo(d);
  if (indice !== null) return { puntaje: indice, estimado: false };
  const altura = d.altura_cm ? Math.min(1, Math.max(0, (d.altura_cm - 168) / 24)) : 0.4;
  return { puntaje: Math.round(100 * (0.3 * altura + 0.35 * 0.4 + 0.2 * 0.45)), estimado: true };
}

export function nivelDuelo(diferencia: number): NivelDuelo {
  if (diferencia >= UMBRAL_DUELO) return "ventaja";
  if (diferencia <= -UMBRAL_DUELO) return "desventaja";
  return "parejo";
}

const porPuntaje = (a: JugadorAereo, b: JugadorAereo) =>
  b.puntaje - a.puntaje || (b.altura_cm ?? 0) - (a.altura_cm ?? 0);

function armarPareja(rival: JugadorAereo, propio: JugadorAereo | null, manual: boolean): Pareja {
  const diferencia = propio ? propio.puntaje - rival.puntaje : null;
  return {
    rival,
    propio,
    manual,
    diferencia,
    difAltura: propio?.altura_cm && rival.altura_cm ? propio.altura_cm - rival.altura_cm : null,
    nivel: diferencia === null ? null : nivelDuelo(diferencia),
  };
}

/**
 * Empareja a los rivales con nuestros candidatos. `fijas` son las parejas
 * elegidas a mano ({ id del rival: id nuestro }); las que apuntan a alguien
 * que ya no está se ignoran. Devuelve las parejas en el orden de peligro del
 * rival y los nuestros que quedan libres (para las zonas), mejor primero.
 */
export function emparejarMarcas(
  rivales: JugadorAereo[],
  propios: JugadorAereo[],
  fijas: Record<string, string> = {},
): { parejas: Pareja[]; libres: JugadorAereo[] } {
  const propiosPorId = new Map(propios.map((p) => [p.id, p]));
  const usados = new Set<string>();
  const asignado = new Map<string, JugadorAereo>();
  for (const r of rivales) {
    const p = propiosPorId.get(fijas[r.id] ?? "");
    if (p && !usados.has(p.id)) {
      asignado.set(r.id, p);
      usados.add(p.id);
    }
  }
  const disponibles = propios.filter((p) => !usados.has(p.id)).sort(porPuntaje);
  const ordenados = [...rivales].sort(porPuntaje);
  let i = 0;
  const parejas = ordenados.map((r) => {
    const fija = asignado.get(r.id);
    if (fija) return armarPareja(r, fija, true);
    const p = disponibles[i++] ?? null;
    return armarPareja(r, p, false);
  });
  return { parejas, libres: disponibles.slice(i) };
}

/** Alertas en texto para el cuerpo técnico (duelos en desventaja y rivales sin marca). */
export function alertasMarcas(parejas: Pareja[]): string[] {
  const alertas: string[] = [];
  for (const p of parejas) {
    if (!p.propio) {
      alertas.push(`${p.rival.nombre} queda sin marcador: faltan candidatos.`);
    } else if (p.nivel === "desventaja") {
      const cm = p.difAltura !== null && p.difAltura < 0 ? ` y le saca ${-p.difAltura} cm` : "";
      alertas.push(
        `${p.rival.nombre} (${p.rival.puntaje}) le gana a ${p.propio.nombre} (${p.propio.puntaje})${cm}: ayuda o cambio de marca.`,
      );
    } else if (p.difAltura !== null && p.difAltura <= -8) {
      alertas.push(
        `${p.rival.nombre} le saca ${-p.difAltura} cm a ${p.propio.nombre}: ganarle la posición antes del centro.`,
      );
    }
  }
  return alertas;
}
