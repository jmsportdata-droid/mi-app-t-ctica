import type { Tables } from "./database";

export type InformeRivalDatos = Tables<"informes_rival_datos">;
export type PedidoSofascore = Tables<"pedidos_sofascore">;
export type JugadorRival = Tables<"jugadores_rivales">;

/** Hipótesis y claves que redacta Claude (formato textos.json de la skill). */
export interface InsightsInforme {
  ofensiva?: { inicio?: string; construccion?: string; finalizacion?: string };
  defensiva?: { bloque_alto?: string; bloque_medio_bajo?: string; vulnerabilidades?: string };
  transiciones?: { ataque_defensa?: string; defensa_ataque?: string };
  tiempos?: string;
  portero?: string;
  abp?: { ofensiva?: string; defensiva?: string };
  claves?: {
    fortalezas?: string[];
    debilidades?: string[];
    pelota_quieta?: string[];
    recomendaciones?: string[];
    jugadores_a_vigilar?: { jugador: string; motivo: string }[];
  };
}

export type EstadoValidacion = "confirmado" | "descartado";

/** Las listas de claves que se validan una por una. */
export const GRUPOS_CLAVES = [
  { clave: "fortalezas", titulo: "Fortalezas", color: "border-emerald-200 bg-emerald-50/50" },
  {
    clave: "debilidades",
    titulo: "Debilidades para explotar",
    color: "border-red-200 bg-red-50/50",
  },
  { clave: "pelota_quieta", titulo: "Pelota quieta", color: "border-violet-200 bg-violet-50/50" },
  {
    clave: "recomendaciones",
    titulo: "Recomendaciones para el plan",
    color: "border-sky-200 bg-sky-50/50",
  },
] as const;

/** Estadísticas que se muestran del equipo, con su etiqueta y si "más" es mejor. */
export const KPI_EQUIPO = [
  { clave: "posesion", label: "Posesión (%)", grupo: "Con pelota" },
  { clave: "pases", label: "Pases", grupo: "Con pelota" },
  { clave: "precision_pase", label: "Precisión de pase (%)", grupo: "Con pelota" },
  { clave: "pases_largos", label: "Pases largos", grupo: "Con pelota" },
  { clave: "centros", label: "Centros", grupo: "Con pelota" },
  { clave: "regates", label: "Regates", grupo: "Con pelota" },
  { clave: "tiros", label: "Tiros", grupo: "Con pelota" },
  { clave: "a_puerta", label: "Tiros al arco", grupo: "Con pelota" },
  { clave: "xg", label: "xG", grupo: "Con pelota" },
  { clave: "toques_area", label: "Toques en el área", grupo: "Con pelota" },
  { clave: "corners", label: "Córners", grupo: "Con pelota" },
  { clave: "intercepciones", label: "Intercepciones", grupo: "Sin pelota" },
  { clave: "despejes", label: "Despejes", grupo: "Sin pelota" },
  { clave: "duelos_pct", label: "Duelos ganados (%)", grupo: "Sin pelota" },
  { clave: "aereos_pct", label: "Aéreos ganados (%)", grupo: "Sin pelota" },
  { clave: "faltas", label: "Faltas", grupo: "Sin pelota" },
  { clave: "perdidas", label: "Pérdidas", grupo: "Sin pelota" },
] as const;
