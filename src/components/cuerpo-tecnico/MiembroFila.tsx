"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cambiarRolMiembro,
  quitarMiembro,
  restablecerContrasena,
} from "@/app/(dashboard)/cuerpo-tecnico/actions";
import { generarPassword } from "@/lib/utils/password";
import { ROLES, ROL_LABEL, type Miembro, type Rol } from "@/types/cuerpo-tecnico";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

interface Props {
  miembro: Miembro;
  /** Quien mira es el entrenador: puede gestionar a los demás */
  editable: boolean;
  esYo: boolean;
}

export function MiembroFila({ miembro, editable, esYo }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [quitando, setQuitando] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [passwordGuardada, setPasswordGuardada] = useState(false);

  const gestionable = editable && !esYo;

  function handleRol(rol: Rol) {
    setError(null);
    startTransition(async () => {
      const resultado = await cambiarRolMiembro(miembro.user_id, rol);
      if (!resultado.ok) setError(resultado.error);
      router.refresh();
    });
  }

  function handleQuitar() {
    setError(null);
    startTransition(async () => {
      const resultado = await quitarMiembro(miembro.user_id);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setQuitando(false);
      router.refresh();
    });
  }

  function handlePassword() {
    if (!password) return;
    setError(null);
    startTransition(async () => {
      const resultado = await restablecerContrasena(miembro.user_id, password);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setPasswordGuardada(true);
    });
  }

  function cerrarPassword() {
    setPassword(null);
    setPasswordGuardada(false);
    setError(null);
  }

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <Avatar src={null} nombre={miembro.nombre} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">
          {miembro.nombre}
          {esYo && <span className="ml-2 text-xs font-normal text-slate-500">(vos)</span>}
        </p>
        <p className="truncate text-sm text-slate-500">{miembro.email}</p>
        {error && !quitando && password === null && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>

      {gestionable ? (
        <>
          <label className="sr-only" htmlFor={`rol-${miembro.user_id}`}>
            Rol de {miembro.nombre}
          </label>
          <select
            id={`rol-${miembro.user_id}`}
            value={miembro.rol}
            onChange={(e) => handleRol(e.target.value as Rol)}
            disabled={pendiente}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <Button
              variante="ghost"
              className="px-3 py-1.5"
              onClick={() => setPassword(generarPassword())}
              disabled={pendiente}
            >
              Contraseña
            </Button>
            <Button
              variante="ghost"
              className="px-3 py-1.5 text-red-600 hover:bg-red-50"
              onClick={() => setQuitando(true)}
              disabled={pendiente}
            >
              Quitar
            </Button>
          </div>
        </>
      ) : (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {ROL_LABEL[miembro.rol]}
        </span>
      )}

      <ConfirmDialog
        abierto={quitando}
        titulo={`¿Quitar a ${miembro.nombre}?`}
        descripcion="Deja de tener acceso a la app y se borra su cuenta. Lo que cargó (jugadores, partidos, informes) se mantiene."
        textoConfirmar="Quitar"
        cargando={pendiente}
        error={quitando ? error : null}
        onConfirmar={handleQuitar}
        onCerrar={() => {
          setQuitando(false);
          setError(null);
        }}
      />

      <Modal
        abierto={password !== null}
        onCerrar={cerrarPassword}
        titulo={`Nueva contraseña para ${miembro.nombre}`}
        className="max-w-md"
      >
        <div className="space-y-4 p-6">
          <h2 className="pr-8 font-semibold text-slate-900">
            Nueva contraseña para {miembro.nombre}
          </h2>
          {passwordGuardada ? (
            <>
              <Alert tipo="exito">Listo. Pasale la contraseña nueva:</Alert>
              <p className="rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-900">
                {password}
              </p>
              <div className="flex justify-end">
                <Button onClick={cerrarPassword}>Cerrar</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                La contraseña actual deja de funcionar. Podés usar esta o escribir otra.
              </p>
              {error && <Alert>{error}</Alert>}
              <Input
                label="Contraseña nueva"
                value={password ?? ""}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
                autoComplete="new-password"
              />
              <div className="flex justify-end gap-2">
                <Button variante="secondary" onClick={cerrarPassword} disabled={pendiente}>
                  Cancelar
                </Button>
                <Button onClick={handlePassword} cargando={pendiente}>
                  Guardar contraseña
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </li>
  );
}
