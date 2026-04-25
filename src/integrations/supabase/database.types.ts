/**
 * Hand-written Database types for Chunk 1 foundation.
 * Replace with generated types once schema stabilizes:
 *   supabase gen types typescript --project-id <id> > database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PrimaryRole = 'foundation_lead' | 'umkm_owner' | 'changemaker' | 'consultant' | 'other';
export type OrgRole = 'owner' | 'admin' | 'member';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
export type PlanTier = 'free' | 'starter' | 'premium' | 'enterprise';
export type ProductKey = 'grant_writer' | 'impactory_library' | 'grantfinder' | 'impactory_ads';
export type GwProjectStatus = 'draft' | 'generating' | 'completed' | 'archived';
export type GwDonorStandard = 'un_oecd_dac' | 'world_bank' | 'usaid' | 'eu' | 'generic';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          primary_role: PrimaryRole | null;
          locale: string;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          primary_role?: PrimaryRole | null;
          locale?: string;
          onboarded_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          website: string | null;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          created_by: string;
          logo_url?: string | null;
          website?: string | null;
          description?: string | null;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: OrgRole;
          invited_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan: PlanTier;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          provider: string | null;
          provider_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          plan?: PlanTier;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          provider?: string | null;
          provider_subscription_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          subscription_id: string | null;
          amount_idr: number;
          status: string;
          invoice_url: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          subscription_id?: string | null;
          amount_idr: number;
          status: string;
          invoice_url?: string | null;
          paid_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
        Relationships: [];
      };
      usage_counters: {
        Row: {
          id: string;
          organization_id: string;
          product: ProductKey;
          period_start: string;
          period_end: string;
          count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          product: ProductKey;
          period_start: string;
          period_end: string;
          count?: number;
        };
        Update: Partial<Database['public']['Tables']['usage_counters']['Insert']>;
        Relationships: [];
      };
      ai_generations: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          product: ProductKey;
          model: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          cost_idr: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          product: ProductKey;
          model?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          cost_idr?: number | null;
          metadata?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['ai_generations']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          organization_id?: string | null;
          user_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          type: string;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          body?: string | null;
          type?: string;
          link?: string | null;
          read_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      admin_users: {
        Row: {
          user_id: string;
          role: 'super_admin' | 'support';
          created_at: string;
        };
        Insert: { user_id: string; role?: 'super_admin' | 'support' };
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>;
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          organization: string | null;
          role: string | null;
          interest: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          full_name?: string | null;
          organization?: string | null;
          role?: string | null;
          interest?: string | null;
          source?: string | null;
        };
        Update: Partial<Database['public']['Tables']['waitlist']['Insert']>;
        Relationships: [];
      };
      gw_projects: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          title: string;
          summary: string | null;
          sector: string | null;
          geography: string | null;
          duration_months: number | null;
          budget_idr: number | null;
          donor_standard: GwDonorStandard;
          target_donor: string | null;
          status: GwProjectStatus;
          current_step: number;
          wizard_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          created_by: string;
          title: string;
          summary?: string | null;
          sector?: string | null;
          geography?: string | null;
          duration_months?: number | null;
          budget_idr?: number | null;
          donor_standard?: GwDonorStandard;
          target_donor?: string | null;
          status?: GwProjectStatus;
          current_step?: number;
          wizard_data?: Json;
        };
        Update: Partial<Database['public']['Tables']['gw_projects']['Insert']>;
        Relationships: [];
      };
      gw_lfa_documents: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string;
          generated_by: string;
          version: number;
          matrix: Json;
          proposal_markdown: string | null;
          model: string | null;
          donor_standard: GwDonorStandard;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          project_id: string;
          organization_id: string;
          generated_by: string;
          version?: number;
          matrix: Json;
          proposal_markdown?: string | null;
          model?: string | null;
          donor_standard?: GwDonorStandard;
          is_current?: boolean;
        };
        Update: Partial<Database['public']['Tables']['gw_lfa_documents']['Insert']>;
        Relationships: [];
      };
      gw_proposals: {
        Row: {
          id: string;
          project_id: string;
          lfa_document_id: string | null;
          organization_id: string;
          created_by: string;
          title: string;
          format: string;
          content_markdown: string | null;
          file_url: string | null;
          exported_at: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          lfa_document_id?: string | null;
          organization_id: string;
          created_by: string;
          title: string;
          format?: string;
          content_markdown?: string | null;
          file_url?: string | null;
          exported_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['gw_proposals']['Insert']>;
        Relationships: [];
      };
      gw_chat_messages: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system' | 'tool';
          content: string;
          tool_name: string | null;
          tool_input: Json | null;
          tool_output: Json | null;
          status: 'pending' | 'streaming' | 'complete' | 'error';
          model: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          organization_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system' | 'tool';
          content: string;
          tool_name?: string | null;
          tool_input?: Json | null;
          tool_output?: Json | null;
          status?: 'pending' | 'streaming' | 'complete' | 'error';
          model?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
        };
        Update: Partial<Database['public']['Tables']['gw_chat_messages']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: { Args: { _org_id: string; _user_id: string }; Returns: boolean };
      get_org_role: { Args: { _org_id: string; _user_id: string }; Returns: OrgRole | null };
      has_product_access: { Args: { _org_id: string; _product: ProductKey }; Returns: boolean };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      primary_role: PrimaryRole;
      org_role: OrgRole;
      subscription_status: SubscriptionStatus;
      plan_tier: PlanTier;
      product_key: ProductKey;
      gw_project_status: GwProjectStatus;
      gw_donor_standard: GwDonorStandard;
    };
  };
}