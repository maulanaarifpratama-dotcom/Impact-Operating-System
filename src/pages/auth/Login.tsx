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
import { signInWithGoogle } from '@/lib/auth';

const magicSchema = z.object({ email: z.string().email('Email tidak valid') });
const passwordSchema = magicSchema.extend({
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

type MagicValues = z.infer<typeof magicSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const DEFAULT_REDIRECT = '/dashboard';

/**
 * Only ever hand navigate() a path that stays on this origin.
 *
 * React Router reinterprets "//host" as a protocol-relative URL and, in the
 * versions this app pins, treats a leading "/\" the same way — so a post-login
 * redirect can be steered off-site (CVE-2025-68470 and its backslash bypass).
 * `from` is set from location.pathname by ProtectedRoute and is not reachable
 * from a crafted URL today, but a single-slash check costs nothing and removes
 * the whole class regardless of which router version is installed.
 */
function safeInternalPath(candidate: string | undefined): string {
  if (!candidate || !candidate.startsWith('/')) return DEFAULT_REDIRECT;
  // Reject "//evil.com" and "/\evil.com"; both escape the current origin.
  if (candidate[1] === '/' || candidate[1] === '\\') return DEFAULT_REDIRECT;
  return candidate;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const redirectTo = safeInternalPath(location.state?.from);
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [googleLoading, setGoogleLoading] = useState(false);

  const magicForm = useForm<MagicValues>({ resolver: zodResolver(magicSchema), defaultValues: { email: '' } });
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { email: '', password: '' } });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error('Gagal masuk dengan Google: ' + (error.message || 'Kesalahan tidak diketahui'));
      setGoogleLoading(false);
    }
  };

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
        <span>Masuk dengan Google</span>
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