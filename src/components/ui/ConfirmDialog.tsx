"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  abierto: boolean;
  titulo: string;
  descripcion: React.ReactNode;
  textoConfirmar?: string;
  cargando?: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCerrar: () => void;
}

/**
 * Modal de confirmación sobre <dialog> nativo:
 * foco atrapado, cierre con Escape y fondo oscurecido sin dependencias.
 */
export function ConfirmDialog({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = "Eliminar",
  cargando = false,
  error,
  onConfirmar,
  onCerrar,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (abierto && !dialog.open) dialog.showModal();
    if (!abierto && dialog.open) dialog.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-titulo"
      onCancel={(e) => {
        e.preventDefault(); // Escape: cerrar vía estado (o ignorar si está cargando)
        if (!cargando) onCerrar();
      }}
      onClick={(e) => {
        // Clic fuera del panel (sobre el backdrop)
        if (e.target === ref.current && !cargando) onCerrar();
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="confirm-titulo" className="font-semibold text-slate-900">
              {titulo}
            </h2>
            <div className="mt-1 text-sm text-slate-600">{descripcion}</div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variante="secondary" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Button>
          <Button variante="danger" onClick={onConfirmar} cargando={cargando}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
