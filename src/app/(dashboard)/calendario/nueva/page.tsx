import type { Metadata } from "next";
import { requerirTemporada } from "@/lib/contexto";
import { formatearDia } from "@/lib/utils/fecha";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActividadForm } from "@/components/calendario/ActividadForm";

export const metadata: Metadata = { title: "Nueva actividad" };

export default async function NuevaActividadPage({
  searchParams,
}: {
  searchParams: { fecha?: string };
}) {
  await requerirTemporada();
  const fecha =
    searchParams.fecha && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha)
      ? searchParams.fecha
      : undefined;

  return (
    <>
      <BackLink href={fecha ? `/calendario?fecha=${fecha}` : "/calendario"}>Calendario</BackLink>
      <PageHeader
        titulo="Nueva actividad"
        descripcion={fecha ? formatearDia(fecha) : "Los partidos se cargan desde Partidos."}
      />
      <ActividadForm fecha={fecha} />
    </>
  );
}
