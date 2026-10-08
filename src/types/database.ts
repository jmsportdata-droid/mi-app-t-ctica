export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      abp_partido: {
        Row: {
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_abp"]
          descripcion: string | null
          indice: number
          partido_id: string
          tipo: Database["public"]["Enums"]["tipo_abp"]
          vimeo_url: string | null
        }
        Insert: {
          actualizado_en?: string
          categoria: Database["public"]["Enums"]["categoria_abp"]
          descripcion?: string | null
          indice: number
          partido_id: string
          tipo: Database["public"]["Enums"]["tipo_abp"]
          vimeo_url?: string | null
        }
        Update: {
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria_abp"]
          descripcion?: string | null
          indice?: number
          partido_id?: string
          tipo?: Database["public"]["Enums"]["tipo_abp"]
          vimeo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abp_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      alineacion_partido: {
        Row: {
          actualizado_en: string
          formacion: Database["public"]["Enums"]["formacion"]
          partido_id: string
          suplentes: string[]
          titulares: string[]
        }
        Insert: {
          actualizado_en?: string
          formacion?: Database["public"]["Enums"]["formacion"]
          partido_id: string
          suplentes?: string[]
          titulares?: string[]
        }
        Update: {
          actualizado_en?: string
          formacion?: Database["public"]["Enums"]["formacion"]
          partido_id?: string
          suplentes?: string[]
          titulares?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "alineacion_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      cuerpos_tecnicos: {
        Row: {
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      disponibilidad: {
        Row: {
          actualizado_en: string
          cargado_por: string | null
          creado_en: string
          estado: Database["public"]["Enums"]["estado_disponibilidad"]
          fecha: string
          fecha_regreso: string | null
          id: string
          jugador_id: string
        }
        Insert: {
          actualizado_en?: string
          cargado_por?: string | null
          creado_en?: string
          estado: Database["public"]["Enums"]["estado_disponibilidad"]
          fecha: string
          fecha_regreso?: string | null
          id?: string
          jugador_id: string
        }
        Update: {
          actualizado_en?: string
          cargado_por?: string | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_disponibilidad"]
          fecha?: string
          fecha_regreso?: string | null
          id?: string
          jugador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidad_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          creado_en: string
          cuerpo_tecnico_id: string
          escudo_ruta: string | null
          estadio: string | null
          id: string
          ids_externos: Json
          liga: string | null
          nombre: string
        }
        Insert: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          escudo_ruta?: string | null
          estadio?: string | null
          id?: string
          ids_externos?: Json
          liga?: string | null
          nombre: string
        }
        Update: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          escudo_ruta?: string | null
          estadio?: string | null
          id?: string
          ids_externos?: Json
          liga?: string | null
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_partido: {
        Row: {
          creado_en: string
          descripcion: string | null
          id: string
          jugador_id: string | null
          minuto: number
          partido_id: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
          x: number | null
          y: number | null
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          id?: string
          jugador_id?: string | null
          minuto: number
          partido_id: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
          x?: number | null
          y?: number | null
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          id?: string
          jugador_id?: string | null
          minuto?: number
          partido_id?: string
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_partido_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      informe_rival: {
        Row: {
          actualizado_en: string
          partido_id: string
          slides_url: string | null
          tags: Database["public"]["Enums"]["etiqueta_informe"][]
          vimeo_url: string | null
        }
        Insert: {
          actualizado_en?: string
          partido_id: string
          slides_url?: string | null
          tags?: Database["public"]["Enums"]["etiqueta_informe"][]
          vimeo_url?: string | null
        }
        Update: {
          actualizado_en?: string
          partido_id?: string
          slides_url?: string | null
          tags?: Database["public"]["Enums"]["etiqueta_informe"][]
          vimeo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "informe_rival_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      jugadores: {
        Row: {
          altura_cm: number | null
          creado_en: string
          fecha_nac: string | null
          foto_ruta: string | null
          id: string
          ids_externos: Json
          nacionalidad: string | null
          nombre: string
          numero: number | null
          pie_habil: Database["public"]["Enums"]["pie_habil"] | null
          posicion: Database["public"]["Enums"]["linea_jugador"]
          posiciones: string[]
          temporada_id: string
        }
        Insert: {
          altura_cm?: number | null
          creado_en?: string
          fecha_nac?: string | null
          foto_ruta?: string | null
          id?: string
          ids_externos?: Json
          nacionalidad?: string | null
          nombre: string
          numero?: number | null
          pie_habil?: Database["public"]["Enums"]["pie_habil"] | null
          posicion: Database["public"]["Enums"]["linea_jugador"]
          posiciones?: string[]
          temporada_id: string
        }
        Update: {
          altura_cm?: number | null
          creado_en?: string
          fecha_nac?: string | null
          foto_ruta?: string | null
          id?: string
          ids_externos?: Json
          nacionalidad?: string | null
          nombre?: string
          numero?: number | null
          pie_habil?: Database["public"]["Enums"]["pie_habil"] | null
          posicion?: Database["public"]["Enums"]["linea_jugador"]
          posiciones?: string[]
          temporada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jugadores_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: false
            referencedRelation: "temporadas"
            referencedColumns: ["id"]
          },
        ]
      }
      miembros: {
        Row: {
          creado_en: string
          cuerpo_tecnico_id: string
          email: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Insert: {
          creado_en?: string
          cuerpo_tecnico_id: string
          email: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Update: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          email?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_miembro"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      partidos: {
        Row: {
          competicion: string | null
          creado_en: string
          es_local: boolean
          estadio: string | null
          estado: Database["public"]["Enums"]["estado_partido"]
          fecha: string
          id: string
          ids_externos: Json
          rival_id: string
          temporada_id: string
          video_url: string | null
        }
        Insert: {
          competicion?: string | null
          creado_en?: string
          es_local?: boolean
          estadio?: string | null
          estado?: Database["public"]["Enums"]["estado_partido"]
          fecha: string
          id?: string
          ids_externos?: Json
          rival_id: string
          temporada_id: string
          video_url?: string | null
        }
        Update: {
          competicion?: string | null
          creado_en?: string
          es_local?: boolean
          estadio?: string | null
          estado?: Database["public"]["Enums"]["estado_partido"]
          fecha?: string
          id?: string
          ids_externos?: Json
          rival_id?: string
          temporada_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partidos_rival_id_fkey"
            columns: ["rival_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: false
            referencedRelation: "temporadas"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_partido: {
        Row: {
          actualizado_en: string
          ataque_imagen1: string | null
          ataque_imagen2: string | null
          ataque_notas: string | null
          ataque_pdf: string | null
          ataque_vimeo: string | null
          defensa_imagen1: string | null
          defensa_imagen2: string | null
          defensa_notas: string | null
          defensa_pdf: string | null
          defensa_vimeo: string | null
          partido_id: string
          transicion_imagen1: string | null
          transicion_imagen2: string | null
          transicion_notas: string | null
          transicion_pdf: string | null
          transicion_vimeo: string | null
        }
        Insert: {
          actualizado_en?: string
          ataque_imagen1?: string | null
          ataque_imagen2?: string | null
          ataque_notas?: string | null
          ataque_pdf?: string | null
          ataque_vimeo?: string | null
          defensa_imagen1?: string | null
          defensa_imagen2?: string | null
          defensa_notas?: string | null
          defensa_pdf?: string | null
          defensa_vimeo?: string | null
          partido_id: string
          transicion_imagen1?: string | null
          transicion_imagen2?: string | null
          transicion_notas?: string | null
          transicion_pdf?: string | null
          transicion_vimeo?: string | null
        }
        Update: {
          actualizado_en?: string
          ataque_imagen1?: string | null
          ataque_imagen2?: string | null
          ataque_notas?: string | null
          ataque_pdf?: string | null
          ataque_vimeo?: string | null
          defensa_imagen1?: string | null
          defensa_imagen2?: string | null
          defensa_notas?: string | null
          defensa_pdf?: string | null
          defensa_vimeo?: string | null
          partido_id?: string
          transicion_imagen1?: string | null
          transicion_imagen2?: string | null
          transicion_notas?: string | null
          transicion_pdf?: string | null
          transicion_vimeo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      temporadas: {
        Row: {
          activa: boolean
          archivada_en: string | null
          club: string
          color_principal: string
          creado_en: string
          cuerpo_tecnico_id: string
          escudo_ruta: string | null
          etiqueta: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          ids_externos: Json
        }
        Insert: {
          activa?: boolean
          archivada_en?: string | null
          club: string
          color_principal?: string
          creado_en?: string
          cuerpo_tecnico_id: string
          escudo_ruta?: string | null
          etiqueta: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          ids_externos?: Json
        }
        Update: {
          activa?: boolean
          archivada_en?: string | null
          club?: string
          color_principal?: string
          creado_en?: string
          cuerpo_tecnico_id?: string
          escudo_ruta?: string | null
          etiqueta?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          ids_externos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "temporadas_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activar_temporada: { Args: { p_temporada: string }; Returns: undefined }
      crear_cuerpo_tecnico: {
        Args: {
          p_club: string
          p_etiqueta: string
          p_fecha_fin: string
          p_fecha_inicio: string
          p_mi_nombre: string
          p_nombre: string
        }
        Returns: string
      }
      disponibilidad_del_dia: {
        Args: { p_fecha: string; p_temporada: string }
        Returns: {
          desde: string
          estado: Database["public"]["Enums"]["estado_disponibilidad"]
          fecha_regreso: string
          jugador_id: string
        }[]
      }
      es_entrenador: { Args: { p_cuerpo_tecnico: string }; Returns: boolean }
      es_miembro: { Args: { p_cuerpo_tecnico: string }; Returns: boolean }
      es_miembro_jugador: { Args: { p_jugador: string }; Returns: boolean }
      es_miembro_partido: { Args: { p_partido: string }; Returns: boolean }
      es_miembro_temporada: { Args: { p_temporada: string }; Returns: boolean }
      jugador_del_partido: {
        Args: { p_jugador: string; p_partido: string }
        Returns: boolean
      }
      mi_cuerpo_tecnico: { Args: never; Returns: string }
      rival_valido: {
        Args: { p_rival: string; p_temporada: string }
        Returns: boolean
      }
      tiene_rol: {
        Args: {
          p_cuerpo_tecnico: string
          p_roles: Database["public"]["Enums"]["rol_miembro"][]
        }
        Returns: boolean
      }
    }
    Enums: {
      categoria_abp: "corner" | "falta_lateral"
      estado_disponibilidad: "disponible" | "limitado" | "baja" | "sancionado"
      estado_partido: "planificado" | "jugado"
      etiqueta_informe:
        | "salida_balon"
        | "presion"
        | "bloque"
        | "linea_defensiva"
      formacion: "4-3-3" | "4-4-2" | "4-2-3-1" | "5-3-2"
      linea_jugador: "POR" | "DEF" | "CEN" | "DEL"
      pie_habil: "derecho" | "izquierdo" | "ambos"
      rol_miembro: "entrenador" | "ayudante" | "preparador_fisico" | "analista"
      tipo_abp: "ofensivo" | "defensivo"
      tipo_evento: "gol" | "ocasion" | "duelo" | "nota"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_abp: ["corner", "falta_lateral"],
      estado_disponibilidad: ["disponible", "limitado", "baja", "sancionado"],
      estado_partido: ["planificado", "jugado"],
      etiqueta_informe: [
        "salida_balon",
        "presion",
        "bloque",
        "linea_defensiva",
      ],
      formacion: ["4-3-3", "4-4-2", "4-2-3-1", "5-3-2"],
      linea_jugador: ["POR", "DEF", "CEN", "DEL"],
      pie_habil: ["derecho", "izquierdo", "ambos"],
      rol_miembro: ["entrenador", "ayudante", "preparador_fisico", "analista"],
      tipo_abp: ["ofensivo", "defensivo"],
      tipo_evento: ["gol", "ocasion", "duelo", "nota"],
    },
  },
} as const
