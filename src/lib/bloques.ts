import type { TipoActividad } from "@/types/calendario";

/**
 * Bloques del día para armar el esqueleto del microciclo arrastrándolos.
 * Cada uno trae un horario sugerido (se ajusta después en cada bloque).
 */
export interface BloquePaleta {
  tipo: TipoActividad;
  /** Para ordenar la paleta y los bloques del día */
  inicio: string | null;
  fin: string | null;
  ayuda: string;
}

export const BLOQUES_PALETA: BloquePaleta[] = [
  { tipo: "charla_tecnica", inicio: "08:30", fin: "09:00", ayuda: "Video con el plantel" },
  { tipo: "pre_sesion", inicio: "09:00", fin: "09:30", ayuda: "Activación y prevención" },
  { tipo: "entrenamiento", inicio: "09:30", fin: "11:00", ayuda: "Técnico-táctico en cancha" },
  { tipo: "pelota_quieta", inicio: "11:00", fin: "11:20", ayuda: "Jugadas a balón parado" },
  { tipo: "gimnasio", inicio: "11:30", fin: "12:15", ayuda: "Fuerza en el gimnasio" },
  { tipo: "recuperacion", inicio: "09:30", fin: "10:30", ayuda: "Regenerativo" },
  { tipo: "libre", inicio: null, fin: null, ayuda: "Día libre" },
  { tipo: "concentracion", inicio: "20:00", fin: null, ayuda: "Concentración previa" },
];

export const BLOQUE_DE = new Map(BLOQUES_PALETA.map((b) => [b.tipo, b]));

/**
 * Esqueleto tipo del manual del entrenador según el día de partido. Los días
 * que no figuran (semanas largas) llevan pre sesión y cancha.
 */
export const ESQUELETO_TIPO: Record<string, TipoActividad[]> = {
  "MD+1": ["libre"],
  "MD+2": ["recuperacion"],
  "MD-4": ["pre_sesion", "entrenamiento", "gimnasio"],
  "MD-3": ["charla_tecnica", "pre_sesion", "entrenamiento"],
  "MD-2": ["pre_sesion", "entrenamiento"],
  "MD-1": ["charla_tecnica", "entrenamiento", "pelota_quieta"],
};

export function bloquesDelEsqueleto(md: string | null): TipoActividad[] {
  if (!md || md === "MD") return [];
  return ESQUELETO_TIPO[md] ?? ["pre_sesion", "entrenamiento"];
}
