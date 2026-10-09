import type { Metadata } from "next";
import Link from "next/link";
import { cicloDe, DESPUES_DEL_ULTIMO, numeroMicrociclo, numerarSesiones } from "@/lib/calendario";
import { requerirTemporada } from "@/lib/contexto";
import { getActividades, getReferenciasPartidos } from "@/lib/data/calendario";
import { getResumenSesiones } from "@/lib/data/sesiones";
import { formatearDia, hoyISO, sumarDias } from "@/lib/utils/fecha";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopiarCicloButton } from "@/components/calendario/CopiarCicloButton";
import { VistaCiclo } from "@/components/calendario/VistaCiclo";

export const metadata: Metadata = { title: "Microciclo" };

interface Props {
  /** partido: id del partido que cierra el ciclo; fecha: muestra el ciclo que la contiene */
  searchParams: { partido?: string; fecha?: string };
}

const CLASE_NAV =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

export default async function CalendarioPage({ searchParams }: Props) {
  const { temporada } = await requerirTemporada();
  const hoy = hoyISO();
  const fecha =
    searchParams.fecha && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha) ? searchParams.fecha : hoy;

  const partidos = await getReferenciasPartidos(temporada.id);
  const ciclo = cicloDe(partidos, fecha, searchParams.partido ?? null);
  const actividades = await getActividades(temporada.id, ciclo.desde, ciclo.hasta);
  const resumenes = await getResumenSesiones(
    actividades.filter((a) => a.tipo === "entrenamiento").map((a) => a.id),
  );
  const numeroSesion = numerarSesiones(actividades);
  const numero = numeroMicrociclo(partidos, ciclo);

  const actividadPartido = ciclo.partido
    ? actividades.find((a) => a.partido_id === ciclo.partido?.id)
    : undefined;
  const titulo =
    numero === null
      ? "Microciclo"
      : actividadPartido
        ? `Microciclo ${numero} · ${actividadPartido.titulo}`
        : `Microciclo ${numero} · después del último partido`;
  const rango = `Del ${formatearDia(ciclo.desde)} al ${formatearDia(ciclo.hasta)}`;
  const esActual = ciclo.desde <= hoy && hoy <= ciclo.hasta;
  // Sin partidos cargados se navega de a semanas
  const porSemanas = partidos.length === 0;
  const hrefAnterior = porSemanas
    ? `?fecha=${sumarDias(ciclo.desde, -7)}`
    : ciclo.anterior && `?partido=${ciclo.anterior}`;
  const hrefSiguiente = porSemanas
    ? `?fecha=${sumarDias(ciclo.desde, 7)}`
    : ciclo.siguiente && `?partido=${ciclo.siguiente}`;

  return (
    <>
      <PageHeader
        titulo={titulo}
        descripcion={
          partidos.length === 0
            ? `${rango}. Cargá los partidos para ver el calendario de partido a partido.`
            : rango
        }
        acciones={
          <>
            <nav aria-label="Cambiar de ciclo" className="flex items-center gap-2">
              {hrefAnterior ? (
                <Link href={hrefAnterior} className={CLASE_NAV} aria-label="Anterior">
                  ←
                </Link>
              ) : (
                <span className={`${CLASE_NAV} pointer-events-none opacity-40`} aria-hidden>
                  ←
                </span>
              )}
              <Link
                href="/microciclo"
                className={`${CLASE_NAV} ${esActual ? "pointer-events-none opacity-50" : ""}`}
              >
                Hoy
              </Link>
              {hrefSiguiente ? (
                <Link href={hrefSiguiente} className={CLASE_NAV} aria-label="Siguiente">
                  →
                </Link>
              ) : (
                <span className={`${CLASE_NAV} pointer-events-none opacity-40`} aria-hidden>
                  →
                </span>
              )}
            </nav>
            <Link href={`/calendario?mes=${ciclo.desde.slice(0, 7)}`} className={CLASE_NAV}>
              Mes
            </Link>
            <Link href={`/calendario/semana?desde=${ciclo.hasta}`} className={CLASE_NAV}>
              Compartir semana
            </Link>
          </>
        }
      />

      <div className="mb-4 flex justify-end">
        <CopiarCicloButton
          partidoId={ciclo.partido?.id ?? (ciclo.anterior ? DESPUES_DEL_ULTIMO : null)}
          fecha={ciclo.desde}
        />
      </div>

      <VistaCiclo
        desde={ciclo.desde}
        hasta={ciclo.hasta}
        hoy={hoy}
        actividades={actividades}
        partidos={partidos}
        resumenes={resumenes}
        numeroSesion={numeroSesion}
      />
    </>
  );
}
