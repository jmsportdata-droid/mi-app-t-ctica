export const TIPOS_ABP = [
  { valor: "ofensivo", label: "Ofensivo" },
  { valor: "defensivo", label: "Defensivo" },
] as const;
export type TipoAbp = (typeof TIPOS_ABP)[number]["valor"];

export const CATEGORIAS_ABP = [
  { valor: "corner", titulo: "Córners", singular: "Córner", tarjetas: 4 },
  { valor: "falta_lateral", titulo: "Faltas laterales", singular: "Falta lateral", tarjetas: 2 },
] as const;
export type CategoriaAbp = (typeof CATEGORIAS_ABP)[number]["valor"];

export const CAMPOS_ABP = ["descripcion", "vimeo_url"] as const;
export type CampoAbp = (typeof CAMPOS_ABP)[number];

/** Fila de la tabla "abp_partido" (una por tarjeta). */
export type AbpPartido = {
  partido_id: string;
  tipo: TipoAbp;
  categoria: CategoriaAbp;
  indice: number;
  descripcion: string | null;
  vimeo_url: string | null;
  updated_at: string;
};

export interface ClaveAbp {
  tipo: TipoAbp;
  categoria: CategoriaAbp;
  indice: number;
}

export function idTarjetaAbp({ tipo, categoria, indice }: ClaveAbp): string {
  return `${tipo}:${categoria}:${indice}`;
}
