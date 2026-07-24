import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState('Menyelesaikan verifikasi otentikasi...');

  useEffect(() => {
    let cancelled = false;

    const checkOrgAndRedirect = async (userId: string) => {
      try {
        setStatusText('Memeriksa keanggotaan organisasi...');
        const { data: memberships, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userId);

        if (cancelled) return;

        if (error) {
          console.error('[AuthCallback] Error checking organization_members:', error);
        }

        const hasOrg = memberships && memberships.length > 0;
        if (hasOrg) {
          toast.success('Berhasil masuk');
          navigate('/dashboard', { replace: true });
        } else {
          toast.info('Silakan lengkapi pendaftaran organisasi Anda');
          navigate('/onboarding', { replace: true });
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[AuthCallback] Unexpected error in checkOrgAndRedirect:', err);
          navigate('/dashboard', { replace: true });
        }
      }
    };

    const processSession = async () => {
      // 1. First check existing session
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        toast.error('Otentikasi gagal: ' + error.message);
        navigate('/login?error=auth_failed', { replace: true });
        return;
      }

      if (data.session?.user) {
        await checkOrgAndRedirect(data.session.user.id);
        return;
      }

      // 2. Listen for auth state change if session is being established
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (cancelled) return;
        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
          subscription.unsubscribe();
          await checkOrgAndRedirect(session.user.id);
        }
      });

      // 3. Fallback timeout if session is not established
      const timeoutId = setTimeout(() => {
        subscription.unsubscribe();
        if (!cancelled) {
          toast.error('Otentikasi gagal atau waktu habis');
          navigate('/login?error=auth_failed', { replace: true });
        }
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    };

    void processSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="mt-4 text-sm font-medium text-foreground">{statusText}</p>
      <p className="mt-1 text-xs text-muted-foreground">Mohon tunggu sebentar...</p>
    </div>
  );
}