import type { Metadata } from "next";
import Link from "next/link";
import { rangoFechas } from "@/lib/calendario";
import { requerirTemporada } from "@/lib/contexto";
import { getActividades } from "@/lib/data/calendario";
import { cn } from "@/lib/utils/cn";
import { horaCorta, hoyISO, sumarDias } from "@/lib/utils/fecha";
import { INFO_ACTIVIDAD } from "@/types/calendario";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Calendario del mes" };

const NOMBRE_MES = new Intl.DateTimeFormat("es-UY", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MAX_POR_DIA = 3;

const CLASE_NAV =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

/** Lunes = 0 … domingo = 6 */
const diaSemana = (fecha: string) => (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;

function mesSiguiente(mes: string, delta: number): string {
  const [anio, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(anio ?? 1970, (m ?? 1) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function CalendarioMesPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const { temporada } = await requerirTemporada();
  const hoy = hoyISO();
  const mes =
    searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes) ? searchParams.mes : hoy.slice(0, 7);

  // La grilla arranca el lunes anterior al día 1 y termina el domingo posterior al último día
  const primero = `${mes}-01`;
  const ultimo = sumarDias(`${mesSiguiente(mes, 1)}-01`, -1);
  const desde = sumarDias(primero, -diaSemana(primero));
  const hasta = sumarDias(ultimo, 6 - diaSemana(ultimo));
  const actividades = await getActividades(temporada.id, desde, hasta);

  return (
    <>
      <PageHeader
        titulo={NOMBRE_MES.format(new Date(`${primero}T00:00:00Z`))}
        descripcion="Tocá un día para ver su ciclo completo."
        acciones={
          <>
            <Link
              href={`?mes=${mesSiguiente(mes, -1)}`}
              className={CLASE_NAV}
              aria-label="Mes anterior"
            >
              ←
            </Link>
            <Link href="?" className={CLASE_NAV}>
              Este mes
            </Link>
            <Link
              href={`?mes=${mesSiguiente(mes, 1)}`}
              className={CLASE_NAV}
              aria-label="Mes siguiente"
            >
              →
            </Link>
            <Link href="/calendario" className={CLASE_NAV}>
              Ciclo
            </Link>
          </>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {DIAS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {rangoFechas(desde, hasta).map((fecha) => {
            const delDia = actividades.filter((a) => a.fecha === fecha);
            const fueraDeMes = !fecha.startsWith(mes);
            return (
              <Link
                key={fecha}
                href={`/calendario?fecha=${fecha}`}
                className={cn(
                  "min-h-24 border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-brand-50 sm:min-h-28",
                  fueraDeMes && "bg-slate-50/60 text-slate-400",
                )}
              >
                <span
                  className={cn(
                    "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    fecha === hoy && "bg-brand-600 text-white",
                  )}
                >
                  {Number(fecha.slice(8))}
                </span>
                <ul className="space-y-0.5">
                  {delDia.slice(0, MAX_POR_DIA).map((a) => (
                    <li
                      key={a.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[11px] leading-tight ring-1 ring-inset",
                        INFO_ACTIVIDAD[a.tipo].color,
                      )}
                    >
                      <span className="hidden tabular-nums sm:inline">
                        {horaCorta(a.hora_inicio) && `${horaCorta(a.hora_inicio)} `}
                      </span>
                      {a.titulo}
                    </li>
                  ))}
                  {delDia.length > MAX_POR_DIA && (
                    <li className="px-1 text-[11px] text-slate-500">
                      +{delDia.length - MAX_POR_DIA} más
                    </li>
                  )}
                </ul>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
