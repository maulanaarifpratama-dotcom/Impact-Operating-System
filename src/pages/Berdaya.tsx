import React from 'react';
import SEO from '@/components/SEO';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { BerdayaHero } from '@/components/berdaya/BerdayaHero';
import { BerdayaPilihJalur } from '@/components/berdaya/BerdayaPilihJalur';
import { BerdayaKenapaBuku } from '@/components/berdaya/BerdayaKenapaBuku';
import { BerdayaPreviewBuku } from '@/components/berdaya/BerdayaPreviewBuku';
import { BerdayaPanduanPilihan } from '@/components/berdaya/BerdayaPanduanPilihan';
import { BerdayaBeforeAfter } from '@/components/berdaya/BerdayaBeforeAfter';
import { BerdayaEkosistemHub } from '@/components/berdaya/BerdayaEkosistemHub';
import { BerdayaMasalah } from '@/components/berdaya/BerdayaMasalah';
import { BerdayaPelajaran } from '@/components/berdaya/BerdayaPelajaran';
import { BerdayaDemo } from '@/components/berdaya/BerdayaDemo';
import { BerdayaIsiPaket } from '@/components/berdaya/BerdayaIsiPaket';
import { BerdayaWakafMasjid } from '@/components/berdaya/BerdayaWakafMasjid';
import { BerdayaTargetPengguna } from '@/components/berdaya/BerdayaTargetPengguna';
import { BerdayaValueStack } from '@/components/berdaya/BerdayaValueStack';
import { BerdayaFAQ } from '@/components/berdaya/BerdayaFAQ';
import { BerdayaCTA } from '@/components/berdaya/BerdayaCTA';
import { BerdayaStickyCTA } from '@/components/berdaya/BerdayaStickyCTA';

export default function Berdaya() {
  // Keyword-focused SEO Title
  const seoTitle = "Buku Grant Banyak Sistem Nggak Ada & Paket Berdaya Impactory | Cara NGO Naik Kelas";
  
  // Benefit-focused Meta Description
  const seoDescription = "Solusi praktis NGO & Yayasan: Dapatkan Ebook 'Grant Banyak, Sistem Nggak Ada' (Rp129rb) & Paket Berdaya (Rp499rb). Akselerasi proposal hibah AI & LFA donor.";
  
  // Ebook Cover OpenGraph Image
  const ogImage = "https://impactory.id/images/ebook_grant_banyak_sistem_gak_ada.png";

  return (
    <div className="landing-page-wrap min-h-screen bg-[#0A1D25] text-white selection:bg-teal-500 selection:text-white flex flex-col font-sans antialiased relative">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalUrl="/berdaya"
        ogType="product"
        ogImage={ogImage}
      />

      <Navbar />

      <main className="flex-grow">
        {/* CRO Sales Funnel — narrative order: masalah dulu, penawaran setelah konteks terbangun */}
        <BerdayaHero />
        <BerdayaMasalah />
        <BerdayaEkosistemHub />
        <BerdayaKenapaBuku />
        <BerdayaPreviewBuku />
        <BerdayaPelajaran />
        <BerdayaDemo />
        <BerdayaBeforeAfter />
        <BerdayaTargetPengguna />
        <BerdayaPilihJalur />
        <BerdayaIsiPaket />
        <BerdayaValueStack />
        <BerdayaWakafMasjid />
        <BerdayaPanduanPilihan />
        <BerdayaFAQ />
        <BerdayaCTA />
      </main>

      {/* Persistent Floating Sticky CTA Bar */}
      <BerdayaStickyCTA />

      <Footer />
    </div>
  );
}
