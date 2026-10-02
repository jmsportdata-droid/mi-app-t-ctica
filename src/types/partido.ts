import type { Equipo } from "./equipo";

// ---------- Partido ----------------------------------------------

export const ESTADOS_PARTIDO = ["planificado", "jugado"] as const;
export type EstadoPartido = (typeof ESTADOS_PARTIDO)[number];

export const ESTADO_LABEL: Record<EstadoPartido, string> = {
  planificado: "Planificado",
  jugado: "Jugado",
};

/** Fila de la tabla "partidos". */
export type Partido = {
  id: string;
  /** Fecha ISO "YYYY-MM-DD" */
  fecha: string;
  rival_id: string;
  estadio: string | null;
  competicion: string | null;
  es_local: boolean;
  estado: EstadoPartido;
  /** URL del vídeo del partido (Vimeo o YouTube) */
  video_url: string | null;
  created_at: string;
};

export type PartidoInput = Pick<
  Partido,
  "fecha" | "rival_id" | "estadio" | "competicion" | "es_local" | "estado"
>;

export type RivalResumen = Pick<Equipo, "id" | "nombre" | "escudo_url" | "estadio">;

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
export type PlanPartido = { partido_id: string; updated_at: string } & {
  [K in CampoPlan]: string | null;
};

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
export type InformeRival = {
  partido_id: string;
  tags: TagInforme[];
  slides_url: string | null;
  vimeo_url: string | null;
  updated_at: string;
};

// ---------- Pestañas del detalle ---------------------------------

export const TABS_PARTIDO = [
  { id: "informe", label: "Informe rival" },
  { id: "plan", label: "Plan de partido" },
  { id: "abp", label: "ABP" },
  { id: "alineacion", label: "Alineación" },
  { id: "eventos", label: "Eventos" },
] as const;
export type TabPartido = (typeof TABS_PARTIDO)[number]["id"];

export function esTabPartido(valor: unknown): valor is TabPartido {
  return TABS_PARTIDO.some((t) => t.id === valor);
}
