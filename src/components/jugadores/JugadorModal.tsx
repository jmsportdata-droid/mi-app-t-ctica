"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  obtenerFichaJugador,
  type FichaJugadorResult,
} from "@/app/(dashboard)/plantilla/ficha-actions";
import { BUCKETS, urlImagen } from "@/lib/storage/config";
import { calcularEdad } from "@/lib/utils/edad";
import { POSICION_NOMBRE, type Jugador } from "@/types/jugador";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dorsal } from "./Dorsal";
import { PosicionBadge } from "./PosicionBadge";

interface Props {
  jugador: Jugador;
  abierto: boolean;
  onCerrar: () => void;
}

export function JugadorModal({ jugador, abierto, onCerrar }: Props) {
  const [ficha, setFicha] = useState<FichaJugadorResult | null>(null);

  // Se piden los datos cada vez que se abre (pueden haber cambiado alineaciones o eventos)
  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;
    setFicha(null);
    obtenerFichaJugador(jugador.id)
      .then((r) => !cancelado && setFicha(r))
      .catch(() => !cancelado && setFicha({ ok: false, error: "Error de conexión" }));
    return () => {
      cancelado = true;
    };
  }, [abierto, jugador.id]);

  const edad = calcularEdad(jugador.fecha_nac);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Ficha de ${jugador.nombre}`}
      className="max-w-3xl"
    >
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-6 pb-6 pt-8 text-white">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            src={urlImagen(BUCKETS.fotosJugadores, jugador.foto_ruta)}
            nombre={jugador.nombre}
            tamano="lg"
            className="ring-4 ring-white/20"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold tracking-tight">{jugador.nombre}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <Dorsal numero={jugador.numero} tamano="sm" />
              <PosicionBadge posicion={jugador.posicion} />
              <span>{POSICION_NOMBRE[jugador.posicion]}</span>
              {edad !== null && <span>· {edad} años</span>}
            </div>
          </div>
          <Link
            href={`/plantilla/${jugador.id}`}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
          >
            Ficha completa
          </Link>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {ficha === null ? (
          <FichaSkeleton />
        ) : !ficha.ok ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{ficha.error}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra label="Partidos" valor={ficha.estadisticas.partidos} />
            <Cifra label="Titular" valor={ficha.estadisticas.titular} />
            <Cifra
              label="Minutos"
              valor={ficha.estadisticas.minutos}
              nota="Estimado: 90' por titularidad"
            />
            <Cifra label="Goles" valor={ficha.estadisticas.goles} />
          </dl>
        )}
      </div>
    </Modal>
  );
}

function Cifra({ label, valor, nota }: { label: string; valor: number; nota?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center" title={nota}>
      <dd className="text-3xl font-bold tabular-nums text-slate-900">
        {valor.toLocaleString("es-ES")}
      </dd>
      <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {nota && <span aria-hidden> *</span>}
      </dt>
      {nota && <span className="sr-only">{nota}</span>}
    </div>
  );
}

function FichaSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando ficha">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
