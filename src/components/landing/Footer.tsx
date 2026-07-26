import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { Instagram, Linkedin, Twitter } from 'lucide-react';
import { homepageTranslations } from '@/data/translations/homepage';

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

export function Footer({ lang = 'id' }: { lang?: 'id' | 'en' }) {
  const t = homepageTranslations[lang];

  return (
    <footer className="border-t border-white/10 bg-brand-surface text-white">
      <div className="container max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo variant="light" />
            <p className="mt-3 max-w-xs text-sm text-slate-400">
              {t.footer.tagline}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">{t.navbar.products}</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Readiness Scorecard <span className="text-xs text-slate-400">· Baseline</span></li>
              <li>Impact Library <span className="text-xs text-slate-400">· Asset Engine</span></li>
              <li>Grant Pipeline <span className="text-xs text-slate-400">· Workflow</span></li>
              <li>Grantwriter <span className="text-xs text-slate-400">· Proposal System</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">{lang === 'id' ? 'Ikuti kami' : 'Follow us'}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {socials.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
                  >
                    <s.icon className="h-4 w-4" />
                    <span>
                      <span className="font-semibold text-slate-300">{s.name}</span>{' '}
                      <span className="text-slate-400">{s.label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-slate-400 md:flex-row">
          <p>© {new Date().getFullYear()} Impactory.id — {lang === 'id' ? 'Dibuat di Indonesia.' : 'Made in Indonesia.'}</p>
          <p>{t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}