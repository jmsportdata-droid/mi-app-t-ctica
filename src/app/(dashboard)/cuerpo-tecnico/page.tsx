import type { Metadata } from "next";
import Link from "next/link";
import { requerirContexto } from "@/lib/contexto";
import { getMiembros } from "@/lib/data/cuerpo-tecnico";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MiembroFila } from "@/components/cuerpo-tecnico/MiembroFila";
import { TemporadaCard } from "@/components/cuerpo-tecnico/TemporadaCard";

export const metadata: Metadata = { title: "Cuerpo técnico" };

const CLASE_BOTON =
  "inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700";

export default async function CuerpoTecnicoPage() {
  const { cuerpoTecnico, temporadas, esEntrenador, userId } = await requerirContexto();
  const miembros = await getMiembros(cuerpoTecnico.id);

  return (
    <>
      <PageHeader
        titulo={cuerpoTecnico.nombre}
        descripcion={
          esEntrenador
            ? "Las personas del cuerpo técnico y los clubes por los que pasa."
            : "Solo el entrenador puede sumar personas o crear temporadas."
        }
      />

      <section aria-labelledby="titulo-miembros" className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="titulo-miembros"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            Miembros
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
              {miembros.length}
            </span>
          </h2>
          {esEntrenador && (
            <Link href="/cuerpo-tecnico/miembros/nuevo" className={CLASE_BOTON}>
              <span aria-hidden>+</span> Agregar miembro
            </Link>
          )}
        </div>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {miembros.map((miembro) => (
            <MiembroFila
              key={miembro.user_id}
              miembro={miembro}
              editable={esEntrenador}
              esYo={miembro.user_id === userId}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-temporadas">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="titulo-temporadas"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            Temporadas
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
              {temporadas.length}
            </span>
          </h2>
          {esEntrenador && (
            <Link href="/cuerpo-tecnico/temporadas/nueva" className={CLASE_BOTON}>
              <span aria-hidden>+</span> Nueva temporada
            </Link>
          )}
        </div>
        {temporadas.length === 0 ? (
          <EmptyState
            titulo="Todavía no hay temporadas"
            descripcion="Cada temporada es un club en un año: ahí viven el plantel, los partidos y la planificación."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {temporadas.map((temporada) => (
              <TemporadaCard key={temporada.id} temporada={temporada} editable={esEntrenador} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
