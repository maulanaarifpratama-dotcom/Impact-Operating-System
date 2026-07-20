import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import GrantWriterProposal from './GrantWriterProposal';

const { mockSupabaseFrom, toastMock, writeCalls } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
  toastMock: vi.fn(),
  writeCalls: [] as Array<{
    table: string;
    type: 'insert' | 'update' | 'delete';
    payload: unknown;
    filters: Array<{ column: string; value: unknown }>;
  }>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to?: string }) => <a href={to || '#'}>{children}</a>,
    useParams: () => ({ projectId: 'gw-project-1' }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

type QueryState = {
  filters: Array<{ column: string; value: unknown }>;
  insertPayload?: unknown;
  updatePayload?: unknown;
};

type Scenario = {
  project: Record<string, unknown>;
  documentQueue: Array<Record<string, unknown> | null>;
  linkedLfaQueue: Array<Record<string, unknown> | null>;
  existingEntriesQueue: Array<unknown[]>;
  existingWbs: unknown[];
  seededActivitiesWbs: unknown[];
  existingBudget: unknown[];
  existingMeal: unknown[];
  existingSroi: unknown[];
};

function createScenario(overrides?: Partial<Scenario>): Scenario {
  return {
    project: {
      id: 'gw-project-1',
      organization_id: 'org-1',
      created_by: 'user-1',
      title: 'Pinned Proposal',
      summary: 'Summary',
      sector: 'Education',
      geography: 'Jakarta',
      duration_months: 12,
      budget_idr: 1000000000,
      donor_standard: 'UN_OECD_DAC',
      target_donor: null,
      status: 'draft',
      current_step: 7,
      wizard_data: {},
      created_at: '2026-07-21T00:00:00Z',
      updated_at: '2026-07-21T00:00:00Z',
    },
    documentQueue: [],
    linkedLfaQueue: [null, null],
    existingEntriesQueue: [[], []],
    existingWbs: [],
    seededActivitiesWbs: [],
    existingBudget: [],
    existingMeal: [],
    existingSroi: [],
    ...overrides,
  };
}

function installSupabaseScenario(scenario: Scenario) {
  mockSupabaseFrom.mockImplementation((table: string) => {
    const state: QueryState = { filters: [] };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((column: string, value: unknown) => {
        state.filters.push({ column, value });
        return query;
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(async () => {
        if (table === 'gw_projects') {
          return { data: scenario.project, error: null };
        }

        if (table === 'gw_lfa_documents') {
          return { data: scenario.documentQueue.shift() ?? null, error: null };
        }

        if (table === 'lfa_projects') {
          return { data: scenario.linkedLfaQueue.shift() ?? null, error: null };
        }

        if (table === 'lfa_sroi_config') {
          return { data: null, error: null };
        }

        return { data: null, error: null };
      }),
      single: vi.fn().mockImplementation(async () => {
        if (table === 'lfa_projects') {
          return { data: { id: 'lfa-project-1' }, error: null };
        }

        if (table === 'lfa_entries') {
          const inserted = state.insertPayload as Record<string, unknown>;
          return { data: { id: `entry-${writeCalls.length}`, ...inserted }, error: null };
        }

        return { data: null, error: null };
      }),
      insert: vi.fn().mockImplementation((payload: unknown) => {
        state.insertPayload = payload;
        writeCalls.push({ table, type: 'insert', payload, filters: [...state.filters] });
        return query;
      }),
      update: vi.fn().mockImplementation((payload: unknown) => {
        state.updatePayload = payload;
        writeCalls.push({ table, type: 'update', payload, filters: [...state.filters] });
        return query;
      }),
      delete: vi.fn().mockImplementation(() => {
        writeCalls.push({ table, type: 'delete', payload: null, filters: [...state.filters] });
        return query;
      }),
    };

    if (table === 'lfa_entries') {
      query.select.mockReturnValue(query);
      query.eq.mockImplementation((column: string, value: unknown) => {
        state.filters.push({ column, value });
        return query;
      });
      const nextEntries = scenario.existingEntriesQueue.shift() ?? [];
      query[Symbol.toStringTag] = 'Object';
      (query as Record<string, unknown>).then = undefined;
      query.order = vi.fn().mockResolvedValue({ data: nextEntries, error: null });
      query.select = vi.fn().mockReturnThis();
      const originalEq = query.eq;
      query.eq = vi.fn().mockImplementation((column: string, value: unknown) => {
        originalEq(column, value);
        return query;
      });
      (query as Record<string, unknown>).then = undefined;
      (query as { resolves?: () => Promise<{ data: unknown[]; error: null }> }).resolves = async () => ({ data: nextEntries, error: null });
    }

    if (table === 'lfa_entries' || table === 'lfa_wbs_items' || table === 'lfa_budget_items' || table === 'lfa_meal_items' || table === 'lfa_sroi_outcomes') {
      const dataForTable = () => {
        if (table === 'lfa_wbs_items') {
          const levelFilter = state.filters.find((filter) => filter.column === 'level')?.value;
          return levelFilter === 2 ? scenario.seededActivitiesWbs : scenario.existingWbs;
        }
        if (table === 'lfa_budget_items') return scenario.existingBudget;
        if (table === 'lfa_meal_items') return scenario.existingMeal;
        if (table === 'lfa_sroi_outcomes') return scenario.existingSroi;
        return scenario.existingEntriesQueue.shift() ?? [];
      };

      query.eq = vi.fn().mockImplementation((column: string, value: unknown) => {
        state.filters.push({ column, value });
        return query;
      });
      query.select = vi.fn().mockReturnThis();
      query.order = vi.fn().mockResolvedValue({ data: dataForTable(), error: null });
      (query as unknown as PromiseLike<{ data: unknown[]; error: null }>).then = undefined as never;
      (query as Record<string, unknown>).execute = async () => ({ data: dataForTable(), error: null });
    }

    return new Proxy(query, {
      get(target, prop, receiver) {
        if (prop === 'then') {
          if (table === 'lfa_entries' || table === 'lfa_wbs_items' || table === 'lfa_budget_items' || table === 'lfa_meal_items' || table === 'lfa_sroi_outcomes') {
            return (resolve: (value: { data: unknown[]; error: null }) => void) => {
              let data: unknown[] = [];
              if (table === 'lfa_entries') {
                data = scenario.existingEntriesQueue.shift() ?? [];
              } else if (table === 'lfa_wbs_items') {
                const levelFilter = state.filters.find((filter) => filter.column === 'level')?.value;
                data = levelFilter === 2 ? scenario.seededActivitiesWbs : scenario.existingWbs;
              } else if (table === 'lfa_budget_items') {
                data = scenario.existingBudget;
              } else if (table === 'lfa_meal_items') {
                data = scenario.existingMeal;
              } else if (table === 'lfa_sroi_outcomes') {
                data = scenario.existingSroi;
              }
              resolve({ data, error: null });
            };
          }

          return undefined;
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  });
}

function buildLegacyMatrix(goalLabel: string, purposeLabel: string) {
  return {
    goal: {
      intervention: goalLabel,
      indicators: [`${goalLabel} indicator`],
      meansOfVerification: [`${goalLabel} mov`],
      assumptions: [`${goalLabel} assumption`],
    },
    outcomes: [
      {
        intervention: purposeLabel,
        indicators: [`${purposeLabel} indicator`],
        meansOfVerification: [`${purposeLabel} mov`],
        assumptions: [`${purposeLabel} assumption`],
      },
    ],
    outputs: [],
    activities: [],
  };
}

beforeEach(() => {
  writeCalls.length = 0;
  toastMock.mockReset();
  mockSupabaseFrom.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GrantWriterProposal materialization source pinning', () => {
  test('renders the empty proposal state when no preview document is available', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [null],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Belum ada proposal/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /materialisasikan sekarang/i })).toBeNull();
    expect(writeCalls).toHaveLength(0);
  });

  test('uses the currently previewed document payload even when a newer document exists', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [
        {
          id: 'doc-v1',
          project_id: 'gw-project-1',
          organization_id: 'org-1',
          generated_by: 'user-1',
          version: 1,
          matrix: buildLegacyMatrix('Goal from preview v1', 'Purpose from preview v1'),
          proposal_markdown: '# Preview V1',
          model: 'gpt',
          donor_standard: 'UN_OECD_DAC',
          is_current: false,
          created_at: '2026-07-21T00:00:00Z',
        },
        {
          id: 'doc-v2',
          project_id: 'gw-project-1',
          organization_id: 'org-1',
          generated_by: 'user-1',
          version: 2,
          matrix: buildLegacyMatrix('Goal from newer v2', 'Purpose from newer v2'),
          proposal_markdown: '# Preview V2',
          model: 'gpt',
          donor_standard: 'UN_OECD_DAC',
          is_current: true,
          created_at: '2026-07-21T01:00:00Z',
        },
      ],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      const lfaEntryInserts = writeCalls.filter((call) => call.table === 'lfa_entries' && call.type === 'insert');
      expect(lfaEntryInserts.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 7000 });

    const lfaEntryPayloads = writeCalls
      .filter((call) => call.table === 'lfa_entries' && call.type === 'insert')
      .map((call) => call.payload as Record<string, unknown>);

    expect(lfaEntryPayloads.some((payload) => payload.description === 'Goal from preview v1')).toBe(true);
    expect(lfaEntryPayloads.some((payload) => payload.description === 'Goal from newer v2')).toBe(false);
  }, 10000);

  test('shows a deterministic error and prevents writes when the previewed document does not belong to the current project', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [
        {
          id: 'doc-invalid',
          project_id: 'gw-project-2',
          organization_id: 'org-1',
          generated_by: 'user-1',
          version: 1,
          matrix: buildLegacyMatrix('Wrong Goal', 'Wrong Purpose'),
          proposal_markdown: '# Invalid Preview',
          model: 'gpt',
          donor_standard: 'UN_OECD_DAC',
          is_current: true,
          created_at: '2026-07-21T00:00:00Z',
        },
      ],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Dokumen proposal yang sedang dipratinjau tidak cocok dengan proyek Grant Writer ini.',
        variant: 'destructive',
      }));
    });

    expect(writeCalls).toHaveLength(0);
  });

  test('shows a deterministic error and prevents writes when the previewed document does not belong to the current organization', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [
        {
          id: 'doc-invalid-org',
          project_id: 'gw-project-1',
          organization_id: 'org-2',
          generated_by: 'user-1',
          version: 1,
          matrix: buildLegacyMatrix('Wrong Goal', 'Wrong Purpose'),
          proposal_markdown: '# Invalid Preview',
          model: 'gpt',
          donor_standard: 'UN_OECD_DAC',
          is_current: true,
          created_at: '2026-07-21T00:00:00Z',
        },
      ],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Dokumen proposal yang sedang dipratinjau tidak cocok dengan organisasi proyek ini.',
        variant: 'destructive',
      }));
    });

    expect(writeCalls).toHaveLength(0);
  });
});