import React from 'react';
import SEO from '@/components/SEO';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { BerdayaHero } from '@/components/berdaya/BerdayaHero';
import { BerdayaPilihJalur } from '@/components/berdaya/BerdayaPilihJalur';
import { BerdayaKenapaBuku } from '@/components/berdaya/BerdayaKenapaBuku';
import { BerdayaBeforeAfter } from '@/components/berdaya/BerdayaBeforeAfter';
import { BerdayaEkosistemHub } from '@/components/berdaya/BerdayaEkosistemHub';
import { BerdayaMasalah } from '@/components/berdaya/BerdayaMasalah';
import { BerdayaPelajaran } from '@/components/berdaya/BerdayaPelajaran';
import { BerdayaDemo } from '@/components/berdaya/BerdayaDemo';
import { BerdayaIsiPaket } from '@/components/berdaya/BerdayaIsiPaket';
import { BerdayaWakafMasjid } from '@/components/berdaya/BerdayaWakafMasjid';
import { BerdayaTargetPengguna } from '@/components/berdaya/BerdayaTargetPengguna';
import { BerdayaFAQ } from '@/components/berdaya/BerdayaFAQ';
import { BerdayaCTA } from '@/components/berdaya/BerdayaCTA';

export default function Berdaya() {
  const seoTitle = "Buku & Paket Berdaya — Blueprint & System Orchestration Organisasi Sosial";
  const seoDescription = "Dapatkan Buku 'Grant Banyak, Sistem Nggak Ada' & Paket Berdaya Impactory. Akselerasi proposal hibah AI, LFA standar donor, dan pengukuran dampak SROI.";
  const ogImage = "https://impactory.id/images/ebook_grant_banyak_sistem_gak_ada.png";

  return (
    <div className="landing-page-wrap min-h-screen bg-[#0A1D25] text-white selection:bg-teal-500 selection:text-white flex flex-col font-sans antialiased">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalUrl="/berdaya"
        ogType="product"
        ogImage={ogImage}
      />

      <Navbar />

      <main className="flex-grow">
        {/* Product Sales Flow */}
        <BerdayaHero />
        <BerdayaPilihJalur />
        <BerdayaKenapaBuku />
        <BerdayaBeforeAfter />
        <BerdayaEkosistemHub />
        <BerdayaMasalah />
        <BerdayaPelajaran />
        <BerdayaDemo />
        <BerdayaIsiPaket />
        <BerdayaWakafMasjid />
        <BerdayaTargetPengguna />
        <BerdayaFAQ />
        <BerdayaCTA />
      </main>

      <Footer />
    </div>
  );
}
