import "server-only";
import type { Posicion } from "@/types/jugador";

/**
 * Cliente de API-Football (api-sports.io), solo del lado del servidor.
 *
 * Plan gratuito: 100 consultas por día y 10 por minuto. No da acceso a
 * consultas por temporada en curso (fixture, estadísticas), pero sí al
 * buscador de equipos, al plantel actual y al perfil de cada jugador, que es
 * todo lo que usa la importación.
 */

const BASE = "https://v3.football.api-sports.io";
/** Host de las imágenes (escudos y fotos). No consume cuota. */
export const HOST_IMAGENES = "media.api-sports.io";

export const PROVEEDOR = "api_football";

export class ErrorApiFootball extends Error {
  constructor(
    message: string,
    readonly tipo: "sin_clave" | "limite" | "plan" | "otro",
  ) {
    super(message);
  }
}

export interface Cuota {
  /** Consultas que quedan hoy (se reinicia a las 00:00 UTC) */
  restantesHoy: number | null;
}

interface Respuesta<T> {
  datos: T;
  cuota: Cuota;
}

async function consultar<T>(
  ruta: string,
  parametros: Record<string, string | number>,
): Promise<Respuesta<T>> {
  const clave = process.env.API_FOOTBALL_KEY;
  if (!clave) {
    throw new ErrorApiFootball(
      "Falta API_FOOTBALL_KEY: la importación no está configurada.",
      "sin_clave",
    );
  }

  const url = new URL(ruta, BASE);
  for (const [k, v] of Object.entries(parametros)) url.searchParams.set(k, String(v));

  const res = await fetch(url, { headers: { "x-apisports-key": clave }, cache: "no-store" });
  const restantes = res.headers.get("x-ratelimit-requests-remaining");
  const cuota: Cuota = { restantesHoy: restantes === null ? null : Number(restantes) };

  if (res.status === 429) {
    throw new ErrorApiFootball(
      "Se llegó al límite de consultas por minuto. Esperá un momento.",
      "limite",
    );
  }
  if (!res.ok) {
    throw new ErrorApiFootball(`API-Football respondió ${res.status}`, "otro");
  }

  const cuerpo = (await res.json()) as { errors: unknown; response: T };
  // "errors" es [] cuando todo está bien, o un objeto { campo: mensaje }
  const errores =
    cuerpo.errors && !Array.isArray(cuerpo.errors) ? (cuerpo.errors as Record<string, string>) : {};
  if (Object.keys(errores).length > 0) {
    if (errores.rateLimit || errores.requests) {
      throw new ErrorApiFootball(
        errores.requests
          ? "Se terminaron las consultas de hoy en API-Football. Se renuevan a las 21:00 (hora de Uruguay)."
          : "Se llegó al límite de consultas por minuto. Esperá un momento.",
        "limite",
      );
    }
    if (errores.plan) throw new ErrorApiFootball(errores.plan, "plan");
    throw new ErrorApiFootball(Object.values(errores).join(" "), "otro");
  }
  return { datos: cuerpo.response, cuota };
}

/** La búsqueda solo acepta letras sin acentos, números y espacios. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Equipos --------------------------------------------

export interface EquipoExterno {
  id: number;
  nombre: string;
  pais: string | null;
  escudoUrl: string | null;
  estadio: string | null;
  ciudad: string | null;
}

interface EquipoApi {
  team: { id: number; name: string; country: string | null; logo: string | null };
  venue: { name: string | null; city: string | null } | null;
}

function aEquipo({ team, venue }: EquipoApi): EquipoExterno {
  return {
    id: team.id,
    nombre: team.name,
    pais: team.country,
    escudoUrl: team.logo,
    estadio: venue?.name ?? null,
    ciudad: venue?.city ?? null,
  };
}

/** Busca equipos por nombre (mínimo 3 letras). Primero los del país preferido. */
export async function buscarEquipos(
  texto: string,
  paisPreferido = "Uruguay",
): Promise<Respuesta<EquipoExterno[]>> {
  const { datos, cuota } = await consultar<EquipoApi[]>("/teams", {
    search: normalizarBusqueda(texto),
  });
  const equipos = datos.map(aEquipo).sort((a, b) => {
    const pa = a.pais === paisPreferido ? 0 : 1;
    const pb = b.pais === paisPreferido ? 0 : 1;
    return pa - pb || a.nombre.localeCompare(b.nombre, "es");
  });
  return { datos: equipos, cuota };
}

export async function obtenerEquipo(id: number): Promise<Respuesta<EquipoExterno | null>> {
  const { datos, cuota } = await consultar<EquipoApi[]>("/teams", { id });
  return { datos: datos[0] ? aEquipo(datos[0]) : null, cuota };
}

// ---------- Jugadores ------------------------------------------

const LINEA: Record<string, Posicion> = {
  Goalkeeper: "POR",
  Defender: "DEF",
  Midfielder: "CEN",
  Attacker: "DEL",
};

export interface JugadorExterno {
  id: number;
  /** Abreviado en el plantel ("J. Bianchi"); completo si se pidió el perfil */
  nombre: string;
  edad: number | null;
  numero: number | null;
  posicion: Posicion;
  fotoUrl: string | null;
}

interface PlantelApi {
  team: { id: number; name: string };
  players: {
    id: number;
    name: string;
    age: number | null;
    number: number | null;
    position: string;
    photo: string | null;
  }[];
}

/** Plantel actual del equipo (no depende de la temporada: entra en el plan gratuito). */
export async function obtenerPlantel(equipoId: number): Promise<Respuesta<JugadorExterno[]>> {
  const { datos, cuota } = await consultar<PlantelApi[]>("/players/squads", { team: equipoId });
  const jugadores = (datos[0]?.players ?? []).map((p) => ({
    id: p.id,
    nombre: p.name,
    edad: p.age,
    numero: p.number !== null && p.number >= 1 && p.number <= 99 ? p.number : null,
    posicion: LINEA[p.position] ?? "CEN",
    fotoUrl: p.photo,
  }));
  return { datos: jugadores, cuota };
}

export interface PerfilExterno {
  nombreCompleto: string | null;
  fechaNac: string | null;
  nacionalidad: string | null;
  alturaCm: number | null;
}

interface PerfilApi {
  player: {
    firstname: string | null;
    lastname: string | null;
    birth: { date: string | null } | null;
    nationality: string | null;
    height: string | null;
  };
}

/** Nombre completo, fecha de nacimiento, nacionalidad y altura (1 consulta por jugador). */
export async function obtenerPerfil(jugadorId: number): Promise<Respuesta<PerfilExterno | null>> {
  const { datos, cuota } = await consultar<PerfilApi[]>("/players/profiles", {
    player: jugadorId,
  });
  const p = datos[0]?.player;
  if (!p) return { datos: null, cuota };

  const nombre = [p.firstname, p.lastname].filter(Boolean).join(" ").trim();
  const altura = p.height ? Number.parseInt(p.height, 10) : NaN;
  const fecha = p.birth?.date && /^\d{4}-\d{2}-\d{2}$/.test(p.birth.date) ? p.birth.date : null;
  return {
    datos: {
      nombreCompleto: nombre || null,
      fechaNac: fecha,
      nacionalidad: p.nationality,
      alturaCm: altura >= 140 && altura <= 220 ? altura : null,
    },
    cuota,
  };
}

/** Descarga una imagen de API-Football (solo de su host, para no pedir URLs arbitrarias). */
export async function descargarImagen(url: string): Promise<Blob | null> {
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    return null;
  }
  if (destino.protocol !== "https:" || destino.hostname !== HOST_IMAGENES) return null;

  const res = await fetch(destino, { cache: "no-store" });
  if (!res.ok) return null;
  const blob = await res.blob();
  return blob.type === "image/png" || blob.type === "image/jpeg" ? blob : null;
}
