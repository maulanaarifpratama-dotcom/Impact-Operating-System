// src/components/esg/GovernanceTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, ClipboardCheck, FileCheck2, AlertCircle } from 'lucide-react';
import { ESGGovernanceMetrics } from '@/lib/esg/types';

interface GovernanceTabProps {
  data: ESGGovernanceMetrics;
}

export function GovernanceTab({ data }: GovernanceTabProps) {
  return (
    <div className="space-y-6">
      {/* HERO GOVERNANCE KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HERO 1: READINESS SCORE */}
        <Card className="bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/30 dark:to-slate-900 border-indigo-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-indigo-800 dark:text-indigo-400">
              Impact Readiness Score
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <ClipboardCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>{data.impact_readiness_score} / 100</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <Progress value={data.impact_readiness_score} className="h-1.5 bg-slate-100" />
          </CardContent>
        </Card>

        {/* HERO 2: EVIDENCE VERIFICATION RATE */}
        <Card className="bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-900 border-blue-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-blue-800 dark:text-blue-400">
              Evidence Verification Rate
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{data.evidence_verification_rate}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <Progress value={data.evidence_verification_rate} className="h-1.5 bg-slate-100" />
          </CardContent>
        </Card>

        {/* SUPPORTING: COMPLIANCE */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">Standar Compliance</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{data.compliance_score}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            GRI & SEOJK 16/2021
          </CardContent>
        </Card>

        {/* SUPPORTING: ACTIVE RISKS */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">Risiko Aktif</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{data.active_risks_count} Risiko</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            {data.active_risks_count === 0 ? 'Kondisi aman terverifikasi' : 'Perlu perhatian audit'}
          </CardContent>
        </Card>
      </div>

      {/* DETAILED GOVERNANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold">Integritas Bukti Lapangan WBS</CardTitle>
            <CardDescription className="text-xs">
              Mewajibkan bukti verifikasi foto/geo-tagging pada seluruh klaim penyelesaian tugas WBS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Verifikasi Foto & Geo-tagging WBS</span>
                <span>{data.evidence_verification_rate}%</span>
              </div>
              <Progress value={data.evidence_verification_rate} className="h-2 bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Kesesuaian Realisasi RAB Budget</span>
                <span>92%</span>
              </div>
              <Progress value={92} className="h-2 bg-slate-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold">Kepatuhan Standar Regulator & Donor</CardTitle>
            <CardDescription className="text-xs">
              Kesiapan audit pelaporan keberlanjutan OJK dan kerangka standar GRI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">GRI Standards Readiness</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                READY (88%)
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">SEOJK No. 16/2021 Compliance</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                COMPLIANT (90%)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
