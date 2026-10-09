import { z } from "zod";
import type {
  CategoriaJugada,
  Diagrama,
  ElementoDiagrama,
  EstiloFlecha,
  LadoJugada,
  RolJugada,
  TipoJugada,
} from "@/types/jugada";

/**
 * Lienzo de 80 × 45 (16:9) con el área vista desde arriba, en metros:
 * línea de fondo arriba (y = 7), bandas en x = 6 y x = 74 (68 m de ancho).
 */
export const LIENZO = { ancho: 80, alto: 45 } as const;
export const CANCHA = {
  fondo: 7,
  bandaIzq: 6,
  bandaDer: 74,
  centro: 40,
  area: { x1: 19.84, x2: 60.16, y2: 23.5 },
  areaChica: { x1: 30.84, x2: 49.16, y2: 12.5 },
  arco: { x1: 36.34, x2: 43.66, y1: 5 },
  penal: { x: 40, y: 18 },
} as const;

const num = z.number().min(-10).max(100);
const id = z.string().min(1).max(40);

const elementoSchema: z.ZodType<ElementoDiagrama> = z.union([
  z.object({ id, tipo: z.literal("jugador"), rol: z.string().max(40).nullable(), x: num, y: num }),
  z.object({
    id,
    tipo: z.literal("rival"),
    x: num,
    y: num,
    etiqueta: z.string().max(20).optional(),
  }),
  z.object({ id, tipo: z.literal("pelota"), x: num, y: num }),
  z.object({ id, tipo: z.literal("texto"), x: num, y: num, texto: z.string().max(120) }),
  z.object({
    id,
    tipo: z.literal("flecha"),
    estilo: z.enum(["pelota", "movimiento", "secundario", "bloqueo", "desplazamiento"]),
    x1: num,
    y1: num,
    x2: num,
    y2: num,
    cx: num,
    cy: num,
  }),
]);

export const diagramaSchema: z.ZodType<Diagrama> = z.object({
  elementos: z.array(elementoSchema).max(80, "Hasta 80 elementos por jugada"),
});

export const rolesSchema = z
  .array(
    z.object({
      id,
      nombre: z.string().trim().min(1, "Cada rol necesita nombre").max(40),
      corto: z.string().trim().min(1).max(3),
    }),
  )
  .max(15, "Hasta 15 roles por jugada");

/** Espeja la jugada de un lado al otro (córner de la izquierda → de la derecha). */
export function espejar(diagrama: Diagrama): Diagrama {
  const x = (v: number) => Math.round((LIENZO.ancho - v) * 100) / 100;
  return {
    elementos: diagrama.elementos.map((e) =>
      e.tipo === "flecha" ? { ...e, x1: x(e.x1), x2: x(e.x2), cx: x(e.cx) } : { ...e, x: x(e.x) },
    ),
  };
}

let contador = 0;
/** Id corto para elementos y roles (no necesita ser global). */
export function nuevoId(prefijo = "e"): string {
  contador += 1;
  return `${prefijo}${Date.now().toString(36)}${contador.toString(36)}`;
}

function roles(lista: [string, string][]): RolJugada[] {
  return lista.map(([nombre, corto], i) => ({ id: `r${i + 1}`, nombre, corto }));
}

/** Roles con los que arranca una jugada nueva, según el tipo y la categoría. */
export function rolesPorDefecto(tipo: TipoJugada, categoria: CategoriaJugada): RolJugada[] {
  if (tipo === "defensivo") {
    return roles([
      ["Arquero", "ARQ"],
      ["Zona 1° palo", "Z1"],
      ["Zona área chica", "Z2"],
      ["Zona 2° palo", "Z3"],
      ["Marca 1", "M1"],
      ["Marca 2", "M2"],
      ["Marca 3", "M3"],
      ["Marca 4", "M4"],
      ["Segunda pelota", "SP"],
      ["Contra", "CT"],
    ]);
  }
  if (categoria === "corner") {
    return roles([
      ["Ejecutor", "EJ"],
      ["1° palo", "1P"],
      ["2° palo", "2P"],
      ["Punto penal", "PP"],
      ["Bloqueo al arquero", "BA"],
      ["Área chica", "AC"],
      ["Corto", "CO"],
      ["Rebote", "RB"],
      ["Vigilancia 1", "V1"],
      ["Vigilancia 2", "V2"],
    ]);
  }
  return roles([
    ["Ejecutor", "EJ"],
    ["Línea 1", "L1"],
    ["Línea 2", "L2"],
    ["Línea 3", "L3"],
    ["Línea 4", "L4"],
    ["Línea 5", "L5"],
    ["Línea 6", "L6"],
    ["Rebote", "RB"],
    ["Vigilancia 1", "V1"],
    ["Vigilancia 2", "V2"],
  ]);
}

// ---------- Jugadas base (del resumen de ABP del cuerpo técnico) ----------

const j = (n: number, rol: string, x: number, y: number): ElementoDiagrama => ({
  id: `j${n}`,
  tipo: "jugador",
  rol,
  x,
  y,
});
const f = (
  n: number,
  estilo: EstiloFlecha,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curva: [number, number] | null = null,
): ElementoDiagrama => ({
  id: `f${n}`,
  tipo: "flecha",
  estilo,
  x1,
  y1,
  x2,
  y2,
  cx: curva ? curva[0] : (x1 + x2) / 2,
  cy: curva ? curva[1] : (y1 + y2) / 2,
});
const pelota = (x: number, y: number): ElementoDiagrama => ({ id: "p1", tipo: "pelota", x, y });
const rival = (n: number, x: number, y: number): ElementoDiagrama => ({
  id: `rv${n}`,
  tipo: "rival",
  x,
  y,
});

export interface JugadaBase {
  tipo: TipoJugada;
  categoria: CategoriaJugada;
  lado: LadoJugada;
  numero: number;
  nombre: string;
  sena: string;
  roles: RolJugada[];
  diagrama: Diagrama;
}

const ROLES_CORNER = rolesPorDefecto("ofensivo", "corner");
const ROLES_FALTA = rolesPorDefecto("ofensivo", "falta_lateral");

export const JUGADAS_BASE: JugadaBase[] = [
  {
    tipo: "ofensivo",
    categoria: "corner",
    lado: "izquierda",
    numero: 1,
    nombre: "Balón al segundo palo",
    sena: "Primer córner a favor",
    roles: ROLES_CORNER,
    diagrama: {
      elementos: [
        j(1, "r1", 6.8, 7.6),
        j(2, "r2", 32, 24.5),
        j(3, "r6", 37, 24.5),
        j(4, "r4", 42, 24.5),
        j(5, "r3", 48, 24.5),
        j(6, "r5", 54, 19),
        j(7, "r7", 9, 13),
        j(8, "r9", 34, 31),
        j(9, "r10", 48, 31),
        j(10, "r8", 41, 39),
        pelota(7.6, 8.2),
        f(1, "pelota", 8, 8.5, 46.5, 17.5, [28, 2]),
        f(2, "movimiento", 32, 23, 33.5, 16),
        f(3, "movimiento", 37, 23, 39, 15),
        f(4, "movimiento", 42, 23, 46, 17),
        f(5, "movimiento", 48, 23, 49, 18.5),
        f(6, "bloqueo", 54, 17.5, 50, 11),
      ],
    },
  },
  {
    tipo: "ofensivo",
    categoria: "corner",
    lado: "izquierda",
    numero: 2,
    nombre: "1° palo, cargamos zona",
    sena: "Levanta la pelota",
    roles: ROLES_CORNER,
    diagrama: {
      elementos: [
        j(1, "r1", 6.8, 7.6),
        j(2, "r2", 40, 13.5),
        j(3, "r6", 40, 16.5),
        j(4, "r4", 40, 19.5),
        j(5, "r3", 40, 22.5),
        j(6, "r5", 40, 25.5),
        j(7, "r7", 9, 13),
        j(8, "r9", 33, 30),
        j(9, "r10", 48, 30),
        j(10, "r8", 41, 38),
        pelota(7.6, 8.2),
        f(1, "pelota", 8, 8.4, 33, 11.5),
        f(2, "movimiento", 39, 12.5, 34, 10.5),
        f(3, "movimiento", 39.5, 15.5, 37, 9),
        f(4, "movimiento", 40.5, 18.5, 41, 8.5),
        f(5, "movimiento", 41, 21.5, 46, 10),
        f(6, "secundario", 41.5, 24.5, 44, 14),
      ],
    },
  },
  {
    tipo: "ofensivo",
    categoria: "corner",
    lado: "derecha",
    numero: 3,
    nombre: "Todos cerrados, corto y centro",
    sena: "Dos brazos arriba",
    roles: ROLES_CORNER,
    diagrama: {
      elementos: [
        j(1, "r1", 73.2, 7.6),
        j(2, "r7", 70, 11),
        j(3, "r2", 32, 9.5),
        j(4, "r6", 35.5, 9.5),
        j(5, "r5", 39, 9.5),
        j(6, "r4", 42.5, 9.5),
        j(7, "r3", 46, 9.5),
        j(8, "r9", 33, 29),
        j(9, "r8", 52, 27),
        j(10, "r10", 41, 38),
        pelota(72.4, 8.2),
        f(1, "pelota", 72, 8.6, 67.5, 12.5),
        f(2, "pelota", 67.5, 13, 53, 25.5),
        f(3, "pelota", 53, 25, 41, 15.5, [50, 16]),
        f(4, "secundario", 70, 12, 64, 16),
        f(5, "bloqueo", 39, 11, 40.5, 14.5, [37.5, 13.5]),
      ],
    },
  },
  {
    tipo: "ofensivo",
    categoria: "corner",
    lado: "derecha",
    numero: 4,
    nombre: "Liberar punto penal",
    sena: "Levanta ambos brazos",
    roles: ROLES_CORNER,
    diagrama: {
      elementos: [
        j(1, "r1", 73.2, 7.6),
        j(2, "r2", 31, 13),
        j(3, "r6", 35, 15),
        j(4, "r3", 46, 15),
        j(5, "r5", 50, 13),
        j(6, "r4", 39, 16.5),
        j(7, "r8", 33, 30),
        j(8, "r9", 47, 30),
        j(9, "r10", 40, 38),
        pelota(72.4, 8.2),
        f(1, "pelota", 72, 8.6, 41, 18.5, [58, 23]),
        f(2, "bloqueo", 31, 11.5, 33, 8.5),
        f(3, "bloqueo", 35, 13.5, 37, 9.5),
        f(4, "bloqueo", 46, 13.5, 45, 9.5),
        f(5, "bloqueo", 50, 11.5, 51, 8.5),
        f(6, "movimiento", 39, 18, 40.5, 18.5),
      ],
    },
  },
  {
    tipo: "ofensivo",
    categoria: "falta_lateral",
    lado: "ambos",
    numero: 5,
    nombre: "Del 1° palo al punto penal",
    sena: "Pateador levanta un brazo",
    roles: ROLES_FALTA,
    diagrama: {
      elementos: [
        j(1, "r1", 17, 33),
        j(2, "r9", 12, 31),
        rival(1, 29, 24),
        j(3, "r2", 33, 24.5),
        j(4, "r3", 37, 24.5),
        j(5, "r4", 41, 24.5),
        j(6, "r5", 45, 24.5),
        j(7, "r6", 49, 24.5),
        j(8, "r7", 53, 24.5),
        j(9, "r8", 37, 33),
        j(10, "r10", 47, 33),
        pelota(18, 31.5),
        f(1, "pelota", 18, 31, 36.5, 13, [24, 16]),
        f(2, "movimiento", 33, 23, 35.5, 14),
        f(3, "movimiento", 37, 23, 37.5, 14),
        f(4, "movimiento", 41, 23, 39.5, 14.5),
        f(5, "bloqueo", 45, 23, 41, 16.5),
        f(6, "bloqueo", 49, 23, 43, 17),
        f(7, "bloqueo", 53, 23, 45, 17.5),
      ],
    },
  },
  {
    tipo: "ofensivo",
    categoria: "falta_lateral",
    lado: "ambos",
    numero: 6,
    nombre: "Del punto penal al 2° palo",
    sena: "Pateador levanta ambos brazos",
    roles: ROLES_FALTA,
    diagrama: {
      elementos: [
        j(1, "r1", 17, 33),
        j(2, "r9", 12, 31),
        rival(1, 29, 24),
        j(3, "r2", 33, 24.5),
        j(4, "r3", 37, 24.5),
        j(5, "r4", 41, 24.5),
        j(6, "r5", 45, 24.5),
        j(7, "r6", 49, 24.5),
        j(8, "r7", 53, 24.5),
        j(9, "r8", 37, 33),
        j(10, "r10", 47, 33),
        pelota(18, 31.5),
        f(1, "pelota", 18, 31, 45, 14, [30, 13]),
        f(2, "bloqueo", 33, 23, 34, 17),
        f(3, "bloqueo", 37, 23, 37.5, 17),
        f(4, "bloqueo", 41, 23, 40.5, 17.5),
        f(5, "movimiento", 45, 23, 43.5, 16),
        f(6, "movimiento", 49, 23, 46, 14.5),
        f(7, "movimiento", 53, 23, 48.5, 14),
      ],
    },
  },
  {
    tipo: "defensivo",
    categoria: "corner",
    lado: "izquierda",
    numero: 7,
    nombre: "Marca mixta",
    sena: "Córner en contra",
    roles: rolesPorDefecto("defensivo", "corner"),
    diagrama: {
      elementos: [
        rival(1, 6.8, 7.6),
        j(1, "r1", 40, 8),
        j(2, "r2", 35, 9.5),
        j(3, "r3", 40, 11.5),
        j(4, "r4", 45, 9.5),
        rival(2, 33, 17),
        rival(3, 39, 18),
        rival(4, 45, 17),
        rival(5, 50, 19),
        j(5, "r5", 33.5, 15),
        j(6, "r6", 39.5, 16),
        j(7, "r7", 45.5, 15),
        j(8, "r8", 50.5, 17),
        j(9, "r9", 40, 26),
        j(10, "r10", 55, 32),
        pelota(7.6, 8.2),
        f(1, "pelota", 8, 8.5, 38, 13, [22, 4]),
        f(2, "desplazamiento", 40, 26, 40, 21),
      ],
    },
  },
];
