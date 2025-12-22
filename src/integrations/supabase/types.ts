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
          actor_id: string | null
          actor_type: string
          claim_id: string | null
          created_at: string
          decision: Json | null
          event_hash: string | null
          event_type: string
          id: string
          inputs_ref: Json | null
          metrics: Json | null
          model_name: string | null
          model_provider: string | null
          model_version: string | null
          payload: Json
          prev_event_hash: string | null
          request_id: string | null
          session_id: string | null
          snapshots: Json | null
          timestamp: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          claim_id?: string | null
          created_at?: string
          decision?: Json | null
          event_hash?: string | null
          event_type: string
          id?: string
          inputs_ref?: Json | null
          metrics?: Json | null
          model_name?: string | null
          model_provider?: string | null
          model_version?: string | null
          payload?: Json
          prev_event_hash?: string | null
          request_id?: string | null
          session_id?: string | null
          snapshots?: Json | null
          timestamp?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          claim_id?: string | null
          created_at?: string
          decision?: Json | null
          event_hash?: string | null
          event_type?: string
          id?: string
          inputs_ref?: Json | null
          metrics?: Json | null
          model_name?: string | null
          model_provider?: string | null
          model_version?: string | null
          payload?: Json
          prev_event_hash?: string | null
          request_id?: string | null
          session_id?: string | null
          snapshots?: Json | null
          timestamp?: string
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
          annotations_json: Json | null
          claimant_name: string
          confidence_score: number | null
          cost_high: number | null
          cost_low: number | null
          created_at: string
          damage_assessment: Json | null
          fraud_indicators: string[] | null
          human_review_reason: string | null
          human_review_requested: boolean
          id: string
          incident_date: string
          incident_description: string
          intake_preference: string
          photo_url: string | null
          policy_number: string
          quality_issues: Json | null
          quality_score: number | null
          routing_reasons: Json | null
          routing_snapshot: Json | null
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
          annotations_json?: Json | null
          claimant_name: string
          confidence_score?: number | null
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string
          damage_assessment?: Json | null
          fraud_indicators?: string[] | null
          human_review_reason?: string | null
          human_review_requested?: boolean
          id?: string
          incident_date: string
          incident_description: string
          intake_preference?: string
          photo_url?: string | null
          policy_number: string
          quality_issues?: Json | null
          quality_score?: number | null
          routing_reasons?: Json | null
          routing_snapshot?: Json | null
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
          annotations_json?: Json | null
          claimant_name?: string
          confidence_score?: number | null
          cost_high?: number | null
          cost_low?: number | null
          created_at?: string
          damage_assessment?: Json | null
          fraud_indicators?: string[] | null
          human_review_reason?: string | null
          human_review_requested?: boolean
          id?: string
          incident_date?: string
          incident_description?: string
          intake_preference?: string
          photo_url?: string | null
          policy_number?: string
          quality_issues?: Json | null
          quality_score?: number | null
          routing_reasons?: Json | null
          routing_snapshot?: Json | null
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
      controls: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
