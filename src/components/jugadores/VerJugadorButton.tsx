"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Jugador } from "@/types/jugador";

// Recharts solo se descarga al abrir el primer popup
const JugadorModal = dynamic(() => import("./JugadorModal").then((m) => m.JugadorModal), { ssr: false });

/** Botón "Ver" de la tarjeta: abre el popup con la ficha del jugador. */
export function VerJugadorButton({ jugador }: { jugador: Jugador }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
      >
        Ver
      </button>
      {abierto && <JugadorModal jugador={jugador} abierto={abierto} onCerrar={() => setAbierto(false)} />}
    </>
  );
}
