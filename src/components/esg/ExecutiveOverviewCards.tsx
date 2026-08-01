// src/components/esg/ExecutiveOverviewCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Users, Scale, TrendingUp, Trees } from 'lucide-react';
import { ESGSummaryPayload } from '@/lib/esg/types';
import { formatCarbonMass, formatCurrency, formatTreesEquivalent } from '@/lib/carbon/formatters';

interface ExecutiveOverviewCardsProps {
  data: ESGSummaryPayload;
}

export function ExecutiveOverviewCards({ data }: ExecutiveOverviewCardsProps) {
  const { environment, social } = data;
  const carbon = environment.carbon;
  const eroiRatio = carbon.eroi?.eroi_ratio || 0;
  const sroiRatio = social.sroi_ratio || 0;

  // Format Helpers with clean fallback
  const carbonDisplay = carbon.net_impact_kg !== 0 
    ? formatCarbonMass(carbon.net_impact_kg) 
    : 'Belum Ada Data';

  const eroiDisplay = eroiRatio > 0 
    ? `1 : ${eroiRatio}` 
    : '—';

  const sroiDisplay = sroiRatio > 0 
    ? `1 : ${sroiRatio}` 
    : '—';

  const benDisplay = social.total_beneficiaries > 0 
    ? `${social.total_beneficiaries.toLocaleString('id-ID')} Jiwa` 
    : 'Belum Ada Data';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* HERO CARD 1: NET CARBON IMPACT */}
      <Card className="relative overflow-hidden border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            Net Carbon Impact
          </CardTitle>
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <Leaf className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {carbonDisplay}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Trees className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {carbon.trees_equivalent > 0 ? formatTreesEquivalent(carbon.trees_equivalent) : 'Pohon ekuivalen'}
            </span>
            {carbon.valuation.net_impact_value_idr > 0 && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap text-[10px] px-2 py-0.5">
                {formatCurrency(carbon.valuation.net_impact_value_idr)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HERO CARD 2: EROI RATIO */}
      <Card className="relative overflow-hidden border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/60 via-white to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            EROI Return Ratio
          </CardTitle>
          <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <Scale className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {eroiDisplay}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
            <span className="whitespace-nowrap text-[11px]">
              {carbon.valuation.net_impact_value_idr > 0 ? formatCurrency(carbon.valuation.net_impact_value_idr) : 'Nilai Karbon Moneter'}
            </span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap text-[10px] px-2 py-0.5">
              IDXCarbon
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* HERO CARD 3: SROI RATIO */}
      <Card className="relative overflow-hidden border-purple-200/80 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/60 via-white to-white dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400">
            SROI Return Ratio
          </CardTitle>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/60 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {sroiDisplay}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
            <span className="whitespace-nowrap text-[11px]">
              {social.social_value_idr > 0 ? formatCurrency(social.social_value_idr) : 'Net Present Social Value'}
            </span>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 whitespace-nowrap text-[10px] px-2 py-0.5">
              Social Return
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* HERO CARD 4: TOTAL BENEFICIARIES */}
      <Card className="relative overflow-hidden border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/60 via-white to-white dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
            Total Beneficiaries
          </CardTitle>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/60 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {benDisplay}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
            {social.female_percentage > 0 ? (
              <>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                  {social.female_percentage}% Perempuan
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                  {social.youth_percentage}% Pemuda
                </Badge>
              </>
            ) : (
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Terdaftar di Registry</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
