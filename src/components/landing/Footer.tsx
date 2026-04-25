import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { Instagram, Linkedin, Twitter } from 'lucide-react';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.6 6.7c-1.3-.2-2.5-.9-3.3-1.9-.6-.7-.9-1.6-.9-2.5V2h-3.4v13.4c0 1.5-1.2 2.6-2.6 2.6s-2.6-1.2-2.6-2.6 1.2-2.6 2.6-2.6c.3 0 .6 0 .9.1V9.4c-.3 0-.6-.1-.9-.1-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V8.8c1.3.9 2.9 1.5 4.6 1.5V6.9c-.1-.1-.3-.2-.4-.2z" />
    </svg>
  );
}

const socials = [
  { href: BRAND.social.instagram, label: BRAND.socialHandles.instagram, icon: Instagram, name: 'Instagram' },
  { href: BRAND.social.linkedin, label: BRAND.socialHandles.linkedin, icon: Linkedin, name: 'LinkedIn' },
  { href: BRAND.social.tiktok, label: BRAND.socialHandles.tiktok, icon: TikTokIcon, name: 'TikTok' },
  { href: BRAND.social.twitter, label: BRAND.socialHandles.twitter, icon: Twitter, name: 'X' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              AI platform untuk yayasan, UMKM sosial, dan changemaker Indonesia.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Produk</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Grant Writer <span className="text-xs text-muted-foreground/70">· Juni 2026</span></li>
              <li>Impactory Library <span className="text-xs text-muted-foreground/70">· Q3 2026</span></li>
              <li>Grantfinder <span className="text-xs text-muted-foreground/70">· Q4 2026</span></li>
              <li>Impactory Ads <span className="text-xs text-muted-foreground/70">· 2027</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Ikuti kami</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {socials.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <s.icon className="h-4 w-4" />
                    <span>
                      <span className="font-medium text-foreground">{s.name}</span>{' '}
                      <span className="text-muted-foreground">{s.label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Impactory.id — Dibuat di Indonesia.</p>
          <p>Membangun infrastruktur untuk pembangun dampak.</p>
        </div>
      </div>
    </footer>
  );
}