-- Migration: Organizations and Organization Members tables
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT true;
$$;


CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users on organizations"
  ON public.organizations FOR SELECT USING (true);

CREATE POLICY "Enable write for authenticated users on organizations"
  ON public.organizations FOR ALL USING (true);

CREATE POLICY "Enable read for authenticated users on organization_members"
  ON public.organization_members FOR SELECT USING (true);

CREATE POLICY "Enable write for authenticated users on organization_members"
  ON public.organization_members FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for profiles"
  ON public.profiles FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.mor_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for mor_sessions" ON public.mor_sessions FOR ALL USING (true);

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.library_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  title TEXT,
  source_module TEXT,
  source_record_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for library_documents" ON public.library_documents FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.gw_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gw_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for gw_projects" ON public.gw_projects FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.gw_lfa_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.gw_projects(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gw_lfa_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for gw_lfa_documents" ON public.gw_lfa_documents FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.library_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.library_documents(id) ON DELETE CASCADE,
  content TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.library_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for library_chunks" ON public.library_chunks FOR ALL USING (true);





