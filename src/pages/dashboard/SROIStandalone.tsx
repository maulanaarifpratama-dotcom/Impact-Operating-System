// src/pages/dashboard/SROIStandalone.tsx
// standalone SROI Calculator route /dashboard/sroi with local React state only.
// Dual mode (Simple vs Professional Mode), LFA pre-fill capability, and Indonesian SROI Proxy database.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SROI_PROXIES_INDONESIA, SROI_SECTORS } from '@/data/sroi-proxies-indonesia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import {
  TrendingUp,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Info,
  HelpCircle,
  Check,
  ExternalLink,
  ArrowRight,
  Download,
  Building2,
  MapPin,
  Users,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface StandaloneOutcome {
  id: string;
  meal_item_id?: string | null;
  outcome_name: string;
  quantity: number;
  unit: string;
  proxy_value_idr: number;
  proxy_source: string;
  proxy_citation?: string;
  proxy_category: string;
  duration_years: number;
  attribution_pct: number; // Simple: 80% (fixed by default or adjustable in pro)
  deadweight_pct: number;  // Simple: 20%
  displacement_pct: number;// Simple: 0%
  dropoff_pct_per_year: number; // Simple: 0%
}

export default function SROIStandalone() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Core State ---
  const [mode, setMode] = useState<'simple' | 'professional'>('simple');
  const [programName, setProgramName] = useState<string>('');
  const [sector, setSector] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [totalInvestmentIdr, setTotalInvestmentIdr] = useState<number>(0);
  const [durationYears, setDurationYears] = useState<number>(1);
  const [beneficiaryCount, setBeneficiaryCount] = useState<number>(0);
  const [discountRate, setDiscountRate] = useState<number>(0.035); // 3.5% default

  // LFA Projects list for optional connection
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('manual');
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

  // Outcomes array (starts empty)
  const [outcomes, setOutcomes] = useState<StandaloneOutcome[]>([]);

  // Fetch projects on load
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('lfa_projects')
          .select('id, name, duration_months, sector, beneficiary_count, location')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setProjects(data);
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    void loadProjects();
  }, []);

  // --- Actions ---
  const handleAddOutcome = () => {
    const id = `outcome-${Date.now()}`;
    const defaultSector = sector || 'Pendidikan';
    const defaultProxy = SROI_PROXIES_INDONESIA.find(p => p.category === defaultSector) || SROI_PROXIES_INDONESIA[0];

    const newOutcome: StandaloneOutcome = {
      id,
      outcome_name: 'Outcome baru SROI',
      quantity: 10,
      unit: 'orang',
      proxy_value_idr: defaultProxy.value_idr,
      proxy_source: defaultProxy.source,
      proxy_citation: defaultProxy.citation,
      proxy_category: defaultSector,
      duration_years: durationYears,
      attribution_pct: 80,
      deadweight_pct: 20,
      displacement_pct: 0,
      dropoff_pct_per_year: 0
    };

    setOutcomes([...outcomes, newOutcome]);
    toast({
      title: 'Outcome Ditambahkan ➕',
      description: 'Isi indikator outcome dan pilih proxy yang relevan.'
    });
  };

  const handleRemoveOutcome = (id: string) => {
    setOutcomes(outcomes.filter(o => o.id !== id));
    toast({
      title: 'Outcome Dihapus 🗑️',
      description: 'Outcome berhasil dihapus dari daftar perhitungan.'
    });
  };

  const handleResetCalculator = () => {
    setMode('simple');
    setProgramName('Program Pemberdayaan Masyarakat');
    setSector('Pendidikan');
    setLocation('');
    setTotalInvestmentIdr(100000000);
    setDurationYears(3);
    setBeneficiaryCount(100);
    setDiscountRate(0.035);
    setSelectedProjectId('manual');
    setOutcomes([
      {
        id: 'outcome-1',
        outcome_name: 'Peningkatan literasi dasar anak usia dini',
        quantity: 25,
        unit: 'anak',
        proxy_value_idr: 4200000,
        proxy_source: 'Kementerian Pendidikan & Studi Dampak NGO',
        proxy_citation: 'Estimasi biaya les/bimbingan belajar membaca intensif non-formal lokal per tahun.',
        proxy_category: 'Pendidikan',
        duration_years: 3,
        attribution_pct: 80,
        deadweight_pct: 20,
        displacement_pct: 0,
        dropoff_pct_per_year: 0
      }
    ]);
    toast({
      title: 'Kalkulator Berhasil Direset 🔄',
      description: 'Semua input kembali ke nilai default manual.'
    });
  };

  const handleConnectProject = async (projId: string) => {
    if (projId === 'manual') {
      setSelectedProjectId('manual');
      return;
    }

    const proj = projects.find(p => p.id === projId);
    if (!proj) return;

    setSelectedProjectId(projId);
    setProgramName(proj.name);
    setSector(proj.sector || 'Pendidikan');
    setLocation(proj.location || '');
    setBeneficiaryCount(proj.beneficiary_count || 100);

    const durMonths = proj.duration_months || 12;
    const computedYears = Math.max(1, Math.ceil(durMonths / 12));
    setDurationYears(computedYears);

    try {
      // 1. Fetch budget items to estimate investment
      const { data: budgetItems, error: bgtErr } = await supabase
        .from('lfa_budget_items')
        .select('volume, unit_price_idr')
        .eq('lfa_project_id', projId);

      if (bgtErr) throw bgtErr;

      let totalBudgetCost = 0;
      if (budgetItems) {
        totalBudgetCost = budgetItems.reduce((sum, item) => sum + (item.volume * item.unit_price_idr), 0);
      }
      setTotalInvestmentIdr(totalBudgetCost || 100000000);

      // 2. Fetch MEAL items to pre-fill outcomes
      const { data: mealItems, error: mealErr } = await supabase
        .from('lfa_meal_items')
        .select('id, indicator_text, target_value, target_unit')
        .eq('lfa_project_id', projId);

      if (mealErr) throw mealErr;

      if (mealItems && mealItems.length > 0) {
        const imported = mealItems.map((item, idx) => {
          const defaultProxy = SROI_PROXIES_INDONESIA.find(p => p.category.toLowerCase() === (proj.sector || '').toLowerCase()) || 
                               SROI_PROXIES_INDONESIA[0];
          return {
            id: `imported-${item.id}-${idx}`,
            meal_item_id: item.id,
            outcome_name: item.indicator_text,
            quantity: item.target_value || 10,
            unit: item.target_unit || 'orang',
            proxy_value_idr: defaultProxy.value_idr,
            proxy_source: defaultProxy.source,
            proxy_citation: defaultProxy.citation,
            proxy_category: proj.sector || 'Pendidikan',
            attribution_pct: 80,
            deadweight_pct: 20,
            displacement_pct: 0,
            dropoff_pct_per_year: 0,
            duration_years: computedYears
          };
        });
        setOutcomes(imported);
        toast({
          title: 'Koneksi Sukses 🔗',
          description: `Berhasil mengimpor total anggaran & ${imported.length} outcome dari MEAL.`
        });
      } else {
        setOutcomes([]);
        toast({
          title: 'Koneksi Sukses 🔗',
          description: `Berhasil mengimpor anggaran. Belum ada indikator MEAL yang terdaftar.`
        });
      }
    } catch (err: any) {
      console.error('Error importing project data:', err);
      toast({
        title: 'Gagal Impor Data',
        description: err.message || 'Gagal mengambil data anggaran/MEAL dari program terpilih.',
        variant: 'destructive'
      });
    }
  };

  const handleApplyProxyReference = (outcomeId: string, ref: typeof SROI_PROXIES_INDONESIA[0]) => {
    setOutcomes(outcomes.map(out => {
      if (out.id === outcomeId) {
        return {
          ...out,
          proxy_value_idr: ref.value_idr,
          proxy_source: ref.source,
          proxy_citation: ref.citation,
          proxy_category: ref.category
        };
      }
      return out;
    }));
    toast({
      title: 'Proxy Diaplikasikan 📋',
      description: `Nilai: Rp ${ref.value_idr.toLocaleString('id-ID')}`
    });
  };

  // --- Calculations ---
  const calculateOutcomeMetrics = (out: StandaloneOutcome) => {
    const gross = out.quantity * out.proxy_value_idr;
    const net = gross * (out.attribution_pct / 100) * (1 - out.deadweight_pct / 100) * (1 - out.displacement_pct / 100);

    let presentValueTotal = 0;
    const yearsArr: { year: number; value: number; pv: number }[] = [];
    
    for (let year = 1; year <= out.duration_years; year++) {
      const yearVal = net * Math.pow(1 - out.dropoff_pct_per_year / 100, year - 1);
      const presentValYear = yearVal / Math.pow(1 + discountRate, year);
      presentValueTotal += presentValYear;
      yearsArr.push({ year, value: yearVal, pv: presentValYear });
    }

    return {
      gross_value: gross,
      present_value: presentValueTotal,
      yearly_details: yearsArr
    };
  };

  let totalGrossSocialValue = 0;
  let totalPresentSocialValue = 0;

  const calculatedOutcomes = outcomes.map(out => {
    const { gross_value, present_value, yearly_details } = calculateOutcomeMetrics(out);
    totalGrossSocialValue += gross_value;
    totalPresentSocialValue += present_value;

    return {
      ...out,
      gross_value_idr: gross_value,
      present_value_idr: present_value,
      yearly_details
    };
  });

  const sroiRatio = totalInvestmentIdr > 0 ? parseFloat((totalPresentSocialValue / totalInvestmentIdr).toFixed(2)) : 0;

  // Visual Gauge Speedometer Details
  const getSpeedometerDetails = (ratio: number) => {
    let color = '#EF4444'; // Red
    let label = 'Dampak Rendah';
    let minMax = 'Rasio < 1.0';
    let needleDeg = -90; // Default flat left

    if (ratio < 1) {
      // Map ratio 0-1 to deg -90 to -45
      needleDeg = -90 + (ratio * 45);
    } else if (ratio >= 1 && ratio < 2) {
      color = 'brand-amber'; // Orange
      label = 'Dampak Cukup';
      minMax = 'Rasio 1.0 - 2.0';
      // Map ratio 1-2 to deg -45 to 0
      needleDeg = -45 + ((ratio - 1) * 45);
    } else if (ratio >= 2 && ratio <= 4) {
      color = '#10B981'; // Green
      label = 'Dampak Tinggi';
      minMax = 'Rasio 2.0 - 4.0';
      // Map ratio 2-4 to deg 0 to 45
      needleDeg = 0 + (((ratio - 2) / 2) * 45);
    } else {
      color = '#3B82F6'; // Blue
      label = 'Dampak Luar Biasa';
      minMax = 'Rasio > 4.0';
      // Map ratio 4-10 to deg 45 to 90
      needleDeg = 45 + (Math.min(6, ratio - 4) / 6 * 45);
    }

    return { color, label, minMax, needleDeg };
  };

  const speedometer = getSpeedometerDetails(sroiRatio);

  const handleCopySummary = () => {
    const text = `SROI Calculator (Standalone Estimasi)
----------------------------------------
Nama Program       : ${programName}
Sektor             : ${sector}
Lokasi             : ${location || 'Indonesia'}
Jumlah Investasi   : Rp ${totalInvestmentIdr.toLocaleString('id-ID')}
Rasio SROI         : ${sroiRatio} : 1
Total Dampak Sosial (Gross) : Rp ${totalGrossSocialValue.toLocaleString('id-ID')}
Total Dampak Sosial (PV)    : Rp ${totalPresentSocialValue.toLocaleString('id-ID')}
Tingkat Diskonto   : ${discountRate * 100}%
Durasi Evaluasi    : ${durationYears} tahun

Setiap Rp1 yang diinvestasikan menghasilkan sekitar Rp ${sroiRatio.toLocaleString('id-ID')} nilai sosial bersih.
Estimasi ini bersumber dari proxy value & input manual pengguna.`;

    navigator.clipboard.writeText(text);
    toast({
      title: 'Ringkasan Disalin! 📋',
      description: 'Laporan SROI singkat disalin ke clipboard.'
    });
  };

  return (
    <div id="sroi-standalone-root" data-testid="sroi-standalone-root" className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-950 p-6 rounded-2xl border shadow-elegant">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 bg-gradient-to-tr from-teal-500 to-emerald-400 text-white rounded-xl text-2xl shadow-sm">📊</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">SROI Calculator</h1>
                <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold border-emerald-100 dark:border-emerald-900/50">
                  🌱 Standalone Mode
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Hitung nilai sosial program kamu tanpa perlu setup LFA lengkap.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div id="sroi-standalone-mode-toggle" data-testid="sroi-standalone-mode-toggle" className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border flex">
            <button
              onClick={() => setMode('simple')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'simple'
                  ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌱 Sederhana
            </button>
            <button
              onClick={() => setMode('professional')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'professional'
                  ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🏢 Profesional
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="text-xs font-semibold text-slate-400 cursor-not-allowed border-dashed"
            disabled
            title="PDF Export akan hadir di versi rilis berikutnya."
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export PDF (Segera Hadir)
          </Button>
        </div>
      </div>

      {/* METHODOLOGY DISCLAIMER */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-slate-800 dark:text-slate-200">🔍 PEMBERITAHUAN METODOLOGI & ESTIMASI:</p>
        <p>
          Perhitungan ini adalah estimasi awal berbasis input pengguna dan proxy value. Validasi kembali asumsi, data capaian, dan sumber proxy sebelum digunakan untuk laporan resmi donor.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: ASSUMPTIONS & EDITORS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* LFA CONNECTION CARD */}
          <Card className="border shadow-elegant overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b py-3 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 text-sm">🔗</span>
                  <CardTitle className="text-sm font-bold">Koneksi Program LFA (Opsional)</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] text-slate-500 font-semibold bg-white dark:bg-slate-950">
                  Hybrid
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 text-xs space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Program LFA Aktif:
                </Label>
                <Select value={selectedProjectId} onValueChange={handleConnectProject}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="-- Pilih Program (Default: Manual) --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="text-xs">
                      -- Hitung Manual Dari Nol --
                    </SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({p.sector || 'Tanpa Sektor'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Jika terhubung, calculator akan mengimpor total investasi dari Rencana Anggaran Biaya dan outcomes dari MEAL Tracker agar kamu tidak perlu mengetik dari awal.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PROGRAM BASICS / INPUT SECTION */}
          <Card className="border shadow-elegant">
            <CardHeader className="py-4 px-5 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>📝</span> Asumsi & Anggaran Program
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Nama Program</Label>
                  <Input
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="Nama Program/Dampak..."
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Sektor Fokus</Label>
                  <Select value={sector} onValueChange={(val) => {
                    setSector(val);
                    // update proxy categories in simple mode
                    if (outcomes.length === 1 && outcomes[0].id === 'outcome-1') {
                      const defProxy = SROI_PROXIES_INDONESIA.find(p => p.category === val);
                      if (defProxy) {
                        setOutcomes([{
                          ...outcomes[0],
                          proxy_category: val,
                          outcome_name: defProxy.name,
                          proxy_value_idr: defProxy.value_idr,
                          proxy_source: defProxy.source,
                          proxy_citation: defProxy.citation
                        }]);
                      }
                    }
                  }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Sektor" />
                    </SelectTrigger>
                    <SelectContent>
                      {SROI_SECTORS.map(sec => (
                        <SelectItem key={sec} value={sec} className="text-xs">{sec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Total Anggaran / Investasi Program (IDR)</Label>
                  <Input
                    id="sroi-standalone-total-investment"
                    data-testid="sroi-standalone-total-investment"
                    type="number"
                    value={totalInvestmentIdr || ''}
                    onChange={(e) => setTotalInvestmentIdr(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 100000000"
                    className="h-9 text-xs font-medium"
                  />
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    IDR {(totalInvestmentIdr || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Durasi Dampak (Tahun)</Label>
                    <Input
                      type="number"
                      value={durationYears || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setDurationYears(val);
                        setOutcomes(outcomes.map(o => ({ ...o, duration_years: val })));
                      }}
                      min={1}
                      max={10}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Penerima Manfaat</Label>
                    <Input
                      type="number"
                      value={beneficiaryCount || ''}
                      onChange={(e) => setBeneficiaryCount(parseInt(e.target.value, 10) || 0)}
                      placeholder="Orang/KK..."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Lokasi Implementasi (Opsional)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. NTT, Jawa Barat, Kalimantan..."
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Professional Mode: Discount Rate slider/input */}
                {mode === 'professional' && (
                  <div className="space-y-1.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold text-blue-600 dark:text-blue-400">Social Discount Rate</Label>
                      <Badge variant="outline" className="text-[10px] py-0 px-1 bg-white dark:bg-slate-950">
                        {(discountRate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Slider
                        value={[discountRate * 1000]}
                        min={0}
                        max={150} // up to 15.0%
                        step={5}
                        onValueChange={(val) => setDiscountRate(val[0] / 1000)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={discountRate * 100}
                        onChange={(e) => setDiscountRate((parseFloat(e.target.value) || 0) / 100)}
                        className="w-12 h-7 text-[11px] p-1 text-center"
                        step={0.1}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground block">
                      Tingkat diskonto sosial tahunan untuk menghitung Present Value (PV) dampak masa depan. Standard: 3.5%
                    </span>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          {/* OUTCOMES EDITOR SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm">🎯</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Daftar Outcomes & Indikator Capaian</h3>
              </div>
              <Button
                id="sroi-standalone-add-outcome"
                data-testid="sroi-standalone-add-outcome"
                size="sm"
                onClick={handleAddOutcome}
                className="bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Outcome
              </Button>
            </div>

            {calculatedOutcomes.length === 0 ? (
              <Card className="border border-dashed p-8 text-center space-y-3">
                <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold">Belum Ada Outcome Ditambahkan</p>
                  <p className="text-[11px] text-muted-foreground">
                    SROI membutuhkan minimal 1 indikator outcome keuangan untuk menghitung rasio dampak.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={handleAddOutcome}>
                  Buat Outcome Pertama
                </Button>
              </Card>
            ) : (
              calculatedOutcomes.map((out, idx) => (
                <Card key={out.id} className="border shadow-elegant relative group">
                  <CardHeader className="py-3 px-5 border-b bg-slate-50/30 dark:bg-slate-900/5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-slate-150 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Outcome {idx + 1}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => handleRemoveOutcome(out.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5 text-xs space-y-4">
                    
                    {/* Outcome Name & Details */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      
                      <div className="md:col-span-8 space-y-1.5">
                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Pernyataan Outcome / Indikator Capaian</Label>
                        <Input
                          value={out.outcome_name}
                          onChange={(e) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, outcome_name: e.target.value } : o))}
                          placeholder="Misalnya: Pelatihan digital intensif melahirkan desainer grafis pemula..."
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Volume</Label>
                        <Input
                          type="number"
                          value={out.quantity || ''}
                          onChange={(e) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, quantity: parseFloat(e.target.value) || 0 } : o))}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Satuan (Unit)</Label>
                        <Input
                          value={out.unit || ''}
                          onChange={(e) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, unit: e.target.value } : o))}
                          placeholder="e.g. orang, UMKM"
                          className="h-9 text-xs"
                        />
                      </div>

                    </div>

                    {/* Indonesian SROI Proxies Selector */}
                    <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/10 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[10px] uppercase tracking-wider">
                          Pilih Standard Proxy Indonesia
                        </span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 bg-white dark:bg-slate-950">
                          Sektor: {out.proxy_category || sector}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold">Sektor Library Proxy</Label>
                          <Select
                            value={out.proxy_category || sector}
                            onValueChange={(val) => {
                              const defaultOfSector = SROI_PROXIES_INDONESIA.find(p => p.category === val);
                              if (defaultOfSector) {
                                setOutcomes(outcomes.map(o => o.id === out.id ? {
                                  ...o,
                                  proxy_category: val,
                                  proxy_value_idr: defaultOfSector.value_idr,
                                  proxy_source: defaultOfSector.source,
                                  proxy_citation: defaultOfSector.citation
                                } : o));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                              <SelectValue placeholder="Pilih Sektor" />
                            </SelectTrigger>
                            <SelectContent>
                              {SROI_SECTORS.map(sec => (
                                <SelectItem key={sec} value={sec} className="text-xs">{sec}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold">Gunakan Referensi Standar</Label>
                          <Select
                            onValueChange={(pId) => {
                              const refItem = SROI_PROXIES_INDONESIA.find(p => p.id === pId);
                              if (refItem) handleApplyProxyReference(out.id, refItem);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                              <SelectValue placeholder="-- Standard Proxy --" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {SROI_PROXIES_INDONESIA.filter(p => p.category === (out.proxy_category || sector)).map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-xs leading-5">
                                  {p.name.length > 50 ? `${p.name.substring(0, 50)}...` : p.name} (Rp {p.value_idr.toLocaleString('id-ID')})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Manual value over-ride */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/50 dark:border-slate-800/30">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold">Finansial Proxy Value (Rp)</Label>
                          <Input
                            type="number"
                            value={out.proxy_value_idr || ''}
                            onChange={(e) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, proxy_value_idr: parseFloat(e.target.value) || 0 } : o))}
                            className="h-8 text-xs bg-white dark:bg-slate-950"
                          />
                          <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">
                            Rp {(out.proxy_value_idr || 0).toLocaleString('id-ID')}
                          </span>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-[10px] font-semibold">Sumber & Justifikasi Dampak</Label>
                          <Input
                            value={out.proxy_source || ''}
                            onChange={(e) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, proxy_source: e.target.value } : o))}
                            placeholder="e.g. Kajian Ekonomi BPS, Peraturan Menteri..."
                            className="h-8 text-xs bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>

                      {out.proxy_citation && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1">
                          <span>💡</span>
                          <span><strong>Metodologi Valuasi:</strong> {out.proxy_citation}</span>
                        </p>
                      )}
                    </div>

                    {/* ASSUMPTIONS - SIMPLE MODE VS PROFESSIONAL MODE */}
                    {mode === 'simple' ? (
                      <div className="p-3 bg-slate-100/50 dark:bg-slate-900/20 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold block text-slate-500">Attribution</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">80%</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold block text-slate-500">Deadweight</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">20%</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold block text-slate-500">Displacement</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">0%</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold block text-slate-500">Dropoff</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">0% / tahun</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border rounded-xl bg-slate-100/30 dark:bg-slate-900/10 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-[10px] uppercase tracking-wider">
                            Asumsi Dampak & Adjustmen (SROI Professional)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Attribution ({out.attribution_pct}%)
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[250px] text-xs">
                                    Berapa persen dampak positif ini murni disebabkan oleh intervensi program kamu (bukan organisasi lain).
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Slider
                              value={[out.attribution_pct]}
                              min={0}
                              max={100}
                              step={5}
                              onValueChange={(val) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, attribution_pct: val[0] } : o))}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Deadweight ({out.deadweight_pct}%)
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[250px] text-xs">
                                    Berapa persen dampak positif yang tetap akan terjadi dengan sendirinya walaupun program kamu tidak berjalan.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Slider
                              value={[out.deadweight_pct]}
                              min={0}
                              max={100}
                              step={5}
                              onValueChange={(val) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, deadweight_pct: val[0] } : o))}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Displacement ({out.displacement_pct}%)
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[250px] text-xs">
                                    Berapa besar dampak program kamu secara tidak sengaja memindahkan masalah ke area lain atau kelompok lain.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Slider
                              value={[out.displacement_pct]}
                              min={0}
                              max={100}
                              step={5}
                              onValueChange={(val) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, displacement_pct: val[0] } : o))}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Dropoff per Tahun ({out.dropoff_pct_per_year}%)
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[250px] text-xs">
                                    Tingkat penurunan dampak positif seiring berjalannya waktu setelah program berakhir.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Slider
                              value={[out.dropoff_pct_per_year]}
                              min={0}
                              max={100}
                              step={5}
                              onValueChange={(val) => setOutcomes(outcomes.map(o => o.id === out.id ? { ...o, dropoff_pct_per_year: val[0] } : o))}
                            />
                          </div>

                        </div>
                      </div>
                    )}

                    {/* INDIVIDUAL VALUE RECAP */}
                    <div className="flex justify-between items-center pt-2 text-xs border-t">
                      <div className="space-y-1 text-[11px]">
                        <span className="text-muted-foreground">Total Nilai Kotor (Gross Value):</span>
                        <strong className="block text-slate-900 dark:text-slate-150">
                          Rp {(out.gross_value_idr || 0).toLocaleString('id-ID')}
                        </strong>
                      </div>
                      <div className="space-y-1 text-[11px] text-right">
                        <span className="text-muted-foreground">Present Value Terdiskonto (PV):</span>
                        <strong className="block text-blue-600 dark:text-blue-400 font-bold text-sm">
                          Rp {(out.present_value_idr || 0).toLocaleString('id-ID')}
                        </strong>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* DUAL CTA PANEL */}
          <div className="flex justify-between items-center flex-wrap gap-4 pt-4 border-t">
            <Button
              id="sroi-standalone-reset"
              data-testid="sroi-standalone-reset"
              variant="outline"
              size="sm"
              onClick={handleResetCalculator}
              className="text-xs font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Estimasi
            </Button>
          </div>

        </div>

        {/* RIGHT PANEL: RESULT METRICS & SPEEDOMETER */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SPEEDOMETER PANEL CARD */}
          <Card className="border shadow-elegant overflow-hidden">
            <CardHeader className="py-4 px-5 border-b bg-gradient-to-tr from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900/50">
              <div className="flex items-center gap-2 justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <span>📈</span> Rasio SROI Sosial
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-1.5" style={{ color: speedometer.color, borderColor: speedometer.color }}>
                  {speedometer.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 text-center space-y-5">
              
              {/* SPEEDOMETER GRAPHIC */}
              <div className="relative w-48 h-24 mx-auto overflow-hidden flex items-end justify-center">
                {/* Custom arc background */}
                <div className="absolute inset-0 rounded-t-full border-t-[14px] border-l-[14px] border-r-[14px] border-slate-200 dark:border-slate-800" />
                
                {/* Arc filled with dynamic speed limits */}
                {/* Low value sector (Red) */}
                <div className="absolute inset-0 rounded-t-full border-t-[14px] border-l-[14px] border-red-500 rotate-180 origin-bottom" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)', transform: 'rotate(-180deg)' }} />
                {/* Medium (Orange) */}
                <div className="absolute inset-0 rounded-t-full border-t-[14px] border-amber-500 origin-bottom" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)', transform: 'rotate(-45deg)' }} />
                {/* High (Green) */}
                <div className="absolute inset-0 rounded-t-full border-t-[14px] border-emerald-500 origin-bottom" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)', transform: 'rotate(0deg)' }} />
                {/* Excellent (Blue) */}
                <div className="absolute inset-0 rounded-t-full border-t-[14px] border-blue-500 origin-bottom" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)', transform: 'rotate(45deg)' }} />

                {/* Speedometer needle */}
                <div 
                  className="absolute bottom-0 w-1 h-14 bg-slate-900 dark:bg-white origin-bottom rounded-full transition-transform duration-700 ease-out"
                  style={{ transform: `rotate(${speedometer.needleDeg}deg)` }}
                >
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                </div>
                {/* Center base cap */}
                <div className="absolute bottom-0 w-4 h-2 bg-slate-900 dark:bg-white rounded-t-full" />
              </div>

              {/* SROI RATIO RATIO METRIC */}
              <div id="sroi-standalone-ratio-card" data-testid="sroi-standalone-ratio-card" className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Nilai Rasio Standalone
                </span>
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {sroiRatio} : 1
                </h2>
                <p className="text-[11px] text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                  Setiap Rp1 yang diinvestasikan menghasilkan sekitar <strong className="text-slate-800 dark:text-slate-100">Rp {sroiRatio.toLocaleString('id-ID')}</strong> nilai dampak sosial kemasyarakatan.
                </p>
              </div>

              {/* WARNING IF TOTAL INVESTMENT IS ZERO */}
              {totalInvestmentIdr === 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] leading-relaxed text-left">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <strong className="font-semibold block">⚠️ Anggaran Investasi Kosong</strong>
                    Silakan isi Total Anggaran Program agar rasio kelayakan SROI dapat dikalkulasikan.
                  </div>
                </div>
              )}

              {/* SUMMARY FIGURES LIST */}
              <div className="border-t border-slate-200/60 dark:border-slate-800/40 pt-4 text-left text-[11px] space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Finansial Investasi:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Rp {totalInvestmentIdr.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Nilai Sosial (Kotor):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Rp {totalGrossSocialValue.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Present Value Sosial (PV):</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    Rp {totalPresentSocialValue.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* COPY SUMMARY TEXT BUTTON */}
              <Button
                id="sroi-standalone-copy-summary"
                data-testid="sroi-standalone-copy-summary"
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Salin Ringkasan Text
              </Button>

            </CardContent>
          </Card>

          {/* UPGRADE CALL-TO-ACTION TO LFA BUILDER */}
          <Card className="border border-indigo-100 dark:border-indigo-950/50 shadow-elegant overflow-hidden bg-gradient-to-tr from-indigo-50/40 to-indigo-100/10 dark:from-indigo-950/10 dark:to-indigo-950/50">
            <CardContent className="p-5 text-xs space-y-4">
              <div className="space-y-1.5">
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold uppercase text-[9px]">
                  Rekomendasi Donor
                </Badge>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Mau Laporan SROI Donor-Ready?
                </h4>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Gunakan LFA Builder agar SROI bisa terhubung langsung dengan MEAL, Budget, dan WBS, memberikan bukti validasi penuh yang diakui donor.
                </p>
              </div>

              <Button
                onClick={() => navigate('/dashboard/lfa-builder')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
              >
                Buka LFA Builder <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
