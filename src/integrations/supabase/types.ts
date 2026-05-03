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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_plans: {
        Row: {
          area: string | null
          categoria: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          diagnostic_id: string | null
          dificuldade: string | null
          due_date: string | null
          effort: string | null
          example: string | null
          feedback_text: string | null
          has_feedback: boolean
          how_to_apply: string | null
          how_to_measure: string | null
          id: string
          impact: string | null
          impacto_financeiro: number | null
          priority: string | null
          recommendation_id: string | null
          responsible: string | null
          source: string | null
          source_ref: string | null
          started_at: string | null
          status: string
          store_id: string
          tempo_estimado: string | null
          title: string
          why_it_matters: string | null
        }
        Insert: {
          area?: string | null
          categoria?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          dificuldade?: string | null
          due_date?: string | null
          effort?: string | null
          example?: string | null
          feedback_text?: string | null
          has_feedback?: boolean
          how_to_apply?: string | null
          how_to_measure?: string | null
          id?: string
          impact?: string | null
          impacto_financeiro?: number | null
          priority?: string | null
          recommendation_id?: string | null
          responsible?: string | null
          source?: string | null
          source_ref?: string | null
          started_at?: string | null
          status?: string
          store_id: string
          tempo_estimado?: string | null
          title: string
          why_it_matters?: string | null
        }
        Update: {
          area?: string | null
          categoria?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          dificuldade?: string | null
          due_date?: string | null
          effort?: string | null
          example?: string | null
          feedback_text?: string | null
          has_feedback?: boolean
          how_to_apply?: string | null
          how_to_measure?: string | null
          id?: string
          impact?: string | null
          impacto_financeiro?: number | null
          priority?: string | null
          recommendation_id?: string | null
          responsible?: string | null
          source?: string | null
          source_ref?: string | null
          started_at?: string | null
          status?: string
          store_id?: string
          tempo_estimado?: string | null
          title?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      action_updates: {
        Row: {
          action_id: string
          created_at: string
          has_new_data: boolean
          has_new_print: boolean
          id: string
          metrics_delta: Json
          store_id: string
          user_id: string
          what_changed: string | null
        }
        Insert: {
          action_id: string
          created_at?: string
          has_new_data?: boolean
          has_new_print?: boolean
          id?: string
          metrics_delta?: Json
          store_id: string
          user_id: string
          what_changed?: string | null
        }
        Update: {
          action_id?: string
          created_at?: string
          has_new_data?: boolean
          has_new_print?: boolean
          id?: string
          metrics_delta?: Json
          store_id?: string
          user_id?: string
          what_changed?: string | null
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          cache_type: string
          created_at: string
          expires_at: string
          hit_count: number
          id: string
          input_hash: string
          model: string
          response: Json
          store_id: string | null
          tokens_used: number | null
        }
        Insert: {
          cache_type: string
          created_at?: string
          expires_at: string
          hit_count?: number
          id?: string
          input_hash: string
          model: string
          response: Json
          store_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          cache_type?: string
          created_at?: string
          expires_at?: string
          hit_count?: number
          id?: string
          input_hash?: string
          model?: string
          response?: Json
          store_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string | null
          cost: number | null
          created_at: string
          estimated_roi: number | null
          id: string
          margin_impact: number | null
          name: string
          new_customers: number | null
          period_end: string | null
          period_start: string | null
          product_id: string | null
          revenue_generated: number | null
          store_id: string
        }
        Insert: {
          campaign_type?: string | null
          cost?: number | null
          created_at?: string
          estimated_roi?: number | null
          id?: string
          margin_impact?: number | null
          name: string
          new_customers?: number | null
          period_end?: string | null
          period_start?: string | null
          product_id?: string | null
          revenue_generated?: number | null
          store_id: string
        }
        Update: {
          campaign_type?: string | null
          cost?: number | null
          created_at?: string
          estimated_roi?: number | null
          id?: string
          margin_impact?: number | null
          name?: string
          new_customers?: number | null
          period_end?: string | null
          period_start?: string | null
          product_id?: string | null
          revenue_generated?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      case_library: {
        Row: {
          archived_at: string | null
          created_at: string
          diagnosis: string | null
          embedding: string | null
          embedding_version: number
          id: string
          lesson_learned: string | null
          metrics_after: Json | null
          metrics_before: Json | null
          outcome: string | null
          problem_rule_id: string | null
          recommendation: string
          retention_notes: string | null
          store_profile: Json
          usefulness_score: number | null
          user_action: string | null
          user_feedback: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          diagnosis?: string | null
          embedding?: string | null
          embedding_version?: number
          id?: string
          lesson_learned?: string | null
          metrics_after?: Json | null
          metrics_before?: Json | null
          outcome?: string | null
          problem_rule_id?: string | null
          recommendation: string
          retention_notes?: string | null
          store_profile?: Json
          usefulness_score?: number | null
          user_action?: string | null
          user_feedback?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          diagnosis?: string | null
          embedding?: string | null
          embedding_version?: number
          id?: string
          lesson_learned?: string | null
          metrics_after?: Json | null
          metrics_before?: Json | null
          outcome?: string | null
          problem_rule_id?: string | null
          recommendation?: string
          retention_notes?: string | null
          store_profile?: Json
          usefulness_score?: number | null
          user_action?: string | null
          user_feedback?: string | null
        }
        Relationships: []
      }
      competitors: {
        Row: {
          created_at: string
          delivery_fee: number | null
          delivery_time: number | null
          has_combos: boolean | null
          has_coupons: boolean | null
          id: string
          name: string
          photo_quality: string | null
          positioning_notes: string | null
          price_range: string | null
          rating: number | null
          store_id: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: number | null
          has_combos?: boolean | null
          has_coupons?: boolean | null
          id?: string
          name: string
          photo_quality?: string | null
          positioning_notes?: string | null
          price_range?: string | null
          rating?: number | null
          store_id: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: number | null
          has_combos?: boolean | null
          has_coupons?: boolean | null
          id?: string
          name?: string
          photo_quality?: string | null
          positioning_notes?: string | null
          price_range?: string | null
          rating?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_leads: {
        Row: {
          cidade: string | null
          created_at: string
          email: string
          faturamento: string | null
          id: string
          mensagem: string | null
          nome: string
          origem: string
          restaurante: string | null
          whatsapp: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email: string
          faturamento?: string | null
          id?: string
          mensagem?: string | null
          nome: string
          origem?: string
          restaurante?: string | null
          whatsapp: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email?: string
          faturamento?: string | null
          id?: string
          mensagem?: string | null
          nome?: string
          origem?: string
          restaurante?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      diagnosis_answers: {
        Row: {
          answer_type: string | null
          answer_value: Json | null
          created_at: string
          id: string
          question_key: string
          session_id: string
          step_key: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_type?: string | null
          answer_value?: Json | null
          created_at?: string
          id?: string
          question_key: string
          session_id: string
          step_key: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_type?: string | null
          answer_value?: Json | null
          created_at?: string
          id?: string
          question_key?: string
          session_id?: string
          step_key?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_sessions: {
        Row: {
          completed_at: string | null
          completion_percentage: number
          created_at: string
          current_step: number
          generated_at: string | null
          id: string
          started_at: string
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number
          created_at?: string
          current_step?: number
          generated_at?: string | null
          id?: string
          started_at?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number
          created_at?: string
          current_step?: number
          generated_at?: string | null
          id?: string
          started_at?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnosis_step_status: {
        Row: {
          completion_percentage: number
          id: string
          is_completed: boolean
          missing_required_fields: Json
          session_id: string
          step_key: string
          updated_at: string
        }
        Insert: {
          completion_percentage?: number
          id?: string
          is_completed?: boolean
          missing_required_fields?: Json
          session_id: string
          step_key: string
          updated_at?: string
        }
        Update: {
          completion_percentage?: number
          id?: string
          is_completed?: boolean
          missing_required_fields?: Json
          session_id?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_step_status_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_uploads: {
        Row: {
          classification: string
          created_at: string
          error: string | null
          extracted_text: string | null
          id: string
          mime_type: string | null
          session_id: string | null
          status: string
          storage_path: string
          store_id: string | null
          structured_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          classification?: string
          created_at?: string
          error?: string | null
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          session_id?: string | null
          status?: string
          storage_path: string
          store_id?: string | null
          structured_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          classification?: string
          created_at?: string
          error?: string | null
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          session_id?: string | null
          status?: string
          storage_path?: string
          store_id?: string | null
          structured_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnostics: {
        Row: {
          area: string
          business_impact: string | null
          created_at: string
          detailed_solution: Json | null
          evidence: string | null
          id: string
          practical_action: string | null
          priority: string | null
          probable_cause: string | null
          problem: string | null
          recommended_solution: string | null
          severity: string | null
          store_id: string
          suggested_deadline: string | null
        }
        Insert: {
          area: string
          business_impact?: string | null
          created_at?: string
          detailed_solution?: Json | null
          evidence?: string | null
          id?: string
          practical_action?: string | null
          priority?: string | null
          probable_cause?: string | null
          problem?: string | null
          recommended_solution?: string | null
          severity?: string | null
          store_id: string
          suggested_deadline?: string | null
        }
        Update: {
          area?: string
          business_impact?: string | null
          created_at?: string
          detailed_solution?: Json | null
          evidence?: string | null
          id?: string
          practical_action?: string | null
          priority?: string | null
          probable_cause?: string | null
          problem?: string | null
          recommended_solution?: string | null
          severity?: string | null
          store_id?: string
          suggested_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_snapshots: {
        Row: {
          created_at: string
          goal_progress: number | null
          id: string
          kpis: Json
          score: number | null
          scores_by_area: Json
          snapshot_date: string
          store_id: string
        }
        Insert: {
          created_at?: string
          goal_progress?: number | null
          id?: string
          kpis?: Json
          score?: number | null
          scores_by_area?: Json
          snapshot_date?: string
          store_id: string
        }
        Update: {
          created_at?: string
          goal_progress?: number | null
          id?: string
          kpis?: Json
          score?: number | null
          scores_by_area?: Json
          snapshot_date?: string
          store_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          archived_at: string | null
          area: string
          chunk_id: string
          chunk_version: number
          content: string
          created_at: string
          embedding: string | null
          embedding_version: number
          id: string
          published_at: string
          source: string
          source_version: number
          status: string
          supersedes: string | null
          tags: string[] | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          area: string
          chunk_id: string
          chunk_version?: number
          content: string
          created_at?: string
          embedding?: string | null
          embedding_version?: number
          id?: string
          published_at?: string
          source?: string
          source_version?: number
          status?: string
          supersedes?: string | null
          tags?: string[] | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          area?: string
          chunk_id?: string
          chunk_version?: number
          content?: string
          created_at?: string
          embedding?: string | null
          embedding_version?: number
          id?: string
          published_at?: string
          source?: string
          source_version?: number
          status?: string
          supersedes?: string | null
          tags?: string[] | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          ads_cost: number | null
          average_delivery_time: number | null
          average_ticket: number | null
          cancellation_rate: number | null
          coupon_cost: number | null
          created_at: string
          estimated_profit: number | null
          id: string
          orders: number | null
          period_end: string | null
          period_start: string | null
          rating: number | null
          revenue: number | null
          store_id: string
        }
        Insert: {
          ads_cost?: number | null
          average_delivery_time?: number | null
          average_ticket?: number | null
          cancellation_rate?: number | null
          coupon_cost?: number | null
          created_at?: string
          estimated_profit?: number | null
          id?: string
          orders?: number | null
          period_end?: string | null
          period_start?: string | null
          rating?: number | null
          revenue?: number | null
          store_id: string
        }
        Update: {
          ads_cost?: number | null
          average_delivery_time?: number | null
          average_ticket?: number | null
          cancellation_rate?: number | null
          coupon_cost?: number | null
          created_at?: string
          estimated_profit?: number | null
          id?: string
          orders?: number | null
          period_end?: string | null
          period_start?: string | null
          rating?: number | null
          revenue?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          attempts: number
          created_at: string
          diagnosis_session_id: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          result: Json | null
          status: string
          storage_path: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          diagnosis_session_id?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          result?: Json | null
          status?: string
          storage_path: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          diagnosis_session_id?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          result?: Json | null
          status?: string
          storage_path?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          complaints_count: number | null
          coupon_impact: number | null
          created_at: string
          description: string | null
          estimated_margin: number | null
          food_cost: number | null
          has_photo: boolean | null
          id: string
          is_active: boolean | null
          name: string
          packaging_cost: number | null
          photo_quality_score: number | null
          platform_fee_percent: number | null
          sale_price: number | null
          sales_quantity: number | null
          store_id: string
        }
        Insert: {
          category?: string | null
          complaints_count?: number | null
          coupon_impact?: number | null
          created_at?: string
          description?: string | null
          estimated_margin?: number | null
          food_cost?: number | null
          has_photo?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          packaging_cost?: number | null
          photo_quality_score?: number | null
          platform_fee_percent?: number | null
          sale_price?: number | null
          sales_quantity?: number | null
          store_id: string
        }
        Update: {
          category?: string | null
          complaints_count?: number | null
          coupon_impact?: number | null
          created_at?: string
          description?: string | null
          estimated_margin?: number | null
          food_cost?: number | null
          has_photo?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          packaging_cost?: number | null
          photo_quality_score?: number | null
          platform_fee_percent?: number | null
          sale_price?: number | null
          sales_quantity?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          category: string | null
          city: string | null
          contacted_at: string | null
          created_at: string
          delivery_fee: number | null
          delivery_time: number | null
          generic_names: boolean | null
          has_combos: boolean | null
          has_coupons: boolean | null
          has_photos: boolean | null
          id: string
          images: string[]
          main_gap: string | null
          name: string
          neighborhood: string | null
          notes: string | null
          platform: string | null
          potential_level: string | null
          potential_score: number | null
          price_range: string | null
          rating: number | null
          reviews_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          contacted_at?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: number | null
          generic_names?: boolean | null
          has_combos?: boolean | null
          has_coupons?: boolean | null
          has_photos?: boolean | null
          id?: string
          images?: string[]
          main_gap?: string | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          platform?: string | null
          potential_level?: string | null
          potential_score?: number | null
          price_range?: string | null
          rating?: number | null
          reviews_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          city?: string | null
          contacted_at?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: number | null
          generic_names?: boolean | null
          has_combos?: boolean | null
          has_coupons?: boolean | null
          has_photos?: boolean | null
          id?: string
          images?: string[]
          main_gap?: string | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          platform?: string | null
          potential_level?: string | null
          potential_score?: number | null
          price_range?: string | null
          rating?: number | null
          reviews_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          id?: string
          user_id: string
          window_start: string
        }
        Update: {
          action?: string
          count?: number
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          applied: boolean | null
          comment: string | null
          created_at: string
          generated_result: string | null
          id: string
          rating: string | null
          recommendation_id: string
          user_id: string
        }
        Insert: {
          applied?: boolean | null
          comment?: string | null
          created_at?: string
          generated_result?: string | null
          id?: string
          rating?: string | null
          recommendation_id: string
          user_id: string
        }
        Update: {
          applied?: boolean | null
          comment?: string | null
          created_at?: string
          generated_result?: string | null
          id?: string
          rating?: string | null
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_history"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_history: {
        Row: {
          applied_at: string | null
          created_at: string
          diagnosis_cycle_id: string | null
          expected_impact: string | null
          id: string
          metrics_after: Json | null
          metrics_before: Json | null
          outcome: string | null
          outcome_measured_at: string | null
          recommendation: string
          report_id: string | null
          rule_id: string | null
          source: string
          source_ref: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          diagnosis_cycle_id?: string | null
          expected_impact?: string | null
          id?: string
          metrics_after?: Json | null
          metrics_before?: Json | null
          outcome?: string | null
          outcome_measured_at?: string | null
          recommendation: string
          report_id?: string | null
          rule_id?: string | null
          source?: string
          source_ref?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          diagnosis_cycle_id?: string | null
          expected_impact?: string | null
          id?: string
          metrics_after?: Json | null
          metrics_before?: Json | null
          outcome?: string | null
          outcome_measured_at?: string | null
          recommendation?: string
          report_id?: string | null
          rule_id?: string | null
          source?: string
          source_ref?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          display_name: string | null
          footer_text: string | null
          id: string
          kpi_order: Json
          logo_url: string | null
          primary_color: string
          sections: Json
          store_id: string
          summary_tone: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          footer_text?: string | null
          id?: string
          kpi_order?: Json
          logo_url?: string | null
          primary_color?: string
          sections?: Json
          store_id: string
          summary_tone?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          footer_text?: string | null
          id?: string
          kpi_order?: Json
          logo_url?: string | null
          primary_color?: string
          sections?: Json
          store_id?: string
          summary_tone?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          executive_summary: string | null
          general_score: number | null
          id: string
          key_problems: Json | null
          opportunities: Json | null
          recommendations: Json | null
          report_data: Json | null
          store_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          executive_summary?: string | null
          general_score?: number | null
          id?: string
          key_problems?: Json | null
          opportunities?: Json | null
          recommendations?: Json | null
          report_data?: Json | null
          store_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          executive_summary?: string | null
          general_score?: number | null
          id?: string
          key_problems?: Json | null
          opportunities?: Json | null
          recommendations?: Json | null
          report_data?: Json | null
          store_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          detected_topics: string[] | null
          id: string
          order_date: string | null
          rating: number | null
          sentiment: string | null
          store_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          detected_topics?: string[] | null
          id?: string
          order_date?: string | null
          rating?: number | null
          sentiment?: string | null
          store_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          detected_topics?: string[] | null
          id?: string
          order_date?: string | null
          rating?: number | null
          sentiment?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_goals: {
        Row: {
          created_at: string
          current_value: number | null
          deadline: string | null
          goal_type: string
          id: string
          metric_key: string | null
          notes: string | null
          priority: string | null
          status: string
          store_id: string
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          goal_type: string
          id?: string
          metric_key?: string | null
          notes?: string | null
          priority?: string | null
          status?: string
          store_id: string
          target_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          goal_type?: string
          id?: string
          metric_key?: string | null
          notes?: string | null
          priority?: string | null
          status?: string
          store_id?: string
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_memory: {
        Row: {
          current_goal: string | null
          last_diagnosis_at: string | null
          metrics_14d: Json
          metrics_30d: Json
          metrics_7d: Json
          profile: Json
          recurring_problems: Json
          store_id: string
          updated_at: string
        }
        Insert: {
          current_goal?: string | null
          last_diagnosis_at?: string | null
          metrics_14d?: Json
          metrics_30d?: Json
          metrics_7d?: Json
          profile?: Json
          recurring_problems?: Json
          store_id: string
          updated_at?: string
        }
        Update: {
          current_goal?: string | null
          last_diagnosis_at?: string | null
          metrics_14d?: Json
          metrics_30d?: Json
          metrics_7d?: Json
          profile?: Json
          recurring_problems?: Json
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_memory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          average_ticket: number | null
          cancellation_rate: number | null
          category: string | null
          city: string | null
          created_at: string
          delivery_fee: number | null
          id: string
          monthly_orders: number | null
          monthly_revenue: number | null
          name: string
          neighborhood: string | null
          notes: string | null
          opening_hours: string | null
          platform: string | null
          promised_delivery_time: number | null
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_ticket?: number | null
          cancellation_rate?: number | null
          category?: string | null
          city?: string | null
          created_at?: string
          delivery_fee?: number | null
          id?: string
          monthly_orders?: number | null
          monthly_revenue?: number | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          opening_hours?: string | null
          platform?: string | null
          promised_delivery_time?: number | null
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_ticket?: number | null
          cancellation_rate?: number | null
          category?: string | null
          city?: string | null
          created_at?: string
          delivery_fee?: number | null
          id?: string
          monthly_orders?: number | null
          monthly_revenue?: number | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          opening_hours?: string | null
          platform?: string | null
          promised_delivery_time?: number | null
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_examples: {
        Row: {
          ai_response: Json
          created_at: string
          exported: boolean
          human_feedback: Json | null
          id: string
          ideal_response: Json | null
          input_payload: Json
          outcome: Json | null
          quality_score: number | null
          report_id: string | null
          store_id: string | null
        }
        Insert: {
          ai_response: Json
          created_at?: string
          exported?: boolean
          human_feedback?: Json | null
          id?: string
          ideal_response?: Json | null
          input_payload: Json
          outcome?: Json | null
          quality_score?: number | null
          report_id?: string | null
          store_id?: string | null
        }
        Update: {
          ai_response?: Json
          created_at?: string
          exported?: boolean
          human_feedback?: Json | null
          id?: string
          ideal_response?: Json | null
          input_payload?: Json
          outcome?: Json | null
          quality_score?: number | null
          report_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_examples_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_examples_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_snapshots: {
        Row: {
          cancellation_rate: number | null
          created_at: string
          id: string
          rating: number | null
          score: number | null
          store_id: string
          user_id: string
          week_start: string
          weekly_revenue: number | null
        }
        Insert: {
          cancellation_rate?: number | null
          created_at?: string
          id?: string
          rating?: number | null
          score?: number | null
          store_id: string
          user_id: string
          week_start: string
          weekly_revenue?: number | null
        }
        Update: {
          cancellation_rate?: number | null
          created_at?: string
          id?: string
          rating?: number | null
          score?: number | null
          store_id?: string
          user_id?: string
          week_start?: string
          weekly_revenue?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_store_access: { Args: { _store_id: string }; Returns: boolean }
      increment_rate_limit: {
        Args: { _action: string; _user: string; _window: string }
        Returns: number
      }
      match_cases: {
        Args: {
          filter_rule_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          diagnosis: string
          id: string
          lesson_learned: string
          outcome: string
          problem_rule_id: string
          recommendation: string
          similarity: number
          store_profile: Json
        }[]
      }
      match_knowledge: {
        Args: {
          filter_areas?: string[]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          area: string
          chunk_id: string
          chunk_version: number
          content: string
          id: string
          similarity: number
          source: string
          source_version: number
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
