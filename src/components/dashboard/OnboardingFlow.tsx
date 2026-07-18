// src/components/dashboard/OnboardingFlow.tsx
// High-fidelity guided onboarding flow for grassroots CSOs and professional NGOs.
// Includes a premium 3-step conversation overlay and an interactive mobile-safe spotlight tour.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { ensureDefaultOrg } from '@/lib/grant-writer/orgHelper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Target,
  X,
  Loader2,
  CheckCircle2,
  Building,
  Briefcase,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function OnboardingFlow() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Core States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form Fields
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [originalOrgName, setOriginalOrgName] = useState('');
  const [sector, setSector] = useState('Pendidikan');
  const [programName, setProgramName] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'cari_dana' | 'monitoring' | 'laporan' | 'kenalan' | null>(null);

  // Interactive Spotlight Tour States
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(1);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [mobileFallback, setMobileFallback] = useState(false);

  // Onboarding self-healing & trigger check
  useEffect(() => {
    if (!user || !profile) return;

    const checkOnboardingStatus = async () => {
      try {
        const oId = await ensureDefaultOrg(user.id, profile?.full_name);
        setOrgId(oId);

        // Fetch organization details for prefilling
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', oId)
          .maybeSingle();

        if (orgData?.name) {
          setOrgName(orgData.name);
          setOriginalOrgName(orgData.name);
        } else {
          setOrgName(profile.full_name ? `${profile.full_name} Org` : 'Organisasi Saya');
        }

        // Count existing LFA projects
        const { count, error: countErr } = await supabase
          .from('lfa_projects')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', oId);

        if (countErr) throw countErr;

        const hasProjects = (count ?? 0) > 0;

        // Bypass condition: If has existing projects, silently auto-complete onboarding
        if (profile.onboarding_completed === null || profile.onboarding_completed === false) {
          if (hasProjects) {
            await supabase
              .from('profiles')
              .update({
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString(),
              })
              .eq('id', user.id);
            await refreshProfile();
            setShowOnboarding(false);
          } else {
            setShowOnboarding(true);
          }
        } else {
          setShowOnboarding(false);
        }
      } catch (err) {
        console.error('[OnboardingCheck] failed:', err);
      } finally {
        setChecking(false);
      }
    };

    void checkOnboardingStatus();
  }, [user, profile]);

  // Handle tour elements positioning
  useEffect(() => {
    if (!tourActive) return;

    const getTargetId = () => {
      if (tourStep === 1) return 'tour-lfa-builder';
      if (tourStep === 2) return 'tour-grant-writer';
      return 'tour-impact-dashboard';
    };

    const targetId = getTargetId();
    const el = document.getElementById(targetId);

    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
      setMobileFallback(false);
    } else {
      // Element not found - Sidebar is collapsed or hidden on mobile. Use mobile fallback view.
      setSpotlightRect(null);
      setMobileFallback(true);
    }
  }, [tourActive, tourStep]);

  // Recalculate spotlight positions on window resize
  useEffect(() => {
    if (!tourActive) return;
    const handleResize = () => {
      const getTargetId = () => {
        if (tourStep === 1) return 'tour-lfa-builder';
        if (tourStep === 2) return 'tour-grant-writer';
        return 'tour-impact-dashboard';
      };
      const el = document.getElementById(getTargetId());
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tourActive, tourStep]);

  if (checking || (!showOnboarding && !tourActive)) return null;

  // Handle Action Completion & Redirections
  const handleCompleteOnboarding = async (chosenPhase: typeof phase) => {
    if (!user || !orgId || !chosenPhase) return;
    setLoading(true);

    try {
      // Update profile values in Supabase
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_skipped: false,
          onboarding_sector: sector,
          onboarding_phase: chosenPhase,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      // Update org name if the user custom edited it
      if (orgName.trim() && orgName.trim() !== originalOrgName) {
        await supabase
          .from('organizations')
          .update({ name: orgName.trim() })
          .eq('id', orgId);
      }

      await refreshProfile();

      // Implement Actions based on Phase Selection
      if (chosenPhase === 'cari_dana' || chosenPhase === 'monitoring') {
        // Create initial LFA Project automatically
        const { data: newProj, error: projErr } = await supabase
          .from('lfa_projects')
          .insert({
            org_id: orgId,
            name: programName.trim() || 'Program Pertama Saya',
            sector: sector,
            beneficiary_description: description.trim() || null,
            status: 'draft',
          })
          .select('id')
          .single();

        if (projErr) throw projErr;

        toast({
          title: 'Program Berhasil Dibuat! 🚀',
          description: `Program "${programName}" telah dibuat di sektor ${sector}.`,
        });

        setShowOnboarding(false);
        if (chosenPhase === 'cari_dana') {
          navigate(`/dashboard/lfa-builder/${newProj.id}`);
        } else {
          // Open LFA Builder directly to Tab 4 (MEAL tab)
          navigate(`/dashboard/lfa-builder/${newProj.id}?tab=meal`);
        }
      } else if (chosenPhase === 'laporan') {
        setShowOnboarding(false);
        navigate('/dashboard/monthly-report');
      } else if (chosenPhase === 'kenalan') {
        setShowOnboarding(false);
        setTourActive(true);
        setTourStep(1);
        navigate('/dashboard');
        toast({
          title: 'Halo! Mari Berkeliling 👋',
          description: 'Ayo intip 3 fitur utama yang akan mempercepat dampak program Anda.',
        });
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Gagal menyelesaikan onboarding',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Skip Onboarding Flow Action
  const handleSkipOnboarding = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_skipped: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await refreshProfile();
      setShowOnboarding(false);
      setTourActive(false);
      toast({
        title: 'Eksplorasi Dimulai! 🗺️',
        description: 'Silakan jelajahi dashboard sesuka Anda. Dokumentasi lengkap ada di pojok bantuan.',
      });
    } catch (err) {
      console.error('[OnboardingSkip] failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Choice metadata for Step 2 and Step 3
  const getDynamicContent = () => {
    switch (phase) {
      case 'cari_dana':
        return {
          title: 'Yuk bikin LFA program kamu! 🎯',
          bullets: [
            'Rancang Logical Framework (LFA Matrix) yang logis dan kokoh secara instan.',
            'Petakan program Anda ke jadwal kerja WBS dan Rencana Anggaran Belanja (RAB).',
            'Tulis proposal berkualitas donor internasional dalam hitungan menit lewat AI Grantwriter.'
          ]
        };
      case 'monitoring':
        return {
          title: 'Yuk setup monitoring! 📋',
          bullets: [
            'Impor indikator dan asumsi program dari logframe otomatis ke MEAL Planner.',
            'Tentukan metode pengumpulan data, disaggregasi, dan penanggung jawab monitoring.',
            'Gunakan AI cerdas untuk merumuskan learning questions berstandar OECD-DAC.'
          ]
        };
      case 'laporan':
        return {
          title: 'Yuk bikin laporan dampak! 📊',
          bullets: [
            'Rangkum pencapaian dan aktivitas bulanan Anda menjadi infografis dampak sosial.',
            'Ekspor laporan program berstandar professional ke format PDF atau Word.',
            'Publikasikan kemajuan program secara langsung kepada donor dan beneficiary.'
          ]
        };
      case 'kenalan':
      default:
        return {
          title: 'Ayo explore Impactory! 🗺️',
          bullets: [
            'Saksikan tour interaktif singkat mengenalkan 3 pilar utama platform kami.',
            'Dapatkan pemahaman visual letak LFA Builder, Grant Writer, dan Impact Dashboard.',
            'Eksplorasi modul mandiri lainnya seperti readiness scorecard dan donor database.'
          ]
        };
    }
  };

  const dynamicContent = getDynamicContent();

  return (
    <>
      {/* 3-STEP ONBOARDING CONVERSATIONAL OVERLAY */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-card border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 md:p-8 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Top Subtle Onboarding Header */}
            <div className="flex items-center justify-between w-full mb-6">
              {/* Subtle 3-Dots Progress Indicator */}
              <div className="flex gap-2">
                <span className={`h-2 w-2 rounded-full transition-all duration-300 ${step === 1 ? 'bg-primary w-4' : 'bg-slate-300 dark:bg-slate-700'}`} />
                <span className={`h-2 w-2 rounded-full transition-all duration-300 ${step === 2 ? 'bg-primary w-4' : 'bg-slate-300 dark:bg-slate-700'}`} />
                <span className={`h-2 w-2 rounded-full transition-all duration-300 ${step === 3 ? 'bg-primary w-4' : 'bg-slate-300 dark:bg-slate-700'}`} />
              </div>

              {/* Skip Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipOnboarding}
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                disabled={loading}
              >
                Lewati Onboarding <X className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>

            {/* STEP 1: Halo, Ceritain Program Kamu */}
            {step === 1 && (
              <div className="space-y-5 animate-in slide-in-from-right-5 duration-300">
                <div className="space-y-1.5">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Selamat datang di Impactory! 👋
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Kita mulai dari yang paling penting — profil organisasi dan program pertama Anda.
                  </p>
                </div>

                <div className="space-y-4 pt-1.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-primary" /> Nama Organisasi / Lembaga
                    </Label>
                    <Input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Contoh: Yayasan Sinar Harapan"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary" /> Sektor Fokus Program
                    </Label>
                    <Select value={sector} onValueChange={setSector}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Pilih sektor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendidikan">🎓 Pendidikan & Literasi</SelectItem>
                        <SelectItem value="Kesehatan">🏥 Kesehatan & Nutrisi</SelectItem>
                        <SelectItem value="Lingkungan">🌱 Lingkungan & Kehutanan</SelectItem>
                        <SelectItem value="Pemberdayaan Ekonomi">💰 Pemberdayaan Ekonomi / UMKM</SelectItem>
                        <SelectItem value="Perlindungan Anak">👶 Perlindungan Anak & Perempuan</SelectItem>
                        <SelectItem value="Kebencanaan">🌋 Kebencanaan & Kemanusiaan</SelectItem>
                        <SelectItem value="Advokasi">⚖️ Advokasi & Kebijakan Publik</SelectItem>
                        <SelectItem value="Lainnya">🧩 Sektor Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" /> Nama Program Pertama Anda <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      placeholder="Contoh: Pelatihan Coding untuk Anak Jalanan"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Deskripsi Singkat Program (Opsional)
                      </Label>
                      <span className="text-[10px] text-muted-foreground">{description.length}/200</span>
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                      placeholder="Contoh: Program pelatihan digital selama 6 bulan untuk membekali 50 anak jalanan dengan keterampilan coding tingkat dasar."
                      className="text-xs min-h-[70px] resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!programName.trim()}
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-semibold"
                  >
                    Lanjut <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Kamu lagi di fase mana? */}
            {step === 2 && (
              <div className="space-y-5 animate-in slide-in-from-right-5 duration-300">
                <div className="space-y-1.5">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Lagi di tahap mana programnya?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Impactory didesain untuk mendampingi Anda di semua siklus program. Pilih fokus utama Anda hari ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5 pt-1">
                  {/* Choice 1 */}
                  <div
                    onClick={() => {
                      setPhase('cari_dana');
                      setStep(3);
                    }}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-900/30 group ${
                      phase === 'cari_dana' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-2xl mt-0.5 shrink-0 select-none">🔍</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider group-hover:text-primary transition-colors">
                        Mau cari dana / apply hibah
                      </h4>
                      <p className="text-[11px] leading-5 text-muted-foreground mt-1">
                        Desain Logical Framework (LFA Matrix), Work Breakdown Structure (WBS), dan write-up proposal donor instan menggunakan AI.
                      </p>
                    </div>
                  </div>

                  {/* Choice 2 */}
                  <div
                    onClick={() => {
                      setPhase('monitoring');
                      setStep(3);
                    }}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-900/30 group ${
                      phase === 'monitoring' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-2xl mt-0.5 shrink-0 select-none">🚀</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider group-hover:text-primary transition-colors">
                        Program udah jalan, mau monitoring
                      </h4>
                      <p className="text-[11px] leading-5 text-muted-foreground mt-1">
                        Strukturkan indikator pencapaian, rancang instrumen MEAL (M&E), dan petakan learning questions berbasis standar internasional.
                      </p>
                    </div>
                  </div>

                  {/* Choice 3 */}
                  <div
                    onClick={() => {
                      setPhase('laporan');
                      setStep(3);
                    }}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-900/30 group ${
                      phase === 'laporan' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-2xl mt-0.5 shrink-0 select-none">📊</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider group-hover:text-primary transition-colors">
                        Mau bikin laporan dampak
                      </h4>
                      <p className="text-[11px] leading-5 text-muted-foreground mt-1">
                        Ubah data monitoring Anda menjadi infografis dampak sosial bulanan profesional siap saji untuk donor dan publik.
                      </p>
                    </div>
                  </div>

                  {/* Choice 4 */}
                  <div
                    onClick={() => {
                      setPhase('kenalan');
                      setStep(3);
                    }}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-900/30 group ${
                      phase === 'kenalan' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-2xl mt-0.5 shrink-0 select-none">🗺️</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider group-hover:text-primary transition-colors">
                        Mau kenalan dulu sama Impactory
                      </h4>
                      <p className="text-[11px] leading-5 text-muted-foreground mt-1">
                        Ikuti tour cepat 3 menit mengelilingi letak modul-modul penting platform demi kelancaran administrasi lembaga Anda.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="w-1/3" onClick={() => setStep(1)}>
                    Kembali
                  </Button>
                  <Button disabled className="w-2/3 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200">
                    Pilih salah satu di atas
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Oke, kita mulai! */}
            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
                <div className="space-y-1.5">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {dynamicContent.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Satu langkah lagi! Berikut adalah apa yang akan kita siapkan bersama di Impactory:
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3.5">
                  {dynamicContent.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="w-1/4 h-10 text-xs" onClick={() => setStep(2)}>
                    Kembali
                  </Button>
                  <Button
                    onClick={() => void handleCompleteOnboarding(phase)}
                    disabled={loading}
                    className="w-3/4 h-10 bg-primary hover:bg-primary/95 text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan...
                      </>
                    ) : (
                      <>
                        Mulai Sekarang <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* DYNAMIC SPOTLIGHT TOOLTIP TOUR */}
      {tourActive && (
        <div className="fixed inset-0 z-50 pointer-events-none animate-in fade-in duration-300">
          
          {/* Spotlight Breathing Glow Ring Overlay (only on desktop where rectangle is captured) */}
          {spotlightRect && !mobileFallback && (
            <div
              className="absolute pointer-events-none rounded-md border-2 border-primary border-dashed shadow-[0_0_0_9999px_rgba(15,23,42,0.4)] animate-pulse"
              style={{
                left: spotlightRect.left - 4,
                top: spotlightRect.top - 4,
                width: spotlightRect.width + 8,
                height: spotlightRect.height + 8,
                transition: 'all 0.25s ease-out',
              }}
            />
          )}

          {/* Tooltip Card (Desktop Side or Mobile Sheet Fallback) */}
          <div
            className={`pointer-events-auto bg-card border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-4 md:p-5 flex flex-col z-50 transition-all duration-300 ${
              mobileFallback
                ? 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 animate-in slide-in-from-bottom-5'
                : 'absolute animate-in zoom-in-95'
            }`}
            style={
              !mobileFallback && spotlightRect
                ? {
                    left: spotlightRect.right + 12,
                    top: spotlightRect.top + (spotlightRect.height / 2) - 90, // center tooltip next to sidebar item
                    width: '320px',
                    transition: 'all 0.25s ease-out',
                  }
                : undefined
            }
          >
            {/* Tooltip Header */}
            <div className="flex items-center gap-1.5 mb-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Highlight Fitur</span>
            </div>

            {/* Tour Step 1: LFA Builder */}
            {tourStep === 1 && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  LFA Builder 🏗️
                </h3>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  Ini adalah fondasi program Anda. Buat logika intervensi program (Logframe), susun jadwal WBS (Work Breakdown Structure), dan rumuskan Rencana Anggaran Belanja (RAB) di sini sebelum diekspor ke proposal donor.
                </p>
              </div>
            )}

            {/* Tour Step 2: Grantwriter */}
            {tourStep === 2 && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  AI Grantwriter 📝
                </h3>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  Ubah logframe (LFA) rancangan Anda menjadi dokumen proposal donor yang matang dalam sekejap. AI kami menyinkronkan seluruh indikator secara terintegrasi agar proposal Anda kredibel.
                </p>
              </div>
            )}

            {/* Tour Step 3: Impact Dashboard */}
            {tourStep === 3 && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Impact Dashboard 📈
                </h3>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  Visualisasikan seluruh data monitoring indikator MEAL Planner program Anda secara grafis. Buat ringkasan pencapaian bulanan (Monthly Report) yang interaktif untuk dibagikan ke donor.
                </p>
              </div>
            )}

            {/* Tooltip Footer Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Langkah {tourStep} dari 3
              </span>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] px-2"
                  onClick={handleSkipOnboarding}
                >
                  Lewati Tour
                </Button>
                
                {tourStep < 3 ? (
                  <Button
                    size="sm"
                    className="h-7 text-[10px] px-2.5 font-semibold"
                    onClick={() => setTourStep((prev) => prev + 1)}
                  >
                    Berikutnya
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 text-[10px] px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    onClick={handleSkipOnboarding}
                  >
                    Selesai! ✨
                  </Button>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
