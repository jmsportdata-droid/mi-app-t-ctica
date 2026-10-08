"use client";

import { useState, useTransition, type FormEvent } from "react";
import { buscarEquiposExternos } from "@/app/(dashboard)/importar/actions";
import type { EquipoExterno } from "@/lib/externos/api-football";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

interface Props {
  textoInicial?: string;
  /** Qué hacer con cada resultado (botón de la derecha) */
  accion: (equipo: EquipoExterno) => React.ReactNode;
  onCuota?: (restantesHoy: number | null) => void;
}

/** Busca equipos en API-Football (1 consulta por búsqueda). */
export function BuscadorEquipos({ textoInicial = "", accion, onCuota }: Props) {
  const [texto, setTexto] = useState(textoInicial);
  const [resultados, setResultados] = useState<EquipoExterno[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const r = await buscarEquiposExternos(texto);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setResultados(r.equipos);
        onCuota?.(r.cuota.restantesHoy);
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Nombre del equipo"
            placeholder="Ej. Nacional, Defensor Sporting…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            ayuda="Sin acentos ni ñ también lo encuentra (Peñarol figura como «Penarol»)."
          />
        </div>
        <Button type="submit" cargando={pendiente} className="mb-6">
          Buscar
        </Button>
      </form>

      {error && <Alert>{error}</Alert>}

      {resultados && resultados.length === 0 && (
        <p className="text-sm text-slate-500">No apareció ningún equipo con ese nombre.</p>
      )}

      {resultados && resultados.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {resultados.map((equipo) => (
            <li key={equipo.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {equipo.escudoUrl ? (
                // Imagen pública de API-Football: solo para elegir, no se guarda este enlace
                // eslint-disable-next-line @next/next/no-img-element
                <img src={equipo.escudoUrl} alt="" className="h-10 w-10 object-contain" />
              ) : (
                <span className="h-10 w-10 rounded-full bg-slate-100" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{equipo.nombre}</p>
                <p className="truncate text-xs text-slate-500">
                  {[equipo.pais, equipo.estadio].filter(Boolean).join(" · ") || "Sin datos"}
                </p>
              </div>
              {accion(equipo)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
