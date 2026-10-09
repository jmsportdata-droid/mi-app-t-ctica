import type { Metadata } from "next";
import Link from "next/link";
import { requerirContexto } from "@/lib/contexto";
import { getJugadas } from "@/lib/data/jugadas";
import { cn } from "@/lib/utils/cn";
import { LABEL_CATEGORIA, LABEL_TIPO_JUGADA, TIPOS_JUGADA, type Jugada } from "@/types/jugada";
import { PageHeader } from "@/components/ui/PageHeader";
import { DiagramaJugada } from "@/components/pizarra/Dibujo";
import { NuevaJugada } from "@/components/pizarra/NuevaJugada";

export const metadata: Metadata = { title: "Pelota quieta" };

export default async function PelotaQuietaPage({
  searchParams,
}: {
  searchParams: { archivadas?: string };
}) {
  const { cuerpoTecnico, temporada } = await requerirContexto();
  const todas = await getJugadas(cuerpoTecnico.id);
  const verArchivadas = searchParams.archivadas === "1";
  const jugadas = todas.filter((j) => j.archivada === verArchivadas);
  const archivadas = todas.filter((j) => j.archivada).length;
  const color = temporada?.color_principal ?? "#4c1d95";

  return (
    <>
      <PageHeader
        titulo="Pelota quieta"
        descripcion="La biblioteca de jugadas del cuerpo técnico, armadas por rol. En cada partido se elige quién cumple cada rol y las placas salen con sus fotos."
        acciones={<NuevaJugada vacia={todas.length === 0} />}
      />

      {todas.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-8 text-center text-sm text-slate-600">
          Todavía no hay jugadas. Cargá las jugadas base (las de su resumen de ABP: segundo palo,
          primer palo cargando zona, todos cerrados, liberar punto penal, faltas laterales y la
          marca mixta) o creá una nueva.
        </p>
      ) : (
        <div className="space-y-8">
          {TIPOS_JUGADA.map((t) => {
            const lista = jugadas.filter((j) => j.tipo === t.valor);
            if (lista.length === 0) return null;
            return (
              <section key={t.valor}>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {t.valor === "ofensivo" ? "Ofensivas (a favor)" : "Defensivas (en contra)"}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((j) => (
                    <li key={j.id}>
                      <TarjetaJugada jugada={j} color={color} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {jugadas.length === 0 && (
            <p className="text-sm text-slate-500">No hay jugadas archivadas.</p>
          )}
          {(archivadas > 0 || verArchivadas) && (
            <Link
              href={verArchivadas ? "/pelota-quieta" : "/pelota-quieta?archivadas=1"}
              className="inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {verArchivadas ? "← Ver las activas" : `Ver archivadas (${archivadas})`}
            </Link>
          )}
        </div>
      )}
    </>
  );
}

function TarjetaJugada({ jugada, color }: { jugada: Jugada; color: string }) {
  return (
    <Link
      href={`/pelota-quieta/${jugada.id}`}
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <DiagramaJugada
        jugada={jugada}
        prefijo={`t-${jugada.id.slice(0, 8)}`}
        color={color}
        className="w-full border-b border-slate-100"
      />
      <div className="space-y-1 p-3">
        <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              jugada.tipo === "ofensivo"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700",
            )}
          >
            {LABEL_TIPO_JUGADA[jugada.tipo]}
          </span>
          {LABEL_CATEGORIA[jugada.categoria]}
          {jugada.numero !== null && ` · Nº ${jugada.numero}`}
        </p>
        <p className="font-semibold text-slate-900">{jugada.nombre}</p>
        {jugada.sena && <p className="text-xs text-slate-500">Seña: {jugada.sena}</p>}
      </div>
    </Link>
  );
}
