import { etiquetaMD, SEMANA_TIPO, type PartidoReferencia } from "@/lib/calendario";
import { noEncajaConElDia } from "@/lib/sesiones";
import { m2PorJugador } from "@/lib/tareas";
import { lunesDe } from "@/lib/semana";
import { sumarDias } from "@/lib/utils/fecha";
import type { MomentoJuego, PrincipioJuego } from "@/types/modelo-juego";
import type { EstadoAsistencia } from "@/types/sesion";
import type { EspacioTarea, OrientacionFisica, TipoTarea } from "@/types/tarea";

/** Una tarea hecha (o planificada) en una sesión, con lo necesario para el reporte. */
export interface TareaReporte {
  tareaId: string;
  nombre: string;
  tipo: TipoTarea;
  orientacion: OrientacionFisica | null;
  objetivos: string[];
  segundos: number;
  espacio: EspacioTarea | null;
  largo_m: number | null;
  ancho_m: number | null;
  jugadores: number | null;
}

export interface SesionReporte {
  actividadId: string;
  fecha: string;
  cerrada: boolean;
  minutosReales: number | null;
  tareas: TareaReporte[];
  asistencia: { jugadorId: string; estado: EstadoAsistencia }[];
}

export interface Reporte {
  sesiones: number;
  sesionesCerradas: number;
  segundosPlanificados: number;
  minutosReales: number;
  tareasDistintas: number;
  porMomento: { momento: MomentoJuego; segundos: number }[];
  sinObjetivo: number;
  principios: {
    id: string;
    nombre: string;
    momento: MomentoJuego;
    segundos: number;
    subs: string[];
  }[];
  sinTrabajar: { id: string; nombre: string; momento: MomentoJuego }[];
  porTipo: { tipo: TipoTarea; segundos: number; tareas: number }[];
  porMD: {
    md: string;
    offset: number;
    sesiones: number;
    segundos: number;
    m2PorJugador: number | null;
    /** % del tiempo con orientación física acorde a la semana tipo (null si no aplica) */
    encaje: number | null;
  }[];
  /** Encaje con la semana tipo de todo el período */
  encajeTotal: number | null;
  masUsadas: {
    tareaId: string;
    nombre: string;
    tipo: TipoTarea;
    veces: number;
    segundos: number;
  }[];
  /** Minutos por día (microciclo) o por semana (mes) */
  volumen: { clave: string; segundos: number }[];
  asistencia: { jugadorId: string; conteo: Record<EstadoAsistencia, number>; total: number }[];
}

function sumar<K>(mapa: Map<K, number>, clave: K, valor: number) {
  mapa.set(clave, (mapa.get(clave) ?? 0) + valor);
}

/**
 * Arma el reporte de un período. `sesiones` trae también las 4 semanas previas a
 * `hasta` para detectar los principios que no se trabajaron.
 */
export function calcularReporte({
  sesiones: todas,
  desde,
  hasta,
  principios,
  partidos,
  agrupar,
}: {
  sesiones: SesionReporte[];
  desde: string;
  hasta: string;
  principios: PrincipioJuego[];
  partidos: PartidoReferencia[];
  agrupar: "dia" | "semana";
}): Reporte {
  const sesiones = todas.filter((s) => s.fecha >= desde && s.fecha <= hasta);
  const porId = new Map(principios.map((p) => [p.id, p]));
  const raiz = (id: string) => {
    const p = porId.get(id);
    return p?.padre_id ? porId.get(p.padre_id) : p;
  };

  const porMomento = new Map<MomentoJuego, number>();
  const porPrincipio = new Map<string, number>();
  const subsDe = new Map<string, Map<string, number>>();
  const porTipo = new Map<TipoTarea, { segundos: number; tareas: number }>();
  const usadas = new Map<
    string,
    { nombre: string; tipo: TipoTarea; veces: number; segundos: number }
  >();
  const volumen = new Map<string, number>();
  const md = new Map<
    string,
    {
      offset: number;
      sesiones: number;
      segundos: number;
      m2: number;
      m2Seg: number;
      enc: number;
      encSeg: number;
    }
  >();
  let sinObjetivo = 0;
  let segundosPlanificados = 0;
  let encajeSi = 0;
  let encajeBase = 0;

  for (const s of sesiones) {
    const etiqueta = etiquetaMD(s.fecha, partidos);
    const dia = etiqueta ? SEMANA_TIPO[etiqueta.texto] : undefined;
    const filaMD = etiqueta
      ? (md.get(etiqueta.texto) ??
        md
          .set(etiqueta.texto, {
            offset: etiqueta.offset,
            sesiones: 0,
            segundos: 0,
            m2: 0,
            m2Seg: 0,
            enc: 0,
            encSeg: 0,
          })
          .get(etiqueta.texto)!)
      : null;
    if (filaMD) filaMD.sesiones += 1;
    sumar(volumen, agrupar === "dia" ? s.fecha : lunesDe(s.fecha), 0);

    for (const t of s.tareas) {
      const seg = t.segundos;
      segundosPlanificados += seg;
      sumar(volumen, agrupar === "dia" ? s.fecha : lunesDe(s.fecha), seg);

      const tipo = porTipo.get(t.tipo) ?? { segundos: 0, tareas: 0 };
      porTipo.set(t.tipo, { segundos: tipo.segundos + seg, tareas: tipo.tareas + 1 });
      const uso = usadas.get(t.tareaId) ?? {
        nombre: t.nombre,
        tipo: t.tipo,
        veces: 0,
        segundos: 0,
      };
      usadas.set(t.tareaId, { ...uso, veces: uso.veces + 1, segundos: uso.segundos + seg });

      // Momentos: el tiempo se reparte entre los momentos de sus objetivos
      const momentos = [
        ...new Set(t.objetivos.map((id) => porId.get(id)?.momento).filter(Boolean)),
      ] as MomentoJuego[];
      if (momentos.length === 0) sinObjetivo += seg;
      for (const m of momentos) sumar(porMomento, m, seg / momentos.length);

      // Principios: el tiempo se reparte entre sus objetivos
      const objetivos = t.objetivos.filter((id) => porId.has(id));
      for (const id of objetivos) {
        const r = raiz(id);
        if (!r) continue;
        sumar(porPrincipio, r.id, seg / objetivos.length);
        if (r.id !== id) {
          const subs = subsDe.get(r.id) ?? new Map<string, number>();
          sumar(subs, porId.get(id)!.nombre, seg / objetivos.length);
          subsDe.set(r.id, subs);
        }
      }

      if (filaMD) {
        filaMD.segundos += seg;
        const m2 = m2PorJugador(t);
        if (m2 !== null) {
          filaMD.m2 += m2 * seg;
          filaMD.m2Seg += seg;
        }
        if (dia && t.orientacion && !noEncajaNeutral(t)) {
          const encaja = !noEncajaConElDia(
            { tipo: t.tipo, orientacion_fisica: t.orientacion },
            dia.orientacion,
          );
          filaMD.encSeg += seg;
          if (encaja) filaMD.enc += seg;
          encajeBase += seg;
          if (encaja) encajeSi += seg;
        }
      }
    }
  }

  // Principios sin minutos en las últimas 4 semanas del período
  const desde4 = sumarDias(hasta, -27);
  const trabajados = new Set<string>();
  for (const s of todas) {
    if (s.fecha < desde4 || s.fecha > hasta) continue;
    for (const t of s.tareas) {
      for (const id of t.objetivos) {
        const r = raiz(id);
        if (r) trabajados.add(r.id);
      }
    }
  }

  const cerradas = sesiones.filter((s) => s.cerrada);
  const asistencia = new Map<string, Record<EstadoAsistencia, number>>();
  for (const s of cerradas) {
    for (const a of s.asistencia) {
      const c = asistencia.get(a.jugadorId) ?? {
        completo: 0,
        parcial: 0,
        diferenciado: 0,
        ausente: 0,
      };
      c[a.estado] += 1;
      asistencia.set(a.jugadorId, c);
    }
  }

  const porSegundos = <T extends { segundos: number }>(a: T, b: T) => b.segundos - a.segundos;

  return {
    sesiones: sesiones.length,
    sesionesCerradas: cerradas.length,
    segundosPlanificados,
    minutosReales: cerradas.reduce((t, s) => t + (s.minutosReales ?? 0), 0),
    tareasDistintas: usadas.size,
    porMomento: [...porMomento]
      .map(([momento, segundos]) => ({ momento, segundos }))
      .sort(porSegundos),
    sinObjetivo,
    principios: [...porPrincipio]
      .map(([id, segundos]) => {
        const p = porId.get(id)!;
        const subs = [...(subsDe.get(id) ?? new Map<string, number>())]
          .sort((a, b) => b[1] - a[1])
          .map(([n]) => n);
        return { id, nombre: p.nombre, momento: p.momento, segundos, subs };
      })
      .sort(porSegundos),
    sinTrabajar: principios
      .filter((p) => p.padre_id === null && !p.oculto && !trabajados.has(p.id))
      .sort((a, b) => a.orden - b.orden)
      .map((p) => ({ id: p.id, nombre: p.nombre, momento: p.momento })),
    porTipo: [...porTipo].map(([tipo, v]) => ({ tipo, ...v })).sort(porSegundos),
    porMD: [...md]
      .map(([texto, v]) => ({
        md: texto,
        offset: v.offset,
        sesiones: v.sesiones,
        segundos: v.segundos,
        m2PorJugador: v.m2Seg > 0 ? Math.round(v.m2 / v.m2Seg) : null,
        encaje: v.encSeg > 0 ? Math.round((v.enc / v.encSeg) * 100) : null,
      }))
      // MD+1, MD+2… y después MD-5, MD-4… MD-1
      .sort((a, b) => (a.offset > 0 === b.offset > 0 ? a.offset - b.offset : b.offset - a.offset)),
    encajeTotal: encajeBase > 0 ? Math.round((encajeSi / encajeBase) * 100) : null,
    masUsadas: [...usadas]
      .map(([tareaId, v]) => ({ tareaId, ...v }))
      .sort((a, b) => b.veces - a.veces || b.segundos - a.segundos)
      .slice(0, 10),
    volumen: [...volumen]
      .map(([clave, segundos]) => ({ clave, segundos }))
      .sort((a, b) => a.clave.localeCompare(b.clave)),
    asistencia: [...asistencia].map(([jugadorId, conteo]) => ({
      jugadorId,
      conteo,
      total: Object.values(conteo).reduce((t, n) => t + n, 0),
    })),
  };
}

/** Las tareas neutras (entrada en calor, pre sesión, arqueros) no cuentan para el encaje. */
function noEncajaNeutral(t: TareaReporte): boolean {
  return t.tipo === "entrada_en_calor" || t.tipo === "pre_sesion" || t.tipo === "arqueros";
}
