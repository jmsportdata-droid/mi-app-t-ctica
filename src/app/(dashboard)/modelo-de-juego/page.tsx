import type { Metadata } from "next";
import { requerirContexto } from "@/lib/contexto";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { construirArbol } from "@/types/modelo-juego";
import { PageHeader } from "@/components/ui/PageHeader";
import { CargarModeloBase } from "@/components/modelo-juego/CargarModeloBase";
import { ContenidosTecnicos } from "@/components/modelo-juego/ContenidosTecnicos";
import { EditorModelo } from "@/components/modelo-juego/EditorModelo";
import { SistemaJuego } from "@/components/modelo-juego/SistemaJuego";

export const metadata: Metadata = { title: "Modelo de juego" };

export default async function ModeloJuegoPage() {
  const { cuerpoTecnico } = await requerirContexto();
  const { modelo, principios, contenidos } = await getModeloJuego(cuerpoTecnico.id);

  return (
    <>
      <PageHeader
        titulo="Modelo de juego"
        descripcion="Principios y subprincipios por momento del juego. Viaja con el cuerpo técnico de club en club y es la referencia de tareas, sesiones y reportes."
      />
      {principios.length === 0 ? (
        <CargarModeloBase />
      ) : (
        <div className="space-y-8">
          <SistemaJuego modelo={modelo} />
          <EditorModelo arbol={construirArbol(principios)} />
          <ContenidosTecnicos contenidos={contenidos} />
        </div>
      )}
    </>
  );
}
