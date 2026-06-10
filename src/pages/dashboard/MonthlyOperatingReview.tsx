import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  CalendarRange, 
  Plus, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Clock, 
  User, 
  Save, 
  Edit, 
  Sparkles,
  Loader2,
  Calendar,
  FileText
} from 'lucide-react';

interface PlanPriority {
  priority: string;
  owner: string;
  deadline: string;
}

interface DecisionItem {
  decision: string;
  owner: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'done';
}

interface MorSession {
  id: string;
  organization_id: string;
  session_date: string;
  facilitator_id: string | null;
  recap_notes: string;
  performance_notes: string;
  people_notes: string;
  risk_notes: string;
  plan_priorities: PlanPriority[];
  decisions: DecisionItem[];
  next_mor_date: string | null;
  created_at: string;
}

export default function MonthlyOperatingReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active Selected Session for editing or reading (null means creating new session)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Form States
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [recapNotes, setRecapNotes] = useState('');
  const [performanceNotes, setPerformanceNotes] = useState('');
  const [peopleNotes, setPeopleNotes] = useState('');
  const [riskNotes, setRiskNotes] = useState('');
  const [nextMorDate, setNextMorDate] = useState('');
  
  // Array lists stored in JSONB columns
  const [priorities, setPriorities] = useState<PlanPriority[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);

  // Add individual list item states
  const [newPriorityText, setNewPriorityText] = useState('');
  const [newPriorityOwner, setNewPriorityOwner] = useState('');
  const [newPriorityDeadline, setNewPriorityDeadline] = useState('');

  const [newDecisionText, setNewDecisionText] = useState('');
  const [newDecisionOwner, setNewDecisionOwner] = useState('');
  const [newDecisionDeadline, setNewDecisionDeadline] = useState('');
  const [newDecisionStatus, setNewDecisionStatus] = useState<'pending' | 'in_progress' | 'done'>('pending');

  // 1. Fetch organization context
  const { data: membership, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['organization_members', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const orgId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  // 2. Fetch MOR Session history
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery<MorSession[]>({
    queryKey: ['mor_sessions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('mor_sessions')
        .select('*')
        .eq('organization_id', orgId)
        .order('session_date', { ascending: false });
      if (error) throw error;

      // Handle raw JSONB cast safely
      return (data || []).map((row: any) => ({
        ...row,
        plan_priorities: Array.isArray(row.plan_priorities) ? row.plan_priorities : [],
        decisions: Array.isArray(row.decisions) ? row.decisions : [],
      }));
    },
    enabled: !!orgId,
  });

  // Load selected session into form
  const activeSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (activeSession) {
      setSessionDate(activeSession.session_date);
      setRecapNotes(activeSession.recap_notes || '');
      setPerformanceNotes(activeSession.performance_notes || '');
      setPeopleNotes(activeSession.people_notes || '');
      setRiskNotes(activeSession.risk_notes || '');
      setNextMorDate(activeSession.next_mor_date || '');
      setPriorities(activeSession.plan_priorities || []);
      setDecisions(activeSession.decisions || []);
    } else {
      // Clear to new session form
      setSessionDate(new Date().toISOString().split('T')[0]);
      setRecapNotes('');
      setPerformanceNotes('');
      setPeopleNotes('');
      setRiskNotes('');
      setNextMorDate('');
      setPriorities([]);
      setDecisions([]);
    }
  }, [activeSession, selectedSessionId]);

  // Priority Add/Remove handlers
  const handleAddPriority = () => {
    if (!newPriorityText.trim()) {
      toast.error('Teks prioritas wajib diisi');
      return;
    }
    setPriorities((prev) => [
      ...prev,
      {
        priority: newPriorityText,
        owner: newPriorityOwner || 'Semua Tim',
        deadline: newPriorityDeadline || new Date().toISOString().split('T')[0],
      },
    ]);
    setNewPriorityText('');
    setNewPriorityOwner('');
    setNewPriorityDeadline('');
  };

  const handleRemovePriority = (index: number) => {
    setPriorities((prev) => prev.filter((_, i) => i !== index));
  };

  // Decisions Add/Remove handlers
  const handleAddDecision = () => {
    if (!newDecisionText.trim()) {
      toast.error('Teks keputusan/tindakan wajib diisi');
      return;
    }
    setDecisions((prev) => [
      ...prev,
      {
        decision: newDecisionText,
        owner: newDecisionOwner || 'Semua Tim',
        deadline: newDecisionDeadline || new Date().toISOString().split('T')[0],
        status: newDecisionStatus,
      },
    ]);
    setNewDecisionText('');
    setNewDecisionOwner('');
    setNewDecisionDeadline('');
    setNewDecisionStatus('pending');
  };

  const handleRemoveDecision = (index: number) => {
    setDecisions((prev) => prev.filter((_, i) => i !== index));
  };

  // CRUD Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !user?.id) throw new Error('Unauthenticated or Org not resolved');

      const payload = {
        organization_id: orgId,
        session_date: sessionDate,
        facilitator_id: user.id,
        recap_notes: recapNotes,
        performance_notes: performanceNotes,
        people_notes: peopleNotes,
        risk_notes: riskNotes,
        plan_priorities: priorities,
        decisions: decisions,
        next_mor_date: nextMorDate || null,
      };

      if (selectedSessionId) {
        // UPDATE
        const { data, error } = await supabase
          .from('mor_sessions')
          .update(payload)
          .eq('id', selectedSessionId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('mor_sessions')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      toast.success(selectedSessionId ? 'Review Operasional berhasil diperbarui!' : 'Sesi Review Operasional baru sukses disimpan!');
      queryClient.invalidateQueries({ queryKey: ['mor_sessions', orgId] });
      if (!selectedSessionId) {
        setSelectedSessionId(data.id);
      }
    },
    onError: (err: any) => {
      console.error('[MOR] save error:', err);
      toast.error(`Gagal menyimpan sesi MOR: ${err.message || 'Error internal server'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mor_sessions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Arsip MOR berhasil dihapus');
      setSelectedSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['mor_sessions', orgId] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menghapus arsip: ${err.message}`);
    },
  });

  const handleResetForm = () => {
    setSelectedSessionId(null);
  };

  const handleApplyAITemplate = () => {
    setRecapNotes('Operasional berjalan dengan optimal secara keseluruhan. Terjadi peningkatan efisiensi logistik penyaluran buku paket program edukasi melalui skema relawan wilayah.');
    setPerformanceNotes('Program belajar utama mencapai 95% kehadiran. Fundraising MTD melampaui baseline target 15% berkat campaign rutin WhatsApp broadcast.');
    setPeopleNotes('PIC digital program membutuhkan peningkatan kompetensi manajemen aset digital. Akan dijadwalkan sesi pelatihan singkat minggu depan.');
    setRiskNotes('Risiko cuaca ekstrem di musim pancaroba dapat mengganggu mobilitas relawan lapangan.');
    setNextMorDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    setPriorities([
      { priority: 'Implementasi materi bimbingan literasi tahap 2', owner: 'Rina (Edukasi)', deadline: '2026-06-30' },
      { priority: 'Pembersihan dan validasi basis data donor pasif', owner: 'Ahmad (CRM)', deadline: '2026-06-25' }
    ]);
    
    setDecisions([
      { decision: 'Pengadaan 5 unit penunjang kelayakan belajar desa binaan', owner: 'Budi (Ops)', deadline: '2026-07-05', status: 'pending' },
      { decision: 'Transisi jadwal belajar ke sesi hybrid saat cuaca hujan deras', owner: 'Rina (Edukasi)', deadline: '2026-06-20', status: 'in_progress' }
    ]);

    toast.success('Draf review taktis berbasis AI berhasil disematkan!');
  };

  const isGlobalLoading = isMembershipLoading || (!!orgId && isSessionsLoading);

  if (isGlobalLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat riwayat review operasional bulanan…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HERO Banner */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">Harvest & Review</Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Monthly Operating Review (MOR)</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Disiplin manajemen taktis bulanan untuk mengulas kinerja program, alokasi kapasitas tim, mitigasi risiko, serta merumuskan prioritas target kerja dan keputusan strategis.
              </p>
            </div>
          </div>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-14 md:w-14">
            <CalendarRange className="h-6 w-6 md:h-7 md:w-7" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* LEFT PANEL: MOR Timeline History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-accent" /> Riwayat Sesi MOR
            </h2>
            <Button size="sm" onClick={handleResetForm} variant="outline" className="h-8 text-xs border-accent/30 text-accent">
              <Plus className="mr-1 h-3.5 w-3.5" /> Sesi Baru
            </Button>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <Card className="p-6 text-center border-dashed border-muted bg-muted/10">
                <CalendarRange className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs text-muted-foreground">Belum ada riwayat sesi MOR yang dicatat.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Gunakan panel kanan untuk membuat sesi perdana.</p>
              </Card>
            ) : (
              sessions.map((session) => {
                const isActive = selectedSessionId === session.id;
                const formattedDate = new Date(session.session_date).toLocaleDateString('id-ID', {
                  month: 'long',
                  year: 'numeric',
                  day: 'numeric',
                });
                return (
                  <Card
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-4 cursor-pointer transition-all border shadow-sm hover:border-accent/40 ${
                      isActive ? 'border-accent bg-accent-soft/10 ring-1 ring-accent/30' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">{formattedDate}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {session.recap_notes || 'Tidak ada catatan ringkasan.'}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'translate-x-1 text-accent' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-muted/40">
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4.5">
                        {session.plan_priorities?.length || 0} Prioritas
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4.5">
                        {session.decisions?.length || 0} Keputusan
                      </Badge>
                      {session.next_mor_date && (
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4.5 border-amber-500/20 text-amber-600 bg-amber-500/5">
                          Next: {session.next_mor_date}
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SESSIONS FORM */}
        <div className="space-y-6">
          <Card className="p-5 md:p-6 shadow-card border space-y-6 bg-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedSessionId ? `Sesi MOR: ${new Date(sessionDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : 'Catat Sesi Operating Review Baru'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedSessionId ? 'Tinjau dan perbarui keputusan operasional yang telah direkam.' : 'Mulai pencatatan ritme operasional untuk melacak performa bulanan.'}
                </p>
              </div>
              <div className="flex gap-2">
                {!selectedSessionId && (
                  <Button onClick={handleApplyAITemplate} variant="outline" size="sm" className="h-9 text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/5">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Draf AI Taktis
                  </Button>
                )}
                {selectedSessionId && (
                  <Button
                    onClick={() => {
                      if (confirm('Apakah Anda yakin ingin menghapus arsip review operasional ini?')) {
                        deleteMutation.mutate(selectedSessionId);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue="notes" className="space-y-5">
              <TabsList className="grid grid-cols-3 w-full max-w-md h-9 text-xs">
                <TabsTrigger value="notes">1. Catatan Review</TabsTrigger>
                <TabsTrigger value="priorities">2. Daftar Prioritas ({priorities.length})</TabsTrigger>
                <TabsTrigger value="decisions">3. Tindakan & Keputusan ({decisions.length})</TabsTrigger>
              </TabsList>

              {/* TAB 1: CORE NOTES */}
              <TabsContent value="notes" className="space-y-5 focus-visible:outline-none">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sessionDate" className="text-xs font-semibold">Tanggal Pelaksanaan Review</Label>
                    <Input
                      id="sessionDate"
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nextMorDate" className="text-xs font-semibold">Jadwal Sesi MOR Berikutnya (Opsional)</Label>
                    <Input
                      id="nextMorDate"
                      type="date"
                      value={nextMorDate}
                      onChange={(e) => setNextMorDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recapNotes" className="text-xs font-semibold flex items-center gap-1">
                    Ringkasan Eksekutif (Recap Notes) <Badge className="text-[8px] h-3.5">General</Badge>
                  </Label>
                  <Textarea
                    id="recapNotes"
                    value={recapNotes}
                    onChange={(e) => setRecapNotes(e.target.value)}
                    placeholder="Tuliskan intisari progres operasional, highlight utama, dan fokus utama tim di bulan ini..."
                    rows={4}
                    className="text-xs leading-relaxed"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="performanceNotes" className="text-xs font-semibold">Ulasan Performa Program (Performance)</Label>
                    <Textarea
                      id="performanceNotes"
                      value={performanceNotes}
                      onChange={(e) => setPerformanceNotes(e.target.value)}
                      placeholder="Bagaimana pencapaian target program? Apakah ada deviasi target?"
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="peopleNotes" className="text-xs font-semibold">Kapasitas & Struktur Tim (People)</Label>
                    <Textarea
                      id="peopleNotes"
                      value={peopleNotes}
                      onChange={(e) => setPeopleNotes(e.target.value)}
                      placeholder="Bagaimana kondisi moral tim? Adakah tantangan koordinasi?"
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskNotes" className="text-xs font-semibold flex items-center gap-1 text-amber-700 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" /> Mitigasi Risiko & Hambatan (Risks)
                  </Label>
                  <Textarea
                    id="riskNotes"
                    value={riskNotes}
                    onChange={(e) => setRiskNotes(e.target.value)}
                    placeholder="Tantangan eksternal (cuaca, legalitas, kepatuhan) atau internal yang berpotensi menghambat workflow..."
                    rows={3}
                    className="text-xs border-amber-500/10 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 bg-amber-500/[0.01]"
                  />
                </div>
              </TabsContent>

              {/* TAB 2: PRIORITIES */}
              <TabsContent value="priorities" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">90-Day Prioritas Taktis Kerja</h3>
                  <p className="text-xs text-muted-foreground">
                    Tentukan sasaran krusial operasional yang wajib dieksekusi 30-90 hari mendatang.
                  </p>
                </div>

                {/* Priorities Table/List */}
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="p-3 font-semibold">Nama Prioritas / Sasaran</th>
                        <th className="p-3 font-semibold w-32">PIC Penanggung</th>
                        <th className="p-3 font-semibold w-28">Deadline</th>
                        <th className="p-3 font-semibold w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground/60 italic">
                            Belum ada prioritas kerja yang ditambahkan. Gunakan form di bawah untuk menginput.
                          </td>
                        </tr>
                      ) : (
                        priorities.map((item, index) => (
                          <tr key={index} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="p-3 font-medium text-foreground">{item.priority}</td>
                            <td className="p-3 text-muted-foreground">{item.owner}</td>
                            <td className="p-3 text-muted-foreground">{item.deadline}</td>
                            <td className="p-3 text-center">
                              <Button
                                onClick={() => handleRemovePriority(index)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Priority Fields Form */}
                <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Tambah Prioritas Baru</p>
                  <div className="grid gap-3 md:grid-cols-[1fr_150px_130px_auto] items-end">
                    <div className="space-y-1">
                      <Label htmlFor="newPriorityText" className="text-[10px] font-semibold text-muted-foreground">Sasaran Prioritas</Label>
                      <Input
                        id="newPriorityText"
                        value={newPriorityText}
                        onChange={(e) => setNewPriorityText(e.target.value)}
                        placeholder="Contoh: Perapian database donatur aktif"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newPriorityOwner" className="text-[10px] font-semibold text-muted-foreground">Penanggung Jawab</Label>
                      <Input
                        id="newPriorityOwner"
                        value={newPriorityOwner}
                        onChange={(e) => setNewPriorityOwner(e.target.value)}
                        placeholder="Contoh: Ahmad (CRM)"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newPriorityDeadline" className="text-[10px] font-semibold text-muted-foreground">Batas Waktu</Label>
                      <Input
                        id="newPriorityDeadline"
                        type="date"
                        value={newPriorityDeadline}
                        onChange={(e) => setNewPriorityDeadline(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <Button onClick={handleAddPriority} type="button" size="sm" className="h-8 bg-accent text-accent-foreground px-3">
                      <Plus className="h-4 w-4" /> Tambah
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: DECISIONS */}
              <TabsContent value="decisions" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Keputusan Sesi & Rencana Tindakan (Action Items)</h3>
                  <p className="text-xs text-muted-foreground">
                    Dokumentasikan seluruh instruksi taktis lapangan, penanggung jawab, serta status implementasinya.
                  </p>
                </div>

                {/* Decisions Table/List */}
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="p-3 font-semibold">Keputusan / Tindakan Nyata</th>
                        <th className="p-3 font-semibold w-28">PIC Penanggung</th>
                        <th className="p-3 font-semibold w-24">Deadline</th>
                        <th className="p-3 font-semibold w-24">Status</th>
                        <th className="p-3 font-semibold w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground/60 italic">
                            Belum ada keputusan taktis yang direkam. Gunakan form di bawah untuk menginput.
                          </td>
                        </tr>
                      ) : (
                        decisions.map((item, index) => (
                          <tr key={index} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="p-3 font-medium text-foreground">{item.decision}</td>
                            <td className="p-3 text-muted-foreground">{item.owner}</td>
                            <td className="p-3 text-muted-foreground">{item.deadline}</td>
                            <td className="p-3">
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] font-bold px-1.5 h-4.5 ${
                                  item.status === 'done' 
                                    ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600'
                                    : item.status === 'in_progress'
                                    ? 'border-amber-500/25 bg-amber-500/5 text-amber-600'
                                    : 'border-blue-500/25 bg-blue-500/5 text-blue-600'
                                }`}
                              >
                                {item.status === 'done' ? 'Selesai' : item.status === 'in_progress' ? 'Berjalan' : 'Rencana'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                onClick={() => handleRemoveDecision(index)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Decision Fields Form */}
                <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Tambah Keputusan Baru</p>
                  <div className="grid gap-3 md:grid-cols-[1fr_120px_110px_100px_auto] items-end">
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionText" className="text-[10px] font-semibold text-muted-foreground">Instruksi / Tindakan</Label>
                      <Input
                        id="newDecisionText"
                        value={newDecisionText}
                        onChange={(e) => setNewDecisionText(e.target.value)}
                        placeholder="Contoh: Transisi sistem ke hybrid"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionOwner" className="text-[10px] font-semibold text-muted-foreground">PIC Penanggung</Label>
                      <Input
                        id="newDecisionOwner"
                        value={newDecisionOwner}
                        onChange={(e) => setNewDecisionOwner(e.target.value)}
                        placeholder="Contoh: Budi (Ops)"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionDeadline" className="text-[10px] font-semibold text-muted-foreground">Batas Waktu</Label>
                      <Input
                        id="newDecisionDeadline"
                        type="date"
                        value={newDecisionDeadline}
                        onChange={(e) => setNewDecisionDeadline(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newDecisionStatus" className="text-[10px] font-semibold text-muted-foreground">Status Awal</Label>
                      <select
                        id="newDecisionStatus"
                        value={newDecisionStatus}
                        onChange={(e) => setNewDecisionStatus(e.target.value as any)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="pending">Rencana</option>
                        <option value="in_progress">Berjalan</option>
                        <option value="done">Selesai</option>
                      </select>
                    </div>
                    <Button onClick={handleAddDecision} type="button" size="sm" className="h-8 bg-accent text-accent-foreground px-3">
                      <Plus className="h-4 w-4" /> Tambah
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Submit Action */}
            <div className="border-t pt-4 flex items-center justify-end gap-3">
              {selectedSessionId && (
                <Button onClick={handleResetForm} variant="outline" className="h-10 text-xs">
                  Selesai Review / Buat Baru
                </Button>
              )}
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-10 bg-accent text-accent-foreground px-5 font-semibold text-xs"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> {selectedSessionId ? 'Simpan Perubahan Review' : 'Simpan Sesi Review Operasional'}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
