import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { FileText, Calendar, Mail } from 'lucide-react';
import SEO from '@/components/SEO';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-surface text-white selection:bg-teal-500 selection:text-white flex flex-col">
      <SEO
        title="Syarat & Ketentuan Layanan Impactory.id"
        description="Syarat dan Ketentuan Ketentuan Layanan resmi Impactory.id mengenai lisensi penggunaan platform, hak kekayaan intelektual, dan ketetapan layanan."
        canonicalUrl="/terms"
      />
      <Navbar />

      {/* Main Content Area */}
      <section className="flex-grow py-16 sm:py-24 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="container max-w-4xl mx-auto px-4 relative z-10">
          
          {/* Header Metadata */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-500/10 items-center justify-center text-teal-400 border border-teal-500/20 mb-2">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-100">
              Syarat dan Ketentuan
            </h1>
            <div className="flex items-center justify-center gap-6 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-teal-400" />
                Tanggal Efektif: 19 Juni 2026
              </span>
            </div>
          </div>

          {/* Legal Document Paper Card */}
          <div className="bg-brand-surface-mid/40 border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-sm text-slate-300 leading-relaxed">
            
            <p className="italic">
              Selamat datang di Impactory. Harap membaca Syarat dan Ketentuan Layanan ("Ketentuan") ini secara seksama sebelum mengakses atau menggunakan platform kami. Dengan mendaftar, mengakses, atau menggunakan layanan Impactory, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat oleh seluruh Ketentuan ini. Jika Anda tidak menyetujui Ketentuan ini, Anda tidak diperkenankan untuk menggunakan platform kami.
            </p>

            <hr className="border-white/5" />

            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">1.</span> Definisi Layanan Impactory
              </h2>
              <p>
                Impactory adalah platform perangkat lunak sebagai layanan (SaaS) manajemen program sosial khusus untuk Lembaga Swadaya Masyarakat (LSM) / Non-Governmental Organization (NGO) di Indonesia. Layanan mencakup modul-modul standardisasi kerangka kerja G.R.O.W.T.H. termasuk namun tidak terbatas pada LFA Builder, SROI & E-ROI Calculator, GrantWriter AI, Donor CRM, Monitoring & Tracking, serta pelaporan dampak interaktif.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">2.</span> Ketentuan Penggunaan Akun
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong>Kriteria Pengguna:</strong> Layanan ditujukan untuk organisasi sosial yang terdaftar secara sah secara hukum atau komunitas sosial yang kredibel di Indonesia.</li>
                <li><strong>Keamanan Akun:</strong> Anda bertanggung jawab penuh untuk menjaga kerahasiaan kredensial login (email dan sandi) akun Anda. Segala bentuk aktivitas operasional yang terjadi di bawah akun Anda dianggap sebagai tanggung jawab penuh organisasi Anda.</li>
                <li><strong>Penyalahgunaan Sistem:</strong> Anda dilarang menggunakan platform untuk memproses data ilegal, melakukan reverse-engineering terhadap algoritma kami, atau menyalahgunakan fungsionalitas kecerdasan buatan (fair use policy) untuk kepentingan komersial di luar program sosial organisasi Anda.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">3.</span> Pembatasan Tanggung Jawab
              </h2>
              <p>
                Layanan Impactory disediakan atas dasar "sebagaimana adanya" (as is) dan "sebagaimana tersedia" (as available) tanpa jaminan apa pun, baik tersurat maupun tersirat. 
              </p>
              <p>
                Impactory tidak bertanggung jawab atas kerugian operasional, hilangnya kesempatan pendanaan (donor grant), atau kesalahan kalkulasi data di lapangan akibat ketidakakuratan input data oleh pengguna. Fitur kecerdasan buatan (GrantWriter AI) kami adalah alat bantu perancangan proposal dan tidak menjamin penerimaan proposal oleh pihak donor mana pun. Keputusan akhir atas perencanaan dan pelaksanaan program sepenuhnya berada di tangan manajemen organisasi Anda.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">4.</span> Ketentuan Pembayaran dan Refund
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong>Siklus Penagihan:</strong> Layanan berbayar ditagihkan secara berkala di muka (bulanan atau tahunan) sesuai plan pilihan Anda melalui transfer manual atau QRIS via WhatsApp resmi kami.</li>
                <li><strong>Pendanaan Berkelanjutan:</strong> Untuk program Founding Member, harga bulanan atau tahunan dikunci selamanya selama keanggotaan berlangganan Anda tetap berjalan aktif tanpa terputus.</li>
                <li><strong>Kebijakan Refund:</strong> Seluruh transaksi pembayaran yang telah berhasil diverifikasi bersifat final dan tidak dapat di-refund (non-refundable) untuk periode berlangganan berjalan, kecuali disepakati lain dalam kuitansi/perjanjian tertulis resmi.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">5.</span> Penghentian Layanan (Termination)
              </h2>
              <p>
                Anda berhak membatalkan langganan kapan saja melalui menu pengaturan atau konfirmasi ke tim kami via WhatsApp. Impactory juga berhak menangguhkan (suspend) atau menutup akun Anda apabila ditemukan pelanggaran terhadap Ketentuan ini, penipuan, atau aktivitas ilegal yang merusak integritas server dan reputasi platform kami.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">6.</span> Hukum yang Berlaku (Governing Law)
              </h2>
              <p>
                Ketentuan Layanan ini diatur, ditafsirkan, dan dilaksanakan sepenuhnya berdasarkan hukum yang berlaku di <strong>Negara Kesatuan Republik Indonesia</strong>. Segala perselisihan yang timbul dari penggunaan platform ini akan diselesaikan secara musyawarah untuk mufakat, atau jika gagal, diselesaikan melalui yurisdiksi pengadilan negeri yang berwenang di Indonesia.
              </p>
            </div>

            {/* Section 7 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">7.</span> Kontak Layanan
              </h2>
              <p>
                Jika Anda memiliki pertanyaan mengenai Ketentuan Layanan ini, atau menghadapi masalah administrasi hukum organisasi Anda, silakan menghubungi tim hukum dan administrasi kami:
              </p>
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 max-w-md">
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Email Layanan Hukum</h4>
                  <p className="text-sm font-semibold text-teal-400 mt-0.5">arif@impactory.id</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
