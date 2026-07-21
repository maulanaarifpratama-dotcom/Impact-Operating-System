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
  warnings: Array<{ code?: string; message?: string; source_lfa_indicator_id?: string; fields?: string[] }>;
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

function expectAnyText(pattern: RegExp) {
  expect(screen.queryAllByText(pattern).length).toBeGreaterThan(0);
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

  test('first-time materialization calls RPC directly with pinned source and null target id', async () => {
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
    expect(screen.queryByText(/Sinkronkan ke Program Workspace yang sudah ada\?/i)).toBeNull();
    expectNoTargetTableWrites();
  });

  test('existing target opens confirmation and does not call RPC before confirm', async () => {
    rpcMock.mockResolvedValue({ data: buildRpcResult({ code: 'PRESERVED_EXISTING' }), error: null });
    await renderReady({ existingLfa: { id: 'lfa-existing-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Buka atau Sinkronkan Ulang/i }));

    expectAnyText(/Sinkronkan ke Program Workspace yang sudah ada\?/i);
    expectAnyText(/modul yang sudah berisi data/i);
    expectAnyText(/Perubahan manual pada LFA, WBS, Anggaran, MEAL, dan SROI tidak akan diganti secara otomatis\./i);
    expectAnyText(/Sumber:/i);
    expectAnyText(/Proposal Versi 7/i);
    expectAnyText(/Target:/i);
    expectAnyText(/Program Workspace yang sudah terhubung/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test('cancel confirmation closes dialog and keeps RPC uncalled', async () => {
    rpcMock.mockResolvedValue({ data: buildRpcResult({ code: 'PRESERVED_EXISTING' }), error: null });
    await renderReady({ existingLfa: { id: 'lfa-existing-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Buka atau Sinkronkan Ulang/i }));
    fireEvent.click(screen.getByRole('button', { name: /Batal/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Sinkronkan ke Program Workspace yang sudah ada\?/i)).toBeNull();
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test('confirm calls RPC exactly once with pinned source and exact linked target id', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({ code: 'PRESERVED_EXISTING', preserved_modules: ['wbs', 'budget'] }),
      error: null,
    });
    await renderReady({ existingLfa: { id: 'lfa-existing-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Buka atau Sinkronkan Ulang/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lanjutkan Sinkronisasi/i }));

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

  test('manual-edit protection copy is visible before action', async () => {
    await renderReady();
    expectAnyText(/Perlindungan edit manual/i);
    expectAnyText(/existing yang aman akan/i);
    expectAnyText(/bagian kosong dapat/i);
    expectAnyText(/dilewati untuk ditinjau/i);
    expectAnyText(/struktur parsial dapat/i);
  });

  test('rapid confirm while pending does not double-call RPC', async () => {
    let resolveRpc: ((value: { data: RpcResult; error: RpcError | null }) => void) | undefined;
    rpcMock.mockImplementation(
      () => new Promise<{ data: RpcResult; error: RpcError | null }>((resolve) => {
        resolveRpc = resolve;
      }),
    );
    await renderReady({ existingLfa: { id: 'lfa-existing-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Buka atau Sinkronkan Ulang/i }));
    const confirmButton = screen.getByRole('button', { name: /Lanjutkan Sinkronisasi/i });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(rpcMock).toHaveBeenCalledTimes(1);

    resolveRpc?.({ data: buildRpcResult({ code: 'PRESERVED_EXISTING' }), error: null });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/lfa-project-1?tab=lfa');
    });
    expectNoTargetTableWrites();
  });

  test('shows honest CREATED summary with mapped modules and positive counts only', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({
        budget_items_created: 0,
        warnings: [
          { code: 'BUDGET_PRICING_REVIEW_REQUIRED' },
          { code: 'MEAL_INDICATOR_SKIPPED_UNRESOLVED_SOURCE', source_lfa_indicator_id: 'ind-11', fields: ['source_lfa_indicator_id'] },
        ],
      }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/lfa-project-1?tab=lfa');
    });

    expectAnyText(/Ringkasan hasil sinkronisasi/i);
    expectAnyText(/Materialisasi selesai/i);
    expectAnyText(/Bagian kosong berhasil dibuat/i);
    expectAnyText(/Dibuat:/i);
    expectAnyText(/LFA, WBS & Timeline, Anggaran, MEAL, SROI/i);
    expectAnyText(/Baris LFA dibuat: 4/i);
    expectAnyText(/Item WBS dibuat: 2/i);
    expectAnyText(/Indikator MEAL dibuat: 1/i);
    expectAnyText(/Outcome SROI dibuat: 1/i);
    expect(screen.queryByText(/Item anggaran dibuat: 0/i)).toBeNull();
    expectAnyText(/Harga pada anggaran perlu peninjauan manual/i);
    expectAnyText(/Dilewati untuk ditinjau:/i);
    expectAnyText(/Referensi indikator sumber: ind-11/i);

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Materialisasi selesai',
    }));
    expectNoTargetTableWrites();
  });

  test.each([
    ['PRESERVED_EXISTING', 'success', 'Data existing dipertahankan', 'Tidak ada data existing yang ditimpa.'],
    ['ALREADY_MATERIALIZED', 'success', 'Dokumen sudah dimaterialisasi', 'Data yang sama tidak dibuat ulang.'],
    ['MATERIALIZATION_IN_PROGRESS', 'running', 'Materialisasi sedang diproses', 'Permintaan sebelumnya masih berjalan.'],
    ['BLOCKED_PARTIAL', 'blocked', 'Sinkronisasi diblokir', 'Tidak ada fallback write yang dijalankan.'],
    ['PREVIOUS_ATTEMPT_FAILED', 'failed', 'Percobaan sebelumnya gagal', 'Retry otomatis dinonaktifkan'],
    ['PREVIOUS_ATTEMPT_BLOCKED', 'blocked', 'Percobaan sebelumnya diblokir', 'Tinjauan manual diperlukan'],
    ['FAILED_VALIDATION', 'failed', 'Dokumen belum dapat dimaterialisasi', 'Dokumen belum dapat dimaterialisasi.'],
    ['FAILED_DATABASE', 'failed', 'Materialisasi gagal', 'Perubahan target dibatalkan. Tidak ada fallback client-side yang dijalankan.'],
  ])('renders persistent result summary for %s', async (code, status, title, summarySnippet) => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({
        code,
        status,
        lfa_project_id: code === 'MATERIALIZATION_IN_PROGRESS' || code === 'BLOCKED_PARTIAL' || code === 'PREVIOUS_ATTEMPT_FAILED' || code === 'PREVIOUS_ATTEMPT_BLOCKED' || code === 'FAILED_VALIDATION' || code === 'FAILED_DATABASE' ? null : 'lfa-project-1',
        created_modules: [],
        preserved_modules: code === 'PRESERVED_EXISTING' ? ['budget'] : [],
        blocked_stage: code === 'BLOCKED_PARTIAL' ? 'lfa_structure' : null,
        failure_code: code === 'BLOCKED_PARTIAL' || code === 'FAILED_VALIDATION' ? 'GW_STATE_MISMATCH' : null,
      }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(screen.queryAllByText(new RegExp(title, 'i')).length).toBeGreaterThan(0);
    });

    expect(screen.queryAllByText(new RegExp(summarySnippet, 'i')).length).toBeGreaterThan(0);

    if (code === 'CREATED' || code === 'ALREADY_MATERIALIZED' || code === 'PRESERVED_EXISTING') {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/lfa-project-1?tab=lfa');
    } else {
      expect(navigateMock).not.toHaveBeenCalled();
    }

    if (code === 'BLOCKED_PARTIAL') {
      expectAnyText(/Kode aman: GW_STATE_MISMATCH/i);
      expectAnyText(/Tahap: lfa_structure/i);
    }

    expectNoTargetTableWrites();
  });

  test('maps preserved and unknown modules safely in summary', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({
        code: 'PRESERVED_EXISTING',
        created_modules: ['custom_module'],
        preserved_modules: ['wbs', 'weird<script>'],
      }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(screen.queryAllByText(/Data existing dipertahankan/i).length).toBeGreaterThan(0);
    });

    expectAnyText(/Dibuat:/i);
    expectAnyText(/Dipertahankan:/i);
    expectAnyText(/WBS & Timeline/i);
    expect(screen.queryAllByText(/Modul lainnya/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/weird<script>/i)).toBeNull();
    expectNoTargetTableWrites();
  });

  test('renders known warning code mapping and safe fallback for unknown warning payload', async () => {
    rpcMock.mockResolvedValue({
      data: buildRpcResult({
        warnings: [
          { code: 'WBS_IGNORED_FIELDS', fields: ['task_name', 'unknown_field'] },
          { code: 'SROI_MEAL_LINKAGE_REVIEW_REQUIRED' },
          {},
        ],
      }),
      error: null,
    });
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: /Materialisasikan Sekarang/i }));

    await waitFor(() => {
      expect(screen.queryAllByText(/Sebagian field WBS tidak digunakan agar struktur tetap aman\./i).length).toBeGreaterThan(0);
    });

    expectAnyText(/Keterkaitan SROI dengan MEAL perlu ditinjau manual\./i);
    expectAnyText(/Terdapat catatan yang perlu ditinjau\./i);
    expectAnyText(/Field: task_name/i);
    expect(screen.queryByText(/unknown_field/i)).toBeNull();
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
    expectAnyText(/Ringkasan hasil sinkronisasi/i);
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
