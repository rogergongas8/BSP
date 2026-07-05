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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      phrases: {
        Row: {
          answer: string
          created_at: string
          expected_stem: string | null
          id: string
          person: string
          sentence: string
          stem_group: string | null
          tense: string
          type: string
          verb: string
        }
        Insert: {
          answer: string
          created_at?: string
          expected_stem?: string | null
          id?: string
          person: string
          sentence: string
          stem_group?: string | null
          tense: string
          type: string
          verb: string
        }
        Update: {
          answer?: string
          created_at?: string
          expected_stem?: string | null
          id?: string
          person?: string
          sentence?: string
          stem_group?: string | null
          tense?: string
          type?: string
          verb?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          completed_at: string
          correct: number
          duration_seconds: number
          first_try: number
          id: string
          skipped: number
          tense: string
          total: number
          user_id: string
          with_hints: number
        }
        Insert: {
          completed_at?: string
          correct: number
          duration_seconds?: number
          first_try?: number
          id?: string
          skipped?: number
          tense: string
          total: number
          user_id: string
          with_hints?: number
        }
        Update: {
          completed_at?: string
          correct?: number
          duration_seconds?: number
          first_try?: number
          id?: string
          skipped?: number
          tense?: string
          total?: number
          user_id?: string
          with_hints?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          id: number
          day_index: number
          text: string
          xp_reward: number
          type: 'activities' | 'tense_correct' | 'cross_correct'
          target: number
          tense: string | null
        }
        Insert: {
          id?: number
          day_index: number
          text: string
          xp_reward: number
          type: 'activities' | 'tense_correct' | 'cross_correct'
          target: number
          tense?: string | null
        }
        Update: {
          text?: string
          xp_reward?: number
          type?: 'activities' | 'tense_correct' | 'cross_correct'
          target?: number
          tense?: string | null
        }
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          id: string
          code: string
          host_id: string
          status: 'waiting' | 'playing' | 'finished'
          max_players: number
          total_rounds: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          host_id: string
          status?: 'waiting' | 'playing' | 'finished'
          max_players?: number
          total_rounds?: number
          created_at?: string
        }
        Update: {
          code?: string
          host_id?: string
          status?: 'waiting' | 'playing' | 'finished'
          max_players?: number
          total_rounds?: number
        }
        Relationships: []
      }
      rounds: {
        Row: {
          id: string
          room_id: string
          phrase_id: string
          round_number: number
          status: 'pending' | 'active' | 'collecting' | 'results' | 'scoreboard' | 'done'
          started_at: string | null
          duration_seconds: number
        }
        Insert: {
          id?: string
          room_id: string
          phrase_id: string
          round_number: number
          status?: 'pending' | 'active' | 'collecting' | 'results' | 'scoreboard' | 'done'
          started_at?: string | null
          duration_seconds?: number
        }
        Update: {
          id?: string
          room_id?: string
          phrase_id?: string
          round_number?: number
          status?: 'pending' | 'active' | 'collecting' | 'results' | 'scoreboard' | 'done'
          started_at?: string | null
          duration_seconds?: number
        }
        Relationships: []
      }
      round_answers: {
        Row: {
          id: string
          round_id: string
          user_id: string
          answer: string | null
          is_correct: boolean
          points_awarded: number
          response_time_ms: number | null
          validation_status: string
          submitted_at: string
        }
        Insert: {
          id?: string
          round_id: string
          user_id: string
          answer?: string | null
          is_correct?: boolean
          points_awarded?: number
          response_time_ms?: number | null
          validation_status?: string
          submitted_at?: string
        }
        Update: {
          is_correct?: boolean
          points_awarded?: number
          validation_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activities_completed: number
          created_at: string
          id: string
          last_activity_date: string | null
          streak: number
          top3_finishes: number
          total_xp: number
          updated_at: string
          username: string
        }
        Insert: {
          activities_completed?: number
          created_at?: string
          id: string
          last_activity_date?: string | null
          streak?: number
          top3_finishes?: number
          total_xp?: number
          updated_at?: string
          username: string
        }
        Update: {
          activities_completed?: number
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak?: number
          top3_finishes?: number
          total_xp?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
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
      generate_room_code: { Args: Record<never, never>; Returns: string }
      increment_activities: { Args: { p_user_id: string }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
