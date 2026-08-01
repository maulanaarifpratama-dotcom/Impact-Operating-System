// src/components/esg/SDGTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Globe } from 'lucide-react';
import { ESGSDGMetrics } from '@/lib/esg/types';

interface SDGTabProps {
  data: ESGSDGMetrics;
}

const OFFICIAL_SDGS = [
  { number: 1, title: 'No Poverty', color: '#e5243b' },
  { number: 2, title: 'Zero Hunger', color: '#dda63a' },
  { number: 3, title: 'Good Health & Well-being', color: '#4c9f38' },
  { number: 4, title: 'Quality Education', color: '#c5192d' },
  { number: 5, title: 'Gender Equality', color: '#ff3a21' },
  { number: 6, title: 'Clean Water & Sanitation', color: '#26bde2' },
  { number: 7, title: 'Affordable & Clean Energy', color: '#fcc30b' },
  { number: 8, title: 'Decent Work & Economic Growth', color: '#a21942' },
  { number: 9, title: 'Industry, Innovation & Infrastructure', color: '#fd6925' },
  { number: 10, title: 'Reduced Inequalities', color: '#dd1367' },
  { number: 11, title: 'Sustainable Cities & Communities', color: '#fd9d24' },
  { number: 12, title: 'Responsible Consumption & Production', color: '#bf8b2e' },
  { number: 13, title: 'Climate Action', color: '#3f7e44' },
  { number: 14, title: 'Life Below Water', color: '#0a97d9' },
  { number: 15, title: 'Life on Land', color: '#56c02b' },
  { number: 16, title: 'Peace, Justice & Strong Institutions', color: '#00689d' },
  { number: 17, title: 'Partnerships for the Goals', color: '#19486a' },
];

export function SDGTab({ data }: SDGTabProps) {
  const alignedNumbers = new Set(data.aligned_sdg_numbers || []);

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                Matriks Kontribusi United Nations SDGs (17 Goals)
              </CardTitle>
              <CardDescription className="text-xs">
                Pemetaan deterministik otomatis kontribusi program terhadap 17 Sustainable Development Goals berdasarkan korelasi indikator LFA & MEAL.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              {alignedNumbers.size} SDGs Terhubung
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {OFFICIAL_SDGS.map((sdg) => {
              const isAligned = alignedNumbers.has(sdg.number);
              const isPrimary = data.primary_sdg === sdg.number;

              return (
                <div
                  key={sdg.number}
                  style={{
                    borderColor: isAligned ? sdg.color : undefined,
                  }}
                  className={`p-3 rounded-xl border flex flex-col justify-between h-32 transition-all ${
                    isAligned
                      ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-offset-1'
                      : 'bg-slate-50 dark:bg-slate-900 opacity-40 grayscale border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{ backgroundColor: sdg.color }}
                      className="text-white text-xs font-bold px-2 py-0.5 rounded-md"
                    >
                      SDG {sdg.number}
                    </span>
                    {isAligned && (
                      <CheckCircle2 className="w-4 h-4" style={{ color: sdg.color }} />
                    )}
                  </div>

                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {sdg.title}
                  </div>

                  {isPrimary && (
                    <Badge className="text-[9px] px-1 py-0 self-start" style={{ backgroundColor: sdg.color }}>
                      PRIMARY SDG
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
