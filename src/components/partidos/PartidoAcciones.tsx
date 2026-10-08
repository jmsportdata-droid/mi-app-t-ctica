"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cambiarEstadoPartido, eliminarPartido } from "@/app/(dashboard)/partidos/actions";
import { claseControl } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { ESTADOS_PARTIDO, ESTADO_LABEL, type EstadoPartido } from "@/types/partido";

interface Props {
  id: string;
  estado: EstadoPartido;
  titulo: string;
}

/** Estado (se guarda al cambiar), enlace a editar y borrado con confirmación. */
export function PartidoAcciones({ id, estado: estadoInicial, titulo }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoPartido>(estadoInicial);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [guardandoEstado, startEstado] = useTransition();

  const [abierto, setAbierto] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);
  const [borrando, startBorrado] = useTransition();

  function cambiarEstado(nuevo: EstadoPartido) {
    const anterior = estado;
    setEstado(nuevo);
    setErrorEstado(null);
    startEstado(async () => {
      try {
        const resultado = await cambiarEstadoPartido(id, nuevo);
        if (!resultado.ok) {
          setEstado(anterior);
          setErrorEstado(resultado.error);
          return;
        }
        router.refresh();
      } catch {
        setEstado(anterior);
        setErrorEstado("Error de conexión.");
      }
    });
  }

  function confirmarBorrado() {
    setErrorBorrado(null);
    startBorrado(async () => {
      try {
        const resultado = await eliminarPartido(id);
        if (!resultado.ok) {
          setErrorBorrado(resultado.error);
          return;
        }
        router.replace("/partidos");
        router.refresh();
      } catch {
        setErrorBorrado("Error de conexión al eliminar.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="estado-partido">
        Estado del partido
      </label>
      <select
        id="estado-partido"
        value={estado}
        disabled={guardandoEstado}
        onChange={(e) => cambiarEstado(e.target.value as EstadoPartido)}
        className={cn(claseControl(errorEstado ?? undefined), "w-auto py-1.5")}
      >
        {ESTADOS_PARTIDO.map((e) => (
          <option key={e} value={e}>
            {ESTADO_LABEL[e]}
          </option>
        ))}
      </select>
      <Link
        href={`/partidos/${id}/editar`}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        Eliminar
      </button>
      {errorEstado && <p className="w-full text-xs text-red-600">{errorEstado}</p>}

      <ConfirmDialog
        abierto={abierto}
        titulo="Eliminar partido"
        descripcion={
          <>
            ¿Seguro que querés eliminar <strong className="text-slate-900">{titulo}</strong>? Se
            borrarán también el informe del rival y el plan de partido.
          </>
        }
        textoConfirmar="Eliminar partido"
        cargando={borrando}
        error={errorBorrado}
        onConfirmar={confirmarBorrado}
        onCerrar={() => {
          setAbierto(false);
          setErrorBorrado(null);
        }}
      />
    </div>
  );
}
