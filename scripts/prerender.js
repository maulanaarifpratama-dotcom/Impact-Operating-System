import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const SPA_TEMPLATE_PATH = path.resolve(__dirname, '../dist/spa-template.html');

const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Simple Node HTTP server serving dist with SPA fallback
function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const port = server.address().port;
      const parsedUrl = new URL(req.url, `http://localhost:${port}`);
      let relativePath = parsedUrl.pathname;

      let targetFile = path.join(DIST_DIR, relativePath);

      // If pointing to a directory or non-existent route, fallback to spa-template.html for client rendering
      let isFile = fs.existsSync(targetFile) && fs.statSync(targetFile).isFile();

      if (!isFile) {
        targetFile = SPA_TEMPLATE_PATH;
      }

      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'text/html';

      fs.readFile(targetFile, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end(`Error loading ${targetFile}: ${err.message}`);
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    server.listen(0, () => {
      const actualPort = server.address().port;
      console.log(`[Prerender] Local static server running on http://localhost:${actualPort}`);
      resolve(server);
    });
  });
}

async function prerender() {
  const originalIndex = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(originalIndex)) {
    console.error('[Prerender] Error: dist/index.html does not exist. Run vite build first.');
    process.exit(1);
  }

  // Backup original SPA index.html to spa-template.html for server fallback
  fs.copyFileSync(originalIndex, SPA_TEMPLATE_PATH);
  console.log('[Prerender] Backed up original dist/index.html to spa-template.html');

  const server = await startStaticServer();
  const PORT = server.address().port;
  let browser;

  try {
    console.log('[Prerender] Launching Chromium via Playwright...');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    for (const route of PUBLIC_ROUTES) {
      const url = `http://localhost:${PORT}${route}`;
      console.log(`[Prerender] Rendering route: ${route} (${url})`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000); // Allow react-helmet-async to update DOM

      const html = await page.content();

      const routeDir = route === '/' ? DIST_DIR : path.join(DIST_DIR, route);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }

      const targetHtmlPath = path.join(routeDir, 'index.html');
      fs.writeFileSync(targetHtmlPath, html, 'utf-8');
      console.log(`[Prerender] Successfully saved static HTML: ${targetHtmlPath}`);
    }

    console.log('[Prerender] Pre-rendering finished successfully for all public routes!');
  } catch (err) {
    console.error('[Prerender] Error during pre-rendering:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
    // Clean up temporary template file
    if (fs.existsSync(SPA_TEMPLATE_PATH)) {
      fs.unlinkSync(SPA_TEMPLATE_PATH);
    }
  }
}

prerender();
