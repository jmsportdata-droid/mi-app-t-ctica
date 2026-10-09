/**
 * Índice de cumplimiento del modelo de juego.
 *
 * El cuerpo técnico define cómo se mide cada momento (y, si quiere, cada
 * principio): un KPI del post partido con su objetivo. En cada partido, cada
 * indicador vale 0-100 (100 = objetivo cumplido; si no, cuánto le faltó), el
 * momento es el promedio de sus indicadores y el índice, el de los momentos.
 * Aparte va el cumplimiento del plan (plan vs realidad del post partido).
 */

import { GRUPOS_KPI, type DefinicionKpi, type Stats } from "./post-partido";
import type { MomentoJuego } from "@/types/modelo-juego";

export interface Indicador {
  id: string;
  momento: MomentoJuego;
  principio_id: string | null;
  kpi: string;
  objetivo: number;
}

export const KPIS_INDICADOR: DefinicionKpi[] = GRUPOS_KPI.flatMap((g) => g.kpis);
const porClave = new Map(KPIS_INDICADOR.map((k) => [k.clave, k]));
export const kpiDe = (clave: string) => porClave.get(clave) ?? null;

export const MOMENTOS_INDICE: { valor: MomentoJuego; label: string }[] = [
  { valor: "organizacion_ofensiva", label: "Con pelota" },
  { valor: "organizacion_defensiva", label: "Sin pelota" },
  { valor: "transicion_defensa_ataque", label: "Al recuperar" },
  { valor: "transicion_ataque_defensa", label: "Al perder" },
  { valor: "balon_parado", label: "Pelota parada" },
];

/**
 * Punto de partida (editable) con el modelo del cuerpo técnico: ataque por
 * bandas y llegada al área, presión alta / bloque medio, contrapresión y
 * transición rápida, y la pelota parada.
 */
export const INDICADORES_SUGERIDOS: Omit<Indicador, "id" | "principio_id">[] = [
  { momento: "organizacion_ofensiva", kpi: "toques_area", objetivo: 20 },
  { momento: "organizacion_ofensiva", kpi: "ultimo_tercio", objetivo: 60 },
  { momento: "organizacion_ofensiva", kpi: "tiros_arco", objetivo: 5 },
  { momento: "organizacion_ofensiva", kpi: "pases_pct", objetivo: 78 },
  { momento: "organizacion_defensiva", kpi: "ppda", objetivo: 10 },
  { momento: "organizacion_defensiva", kpi: "contra_xg", objetivo: 1 },
  { momento: "organizacion_defensiva", kpi: "contra_tiros", objetivo: 10 },
  { momento: "organizacion_defensiva", kpi: "duelos_suelo_pct", objetivo: 50 },
  { momento: "transicion_defensa_ataque", kpi: "recuperaciones", objetivo: 95 },
  { momento: "transicion_defensa_ataque", kpi: "grandes_chances", objetivo: 2 },
  { momento: "transicion_ataque_defensa", kpi: "errores_tiro", objetivo: 1 },
  { momento: "transicion_ataque_defensa", kpi: "perdidas", objetivo: 140 },
  { momento: "balon_parado", kpi: "xg_abp", objetivo: 0.3 },
  { momento: "balon_parado", kpi: "contra_xg_abp", objetivo: 0.2 },
];

/** 0-100: 100 si se cumplió el objetivo; si no, qué tan cerca quedó. null sin dato. */
export function puntajeIndicador(ind: Indicador, propio: Stats, rival: Stats): number | null {
  const k = kpiDe(ind.kpi);
  if (!k) return null;
  const v = k.valor(propio, rival);
  if (v === null) return null;
  if (k.masEsMejor) {
    if (v >= ind.objetivo) return 100;
    return ind.objetivo > 0 ? Math.max(0, Math.round((100 * v) / ind.objetivo)) : 0;
  }
  if (v <= ind.objetivo) return 100;
  return v > 0 ? Math.max(0, Math.round((100 * ind.objetivo) / v)) : 0;
}

export interface IndicePartido {
  global: number | null;
  porMomento: Partial<Record<MomentoJuego, number>>;
  cumplidos: number;
  medidos: number;
  /** Cumplimiento del plan (plan vs realidad): sí = 100, a medias = 50, no = 0 */
  plan: number | null;
}

const promedio = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

export function indicePartido(
  indicadores: Indicador[],
  propio: Stats,
  rival: Stats,
  planVsReal?: Record<string, { cumplimiento: string | null }>,
): IndicePartido {
  const porMomento: Partial<Record<MomentoJuego, number>> = {};
  let cumplidos = 0;
  let medidos = 0;
  for (const m of MOMENTOS_INDICE) {
    const puntajes = indicadores
      .filter((i) => i.momento === m.valor)
      .map((i) => puntajeIndicador(i, propio, rival))
      .filter((p): p is number => p !== null);
    medidos += puntajes.length;
    cumplidos += puntajes.filter((p) => p === 100).length;
    const prom = promedio(puntajes);
    if (prom !== null) porMomento[m.valor] = prom;
  }
  const valoresPlan = Object.values(planVsReal ?? {})
    .map((e): number | null =>
      e.cumplimiento === "si"
        ? 100
        : e.cumplimiento === "parcial"
          ? 50
          : e.cumplimiento === "no"
            ? 0
            : null,
    )
    .filter((x): x is number => x !== null);
  return {
    global: promedio(Object.values(porMomento)),
    porMomento,
    cumplidos,
    medidos,
    plan: promedio(valoresPlan),
  };
}
