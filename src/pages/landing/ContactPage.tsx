import React, { useState } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Mail, MessageSquare, HelpCircle, Send } from 'lucide-react';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client'; // Import client for invoking edge functions if available. If not, use standard fetch. Let's look at supabase client setup.

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    organisasi: '',
    pesan: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '6281234567890';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Halo Impactory, saya ingin bertanya tentang...')}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email || !formData.pesan) return;

    setLoading(true);
    setStatus(null);

    try {
      // Invoke the Edge Function 'contact-form'
      const { error } = await supabase.functions.invoke('contact-form', {
        body: {
          nama: formData.nama,
          email: formData.email,
          organisasi: formData.organisasi,
          pesan: formData.pesan
        }
      });

      if (error) {
        throw error;
      }

      setStatus({
        type: 'success',
        message: 'Pesan terkirim! Kami akan membalas dalam 1x24 jam.'
      });
      setFormData({ nama: '', email: '', organisasi: '', pesan: '' });
    } catch (err) {
      console.error('Contact form submission error:', err);
      setStatus({
        type: 'error',
        message: 'Gagal mengirim. Coba via WhatsApp.'
      });
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "Apakah ada demo gratis?",
      a: "Ya, Anda bisa mendaftar langsung di impactory.id secara gratis untuk mencoba LFA Builder dasar dan Budget Calculator."
    },
    {
      q: "Bagaimana cara pembayaran?",
      a: "Kami menerima pembayaran melalui transfer bank mandiri, virtual account, maupun QRIS yang diproses secara manual dan aman via WhatsApp."
    },
    {
      q: "Apakah ada sesi onboarding?",
      a: "Ya, untuk organisasi yang berlangganan plan tahunan, kami menyediakan sesi onboarding khusus berdurasi 60 menit bersama tim fasilitator kami."
    }
  ];

  return (
    <div className="landing-page-wrap min-h-screen bg-brand-surface text-white selection:bg-teal-500 selection:text-white flex flex-col">
      <SEO
        title="Hubungi Kami — Konsultasi & Layanan Impactory.id"
        description="Hubungi tim Impactory.id untuk demo produk, konsultasi implementasi NGO Growth OS, kemitraan filantropi, atau dukungan teknis."
        canonicalUrl="/contact"
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-white/5 text-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="container max-w-4xl mx-auto px-4 relative z-10">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">
            Hubungi Hub Kontak Kami
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-100">
            Ada pertanyaan? Kami senang mendengar.
          </h1>
        </div>
      </section>

      {/* Form and Contact Section */}
      <section className="py-16 sm:py-20 border-b border-white/5 relative">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12">
            
            {/* Left side: Contact Form */}
            <div className="md:col-span-7">
              <Card className="premium-glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                <h3 className="font-bold text-lg text-slate-200 mb-6">Kirim Pesan</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="nama" className="block text-xs font-bold text-slate-300 uppercase mb-2">Nama Lengkap *</label>
                    <Input
                      id="nama"
                      type="text"
                      name="nama"
                      value={formData.nama}
                      onChange={handleChange}
                      required
                      placeholder="Contoh: Budi Santoso"
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 focus-visible:ring-teal-500 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-300 uppercase mb-2">Email *</label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Contoh: budi@organisasi.id"
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 focus-visible:ring-teal-500 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="organisasi" className="block text-xs font-bold text-slate-300 uppercase mb-2">Nama Organisasi</label>
                    <Input
                      id="organisasi"
                      type="text"
                      name="organisasi"
                      value={formData.organisasi}
                      onChange={handleChange}
                      placeholder="Contoh: Yayasan Sejahtera Bersama"
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 focus-visible:ring-teal-500 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="pesan" className="block text-xs font-bold text-slate-300 uppercase mb-2">Pesan Anda *</label>
                    <Textarea
                      id="pesan"
                      name="pesan"
                      value={formData.pesan}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Tuliskan pertanyaan atau kendala yang ingin didiskusikan..."
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 focus-visible:ring-teal-500 rounded-xl resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-teal-500 to-brand-accent hover:from-teal-600 hover:to-teal-700 text-white font-bold rounded-xl transition-all shadow-lg py-6 mt-4 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {loading ? 'Mengirim...' : 'Kirim Pesan Sekarang'}
                  </Button>
                </form>

                {status && (
                  <p
                    className={`mt-4 text-center text-sm font-semibold p-3 rounded-xl border ${
                      status.type === 'success'
                        ? 'text-teal-400 bg-teal-500/10 border-teal-500/20'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    }`}
                  >
                    {status.message}
                  </p>
                )}
              </Card>
            </div>

            {/* Right side: Direct Contacts */}
            <div className="md:col-span-5 space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold text-teal-400 tracking-widest uppercase">Hubungi Kami</span>
                <h2 className="text-2xl font-black text-slate-100 tracking-tight leading-tight">
                  Hubungi secara instan
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Kami selalu terbuka untuk berdiskusi mengenai kemitraan strategis, dukungan kustomisasi, maupun bantuan onboarding.
                </p>
              </div>

              <div className="space-y-4">
                {/* Email Direct Card */}
                <a href="mailto:arif@impactory.id" className="block group">
                  <Card className="premium-glass-card rounded-2xl p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Kirim Email</h4>
                      <p className="text-sm font-semibold text-teal-400 mt-1">arif@impactory.id</p>
                      <p className="text-xs text-slate-400 mt-1">Estimasi balasan dalam 1x24 jam kerja</p>
                    </div>
                  </Card>
                </a>

                {/* Whatsapp Direct Card */}
                <a href={whatsappUrl} target="_blank" rel="noreferrer noopener" className="block group">
                  <Card className="premium-glass-card rounded-2xl p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Chat WhatsApp</h4>
                      <p className="text-sm font-semibold text-emerald-400 mt-1">Hubungi via WA</p>
                      <p className="text-xs text-slate-400 mt-1">Layanan cepat, bantuan instan via obrolan</p>
                    </div>
                  </Card>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-16 sm:py-24 bg-brand-surface-deep relative">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">Pertanyaan Populer</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight mt-3">
              FAQ Layanan Kontak
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((f, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`} 
                className="border-white/5 bg-brand-surface-mid/20 rounded-2xl px-6 py-2 shadow-lg"
              >
                <AccordionTrigger className="hover:no-underline font-bold text-sm text-slate-200 py-4">
                  <span className="flex items-center gap-2.5 text-left">
                    <HelpCircle className="h-4 w-4 text-teal-400 shrink-0" />
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-xs text-slate-400 leading-relaxed pb-5 pl-6">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
}
