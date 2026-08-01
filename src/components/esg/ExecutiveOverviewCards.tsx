// src/components/esg/ExecutiveOverviewCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Users, ShieldCheck, TrendingUp, Trees, DollarSign } from 'lucide-react';
import { ESGSummaryPayload } from '@/lib/esg/types';
import { formatCarbonMass, formatCurrency, formatTreesEquivalent } from '@/lib/carbon/formatters';

interface ExecutiveOverviewCardsProps {
  data: ESGSummaryPayload;
}

export function ExecutiveOverviewCards({ data }: ExecutiveOverviewCardsProps) {
  const { environment, social, governance, combined_impact_multiple } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: ENVIRONMENTAL SUMMARY */}
      <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Environmental Summary
          </CardTitle>
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Leaf className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatCarbonMass(environment.carbon.net_impact_kg)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Trees className="w-3.5 h-3.5 text-emerald-500" />
            <span>Setara {formatTreesEquivalent(environment.carbon.trees_equivalent)}</span>
          </div>
          <div className="pt-2 border-t flex justify-between items-center text-xs">
            <span className="text-slate-500">Nilai Karbon NEK:</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              {formatCurrency(environment.carbon.valuation.net_impact_value_idr)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: SOCIAL SUMMARY */}
      <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Social Summary
          </CardTitle>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {social.total_beneficiaries.toLocaleString('id-ID')} Penerima
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {social.female_percentage}% Perempuan
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {social.youth_percentage}% Pemuda
            </Badge>
          </div>
          <div className="pt-2 border-t flex justify-between items-center text-xs">
            <span className="text-slate-500">Net Social Value:</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              {formatCurrency(social.social_value_idr)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: GOVERNANCE SUMMARY */}
      <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            Governance Summary
          </CardTitle>
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {governance.evidence_verification_rate}% Verifikasi
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Verifikasi Klaim Bukti Lapangan WBS
          </div>
          <div className="pt-2 border-t flex justify-between items-center text-xs">
            <span className="text-slate-500">Impact Readiness:</span>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
              {governance.impact_readiness_score} / 100
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4: COMBINED IMPACT MULTIPLE */}
      <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Combined Impact Multiple
          </CardTitle>
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            1 : {combined_impact_multiple}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            SROI Ratio ({social.sroi_ratio}) + EROI Ratio ({data.environment.carbon.eroi?.eroi_ratio || 0})
          </div>
          <div className="pt-2 border-t flex justify-between items-center text-xs">
            <span className="text-slate-500">Status Sustainability:</span>
            <Badge variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
              High Impact Return
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
