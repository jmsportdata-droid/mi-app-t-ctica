import type { AbpPartido } from "./abp";
import type { AlineacionPartido } from "./alineacion";
import type { JugadorAtributos } from "./atributos";
import type { Equipo } from "./equipo";
import type { EventoPartido } from "./evento";
import type { Jugador } from "./jugador";
import type { InformeRival, Partido, PlanPartido } from "./partido";

/**
 * Construye Row/Insert/Update de una tabla.
 * `Requeridos` son las columnas obligatorias al insertar (sin default en BD).
 */
type Tabla<
  Row extends Record<string, unknown>,
  Requeridos extends keyof Row,
  Relaciones extends unknown[] = [],
> = {
  Row: Row;
  Insert: Pick<Row, Requeridos> & Partial<Omit<Row, Requeridos>>;
  Update: Partial<Row>;
  Relationships: Relaciones;
};

/**
 * Tipado del esquema de Supabase. Se puede regenerar con:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export type Database = {
  public: {
    Tables: {
      jugadores: Tabla<Jugador, "nombre" | "fecha_nac" | "posicion">;
      equipos: Tabla<Equipo, "nombre">;
      partidos: Tabla<
        Partido,
        "fecha" | "rival_id",
        [
          {
            foreignKeyName: "partidos_rival_id_fkey";
            columns: ["rival_id"];
            isOneToOne: false;
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ]
      >;
      plan_partido: Tabla<
        PlanPartido,
        "partido_id",
        [
          {
            foreignKeyName: "plan_partido_partido_id_fkey";
            columns: ["partido_id"];
            isOneToOne: true;
            referencedRelation: "partidos";
            referencedColumns: ["id"];
          },
        ]
      >;
      informe_rival: Tabla<
        InformeRival,
        "partido_id",
        [
          {
            foreignKeyName: "informe_rival_partido_id_fkey";
            columns: ["partido_id"];
            isOneToOne: true;
            referencedRelation: "partidos";
            referencedColumns: ["id"];
          },
        ]
      >;
      jugador_atributos: Tabla<JugadorAtributos, "jugador_id">;
      alineacion_partido: Tabla<AlineacionPartido, "partido_id">;
      abp_partido: Tabla<AbpPartido, "partido_id" | "tipo" | "categoria" | "indice">;
      eventos_partido: Tabla<EventoPartido, "partido_id" | "tipo" | "minuto">;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
