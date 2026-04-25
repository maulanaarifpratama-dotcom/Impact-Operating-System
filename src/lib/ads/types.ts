/**
 * Impactory Ads — domain types for the AI ad copy generator MVP.
 * Frontend-only: a deterministic template engine produces variants from a brief.
 */

export type AdPlatform = 'meta' | 'google' | 'tiktok';

export const PLATFORM_LABEL: Record<AdPlatform, string> = {
  meta: 'Meta (FB/IG)',
  google: 'Google Ads',
  tiktok: 'TikTok',
};

export const PLATFORM_DESC: Record<AdPlatform, string> = {
  meta: 'Feed & Stories — emosional, visual, CTA jelas.',
  google: 'Search — headline padat, intent driven.',
  tiktok: 'Hook 3 detik, bahasa percakapan, autentik.',
};

/** Platform-specific limits (approximate, used for character counters). */
export const PLATFORM_LIMITS: Record<
  AdPlatform,
  { headline: number; body: number; cta: number; headlines: number; bodies: number }
> = {
  meta: { headline: 40, body: 125, cta: 20, headlines: 1, bodies: 1 },
  google: { headline: 30, body: 90, cta: 15, headlines: 3, bodies: 2 },
  tiktok: { headline: 40, body: 100, cta: 20, headlines: 1, bodies: 1 },
};

export type AdObjective = 'donasi' | 'awareness' | 'recruit_relawan' | 'event_signup' | 'sales_umkm';

export const OBJECTIVE_LABEL: Record<AdObjective, string> = {
  donasi: 'Galang donasi',
  awareness: 'Edukasi & awareness',
  recruit_relawan: 'Rekrut relawan',
  event_signup: 'Pendaftaran event',
  sales_umkm: 'Penjualan UMKM sosial',
};

export type AdTone = 'emosional' | 'profesional' | 'casual';

export const TONE_LABEL: Record<AdTone, string> = {
  emosional: 'Emosional',
  profesional: 'Profesional',
  casual: 'Casual',
};

export const TONE_DESC: Record<AdTone, string> = {
  emosional: 'Menyentuh hati, menggugah empati & urgensi.',
  profesional: 'Tegas, terstruktur, kredibel — cocok untuk donor formal.',
  casual: 'Ringan, percakapan sehari-hari, dekat dengan audiens muda.',
};

export interface AdBrief {
  /** Nama kampanye / produk / program. */
  campaign: string;
  /** Pesan utama: inti yang ingin disampaikan. */
  message: string;
  /** Target audiens singkat. */
  audience: string;
  /** Lokasi / geografi (opsional). */
  region?: string;
  objective: AdObjective;
  tone: AdTone;
  /** Platform yang dipilih (multi-select). */
  platforms: AdPlatform[];
}

export interface AdVariant {
  id: string;
  headline: string;
  body: string;
  cta: string;
  hashtags?: string[];
}