import type { Metadata } from "next";
import { requerirContexto } from "@/lib/contexto";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { EquipoForm } from "@/components/equipos/EquipoForm";

export const metadata: Metadata = { title: "Nuevo equipo" };

export default async function NuevoEquipoPage() {
  const { cuerpoTecnico } = await requerirContexto();

  return (
    <>
      <BackLink href="/equipos">Equipos</BackLink>
      <PageHeader titulo="Nuevo equipo" descripcion="Añade un equipo rival" />
      <EquipoForm cuerpoTecnicoId={cuerpoTecnico.id} />
    </>
  );
}
