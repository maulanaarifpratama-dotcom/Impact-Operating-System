import { Card } from '@/components/ui/card';

const stats = [
  {
    value: '10x',
    label: 'lebih cepat menulis proposal hibah',
    sub: 'vs. tim full-time 2 minggu',
  },
  {
    value: '70%',
    label: 'biaya lebih rendah dibanding sewa konsultan',
    sub: 'vs. konsultan freelance Rp 5–15jt/proposal',
  },
  {
    value: '500+',
    label: 'template proposal & laporan terkurasi',
    sub: 'siap pakai, format donor internasional',
  },
  {
    value: '1.200+',
    label: 'peluang funding di database',
    sub: 'donor lokal, regional & internasional',
  },
];

export function Solution() {
  return (
    <section className="bg-gradient-hero py-20 text-white md:py-28">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-h2 text-white">
            Satu platform untuk seluruh siklus dampak Anda
          </h2>
          <p className="mt-4 text-subheading text-white/80">
            Dari ide → proposal → funding → kampanye → laporan. Impactory adalah operating system untuk
            organisasi sosial dan UMKM dampak di Indonesia.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <Card
              key={s.label}
              className="border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
            >
              <div className="text-h1 text-white">{s.value}</div>
              <div className="mt-2 text-body-sm text-white/80">{s.label}</div>
              <div className="mt-1.5 text-caption text-white/60">{s.sub}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}