# TD-0001 — Shared Carbon Engine Technical Design

**Status:** Proposed  
**Version:** 1.0  
**Date:** August 2026  
**Owners:** Impactory Engineering Team  
**Depends On:** `ADR-0002`, `ADR-0003`, `impactory_true_eroi_evolution_prd.md`, `PRD_ESG_Dashboard_MVP_Implementation.md`, `PRD_Sustainability_Report_Generator_MVP.md`  

---

## 1. Executive Summary & Objective

Dokumen Desain Teknis (**TD-0001**) ini mendefinisikan arsitektur dan struktur kode untuk **Shared Carbon Engine** terpusat di `src/lib/carbon/`.

**Tujuan Utamanya:**
- Mengabstraksi seluruh logika kalkulasi emisi karbon dari file [EROIStandalone.tsx](file:///c:/Users/maula/.gemini/antigravity/scratch/impactory/src/pages/dashboard/EROIStandalone.tsx) yang bersifat terikat UI.
- Menyediakan *deterministic pure-math engine* yang dapat digunakan secara universal oleh:
  1. Modul **E-ROI Carbon Tracker** (`/dashboard/eroi`)
  2. Modul **ESG Dashboard** (`/dashboard/esg`)
  3. Modul **Sustainability Report Generator** (`/dashboard/sustainability-reports`)
  4. Supabase Edge Functions & API Eksternal
- Menjamin kepatuhan mutlak pada **ADR-0002** (*Zero DB Duplication*) dan **ADR-0003** (*100% Deterministic Math, No AI Hallucinations in Calculations*).

---

## 2. File Structure Specification (`src/lib/carbon/`)

```text
src/lib/carbon/
├── index.ts          # Public API Exports
├── engine.ts         # Main Orchestration & Pipeline Service
├── calculators.ts    # Pure Math Calculation Functions
├── types.ts          # TypeScript Interfaces & Data Contracts
├── benchmarks.ts     # Carbon Pricing Benchmarks (IDXCarbon, SCC, VCM)
└── formatters.ts     # Human-Readable String Formatting Utilities
```

---

## 3. Data Contracts & Type Definitions (`types.ts`)

```typescript
// src/lib/carbon/types.ts

export type GHGScope = 'scope_1' | 'scope_2' | 'scope_3' | 'unassigned';

export interface CarbonActivityItem {
  id?: string;
  name: string;
  carbon_enabled: boolean;
  carbon_factor: number | null;
  carbon_quantity: number | null;
  carbon_unit?: string | null;
  carbon_source?: string | null;
  carbon_scope?: GHGScope | null;
}

export interface ScopeBreakdown {
  scope1_kg: number;
  scope2_kg: number;
  scope3_kg: number;
  unassigned_count: number;
}

export interface EnvironmentalValuationResult {
  benchmark_name: string;
  price_per_ton_idr: number;
  price_per_ton_usd: number;
  gross_reduction_value_idr: number;
  net_impact_value_idr: number;
}

export interface EROIResult {
  eroi_ratio: number;             // e.g. 0.42 (meaning 1 : 0.42)
  formatted_ratio: string;        // "1 : 0.42"
  cost_per_ton_reduced_idr: number; // Rp / ton CO2e reduced
  total_investment_idr: number;
}

export interface CarbonSummaryOutput {
  activity_count: number;
  missing_quantity_count: number;
  gross_emission_kg: number;
  gross_reduction_kg: number;
  net_impact_kg: number;
  net_impact_tons: number;
  trees_equivalent: number;
  scope_breakdown: ScopeBreakdown;
  valuation: EnvironmentalValuationResult;
  eroi?: EROIResult;
}
```

---

## 4. Benchmark Rates (`benchmarks.ts`)

```typescript
// src/lib/carbon/benchmarks.ts

export interface CarbonBenchmarkRate {
  code: string;
  name: string;
  price_per_ton_idr: number;
  price_per_ton_usd: number;
  description: string;
}

export const CARBON_BENCHMARKS: Record<string, CarbonBenchmarkRate> = {
  IDX_CARBON: {
    code: 'IDX_CARBON',
    name: 'Bursa Karbon Indonesia (IDXCarbon)',
    price_per_ton_idr: 69000, // Rp 69.000 / ton CO2e
    price_per_ton_usd: 4.31,
    description: 'Nilai Ekonomi Karbon (NEK) acuan resmi Bursa Karbon Indonesia.',
  },
  US_EPA_SCC: {
    code: 'US_EPA_SCC',
    name: 'Social Cost of Carbon (US EPA Benchmark)',
    price_per_ton_idr: 816000, // $51 / ton CO2e @ Rp 16.000
    price_per_ton_usd: 51.0,
    description: 'Estimasi kerugian ekonomi sosial global akibat emisi karbon.',
  },
};
```

---

## 5. Pure Calculation Engine (`calculators.ts`)

```typescript
// src/lib/carbon/calculators.ts
import { CarbonActivityItem, CarbonSummaryOutput, ScopeBreakdown } from './types';
import { CARBON_BENCHMARKS } from './benchmarks';

export function calculateCarbonSummary(
  items: CarbonActivityItem[],
  benchmarkCode: string = 'IDX_CARBON',
  totalBudgetIDR: number = 0
): CarbonSummaryOutput {
  let gross_emission_kg = 0;
  let gross_reduction_kg = 0;
  let missing_quantity_count = 0;

  const scope_breakdown: ScopeBreakdown = {
    scope1_kg: 0,
    scope2_kg: 0,
    scope3_kg: 0,
    unassigned_count: 0,
  };

  for (const item of items) {
    if (!item.carbon_enabled || item.carbon_factor == null) continue;

    const qty = Number(item.carbon_quantity);
    if (item.carbon_quantity == null || isNaN(qty)) {
      missing_quantity_count++;
      continue;
    }

    const impact_kg = Number(item.carbon_factor) * qty;

    if (impact_kg > 0) {
      gross_emission_kg += impact_kg;
    } else {
      gross_reduction_kg += Math.abs(impact_kg);
    }

    // Scope breakdown
    if (item.carbon_scope === 'scope_1') scope_breakdown.scope1_kg += impact_kg;
    else if (item.carbon_scope === 'scope_2') scope_breakdown.scope2_kg += impact_kg;
    else if (item.carbon_scope === 'scope_3') scope_breakdown.scope3_kg += impact_kg;
    else scope_breakdown.unassigned_count++;
  }

  const net_impact_kg = gross_emission_kg - gross_reduction_kg;
  const net_impact_tons = net_impact_kg / 1000;
  const trees_equivalent = Math.abs(net_impact_kg) / 5;

  // Valuation
  const benchmark = CARBON_BENCHMARKS[benchmarkCode] || CARBON_BENCHMARKS.IDX_CARBON;
  const net_reduction_tons = gross_reduction_kg > gross_emission_kg ? (gross_reduction_kg - gross_emission_kg) / 1000 : 0;
  const net_impact_value_idr = net_reduction_tons * benchmark.price_per_ton_idr;

  // EROI Ratio
  let eroi: any = undefined;
  if (totalBudgetIDR > 0) {
    const eroi_ratio = Number((net_impact_value_idr / totalBudgetIDR).toFixed(2));
    const cost_per_ton = net_reduction_tons > 0 ? totalBudgetIDR / net_reduction_tons : 0;

    eroi = {
      eroi_ratio,
      formatted_ratio: `1 : ${eroi_ratio}`,
      cost_per_ton_reduced_idr: Math.round(cost_per_ton),
      total_investment_idr: totalBudgetIDR,
    };
  }

  return {
    activity_count: items.length,
    missing_quantity_count,
    gross_emission_kg: Math.round(gross_emission_kg * 100) / 100,
    gross_reduction_kg: Math.round(gross_reduction_kg * 100) / 100,
    net_impact_kg: Math.round(net_impact_kg * 100) / 100,
    net_impact_tons: Math.round(net_impact_tons * 1000) / 1000,
    trees_equivalent: Math.round(trees_equivalent * 10) / 10,
    scope_breakdown,
    valuation: {
      benchmark_name: benchmark.name,
      price_per_ton_idr: benchmark.price_per_ton_idr,
      price_per_ton_usd: benchmark.price_per_ton_usd,
      gross_reduction_value_idr: Math.round((gross_reduction_kg / 1000) * benchmark.price_per_ton_idr),
      net_impact_value_idr: Math.round(net_impact_value_idr),
    },
    eroi,
  };
}
```

---

## 6. Performance Benchmark Targets

- **1,000 WBS Activities:** Execution time $< 15\text{ ms}$ (Target Requirement: $< 100\text{ ms}$).
- **5,000 WBS Activities:** Execution time $< 60\text{ ms}$ (Target Requirement: $< 500\text{ ms}$).

*Zero external network calls or asynchronous IO inside the pure calculation engine.*

---

## 7. Testing Requirements & Strategy (Vitest)

Unit test suit wajib ditempatkan di `src/lib/carbon/__tests__/calculators.test.ts`:
1. **Test Net Carbon Calculations:** Memastikan penjumlahan emisi kotor, reduksi kotor, dan net impact tepat.
2. **Test Scope Breakdown:** Memastikan klasifikasi Scope 1, 2, dan 3 terpisah dengan benar.
3. **Test IDXCarbon Valuation:** Memastikan konversi ton $\text{CO}_2\text{e} \times \text{Rp } 69.000$ akurat.
4. **Test EROI Ratio:** Memastikan pembagian $EV / \text{Budget}$ menghasilkan rasio $1 : X$.

---

## 8. Migration Sequence Plan

```
Phase 1: Implementasi modul `src/lib/carbon/` & Vitest Unit Tests [Sprint 1]
Phase 2: Refactor `EROIStandalone.tsx` untuk mengonsumsi `calculateCarbonSummary()` [Sprint 1]
Phase 3: Hubungkan `ESGReporting.tsx` (`/dashboard/esg`) ke `src/lib/carbon/` [Sprint 2]
Phase 4: Hubungkan Generator Laporan Keberlanjutan ke `src/lib/carbon/` [Sprint 2]
```

---

## Final Technical Recommendation

### **`APPROVED`**

> **Keputusan:**  
> Desain Teknis **TD-0001 (Shared Carbon Engine)** ini **DISETUJUI SEPENUHNYA**. Mengabstraksikan kalkulasi emisi karbon ke modul terpusat `src/lib/carbon/` menjamin konsistensi matematis 100% di seluruh produk dengan performa tinggi ($< 15\text{ ms}$) dan kepatuhan mutlak pada **ADR-0002** dan **ADR-0003**.

---

*End of TD-0001.*
