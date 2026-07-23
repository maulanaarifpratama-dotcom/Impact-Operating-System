import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GrantWriterQuickWizard, { GrantWriterQuickWizardSelector } from './GrantWriterQuickWizard';
import { PROVISIONAL_FIXTURES, adaptProvisionalResponse } from '@/lib/grant-writer/provisionalAdapter';

const { mockSupabaseFrom, mockSupabaseInvoke, toastMock, navigateMock, writeCalls } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
  mockSupabaseInvoke: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  writeCalls: [] as Array<{ table: string; type: 'insert' | 'update' | 'delete'; data?: unknown }>,
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

// Setup QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
  },
});

function installSupabaseScenario(projectOverrides?: Record<string, unknown>, orgOverrides?: Record<string, unknown>, shouldFailUpdate = false) {
  mockSupabaseFrom.mockImplementation((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => {
        const orderChain = {
          then: vi.fn((resolve) => resolve({ data: [], error: null }))
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
              ...orgOverrides,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
      update: vi.fn((data) => {
        writeCalls.push({ table, type: 'update', data });
        const updateChain = {
          eq: vi.fn(async () => {
            return { error: shouldFailUpdate ? new Error('Database connection failed') : null };
          })
        };
        return updateChain;
      }),
      upsert: vi.fn(async (data) => {
        writeCalls.push({ table, type: 'upsert', data });
        return { error: null };
      }),
      delete: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null }))
      })),
      insert: vi.fn(async (data) => {
        writeCalls.push({ table, type: 'insert', data });
        return { error: null };
      }),
    };
    return query;
  });
}

describe('GrantWriterQuickWizard Integration Test Suite', () => {
  beforeEach(() => {
    mockSupabaseFrom.mockReset();
    mockSupabaseInvoke.mockReset();
    toastMock.mockReset();
    navigateMock.mockReset();
    writeCalls.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('Page 1 loads initial data from project and organization tables', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    // Wait for Supabase query resolution
    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Expect inputs populated with DB defaults
    expect((screen.getByLabelText('Judul Program *') as HTMLInputElement).value).toBe('Pertanian Lestari');
    expect((screen.getByLabelText('Lokasi Program') as HTMLInputElement).value).toBe('Gunungkidul');
    expect((screen.getByLabelText('Durasi Program (Bulan)') as HTMLInputElement).value).toBe('6');
    expect((screen.getByLabelText('Perkiraan Anggaran Program (IDR)') as HTMLInputElement).value).toBe('50000000');
  });

  test('Numeric fields handle unentered and unknown options safely', async () => {
    // Pass duration_months as null, which signifies "Unknown" (Belum diketahui = true) in the UI logic
    installSupabaseScenario({ duration_months: null, budget_idr: null, wizard_data: null });
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Null DB value maps to durationUnknown=true, which disables the input on load
    const durationInput = screen.getByLabelText('Durasi Program (Bulan)') as HTMLInputElement;
    expect(durationInput.value).toBe('');
    expect(durationInput.disabled).toBe(true);
    
    // Toggle the "Belum diketahui" checkbox (checkboxes[1]) to enable it back
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(durationInput.disabled).toBe(false);
  });

  test('Submitting Page 1 triggers processing timer and progresses to Page 2', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // We switch to fake timers ONLY for active transition testing!
    vi.useFakeTimers();

    // Populate required fields
    fireEvent.change(screen.getByLabelText('Kelompok Sasaran Penerima Manfaat *'), { target: { value: 'Petani miskin' } });
    fireEvent.change(screen.getByLabelText('Cerita Program (Program Story) *'), { target: { value: 'Program ini meningkatkan hasil panen dan keadilan bagi kelompok tani.' } });

    // Submit
    fireEvent.submit(screen.getByText(/Tinjau Program Blueprint/i).closest('form')!);

    // Ensure we enter the processing stage
    expect(screen.getByText(/Konteks Deterministik sedang Ditinjau/i)).toBeTruthy();

    // Advance timers incrementally to verify stepper message progress
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByText('Membaca informasi program...')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Restore real timers so waitFor below behaves correctly
    vi.useRealTimers();

    // Now we should be on Page 2
    await waitFor(() => {
      expect(screen.getByText('Ringkasan Fakta Masukan (Page 1)')).toBeTruthy();
    });
    expect(screen.getByText('Rekomendasi Sektor Program')).toBeTruthy();
  });

  test('Page 2 validates blocker logic and blocks approval until resolved', async () => {
    // Load pre-existing v1.2 Scope Too Broad (FIX-DEV-SB-4) which contains blocking items
    installSupabaseScenario({
      wizard_data: {
        currentFlowPage: 'page2',
        selectedFixtureId: 'FIX-DEV-SB-4',
        domainResponse: PROVISIONAL_FIXTURES['FIX-DEV-SB-4'],
        acceptedSectors: ['SEC-AGRI'],
        acceptedInterventions: [],
        acceptedSdgs: [2],
        acceptedActorRoles: [],
        blueprintEdits: {},
        ambiguityResolutions: {},
        missingInfoResolutions: {},
      }
    });
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    // Wait for Page 2 content
    await waitFor(() => {
      expect(screen.getByText('Persetujuan Diblokir (1)')).toBeTruthy();
    });

    // Verify block alert content with exact matching string from FIX-DEV-SB-4
    expect(screen.getByText(/Informasi Penting Belum Terjawab: "Dapatkah Anda merinci/i)).toBeTruthy();

    // The approval button must be disabled
    const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i });
    expect(approveBtn.disabled).toBe(true);

    // Resolve the missing information blocking item
    const selectors = screen.getAllByRole('combobox');
    // Find the dropdown for unresolved information and change to 'answered'
    const missingInfoDropdown = selectors.find(s => (s as HTMLSelectElement).value === 'unresolved');
    expect(missingInfoDropdown).toBeTruthy();
    
    fireEvent.change(missingInfoDropdown!, { target: { value: 'answered' } });

    // Enter a valid answer text
    const answerInput = screen.getByPlaceholderText(/Tuliskan jawaban klarifikasi/i);
    fireEvent.change(answerInput, { target: { value: 'Prioritas utama kami adalah pemberdayaan ekonomi.' } });

    // Expect blocker alert to be resolved and button enabled
    await waitFor(() => {
      expect(screen.queryByText('Persetujuan Diblokir (1)')).toBeNull();
      expect(approveBtn.disabled).toBe(false);
    });

    // Approve the blueprint
    fireEvent.click(approveBtn);

    // Verify it proceeds to page 3 (Approved page) and shows the exact success message
    await waitFor(() => {
      expect(screen.getByText('Blueprint Program Disetujui!')).toBeTruthy();
      expect(screen.getByText(/Blueprint disetujui untuk sesi ini dan siap menjadi handoff/i)).toBeTruthy();
    });
  });

  test('RC-9B.1 Cutover: Submitting Page 1 executes 27.5k Brain assembler and approving blueprint navigates directly to LFABuilder', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    vi.useFakeTimers();

    // Populate required inputs
    fireEvent.change(screen.getByLabelText('Kelompok Sasaran Penerima Manfaat *'), { target: { value: 'Petani miskin Desa Gunungkidul' } });
    fireEvent.change(screen.getByLabelText('Cerita Program (Program Story) *'), { target: { value: 'Program pemberdayaan pertanian ramah lingkungan untuk meningkatkan pendapatan petani miskin.' } });

    // Submit Page 1
    fireEvent.submit(screen.getByText(/Tinjau Program Blueprint/i).closest('form')!);

    // Fast forward processing timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    vi.useRealTimers();

    // Verify Page 2 renders the 27.5k Brain Canonical Logframe Hierarchy
    await waitFor(() => {
      expect(screen.getByText('27.5k Brain Canonical Logframe Hierarchy (V2)')).toBeTruthy();
    });

    // Click Setujui Blueprint & Lanjutkan
    const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i });
    fireEvent.click(approveBtn);

    // Verify direct navigation to LFABuilder
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/gw-project-1');
    });
  });

  test('Saving drafts persists complete state to Supabase gw_projects table', async () => {

    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Fill in a custom value
    fireEvent.change(screen.getByLabelText('Judul Program *'), { target: { value: 'Judul Draft Keren' } });

    // Click Save Draft button
    const saveBtn = screen.getByRole('button', { name: /Simpan Draft/i });
    fireEvent.click(saveBtn);

    // Wait for mock Supabase update trigger
    await waitFor(() => {
      expect(writeCalls.length).toBe(1);
      expect(writeCalls[0].table).toBe('gw_projects');
      expect(writeCalls[0].data.wizard_data.proposedTitle).toBe('Judul Draft Keren');
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Draft Disimpan',
      }));
    });
  });

  test('unmount cleans up active processing interval', () => {
    vi.useFakeTimers();
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    // Transition to processing state
    const submitBtn = screen.getByRole('button', { name: /Tinjau Program Blueprint/i });
    fireEvent.click(submitBtn);

    // Unmount
    unmount();
    
    // Fast-forward time to ensure no errors or pending timers cause issues
    vi.runAllTimers();
    vi.useRealTimers();
  });

  test('draft update failure produces error toast and preserves unsaved state', async () => {
    // Force Supabase update error
    installSupabaseScenario(undefined, undefined, true);
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizardSelector isDevelopment={true} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    const saveBtn = screen.getByRole('button', { name: /Simpan Draft/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Gagal Menyimpan Draft',
        variant: 'destructive'
      }));
    });
  });

  describe('Legacy Production Fallback Flow', () => {

    test('Production build selects legacy component and does not display development provisional disclosure', async () => {
      installSupabaseScenario();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizardSelector isDevelopment={false} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Info Organisasi', { exact: false }).length).toBeGreaterThan(0);
      });

      // Assert development features are hidden
      expect(screen.queryByText('Development Fixture Simulator')).toBeNull();
      expect(screen.queryByText('Development Preview — bukan hasil analisis aktual')).toBeNull();
      expect(screen.queryByText('Rekomendasi Sektor Program')).toBeNull();
    });

    test('Legacy generation triggers Edge Function and navigates only on success', async () => {
      installSupabaseScenario();
      const queryClient = createTestQueryClient();

      // Mock successful edge function call
      mockSupabaseInvoke.mockImplementation(async (name) => {
        if (name === 'grant-writer-generate') {
          return {
            data: {
              error: null,
              document: { id: 'doc-456', content: '# Generated Proposal' },
              version: '1.0',
            },
            error: null,
          };
        }
        if (name === 'grant-writer-rag-references') {
          return {
            data: {
              chunks: [],
              hasDocuments: true,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizardSelector isDevelopment={false} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Info Organisasi', { exact: false }).length).toBeGreaterThan(0);
      });

      // Navigate to step 4 (Generate)
      fireEvent.click(screen.getByText('Lanjut')); // step 2
      await waitFor(() => {
        expect(screen.getAllByText('Deskripsi Program', { exact: false }).length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getByText('Lanjut')); // step 3
      await waitFor(() => {
        expect(screen.getAllByText('Target & Anggaran', { exact: false }).length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getByText('Lanjut')); // step 4
      await waitFor(() => {
        expect(screen.getAllByText('Buat Proposal (AI)', { exact: false }).length).toBeGreaterThan(0);
      });

      // Trigger AI proposal generation
      const generateBtn = screen.getByText('Buat Proposal (AI)', { exact: false });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(mockSupabaseInvoke).toHaveBeenCalledWith(
          'grant-writer-generate',
          expect.objectContaining({
            body: expect.objectContaining({
              projectId: 'gw-project-1',
            }),
          })
        );
        expect(navigateMock).toHaveBeenCalledWith('/dashboard/grant-writer/gw-project-1/proposal');
      });
    });

    test('Legacy generation failure shows error toast and does not navigate', async () => {
      installSupabaseScenario();
      const queryClient = createTestQueryClient();

      // Mock failed edge function call
      mockSupabaseInvoke.mockImplementation(async (name) => {
        if (name === 'grant-writer-generate') {
          return {
            data: null,
            error: { message: 'Azure OpenAI endpoint unavailable' },
          };
        }
        if (name === 'grant-writer-rag-references') {
          return {
            data: {
              chunks: [],
              hasDocuments: true,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizardSelector isDevelopment={false} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Info Organisasi', { exact: false }).length).toBeGreaterThan(0);
      });

      // Navigate to step 4 (Generate)
      fireEvent.click(screen.getByText('Lanjut')); // step 2
      await waitFor(() => {
        expect(screen.getAllByText('Deskripsi Program', { exact: false }).length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getByText('Lanjut')); // step 3
      await waitFor(() => {
        expect(screen.getAllByText('Target & Anggaran', { exact: false }).length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getByText('Lanjut')); // step 4
      await waitFor(() => {
        expect(screen.getAllByText('Buat Proposal (AI)', { exact: false }).length).toBeGreaterThan(0);
      });

      // Trigger AI proposal generation
      const generateBtn = screen.getByText('Buat Proposal (AI)', { exact: false });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(mockSupabaseInvoke).toHaveBeenCalled();
        expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Gagal membuat proposal dengan AI',
          variant: 'destructive',
        }));
        // Verify no false navigate success
        expect(navigateMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('Quick Wizard Selector and Default Export Compatibility', () => {
    test('Selector with isDevelopment: true renders provisional component', async () => {
      installSupabaseScenario();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizardSelector isDevelopment={true} />
        </QueryClientProvider>
      );

      // Verify that the development provisional view is selected on load
      await waitFor(() => {
        expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
      });
      expect(screen.getByText('Development Fixture Simulator')).toBeTruthy();
    });

    test('Selector with isDevelopment: false renders legacy component', async () => {
      installSupabaseScenario();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizardSelector isDevelopment={false} />
        </QueryClientProvider>
      );

      // Verify that the legacy 4-step wizard is selected on load
      await waitFor(() => {
        expect(screen.getAllByText('Info Organisasi', { exact: false }).length).toBeGreaterThan(0);
      });
      expect(screen.queryByText('Development Fixture Simulator')).toBeNull();
    });

    test('Default export remains compatible and mounts correctly', async () => {
      installSupabaseScenario();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizard />
        </QueryClientProvider>
      );

      // Verify that default export mounts and does not throw
      await waitFor(() => {
        expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
      });
    });

    test('safety: Approved snapshot carries rawCanonicalPayload, undefined snapshotVersion, and undefined geographyLevel', async () => {
      // Load pre-existing v1.2 Scope Too Broad (FIX-DEV-SB-4)
      installSupabaseScenario({
        wizard_data: {
          currentFlowPage: 'page2',
          selectedFixtureId: 'FIX-DEV-SB-4',
          domainResponse: adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-SB-4']),
          acceptedSectors: ['SEC-AGRI'],
          acceptedInterventions: [],
          acceptedSdgs: [2],
          acceptedActorRoles: [],
          blueprintEdits: {},
          ambiguityResolutions: {},
          missingInfoResolutions: {},
        }
      });
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizardSelector isDevelopment={true} />
        </QueryClientProvider>
      );

      // Selesaikan blockers agar tombol Setujui Blueprint aktif
      await waitFor(() => {
        expect(screen.getByText('Persetujuan Diblokir (1)')).toBeTruthy();
      });

      const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i });
      expect(approveBtn.disabled).toBe(true);

      const selectors = screen.getAllByRole('combobox');
      const missingInfoDropdown = selectors.find(s => (s as HTMLSelectElement).value === 'unresolved');
      expect(missingInfoDropdown).toBeTruthy();
      fireEvent.change(missingInfoDropdown!, { target: { value: 'answered' } });

      const answerInput = screen.getByPlaceholderText(/Tuliskan jawaban klarifikasi/i);
      fireEvent.change(answerInput, { target: { value: 'Prioritas utama kami adalah pemberdayaan ekonomi.' } });

      // Verifikasi blocker hilang dan tombol aktif
      await waitFor(() => {
        expect(approveBtn.disabled).toBe(false);
      });

      // Klik Setujui Blueprint
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(screen.getByText('Blueprint Program Disetujui!')).toBeTruthy();
      });

      // Klik Tinjau Ulang Blueprint untuk kembali ke Page 2 agar tombol Simpan Draft tersedia
      const reviewBtn = screen.getByRole('button', { name: /Tinjau Ulang Blueprint/i });
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByText('Rekomendasi Sektor Program')).toBeTruthy();
      });

      // Simpan Draft untuk mengirim snapshot terbaru ke mock Supabase
      const saveDraftBtn = screen.getByRole('button', { name: /Simpan Draft/i });
      fireEvent.click(saveDraftBtn);

      await waitFor(() => {
        const lastCall = writeCalls.find(call => call.table === 'gw_projects');
        expect(lastCall).toBeDefined();
        const wizardData = lastCall!.data.wizard_data;
        expect(wizardData.approvedSnapshot).toBeDefined();

        const snapshot = wizardData.approvedSnapshot;
        // 1. Lossless raw canonical payload preservation
        expect(snapshot.rawCanonicalPayload).toBeDefined();
        expect(snapshot.rawCanonicalPayload.contractVersion).toBe('1.2');

        // 2. No synthetic geography level inference
        expect(snapshot.programFacts.geographyLevel).toBeUndefined();

        // 3. No synthetic organization version
        expect(snapshot.organization?.snapshotVersion).toBeUndefined();
      });
    });
  });
});
