/**
 * KPI del post partido. Leen las estadísticas de equipo con los nombres de la
 * app (los mismos para Sofascore y Wyscout) y las agrupan por momento del juego.
 */

export type Stats = Record<string, number | null | undefined>;

export interface DefinicionKpi {
  clave: string;
  label: string;
  /** Más es mejor (true) o menos es mejor (false) */
  masEsMejor: boolean;
  decimales?: number;
  sufijo?: string;
  /** Cómo se calcula a partir de las estadísticas del equipo y del rival */
  valor: (propio: Stats, rival: Stats) => number | null;
  ayuda?: string;
}

export interface GrupoKpi {
  titulo: string;
  kpis: DefinicionKpi[];
}

const v = (s: Stats, k: string): number | null => {
  const x = s[k];
  return typeof x === "number" && Number.isFinite(x) ? x : null;
};

const pct = (a: number | null, b: number | null): number | null =>
  a === null || !b ? null : Math.round((100 * a) / b);

function simple(
  clave: string,
  label: string,
  masEsMejor = true,
  extra: Partial<DefinicionKpi> = {},
): DefinicionKpi {
  return { clave, label, masEsMejor, valor: (p) => v(p, clave), ...extra };
}

/** Del rival: lo que nos generaron (menos es mejor). */
function delRival(clave: string, label: string, extra: Partial<DefinicionKpi> = {}): DefinicionKpi {
  return {
    clave: `contra_${clave}`,
    label,
    masEsMejor: false,
    valor: (_, r) => v(r, clave),
    ...extra,
  };
}

export const GRUPOS_KPI: GrupoKpi[] = [
  {
    titulo: "Ataque",
    kpis: [
      simple("xg", "xG", true, { decimales: 2 }),
      simple("tiros", "Tiros"),
      simple("tiros_arco", "Tiros al arco"),
      simple("grandes_chances", "Grandes chances"),
      simple("toques_area", "Toques en el área rival"),
      {
        clave: "ultimo_tercio",
        label: "Acciones en el último tercio",
        masEsMejor: true,
        valor: (p) => v(p, "ultimo_tercio_total"),
        ayuda: "Pases y conducciones que llegan al último tercio",
      },
      {
        clave: "centros_pct",
        label: "Centros precisos",
        masEsMejor: true,
        sufijo: "%",
        valor: (p) => pct(v(p, "centros"), v(p, "centros_total")),
      },
      simple("pases_clave", "Pases clave"),
    ],
  },
  {
    titulo: "Posesión y construcción",
    kpis: [
      simple("posesion", "Posesión", true, { sufijo: "%" }),
      simple("pases", "Pases"),
      {
        clave: "pases_pct",
        label: "Precisión de pase",
        masEsMejor: true,
        sufijo: "%",
        valor: (p) => pct(v(p, "pases_precisos"), v(p, "pases")),
      },
      {
        clave: "largos_pct",
        label: "Pases largos precisos",
        masEsMejor: true,
        sufijo: "%",
        valor: (p) => pct(v(p, "largos"), v(p, "largos_total")),
      },
      simple("perdidas", "Pérdidas", false),
    ],
  },
  {
    titulo: "Defensa",
    kpis: [
      delRival("xg", "xG en contra", { decimales: 2 }),
      delRival("tiros", "Tiros en contra"),
      delRival("toques_area", "Toques del rival en nuestra área"),
      {
        clave: "ppda",
        label: "PPDA (aprox.)",
        masEsMejor: false,
        decimales: 1,
        ayuda:
          "Pases del rival por cada acción defensiva nuestra (entradas, intercepciones y faltas). Más bajo = presión más intensa. Aproximado: Sofascore no da la zona.",
        valor: (p, r) => {
          const acciones =
            (v(p, "entradas") ?? 0) + (v(p, "intercepciones") ?? 0) + (v(p, "faltas") ?? 0);
          const pases = v(r, "pases");
          return pases === null || !acciones ? null : Math.round((10 * pases) / acciones) / 10;
        },
      },
      simple("recuperaciones", "Recuperaciones"),
      simple("intercepciones", "Intercepciones"),
      {
        clave: "duelos_suelo_pct",
        label: "Duelos en el piso ganados",
        masEsMejor: true,
        sufijo: "%",
        valor: (p) => pct(v(p, "duelos_suelo"), v(p, "duelos_suelo_total")),
      },
      {
        clave: "aereos_pct",
        label: "Duelos aéreos ganados",
        masEsMejor: true,
        sufijo: "%",
        valor: (p) => pct(v(p, "aereos"), v(p, "aereos_total")),
      },
      simple("errores_tiro", "Errores que terminan en tiro", false),
    ],
  },
  {
    titulo: "Pelota parada",
    kpis: [
      simple("corners", "Córners"),
      simple("tiros_abp", "Tiros de ABP"),
      simple("xg_abp", "xG de ABP", true, { decimales: 2 }),
      delRival("xg_abp", "xG de ABP en contra", { decimales: 2 }),
    ],
  },
  {
    titulo: "Físico",
    kpis: [simple("km", "Km recorridos", true, { decimales: 1 }), simple("sprints", "Sprints")],
  },
];

/** El valor del rival para la misma métrica (para la barra enfrentada). */
export function valorRival(k: DefinicionKpi, propio: Stats, rival: Stats): number | null {
  if (k.clave.startsWith("contra_")) return k.valor(rival, propio);
  if (k.clave === "ppda") {
    const acciones =
      (v(rival, "entradas") ?? 0) + (v(rival, "intercepciones") ?? 0) + (v(rival, "faltas") ?? 0);
    const pases = v(propio, "pases");
    return pases === null || !acciones ? null : Math.round((10 * pases) / acciones) / 10;
  }
  return k.valor(rival, propio);
}

/** Promedio de un KPI en partidos anteriores (null si ninguno lo tiene). */
export function promedioKpi(
  k: DefinicionKpi,
  previos: { propio: Stats; rival: Stats }[],
): number | null {
  const valores = previos
    .map((p) => k.valor(p.propio, p.rival))
    .filter((x): x is number => x !== null);
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function formatearKpi(k: DefinicionKpi, x: number | null): string {
  if (x === null) return "—";
  const d = k.decimales ?? 0;
  return `${x.toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d })}${k.sufijo ?? ""}`;
}

/** Si el partido mejoró (1), empeoró (-1) o quedó igual (0) contra la referencia. */
export function tendencia(k: DefinicionKpi, actual: number | null, ref: number | null): -1 | 0 | 1 {
  if (actual === null || ref === null) return 0;
  const margen = Math.max(Math.abs(ref) * 0.1, k.decimales ? 0.05 : 0.5);
  if (Math.abs(actual - ref) < margen) return 0;
  return actual > ref === k.masEsMejor ? 1 : -1;
}

export interface Tiro {
  minuto: number | null;
  extra?: number | null;
  propio: boolean;
  xg: number;
  situacion?: string | null;
  abp?: boolean;
  cuerpo?: string | null;
  resultado?: string | null;
  jugador?: string | null;
}

/** xG por tramos de 15′ (el último incluye el descuento). */
export function xgPorTramo(tiros: Tiro[]): { tramo: string; propio: number; rival: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const desde = i * 15;
    const hasta = desde + 15;
    const en = tiros.filter((t) => {
      const m = t.minuto ?? 0;
      return i === 0 ? m <= hasta : m > desde && (m <= hasta || i === 5);
    });
    const suma = (propio: boolean) =>
      Math.round(100 * en.filter((t) => t.propio === propio).reduce((a, t) => a + t.xg, 0)) / 100;
    return { tramo: `${desde}-${hasta}′`, propio: suma(true), rival: suma(false) };
  });
}

// ---------- Conclusiones y plan vs realidad -------------------------

/** Conclusiones del cuerpo técnico (y su nombre para los mensajes de error). */
export const CAMPOS_POST = {
  valoracion: "La valoración",
  positivos: "Lo positivo",
  a_mejorar: "Lo que hay que mejorar",
  para_la_semana: "Lo que trabajamos en la semana",
} as const;

export type CampoPost = keyof typeof CAMPOS_POST;

export const CUMPLIMIENTOS = [
  { valor: "si", label: "Se cumplió", chip: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  { valor: "parcial", label: "A medias", chip: "bg-amber-100 text-amber-800 ring-amber-200" },
  { valor: "no", label: "No se cumplió", chip: "bg-red-100 text-red-800 ring-red-200" },
] as const;

export type Cumplimiento = (typeof CUMPLIMIENTOS)[number]["valor"];

export interface EvaluacionPlan {
  cumplimiento: Cumplimiento | null;
  nota: string;
}

/** Lo que propone Claude (formato del worker). */
export interface InsightsPost {
  resumen?: string;
  positivos?: string[];
  a_mejorar?: string[];
  plan_vs_real?: { clave: string; cumplimiento: string; evidencia: string }[];
  destacados?: { jugador: string; motivo: string }[];
  para_la_semana?: string[];
}
