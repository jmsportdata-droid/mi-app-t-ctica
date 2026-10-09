import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { getActividad } from "@/lib/data/calendario";
import { formatearDia } from "@/lib/utils/fecha";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccionesActividad } from "@/components/calendario/AccionesActividad";
import { ActividadForm } from "@/components/calendario/ActividadForm";
import { ActividadPartidoForm } from "@/components/calendario/ActividadPartidoForm";

export const metadata: Metadata = { title: "Editar actividad" };

export default async function EditarActividadPage({ params }: { params: { id: string } }) {
  await requerirContexto();
  const actividad = await getActividad(params.id);
  if (!actividad) notFound();

  return (
    <>
      <BackLink href={`/microciclo?fecha=${actividad.fecha}`}>Microciclo</BackLink>
      <PageHeader titulo={actividad.titulo} descripcion={formatearDia(actividad.fecha)} />
      {actividad.partido_id ? (
        <ActividadPartidoForm actividad={actividad} />
      ) : (
        <>
          <ActividadForm actividad={actividad} />
          <AccionesActividad id={actividad.id} titulo={actividad.titulo} fecha={actividad.fecha} />
        </>
      )}
    </>
  );
}
