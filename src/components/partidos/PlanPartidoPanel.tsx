"use client";

import { guardarCampoPlan } from "@/app/(dashboard)/partidos/actions";
import { cn } from "@/lib/utils/cn";
import { BLOQUES_PLAN, type BloquePlan, type CampoPlan, type PlanPartido } from "@/types/partido";
import { AutoSaveField } from "@/components/ui/AutoSaveField";
import { ImagenPreview, PdfEnlace, VimeoEmbed } from "./Embeds";

const ACENTO: Record<BloquePlan, string> = {
  ataque: "border-t-rose-500",
  defensa: "border-t-sky-500",
  transicion: "border-t-amber-500",
};

interface Props {
  partidoId: string;
  plan: PlanPartido | null;
}

export function PlanPartidoPanel({ partidoId, plan }: Props) {
  return (
    <div className="space-y-6">
      {BLOQUES_PLAN.map(({ clave, titulo }) => (
        <BloquePlanCard
          key={clave}
          bloque={clave}
          titulo={titulo}
          partidoId={partidoId}
          plan={plan}
        />
      ))}
    </div>
  );
}

function BloquePlanCard({
  bloque,
  titulo,
  partidoId,
  plan,
}: {
  bloque: BloquePlan;
  titulo: string;
  partidoId: string;
  plan: PlanPartido | null;
}) {
  const campo = (sufijo: "notas" | "vimeo" | "imagen1" | "imagen2" | "pdf"): CampoPlan =>
    `${bloque}_${sufijo}`;
  const valor = (c: CampoPlan) => plan?.[c] ?? null;
  const guardar = (c: CampoPlan) => (v: string) => guardarCampoPlan(partidoId, c, v);

  return (
    <section
      aria-labelledby={`bloque-${bloque}`}
      className={cn(
        "rounded-2xl border border-t-4 border-slate-200 bg-white p-6 shadow-sm",
        ACENTO[bloque],
      )}
    >
      <h3
        id={`bloque-${bloque}`}
        className="mb-5 text-lg font-bold uppercase tracking-wide text-slate-900"
      >
        {titulo}
      </h3>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <AutoSaveField
            label="Notas"
            multilinea
            filas={8}
            placeholder={`Ideas clave de ${titulo.toLowerCase()}…`}
            valorInicial={valor(campo("notas"))}
            onGuardar={guardar(campo("notas"))}
          />
          <AutoSaveField
            label="PDF"
            tipo="url"
            placeholder="https://…/documento.pdf"
            valorInicial={valor(campo("pdf"))}
            onGuardar={guardar(campo("pdf"))}
          >
            {(url) => <PdfEnlace url={url} />}
          </AutoSaveField>
        </div>

        <div className="space-y-5">
          <AutoSaveField
            label="Vídeo (Vimeo)"
            tipo="url"
            placeholder="https://vimeo.com/123456789"
            valorInicial={valor(campo("vimeo"))}
            onGuardar={guardar(campo("vimeo"))}
          >
            {(url) => <VimeoEmbed url={url} titulo={`Vídeo de ${titulo.toLowerCase()}`} />}
          </AutoSaveField>

          <div className="grid gap-5 sm:grid-cols-2">
            {(["imagen1", "imagen2"] as const).map((sufijo, i) => (
              <AutoSaveField
                key={sufijo}
                label={`Imagen ${i + 1} (URL)`}
                tipo="url"
                placeholder="https://…/imagen.png"
                valorInicial={valor(campo(sufijo))}
                onGuardar={guardar(campo(sufijo))}
              >
                {(url) => <ImagenPreview url={url} alt={`${titulo} – imagen ${i + 1}`} />}
              </AutoSaveField>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
