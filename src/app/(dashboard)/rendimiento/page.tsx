import type { Metadata } from "next";
import Link from "next/link";
import { requerirTemporada } from "@/lib/contexto";
import { getDisponibilidadDelDia } from "@/lib/data/disponibilidad";
import { getJugadores } from "@/lib/data/jugadores";
import { getRendimiento } from "@/lib/data/rendimiento";
import type { Stats } from "@/lib/post-partido";
import {
  alertas as calcularAlertas,
  filtrarPartidos,
  resumenJugadores,
  type JugadorInfo,
} from "@/lib/rendimiento";
import { cn } from "@/lib/utils/cn";
import { hoyISO } from "@/lib/utils/fecha";
import { PageHeader } from "@/components/ui/PageHeader";
import { FiltrosRendimiento } from "@/components/rendimiento/Filtros";
import { VistaEvolucion } from "@/components/rendimiento/VistaEvolucion";
import { VistaIndividual } from "@/components/rendimiento/VistaIndividual";
import { VistaMinutos } from "@/components/rendimiento/VistaMinutos";
import { VistaPartido } from "@/components/rendimiento/VistaPartido";

export const metadata: Metadata = { title: "Rendimiento" };

const VISTAS = [
  { id: "evolucion", label: "Evolución" },
  { id: "partido", label: "Partido" },
  { id: "minutos", label: "Minutos y plantel" },
  { id: "individual", label: "Individual" },
] as const;
type Vista = (typeof VISTAS)[number]["id"];

const fecha = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

interface Props {
  searchParams: {
    vista?: string;
    competicion?: string;
    desde?: string;
    hasta?: string;
    partido?: string;
    jugador?: string;
  };
}

/** Rendimiento del equipo y de los jugadores, con los post partidos de la temporada. */
export default async function RendimientoPage({ searchParams }: Props) {
  const { temporada } = await requerirTemporada();
  const [datos, jugadores, disponibilidad] = await Promise.all([
    getRendimiento(temporada.id),
    getJugadores(temporada.id),
    getDisponibilidadDelDia(temporada.id, hoyISO()),
  ]);
  const vista: Vista = VISTAS.some((v) => v.id === searchParams.vista)
    ? (searchParams.vista as Vista)
    : "evolucion";
  const filtros = {
    competicion: searchParams.competicion || null,
    desde: fecha(searchParams.desde),
    hasta: fecha(searchParams.hasta),
  };
  const competiciones = [
    ...new Set(datos.partidos.map((p) => p.competicion).filter((c): c is string => Boolean(c))),
  ].sort();
  const partidos = filtrarPartidos(datos.partidos, filtros);
  const ids = new Set(partidos.map((p) => p.id));
  const jps = datos.jugadorPartidos.filter((j) => ids.has(j.partidoId));

  const info: JugadorInfo[] = jugadores.map((j) => ({
    id: j.id,
    nombre: j.nombre,
    numero: j.numero,
    posicion: j.posicion,
    fecha_nac: j.fecha_nac,
    nacionalidad: j.nacionalidad,
    formado_en_club: j.formado_en_club,
    fecha_debut: j.fecha_debut,
    estadisticas_externas: j.estadisticas_externas as Stats,
    altura_cm: j.altura_cm,
  }));
  const resumen = resumenJugadores(info, jps, datos.valoraciones, ids);
  const alertas = calcularAlertas(partidos, jps, resumen);

  const enlace = (v: Vista) => {
    const p = new URLSearchParams();
    p.set("vista", v);
    for (const [k, valor] of Object.entries(filtros)) if (valor) p.set(k, valor);
    return `/rendimiento?${p.toString()}`;
  };
  const sinPartidos = partidos.length === 0;
  const partidoElegido =
    partidos.find((p) => p.id === searchParams.partido) ?? partidos[partidos.length - 1];
  const jugadorElegido =
    resumen.find((r) => r.jugador.id === searchParams.jugador) ??
    [...resumen].sort((a, b) => b.minutos - a.minutos)[0];

  return (
    <>
      <PageHeader
        titulo="Rendimiento"
        descripcion={`Equipo y jugadores con los post partidos de la temporada ${temporada.etiqueta} · ${partidos.length} partido${partidos.length === 1 ? "" : "s"} con datos`}
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <FiltrosRendimiento
          competiciones={competiciones}
          competicion={filtros.competicion}
          desde={filtros.desde}
          hasta={filtros.hasta}
        />
      </div>

      {alertas.length > 0 && (
        <details className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4" open>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Alertas ({alertas.length})
          </summary>
          <ul className="mt-2 grid gap-1.5 text-sm md:grid-cols-2">
            {alertas.map((a) => (
              <li key={a.texto} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded px-1.5 text-[10px] font-bold uppercase",
                    a.nivel === "alerta"
                      ? "bg-red-600 text-white"
                      : a.nivel === "aviso"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-700",
                  )}
                >
                  {a.nivel}
                </span>
                {a.jugadorId ? (
                  <Link
                    href={`/rendimiento?vista=individual&jugador=${a.jugadorId}`}
                    className="text-slate-800 hover:underline"
                  >
                    {a.texto}
                  </Link>
                ) : (
                  <span className="text-slate-800">{a.texto}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <nav
        aria-label="Vistas de rendimiento"
        className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
      >
        {VISTAS.map((v) => (
          <Link
            key={v.id}
            href={enlace(v.id)}
            aria-current={vista === v.id ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              vista === v.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {sinPartidos && (vista === "evolucion" || vista === "partido") ? (
        <SinDatos filtrado={datos.partidos.length > 0} />
      ) : vista === "evolucion" ? (
        <VistaEvolucion partidos={partidos} />
      ) : vista === "partido" && partidoElegido ? (
        <VistaPartido
          partidos={partidos}
          elegido={partidoElegido}
          jugadorPartidos={jps}
          resumen={resumen}
          club={temporada.club}
        />
      ) : vista === "minutos" ? (
        <>
          {sinPartidos && <SinDatos filtrado={datos.partidos.length > 0} compacto />}
          <VistaMinutos
            resumen={resumen}
            partidosConDatos={partidos.length}
            disponibilidad={disponibilidad}
            inicioTemporada={temporada.fecha_inicio}
          />
        </>
      ) : jugadorElegido ? (
        <>
          {sinPartidos && <SinDatos filtrado={datos.partidos.length > 0} compacto />}
          <VistaIndividual
            resumen={resumen}
            elegido={jugadorElegido}
            partidos={partidos}
            jugadorPartidos={jps}
            valoraciones={datos.valoraciones}
            alertas={alertas}
          />
        </>
      ) : (
        <p className="text-sm text-slate-500">El plantel está vacío.</p>
      )}
    </>
  );
}

function SinDatos({ filtrado, compacto = false }: { filtrado: boolean; compacto?: boolean }) {
  if (filtrado)
    return (
      <p className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        Ningún partido con datos en ese filtro.
      </p>
    );
  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-dashed border-slate-200 bg-white text-sm text-slate-600",
        compacto ? "mb-5 p-4" : "p-8 text-center",
      )}
    >
      <p className={cn("font-semibold text-slate-800", !compacto && "text-base")}>
        Todavía no hay post partidos con datos
      </p>
      <p className="mt-1">
        Se cargan desde <b>Partidos → paso 9, Post partido → «Traer de Sofascore»</b> después de
        cada partido. Con el primero aparece la vista del partido; con varios, la evolución, los
        minutos y los perfiles cada 90′.
      </p>
    </section>
  );
}
