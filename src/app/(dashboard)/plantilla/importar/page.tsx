import type { Metadata } from "next";
import { requerirTemporada } from "@/lib/contexto";
import { PROVEEDOR } from "@/lib/externos/api-football";
import { BackLink } from "@/components/ui/BackLink";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { ImportarPlantel } from "@/components/importar/ImportarPlantel";

export const metadata: Metadata = { title: "Importar plantel" };

export default async function ImportarPlantelPage() {
  const { temporada } = await requerirTemporada();
  const ids = temporada.ids_externos as Record<string, unknown> | null;
  const vinculado = Number(ids?.[PROVEEDOR]);

  return (
    <>
      <BackLink href="/plantilla">Plantel</BackLink>
      <PageHeader
        titulo="Importar plantel"
        descripcion={`Traé el plantel de ${temporada.club} desde API-Football. Volvé a usarlo cuando haya altas o cambios de número.`}
      />
      {process.env.API_FOOTBALL_KEY ? (
        <ImportarPlantel
          club={temporada.club}
          equipoVinculado={Number.isInteger(vinculado) && vinculado > 0 ? vinculado : null}
        />
      ) : (
        <Alert>Falta configurar API_FOOTBALL_KEY para poder importar.</Alert>
      )}
    </>
  );
}
