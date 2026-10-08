import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { getPartido } from "@/lib/data/partidos";
import { getEquipos } from "@/lib/data/equipos";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { PartidoForm } from "@/components/partidos/PartidoForm";

export const metadata: Metadata = { title: "Editar partido" };

export default async function EditarPartidoPage({ params }: { params: { id: string } }) {
  await requerirContexto();
  const [partido, equipos] = await Promise.all([getPartido(params.id), getEquipos()]);
  if (!partido) notFound();

  return (
    <>
      <BackLink href={`/partidos/${partido.id}`}>Volver al partido</BackLink>
      <PageHeader titulo="Editar partido" descripcion={partido.rival?.nombre ?? undefined} />
      <PartidoForm rivales={equipos} partido={partido} />
    </>
  );
}
