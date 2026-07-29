import React from 'react';
import SEO from '@/components/SEO';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { BerdayaHero } from '@/components/berdaya/BerdayaHero';
import { BerdayaEkosistemHub } from '@/components/berdaya/BerdayaEkosistemHub';
import { BerdayaMasalah } from '@/components/berdaya/BerdayaMasalah';
import { BerdayaPelajaran } from '@/components/berdaya/BerdayaPelajaran';
import { BerdayaDemo } from '@/components/berdaya/BerdayaDemo';
import { BerdayaIsiPaket } from '@/components/berdaya/BerdayaIsiPaket';
import { BerdayaWakafMasjid } from '@/components/berdaya/BerdayaWakafMasjid';
import { BerdayaTargetPengguna } from '@/components/berdaya/BerdayaTargetPengguna';
import { BerdayaPricing } from '@/components/berdaya/BerdayaPricing';
import { BerdayaFAQ } from '@/components/berdaya/BerdayaFAQ';
import { BerdayaCTA } from '@/components/berdaya/BerdayaCTA';

export default function Berdaya() {
  return (
    <div className="landing-page-wrap min-h-screen bg-[#0A1D25] text-white selection:bg-teal-500 selection:text-white flex flex-col font-sans antialiased">
      <SEO
        title="Paket Berdaya Impactory — Akselerasi Dampak & Pendanaan Organisasi Sosial"
        description="Solusi lengkap terpadu untuk NGO, Yayasan, dan Penggerak Komunitas. Dapatkan sistem manajemen program modern, kerangka proposal donor, serta kontribusi Wakaf Masjid Ar-Rustendi."
        canonicalUrl="/berdaya"
      />

      <Navbar />

      <main className="flex-grow">
        <BerdayaHero />
        <BerdayaEkosistemHub />
        <BerdayaMasalah />
        <BerdayaPelajaran />
        <BerdayaDemo />
        <BerdayaIsiPaket />
        <BerdayaWakafMasjid />
        <BerdayaTargetPengguna />
        <BerdayaPricing />
        <BerdayaFAQ />
        <BerdayaCTA />
      </main>

      <Footer />
    </div>
  );
}
