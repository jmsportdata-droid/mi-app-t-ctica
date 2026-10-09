import type { Metadata } from "next";
import { getModeloJuego } from "@/lib/data/modelo-juego";
import { formatearDia, horaCorta } from "@/lib/utils/fecha";
import { etiquetaFormacion, FORMACIONES, type Formacion } from "@/types/alineacion";
import type { Jugador } from "@/types/jugador";
import { indiceObjetivos } from "@/types/modelo-juego";
import {
  MOMENTOS_PLAN,
  SITUACIONES,
  type CambioPlanificado,
  type JugadorClave,
} from "@/types/partido";
import { CampoFutbol } from "@/components/campo/CampoFutbol";
import { BotonImprimir } from "@/components/microciclo/BotonImprimir";
import { datosPartidoParaImprimir, estiloImpresion } from "../../datos-partido";

export const metadata: Metadata = { title: "Plan de partido" };

const LABEL_SITUACION = Object.fromEntries(SITUACIONES.map((s) => [s.valor, s.label]));
const apellido = (j: Jugador) => j.nombre.split(" ").slice(-1)[0] ?? j.nombre;

/** Plan de partido: versión extendida (cuerpo técnico) o one sheet (plantel). */
export default async function PlanImprimirPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { version?: string };
}) {
  const { contexto, partido, temporada, detalle, porId, titulo } = await datosPartidoParaImprimir(
    params.id,
  );
  const { principios } = await getModeloJuego(contexto.cuerpoTecnico.id);
  const indice = indiceObjetivos(principios);
  const plan = detalle.plan;
  const oneSheet = searchParams.version === "one-sheet";
  const formacion = (detalle.alineacion?.formacion ?? null) as Formacion | null;
  const jugadoresClave = (plan?.jugadores_clave as unknown as JugadorClave[] | undefined) ?? [];
  const fecha = `${formatearDia(partido.fecha)}${partido.hora ? ` · ${horaCorta(partido.hora)}` : ""}`;
  const nombres = (ids: string[] | undefined) =>
    (ids ?? [])
      .map((id) => porId.get(id)?.nombre)
      .filter(Boolean)
      .join(", ");
  const principiosDe = (ids: string[] | undefined) =>
    (ids ?? [])
      .map((id) => indice.get(id)?.texto)
      .filter(Boolean)
      .join(" · ");

  const encabezado = (
    <header
      className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-lg px-5 py-3 text-white"
      style={{ backgroundColor: temporada.color_principal }}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
          {oneSheet ? "Plan de partido" : "Plan de partido · Cuerpo técnico"}
        </p>
        <h1 className="text-xl font-bold">{titulo}</h1>
      </div>
      <p className="text-sm capitalize opacity-90">
        {[partido.competicion, fecha, partido.estadio].filter(Boolean).join(" · ")}
      </p>
    </header>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style>{estiloImpresion(oneSheet ? "landscape" : "portrait")}</style>
      <div
        className={`mx-auto mb-4 flex items-center justify-between gap-4 print:hidden ${oneSheet ? "max-w-[297mm]" : "max-w-[210mm]"}`}
      >
        <p className="text-sm text-slate-600">
          Elegí <strong>Guardar como PDF</strong>
          {oneSheet ? " y orientación horizontal" : ""}.
        </p>
        <BotonImprimir />
      </div>

      {oneSheet ? (
        <article className="mx-auto max-w-[297mm] bg-white p-6 text-slate-900 shadow print:max-w-none print:p-0 print:shadow-none">
          {encabezado}
          <div className="grid grid-cols-[62mm_1fr] gap-5">
            <div>
              <CampoFutbol className="bg-emerald-700">
                {formacion &&
                  FORMACIONES[formacion].map((slot, i) => {
                    const id = detalle.alineacion?.titulares[i];
                    const j = id ? porId.get(id) : undefined;
                    return (
                      <div
                        key={i}
                        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                        style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-900 shadow">
                          {j?.numero ?? ""}
                        </span>
                        <span className="mt-0.5 max-w-[22mm] truncate rounded bg-slate-900/70 px-1 text-[8px] font-semibold text-white">
                          {j ? apellido(j) : slot.label}
                        </span>
                      </div>
                    );
                  })}
              </CampoFutbol>
              <p className="mt-1 text-center text-xs font-semibold">
                {formacion ? etiquetaFormacion(formacion) : "Sin formación"}
              </p>
            </div>

            <div className="space-y-4">
              {(plan?.claves.length ?? 0) > 0 && (
                <ol className="space-y-1.5">
                  {plan!.claves.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-3 text-lg font-bold leading-snug"
                    >
                      <span className="text-2xl" style={{ color: temporada.color_principal }}>
                        {i + 1}
                      </span>
                      {c}
                    </li>
                  ))}
                </ol>
              )}
              <div className="grid grid-cols-2 gap-3">
                {MOMENTOS_PLAN.map((m) => (
                  <div key={m.prefijo} className="rounded-lg border border-slate-300 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {m.corto}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug">
                      {plan?.[`${m.prefijo}_plantel`] ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
              {plan?.abp_plantel && (
                <div className="rounded-lg border border-slate-300 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Pelota quieta
                  </p>
                  <p className="mt-1 text-sm font-semibold">{plan.abp_plantel}</p>
                </div>
              )}
              {jugadoresClave.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Ojo con…
                  </p>
                  <ul className="grid grid-cols-3 gap-2">
                    {jugadoresClave.slice(0, 3).map((j, i) => (
                      <li key={i} className="rounded-lg bg-slate-900 p-2.5 text-white">
                        <p className="text-sm font-bold">
                          {j.dorsal !== null ? `${j.dorsal}. ` : ""}
                          {j.nombre}
                        </p>
                        <p className="mt-0.5 text-xs leading-snug text-slate-300">{j.como}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </article>
      ) : (
        <article className="mx-auto max-w-[210mm] space-y-5 bg-white p-8 text-sm leading-relaxed text-slate-900 shadow print:max-w-none print:p-0 print:shadow-none">
          {encabezado}

          <Bloque titulo="0. Las 3 claves">
            {(plan?.claves.length ?? 0) > 0 ? (
              <ol className="list-inside list-decimal space-y-0.5 font-semibold">
                {plan!.claves.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            ) : (
              <Vacio />
            )}
            {plan?.objetivo && (
              <p className="mt-1">
                <strong>Objetivo:</strong> {plan.objetivo}
              </p>
            )}
          </Bloque>

          <Bloque titulo="1. Contexto">
            <Texto valor={plan?.contexto} />
          </Bloque>

          <Bloque titulo="2. Choque de estructuras">
            <p className="font-semibold">
              {formacion ? etiquetaFormacion(formacion) : "—"} vs{" "}
              {partido.formacion_rival ? etiquetaFormacion(partido.formacion_rival) : "—"}
            </p>
            <Texto valor={plan?.choque} />
          </Bloque>

          <Bloque titulo="3. Plan por momento del juego">
            <div className="space-y-3">
              {MOMENTOS_PLAN.map((m) => (
                <div key={m.prefijo} className="break-inside-avoid">
                  <p className="font-semibold">{m.label}</p>
                  <Texto valor={plan?.[`${m.prefijo}_ct`]} />
                  {principiosDe(plan?.[`${m.prefijo}_principios`]) && (
                    <p className="text-xs text-slate-600">
                      <strong>Principios:</strong> {principiosDe(plan?.[`${m.prefijo}_principios`])}
                    </p>
                  )}
                  {nombres(plan?.[`${m.prefijo}_jugadores`]) && (
                    <p className="text-xs text-slate-600">
                      <strong>Jugadores:</strong> {nombres(plan?.[`${m.prefijo}_jugadores`])}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Bloque>

          <Bloque titulo="4. Pelota quieta">
            <Texto valor={plan?.abp_ct} />
          </Bloque>

          <Bloque titulo="5. Jugadores clave del rival">
            {jugadoresClave.length === 0 ? (
              <Vacio />
            ) : (
              <ul className="space-y-1">
                {jugadoresClave.map((j, i) => (
                  <li key={i}>
                    <strong>
                      {j.dorsal !== null ? `${j.dorsal}. ` : ""}
                      {j.nombre}
                    </strong>
                    {j.responsable &&
                      porId.get(j.responsable) &&
                      ` (se encarga ${porId.get(j.responsable)!.nombre})`}
                    {j.como && `: ${j.como}`}
                  </li>
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque titulo="6. Escenarios y plan B">
            {detalle.escenarios.length === 0 ? (
              <Vacio />
            ) : (
              <ul className="space-y-2">
                {detalle.escenarios.map((e) => {
                  const cambios = e.cambios as unknown as CambioPlanificado[];
                  return (
                    <li key={e.id} className="break-inside-avoid">
                      <p className="font-semibold">
                        {LABEL_SITUACION[e.situacion]}
                        {e.desde_minuto !== null && ` desde el ${e.desde_minuto}′`}
                        {e.formacion &&
                          ` · pasamos a ${etiquetaFormacion(e.formacion as Formacion)}`}
                      </p>
                      <p className="whitespace-pre-line">{e.respuesta}</p>
                      {cambios.length > 0 && (
                        <p className="text-xs text-slate-600">
                          Cambios:{" "}
                          {cambios
                            .map(
                              (c) =>
                                `sale ${porId.get(c.sale)?.nombre ?? "—"}, entra ${porId.get(c.entra)?.nombre ?? "—"}`,
                            )
                            .join("; ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Bloque>

          <Bloque titulo="7. Gestión del partido">
            <Texto valor={plan?.gestion} />
          </Bloque>

          <Bloque titulo="8. Para el microciclo">
            {principiosDe(plan?.microciclo_principios) ? (
              <p>{principiosDe(plan?.microciclo_principios)}</p>
            ) : (
              <Vacio />
            )}
          </Bloque>
        </article>
      )}
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-1 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide text-slate-700">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Texto({ valor }: { valor: string | null | undefined }) {
  return valor ? <p className="whitespace-pre-line">{valor}</p> : <Vacio />;
}

function Vacio() {
  return <p className="text-slate-400">—</p>;
}
