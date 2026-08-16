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
      contrast_mistakes: {
        Row: {
          battle_id: string
          contrast_phrase_id: string
          created_at: string
          id: string
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          battle_id: string
          contrast_phrase_id: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          battle_id?: string
          contrast_phrase_id?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrast_mistakes_contrast_phrase_id_fkey"
            columns: ["contrast_phrase_id"]
            isOneToOne: false
            referencedRelation: "contrast_phrases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrast_mistakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contrast_phrases: {
        Row: {
          battle_id: string
          correct_1: number
          correct_2: number | null
          created_at: string
          id: string
          infinitive_1: string
          infinitive_2: string | null
          option_a_1: string
          option_a_2: string | null
          option_b_1: string
          option_b_2: string | null
          sentence: string
        }
        Insert: {
          battle_id: string
          correct_1: number
          correct_2?: number | null
          created_at?: string
          id?: string
          infinitive_1: string
          infinitive_2?: string | null
          option_a_1: string
          option_a_2?: string | null
          option_b_1: string
          option_b_2?: string | null
          sentence: string
        }
        Update: {
          battle_id?: string
          correct_1?: number
          correct_2?: number | null
          created_at?: string
          id?: string
          infinitive_1?: string
          infinitive_2?: string | null
          option_a_1?: string
          option_a_2?: string | null
          option_b_1?: string
          option_b_2?: string | null
          sentence?: string
        }
        Relationships: []
      }
      daily_challenge_completions: {
        Row: {
          completion_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          completion_date?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completion_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          day_index: number | null
          difficulty: string
          id: number
          scope: string | null
          target: number
          target_secondary: number | null
          tense: string | null
          text: string
          type: string
          xp_reward: number
        }
        Insert: {
          day_index?: number | null
          difficulty: string
          id?: number
          scope?: string | null
          target: number
          target_secondary?: number | null
          tense?: string | null
          text: string
          type: string
          xp_reward: number
        }
        Update: {
          day_index?: number | null
          difficulty?: string
          id?: number
          scope?: string | null
          target?: number
          target_secondary?: number | null
          tense?: string | null
          text?: string
          type?: string
          xp_reward?: number
        }
        Relationships: []
      }
      phrase_mistakes: {
        Row: {
          created_at: string
          id: string
          phrase_id: string
          phrase_type: string
          resolved_at: string | null
          tense: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phrase_id: string
          phrase_type: string
          resolved_at?: string | null
          tense: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phrase_id?: string
          phrase_type?: string
          resolved_at?: string | null
          tense?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrase_mistakes_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_mistakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      play_time_logs: {
        Row: {
          id: string
          logged_at: string
          seconds: number
          source: string
          user_id: string
        }
        Insert: {
          id?: string
          logged_at?: string
          seconds: number
          source: string
          user_id: string
        }
        Update: {
          id?: string
          logged_at?: string
          seconds?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          client_session_id: string | null
          completed_at: string
          correct: number
          duration_seconds: number
          first_try: number
          half_correct: number
          id: string
          skipped: number
          tense: string
          total: number
          user_id: string
          with_hints: number
        }
        Insert: {
          client_session_id?: string | null
          completed_at?: string
          correct: number
          duration_seconds?: number
          first_try?: number
          half_correct?: number
          id?: string
          skipped?: number
          tense: string
          total: number
          user_id: string
          with_hints?: number
        }
        Update: {
          client_session_id?: string | null
          completed_at?: string
          correct?: number
          duration_seconds?: number
          first_try?: number
          half_correct?: number
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
      profiles: {
        Row: {
          activities_completed: number
          avatar_id: string | null
          created_at: string
          daily_challenge_streak: number
          daily_challenges_completed: number
          games_won: number
          id: string
          last_activity_date: string | null
          last_daily_challenge_date: string | null
          streak: number
          top3_finishes: number
          total_xp: number
          updated_at: string
          username: string
        }
        Insert: {
          activities_completed?: number
          avatar_id?: string | null
          created_at?: string
          daily_challenge_streak?: number
          daily_challenges_completed?: number
          games_won?: number
          id: string
          last_activity_date?: string | null
          last_daily_challenge_date?: string | null
          streak?: number
          top3_finishes?: number
          total_xp?: number
          updated_at?: string
          username: string
        }
        Update: {
          activities_completed?: number
          avatar_id?: string | null
          created_at?: string
          daily_challenge_streak?: number
          daily_challenges_completed?: number
          games_won?: number
          id?: string
          last_activity_date?: string | null
          last_daily_challenge_date?: string | null
          streak?: number
          top3_finishes?: number
          total_xp?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          game_mode: string
          game_type: string
          host_id: string
          id: string
          max_players: number
          status: string
          total_rounds: number
        }
        Insert: {
          code: string
          created_at?: string
          game_mode?: string
          game_type?: string
          host_id: string
          id?: string
          max_players?: number
          status?: string
          total_rounds?: number
        }
        Update: {
          code?: string
          created_at?: string
          game_mode?: string
          game_type?: string
          host_id?: string
          id?: string
          max_players?: number
          status?: string
          total_rounds?: number
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      round_answers: {
        Row: {
          answer: string | null
          id: string
          is_correct: boolean
          points_awarded: number
          response_time_ms: number | null
          round_id: string
          selected_1: number | null
          selected_2: number | null
          submitted_at: string
          user_id: string
          validation_status: string
        }
        Insert: {
          answer?: string | null
          id?: string
          is_correct?: boolean
          points_awarded?: number
          response_time_ms?: number | null
          round_id: string
          selected_1?: number | null
          selected_2?: number | null
          submitted_at?: string
          user_id: string
          validation_status?: string
        }
        Update: {
          answer?: string | null
          id?: string
          is_correct?: boolean
          points_awarded?: number
          response_time_ms?: number | null
          round_id?: string
          selected_1?: number | null
          selected_2?: number | null
          submitted_at?: string
          user_id?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          contrast_phrase_id: string | null
          duration_seconds: number
          id: string
          phrase_id: string | null
          room_id: string
          round_number: number
          started_at: string | null
          status: string
        }
        Insert: {
          contrast_phrase_id?: string | null
          duration_seconds?: number
          id?: string
          phrase_id?: string | null
          room_id: string
          round_number: number
          started_at?: string | null
          status?: string
        }
        Update: {
          contrast_phrase_id?: string | null
          duration_seconds?: number
          id?: string
          phrase_id?: string | null
          room_id?: string
          round_number?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_contrast_phrase_id_fkey"
            columns: ["contrast_phrase_id"]
            isOneToOne: false
            referencedRelation: "contrast_phrases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
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
      generate_room_code: { Args: never; Returns: string }
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
