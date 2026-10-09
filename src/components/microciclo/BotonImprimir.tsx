"use client";

/** Abre el diálogo de impresión del navegador (ahí se elige "Guardar como PDF"). */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
    >
      Imprimir o guardar PDF
    </button>
  );
}
