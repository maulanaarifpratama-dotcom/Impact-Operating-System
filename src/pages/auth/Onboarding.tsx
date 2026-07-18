import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Building2, Loader2, Sparkles, Shield, Users } from 'lucide-react';
import { Logo } from '@/components/Logo';

const schema = z.object({
  name: z.string()
    .min(3, 'Nama organisasi minimal 3 karakter')
    .max(100, 'Nama organisasi terlalu panjang (maksimal 100 karakter)'),
  sector: z.string({
    required_error: 'Pilih sektor fokus organisasi Anda',
  }).min(1, 'Pilih sektor fokus organisasi Anda'),
  size: z.string({
    required_error: 'Pilih skala/ukuran organisasi Anda',
  }).min(1, 'Pilih skala/ukuran organisasi Anda'),
});

type Values = z.infer<typeof schema>;

const SECTORS = [
  { value: 'Pendidikan', label: 'Pendidikan & Literasi' },
  { value: 'Lingkungan', label: 'Lingkungan & Konservasi' },
  { value: 'Kemanusiaan', label: 'Kemanusiaan & Bencana' },
  { value: 'Kesehatan', label: 'Kesehatan Masyarakat' },
  { value: 'Pemberdayaan', label: 'Pemberdayaan Ekonomi/UMKM' },
  { value: 'Agama', label: 'Keagamaan / Sosial' },
  { value: 'Lainnya', label: 'Lainnya / Sektor Campuran' },
];

const SIZES = [
  { value: '1-5', label: '1-5 anggota (Sangat awal)' },
  { value: '6-20', label: '6-20 anggota (Kecil)' },
  { value: '21-50', label: '21-50 anggota (Sedang)' },
  { value: '50+', label: 'Lebih dari 50 anggota (Besar / Scale)' },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      sector: '',
      size: '',
    },
  });

  const onSubmit = async (values: Values) => {
    if (!user?.id) {
      toast.error('Sesi Anda tidak valid. Silakan login kembali.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Generate a safe and unique URL slug from the name
      const cleanSlug = values.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSlug = `${cleanSlug || 'ngo'}-${Math.random().toString(36).substring(2, 7)}`;

      // 2. Create the organization record
      // We embed Sector and Size inside the 'description' field to remain 100% compliant with existing DB
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: values.name.trim(),
          slug: uniqueSlug,
          description: `Sektor: ${values.sector} | Skala: ${values.size}`,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (orgErr) {
        console.error('[Onboarding] Error creating organization:', orgErr);
        throw new Error(orgErr.message);
      }

      if (!org?.id) {
        throw new Error('Gagal mendapatkan ID organisasi baru.');
      }

      // 3. Create the organization member record with 'owner' role
      const { error: memberErr } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberErr) {
        console.error('[Onboarding] Error establishing membership:', memberErr);
        throw new Error(memberErr.message);
      }

      // 4. Invalidate cache to let ProtectedRoute know we have an organization now
      await queryClient.invalidateQueries({ queryKey: ['organization_members', user.id] });

      toast.success('Organisasi berhasil didaftarkan!');
      
      // 5. Success redirect to main dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error('Gagal menyelesaikan onboarding: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-active via-brand-border to-brand-accent px-4 py-12 md:px-8">
      {/* Visual background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="light" className="text-3xl" />
          <p className="mt-2 text-sm text-white/80">
            NGO Growth Operating System berbasis framework G.R.O.W.T.H.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-brand-active/60 p-6 shadow-elegant backdrop-blur-xl md:p-8 text-white">
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Daftarkan Organisasi Anda</h1>
              <p className="text-xs text-white/70">
                Langkah pertama membangun baseline sistem NGO-OS Anda.
              </p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
            {/* NGO Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="o-name" className="text-sm font-medium text-white/90 flex items-center gap-1.5">
                Nama Organisasi / NGO
                <span className="text-accent text-xs font-normal">(Wajib)</span>
              </Label>
              <div className="relative">
                <Input
                  id="o-name"
                  placeholder="Mis. Yayasan Peduli Indonesia"
                  className="bg-white/5 border-white/15 text-white placeholder-white/40 focus:border-accent focus:ring-accent"
                  {...form.register('name')}
                  disabled={submitting}
                />
              </div>
              {form.formState.errors.name && (
                <p className="text-xs text-red-300 font-medium">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* NGO Sector */}
            <div className="grid gap-1.5">
              <Label htmlFor="o-sector" className="text-sm font-medium text-white/90">
                Sektor Fokus Utama
              </Label>
              <Select
                disabled={submitting}
                onValueChange={(v) => form.setValue('sector', v, { shouldValidate: true })}
              >
                <SelectTrigger id="o-sector" className="bg-white/5 border-white/15 text-white focus:border-accent">
                  <SelectValue placeholder="Pilih sektor utama" />
                </SelectTrigger>
                <SelectContent className="bg-brand-active border-white/10 text-white">
                  {SECTORS.map((s) => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className="hover:bg-brand-border/60 focus:bg-brand-border/60 focus:text-white"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sector && (
                <p className="text-xs text-red-300 font-medium">{form.formState.errors.sector.message}</p>
              )}
            </div>

            {/* NGO Size */}
            <div className="grid gap-1.5">
              <Label htmlFor="o-size" className="text-sm font-medium text-white/90">
                Skala / Ukuran Organisasi
              </Label>
              <Select
                disabled={submitting}
                onValueChange={(v) => form.setValue('size', v, { shouldValidate: true })}
              >
                <SelectTrigger id="o-size" className="bg-white/5 border-white/15 text-white focus:border-accent">
                  <SelectValue placeholder="Pilih ukuran tim" />
                </SelectTrigger>
                <SelectContent className="bg-brand-active border-white/10 text-white">
                  {SIZES.map((size) => (
                    <SelectItem
                      key={size.value}
                      value={size.value}
                      className="hover:bg-brand-border/60 focus:bg-brand-border/60 focus:text-white"
                    >
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.size && (
                <p className="text-xs text-red-300 font-medium">{form.formState.errors.size.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="mt-4 bg-gradient-hero text-white hover:opacity-95 hover:shadow-elegant flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mendaftarkan...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-accent" />
                  Mulai Gunakan Impactory
                </>
              )}
            </Button>
          </form>

          {/* Micro Trust badges */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-[11px] text-white/60">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-accent" />
              <span>Multi-tenancy RLS Aman</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-accent" />
              <span>Owner Akses Terpelihara</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
