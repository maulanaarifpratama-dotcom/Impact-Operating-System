/**
 * Demo mode flag.
 *
 * While `DEMO_MODE` is true, the auth flow is bypassed:
 *   - All "Daftar" / "Mulai" CTAs on the marketing surface must point to a
 *     dashboard route instead of `/signup`.
 *   - The landing-CTA test enforces the rule above automatically.
 *
 * To re-enable the real signup flow, flip this to `false`. No other code or
 * tests need to be touched manually.
 */
export const DEMO_MODE = true;

/** Real signup route, used when demo mode is off. */
export const REAL_SIGNUP_HREF = '/signup';

/**
 * Roles offered on the landing surface. Mirrors the values in
 * `PRIMARY_ROLES` (src/lib/brand.ts) so the dashboard can pre-fill an
 * onboarding context if it wants to.
 */
export type DemoRole =
  | 'foundation_lead'
  | 'umkm_owner'
  | 'changemaker'
  | 'consultant'
  | 'other';

/**
 * Map a landing-page role to the most relevant Grant Writer onboarding
 * page. Today every role lands on the Grant Writer index, but with
 * different `mode` defaults (Quick vs LFA) plus a `role` tag the index
 * can read to personalise copy.
 *
 * Add new role overrides here — never hardcode the path at the call site.
 */
const ROLE_REDIRECT: Record<DemoRole, { path: string; mode: 'quick' | 'lfa' }> = {
  // Yayasan / NGO — donor internasional, butuh LFA penuh.
  foundation_lead: { path: '/dashboard/grant-writer', mode: 'lfa' },
  // UMKM sosial — biasanya hibah lokal/private, mode cepat lebih cocok.
  umkm_owner: { path: '/dashboard/grant-writer', mode: 'quick' },
  // Changemaker individu — onboarding ringan dengan mode cepat.
  changemaker: { path: '/dashboard/grant-writer', mode: 'quick' },
  // Konsultan — sering bantu klien yayasan, default LFA.
  consultant: { path: '/dashboard/grant-writer', mode: 'lfa' },
  // Tidak diketahui — biarkan user memilih sendiri di index.
  other: { path: '/dashboard/grant-writer', mode: 'quick' },
};

/** Generic signup CTA without a known role. */
export function signupHref(): string {
  if (!DEMO_MODE) return REAL_SIGNUP_HREF;
  return '/dashboard/grant-writer';
}

/**
 * Role-aware signup CTA. Use this when the CTA is contextual (e.g. a
 * pricing tier targeted at yayasan, or a hero role picker).
 *
 * Adds `?role=<role>&mode=<quick|lfa>` so the dashboard can pre-fill the
 * "create project" dialog with the right defaults and copy.
 */
export function signupHrefForRole(role: DemoRole): string {
  if (!DEMO_MODE) return REAL_SIGNUP_HREF;
  const { path, mode } = ROLE_REDIRECT[role];
  const params = new URLSearchParams({ role, mode });
  return `${path}?${params.toString()}`;
}