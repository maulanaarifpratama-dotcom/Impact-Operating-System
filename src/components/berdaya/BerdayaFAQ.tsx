import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const BerdayaFAQ: React.FC = () => {
  const faqs = [
    {
      q: "Apakah nilai Rp2,39 miliar per tahun itu uang tunai yang langsung diterima organisasi?",
      a: "Bukan. Nilai tersebut adalah kombinasi kredit iklan in-kind, estimasi penghematan lisensi, dan cloud credit dari penyedia seperti Google dan Microsoft — bukan dana tunai, dan tidak dapat dicairkan. Nilai aktual bergantung pada eligibility, approval, kurs, dan kebijakan masing-masing penyedia."
    },
    {
      q: "Apakah buku ini menjamin organisasi saya disetujui atau pasti mendapatkan benefit?",
      a: "Tidak. Buku tidak menjamin approval dan bukan pengganti keputusan resmi penyedia program. Buku membantu Anda memahami peluang, menentukan prioritas, dan membangun kesiapan organisasi — tahapan, urutan, dan readiness checklist yang berbeda untuk setiap program dibahas secara sistematis di dalam buku."
    },
    {
      q: "Apa itu Paket Berdaya Impactory?",
      a: "Paket Berdaya adalah program solusi terpadu dari Impactory yang menggabungkan lisensi akses platform software Impactory (GrantWriter AI, LFA Builder, SROI Calculator, Donor CRM), pustaka template SOP, serta kontribusi wakaf untuk pembangunan Masjid Ar-Rustendi."
    },
    {
      q: "Bagaimana cara mengakses platform Impactory setelah melakukan pembelian di Lynk?",
      a: "Setelah transaksi berhasil dikonfirmasi melalui Lynk, Anda akan menerima instruksi aktivasi akun dan link akses langsung via WhatsApp/Email resmi Impactory untuk mengaktifkan seluruh fitur platform dan mengunduh pustaka template."
    },
    {
      q: "Apakah Paket Berdaya cocok untuk yayasan kecil atau komunitas yang baru berdiri?",
      a: "Sangat cocok! Paket Berdaya dirancang khusus agar mudah digunakan oleh organisasi dari berbagai skala. Template SOP yang disediakan membantu organisasi pemula membangun standar operasional profesional dalam waktu singkat."
    },
    {
      q: "Bagaimana alokasi Wakaf Masjid Ar-Rustendi dikelola?",
      a: "Sebagian dari hasil penjualan Paket Berdaya dialokasikan secara langsung dan transparan untuk dana pembangunan serta operasional kegiatan ibadah Masjid Ar-Rustendi. Tim Impactory secara berkala memberikan laporan keterbukaan penyaluran wakaf kepada para pengguna."
    },
    {
      q: "Perangkat apa saja yang dibutuhkan untuk menjalankan Impactory?",
      a: "Impactory adalah platform berbasis web (Cloud/SaaS). Anda hanya membutuhkan laptop atau komputer dengan browser modern (Chrome, Edge, Firefox, Safari) dan koneksi internet tanpa perlu menginstal aplikasi berat."
    }
  ];

  return (
    <section className="py-20 bg-[#0D2530] border-b border-white/5 relative">
      <div className="container max-w-4xl mx-auto px-4 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            Pertanyaan Umum
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h2>
          <p className="mt-3 text-slate-300 text-sm sm:text-base">
            Temukan jawaban atas pertanyaan umum seputar Paket Berdaya dan pengaksesan platform Impactory.
          </p>
        </div>

        <div className="bg-[#0A1D25] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`faq-${idx}`} 
                className="border border-white/10 rounded-xl px-5 py-2 bg-slate-900/50 data-[state=open]:border-teal-500/40 data-[state=open]:bg-slate-900 transition-all"
              >
                <AccordionTrigger className="text-left font-bold text-white text-base hover:text-teal-300 hover:no-underline py-3">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 text-sm leading-relaxed pb-4 pt-1">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </div>
    </section>
  );
};
