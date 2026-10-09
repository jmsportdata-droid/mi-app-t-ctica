import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PartidoReferencia } from "@/lib/calendario";
import {
  armarDias,
  diaMes,
  lunesDe,
  nombreDia,
  PALETA,
  type ActividadCompartida,
} from "@/lib/semana";
import { hoyISO, sumarDias } from "@/lib/utils/fecha";
import { VIDEOS_VESTUARIO, type TipoVideoVestuario } from "@/types/partido";

export const metadata: Metadata = {
  title: "Semana del plantel",
  robots: { index: false, follow: false },
};

interface SemanaPublica {
  club: string;
  temporada: string;
  partidos: PartidoReferencia[];
  actividades: ActividadCompartida[];
  videos?: {
    partido_id: string;
    fecha: string;
    tipo: TipoVideoVestuario;
    url: string;
    duracion: string | null;
    notas: string | null;
  }[];
}

const LABEL_VIDEO = Object.fromEntries(VIDEOS_VESTUARIO.map((v) => [v.valor, v.label])) as Record<
  TipoVideoVestuario,
  string
>;

/**
 * Semana para los jugadores, sin usuario: el token del link es la credencial.
 * Solo muestra lo marcado como visible para los jugadores.
 */
export default async function SemanaJugadoresPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { desde?: string };
}) {
  const hoy = hoyISO();
  const pedido =
    searchParams.desde && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.desde) ? searchParams.desde : hoy;
  const desde = lunesDe(pedido);
  const hasta = sumarDias(desde, 6);

  const supabase = createClient();
  const { data } = await supabase.rpc("semana_publica", { p_token: params.token, p_desde: desde });
  const semana = data as SemanaPublica | null;

  if (!semana) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-6 text-center"
        style={{ backgroundColor: PALETA.fondo, color: PALETA.suave }}
      >
        <div>
          <p className="text-lg font-semibold text-white">Este link no anda</p>
          <p className="mt-1 text-sm">Pedile al cuerpo técnico el link nuevo.</p>
        </div>
      </main>
    );
  }

  const dias = armarDias(desde, hasta, semana.actividades, semana.partidos);
  const nav =
    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10";

  return (
    <main
      className="min-h-screen px-4 py-8 sm:px-8"
      style={{
        backgroundImage: `linear-gradient(135deg, ${PALETA.fondo} 0%, ${PALETA.fondoClaro} 55%, ${PALETA.fondo} 100%)`,
        color: PALETA.texto,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.3em]"
              style={{ color: PALETA.acento }}
            >
              {semana.club}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              SEMANA {diaMes(desde)} AL {diaMes(hasta)}
            </h1>
          </div>
          <nav className="flex gap-2" aria-label="Cambiar de semana">
            <Link
              href={`?desde=${sumarDias(desde, -7)}`}
              className={nav}
              style={{ borderColor: PALETA.acento }}
              aria-label="Semana anterior"
            >
              ←
            </Link>
            <Link href="?" className={nav} style={{ borderColor: PALETA.acento }}>
              Esta semana
            </Link>
            <Link
              href={`?desde=${sumarDias(desde, 7)}`}
              className={nav}
              style={{ borderColor: PALETA.acento }}
              aria-label="Semana siguiente"
            >
              →
            </Link>
          </nav>
        </header>

        <div className="grid gap-3 md:grid-cols-7">
          {dias.map((d) => {
            const esPartido = d.items.some((i) => i.esPartido);
            const esHoy = d.fecha === hoy;
            return (
              <section
                key={d.fecha}
                className="overflow-hidden rounded-2xl border"
                style={{
                  backgroundColor: esPartido ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
                  borderColor: esHoy ? PALETA.texto : "rgba(183,202,219,0.2)",
                }}
              >
                <header
                  className="flex items-baseline justify-between gap-2 px-3 py-2.5 md:flex-col md:items-center md:text-center"
                  style={{
                    backgroundColor: esPartido ? PALETA.texto : "rgba(255,255,255,0.08)",
                    color: esPartido ? PALETA.fondo : PALETA.texto,
                  }}
                >
                  <span className="text-sm font-extrabold uppercase tracking-wider">
                    {nombreDia(d.fecha)}
                    {esHoy && " · hoy"}
                  </span>
                  <span className="text-sm font-semibold">
                    {diaMes(d.fecha)}
                    {d.md && ` · ${d.md}`}
                  </span>
                </header>
                {d.libre ? (
                  <p
                    className="px-3 py-6 text-center text-xl font-extrabold tracking-[0.3em]"
                    style={{ color: PALETA.suave }}
                  >
                    LIBRE
                  </p>
                ) : (
                  <div className="space-y-3 p-3">
                    {d.lugar && <Dato label="Lugar">{d.lugar}</Dato>}
                    {d.citacion && (
                      <Dato label="Citación">
                        <span className="text-xl font-extrabold">{d.citacion}</span>
                      </Dato>
                    )}
                    <ul
                      className="space-y-2.5 border-t pt-3"
                      style={{ borderColor: "rgba(183,202,219,0.2)" }}
                    >
                      {d.items.map((i) => (
                        <li key={i.id}>
                          {i.hora && (
                            <p className="text-xs font-semibold" style={{ color: PALETA.suave }}>
                              {i.hora}
                            </p>
                          )}
                          <p className={i.esPartido ? "font-extrabold" : "font-semibold"}>
                            {i.titulo}
                          </p>
                          {i.indicaciones && (
                            <p className="mt-0.5 text-xs" style={{ color: PALETA.suave }}>
                              {i.indicaciones}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {semana.videos && semana.videos.length > 0 && (
          <section className="mt-8">
            <h2
              className="mb-3 text-xs font-semibold uppercase tracking-[0.3em]"
              style={{ color: PALETA.acento }}
            >
              Videos
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {semana.videos.map((v) => (
                <li key={`${v.partido_id}-${v.tipo}`}>
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full rounded-2xl border p-4 transition-colors hover:bg-white/10"
                    style={{ borderColor: "rgba(183,202,219,0.3)" }}
                  >
                    <p className="text-xs font-semibold" style={{ color: PALETA.suave }}>
                      {diaMes(v.fecha)}
                      {v.duracion && ` · ${v.duracion}`}
                    </p>
                    <p className="mt-1 font-bold">▶ {LABEL_VIDEO[v.tipo]}</p>
                    {v.notas && (
                      <p className="mt-1 text-sm" style={{ color: PALETA.suave }}>
                        {v.notas}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: PALETA.acento }}
      >
        {label}
      </p>
      <p className="text-sm font-semibold">{children}</p>
    </div>
  );
}
