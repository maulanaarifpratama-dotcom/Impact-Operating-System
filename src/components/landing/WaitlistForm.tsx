import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const schema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().email('Email tidak valid'),
  organization: z.string().max(120).optional().or(z.literal('')),
  role: z.string().max(80).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', organization: '', role: '' },
  });

  const onSubmit = async (values: FormValues) => {
    const { error } = await supabase.from('waitlist').insert({
      email: values.email.trim().toLowerCase(),
      full_name: values.full_name.trim(),
      organization: values.organization?.trim() || null,
      role: values.role?.trim() || null,
      source: 'landing',
    });

    if (error) {
      // Treat duplicate email as success-ish
      if (error.code === '23505') {
        setSubmitted(true);
        toast.success('Email Anda sudah terdaftar di waitlist.');
        return;
      }
      toast.error('Gagal menyimpan: ' + error.message);
      return;
    }
    setSubmitted(true);
    toast.success('Berhasil! Kami akan kabari saat early access dibuka.');
    form.reset();
  };

  return (
    <section id="waitlist" className="py-20 md:py-28">
      <div className="container">
        <Card className="mx-auto max-w-2xl border-border/70 p-8 shadow-elegant md:p-10">
          {submitted ? (
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-h3">Terima kasih!</h3>
              <p className="mt-2 max-w-sm text-body text-muted-foreground">
                Anda sudah masuk waitlist Impactory. Kami akan kirim undangan early access ke email Anda.
              </p>
              <Button variant="ghost" className="mt-6" onClick={() => setSubmitted(false)}>
                Daftarkan email lain
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h3 className="text-h2">Gabung waitlist Impactory</h3>
                <p className="mt-2 text-body text-muted-foreground">
                  Akses pertama ke Grant Writer saat rilis Juni 2026, plus diskon 50% untuk 3 bulan
                  pertama paket Starter.
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="wl-name">Nama lengkap *</Label>
                    <Input id="wl-name" placeholder="Andi Setiawan" {...form.register('full_name')} />
                    {form.formState.errors.full_name && (
                      <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="wl-email">Email *</Label>
                    <Input id="wl-email" type="email" placeholder="andi@yayasan.org" {...form.register('email')} />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="wl-org">Organisasi</Label>
                    <Input id="wl-org" placeholder="Yayasan Lentera" {...form.register('organization')} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="wl-role">Peran Anda</Label>
                    <Input id="wl-role" placeholder="Direktur Eksekutif" {...form.register('role')} />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={form.formState.isSubmitting}
                  className="mt-2 w-full bg-gradient-hero text-white hover:opacity-95"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...
                    </>
                  ) : (
                    'Gabung waitlist'
                  )}
                </Button>
                <p className="text-center text-caption">
                  Maksimal 2 email per bulan, isinya update produk dan insight pendanaan.
                  Unsubscribe kapan saja.
                </p>
              </form>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}