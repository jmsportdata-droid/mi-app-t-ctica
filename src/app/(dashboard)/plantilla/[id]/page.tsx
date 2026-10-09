import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHistorialDisponibilidad } from "@/lib/data/disponibilidad";
import { getJugador } from "@/lib/data/jugadores";
import { hoyISO } from "@/lib/utils/fecha";
import { indiceAereo } from "@/lib/aereo";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { calcularEdad, formatearFecha } from "@/lib/utils/edad";
import {
  PIE_LABEL,
  POSICION_ESPECIFICA_LABEL,
  POSICION_NOMBRE,
  type PosicionEspecifica,
} from "@/types/jugador";
import { SIN_REGISTRO } from "@/types/disponibilidad";
import { EstadoChip } from "@/components/disponibilidad/EstadoChip";
import { BackLink } from "@/components/ui/BackLink";
import { Avatar } from "@/components/ui/Avatar";
import { Dorsal } from "@/components/jugadores/Dorsal";
import { PosicionBadge } from "@/components/jugadores/PosicionBadge";
import { EliminarJugadorButton } from "@/components/jugadores/EliminarJugadorButton";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const jugador = await getJugador(params.id);
  return { title: jugador?.nombre ?? "Jugador" };
}

export default async function JugadorPage({ params }: Props) {
  const jugador = await getJugador(params.id);
  if (!jugador) notFound();

  const historial = await getHistorialDisponibilidad(jugador.id);
  const hoy = hoyISO();
  // El estado vigente es el último registro que no sea a futuro
  const vigente = historial.find((r) => r.fecha <= hoy);
  const estadoHoy = vigente
    ? { estado: vigente.estado, fecha_regreso: vigente.fecha_regreso }
    : SIN_REGISTRO;

  const edad = calcularEdad(jugador.fecha_nac);
  const posiciones = jugador.posiciones
    .map((p) => POSICION_ESPECIFICA_LABEL[p as PosicionEspecifica] ?? p)
    .join(", ");
  const datos = [
    { label: "Posición", valor: POSICION_NOMBRE[jugador.posicion] },
    { label: "Juega de", valor: posiciones || "—" },
    { label: "Fecha de nacimiento", valor: formatearFecha(jugador.fecha_nac) },
    { label: "Edad", valor: edad !== null ? `${edad} años` : "—" },
    { label: "Pie hábil", valor: jugador.pie_habil ? PIE_LABEL[jugador.pie_habil] : "—" },
    { label: "Altura", valor: jugador.altura_cm ? `${jugador.altura_cm} cm` : "—" },
    { label: "Nacionalidad", valor: jugador.nacionalidad ?? "—" },
  ];

  return (
    <>
      <BackLink href="/plantilla">Plantel</BackLink>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            src={urlImagen(BUCKETS.fotosJugadores, jugador.foto_ruta)}
            nombre={jugador.nombre}
            tamano="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{jugador.nombre}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Dorsal numero={jugador.numero} tamano="sm" />
              <PosicionBadge posicion={jugador.posicion} />
              <EstadoChip estado={estadoHoy.estado} fechaRegreso={estadoHoy.fecha_regreso} />
            </div>
          </div>
          <Link
            href={`/plantilla/${jugador.id}/editar`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Editar
          </Link>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {datos.map(({ label, valor }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">{valor}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex justify-end border-t border-slate-100 pt-5">
          <EliminarJugadorButton id={jugador.id} nombre={jugador.nombre} />
        </div>
      </article>

      <EstadisticasSofascore
        altura={jugador.altura_cm}
        e={jugador.estadisticas_sofascore as Record<string, number | null | undefined>}
      />

      <section
        aria-labelledby="titulo-historial"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-historial" className="font-semibold text-slate-900">
            Disponibilidad
          </h2>
          <Link
            href="/plantilla/disponibilidad"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Cargar disponibilidad
          </Link>
        </div>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nunca se le cargó un estado: figura como disponible.
          </p>
        ) : (
          <ol className="space-y-2">
            {historial.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="w-24 tabular-nums text-slate-500">{formatearFecha(r.fecha)}</span>
                <EstadoChip estado={r.estado} fechaRegreso={r.fecha_regreso} />
                {r.fecha > hoy && <span className="text-xs text-slate-400">(a futuro)</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function EstadisticasSofascore({
  altura,
  e,
}: {
  altura: number | null;
  e: Record<string, number | null | undefined>;
}) {
  if (!e.minutos) return null;
  const indice = indiceAereo({
    altura_cm: altura,
    minutos: e.minutos,
    aereos_90: e.aereos_90,
    aereos_pct: e.aereos_pct,
    cabezazos_abp: e.cabezazos_abp,
  });
  const datos: [string, string][] = [
    ["Partidos", String(e.partidos ?? e.pj ?? "—")],
    ["Minutos", String(e.minutos)],
    ["Nota Sofascore", e.nota ? String(e.nota) : "—"],
    ["Goles", String(e.goles ?? 0)],
    ["xG", String(e.xg ?? 0)],
    ["xA", String(e.xa ?? 0)],
    [
      "Aéreos ganados",
      `${e.aereos_ganados ?? 0}${e.aereos_pct !== null && e.aereos_pct !== undefined ? ` (${e.aereos_pct}%)` : ""}`,
    ],
    ["Duelos ganados", String(e.duelos_ganados ?? 0)],
    ["Despejes", String(e.despejes ?? 0)],
    ["Remates en ABP", `${e.tiros_abp ?? 0} (${e.cabezazos_abp ?? 0} de cabeza)`],
    ["Índice aéreo", indice === null ? "—" : `${indice}/100`],
  ];
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">Últimos partidos (Sofascore)</h2>
      <p className="mb-4 text-xs text-slate-500">
        Totales de los últimos partidos del equipo con estadísticas. Se actualiza desde el Plantel.
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {datos.map(([label, valor]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
