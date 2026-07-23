import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GrantWriterIndex from './GrantWriterIndex';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { full_name: 'Test NGO User' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/grant-writer/orgHelper', () => ({
  ensureDefaultOrg: vi.fn().mockResolvedValue('test-org-id'),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('GW-UX-02A — GrantWriterIndex Home Simplification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockProjects = [
      {
        id: 'proj-1',
        title: 'Pemberdayaan Digital Janda Cirebon',
        status: 'draft',
        current_step: 1,
        updated_at: new Date().toISOString(),
        wizard_data: { _mode: 'quick', lokasi: 'Cirebon', sasaran: '50 Ibu' },
      },
      {
        id: 'proj-2',
        title: 'Beras Organik Gunungkidul',
        status: 'draft',
        current_step: 2,
        updated_at: new Date().toISOString(),
        wizard_data: { _mode: 'quick', blueprintApproved: true },
      },
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'gw_projects') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProjects,
              error: null,
            }),
          }),
        };
      }
      if (table === 'lfa_projects') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'lfa-1', linked_grant_id: 'proj-2' }],
            error: null,
          }),
        };
      }
      if (table === 'gw_lfa_documents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
  });

  it('TASK 4 — renders clean simplified header with primary CTA', async () => {
    render(
      <BrowserRouter>
        <GrantWriterIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('GRANTWRITER')).toBeInTheDocument();
      expect(
        screen.getByText('Susun Blueprint, LFA, WBS, dan Anggaran Program Anda.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Program Baru/i })).toBeInTheDocument();
    });
  });

  it('TASK 2 & TASK 3 — verifies disclaimers and compliance checklists are removed from landing page', async () => {
    render(
      <BrowserRouter>
        <GrantWriterIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Proposal tidak dimulai dari halaman kosong')).not.toBeInTheDocument();
      expect(screen.queryByText('Draft, bukan final')).not.toBeInTheDocument();
      expect(screen.queryByText('Human Review Required')).not.toBeInTheDocument();
      expect(screen.queryByText('No Fabrication')).not.toBeInTheDocument();
      expect(screen.queryByText('No Fabrication Rule')).not.toBeInTheDocument();
    });
  });

  it('TASK 1 — clicking Program Baru opens streamlined creation modal without mode fork', async () => {
    render(
      <BrowserRouter>
        <GrantWriterIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('GRANTWRITER')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Program Baru/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Buat Program Baru')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Program \/ Proyek/i)).toBeInTheDocument();

    // Verify mode choice cards (Mulai mode Quick, Mulai mode LFA Lengkap) are NOT in modal
    expect(screen.queryByText('Mulai mode Quick')).not.toBeInTheDocument();
    expect(screen.queryByText('Mulai mode LFA Lengkap')).not.toBeInTheDocument();
  });

  it('TASK 5 — renders pipeline summary bar with stage counts', async () => {
    render(
      <BrowserRouter>
        <GrantWriterIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Program Saya')).toBeInTheDocument();
      expect(screen.getByText('📝 Blueprint:')).toBeInTheDocument();
      expect(screen.getByText('📊 LFA:')).toBeInTheDocument();
      expect(screen.getByText('📅 WBS:')).toBeInTheDocument();
      expect(screen.getByText('💰 Budget:')).toBeInTheDocument();
      expect(screen.getByText('✅ Ready:')).toBeInTheDocument();
    });
  });

  it('TASK 6, 7 & 8 — renders redesigned program cards with stage badges and lifecycle progress timeline', async () => {
    render(
      <BrowserRouter>
        <GrantWriterIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pemberdayaan Digital Janda Cirebon')).toBeInTheDocument();
      expect(screen.getByText('Stage 1: Blueprint Draft')).toBeInTheDocument();
      expect(screen.getByText('Lengkapi Blueprint')).toBeInTheDocument();

      expect(screen.getByText('Beras Organik Gunungkidul')).toBeInTheDocument();
      expect(screen.getByText('Stage 3: LFA Studio')).toBeInTheDocument();
      expect(screen.getByText('Buka LFA Studio')).toBeInTheDocument();
    });
  });
});
