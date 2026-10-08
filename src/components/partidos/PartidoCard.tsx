import Link from "next/link";
import { formatearFechaPartido } from "@/lib/utils/fecha";
import type { PartidoConRival } from "@/types/partido";
import { EstadoBadge } from "./EstadoBadge";
import { Enfrentamiento, type ClubPropio } from "./Enfrentamiento";

export function PartidoCard({ partido, club }: { partido: PartidoConRival; club: ClubPropio }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
          {partido.competicion ?? "Sin competencia"}
        </span>
        <EstadoBadge estado={partido.estado} />
      </div>

      <Enfrentamiento partido={partido} club={club} />

      <dl className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <dt className="sr-only">Fecha</dt>
          <IconoCalendario />
          <dd className="capitalize">{formatearFechaPartido(partido.fecha)}</dd>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <dt className="sr-only">Estadio</dt>
          <IconoEstadio />
          <dd className="truncate">{partido.estadio ?? "Estadio por confirmar"}</dd>
        </div>
      </dl>

      <Link
        href={`/partidos/${partido.id}`}
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
      >
        Ver detalle
      </Link>
    </article>
  );
}

function IconoCalendario() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconoEstadio() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
