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
  urgent: ['Hanya hari ini', 'Waktu hampir habis', 'Jangan tunggu lagi', 'Kesempatan terakhir'],
  inspiratif: ['Bersama, kita bisa', 'Setiap langkah berarti', 'Ubah cerita ini', 'Mulai dari Anda'],
  hangat: ['Halo, sahabat', 'Cerita kecil yang besar', 'Mari berbagi', 'Sebuah pelukan untuk'],
  formal: ['Kami mengundang Anda', 'Bergabunglah bersama kami', 'Dengan hormat', 'Kami menghadirkan'],
  percakapan: ['Eh, tahu nggak?', 'Cerita sebentar yuk', 'Ini menarik banget', 'Lo perlu lihat ini'],
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

const PLATFORM_BODY: Record<
  AdPlatform,
  (b: AdBrief) => string[]
> = {
  meta: (b) => [
    `${b.description} Untuk ${b.audience}${b.region ? ` di ${b.region}` : ''}. Setiap dukungan Anda jadi langkah nyata.`,
    `Bersama ${b.audience}, kami ingin ${b.description.toLowerCase()} Klik di bawah dan jadi bagian dari perubahan.`,
    `${b.description} Bantu kami menjangkau lebih banyak ${b.audience}${b.region ? ` di ${b.region}` : ''}.`,
  ],
  google: (b) => [
    `${b.description} Cocok untuk ${b.audience}. Pelajari & dukung sekarang.`,
    `Resmi & transparan. ${b.description} Mulai dari sekarang.`,
    `${b.description} ${b.region ? `Fokus di ${b.region}. ` : ''}Klik untuk info.`,
  ],
  tiktok: (b) => [
    `${b.description} Buat ${b.audience.toLowerCase()} yang peduli ✨ Swipe up sekarang.`,
    `Cerita kecil tapi ngena. ${b.description} Lo harus tau ini 🔥`,
    `${b.description} Yuk jadi bagian dari ${b.audience.toLowerCase()} yang ngambil aksi 💪`,
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
 * Produces 3 deterministic variants for the given brief.
 * Same input → same output, so user can iterate confidently.
 */
export function generateAdVariants(brief: AdBrief): AdVariant[] {
  const openers = TONE_OPENERS[brief.tone];
  const headlines = PLATFORM_HEADLINE[brief.platform];
  const bodies = PLATFORM_BODY[brief.platform](brief);
  const ctas = CTA_BY_OBJECTIVE[brief.objective];
  const hashtags = HASHTAGS_BY_OBJECTIVE[brief.objective];

  return Array.from({ length: 3 }).map((_, i) => {
    const opener = pickRotating(openers, i);
    const headlineList = headlines(brief.campaign || 'Kampanye Anda', opener);
    return {
      id: `var-${i + 1}`,
      headline: pickRotating(headlineList, i),
      body: bodies[i] ?? bodies[0],
      cta: pickRotating(ctas, i),
      hashtags: brief.platform === 'tiktok' || brief.platform === 'meta' ? hashtags : undefined,
    };
  });
}