-- Migration: Update library_documents and create system_integrations
-- Added: 11 June 2026

-- 1. Update public.library_documents table with new storage and metadata columns if they do not exist
ALTER TABLE public.library_documents ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'onedrive';
ALTER TABLE public.library_documents ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.library_documents ADD COLUMN IF NOT EXISTS storage_item_id text;
ALTER TABLE public.library_documents ADD COLUMN IF NOT EXISTS drive_id text;
ALTER TABLE public.library_documents ADD COLUMN IF NOT EXISTS web_url text;
ALTER TABLE public.library_documents ADD COLUMN IF NOT EXISTS original_file_name text;
ALTER TABLE public.library_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Create public.system_integrations table
CREATE TABLE IF NOT EXISTS public.system_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text,
  status text,
  account_email text,
  drive_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security (RLS) on system_integrations
ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for system_integrations
DROP POLICY IF EXISTS "system_integrations_read_policy" ON public.system_integrations;
CREATE POLICY "system_integrations_read_policy" ON public.system_integrations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_integrations_all_policy" ON public.system_integrations;
CREATE POLICY "system_integrations_all_policy" ON public.system_integrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
