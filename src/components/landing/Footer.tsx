import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { Globe, Instagram, Linkedin, Twitter } from 'lucide-react';
import { homepageTranslations } from '@/data/translations/homepage';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.6 6.7c-1.3-.2-2.5-.9-3.3-1.9-.6-.7-.9-1.6-.9-2.5V2h-3.4v13.4c0 1.5-1.2 2.6-2.6 2.6s-2.6-1.2-2.6-2.6 1.2-2.6 2.6-2.6c.3 0 .6 0 .9.1V9.4c-.3 0-.6-.1-.9-.1-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V8.8c1.3.9 2.9 1.5 4.6 1.5V6.9c-.1-.1-.3-.2-.4-.2z" />
    </svg>
  );
}

// Sourced from BRAND so the handles and URLs cannot drift apart. The previous
// second footer hardcoded them and had gone stale: it pointed at
// linkedin.com/company/impactory rather than /impactoryindonesia, and omitted
// TikTok entirely.
const socials = [
  { href: BRAND.social.instagram, label: BRAND.socialHandles.instagram, icon: Instagram, name: 'Instagram' },
  { href: BRAND.social.linkedin, label: BRAND.socialHandles.linkedin, icon: Linkedin, name: 'LinkedIn' },
  { href: BRAND.social.tiktok, label: BRAND.socialHandles.tiktok, icon: TikTokIcon, name: 'TikTok' },
  { href: BRAND.social.twitter, label: BRAND.socialHandles.twitter, icon: Twitter, name: 'X' },
];

const products = [
  { name: 'Readiness Scorecard', note: 'Baseline' },
  { name: 'Impact Library', note: 'Asset Engine' },
  { name: 'Grant Pipeline', note: 'Workflow' },
  { name: 'Grantwriter', note: 'Proposal System' },
];

/**
 * The site's only footer.
 *
 * There used to be a second one at components/layout/Footer for every route
 * except the home page. Keeping two in sync failed in the usual ways — a dead
 * /dashboard/grant-finder link (the route is /dashboard/grantfinder), a wrong
 * LinkedIn URL, a hardcoded copyright year, no TikTok, and a contrast fix that
 * only landed on one of them.
 *
 * The company/legal column comes from that old footer. It matters: /privacy and
 * /terms were reachable from nowhere else, so folding it in here is what keeps
 * them linked once the duplicate is gone — and the home page gains links it was
 * missing.
 */
export function Footer({ lang = 'id' }: { lang?: 'id' | 'en' }) {
  const t = homepageTranslations[lang];
  const id = lang === 'id';

  const companyLinks = [
    { to: '/about', label: id ? 'Tentang' : 'About' },
    { to: '/contact', label: id ? 'Kontak' : 'Contact' },
    { to: '/pricing', label: id ? 'Harga' : 'Pricing' },
    { to: '/privacy', label: id ? 'Kebijakan Privasi' : 'Privacy Policy' },
    { to: '/terms', label: id ? 'Syarat Layanan' : 'Terms of Service' },
  ];

  return (
    <footer className="border-t border-white/10 bg-brand-surface text-white">
      <div className="container max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="light" />
            <p className="mt-3 max-w-xs text-sm text-slate-400">{t.footer.tagline}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-200">{t.navbar.products}</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {products.map((p) => (
                <li key={p.name}>
                  {p.name} <span className="text-xs text-slate-400">· {p.note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-200">{id ? 'Perusahaan' : 'Company'}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {companyLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-slate-400 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-200">{id ? 'Ikuti kami' : 'Follow us'}</h4>
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
          <p>
            © {new Date().getFullYear()} Impactory.id — {id ? 'Dibuat di Indonesia.' : 'Made in Indonesia.'}
          </p>
          <div className="flex items-center gap-4">
            <p>{t.footer.rights}</p>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Globe className="h-3.5 w-3.5" aria-hidden />
              Indonesia
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
