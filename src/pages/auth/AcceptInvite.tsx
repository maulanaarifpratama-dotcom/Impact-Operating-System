import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, CheckCircle2, ShieldAlert, Loader2, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<{
    id: string;
    organization_id: string;
    organization_name: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
    is_expired: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setErrorMsg('Tautan undangan tidak lengkap. Token tidak ditemukan.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_organization_invite_by_token', {
          _token: token,
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          setErrorMsg('Undangan tidak ditemukan atau tautan tidak valid.');
        } else {
          const inv = data[0];
          setInvitation(inv);

          if (inv.status === 'accepted') {
            setErrorMsg('Undangan ini sudah pernah digunakan untuk bergabung.');
          } else if (inv.status === 'revoked') {
            setErrorMsg('Undangan ini telah dibatalkan oleh administrator organisasi.');
          } else if (inv.status === 'expired' || inv.is_expired) {
            setErrorMsg('Undangan ini telah kedaluwarsa (lebih dari 7 hari). Harap minta pengelola untuk mengirim ulang undangan.');
          }
        }
      } catch (err: any) {
        console.error('[AcceptInvite] Fetch error:', err);
        setErrorMsg(err.message || 'Gagal memverifikasi token undangan.');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!token || !user?.id) return;
    setAccepting(true);

    try {
      const { data, error } = await supabase.rpc('accept_organization_invite', {
        _token: token,
        _user_id: user.id,
      });

      if (error) throw error;

      toast.success('Selamat! Anda telah resmi bergabung dengan organisasi.');
      
      // Refresh organization cache
      await queryClient.invalidateQueries({ queryKey: ['organization_members'] });
      await queryClient.invalidateQueries({ queryKey: ['organization_members_settings'] });

      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('[AcceptInvite] Accept error:', err);
      toast.error('Gagal menerima undangan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Memeriksa tautan undangan…</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !invitation) {
    return (
      <AuthCard
        title="Undangan Tidak Valid"
        subtitle="Sistem tidak dapat memproses tautan undangan ini."
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {errorMsg}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              Kembali ke Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full border-slate-200 text-slate-700"
            >
              Masuk ke Akun Lain
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  const isEmailMatching = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <AuthCard
      title="Undangan Bergabung Organisasi"
      subtitle="Terima undangan untuk mengakses workspace dan berkolaborasi."
    >
      <div className="space-y-6">
        {/* Org Summary Card */}
        <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white font-bold">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{invitation.organization_name}</h3>
              <p className="text-xs text-slate-500">
                Diundang sebagai <span className="font-bold text-orange-700 uppercase">{invitation.role}</span>
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-orange-100/80 flex items-center justify-between text-xs text-slate-600">
            <span>Email Tujuan:</span>
            <span className="font-semibold text-slate-800">{invitation.email}</span>
          </div>
        </div>

        {/* Not Logged In */}
        {!session || !user ? (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              Anda belum masuk ke platform. Harap masuk atau buat akun baru dengan email <strong>{invitation.email}</strong> untuk menerima undangan ini.
            </p>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => navigate('/login', { state: { from: `/invite/accept?token=${token}` } })}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                <span>Masuk Ke Akun</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/signup', { state: { from: `/invite/accept?token=${token}` } })}
                className="w-full border-slate-200 text-slate-700 font-medium"
              >
                Daftar Akun Baru
              </Button>
            </div>
          </div>
        ) : (
          /* Logged In */
          <div className="space-y-4 pt-2">
            {!isEmailMatching && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Anda saat ini terhubung sebagai <strong>{user.email}</strong>. Email undangan adalah <strong>{invitation.email}</strong>.
                </p>
              </div>
            )}

            <Button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses Keanggotaan…
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5" />
                  <span>Terima & Bergabung Sekarang</span>
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Abaikan & Kembali ke Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthCard>
  );
}
