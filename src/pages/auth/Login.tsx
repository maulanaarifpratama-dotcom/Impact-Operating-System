import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { supabase } from '@/integrations/supabase/client';

const magicSchema = z.object({ email: z.string().email('Email tidak valid') });
const passwordSchema = magicSchema.extend({
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

type MagicValues = z.infer<typeof magicSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const redirectTo = location.state?.from || '/dashboard';
  const [mode, setMode] = useState<'magic' | 'password'>('magic');

  const magicForm = useForm<MagicValues>({ resolver: zodResolver(magicSchema), defaultValues: { email: '' } });
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { email: '', password: '' } });

  const sendMagic = async ({ email }: MagicValues) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error('Gagal mengirim magic link: ' + error.message);
      return;
    }
    toast.success('Magic link terkirim! Cek email Anda.');
  };

  const signInPassword = async ({ email, password }: PasswordValues) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      toast.error('Login gagal: ' + error.message);
      return;
    }
    toast.success('Berhasil masuk');
    navigate(redirectTo, { replace: true });
  };

  return (
    <AuthCard
      title="Masuk ke Impactory"
      subtitle="Pilih cara masuk yang Anda sukai."
      footer={
        <span>
          Belum punya akun?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Daftar gratis
          </Link>
        </span>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'magic' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Mail className="h-4 w-4" /> Magic link
        </button>
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'password' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <KeyRound className="h-4 w-4" /> Password
        </button>
      </div>

      {mode === 'magic' ? (
        <form onSubmit={magicForm.handleSubmit(sendMagic)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="m-email">Email</Label>
            <Input id="m-email" type="email" placeholder="anda@email.com" {...magicForm.register('email')} />
            {magicForm.formState.errors.email && (
              <p className="text-xs text-destructive">{magicForm.formState.errors.email.message}</p>
            )}
          </div>
          <Button type="submit" disabled={magicForm.formState.isSubmitting} className="bg-gradient-hero text-white hover:opacity-95">
            {magicForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Kirim magic link
          </Button>
          <p className="text-center text-xs text-muted-foreground">Tidak butuh password. Klik link di email Anda.</p>
        </form>
      ) : (
        <form onSubmit={pwForm.handleSubmit(signInPassword)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" type="email" placeholder="anda@email.com" {...pwForm.register('email')} />
            {pwForm.formState.errors.email && (
              <p className="text-xs text-destructive">{pwForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-password">Password</Label>
            <Input id="p-password" type="password" placeholder="••••••••" {...pwForm.register('password')} />
            {pwForm.formState.errors.password && (
              <p className="text-xs text-destructive">{pwForm.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" disabled={pwForm.formState.isSubmitting} className="bg-gradient-hero text-white hover:opacity-95">
            {pwForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Masuk
          </Button>
        </form>
      )}
    </AuthCard>
  );
}