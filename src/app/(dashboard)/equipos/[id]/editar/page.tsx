import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEquipo } from "@/lib/data/equipos";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { EquipoForm } from "@/components/equipos/EquipoForm";

export const metadata: Metadata = { title: "Editar equipo" };

export default async function EditarEquipoPage({ params }: { params: { id: string } }) {
  const equipo = await getEquipo(params.id);
  if (!equipo) notFound();

  return (
    <>
      <BackLink href="/equipos">Equipos</BackLink>
      <PageHeader titulo="Editar equipo" descripcion={equipo.nombre} />
      <EquipoForm equipo={equipo} />
    </>
  );
}
