# PRD — Sustainability Report Generator MVP

**Status:** Proposed  
**Version:** 1.0  
**Date:** August 2026  
**Owners:** Impactory Product & Engineering Team  
**Depends On:** `ADR-0002`, `ADR-0003`, `PRD_ESG_Dashboard_MVP_Implementation.md`, `impactory_true_eroi_evolution_prd.md`  

---

## 1. Executive Summary & Objective

PRD ini mendefinisikan spesifikasi produk dan teknis untuk mengimplementasikan **Sustainability Report Generator MVP** di platform Impactory.

Sesuai dengan ketentuan ketat **ADR-0002** dan **ADR-0003**:
- Report Generator **BUKAN** *source of truth* data baru dan **BUKAN** formulir input ESG.
- Report Generator bekerja sebagai **Automated Compilation Engine** yang secara otomatis menarik data dari 4 fondasi kanonis (LFA, WBS, Budget, MEAL) dan 3 layer evaluasi (SROI, EROI, ESG) untuk menghasilkan laporan berstandar **GRI**, **SEOJK 16/2021**, dan **UN SDGs Matrix**.
- Pengguna **TIDAK PERLU melakukan pengisian data ulang** (*Zero Manual Double Entry*).

---

## 2. Scope & Route Placement

- **Route Path:** `/dashboard/sustainability-reports`
- **Sidebar Group:** `Sustainability Intelligence`
- **Navigation Label:** `Sustainability Reports`
- **Target Page Component:** [src/pages/dashboard/products/ImpactoryLibrary.tsx](file:///c:/Users/maula/.gemini/antigravity/scratch/impactory/src/pages/dashboard/products/ImpactoryLibrary.tsx) atau modul halaman baru di `src/pages/dashboard/SustainabilityReports.tsx`.

---

## 3. Supported Report Templates

| Template Code | Template Name | Target Audience / Compliance Standard | Primary Focus |
|---|---|---|---|
| **TEMPLATE-A** | **GRI Standards Report** | Multinasional, Donor Internasional, Global Investors | Standar GRI Universal, GRI 302/305/413. |
| **TEMPLATE-B** | **SEOJK No. 16/SEOJK.04/2021** | LHK, BUMN, Emiten, Perusahaan Publik Indonesia | Petunjuk Teknis Laporan Keberlanjutan OJK. |
| **TEMPLATE-C** | **UN SDGs Contribution Report** | NGO, PBB, Lembaga Bantuan Pembangunan | Kontribusi terhadap 17 Sustainable Development Goals. |
| **TEMPLATE-D** | **Executive Sustainability Brief** | Dewan Direksi, Donor Utama, CSR Committees | Ringkasan eksekutif 3 halaman dengan AI Highlights. |

---

## 4. Nine Standard Report Sections & Data Sources

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATED REPORT COMPILATION PIPELINE                           │
├───────┬─────────────────────────────────┬──────────────────────────────────────────────┤
│ SEC # │ SECTION NAME                    │ CANONICAL SOURCE TABLE / SERVICE             │
├───────┼─────────────────────────────────┼──────────────────────────────────────────────┤
│ Sec 1 │ Organization Profile            │ `organizations`, `organization_members`      │
│ Sec 2 │ Program Overview & Strategy     │ `lfa_projects`, `lfa_entries` (Goal/Purpose) │
│ Sec 3 │ Execution & Evidence Audit      │ `lfa_wbs_items`, `wbs_completion_claims`     │
│ Sec 4 │ Financial Allocations & Spend   │ `lfa_budget_items`, `budget_realisasi`       │
│ Sec 5 │ Performance & MEAL Indicators   │ `meal_indicators`, `meal_tracking_logs`      │
│ Sec 6 │ Social Impact & SROI            │ `sroi_calculators`, `sroi_outcomes`          │
│ Sec 7 │ Environmental Impact & EROI     │ Shared Carbon Engine (`carbon_*` totals)     │
│ Sec 8 │ ESG Integrated Summary          │ ESG Aggregation Service                      │
│ Sec 9 │ SDGs Alignment Matrix           │ Deterministic SDG Mapping Vector Engine      │
└───────┴─────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 5. AI Integration & Guardrails (ADR-0003 Compliant)

- **AI Service:** Proxy terpusat `@impactory/ai`.
- **Allowed AI Generative Scope:**
  - Executive Statement & Chairman's Foreword.
  - ESG Performance Highlights & Contextual Narratives.
  - SDG Contribution Explanations.
- **Strict Prohibitions:**
  - ❌ AI **DILARANG KERAS** mengarang angka metrik, anggaran, emisi karbon, atau penerima manfaat.
  - ❌ Jika data dari Tier A/B kosong, AI wajib mencantumkan `"Data tidak tersedia dalam catatan program"`.

---

## 6. Report Versioning & Database Schema (`esg_report_snapshots`)

Setiap laporan yang dipublikasikan bersifat **IMMUTABLE** (tidak dapat diubah setelah diterbitkan). Versi baru akan disimpan sebagai *snapshot* baru.

```sql
-- DDL Migration Schema for Report Versioning
CREATE TABLE IF NOT EXISTS public.esg_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('GRI', 'SEOJK', 'SDG', 'EXECUTIVE')),
  report_period TEXT NOT NULL,
  snapshot_json JSONB NOT NULL,
  pdf_storage_url TEXT,
  docx_storage_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Read and Insert Only (NO UPDATE POLICY TO PREVENT TAMPERING)
ALTER TABLE public.esg_report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org report snapshots"
ON public.esg_report_snapshots FOR SELECT
USING (org_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can create report snapshots"
ON public.esg_report_snapshots FOR INSERT
WITH CHECK (org_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
```

---

## 7. Plan Entitlements & Pricing Tiering

Pengecekan hak akses ekspor dilakukan di layer aplikasi via `plan_entitlements`:

```typescript
const { hasEntitlement } = usePlanEntitlements();

const canExportPDF = hasEntitlement('report_export_pdf');
const canExportDOCX = hasEntitlement('report_export_docx');
const canAccessGRIandSEOJK = hasEntitlement('report_template_enterprise');
```

| Feature / Template | Free Tier | Pro Tier | Enterprise Tier |
|---|:---:|:---:|:---:|
| **Interactive Report Preview** | ✅ Unlimited | ✅ Unlimited | ✅ Available |
| **Executive Brief Template** | ✅ Preview | ✅ Download PDF | ✅ Full Export |
| **SDG Contribution Report** | 🔒 Upgrade | ✅ Download PDF | ✅ Full Export |
| **GRI Standards 2021 Report** | 🔒 Upgrade | 🔒 Upgrade | ✅ Full Export (PDF & DOCX) |
| **SEOJK No. 16/2021 Report** | 🔒 Upgrade | 🔒 Upgrade | ✅ Full Export (PDF & DOCX) |
| **AI Narrative Generation** | 🔒 Upgrade | 🔒 Upgrade | ✅ Unlimited |

---

## 8. Export Formats

- **PDF (Portable Document Format):** Format resmi siap cetak dengan *layout* profesional berstandar korporat.
- **DOCX (Microsoft Word):** Format editable untuk disisipkan ke dalam Laporan Tahunan (*Annual Report*) korporasi/LHK.
- *(Future Enhancement: XLSX untuk tabel data mentah GRI).*

---

## 9. Acceptance Criteria

- [ ] **AC-01:** Pengguna dapat menekan tombol *"Generate Sustainability Report"*, lalu sistem mengompilasi data 9 section secara otomatis tanpa meminta pengisian data ulang.
- [ ] **AC-02:** Tersedia 4 pilihan template (GRI, SEOJK 16/2021, SDG, dan Executive Brief).
- [ ] **AC-03:** Setiap laporan yang di-generate menyimpan *snapshot* immutable ke dalam tabel `esg_report_snapshots`.
- [ ] **AC-04:** Naratif AI mematuhi `ADR-0003` dan tidak pernah mengarang angka metrik.
- [ ] **AC-05:** Pengecekan langganan menggunakan `plan_entitlements`, dan akun Free/Pro melihat modal *Upgrade Prompt* saat mengunduh template Enterprise.
- [ ] **AC-06:** Lolos audit kepatuhan `ADR-0002`, `ADR-0003`, dan `Multi-Tenant RLS Audit`.

---

*End of PRD.*
