import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { TemporadaForm } from "@/components/cuerpo-tecnico/TemporadaForm";

export const metadata: Metadata = { title: "Nueva temporada" };

export default async function NuevaTemporadaPage() {
  const { cuerpoTecnico, esEntrenador } = await requerirContexto();
  if (!esEntrenador) redirect("/cuerpo-tecnico");

  return (
    <>
      <BackLink href="/cuerpo-tecnico">Cuerpo técnico</BackLink>
      <PageHeader
        titulo="Nueva temporada"
        descripcion="Un club en un año. El plantel y los partidos se cargan dentro de cada temporada."
      />
      <TemporadaForm cuerpoTecnicoId={cuerpoTecnico.id} />
    </>
  );
}
