# ADR-0002 — Canonical Program Lifecycle & Sustainability Intelligence Architecture

**Status:** Accepted  
**Date:** August 2026  
**Owners:** Impactory Technical Architecture & Product Engineering Team  
**Supersedes:** N/A  
**Related Documents:**  
- `docs/adr/ADR-0001-canonical-ontology-authority.md`  
- `docs/product/Impactory_Canonical_LFA_Matrix_SOT_PRD_v1.md`  
- `architectural_audit_esg_carbon_eroi.md`  

---

## 1. Context

Impactory dikembangkan sebagai **Integrated Program Lifecycle System** untuk NGO, yayasan, *social enterprise*, dan donor/korporasi di Indonesia. Sistem ini mengelola siklus hidup program dampak secara menyeluruh dari perencanaan (*planning*), pelaksanaan (*execution*), pemantauan (*monitoring*), evaluasi (*evaluation*), hingga pelaporan (*reporting*).

Seiring berkembangnya kebutuhan industri dan kriteria pendanaan hibah/CSR korporasi, terdapat kebutuhan mendesak untuk menambahkan kapabilitas **ESG Dashboard**, **Carbon Calculator**, **ESG Reporting**, dan **Sustainability Reporting** berstandar **GRI**, **IFRS S2**, dan **SEOJK 16/2021**.

Namun, penambahan kapabilitas pelaporan keberlanjutan (*sustainability intelligence*) ini menyimpan risiko fatal jika dikembangkan secara naif:
1. **Risiko Duplikasi Data & Domain:** Membuat tabel aktivitas, indikator, atau anggaran khusus ESG secara terpisah yang mereplikasi data proyek.
2. **Risiko Fragmentasi Alur Kerja:** Memaksa NGO melakukan *double entry* (mengisi formulir LFA/WBS lalu mengulang pengisian formulir ESG).
3. **Risiko Inkonsistensi Metrik:** Terjadinya perbedaan angka capaian antara laporan dampak program (*Impact Report*) dengan laporan keberlanjutan (*ESG Report*).

Hasil audit menyeluruh terhadap 12 modul Impactory membuktikan bahwa **77% data yang dibutuhkan untuk ESG sudah tersedia** di dalam 4 fondasi utama sistem. Oleh karena itu, ADR ini menetapkan batas-batas arsitektur (*architectural boundaries*) agar modul ESG dibangun sebagai **Derived Aggregation Layer** di atas arsitektur existing tanpa merusak integritas *Core Program Lifecycle*.

---

## 2. Decision

Secara resmi ditetapkan bahwa arsitektur Impactory terbagi secara tegas menjadi **4 Fondasi Kanonis Utama (Sources of Truth)** dan **5 Downstream Service Layers**.

### 2.1 The Four Canonical Foundations (Core Sources of Truth)

1. **LFA (Logical Framework Approach) = Canonical Program Design Source of Truth**  
   - **DB Entities:** `lfa_projects`, `lfa_entries` (Goal, Purpose, Outcome, Output, Activity)
   - **Authority:** Menjadi satu-satunya pemilik identitas hirarki hasil program (*result chain statements & hierarchy*).

2. **WBS (Work Breakdown Structure) = Canonical Execution Structure Source of Truth**  
   - **DB Entities:** `lfa_wbs_items` (Work Packages, Level-2 Activities, Execution Progress)
   - **Authority:** Menjadi satu-satunya pemilik jadwal pelaksanaan, penanggung jawab, persentase kemajuan, dan kuantitas emisi karbon fisik aktivitas.

3. **Budget = Canonical Financial Structure Source of Truth**  
   - **DB Entities:** `lfa_budget_items`, `budget_realisasi`
   - **Authority:** Menjadi satu-satunya pemilik alokasi anggaran perencanaan ($RAB$) dan realisasi pengeluaran finansial program.

4. **MEAL (Monitoring, Evaluation, Accountability, Learning) = Canonical Performance Structure Source of Truth**  
   - **DB Entities:** `meal_indicators`, `meal_tracking_logs`
   - **Authority:** Menjadi satu-satunya pemilik definisi indikator, target, baseline, dan log data capaian fisik di lapangan.

---

### 2.2 The Five Downstream Derived Layers

1. **SROI (Social Return on Investment) = Derived Social Valuation Layer**  
   - **Entities:** `sroi_calculators`, `sroi_outcomes`, `sroi_financial_proxies`  
   - **Role:** Mengonversi data outcome MEAL dan anggaran Budget menjadi estimasi nilai moneter sosial ($Net\ Social\ Value$).

2. **EROI (Environmental Return on Investment) = Derived Environmental Valuation Layer**  
   - **Entities:** `lfa_wbs_items` (`carbon_*` attributes), Shared Carbon Engine  
   - **Role:** Menghitung neraca fisik karbon ($\text{kg CO}_2\text{e}$) dan mengonversinya menjadi $E\text{-}ROI$ Ratio berbasis *Social Cost of Carbon*.

3. **ESG (Environmental, Social, Governance) = Sustainability Aggregation Layer**  
   - **Entities:** `facility_environmental_logs` (Light Log), Read-Only Views  
   - **Role:** Mengumpulkan (*aggregate*) metrik Pilar E, S, dan G dari WBS, MEAL, SROI, EROI, dan Beneficiary Registry tanpa mengubah data transaksi.

4. **Reporting = Presentation Layer**  
   - **Entities:** `impact_readiness_assessments`, `esg_report_snapshots`  
   - **Role:** Merender laporan eksekutif (MOR, Impact Report, GRI / SEOJK Sustainability Report, SDG Matrix).

5. **Library = Knowledge Layer**  
   - **Entities:** `library_documents`, `library_chunks` (pgvector)  
   - **Role:** Menyimpan dan mengindeks seluruh artefak proposal dan laporan untuk pencarian RAG berbasis AI.

---

## 3. Architectural Directives (Strict Prohibitions)

Untuk menjamin integritas data dan mencegah *domain duplication*, aturan larangan eksplisit berikut **WAJIB DITEGAKKAN**:

### 3.1 ESG Prohibitions
- ❌ **ESG MUST NOT CREATE** *ESG Activities* (seluruh aktivitas wajib dari `lfa_wbs_items`).
- ❌ **ESG MUST NOT CREATE** *ESG Outcomes* (seluruh outcome wajib dari `lfa_entries`).
- ❌ **ESG MUST NOT CREATE** *ESG Budgets* (seluruh biaya wajib dari `lfa_budget_items`).
- ❌ **ESG MUST NOT CREATE** *ESG Indicators* (seluruh indikator kinerja wajib dari `meal_indicators`).
- ❌ **ESG MUST NOT CREATE** *ESG Beneficiaries* (seluruh data demografi wajib dari `beneficiaries`).

### 3.2 SROI Prohibitions
- ❌ **SROI MUST NOT CREATE** *Program Activities* independen.
- ❌ **SROI MUST NOT CREATE** *Budget Structures* paralel.
- ❌ **SROI MUST NOT CREATE** *Monitoring Indicators* terpisah dari MEAL.

### 3.3 EROI Prohibitions
- ❌ **EROI MUST NOT CREATE** *Parallel Carbon Ownership* (faktor karbon & kuantitas wajib terikat pada `lfa_wbs_items`).
- ❌ **EROI MUST NOT CREATE** *Activity Structures* terpisah.

---

## 4. Approved Data Lineage & Ownership Matrix

```mermaid
flowchart LR
    LFA["LFA (Program Design)<br/>lfa_entries"] -->|Source Activity| WBS["WBS (Execution)<br/>lfa_wbs_items"]
    WBS -->|lfa_wbs_item_id| BGT["Budget (Financial)<br/>lfa_budget_items"]
    LFA -->|lfa_entry_id| MEAL["MEAL (Performance)<br/>meal_indicators"]
    
    MEAL -->|meal_item_id| SROI["SROI (Social Value)"]
    WBS -->|carbon_*| EROI["EROI (Carbon Impact)"]
    
    SROI --> ESG["ESG Dashboard<br/>(Aggregation View)"]
    EROI --> ESG
    MEAL --> ESG
    BGT --> ESG
    BEN["Beneficiary Registry"] --> ESG
    
    ESG --> REP["Sustainability Reporting<br/>(Presentation Layer)"]

    classDef core fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#0f172a;
    classDef downstream fill:#f3e8ff,stroke:#6b21a8,stroke-width:1.5px,color:#0f172a;
    class Core LFA,WBS,BGT,MEAL core;
    class Downstream SROI,EROI,ESG,REP downstream;
```

### Table Ownership Specification

| Data Domain | Single Source of Truth Table | Primary Interface | Allowed Downstream Operations |
|---|---|---|---|
| **Result Hierarchy** | `lfa_entries` | LFA Builder | Read-only mapping for MEAL & SROI |
| **Execution Tasks** | `lfa_wbs_items` | WBS Builder | Read-only calculation for EROI & Evidence |
| **Financial Allocations**| `lfa_budget_items` | Budget Builder | Read-only input for SROI Investment ratio |
| **Performance Targets** | `meal_indicators` | MEAL Planner | Read-only input for SROI Outcome & ESG Social |
| **Beneficiary Profile** | `beneficiaries` | Beneficiary Registry | Read-only aggregation for ESG Inclusion S-Pillar |
| **Operational Utilities**| `facility_environmental_logs` | ESG Office Profile | Read-only input for HQ Scope 2 / Waste E-Pillar |
| **Report Snapshots** | `esg_report_snapshots` | Report Generator | Immutable archive for PDF export audit trail |

---

## 5. Consequences & Trade-offs

### 5.1 Positive Consequences
- **Zero Data Duplication:** Tidak ada tabel aktivitas, indikator, atau anggaran duplikat di seluruh sistem.
- **Minimal Codebase Footprint:** Penambahan kapabilitas ESG hanya membutuhkan **< 15% domain objects baru** (`facility_environmental_logs` & `esg_report_snapshots`).
- **Single-Input Workflow:** Pengguna NGO hanya perlu menginput data di WBS dan MEAL sekali; ESG Dashboard dan Sustainability Report akan terisi secara otomatis.
- **Audit-Grade Integrity:** Data Laporan Keberlanjutan dapat ditelusuri (*lineage traceability*) hingga ke bukti foto dan nota verifikasi di Evidence Ledger.

### 5.2 Negative Consequences / Trade-offs
- **Strict Developer Discipline Required:** Pengembang DILARANG KERAS menambahkan kolom formulir input baru di modul ESG tanpa persetujuan Architecture Board.
- **Complex Aggregation Queries:** Membutuhkan *SQL Views* / Edge Functions agregasi yang efisien agar tidak memperlambat respon antarmuka UI.

---

*End of ADR-0002.*
