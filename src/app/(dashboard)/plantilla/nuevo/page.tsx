import type { Metadata } from "next";
import { requerirTemporada } from "@/lib/contexto";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { JugadorForm } from "@/components/jugadores/JugadorForm";

export const metadata: Metadata = { title: "Nuevo jugador" };

export default async function NuevoJugadorPage() {
  const { cuerpoTecnico, temporada } = await requerirTemporada();

  return (
    <>
      <BackLink href="/plantilla">Plantel</BackLink>
      <PageHeader
        titulo="Nuevo jugador"
        descripcion={`Plantel de ${temporada.club} ${temporada.etiqueta}`}
      />
      <JugadorForm cuerpoTecnicoId={cuerpoTecnico.id} />
    </>
  );
}
