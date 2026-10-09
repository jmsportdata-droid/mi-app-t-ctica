import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirContexto } from "@/lib/contexto";
import { getJugada } from "@/lib/data/jugadas";
import { BackLink } from "@/components/ui/BackLink";
import { AccionesJugada } from "@/components/pizarra/AccionesJugada";
import { EditorJugada } from "@/components/pizarra/EditorJugada";

export const metadata: Metadata = { title: "Pizarra" };

export default async function JugadaPage({ params }: { params: { id: string } }) {
  const { temporada } = await requerirContexto();
  const jugada = await getJugada(params.id);
  if (!jugada) notFound();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackLink href="/pelota-quieta">Pelota quieta</BackLink>
        <AccionesJugada id={jugada.id} nombre={jugada.nombre} archivada={jugada.archivada} />
      </div>
      <EditorJugada jugada={jugada} color={temporada?.color_principal ?? "#4c1d95"} />
    </>
  );
}
