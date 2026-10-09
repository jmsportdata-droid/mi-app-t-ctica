import type { Metadata } from "next";
import Link from "next/link";
import { requerirContexto } from "@/lib/contexto";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getFeedbackTareas, getTareas } from "@/lib/data/tareas";
import { PageHeader } from "@/components/ui/PageHeader";
import { BancoTareas } from "@/components/tareas/BancoTareas";
import { CargarTareasBase } from "@/components/tareas/CargarTareasBase";

export const metadata: Metadata = { title: "Banco de tareas" };

export default async function TareasPage() {
  const { cuerpoTecnico } = await requerirContexto();
  const [tareas, { principios }, feedback] = await Promise.all([
    getTareas(cuerpoTecnico.id),
    getModeloJuego(cuerpoTecnico.id),
    getFeedbackTareas(cuerpoTecnico.id),
  ]);

  return (
    <>
      <PageHeader
        titulo="Banco de tareas"
        descripcion="Los ejercicios del cuerpo técnico, cada uno vinculado a los principios del modelo de juego. Viaja con el cuerpo técnico de club en club."
        acciones={
          <Link
            href="/tareas/nueva"
            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Nueva tarea
          </Link>
        }
      />
      {tareas.length === 0 ? (
        <CargarTareasBase />
      ) : (
        <BancoTareas tareas={tareas} principios={principios} feedback={feedback} />
      )}
    </>
  );
}
