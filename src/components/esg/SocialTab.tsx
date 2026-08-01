// src/components/esg/SocialTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, TrendingUp, UserCheck, ShieldAlert } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* SUMMARY KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Penerima Manfaat</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Users className="w-5 h-5 text-blue-600" />
              {data.total_beneficiaries.toLocaleString('id-ID')} Jiwa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Terverifikasi melalui Beneficiary Registry
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Proporsi Perempuan</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Heart className="w-5 h-5 text-pink-600" />
              {data.female_percentage}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Dukungan kesetaraan gender & inklusif
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Net Present Social Value</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              {formatCurrency(data.social_value_idr)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Nilai manfaat sosial terkuantifikasi (SROI)
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Social Return On Investment</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <UserCheck className="w-5 h-5 text-purple-600" />
              1 : {data.sroi_ratio}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Rasio pengembalian sosial per dana hibah
          </CardContent>
        </Card>
      </div>

      {/* DEMOGRAPHICS BREAKDOWN CHART */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Profil Demografi & Inklusivitas Penerima Manfaat (%)
          </CardTitle>
          <CardDescription className="text-xs">
            Persentase keterlibatan partisipan perempuan, pemuda, dan kelompok rentan/disabilitas.
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
