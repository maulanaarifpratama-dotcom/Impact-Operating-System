import { Card } from '@/components/ui/card';

const stats = [
  { value: '10x', label: 'lebih cepat menulis proposal hibah' },
  { value: '70%', label: 'biaya lebih rendah dibanding sewa konsultan' },
  { value: '24/7', label: 'akses ke template & data dampak' },
  { value: '100%', label: 'konteks Indonesia, bukan terjemahan' },
];

export function Solution() {
  return (
    <section className="bg-gradient-hero py-20 text-white md:py-28">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Satu platform untuk seluruh siklus dampak Anda
          </h2>
          <p className="mt-4 text-lg text-white/80">
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
              <div className="text-4xl font-bold tracking-tight text-white md:text-5xl">{s.value}</div>
              <div className="mt-2 text-sm text-white/75">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}