import type { Metadata } from "next";
import Link from "next/link";
import { requerirContexto } from "@/lib/contexto";
import { getEquipos } from "@/lib/data/equipos";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { EquiposGrid } from "@/components/equipos/EquiposGrid";

export const metadata: Metadata = { title: "Equipos" };

const CLASE_SECUNDARIO =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

const CLASE_BOTON =
  "inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700";

export default async function EquiposPage() {
  await requerirContexto();
  const equipos = await getEquipos();

  return (
    <>
      <PageHeader
        titulo="Equipos"
        descripcion={`${equipos.length} equipo${equipos.length === 1 ? "" : "s"} rival${equipos.length === 1 ? "" : "es"}`}
        acciones={
          <>
            <Link href="/equipos/importar" className={CLASE_SECUNDARIO}>
              Importar
            </Link>
            <Link href="/equipos/nuevo" className={CLASE_BOTON}>
              <span aria-hidden>+</span> Nuevo equipo
            </Link>
          </>
        }
      />

      {equipos.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay equipos rivales"
          descripcion="Agregá los equipos contra los que jugás para analizarlos después."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/equipos/importar" className={CLASE_BOTON}>
                Importar rivales
              </Link>
              <Link href="/equipos/nuevo" className={CLASE_SECUNDARIO}>
                Agregar a mano
              </Link>
            </div>
          }
        />
      ) : (
        <EquiposGrid equipos={equipos} />
      )}
    </>
  );
}
