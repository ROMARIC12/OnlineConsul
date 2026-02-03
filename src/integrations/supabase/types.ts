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
      appointment_waiting_list: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          is_notified: boolean | null
          patient_id: string
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          is_notified?: boolean | null
          patient_id: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_notified?: boolean | null
          patient_id?: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_waiting_list_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waiting_list_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          cancellation_reason: string | null
          cancelled_at: string | null
          clinic_id: string | null
          confirmation_required: boolean | null
          confirmed_at: string | null
          created_at: string | null
          doctor_id: string
          id: string
          is_first_visit: boolean | null
          patient_id: string
          status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          clinic_id?: string | null
          confirmation_required?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          doctor_id: string
          id?: string
          is_first_visit?: boolean | null
          patient_id: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          clinic_id?: string | null
          confirmation_required?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_first_visit?: boolean | null
          patient_id?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clinic_doctors: {
        Row: {
          clinic_id: string
          doctor_id: string
          id: string
          is_active: boolean | null
          role: string | null
        }
        Insert: {
          clinic_id: string
          doctor_id: string
          id?: string
          is_active?: boolean | null
          role?: string | null
        }
        Update: {
          clinic_id?: string
          doctor_id?: string
          id?: string
          is_active?: boolean | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_doctors_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_secretaries: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          secretary_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          secretary_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          secretary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_secretaries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_secretaries_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          name: string
          phone: string | null
          pmr_access: boolean | null
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          phone?: string | null
          pmr_access?: boolean | null
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          phone?: string | null
          pmr_access?: boolean | null
        }
        Relationships: []
      }
      consultation_forms: {
        Row: {
          allergies: string[] | null
          appointment_id: string
          chronic_conditions: string[] | null
          consultation_reason: string | null
          created_at: string | null
          current_treatments: string | null
          id: string
          identity_confirmed: boolean | null
        }
        Insert: {
          allergies?: string[] | null
          appointment_id: string
          chronic_conditions?: string[] | null
          consultation_reason?: string | null
          created_at?: string | null
          current_treatments?: string | null
          id?: string
          identity_confirmed?: boolean | null
        }
        Update: {
          allergies?: string[] | null
          appointment_id?: string
          chronic_conditions?: string[] | null
          consultation_reason?: string | null
          created_at?: string | null
          current_treatments?: string | null
          id?: string
          identity_confirmed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_forms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          day_of_week: number | null
          doctor_id: string
          end_time: string
          id: string
          is_active: boolean | null
          max_appointments: number | null
          start_time: string
        }
        Insert: {
          day_of_week?: number | null
          doctor_id: string
          end_time: string
          id?: string
          is_active?: boolean | null
          max_appointments?: number | null
          start_time: string
        }
        Update: {
          day_of_week?: number | null
          doctor_id?: string
          end_time?: string
          id?: string
          is_active?: boolean | null
          max_appointments?: number | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_statistics: {
        Row: {
          completed_appointments: number | null
          doctor_id: string
          last_updated: string | null
          monthly_revenue: number | null
          no_show_count: number | null
          no_show_rate: number | null
          total_appointments: number | null
        }
        Insert: {
          completed_appointments?: number | null
          doctor_id: string
          last_updated?: string | null
          monthly_revenue?: number | null
          no_show_count?: number | null
          no_show_rate?: number | null
          total_appointments?: number | null
        }
        Update: {
          completed_appointments?: number | null
          doctor_id?: string
          last_updated?: string | null
          monthly_revenue?: number | null
          no_show_count?: number | null
          no_show_rate?: number | null
          total_appointments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_statistics_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          accepts_insurance: boolean | null
          accepts_mobile_money: boolean | null
          bio: string | null
          consultation_price_max: number | null
          consultation_price_min: number | null
          created_at: string | null
          id: string
          is_in_session: boolean | null
          is_online: boolean | null
          is_teleconsultation_free: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          license_number: string | null
          photo_url: string | null
          profile_id: string
          specialty: string
          teleconsultation_enabled: boolean | null
          teleconsultation_price_per_hour: number | null
          teleconsultation_price_per_minute: number | null
          years_experience: number | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          accepts_mobile_money?: boolean | null
          bio?: string | null
          consultation_price_max?: number | null
          consultation_price_min?: number | null
          created_at?: string | null
          id?: string
          is_in_session?: boolean | null
          is_online?: boolean | null
          is_teleconsultation_free?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_number?: string | null
          photo_url?: string | null
          profile_id: string
          specialty: string
          teleconsultation_enabled?: boolean | null
          teleconsultation_price_per_hour?: number | null
          teleconsultation_price_per_minute?: number | null
          years_experience?: number | null
        }
        Update: {
          accepts_insurance?: boolean | null
          accepts_mobile_money?: boolean | null
          bio?: string | null
          consultation_price_max?: number | null
          consultation_price_min?: number | null
          created_at?: string | null
          id?: string
          is_in_session?: boolean | null
          is_online?: boolean | null
          is_teleconsultation_free?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_number?: string | null
          photo_url?: string | null
          profile_id?: string
          specialty?: string
          teleconsultation_enabled?: boolean | null
          teleconsultation_price_per_hour?: number | null
          teleconsultation_price_per_minute?: number | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_contents: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          published_at: string | null
          title: string
          validated_by: string | null
          validated_by_committee: boolean | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          published_at?: string | null
          title: string
          validated_by?: string | null
          validated_by_committee?: boolean | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          published_at?: string | null
          title?: string
          validated_by?: string | null
          validated_by_committee?: boolean | null
        }
        Relationships: []
      }
      health_reminders: {
        Row: {
          id: string
          is_sent: boolean | null
          message: string | null
          patient_id: string
          reminder_type: string
          scheduled_date: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          is_sent?: boolean | null
          message?: string | null
          patient_id: string
          reminder_type: string
          scheduled_date: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          is_sent?: boolean | null
          message?: string | null
          patient_id?: string
          reminder_type?: string
          scheduled_date?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string
          id: string
          invoice_number: string
          issued_at: string | null
          paid_amount: number | null
          total_amount: number
        }
        Insert: {
          appointment_id: string
          id?: string
          invoice_number: string
          issued_at?: string | null
          paid_amount?: number | null
          total_amount: number
        }
        Update: {
          appointment_id?: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          paid_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_documents: {
        Row: {
          consultation_form_id: string
          document_type: string | null
          file_name: string | null
          file_path: string
          id: string
          uploaded_at: string | null
        }
        Insert: {
          consultation_form_id: string
          document_type?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          consultation_form_id?: string
          document_type?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_documents_consultation_form_id_fkey"
            columns: ["consultation_form_id"]
            isOneToOne: false
            referencedRelation: "consultation_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact: string | null
          gender: string | null
          id: string
          profile_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string | null
          id: string
          paid_at: string | null
          patient_id: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          provider: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          patient_id: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          provider?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          patient_id?: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
          provider?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string
          id: string
          is_active: boolean | null
          language: string | null
          last_name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string
          id: string
          is_active?: boolean | null
          language?: string | null
          last_name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teleconsultation_sessions: {
        Row: {
          access_code: string
          amount: number | null
          channel_name: string
          created_at: string
          doctor_id: string
          duration_minutes: number
          ended_at: string | null
          id: string
          patient_id: string
          payment_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          access_code: string
          amount?: number | null
          channel_name: string
          created_at?: string
          doctor_id: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          patient_id: string
          payment_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          access_code?: string
          amount?: number | null
          channel_name?: string
          created_at?: string
          doctor_id?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          patient_id?: string
          payment_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teleconsultation_sessions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teleconsultation_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teleconsultation_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      urgent_requests: {
        Row: {
          called_by: string | null
          clinic_id: string | null
          created_at: string | null
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["urgent_status"] | null
        }
        Insert: {
          called_by?: string | null
          clinic_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["urgent_status"] | null
        }
        Update: {
          called_by?: string | null
          clinic_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["urgent_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "urgent_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgent_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgent_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          accepted_at: string | null
          consent_type: Database["public"]["Enums"]["consent_type"]
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          consent_type: Database["public"]["Enums"]["consent_type"]
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          consent_type?: Database["public"]["Enums"]["consent_type"]
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          font_size: string | null
          high_contrast: boolean | null
          preferred_icons: boolean | null
          use_voice_assistant: boolean | null
          user_id: string
        }
        Insert: {
          font_size?: string | null
          high_contrast?: boolean | null
          preferred_icons?: boolean | null
          use_voice_assistant?: boolean | null
          user_id: string
        }
        Update: {
          font_size?: string | null
          high_contrast?: boolean | null
          preferred_icons?: boolean | null
          use_voice_assistant?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      book_appointment_atomic: {
        Args: {
          p_appointment_date: string
          p_appointment_time: string
          p_clinic_id?: string
          p_doctor_id: string
          p_is_first_visit?: boolean
          p_patient_id: string
        }
        Returns: string
      }
      get_doctor_id: { Args: { _user_id: string }; Returns: string }
      get_patient_id: { Args: { _user_id: string }; Returns: string }
      get_queue_position: {
        Args: { p_appointment_id: string }
        Returns: number
      }
      get_secretary_clinic_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: {
        Args: { role_names: string[]; user_id: string }
        Returns: boolean
      }
      has_role:
      | {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      | { Args: { role_name: string; user_id: string }; Returns: boolean }
      promote_to_super_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      revoke_super_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "secretary" | "admin" | "super_admin"
      appointment_status:
      | "pending"
      | "confirmed"
      | "cancelled"
      | "completed"
      | "no_show"
      consent_type: "cgu" | "medical_disclaimer"
      payment_status: "pending" | "success" | "failed"
      payment_type: "deposit" | "balance"
      urgent_status: "pending" | "called" | "resolved"
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
      app_role: ["patient", "doctor", "secretary", "admin", "super_admin"],
      appointment_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      consent_type: ["cgu", "medical_disclaimer"],
      payment_status: ["pending", "success", "failed"],
      payment_type: ["deposit", "balance"],
      urgent_status: ["pending", "called", "resolved"],
    },
  },
} as const
