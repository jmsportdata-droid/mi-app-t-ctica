import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { JugadorForm } from "@/components/jugadores/JugadorForm";

export const metadata: Metadata = { title: "Nuevo jugador" };

export default function NuevoJugadorPage() {
  return (
    <>
      <BackLink href="/plantilla">Plantilla</BackLink>
      <PageHeader titulo="Nuevo jugador" descripcion="Añade un jugador a la plantilla" />
      <JugadorForm />
    </>
  );
}
