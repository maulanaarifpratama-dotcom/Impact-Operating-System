import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';

interface UpgradeNoticeProps {
  /** The module being gated, e.g. "LFA Builder". Used in the sentence. */
  module: string;
  /** One line on what the organisation gets by upgrading. */
  detail?: string;
}

/**
 * Shown above a paid module when the organisation is on the free plan.
 *
 * The database refuses the insert either way (see
 * 20260727020000_plan_entitlements.sql). Without this the refusal surfaces as
 * a raw Postgres permission error, which reads like a bug rather than a
 * pricing boundary.
 *
 * Renders nothing for paid organisations, so it is safe to mount
 * unconditionally.
 */
export function UpgradeNotice({ module, detail }: UpgradeNoticeProps) {
  const { isPaid, isLoading } = usePlan();

  if (isLoading || isPaid) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
          <Lock className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {module} tersedia di paket Berdaya
          </p>
          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            {detail ?? 'Organisasi Anda saat ini pada paket Dasar. Data yang sudah ada tetap bisa dibuka dan diunduh — yang terkunci hanya pembuatan yang baru.'}
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="shrink-0 font-semibold">
        <Link to="/pricing">Lihat paket</Link>
      </Button>
    </div>
  );
}
