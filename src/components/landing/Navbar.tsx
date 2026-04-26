import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '#problem', label: 'Masalah' },
  { href: '#features', label: 'Produk' },
  { href: '#pricing', label: 'Harga' },
  { href: '#waitlist', label: 'Waitlist' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all',
        scrolled
          ? 'border-b border-border/60 bg-background/85 backdrop-blur-md shadow-card'
          : 'border-b border-transparent bg-background/0',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Impactory home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigasi utama">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Masuk</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-hero text-white shadow-elegant hover:opacity-95">
            <Link to="/dashboard/grant-writer">Daftar gratis</Link>
          </Button>
        </div>

        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container flex flex-col gap-1 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 px-3">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/login">Masuk</Link>
              </Button>
              <Button asChild className="flex-1 bg-gradient-hero text-white">
                <Link to="/dashboard/grant-writer">Daftar</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}