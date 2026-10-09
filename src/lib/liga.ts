/**
 * Percentiles contra la liga: con las estadísticas de temporada de todos los
 * equipos y jugadores de la competencia (referencias_liga). Los nombres de las
 * estadísticas son los de la fuente (Sofascore).
 */

export type StatsLiga = Record<string, number | undefined>;

export interface EquipoLiga {
  id: string;
  nombre: string;
  partidos: number;
  propio: boolean;
  stats: StatsLiga;
}

export interface JugadorLiga {
  id: string;
  nombre: string;
  equipo: string;
  equipo_id: string;
  posicion: "G" | "D" | "M" | "F";
  minutos: number;
  stats: StatsLiga;
}

export interface MetricaLiga {
  clave: string;
  label: string;
  masEsMejor: boolean;
  decimales?: number;
  sufijo?: string;
  valor: (s: StatsLiga, divisor: number) => number | null;
}

const n = (x: number | undefined) => (typeof x === "number" ? x : null);
/** Por partido (equipos) o cada 90′ (jugadores): `divisor` = partidos o minutos/90. */
const por =
  (k: string): MetricaLiga["valor"] =>
  (s, d) => {
    const x = n(s[k]);
    return x === null || !d ? null : x / d;
  };
const directo =
  (k: string): MetricaLiga["valor"] =>
  (s) =>
    n(s[k]);

/** Métricas de equipo, por partido. */
export const METRICAS_EQUIPO: { titulo: string; metricas: MetricaLiga[] }[] = [
  {
    titulo: "Ataque",
    metricas: [
      {
        clave: "goles",
        label: "Goles por partido",
        masEsMejor: true,
        decimales: 2,
        valor: por("goalsScored"),
      },
      {
        clave: "tiros",
        label: "Tiros por partido",
        masEsMejor: true,
        decimales: 1,
        valor: por("shots"),
      },
      {
        clave: "corners",
        label: "Córners por partido",
        masEsMejor: true,
        decimales: 1,
        valor: por("corners"),
      },
      {
        clave: "regates",
        label: "Regates exitosos por partido",
        masEsMejor: true,
        decimales: 1,
        valor: por("successfulDribbles"),
      },
      {
        clave: "centros_pct",
        label: "Centros precisos",
        masEsMejor: true,
        sufijo: "%",
        valor: directo("accurateCrossesPercentage"),
      },
    ],
  },
  {
    titulo: "Posesión",
    metricas: [
      {
        clave: "posesion",
        label: "Posesión",
        masEsMejor: true,
        decimales: 1,
        sufijo: "%",
        valor: directo("averageBallPossession"),
      },
      {
        clave: "pases",
        label: "Pases por partido",
        masEsMejor: true,
        decimales: 0,
        valor: por("totalPasses"),
      },
      {
        clave: "pases_pct",
        label: "Precisión de pase",
        masEsMejor: true,
        decimales: 1,
        sufijo: "%",
        valor: directo("accuratePassesPercentage"),
      },
      {
        clave: "largos_pct",
        label: "Pases largos precisos",
        masEsMejor: true,
        decimales: 1,
        sufijo: "%",
        valor: directo("accurateLongBallsPercentage"),
      },
    ],
  },
  {
    titulo: "Defensa",
    metricas: [
      {
        clave: "goles_contra",
        label: "Goles en contra por partido",
        masEsMejor: false,
        decimales: 2,
        valor: por("goalsConceded"),
      },
      {
        clave: "tiros_contra",
        label: "Tiros en contra por partido",
        masEsMejor: false,
        decimales: 1,
        valor: por("shotsAgainst"),
      },
      {
        clave: "vallas_pct",
        label: "Vallas invictas",
        masEsMejor: true,
        sufijo: "%",
        valor: (s, d) =>
          n(s.cleanSheets) === null || !d ? null : Math.round((100 * s.cleanSheets!) / d),
      },
      {
        clave: "recuperaciones",
        label: "Recuperaciones por partido",
        masEsMejor: true,
        decimales: 1,
        valor: por("ballRecovery"),
      },
      {
        clave: "intercepciones",
        label: "Intercepciones por partido",
        masEsMejor: true,
        decimales: 1,
        valor: por("interceptions"),
      },
      {
        clave: "duelos_pct",
        label: "Duelos ganados",
        masEsMejor: true,
        decimales: 1,
        sufijo: "%",
        valor: directo("duelsWonPercentage"),
      },
      {
        clave: "aereos_pct",
        label: "Aéreos ganados",
        masEsMejor: true,
        decimales: 1,
        sufijo: "%",
        valor: directo("aerialDuelsWonPercentage"),
      },
      {
        clave: "errores",
        label: "Errores que terminan en tiro por partido",
        masEsMejor: false,
        decimales: 1,
        valor: por("errorsLeadingToShot"),
      },
    ],
  },
  {
    titulo: "Disciplina",
    metricas: [
      {
        clave: "faltas",
        label: "Faltas por partido",
        masEsMejor: false,
        decimales: 1,
        valor: por("fouls"),
      },
      {
        clave: "amarillas",
        label: "Amarillas por partido",
        masEsMejor: false,
        decimales: 2,
        valor: por("yellowCards"),
      },
    ],
  },
];

const m90 = (
  clave: string,
  k: string,
  label: string,
  decimales = 2,
  masEsMejor = true,
): MetricaLiga => ({
  clave,
  label: `${label} /90`,
  masEsMejor,
  decimales,
  valor: por(k),
});
const pctJ = (clave: string, k: string, label: string): MetricaLiga => ({
  clave,
  label,
  masEsMejor: true,
  decimales: 0,
  sufijo: "%",
  valor: directo(k),
});
const NOTA: MetricaLiga = {
  clave: "nota",
  label: "Nota Sofascore",
  masEsMejor: true,
  decimales: 2,
  valor: directo("rating"),
};

/** Métricas de jugador cada 90′ según el puesto de la fuente. */
export const METRICAS_JUGADOR: Record<JugadorLiga["posicion"], MetricaLiga[]> = {
  G: [
    m90("atajadas", "saves", "Atajadas"),
    pctJ("pases_pct", "accuratePassesPercentage", "Precisión de pase"),
    m90("largos", "accurateLongBalls", "Largos precisos", 1),
    NOTA,
  ],
  D: [
    m90("aereos", "aerialDuelsWon", "Aéreos ganados"),
    pctJ("aereos_pct", "aerialDuelsWonPercentage", "Aéreos ganados %"),
    pctJ("duelos_pct", "totalDuelsWonPercentage", "Duelos ganados %"),
    m90("despejes", "clearances", "Despejes"),
    m90("recuperaciones", "ballRecovery", "Recuperaciones"),
    pctJ("pases_pct", "accuratePassesPercentage", "Precisión de pase"),
    m90("largos", "accurateLongBalls", "Largos precisos"),
    NOTA,
  ],
  M: [
    m90("pases", "accuratePasses", "Pases precisos", 1),
    pctJ("pases_pct", "accuratePassesPercentage", "Precisión de pase"),
    m90("pases_clave", "keyPasses", "Pases clave"),
    m90("asistencias", "assists", "Asistencias"),
    m90("recuperaciones", "ballRecovery", "Recuperaciones"),
    pctJ("duelos_pct", "totalDuelsWonPercentage", "Duelos ganados %"),
    m90("regates", "successfulDribbles", "Regates exitosos"),
    NOTA,
  ],
  F: [
    m90("goles", "goals", "Goles"),
    m90("tiros", "totalShots", "Tiros"),
    m90("tiros_arco", "shotsOnTarget", "Tiros al arco"),
    m90("asistencias", "assists", "Asistencias"),
    m90("pases_clave", "keyPasses", "Pases clave"),
    m90("regates", "successfulDribbles", "Regates exitosos"),
    m90("aereos", "aerialDuelsWon", "Aéreos ganados"),
    NOTA,
  ],
};

/** Minutos mínimos para entrar en la comparación de jugadores (unos 5 partidos). */
export const MINUTOS_LIGA = 450;

export const LINEA_A_POSICION = { POR: "G", DEF: "D", CEN: "M", DEL: "F" } as const;

export interface Ranking {
  valor: number | null;
  /** 1 = el mejor de la liga */
  puesto: number | null;
  de: number;
  percentil: number | null;
  promedio: number | null;
}

/** Puesto y percentil de `valor` entre `todos` (empates a la mitad). */
export function ranking(valor: number | null, todos: number[], masEsMejor: boolean): Ranking {
  const promedio = todos.length ? todos.reduce((a, b) => a + b, 0) / todos.length : null;
  if (valor === null || todos.length < 3) {
    return { valor, puesto: null, de: todos.length, percentil: null, promedio };
  }
  const mejor = (v: number) => (masEsMejor ? v > valor : v < valor);
  const peor = (v: number) => (masEsMejor ? v < valor : v > valor);
  const puesto = todos.filter(mejor).length + 1;
  const iguales = todos.filter((v) => v === valor).length - 1;
  const percentil = Math.round(
    (100 * (todos.filter(peor).length + Math.max(0, iguales) / 2)) / (todos.length - 1),
  );
  return {
    valor,
    puesto,
    de: todos.length,
    percentil: Math.min(100, Math.max(0, percentil)),
    promedio,
  };
}

export function rankingEquipo(m: MetricaLiga, equipos: EquipoLiga[], nuestro: EquipoLiga): Ranking {
  const valores = equipos
    .map((e) => m.valor(e.stats, e.partidos))
    .filter((v): v is number => v !== null);
  return ranking(m.valor(nuestro.stats, nuestro.partidos), valores, m.masEsMejor);
}

/** Percentil de un jugador frente a los de su puesto en la liga (con al menos 450′). */
export function rankingJugador(m: MetricaLiga, jugadores: JugadorLiga[], j: JugadorLiga): Ranking {
  const pares = jugadores.filter((x) => x.posicion === j.posicion && x.minutos >= MINUTOS_LIGA);
  const valores = pares
    .map((x) => m.valor(x.stats, x.minutos / 90))
    .filter((v): v is number => v !== null);
  return ranking(m.valor(j.stats, j.minutos / 90), valores, m.masEsMejor);
}

export function formatearLiga(m: MetricaLiga, x: number | null): string {
  if (x === null) return "—";
  const d = m.decimales ?? 0;
  return `${x.toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d })}${m.sufijo ?? ""}`;
}
