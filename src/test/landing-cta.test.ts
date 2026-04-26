import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Demo-mode guard: while auth flow is not ready, no CTA on the
 * marketing/landing surface should send users to /signup.
 * All "Daftar" / "Mulai" CTAs must point to a dashboard route
 * (typically /dashboard/grant-writer).
 *
 * If you intentionally re-enable signup, update or remove this test.
 */

const LANDING_DIR = resolve(__dirname, "../components/landing");
const INDEX_PAGE = resolve(__dirname, "../pages/Index.tsx");

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const landingFiles = [...collectFiles(LANDING_DIR), INDEX_PAGE];

// Match: to="/signup", to='/signup', href="/signup..." (but NOT /signup-something-else like /signup-success — we still want to flag any /signup* path).
const SIGNUP_LINK = /(?:to|href)\s*=\s*["'`]\/signup\b/;

describe("landing CTAs (demo mode)", () => {
  it.each(landingFiles.map((f) => [f]))(
    "%s must not link to /signup",
    (file) => {
      const src = readFileSync(file, "utf8");
      const match = src.match(SIGNUP_LINK);
      expect(
        match,
        `Found a link to /signup in ${file}. ` +
          `Demo mode is active — point CTAs to /dashboard/grant-writer instead.`,
      ).toBeNull();
    },
  );
});