// src/components/esg/ExecutiveSummaryCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Sparkles, Award, TrendingUp } from 'lucide-react';
import { ESGSummaryPayload } from '@/lib/esg/types';

interface ExecutiveSummaryCardProps {
  data: ESGSummaryPayload;
}

export function ExecutiveSummaryCard({ data }: ExecutiveSummaryCardProps) {
  const { governance, combined_impact_multiple, organization_name } = data;

  return (
    <Card className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white shadow-md border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              Executive Sustainability Brief & Impact Status
            </CardTitle>
            <p className="text-xs text-slate-300">
              Evaluasi kinerja terintegrasi untuk direksi, donor, dan mitra keberlanjutan.
            </p>
          </div>
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold self-start sm:self-auto text-xs px-3 py-1 whitespace-nowrap">
            <Award className="w-3.5 h-3.5 mr-1" /> HIGH IMPACT RETURN
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold">Impact Readiness</span>
            <span className="text-lg font-bold text-white whitespace-nowrap">
              {governance.impact_readiness_score} / 100
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold">Combined Impact Multiple</span>
            <span className="text-lg font-bold text-emerald-400 whitespace-nowrap">
              1 : {combined_impact_multiple}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold">Verifikasi Bukti WBS</span>
            <span className="text-lg font-bold text-blue-400 whitespace-nowrap">
              {governance.evidence_verification_rate}% Approved
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed italic">
          "Organisasi <strong>{organization_name}</strong> secara otomatis mengompilasi dampak sosial dan lingkungan bersumber dari LFA, WBS, Budget, dan MEAL. Seluruh indikator bersifat read-only dan siap diaudit untuk standar GRI & SEOJK No.16/2021."
        </p>
      </CardContent>
    </Card>
  );
}
