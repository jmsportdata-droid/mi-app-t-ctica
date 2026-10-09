import type { Tables } from "./database";
import type { Equipo } from "./equipo";

// ---------- Partido ----------------------------------------------

export const ESTADOS_PARTIDO = ["planificado", "jugado"] as const;
export type EstadoPartido = (typeof ESTADOS_PARTIDO)[number];

export const ESTADO_LABEL: Record<EstadoPartido, string> = {
  planificado: "Planificado",
  jugado: "Jugado",
};

/** Fila de la tabla "partidos" (cuelga de la temporada). fecha: ISO "YYYY-MM-DD". */
export type Partido = Tables<"partidos">;

export type PartidoInput = Pick<
  Partido,
  "fecha" | "hora" | "rival_id" | "estadio" | "competicion" | "es_local" | "estado"
>;

export type RivalResumen = Pick<Equipo, "id" | "nombre" | "escudo_ruta" | "estadio">;

export type PartidoConRival = Partido & { rival: RivalResumen | null };

// ---------- Plan de partido --------------------------------------

export const BLOQUES_PLAN = [
  { clave: "ataque", titulo: "Ataque" },
  { clave: "defensa", titulo: "Defensa" },
  { clave: "transicion", titulo: "Transiciones" },
] as const;
export type BloquePlan = (typeof BLOQUES_PLAN)[number]["clave"];

export const SUFIJOS_PLAN = ["notas", "vimeo", "imagen1", "imagen2", "pdf"] as const;
export type SufijoPlan = (typeof SUFIJOS_PLAN)[number];

/** Columnas editables del plan: ataque_notas, defensa_vimeo, transicion_pdf… */
export type CampoPlan = `${BloquePlan}_${SufijoPlan}`;

export const CAMPOS_PLAN: readonly CampoPlan[] = BLOQUES_PLAN.flatMap(({ clave }) =>
  SUFIJOS_PLAN.map((sufijo) => `${clave}_${sufijo}` as const),
);

/** Fila de la tabla "plan_partido". */
export type PlanPartido = Tables<"plan_partido">;

// ---------- Informe del rival ------------------------------------

export const TAGS_INFORME = [
  { valor: "salida_balon", label: "Salida de balón" },
  { valor: "presion", label: "Presión" },
  { valor: "bloque", label: "Bloque" },
  { valor: "linea_defensiva", label: "Línea defensiva" },
] as const;
export type TagInforme = (typeof TAGS_INFORME)[number]["valor"];

export const CAMPOS_INFORME = ["slides_url", "vimeo_url"] as const;
export type CampoInforme = (typeof CAMPOS_INFORME)[number];

/** Fila de la tabla "informe_rival". */
export type InformeRival = Tables<"informe_rival">;

// ---------- Pestañas del detalle ---------------------------------

export const TABS_PARTIDO = [
  { id: "informe", label: "Informe rival" },
  { id: "plan", label: "Plan de partido" },
  { id: "abp", label: "Pelota parada" },
  { id: "alineacion", label: "Alineación" },
  { id: "eventos", label: "Eventos" },
] as const;
export type TabPartido = (typeof TABS_PARTIDO)[number]["id"];

export function esTabPartido(valor: unknown): valor is TabPartido {
  return TABS_PARTIDO.some((t) => t.id === valor);
}
