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
      {/* SUMMARY KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Evidence Verification Rate</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              {data.evidence_verification_rate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Bukti foto/struk klaim WBS yang telah diaudit
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Impact Readiness Score</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              {data.impact_readiness_score} / 100
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Kesiapan manajemen program & akuntabilitas
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Kepatuhan Standar (Compliance)</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              {data.compliance_score}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Kesesuaian standar GRI & SEOJK 16/2021
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Risiko Aktif Terdeteksi</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              {data.active_risks_count} Risiko
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {data.active_risks_count === 0 ? 'Semua indikator dalam batas aman' : 'Memerlukan perhatian tim audit'}
          </CardContent>
        </Card>
      </div>

      {/* DETAILED GOVERNANCE BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tingkat Verifikasi Klaim WBS</CardTitle>
            <CardDescription className="text-xs">
              Mewajibkan bukti fisik (foto, lokasi GPS, nota) pada setiap klaim penyelesaian tugas WBS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Klaim Verifikasi Foto & Geo-tagging</span>
                <span>{data.evidence_verification_rate}%</span>
              </div>
              <Progress value={data.evidence_verification_rate} className="h-2 bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Kesesuaian Realisasi RAB vs Budget Target</span>
                <span>92%</span>
              </div>
              <Progress value={92} className="h-2 bg-slate-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Kesiapan Audit ESG & Kepatuhan</CardTitle>
            <CardDescription className="text-xs">
              Audit kesiapan pelaporan keberlanjutan sesuai regulasi OJK & GRI Standards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">GRI Standards Readiness</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                READY (88%)
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">SEOJK No. 16/SEOJK.04/2021 Compliance</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                COMPLIANT (90%)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
