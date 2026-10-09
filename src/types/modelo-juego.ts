import type { Enums, Tables } from "./database";

export type MomentoJuego = Enums<"momento_juego">;

export const MOMENTOS = [
  {
    valor: "organizacion_ofensiva",
    label: "Organización ofensiva",
    corto: "Ofensiva",
    punto: "bg-emerald-500",
  },
  {
    valor: "organizacion_defensiva",
    label: "Organización defensiva",
    corto: "Defensiva",
    punto: "bg-sky-500",
  },
  {
    valor: "transicion_ataque_defensa",
    label: "Transición ataque-defensa",
    corto: "Trans. defensiva",
    punto: "bg-rose-500",
  },
  {
    valor: "transicion_defensa_ataque",
    label: "Transición defensa-ataque",
    corto: "Trans. ofensiva",
    punto: "bg-amber-500",
  },
  { valor: "balon_parado", label: "Pelota parada", corto: "Pelota parada", punto: "bg-violet-500" },
] as const satisfies readonly {
  valor: MomentoJuego;
  label: string;
  /** Para chips y gráficos */
  corto: string;
  punto: string;
}[];

export const INFO_MOMENTO = Object.fromEntries(MOMENTOS.map((m) => [m.valor, m])) as Record<
  MomentoJuego,
  (typeof MOMENTOS)[number]
>;

/** Fila de "principios_juego": principio (padre_id null) o subprincipio. */
export type PrincipioJuego = Tables<"principios_juego">;
export type ContenidoTecnico = Tables<"contenidos_tecnicos">;
export type ModeloJuego = Tables<"modelos_juego">;

export interface PrincipioConSubs {
  principio: PrincipioJuego;
  subprincipios: PrincipioJuego[];
}

/** Principios por momento, cada uno con sus subprincipios, ordenados. */
export type ArbolModelo = Record<MomentoJuego, PrincipioConSubs[]>;

export function construirArbol(principios: PrincipioJuego[]): ArbolModelo {
  const porOrden = (a: PrincipioJuego, b: PrincipioJuego) =>
    a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es");
  const arbol = Object.fromEntries(MOMENTOS.map((m) => [m.valor, []])) as unknown as ArbolModelo;
  const principales = principios.filter((p) => p.padre_id === null).sort(porOrden);
  for (const principio of principales) {
    arbol[principio.momento].push({
      principio,
      subprincipios: principios.filter((p) => p.padre_id === principio.id).sort(porOrden),
    });
  }
  return arbol;
}

export interface EtiquetaObjetivo {
  momento: MomentoJuego;
  /** "Presión tras pérdida › Reacción en 3 segundos" o solo el principio */
  texto: string;
  nombre: string;
}

/** id → momento y texto completo de cada principio o subprincipio. */
export function indiceObjetivos(principios: PrincipioJuego[]): Map<string, EtiquetaObjetivo> {
  const porId = new Map(principios.map((p) => [p.id, p]));
  return new Map(
    principios.map((p) => {
      const padre = p.padre_id ? porId.get(p.padre_id) : undefined;
      return [
        p.id,
        {
          momento: p.momento,
          texto: padre ? `${padre.nombre} › ${p.nombre}` : p.nombre,
          nombre: p.nombre,
        },
      ];
    }),
  );
}
