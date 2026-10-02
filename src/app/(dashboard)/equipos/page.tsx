import type { Metadata } from "next";
import Link from "next/link";
import { getEquipos } from "@/lib/data/equipos";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { EquiposGrid } from "@/components/equipos/EquiposGrid";

export const metadata: Metadata = { title: "Equipos" };

const CLASE_BOTON =
  "inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700";

export default async function EquiposPage() {
  const equipos = await getEquipos();

  return (
    <>
      <PageHeader
        titulo="Equipos"
        descripcion={`${equipos.length} equipo${equipos.length === 1 ? "" : "s"} rival${equipos.length === 1 ? "" : "es"}`}
        acciones={
          <Link href="/equipos/nuevo" className={CLASE_BOTON}>
            <span aria-hidden>+</span> Nuevo equipo
          </Link>
        }
      />

      {equipos.length === 0 ? (
        <EmptyState
          titulo="Aún no hay equipos rivales"
          descripcion="Añade los equipos contra los que juegas para analizarlos después."
          accion={
            <Link href="/equipos/nuevo" className={CLASE_BOTON}>
              Nuevo equipo
            </Link>
          }
        />
      ) : (
        <EquiposGrid equipos={equipos} />
      )}
    </>
  );
}
