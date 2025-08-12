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
      clients: {
        Row: {
          id: string
          name: string
          phone: string
          address: string | null
          visit_count: number
          reward_claimed: boolean
          last_visit: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          address?: string | null
          visit_count?: number
          reward_claimed?: boolean
          last_visit?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          address?: string | null
          visit_count?: number
          reward_claimed?: boolean
          last_visit?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          client_id: string
          total: number
          payment_method: string
          status: 'pending' | 'completed' | 'cancelled'
          pickup_date: string | null
          pickup_time: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          client_id: string
          total: number
          payment_method: string
          status?: 'pending' | 'completed' | 'cancelled'
          pickup_date?: string | null
          pickup_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          total?: number
          payment_method?: string
          status?: 'pending' | 'completed' | 'cancelled'
          pickup_date?: string | null
          pickup_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
    }
  }
}
