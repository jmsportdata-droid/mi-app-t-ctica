import type { Metadata } from "next";
import { requerirContexto } from "@/lib/contexto";
import { getEquipos } from "@/lib/data/equipos";
import { PROVEEDOR } from "@/lib/externos/api-football";
import { BackLink } from "@/components/ui/BackLink";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { ImportarRivales } from "@/components/importar/ImportarRivales";

export const metadata: Metadata = { title: "Importar rivales" };

export default async function ImportarRivalesPage() {
  await requerirContexto();
  const equipos = await getEquipos();
  const yaImportados = equipos
    .map((e) => (e.ids_externos as Record<string, unknown> | null)?.[PROVEEDOR])
    .filter((id): id is string => typeof id === "string");

  return (
    <>
      <BackLink href="/equipos">Equipos</BackLink>
      <PageHeader
        titulo="Importar rivales"
        descripcion="Buscá cada equipo y agregalo con su escudo y estadio. Quedan para todas las temporadas."
      />
      {process.env.API_FOOTBALL_KEY ? (
        <ImportarRivales yaImportados={yaImportados} />
      ) : (
        <Alert>Falta configurar API_FOOTBALL_KEY para poder importar.</Alert>
      )}
    </>
  );
}
