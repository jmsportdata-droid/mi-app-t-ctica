import type { Metadata } from "next";
import Link from "next/link";
import { getEquipos } from "@/lib/data/equipos";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartidoForm } from "@/components/partidos/PartidoForm";

export const metadata: Metadata = { title: "Nuevo partido" };

export default async function NuevoPartidoPage() {
  const equipos = await getEquipos();

  return (
    <>
      <BackLink href="/partidos">Partidos</BackLink>
      <PageHeader titulo="Nuevo partido" descripcion="Programa un partido contra un rival" />
      {equipos.length === 0 ? (
        <EmptyState
          titulo="Primero necesitas un rival"
          descripcion="Para crear un partido, añade antes el equipo rival en la sección Equipos."
          accion={
            <Link
              href="/equipos/nuevo"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Nuevo equipo
            </Link>
          }
        />
      ) : (
        <PartidoForm rivales={equipos} />
      )}
    </>
  );
}
