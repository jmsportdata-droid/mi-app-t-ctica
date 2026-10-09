"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarJugada } from "@/app/(dashboard)/pelota-quieta/actions";
import { descargarSVGComoPNG, nombreArchivo } from "@/lib/exportar-png";
import { espejar, LIENZO, nuevoId } from "@/lib/pizarra";
import { cn } from "@/lib/utils/cn";
import {
  CATEGORIAS_JUGADA,
  ESTILOS_FLECHA,
  LADOS_JUGADA,
  TIPOS_JUGADA,
  type CategoriaJugada,
  type ElementoDiagrama,
  type EstiloFlecha,
  type Jugada,
  type LadoJugada,
  type RolJugada,
  type TipoJugada,
} from "@/types/jugada";
import { Button } from "@/components/ui/Button";
import { claseControl } from "@/components/ui/Field";
import { CanchaArea, Definiciones, ElementoSVG, Encabezado } from "./Dibujo";

type Herramienta =
  | { tipo: "seleccionar" }
  | { tipo: "jugador" }
  | { tipo: "rival" }
  | { tipo: "pelota" }
  | { tipo: "texto" }
  | { tipo: "flecha"; estilo: EstiloFlecha };

type Arrastre =
  | { tipo: "mover"; id: string; desde: { x: number; y: number }; original: ElementoDiagrama }
  | { tipo: "punto"; id: string; punto: "inicio" | "fin" | "control" };

const PREFIJO = "editor";
const ORDEN = { flecha: 0, texto: 1, pelota: 2, rival: 3, jugador: 4 } as const;
const redondear = (v: number) => Math.round(v * 10) / 10;
const limitar = (v: number, max: number) => Math.min(max, Math.max(0, v));

/** Editor de la pizarra: dibujo por roles, flechas con el código del cuerpo técnico y PNG. */
export function EditorJugada({ jugada, color }: { jugada: Jugada; color: string }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [meta, setMeta] = useState({
    nombre: jugada.nombre,
    tipo: jugada.tipo,
    categoria: jugada.categoria,
    lado: jugada.lado,
    numero: jugada.numero === null ? "" : String(jugada.numero),
    sena: jugada.sena ?? "",
    descripcion: jugada.descripcion ?? "",
  });
  const [roles, setRoles] = useState<RolJugada[]>(jugada.roles);
  const [elementos, setElementos] = useState<ElementoDiagrama[]>(jugada.diagrama.elementos);
  const [historial, setHistorial] = useState<ElementoDiagrama[][]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [herramienta, setHerramienta] = useState<Herramienta>({ tipo: "seleccionar" });
  const [rolParaColocar, setRolParaColocar] = useState<string | null>(jugada.roles[0]?.id ?? null);
  const [pendiente, setPendiente] = useState<{ x: number; y: number } | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const seleccionado = elementos.find((e) => e.id === seleccion) ?? null;

  /** Guarda el estado actual para poder deshacer. */
  const recordar = useCallback(() => {
    setHistorial((h) => [...h.slice(-49), elementos]);
    setSucio(true);
  }, [elementos]);

  function cambiar(nuevos: ElementoDiagrama[]) {
    recordar();
    setElementos(nuevos);
  }

  function deshacer() {
    setHistorial((h) => {
      const anterior = h[h.length - 1];
      if (anterior) setElementos(anterior);
      return h.slice(0, -1);
    });
    setSeleccion(null);
  }

  function borrarSeleccion() {
    if (!seleccion) return;
    cambiar(elementos.filter((e) => e.id !== seleccion));
    setSeleccion(null);
  }

  // Teclado: borrar, deshacer y cancelar (salvo mientras se escribe en un campo)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && seleccion) {
        e.preventDefault();
        borrarSeleccion();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        deshacer();
      } else if (e.key === "Escape") {
        setPendiente(null);
        setSeleccion(null);
        setHerramienta({ tipo: "seleccionar" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Aviso al salir con cambios sin guardar
  useEffect(() => {
    if (!sucio) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sucio]);

  function punto(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const m = svg.getScreenCTM();
    const r = m ? p.matrixTransform(m.inverse()) : p;
    return { x: redondear(limitar(r.x, LIENZO.ancho)), y: redondear(limitar(r.y, LIENZO.alto)) };
  }

  /** El próximo rol que todavía no está en el dibujo. */
  function siguienteRol(usados: Set<string>, desde: string | null): string | null {
    const libres = roles.filter((r) => !usados.has(r.id));
    if (libres.length === 0) return roles[0]?.id ?? null;
    const i = roles.findIndex((r) => r.id === desde);
    return (libres.find((r) => roles.indexOf(r) > i) ?? libres[0])!.id;
  }

  function colocar(p: { x: number; y: number }) {
    const h = herramienta;
    if (h.tipo === "flecha") {
      if (!pendiente) {
        setPendiente(p);
        return;
      }
      const nueva: ElementoDiagrama = {
        id: nuevoId("f"),
        tipo: "flecha",
        estilo: h.estilo,
        x1: pendiente.x,
        y1: pendiente.y,
        x2: p.x,
        y2: p.y,
        cx: redondear((pendiente.x + p.x) / 2),
        cy: redondear((pendiente.y + p.y) / 2),
      };
      cambiar([...elementos, nueva]);
      setPendiente(null);
      setSeleccion(nueva.id);
      return;
    }
    if (h.tipo === "seleccionar") {
      setSeleccion(null);
      return;
    }
    let nuevo: ElementoDiagrama;
    if (h.tipo === "jugador") {
      nuevo = { id: nuevoId("j"), tipo: "jugador", rol: rolParaColocar, x: p.x, y: p.y };
      const usados = new Set(
        [...elementos, nuevo].flatMap((e) => (e.tipo === "jugador" && e.rol ? [e.rol] : [])),
      );
      setRolParaColocar(siguienteRol(usados, rolParaColocar));
    } else if (h.tipo === "rival") {
      nuevo = { id: nuevoId("rv"), tipo: "rival", x: p.x, y: p.y };
    } else if (h.tipo === "pelota") {
      nuevo = { id: nuevoId("p"), tipo: "pelota", x: p.x, y: p.y };
    } else {
      nuevo = { id: nuevoId("t"), tipo: "texto", x: p.x, y: p.y, texto: "TEXTO" };
      setHerramienta({ tipo: "seleccionar" });
    }
    cambiar([...elementos, nuevo]);
    setSeleccion(nuevo.id);
  }

  function onFondo(e: React.PointerEvent) {
    colocar(punto(e));
  }

  function onElemento(e: React.PointerEvent, el: ElementoDiagrama) {
    e.stopPropagation();
    // Con una herramienta de flecha, tocar un jugador empieza o termina la flecha en él
    if (herramienta.tipo === "flecha" && el.tipo !== "flecha") {
      colocar({ x: el.x, y: el.y });
      return;
    }
    if (herramienta.tipo !== "seleccionar") {
      colocar(punto(e));
      return;
    }
    setSeleccion(el.id);
    svgRef.current?.setPointerCapture(e.pointerId);
    recordar();
    setArrastre({ tipo: "mover", id: el.id, desde: punto(e), original: el });
  }

  function onManija(e: React.PointerEvent, id: string, p: "inicio" | "fin" | "control") {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    recordar();
    setArrastre({ tipo: "punto", id, punto: p });
  }

  function onMover(e: React.PointerEvent) {
    if (!arrastre) return;
    const p = punto(e);
    setElementos((lista) =>
      lista.map((el) => {
        if (el.id !== arrastre.id) return el;
        if (arrastre.tipo === "mover") {
          const dx = p.x - arrastre.desde.x;
          const dy = p.y - arrastre.desde.y;
          const o = arrastre.original;
          if (o.tipo === "flecha") {
            return {
              ...o,
              x1: redondear(o.x1 + dx),
              y1: redondear(o.y1 + dy),
              x2: redondear(o.x2 + dx),
              y2: redondear(o.y2 + dy),
              cx: redondear(o.cx + dx),
              cy: redondear(o.cy + dy),
            };
          }
          return {
            ...o,
            x: redondear(limitar(o.x + dx, LIENZO.ancho)),
            y: redondear(limitar(o.y + dy, LIENZO.alto)),
          };
        }
        if (el.tipo !== "flecha") return el;
        if (arrastre.punto === "inicio") return { ...el, x1: p.x, y1: p.y };
        if (arrastre.punto === "fin") return { ...el, x2: p.x, y2: p.y };
        return { ...el, cx: p.x, cy: p.y };
      }),
    );
  }

  function actualizarSeleccionado(cambios: Partial<ElementoDiagrama>) {
    if (!seleccion) return;
    cambiar(
      elementos.map((e) => (e.id === seleccion ? ({ ...e, ...cambios } as ElementoDiagrama) : e)),
    );
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await guardarJugada(jugada.id, {
        nombre: meta.nombre,
        tipo: meta.tipo,
        categoria: meta.categoria,
        lado: meta.lado,
        numero: meta.numero.trim() === "" ? null : Number(meta.numero),
        sena: meta.sena,
        descripcion: meta.descripcion,
        roles,
        diagrama: { elementos },
      });
      if (!r.ok) {
        setMensaje({ tipo: "error", texto: r.error });
        return;
      }
      setSucio(false);
      setMensaje({ tipo: "ok", texto: "Guardado ✓" });
      router.refresh();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión. Probá de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  async function exportar() {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      await descargarSVGComoPNG(svg, nombreArchivo(meta.nombre));
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo exportar el PNG." });
    }
  }

  const actualizarMeta = <K extends keyof typeof meta>(k: K, v: (typeof meta)[K]) => {
    setMeta((m) => ({ ...m, [k]: v }));
    setSucio(true);
  };

  const ordenados = [...elementos].sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo]);
  const usadosEnDibujo = new Set(
    elementos.flatMap((e) => (e.tipo === "jugador" && e.rol ? [e.rol] : [])),
  );
  const boton = (activo: boolean) =>
    cn(
      "rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors",
      activo
        ? "bg-slate-900 text-white ring-slate-900"
        : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
    );
  const es = (t: Herramienta["tipo"], estilo?: EstiloFlecha) =>
    herramienta.tipo === t &&
    (!estilo || (herramienta.tipo === "flecha" && herramienta.estilo === estilo));

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="sticky top-14 z-10 space-y-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={boton(es("seleccionar"))}
            onClick={() => {
              setHerramienta({ tipo: "seleccionar" });
              setPendiente(null);
            }}
          >
            ↖ Mover
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
          <button
            type="button"
            className={boton(es("jugador"))}
            onClick={() => setHerramienta({ tipo: "jugador" })}
          >
            ● Jugador
          </button>
          {herramienta.tipo === "jugador" && (
            <select
              value={rolParaColocar ?? ""}
              onChange={(e) => setRolParaColocar(e.target.value || null)}
              aria-label="Rol del jugador a colocar"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                  {usadosEnDibujo.has(r.id) ? " ✓" : ""}
                </option>
              ))}
              <option value="">Sin rol</option>
            </select>
          )}
          <button
            type="button"
            className={boton(es("rival"))}
            onClick={() => setHerramienta({ tipo: "rival" })}
          >
            Rival
          </button>
          <button
            type="button"
            className={boton(es("pelota"))}
            onClick={() => setHerramienta({ tipo: "pelota" })}
          >
            ○ Pelota
          </button>
          <button
            type="button"
            className={boton(es("texto"))}
            onClick={() => setHerramienta({ tipo: "texto" })}
          >
            T Texto
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
          {ESTILOS_FLECHA.map((f) => (
            <button
              key={f.valor}
              type="button"
              title={f.label}
              className={cn(boton(es("flecha", f.valor)), "inline-flex items-center gap-1.5")}
              onClick={() => {
                setHerramienta({ tipo: "flecha", estilo: f.valor });
                setPendiente(null);
              }}
            >
              <svg viewBox="0 0 24 8" className="h-2.5 w-6" aria-hidden>
                <line
                  x1="1"
                  y1="4"
                  x2="19"
                  y2="4"
                  stroke={es("flecha", f.valor) ? "#fff" : f.color}
                  strokeWidth={f.valor === "desplazamiento" ? 1.5 : 2.5}
                  strokeDasharray={
                    f.valor === "secundario"
                      ? "4 3"
                      : f.valor === "desplazamiento"
                        ? "1.5 2"
                        : undefined
                  }
                />
                <path d="M18,0 L24,4 L18,8 z" fill={es("flecha", f.valor) ? "#fff" : f.color} />
              </svg>
              {f.label.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={boton(false)}
            onClick={deshacer}
            disabled={historial.length === 0}
          >
            ↶ Deshacer
          </button>
          <button
            type="button"
            className={boton(false)}
            onClick={borrarSeleccion}
            disabled={!seleccion}
          >
            Borrar seleccionado
          </button>
          <button
            type="button"
            className={boton(false)}
            onClick={() => {
              cambiar(espejar({ elementos }).elementos);
              const lado: LadoJugada =
                meta.lado === "izquierda"
                  ? "derecha"
                  : meta.lado === "derecha"
                    ? "izquierda"
                    : meta.lado;
              actualizarMeta("lado", lado);
            }}
          >
            ⇋ Espejar
          </button>
          <span className="ml-auto flex items-center gap-2">
            {mensaje && (
              <span
                className={cn(
                  "text-xs",
                  mensaje.tipo === "ok" ? "text-emerald-700" : "text-red-600",
                )}
              >
                {mensaje.texto}
              </span>
            )}
            {sucio && !mensaje && (
              <span className="text-xs text-amber-700">Cambios sin guardar</span>
            )}
            <Button variante="secondary" className="px-3 py-1.5" onClick={exportar}>
              ↓ PNG
            </Button>
            <Button className="px-3 py-1.5" cargando={guardando} onClick={guardar}>
              Guardar
            </Button>
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          {herramienta.tipo === "flecha"
            ? pendiente
              ? "Tocá dónde termina la flecha."
              : "Tocá dónde empieza la flecha (sobre un jugador, arranca desde él). Después arrastrá el punto del medio para curvarla."
            : herramienta.tipo === "seleccionar"
              ? "Arrastrá para mover. Supr borra, Ctrl+Z deshace, Esc cancela."
              : "Tocá la cancha para colocar. Esc para terminar."}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Lienzo */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
            className={cn(
              "block w-full touch-none select-none",
              herramienta.tipo !== "seleccionar" && "cursor-crosshair",
            )}
            onPointerDown={onFondo}
            onPointerMove={onMover}
            onPointerUp={() => setArrastre(null)}
            onPointerCancel={() => setArrastre(null)}
          >
            <Definiciones prefijo={PREFIJO} />
            <CanchaArea />
            <Encabezado
              jugada={{
                tipo: meta.tipo,
                categoria: meta.categoria,
                numero: meta.numero.trim() === "" ? null : Number(meta.numero),
                nombre: meta.nombre,
                sena: meta.sena,
              }}
            />
            {ordenados.map((el) => (
              <g key={el.id} onPointerDown={(e) => onElemento(e, el)} className="cursor-move">
                {/* Zona más ancha para tocar las flechas */}
                {el.tipo === "flecha" && (
                  <path
                    data-ui
                    d={`M${el.x1},${el.y1} Q${el.cx},${el.cy} ${el.x2},${el.y2}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={2}
                  />
                )}
                <ElementoSVG
                  elemento={el}
                  prefijo={PREFIJO}
                  roles={roles}
                  color={color}
                  seleccionado={el.id === seleccion}
                />
              </g>
            ))}
            {seleccionado?.tipo === "flecha" && (
              <g data-ui>
                {(
                  [
                    ["inicio", seleccionado.x1, seleccionado.y1],
                    ["fin", seleccionado.x2, seleccionado.y2],
                    ["control", seleccionado.cx, seleccionado.cy],
                  ] as const
                ).map(([p, x, y]) => (
                  <circle
                    key={p}
                    cx={x}
                    cy={y}
                    r={0.9}
                    fill={p === "control" ? "#ffffff" : "#2563eb"}
                    stroke="#2563eb"
                    strokeWidth={0.25}
                    className="cursor-grab"
                    onPointerDown={(e) => onManija(e, seleccionado.id, p)}
                  />
                ))}
              </g>
            )}
            {pendiente && (
              <circle data-ui cx={pendiente.x} cy={pendiente.y} r={0.6} fill="#2563eb" />
            )}
          </svg>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {seleccionado && seleccionado.tipo !== "pelota" && (
            <section className="space-y-2 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Elemento seleccionado</h3>
              {seleccionado.tipo === "jugador" && (
                <select
                  value={seleccionado.rol ?? ""}
                  onChange={(e) => actualizarSeleccionado({ rol: e.target.value || null })}
                  aria-label="Rol"
                  className={claseControl()}
                >
                  <option value="">Sin rol</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              )}
              {seleccionado.tipo === "texto" && (
                <input
                  value={seleccionado.texto}
                  onChange={(e) => actualizarSeleccionado({ texto: e.target.value.slice(0, 120) })}
                  aria-label="Texto"
                  className={claseControl()}
                />
              )}
              {seleccionado.tipo === "rival" && (
                <input
                  value={seleccionado.etiqueta ?? ""}
                  onChange={(e) =>
                    actualizarSeleccionado({ etiqueta: e.target.value.slice(0, 20) })
                  }
                  placeholder="Dorsal o letra (opcional)"
                  aria-label="Etiqueta del rival"
                  className={claseControl()}
                />
              )}
              {seleccionado.tipo === "flecha" && (
                <div className="flex flex-wrap gap-2">
                  <select
                    value={seleccionado.estilo}
                    onChange={(e) =>
                      actualizarSeleccionado({ estilo: e.target.value as EstiloFlecha })
                    }
                    aria-label="Estilo de flecha"
                    className={claseControl()}
                  >
                    {ESTILOS_FLECHA.map((f) => (
                      <option key={f.valor} value={f.valor}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variante="ghost"
                    className="px-3 py-1.5"
                    onClick={() =>
                      actualizarSeleccionado({
                        cx: redondear((seleccionado.x1 + seleccionado.x2) / 2),
                        cy: redondear((seleccionado.y1 + seleccionado.y2) / 2),
                      })
                    }
                  >
                    Hacer recta
                  </Button>
                </div>
              )}
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Datos de la jugada</h3>
            <input
              value={meta.nombre}
              onChange={(e) => actualizarMeta("nombre", e.target.value)}
              maxLength={80}
              placeholder="Nombre (ej. Balón al segundo palo)"
              aria-label="Nombre"
              className={claseControl()}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={meta.tipo}
                onChange={(e) => actualizarMeta("tipo", e.target.value as TipoJugada)}
                aria-label="Tipo"
                className={claseControl()}
              >
                {TIPOS_JUGADA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={meta.categoria}
                onChange={(e) => actualizarMeta("categoria", e.target.value as CategoriaJugada)}
                aria-label="Categoría"
                className={claseControl()}
              >
                {CATEGORIAS_JUGADA.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={meta.lado}
                onChange={(e) => actualizarMeta("lado", e.target.value as LadoJugada)}
                aria-label="Lado"
                className={claseControl()}
              >
                {LADOS_JUGADA.map((l) => (
                  <option key={l.valor} value={l.valor}>
                    {l.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={meta.numero}
                onChange={(e) => actualizarMeta("numero", e.target.value)}
                placeholder="Número"
                aria-label="Número de jugada"
                className={claseControl()}
              />
            </div>
            <input
              value={meta.sena}
              onChange={(e) => actualizarMeta("sena", e.target.value)}
              maxLength={120}
              placeholder="Seña (ej. Dos brazos arriba)"
              aria-label="Seña"
              className={claseControl()}
            />
            <textarea
              value={meta.descripcion}
              onChange={(e) => actualizarMeta("descripcion", e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Notas de la jugada (no salen en la placa)"
              aria-label="Descripción"
              className={claseControl()}
            />
          </section>

          <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Roles</h3>
            <p className="text-xs text-slate-500">
              En cada partido se elige qué jugador cumple cada rol, y la placa sale con su foto.
            </p>
            <ul className="space-y-1.5">
              {roles.map((r, i) => (
                <li key={r.id} className="flex items-center gap-1.5">
                  <input
                    value={r.corto}
                    onChange={(e) => {
                      setRoles((x) =>
                        x.map((y, j) =>
                          j === i ? { ...y, corto: e.target.value.toUpperCase().slice(0, 3) } : y,
                        ),
                      );
                      setSucio(true);
                    }}
                    aria-label="Abreviatura"
                    className="w-12 rounded-md border border-slate-300 px-1.5 py-1 text-center text-xs font-bold"
                  />
                  <input
                    value={r.nombre}
                    onChange={(e) => {
                      setRoles((x) =>
                        x.map((y, j) =>
                          j === i ? { ...y, nombre: e.target.value.slice(0, 40) } : y,
                        ),
                      );
                      setSucio(true);
                    }}
                    aria-label="Nombre del rol"
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                  />
                  <span
                    className={cn(
                      "w-4 text-xs",
                      usadosEnDibujo.has(r.id) ? "text-emerald-600" : "text-slate-300",
                    )}
                    title={usadosEnDibujo.has(r.id) ? "En el dibujo" : "No está en el dibujo"}
                  >
                    ●
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRoles((x) => x.filter((y) => y.id !== r.id));
                      cambiar(
                        elementos.map((e) =>
                          e.tipo === "jugador" && e.rol === r.id ? { ...e, rol: null } : e,
                        ),
                      );
                    }}
                    className="rounded px-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Quitar rol ${r.nombre}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {roles.length < 15 && (
              <button
                type="button"
                onClick={() => {
                  setRoles((x) => [...x, { id: nuevoId("r"), nombre: "Rol nuevo", corto: "R" }]);
                  setSucio(true);
                }}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                + Agregar rol
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
