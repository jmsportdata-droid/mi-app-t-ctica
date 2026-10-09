import "server-only";
import {
  cicloDe,
  etiquetaMD,
  numeroMicrociclo,
  numerarSesiones,
  SEMANA_TIPO,
  type DiaSemanaTipo,
} from "@/lib/calendario";
import { getActividades, getReferenciasPartidos } from "@/lib/data/calendario";
import { createClient } from "@/lib/supabase/server";
import type { Actividad } from "@/types/calendario";
import type { Tarea } from "@/types/tarea";
import type {
  PlantillaConTareas,
  ResumenSesion,
  SesionCompleta,
  SesionTarea,
} from "@/types/sesion";

/** Cantidad de tareas, tiempo planificado y si está cerrada, por actividad. */
export async function getResumenSesiones(
  actividadIds: string[],
): Promise<Map<string, ResumenSesion>> {
  const resumen = new Map<string, ResumenSesion>();
  if (actividadIds.length === 0) return resumen;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sesiones")
    .select("actividad_id, cerrada, sesion_tareas(tiempo_total_seg)")
    .in("actividad_id", actividadIds);
  if (error) {
    console.error("[getResumenSesiones]", error.message);
    throw new Error("No se pudieron cargar las sesiones");
  }
  for (const s of data ?? []) {
    resumen.set(s.actividad_id, {
      tareas: s.sesion_tareas.length,
      segundos: s.sesion_tareas.reduce((t, x) => t + (x.tiempo_total_seg ?? 0), 0),
      cerrada: s.cerrada,
    });
  }
  return resumen;
}

type FilaTarea = SesionTarea & {
  tareas: Tarea & {
    tareas_objetivos: { principio_id: string }[];
    tareas_contenidos: { contenido_id: string }[];
  };
};

/** Sesión de un entrenamiento con sus tareas (en orden) y la asistencia. */
export async function getSesionCompleta(actividadId: string): Promise<SesionCompleta> {
  const supabase = createClient();
  const [sesion, tareas, asistencia] = await Promise.all([
    supabase.from("sesiones").select("*").eq("actividad_id", actividadId).maybeSingle(),
    supabase
      .from("sesion_tareas")
      .select("*, tareas(*, tareas_objetivos(principio_id), tareas_contenidos(contenido_id))")
      .eq("actividad_id", actividadId)
      .order("orden", { ascending: true })
      .order("creado_en", { ascending: true }),
    supabase.from("asistencia_sesion").select("*").eq("actividad_id", actividadId),
  ]);
  const error = sesion.error ?? tareas.error ?? asistencia.error;
  if (error) {
    console.error("[getSesionCompleta]", error.message);
    throw new Error("No se pudo cargar la sesión");
  }
  return {
    sesion: sesion.data,
    tareas: ((tareas.data ?? []) as FilaTarea[]).map(({ tareas: t, ...fila }) => {
      const { tareas_objetivos, tareas_contenidos, ...tarea } = t;
      return {
        ...fila,
        tarea: {
          ...tarea,
          objetivos: tareas_objetivos.map((o) => o.principio_id),
          contenidos: tareas_contenidos.map((c) => c.contenido_id),
        },
      };
    }),
    asistencia: asistencia.data ?? [],
  };
}

export async function getPlantillas(cuerpoTecnicoId: string): Promise<PlantillaConTareas[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("plantillas_sesion")
    .select("*, plantilla_tareas(count)")
    .eq("cuerpo_tecnico_id", cuerpoTecnicoId)
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[getPlantillas]", error.message);
    throw new Error("No se pudieron cargar las plantillas");
  }
  return (data ?? []).map(({ plantilla_tareas, ...p }) => ({
    ...p,
    tareas: plantilla_tareas[0]?.count ?? 0,
  }));
}

export interface UbicacionSesion {
  /** "MD-3", "MD+1"… o null si no hay partidos */
  md: string | null;
  diaTipo: DiaSemanaTipo | undefined;
  numeroMicrociclo: number | null;
  numeroSesion: number | null;
}

/** Dónde cae el entrenamiento: su MD, la semana tipo de ese día y su numeración. */
export async function getUbicacionSesion(
  temporadaId: string,
  actividad: Pick<Actividad, "id" | "fecha">,
): Promise<UbicacionSesion> {
  const partidos = await getReferenciasPartidos(temporadaId);
  const ciclo = cicloDe(partidos, actividad.fecha);
  const actividades = await getActividades(temporadaId, ciclo.desde, ciclo.hasta);
  const md = etiquetaMD(actividad.fecha, partidos)?.texto ?? null;
  return {
    md,
    diaTipo: md ? SEMANA_TIPO[md] : undefined,
    numeroMicrociclo: numeroMicrociclo(partidos, ciclo),
    numeroSesion: numerarSesiones(actividades).get(actividad.id) ?? null,
  };
}
