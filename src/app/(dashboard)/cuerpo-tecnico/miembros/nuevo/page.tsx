import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { MiembroForm } from "@/components/cuerpo-tecnico/MiembroForm";

export const metadata: Metadata = { title: "Agregar miembro" };

export default async function NuevoMiembroPage() {
  const { esEntrenador, cuerpoTecnico } = await requerirContexto();
  if (!esEntrenador) redirect("/cuerpo-tecnico");

  return (
    <>
      <BackLink href="/cuerpo-tecnico">Cuerpo técnico</BackLink>
      <PageHeader
        titulo="Agregar miembro"
        descripcion={`Creá su cuenta para ${cuerpoTecnico.nombre}. Entra con email y contraseña.`}
      />
      <MiembroForm />
    </>
  );
}
