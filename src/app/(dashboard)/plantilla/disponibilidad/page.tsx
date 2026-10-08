import type { Metadata } from "next";
import Link from "next/link";
import { requerirTemporada } from "@/lib/contexto";
import { getDisponibilidadDelDia } from "@/lib/data/disponibilidad";
import { getJugadores } from "@/lib/data/jugadores";
import { formatearDia, hoyISO, sumarDias } from "@/lib/utils/fecha";
import { cn } from "@/lib/utils/cn";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CargaDisponibilidad } from "@/components/disponibilidad/CargaDisponibilidad";

export const metadata: Metadata = { title: "Disponibilidad" };

interface Props {
  searchParams: { fecha?: string };
}

const CLASE_NAV =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

export default async function DisponibilidadPage({ searchParams }: Props) {
  const { temporada } = await requerirTemporada();
  const hoy = hoyISO();
  const fecha =
    searchParams.fecha && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha) ? searchParams.fecha : hoy;

  const [jugadores, estados] = await Promise.all([
    getJugadores(temporada.id),
    getDisponibilidadDelDia(temporada.id, fecha),
  ]);

  return (
    <>
      <BackLink href="/plantilla">Plantel</BackLink>
      <PageHeader
        titulo={fecha === hoy ? "Disponibilidad de hoy" : "Disponibilidad"}
        descripcion={`${formatearDia(fecha)} · Un toque por jugador. El estado sigue vigente los días siguientes hasta que lo cambies.`}
        acciones={
          <nav aria-label="Cambiar de día" className="flex items-center gap-2">
            <Link
              href={`?fecha=${sumarDias(fecha, -1)}`}
              className={CLASE_NAV}
              aria-label="Día anterior"
            >
              ←
            </Link>
            <Link
              href="?"
              className={cn(CLASE_NAV, fecha === hoy && "pointer-events-none opacity-50")}
              aria-disabled={fecha === hoy}
            >
              Hoy
            </Link>
            <Link
              href={`?fecha=${sumarDias(fecha, 1)}`}
              className={CLASE_NAV}
              aria-label="Día siguiente"
            >
              →
            </Link>
          </nav>
        }
      />

      {jugadores.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay jugadores"
          descripcion="Importá el plantel o agregá jugadores para cargar su disponibilidad."
        />
      ) : (
        <CargaDisponibilidad
          key={fecha}
          fecha={fecha}
          jugadores={jugadores}
          estadosIniciales={estados}
        />
      )}
    </>
  );
}
