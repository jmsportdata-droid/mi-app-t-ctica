import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getTarea } from "@/lib/data/tareas";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { TareaForm } from "@/components/tareas/TareaForm";

export const metadata: Metadata = { title: "Editar tarea" };

export default async function EditarTareaPage({ params }: { params: { id: string } }) {
  const { cuerpoTecnico } = await requerirContexto();
  const [tarea, { principios, contenidos }] = await Promise.all([
    getTarea(params.id),
    getModeloJuego(cuerpoTecnico.id),
  ]);
  if (!tarea) notFound();

  return (
    <>
      <BackLink href={`/tareas/${tarea.id}`}>{tarea.nombre}</BackLink>
      <PageHeader titulo="Editar tarea" />
      <TareaForm
        cuerpoTecnicoId={cuerpoTecnico.id}
        principios={principios}
        contenidos={contenidos}
        tarea={tarea}
      />
    </>
  );
}
