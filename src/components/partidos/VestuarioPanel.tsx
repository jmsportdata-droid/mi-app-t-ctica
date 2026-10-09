"use client";

import { useState } from "react";
import Link from "next/link";
import { guardarVideoVestuario } from "@/app/(dashboard)/partidos/semana-actions";
import { VIDEOS_VESTUARIO, type TipoVideoVestuario, type VideoVestuario } from "@/types/partido";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { useAccion } from "@/components/ui/useAccion";

/** Los 4 videos que se le muestran al plantel; los visibles salen en el link de jugadores. */
export function VestuarioPanel({
  partidoId,
  videos,
}: {
  partidoId: string;
  videos: VideoVestuario[];
}) {
  const porTipo = new Map(videos.map((v) => [v.tipo, v]));
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Las versiones cortas para el plantel. Los que marques como visibles aparecen en el{" "}
        <Link href="/calendario/semana" className="font-medium text-brand-700 hover:underline">
          link de jugadores
        </Link>{" "}
        de la semana del partido.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {VIDEOS_VESTUARIO.map((v) => (
          <TarjetaVideo
            key={v.valor}
            partidoId={partidoId}
            tipo={v.valor}
            titulo={v.label}
            ayuda={v.ayuda}
            video={porTipo.get(v.valor)}
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaVideo({
  partidoId,
  tipo,
  titulo,
  ayuda,
  video,
}: {
  partidoId: string;
  tipo: TipoVideoVestuario;
  titulo: string;
  ayuda: string;
  video?: VideoVestuario;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [url, setUrl] = useState(video?.url ?? "");
  const [duracion, setDuracion] = useState(video?.duracion ?? "");
  const [notas, setNotas] = useState(video?.notas ?? "");
  const [visible, setVisible] = useState(video?.visible_jugadores ?? false);
  const [guardado, setGuardado] = useState(false);
  const cambiado =
    url !== (video?.url ?? "") ||
    duracion !== (video?.duracion ?? "") ||
    notas !== (video?.notas ?? "") ||
    visible !== (video?.visible_jugadores ?? false);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{titulo}</h3>
          <p className="text-xs text-slate-500">{ayuda}</p>
        </div>
        {video?.url && video.visible_jugadores && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Visible
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem]">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link de Vimeo, YouTube o Drive"
          aria-label={`Link de ${titulo}`}
          className={claseControl()}
        />
        <input
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          maxLength={20}
          placeholder="6′30″"
          aria-label="Duración"
          className={claseControl()}
        />
      </div>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Qué tienen que mirar (lo ven los jugadores)"
        aria-label="Notas"
        className={claseControl()}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Mostrar a los jugadores
        </label>
        <div className="flex items-center gap-2">
          {video?.url && (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Ver ↗
            </a>
          )}
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            cargando={pendiente}
            disabled={!cambiado}
            onClick={() =>
              ejecutar(
                () =>
                  guardarVideoVestuario(partidoId, tipo, {
                    url,
                    duracion,
                    notas,
                    visible_jugadores: visible,
                  }),
                () => {
                  setGuardado(true);
                  setTimeout(() => setGuardado(false), 2000);
                },
              )
            }
          >
            {guardado ? "Guardado ✓" : "Guardar"}
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
