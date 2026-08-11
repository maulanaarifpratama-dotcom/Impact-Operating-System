import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

/**
 * Catch-all 404 rendered by React Router for any unmatched path.
 *
 * Because the SPA rewrite in `vercel.json` (and the hosting platform's
 * built-in SPA fallback) routes every non-asset request to `index.html`, users will
 * always see this branded page instead of Vercel's generic error.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("404: route not found —", location.pathname);
    document.title = "404 · Halaman tidak ditemukan — Impactory";
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-hero opacity-[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="absolute left-6 top-6">
        <Link to="/" aria-label="Kembali ke beranda Impactory">
          <Logo />
        </Link>
      </div>

      <section className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          404 — halaman tidak ditemukan
        </span>

        <h1 className="text-display font-bold tracking-tight">
          Hmm, halaman ini belum ada.
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          URL{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
            {location.pathname}
          </code>{" "}
          tidak cocok dengan halaman manapun di Impactory. Mungkin tautan sudah
          berubah atau ada salah ketik.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Kembali ke beranda
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Halaman sebelumnya
          </Button>
        </div>

        <div className="mt-10 grid w-full gap-2 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Halaman populer
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <QuickLink to="/#features" label="Fitur Impactory" />
            <QuickLink to="/#pricing" label="Harga & paket" />
            <QuickLink to="/login" label="Masuk ke akun" />
            <QuickLink to="/signup" label="Daftar gratis" />
          </div>
        </div>
      </section>
    </main>
  );
};

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-md border border-border/70 bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
    >
      <span>{label}</span>
      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

export default NotFound;
