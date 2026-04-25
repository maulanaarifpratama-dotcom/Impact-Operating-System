import type { AdBrief, AdPlatform, AdVariant } from './types';

/**
 * Deterministic mock copy generator for the Ads MVP.
 * Real LLM call can be wired later via Lovable AI Gateway.
 */

const CTA_BY_OBJECTIVE: Record<AdBrief['objective'], string[]> = {
  donasi: ['Donasi Sekarang', 'Bantu Hari Ini', 'Salurkan Kebaikan', 'Mulai Berdonasi', 'Beri Dampak Nyata'],
  awareness: ['Pelajari Lebih Lanjut', 'Cari Tahu', 'Baca Selengkapnya', 'Lihat Faktanya', 'Mulai Peduli'],
  recruit_relawan: ['Daftar Relawan', 'Gabung Sekarang', 'Mulai Berkontribusi', 'Jadi Bagian Kami', 'Saya Mau Bantu'],
  event_signup: ['Daftar Gratis', 'Amankan Tempat', 'Reservasi Sekarang', 'Ikut Sekarang', 'Hadiri Event'],
  sales_umkm: ['Beli Sekarang', 'Pesan Hari Ini', 'Belanja Berdampak', 'Dukung UMKM', 'Coba Produknya'],
};

const TONE_OPENERS: Record<AdBrief['tone'], string[]> = {
  emosional: [
    'Bersama, kita bisa',
    'Setiap langkah berarti',
    'Cerita ini belum selesai',
    'Sebuah harapan untuk',
  ],
  profesional: [
    'Kami mengundang Anda',
    'Bergabunglah bersama kami',
    'Dengan hormat',
    'Kami menghadirkan',
  ],
  casual: ['Eh, tahu nggak?', 'Cerita sebentar yuk', 'Ini menarik banget', 'Lo perlu lihat ini'],
};

const PLATFORM_HEADLINE: Record<AdPlatform, (campaign: string, opener: string) => string[]> = {
  meta: (c, o) => [
    `${o} — ${c}`,
    `${c}: aksi nyata dimulai sekarang`,
    `${c} butuh Anda hari ini`,
    `Cerita ${c} belum selesai`,
  ],
  google: (c, _o) => [
    `${c} | Resmi & Terpercaya`,
    `Dukung ${c} Sekarang`,
    `${c} — Mulai Hari Ini`,
    `${c}: Info Lengkap`,
  ],
  tiktok: (c, o) => [
    `${o.toLowerCase()}, ${c.toLowerCase()} 👀`,
    `pov: lo nemu ${c}`,
    `${c} tuh real banget`,
    `cerita ${c} bikin merinding`,
  ],
};

const PLATFORM_BODY: Record<AdPlatform, (b: AdBrief) => string[]> = {
  meta: (b) => [
    `${b.message} Untuk ${b.audience}${b.region ? ` di ${b.region}` : ''}. Setiap dukungan Anda jadi langkah nyata.`,
    `Bersama ${b.audience}, kami ingin ${b.message.toLowerCase()} Klik di bawah dan jadi bagian dari perubahan.`,
    `${b.message} Bantu kami menjangkau lebih banyak ${b.audience}${b.region ? ` di ${b.region}` : ''}.`,
  ],
  google: (b) => [
    `${b.message} Cocok untuk ${b.audience}. Pelajari & dukung sekarang.`,
    `Resmi & transparan. ${b.message} Mulai dari sekarang.`,
    `${b.message} ${b.region ? `Fokus di ${b.region}. ` : ''}Klik untuk info.`,
  ],
  tiktok: (b) => [
    `${b.message} Buat ${b.audience.toLowerCase()} yang peduli ✨ Swipe up sekarang.`,
    `Cerita kecil tapi ngena. ${b.message} Lo harus tau ini 🔥`,
    `${b.message} Yuk jadi bagian dari ${b.audience.toLowerCase()} yang ngambil aksi 💪`,
  ],
};

const HASHTAGS_BY_OBJECTIVE: Record<AdBrief['objective'], string[]> = {
  donasi: ['#DonasiBerdampak', '#KebaikanIndonesia', '#SatuLangkahLebihDekat'],
  awareness: ['#TahuItuPenting', '#EdukasiSosial', '#ImpactoryIndonesia'],
  recruit_relawan: ['#JadiRelawan', '#GerakBersama', '#Volunteering'],
  event_signup: ['#EventSosial', '#GerakanIndonesia', '#JoinKami'],
  sales_umkm: ['#UMKMSosial', '#BelanjaBerdampak', '#BanggaBuatanIndonesia'],
};

function pickRotating<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/**
 * Produces a single variant for a platform at a given seed (deterministic).
 * Same brief + platform + seed → same variant.
 */
export function buildVariant(
  brief: AdBrief,
  platform: AdPlatform,
  seed: number,
  index: number,
): AdVariant {
  const openers = TONE_OPENERS[brief.tone];
  const headlines = PLATFORM_HEADLINE[platform];
  const bodies = PLATFORM_BODY[platform](brief);
  const ctas = CTA_BY_OBJECTIVE[brief.objective];
  const hashtags = HASHTAGS_BY_OBJECTIVE[brief.objective];

  const opener = pickRotating(openers, seed);
  const headlineList = headlines(brief.campaign || 'Kampanye Anda', opener);
  return {
    id: `${platform}-var-${index + 1}-s${seed}`,
    headline: pickRotating(headlineList, seed),
    body: bodies[seed % bodies.length] ?? bodies[0],
    cta: pickRotating(ctas, seed),
    hashtags: platform === 'tiktok' || platform === 'meta' ? hashtags : undefined,
  };
}

/**
 * Produces 3 deterministic variants for a single platform.
 */
export function generateAdVariantsForPlatform(
  brief: AdBrief,
  platform: AdPlatform,
): AdVariant[] {
  return Array.from({ length: 3 }).map((_, i) => buildVariant(brief, platform, i, i));
}

export interface PlatformResult {
  platform: AdPlatform;
  variants: AdVariant[];
}

/**
 * Produces variants for all selected platforms.
 */
export function generateAdVariants(brief: AdBrief): PlatformResult[] {
  return brief.platforms.map((p) => ({
    platform: p,
    variants: generateAdVariantsForPlatform(brief, p),
  }));
}