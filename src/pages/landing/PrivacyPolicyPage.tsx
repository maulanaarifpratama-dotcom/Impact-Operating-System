import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ShieldCheck, Calendar, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-surface text-white selection:bg-teal-500 selection:text-white flex flex-col">
      <Navbar />

      {/* Main Content Area */}
      <section className="flex-grow py-16 sm:py-24 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="container max-w-4xl mx-auto px-4 relative z-10">
          
          {/* Header Metadata */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-500/10 items-center justify-center text-teal-400 border border-teal-500/20 mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-100">
              Kebijakan Privasi
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
              Impactory berkomitmen untuk menghormati dan melindungi privasi data pribadi pengguna kami sesuai dengan ketentuan <strong>Undang-Undang Perlindungan Data Pribadi (UU PDP) No. 27 Tahun 2022</strong> Republik Indonesia. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi Anda saat menggunakan platform kami.
            </p>

            <hr className="border-white/5" />

            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">1.</span> Data yang Kami Kumpulkan
              </h2>
              <p>
                Kami mengumpulkan data pribadi yang Anda berikan secara langsung saat mendaftar, mengonfigurasi profil, membuat program kerja, atau berinteraksi dengan layanan kami. Data tersebut meliputi:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong>Data Identitas Akun:</strong> Nama lengkap, alamat email aktif, kata sandi terenkripsi, dan nomor telepon seluler.</li>
                <li><strong>Data Organisasi:</strong> Nama yayasan/lembaga sosial, struktur organisasi, alamat kantor, dan berkas identitas verifikasi organisasi jika diperlukan.</li>
                <li><strong>Data Program dan Operasional:</strong> Dokumen logical framework (LFA), rincian anggaran program kerja, informasi indikator dampak, log penerima manfaat program, data bukti kerja lapangan (evidence), berkas-berkas perpustakaan digital (library), dan konten keluaran AI yang dihasilkan dalam sistem.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">2.</span> Tujuan Pengumpulan Data
              </h2>
              <p>
                Seluruh data yang dikumpulkan digunakan semata-mata untuk mengoperasikan platform Impactory secara andal dan profesional. Tujuan pemrosesan data meliputi:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>Menyediakan fungsionalitas inti seluruh modul G.R.O.W.T.H. (LFA Builder, SROI/E-ROI Calculator, GrantWriter AI, Donor CRM).</li>
                <li>Melakukan verifikasi akun pengguna, validasi data, dan pencegahan tindakan penyalahgunaan keamanan sistem.</li>
                <li>Menghasilkan dokumen laporan program sosial yang dapat diunduh (PDF) dan dianalisis.</li>
                <li>Mengirim notifikasi sistem operasional penting, pembaruan fitur mingguan (newsletter), serta menanggapi keluhan pengguna di saluran dukungan pelanggan.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">3.</span> Penyimpanan dan Keamanan Data
              </h2>
              <p>
                Impactory bermitra dengan penyedia layanan cloud kelas dunia untuk memastikan ketersediaan tinggi dan perlindungan berlapis atas data Anda. 
              </p>
              <p>
                Seluruh data basis data relasional dan penyimpanan berkas bukti fisik Anda diinang secara aman pada infrastruktur <strong>Supabase (Singapura region)</strong> dengan enkripsi data saat berpindah (Data-in-Transit menggunakan protokol SSL/TLS) dan enkripsi data saat diam (Data-at-Rest menggunakan algoritma standar militer AES-256). Kami tidak pernah membagikan atau menjual basis data pribadi atau dokumen internal organisasi Anda kepada pihak ketiga mana pun tanpa persetujuan eksplisit Anda.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">4.</span> Hak Pengguna (Hak Subjek Data)
              </h2>
              <p>
                Sesuai dengan mandat bab khusus dalam <strong>UU PDP Republik Indonesia</strong>, Anda sebagai subjek data memiliki hak penuh atas pengelolaan data Anda pada platform kami, termasuk:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong>Hak Akses:</strong> Memperoleh informasi jelas mengenai rincian data Anda yang sedang diproses di dalam sistem.</li>
                <li><strong>Hak Koreksi:</strong> Meminta perbaikan, pemutakhiran, atau pembaruan atas kesalahan penulisan data pribadi Anda kapan saja.</li>
                <li><strong>Hak Hapus Data:</strong> Meminta penghapusan permanen (pemusnahan) atas seluruh akun dan rekaman berkas-berkas program Anda dari database aktif kami.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-teal-400">5.</span> Kontak Perlindungan Data
              </h2>
              <p>
                Apabila Anda memiliki pertanyaan, keberatan, atau ingin mengajukan permohonan hak penghapusan data secara permanen dari server kami, Anda dapat menghubungi penanggung jawab perlindungan data pribadi kami melalui kontak di bawah ini:
              </p>
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 max-w-md">
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Email Perlindungan Data</h4>
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
