import type { Metadata } from "next";
import { llevaEjercicios } from "@/types/calendario";
import { notFound } from "next/navigation";
import { requerirTemporada } from "@/lib/contexto";
import { getActividad } from "@/lib/data/calendario";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { getSesionCompleta, getUbicacionSesion } from "@/lib/data/sesiones";
import { indiceObjetivos } from "@/types/modelo-juego";
import { BotonImprimir } from "@/components/microciclo/BotonImprimir";
import { PlanillaSesion } from "@/components/microciclo/PlanillaSesion";

export const metadata: Metadata = { title: "Planilla de sesión" };

/**
 * Planilla de la sesión con el formato del cuerpo técnico: encabezado con
 * microciclo, sesión, fecha y temporada, y una columna por tarea.
 */
export default async function PlanillaSesionPage({ params }: { params: { id: string } }) {
  const { temporada, cuerpoTecnico } = await requerirTemporada();
  const actividad = await getActividad(params.id);
  if (!actividad || !llevaEjercicios(actividad.tipo)) notFound();

  const [ubicacion, { sesion, tareas }, { principios, contenidos }] = await Promise.all([
    getUbicacionSesion(temporada.id, actividad),
    getSesionCompleta(actividad.id),
    getModeloJuego(cuerpoTecnico.id),
  ]);
  const indice = indiceObjetivos(principios);
  const nombreContenido = new Map(contenidos.map((c) => [c.id, c.nombre]));

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 8mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[297mm] items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          En el diálogo elegí <strong>Guardar como PDF</strong> y orientación horizontal.
        </p>
        <BotonImprimir />
      </div>

      <PlanillaSesion
        temporada={temporada}
        actividad={actividad}
        ubicacion={ubicacion}
        sesion={sesion}
        tareas={tareas}
        indice={indice}
        nombreContenido={nombreContenido}
      />
    </div>
  );
}
