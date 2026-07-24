import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { supabase } from '@/integrations/supabase/client';
import { PRIMARY_ROLES } from '@/lib/brand';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { signInWithGoogle } from '@/lib/auth';

const schema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  primary_role: z.enum(['foundation_lead', 'umkm_owner', 'changemaker', 'consultant', 'other'], {
    message: 'Pilih peran utama Anda',
  }),
});

type Values = z.infer<typeof schema>;

export default function Signup() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', primary_role: undefined as unknown as Values['primary_role'] },
  });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error('Gagal masuk dengan Google: ' + (error.message || 'Kesalahan tidak diketahui'));
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (values: Values) => {
    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: values.full_name.trim(),
          primary_role: values.primary_role,
        },
      },
    });

    if (error) {
      toast.error('Gagal daftar: ' + error.message);
      return;
    }

    if (data.user && !data.session) {
      toast.success('Cek email Anda untuk konfirmasi akun.');
      return;
    }
    toast.success('Akun berhasil dibuat');
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthCard
      title="Buat akun Impactory"
      subtitle="Gratis selamanya untuk paket dasar."
      footer={
        <span>
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Masuk
          </Link>
        </span>
      }
    >
      {/* Google OAuth Option */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-800 font-medium py-2.5 shadow-2xs"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>Daftar dengan Google</span>
      </Button>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2.5 text-muted-foreground font-medium">atau</span>
        </div>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="s-name">Nama lengkap</Label>
          <Input id="s-name" placeholder="Andi Setiawan" {...form.register('full_name')} />
          {form.formState.errors.full_name && (
            <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-email">Email</Label>
          <Input id="s-email" type="email" placeholder="anda@email.com" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-password">Password</Label>
          <Input id="s-password" type="password" placeholder="Minimal 8 karakter" {...form.register('password')} />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-role">Peran utama Anda</Label>
          <Select onValueChange={(v) => form.setValue('primary_role', v as Values['primary_role'], { shouldValidate: true })}>
            <SelectTrigger id="s-role">
              <SelectValue placeholder="Pilih peran" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.primary_role && (
            <p className="text-xs text-destructive">{form.formState.errors.primary_role.message}</p>
          )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting} className="mt-2 bg-gradient-hero text-white hover:opacity-95">
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Daftar gratis
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Dengan mendaftar, Anda menyetujui Syarat &amp; Kebijakan Privasi kami.
        </p>
      </form>
    </AuthCard>
  );
}