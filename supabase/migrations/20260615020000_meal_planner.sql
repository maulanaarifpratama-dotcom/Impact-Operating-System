-- Migration: MEAL Planner schema
-- Path: supabase/migrations/20260615020000_meal_planner.sql

CREATE TABLE IF NOT EXISTS lfa_meal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lfa_level TEXT CHECK (lfa_level IN ('goal', 'purpose', 'output')) NOT NULL,
  indicator_text TEXT NOT NULL,
  target_value NUMERIC,
  target_unit TEXT,
  collection_method TEXT, -- Survey, Wawancara, FGD, Observasi Lapangan, Studi Dokumen, Data Sekunder, Lainnya
  collection_tool TEXT, -- Kuesioner Terstruktur, Panduan Wawancara, Panduan FGD, Lembar Observasi, Form Monitoring Bulanan, Data Administratif
  frequency TEXT, -- Bulanan, Triwulan, Semesteran, Tahunan, Awal & Akhir Program, Insidental
  pic TEXT,
  status TEXT DEFAULT 'Belum Mulai' CHECK (status IN ('Belum Mulai', 'Sedang Berjalan', 'Selesai')),
  baseline NUMERIC,
  midline_target NUMERIC,
  endline_target NUMERIC,
  secondary_source TEXT,
  disaggregation TEXT[] DEFAULT '{}', -- Jenis Kelamin, Usia, Wilayah, Kelompok Rentan, Lainnya
  data_assumption TEXT,
  monitoring_risk TEXT,
  mode TEXT CHECK (mode IN ('simple', 'professional')) DEFAULT 'simple',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lfa_meal_learning_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_method TEXT,
  timeline_month INTEGER DEFAULT 1 CHECK (timeline_month >= 1),
  pic TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lfa_meal_accountability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mechanism TEXT NOT NULL, -- Kotak Saran, Hotline, Pertemuan Komunitas, Survey Kepuasan, Lainnya
  frequency TEXT,
  pic TEXT,
  escalation_procedure TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lfa_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lfa_meal_learning_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lfa_meal_accountability ENABLE ROW LEVEL SECURITY;

-- Org isolation policy for lfa_meal_items
DROP POLICY IF EXISTS "org_isolation_lfa_meal_items" ON lfa_meal_items;
CREATE POLICY "org_isolation_lfa_meal_items" ON lfa_meal_items
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

-- Org isolation policy for lfa_meal_learning_questions
DROP POLICY IF EXISTS "org_isolation_lfa_meal_learning_questions" ON lfa_meal_learning_questions;
CREATE POLICY "org_isolation_lfa_meal_learning_questions" ON lfa_meal_learning_questions
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

-- Org isolation policy for lfa_meal_accountability
DROP POLICY IF EXISTS "org_isolation_lfa_meal_accountability" ON lfa_meal_accountability;
CREATE POLICY "org_isolation_lfa_meal_accountability" ON lfa_meal_accountability
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));
