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
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          grants_admin: boolean
          id: string
          industry_hint: string | null
          invited_name: string | null
          key: string
          location_hint: string | null
          note: string | null
          status: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          grants_admin?: boolean
          id?: string
          industry_hint?: string | null
          invited_name?: string | null
          key: string
          location_hint?: string | null
          note?: string | null
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          grants_admin?: boolean
          id?: string
          industry_hint?: string | null
          invited_name?: string | null
          key?: string
          location_hint?: string | null
          note?: string | null
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          answers: Json
          created_at: string
          id: string
          profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_markets: string[]
          background: string | null
          base_countries: string[]
          bio: string | null
          call_about: string | null
          call_link: string | null
          chapter_role: string | null
          city: string | null
          contact_pref: string | null
          country: string | null
          created_at: string
          current_projects: string | null
          email: string | null
          expertise: string[]
          field_visibility: Json
          flagged_fields: string[]
          focus_now: string | null
          full_name: string
          functional_roles: string[]
          headline: string | null
          home_chapter_city: string | null
          id: string
          industries: string[]
          interested_industries: string[]
          languages: string[]
          linkedin_url: string | null
          membership_status: string
          offering: string | null
          offering_types: string[]
          onboarding_complete: boolean
          one_liner: string | null
          open_to_contact: string | null
          other_cities: string[]
          outside_work: string | null
          passports: string[]
          photo_url: string | null
          review_status: string
          role_org: string | null
          seeking: string | null
          seeking_people: string[]
          seeking_people_note: string | null
          skipped_fields: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          active_markets?: string[]
          background?: string | null
          base_countries?: string[]
          bio?: string | null
          call_about?: string | null
          call_link?: string | null
          chapter_role?: string | null
          city?: string | null
          contact_pref?: string | null
          country?: string | null
          created_at?: string
          current_projects?: string | null
          email?: string | null
          expertise?: string[]
          field_visibility?: Json
          flagged_fields?: string[]
          focus_now?: string | null
          full_name?: string
          functional_roles?: string[]
          headline?: string | null
          home_chapter_city?: string | null
          id?: string
          industries?: string[]
          interested_industries?: string[]
          languages?: string[]
          linkedin_url?: string | null
          membership_status?: string
          offering?: string | null
          offering_types?: string[]
          onboarding_complete?: boolean
          one_liner?: string | null
          open_to_contact?: string | null
          other_cities?: string[]
          outside_work?: string | null
          passports?: string[]
          photo_url?: string | null
          review_status?: string
          role_org?: string | null
          seeking?: string | null
          seeking_people?: string[]
          seeking_people_note?: string | null
          skipped_fields?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          active_markets?: string[]
          background?: string | null
          base_countries?: string[]
          bio?: string | null
          call_about?: string | null
          call_link?: string | null
          chapter_role?: string | null
          city?: string | null
          contact_pref?: string | null
          country?: string | null
          created_at?: string
          current_projects?: string | null
          email?: string | null
          expertise?: string[]
          field_visibility?: Json
          flagged_fields?: string[]
          focus_now?: string | null
          full_name?: string
          functional_roles?: string[]
          headline?: string | null
          home_chapter_city?: string | null
          id?: string
          industries?: string[]
          interested_industries?: string[]
          languages?: string[]
          linkedin_url?: string | null
          membership_status?: string
          offering?: string | null
          offering_types?: string[]
          onboarding_complete?: boolean
          one_liner?: string | null
          open_to_contact?: string | null
          other_cities?: string[]
          outside_work?: string | null
          passports?: string[]
          photo_url?: string | null
          review_status?: string
          role_org?: string | null
          seeking?: string | null
          seeking_people?: string[]
          seeking_people_note?: string | null
          skipped_fields?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          query: string
          result_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          query: string
          result_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          query?: string
          result_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_club_stats: { Args: never; Returns: Json }
      get_or_create_conversation: {
        Args: { _other_user: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      redeem_invite: { Args: { _key: string }; Returns: string }
      validate_invite: {
        Args: { _key: string }
        Returns: {
          email: string
          invited_name: string
          note: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
