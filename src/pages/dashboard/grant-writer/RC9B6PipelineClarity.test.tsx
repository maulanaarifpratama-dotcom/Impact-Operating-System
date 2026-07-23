import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GrantWriterQuickWizard from './GrantWriterQuickWizard';
import LFABuilderIndex from '../lfa-builder/LFABuilderIndex';
import LFABuilderEditor from '../lfa-builder/LFABuilderEditor';
import { PROVISIONAL_FIXTURES, adaptProvisionalResponse } from '@/lib/grant-writer/provisionalAdapter';

const { mockSupabaseFrom, mockSupabaseInvoke, toastMock, navigateMock } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
  mockSupabaseInvoke: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
}));

let currentSearch = '';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to?: string }) => <a href={to ?? '#'}>{children}</a>,
    useNavigate: () => navigateMock,
    useParams: () => ({ projectId: 'lfa-proj-1' }),
    useSearchParams: () => [new URLSearchParams(currentSearch), vi.fn()],
    useLocation: () => ({ search: currentSearch, state: { fromQuickProposal: currentSearch.includes('from=quick_proposal') } }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { full_name: 'Tester' }
  })
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom,
    functions: {
      invoke: mockSupabaseInvoke,
    },
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
  },
});

function installSupabaseScenario(projectOverrides?: Record<string, unknown>) {
  mockSupabaseFrom.mockImplementation((table: string) => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      limit: vi.fn(() => query),
      order: vi.fn(() => {
        const orderChain = {
          then: vi.fn((resolve: any) => resolve({ data: [], error: null }))
        };
        return orderChain;
      }),
      maybeSingle: vi.fn(async () => {
        if (table === 'gw_projects') {
          return {
            data: {
              id: 'gw-project-1',
              organization_id: 'org-123',
              title: 'Pertanian Lestari',
              geography: 'Gunungkidul',
              duration_months: 6,
              budget_idr: 50000000,
              wizard_data: null,
              ...projectOverrides,
            },
            error: null,
          };
        }
        if (table === 'organizations') {
          return {
            data: {
              id: 'org-123',
              name: 'Yayasan Tani Hijau',
              description: 'Organisasi nirlaba pemberdayaan petani',
              website: 'https://tanihijau.or.id',
            },
            error: null,
          };
        }
        if (table === 'lfa_projects') {
          return {
            data: {
              id: 'lfa-proj-1',
              org_id: 'org-123',
              name: 'LFA Program Tani',
              sector: 'Pertanian',
              duration_months: 6,
              location: 'Gunungkidul',
              linked_grant_id: 'gw-project-1',
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null }))
      })),
      upsert: vi.fn(async () => ({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null }))
      })),
      insert: vi.fn(() => {
        const insertChain: any = {
          select: vi.fn(() => insertChain),
          single: vi.fn(async () => ({ data: { id: 'entry-1', level: 'goal' }, error: null })),
          then: vi.fn((resolve: any) => resolve({ data: [{ id: 'entry-1' }], error: null })),
        };
        return insertChain;
      }),
    };
    return query;
  });
}

describe('RC-9B.6 — Program Pipeline Clarity Test Suite', () => {
  beforeEach(() => {
    mockSupabaseFrom.mockReset();
    mockSupabaseInvoke.mockReset();
    toastMock.mockReset();
    navigateMock.mockReset();
    currentSearch = '';
  });

  test('TASK 1 & TASK 2 — Page 2 Review renders Program Development Pipeline card and Blueprint Status card', async () => {
    installSupabaseScenario({
      wizard_data: {
        currentFlowPage: 'page2',
        selectedFixtureId: 'FIX-DEV-HC-1',
        domainResponse: adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-HC-1']),
        acceptedSectors: ['SEC-ECON'],
        acceptedInterventions: [],
        acceptedSdgs: [1],
        acceptedActorRoles: [],
        blueprintEdits: {},
        ambiguityResolutions: {},
        missingInfoResolutions: {},
      }
    });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('program-pipeline-card')).toBeTruthy();
      expect(screen.getByTestId('blueprint-status-card')).toBeTruthy();
    });

    // Verify Pipeline stages content
    expect(screen.getByText('Program Development Pipeline')).toBeTruthy();
    expect(screen.getByText('Program Blueprint')).toBeTruthy();
    expect(screen.getByText('LFA Matrix')).toBeTruthy();
    expect(screen.getByText('WBS')).toBeTruthy();
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('MEAL')).toBeTruthy();
    expect(screen.getByText('Evaluation')).toBeTruthy();
    expect(screen.getByText('SROI')).toBeTruthy();

    // Verify Status card content
    expect(screen.getByText('Blueprint Status')).toBeTruthy();
  });

  test('TASK 3 — Approval CTA displays updated copy', async () => {
    installSupabaseScenario({
      wizard_data: {
        currentFlowPage: 'page2',
        selectedFixtureId: 'FIX-DEV-HC-1',
        domainResponse: adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-HC-1']),
        acceptedSectors: ['SEC-ECON'],
        acceptedInterventions: [],
        acceptedSdgs: [1],
        acceptedActorRoles: [],
        blueprintEdits: {},
        ambiguityResolutions: {},
        missingInfoResolutions: {},
      }
    });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint dan Lanjut ke Tahap LFA/i });
      expect(approveBtn).toBeTruthy();
    });
  });

  test('TASK 4 — Approved flow state renders post-approval transition confirmation UI', async () => {
    installSupabaseScenario({
      wizard_data: {
        currentFlowPage: 'approved',
        selectedFixtureId: 'FIX-DEV-HC-1',
        domainResponse: adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-HC-1']),
        approvedAt: new Date().toISOString(),
        acceptedSectors: ['SEC-ECON'],
        acceptedInterventions: [],
        acceptedSdgs: [1],
        approvedSnapshot: {
          contractVersion: '1.2',
          approvalTimestamp: new Date().toISOString(),
          acceptedSdgs: [1],
          acceptedSectors: ['SEC-ECON'],
        }
      }
    });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('transition-confirmation-card')).toBeTruthy();
    });

    expect(screen.getByText('Blueprint Program Disetujui!')).toBeTruthy();
    expect(screen.getByText(/Generate dan susun Logical Framework Matrix/i)).toBeTruthy();
  });

  test('TASK 5 — LFA Builder Index displays entry information banner when entering from Quick Proposal', async () => {
    currentSearch = '?from=quick_proposal';
    installSupabaseScenario();

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <LFABuilderIndex />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('lfa-entry-banner')).toBeTruthy();
    });

    expect(screen.getByText('Program Blueprint telah disetujui.')).toBeTruthy();
    expect(screen.getByText('Penyusunan LFA Matrix')).toBeTruthy();
    expect(screen.getByText('Tahap 2: LFA Matrix')).toBeTruthy();
  });

  test('TASK 5 — LFA Builder Editor displays entry information banner when entering from Quick Proposal', async () => {
    currentSearch = '?from=quick_proposal';
    installSupabaseScenario();

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <LFABuilderEditor />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('lfa-entry-banner')).toBeTruthy();
    });

    expect(screen.getByText('Program Blueprint telah disetujui.')).toBeTruthy();
    expect(screen.getByText('Penyusunan LFA Matrix')).toBeTruthy();
    expect(screen.getByText('Tahap 2: LFA Matrix')).toBeTruthy();
  });
});
