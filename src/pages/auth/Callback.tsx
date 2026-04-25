import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    // Supabase JS auto-detects auth params in URL when detectSessionInUrl=true.
    // We just need to wait for session and redirect.
    const finalize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        toast.error('Otentikasi gagal: ' + error.message);
        navigate('/login', { replace: true });
        return;
      }
      if (data.session) {
        navigate('/dashboard', { replace: true });
      } else {
        // Subscribe in case session arrives slightly later
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
          if (s) {
            subscription.unsubscribe();
            navigate('/dashboard', { replace: true });
          }
        });
        // Fallback timeout
        setTimeout(() => {
          subscription.unsubscribe();
          if (!cancelled) navigate('/login', { replace: true });
        }, 4000);
      }
    };

    void finalize();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="mt-4 text-sm text-muted-foreground">Menyelesaikan login...</p>
    </div>
  );
}