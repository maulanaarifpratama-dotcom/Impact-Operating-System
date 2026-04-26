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

/** Where signup CTAs should land in demo mode. */
export const DEMO_SIGNUP_REDIRECT = '/dashboard/grant-writer';

/** Real signup route, used when demo mode is off. */
export const REAL_SIGNUP_HREF = '/signup';

/**
 * Resolve the href for any "sign up / daftar" CTA. Use this everywhere on the
 * landing surface so toggling `DEMO_MODE` updates every CTA at once.
 */
export function signupHref(): string {
  return DEMO_MODE ? DEMO_SIGNUP_REDIRECT : REAL_SIGNUP_HREF;
}