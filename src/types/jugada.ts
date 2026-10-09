import type { Enums, Tables } from "./database";

export type CategoriaJugada = Enums<"categoria_jugada">;
export type LadoJugada = Enums<"lado_jugada">;
export type TipoJugada = Enums<"tipo_abp">;

export type FilaJugada = Tables<"jugadas">;

/** Un rol de la jugada: lo cumple el jugador que se asigne en cada partido. */
export interface RolJugada {
  id: string;
  nombre: string;
  /** Hasta 3 letras, para mostrar en el dibujo si no hay jugador asignado */
  corto: string;
}

export type EstiloFlecha = "pelota" | "movimiento" | "secundario" | "bloqueo" | "desplazamiento";

interface Base {
  id: string;
  x: number;
  y: number;
}

export type ElementoDiagrama =
  | (Base & { tipo: "jugador"; rol: string | null })
  | (Base & { tipo: "rival"; etiqueta?: string })
  | (Base & { tipo: "pelota" })
  | (Base & { tipo: "texto"; texto: string })
  | {
      id: string;
      tipo: "flecha";
      estilo: EstiloFlecha;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      /** Punto de control de la curva (igual al medio = recta) */
      cx: number;
      cy: number;
    };

export interface Diagrama {
  elementos: ElementoDiagrama[];
}

/** Jugada con roles y diagrama ya tipados. */
export interface Jugada extends Omit<FilaJugada, "roles" | "diagrama"> {
  roles: RolJugada[];
  diagrama: Diagrama;
}

export const TIPOS_JUGADA = [
  { valor: "ofensivo", label: "A favor" },
  { valor: "defensivo", label: "En contra" },
] as const satisfies readonly { valor: TipoJugada; label: string }[];

export const CATEGORIAS_JUGADA = [
  { valor: "corner", label: "Córner" },
  { valor: "falta_lateral", label: "Falta lateral" },
  { valor: "falta_frontal", label: "Falta frontal" },
  { valor: "lateral", label: "Saque de banda" },
  { valor: "otro", label: "Otra" },
] as const satisfies readonly { valor: CategoriaJugada; label: string }[];

export const LADOS_JUGADA = [
  { valor: "izquierda", label: "Izquierda" },
  { valor: "derecha", label: "Derecha" },
  { valor: "ambos", label: "Ambos lados" },
] as const satisfies readonly { valor: LadoJugada; label: string }[];

export const ESTILOS_FLECHA = [
  { valor: "pelota", label: "Pelota", color: "#111827", trazo: "", ancho: 0.4 },
  { valor: "movimiento", label: "Movimiento", color: "#3f7d3a", trazo: "", ancho: 0.45 },
  {
    valor: "secundario",
    label: "Movimiento secundario",
    color: "#5b9a55",
    trazo: "1.2 0.8",
    ancho: 0.4,
  },
  { valor: "bloqueo", label: "Bloqueo / liberar zona", color: "#e53935", trazo: "", ancho: 0.45 },
  {
    valor: "desplazamiento",
    label: "Desplazamiento",
    color: "#111827",
    trazo: "0.3 0.5",
    ancho: 0.25,
  },
] as const satisfies readonly {
  valor: EstiloFlecha;
  label: string;
  color: string;
  trazo: string;
  ancho: number;
}[];

export const INFO_ESTILO = Object.fromEntries(ESTILOS_FLECHA.map((e) => [e.valor, e])) as Record<
  EstiloFlecha,
  (typeof ESTILOS_FLECHA)[number]
>;
export const LABEL_CATEGORIA = Object.fromEntries(
  CATEGORIAS_JUGADA.map((c) => [c.valor, c.label]),
) as Record<CategoriaJugada, string>;
export const LABEL_TIPO_JUGADA = Object.fromEntries(
  TIPOS_JUGADA.map((t) => [t.valor, t.label]),
) as Record<TipoJugada, string>;

/** Título como en las placas del cuerpo técnico: "CÓRNER A FAVOR". */
export function tituloJugada(j: Pick<Jugada, "categoria" | "tipo">): string {
  return `${LABEL_CATEGORIA[j.categoria]} ${LABEL_TIPO_JUGADA[j.tipo].toLowerCase()}`.toUpperCase();
}

/** Datos del jugador que se dibujan en el lugar de un rol. */
export interface JugadorEnDiagrama {
  nombre: string;
  numero: number | null;
  fotoUrl: string | null;
}
