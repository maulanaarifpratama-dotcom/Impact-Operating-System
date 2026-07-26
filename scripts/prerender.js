import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Helper to safely define globals in Node.js (including Node 21/24 with read-only getters like navigator)
function safeSetGlobal(prop, value) {
  try {
    if (!(prop in globalThis)) {
      Object.defineProperty(globalThis, prop, {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      try {
        globalThis[prop] = value;
      } catch {
        Object.defineProperty(globalThis, prop, {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }
  } catch {
    // Ignore errors if a property is a non-configurable getter in Node runtime
  }
}

const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};

if (typeof globalThis.window === 'undefined') {
  const windowObj = {
    location: { href: 'https://impactory.id', pathname: '/' },
    matchMedia: () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    localStorage: dummyStorage,
    sessionStorage: dummyStorage,
  };
  safeSetGlobal('window', windowObj);
}

safeSetGlobal('localStorage', dummyStorage);
safeSetGlobal('sessionStorage', dummyStorage);

if (!globalThis.navigator?.userAgent) {
  safeSetGlobal('navigator', { userAgent: 'node' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(__dirname, '../dist');

const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
];

/** Escape a string for safe use inside a RegExp. */
function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Drop the baseline tags Helmet is about to supply for this route.
 *
 * index.html carries a static <title> and a set of SEO meta so that routes
 * which are never pre-rendered still say something sensible. Pre-rendered
 * routes then get Helmet's per-route versions appended — and nothing removed
 * the originals, so every public page shipped two <meta name="description">,
 * two og:title, two og:image, and so on.
 *
 * That was not merely untidy. Crawlers generally take the first occurrence, and
 * the first was the baseline: index.html's og:image still pointed at a stale
 * preview asset on lovable.app, so a shared impactory.id link could render with
 * the wrong image entirely while the correct one sat further down the document.
 */
function stripTagsReplacedByHelmet(html, helmetHead) {
  let out = html;

  if (/<title[\s>]/i.test(helmetHead)) {
    out = out.replace(/[ \t]*<title>[\s\S]*?<\/title>\s*\n?/i, '');
  }

  for (const [, attr, value] of helmetHead.matchAll(/<meta[^>]*?\b(name|property)="([^"]+)"/gi)) {
    out = out.replace(
      new RegExp(`[ \\t]*<meta(?![^>]*data-rh)[^>]*\\b${attr}="${escapeRe(value)}"[^>]*>\\s*\\n?`, 'gi'),
      '',
    );
  }

  for (const [, rel] of helmetHead.matchAll(/<link[^>]*?\brel="([^"]+)"/gi)) {
    // hreflang alternates are per-language; only collapse a rel that carries no
    // hreflang, so the alternates in the template survive.
    out = out.replace(
      new RegExp(`[ \\t]*<link(?![^>]*data-rh)(?![^>]*hreflang)[^>]*\\brel="${escapeRe(rel)}"[^>]*>\\s*\\n?`, 'gi'),
      '',
    );
  }

  return out;
}

async function prerender() {
  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error('[Prerender] Error: dist/index.html does not exist. Run vite build first.');
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  console.log('[Prerender] Initializing Vite SSR loader in Node.js (Zero Browser Binary)...');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    root: ROOT_DIR
  });

  try {
    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');

    for (const route of PUBLIC_ROUTES) {
      console.log(`[Prerender] SSG rendering route: ${route}`);
      const helmetContext = {};
      const { html: appHtml, helmet } = render(route, helmetContext);

      const headTags = [
        helmet?.title?.toString() || '',
        helmet?.meta?.toString() || '',
        helmet?.link?.toString() || '',
        helmet?.script?.toString() || ''
      ].filter(Boolean).join('\n    ');

      let finalHtml = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
      if (headTags) {
        finalHtml = stripTagsReplacedByHelmet(finalHtml, headTags);
        finalHtml = finalHtml.replace('</head>', `    ${headTags}\n</head>`);
      }

      const routeDir = route === '/' ? DIST_DIR : path.join(DIST_DIR, route);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }

      const targetPath = path.join(routeDir, 'index.html');
      fs.writeFileSync(targetPath, finalHtml, 'utf-8');
      console.log(`[Prerender] Saved static HTML: ${targetPath}`);
    }

    console.log('[Prerender] Pre-rendering completed successfully for all public routes!');
  } catch (err) {
    console.error('[Prerender] Error during SSG rendering:', err);
    process.exitCode = 1;
  } finally {
    await vite.close();
  }
}

prerender();
