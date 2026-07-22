import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Loader2,
  Save,
  Sparkles,
  AlertTriangle,
  Info,
  Undo2,
  HelpCircle as QuestionIcon,
  CheckCircle2,
  AlertOctagon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import {
  adaptProvisionalResponse,
  PROVISIONAL_FIXTURES,
  ProvisionalDomainResponse,
  ApprovedPage2Snapshot
} from '@/lib/grant-writer/provisionalAdapter';

// Visual colors for SDGs as per standards
const SDG_COLORS: Record<number, string> = {
  1: '#E5243B',
  2: '#DDA63A',
  3: '#4C9F38',
  4: '#C5192D',
  5: '#FF3A21',
  6: '#26BDE2',
  7: '#FCC30B',
  8: '#A21942',
  9: '#FD6925',
  10: '#DD1367',
  11: '#FD9D24',
  12: '#BF8B2E',
  13: '#3F7E44',
  14: '#0A97D9',
  15: '#56C02B',
  16: '#00689D',
  17: '#19486A',
};

interface SavedWizardData {
  proposedTitle?: string;
  geography?: string;
  geographyUnknown?: boolean;
  durationMonths?: number | 'unknown' | 'unentered';
  durationUnknown?: boolean;
  beneficiaryDescription?: string;
  beneficiaryCount?: number | 'unknown' | 'unentered';
  beneficiaryCountUnknown?: boolean;
  budgetIdr?: number | 'unknown' | 'unentered';
  budgetIdrUnknown?: boolean;
  targetDonor?: string;
  donorStandard?: string;
  programStory?: string;
  
  currentFlowPage?: 'page1' | 'processing' | 'page2' | 'approved';
  selectedFixtureId?: string;
  domainResponse?: ProvisionalDomainResponse;
  acceptedSectors?: string[];
  acceptedInterventions?: string[];
  acceptedSdgs?: number[];
  acceptedActorRoles?: string[];
  blueprintEdits?: Record<string, string>;
  ambiguityResolutions?: Record<string, string>;
  missingInfoResolutions?: Record<string, { answer?: string, state: string }>;
  approvedSnapshot?: ApprovedPage2Snapshot;
}

export default function GrantWriterQuickWizardProvisional() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isDev = import.meta.env.DEV;

  // Local UI State
  const [currentFlowPage, setCurrentFlowPage] = useState<'page1' | 'processing' | 'page2' | 'approved'>('page1');
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('FIX-DEV-HC-1');
  const [isSaving, setIsSaving] = useState(false);
  const [approvedSnapshot, setApprovedSnapshot] = useState<ApprovedPage2Snapshot | null>(null);
  
  // Page 1 Inputs
  const [proposedTitle, setProposedTitle] = useState('');
  const [geography, setGeography] = useState('');
  const [geographyUnknown, setGeographyUnknown] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number | ''>('');
  const [durationUnknown, setDurationUnknown] = useState(false);
  const [beneficiaryDescription, setBeneficiaryDescription] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState<number | ''>('');
  const [beneficiaryCountUnknown, setBeneficiaryCountUnknown] = useState(false);
  const [budgetIdr, setBudgetIdr] = useState<number | ''>('');
  const [budgetIdrUnknown, setBudgetIdrUnknown] = useState(false);
  const [targetDonor, setTargetDonor] = useState('');
  const [donorStandard, setDonorStandard] = useState('un_oecd_dac');
  const [programStory, setProgramStory] = useState('');

  // Processing Animation State
  const [processingStep, setProcessingStep] = useState(0);

  // Page 2 State (Working variables)
  const [domainResponse, setDomainResponse] = useState<ProvisionalDomainResponse | null>(null);
  
  // User review decisions stored separately (Manual overrides and edits)
  const [acceptedSectors, setAcceptedSectors] = useState<string[]>([]);
  const [acceptedInterventions, setAcceptedInterventions] = useState<string[]>([]);
  const [acceptedSdgs, setAcceptedSdgs] = useState<number[]>([]);
  const [acceptedActorRoles, setAcceptedActorRoles] = useState<string[]>([]);
  
  const [blueprintEdits, setBlueprintEdits] = useState<Record<string, string>>({}); // itemId -> editedText
  const [ambiguityResolutions, setAmbiguityResolutions] = useState<Record<string, string>>({}); // ambiguityId -> resolvedValue
  const [missingInfoResolutions, setMissingInfoResolutions] = useState<Record<string, { answer?: string, state: string }>>({}); // infoId -> state

  // Disclosure states
  const [whyRecommendedOpen, setWhyRecommendedOpen] = useState<Record<string, boolean>>({});
  const [showRejectedSdgs, setShowRejectedSdgs] = useState(false);

  // Check if inputs have been modified since review started (review is stale)
  const [reviewIsStale, setReviewIsStale] = useState(false);

  // Timer Ref to prevent memory leaks on unmount
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
    };
  }, []);

  // Fetch Project context for database reference if needed (non-blocking)
  const { data: dbProject } = useQuery({
    queryKey: ['gw-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('gw_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Query organization details directly
  const { data: dbOrganization } = useQuery({
    queryKey: ['gw-organization', dbProject?.organization_id],
    queryFn: async () => {
      if (!dbProject?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', dbProject.organization_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!dbProject?.organization_id,
  });

  // Determine active organization details
  const orgName = dbOrganization?.name || "Profil organisasi belum tersedia";
  const orgType = dbOrganization?.description ? "Terdaftar" : "—";
  const isOrgComplete = !!(dbOrganization && dbOrganization.description && dbOrganization.website);

  // Load project defaults or restored wizard data
  useEffect(() => {
    if (dbProject) {
      const wd = (dbProject.wizard_data ?? {}) as SavedWizardData;
      
      if (Object.keys(wd).length > 0) {
        if (wd.proposedTitle !== undefined) setProposedTitle(wd.proposedTitle || '');
        if (wd.geography !== undefined) setGeography(wd.geography || '');
        if (wd.geographyUnknown !== undefined) setGeographyUnknown(!!wd.geographyUnknown);
        if (wd.durationMonths !== undefined) {
          setDurationMonths(wd.durationMonths === 'unknown' || wd.durationMonths === 'unentered' ? '' : wd.durationMonths);
        }
        if (wd.durationUnknown !== undefined) setDurationUnknown(!!wd.durationUnknown);
        if (wd.beneficiaryDescription !== undefined) setBeneficiaryDescription(wd.beneficiaryDescription || '');
        if (wd.beneficiaryCount !== undefined) {
          setBeneficiaryCount(wd.beneficiaryCount === 'unknown' || wd.beneficiaryCount === 'unentered' ? '' : wd.beneficiaryCount);
        }
        if (wd.beneficiaryCountUnknown !== undefined) setBeneficiaryCountUnknown(!!wd.beneficiaryCountUnknown);
        if (wd.budgetIdr !== undefined) {
          setBudgetIdr(wd.budgetIdr === 'unknown' || wd.budgetIdr === 'unentered' ? '' : wd.budgetIdr);
        }
        if (wd.budgetIdrUnknown !== undefined) setBudgetIdrUnknown(!!wd.budgetIdrUnknown);
        if (wd.targetDonor !== undefined) setTargetDonor(wd.targetDonor || '');
        if (wd.donorStandard !== undefined) setDonorStandard(wd.donorStandard || 'un_oecd_dac');
        if (wd.programStory !== undefined) setProgramStory(wd.programStory || '');
        
        if (wd.currentFlowPage !== undefined) setCurrentFlowPage(wd.currentFlowPage);
        if (wd.selectedFixtureId !== undefined) setSelectedFixtureId(wd.selectedFixtureId);
        if (wd.domainResponse !== undefined) setDomainResponse(wd.domainResponse);
        if (wd.acceptedSectors !== undefined) setAcceptedSectors(wd.acceptedSectors || []);
        if (wd.acceptedInterventions !== undefined) setAcceptedInterventions(wd.acceptedInterventions || []);
        if (wd.acceptedSdgs !== undefined) setAcceptedSdgs(wd.acceptedSdgs || []);
        if (wd.acceptedActorRoles !== undefined) setAcceptedActorRoles(wd.acceptedActorRoles || []);
        if (wd.blueprintEdits !== undefined) setBlueprintEdits(wd.blueprintEdits || {});
        if (wd.ambiguityResolutions !== undefined) setAmbiguityResolutions(wd.ambiguityResolutions || {});
        if (wd.missingInfoResolutions !== undefined) setMissingInfoResolutions(wd.missingInfoResolutions || {});
        if (wd.approvedSnapshot !== undefined) setApprovedSnapshot(wd.approvedSnapshot);
      } else {
        setProposedTitle(dbProject.title || '');
        setGeography(dbProject.geography || '');
        if (dbProject.duration_months) {
          setDurationMonths(dbProject.duration_months);
        } else if (dbProject.duration_months === null) {
          setDurationUnknown(true);
        }
        if (dbProject.budget_idr) {
          setBudgetIdr(dbProject.budget_idr);
        } else if (dbProject.budget_idr === null) {
          setBudgetIdrUnknown(true);
        }
        setTargetDonor(dbProject.target_donor || '');
        setDonorStandard(dbProject.donor_standard || 'un_oecd_dac');
      }
    }
  }, [dbProject]);

  // Genuine Supabase Draft Persistence implementation
  const saveDraft = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const existingWd = (dbProject?.wizard_data ?? {}) as Record<string, unknown>;
      const wizardData: SavedWizardData = {
        ...existingWd,
        proposedTitle,
        geography,
        geographyUnknown,
        durationMonths: durationUnknown ? 'unknown' : (durationMonths === '' ? 'unentered' : Number(durationMonths)),
        durationUnknown,
        beneficiaryDescription,
        beneficiaryCount: beneficiaryCountUnknown ? 'unknown' : (beneficiaryCount === '' ? 'unentered' : Number(beneficiaryCount)),
        beneficiaryCountUnknown,
        budgetIdr: budgetIdrUnknown ? 'unknown' : (budgetIdr === '' ? 'unentered' : Number(budgetIdr)),
        budgetIdrUnknown,
        targetDonor,
        donorStandard,
        programStory,
        
        currentFlowPage,
        selectedFixtureId,
        domainResponse: domainResponse || undefined,
        acceptedSectors,
        acceptedInterventions,
        acceptedSdgs,
        acceptedActorRoles,
        blueprintEdits,
        ambiguityResolutions,
        missingInfoResolutions,
        approvedSnapshot: approvedSnapshot || undefined
      };

      const { error } = await supabase
        .from('gw_projects')
        .update({ wizard_data: wizardData })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Draft Disimpan',
        description: 'Semua kemajuan formulir dan hasil peninjauan Anda berhasil disimpan secara aman ke database.',
      });
    } catch (err: unknown) {
      console.error('Error saving draft:', err);
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal saat menyimpan draft.';
      toast({
        title: 'Gagal Menyimpan Draft',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Setup scenario selections mapping
  const fixtureMap: Record<string, ProvisionalDomainResponse> = PROVISIONAL_FIXTURES;

  // Handle Form Submission Page 1 -> Processing State
  const handleTinjauBlueprint = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Validation
    if (!proposedTitle.trim()) {
      toast({
        title: 'Judul Program Wajib Diisi',
        description: 'Silakan isi judul program sebelum melanjutkan.',
        variant: 'destructive'
      });
      return;
    }
    if (!beneficiaryDescription.trim()) {
      toast({
        title: 'Deskripsi Penerima Manfaat Wajib Diisi',
        description: 'Silakan jelaskan siapa penerima manfaat program Anda.',
        variant: 'destructive'
      });
      return;
    }
    if (!programStory.trim()) {
      toast({
        title: 'Cerita Program Wajib Diisi',
        description: 'Program story membantu sistem memahami detail intervensi Anda.',
        variant: 'destructive'
      });
      return;
    }

    // Go to Processing state
    setCurrentFlowPage('processing');
    setProcessingStep(0);

    // Cancel any existing running timer
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }

    // Simulate progressive loading of deterministic context engine
    processingTimerRef.current = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev >= 4) {
          if (processingTimerRef.current) {
            clearInterval(processingTimerRef.current);
            processingTimerRef.current = null;
          }
          // Load adapted response based on chosen fixture
          const rawFixture = fixtureMap[selectedFixtureId];
          const adapted = adaptProvisionalResponse(rawFixture);
          
          setDomainResponse(adapted);
          
          // Pre-populate recommendations choices
          setAcceptedSectors(adapted.sectors.filter(s => s.level === 'primary' || s.level === 'secondary').map(s => s.id));
          setAcceptedInterventions(adapted.interventions.filter(i => i.level === 'primary' || i.level === 'secondary').map(i => i.id));
          setAcceptedSdgs(adapted.sdgs.filter(s => s.level === 'primary' || s.level === 'secondary').map(s => s.num));
          setAcceptedActorRoles(adapted.actorRoles.filter(a => a.level === 'primary' || a.level === 'secondary').map(a => a.id));
          
          // Clear previous edits
          setBlueprintEdits({});
          setAmbiguityResolutions({});
          setMissingInfoResolutions({});
          setReviewIsStale(false);
          
          // Go to Page 2
          setCurrentFlowPage('page2');
          return 4;
        }
        return prev + 1;
      });
    }, 450);
  };

  const processingMessages = [
    'Membaca informasi program...',
    'Mengidentifikasi konteks program...',
    'Menyusun rekomendasi sektor dan intervensi...',
    'Memeriksa keterkaitan SDG/TPB...',
    'Menyiapkan Program Blueprint...'
  ];

  // Helper toggle disclosure
  const toggleWhyRecommended = (id: string) => {
    setWhyRecommendedOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Check if there are any active blocking warnings/unresolved blocking info items
  const activeBlockers = useMemo(() => {
    if (!domainResponse) return [];
    const blockers: string[] = [];

    // 1. Missing information that is blocking and unresolved
    domainResponse.missingInformation.forEach(info => {
      if (info.blocking || info.requiredForApproval) {
        const resolution = missingInfoResolutions[info.id];
        if (!resolution || resolution.state === 'unresolved') {
          blockers.push(`Informasi Penting Belum Terjawab: "${info.question}"`);
        }
      }
    });

    // 2. Unresolved Ambiguities (only if requiredForApproval is true)
    domainResponse.ambiguities.forEach(amb => {
      if (amb.requiredForApproval) {
        const resolution = ambiguityResolutions[amb.id];
        if (!resolution) {
          blockers.push(`Ambiguitas Sektor Terdeteksi: Pilihlah salah satu opsi untuk "${amb.field}"`);
        }
      }
    });

    // 3. Strict blocking warnings without explicit user resolution paths are shown as warnings but DO NOT block approval

    return blockers;
  }, [domainResponse, missingInfoResolutions, ambiguityResolutions]);

  // Handle Approved Page 2 Snapshot
  const handleApproveBlueprint = () => {
    if (activeBlockers.length > 0) {
      toast({
        title: 'Penyetujuan Diblokir',
        description: 'Selesaikan semua kriteria kritis sebelum menyetujui blueprint.',
        variant: 'destructive'
      });
      return;
    }

    const numericDuration = durationUnknown ? 'unknown' : (durationMonths === '' ? 'unentered' : Number(durationMonths));
    const numericBeneficiaries = beneficiaryCountUnknown ? 'unknown' : (beneficiaryCount === '' ? 'unentered' : Number(beneficiaryCount));
    const numericBudget = budgetIdrUnknown ? 'unknown' : (budgetIdr === '' ? 'unentered' : Number(budgetIdr));

    // Compose Approved Page 2 Snapshot
    const snapshot: ApprovedPage2Snapshot = {
      programFacts: {
        proposedTitle,
        geography: geographyUnknown ? 'unknown' : geography,
        durationMonths: numericDuration,
        beneficiaryDescription,
        beneficiaryCount: numericBeneficiaries,
        budgetIdr: numericBudget,
        targetDonor,
        donorStandard,
        programStory
      },
      organization: {
        orgName,
        orgType,
        sdgFocus: []
      },
      originalRecommendations: {
        sectors: domainResponse?.sectors || [],
        interventions: domainResponse?.interventions || [],
        sdgs: domainResponse?.sdgs || [],
        actorRoles: domainResponse?.actorRoles || []
      },
      acceptedSectors,
      rejectedSectors: domainResponse?.sectors.map(s => s.id).filter(id => !acceptedSectors.includes(id)) || [],
      acceptedInterventions,
      rejectedInterventions: domainResponse?.interventions.map(i => i.id).filter(id => !acceptedInterventions.includes(id)) || [],
      acceptedSdgs,
      rejectedSdgs: domainResponse?.sdgs.map(s => s.num).filter(num => !acceptedSdgs.includes(num)) || [],
      acceptedActorRoles,
      rejectedActorRoles: domainResponse?.actorRoles.map(a => a.id).filter(id => !acceptedActorRoles.includes(id)) || [],
      
      blueprint: {
        items: domainResponse?.blueprint.items.map(item => ({
          ...item,
          text: blueprintEdits[item.id] || item.text,
          status: blueprintEdits[item.id] ? 'modified' : 'confirmed'
        })) || []
      },
      ambiguities: domainResponse?.ambiguities.map(amb => ({
        ...amb,
        resolvedValue: ambiguityResolutions[amb.id]
      })) || [],
      missingInformation: domainResponse?.missingInformation.map(info => ({
        ...info,
        resolvedValue: missingInfoResolutions[info.id]?.answer,
        resolutionState: (missingInfoResolutions[info.id]?.state || 'unresolved') as 'unresolved' | 'answered_with_evidence' | 'answered_with_assertion'
      })) || [],
      warnings: domainResponse?.warnings || [],
      
      contractVersion: domainResponse?.contractVersion || '1.2',
      engineVersion: domainResponse?.engineVersion || 'det-engine-v1.0',
      registryVersions: domainResponse?.registryVersions || {},
      approvalTimestamp: new Date().toISOString()
    };

    setApprovedSnapshot(snapshot);
    
    // Switch view to completed approved snapshot
    setCurrentFlowPage('approved');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header and Progress Indicator */}
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">AI Grantwriter</h1>
            <Badge className="bg-emerald-600 hover:bg-emerald-700">Deterministic Engine v1.2</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Formulasi Program Blueprint, SDG alignment, dan Validasi Logframe deterministik
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className={currentFlowPage === 'page1' ? 'text-primary border-b-2 border-primary pb-1' : ''}>Page 1: Masukan</span>
          <span>&rarr;</span>
          <span className={currentFlowPage === 'page2' ? 'text-primary border-b-2 border-primary pb-1' : ''}>Page 2: Review</span>
          <span>&rarr;</span>
          <span className={currentFlowPage === 'approved' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-1' : ''}>Persetujuan</span>
        </div>
      </div>

      {/* PAGE 1: INFORMASI INTI PROGRAM */}
      {currentFlowPage === 'page1' && (
        <form onSubmit={handleTinjauBlueprint} className="space-y-6">
          {/* Organization & Scenario Settings */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Profil Organisasi Aktif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{orgName}</span>
                  <Badge variant="outline">{orgType}</Badge>
                </div>
                {!isOrgComplete && (
                  <Alert className="border-amber-200 bg-amber-50/40 p-3 text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-xs">
                      Profil organisasi belum tersedia atau belum lengkap. Beberapa informasi default terpaksa menggunakan deteksi sistem.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Development Fixture Selector (Only available in DEV mode) */}
            {isDev ? (
              <Card className="border-indigo-100 bg-indigo-50/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-700">Development Fixture Simulator</CardTitle>
                    <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-800">Dev Only</Badge>
                  </div>
                  <CardDescription className="text-xs text-indigo-600 font-semibold">
                    Development Preview — bukan hasil analisis aktual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="selected-fixture" className="text-xs text-slate-500 font-semibold">Pilih Skenario Hasil Engine</Label>
                  <select
                    id="selected-fixture"
                    value={selectedFixtureId}
                    onChange={(e) => setSelectedFixtureId(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="FIX-DEV-HC-1">High Confidence Scenario (Pertanian Organik)</option>
                    <option value="FIX-DEV-SA-2">Sector Ambiguity Scenario (UMKM vs Koperasi Pertanian)</option>
                    <option value="FIX-DEV-AR-3">Actor Role Distinction (Siswa vs Guru SD)</option>
                    <option value="FIX-DEV-SB-4">Scope Too Broad (SDG Stuffing & Blocking Warning)</option>
                  </select>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-indigo-100 bg-indigo-50/20">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Deterministic Engine Status</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Deterministic Context Mapping Engine v1.2 saat ini sedang berada dalam masa kualifikasi (Mechanical Acceptance Audit) dan belum diaktifkan di production. Untuk kelancaran penyusunan proposal, silakan gunakan OECD-DAC Standard Wizard terlebih dahulu.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Program Information Inputs */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Detail Rencana Program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Judul */}
              <div>
                <Label htmlFor="program-title" className="font-semibold">Judul Program *</Label>
                <Input
                  id="program-title"
                  placeholder="cth. Pengembangan Livelihood Petani Beras Organik"
                  value={proposedTitle}
                  onChange={(e) => {
                    setProposedTitle(e.target.value);
                    setReviewIsStale(true);
                  }}
                  required
                  className="mt-1"
                />
              </div>

              {/* Lokasi & Durasi */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="program-geography" className="font-semibold">Lokasi Program</Label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={geographyUnknown}
                        onChange={(e) => {
                          setGeographyUnknown(e.target.checked);
                          if (e.target.checked) setGeography('');
                          setReviewIsStale(true);
                        }}
                        className="rounded border-slate-300"
                      />
                      Belum diketahui
                    </label>
                  </div>
                  <Input
                    id="program-geography"
                    placeholder="cth. Kabupaten Sleman, DIY"
                    value={geography}
                    onChange={(e) => {
                      setGeography(e.target.value);
                      setReviewIsStale(true);
                    }}
                    disabled={geographyUnknown}
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="program-duration" className="font-semibold">Durasi Program (Bulan)</Label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={durationUnknown}
                        onChange={(e) => {
                          setDurationUnknown(e.target.checked);
                          if (e.target.checked) setDurationMonths('');
                          setReviewIsStale(true);
                        }}
                        className="rounded border-slate-300"
                      />
                      Belum diketahui
                    </label>
                  </div>
                  <Input
                    id="program-duration"
                    type="number"
                    min="1"
                    placeholder="cth. 12"
                    value={durationMonths}
                    onChange={(e) => {
                      setDurationMonths(e.target.value === '' ? '' : Number(e.target.value));
                      setReviewIsStale(true);
                    }}
                    disabled={durationUnknown}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Penerima Manfaat Deskripsi & Jumlah */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="beneficiary-description" className="font-semibold">Kelompok Sasaran Penerima Manfaat *</Label>
                  <Input
                    id="beneficiary-description"
                    placeholder="cth. Petani sawah tadah hujan skala kecil"
                    value={beneficiaryDescription}
                    onChange={(e) => {
                      setBeneficiaryDescription(e.target.value);
                      setReviewIsStale(true);
                    }}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="beneficiary-count" className="font-semibold">Target Jumlah Penerima (Orang)</Label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={beneficiaryCountUnknown}
                        onChange={(e) => {
                          setBeneficiaryCountUnknown(e.target.checked);
                          if (e.target.checked) setBeneficiaryCount('');
                          setReviewIsStale(true);
                        }}
                        className="rounded border-slate-300"
                      />
                      Belum diketahui
                    </label>
                  </div>
                  <Input
                    id="beneficiary-count"
                    type="number"
                    min="1"
                    placeholder="cth. 50"
                    value={beneficiaryCount}
                    onChange={(e) => {
                      setBeneficiaryCount(e.target.value === '' ? '' : Number(e.target.value));
                      setReviewIsStale(true);
                    }}
                    disabled={beneficiaryCountUnknown}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Anggaran & Donor Standard */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="budget-idr" className="font-semibold">Perkiraan Anggaran Program (IDR)</Label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={budgetIdrUnknown}
                        onChange={(e) => {
                          setBudgetIdrUnknown(e.target.checked);
                          if (e.target.checked) setBudgetIdr('');
                          setReviewIsStale(true);
                        }}
                        className="rounded border-slate-300"
                      />
                      Belum diketahui
                    </label>
                  </div>
                  <Input
                    id="budget-idr"
                    type="number"
                    min="1"
                    placeholder="cth. 150000000"
                    value={budgetIdr}
                    onChange={(e) => {
                      setBudgetIdr(e.target.value === '' ? '' : Number(e.target.value));
                      setReviewIsStale(true);
                    }}
                    disabled={budgetIdrUnknown}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="target-donor" className="font-semibold">Target Institusi Donor / Filantropi</Label>
                  <Input
                    id="target-donor"
                    placeholder="cth. Ford Foundation atau DFAT"
                    value={targetDonor}
                    onChange={(e) => {
                      setTargetDonor(e.target.value);
                      setReviewIsStale(true);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Standar Donor Kebijakan */}
              <div>
                <Label htmlFor="donor-standard" className="font-semibold">Standar Pelaporan Kebijakan</Label>
                <select
                  id="donor-standard"
                  value={donorStandard}
                  onChange={(e) => {
                    setDonorStandard(e.target.value);
                    setReviewIsStale(true);
                  }}
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="un_oecd_dac">OECD-DAC Standard (Sektor & Kelompok Sasaran PBB)</option>
                  <option value="eu_dev_standard">EU International Partnership Reporting Standard</option>
                  <option value="national_bappenas">Standar Pemetaan RAD SDG Bappenas RI</option>
                </select>
              </div>

              {/* Program Story */}
              <div>
                <Label htmlFor="program-story" className="font-semibold">Cerita Program (Program Story) *</Label>
                <p className="text-xs text-slate-500 mb-1.5">
                  Tuliskan cerita lengkap bagaimana program ini direncanakan dan dijalankan.
                </p>
                <Textarea
                  id="program-story"
                  rows={6}
                  placeholder="Jelaskan:
1. Masalah utama apa yang ingin diselesaikan?
2. Siapa kelompok yang paling terdampak oleh masalah tersebut?
3. Siapa sajakah pihak yang perlu mengubah perilakunya (target aktor)?
4. Perubahan apa saja yang diharapkan terjadi?
5. Kegiatan atau bentuk intervensi apa yang direncanakan?"
                  value={programStory}
                  onChange={(e) => {
                    setProgramStory(e.target.value);
                    setReviewIsStale(true);
                  }}
                  required
                  className="mt-1 font-mono text-xs leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action CTA Page 1 */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || !projectId}
              onClick={saveDraft}
              className="font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-9"
            >
              {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Simpan Draft
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" asChild className="text-xs h-9 font-semibold">
                <Link to="/dashboard/grant-writer">Batal & Kembali</Link>
              </Button>
              <Button 
                type="submit" 
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9"
                disabled={!isDev}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Tinjau Program Blueprint
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* INTERACTIVE PROCESSING STATE */}
      {currentFlowPage === 'processing' && (
        <Card className="mx-auto max-w-xl border-slate-200 py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-slate-100 dark:bg-slate-800 animate-ping opacity-75"></div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Konteks Deterministik sedang Ditinjau</h3>
              <p className="text-sm text-slate-500">Sistem memetakan input program Anda terhadap Registry Ontologi v1.2</p>
            </div>

            {/* Sequence Status Messages */}
            <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/20 rounded-lg p-4 space-y-3.5 border border-slate-200">
              {processingMessages.map((msg, idx) => {
                const isCompleted = idx < processingStep;
                const isActive = idx === processingStep;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                    <span className={isCompleted ? 'text-slate-400 line-through' : isActive ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                      {msg}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 text-indigo-500 animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-200 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PAGE 2: REVIEW BOARD AND DETERMINISTIC RECOMMENDATIONS */}
      {currentFlowPage === 'page2' && domainResponse && (
        <div className="space-y-6">
          {/* Stale Warning Header */}
          {reviewIsStale && (
            <Alert variant="warning" className="border-orange-300 bg-orange-50/50">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <AlertTitle className="font-bold text-orange-900">Masukan Formulir Diubah</AlertTitle>
                <AlertDescription className="text-xs text-orange-700 leading-relaxed">
                  Anda telah mengubah detail masukan rencana program di Page 1. Blueprint program di bawah ini didasarkan pada draf analisis sebelumnya. Tekan tombol <strong>"Analisis Ulang"</strong> untuk memproses ulang blueprint yang akurat.
                </AlertDescription>
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="xs" onClick={handleTinjauBlueprint} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-7 text-[10px]">
                  Analisis Ulang Sesuai Perubahan &rarr;
                </Button>
              </div>
            </Alert>
          )}

          {/* Ontological Validation Warning Panel */}
          {domainResponse.warnings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ontological Validation Alerts</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {domainResponse.warnings.map(warn => {
                  const isBlocking = warn.severity === 'blocking';
                  const isImportant = warn.severity === 'important';
                  const isReview = warn.severity === 'needs_review';
                  return (
                    <div
                      key={warn.id}
                      className={`flex gap-3 rounded-lg border p-4 text-sm shadow-sm ${
                        isBlocking 
                          ? 'border-rose-200 bg-rose-50/50 text-rose-900' 
                          : isImportant
                          ? 'border-orange-200 bg-orange-50/50 text-orange-900'
                          : isReview
                          ? 'border-amber-200 bg-amber-50/50 text-amber-900'
                          : 'border-slate-200 bg-slate-50 text-slate-800'
                      }`}
                    >
                      {isBlocking ? (
                        <AlertOctagon className="h-5 w-5 shrink-0 text-rose-500" />
                      ) : isImportant ? (
                        <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
                      ) : (
                        <Info className="h-5 w-5 shrink-0 text-indigo-500" />
                      )}
                      <div>
                        <span className="block text-xs font-bold tracking-wider uppercase text-slate-400">{warn.code} · {warn.severity}</span>
                        <p className="mt-0.5 font-medium leading-relaxed">{warn.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Program Facts Summary */}
          <Card className="border-slate-200 bg-slate-50/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-md font-bold text-slate-800">Ringkasan Fakta Masukan (Page 1)</CardTitle>
                <CardDescription className="text-xs">Fakta program yang diuji dalam sistem deterministik</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCurrentFlowPage('page1')} className="h-8 text-xs font-semibold">
                Kembali & Edit Masukan
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-400 block font-semibold">JUDUL PROGRAM</span>
                  <span className="font-semibold text-slate-800 block truncate">{proposedTitle}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">LOKASI</span>
                  <span className="font-semibold text-slate-800 block truncate">{geographyUnknown ? 'Belum diketahui' : geography || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">DURASI</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {durationUnknown || durationMonths === 'unknown' ? 'Belum diketahui' : (durationMonths === 'unentered' || durationMonths === '' ? 'Belum diisi' : `${durationMonths} Bulan`)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">ANGGARAN</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {budgetIdrUnknown || budgetIdr === 'unknown' ? 'Belum diketahui' : (budgetIdr === 'unentered' || budgetIdr === '' ? 'Belum diisi' : `Rp ${Number(budgetIdr).toLocaleString('id-ID')}`)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detected Context & Overrides Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: Sectors & Interventions */}
            <div className="space-y-6">
              {/* Sector Recommendations */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Rekomendasi Sektor Program</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {domainResponse.sectors.map(sec => {
                    const isAccepted = acceptedSectors.includes(sec.id);
                    return (
                      <div key={sec.id} className="rounded-lg border p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{sec.label}</span>
                            <Badge variant={sec.level === 'primary' ? 'default' : sec.level === 'secondary' ? 'secondary' : 'warning'}>
                              {sec.level}
                            </Badge>
                          </div>
                          
                          {/* User Override Decisions */}
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="xs"
                              variant={isAccepted ? 'default' : 'outline'}
                              onClick={() => {
                                if (isAccepted) {
                                  setAcceptedSectors(prev => prev.filter(id => id !== sec.id));
                                } else {
                                  setAcceptedSectors(prev => [...prev, sec.id]);
                                }
                              }}
                              className="text-xs"
                            >
                              {isAccepted ? 'Diterima' : 'Terima'}
                            </Button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500">{sec.explanation}</p>
                        
                        {/* Why recommended disclose */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => toggleWhyRecommended(sec.id)}
                            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                          >
                            <span>Mengapa ini direkomendasikan?</span>
                            {whyRecommendedOpen[sec.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          
                          {whyRecommendedOpen[sec.id] && (
                            <div className="mt-2 rounded bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1 border">
                              <span className="font-semibold block uppercase text-[9px] text-slate-400">Bukti Temuan (Evidence Span)</span>
                              <blockquote className="italic border-l-2 pl-2 border-slate-300">"{sec.evidence?.text}"</blockquote>
                              <span className="block mt-1 font-semibold text-slate-500">Tingkat Keyakinan: {sec.confidence === 'high' ? 'Keyakinan tinggi' : sec.confidence === 'medium' ? 'Perkiraan' : 'Perlu dikonfirmasi'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Interventions (Archetypes) */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Arketipe Intervensi Prioritas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {domainResponse.interventions.map(act => {
                    const isAccepted = acceptedInterventions.includes(act.id);
                    return (
                      <div key={act.id} className="rounded-lg border p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{act.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{act.id}</span>
                          </div>
                          
                          <Button
                            type="button"
                            size="xs"
                            variant={isAccepted ? 'default' : 'outline'}
                            onClick={() => {
                              if (isAccepted) {
                                  setAcceptedInterventions(prev => prev.filter(id => id !== act.id));
                              } else {
                                  setAcceptedInterventions(prev => [...prev, act.id]);
                              }
                            }}
                          >
                            {isAccepted ? 'Aktif' : 'Gunakan'}
                          </Button>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">{act.explanation}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right: SDGs & Actor Roles */}
            <div className="space-y-6">
              {/* SDG Alignment */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Penyelarasan SDG / TPB</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Recommended SDGs */}
                  {domainResponse.sdgs.filter(s => s.level !== 'rejected').map(sdg => {
                    const isAccepted = acceptedSdgs.includes(sdg.num);
                    return (
                      <div key={sdg.num} className="rounded-lg border p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex gap-2">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm font-bold text-white shadow-sm"
                              style={{ backgroundColor: SDG_COLORS[sdg.num] || '#94A3B8' }}
                            >
                              {sdg.num}
                            </span>
                            <div>
                              <span className="font-bold text-slate-800 text-sm block">{sdg.label}</span>
                              <span className="text-[10px] text-slate-400 block font-semibold uppercase">{sdg.level} alignment</span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="xs"
                            variant={isAccepted ? 'default' : 'outline'}
                            onClick={() => {
                              if (isAccepted) {
                                setAcceptedSdgs(prev => prev.filter(n => n !== sdg.num));
                              } else {
                                setAcceptedSdgs(prev => [...prev, sdg.num]);
                              }
                            }}
                          >
                            {isAccepted ? 'Terpilih' : 'Pilih'}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">{sdg.explanation}</p>
                      </div>
                    );
                  })}

                  {/* Rejected SDGs disclosure */}
                  {domainResponse.sdgs.some(s => s.level === 'rejected') && (
                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setShowRejectedSdgs(!showRejectedSdgs)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        <span>Mengapa tujuan lain tidak direkomendasikan?</span>
                        {showRejectedSdgs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {showRejectedSdgs && (
                        <div className="mt-2 space-y-2">
                          {domainResponse.sdgs.filter(s => s.level === 'rejected').map(sdg => (
                            <div key={sdg.num} className="rounded bg-rose-50/40 p-2.5 text-xs text-rose-950 border border-rose-200">
                              <span className="font-bold block">SDG {sdg.num}: {sdg.label} (Ditolak)</span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{sdg.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actor Roles Distinction */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Peta & Peran Aktor Kunci</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {domainResponse.actorRoles.map(actor => {
                    const isAccepted = acceptedActorRoles.includes(actor.id);
                    return (
                      <div key={actor.id} className="rounded-lg border p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{actor.actorName}</span>
                            <Badge variant="outline" className="text-[10px] mt-0.5">
                              {actor.role.replace('_', ' ')}
                            </Badge>
                          </div>

                          <Button
                            type="button"
                            size="xs"
                            variant={isAccepted ? 'default' : 'outline'}
                            onClick={() => {
                              if (isAccepted) {
                                setAcceptedActorRoles(prev => prev.filter(id => id !== actor.id));
                              } else {
                                setAcceptedActorRoles(prev => [...prev, actor.id]);
                              }
                            }}
                          >
                            {isAccepted ? 'Konfirmasi' : 'Konfirmasi'}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">{actor.explanation}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ambiguity Resolvers Section */}
          {domainResponse.ambiguities.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Resolusi Ambiguitas Diperlukan
                </CardTitle>
                <p className="text-xs text-slate-500">Sistem mendeteksi tumpang tindih logika. Anda wajib menetapkan opsi pilihan secara eksplisit.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {domainResponse.ambiguities.map(amb => {
                  const resolved = ambiguityResolutions[amb.id];
                  return (
                    <div key={amb.id} className="rounded-lg border bg-white p-4 space-y-3 shadow-sm">
                      <div>
                        <span className="font-bold text-sm text-slate-800 block">Klasifikasi Bidang: {amb.field.toUpperCase()}</span>
                        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{amb.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {amb.candidates.map(cand => {
                          const active = resolved === cand;
                          return (
                            <button
                              key={cand}
                              type="button"
                              onClick={() => setAmbiguityResolutions(prev => ({ ...prev, [amb.id]: cand }))}
                              className={`rounded-md px-3 py-1.5 text-xs font-semibold border transition-all ${
                                active
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              {cand}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Program Blueprint (SMART facts blocks with edit actions) */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-md font-bold text-slate-800">Program Blueprint (Logframe Foundations)</CardTitle>
              <CardDescription className="text-xs">Sari pati draf LFA berdasarkan logika kausalitas program</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {domainResponse.blueprint.items.map(item => {
                  const currentText = blueprintEdits[item.id] !== undefined ? blueprintEdits[item.id] : item.text;
                  const isModified = blueprintEdits[item.id] !== undefined && blueprintEdits[item.id] !== item.text;
                  
                  return (
                    <div key={item.id} className="rounded-lg border p-4 space-y-2 bg-white relative">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-600 block">{item.section}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          {isModified ? 'Diubah manual' : item.status === 'from_source' ? 'Dari informasi Anda' : item.status === 'inferred' ? 'Perkiraan sistem' : 'Sudah dikonfirmasi'}
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        value={currentText}
                        onChange={(e) => setBlueprintEdits(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed rounded border-slate-200 p-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-300 border focus:border-slate-300 outline-none resize-none"
                      />

                      {/* Potensial partner label as requested */}
                      {item.section === 'Suggested Partners' && (
                        <span className="text-[10px] font-bold text-amber-600 block">Mitra potensial — perlu dikonfirmasi</span>
                      )}

                      {/* Revert option if modified */}
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => {
                            setBlueprintEdits(prev => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                        >
                          <Undo2 className="h-3 w-3" /> Kembalikan ke asal
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Missing Information Resolvers */}
          {domainResponse.missingInformation.length > 0 && (
            <Card className="border-indigo-200 bg-indigo-50/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                  <QuestionIcon className="h-4 w-4" /> Pertanyaan Tambahan Pendukung (Missing Information)
                </CardTitle>
                <p className="text-xs text-slate-500">Lengkapi data berikut untuk menaikkan nilai skor keterpercayaan dan koherensi usulan.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {domainResponse.missingInformation.map(info => {
                  const state = missingInfoResolutions[info.id]?.state || 'unresolved';
                  const answer = missingInfoResolutions[info.id]?.answer || '';
                  const isBlocking = info.blocking || info.requiredForApproval;

                  return (
                    <div key={info.id} className="rounded-lg border bg-white p-4 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs uppercase tracking-wide text-indigo-500">{info.priority}</span>
                            {isBlocking && <Badge variant="destructive" className="text-[9px]">blocking</Badge>}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">{info.question}</p>
                        </div>
                        
                        <select
                          value={state}
                          onChange={(e) => {
                            const nextState = e.target.value;
                            setMissingInfoResolutions(prev => ({
                              ...prev,
                              [info.id]: {
                                ...prev[info.id],
                                state: nextState,
                                ...(nextState === 'accepted_unknown' ? { answer: 'Belum diketahui' } : {})
                              }
                            }));
                          }}
                          className="rounded border border-slate-200 bg-slate-50 p-1 text-[11px] font-semibold text-slate-600 outline-none"
                        >
                          <option value="unresolved">Unresolved</option>
                          <option value="answered">Answered</option>
                          <option value="accepted_unknown">Sebut Belum Diketahui</option>
                          <option value="not_applicable">N/A</option>
                        </select>
                      </div>

                      {state === 'answered' && (
                        <Input
                          placeholder="Tuliskan jawaban klarifikasi Anda disini..."
                          value={answer}
                          onChange={(e) => setMissingInfoResolutions(prev => ({
                            ...prev,
                            [info.id]: { ...prev[info.id], answer: e.target.value }
                          }))}
                          className="text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Action CTAs Page 2 (Validation, Draft, Approval) */}
          <div className="border-t pt-5 space-y-4">
            {/* Blocker alert if exists */}
            {activeBlockers.length > 0 && (
              <Alert variant="destructive" className="border-rose-300 bg-rose-50/50">
                <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />
                <AlertTitle className="font-bold text-rose-800">Persetujuan Diblokir ({activeBlockers.length})</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p className="font-medium text-rose-700">Selesaikan isu kritis berikut sebelum melanjutkan penyetujuan blueprint:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-rose-600">
                    {activeBlockers.map((blk, i) => <li key={i}>{blk}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setCurrentFlowPage('page1')} className="text-slate-500 hover:bg-slate-100 font-semibold text-xs h-9">
                &larr; Kembali & Edit Informasi Inti
              </Button>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || !projectId}
                  onClick={saveDraft}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-9 font-semibold"
                >
                  {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Simpan Draft
                </Button>

                <Button
                  type="button"
                  onClick={handleApproveBlueprint}
                  disabled={activeBlockers.length > 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Setujui Blueprint & Lanjutkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERSATUAN DAN HANDOFF BOUNDARY */}
      {currentFlowPage === 'approved' && approvedSnapshot && (
        <Card className="border-emerald-200 bg-emerald-50/10 py-8 px-6 text-center space-y-6">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-emerald-900">Blueprint Program Disetujui!</h2>
              <p className="text-sm text-emerald-700 font-medium">
                Blueprint disetujui untuk sesi ini dan siap menjadi handoff setelah integrasi engine tersedia.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-white p-4 max-w-md text-left text-xs space-y-2 shadow-sm">
              <span className="font-bold text-emerald-800 uppercase block tracking-wider text-[10px]">Handoff Metadata Snapshot</span>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span>Contract Version:</span>
                <span className="font-bold text-right text-slate-800">{approvedSnapshot.contractVersion}</span>
                
                <span>Primary SDG:</span>
                <span className="font-bold text-right text-slate-800">
                  {approvedSnapshot.acceptedSdgs && approvedSnapshot.acceptedSdgs[0] ? `SDG ${approvedSnapshot.acceptedSdgs[0]}` : '—'}
                </span>

                <span>Active Sectors:</span>
                <span className="font-bold text-right text-slate-800 truncate">
                  {approvedSnapshot.acceptedSectors ? approvedSnapshot.acceptedSectors.length : 0} Sektor terpilih
                </span>
                
                <span>Timestamp:</span>
                <span className="font-bold text-right text-slate-800 truncate">
                  {new Date(approvedSnapshot.approvalTimestamp).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>

            <Alert className="border-indigo-100 bg-indigo-50/50 p-4 max-w-lg text-left text-xs">
              <Sparkles className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <AlertTitle className="font-bold text-indigo-900">Golden Generation Handoff Boundary</AlertTitle>
                <AlertDescription className="text-indigo-700 leading-relaxed mt-1">
                  Blueprint disetujui dan siap digunakan sebagai konteks penyusunan proposal. Kerangka logframe saat ini aman dari halusinasi model. Pemanggilan API LLM (Azure OpenAI / GPT-5.5) hanya diizinkan melintasi batas handoff pasca persetujuan ini.
                </AlertDescription>
              </div>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentFlowPage('page2')} className="text-slate-600 font-semibold h-9">
                Tinjau Ulang Blueprint
              </Button>
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-9" onClick={() => navigate('/dashboard/grant-writer')}>
                Selesai & Kembali ke Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
