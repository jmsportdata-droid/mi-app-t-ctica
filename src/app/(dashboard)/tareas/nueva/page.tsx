import type { Metadata } from "next";
import { requerirContexto } from "@/lib/contexto";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { TareaForm } from "@/components/tareas/TareaForm";

export const metadata: Metadata = { title: "Nueva tarea" };

export default async function NuevaTareaPage() {
  const { cuerpoTecnico } = await requerirContexto();
  const { principios, contenidos } = await getModeloJuego(cuerpoTecnico.id);

  return (
    <>
      <BackLink href="/tareas">Banco de tareas</BackLink>
      <PageHeader titulo="Nueva tarea" />
      <TareaForm
        cuerpoTecnicoId={cuerpoTecnico.id}
        principios={principios}
        contenidos={contenidos}
      />
    </>
  );
}
