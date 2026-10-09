import type { Metadata } from "next";
import { formatearDia, horaCorta } from "@/lib/utils/fecha";
import { POSICION_NOMBRE } from "@/types/jugador";
import { BotonImprimir } from "@/components/microciclo/BotonImprimir";
import { datosPartidoParaImprimir, estiloImpresion } from "../../datos-partido";

export const metadata: Metadata = { title: "Convocatoria" };

/** Lista de convocados para el club (sin formación) o habitaciones de la concentración. */
export default async function ConvocatoriaImprimirPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { que?: string };
}) {
  const { partido, temporada, detalle, porId, convocados, titulo } = await datosPartidoParaImprimir(
    params.id,
  );
  const habitaciones = searchParams.que === "habitaciones";
  const { concentracion } = detalle;
  const datos = [
    partido.competicion,
    `${formatearDia(partido.fecha)}${partido.hora ? ` · ${horaCorta(partido.hora)}` : ""}`,
    partido.estadio,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style>{estiloImpresion("portrait")}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          Elegí <strong>Guardar como PDF</strong> en el diálogo de impresión.
        </p>
        <BotonImprimir />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-8 text-slate-900 shadow print:max-w-none print:p-0 print:shadow-none">
        <header
          className="mb-6 rounded-lg px-5 py-4 text-white"
          style={{ backgroundColor: temporada.color_principal }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            {temporada.club} · Temporada {temporada.etiqueta}
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {habitaciones ? "Habitaciones de la concentración" : "Lista de convocados"}
          </h1>
          <p className="mt-1 text-sm opacity-90">
            {titulo} · <span className="capitalize">{datos.join(" · ")}</span>
          </p>
        </header>

        {habitaciones ? (
          <>
            {concentracion && (
              <p className="mb-4 text-sm text-slate-700">
                {concentracion.lugar && <strong>{concentracion.lugar}</strong>}
                {concentracion.entrada_fecha && (
                  <>
                    {" "}
                    · Entrada{" "}
                    <span className="capitalize">{formatearDia(concentracion.entrada_fecha)}</span>
                    {concentracion.entrada_hora && ` ${horaCorta(concentracion.entrada_hora)}`}
                  </>
                )}
                {concentracion.salida_fecha && (
                  <>
                    {" "}
                    · Salida{" "}
                    <span className="capitalize">{formatearDia(concentracion.salida_fecha)}</span>
                    {concentracion.salida_hora && ` ${horaCorta(concentracion.salida_hora)}`}
                  </>
                )}
              </p>
            )}
            {detalle.habitaciones.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no hay habitaciones armadas.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-left">
                    <th className="w-40 py-2 pr-4">Habitación</th>
                    <th className="py-2">Jugadores</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.habitaciones.map((h) => (
                    <tr key={h.id} className="border-b border-slate-200 align-top">
                      <td className="py-2 pr-4 font-semibold">{h.nombre}</td>
                      <td className="py-2">
                        {h.jugadores
                          .map((id) => porId.get(id))
                          .filter((j) => j !== undefined)
                          .map((j) => `${j.numero ? `${j.numero}. ` : ""}${j.nombre}`)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {concentracion?.notas && (
              <p className="mt-4 whitespace-pre-line text-sm text-slate-700">
                {concentracion.notas}
              </p>
            )}
          </>
        ) : convocados.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay convocados.</p>
        ) : (
          <>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900 text-left">
                  <th className="w-16 py-2 pr-4">Nº</th>
                  <th className="py-2 pr-4">Jugador</th>
                  <th className="w-40 py-2">Puesto</th>
                </tr>
              </thead>
              <tbody>
                {convocados.map((j) => (
                  <tr key={j.id} className="border-b border-slate-200">
                    <td className="py-2 pr-4 font-bold tabular-nums">{j.numero ?? "—"}</td>
                    <td className="py-2 pr-4">{j.nombre}</td>
                    <td className="py-2 text-slate-600">{POSICION_NOMBRE[j.posicion]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm text-slate-600">{convocados.length} jugadores convocados.</p>
          </>
        )}
      </article>
    </div>
  );
}
