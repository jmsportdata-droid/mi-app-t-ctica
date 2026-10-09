"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarJugador } from "@/app/(dashboard)/plantilla/actions";
import { erroresDeZod, jugadorSchema, type JugadorErrores } from "@/lib/validations/jugador";
import {
  MAX_POSICIONES,
  PIES_HABILES,
  POSICIONES,
  POSICIONES_ESPECIFICAS,
  POSICION_LABEL,
  type Jugador,
  type JugadorInput,
} from "@/types/jugador";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { BUCKETS } from "@/lib/storage/config";
import { guardarConImagen, type ImagenValor } from "@/lib/storage/client";

interface JugadorFormProps {
  /** Carpeta de Storage donde se sube la foto */
  cuerpoTecnicoId: string;
  /** Si se pasa, el formulario edita ese jugador; si no, crea uno nuevo. */
  jugador?: Jugador;
}

interface Valores {
  nombre: string;
  fecha_nac: string;
  posicion: string;
  numero: string;
  posiciones: string[];
  pie_habil: string;
  altura_cm: string;
  nacionalidad: string;
  formado_en_club: boolean;
  fecha_debut: string;
  seleccion: string;
}

function valoresIniciales(jugador?: Jugador): Valores {
  return {
    nombre: jugador?.nombre ?? "",
    fecha_nac: jugador?.fecha_nac ?? "",
    posicion: jugador?.posicion ?? "",
    numero: jugador?.numero != null ? String(jugador.numero) : "",
    posiciones: jugador?.posiciones ?? [],
    pie_habil: jugador?.pie_habil ?? "",
    altura_cm: jugador?.altura_cm != null ? String(jugador.altura_cm) : "",
    nacionalidad: jugador?.nacionalidad ?? "",
    formado_en_club: jugador?.formado_en_club ?? false,
    fecha_debut: jugador?.fecha_debut ?? "",
    seleccion: jugador?.seleccion ?? "",
  };
}

const numeroONull = (v: string) => (v.trim() === "" ? null : Number(v));

/** Convierte los valores del formulario (strings) al shape tipado de entrada. */
function aInput(v: Valores, fotoRuta: string | null): unknown {
  return {
    foto_ruta: fotoRuta,
    nombre: v.nombre,
    fecha_nac: v.fecha_nac === "" ? null : v.fecha_nac,
    posicion: v.posicion,
    numero: numeroONull(v.numero),
    posiciones: v.posiciones,
    pie_habil: v.pie_habil === "" ? null : v.pie_habil,
    altura_cm: numeroONull(v.altura_cm),
    nacionalidad: v.nacionalidad,
    formado_en_club: v.formado_en_club,
    fecha_debut: v.fecha_debut === "" ? null : v.fecha_debut,
    seleccion: v.seleccion,
  };
}

export function JugadorForm({ cuerpoTecnicoId, jugador }: JugadorFormProps) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>(() => valoresIniciales(jugador));
  const [errores, setErrores] = useState<JugadorErrores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [foto, setFoto] = useState<ImagenValor>({
    archivo: null,
    ruta: jugador?.foto_ruta ?? null,
  });

  const esEdicion = Boolean(jugador);

  function actualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function alternarPosicion(codigo: string) {
    const actuales = valores.posiciones;
    if (actuales.includes(codigo)) {
      actualizar(
        "posiciones",
        actuales.filter((p) => p !== codigo),
      );
    } else if (actuales.length < MAX_POSICIONES) {
      actualizar("posiciones", [...actuales, codigo]);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral(null);

    // Si hay archivo nuevo, la ruta aún no existe: se valida el resto y la foto se sube después.
    const parsed = jugadorSchema.safeParse(aInput(valores, foto.archivo ? null : foto.ruta));
    if (!parsed.success) {
      setErrores(erroresDeZod(parsed.error));
      return;
    }

    startTransition(async () => {
      const resultado = await guardarConImagen(
        BUCKETS.fotosJugadores,
        cuerpoTecnicoId,
        foto,
        (fotoRuta) => {
          const input: JugadorInput = { ...parsed.data, foto_ruta: fotoRuta };
          return guardarJugador(jugador?.id ?? null, input);
        },
      );

      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        setErrores(resultado.errores ?? {});
        return;
      }
      router.push(`/plantilla/${resultado.id}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {errorGeneral && <Alert>{errorGeneral}</Alert>}

      <ImageUpload
        label="Foto"
        bucket={BUCKETS.fotosJugadores}
        value={foto}
        onChange={setFoto}
        error={errores.foto_ruta}
        disabled={pendiente}
      />

      <Input
        label="Nombre completo"
        name="nombre"
        placeholder="Ej. Luis Alberto Suárez Díaz"
        value={valores.nombre}
        onChange={(e) => actualizar("nombre", e.target.value)}
        error={errores.nombre}
        maxLength={80}
        required
        autoFocus={!esEdicion}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Fecha de nacimiento"
          type="date"
          name="fecha_nac"
          value={valores.fecha_nac}
          onChange={(e) => actualizar("fecha_nac", e.target.value)}
          error={errores.fecha_nac}
          ayuda="Opcional, pero sirve para las edades del plantel."
        />
        <Select
          label="Posición"
          name="posicion"
          value={valores.posicion}
          onChange={(e) => actualizar("posicion", e.target.value)}
          error={errores.posicion}
          required
        >
          <option value="" disabled>
            Elegí…
          </option>
          {POSICIONES.map((p) => (
            <option key={p} value={p}>
              {POSICION_LABEL[p]}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">
          Posiciones donde juega{" "}
          <span className="font-normal text-slate-500">(opcional, hasta {MAX_POSICIONES})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {POSICIONES_ESPECIFICAS.map((p) => {
            const elegida = valores.posiciones.includes(p.codigo);
            const lleno = !elegida && valores.posiciones.length >= MAX_POSICIONES;
            return (
              <button
                key={p.codigo}
                type="button"
                aria-pressed={elegida}
                onClick={() => alternarPosicion(p.codigo)}
                disabled={lleno || pendiente}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors disabled:opacity-40",
                  elegida
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {errores.posiciones && <p className="text-xs text-red-600">{errores.posiciones}</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          label="Pie hábil"
          name="pie_habil"
          value={valores.pie_habil}
          onChange={(e) => actualizar("pie_habil", e.target.value)}
          error={errores.pie_habil}
        >
          <option value="">Sin dato</option>
          {PIES_HABILES.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.label}
            </option>
          ))}
        </Select>
        <Input
          label="Altura (cm)"
          type="number"
          name="altura_cm"
          inputMode="numeric"
          min={140}
          max={220}
          step={1}
          placeholder="Ej. 182"
          value={valores.altura_cm}
          onChange={(e) => actualizar("altura_cm", e.target.value)}
          error={errores.altura_cm}
        />
        <Input
          label="Nacionalidad"
          name="nacionalidad"
          placeholder="Ej. Uruguay"
          value={valores.nacionalidad}
          onChange={(e) => actualizar("nacionalidad", e.target.value)}
          error={errores.nacionalidad}
          maxLength={60}
        />
      </div>

      <Input
        label="Número de camiseta"
        type="number"
        name="numero"
        inputMode="numeric"
        min={1}
        max={99}
        step={1}
        placeholder="1–99"
        value={valores.numero}
        onChange={(e) => actualizar("numero", e.target.value)}
        error={errores.numero}
        ayuda="Opcional. No se puede repetir en el plantel."
        className="sm:w-40"
      />

      <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Trayectoria (para la Memoria del ciclo)
        </legend>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="formado_en_club"
            checked={valores.formado_en_club}
            onChange={(e) => actualizar("formado_en_club", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Formado en el club (juveniles)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Debut en Primera"
            type="date"
            name="fecha_debut"
            value={valores.fecha_debut}
            onChange={(e) => actualizar("fecha_debut", e.target.value)}
            error={errores.fecha_debut}
            ayuda="Si debutó con este cuerpo técnico, cuenta como promovido."
          />
          <Input
            label="Selección"
            name="seleccion"
            placeholder="Ej. Sub-20 de Uruguay (2026)"
            value={valores.seleccion}
            onChange={(e) => actualizar("seleccion", e.target.value)}
            error={errores.seleccion}
            maxLength={200}
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" cargando={pendiente}>
          {esEdicion ? "Guardar cambios" : "Agregar jugador"}
        </Button>
        <Button type="button" variante="ghost" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
