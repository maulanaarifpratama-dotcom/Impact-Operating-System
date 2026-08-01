/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by .github/workflows/generate-supabase-types.yml.
 * Import from ./database.types, which re-exports Database and Json
 * from here and adds the app's hand-written aliases.
 */
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
      admin_users: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      ads_briefs: {
        Row: {
          audience: string | null
          budget_idr: number | null
          call_to_action: string | null
          campaign_name: string
          created_at: string
          created_by: string
          id: string
          key_message: string | null
          language: string
          metadata: Json
          objective: Database["public"]["Enums"]["ads_objective"]
          organization_id: string
          platforms: Database["public"]["Enums"]["ads_platform"][]
          product_or_cause: string
          tone: string | null
          updated_at: string
        }
        Insert: {
          audience?: string | null
          budget_idr?: number | null
          call_to_action?: string | null
          campaign_name: string
          created_at?: string
          created_by: string
          id?: string
          key_message?: string | null
          language?: string
          metadata?: Json
          objective?: Database["public"]["Enums"]["ads_objective"]
          organization_id: string
          platforms?: Database["public"]["Enums"]["ads_platform"][]
          product_or_cause: string
          tone?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string | null
          budget_idr?: number | null
          call_to_action?: string | null
          campaign_name?: string
          created_at?: string
          created_by?: string
          id?: string
          key_message?: string | null
          language?: string
          metadata?: Json
          objective?: Database["public"]["Enums"]["ads_objective"]
          organization_id?: string
          platforms?: Database["public"]["Enums"]["ads_platform"][]
          product_or_cause?: string
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_briefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_generations: {
        Row: {
          brief_id: string
          completion_tokens: number | null
          created_at: string
          generated_by: string
          id: string
          is_favorite: boolean
          model: string | null
          organization_id: string
          platform: Database["public"]["Enums"]["ads_platform"]
          prompt_tokens: number | null
          variants: Json
        }
        Insert: {
          brief_id: string
          completion_tokens?: number | null
          created_at?: string
          generated_by: string
          id?: string
          is_favorite?: boolean
          model?: string | null
          organization_id: string
          platform: Database["public"]["Enums"]["ads_platform"]
          prompt_tokens?: number | null
          variants?: Json
        }
        Update: {
          brief_id?: string
          completion_tokens?: number | null
          created_at?: string
          generated_by?: string
          id?: string
          is_favorite?: boolean
          model?: string | null
          organization_id?: string
          platform?: Database["public"]["Enums"]["ads_platform"]
          prompt_tokens?: number | null
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ads_generations_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "ads_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_generations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          completion_tokens: number | null
          cost_idr: number | null
          created_at: string
          id: string
          metadata: Json | null
          model: string | null
          organization_id: string
          product: Database["public"]["Enums"]["product_key"]
          prompt_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          cost_idr?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          organization_id: string
          product: Database["public"]["Enums"]["product_key"]
          prompt_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          cost_idr?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          organization_id?: string
          product?: Database["public"]["Enums"]["product_key"]
          prompt_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rate_limits: {
        Row: {
          bucket: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          bucket?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiaries: {
        Row: {
          age: number | null
          city: string | null
          contact: string | null
          created_at: string
          full_name: string
          gender: string | null
          id: string
          lfa_project_id: string | null
          mode: string | null
          nik: string | null
          notes: string | null
          org_id: string
          pdp_consent: boolean | null
          photo_url: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          village: string | null
          vulnerable_categories: string[] | null
        }
        Insert: {
          age?: number | null
          city?: string | null
          contact?: string | null
          created_at?: string
          full_name: string
          gender?: string | null
          id?: string
          lfa_project_id?: string | null
          mode?: string | null
          nik?: string | null
          notes?: string | null
          org_id: string
          pdp_consent?: boolean | null
          photo_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          village?: string | null
          vulnerable_categories?: string[] | null
        }
        Update: {
          age?: number | null
          city?: string | null
          contact?: string | null
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          lfa_project_id?: string | null
          mode?: string | null
          nik?: string | null
          notes?: string | null
          org_id?: string
          pdp_consent?: boolean | null
          photo_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          village?: string | null
          vulnerable_categories?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_over_sbm: boolean | null
          lfa_activity_id: string | null
          org_id: string
          project_id: string
          quantity: number | null
          sbm_max_amount: number | null
          sbm_reference: string | null
          sub_category: string | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
          wbs_task_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_over_sbm?: boolean | null
          lfa_activity_id?: string | null
          org_id: string
          project_id: string
          quantity?: number | null
          sbm_max_amount?: number | null
          sbm_reference?: string | null
          sub_category?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          wbs_task_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_over_sbm?: boolean | null
          lfa_activity_id?: string | null
          org_id?: string
          project_id?: string
          quantity?: number | null
          sbm_max_amount?: number | null
          sbm_reference?: string | null
          sub_category?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          wbs_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_lfa_activity_id_fkey"
            columns: ["lfa_activity_id"]
            isOneToOne: false
            referencedRelation: "lfa_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_wbs_task_id_fkey"
            columns: ["wbs_task_id"]
            isOneToOne: false
            referencedRelation: "wbs_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      day_plan_progress: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          item_key: string
          organization_id: string
          phase: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item_key: string
          organization_id: string
          phase: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item_key?: string
          organization_id?: string
          phase?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_plan_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_name: string | null
          created_at: string
          donation_date: string
          donor_id: string
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_name?: string | null
          created_at?: string
          donation_date?: string
          donor_id: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_name?: string | null
          created_at?: string
          donation_date?: string
          donor_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_followups: {
        Row: {
          channel: string
          contact_date: string
          created_at: string
          donor_id: string
          id: string
          next_action: string | null
          organization_id: string
          outcome: string | null
          pic_user_id: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          contact_date?: string
          created_at?: string
          donor_id: string
          id?: string
          next_action?: string | null
          organization_id: string
          outcome?: string | null
          pic_user_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          contact_date?: string
          created_at?: string
          donor_id?: string
          id?: string
          next_action?: string | null
          organization_id?: string
          outcome?: string | null
          pic_user_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_followups_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_followups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          campaign_source: string | null
          city: string | null
          created_at: string
          donor_type: string
          email: string | null
          first_donation_date: string | null
          followup_status: string
          id: string
          is_at_risk: boolean
          issue_interest: string[]
          journey_stage: string
          last_contact_date: string | null
          name: string
          next_action: string | null
          next_action_due: string | null
          notes: string | null
          organization_id: string
          recurring_amount: number | null
          recurring_frequency: string | null
          source: string
          tags: string[]
          total_cumulative: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          campaign_source?: string | null
          city?: string | null
          created_at?: string
          donor_type?: string
          email?: string | null
          first_donation_date?: string | null
          followup_status?: string
          id?: string
          is_at_risk?: boolean
          issue_interest?: string[]
          journey_stage?: string
          last_contact_date?: string | null
          name: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          organization_id: string
          recurring_amount?: number | null
          recurring_frequency?: string | null
          source?: string
          tags?: string[]
          total_cumulative?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          campaign_source?: string | null
          city?: string | null
          created_at?: string
          donor_type?: string
          email?: string | null
          first_donation_date?: string | null
          followup_status?: string
          id?: string
          is_at_risk?: boolean
          issue_interest?: string[]
          journey_stage?: string
          last_contact_date?: string | null
          name?: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          organization_id?: string
          recurring_amount?: number | null
          recurring_frequency?: string | null
          source?: string
          tags?: string[]
          total_cumulative?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grantfinder_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          organization_id: string
          query: string
          result_grant_ids: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          organization_id: string
          query: string
          result_grant_ids?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          organization_id?: string
          query?: string
          result_grant_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grantfinder_searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grants_catalog: {
        Row: {
          application_url: string | null
          created_at: string
          currency: string
          deadline: string | null
          description: string | null
          donor_name: string
          eligibility: string | null
          embedding: string | null
          geographies: string[]
          id: string
          is_active: boolean
          max_amount_idr: number | null
          metadata: Json
          min_amount_idr: number | null
          sectors: string[]
          source_url: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_url?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          donor_name: string
          eligibility?: string | null
          embedding?: string | null
          geographies?: string[]
          id?: string
          is_active?: boolean
          max_amount_idr?: number | null
          metadata?: Json
          min_amount_idr?: number | null
          sectors?: string[]
          source_url?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_url?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          donor_name?: string
          eligibility?: string | null
          embedding?: string | null
          geographies?: string[]
          id?: string
          is_active?: boolean
          max_amount_idr?: number | null
          metadata?: Json
          min_amount_idr?: number | null
          sectors?: string[]
          source_url?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_chat_messages: {
        Row: {
          completion_tokens: number | null
          content: string
          created_at: string
          id: string
          model: string | null
          organization_id: string
          project_id: string
          prompt_tokens: number | null
          role: string
          status: string
          tool_input: Json | null
          tool_name: string | null
          tool_output: Json | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          content: string
          created_at?: string
          id?: string
          model?: string | null
          organization_id: string
          project_id: string
          prompt_tokens?: number | null
          role: string
          status?: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          organization_id?: string
          project_id?: string
          prompt_tokens?: number | null
          role?: string
          status?: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gw_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_lfa_documents: {
        Row: {
          created_at: string
          donor_standard: Database["public"]["Enums"]["gw_donor_standard"]
          generated_by: string
          id: string
          is_current: boolean
          matrix: Json
          model: string | null
          organization_id: string
          project_id: string
          proposal_markdown: string | null
          version: number
        }
        Insert: {
          created_at?: string
          donor_standard?: Database["public"]["Enums"]["gw_donor_standard"]
          generated_by: string
          id?: string
          is_current?: boolean
          matrix: Json
          model?: string | null
          organization_id: string
          project_id: string
          proposal_markdown?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          donor_standard?: Database["public"]["Enums"]["gw_donor_standard"]
          generated_by?: string
          id?: string
          is_current?: boolean
          matrix?: Json
          model?: string | null
          organization_id?: string
          project_id?: string
          proposal_markdown?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "gw_lfa_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_lfa_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gw_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_projects: {
        Row: {
          budget_idr: number | null
          created_at: string
          created_by: string
          current_step: number
          donor_standard: Database["public"]["Enums"]["gw_donor_standard"]
          duration_months: number | null
          geography: string | null
          id: string
          organization_id: string
          sector: string | null
          status: Database["public"]["Enums"]["gw_project_status"]
          summary: string | null
          target_donor: string | null
          title: string
          updated_at: string
          wizard_data: Json
        }
        Insert: {
          budget_idr?: number | null
          created_at?: string
          created_by: string
          current_step?: number
          donor_standard?: Database["public"]["Enums"]["gw_donor_standard"]
          duration_months?: number | null
          geography?: string | null
          id?: string
          organization_id: string
          sector?: string | null
          status?: Database["public"]["Enums"]["gw_project_status"]
          summary?: string | null
          target_donor?: string | null
          title: string
          updated_at?: string
          wizard_data?: Json
        }
        Update: {
          budget_idr?: number | null
          created_at?: string
          created_by?: string
          current_step?: number
          donor_standard?: Database["public"]["Enums"]["gw_donor_standard"]
          duration_months?: number | null
          geography?: string | null
          id?: string
          organization_id?: string
          sector?: string | null
          status?: Database["public"]["Enums"]["gw_project_status"]
          summary?: string | null
          target_donor?: string | null
          title?: string
          updated_at?: string
          wizard_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gw_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_proposals: {
        Row: {
          content_markdown: string | null
          created_at: string
          created_by: string
          exported_at: string | null
          file_url: string | null
          format: string
          id: string
          lfa_document_id: string | null
          organization_id: string
          project_id: string
          title: string
        }
        Insert: {
          content_markdown?: string | null
          created_at?: string
          created_by: string
          exported_at?: string | null
          file_url?: string | null
          format?: string
          id?: string
          lfa_document_id?: string | null
          organization_id: string
          project_id: string
          title: string
        }
        Update: {
          content_markdown?: string | null
          created_at?: string
          created_by?: string
          exported_at?: string | null
          file_url?: string | null
          format?: string
          id?: string
          lfa_document_id?: string | null
          organization_id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_proposals_lfa_document_id_fkey"
            columns: ["lfa_document_id"]
            isOneToOne: false
            referencedRelation: "gw_lfa_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gw_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_readiness_assessments: {
        Row: {
          created_at: string
          id: string
          level: string | null
          lfa_project_id: string | null
          org_id: string
          score_q1: number
          score_q2: number
          score_q3: number
          score_q4: number
          score_q5: number
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string | null
          lfa_project_id?: string | null
          org_id: string
          score_q1: number
          score_q2: number
          score_q3: number
          score_q4: number
          score_q5: number
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string | null
          lfa_project_id?: string | null
          org_id?: string
          score_q1?: number
          score_q2?: number
          score_q3?: number
          score_q4?: number
          score_q5?: number
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_readiness_assessments_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_readiness_assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_idr: number
          created_at: string
          id: string
          invoice_url: string | null
          organization_id: string
          paid_at: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount_idr: number
          created_at?: string
          id?: string
          invoice_url?: string | null
          organization_id: string
          paid_at?: string | null
          status: string
          subscription_id?: string | null
        }
        Update: {
          amount_idr?: number
          created_at?: string
          id?: string
          invoice_url?: string | null
          organization_id?: string
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_budget_items: {
        Row: {
          activity_name: string | null
          actual_amount_idr: number | null
          category: string | null
          cost_category: string | null
          created_at: string | null
          funding_source: string | null
          id: string
          item_name: string
          justification: string | null
          lfa_project_id: string
          mode: string | null
          needs_donor_approval: boolean | null
          org_id: string
          realisasi_date: string | null
          realisasi_evidence_url: string | null
          realisasi_notes: string | null
          sort_order: number | null
          unit: string | null
          unit_price_idr: number | null
          updated_at: string | null
          volume: number | null
          wbs_item_id: string | null
        }
        Insert: {
          activity_name?: string | null
          actual_amount_idr?: number | null
          category?: string | null
          cost_category?: string | null
          created_at?: string | null
          funding_source?: string | null
          id?: string
          item_name: string
          justification?: string | null
          lfa_project_id: string
          mode?: string | null
          needs_donor_approval?: boolean | null
          org_id: string
          realisasi_date?: string | null
          realisasi_evidence_url?: string | null
          realisasi_notes?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_price_idr?: number | null
          updated_at?: string | null
          volume?: number | null
          wbs_item_id?: string | null
        }
        Update: {
          activity_name?: string | null
          actual_amount_idr?: number | null
          category?: string | null
          cost_category?: string | null
          created_at?: string | null
          funding_source?: string | null
          id?: string
          item_name?: string
          justification?: string | null
          lfa_project_id?: string
          mode?: string | null
          needs_donor_approval?: boolean | null
          org_id?: string
          realisasi_date?: string | null
          realisasi_evidence_url?: string | null
          realisasi_notes?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_price_idr?: number | null
          updated_at?: string | null
          volume?: number | null
          wbs_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_budget_items_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_budget_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_budget_items_wbs_item_id_fkey"
            columns: ["wbs_item_id"]
            isOneToOne: false
            referencedRelation: "lfa_wbs_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_entries: {
        Row: {
          ai_suggestion: string | null
          assumption: string | null
          created_at: string | null
          description: string | null
          id: string
          indicator: string | null
          level: string
          means_of_verification: string | null
          org_id: string
          parent_id: string | null
          project_id: string
          responsible_party: string | null
          sequence: number | null
          timeline_end: number | null
          timeline_start: number | null
          updated_at: string | null
        }
        Insert: {
          ai_suggestion?: string | null
          assumption?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          indicator?: string | null
          level: string
          means_of_verification?: string | null
          org_id: string
          parent_id?: string | null
          project_id: string
          responsible_party?: string | null
          sequence?: number | null
          timeline_end?: number | null
          timeline_start?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_suggestion?: string | null
          assumption?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          indicator?: string | null
          level?: string
          means_of_verification?: string | null
          org_id?: string
          parent_id?: string | null
          project_id?: string
          responsible_party?: string | null
          sequence?: number | null
          timeline_end?: number | null
          timeline_start?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lfa_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_materializations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          failure_code: string | null
          failure_stage: string | null
          id: string
          lfa_project_id: string | null
          organization_id: string
          source_gw_document_id: string
          source_gw_document_version: number
          source_gw_project_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          failure_code?: string | null
          failure_stage?: string | null
          id?: string
          lfa_project_id?: string | null
          organization_id: string
          source_gw_document_id: string
          source_gw_document_version: number
          source_gw_project_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          failure_code?: string | null
          failure_stage?: string | null
          id?: string
          lfa_project_id?: string | null
          organization_id?: string
          source_gw_document_id?: string
          source_gw_document_version?: number
          source_gw_project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lfa_materializations_lfa_project_fk"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_materializations_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_materializations_source_document_fk"
            columns: ["source_gw_document_id"]
            isOneToOne: false
            referencedRelation: "gw_lfa_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_materializations_source_project_fk"
            columns: ["source_gw_project_id"]
            isOneToOne: false
            referencedRelation: "gw_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_meal_accountability: {
        Row: {
          created_at: string | null
          escalation_procedure: string | null
          frequency: string | null
          id: string
          lfa_project_id: string
          mechanism: string
          org_id: string
          pic: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          escalation_procedure?: string | null
          frequency?: string | null
          id?: string
          lfa_project_id: string
          mechanism: string
          org_id: string
          pic?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          escalation_procedure?: string | null
          frequency?: string | null
          id?: string
          lfa_project_id?: string
          mechanism?: string
          org_id?: string
          pic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_meal_accountability_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_meal_accountability_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_meal_items: {
        Row: {
          baseline: number | null
          collection_method: string | null
          collection_tool: string | null
          created_at: string | null
          data_assumption: string | null
          disaggregation: string[] | null
          endline_target: number | null
          frequency: string | null
          id: string
          indicator_text: string
          lfa_level: string
          lfa_project_id: string
          midline_target: number | null
          mode: string | null
          monitoring_risk: string | null
          org_id: string
          pic: string | null
          secondary_source: string | null
          sort_order: number | null
          status: string | null
          target_unit: string | null
          target_value: number | null
          updated_at: string | null
          wbs_item_id: string | null
        }
        Insert: {
          baseline?: number | null
          collection_method?: string | null
          collection_tool?: string | null
          created_at?: string | null
          data_assumption?: string | null
          disaggregation?: string[] | null
          endline_target?: number | null
          frequency?: string | null
          id?: string
          indicator_text: string
          lfa_level: string
          lfa_project_id: string
          midline_target?: number | null
          mode?: string | null
          monitoring_risk?: string | null
          org_id: string
          pic?: string | null
          secondary_source?: string | null
          sort_order?: number | null
          status?: string | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string | null
          wbs_item_id?: string | null
        }
        Update: {
          baseline?: number | null
          collection_method?: string | null
          collection_tool?: string | null
          created_at?: string | null
          data_assumption?: string | null
          disaggregation?: string[] | null
          endline_target?: number | null
          frequency?: string | null
          id?: string
          indicator_text?: string
          lfa_level?: string
          lfa_project_id?: string
          midline_target?: number | null
          mode?: string | null
          monitoring_risk?: string | null
          org_id?: string
          pic?: string | null
          secondary_source?: string | null
          sort_order?: number | null
          status?: string | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string | null
          wbs_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_meal_items_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_meal_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_meal_learning_questions: {
        Row: {
          answer_method: string | null
          created_at: string | null
          id: string
          lfa_project_id: string
          org_id: string
          pic: string | null
          question_text: string
          sort_order: number | null
          timeline_month: number | null
          updated_at: string | null
        }
        Insert: {
          answer_method?: string | null
          created_at?: string | null
          id?: string
          lfa_project_id: string
          org_id: string
          pic?: string | null
          question_text: string
          sort_order?: number | null
          timeline_month?: number | null
          updated_at?: string | null
        }
        Update: {
          answer_method?: string | null
          created_at?: string | null
          id?: string
          lfa_project_id?: string
          org_id?: string
          pic?: string | null
          question_text?: string
          sort_order?: number | null
          timeline_month?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_meal_learning_questions_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_meal_learning_questions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_meal_tracking_entries: {
        Row: {
          created_at: string | null
          evidence_note: string | null
          evidence_source_type: string | null
          evidence_url: string | null
          id: string
          lfa_project_id: string
          library_document_id: string | null
          meal_item_id: string
          onedrive_drive_id: string | null
          onedrive_item_id: string | null
          onedrive_web_url: string | null
          org_id: string
          recorded_by: string | null
          recorded_date: string
          recorded_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_note?: string | null
          evidence_source_type?: string | null
          evidence_url?: string | null
          id?: string
          lfa_project_id: string
          library_document_id?: string | null
          meal_item_id: string
          onedrive_drive_id?: string | null
          onedrive_item_id?: string | null
          onedrive_web_url?: string | null
          org_id: string
          recorded_by?: string | null
          recorded_date?: string
          recorded_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_note?: string | null
          evidence_source_type?: string | null
          evidence_url?: string | null
          id?: string
          lfa_project_id?: string
          library_document_id?: string | null
          meal_item_id?: string
          onedrive_drive_id?: string | null
          onedrive_item_id?: string | null
          onedrive_web_url?: string | null
          org_id?: string
          recorded_by?: string | null
          recorded_date?: string
          recorded_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_meal_tracking_entries_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_meal_tracking_entries_meal_item_id_fkey"
            columns: ["meal_item_id"]
            isOneToOne: false
            referencedRelation: "lfa_meal_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_meal_tracking_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_projects: {
        Row: {
          beneficiary_count: number | null
          beneficiary_description: string | null
          created_at: string | null
          donor_feedback: string | null
          duration_months: number | null
          id: string
          linked_grant_id: string | null
          location: string | null
          name: string
          org_id: string
          sector: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          beneficiary_count?: number | null
          beneficiary_description?: string | null
          created_at?: string | null
          donor_feedback?: string | null
          duration_months?: number | null
          id?: string
          linked_grant_id?: string | null
          location?: string | null
          name: string
          org_id: string
          sector?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          beneficiary_count?: number | null
          beneficiary_description?: string | null
          created_at?: string | null
          donor_feedback?: string | null
          duration_months?: number | null
          id?: string
          linked_grant_id?: string | null
          location?: string | null
          name?: string
          org_id?: string
          sector?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_sroi_config: {
        Row: {
          ai_narrative: string | null
          analysis_period_years: number | null
          beneficiary_count: number | null
          created_at: string | null
          discount_rate: number | null
          id: string
          lfa_project_id: string
          mode: string | null
          org_id: string
          sensitivity_result: Json | null
          sroi_ratio: number | null
          total_gross_value_idr: number | null
          total_investment_idr: number | null
          total_present_value_idr: number | null
          updated_at: string | null
        }
        Insert: {
          ai_narrative?: string | null
          analysis_period_years?: number | null
          beneficiary_count?: number | null
          created_at?: string | null
          discount_rate?: number | null
          id?: string
          lfa_project_id: string
          mode?: string | null
          org_id: string
          sensitivity_result?: Json | null
          sroi_ratio?: number | null
          total_gross_value_idr?: number | null
          total_investment_idr?: number | null
          total_present_value_idr?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_narrative?: string | null
          analysis_period_years?: number | null
          beneficiary_count?: number | null
          created_at?: string | null
          discount_rate?: number | null
          id?: string
          lfa_project_id?: string
          mode?: string | null
          org_id?: string
          sensitivity_result?: Json | null
          sroi_ratio?: number | null
          total_gross_value_idr?: number | null
          total_investment_idr?: number | null
          total_present_value_idr?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_sroi_config_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: true
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_sroi_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_sroi_outcomes: {
        Row: {
          attribution_pct: number | null
          created_at: string | null
          deadweight_pct: number | null
          displacement_pct: number | null
          dropoff_pct_per_year: number | null
          duration_years: number | null
          gross_value_idr: number | null
          id: string
          lfa_project_id: string
          meal_item_id: string | null
          mode: string | null
          org_id: string
          outcome_name: string
          present_value_idr: number | null
          proxy_category: string | null
          proxy_citation: string | null
          proxy_source: string | null
          proxy_value_idr: number | null
          quantity: number | null
          sort_order: number | null
          stakeholder_group: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          attribution_pct?: number | null
          created_at?: string | null
          deadweight_pct?: number | null
          displacement_pct?: number | null
          dropoff_pct_per_year?: number | null
          duration_years?: number | null
          gross_value_idr?: number | null
          id?: string
          lfa_project_id: string
          meal_item_id?: string | null
          mode?: string | null
          org_id: string
          outcome_name: string
          present_value_idr?: number | null
          proxy_category?: string | null
          proxy_citation?: string | null
          proxy_source?: string | null
          proxy_value_idr?: number | null
          quantity?: number | null
          sort_order?: number | null
          stakeholder_group?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          attribution_pct?: number | null
          created_at?: string | null
          deadweight_pct?: number | null
          displacement_pct?: number | null
          dropoff_pct_per_year?: number | null
          duration_years?: number | null
          gross_value_idr?: number | null
          id?: string
          lfa_project_id?: string
          meal_item_id?: string | null
          mode?: string | null
          org_id?: string
          outcome_name?: string
          present_value_idr?: number | null
          proxy_category?: string | null
          proxy_citation?: string | null
          proxy_source?: string | null
          proxy_value_idr?: number | null
          quantity?: number | null
          sort_order?: number | null
          stakeholder_group?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_sroi_outcomes_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_sroi_outcomes_meal_item_id_fkey"
            columns: ["meal_item_id"]
            isOneToOne: false
            referencedRelation: "lfa_meal_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_sroi_outcomes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lfa_wbs_items: {
        Row: {
          blocked_reason: string | null
          carbon_description: string | null
          carbon_enabled: boolean | null
          carbon_factor: number | null
          carbon_quantity: number | null
          carbon_scope: string | null
          carbon_source: string | null
          carbon_unit: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          dependencies: string[] | null
          duration_weeks: number | null
          id: string
          indicator: string | null
          level: number
          lfa_entry_id: string | null
          lfa_project_id: string
          method: string | null
          mode: string | null
          name: string
          notes: string | null
          org_id: string
          owner_id: string | null
          parent_id: string | null
          pic: string | null
          progress_percent: number
          reviewer_id: string | null
          sort_order: number | null
          source_task_id: string | null
          start_month: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          blocked_reason?: string | null
          carbon_description?: string | null
          carbon_enabled?: boolean | null
          carbon_factor?: number | null
          carbon_quantity?: number | null
          carbon_scope?: string | null
          carbon_source?: string | null
          carbon_unit?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          duration_weeks?: number | null
          id?: string
          indicator?: string | null
          level: number
          lfa_entry_id?: string | null
          lfa_project_id: string
          method?: string | null
          mode?: string | null
          name: string
          notes?: string | null
          org_id: string
          owner_id?: string | null
          parent_id?: string | null
          pic?: string | null
          progress_percent?: number
          reviewer_id?: string | null
          sort_order?: number | null
          source_task_id?: string | null
          start_month?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          blocked_reason?: string | null
          carbon_description?: string | null
          carbon_enabled?: boolean | null
          carbon_factor?: number | null
          carbon_quantity?: number | null
          carbon_scope?: string | null
          carbon_source?: string | null
          carbon_unit?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          duration_weeks?: number | null
          id?: string
          indicator?: string | null
          level?: number
          lfa_entry_id?: string | null
          lfa_project_id?: string
          method?: string | null
          mode?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          parent_id?: string | null
          pic?: string | null
          progress_percent?: number
          reviewer_id?: string | null
          sort_order?: number | null
          source_task_id?: string | null
          start_month?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfa_wbs_items_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_wbs_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfa_wbs_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lfa_wbs_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          organization_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "library_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      library_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          drive_id: string | null
          id: string
          metadata: Json
          mime_type: string | null
          organization_id: string
          original_file_name: string | null
          size_bytes: number | null
          source_module: string | null
          source_record_id: string | null
          source_type: string
          source_url: string | null
          status: Database["public"]["Enums"]["library_doc_status"]
          status_message: string | null
          storage_item_id: string | null
          storage_path: string | null
          storage_provider: string | null
          title: string
          updated_at: string
          uploaded_by: string
          web_url: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          drive_id?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          organization_id: string
          original_file_name?: string | null
          size_bytes?: number | null
          source_module?: string | null
          source_record_id?: string | null
          source_type?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["library_doc_status"]
          status_message?: string | null
          storage_item_id?: string | null
          storage_path?: string | null
          storage_provider?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          web_url?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          drive_id?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          organization_id?: string
          original_file_name?: string | null
          size_bytes?: number | null
          source_module?: string | null
          source_record_id?: string | null
          source_type?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["library_doc_status"]
          status_message?: string | null
          storage_item_id?: string | null
          storage_path?: string | null
          storage_provider?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          web_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mor_sessions: {
        Row: {
          adaptive_notes: Json | null
          created_at: string
          decisions: Json
          facilitator_id: string | null
          id: string
          learning_recommendations: string | null
          learning_what_didnt: string | null
          learning_what_worked: string | null
          next_mor_date: string | null
          organization_id: string
          people_notes: string | null
          performance_notes: string | null
          plan_priorities: Json
          recap_notes: string | null
          risk_notes: string | null
          session_date: string
          updated_at: string
        }
        Insert: {
          adaptive_notes?: Json | null
          created_at?: string
          decisions?: Json
          facilitator_id?: string | null
          id?: string
          learning_recommendations?: string | null
          learning_what_didnt?: string | null
          learning_what_worked?: string | null
          next_mor_date?: string | null
          organization_id: string
          people_notes?: string | null
          performance_notes?: string | null
          plan_priorities?: Json
          recap_notes?: string | null
          risk_notes?: string | null
          session_date?: string
          updated_at?: string
        }
        Update: {
          adaptive_notes?: Json | null
          created_at?: string
          decisions?: Json
          facilitator_id?: string | null
          id?: string
          learning_recommendations?: string | null
          learning_what_didnt?: string | null
          learning_what_worked?: string | null
          next_mor_date?: string | null
          organization_id?: string
          people_notes?: string | null
          performance_notes?: string | null
          plan_priorities?: Json
          recap_notes?: string | null
          risk_notes?: string | null
          session_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mor_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
          onboarded_at: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_phase: string | null
          onboarding_sector: string | null
          onboarding_skipped: boolean | null
          phone: string | null
          primary_role: Database["public"]["Enums"]["primary_role"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          locale?: string
          onboarded_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_phase?: string | null
          onboarding_sector?: string | null
          onboarding_skipped?: boolean | null
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          onboarded_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_phase?: string | null
          onboarding_sector?: string | null
          onboarding_skipped?: boolean | null
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      readiness_scores: {
        Row: {
          created_at: string
          details: Json
          id: string
          notes: string | null
          organization_id: string
          score_g: number
          score_h: number
          score_o: number
          score_r: number
          score_t: number
          score_w: number
          scored_by: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          notes?: string | null
          organization_id: string
          score_g?: number
          score_h?: number
          score_o?: number
          score_r?: number
          score_t?: number
          score_w?: number
          scored_by?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          notes?: string | null
          organization_id?: string
          score_g?: number
          score_h?: number
          score_o?: number
          score_r?: number
          score_t?: number
          score_w?: number
          scored_by?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_access_platforms: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          benefit_notes: string | null
          created_at: string
          gag_activated: boolean
          gag_campaigns_count: number | null
          gag_monthly_spend_usd: number | null
          id: string
          notes: string | null
          organization_id: string
          owner_email: string | null
          owner_name: string | null
          platform_name: string
          renewal_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          benefit_notes?: string | null
          created_at?: string
          gag_activated?: boolean
          gag_campaigns_count?: number | null
          gag_monthly_spend_usd?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          owner_email?: string | null
          owner_name?: string | null
          platform_name: string
          renewal_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          benefit_notes?: string | null
          created_at?: string
          gag_activated?: boolean
          gag_campaigns_count?: number | null
          gag_monthly_spend_usd?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          owner_email?: string | null
          owner_name?: string | null
          platform_name?: string
          renewal_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_access_platforms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sbm_2026: {
        Row: {
          can_exceed: boolean | null
          category: string
          description: string | null
          id: string
          max_amount: number | null
          notes: string | null
          sub_category: string
          unit: string | null
        }
        Insert: {
          can_exceed?: boolean | null
          category: string
          description?: string | null
          id?: string
          max_amount?: number | null
          notes?: string | null
          sub_category: string
          unit?: string | null
        }
        Update: {
          can_exceed?: boolean | null
          category?: string
          description?: string | null
          id?: string
          max_amount?: number | null
          notes?: string | null
          sub_category?: string
          unit?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          provider: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_integrations: {
        Row: {
          account_email: string | null
          created_at: string | null
          drive_id: string | null
          id: string
          metadata: Json | null
          provider: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_email?: string | null
          created_at?: string | null
          drive_id?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_email?: string | null
          created_at?: string | null
          drive_id?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number
          created_at: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          product: Database["public"]["Enums"]["product_key"]
          updated_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          product: Database["public"]["Enums"]["product_key"]
          updated_at?: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          product?: Database["public"]["Enums"]["product_key"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          interest: string | null
          organization: string | null
          role: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          interest?: string | null
          organization?: string | null
          role?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          interest?: string | null
          organization?: string | null
          role?: string | null
          source?: string | null
        }
        Relationships: []
      }
      wbs_completion_claims: {
        Row: {
          claim_note: string | null
          claimed_at: string
          claimed_by: string
          claimed_progress: number | null
          created_at: string
          id: string
          lfa_project_id: string
          org_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          wbs_item_id: string
        }
        Insert: {
          claim_note?: string | null
          claimed_at?: string
          claimed_by: string
          claimed_progress?: number | null
          created_at?: string
          id?: string
          lfa_project_id: string
          org_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wbs_item_id: string
        }
        Update: {
          claim_note?: string | null
          claimed_at?: string
          claimed_by?: string
          claimed_progress?: number | null
          created_at?: string
          id?: string
          lfa_project_id?: string
          org_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wbs_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbs_completion_claims_lfa_project_id_fkey"
            columns: ["lfa_project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_completion_claims_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_completion_claims_wbs_item_id_fkey"
            columns: ["wbs_item_id"]
            isOneToOne: false
            referencedRelation: "lfa_wbs_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wbs_completion_evidence: {
        Row: {
          claim_id: string
          description: string | null
          evidence_type: string | null
          id: string
          org_id: string
          storage_reference: string | null
          title: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          claim_id: string
          description?: string | null
          evidence_type?: string | null
          id?: string
          org_id: string
          storage_reference?: string | null
          title?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          claim_id?: string
          description?: string | null
          evidence_type?: string | null
          id?: string
          org_id?: string
          storage_reference?: string | null
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbs_completion_evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "wbs_completion_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_completion_evidence_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wbs_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          lfa_activity_id: string | null
          name: string
          org_id: string
          parent_task_id: string | null
          progress_percent: number | null
          project_id: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          lfa_activity_id?: string | null
          name: string
          org_id: string
          parent_task_id?: string | null
          progress_percent?: number | null
          project_id: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          lfa_activity_id?: string | null
          name?: string
          org_id?: string
          parent_task_id?: string | null
          progress_percent?: number | null
          project_id?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wbs_tasks_lfa_activity_id_fkey"
            columns: ["lfa_activity_id"]
            isOneToOne: false
            referencedRelation: "lfa_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "wbs_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lfa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invite: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      auto_populate_wbs_default_budget_items: {
        Args: { p_lfa_project_id: string; p_org_id: string }
        Returns: number
      }
      consume_ai_rate_limit: {
        Args: {
          _bucket: string
          _limit: number
          _user_id: string
          _window_seconds: number
        }
        Returns: Json
      }
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_organization_invite_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          is_expired: boolean
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
        }[]
      }
      has_product_access: {
        Args: {
          _org_id: string
          _product: Database["public"]["Enums"]["product_key"]
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_creator: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      match_grants: {
        Args: {
          _geographies?: string[]
          _match_count?: number
          _min_similarity?: number
          _query_embedding: string
          _sectors?: string[]
        }
        Returns: {
          application_url: string
          deadline: string
          donor_name: string
          geographies: string[]
          grant_id: string
          sectors: string[]
          similarity: number
          summary: string
          title: string
        }[]
      }
      match_library_chunks:
        | {
            Args: {
              _match_count?: number
              _min_similarity?: number
              _org_id: string
              _query_embedding: string
              _user_id?: string
            }
            Returns: {
              chunk_id: string
              content: string
              document_id: string
              document_title: string
              similarity: number
            }[]
          }
        | {
            Args: {
              _match_count: number
              _min_similarity: number
              _org_id: string
              _query_embedding: string
              _source_module?: string
              _source_record_id?: string
            }
            Returns: {
              chunk_id: string
              content: string
              document_id: string
              document_title: string
              id: string
              similarity: number
            }[]
          }
      materialize_grantwriter_document: {
        Args: {
          p_existing_lfa_project_id?: string
          p_expected_document_version: number
          p_source_document_id: string
        }
        Returns: Json
      }
      materialize_lfa_matrix_transactional: {
        Args: { p_entries: Json; p_project_id: string }
        Returns: Json
      }
      user_has_organization: {
        Args: { check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role: "super_admin" | "support"
      ads_objective:
        | "awareness"
        | "traffic"
        | "conversions"
        | "leads"
        | "engagement"
        | "donation"
      ads_platform: "meta" | "google" | "tiktok" | "linkedin" | "generic"
      gw_donor_standard:
        | "un_oecd_dac"
        | "world_bank"
        | "usaid"
        | "eu"
        | "generic"
      gw_project_status: "draft" | "generating" | "completed" | "archived"
      library_doc_status: "uploaded" | "processing" | "indexed" | "failed"
      org_role: "owner" | "admin" | "member"
      plan_tier: "free" | "starter" | "premium" | "enterprise"
      primary_role:
        | "foundation_lead"
        | "umkm_owner"
        | "changemaker"
        | "consultant"
        | "other"
      product_key:
        | "grant_writer"
        | "impactory_library"
        | "grantfinder"
        | "impactory_ads"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
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
    Enums: {
      admin_role: ["super_admin", "support"],
      ads_objective: [
        "awareness",
        "traffic",
        "conversions",
        "leads",
        "engagement",
        "donation",
      ],
      ads_platform: ["meta", "google", "tiktok", "linkedin", "generic"],
      gw_donor_standard: [
        "un_oecd_dac",
        "world_bank",
        "usaid",
        "eu",
        "generic",
      ],
      gw_project_status: ["draft", "generating", "completed", "archived"],
      library_doc_status: ["uploaded", "processing", "indexed", "failed"],
      org_role: ["owner", "admin", "member"],
      plan_tier: ["free", "starter", "premium", "enterprise"],
      primary_role: [
        "foundation_lead",
        "umkm_owner",
        "changemaker",
        "consultant",
        "other",
      ],
      product_key: [
        "grant_writer",
        "impactory_library",
        "grantfinder",
        "impactory_ads",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
    },
  },
} as const
