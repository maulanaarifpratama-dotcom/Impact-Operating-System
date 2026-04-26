import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { DEMO_MODE } from "@/lib/demo-mode";

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

// Match: to="/signup", to='/signup', href="/signup..." (any /signup* path).
const SIGNUP_LINK = /(?:to|href)\s*=\s*["'`]\/signup\b/;

describe.runIf(DEMO_MODE)("landing CTAs (demo mode)", () => {
  it.each(landingFiles.map((f) => [f]))(
    "%s must not hardcode a link to /signup",
    (file) => {
      const src = readFileSync(file, "utf8");
      const match = src.match(SIGNUP_LINK);
      expect(
        match,
        `Found a hardcoded link to /signup in ${file}. ` +
          `Demo mode is active — use signupHref() from @/lib/demo-mode instead.`,
      ).toBeNull();
    },
  );
});

describe.skipIf(DEMO_MODE)("landing CTAs (live mode)", () => {
  it("demo mode is off — signup CTAs may point to /signup", () => {
    expect(DEMO_MODE).toBe(false);
  });
});