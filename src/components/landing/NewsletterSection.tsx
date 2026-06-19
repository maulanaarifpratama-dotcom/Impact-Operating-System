import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatus(null);

    const brevoApiKey = import.meta.env.VITE_BREVO_API_KEY || '';

    try {
      const response = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify({
          email: email,
          listIds: [2],
          updateEnabled: true
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      setStatus({
        type: 'success',
        message: 'Berhasil! Cek email untuk konfirmasi.'
      });
      setEmail('');
    } catch (err) {
      console.error('Newsletter subscription error:', err);
      setStatus({
        type: 'error',
        message: 'Gagal daftar. Coba lagi.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 sm:py-24 border-t border-b border-white/5 relative overflow-hidden bg-[#081820]">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container max-w-4xl mx-auto px-4 relative z-10">
        <Card className="bg-[#0E2833]/40 border border-white/5 hover:border-teal-500/10 transition-all rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center">
          
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-500/10 items-center justify-center text-teal-400 border border-teal-500/20 mb-2">
              <Mail className="h-5 w-5" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100">
              Dapatkan tips manajemen program NGO setiap minggu
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
              Update fitur, panduan LFA, info grant terbaru. Gratis. Bisa unsubscribe kapanpun.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-md mx-auto mt-8">
              <div className="relative flex-grow">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan alamat email organisasi Anda"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder-slate-500 focus-visible:ring-teal-500 rounded-xl py-6 pl-4 pr-4 text-xs"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-teal-500 to-[#1D7A75] hover:from-teal-600 hover:to-teal-700 text-white font-bold rounded-xl px-8 py-6 text-xs transition-all shadow-lg flex items-center gap-2 shrink-0"
              >
                {loading ? 'Mendaftarkan...' : 'Daftar sekarang'}
              </Button>
            </form>

            {status && (
              <div
                className={`mt-4 inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border ${
                  status.type === 'success'
                    ? 'text-teal-400 bg-teal-500/10 border-teal-500/20'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                }`}
              >
                {status.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                {status.message}
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
