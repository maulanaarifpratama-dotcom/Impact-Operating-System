import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SROICalculator from '@/pages/dashboard/lfa-builder/SROICalculator';

const initialConfig = {
  id: "mocked-config-id",
  lfa_project_id: "11111111-1111-1111-1111-111111111111",
  org_id: "22222222-2222-2222-2222-222222222222",
  total_investment_idr: 100000000,
  discount_rate: 0.035,
  analysis_period_years: 1,
  beneficiary_count: 100,
  mode: "simple",
  sroi_ratio: 2.5,
  total_gross_value_idr: 250000000,
  total_present_value_idr: 250000000,
  ai_narrative: null,
  sensitivity_result: null
};

let activeConfig = { ...initialConfig };

const mockOutcomes = [
  {
    id: "mocked-outcome-id",
    lfa_project_id: "11111111-1111-1111-1111-111111111111",
    org_id: "22222222-2222-2222-2222-222222222222",
    meal_item_id: null,
    outcome_name: "Peningkatan Pendapatan",
    quantity: 10,
    unit: "orang",
    proxy_value_idr: 25000000,
    proxy_source: "Estimasi Publik",
    proxy_citation: "BPS 2026",
    proxy_category: "Pendidikan",
    duration_years: 1,
    attribution_pct: 100,
    deadweight_pct: 0,
    displacement_pct: 0,
    dropoff_pct_per_year: 0,
    gross_value_idr: 250000000,
    present_value_idr: 250000000,
    mode: "simple",
    sort_order: 1
  }
];

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn((fields: any) => {
    console.log("TEST_MOCK: update called with fields:", fields);
    activeConfig = { ...activeConfig, ...fields };
    return mockQueryBuilder;
  }),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockImplementation(() => {
    console.log("TEST_MOCK: order called!");
    return Promise.resolve({ data: mockOutcomes, error: null });
  }),
  maybeSingle: vi.fn().mockImplementation(() => {
    console.log("TEST_MOCK: maybeSingle called! mode is:", activeConfig.mode);
    return Promise.resolve({ data: activeConfig, error: null });
  }),
  single: vi.fn().mockImplementation(() => {
    console.log("TEST_MOCK: single called! mode is:", activeConfig.mode);
    return Promise.resolve({ data: activeConfig, error: null });
  }),
  then: vi.fn(function(onFulfilled: any) {
    console.log("TEST_MOCK: then called!");
    return Promise.resolve({ data: activeConfig, error: null }).then(onFulfilled);
  }),
};

// Mock Supabase using absolute and relative imports
vi.mock('@/integrations/supabase/client', () => {
  console.log("TEST_MOCK: Mocking @/integrations/supabase/client");
  return {
    supabase: {
      from: vi.fn((table) => {
        console.log(`TEST_MOCK: from(${table}) called`);
        return mockQueryBuilder;
      }),
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

vi.mock('../integrations/supabase/client', () => {
  console.log("TEST_MOCK: Mocking ../integrations/supabase/client");
  return {
    supabase: {
      from: vi.fn((table) => {
        console.log(`TEST_MOCK: from(${table}) called`);
        return mockQueryBuilder;
      }),
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

// Mock useToast with stable references to prevent infinite render loops in tests
const stableToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: stableToast,
  }),
}));

// Mock Recharts to avoid jsdom measurement issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  PieChart: ({ children }: any) => <svg data-testid="pie-chart">{children}</svg>,
  Pie: ({ children }: any) => <g data-testid="pie">{children}</g>,
  Cell: () => <g data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend">Legend</div>,
}));

describe('SROICalculator Smoke Test', () => {
  const dummyProps = {
    projectId: '11111111-1111-1111-1111-111111111111',
    orgId: '22222222-2222-2222-2222-222222222222',
    programDurationMonths: 12,
    sector: 'Pendidikan',
  };

  beforeEach(() => {
    // Reset mutable configuration before each test
    activeConfig = { ...initialConfig };
    stableToast.mockClear();
  });

  it('should render SROI Calculator with disclaimer and tabs', async () => {
    console.log("TEST_MOCK: starting test 1");
    render(<SROICalculator {...dummyProps} />);

    // Verify critical required SROI UI disclaimer (Guardrail 10) using async findByText directly in the expectation
    expect(
      await screen.findByText(/Proxy values ini merupakan estimasi awal berdasarkan referensi publik/i)
    ).toBeInTheDocument();

    // Verify sector benchmark disclaimer (Guardrail 11)
    expect(
      screen.getByText(/Benchmark sektor bersifat ilustratif sampai tersedia cukup data pembanding terverifikasi/i)
    ).toBeInTheDocument();

    // Check mode buttons
    expect(screen.getByText(/🌱 Sederhana/i)).toBeInTheDocument();
    expect(screen.getByText(/🏢 Profesional/i)).toBeInTheDocument();
  });

  it('should allow toggling between Simple and Professional modes', async () => {
    console.log("TEST_MOCK: starting test 2");
    render(<SROICalculator {...dummyProps} />);

    // Wait for UI to load and render Mode buttons
    const simpleBtn = await screen.findByText(/🌱 Sederhana/i);
    const profBtn = screen.getByText(/🏢 Profesional/i);

    // Switch to Professional Mode
    fireEvent.click(profBtn);

    // Verify professional fields (like Discount Rate) are displayed or mentioned
    expect(await screen.findByText(/Asumsi Suku Bunga Diskonto/i)).toBeInTheDocument();

    // Switch back to Simple Mode
    fireEvent.click(simpleBtn);
    expect(screen.queryByText(/Asumsi Suku Bunga Diskonto/i)).not.toBeInTheDocument();
  });
});
