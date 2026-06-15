import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Menu, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { homepageTranslations } from '@/data/translations/homepage';

interface NavbarProps {
  lang?: 'id' | 'en';
  onLangChange?: (lang: 'id' | 'en') => void;
}

export function Navbar({ lang = 'id', onLangChange }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const t = homepageTranslations[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#problem', label: t.navbar.problem },
    { href: '#workflow', label: t.navbar.growth },
    { href: '#modules', label: t.navbar.products },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all',
        scrolled
          ? 'border-b border-border/60 bg-[#0A1D25]/90 backdrop-blur-md shadow-card'
          : 'border-b border-transparent bg-background/0',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Impactory home">
          <Logo variant="light" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigasi utama">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
            <Globe className="h-3 w-3 text-slate-400 ml-1.5" />
            <button
              onClick={() => onLangChange?.('id')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-300',
                lang === 'id'
                  ? 'bg-gradient-to-r from-teal-500 to-[#1D7A75] text-white shadow-md shadow-teal-500/10'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              ID
            </button>
            <button
              onClick={() => onLangChange?.('en')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-300',
                lang === 'en'
                  ? 'bg-gradient-to-r from-teal-500 to-[#1D7A75] text-white shadow-md shadow-teal-500/10'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              EN
            </button>
          </div>

          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5">
            <Link to="/login">{t.navbar.login}</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-teal-500 to-[#1D7A75] text-white font-bold hover:from-teal-600 hover:to-teal-700 shadow-elegant rounded-xl">
            <Link to="/dashboard/readiness">{t.navbar.startScorecard}</Link>
          </Button>
        </div>

        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 hover:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#0A1D25]">
          <div className="container flex flex-col gap-1 py-4 bg-[#0A1D25]">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}

            {/* Mobile Language Switcher */}
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/5 mt-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Pilih Bahasa / Language
              </span>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => {
                    onLangChange?.('id');
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-300',
                    lang === 'id' ? 'bg-[#1D7A75] text-white' : 'text-slate-400 hover:text-white',
                  )}
                >
                  ID
                </button>
                <button
                  onClick={() => {
                    onLangChange?.('en');
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-300',
                    lang === 'en' ? 'bg-[#1D7A75] text-white' : 'text-slate-400 hover:text-white',
                  )}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="mt-2 flex gap-2 px-3">
              <Button asChild variant="outline" className="flex-1 border-white/10 text-white bg-transparent hover:bg-white/5">
                <Link to="/login" onClick={() => setOpen(false)}>{t.navbar.login}</Link>
              </Button>
              <Button asChild className="flex-1 bg-gradient-to-r from-teal-500 to-[#1D7A75] text-white" onClick={() => setOpen(false)}>
                <Link to="/dashboard/readiness">{t.navbar.startScorecard}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}