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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      pace_zones: {
        Row: {
          created_at: string | null
          id: string
          pace_10k: string
          pace_1k: string
          pace_5k: string
          pace_easy: string
          pace_half_marathon: string
          pace_interval: string
          pace_long_run: string
          pace_marathon: string
          pace_tempo: string
          pace_threshold: string
          time_5k: number
          updated_at: string | null
          user_id: string
          vdot_score: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          pace_10k: string
          pace_1k: string
          pace_5k: string
          pace_easy: string
          pace_half_marathon: string
          pace_interval: string
          pace_long_run?: string
          pace_marathon: string
          pace_tempo: string
          pace_threshold: string
          time_5k: number
          updated_at?: string | null
          user_id: string
          vdot_score: number
        }
        Update: {
          created_at?: string | null
          id?: string
          pace_10k?: string
          pace_1k?: string
          pace_5k?: string
          pace_easy?: string
          pace_half_marathon?: string
          pace_interval?: string
          pace_long_run?: string
          pace_marathon?: string
          pace_tempo?: string
          pace_threshold?: string
          time_5k?: number
          updated_at?: string | null
          user_id?: string
          vdot_score?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_workouts: {
        Row: {
          completed: boolean | null
          created_at: string | null
          distance: number | null
          id: string
          joy_rating: number | null
          notes: string | null
          pace: string | null
          scheduled_date: string
          trained_time: number | null
          updated_at: string | null
          user_id: string
          workout_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          distance?: number | null
          id?: string
          joy_rating?: number | null
          notes?: string | null
          pace?: string | null
          scheduled_date: string
          trained_time?: number | null
          updated_at?: string | null
          user_id: string
          workout_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          distance?: number | null
          id?: string
          joy_rating?: number | null
          notes?: string | null
          pace?: string | null
          scheduled_date?: string
          trained_time?: number | null
          updated_at?: string | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_library"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_library: {
        Row: {
          category: Database["public"]["Enums"]["workout_category"]
          created_at: string | null
          description: string | null
          duration: string | null
          effort: number | null
          id: string
          name: string
          pace: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["workout_category"]
          created_at?: string | null
          description?: string | null
          duration?: string | null
          effort?: number | null
          id?: string
          name: string
          pace?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["workout_category"]
          created_at?: string | null
          description?: string | null
          duration?: string | null
          effort?: number | null
          id?: string
          name?: string
          pace?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_library_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      workout_category:
        | "intervallpass"
        | "distanspass"
        | "långpass"
        | "styrka"
        | "tävling"
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
      workout_category: [
        "intervallpass",
        "distanspass",
        "långpass",
        "styrka",
        "tävling",
      ],
    },
  },
} as const
