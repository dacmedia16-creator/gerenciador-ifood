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
          created_at: string
          description: string | null
          diagnostic_id: string | null
          due_date: string | null
          effort: string | null
          id: string
          impact: string | null
          priority: string | null
          responsible: string | null
          status: string
          store_id: string
          title: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          due_date?: string | null
          effort?: string | null
          id?: string
          impact?: string | null
          priority?: string | null
          responsible?: string | null
          status?: string
          store_id: string
          title: string
        }
        Update: {
          area?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          due_date?: string | null
          effort?: string | null
          id?: string
          impact?: string | null
          priority?: string | null
          responsible?: string | null
          status?: string
          store_id?: string
          title?: string
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
            foreignKeyName: "action_plans_store_id_fkey"
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
      diagnostics: {
        Row: {
          area: string
          business_impact: string | null
          created_at: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_store_access: { Args: { _store_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
