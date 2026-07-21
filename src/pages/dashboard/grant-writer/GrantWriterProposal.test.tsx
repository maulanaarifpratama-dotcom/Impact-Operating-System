import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import GrantWriterProposal from './GrantWriterProposal';

const { mockSupabaseFrom, toastMock, writeCalls, selectCalls } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
  toastMock: vi.fn(),
  writeCalls: [] as Array<{
    table: string;
    type: 'insert' | 'update' | 'delete';
    payload: unknown;
    filters: Array<{ column: string; value: unknown }>;
  }>,
  selectCalls: [] as Array<{
    table: string;
    columns: unknown;
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
      select: vi.fn().mockImplementation((columns?: unknown) => {
        selectCalls.push({ table, columns, filters: [...state.filters] });
        return proxiedQuery ?? query;
      }),
      eq: vi.fn().mockImplementation((column: string, value: unknown) => {
        state.filters.push({ column, value });
        return proxiedQuery ?? query;
      }),
      order: vi.fn().mockImplementation(() => proxiedQuery ?? query),
      limit: vi.fn().mockImplementation(() => proxiedQuery ?? query),
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
        return proxiedQuery ?? query;
      }),
      update: vi.fn().mockImplementation((payload: unknown) => {
        state.updatePayload = payload;
        writeCalls.push({ table, type: 'update', payload, filters: [...state.filters] });
        return proxiedQuery ?? query;
      }),
      delete: vi.fn().mockImplementation(() => {
        writeCalls.push({ table, type: 'delete', payload: null, filters: [...state.filters] });
        return proxiedQuery ?? query;
      }),
    };

    if (table === 'lfa_entries') {
      query.select.mockReturnValue(query);
      query.eq.mockImplementation((column: string, value: unknown) => {
        state.filters.push({ column, value });
        return proxiedQuery ?? query;
      });
      const nextEntries = scenario.existingEntriesQueue.shift() ?? [];
      query[Symbol.toStringTag] = 'Object';
      (query as Record<string, unknown>).then = undefined;
      query.order = vi.fn().mockResolvedValue({ data: nextEntries, error: null });
      query.select = vi.fn().mockReturnThis();
      const originalEq = query.eq;
      query.eq = vi.fn().mockImplementation((column: string, value: unknown) => {
        originalEq(column, value);
        return proxiedQuery ?? query;
      });
      (query as Record<string, unknown>).then = undefined;
      (query as { resolves?: () => Promise<{ data: unknown[]; error: null }> }).resolves = async () => ({ data: nextEntries, error: null });
    }

    if (table === 'lfa_entries' || table === 'lfa_wbs_items' || table === 'lfa_budget_items' || table === 'lfa_meal_items' || table === 'lfa_sroi_outcomes') {
      const dataForTable = () => {
        if (table === 'lfa_wbs_items' && Array.isArray(state.insertPayload)) {
          return state.insertPayload as unknown[];
        }

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
        return proxiedQuery ?? query;
      });
      query.select = vi.fn().mockImplementation((columns?: unknown) => {
        selectCalls.push({ table, columns, filters: [...state.filters] });
        return proxiedQuery ?? query;
      });
      query.order = vi.fn().mockResolvedValue({ data: dataForTable(), error: null });
      (query as unknown as PromiseLike<{ data: unknown[]; error: null }>).then = undefined as never;
      (query as Record<string, unknown>).execute = async () => ({ data: dataForTable(), error: null });
    }

    const proxiedQuery = new Proxy(query, {
      get(target, prop, receiver) {
        if (prop === 'then') {
          if (table === 'lfa_entries' || table === 'lfa_wbs_items' || table === 'lfa_budget_items' || table === 'lfa_meal_items' || table === 'lfa_sroi_outcomes') {
            return (resolve: (value: { data: unknown[]; error: null }) => void) => {
              let data: unknown[] = [];
              if (table === 'lfa_entries') {
                data = scenario.existingEntriesQueue.shift() ?? [];
              } else if (table === 'lfa_wbs_items') {
                if (Array.isArray(state.insertPayload)) {
                  data = state.insertPayload as unknown[];
                } else {
                  const levelFilter = state.filters.find((filter) => filter.column === 'level')?.value;
                  data = levelFilter === 2 ? scenario.seededActivitiesWbs : scenario.existingWbs;
                }
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

    return proxiedQuery;
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

function buildProgramSkeletonMatrix(overrides?: {
  tasks?: Array<Record<string, unknown>>;
  budgetHints?: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  return {
    program_skeleton: {
      meta: {
        projectTitle: 'Pinned Proposal',
        geography: 'Jakarta',
        budgetIdr: 1000000000,
        durationMonths: 12,
      },
      lfa: {
        goal: {
          statement: 'Goal statement',
          indicators: [
            {
              id: 'goal-ind-1',
              statement: 'Goal indicator',
              mov: 'Goal MOV',
            },
          ],
          assumptions: ['Goal assumption'],
        },
        purpose: {
          id: 'outcome-1',
          statement: 'Purpose statement',
          indicators: [
            {
              id: 'purp-ind-1',
              statement: 'Purpose indicator',
              mov: 'Purpose MOV',
            },
          ],
          assumptions: ['Purpose assumption'],
        },
        outcomes: [
          {
            id: 'outcome-1',
            statement: 'Purpose statement',
            indicators: [
              {
                id: 'purp-ind-1',
                statement: 'Purpose indicator',
                mov: 'Purpose MOV',
              },
            ],
            assumptions: ['Purpose assumption'],
          },
        ],
        outputs: [
          {
            id: 'output-1',
            outcomeId: 'outcome-1',
            statement: 'Output statement',
            indicators: [
              {
                id: 'out-ind-1',
                statement: 'Output indicator',
                mov: 'Output MOV',
              },
            ],
            assumptions: ['Output assumption'],
          },
        ],
      },
      wbs: {
        tasks: overrides?.tasks ?? [
          {
            id: 'task-output-1',
            level: 1,
            title: 'Task output 1',
            startMonth: 1,
            durationWeeks: 4,
            responsibleRole: 'Manager',
            dependencies: [],
          },
          {
            id: 'task-activity-1',
            level: 2,
            parentId: 'task-output-1',
            sourceActivityId: 'output-1',
            title: 'Task activity 1',
            startMonth: 1,
            durationWeeks: 2,
            responsibleRole: 'Officer',
            deliverable: 'Deliverable 1',
            dependencies: ['task-output-1'],
          },
        ],
      },
      budget_hints: {
        items: overrides?.budgetHints ?? [
          {
            itemName: 'Budget line 1',
            description: 'Budget description',
            itemType: 'Item type',
            quantity: 2,
            unit: 'Orang',
            unit_price_idr: 100000,
            category: 'personnel',
            taskId: 'task-output-1',
            justification: 'Need this',
            requiresUserConfirmation: false,
          },
        ],
      },
      meal: {
        indicators: [
          {
            name: 'MEAL indicator 1',
            sourceLfaIndicatorId: 'out-ind-1',
            baselineValue: 0,
            targetValue: 10,
            unit: 'orang',
            collectionMethod: 'Survei',
            dataSource: 'Kuesioner',
            frequency: 'monthly',
            responsibleRole: 'M&E',
            verificationMethod: 'Dokumen',
            formula: 'n/a',
            disaggregation: [],
          },
        ],
      },
      sroi: {
        models: [
          {
            outcomeStatement: 'SROI outcome',
            sourceOutcomeId: 'outcome-1',
            requiresValidation: true,
            quantityHint: 1,
            suggestedProxyValueIdr: 1000000,
            suggestedProxyDescription: 'Proxy',
            rationale: 'Rationale',
            financialProxyType: 'income',
            durationYears: 1,
            attributionPctDraft: 80,
            deadweightPctDraft: 20,
            displacementPctDraft: 0,
            dropoffPctDraft: 0,
          },
        ],
      },
      risks: [],
    },
  };
}

function buildDocument(matrix: Record<string, unknown>, overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'doc-v1',
    project_id: 'gw-project-1',
    organization_id: 'org-1',
    generated_by: 'user-1',
    version: 1,
    matrix,
    proposal_markdown: '# Preview V1',
    model: 'gpt',
    donor_standard: 'UN_OECD_DAC',
    is_current: true,
    created_at: '2026-07-21T00:00:00Z',
    ...overrides,
  };
}

function buildExistingLfaRows(options?: { withActivity?: boolean }) {
  const withActivity = options?.withActivity ?? true;
  const rows: Array<Record<string, unknown>> = [
    {
      id: 'existing-goal-1',
      project_id: 'lfa-project-1',
      level: 'goal',
      parent_id: null,
      sequence: 1,
    },
    {
      id: 'existing-purpose-1',
      project_id: 'lfa-project-1',
      level: 'purpose',
      parent_id: null,
      sequence: 1,
    },
    {
      id: 'existing-output-1',
      project_id: 'lfa-project-1',
      level: 'output',
      parent_id: 'existing-purpose-1',
      sequence: 1,
    },
  ];

  if (withActivity) {
    rows.push({
      id: 'existing-activity-1',
      project_id: 'lfa-project-1',
      level: 'activity',
      parent_id: 'existing-output-1',
      sequence: 1,
    });
  }

  return rows;
}

function repeatedExistingEntriesQueue(rows: Array<Record<string, unknown>>, repeats = 6) {
  return Array.from({ length: repeats }, () => rows.map((row) => ({ ...row })));
}

beforeEach(() => {
  writeCalls.length = 0;
  selectCalls.length = 0;
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

  test('persists source_task_id on first materialization and links budget rows to inserted WBS IDs', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      const budgetInsert = writeCalls.find((call) => call.table === 'lfa_budget_items' && call.type === 'insert');
      expect(budgetInsert).toBeTruthy();
    }, { timeout: 12000 });

    const wbsInsert = writeCalls.find((call) => call.table === 'lfa_wbs_items' && call.type === 'insert');
    expect(wbsInsert).toBeTruthy();
    const wbsPayload = (wbsInsert?.payload ?? []) as Array<Record<string, unknown>>;
    expect(wbsPayload.some((row) => row.source_task_id === 'task-output-1')).toBe(true);

    const identitySelectCalls = selectCalls.filter((call) =>
      call.table === 'lfa_wbs_items' && call.columns === 'id,lfa_project_id,source_task_id'
    );
    expect(identitySelectCalls.length).toBeGreaterThanOrEqual(2);

    const insertedOutputTaskWbsId = wbsPayload.find((row) => row.source_task_id === 'task-output-1')?.id;
    expect(typeof insertedOutputTaskWbsId).toBe('string');

    const budgetInsert = writeCalls.find((call) => call.table === 'lfa_budget_items' && call.type === 'insert');
    const budgetPayload = (budgetInsert?.payload ?? []) as Array<Record<string, unknown>>;
    expect(budgetPayload[0]?.wbs_item_id).toBe(insertedOutputTaskWbsId);
  }, 15000);

  test('hydrates source_task_id mapping from existing WBS rows on retry and does not reseed WBS', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingWbs: [
        {
          id: 'persisted-wbs-1',
          lfa_project_id: 'lfa-project-1',
          source_task_id: 'task-output-1',
        },
      ],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      const budgetInsert = writeCalls.find((call) => call.table === 'lfa_budget_items' && call.type === 'insert');
      expect(budgetInsert).toBeTruthy();
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'update')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'delete')).toBe(false);

    const budgetInsert = writeCalls.find((call) => call.table === 'lfa_budget_items' && call.type === 'insert');
    const budgetPayload = (budgetInsert?.payload ?? []) as Array<Record<string, unknown>>;
    expect(budgetPayload[0]?.wbs_item_id).toBe('persisted-wbs-1');
  }, 15000);

  test('fails deterministically when existing WBS rows have null source_task_id and budget requires linkage', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingWbs: [
        {
          id: 'historical-null-1',
          lfa_project_id: 'lfa-project-1',
          source_task_id: null,
        },
      ],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Materialisasi anggaran gagal karena tautan task anggaran ke WBS tidak dapat dipetakan secara deterministik.',
        variant: 'destructive',
      }));
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_budget_items' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'update')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'delete')).toBe(false);
  }, 15000);

  test('ignores cross-project WBS identities and fails before budget insert when linkage stays unresolved', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingWbs: [
        {
          id: 'cross-project-wbs-1',
          lfa_project_id: 'lfa-project-other',
          source_task_id: 'task-output-1',
        },
      ],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Materialisasi anggaran gagal karena tautan task anggaran ke WBS tidak dapat dipetakan secara deterministik.',
        variant: 'destructive',
      }));
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_budget_items' && call.type === 'insert')).toBe(false);
  }, 15000);

  test('fails before WBS and budget writes when a skeleton WBS task has a missing ID', async () => {
    const matrixWithMissingTaskId = buildProgramSkeletonMatrix({
      tasks: [
        {
          id: '   ',
          level: 1,
          title: 'Task output 1',
          startMonth: 1,
          durationWeeks: 4,
          responsibleRole: 'Manager',
          dependencies: [],
        },
      ],
      budgetHints: [
        {
          itemName: 'Budget line 1',
          description: 'Budget description',
          itemType: 'Item type',
          quantity: 2,
          unit: 'Orang',
          unit_price_idr: 100000,
          category: 'personnel',
          taskId: 'task-output-1',
          justification: 'Need this',
          requiresUserConfirmation: false,
        },
      ],
    });

    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(matrixWithMissingTaskId)],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: expect.stringContaining('SKELETON VALIDATION FAILED'),
        variant: 'destructive',
      }));
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_budget_items' && call.type === 'insert')).toBe(false);
  }, 15000);

  test('seeds LFA once for an empty project and continues to WBS materialization', async () => {
    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingEntriesQueue: [[]],
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      const wbsInsert = writeCalls.find((call) => call.table === 'lfa_wbs_items' && call.type === 'insert');
      expect(wbsInsert).toBeTruthy();
    }, { timeout: 12000 });

    const lfaInsertPayloads = writeCalls
      .filter((call) => call.table === 'lfa_entries' && call.type === 'insert')
      .map((call) => call.payload as Record<string, unknown>);
    const levelCounts = lfaInsertPayloads.reduce<Record<string, number>>((acc, payload) => {
      const level = String(payload.level);
      acc[level] = (acc[level] ?? 0) + 1;
      return acc;
    }, {});

    expect(levelCounts.goal ?? 0).toBe(1);
    expect(levelCounts.purpose ?? 0).toBe(1);
    expect(levelCounts.output ?? 0).toBe(1);
    expect(levelCounts.activity ?? 0).toBe(1);
  }, 15000);

  test('blocks materialization on partial goal and purpose state before any dependent writes', async () => {
    const existingGoalPurposeRows = [
      {
        id: 'existing-goal-1',
        project_id: 'lfa-project-1',
        level: 'goal',
        parent_id: null,
        sequence: 1,
      },
      {
        id: 'existing-purpose-1',
        project_id: 'lfa-project-1',
        level: 'purpose',
        parent_id: null,
        sequence: 1,
      },
    ];

    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingEntriesQueue: repeatedExistingEntriesQueue(existingGoalPurposeRows),
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: expect.stringContaining('data LFA yang sudah ada terdeteksi parsial atau tidak konsisten'),
        variant: 'destructive',
      }));
      expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'insert')).toBe(false);
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'insert')).toBe(false);

    const hasSuccessToast = toastMock.mock.calls.some(([args]) =>
      typeof args?.title === 'string' && args.title.includes('Materialisasi Berhasil')
    );
    expect(hasSuccessToast).toBe(false);
  }, 15000);

  test('blocks materialization on goal-only state', async () => {
    const existingGoalOnlyRows = [
      {
        id: 'existing-goal-1',
        project_id: 'lfa-project-1',
        level: 'goal',
        parent_id: null,
        sequence: 1,
      },
    ];

    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingEntriesQueue: repeatedExistingEntriesQueue(existingGoalOnlyRows),
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: expect.stringContaining('data LFA yang sudah ada terdeteksi parsial atau tidak konsisten'),
        variant: 'destructive',
      }));
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_budget_items' && call.type === 'insert')).toBe(false);
  }, 15000);

  test('blocks materialization on orphan output hierarchy', async () => {
    const orphanOutputRows = [
      {
        id: 'existing-goal-1',
        project_id: 'lfa-project-1',
        level: 'goal',
        parent_id: null,
        sequence: 1,
      },
      {
        id: 'existing-purpose-1',
        project_id: 'lfa-project-1',
        level: 'purpose',
        parent_id: null,
        sequence: 1,
      },
      {
        id: 'existing-output-1',
        project_id: 'lfa-project-1',
        level: 'output',
        parent_id: 'missing-purpose',
        sequence: 1,
      },
    ];

    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingEntriesQueue: repeatedExistingEntriesQueue(orphanOutputRows),
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: expect.stringContaining('data LFA yang sudah ada terdeteksi parsial atau tidak konsisten'),
        variant: 'destructive',
      }));
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_budget_items' && call.type === 'insert')).toBe(false);
  }, 15000);

  test('blocks materialization on orphan activity hierarchy', async () => {
    const orphanActivityRows = [
      {
        id: 'existing-goal-1',
        project_id: 'lfa-project-1',
        level: 'goal',
        parent_id: null,
        sequence: 1,
      },
      {
        id: 'existing-purpose-1',
        project_id: 'lfa-project-1',
        level: 'purpose',
        parent_id: null,
        sequence: 1,
      },
      {
        id: 'existing-output-1',
        project_id: 'lfa-project-1',
        level: 'output',
        parent_id: 'existing-purpose-1',
        sequence: 1,
      },
      {
        id: 'existing-activity-1',
        project_id: 'lfa-project-1',
        level: 'activity',
        parent_id: 'missing-output',
        sequence: 1,
      },
    ];

    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingEntriesQueue: repeatedExistingEntriesQueue(orphanActivityRows),
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: expect.stringContaining('data LFA yang sudah ada terdeteksi parsial atau tidak konsisten'),
        variant: 'destructive',
      }));
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_wbs_items' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_budget_items' && call.type === 'insert')).toBe(false);
  }, 15000);

  test('preserves existing safe hierarchy and skips LFA reseeding', async () => {
    const existingSafeRows = buildExistingLfaRows();

    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingEntriesQueue: repeatedExistingEntriesQueue(existingSafeRows),
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      const wbsInsert = writeCalls.find((call) => call.table === 'lfa_wbs_items' && call.type === 'insert');
      expect(wbsInsert).toBeTruthy();
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'update')).toBe(false);
    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'delete')).toBe(false);

    expect(await screen.findByText(/LFA sudah ada dan dipertahankan/i)).toBeTruthy();
  }, 15000);

  test('preserves existing safe hierarchy without activity and does not auto-repair LFA', async () => {
    const existingSafeWithoutActivityRows = buildExistingLfaRows({ withActivity: false });

    installSupabaseScenario(createScenario({
      documentQueue: [buildDocument(buildProgramSkeletonMatrix())],
      existingEntriesQueue: repeatedExistingEntriesQueue(existingSafeWithoutActivityRows),
    }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Versi 1/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /materialisasikan sekarang/i }));

    await waitFor(() => {
      const wbsInsert = writeCalls.find((call) => call.table === 'lfa_wbs_items' && call.type === 'insert');
      expect(wbsInsert).toBeTruthy();
    }, { timeout: 12000 });

    expect(writeCalls.some((call) => call.table === 'lfa_entries' && call.type === 'insert')).toBe(false);
    expect(writeCalls.some((call) => {
      if (call.table !== 'lfa_entries' || call.type !== 'update') {
        return false;
      }

      const payload = call.payload as Record<string, unknown>;
      return payload.level === 'activity';
    })).toBe(false);
  }, 15000);
});