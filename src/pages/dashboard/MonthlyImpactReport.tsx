import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Key = 'periode' | 'program' | 'organisasi' | 'pic' | 'aktivitas' | 'lokasi' | 'target' | 'donasi' | 'donor' | 'penerimaManfaat' | 'output' | 'outcome' | 'cerita' | 'dokumentasi' | 'kendala' | 'pembelajaran' | 'rencana' | 'kebutuhan' | 'cta';
type Draft = Record<Key, string>;

type Field = { key: Key; label: string; placeholder: string; textarea?: boolean };
type FormSection = { title: string; fields: Field[] };

const empty: Draft = {
  periode: '', program: '', organisasi: '', pic: '', aktivitas: '', lokasi: '', target: '',
  donasi: '', donor: '', penerimaManfaat: '', output: '', outcome: '', cerita: '',
  dokumentasi: '', kendala: '', pembelajaran: '', rencana: '', kebutuhan: '', cta: '',
};

const sections: FormSection[] = [
  { title: 'Informasi Dasar', fields: [
    { key: 'periode', label: 'Periode laporan', placeholder: 'Mei 2026' },
    { key: 'program', label: 'Nama program', placeholder: 'Program Literasi Anak' },
    { key: 'organisasi', label: 'Nama organisasi', placeholder: 'Yayasan / Komunitas / Social Enterprise' },
    { key: 'pic', label: 'PIC laporan', placeholder: 'Nama PIC' },
  ]},
  { title: 'Ringkasan Program', fields: [
    { key: 'aktivitas', label: 'Aktivitas utama bulan ini', placeholder: 'Contoh: 8 sesi kelas literasi, 2 pelatihan relawan, distribusi 100 paket belajar.', textarea: true },
    { key: 'lokasi', label: 'Lokasi program', placeholder: 'Kota / wilayah program' },
    { key: 'target', label: 'Target penerima manfaat', placeholder: 'Anak usia 7–12 tahun, keluarga prasejahtera, dsb.' },
  ]},
  { title: 'Angka Utama', fields: [
    { key: 'donasi', label: 'Total donasi / dukungan', placeholder: 'Rp 25.000.000 atau belum tersedia' },
    { key: 'donor', label: 'Total donor / partner', placeholder: '120 donor / 3 partner' },
    { key: 'penerimaManfaat', label: 'Total penerima manfaat', placeholder: '100 anak / 50 keluarga' },
    { key: 'output', label: 'Output utama', placeholder: '100 paket belajar, 8 sesi kelas, 20 relawan aktif' },
  ]},
  { title: 'Outcome Awal', fields: [
    { key: 'outcome', label: 'Perubahan awal yang terlihat', placeholder: 'Contoh: Anak mulai rutin hadir, orang tua lebih terlibat, relawan lebih terstruktur.', textarea: true },
  ]},
  { title: 'Cerita Impact', fields: [
    { key: 'cerita', label: 'Cerita penerima manfaat / highlight lapangan', placeholder: 'Tulis cerita singkat yang sudah memiliki izin penggunaan. Hindari data sensitif.', textarea: true },
  ]},
  { title: 'Dokumentasi', fields: [
    { key: 'dokumentasi', label: 'Link foto / video / dokumen pendukung', placeholder: 'Link Drive/Canva/website. Pastikan akses dan izin penggunaan sudah aman.', textarea: true },
  ]},
  { title: 'Kendala dan Pembelajaran', fields: [
    { key: 'kendala', label: 'Kendala bulan ini', placeholder: 'Contoh: Kehadiran menurun karena hujan, relawan terbatas, lokasi sulit dijangkau.', textarea: true },
    { key: 'pembelajaran', label: 'Pembelajaran', placeholder: 'Apa yang dipelajari dan akan diperbaiki bulan depan?', textarea: true },
  ]},
  { title: 'Rencana Bulan Depan', fields: [
    { key: 'rencana', label: 'Rencana aktivitas bulan depan', placeholder: 'Contoh: tambah 2 sesi kelas, follow-up donor, training relawan.', textarea: true },
    { key: 'kebutuhan', label: 'Kebutuhan dukungan', placeholder: 'Contoh: 50 paket belajar, 10 relawan, transportasi program.', textarea: true },
    { key: 'cta', label: 'CTA untuk donor / partner', placeholder: 'Contoh: Dukung 1 anak dengan Rp150.000 untuk paket belajar.', textarea: true },
  ]},
];

const metrics: Array<{ label: string; key: Key }> = [
  { label: 'Total donasi / dukungan', key: 'donasi' },
  { label: 'Total donor / partner', key: 'donor' },
  { label: 'Total penerima manfaat', key: 'penerimaManfaat' },
  { label: 'Output utama', key: 'output' },
];

const checklist = [
  'Angka penerima manfaat sudah dicek',
  'Nominal donasi/dukungan sudah sesuai data',
  'Cerita penerima manfaat sudah memiliki izin',
  'Foto/video aman untuk dibagikan',
  'Kendala ditulis jujur dan konstruktif',
  'CTA donor/partner jelas',
  'PIC laporan sudah review',
];


const workflowLinks = [
  {
    title: 'Impact Library',
    description: 'Simpan laporan bulanan sebagai aset untuk proposal, campaign, dan donor update berikutnya.',
    cta: 'Buka Impact Library',
    href: '/dashboard/impactory-library',
  },
  {
    title: 'Campaign Builder',
    description: 'Gunakan highlight impact bulan ini sebagai bahan campaign berikutnya.',
    cta: 'Bangun Campaign',
    href: '/dashboard/impactory-ads',
  },
  {
    title: 'Grantwriter',
    description: 'Gunakan laporan impact sebagai bukti program dalam proposal grant.',
    cta: 'Buka Grantwriter',
    href: '/dashboard/grant-writer',
  },
  {
    title: 'Grant Pipeline',
    description: 'Gunakan laporan ini untuk memperkuat submission grant prioritas.',
    cta: 'Lihat Grant Pipeline',
    href: '/dashboard/grantfinder',
  },
];
const show = (value: string) => value.trim() || 'Belum diisi';

function Block({ title, value, note }: { title: string; value: string; note?: string }) {
  return <section className="rounded-xl border bg-card p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{show(value)}</p>{note && <p className="mt-3 text-xs text-amber-700">{note}</p>}</section>;
}

export default function MonthlyImpactReport() {
  const [report, setReport] = useState<Draft>(empty);
  const update = (key: Key, value: string) => setReport((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="space-y-3"><Badge className="w-fit border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">Harvest & Review</Badge><div className="space-y-2"><h1 className="text-h1">Monthly Impact Report</h1><p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">Susun laporan bulanan sebagai proof system untuk donor, funder, dan review internal.</p></div></div><div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-14 md:w-14"><BarChart3 className="h-6 w-6 md:h-7 md:w-7" /></div></div>
      </Card>

      <Card className="space-y-3 border-primary/15 bg-primary/5 p-5 shadow-card md:p-6"><h2 className="text-xl font-semibold">Impact yang terdokumentasi lebih mudah dipercaya</h2><p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">Laporan bulanan membantu organisasi menunjukkan progres, menjaga trust donor, dan belajar dari data program setiap bulan.</p><div className="flex max-w-3xl items-start gap-2 rounded-xl border border-amber-500/25 bg-background/70 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p>Jangan mengarang angka impact. Jika data belum tersedia, tulis sebagai perlu dilengkapi.</p></div></Card>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="space-y-6 p-5 shadow-card md:p-6"><div className="space-y-1"><h2 className="text-lg font-semibold">Form Laporan</h2><p className="text-xs text-muted-foreground">Isi dengan data organisasi yang bisa dicek. Angka utama menggunakan input teks agar bisa memuat catatan.</p></div>{sections.map((section) => <section key={section.title} className="space-y-4"><h3 className="text-sm font-semibold">{section.title}</h3>{section.fields.map((field) => <div key={field.key} className="space-y-2"><Label htmlFor={field.key}>{field.label}</Label>{field.textarea ? <Textarea id={field.key} value={report[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} rows={4} /> : <Input id={field.key} value={report[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} />}</div>)}</section>)}</Card>

        <div className="space-y-6">
          <Card className="space-y-6 p-5 shadow-card md:p-6"><div className="space-y-1"><h2 className="text-xl font-semibold">Preview Laporan</h2><p className="text-sm text-muted-foreground">Preview ini berubah mengikuti input Anda. Gunakan sebagai draft internal sebelum dibagikan ke donor atau funder.</p></div><section className="rounded-2xl border bg-muted/20 p-5"><h3 className="text-2xl font-semibold">{show(report.program)} — Monthly Impact Report</h3><div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3"><p>Periode: {show(report.periode)}</p><p>Organisasi: {show(report.organisasi)}</p><p>PIC: {show(report.pic)}</p></div></section><section className="space-y-3"><h3 className="font-semibold">Ringkasan Bulan Ini</h3><p className="text-sm text-muted-foreground">Aktivitas utama: {show(report.aktivitas)}</p><p className="text-sm text-muted-foreground">Lokasi: {show(report.lokasi)}</p><p className="text-sm text-muted-foreground">Target penerima manfaat: {show(report.target)}</p></section><section className="space-y-3"><h3 className="font-semibold">Angka Utama</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <div key={metric.key} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 text-sm font-semibold">{show(report[metric.key])}</p></div>)}</div></section><Block title="Outcome Awal" value={report.outcome} /><Block title="Cerita Impact" value={report.cerita} note="Pastikan cerita ini sudah memiliki izin penggunaan." /><Block title="Dokumentasi" value={report.dokumentasi} /><section className="grid gap-4 md:grid-cols-2"><Block title="Kendala" value={report.kendala} /><Block title="Pembelajaran" value={report.pembelajaran} /></section><section className="space-y-3"><h3 className="font-semibold">Rencana Bulan Depan</h3><p className="text-sm text-muted-foreground">Rencana aktivitas: {show(report.rencana)}</p><p className="text-sm text-muted-foreground">Kebutuhan dukungan: {show(report.kebutuhan)}</p><p className="text-sm text-muted-foreground">CTA donor / partner: {show(report.cta)}</p></section><div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-muted-foreground">Laporan ini adalah draft internal. Cek kembali angka, izin cerita, dokumentasi, dan data program sebelum dibagikan ke donor/funder.</div></Card>

          <Card className="space-y-4 p-5 shadow-card md:p-6"><h2 className="text-xl font-semibold">Checklist sebelum dibagikan</h2><div className="grid gap-3 md:grid-cols-2">{checklist.map((item) => <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{item}</span></div>)}</div></Card>
        </div>
      </div>

      <Card className="space-y-5 p-5 shadow-card md:p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Hubungkan laporan dengan sistem</h2>
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Laporan bulanan menjadi bahan baku untuk proposal, campaign, library, dan review berikutnya.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workflowLinks.map((item) => (
            <Card key={item.href} className="flex flex-col p-4">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              <Button asChild variant="outline" size="sm" className="mt-4 justify-between">
                <Link to={item.href}>{item.cta}<ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h2 className="text-xl font-semibold">Lanjutkan workflow impact</h2>
          <p className="text-sm text-muted-foreground">Kembali ke dashboard atau simpan laporan sebagai bahan di Impact Library.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/dashboard">Kembali ke Dashboard</Link></Button>
          <Button asChild><Link to="/dashboard/impactory-library">Buka Impact Library</Link></Button>
        </div>
      </Card>
    </div>
  );
}
