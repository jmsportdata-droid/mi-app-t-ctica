import { MI_EQUIPO } from "@/lib/config";
import { cn } from "@/lib/utils/cn";
import type { PartidoConRival } from "@/types/partido";
import { Avatar } from "@/components/ui/Avatar";

interface Lado {
  nombre: string;
  escudo_url: string | null;
  esNuestro: boolean;
}

/** Escudo local vs escudo visitante, según si jugamos en casa o fuera. */
export function Enfrentamiento({
  partido,
  tamano = "md",
}: {
  partido: PartidoConRival;
  tamano?: "md" | "lg";
}) {
  const nosotros: Lado = { ...MI_EQUIPO, esNuestro: true };
  const rival: Lado = {
    nombre: partido.rival?.nombre ?? "Rival eliminado",
    escudo_url: partido.rival?.escudo_url ?? null,
    esNuestro: false,
  };
  const [local, visitante] = partido.es_local ? [nosotros, rival] : [rival, nosotros];

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <EquipoLado lado={local} tamano={tamano} etiqueta="Local" />
      <span className={cn("font-bold text-slate-300", tamano === "lg" ? "text-2xl" : "text-sm")}>
        VS
      </span>
      <EquipoLado lado={visitante} tamano={tamano} etiqueta="Visitante" />
    </div>
  );
}

function EquipoLado({
  lado,
  tamano,
  etiqueta,
}: {
  lado: Lado;
  tamano: "md" | "lg";
  etiqueta: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <Avatar
        src={lado.escudo_url}
        nombre={lado.nombre}
        tamano={tamano}
        ajuste="contain"
        className={lado.esNuestro && !lado.escudo_url ? "!bg-none bg-brand-600" : undefined}
      />
      <div className="w-full min-w-0">
        <p
          className={cn(
            "truncate font-semibold",
            lado.esNuestro ? "text-brand-700" : "text-slate-900",
            tamano === "lg" ? "text-base" : "text-sm",
          )}
          title={lado.nombre}
        >
          {lado.nombre}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{etiqueta}</p>
      </div>
    </div>
  );
}
