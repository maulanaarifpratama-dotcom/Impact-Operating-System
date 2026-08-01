// src/components/esg/EnvironmentTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Trees, DollarSign, BarChart3, TrendingDown, Scale } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* SUMMARY KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Net Carbon Impact</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Leaf className="w-5 h-5 text-emerald-600" />
              {formatCarbonMass(carbon.net_impact_kg)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {carbon.net_impact_kg < 0 ? 'Net Carbon Negative (Pengurangan Emisi)' : 'Net Carbon Positive (Emisi Bersih)'}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Ekuivalensi Serapan Pohon</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Trees className="w-5 h-5 text-emerald-600" />
              {formatTreesEquivalent(carbon.trees_equivalent)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Dihitung menggunakan faktor serapan 5 kg/pohon/tahun
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Monetized Env Value (NEK)</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {formatCurrency(valuation.net_impact_value_idr)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 flex items-center gap-1">
            <span>Acuan:</span>
            <Badge variant="outline" className="text-[10px] py-0">{valuation.benchmark_name}</Badge>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Environmental Return (EROI)</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Scale className="w-5 h-5 text-amber-600" />
              {eroi?.formatted_ratio || '1 : 0'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Rasio pengembalian lingkungan moneter per investasi
          </CardContent>
        </Card>
      </div>

      {/* GHG SCOPE BREAKDOWN CHART */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Distribusi Emisi & Serapan Karbon Per GHG Scope (kg CO₂e)
          </CardTitle>
          <CardDescription className="text-xs">
            Rincian emisi langsung (Scope 1), emisi energi (Scope 2), dan emisi rantai pasok/pengurangan (Scope 3) dari WBS.
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
