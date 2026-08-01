// src/components/esg/EnvironmentTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Trees, DollarSign, BarChart3, Scale } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ESGEnvironmentalMetrics } from '@/lib/esg/types';
import { formatCarbonMass, formatCurrency, formatTreesEquivalent } from '@/lib/carbon/formatters';

interface EnvironmentTabProps {
  data: ESGEnvironmentalMetrics;
}

export function EnvironmentTab({ data }: EnvironmentTabProps) {
  const { carbon } = data;
  const { scope_breakdown, valuation, eroi } = carbon;

  const scopeData = [
    { name: 'Scope 1 (Direct)', value: scope_breakdown.scope1_kg, color: '#10b981' },
    { name: 'Scope 2 (Electricity)', value: scope_breakdown.scope2_kg, color: '#3b82f6' },
    { name: 'Scope 3 (Supply Chain)', value: scope_breakdown.scope3_kg, color: '#f59e0b' },
  ];

  const netImpactDisplay = carbon.net_impact_kg !== 0 ? formatCarbonMass(carbon.net_impact_kg) : 'Belum Ada Data Karbon';
  const valDisplay = valuation.net_impact_value_idr > 0 ? formatCurrency(valuation.net_impact_value_idr) : '—';
  const eroiDisplay = eroi?.eroi_ratio ? eroi.formatted_ratio : '—';

  return (
    <div className="space-y-6">
      {/* HERO KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">Net Carbon Impact</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <Leaf className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{netImpactDisplay}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            {carbon.net_impact_kg < 0 ? 'Net Carbon Negative' : carbon.net_impact_kg > 0 ? 'Net Carbon Positive' : 'Data belum diinput di WBS'}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">Serapan Pohon</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <Trees className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{carbon.trees_equivalent > 0 ? formatTreesEquivalent(carbon.trees_equivalent) : '—'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            Asumsi 5 kg CO₂e / pohon / tahun
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">Monetized Env Value</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <DollarSign className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{valDisplay}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap truncate">
            <span>Acuan:</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{valuation.benchmark_name}</Badge>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">EROI Ratio</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <Scale className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{eroiDisplay}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            Pengembalian lingkungan per investasi
          </CardContent>
        </Card>
      </div>

      {/* SCOPE DISTRIBUTION CHART AREA */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Distribusi Emisi & Serapan Karbon Per Scope (kg CO₂e)
          </CardTitle>
          <CardDescription className="text-xs">
            Rincian emisi langsung (Scope 1), emisi energi (Scope 2), dan emisi/pengurangan rantai pasok (Scope 3) bersumber dari WBS.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: number) => [`${val.toLocaleString('id-ID')} kg CO₂e`, 'Dampak Karbon']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {scopeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
