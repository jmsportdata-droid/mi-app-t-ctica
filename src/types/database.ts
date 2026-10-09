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
      analisis_propio: {
        Row: {
          avisos: string[]
          datos: Json
          generado_en: string
          insights: Json
          no_vinculados: Json
          temporada_id: string
        }
        Insert: {
          avisos?: string[]
          datos?: Json
          generado_en?: string
          insights?: Json
          no_vinculados?: Json
          temporada_id: string
        }
        Update: {
          avisos?: string[]
          datos?: Json
          generado_en?: string
          insights?: Json
          no_vinculados?: Json
          temporada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analisis_propio_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: true
            referencedRelation: "temporadas"
            referencedColumns: ["id"]
          },
        ]
      }
      analisis_rival: {
        Row: {
          clip_url: string | null
          creado_en: string
          equipo: string
          fase: Database["public"]["Enums"]["fase_analisis"]
          id: string
          orden: number
          partido_id: string
          referencia: string | null
          texto: string
          valoracion: Database["public"]["Enums"]["valoracion_analisis"] | null
        }
        Insert: {
          clip_url?: string | null
          creado_en?: string
          equipo?: string
          fase: Database["public"]["Enums"]["fase_analisis"]
          id?: string
          orden?: number
          partido_id: string
          referencia?: string | null
          texto: string
          valoracion?: Database["public"]["Enums"]["valoracion_analisis"] | null
        }
        Update: {
          clip_url?: string | null
          creado_en?: string
          equipo?: string
          fase?: Database["public"]["Enums"]["fase_analisis"]
          id?: string
          orden?: number
          partido_id?: string
          referencia?: string | null
          texto?: string
          valoracion?: Database["public"]["Enums"]["valoracion_analisis"] | null
        }
        Relationships: [
          {
            foreignKeyName: "analisis_rival_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencia_sesion: {
        Row: {
          actividad_id: string
          estado: Database["public"]["Enums"]["estado_asistencia"]
          jugador_id: string
          nota: string | null
        }
        Insert: {
          actividad_id: string
          estado?: Database["public"]["Enums"]["estado_asistencia"]
          jugador_id: string
          nota?: string | null
        }
        Update: {
          actividad_id?: string
          estado?: Database["public"]["Enums"]["estado_asistencia"]
          jugador_id?: string
          nota?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_sesion_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["actividad_id"]
          },
          {
            foreignKeyName: "asistencia_sesion_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
        ]
      }
      asistente_plan: {
        Row: {
          aplicado_en: string | null
          avisos: string[]
          borrador: Json
          fuentes: Json
          generado_en: string
          partido_id: string
          puntos: Json
          validaciones: Json
        }
        Insert: {
          aplicado_en?: string | null
          avisos?: string[]
          borrador?: Json
          fuentes?: Json
          generado_en?: string
          partido_id: string
          puntos?: Json
          validaciones?: Json
        }
        Update: {
          aplicado_en?: string | null
          avisos?: string[]
          borrador?: Json
          fuentes?: Json
          generado_en?: string
          partido_id?: string
          puntos?: Json
          validaciones?: Json
        }
        Relationships: [
          {
            foreignKeyName: "asistente_plan_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      concentraciones: {
        Row: {
          actividad_id: string | null
          actualizado_en: string
          entrada_fecha: string | null
          entrada_hora: string | null
          lugar: string | null
          notas: string | null
          partido_id: string
          salida_fecha: string | null
          salida_hora: string | null
        }
        Insert: {
          actividad_id?: string | null
          actualizado_en?: string
          entrada_fecha?: string | null
          entrada_hora?: string | null
          lugar?: string | null
          notas?: string | null
          partido_id: string
          salida_fecha?: string | null
          salida_hora?: string | null
        }
        Update: {
          actividad_id?: string | null
          actualizado_en?: string
          entrada_fecha?: string | null
          entrada_hora?: string | null
          lugar?: string | null
          notas?: string | null
          partido_id?: string
          salida_fecha?: string | null
          salida_hora?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concentraciones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concentraciones_partido_id_fkey"
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
      enlaces_jugadores: {
        Row: {
          creado_en: string
          temporada_id: string
          token: string
        }
        Insert: {
          creado_en?: string
          temporada_id: string
          token?: string
        }
        Update: {
          creado_en?: string
          temporada_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "enlaces_jugadores_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: true
            referencedRelation: "temporadas"
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
      escenarios_partido: {
        Row: {
          cambios: Json
          creado_en: string
          desde_minuto: number | null
          formacion: Database["public"]["Enums"]["formacion"] | null
          id: string
          orden: number
          partido_id: string
          respuesta: string
          situacion: Database["public"]["Enums"]["situacion_partido"]
        }
        Insert: {
          cambios?: Json
          creado_en?: string
          desde_minuto?: number | null
          formacion?: Database["public"]["Enums"]["formacion"] | null
          id?: string
          orden?: number
          partido_id: string
          respuesta: string
          situacion: Database["public"]["Enums"]["situacion_partido"]
        }
        Update: {
          cambios?: Json
          creado_en?: string
          desde_minuto?: number | null
          formacion?: Database["public"]["Enums"]["formacion"] | null
          id?: string
          orden?: number
          partido_id?: string
          respuesta?: string
          situacion?: Database["public"]["Enums"]["situacion_partido"]
        }
        Relationships: [
          {
            foreignKeyName: "escenarios_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      estadisticas_jugador_partido: {
        Row: {
          amarillas: number
          asistencias: number
          fuente: string
          goles: number
          jugador_id: string
          minutos: number
          nota: number | null
          partido_id: string
          rojas: number
          stats: Json
          titular: boolean
        }
        Insert: {
          amarillas?: number
          asistencias?: number
          fuente: string
          goles?: number
          jugador_id: string
          minutos?: number
          nota?: number | null
          partido_id: string
          rojas?: number
          stats?: Json
          titular?: boolean
        }
        Update: {
          amarillas?: number
          asistencias?: number
          fuente?: string
          goles?: number
          jugador_id?: string
          minutos?: number
          nota?: number | null
          partido_id?: string
          rojas?: number
          stats?: Json
          titular?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "estadisticas_jugador_partido_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estadisticas_jugador_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      estadisticas_partido: {
        Row: {
          avisos: string[]
          formacion_propia: string | null
          formacion_rival: string | null
          fuente: string
          generado_en: string
          id_evento: string | null
          incidencias: Json
          insights: Json
          partido_id: string
          propio: Json
          rival: Json
          tiros: Json
        }
        Insert: {
          avisos?: string[]
          formacion_propia?: string | null
          formacion_rival?: string | null
          fuente: string
          generado_en?: string
          id_evento?: string | null
          incidencias?: Json
          insights?: Json
          partido_id: string
          propio?: Json
          rival?: Json
          tiros?: Json
        }
        Update: {
          avisos?: string[]
          formacion_propia?: string | null
          formacion_rival?: string | null
          fuente?: string
          generado_en?: string
          id_evento?: string | null
          incidencias?: Json
          insights?: Json
          partido_id?: string
          propio?: Json
          rival?: Json
          tiros?: Json
        }
        Relationships: [
          {
            foreignKeyName: "estadisticas_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      estado_mac: {
        Row: {
          cuerpo_tecnico_id: string
          ultima_senal: string
          version: string | null
        }
        Insert: {
          cuerpo_tecnico_id: string
          ultima_senal?: string
          version?: string | null
        }
        Update: {
          cuerpo_tecnico_id?: string
          ultima_senal?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estado_mac_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: true
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
      habitaciones: {
        Row: {
          capacidad: number
          creado_en: string
          id: string
          jugadores: string[]
          nombre: string
          orden: number
          partido_id: string
        }
        Insert: {
          capacidad?: number
          creado_en?: string
          id?: string
          jugadores?: string[]
          nombre: string
          orden?: number
          partido_id: string
        }
        Update: {
          capacidad?: number
          creado_en?: string
          id?: string
          jugadores?: string[]
          nombre?: string
          orden?: number
          partido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitaciones_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "concentraciones"
            referencedColumns: ["partido_id"]
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
      informes_rival_datos: {
        Row: {
          avisos: string[]
          datos: Json
          generado_en: string
          insights: Json
          partido_id: string
          pdf_ruta: string | null
          validaciones: Json
        }
        Insert: {
          avisos?: string[]
          datos?: Json
          generado_en?: string
          insights?: Json
          partido_id: string
          pdf_ruta?: string | null
          validaciones?: Json
        }
        Update: {
          avisos?: string[]
          datos?: Json
          generado_en?: string
          insights?: Json
          partido_id?: string
          pdf_ruta?: string | null
          validaciones?: Json
        }
        Relationships: [
          {
            foreignKeyName: "informes_rival_datos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      jugadas: {
        Row: {
          actualizado_en: string
          archivada: boolean
          categoria: Database["public"]["Enums"]["categoria_jugada"]
          creado_en: string
          cuerpo_tecnico_id: string
          descripcion: string | null
          diagrama: Json
          id: string
          lado: Database["public"]["Enums"]["lado_jugada"]
          nombre: string
          numero: number | null
          roles: Json
          sena: string | null
          tipo: Database["public"]["Enums"]["tipo_abp"]
        }
        Insert: {
          actualizado_en?: string
          archivada?: boolean
          categoria: Database["public"]["Enums"]["categoria_jugada"]
          creado_en?: string
          cuerpo_tecnico_id?: string
          descripcion?: string | null
          diagrama?: Json
          id?: string
          lado?: Database["public"]["Enums"]["lado_jugada"]
          nombre: string
          numero?: number | null
          roles?: Json
          sena?: string | null
          tipo: Database["public"]["Enums"]["tipo_abp"]
        }
        Update: {
          actualizado_en?: string
          archivada?: boolean
          categoria?: Database["public"]["Enums"]["categoria_jugada"]
          creado_en?: string
          cuerpo_tecnico_id?: string
          descripcion?: string | null
          diagrama?: Json
          id?: string
          lado?: Database["public"]["Enums"]["lado_jugada"]
          nombre?: string
          numero?: number | null
          roles?: Json
          sena?: string | null
          tipo?: Database["public"]["Enums"]["tipo_abp"]
        }
        Relationships: [
          {
            foreignKeyName: "jugadas_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      jugadores: {
        Row: {
          altura_cm: number | null
          creado_en: string
          estadisticas_externas: Json
          fecha_debut: string | null
          fecha_nac: string | null
          formado_en_club: boolean
          foto_ruta: string | null
          id: string
          ids_externos: Json
          nacionalidad: string | null
          nombre: string
          numero: number | null
          pie_habil: Database["public"]["Enums"]["pie_habil"] | null
          posicion: Database["public"]["Enums"]["linea_jugador"]
          posiciones: string[]
          seleccion: string | null
          temporada_id: string
        }
        Insert: {
          altura_cm?: number | null
          creado_en?: string
          estadisticas_externas?: Json
          fecha_debut?: string | null
          fecha_nac?: string | null
          formado_en_club?: boolean
          foto_ruta?: string | null
          id?: string
          ids_externos?: Json
          nacionalidad?: string | null
          nombre: string
          numero?: number | null
          pie_habil?: Database["public"]["Enums"]["pie_habil"] | null
          posicion: Database["public"]["Enums"]["linea_jugador"]
          posiciones?: string[]
          seleccion?: string | null
          temporada_id: string
        }
        Update: {
          altura_cm?: number | null
          creado_en?: string
          estadisticas_externas?: Json
          fecha_debut?: string | null
          fecha_nac?: string | null
          formado_en_club?: boolean
          foto_ruta?: string | null
          id?: string
          ids_externos?: Json
          nacionalidad?: string | null
          nombre?: string
          numero?: number | null
          pie_habil?: Database["public"]["Enums"]["pie_habil"] | null
          posicion?: Database["public"]["Enums"]["linea_jugador"]
          posiciones?: string[]
          seleccion?: string | null
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
      jugadores_rivales: {
        Row: {
          actualizado_en: string
          altura_cm: number | null
          corto: string | null
          dorsal: number | null
          equipo_id: string
          estadisticas: Json
          fecha_nac: string | null
          fuente: string
          id: string
          id_externo: string
          nacionalidad: string | null
          nombre: string
          pie: string | null
          posicion: string | null
        }
        Insert: {
          actualizado_en?: string
          altura_cm?: number | null
          corto?: string | null
          dorsal?: number | null
          equipo_id: string
          estadisticas?: Json
          fecha_nac?: string | null
          fuente?: string
          id?: string
          id_externo: string
          nacionalidad?: string | null
          nombre: string
          pie?: string | null
          posicion?: string | null
        }
        Update: {
          actualizado_en?: string
          altura_cm?: number | null
          corto?: string | null
          dorsal?: number | null
          equipo_id?: string
          estadisticas?: Json
          fecha_nac?: string | null
          fuente?: string
          id?: string
          id_externo?: string
          nacionalidad?: string | null
          nombre?: string
          pie?: string | null
          posicion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jugadores_rivales_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas_partido: {
        Row: {
          actualizado_en: string
          parejas: Json
          partido_id: string
          rivales: string[] | null
        }
        Insert: {
          actualizado_en?: string
          parejas?: Json
          partido_id: string
          rivales?: string[] | null
        }
        Update: {
          actualizado_en?: string
          parejas?: Json
          partido_id?: string
          rivales?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "marcas_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
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
      partido_jugadas: {
        Row: {
          asignaciones: Json
          jugada_id: string
          orden: number
          partido_id: string
        }
        Insert: {
          asignaciones?: Json
          jugada_id: string
          orden?: number
          partido_id: string
        }
        Update: {
          asignaciones?: Json
          jugada_id?: string
          orden?: number
          partido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partido_jugadas_jugada_id_fkey"
            columns: ["jugada_id"]
            isOneToOne: false
            referencedRelation: "jugadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_jugadas_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      partido_previa: {
        Row: {
          actualizado_en: string
          arbitro: string | null
          arbitro_amarillas: number | null
          arbitro_notas: string | null
          arbitro_penales: number | null
          arbitro_rojas: number | null
          cancha_ancho: number | null
          cancha_largo: number | null
          cesped: Database["public"]["Enums"]["tipo_cesped"] | null
          clima: string | null
          condiciones_notas: string | null
          estado_cancha: string | null
          partido_id: string
          rival_bajas: string | null
          rival_calendario: string | null
          rival_dt: string | null
          rival_dt_tendencias: string | null
          rival_notas: string | null
          rival_racha: string | null
        }
        Insert: {
          actualizado_en?: string
          arbitro?: string | null
          arbitro_amarillas?: number | null
          arbitro_notas?: string | null
          arbitro_penales?: number | null
          arbitro_rojas?: number | null
          cancha_ancho?: number | null
          cancha_largo?: number | null
          cesped?: Database["public"]["Enums"]["tipo_cesped"] | null
          clima?: string | null
          condiciones_notas?: string | null
          estado_cancha?: string | null
          partido_id: string
          rival_bajas?: string | null
          rival_calendario?: string | null
          rival_dt?: string | null
          rival_dt_tendencias?: string | null
          rival_notas?: string | null
          rival_racha?: string | null
        }
        Update: {
          actualizado_en?: string
          arbitro?: string | null
          arbitro_amarillas?: number | null
          arbitro_notas?: string | null
          arbitro_penales?: number | null
          arbitro_rojas?: number | null
          cancha_ancho?: number | null
          cancha_largo?: number | null
          cesped?: Database["public"]["Enums"]["tipo_cesped"] | null
          clima?: string | null
          condiciones_notas?: string | null
          estado_cancha?: string | null
          partido_id?: string
          rival_bajas?: string | null
          rival_calendario?: string | null
          rival_dt?: string | null
          rival_dt_tendencias?: string | null
          rival_notas?: string | null
          rival_racha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partido_previa_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
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
          formacion_rival: Database["public"]["Enums"]["formacion"] | null
          goles_contra: number | null
          goles_favor: number | null
          hora: string | null
          id: string
          ids_externos: Json
          penales_contra: number | null
          penales_favor: number | null
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
          formacion_rival?: Database["public"]["Enums"]["formacion"] | null
          goles_contra?: number | null
          goles_favor?: number | null
          hora?: string | null
          id?: string
          ids_externos?: Json
          penales_contra?: number | null
          penales_favor?: number | null
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
          formacion_rival?: Database["public"]["Enums"]["formacion"] | null
          goles_contra?: number | null
          goles_favor?: number | null
          hora?: string | null
          id?: string
          ids_externos?: Json
          penales_contra?: number | null
          penales_favor?: number | null
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
      pedidos_sofascore: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          estado: Database["public"]["Enums"]["estado_pedido"]
          id: string
          mensaje: string | null
          partido_id: string | null
          temporada_id: string | null
          tipo: Database["public"]["Enums"]["tipo_pedido_sofascore"]
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          mensaje?: string | null
          partido_id?: string | null
          temporada_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pedido_sofascore"]
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          mensaje?: string | null
          partido_id?: string | null
          temporada_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pedido_sofascore"]
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_sofascore_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_sofascore_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: false
            referencedRelation: "temporadas"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_partido: {
        Row: {
          abp_ct: string | null
          abp_plantel: string | null
          actualizado_en: string
          choque: string | null
          claves: string[]
          contexto: string | null
          defensiva_ct: string | null
          defensiva_jugadores: string[]
          defensiva_plantel: string | null
          defensiva_principios: string[]
          gestion: string | null
          jugadores_clave: Json
          microciclo_principios: string[]
          objetivo: string | null
          ofensiva_ct: string | null
          ofensiva_jugadores: string[]
          ofensiva_plantel: string | null
          ofensiva_principios: string[]
          partido_id: string
          tad_ct: string | null
          tad_jugadores: string[]
          tad_plantel: string | null
          tad_principios: string[]
          tda_ct: string | null
          tda_jugadores: string[]
          tda_plantel: string | null
          tda_principios: string[]
        }
        Insert: {
          abp_ct?: string | null
          abp_plantel?: string | null
          actualizado_en?: string
          choque?: string | null
          claves?: string[]
          contexto?: string | null
          defensiva_ct?: string | null
          defensiva_jugadores?: string[]
          defensiva_plantel?: string | null
          defensiva_principios?: string[]
          gestion?: string | null
          jugadores_clave?: Json
          microciclo_principios?: string[]
          objetivo?: string | null
          ofensiva_ct?: string | null
          ofensiva_jugadores?: string[]
          ofensiva_plantel?: string | null
          ofensiva_principios?: string[]
          partido_id: string
          tad_ct?: string | null
          tad_jugadores?: string[]
          tad_plantel?: string | null
          tad_principios?: string[]
          tda_ct?: string | null
          tda_jugadores?: string[]
          tda_plantel?: string | null
          tda_principios?: string[]
        }
        Update: {
          abp_ct?: string | null
          abp_plantel?: string | null
          actualizado_en?: string
          choque?: string | null
          claves?: string[]
          contexto?: string | null
          defensiva_ct?: string | null
          defensiva_jugadores?: string[]
          defensiva_plantel?: string | null
          defensiva_principios?: string[]
          gestion?: string | null
          jugadores_clave?: Json
          microciclo_principios?: string[]
          objetivo?: string | null
          ofensiva_ct?: string | null
          ofensiva_jugadores?: string[]
          ofensiva_plantel?: string | null
          ofensiva_principios?: string[]
          partido_id?: string
          tad_ct?: string | null
          tad_jugadores?: string[]
          tad_plantel?: string | null
          tad_principios?: string[]
          tda_ct?: string | null
          tda_jugadores?: string[]
          tda_plantel?: string | null
          tda_principios?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "planes_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      plantilla_tareas: {
        Row: {
          ancho_m: number | null
          duracion_seg: number | null
          espacio: Database["public"]["Enums"]["espacio_tarea"] | null
          id: string
          jugadores: number | null
          largo_m: number | null
          notas: string | null
          orden: number
          pausa_seg: number | null
          plantilla_id: string
          series: number | null
          tarea_id: string
        }
        Insert: {
          ancho_m?: number | null
          duracion_seg?: number | null
          espacio?: Database["public"]["Enums"]["espacio_tarea"] | null
          id?: string
          jugadores?: number | null
          largo_m?: number | null
          notas?: string | null
          orden?: number
          pausa_seg?: number | null
          plantilla_id: string
          series?: number | null
          tarea_id: string
        }
        Update: {
          ancho_m?: number | null
          duracion_seg?: number | null
          espacio?: Database["public"]["Enums"]["espacio_tarea"] | null
          id?: string
          jugadores?: number | null
          largo_m?: number | null
          notas?: string | null
          orden?: number
          pausa_seg?: number | null
          plantilla_id?: string
          series?: number | null
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantilla_tareas_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_sesion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantilla_tareas_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_sesion: {
        Row: {
          creado_en: string
          cuerpo_tecnico_id: string
          id: string
          md: string | null
          nombre: string
          objetivo: string | null
        }
        Insert: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          id?: string
          md?: string | null
          nombre: string
          objetivo?: string | null
        }
        Update: {
          creado_en?: string
          cuerpo_tecnico_id?: string
          id?: string
          md?: string | null
          nombre?: string
          objetivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_sesion_cuerpo_tecnico_id_fkey"
            columns: ["cuerpo_tecnico_id"]
            isOneToOne: false
            referencedRelation: "cuerpos_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      post_partido: {
        Row: {
          a_mejorar: string | null
          actualizado_en: string
          para_la_semana: string | null
          partido_id: string
          plan_vs_real: Json
          positivos: string | null
          valoracion: string | null
        }
        Insert: {
          a_mejorar?: string | null
          actualizado_en?: string
          para_la_semana?: string | null
          partido_id: string
          plan_vs_real?: Json
          positivos?: string | null
          valoracion?: string | null
        }
        Update: {
          a_mejorar?: string | null
          actualizado_en?: string
          para_la_semana?: string | null
          partido_id?: string
          plan_vs_real?: Json
          positivos?: string | null
          valoracion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_partido_partido_id_fkey"
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
      sesion_tareas: {
        Row: {
          actividad_id: string
          ancho_m: number | null
          creado_en: string
          duracion_seg: number | null
          espacio: Database["public"]["Enums"]["espacio_tarea"] | null
          id: string
          jugadores: number | null
          largo_m: number | null
          notas: string | null
          orden: number
          pausa_seg: number | null
          series: number | null
          tarea_id: string
          tiempo_total_seg: number | null
        }
        Insert: {
          actividad_id: string
          ancho_m?: number | null
          creado_en?: string
          duracion_seg?: number | null
          espacio?: Database["public"]["Enums"]["espacio_tarea"] | null
          id?: string
          jugadores?: number | null
          largo_m?: number | null
          notas?: string | null
          orden?: number
          pausa_seg?: number | null
          series?: number | null
          tarea_id: string
          tiempo_total_seg?: number | null
        }
        Update: {
          actividad_id?: string
          ancho_m?: number | null
          creado_en?: string
          duracion_seg?: number | null
          espacio?: Database["public"]["Enums"]["espacio_tarea"] | null
          id?: string
          jugadores?: number | null
          largo_m?: number | null
          notas?: string | null
          orden?: number
          pausa_seg?: number | null
          series?: number | null
          tarea_id?: string
          tiempo_total_seg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sesion_tareas_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["actividad_id"]
          },
          {
            foreignKeyName: "sesion_tareas_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          actividad_id: string
          actualizado_en: string
          cerrada: boolean
          creado_en: string
          minutos_reales: number | null
          notas: string | null
          objetivo: string | null
          observaciones_cierre: string | null
        }
        Insert: {
          actividad_id: string
          actualizado_en?: string
          cerrada?: boolean
          creado_en?: string
          minutos_reales?: number | null
          notas?: string | null
          objetivo?: string | null
          observaciones_cierre?: string | null
        }
        Update: {
          actividad_id?: string
          actualizado_en?: string
          cerrada?: boolean
          creado_en?: string
          minutos_reales?: number | null
          notas?: string | null
          objetivo?: string | null
          observaciones_cierre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: true
            referencedRelation: "actividades"
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
      videos_vestuario: {
        Row: {
          actualizado_en: string
          duracion: string | null
          notas: string | null
          partido_id: string
          tipo: Database["public"]["Enums"]["tipo_video_vestuario"]
          url: string | null
          visible_jugadores: boolean
        }
        Insert: {
          actualizado_en?: string
          duracion?: string | null
          notas?: string | null
          partido_id: string
          tipo: Database["public"]["Enums"]["tipo_video_vestuario"]
          url?: string | null
          visible_jugadores?: boolean
        }
        Update: {
          actualizado_en?: string
          duracion?: string | null
          notas?: string | null
          partido_id?: string
          tipo?: Database["public"]["Enums"]["tipo_video_vestuario"]
          url?: string | null
          visible_jugadores?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "videos_vestuario_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
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
      agregar_tarea_sesion: {
        Args: { p_actividad: string; p_tarea: string }
        Returns: string
      }
      aplicar_plantilla_sesion: {
        Args: { p_actividad: string; p_plantilla: string }
        Returns: number
      }
      cargar_modelo_base: { Args: never; Returns: number }
      cargar_tareas_base: { Args: never; Returns: number }
      copiar_sesion: {
        Args: { p_destino: string; p_origen: string }
        Returns: number
      }
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
      es_miembro_actividad: { Args: { p_actividad: string }; Returns: boolean }
      es_miembro_jugador: { Args: { p_jugador: string }; Returns: boolean }
      es_miembro_partido: { Args: { p_partido: string }; Returns: boolean }
      es_miembro_plantilla: { Args: { p_plantilla: string }; Returns: boolean }
      es_miembro_tarea: { Args: { p_tarea: string }; Returns: boolean }
      es_miembro_temporada: { Args: { p_temporada: string }; Returns: boolean }
      guardar_plantilla_sesion: {
        Args: { p_actividad: string; p_md: string; p_nombre: string }
        Returns: string
      }
      jugador_del_partido: {
        Args: { p_jugador: string; p_partido: string }
        Returns: boolean
      }
      mi_cuerpo_tecnico: { Args: never; Returns: string }
      reemplazar_vinculos_tarea: {
        Args: { p_contenidos: string[]; p_objetivos: string[]; p_tarea: string }
        Returns: undefined
      }
      regenerar_enlace_jugadores: {
        Args: { p_temporada: string }
        Returns: string
      }
      rival_valido: {
        Args: { p_rival: string; p_temporada: string }
        Returns: boolean
      }
      semana_publica: {
        Args: { p_desde: string; p_token: string }
        Returns: Json
      }
      tarea_de_la_actividad: {
        Args: { p_actividad: string; p_tarea: string }
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
      categoria_jugada:
        | "corner"
        | "falta_lateral"
        | "falta_frontal"
        | "lateral"
        | "otro"
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
      estado_asistencia: "completo" | "parcial" | "diferenciado" | "ausente"
      estado_disponibilidad: "disponible" | "limitado" | "baja" | "sancionado"
      estado_partido: "planificado" | "jugado"
      estado_pedido: "pendiente" | "procesando" | "listo" | "error"
      etiqueta_informe:
        | "salida_balon"
        | "presion"
        | "bloque"
        | "linea_defensiva"
      fase_analisis:
        | "ofensiva_inicio"
        | "ofensiva_organizacion"
        | "ofensiva_finalizacion"
        | "defensa_bloque_alto"
        | "defensa_bloque_medio"
        | "defensa_bloque_bajo"
        | "transicion_defensa_ataque"
        | "transicion_ataque_defensa"
      formacion:
        | "4-3-3"
        | "4-4-2"
        | "4-2-3-1"
        | "5-3-2"
        | "3-4-3"
        | "4-1-4-1"
        | "3-5-2"
      lado_jugada: "izquierda" | "derecha" | "ambos"
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
      situacion_partido:
        | "ganando"
        | "empatando"
        | "perdiendo"
        | "con_uno_menos"
        | "con_uno_mas"
        | "otro"
      tipo_abp: "ofensivo" | "defensivo"
      tipo_actividad:
        | "entrenamiento"
        | "pre_sesion"
        | "partido"
        | "gimnasio"
        | "charla_tecnica"
        | "reunion_cuerpo_tecnico"
        | "comida"
        | "viaje"
        | "concentracion"
        | "libre"
        | "otro"
      tipo_cesped: "natural" | "sintetico" | "hibrido"
      tipo_evento: "gol" | "ocasion" | "duelo" | "nota"
      tipo_pedido_sofascore:
        | "informe_rival"
        | "plantel_propio"
        | "post_partido"
        | "plan_asistente"
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
      tipo_video_vestuario:
        | "rival"
        | "pelota_quieta"
        | "pre_partido"
        | "post_partido"
      valoracion_analisis: "fortaleza" | "debilidad" | "patron"
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
      categoria_jugada: [
        "corner",
        "falta_lateral",
        "falta_frontal",
        "lateral",
        "otro",
      ],
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
      estado_asistencia: ["completo", "parcial", "diferenciado", "ausente"],
      estado_disponibilidad: ["disponible", "limitado", "baja", "sancionado"],
      estado_partido: ["planificado", "jugado"],
      estado_pedido: ["pendiente", "procesando", "listo", "error"],
      etiqueta_informe: [
        "salida_balon",
        "presion",
        "bloque",
        "linea_defensiva",
      ],
      fase_analisis: [
        "ofensiva_inicio",
        "ofensiva_organizacion",
        "ofensiva_finalizacion",
        "defensa_bloque_alto",
        "defensa_bloque_medio",
        "defensa_bloque_bajo",
        "transicion_defensa_ataque",
        "transicion_ataque_defensa",
      ],
      formacion: [
        "4-3-3",
        "4-4-2",
        "4-2-3-1",
        "5-3-2",
        "3-4-3",
        "4-1-4-1",
        "3-5-2",
      ],
      lado_jugada: ["izquierda", "derecha", "ambos"],
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
      situacion_partido: [
        "ganando",
        "empatando",
        "perdiendo",
        "con_uno_menos",
        "con_uno_mas",
        "otro",
      ],
      tipo_abp: ["ofensivo", "defensivo"],
      tipo_actividad: [
        "entrenamiento",
        "pre_sesion",
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
      tipo_cesped: ["natural", "sintetico", "hibrido"],
      tipo_evento: ["gol", "ocasion", "duelo", "nota"],
      tipo_pedido_sofascore: [
        "informe_rival",
        "plantel_propio",
        "post_partido",
        "plan_asistente",
      ],
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
      tipo_video_vestuario: [
        "rival",
        "pelota_quieta",
        "pre_partido",
        "post_partido",
      ],
      valoracion_analisis: ["fortaleza", "debilidad", "patron"],
      via_metodologica: ["analitica", "global", "sistemica"],
    },
  },
} as const
