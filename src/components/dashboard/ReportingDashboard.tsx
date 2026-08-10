import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Activity, Shield, Lightbulb, FileText, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildReportingSnapshot, type ReportingSnapshot } from '@/lib/project-management/reportingService';
import { useOrgRole } from '@/hooks/useOrgRole';

export default function ReportingDashboard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { toast } = useToast();
  const { role: orgRole } = useOrgRole();
  const isOwner = orgRole === 'owner';

  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await buildReportingSnapshot(supabase as any, projectId, projectName);
      setSnapshot(snap);
    } catch {
      toast({ title: 'Gagal memuat laporan', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [projectId, projectName, toast]);

  useEffect(() => { void loadSnapshot(); }, [loadSnapshot]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!snapshot) {
    return <div className="text-center py-16 text-muted-foreground">Tidak dapat memuat data laporan.</div>;
  }

  const fmt = (n: number | null) => n != null ? n.toLocaleString('id-ID') : '—';
  const pct = (n: number | null) => n != null ? `${n}%` : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{snapshot.projectName}</h2>
          <p className="text-xs text-muted-foreground">Laporan Program · {new Date(snapshot.generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={loadSnapshot} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Perbarui
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Execution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Eksekusi</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Total Aktivitas</span><span className="font-bold">{snapshot.execution.totalActivities}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Selesai</span><span>{snapshot.execution.completedActivities}</span></div>
            <div className="flex justify-between text-blue-600"><span>Berjalan</span><span>{snapshot.execution.inProgressActivities}</span></div>
            <div className="flex justify-between text-slate-500"><span>Belum Mulai</span><span>{snapshot.execution.notStartedActivities}</span></div>
            {snapshot.execution.overdueCount > 0 && <div className="flex justify-between text-red-600"><span>Terlambat</span><span>{snapshot.execution.overdueCount}</span></div>}
            <div className="pt-1"><div className="text-[10px] text-muted-foreground mb-1">Progres Keseluruhan</div><Progress value={snapshot.execution.progressPercent ?? 0} className="h-1.5" /><div className="text-right text-[10px] font-bold mt-0.5">{pct(snapshot.execution.progressPercent)}</div></div>
          </CardContent>
        </Card>

        {/* Evidence */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Bukti</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Total Klaim</span><span className="font-bold">{snapshot.evidence.totalClaims}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Terverifikasi</span><span>{snapshot.evidence.verifiedClaims}</span></div>
            <div className="flex justify-between text-amber-600"><span>Diajukan</span><span>{snapshot.evidence.submittedClaims}</span></div>
            <div className="pt-1"><div className="text-[10px] text-muted-foreground mb-1">Tingkat Verifikasi</div><Progress value={snapshot.evidence.verificationRate ?? 0} className="h-1.5" /><div className="text-right text-[10px] font-bold mt-0.5">{pct(snapshot.evidence.verificationRate)}</div></div>
          </CardContent>
        </Card>

        {/* Evaluation */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Evaluasi</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Total Temuan</span><span className="font-bold">{fmt(snapshot.evaluation.totalFindings)}</span></div>
            {snapshot.evaluation.criticalFindings > 0 && <div className="flex justify-between text-red-600"><span>Kritis</span><span>{snapshot.evaluation.criticalFindings}</span></div>}
            {snapshot.evaluation.majorFindings > 0 && <div className="flex justify-between text-orange-600"><span>Mayor</span><span>{snapshot.evaluation.majorFindings}</span></div>}
            {snapshot.evaluation.minorFindings > 0 && <div className="flex justify-between text-amber-600"><span>Minor</span><span>{snapshot.evaluation.minorFindings}</span></div>}
            {snapshot.evaluation.informationalFindings > 0 && <div className="flex justify-between text-slate-500"><span>Informasi</span><span>{snapshot.evaluation.informationalFindings}</span></div>}
            {snapshot.evaluation.totalFindings === 0 && <div className="text-muted-foreground italic">Belum ada temuan evaluasi</div>}
          </CardContent>
        </Card>

        {/* Learning */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4" />Pembelajaran</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Total Catatan</span><span className="font-bold">{fmt(snapshot.learning.totalEntries)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Good Practice</span><span>{snapshot.learning.goodPractices}</span></div>
            <div className="flex justify-between text-red-600"><span>Failure Pattern</span><span>{snapshot.learning.failurePatterns}</span></div>
            <div className="flex justify-between text-slate-500"><span>Mixed</span><span>{snapshot.learning.mixedInsights}</span></div>
            <div className="flex justify-between"><span>Dipublikasikan</span><span>{snapshot.learning.publishedEntries}</span></div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Anggaran</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Anggaran</span><span className="font-bold">Rp {fmt(snapshot.budget.plannedTotal)}</span></div>
            <div className="flex justify-between"><span>Realisasi</span><span className="font-bold">Rp {fmt(snapshot.budget.actualTotal)}</span></div>
            {snapshot.budget.utilizationPercent != null && (
              <div className="pt-1"><div className="text-[10px] text-muted-foreground mb-1">Utilisasi</div><Progress value={Math.min(snapshot.budget.utilizationPercent, 100)} className="h-1.5" /><div className="text-right text-[10px] font-bold mt-0.5">{pct(snapshot.budget.utilizationPercent)}</div></div>
            )}
          </CardContent>
        </Card>

        {/* Overall */}
        <Card className="bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/20 dark:to-sky-950/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Ringkasan</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Progres Eksekusi</span><span className="font-bold">{pct(snapshot.execution.progressPercent)}</span></div>
            <div className="flex justify-between"><span>Verifikasi Bukti</span><span className="font-bold">{pct(snapshot.evidence.verificationRate)}</span></div>
            <div className="flex justify-between"><span>Temuan Evaluasi</span><span className="font-bold">{fmt(snapshot.evaluation.totalFindings)}</span></div>
            <div className="flex justify-between"><span>Utilisasi Anggaran</span><span className="font-bold">{pct(snapshot.budget.utilizationPercent)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
