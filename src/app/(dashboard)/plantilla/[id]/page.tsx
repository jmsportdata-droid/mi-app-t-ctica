import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJugador } from "@/lib/data/jugadores";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { calcularEdad, formatearFecha } from "@/lib/utils/edad";
import { POSICION_LABEL } from "@/types/jugador";
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

  const edad = calcularEdad(jugador.fecha_nac);
  const datos = [
    { label: "Posición", valor: POSICION_LABEL[jugador.posicion] },
    { label: "Fecha de nacimiento", valor: formatearFecha(jugador.fecha_nac) },
    { label: "Edad", valor: edad !== null ? `${edad} años` : "—" },
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
            <div className="mt-2 flex items-center gap-2">
              <Dorsal numero={jugador.numero} tamano="sm" />
              <PosicionBadge posicion={jugador.posicion} />
            </div>
          </div>
          <Link
            href={`/plantilla/${jugador.id}/editar`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Editar
          </Link>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
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
    </>
  );
}
