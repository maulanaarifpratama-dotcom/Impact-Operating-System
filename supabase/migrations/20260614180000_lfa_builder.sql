-- Migration: LFA Builder schema and seed data
-- Path: supabase/migrations/20260614180000_lfa_builder.sql

-- LFA Projects (one per program)
CREATE TABLE IF NOT EXISTS lfa_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT, -- pendidikan, kesehatan, lingkungan, ekonomi, dll
  location TEXT,
  duration_months INTEGER,
  start_date DATE,
  beneficiary_count INTEGER,
  beneficiary_description TEXT,
  status TEXT DEFAULT 'draft', -- draft, complete, approved, rejected
  donor_feedback TEXT,
  linked_grant_id UUID, -- FK to grant_applications if exists
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LFA Entries (Goal, Purpose, Outputs, Activities)
CREATE TABLE IF NOT EXISTS lfa_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('goal','purpose','output','activity')),
  sequence INTEGER DEFAULT 1,
  parent_id UUID REFERENCES lfa_entries(id) ON DELETE CASCADE,
  description TEXT,
  indicator TEXT,
  means_of_verification TEXT,
  assumption TEXT,
  responsible_party TEXT,
  timeline_start INTEGER, -- month number from project start
  timeline_end INTEGER,
  ai_suggestion TEXT, -- last AI suggestion for this entry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- V2-ready tables (create now, use later)
CREATE TABLE IF NOT EXISTS wbs_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  lfa_activity_id UUID REFERENCES lfa_entries(id),
  name TEXT NOT NULL,
  parent_task_id UUID REFERENCES wbs_tasks(id),
  assigned_to TEXT,
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  status TEXT DEFAULT 'not_started',
  progress_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  wbs_task_id UUID REFERENCES wbs_tasks(id),
  lfa_activity_id UUID REFERENCES lfa_entries(id),
  category TEXT, -- honorarium, perjalanan, konsumsi, jasa, barang
  sub_category TEXT,
  description TEXT,
  quantity NUMERIC,
  unit TEXT,
  unit_cost NUMERIC,
  sbm_reference TEXT, -- e.g. "PMK 32/2025 - Honorarium Narasumber Eselon II"
  sbm_max_amount NUMERIC,
  is_over_sbm BOOLEAN DEFAULT FALSE,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SBM 2026 reference data (seed immediately)
CREATE TABLE IF NOT EXISTS sbm_2026 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  max_amount NUMERIC,
  can_exceed BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Seed SBM 2026 data from PMK 32/2025
INSERT INTO sbm_2026 (category, sub_category, description, unit, max_amount, can_exceed) VALUES
-- Honorarium
('honorarium', 'narasumber_menteri', 'Narasumber setingkat Menteri/Pejabat Negara', 'OJ', 1700000, false),
('honorarium', 'narasumber_eselon1', 'Narasumber Pejabat Eselon I', 'OJ', 1400000, false),
('honorarium', 'narasumber_eselon2', 'Narasumber Pejabat Eselon II', 'OJ', 1000000, false),
('honorarium', 'narasumber_eselon3', 'Narasumber Pejabat Eselon III ke bawah', 'OJ', 900000, false),
('honorarium', 'moderator', 'Honorarium Moderator', 'Orang/Kali', 700000, false),
('honorarium', 'pembawa_acara', 'Honorarium Pembawa Acara', 'OK', 400000, false),
('honorarium', 'panitia_pj', 'Honorarium Panitia Penanggung Jawab', 'OK', 450000, false),
('honorarium', 'panitia_ketua', 'Honorarium Panitia Ketua/Wakil Ketua', 'OK', 400000, false),
('honorarium', 'panitia_anggota', 'Honorarium Panitia Anggota', 'OK', 300000, false),
-- Konsumsi
('konsumsi', 'fullboard', 'Paket Meeting Fullboard (menginap)', 'Orang/Hari', 450000, false),
('konsumsi', 'fullday', 'Paket Meeting Fullday (tidak menginap)', 'Orang/Hari', 250000, false),
('konsumsi', 'halfday', 'Paket Meeting Halfday', 'Orang/Kali', 175000, false),
('konsumsi', 'makan_siang', 'Makan Siang Rapat', 'Orang/Kali', 55000, false),
('konsumsi', 'snack', 'Snack Rapat', 'Orang/Kali', 25000, false),
-- Perjalanan Dinas Dalam Negeri
('perjalanan', 'uang_harian_a', 'Uang Harian Perdin Dalam Negeri Kota Besar', 'Orang/Hari', 530000, false),
('perjalanan', 'uang_harian_b', 'Uang Harian Perdin Dalam Negeri Kota Sedang', 'Orang/Hari', 430000, false),
('perjalanan', 'uang_harian_c', 'Uang Harian Perdin Dalam Negeri Kota Kecil', 'Orang/Hari', 370000, false),
('perjalanan', 'penginapan_a', 'Biaya Penginapan Kota Besar', 'Malam', 400000, true),
('perjalanan', 'penginapan_b', 'Biaya Penginapan Kota Sedang', 'Malam', 300000, true),
-- Jasa Konsultan
('konsultan', 'konsultan_individu', 'Jasa Konsultan Individu per bulan', 'OB', 20000000, true),
('konsultan', 'konsultan_harian', 'Jasa Konsultan Individu per hari', 'OH', 1000000, true),
('konsultan', 'tenaga_ahli', 'Tenaga Ahli per bulan', 'OB', 25000000, true)
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE lfa_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lfa_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbm_2026 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation_lfa_projects" ON lfa_projects;
CREATE POLICY "org_isolation_lfa_projects" ON lfa_projects
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

DROP POLICY IF EXISTS "org_isolation_lfa_entries" ON lfa_entries;
CREATE POLICY "org_isolation_lfa_entries" ON lfa_entries
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

DROP POLICY IF EXISTS "org_isolation_wbs_tasks" ON wbs_tasks;
CREATE POLICY "org_isolation_wbs_tasks" ON wbs_tasks
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

DROP POLICY IF EXISTS "org_isolation_budget_items" ON budget_items;
CREATE POLICY "org_isolation_budget_items" ON budget_items
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

DROP POLICY IF EXISTS "sbm_public_read" ON sbm_2026;
CREATE POLICY "sbm_public_read" ON sbm_2026
  FOR SELECT USING (true);
