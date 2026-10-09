import type { CampoTextoPlan } from "@/types/partido";

/** Lo que devuelve el asistente de Claude para el plan (formato del worker). */
export interface PuntoClave {
  id: string;
  tipo: "oportunidad" | "amenaza" | "ajuste";
  momento: "ofensiva" | "defensiva" | "tda" | "tad" | "abp" | "general";
  titulo: string;
  evidencia: string;
  fuente: "informe" | "video" | "previa" | "historial" | "plantel";
}

export type BorradorPlan = Partial<Record<CampoTextoPlan, string>> & {
  claves?: string[];
  jugadores_clave?: { nombre: string; dorsal: number | null; como: string }[];
};

export type ValidacionPunto = "confirmado" | "descartado";

export const TIPOS_PUNTO = [
  {
    valor: "oportunidad",
    titulo: "Oportunidades",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  { valor: "amenaza", titulo: "Amenazas", chip: "bg-red-50 text-red-800 ring-red-200" },
  { valor: "ajuste", titulo: "Ajustes nuestros", chip: "bg-sky-50 text-sky-800 ring-sky-200" },
] as const;

export const MOMENTO_PUNTO: Record<PuntoClave["momento"], string> = {
  ofensiva: "Con pelota",
  defensiva: "Sin pelota",
  tda: "Al recuperar",
  tad: "Al perder",
  abp: "Pelota parada",
  general: "General",
};

export const FUENTE_PUNTO: Record<PuntoClave["fuente"], string> = {
  informe: "Informe del rival",
  video: "Video",
  previa: "Previa",
  historial: "Nuestros partidos",
  plantel: "Plantel",
};

/** Partes del borrador, en el orden del plan; cada una se puede usar por separado. */
export const SECCIONES_BORRADOR = [
  { id: "claves", titulo: "0 · Claves y objetivo", campos: ["claves", "objetivo"] },
  { id: "contexto", titulo: "1 · Contexto", campos: ["contexto"] },
  { id: "choque", titulo: "2 · Choque de estructuras", campos: ["choque"] },
  { id: "ofensiva", titulo: "3 · Con pelota", campos: ["ofensiva_ct", "ofensiva_plantel"] },
  { id: "defensiva", titulo: "3 · Sin pelota", campos: ["defensiva_ct", "defensiva_plantel"] },
  { id: "tda", titulo: "3 · Al recuperar", campos: ["tda_ct", "tda_plantel"] },
  { id: "tad", titulo: "3 · Al perder", campos: ["tad_ct", "tad_plantel"] },
  { id: "abp", titulo: "4 · Pelota quieta", campos: ["abp_ct", "abp_plantel"] },
  { id: "jugadores_clave", titulo: "5 · Jugadores clave del rival", campos: ["jugadores_clave"] },
  { id: "gestion", titulo: "7 · Gestión del partido", campos: ["gestion"] },
] as const;

export type CampoBorrador = (typeof SECCIONES_BORRADOR)[number]["campos"][number];

export const CAMPOS_BORRADOR: readonly CampoBorrador[] = SECCIONES_BORRADOR.flatMap(
  (s) => s.campos,
);
