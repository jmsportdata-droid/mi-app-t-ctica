"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buscarEquipos,
  descargarImagen,
  ErrorApiFootball,
  normalizarBusqueda,
  obtenerEquipo,
  obtenerPerfil,
  obtenerPlantel,
  PROVEEDOR,
  type Cuota,
  type EquipoExterno,
  type JugadorExterno,
} from "@/lib/externos/api-football";
import { BUCKETS, type Bucket } from "@/lib/storage/config";
import { borrarImagenes } from "@/lib/storage/server";
import { getAccion, SESION_EXPIRADA, SIN_TEMPORADA } from "@/lib/supabase/auth";
import type { Json, TablesInsert, TablesUpdate } from "@/types/database";
import { POSICIONES } from "@/types/jugador";

type Fallo = { ok: false; error: string };
type ConCuota<T> = { ok: true; cuota: Cuota } & T;

function errorExterno(err: unknown, contexto: string): Fallo {
  if (err instanceof ErrorApiFootball) return { ok: false, error: err.message };
  console.error(`[importar ${contexto}]`, err);
  return { ok: false, error: "No se pudo consultar API-Football. Probá de nuevo." };
}

type Supabase = NonNullable<Awaited<ReturnType<typeof getAccion>>>["supabase"];

/** Copia una imagen de API-Football a la carpeta del cuerpo técnico. Devuelve la ruta. */
async function copiarImagen(
  supabase: Supabase,
  bucket: Bucket,
  cuerpoTecnicoId: string,
  url: string | null,
): Promise<string | null> {
  if (!url) return null;
  const imagen = await descargarImagen(url);
  if (!imagen) return null;

  const extension = imagen.type === "image/png" ? "png" : "jpg";
  const ruta = `${cuerpoTecnicoId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(ruta, imagen, {
    contentType: imagen.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[importar imagen]", error.message);
    return null;
  }
  return ruta;
}

function conProveedor(ids: Json, idExterno: number): Json {
  const actuales = ids && typeof ids === "object" && !Array.isArray(ids) ? ids : {};
  return { ...actuales, [PROVEEDOR]: String(idExterno) };
}

// ---------- Búsqueda ---------------------------------------------

export async function buscarEquiposExternos(
  texto: string,
): Promise<ConCuota<{ equipos: EquipoExterno[] }> | Fallo> {
  if (normalizarBusqueda(texto).length < 3) {
    return { ok: false, error: "Escribí al menos 3 letras del nombre del equipo." };
  }
  if (!(await getAccion())) return SESION_EXPIRADA;

  try {
    const { datos, cuota } = await buscarEquipos(texto);
    return { ok: true, equipos: datos.slice(0, 20), cuota };
  } catch (err) {
    return errorExterno(err, "buscar");
  }
}

// ---------- Plantel ----------------------------------------------

export interface JugadorParaImportar extends JugadorExterno {
  /** Si ya está en el plantel de la temporada (importado antes) */
  existente: { id: string; nombre: string; numero: number | null } | null;
}

/** Plantel actual del equipo, marcando quién ya está en la temporada. 1 consulta. */
export async function obtenerPlantelExterno(
  equipoId: number,
): Promise<ConCuota<{ jugadores: JugadorParaImportar[] }> | Fallo> {
  if (!Number.isInteger(equipoId) || equipoId <= 0) return { ok: false, error: "Equipo no válido" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.temporada) return SIN_TEMPORADA;

  try {
    const [{ datos, cuota }, propios] = await Promise.all([
      obtenerPlantel(equipoId),
      supabase
        .from("jugadores")
        .select("id, nombre, numero, ids_externos")
        .eq("temporada_id", contexto.temporada.id),
    ]);
    if (propios.error) throw propios.error;

    const porIdExterno = new Map(
      propios.data
        .map((j) => {
          const ids = j.ids_externos as Record<string, unknown> | null;
          const externo = ids?.[PROVEEDOR];
          return [typeof externo === "string" ? externo : null, j] as const;
        })
        .filter((par): par is [string, (typeof propios.data)[number]] => par[0] !== null),
    );

    const jugadores = datos.map((j) => {
      const propio = porIdExterno.get(String(j.id));
      return {
        ...j,
        existente: propio ? { id: propio.id, nombre: propio.nombre, numero: propio.numero } : null,
      };
    });
    return { ok: true, jugadores, cuota };
  } catch (err) {
    return errorExterno(err, "plantel");
  }
}

const jugadorExternoSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().trim().min(2).max(80),
  edad: z.number().int().nullable(),
  numero: z.number().int().min(1).max(99).nullable(),
  posicion: z.enum(POSICIONES),
  fotoUrl: z.string().url().nullable(),
});

export type ResultadoJugador = ConCuota<{
  accion: "creado" | "actualizado";
  nombre: string;
  aviso: string | null;
}>;

/**
 * Crea o actualiza un jugador de la temporada a partir de API-Football.
 * Con `conPerfil` trae nombre completo, fecha de nacimiento, nacionalidad y altura
 * (1 consulta). A los existentes solo se les completa lo que falta, más número y línea.
 */
export async function importarJugadorExterno(
  entrada: JugadorExterno,
  conPerfil: boolean,
): Promise<ResultadoJugador | Fallo> {
  const parsed = jugadorExternoSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Datos del jugador no válidos" };
  const externo = parsed.data;

  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;
  if (!contexto.temporada) return SIN_TEMPORADA;
  const temporadaId = contexto.temporada.id;

  let cuota: Cuota = { restantesHoy: null };
  let perfil = null;
  if (conPerfil) {
    try {
      const respuesta = await obtenerPerfil(externo.id);
      perfil = respuesta.datos;
      cuota = respuesta.cuota;
    } catch (err) {
      return errorExterno(err, "perfil");
    }
  }

  const { data: existente, error: errorExistente } = await supabase
    .from("jugadores")
    .select("*")
    .eq("temporada_id", temporadaId)
    .eq(`ids_externos->>${PROVEEDOR}`, String(externo.id))
    .maybeSingle();
  if (errorExistente) {
    console.error("[importarJugador] existente", errorExistente.message);
    return { ok: false, error: "No se pudo revisar el plantel. Probá de nuevo." };
  }

  const necesitaFoto = !existente?.foto_ruta;
  const fotoRuta = necesitaFoto
    ? await copiarImagen(
        supabase,
        BUCKETS.fotosJugadores,
        contexto.cuerpoTecnico.id,
        externo.fotoUrl,
      )
    : null;

  const nombre = perfil?.nombreCompleto ?? externo.nombre;
  // A los existentes solo se les completa lo que falta: lo editado a mano no se pisa
  const camposExistente: TablesUpdate<"jugadores"> = existente
    ? {
        posicion: externo.posicion,
        ...(existente.nombre === externo.nombre && perfil?.nombreCompleto ? { nombre } : {}),
        ...(existente.fecha_nac ? {} : { fecha_nac: perfil?.fechaNac ?? null }),
        ...(existente.altura_cm ? {} : { altura_cm: perfil?.alturaCm ?? null }),
        ...(existente.nacionalidad ? {} : { nacionalidad: perfil?.nacionalidad ?? null }),
        ...(fotoRuta ? { foto_ruta: fotoRuta } : {}),
      }
    : {};
  const camposNuevo: TablesInsert<"jugadores"> = {
    temporada_id: temporadaId,
    nombre,
    posicion: externo.posicion,
    fecha_nac: perfil?.fechaNac ?? null,
    altura_cm: perfil?.alturaCm ?? null,
    nacionalidad: perfil?.nacionalidad ?? null,
    foto_ruta: fotoRuta,
    ids_externos: conProveedor({}, externo.id),
  };

  const guardar = (numero: number | null) =>
    existente
      ? supabase
          .from("jugadores")
          .update({ ...camposExistente, numero })
          .eq("id", existente.id)
      : supabase.from("jugadores").insert({ ...camposNuevo, numero });

  let aviso: string | null = null;
  let { error } = await guardar(externo.numero);
  // Número de camiseta repetido: se guarda sin número y se avisa
  if (
    externo.numero !== null &&
    error?.code === "23505" &&
    error.message.includes("jugadores_numero_unico")
  ) {
    aviso = `El número ${externo.numero} ya lo tiene otro jugador: quedó sin número.`;
    ({ error } = await guardar(null));
  }
  if (error) {
    if (fotoRuta) await borrarImagenes(supabase, BUCKETS.fotosJugadores, [fotoRuta]);
    console.error("[importarJugador] guardar", error.code, error.message);
    return { ok: false, error: `No se pudo guardar a ${nombre}.` };
  }

  revalidatePath("/plantilla", "layout");
  return {
    ok: true,
    accion: existente ? "actualizado" : "creado",
    nombre: existente?.nombre ?? nombre,
    aviso,
    cuota,
  };
}

/** Guarda en la temporada cuál es el club en API-Football (para "Actualizar plantel"). */
export async function vincularClubExterno(equipoId: number): Promise<{ ok: boolean }> {
  const accion = await getAccion();
  const temporada = accion?.contexto.temporada;
  if (!accion || !temporada || !accion.contexto.esEntrenador) return { ok: false };
  const { supabase } = accion;

  const { error } = await supabase
    .from("temporadas")
    .update({ ids_externos: conProveedor(temporada.ids_externos, equipoId) })
    .eq("id", temporada.id);
  if (error) console.error("[vincularClubExterno]", error.message);
  return { ok: !error };
}

// ---------- Rivales ----------------------------------------------

export type ResultadoRival = ConCuota<{
  accion: "creado" | "ya_estaba";
  id: string;
  nombre: string;
}>;

/** Agrega un rival con nombre, escudo y estadio de API-Football. 1 consulta. */
export async function importarRivalExterno(equipoId: number): Promise<ResultadoRival | Fallo> {
  if (!Number.isInteger(equipoId) || equipoId <= 0) return { ok: false, error: "Equipo no válido" };
  const accion = await getAccion();
  if (!accion) return SESION_EXPIRADA;
  const { supabase, contexto } = accion;

  const { data: existente } = await supabase
    .from("equipos")
    .select("id, nombre")
    .eq(`ids_externos->>${PROVEEDOR}`, String(equipoId))
    .maybeSingle();
  if (existente) {
    return { ok: true, accion: "ya_estaba", ...existente, cuota: { restantesHoy: null } };
  }

  let equipo: EquipoExterno | null;
  let cuota: Cuota;
  try {
    ({ datos: equipo, cuota } = await obtenerEquipo(equipoId));
  } catch (err) {
    return errorExterno(err, "rival");
  }
  if (!equipo) return { ok: false, error: "API-Football no encontró ese equipo." };

  const escudoRuta = await copiarImagen(
    supabase,
    BUCKETS.escudos,
    contexto.cuerpoTecnico.id,
    equipo.escudoUrl,
  );
  const { data, error } = await supabase
    .from("equipos")
    .insert({
      nombre: equipo.nombre,
      escudo_ruta: escudoRuta,
      estadio: equipo.estadio,
      ids_externos: conProveedor({}, equipo.id),
    })
    .select("id, nombre")
    .single();
  if (error) {
    if (escudoRuta) await borrarImagenes(supabase, BUCKETS.escudos, [escudoRuta]);
    if (error.code === "23505") {
      return {
        ok: false,
        error: `Ya tenés un equipo llamado "${equipo.nombre}". Si es el mismo, no hace falta importarlo.`,
      };
    }
    console.error("[importarRival]", error.code, error.message);
    return { ok: false, error: "No se pudo agregar el equipo. Probá de nuevo." };
  }

  revalidatePath("/equipos", "layout");
  return { ok: true, accion: "creado", ...data, cuota };
}
