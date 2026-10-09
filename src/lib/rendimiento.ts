/**
 * Rendimiento: cálculos sobre los post partidos de la temporada (equipo y
 * jugadores). Todo es puro: recibe los datos ya cargados y devuelve series,
 * tablas y alertas. Los KPI de equipo son los del post partido.
 */

import {
  GRUPOS_KPI,
  promedioKpi,
  valorRival,
  type DefinicionKpi,
  type Stats,
} from "./post-partido";
import { calcularEdad } from "./utils/edad";

export type Linea = "POR" | "DEF" | "CEN" | "DEL";

export interface PartidoRend {
  id: string;
  fecha: string;
  rival: string;
  competicion: string | null;
  esLocal: boolean;
  gf: number | null;
  gc: number | null;
  propio: Stats;
  rival_stats: Stats;
}

export interface JugadorPartido {
  partidoId: string;
  jugadorId: string;
  titular: boolean;
  minutos: number;
  nota: number | null;
  goles: number;
  asistencias: number;
  amarillas: number;
  rojas: number;
  stats: Stats;
}

export interface Valoracion {
  partidoId: string;
  jugadorId: string;
  nota: number;
}

export interface JugadorInfo {
  id: string;
  nombre: string;
  numero: number | null;
  posicion: Linea;
  fecha_nac: string | null;
  nacionalidad: string | null;
  formado_en_club: boolean;
  fecha_debut: string | null;
  estadisticas_externas: Stats;
  altura_cm: number | null;
}

export interface Filtros {
  competicion?: string | null;
  desde?: string | null;
  hasta?: string | null;
}

/** Minutos mínimos para comparar a un jugador con su línea. */
export const MINUTOS_MINIMOS = 180;

export function filtrarPartidos(partidos: PartidoRend[], f: Filtros): PartidoRend[] {
  return partidos
    .filter(
      (p) =>
        (!f.competicion || p.competicion === f.competicion) &&
        (!f.desde || p.fecha >= f.desde) &&
        (!f.hasta || p.fecha <= f.hasta),
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ---------- Equipo ---------------------------------------------------

export function resultado(p: PartidoRend): "G" | "E" | "P" | null {
  if (p.gf === null || p.gc === null) return null;
  return p.gf > p.gc ? "G" : p.gf < p.gc ? "P" : "E";
}

export function resumenEquipo(partidos: PartidoRend[]) {
  const r = partidos.map(resultado).filter((x) => x !== null);
  const g = r.filter((x) => x === "G").length;
  const e = r.filter((x) => x === "E").length;
  const p = r.filter((x) => x === "P").length;
  const puntos = 3 * g + e;
  return {
    pj: r.length,
    g,
    e,
    p,
    puntos,
    rendimiento: r.length ? Math.round((100 * puntos) / (3 * r.length)) : null,
    gf: partidos.reduce((a, x) => a + (x.gf ?? 0), 0),
    gc: partidos.reduce((a, x) => a + (x.gc ?? 0), 0),
    vallas: partidos.filter((x) => x.gc === 0).length,
  };
}

/** Media de los últimos `n` valores hasta cada posición (null donde no hay datos). */
export function mediaMovil(valores: (number | null)[], n = 5): (number | null)[] {
  return valores.map((_, i) => {
    const ventana = valores
      .slice(Math.max(0, i - n + 1), i + 1)
      .filter((v): v is number => v !== null);
    return ventana.length ? ventana.reduce((a, b) => a + b, 0) / ventana.length : null;
  });
}

export interface PuntoSerie {
  partidoId: string;
  fecha: string;
  rival: string;
  nos: number | null;
  ellos: number | null;
  media: number | null;
}

/** Un KPI partido a partido (orden cronológico) con su media móvil de 5. */
export function serieKpi(k: DefinicionKpi, partidos: PartidoRend[]): PuntoSerie[] {
  const nos = partidos.map((p) => k.valor(p.propio, p.rival_stats));
  const medias = mediaMovil(nos);
  return partidos.map((p, i) => ({
    partidoId: p.id,
    fecha: p.fecha,
    rival: p.rival,
    nos: nos[i] ?? null,
    ellos: valorRival(k, p.propio, p.rival_stats),
    media: medias[i] ?? null,
  }));
}

// ---------- Jugadores ------------------------------------------------

export interface ResumenJugador {
  jugador: JugadorInfo;
  edad: number | null;
  extranjero: boolean;
  partidos: number;
  titular: number;
  minutos: number;
  /** % de los minutos posibles (partidos con datos × 90) */
  pctMinutos: number;
  goles: number;
  asistencias: number;
  amarillas: number;
  rojas: number;
  nota: number | null;
  notaCt: number | null;
  /** Suma de cada estadística de sus partidos */
  totales: Stats;
}

export const esExtranjero = (nacionalidad: string | null) =>
  Boolean(nacionalidad) && !/urug/i.test(nacionalidad ?? "");

const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function resumenJugadores(
  jugadores: JugadorInfo[],
  jps: JugadorPartido[],
  valoraciones: Valoracion[],
  partidosIds: Set<string>,
  hoy: Date = new Date(),
): ResumenJugador[] {
  const posibles = partidosIds.size * 90 || 1;
  return jugadores.map((j) => {
    const suyos = jps.filter((x) => x.jugadorId === j.id && partidosIds.has(x.partidoId));
    const totales: Stats = {};
    for (const x of suyos)
      for (const [k, v] of Object.entries(x.stats))
        if (typeof v === "number") totales[k] = (totales[k] ?? 0) + v;
    const minutos = suyos.reduce((a, x) => a + x.minutos, 0);
    return {
      jugador: j,
      edad: calcularEdad(j.fecha_nac, hoy),
      extranjero: esExtranjero(j.nacionalidad),
      partidos: suyos.filter((x) => x.minutos > 0).length,
      titular: suyos.filter((x) => x.titular).length,
      minutos,
      pctMinutos: Math.round((100 * minutos) / posibles),
      goles: suyos.reduce((a, x) => a + x.goles, 0),
      asistencias: suyos.reduce((a, x) => a + x.asistencias, 0),
      amarillas: suyos.reduce((a, x) => a + x.amarillas, 0),
      rojas: suyos.reduce((a, x) => a + x.rojas, 0),
      nota: promedio(suyos.map((x) => x.nota).filter((n): n is number => n !== null)),
      notaCt: promedio(
        valoraciones
          .filter((v) => v.jugadorId === j.id && partidosIds.has(v.partidoId))
          .map((v) => v.nota),
      ),
      totales,
    };
  });
}

export const LINEAS: { valor: Linea; label: string }[] = [
  { valor: "POR", label: "Arqueros" },
  { valor: "DEF", label: "Defensores" },
  { valor: "CEN", label: "Mediocampistas" },
  { valor: "DEL", label: "Delanteros" },
];

export function minutosPorLinea(resumen: ResumenJugador[]) {
  const total = resumen.reduce((a, r) => a + r.minutos, 0) || 1;
  return LINEAS.map((l) => {
    const de = resumen.filter((r) => r.jugador.posicion === l.valor);
    const minutos = de.reduce((a, r) => a + r.minutos, 0);
    return {
      ...l,
      minutos,
      pct: Math.round((100 * minutos) / total),
      usados: de.filter((r) => r.minutos > 0).length,
    };
  });
}

// ---------- Perfil individual (cada 90′, según la línea) -------------

export interface MetricaPerfil {
  clave: string;
  label: string;
  /** "90" = cada 90 minutos; "%" = porcentaje; "max" = el máximo */
  tipo: "90" | "%" | "max";
  /** Numerador (y denominador para %) sobre los totales */
  num: string;
  den?: string;
  masEsMejor?: boolean;
  decimales?: number;
}

const m90 = (clave: string, label: string, decimales = 1, masEsMejor = true): MetricaPerfil => ({
  clave,
  label: `${label} /90`,
  tipo: "90",
  num: clave,
  decimales,
  masEsMejor,
});

const FISICO: MetricaPerfil[] = [m90("km", "Km", 1), m90("sprints", "Sprints", 1)];

export const PERFILES: Record<Linea, MetricaPerfil[]> = {
  POR: [
    m90("atajadas", "Atajadas"),
    {
      clave: "pases_pct",
      label: "Precisión de pase",
      tipo: "%",
      num: "pases_precisos",
      den: "pases",
    },
    {
      clave: "largos_pct",
      label: "Largos precisos",
      tipo: "%",
      num: "largos_precisos",
      den: "largos",
    },
    m90("recuperaciones", "Recuperaciones"),
  ],
  DEF: [
    {
      clave: "duelos_pct",
      label: "Duelos ganados",
      tipo: "%",
      num: "duelos_ganados",
      den: "duelos_total",
    },
    {
      clave: "aereos_pct",
      label: "Aéreos ganados",
      tipo: "%",
      num: "aereos_ganados",
      den: "aereos_total",
    },
    m90("intercepciones", "Intercepciones"),
    m90("despejes", "Despejes"),
    m90("recuperaciones", "Recuperaciones"),
    {
      clave: "pases_pct",
      label: "Precisión de pase",
      tipo: "%",
      num: "pases_precisos",
      den: "pases",
    },
    m90("perdidas", "Pérdidas", 1, false),
    ...FISICO,
  ],
  CEN: [
    m90("pases", "Pases", 0),
    {
      clave: "pases_pct",
      label: "Precisión de pase",
      tipo: "%",
      num: "pases_precisos",
      den: "pases",
    },
    m90("pases_clave", "Pases clave"),
    m90("xa", "xA", 2),
    m90("recuperaciones", "Recuperaciones"),
    {
      clave: "duelos_pct",
      label: "Duelos ganados",
      tipo: "%",
      num: "duelos_ganados",
      den: "duelos_total",
    },
    m90("perdidas", "Pérdidas", 1, false),
    ...FISICO,
  ],
  DEL: [
    m90("xg", "xG", 2),
    m90("tiros", "Tiros"),
    { clave: "tiros_arco_pct", label: "Tiros al arco", tipo: "%", num: "tiros_arco", den: "tiros" },
    m90("xa", "xA", 2),
    m90("pases_clave", "Pases clave"),
    m90("regates_ok", "Regates ganados"),
    {
      clave: "duelos_pct",
      label: "Duelos ganados",
      tipo: "%",
      num: "duelos_ganados",
      den: "duelos_total",
    },
    ...FISICO,
  ],
};

/** Totales con los derivados que usan los perfiles (duelos y aéreos totales). */
function conDerivados(t: Stats): Stats {
  return {
    ...t,
    duelos_total: (t.duelos_ganados ?? 0) + (t.duelos_perdidos ?? 0),
    aereos_total: (t.aereos_ganados ?? 0) + (t.aereos_perdidos ?? 0),
  };
}

export function valorMetrica(m: MetricaPerfil, totales: Stats, minutos: number): number | null {
  const t = conDerivados(totales);
  const num = t[m.num];
  if (typeof num !== "number") return null;
  if (m.tipo === "90") return minutos > 0 ? (90 * num) / minutos : null;
  const den = m.den ? t[m.den] : null;
  return typeof den === "number" && den > 0 ? Math.round((100 * num) / den) : null;
}

export interface FilaPerfil {
  metrica: MetricaPerfil;
  valor: number | null;
  promedioLinea: number | null;
  /** Percentil (0-100) dentro de la línea del plantel */
  percentil: number | null;
}

/** El perfil del jugador frente a su línea del plantel (con al menos 180′). */
export function perfilJugador(r: ResumenJugador, todos: ResumenJugador[]): FilaPerfil[] {
  const pares = todos.filter(
    (x) => x.jugador.posicion === r.jugador.posicion && x.minutos >= MINUTOS_MINIMOS,
  );
  return PERFILES[r.jugador.posicion].map((m) => {
    const valor = valorMetrica(m, r.totales, r.minutos);
    const valores = pares
      .map((x) => valorMetrica(m, x.totales, x.minutos))
      .filter((v): v is number => v !== null);
    let percentil: number | null = null;
    if (valor !== null && valores.length >= 3) {
      // Rango medio: los empates cuentan la mitad (el propio jugador no cuenta)
      const peor = (v: number) => (m.masEsMejor === false ? v > valor : v < valor);
      const debajo = valores.filter(peor).length;
      const iguales = valores.filter((v) => v === valor).length - 1;
      percentil = Math.round((100 * (debajo + Math.max(0, iguales) / 2)) / (valores.length - 1));
    }
    return {
      metrica: m,
      valor,
      promedioLinea: promedio(valores),
      percentil: percentil === null ? null : Math.min(100, percentil),
    };
  });
}

// ---------- Alertas ---------------------------------------------------

export interface Alerta {
  nivel: "alerta" | "aviso" | "info";
  texto: string;
  jugadorId?: string;
}

/** Amarillas acumuladas desde las que se avisa (revisar el reglamento de cada competencia). */
export const UMBRAL_AMARILLAS = 4;

/** KPI de equipo que se vigilan en las alertas. */
const KPIS_VIGILADOS = ["xg", "contra_xg", "tiros_arco", "recuperaciones", "perdidas", "ppda"];

export function alertas(
  partidos: PartidoRend[],
  jps: JugadorPartido[],
  resumen: ResumenJugador[],
): Alerta[] {
  const lista: Alerta[] = [];
  const kpis = GRUPOS_KPI.flatMap((g) => g.kpis);

  // Rachas
  const res = partidos.map(resultado).filter((x) => x !== null);
  let sinGanar = 0;
  let sinPerder = 0;
  for (let i = res.length - 1; i >= 0 && res[i] !== "G"; i--) sinGanar++;
  for (let i = res.length - 1; i >= 0 && res[i] !== "P"; i--) sinPerder++;
  if (sinGanar >= 3)
    lista.push({ nivel: "aviso", texto: `${sinGanar} partidos seguidos sin ganar.` });
  if (sinPerder >= 4)
    lista.push({ nivel: "info", texto: `${sinPerder} partidos seguidos sin perder.` });

  // Equipo: 3 partidos seguidos peor que el promedio de la temporada
  if (partidos.length >= 5) {
    const todos = partidos.map((p) => ({ propio: p.propio, rival: p.rival_stats }));
    for (const clave of KPIS_VIGILADOS) {
      const k = kpis.find((x) => x.clave === clave);
      if (!k) continue;
      const prom = promedioKpi(k, todos);
      const ultimos = partidos.slice(-3).map((p) => k.valor(p.propio, p.rival_stats));
      if (prom === null || ultimos.some((v) => v === null)) continue;
      const peores = ultimos.every((v) => (k.masEsMejor ? v! < prom * 0.9 : v! > prom * 1.1));
      if (peores)
        lista.push({
          nivel: "aviso",
          texto: `${k.label}: los últimos 3 partidos por debajo de nuestro promedio (${ultimos
            .map((v) => v!.toFixed(k.decimales ?? 0))
            .join(", ")} vs ${prom.toFixed(k.decimales ?? 0)}).`,
        });
    }
  }

  // Jugadores
  const ordenados = [...partidos].map((p) => p.id);
  const ultimos4 = ordenados.slice(-4);
  const completos: string[] = [];
  for (const r of resumen) {
    const j = r.jugador;
    if (r.amarillas >= UMBRAL_AMARILLAS)
      lista.push({
        nivel: "alerta",
        jugadorId: j.id,
        texto: `${j.nombre} acumula ${r.amarillas} amarillas.`,
      });
    const suyos = ordenados
      .map((id) => jps.find((x) => x.partidoId === id && x.jugadorId === j.id))
      .filter((x): x is JugadorPartido => Boolean(x && x.minutos >= 30 && x.nota !== null));
    if (suyos.length >= 5 && r.nota !== null) {
      const ultimas = promedio(suyos.slice(-3).map((x) => x.nota!));
      if (ultimas !== null && ultimas <= r.nota - 0.5)
        lista.push({
          nivel: "aviso",
          jugadorId: j.id,
          texto: `${j.nombre} bajó su nota: ${ultimas.toFixed(1)} en los últimos 3 (promedio ${r.nota.toFixed(1)}).`,
        });
    }
    if (
      j.posicion !== "POR" &&
      ultimos4.length === 4 &&
      ultimos4.every(
        (id) => (jps.find((x) => x.partidoId === id && x.jugadorId === j.id)?.minutos ?? 0) >= 88,
      )
    )
      completos.push(j.nombre.split(" ").slice(-1)[0] ?? j.nombre);
    if (r.nota !== null && r.notaCt !== null && Math.abs(r.nota - r.notaCt) >= 1)
      lista.push({
        nivel: "info",
        jugadorId: j.id,
        texto: `${j.nombre}: el cuerpo técnico lo ve distinto que la nota automática (${r.notaCt.toFixed(1)} vs ${r.nota.toFixed(1)}).`,
      });
  }
  if (completos.length)
    lista.push({
      nivel: "info",
      texto: `Jugaron completos los últimos 4 partidos: ${completos.join(", ")}. Controlar la carga.`,
    });
  const orden = { alerta: 0, aviso: 1, info: 2 };
  return lista.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}
