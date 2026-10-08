import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { TemporadaForm } from "@/components/cuerpo-tecnico/TemporadaForm";

export const metadata: Metadata = { title: "Editar temporada" };

export default async function EditarTemporadaPage({ params }: { params: { id: string } }) {
  const { cuerpoTecnico, esEntrenador, temporadas } = await requerirContexto();
  if (!esEntrenador) redirect("/cuerpo-tecnico");
  const temporada = temporadas.find((t) => t.id === params.id);
  if (!temporada) notFound();

  return (
    <>
      <BackLink href="/cuerpo-tecnico">Cuerpo técnico</BackLink>
      <PageHeader
        titulo="Editar temporada"
        descripcion={`${temporada.club} · ${temporada.etiqueta}`}
      />
      <TemporadaForm cuerpoTecnicoId={cuerpoTecnico.id} temporada={temporada} />
    </>
  );
}
