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
      actividades: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          fecha: string
          hora_citacion: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          indicaciones: string | null
          lugar: string | null
          notas_internas: string | null
          partido_id: string | null
          temporada_id: string
          tipo: Database["public"]["Enums"]["tipo_actividad"]
          titulo: string
          visible_jugadores: boolean
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          fecha: string
          hora_citacion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          indicaciones?: string | null
          lugar?: string | null
          notas_internas?: string | null
          partido_id?: string | null
          temporada_id: string
          tipo: Database["public"]["Enums"]["tipo_actividad"]
          titulo: string
          visible_jugadores?: boolean
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          fecha?: string
          hora_citacion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          indicaciones?: string | null
          lugar?: string | null
          notas_internas?: string | null
          partido_id?: string | null
          temporada_id?: string
          tipo?: Database["public"]["Enums"]["tipo_actividad"]
          titulo?: string
          visible_jugadores?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "actividades_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: false
            referencedRelation: "temporadas"
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
      contenidos_tecnicos: {
        Row: {
          creado_en: string
          cuerpo_tecnico_id: string
          id: string
          nombre: string
          oculto: boolean
          orden: number
        }
        Insert: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          id?: string
          nombre: string
          oculto?: boolean
          orden?: number
        }
        Update: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          id?: string
          nombre?: string
          oculto?: boolean
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "contenidos_tecnicos_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
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
      modelos_juego: {
        Row: {
          actualizado_en: string
          cuerpo_tecnico_id: string
          filosofia: string | null
          sistema_con_balon: string | null
          sistema_sin_balon: string | null
        }
        Insert: {
          actualizado_en?: string
          cuerpo_tecnico_id?: string
          filosofia?: string | null
          sistema_con_balon?: string | null
          sistema_sin_balon?: string | null
        }
        Update: {
          actualizado_en?: string
          cuerpo_tecnico_id?: string
          filosofia?: string | null
          sistema_con_balon?: string | null
          sistema_sin_balon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_juego_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: true
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
          hora: string | null
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
          hora?: string | null
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
          hora?: string | null
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
      principios_juego: {
        Row: {
          creado_en: string
          cuerpo_tecnico_id: string
          descripcion: string | null
          id: string
          momento: Database["public"]["Enums"]["momento_juego"]
          nombre: string
          oculto: boolean
          orden: number
          padre_id: string | null
        }
        Insert: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          descripcion?: string | null
          id?: string
          momento: Database["public"]["Enums"]["momento_juego"]
          nombre: string
          oculto?: boolean
          orden?: number
          padre_id?: string | null
        }
        Update: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          descripcion?: string | null
          id?: string
          momento?: Database["public"]["Enums"]["momento_juego"]
          nombre?: string
          oculto?: boolean
          orden?: number
          padre_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "principios_juego_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "principios_juego_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "principios_juego"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          actualizado_en: string
          ancho_m: number | null
          archivada: boolean
          competitividad:
            | Database["public"]["Enums"]["competitividad_tarea"]
            | null
          creado_en: string
          cuerpo_tecnico_id: string
          descripcion: string | null
          duracion_seg: number | null
          espacio: Database["public"]["Enums"]["espacio_tarea"] | null
          formato: string | null
          grafico_ruta: string | null
          id: string
          jugadores: number | null
          largo_m: number | null
          nombre: string
          orientacion_fisica:
            | Database["public"]["Enums"]["orientacion_fisica"]
            | null
          pausa_seg: number | null
          prompt_imagen: string | null
          series: number | null
          tiempo_total_seg: number | null
          tipo: Database["public"]["Enums"]["tipo_tarea"]
          via: Database["public"]["Enums"]["via_metodologica"] | null
          video_url: string | null
        }
        Insert: {
          actualizado_en?: string
          ancho_m?: number | null
          archivada?: boolean
          competitividad?:
            | Database["public"]["Enums"]["competitividad_tarea"]
            | null
          creado_en?: string
          cuerpo_tecnico_id?: string
          descripcion?: string | null
          duracion_seg?: number | null
          espacio?: Database["public"]["Enums"]["espacio_tarea"] | null
          formato?: string | null
          grafico_ruta?: string | null
          id?: string
          jugadores?: number | null
          largo_m?: number | null
          nombre: string
          orientacion_fisica?:
            | Database["public"]["Enums"]["orientacion_fisica"]
            | null
          pausa_seg?: number | null
          prompt_imagen?: string | null
          series?: number | null
          tiempo_total_seg?: number | null
          tipo: Database["public"]["Enums"]["tipo_tarea"]
          via?: Database["public"]["Enums"]["via_metodologica"] | null
          video_url?: string | null
        }
        Update: {
          actualizado_en?: string
          ancho_m?: number | null
          archivada?: boolean
          competitividad?:
            | Database["public"]["Enums"]["competitividad_tarea"]
            | null
          creado_en?: string
          cuerpo_tecnico_id?: string
          descripcion?: string | null
          duracion_seg?: number | null
          espacio?: Database["public"]["Enums"]["espacio_tarea"] | null
          formato?: string | null
          grafico_ruta?: string | null
          id?: string
          jugadores?: number | null
          largo_m?: number | null
          nombre?: string
          orientacion_fisica?:
            | Database["public"]["Enums"]["orientacion_fisica"]
            | null
          pausa_seg?: number | null
          prompt_imagen?: string | null
          series?: number | null
          tiempo_total_seg?: number | null
          tipo?: Database["public"]["Enums"]["tipo_tarea"]
          via?: Database["public"]["Enums"]["via_metodologica"] | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_contenidos: {
        Row: {
          contenido_id: string
          tarea_id: string
        }
        Insert: {
          contenido_id: string
          tarea_id: string
        }
        Update: {
          contenido_id?: string
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_contenidos_contenido_id_fkey"
            columns: ["contenido_id"]
            isOneToOne: false
            referencedRelation: "contenidos_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_contenidos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_objetivos: {
        Row: {
          principio_id: string
          tarea_id: string
        }
        Insert: {
          principio_id: string
          tarea_id: string
        }
        Update: {
          principio_id?: string
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_objetivos_principio_id_fkey"
            columns: ["principio_id"]
            isOneToOne: false
            referencedRelation: "principios_juego"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_objetivos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
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
      cargar_modelo_base: { Args: never; Returns: number }
      cargar_tareas_base: { Args: never; Returns: number }
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
      es_miembro_tarea: { Args: { p_tarea: string }; Returns: boolean }
      es_miembro_temporada: { Args: { p_temporada: string }; Returns: boolean }
      jugador_del_partido: {
        Args: { p_jugador: string; p_partido: string }
        Returns: boolean
      }
      mi_cuerpo_tecnico: { Args: never; Returns: string }
      reemplazar_vinculos_tarea: {
        Args: { p_contenidos: string[]; p_objetivos: string[]; p_tarea: string }
        Returns: undefined
      }
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
      competitividad_tarea:
        | "sin_oposicion"
        | "con_oposicion"
        | "con_oposicion_y_puntuacion"
      espacio_tarea:
        | "medidas"
        | "cancha_entera"
        | "tres_cuartos"
        | "media_cancha"
        | "ultimo_tercio"
        | "area"
        | "gimnasio"
      estado_disponibilidad: "disponible" | "limitado" | "baja" | "sancionado"
      estado_partido: "planificado" | "jugado"
      etiqueta_informe:
        | "salida_balon"
        | "presion"
        | "bloque"
        | "linea_defensiva"
      formacion: "4-3-3" | "4-4-2" | "4-2-3-1" | "5-3-2"
      linea_jugador: "POR" | "DEF" | "CEN" | "DEL"
      momento_juego:
        | "organizacion_ofensiva"
        | "organizacion_defensiva"
        | "transicion_ataque_defensa"
        | "transicion_defensa_ataque"
        | "balon_parado"
      orientacion_fisica:
        | "tension"
        | "duracion"
        | "velocidad"
        | "activacion"
        | "recuperacion"
      pie_habil: "derecho" | "izquierdo" | "ambos"
      rol_miembro: "entrenador" | "ayudante" | "preparador_fisico" | "analista"
      tipo_abp: "ofensivo" | "defensivo"
      tipo_actividad:
        | "entrenamiento"
        | "partido"
        | "gimnasio"
        | "charla_tecnica"
        | "reunion_cuerpo_tecnico"
        | "comida"
        | "viaje"
        | "concentracion"
        | "libre"
        | "otro"
      tipo_evento: "gol" | "ocasion" | "duelo" | "nota"
      tipo_tarea:
        | "entrada_en_calor"
        | "pre_sesion"
        | "rondo"
        | "posesion"
        | "espacio_reducido"
        | "tactico"
        | "transiciones"
        | "partido_condicionado"
        | "finalizacion"
        | "pelota_parada"
        | "velocidad"
        | "arqueros"
        | "fuerza"
        | "recuperacion"
      via_metodologica: "analitica" | "global" | "sistemica"
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
      competitividad_tarea: [
        "sin_oposicion",
        "con_oposicion",
        "con_oposicion_y_puntuacion",
      ],
      espacio_tarea: [
        "medidas",
        "cancha_entera",
        "tres_cuartos",
        "media_cancha",
        "ultimo_tercio",
        "area",
        "gimnasio",
      ],
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
      momento_juego: [
        "organizacion_ofensiva",
        "organizacion_defensiva",
        "transicion_ataque_defensa",
        "transicion_defensa_ataque",
        "balon_parado",
      ],
      orientacion_fisica: [
        "tension",
        "duracion",
        "velocidad",
        "activacion",
        "recuperacion",
      ],
      pie_habil: ["derecho", "izquierdo", "ambos"],
      rol_miembro: ["entrenador", "ayudante", "preparador_fisico", "analista"],
      tipo_abp: ["ofensivo", "defensivo"],
      tipo_actividad: [
        "entrenamiento",
        "partido",
        "gimnasio",
        "charla_tecnica",
        "reunion_cuerpo_tecnico",
        "comida",
        "viaje",
        "concentracion",
        "libre",
        "otro",
      ],
      tipo_evento: ["gol", "ocasion", "duelo", "nota"],
      tipo_tarea: [
        "entrada_en_calor",
        "pre_sesion",
        "rondo",
        "posesion",
        "espacio_reducido",
        "tactico",
        "transiciones",
        "partido_condicionado",
        "finalizacion",
        "pelota_parada",
        "velocidad",
        "arqueros",
        "fuerza",
        "recuperacion",
      ],
      via_metodologica: ["analitica", "global", "sistemica"],
    },
  },
} as const
