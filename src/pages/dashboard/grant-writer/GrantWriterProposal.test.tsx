import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import GrantWriterProposal from './GrantWriterProposal';

type RpcError = {
  message?: string;
  code?: string;
  name?: string;
};

type RpcResult = {
  code: string;
  status: string;
  materialization_id: string | null;
  source_document_id: string | null;
  source_document_version: number | null;
  source_gw_project_id: string | null;
  lfa_project_id: string | null;
  lfa_state: string | null;
  lfa_entries_created: number;
  wbs_items_created: number;
  budget_items_created: number;
  meal_items_created: number;
  sroi_outcomes_created: number;
  created_modules: string[];
  preserved_modules: string[];
  blocked_stage: string | null;
  failure_code: string | null;
  warnings: Array<{ code?: string; message?: string }>;
};

type Scenario = {
  project: Record<string, unknown> | null;
  document: Record<string, unknown> | null;
  existingLfa: Record<string, unknown> | null;
};

const { mockSupabaseFrom, rpcMock, toastMock, navigateMock, writeCalls } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
  rpcMock: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  writeCalls: [] as Array<{ table: string; type: 'insert' | 'update' | 'delete' }>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to?: string }) => <a href={to ?? '#'}>{children}</a>,
    useNavigate: () => navigateMock,
    useParams: () => ({ projectId: 'gw-project-1' }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom,
    rpc: rpcMock,
  },
}));

function createScenario(overrides?: Partial<Scenario>): Scenario {
  return {
    project: {
      id: 'gw-project-1',
      organization_id: 'org-1',
      title: 'Pinned Proposal',
      summary: 'Summary',
      geography: 'Jakarta',
      duration_months: 12,
      budget_idr: 1000000000,
      wizard_data: {},
      created_at: '2026-07-21T00:00:00Z',
      updated_at: '2026-07-21T00:00:00Z',
    },
    document: {
      id: 'doc-preview-1',
      project_id: 'gw-project-1',
      organization_id: 'org-1',
      version: 7,
      matrix: { ok: true },
      proposal_markdown: '# Preview V7',
      created_at: '2026-07-21T00:00:00Z',
    },
    existingLfa: null,
    ...overrides,
  };
}

function buildRpcResult(overrides?: Partial<RpcResult>): RpcResult {
  return {
    code: 'CREATED',
    status: 'success',
    materialization_id: 'mat-1',
    source_document_id: 'doc-preview-1',
    source_document_version: 7,
    source_gw_project_id: 'gw-project-1',
    lfa_project_id: 'lfa-project-1',
    lfa_state: 'EMPTY',
    lfa_entries_created: 4,
    wbs_items_created: 2,
    budget_items_created: 3,
    meal_items_created: 1,
    sroi_outcomes_created: 1,
    created_modules: ['program', 'lfa', 'wbs', 'budget', 'meal', 'sroi'],
    preserved_modules: [],
    blocked_stage: null,
    failure_code: null,
    warnings: [],
    ...overrides,
  };
}

function installSupabaseScenario(scenario: Scenario) {
  mockSupabaseFrom.mockImplementation((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (table === 'gw_projects') {
          return { data: scenario.project, error: null };
        }
        if (table === 'gw_lfa_documents') {
          return { data: scenario.document, error: null };
        }
        if (table === 'lfa_projects') {
          return { data: scenario.existingLfa, error: null };
        }
        return { data: null, error: null };
      }),
      insert: vi.fn(() => {
        writeCalls.push({ table, type: 'insert' });
        throw new Error(`Unexpected insert into ${table}`);
      }),
      update: vi.fn(() => {
        writeCalls.push({ table, type: 'update' });
        throw new Error(`Unexpected update into ${table}`);
      }),
      delete: vi.fn(() => {
        writeCalls.push({ table, type: 'delete' });
        throw new Error(`Unexpected delete from ${table}`);
      }),
    };

    return query;
  });
}

async function renderReady(scenario?: Partial<Scenario>) {
  installSupabaseScenario(createScenario(scenario));
  render(<GrantWriterProposal />);
  expect(await screen.findByText(/Versi 7/i)).toBeTruthy();
}

function expectNoTargetTableWrites() {
  expect(writeCalls).toEqual([]);
}

beforeEach(() => {
  mockSupabaseFrom.mockReset();
  rpcMock.mockReset();
  toastMock.mockReset();
  navigateMock.mockReset();
  writeCalls.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GrantWriterProposal transactional RPC cutover', () => {
  test('renders the empty proposal state when no preview document is available', async () => {
    installSupabaseScenario(createScenario({ document: null }));

    render(<GrantWriterProposal />);

    expect(await screen.findByText(/Belum ada proposal/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Materialisasikan Sekarang/i })).toBeNull();
    expectNoTargetTableWrites();
  });

  test('passes the pinned preview document id and version with null existing LFA id', async () => {
    rpcMock.mockResolvedValue({ data: buildRpcResult(), error: null });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });

    expect(rpcMock).toHaveBeenCalledWith('materialize_grantwriter_document', {
      p_source_document_id: 'doc-preview-1',
      p_expected_document_version: 7,
      p_existing_lfa_project_id: null,
    });
    expectNoTargetTableWrites();
  });

  test('passes the existing LFA project id when one is already linked', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({ code: 'PRESERVED_EXISTING', preserved_modules: ['wbs', 'budget'] }),
      error: null,
    });
    await renderReady({ existingLfa: { id: 'lfa-existing-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Buka atau Sinkronkan Ulang/i }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });

    expect(rpcMock).toHaveBeenCalledWith('materialize_grantwriter_document', {
      p_source_document_id: 'doc-preview-1',
      p_expected_document_version: 7,
      p_existing_lfa_project_id: 'lfa-existing-1',
    });
    expectNoTargetTableWrites();
  });

  test('calls the RPC exactly once and never performs target-table writes', async () => {
    rpcMock.mockResolvedValue({ data: buildRpcResult(), error: null });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/lfa-project-1?tab=lfa');
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expectNoTargetTableWrites();
  });

  test('handles CREATED with navigation, count summary, and sanitized warnings', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({
        warnings: [
          { message: 'Budget pricing requires review' },
          { code: 'MEAL_INDICATOR_SKIPPED' },
        ],
      }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/lfa-project-1?tab=lfa');
    });

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Materialisasi Berhasil',
      description: expect.stringContaining('Program berhasil dimaterialisasi secara transaksional.'),
    }));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('Budget pricing requires review'),
    }));
    expect(screen.getByText(/Peringatan materialisasi/i)).toBeTruthy();
    expectNoTargetTableWrites();
  });

  test.each([
    ['ALREADY_MATERIALIZED', 'Materialisasi Selesai', '/dashboard/lfa-builder/lfa-project-1?tab=lfa'],
    ['PRESERVED_EXISTING', 'Materialisasi Selesai', '/dashboard/lfa-builder/lfa-project-1?tab=lfa'],
  ])('navigates only for successful reusable results: %s', async (code, title, target) => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({ code, preserved_modules: code === 'PRESERVED_EXISTING' ? ['budget'] : [] }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(target);
    });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title }));
    expectNoTargetTableWrites();
  });

  test('does not navigate for MATERIALIZATION_IN_PROGRESS', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({
        code: 'MATERIALIZATION_IN_PROGRESS',
        status: 'running',
        lfa_project_id: null,
        created_modules: [],
      }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Sedang Diproses',
      }));
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expectNoTargetTableWrites();
  });

  test.each([
    ['BLOCKED_PARTIAL', 'blocked', 'struktur LFA yang sudah ada belum lengkap'],
    ['PREVIOUS_ATTEMPT_FAILED', 'failed', 'perlu ditinjau sebelum dicoba kembali'],
    ['PREVIOUS_ATTEMPT_BLOCKED', 'blocked', 'memerlukan peninjauan manual'],
    ['FAILED_VALIDATION', 'failed', 'Dokumen belum memenuhi syarat materialisasi'],
    ['FAILED_DATABASE', 'failed', 'Perubahan target dibatalkan'],
  ])('does not navigate for terminal non-success RPC result %s', async (code, status, descriptionPart) => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({
        code,
        status,
        lfa_project_id: null,
        created_modules: [],
        blocked_stage: code === 'PREVIOUS_ATTEMPT_BLOCKED' ? 'lfa' : null,
        failure_code: 'GW_STATE_MISMATCH',
      }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: expect.stringContaining(descriptionPart),
        variant: 'destructive',
      }));
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expectNoTargetTableWrites();
  });

  test('handles transport error without fallback writes', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Permintaan materialisasi tidak berhasil diproses. Tidak ada fallback penulisan data yang dijalankan.',
        variant: 'destructive',
      }));
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expectNoTargetTableWrites();
  });

  test('handles malformed RPC responses safely', async () => {
    rpcMock.mockResolvedValue({ data: { nope: true }, error: null });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Respons materialisasi tidak valid. Tidak ada fallback penulisan data yang dijalankan.',
        variant: 'destructive',
      }));
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expectNoTargetTableWrites();
  });

  test('handles unknown RPC codes safely', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({ code: 'SOMETHING_ELSE', status: 'success' }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Respons materialisasi tidak valid. Tidak ada fallback penulisan data yang dijalankan.',
        variant: 'destructive',
      }));
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expectNoTargetTableWrites();
  });

  test('blocks success results that are missing lfa_project_id', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({ lfa_project_id: null }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Materialisasi selesai tetapi referensi Program Workspace tidak tersedia. Navigasi dibatalkan dengan aman.',
        variant: 'destructive',
      }));
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expectNoTargetTableWrites();
  });

  test('prevents duplicate RPC calls while a request is pending', async () => {
    let resolveRpc: ((value: { data: RpcResult; error: RpcError | null }) => void) | undefined;
    rpcMock.mockImplementation(
      () => new Promise<{ data: RpcResult; error: RpcError | null }>((resolve) => {
        resolveRpc = resolve;
      }),
    );
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Memproses/i })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Memproses/i }));
    expect(rpcMock).toHaveBeenCalledTimes(1);

    resolveRpc?.({ data: buildRpcResult(), error: null });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/lfa-project-1?tab=lfa');
    });
    expectNoTargetTableWrites();
  });

  test('blocks the RPC when the previewed document belongs to another project', async () => {
    await renderReady({
      document: {
        id: 'doc-wrong-project',
        project_id: 'gw-project-2',
        organization_id: 'org-1',
        version: 7,
        matrix: { ok: true },
        proposal_markdown: '# Wrong Preview',
        created_at: '2026-07-21T00:00:00Z',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Materialisasi Gagal',
        description: 'Dokumen proposal yang sedang dipratinjau tidak cocok dengan proyek Grant Writer ini.',
        variant: 'destructive',
      }));
    });
    expect(rpcMock).not.toHaveBeenCalled();
    expectNoTargetTableWrites();
  });
});
