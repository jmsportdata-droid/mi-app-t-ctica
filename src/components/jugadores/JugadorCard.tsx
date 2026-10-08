import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { calcularEdad } from "@/lib/utils/edad";
import type { Jugador } from "@/types/jugador";
import { Avatar } from "@/components/ui/Avatar";
import { PosicionBadge } from "./PosicionBadge";
import { VerJugadorButton } from "./VerJugadorButton";

export function JugadorCard({ jugador }: { jugador: Jugador }) {
  const edad = calcularEdad(jugador.fecha_nac);

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar
            src={urlImagen(BUCKETS.fotosJugadores, jugador.foto_ruta)}
            nombre={jugador.nombre}
            tamano="md"
          />
          <span
            className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 text-xs font-bold tabular-nums text-white ring-2 ring-white"
            aria-label={jugador.numero !== null ? `Número ${jugador.numero}` : "Sin número"}
          >
            {jugador.numero ?? "–"}
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="truncate font-semibold text-slate-900" title={jugador.nombre}>
            {jugador.nombre}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <PosicionBadge posicion={jugador.posicion} />
            {edad !== null && <span>{edad} años</span>}
          </div>
        </div>
      </div>
      <div className="mt-auto">
        <VerJugadorButton jugador={jugador} />
      </div>
    </article>
  );
}
