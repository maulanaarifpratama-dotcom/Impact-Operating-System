import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LFABuilderEditor from './LFABuilderEditor';

const { mockSupabaseFrom, mockBuildEditorCanonicalLfaView, createdQueries } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
  mockBuildEditorCanonicalLfaView: vi.fn(),
  createdQueries: [] as Array<{ table: string; query: Record<string, unknown> }>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to?: string }) => <a href={to || '#'}>{children}</a>,
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: 'editor-project' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()]
  };
});

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { full_name: 'Tester' }
  })
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom
  }
}));

vi.mock('@/lib/lfa/editorCanonicalBridge', () => ({
  buildEditorCanonicalLfaView: mockBuildEditorCanonicalLfaView
}));

vi.mock('@/lib/grant-writer/orgHelper', () => ({
  ensureDefaultOrg: vi.fn(async () => 'org-1')
}));

afterEach(() => {
  vi.clearAllMocks();
  createdQueries.length = 0;
});

beforeEach(() => {
  mockBuildEditorCanonicalLfaView.mockImplementation(() => ({
    rawProject: {
      id: 'editor-project',
      org_id: 'org-1',
      name: 'Editor Project',
      linked_grant_id: null,
      duration_months: 12,
      sector: 'Education',
      location: 'Jakarta'
    },
    allRawEntries: [],
    goal: null,
    purpose: null,
    outcomes: [],
    outputs: [],
    activities: [],
    unusedOutcomes: [],
    unassignedOutputs: [],
    orphanedActivities: [],
    presentationMode: 'COMPACT_CONFIRMED',
    structuralStatus: 'COMPLETE',
    measurementStatus: 'LEGACY_TEXT_PRESENT',
    findings: [],
    reviewQueue: [],
    dispositionMap: {},
    hasBlockingIntegrityFinding: false
  }));

  const project = {
    id: 'editor-project',
    org_id: 'org-1',
    name: 'Editor Project',
    linked_grant_id: null,
    duration_months: 12,
    sector: 'Education',
    location: 'Jakarta'
  };

  const entries = [
    { id: 'goal-1', project_id: 'editor-project', org_id: 'org-1', level: 'goal', description: 'Goal', indicator: '10%', means_of_verification: 'Report', assumption: 'Stable' },
    { id: 'purpose-1', project_id: 'editor-project', org_id: 'org-1', level: 'purpose', sequence: 1, description: 'Purpose', indicator: '20%', means_of_verification: 'Survey', assumption: 'Support' },
    { id: 'output-1', project_id: 'editor-project', org_id: 'org-1', level: 'output', sequence: 1, parent_id: 'purpose-1', description: 'Output', indicator: '1', means_of_verification: 'Log', assumption: 'Funds' },
    { id: 'activity-1', project_id: 'editor-project', org_id: 'org-1', level: 'activity', sequence: 1, parent_id: 'output-1', description: 'Activity', indicator: '1', means_of_verification: 'Attendance', assumption: 'PIC', responsible_party: 'Team' }
  ];

  mockSupabaseFrom.mockImplementation((table: string) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: table === 'lfa_entries' ? entries : project, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: table === 'lfa_projects' ? project : null, error: null }),
      single: vi.fn().mockResolvedValue({ data: table === 'lfa_entries' ? entries[0] : project, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    };
    createdQueries.push({ table, query });
    return query;
  });
});

describe('LFABuilderEditor canonical diagnostics consumer', () => {
  test('renders canonical status and counts alongside legacy validation', async () => {
    render(<LFABuilderEditor />);

    expect(await screen.findByText(/Logic Validation & Integrity/i)).toBeTruthy();
    expect(screen.getByText(/Presentation: COMPACT_CONFIRMED/i)).toBeTruthy();
    expect(screen.getByText(/Structural: COMPLETE/i)).toBeTruthy();
    expect(screen.getByText(/Measurement: LEGACY_TEXT_PRESENT/i)).toBeTruthy();
    expect(screen.getByText(/Findings: /i)).toBeTruthy();
    expect(screen.getByText(/Reviews: /i)).toBeTruthy();
    expect(screen.getByText(/Blocking: /i)).toBeTruthy();
    expect(screen.getByText(/Logika vertikal terbentuk/i)).toBeTruthy();
  });

  test('keeps the editor shell rendered when canonical derivation throws during mapping', async () => {
    mockBuildEditorCanonicalLfaView.mockImplementation(() => {
      throw new Error('canonical-bridge-failure');
    });

    render(<LFABuilderEditor />);

    expect(await screen.findByTestId('lfa-editor-root')).toBeTruthy();
    expect(await screen.findByText(/Diagnostik canonical tidak tersedia: canonical-bridge-failure/i)).toBeTruthy();
    expect(screen.getByText(/Logic Validation & Integrity/i)).toBeTruthy();
    expect(screen.queryByText(/Gagal memuat logframe/i)).toBeNull();

    const writeCalls = createdQueries.flatMap(({ query }) => {
      const methods = [query.insert, query.update, query.delete] as Array<{ mock: { calls: unknown[][] } }>;
      return methods.flatMap((method) => method.mock.calls);
    });
    expect(writeCalls).toHaveLength(0);
  });

  test('calculates 100% progress when all required fields are filled', async () => {
    render(<LFABuilderEditor />);
    expect(await screen.findByText('100%')).toBeTruthy();
  });
});