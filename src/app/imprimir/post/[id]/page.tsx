import type { Metadata } from "next";
import { getPostPartido } from "@/lib/data/post-partido";
import {
  CUMPLIMIENTOS,
  GRUPOS_KPI,
  formatearKpi,
  promedioKpi,
  valorRival,
  xgPorTramo,
  type EvaluacionPlan,
  type InsightsPost,
  type Stats,
  type Tiro,
} from "@/lib/post-partido";
import { formatearDia } from "@/lib/utils/fecha";
import { MOMENTOS_PLAN } from "@/types/partido";
import { BotonImprimir } from "@/components/microciclo/BotonImprimir";
import { datosPartidoParaImprimir, estiloImpresion } from "../../datos-partido";

export const metadata: Metadata = { title: "Post partido" };

const LABEL_CUMPLIMIENTO = Object.fromEntries(CUMPLIMIENTOS.map((c) => [c.valor, c.label]));

/** Informe post partido para el cuerpo técnico y la directiva (A4 vertical). */
export default async function PostImprimirPage({ params }: { params: { id: string } }) {
  const { contexto, partido, temporada, detalle, titulo } = await datosPartidoParaImprimir(
    params.id,
  );
  const datos = await getPostPartido(
    partido.id,
    partido.temporada_id,
    partido.fecha,
    contexto.cuerpoTecnico.id,
  );
  const est = datos.estadisticas;
  const post = datos.post;
  const insights = (est?.insights ?? {}) as InsightsPost;
  const propio = (est?.propio ?? {}) as Stats;
  const suyo = (est?.rival ?? {}) as Stats;
  const anteriores = datos.previos.map((p) => ({ propio: p.propio, rival: p.rival_stats }));
  const plan = detalle.plan;
  const evaluaciones = (post?.plan_vs_real ?? {}) as unknown as Record<string, EvaluacionPlan>;
  const color = temporada.color_principal;
  const marcador =
    partido.goles_favor !== null
      ? partido.es_local
        ? `${partido.goles_favor} - ${partido.goles_contra}`
        : `${partido.goles_contra} - ${partido.goles_favor}`
      : "—";

  const itemsPlan = [
    plan?.objetivo && { clave: "objetivo", titulo: "Objetivo", texto: plan.objetivo },
    ...(plan?.claves ?? []).map((c, i) => ({
      clave: `clave_${i + 1}`,
      titulo: `Clave ${i + 1}`,
      texto: c,
    })),
    ...MOMENTOS_PLAN.map((m) => {
      const texto = plan?.[`${m.prefijo}_plantel`] || plan?.[`${m.prefijo}_ct`];
      return texto ? { clave: m.prefijo, titulo: m.label, texto } : null;
    }),
    (plan?.abp_plantel || plan?.abp_ct) && {
      clave: "abp",
      titulo: "Pelota parada",
      texto: (plan?.abp_plantel || plan?.abp_ct)!,
    },
  ].filter((x): x is { clave: string; titulo: string; texto: string } => Boolean(x));

  const jugadores = [...datos.jugadores].sort(
    (a, b) => Number(b.titular) - Number(a.titular) || b.minutos - a.minutos,
  );
  const goles = (
    (est?.incidencias ?? []) as unknown as {
      tipo: string;
      minuto: number;
      propio: boolean;
      jugador: string;
      clase?: string;
    }[]
  ).filter((i) => i.tipo === "gol");

  const Bloque = ({ titulo: t, children }: { titulo: string; children: React.ReactNode }) => (
    <section className="break-inside-avoid">
      <h2
        className="mb-1.5 border-b pb-0.5 text-xs font-bold uppercase tracking-[0.15em]"
        style={{ color, borderColor: color }}
      >
        {t}
      </h2>
      {children}
    </section>
  );
  const texto = (v: string | null | undefined) =>
    v ? (
      <p className="whitespace-pre-line text-[12px] leading-snug">{v}</p>
    ) : (
      <p className="text-[12px] text-slate-400">—</p>
    );

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style>{estiloImpresion("portrait")}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          Elegí <strong>Guardar como PDF</strong>.
        </p>
        <BotonImprimir />
      </div>

      <article className="mx-auto max-w-[210mm] space-y-4 bg-white p-6 text-slate-900 shadow print:max-w-none print:p-0 print:shadow-none">
        <header
          className="flex items-center justify-between gap-4 rounded-lg px-5 py-3 text-white"
          style={{ backgroundColor: color }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
              Informe post partido
            </p>
            <h1 className="text-xl font-bold">{titulo}</h1>
            <p className="text-sm capitalize opacity-90">
              {[partido.competicion, formatearDia(partido.fecha), partido.estadio]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black tabular-nums">{marcador}</p>
            {partido.penales_favor !== null && (
              <p className="text-xs opacity-90">
                Penales {partido.penales_favor}-{partido.penales_contra}
              </p>
            )}
            {est?.formacion_propia && (
              <p className="text-xs opacity-90">
                {est.formacion_propia} vs {est.formacion_rival ?? "?"}
              </p>
            )}
          </div>
        </header>

        {goles.length > 0 && (
          <p className="text-[12px] text-slate-700">
            <b>Goles:</b>{" "}
            {goles
              .map(
                (g) =>
                  `${g.jugador}${g.clase === "penalty" ? " (p)" : ""} ${g.minuto}′${g.propio ? "" : " (rival)"}`,
              )
              .join(" · ")}
          </p>
        )}

        <Bloque titulo="Valoración general">{texto(post?.valoracion ?? insights.resumen)}</Bloque>

        {est && (
          <Bloque titulo={`Estadísticas (${est.fuente === "wyscout" ? "Wyscout" : "Sofascore"})`}>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2">
              {GRUPOS_KPI.map((g) => {
                const filas = g.kpis.filter((k) => k.valor(propio, suyo) !== null);
                if (filas.length === 0) return null;
                return (
                  <table key={g.titulo} className="w-full break-inside-avoid text-[11px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-slate-500">
                        <th className="font-semibold">{g.titulo}</th>
                        <th className="w-12 text-right font-semibold">Nos.</th>
                        <th className="w-12 text-right font-semibold">Rival</th>
                        {anteriores.length > 0 && (
                          <th className="w-12 text-right font-semibold">Prom.</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((k) => (
                        <tr key={k.clave} className="border-t border-slate-100">
                          <td>{k.label}</td>
                          <td className="text-right font-bold tabular-nums">
                            {formatearKpi(k, k.valor(propio, suyo))}
                          </td>
                          <td className="text-right tabular-nums">
                            {formatearKpi(k, valorRival(k, propio, suyo))}
                          </td>
                          {anteriores.length > 0 && (
                            <td className="text-right tabular-nums text-slate-500">
                              {formatearKpi(k, promedioKpi(k, anteriores))}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })}
            </div>
            {(est.tiros as unknown as Tiro[]).length > 0 && (
              <table className="mt-2 w-full text-center text-[11px]">
                <tbody>
                  <tr className="text-[10px] uppercase text-slate-500">
                    <td className="text-left font-semibold">xG por tramo</td>
                    {xgPorTramo(est.tiros as unknown as Tiro[]).map((t) => (
                      <td key={t.tramo}>{t.tramo}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-left text-slate-500">Nos. – rival</td>
                    {xgPorTramo(est.tiros as unknown as Tiro[]).map((t) => (
                      <td key={t.tramo} className="tabular-nums">
                        {t.propio.toFixed(2)} – {t.rival.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
            {anteriores.length > 0 && (
              <p className="mt-1 text-[10px] text-slate-500">
                Prom. = nuestro promedio de los últimos {anteriores.length} partidos.
              </p>
            )}
          </Bloque>
        )}

        {jugadores.length > 0 && (
          <Bloque titulo="Jugadores">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-500">
                  <th className="w-6 text-right font-semibold">Nº</th>
                  <th className="pl-2 font-semibold">Jugador</th>
                  <th className="text-right font-semibold">Min</th>
                  <th className="text-right font-semibold">Nota</th>
                  <th className="text-right font-semibold">G</th>
                  <th className="text-right font-semibold">A</th>
                  <th className="text-right font-semibold">xG</th>
                  <th className="text-right font-semibold">Duelos</th>
                  <th className="text-right font-semibold">Recup.</th>
                  <th className="text-right font-semibold">Km</th>
                  <th className="pl-2 font-semibold">Tarj.</th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j) => {
                  const s = j.stats as Record<string, number | undefined>;
                  return (
                    <tr key={j.jugador_id} className="border-t border-slate-100">
                      <td className="text-right font-bold tabular-nums">
                        {j.jugador?.numero ?? ""}
                      </td>
                      <td className="pl-2">
                        {j.jugador?.nombre}
                        {!j.titular && <span className="text-slate-400"> (s)</span>}
                      </td>
                      <td className="text-right tabular-nums">{j.minutos}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {j.nota === null ? "—" : Number(j.nota).toFixed(1)}
                      </td>
                      <td className="text-right tabular-nums">{j.goles || ""}</td>
                      <td className="text-right tabular-nums">{j.asistencias || ""}</td>
                      <td className="text-right tabular-nums">{(s.xg ?? 0).toFixed(2)}</td>
                      <td className="text-right tabular-nums">
                        {s.duelos_ganados ?? 0}/{(s.duelos_ganados ?? 0) + (s.duelos_perdidos ?? 0)}
                      </td>
                      <td className="text-right tabular-nums">{s.recuperaciones ?? 0}</td>
                      <td className="text-right tabular-nums">{s.km ? s.km.toFixed(1) : "—"}</td>
                      <td className="pl-2">
                        {j.rojas ? "Roja" : j.amarillas === 2 ? "2 AM" : j.amarillas ? "AM" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Bloque>
        )}

        {itemsPlan.length > 0 && (
          <Bloque titulo="Plan vs realidad">
            <ul className="space-y-1">
              {itemsPlan.map((it) => {
                const e = evaluaciones[it.clave];
                return (
                  <li key={it.clave} className="grid grid-cols-[1fr_24mm] gap-2 text-[11px]">
                    <div>
                      <b>{it.titulo}:</b> <span className="text-slate-600">{it.texto}</span>
                      {e?.nota && <p className="text-slate-800">→ {e.nota}</p>}
                    </div>
                    <p className="text-right font-bold">
                      {e?.cumplimiento ? LABEL_CUMPLIMIENTO[e.cumplimiento] : "Sin evaluar"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Bloque>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Bloque titulo="Lo positivo">{texto(post?.positivos)}</Bloque>
          <Bloque titulo="Para mejorar">{texto(post?.a_mejorar)}</Bloque>
          <Bloque titulo="Para la semana">{texto(post?.para_la_semana)}</Bloque>
        </div>

        <p className="pt-2 text-[10px] text-slate-400">
          {temporada.club} · Cuerpo técnico · Generado con Gestión Total CT
        </p>
      </article>
    </div>
  );
}
