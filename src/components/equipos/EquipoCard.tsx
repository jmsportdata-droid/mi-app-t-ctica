import type { Equipo } from "@/types/equipo";
import { Avatar } from "@/components/ui/Avatar";
import { EquipoAcciones } from "./EquipoAcciones";

export function EquipoCard({ equipo }: { equipo: Equipo }) {
  const detalles = [equipo.liga, equipo.estadio].filter(Boolean);

  return (
    <article className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-md">
      <Avatar src={equipo.escudo_url} nombre={equipo.nombre} tamano="lg" ajuste="contain" />
      <h3 className="mt-4 w-full truncate font-semibold text-slate-900" title={equipo.nombre}>
        {equipo.nombre}
      </h3>
      {detalles.length > 0 ? (
        <p className="mt-1 w-full truncate text-sm text-slate-500" title={detalles.join(" · ")}>
          {detalles.join(" · ")}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-400">Sin liga ni estadio</p>
      )}
      <div className="mt-4 w-full border-t border-slate-100 pt-4">
        <EquipoAcciones id={equipo.id} nombre={equipo.nombre} />
      </div>
    </article>
  );
}
