import type { Enums, Tables } from "./database";
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

/** Fila de la tabla "planes_partido". */
export type PlanPartido = Tables<"planes_partido">;

/** Los momentos del plan, con el prefijo de sus columnas y su momento del modelo. */
export const MOMENTOS_PLAN = [
  {
    prefijo: "ofensiva",
    label: "Organización ofensiva",
    momento: "organizacion_ofensiva",
    corto: "Con pelota",
  },
  {
    prefijo: "defensiva",
    label: "Organización defensiva",
    momento: "organizacion_defensiva",
    corto: "Sin pelota",
  },
  {
    prefijo: "tda",
    label: "Transición defensa-ataque",
    momento: "transicion_defensa_ataque",
    corto: "Al recuperar",
  },
  {
    prefijo: "tad",
    label: "Transición ataque-defensa",
    momento: "transicion_ataque_defensa",
    corto: "Al perder",
  },
] as const;
export type PrefijoPlan = (typeof MOMENTOS_PLAN)[number]["prefijo"];

/** Textos del plan con guardado automático y su largo máximo. */
export const CAMPOS_TEXTO_PLAN = {
  objetivo: 300,
  contexto: 3000,
  choque: 3000,
  ofensiva_ct: 3000,
  ofensiva_plantel: 300,
  defensiva_ct: 3000,
  defensiva_plantel: 300,
  tda_ct: 3000,
  tda_plantel: 300,
  tad_ct: 3000,
  tad_plantel: 300,
  abp_ct: 3000,
  abp_plantel: 300,
  gestion: 2000,
} as const;
export type CampoTextoPlan = keyof typeof CAMPOS_TEXTO_PLAN;

/** Listas de ids del plan (principios del modelo o jugadores). */
export const CAMPOS_LISTA_PLAN = [
  "ofensiva_principios",
  "ofensiva_jugadores",
  "defensiva_principios",
  "defensiva_jugadores",
  "tda_principios",
  "tda_jugadores",
  "tad_principios",
  "tad_jugadores",
  "microciclo_principios",
] as const;
export type CampoListaPlan = (typeof CAMPOS_LISTA_PLAN)[number];

/** Jugador clave del rival y cómo neutralizarlo. */
export interface JugadorClave {
  nombre: string;
  dorsal: number | null;
  como: string;
  /** Nuestro jugador encargado (id) */
  responsable: string | null;
}

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

/** Los pasos del partido, en el orden en que se trabajan en la semana. */
export const TABS_PARTIDO = [
  { id: "previa", label: "Previa" },
  { id: "informe", label: "Informe rival" },
  { id: "video", label: "Video rival" },
  { id: "abp", label: "Pelota quieta" },
  { id: "plan", label: "Plan de partido" },
  { id: "convocatoria", label: "Convocatoria" },
  { id: "vestuario", label: "Info al plantel" },
  { id: "eventos", label: "En vivo" },
  { id: "post", label: "Post partido" },
] as const;
export type TabPartido = (typeof TABS_PARTIDO)[number]["id"];

export function esTabPartido(valor: unknown): valor is TabPartido {
  return TABS_PARTIDO.some((t) => t.id === valor);
}

// ---------- Previa, análisis, escenarios y vestuario --------------

export type PartidoPrevia = Tables<"partido_previa">;
export type AnalisisRival = Tables<"analisis_rival">;
export type EscenarioPartido = Tables<"escenarios_partido">;
export type VideoVestuario = Tables<"videos_vestuario">;
export type FaseAnalisis = Enums<"fase_analisis">;
export type ValoracionAnalisis = Enums<"valoracion_analisis">;
export type SituacionPartido = Enums<"situacion_partido">;
export type TipoVideoVestuario = Enums<"tipo_video_vestuario">;
export type TipoCesped = Enums<"tipo_cesped">;

/** Estructura del análisis de video del rival. */
export const BLOQUES_ANALISIS = [
  {
    titulo: "Fase ofensiva",
    fases: [
      { valor: "ofensiva_inicio", label: "Inicios" },
      { valor: "ofensiva_organizacion", label: "Organización" },
      { valor: "ofensiva_finalizacion", label: "Finalización" },
    ],
  },
  {
    titulo: "Fase defensiva",
    fases: [
      { valor: "defensa_bloque_alto", label: "Bloque alto" },
      { valor: "defensa_bloque_medio", label: "Bloque medio" },
      { valor: "defensa_bloque_bajo", label: "Bloque bajo" },
    ],
  },
  {
    titulo: "Transiciones",
    fases: [
      { valor: "transicion_defensa_ataque", label: "Defensa-ataque" },
      { valor: "transicion_ataque_defensa", label: "Ataque-defensa" },
    ],
  },
] as const satisfies readonly {
  titulo: string;
  fases: readonly { valor: FaseAnalisis; label: string }[];
}[];

export const VALORACIONES = [
  {
    valor: "fortaleza",
    label: "Fortaleza",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  { valor: "debilidad", label: "Debilidad", chip: "bg-red-50 text-red-800 ring-red-200" },
  { valor: "patron", label: "Patrón", chip: "bg-sky-50 text-sky-800 ring-sky-200" },
] as const satisfies readonly { valor: ValoracionAnalisis; label: string; chip: string }[];

export const SITUACIONES = [
  { valor: "ganando", label: "Ganando" },
  { valor: "empatando", label: "Empatando" },
  { valor: "perdiendo", label: "Perdiendo" },
  { valor: "con_uno_menos", label: "Con uno menos" },
  { valor: "con_uno_mas", label: "Con uno más" },
  { valor: "otro", label: "Otro" },
] as const satisfies readonly { valor: SituacionPartido; label: string }[];

export const VIDEOS_VESTUARIO = [
  {
    valor: "rival",
    label: "Rival: fases de juego",
    ayuda: "Lo fundamental del análisis del rival.",
  },
  { valor: "pelota_quieta", label: "Pelota quieta", ayuda: "Las ABP del rival y las nuestras." },
  { valor: "pre_partido", label: "Charla pre partido", ayuda: "El video de la charla técnica." },
  {
    valor: "post_partido",
    label: "Post partido",
    ayuda: "Lo que se le muestra al plantel después.",
  },
] as const satisfies readonly { valor: TipoVideoVestuario; label: string; ayuda: string }[];

export const CESPEDES = [
  { valor: "natural", label: "Natural" },
  { valor: "sintetico", label: "Sintético" },
  { valor: "hibrido", label: "Híbrido" },
] as const satisfies readonly { valor: TipoCesped; label: string }[];

/** Cambio planificado de un escenario. */
export interface CambioPlanificado {
  sale: string;
  entra: string;
}

export type Concentracion = Tables<"concentraciones">;
export type Habitacion = Tables<"habitaciones">;
