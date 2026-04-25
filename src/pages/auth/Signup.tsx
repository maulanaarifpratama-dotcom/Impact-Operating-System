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
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', primary_role: undefined as unknown as Values['primary_role'] },
  });

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