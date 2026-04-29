import { Card } from '@/components/ui/card';
import { Clock, FileWarning, TrendingDown } from 'lucide-react';

const problems = [
  {
    icon: Clock,
    title: 'Proposal hibah makan waktu berminggu-minggu',
    body: 'Yayasan kecil sering kalah dari kompetitor karena tidak punya tim full-time untuk menulis proposal lengkap dengan LFA.',
  },
  {
    icon: FileWarning,
    title: 'Funder ditolak karena format & data tidak sesuai',
    body: '70% proposal lokal gagal di tahap screening karena tidak mengikuti standar internasional yang dipakai donor besar.',
  },
  {
    icon: TrendingDown,
    title: 'Kampanye fundraising tidak konversi',
    body: 'Copy ad generic, audience targeting salah, budget habis tanpa hasil. Konsultan mahal, agency tidak paham konteks sosial.',
  },
];

export function Problem() {
  return (
    <section id="problem" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2">
            Tools untuk pembangun dampak dibuat untuk{' '}
            <span className="text-destructive">pasar Barat</span> — bukan realita Indonesia.
          </h2>
          <p className="mt-4 text-subheading">
            Anda kompeten. Tapi infrastruktur yang Anda butuhkan untuk bersaing belum pernah
            dibangun — sampai sekarang.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {problems.map((p) => (
            <Card key={p.title} className="border-border/70 p-6 shadow-card transition-shadow hover:shadow-elegant">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-h4">{p.title}</h3>
              <p className="mt-2 text-body-sm text-muted-foreground">{p.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}