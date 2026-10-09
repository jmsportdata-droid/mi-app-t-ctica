import type { Metadata } from "next";
import Link from "next/link";
import { requerirTemporada } from "@/lib/contexto";
import { getActividades, getEnlaceJugadores, getReferenciasPartidos } from "@/lib/data/calendario";
import { getResumenSesiones } from "@/lib/data/sesiones";
import { diaMes, lunesDe } from "@/lib/semana";
import { hoyISO, sumarDias } from "@/lib/utils/fecha";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarraCompartir } from "@/components/calendario/BarraCompartir";
import { VistaCiclo } from "@/components/calendario/VistaCiclo";

export const metadata: Metadata = { title: "Semana" };

const CLASE_NAV =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

/** La semana de lunes a domingo, en columnas, con lo que se comparte al plantel. */
export default async function SemanaPage({ searchParams }: { searchParams: { desde?: string } }) {
  const { temporada } = await requerirTemporada();
  const hoy = hoyISO();
  const pedido =
    searchParams.desde && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.desde) ? searchParams.desde : hoy;
  const desde = lunesDe(pedido);
  const hasta = sumarDias(desde, 6);

  const [actividades, partidos, token] = await Promise.all([
    getActividades(temporada.id, desde, hasta),
    getReferenciasPartidos(temporada.id),
    getEnlaceJugadores(temporada.id),
  ]);
  const resumenes = await getResumenSesiones(
    actividades.filter((a) => a.tipo === "entrenamiento").map((a) => a.id),
  );
  const esActual = desde <= hoy && hoy <= hasta;

  return (
    <>
      <PageHeader
        titulo={`Semana ${diaMes(desde)} al ${diaMes(hasta)}`}
        descripcion="De lunes a domingo, como se manda al grupo. Las sesiones se arman desde el microciclo."
        acciones={
          <>
            <Link
              href={`?desde=${sumarDias(desde, -7)}`}
              className={CLASE_NAV}
              aria-label="Semana anterior"
            >
              ←
            </Link>
            <Link
              href="/calendario/semana"
              className={`${CLASE_NAV} ${esActual ? "pointer-events-none opacity-50" : ""}`}
            >
              Esta semana
            </Link>
            <Link
              href={`?desde=${sumarDias(desde, 7)}`}
              className={CLASE_NAV}
              aria-label="Semana siguiente"
            >
              →
            </Link>
            <Link href={`/calendario?mes=${desde.slice(0, 7)}`} className={CLASE_NAV}>
              Mes
            </Link>
            <Link href={`/microciclo?fecha=${desde}`} className={CLASE_NAV}>
              Microciclo
            </Link>
          </>
        }
      />

      <BarraCompartir desde={desde} manana={sumarDias(hoy, 1)} token={token} />

      <VistaCiclo
        desde={desde}
        hasta={hasta}
        hoy={hoy}
        actividades={actividades}
        partidos={partidos}
        resumenes={resumenes}
        // La numeración de sesiones es por microciclo, no por semana
        numeroSesion={new Map()}
      />
    </>
  );
}
