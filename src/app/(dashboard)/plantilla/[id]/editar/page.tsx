import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJugador } from "@/lib/data/jugadores";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { JugadorForm } from "@/components/jugadores/JugadorForm";

export const metadata: Metadata = { title: "Editar jugador" };

export default async function EditarJugadorPage({ params }: { params: { id: string } }) {
  const jugador = await getJugador(params.id);
  if (!jugador) notFound();

  return (
    <>
      <BackLink href={`/plantilla/${jugador.id}`}>{jugador.nombre}</BackLink>
      <PageHeader titulo="Editar jugador" descripcion={jugador.nombre} />
      <JugadorForm jugador={jugador} />
    </>
  );
}
