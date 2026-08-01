# PRD — ESG Dashboard MVP Implementation

**Status:** Proposed  
**Version:** 1.0  
**Date:** August 2026  
**Owners:** Impactory Product & Engineering Team  
**Depends On:** `ADR-0002`, `ADR-0003`, `Impactory_Canonical_LFA_Matrix_SOT_PRD_v1.md`  

---

## 1. Executive Summary & Objective

PRD ini mendefinisikan spesifikasi produk dan teknis untuk mengimplementasikan **ESG Dashboard MVP** di platform Impactory.

Sesuai dengan ketentuan ketat **ADR-0002** dan **ADR-0003**:
- ESG Dashboard **BUKAN** merupakan *source of truth* data baru.
- ESG Dashboard bekerja sebagai **Read-Only Aggregation Layer** yang secara otomatis menghimpun metrik pilar **Environmental (E)**, **Social (S)**, dan **Governance (G)** dari data transaksi proyek yang sudah ada.
- ESG Dashboard **TIDAK MEMILIKI** formulir input untuk membuat aktivitas, outcome, indikator, anggaran, atau penerima manfaat baru.

---

## 2. Scope & Navigation Placement

- **Route Path:** `/dashboard/esg`
- **Sidebar Group:** `Sustainability Intelligence`
- **Navigation Label:** `ESG Dashboard`
- **Target Page Component:** [src/pages/dashboard/ESGReporting.tsx](file:///c:/Users/maula/.gemini/antigravity/scratch/impactory/src/pages/dashboard/ESGReporting.tsx)

---

## 3. Data Sources & Metrics Mapping Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                READ-ONLY AGGREGATION ENGINE                            │
├───────────────────────────┬───────────────────────────┬────────────────────────────────┤
│ PILAR ENVIRONMENTAL (E)   │ PILAR SOCIAL (S)          │ PILAR GOVERNANCE (G)           │
├───────────────────────────┼───────────────────────────┼────────────────────────────────┤
│ Source:                   │ Source:                   │ Source:                        │
│ • `lfa_wbs_items`         │ • `beneficiaries`         │ • `impact_readiness_assessments│
│ • Shared Carbon Engine    │ • `meal_indicators`       │ • `wbs_completion_claims`      │
│ • EROI Outputs            │ • `sroi_calculators`      │                                │
│                           │                           │                                │
│ Metrics:                  │ Metrics:                  │ Metrics:                       │
│ • Scope 1, 2, 3 CO2e      │ • Total Beneficiaries     │ • Evidence Verification Rate % │
│ • Net Carbon Impact       │ • Female % & Youth %      │ • Impact Readiness Score       │
│ • Trees Equivalent        │ • Vulnerable Group %      │ • Compliance & Risk Score      │
│ • Monetized Env Value     │ • Social Value (Rp)       │                                │
│ • EROI Ratio (1 : X)      │ • SROI Ratio (1 : X)      │                                │
└───────────────────────────┴───────────────────────────┴────────────────────────────────┘
```

---

## 4. UI Layout & Section Specifications

### Section 1: Executive Overview Cards
- **Environmental Summary Card:** Net Carbon Impact ($\text{tons CO}_2\text{e}$), Trees Equivalent, Monetized Env Value ($Rp$).
- **Social Summary Card:** Total Beneficiaries, Female %, Disabilitas %, Net Social Value ($Rp$).
- **Governance Summary Card:** Evidence Verification Rate (%), Readiness Score, Compliance Level.
- **Overall Sustainability Badge:** Combined Impact Multiple ($SROI_{\text{Ratio}} + EROI_{\text{Ratio}}$).

---

### Section 2: Environment Tab (`#environment`)
- **Carbon Emissions Trend Chart:** Line/Bar Chart distribusi emisi per bulan.
- **GHG Scope Breakdown:** Donut Chart porsi Scope 1 (Langsung), Scope 2 (Listrik PLN), Scope 3 (Rantai Nilai).
- **EROI Performance Metrics:** Monetized Environmental Value vs Total Investment.

---

### Section 3: Social Tab (`#social`)
- **Beneficiary Demographic Composition:** Bar Chart distribusi gender, usia, dan kelompok rentan.
- **SROI Outcome Summary:** Net Present Social Value ($Rp$) & Rasio SROI per kelompok pemangku kepentingan.
- **MEAL Outcome Target vs Achievement:** Progress Bar % ketercapaian indikator sosial.

---

### Section 4: Governance Tab (`#governance`)
- **Evidence Audit Coverage:** Donut Chart persentase klaim WBS yang telah terverifikasi foto & receipt.
- **Impact Readiness Score Radar:** Radar Chart skor kesiapan tata kelola organisasi (Legal, Tax, Safeguarding).
- **Risk Mitigation Summary:** Status pengelolaan risiko dari LFA Risk Registry.

---

### Section 5: SDGs Tab (`#sdgs`)
- **SDG Alignment Grid:** Tampilan interaktif 17 SDG Tiles yang menyala (*highlighted*) secara otomatis berdasarkan vektor pemetaan deterministik dari indikator & aktivitas WBS.

---

## 5. AI Integration (ADR-0003 Compliant)

- **AI Service:** `@impactory/ai` proxy (`supabase/functions/library-rag` atau `ads-generate`).
- **Input Context:** Hanya menerima *Structured Metrics Payload* yang sudah divalidasi dari Tier A/B.
- **Output:** AI meng-generate *Executive Summary Paragraph* & *Sustainability Highlights*.
- **Guardrails:** AI **DILARANG KERAS** mengarang angka metrik. Jika data tidak lengkap, AI mencantumkan `"Data tidak tersedia dalam catatan program"`.

---

## 6. Plan Entitlements & Pricing Tiering

Pengecekan hak akses **DILARANG KERAS menggunakan RLS Database**. Pengecekan dilakukan di layer aplikasi menggunakan service `plan_entitlements`:

```typescript
// Entitlement Enforcement Pattern (src/hooks/usePlanEntitlements.ts)
const { hasEntitlement } = usePlanEntitlements();

const canAccessAdvancedAnalytics = hasEntitlement('esg_advanced_analytics');
const canAccessAIExecutiveSummary = hasEntitlement('esg_ai_summary');
const canAccessPDFExporter = hasEntitlement('sustainability_report_export');
```

| Feature / Capability | Free Tier | Pro Tier | Enterprise Tier |
|---|:---:|:---:|:---:|
| **Basic ESG Metrics Overview** | ✅ Available | ✅ Available | ✅ Available |
| **Basic Carbon & Beneficiary Charts** | ✅ Available | ✅ Available | ✅ Available |
| **Advanced ESG Analytics & Trends** | 🔒 Upgrade Prompt | ✅ Available | ✅ Available |
| **AI Executive Summary Narrative** | 🔒 Upgrade Prompt | 🔒 Upgrade Prompt | ✅ Available |
| **PDF/Docx Report Exporter** | 🔒 Upgrade Prompt | 🔒 Upgrade Prompt | ✅ Available |

---

## 7. Non-Functional & Performance Requirements

- **Dashboard Load Time:** $< 2.0\text{ detik}$ (termasuk *initial render*).
- **Aggregation Query Execution:** $< 500\text{ ms}$ untuk menghimpun data multi-tabel.
- **AI Summary Response Caching:** Teks narasi AI disimpan di database (`esg_report_snapshots`) dan di-*cache* selama $24\text{ jam}$ untuk menghemat kuota Azure AI Foundry.
- **Multi-Tenant Security:** Diisolasikan secara mutlak menggunakan `org_id` via Supabase RLS Policy (`organization_members`). Zero cross-tenant leakage.

---

## 8. Acceptance Criteria

- [ ] **AC-01:** Pengguna dapat membuka `/dashboard/esg` dan melihat statistik Pilar E, S, G, dan SDGs tanpa perlu menginput data tambahan apapun.
- [ ] **AC-02:** Seluruh angka emisi karbon terhubung langsung dengan kolom `carbon_*` di `lfa_wbs_items`.
- [ ] **AC-03:** Seluruh angka penerima manfaat terhubung langsung dengan tabel `beneficiaries`.
- [ ] **AC-04:** Seluruh angka SROI terhubung langsung dengan `sroi_calculators` & `sroi_outcomes`.
- [ ] **AC-05:** Tampilan narasi AI mematuhi ADR-0003 dan tidak pernah mengarang angka metrik.
- [ ] **AC-06:** Pengecekan paket langganan menggunakan `plan_entitlements` (bukan RLS), dan akun Free melihat modal *Upgrade Prompt* yang elegan saat mengklik fitur Enterprise.
- [ ] **AC-07:** Lolos audit kepatuhan `ADR-0002` dan `ADR-0003`.

---

*End of PRD.*
