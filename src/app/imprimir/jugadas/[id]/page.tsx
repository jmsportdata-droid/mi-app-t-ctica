import type { Metadata } from "next";
import { getJugadasPartido } from "@/lib/data/jugadas";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { formatearDia } from "@/lib/utils/fecha";
import type { JugadorEnDiagrama } from "@/types/jugada";
import { BotonImprimir } from "@/components/microciclo/BotonImprimir";
import { DiagramaJugada } from "@/components/pizarra/Dibujo";
import { datosPartidoParaImprimir, estiloImpresion } from "../../datos-partido";

export const metadata: Metadata = { title: "Jugadas de pelota quieta" };

/** Resumen de ABP del partido: una placa por hoja, con los jugadores asignados. */
export default async function JugadasImprimirPage({ params }: { params: { id: string } }) {
  const { partido, temporada, porId, titulo } = await datosPartidoParaImprimir(params.id);
  const jugadas = await getJugadasPartido(partido.id);
  const escudo = urlImagen(BUCKETS.escudos, temporada.escudo_ruta);

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style>{estiloImpresion("landscape")}</style>
      <div className="mx-auto mb-4 flex max-w-[297mm] items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          {titulo} · <span className="capitalize">{formatearDia(partido.fecha)}</span> ·{" "}
          {jugadas.length} jugadas. Elegí <strong>Guardar como PDF</strong> y horizontal.
        </p>
        <BotonImprimir />
      </div>
      <div className="mx-auto max-w-[297mm] space-y-4 print:max-w-none print:space-y-0">
        {jugadas.length === 0 && (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">
            No hay jugadas elegidas para este partido.
          </p>
        )}
        {jugadas.map(({ jugada, asignaciones }, i) => {
          const jugadorDeRol = (rolId: string): JugadorEnDiagrama | null => {
            const j = asignaciones[rolId] ? porId.get(asignaciones[rolId]!) : undefined;
            return j
              ? {
                  nombre: j.nombre,
                  numero: j.numero,
                  fotoUrl: urlImagen(BUCKETS.fotosJugadores, j.foto_ruta),
                }
              : null;
          };
          return (
            <section
              key={jugada.id}
              className="bg-white shadow print:shadow-none"
              style={{ breakAfter: i < jugadas.length - 1 ? "page" : "auto" }}
            >
              <DiagramaJugada
                jugada={jugada}
                prefijo={`i${i}`}
                jugadorDeRol={jugadorDeRol}
                color={temporada.color_principal}
                escudoUrl={escudo}
                className="w-full"
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
