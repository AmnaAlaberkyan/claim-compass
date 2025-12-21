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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor: string
          actor_type: string
          claim_id: string | null
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor: string
          actor_type: string
          claim_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          actor_type?: string
          claim_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          adjuster_decision: string | null
          adjuster_notes: string | null
          ai_recommendation: string | null
          ai_summary: string | null
          claimant_name: string
          confidence_score: number | null
          cost_high: number | null
          cost_low: number | null
          created_at: string
          damage_assessment: Json | null
          fraud_indicators: string[] | null
          id: string
          incident_date: string
          incident_description: string
          photo_url: string | null
          policy_number: string
          quality_issues: Json | null
          quality_score: number | null
          safety_concerns: string[] | null
          severity_score: number | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number
        }
        Insert: {
          adjuster_decision?: string | null
          adjuster_notes?: string | null
          ai_recommendation?: string | null
          ai_summary?: string | null
          claimant_name: string
          confidence_score?: number | null
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string
          damage_assessment?: Json | null
          fraud_indicators?: string[] | null
          id?: string
          incident_date: string
          incident_description: string
          photo_url?: string | null
          policy_number: string
          quality_issues?: Json | null
          quality_score?: number | null
          safety_concerns?: string[] | null
          severity_score?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number
        }
        Update: {
          adjuster_decision?: string | null
          adjuster_notes?: string | null
          ai_recommendation?: string | null
          ai_summary?: string | null
          claimant_name?: string
          confidence_score?: number | null
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string
          damage_assessment?: Json | null
          fraud_indicators?: string[] | null
          id?: string
          incident_date?: string
          incident_description?: string
          photo_url?: string | null
          policy_number?: string
          quality_issues?: Json | null
          quality_score?: number | null
          safety_concerns?: string[] | null
          severity_score?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          vehicle_make?: string
          vehicle_model?: string
          vehicle_year?: number
        }
        Relationships: []
      }
      estimates: {
        Row: {
          claim_id: string
          created_at: string
          id: string
          payload: Json
        }
        Insert: {
          claim_id: string
          created_at?: string
          id?: string
          payload: Json
        }
        Update: {
          claim_id?: string
          created_at?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "estimates_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
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
      claim_status:
        | "pending"
        | "processing"
        | "approved"
        | "review"
        | "escalated"
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
      claim_status: [
        "pending",
        "processing",
        "approved",
        "review",
        "escalated",
      ],
    },
  },
} as const
