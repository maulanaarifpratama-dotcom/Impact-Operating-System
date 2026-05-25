import { Link } from 'react-router-dom';
import { ArrowRight, Cloud, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const summaryCards = [
  ['6 platform utama', 'TechSoup, Goodstack, Canva, Google, Microsoft, Azure.'],
  ['Owner per akses', 'Setiap platform harus punya PIC yang jelas.'],
  ['Status verifikasi', 'Gunakan tracker untuk membedakan planned, in progress, active, dan renewal.'],
  ['Review berkala', 'Akses yang tidak direview bisa mati diam-diam.'],
];

const platforms = [
  ['TechSoup', 'Software donation & discount gateway', 'Software legal, productivity tools, security tools, dan kebutuhan operasional digital.', 'Admin digital / operations', 'Siapkan dokumen legal dan cek eligibility lokal sebelum memilih produk.', 'Mengambil terlalu banyak tools tanpa owner.'],
  ['Goodstack', 'Verification & corporate giving readiness', 'Profil nonprofit, verifikasi organisasi, dan peluang corporate giving.', 'Founder / partnership lead', 'Rapikan nama legal, website, deskripsi organisasi, dan dokumen pendukung.', 'Profil organisasi tidak konsisten dengan dokumen legal.'],
  ['Canva for Nonprofits', 'Content engine', 'Brand kit, template campaign, laporan donor, proposal deck, dan impact story.', 'Content / campaign PIC', 'Setelah approved, langsung buat brand kit dan template inti.', 'Canva dipakai desain dadakan, bukan content operating system.'],
  ['Google for Nonprofits / Google Ads Grant', 'Demand engine', 'Menangkap search intent seperti donasi, relawan, CSR, atau program sosial.', 'Digital marketing / fundraising PIC', 'Pastikan website, landing page, dan conversion tracking siap sebelum mengaktifkan Ads Grant.', 'Mengirim semua traffic ke homepage.'],
  ['Microsoft for Nonprofits', 'Productivity & cloud foundation', 'Email organisasi, collaboration, file storage, productivity suite, dan security.', 'Operations / IT PIC', 'Cek eligibility, admin account, dan setup folder kerja organisasi.', 'Workspace aktif tapi folder dan permission tetap berantakan.'],
  ['Azure Credit', 'Digital infrastructure & AI foundation', 'Hosting, database, storage, dashboard, automation, dan AI infrastructure.', 'Technical owner / product lead', 'Pasang budget alert sebelum membuat resource pertama.', 'Resource cloud dibuat tanpa owner, budget alert, atau tujuan jelas.'],
];

const statuses = [
  ['Planned', 'Belum apply, dokumen dan owner perlu disiapkan.'],
  ['In Progress', 'Application sedang berjalan atau menunggu verifikasi.'],
  ['Active', 'Akses sudah aktif dan digunakan dalam workflow.'],
  ['Renewal Needed', 'Akses perlu dicek ulang, diperbarui, atau diverifikasi kembali.'],
  ['Not Relevant Yet', 'Belum prioritas untuk tahap organisasi saat ini.'],
];

const rules = [
  ['Setiap akses harus punya owner', 'Akun tanpa owner akan hilang, expired, atau tidak dipakai.'],
  ['Akses harus masuk workflow', 'Tools tidak boleh hanya aktif. Tools harus dipakai dalam sistem kerja.'],
  ['Review minimal bulanan', 'Cek status, renewal, penggunaan, dan kendala.'],
  ['Budget alert wajib untuk cloud', 'Azure credit harus punya budget alert sebelum resource dibuat.'],
];

const workflows = [
  ['Impact Library', 'Gunakan Workspace/Microsoft/Drive sebagai fondasi asset library.', 'Buka Impact Library', '/dashboard/impactory-library'],
  ['Campaign Builder', 'Gunakan Canva dan Google Ads Grant untuk membangun campaign yang lebih terukur.', 'Bangun Campaign', '/dashboard/impactory-ads'],
  ['Monthly Impact Report', 'Gunakan cloud/file system untuk menyimpan laporan bulanan dan proof impact.', 'Buat Laporan', '/dashboard/monthly-report'],
  ['Readiness Scorecard', 'Cek apakah fondasi organisasi cukup siap sebelum mengejar akses platform.', 'Cek Readiness', '/dashboard/readiness'],
];

const guidance = ['Planned', 'In Progress', 'Active', 'Renewal Needed'];

export default function ResourceAccessTracker() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">Resource Access</Badge>
            <div className="space-y-2">
              <h1 className="text-h1">Resource Access Tracker</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">Pantau akses TechSoup, Goodstack, Canva, Google, Microsoft, dan Azure agar grant digital menjadi sistem, bukan sekadar akun yang terlupakan.</p>
            </div>
            <p className="text-sm font-medium text-foreground">Tools adalah bahan bakar. Sistem adalah mesin.</p>
          </div>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-14 md:w-14"><KeyRound className="h-6 w-6 md:h-7 md:w-7" /></div>
        </div>
      </Card>

      <Card className="space-y-3 border-primary/15 bg-primary/5 p-5 shadow-card md:p-6">
        <h2 className="text-xl font-semibold">Akses bukan hasil</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">Canva Pro, Google Ads Grant, Microsoft Nonprofit, dan Azure credit adalah bahan bakar. Nilainya baru terasa kalau setiap akses punya owner, status, next action, dan review berkala.</p>
        <div className="flex max-w-4xl items-start gap-2 rounded-xl border border-amber-500/25 bg-background/70 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p>Informasi di halaman ini adalah tracker internal. Selalu cek halaman resmi platform sebelum apply atau renewal karena eligibility dan benefit dapat berubah.</p></div>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{summaryCards.map(([title, helper]) => <Card key={title} className="p-4 shadow-card"><p className="text-sm font-semibold">{title}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{helper}</p></Card>)}</section>

      <section className="space-y-4"><div className="space-y-1"><h2 className="text-xl font-semibold">Platform Tracker</h2><p className="text-sm text-muted-foreground">Status di bawah adalah panduan, bukan data akses organisasi Anda.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{platforms.map(([name, role, helps, owner, nextAction, mistake]) => <Card key={name} className="flex flex-col p-5 shadow-card"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{name}</h3><p className="mt-1 text-xs font-medium text-accent">{role}</p></div><Cloud className="h-5 w-5 shrink-0 text-muted-foreground" /></div><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{helps}</p><div className="mt-4 flex flex-wrap gap-1.5">{guidance.map((status) => <Badge key={status} variant="outline" className="text-[10px]">{status}</Badge>)}</div><div className="mt-4 space-y-3 text-sm"><p><span className="font-semibold">Suggested owner:</span> <span className="text-muted-foreground">{owner}</span></p><p><span className="font-semibold">Next action:</span> <span className="text-muted-foreground">{nextAction}</span></p><p><span className="font-semibold">Common mistake:</span> <span className="text-muted-foreground">{mistake}</span></p></div></Card>)}</div></section>

      <Card className="space-y-4 p-5 shadow-card md:p-6"><h2 className="text-xl font-semibold">Status yang disarankan</h2><div className="grid gap-3 md:grid-cols-5">{statuses.map(([status, description]) => <div key={status} className="rounded-xl border bg-card p-3"><p className="text-sm font-semibold">{status}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p></div>)}</div></Card>

      <section className="space-y-4"><h2 className="text-xl font-semibold">Rule Resource Access</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{rules.map(([title, description]) => <Card key={title} className="p-4 shadow-card"><RefreshCw className="h-4 w-4 text-accent" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></Card>)}</div></section>

      <Card className="space-y-5 p-5 shadow-card md:p-6"><div className="space-y-2"><h2 className="text-xl font-semibold">Dari akses ke sistem</h2><p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">Resource Access adalah bahan bakar untuk layer berikutnya. Setelah akses aktif, hubungkan ke Library, Campaign, Dashboard, dan Report.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{workflows.map(([title, description, cta, href]) => <Card key={href} className="flex flex-col p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p><Button asChild variant="outline" size="sm" className="mt-4 justify-between"><Link to={href}>{cta}<ArrowRight className="h-3.5 w-3.5" /></Link></Button></Card>)}</div></Card>

      <Card className="flex flex-col gap-3 p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-6"><div><h2 className="text-xl font-semibold">Mulai dari fondasi yang siap</h2><p className="text-sm text-muted-foreground">Cek readiness, rapikan library, lalu aktifkan akses sesuai prioritas.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/dashboard">Kembali ke Dashboard</Link></Button><Button asChild variant="outline"><Link to="/dashboard/readiness">Cek Readiness</Link></Button><Button asChild><Link to="/dashboard/impactory-library">Rapikan Impact Library</Link></Button></div></Card>
    </div>
  );
}
