// src/components/esg/OverviewCharts.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ESGSummaryPayload } from '@/lib/esg/types';

interface OverviewChartsProps {
  data: ESGSummaryPayload;
}

export function OverviewCharts({ data }: OverviewChartsProps) {
  const { environment, social } = data;

  const scopeData = [
    { name: 'Scope 1', value: environment.carbon.scope_breakdown.scope1_kg, color: '#10b981' },
    { name: 'Scope 2', value: environment.carbon.scope_breakdown.scope2_kg, color: '#3b82f6' },
    { name: 'Scope 3', value: environment.carbon.scope_breakdown.scope3_kg, color: '#f59e0b' },
  ];

  const demoData = [
    { name: 'Perempuan', percentage: social.female_percentage, color: '#ec4899' },
    { name: 'Pemuda', percentage: social.youth_percentage, color: '#8b5cf6' },
    { name: 'Rentan', percentage: social.vulnerable_percentage, color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CHART 1: CARBON SCOPE DISTRIBUTION */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
            Distribusi Dampak Karbon Per Scope (kg CO₂e)
          </CardTitle>
          <CardDescription className="text-xs">
            Ringkasan dampak karbon langsung (Scope 1), energi (Scope 2), dan rantai pasok (Scope 3).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
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

      {/* CHART 2: SOCIAL IMPACT DEMOGRAPHICS */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Users className="w-4 h-4 text-blue-600 shrink-0" />
            Profil Inklusivitas Penerima Manfaat (%)
          </CardTitle>
          <CardDescription className="text-xs">
            Proporsi keterlibatan kelompok sasaran perempuan, pemuda, dan kelompok rentan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: number) => [`${val}%`, 'Partisipasi']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                  {demoData.map((entry, index) => (
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
