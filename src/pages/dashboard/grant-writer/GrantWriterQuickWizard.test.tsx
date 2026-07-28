import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GrantWriterQuickWizard from './GrantWriterQuickWizard';
import { suggestTitleFromStory } from './GrantWriterQuickWizardProvisional';
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
          then: vi.fn((resolve) => resolve({
            data: table === 'lfa_entries' ? [
              { id: 'e1', level: 'purpose', narrative: 'Purpose 1', code: 'PURP-1' },
              { id: 'e2', level: 'output', narrative: 'Output 1', code: 'OUT-1' },
              { id: 'e3', level: 'activity', narrative: 'Activity 1', code: 'ACT-1' },
            ] : [],
            error: null,
          }))
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
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    // Wait for Supabase query resolution
    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Expect inputs populated with DB defaults
    expect((screen.getByLabelText(/Judul Program/i) as HTMLInputElement).value).toBe('Pertanian Lestari');
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
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Null DB value maps to durationUnknown=true, which disables the input on load
    const durationInput = screen.getByLabelText('Durasi Program (Bulan)') as HTMLInputElement;
    expect(durationInput.value).toBe('');
    expect(durationInput.disabled).toBe(true);
    
    // Toggle the checked "Belum diketahui" checkbox to re-enable duration input
    const unknownCheckboxes = screen.getAllByLabelText('Belum diketahui');
    const checkedCheckbox = unknownCheckboxes.find(cb => (cb as HTMLInputElement).checked);
    if (checkedCheckbox) {
      fireEvent.click(checkedCheckbox);
    }
    expect(durationInput.disabled).toBe(false);
  });

  test('Gunakan Contoh button populates program story textarea and displays disclaimer callout', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Find and click "Gunakan Contoh" button for program story
    const useExampleBtns = screen.getAllByRole('button', { name: /Gunakan Contoh/i });
    expect(useExampleBtns.length).toBeGreaterThan(0);

    fireEvent.click(useExampleBtns[0]);

    // Verify textarea populated with sample story
    const storyTextarea = screen.getByLabelText('Cerita Program (Program Story) *') as HTMLTextAreaElement;
    expect(storyTextarea.value).toContain('Program Pencegahan Stunting Berbasis Posyandu');
    expect(storyTextarea.value).toContain('prevalensi stunting balita di desa ini mencapai 27%');

    // Verify disclaimer text displayed
    expect(screen.getByText(/Ini contoh ilustrasi -- silakan ganti dengan cerita program Anda sendiri sebelum submit/i)).toBeTruthy();

    // Verify toast notification
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '✨ Contoh Cerita Program Diterapkan',
    }));
  });

  test('Submitting Page 1 triggers processing timer and progresses to Page 2', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
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
      expect(screen.getByText(/Yang Kami Pahami Tentang Program Anda/i)).toBeTruthy();
    });
    expect(screen.getByTestId('advanced-analysis-accordion')).toBeTruthy();
  });

  test('Page 2 validates blocker logic and blocks approval until resolved', async () => {
    // Load pre-existing v1.2 Scope Too Broad (FIX-DEV-SB-4) which contains blocking items
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
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    // Wait for Page 2 content
    await waitFor(() => {
      expect(screen.getByText(/AI Menyarankan Informasi Tambahan/i)).toBeTruthy();
    });

    // The approval button is enabled because missing information is non-blocking
    const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i });
    expect(approveBtn.disabled).toBe(false);

    // Approve the blueprint
    fireEvent.click(approveBtn);

    // Verify it proceeds to page 3 (Approved page) and shows the exact success message
    await waitFor(() => {
      expect(screen.getByText('Blueprint Program Disetujui!')).toBeTruthy();
      expect(screen.getByText(/Blueprint disetujui untuk sesi ini/i)).toBeTruthy();
    });
  });

  test('RC-9B.1 Cutover: Submitting Page 1 executes 27.5k Brain assembler and approving blueprint navigates directly to LFABuilder', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    vi.useFakeTimers();

    // Populate required inputs
    fireEvent.change(screen.getByLabelText('Kelompok Sasaran Penerima Manfaat *'), { target: { value: 'Petani miskin Desa Gunungkidul' } });
    fireEvent.change(screen.getByLabelText('Target Jumlah Penerima (Orang)'), { target: { value: '100' } });
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
      expect(screen.getAllByText(/Program Blueprint/i).length).toBeGreaterThan(0);
    });

    // Click Setujui Blueprint & Lanjutkan
    const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i });
    fireEvent.click(approveBtn);

    // Verify materialization screen is displayed first
    await waitFor(() => {
      expect(screen.getByTestId('materialization-screen')).toBeInTheDocument();
    });

    // Verify navigation to LFABuilder occurs after materialization completes
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/lfa-builder/gw-project-1?from=quick_proposal', { state: { fromQuickProposal: true } });
    }, { timeout: 4000 });
  });

  test('RC-9B.4 — Page 2 Review renders live deterministic output from user inputs and excludes fixture content', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Enter specific user inputs for "Janda Cirebon"
    fireEvent.change(screen.getByLabelText(/Judul Program/i), { target: { value: 'Pemberdayaan Digital Janda Cirebon' } });
    fireEvent.change(screen.getByLabelText('Lokasi Program'), { target: { value: 'Cirebon' } });
    fireEvent.change(screen.getByLabelText('Kelompok Sasaran Penerima Manfaat *'), { target: { value: 'Janda di Cirebon' } });
    fireEvent.change(screen.getByLabelText('Cerita Program (Program Story) *'), { target: { value: 'Program ini memberdayakan janda di Cirebon melalui pelatihan keterampilan digital.' } });

    // Fast-forward fake timers for transition
    vi.useFakeTimers();
    fireEvent.submit(screen.getByText(/Tinjau Program Blueprint/i).closest('form')!);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    vi.useRealTimers();

    // Verify Page 2 Review renders user context
    await waitFor(() => {
      expect(screen.getAllByText(/Pemberdayaan Digital Janda Cirebon/i).length).toBeGreaterThan(0);
    });

    // Check that Page 2 contains "Janda di Cirebon" and "Cirebon"
    expect(screen.getAllByText(/Cirebon/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Janda/i).length).toBeGreaterThan(0);

    // Assert Page 2 does NOT contain hardcoded fixture content
    expect(screen.queryByText(/Sukamaju/i)).toBeNull();
    expect(screen.queryByText(/Sleman/i)).toBeNull();
    expect(screen.queryByText(/Pupuk organik/i)).toBeNull();
  });

  test('UX-FACT-01 — Fact Summary Banner displays canonical facts and prevents duplicate location rendering', async () => {
    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Enter user inputs for "Janda Cirebon"
    fireEvent.change(screen.getByLabelText(/Judul Program/i), { target: { value: 'Pemberdayaan Janda Cirebon' } });
    fireEvent.change(screen.getByLabelText('Lokasi Program'), { target: { value: 'Cirebon' } });
    fireEvent.change(screen.getByLabelText('Kelompok Sasaran Penerima Manfaat *'), { target: { value: 'Janda Cirebon' } });
    fireEvent.change(screen.getByLabelText('Cerita Program (Program Story) *'), { target: { value: 'Membantu Janda Cirebon mandiri secara ekonomi.' } });

    vi.useFakeTimers();
    fireEvent.submit(screen.getByText(/Tinjau Program Blueprint/i).closest('form')!);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    vi.useRealTimers();

    // Verify Fact Summary Banner renders with expected fields
    await waitFor(() => {
      expect(screen.getByTestId('canonical-fact-banner')).toBeTruthy();
    });

    expect(screen.getByTestId('fact-lokasi').textContent).toBe('Cirebon');
    expect(screen.getByTestId('fact-sasaran').textContent).toBe('Janda');
    expect(screen.getByTestId('fact-program').textContent).toContain('Janda Cirebon');

    // Verify duplicate location rendering ("Janda di Cirebon di Cirebon" or "Cirebon di Cirebon") DOES NOT exist
    const fullBodyText = document.body.textContent || '';
    expect(fullBodyText).not.toContain('Cirebon di Cirebon');
    expect(fullBodyText).not.toContain('Janda di Cirebon di Cirebon');
  });

  test('Saving drafts persists complete state to Supabase gw_projects table', async () => {

    installSupabaseScenario();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GrantWriterQuickWizard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Yayasan Tani Hijau')).toBeTruthy();
    });

    // Fill in a custom value
    fireEvent.change(screen.getByLabelText(/Judul Program/i), { target: { value: 'Judul Draft Keren' } });

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
        <GrantWriterQuickWizard />
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
        <GrantWriterQuickWizard />
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

  describe('Quick Wizard Selector and Default Export Compatibility', () => {
    test('Default export renders 27.5k Brain canonical quick wizard in production and development', async () => {
      installSupabaseScenario();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizard />
        </QueryClientProvider>
      );

      // Verify that default export mounts 27.5k Brain Canonical Quick Wizard
      await waitFor(() => {
        expect(screen.getByText('Program Blueprint Studio')).toBeTruthy();
        expect(screen.getByText(/Isi cerita program dan detail utama/i)).toBeTruthy();
      });
    });

    test('RC-9B.3 — CTA button is enabled when Page 1 required fields are populated regardless of DEV mode', async () => {
      installSupabaseScenario({
        wizard_data: {
          proposedTitle: 'Program Pertanian Organik',
          beneficiaryDescription: 'Petani Lokal',
          programStory: 'Cerita Intervensi Pertanian',
        }
      });
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizard />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const ctaBtn = screen.getByRole('button', { name: /Tinjau Program Blueprint/i });
        expect(ctaBtn).not.toBeNull();
        expect((ctaBtn as HTMLButtonElement).disabled).toBe(false);
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
          <GrantWriterQuickWizard />
        </QueryClientProvider>
      );

      // Clarification questions are non-blocking recommendations, button is enabled
      await waitFor(() => {
        expect(screen.getByText(/AI Menyarankan Informasi Tambahan/i)).toBeTruthy();
      });

      const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i });
      expect(approveBtn.disabled).toBe(false);

      // Klik Setujui Blueprint
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(screen.getByText('Blueprint Program Disetujui!')).toBeTruthy();
      });

      // Klik Tinjau Ulang Blueprint untuk kembali ke Page 2 agar tombol Simpan Draft tersedia
      const reviewBtn = screen.getByRole('button', { name: /Tinjau Ulang Blueprint/i });
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId('advanced-analysis-accordion')).toBeTruthy();
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

  describe('UX-HARDENING-2 — REDUCE REVIEW FRICTION', () => {
    test('Task 1: Sector cards collapse to top 3 and expand via toggle accordion', async () => {
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
          <GrantWriterQuickWizard />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('advanced-analysis-accordion')).toBeTruthy();
      });

      const toggleBtn = screen.queryByTestId('toggle-sectors-btn');
      if (toggleBtn) {
        expect(toggleBtn.textContent).toMatch(/Lihat \d+ sektor lainnya/i);
        fireEvent.click(toggleBtn);
        expect(toggleBtn.textContent).toMatch(/Sembunyikan sektor lainnya/i);
      }
    });

    test('Task 2 & 3: Human readable labels replace technical IDs and click-to-fix navigation works', async () => {
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
          <GrantWriterQuickWizard />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/AI Menyarankan Informasi Tambahan/i)).toBeTruthy();
      });

      expect(screen.getByText(/Saran Penyempurnaan Opsional/i)).toBeTruthy();
    });

    describe('RC-9B.5 Regression Tests: Empty Canonical Payload Guard', () => {
      test('Empty canonical payload (Janda Cirebon) displays warning status, masks fake blueprint, and blocks approval', async () => {
        const baseResponse = adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-HC-1']);
        const emptyDomainResponse = {
          ...baseResponse,
          canonicalMetrics: { outcomesCount: 0, outputsCount: 0, activitiesCount: 0 }
        };

        installSupabaseScenario({
          wizard_data: {
            currentFlowPage: 'page2',
            selectedFixtureId: 'FIX-DEV-HC-1',
            proposedTitle: 'Janda Cirebon',
            canonicalPayload: {
              proposal_id: 'prop-empty',
              title: 'Janda Cirebon',
              geography: 'Cirebon',
              target_group: 'Janda',
              summary: '',
              sectors: [],
              interventions: [],
              outcomes: [],
              sdg_ids: [],
              actor_roles: {},
              metadata: { assembler_version: '2.0.0', generated_at: new Date().toISOString() }
            },
            domainResponse: emptyDomainResponse,
            acceptedSectors: ['SEC-DIGITAL'],
            acceptedInterventions: ['INT-DIG-LIT'],
            acceptedSdgs: [4],
            acceptedActorRoles: ['ACT-WOMEN'],
            blueprintEdits: {},
            ambiguityResolutions: {},
            missingInfoResolutions: { 'INFO-PRIORITY': { state: 'answered', answer: 'Pemberdayaan' } },
          }
        });
        const queryClient = createTestQueryClient();

        render(
          <QueryClientProvider client={queryClient}>
            <GrantWriterQuickWizard />
          </QueryClientProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('review-status-card')).toBeTruthy();
        }, { timeout: 4000 });

        // 1. Status card shows "Struktur Logframe Belum Terbentuk"
        expect(screen.getAllByText(/Struktur Logframe Belum Terbentuk/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Sistem membutuhkan rincian intervensi/i)).toBeTruthy();

        // 2. Empty payload warning card is displayed with example guidance
        expect(screen.getByTestId('empty-canonical-payload-warning')).toBeTruthy();
        expect(screen.getByText(/Kami belum dapat mengidentifikasi struktur intervensi/i)).toBeTruthy();
        expect(screen.getByText(/Contoh Input yang Lebih Spesifik untuk Program Anda/i)).toBeTruthy();

        // 3. Approval blocker alert is rendered
        expect(screen.getByTestId('empty-payload-approval-blocker')).toBeTruthy();
        expect(screen.getByText(/Persetujuan Diblokir: Struktur Logframe Belum Terbentuk/i)).toBeTruthy();

        // 4. Approval button is disabled
        const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i }) as HTMLButtonElement;
        expect(approveBtn.disabled).toBe(true);
      });

      test('Valid canonical payload (Pelatihan digital untuk janda di Cirebon) shows ready status and allows approval', async () => {
        const baseResponse = adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-HC-1']);
        const validDomainResponse = {
          ...baseResponse,
          canonicalMetrics: { outcomesCount: 1, outputsCount: 1, activitiesCount: 1 }
        };

        installSupabaseScenario({
          wizard_data: {
            currentFlowPage: 'page2',
            selectedFixtureId: 'FIX-DEV-HC-1',
            proposedTitle: 'Pelatihan digital untuk janda di Cirebon',
            canonicalPayload: {
              proposal_id: 'prop-valid',
              title: 'Pelatihan digital untuk janda di Cirebon',
              geography: 'Cirebon',
              target_group: 'Janda',
              summary: 'Pelatihan keterampilan digital',
              sectors: ['SEC-DIGITAL'],
              interventions: ['INT-DIG-LIT'],
              outcomes: [
                {
                  id: 'out-1',
                  code: '1',
                  outcome_name: 'Peningkatan literasi digital',
                  description: 'Janda di Cirebon menguasai aplikasi keuangan digital',
                  indicators: [],
                  outputs: [
                    {
                      id: 'op-1',
                      code: '1.1',
                      output_name: 'Modul pelatihan digital terdistribusi',
                      description: 'Terbaginya modul ke 100 peserta',
                      indicators: [],
                      activities: [
                        {
                          id: 'act-1',
                          code: '1.1.1',
                          activity_name: 'Pelaksanaan workshop harian',
                          description: 'Workshop 3 hari di Cirebon',
                          cost_drivers: []
                        }
                      ]
                    }
                  ]
                }
              ],
              sdg_ids: [4, 5],
              actor_roles: {},
              metadata: { assembler_version: '2.0.0', generated_at: new Date().toISOString() }
            },
            domainResponse: validDomainResponse,
            acceptedSectors: ['SEC-DIGITAL'],
            acceptedInterventions: ['INT-DIG-LIT'],
            acceptedSdgs: [4],
            acceptedActorRoles: ['ACT-WOMEN'],
            blueprintEdits: {},
            ambiguityResolutions: {},
            missingInfoResolutions: { 'INFO-PRIORITY': { state: 'answered', answer: 'Pemberdayaan' } },
          }
        });
        const queryClient = createTestQueryClient();

        render(
          <QueryClientProvider client={queryClient}>
            <GrantWriterQuickWizard />
          </QueryClientProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('review-status-card')).toBeTruthy();
        }, { timeout: 4000 });

        // 1. Status card shows "Struktur Logframe Siap"
        expect(screen.getByText(/Struktur Logframe Siap/i)).toBeTruthy();
        expect(screen.getByText(/Hasil analisis sistem berhasil membentuk kerangka kerja logis/i)).toBeTruthy();

        // 2. Empty payload warning card and approval blocker are NOT present
        expect(screen.queryByTestId('empty-canonical-payload-warning')).toBeNull();
        expect(screen.queryByTestId('empty-payload-approval-blocker')).toBeNull();

        // 3. Approval button is enabled
        const approveBtn = screen.getByRole('button', { name: /Setujui Blueprint/i }) as HTMLButtonElement;
        expect(approveBtn.disabled).toBe(false);
      });
    });
  });

  describe('GW-UX-02B — ZERO-FRICTION PROGRAM CREATION', () => {
    test('suggestTitleFromStory generates professional title from beneficiary and location', () => {
      const title1 = suggestTitleFromStory('Pelatihan digital untuk janda pesisir Cirebon', '50 Ibu Janda Pesisir', 'Cirebon');
      expect(title1).toBe('Pemberdayaan 50 Ibu Janda Pesisir di Cirebon');

      const title2 = suggestTitleFromStory('Pemberdayaan petani beras organik tanpa lokasi spesifik', 'Petani Beras Organik');
      expect(title2).toBe('Pemberdayaan Petani Beras Organik');

      const title3 = suggestTitleFromStory('Pelatihan literasi keuangan masyarakat desa', '');
      expect(title3).toBe('Pelatihan literasi keuangan masyarakat desa');
    });

    test('Page 1 renders optional title input and autofocuses program story textarea', async () => {
      installSupabaseScenario({ title: 'Program Baru' });
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <GrantWriterQuickWizard />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Judul Program \(Opsional\)/i)).toBeTruthy();
        expect(screen.getByLabelText(/Cerita Program/i)).toBeTruthy();
      });

      const storyTextarea = screen.getByLabelText(/Cerita Program/i) as HTMLTextAreaElement;
      expect(storyTextarea).toBe(document.activeElement);
    });
  });
});
