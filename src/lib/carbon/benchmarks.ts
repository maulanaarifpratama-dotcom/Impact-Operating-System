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

export const DEFAULT_BENCHMARK_CODE = 'IDX_CARBON';
