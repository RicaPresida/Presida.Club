export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      grupos: {
        Row: {
          id: string
          criado_em: string
          nome: string
          tipo: string
          mensalidade: number | null
          criado_por: string
        }
        Insert: {
          id?: string
          criado_em?: string
          nome: string
          tipo: string
          mensalidade?: number | null
          criado_por: string
        }
        Update: {
          id?: string
          criado_em?: string
          nome?: string
          tipo?: string
          mensalidade?: number | null
          criado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      jogadores: {
        Row: {
          id: string
          criado_em: string
          nome: string
          telefone: string | null
          nivel: number
          grupo_id: string
          posicao: string | null
          ativo: boolean
        }
        Insert: {
          id?: string
          criado_em?: string
          nome: string
          telefone?: string | null
          nivel: number
          grupo_id: string
          posicao?: string | null
          ativo?: boolean
        }
        Update: {
          id?: string
          criado_em?: string
          nome?: string
          telefone?: string | null
          nivel?: number
          grupo_id?: string
          posicao?: string | null
          ativo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "jogadores_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          }
        ]
      }
      financas: {
        Row: {
          id: string
          criado_em: string
          descricao: string
          valor: number
          data: string
          tipo: 'receita' | 'despesa'
          grupo_id: string
          jogador_id: string | null
          categoria: string | null
        }
        Insert: {
          id?: string
          criado_em?: string
          descricao: string
          valor: number
          data: string
          tipo: 'receita' | 'despesa'
          grupo_id: string
          jogador_id?: string | null
          categoria?: string | null
        }
        Update: {
          id?: string
          criado_em?: string
          descricao?: string
          valor?: number
          data?: string
          tipo?: 'receita' | 'despesa'
          grupo_id?: string
          jogador_id?: string | null
          categoria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financas_jogador_id_fkey"
            columns: ["jogador_id"]
            isOneToOne: false
            referencedRelation: "jogadores"
            referencedColumns: ["id"]
          }
        ]
      }
      resenhas: {
        Row: {
          id: string
          criado_em: string
          texto: string
          usuario_id: string
          grupo_id: string
        }
        Insert: {
          id?: string
          criado_em?: string
          texto: string
          usuario_id: string
          grupo_id: string
        }
        Update: {
          id?: string
          criado_em?: string
          texto?: string
          usuario_id?: string
          grupo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenhas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenhas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
          updated_at: string | null
          onboarding_completed: boolean | null
          grupo_ativo: string | null
          trial_ends_at: string | null
          created_at: string | null
          atualizado_em: string | null
          data_nascimento: string | null
          telefone: string | null
          endereco: string | null
          nome: string
          nome_completo: string | null
          role: string | null
          email: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          updated_at?: string | null
          onboarding_completed?: boolean | null
          grupo_ativo?: string | null
          trial_ends_at?: string | null
          created_at?: string | null
          atualizado_em?: string | null
          data_nascimento?: string | null
          telefone?: string | null
          endereco?: string | null
          nome?: string
          nome_completo?: string | null
          role?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          updated_at?: string | null
          onboarding_completed?: boolean | null
          grupo_ativo?: string | null
          trial_ends_at?: string | null
          created_at?: string | null
          atualizado_em?: string | null
          data_nascimento?: string | null
          telefone?: string | null
          endereco?: string | null
          nome?: string
          nome_completo?: string | null
          role?: string | null
          email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_grupo_ativo_fkey"
            columns: ["grupo_ativo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}