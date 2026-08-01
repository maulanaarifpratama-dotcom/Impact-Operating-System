// src/components/esg/SocialTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Heart, TrendingUp, UserCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ESGSocialMetrics } from '@/lib/esg/types';
import { formatCurrency } from '@/lib/carbon/formatters';

interface SocialTabProps {
  data: ESGSocialMetrics;
}

export function SocialTab({ data }: SocialTabProps) {
  const demoData = [
    { name: 'Perempuan', percentage: data.female_percentage, color: '#ec4899' },
    { name: 'Pemuda (Youth)', percentage: data.youth_percentage, color: '#8b5cf6' },
    { name: 'Kelompok Rentan', percentage: data.vulnerable_percentage, color: '#f59e0b' },
  ];

  const benDisplay = data.total_beneficiaries > 0 
    ? `${data.total_beneficiaries.toLocaleString('id-ID')} Jiwa` 
    : 'Belum Ada Data';

  const socialValDisplay = data.social_value_idr > 0 
    ? formatCurrency(data.social_value_idr) 
    : '—';

  const sroiRatioDisplay = data.sroi_ratio > 0 
    ? `1 : ${data.sroi_ratio}` 
    : '—';

  return (
    <div className="space-y-6">
      {/* PRIMARY HERO KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PRIMARY HERO: TOTAL BENEFICIARIES */}
        <Card className="bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-900 border-blue-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-blue-800 dark:text-blue-400">
              Total Penerima Manfaat
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <Users className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{benDisplay}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            Terdaftar di Beneficiary Registry
          </CardContent>
        </Card>

        {/* SECONDARY: FEMALE PARTICIPATION */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">Keterlibatan Perempuan</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <Heart className="w-5 h-5 text-pink-600 shrink-0" />
              <span>{data.female_percentage > 0 ? `${data.female_percentage}%` : '—'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <Progress value={data.female_percentage} className="h-1.5 bg-slate-100" />
          </CardContent>
        </Card>

        {/* SECONDARY: NET SOCIAL VALUE */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">Net Social Value</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{socialValDisplay}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            SROI Social Value
          </CardContent>
        </Card>

        {/* SECONDARY: SROI RATIO */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">SROI Return Ratio</CardDescription>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap truncate">
              <UserCheck className="w-5 h-5 text-purple-600 shrink-0" />
              <span>{sroiRatioDisplay}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 whitespace-nowrap truncate">
            Return sosial per dana hibah
          </CardContent>
        </Card>
      </div>

      {/* DEMOGRAPHICS BREAKDOWN CHART */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Users className="w-4 h-4 text-blue-600" />
            Profil Demografi & Inklusivitas Penerima Manfaat (%)
          </CardTitle>
          <CardDescription className="text-xs">
            Persentase partisipasi perempuan, pemuda, dan kelompok rentan/disabilitas.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: number) => [`${val}%`, 'Persentase Partisipasi']}
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
