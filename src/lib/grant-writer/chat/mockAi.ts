/**
 * Mock AI runner for the Grant Writer chat panel.
 * Streams plausible markdown responses + simulates tool calls so the UI
 * is fully interactive before the real AI gateway is wired in.
 *
 * Swap this file with a real edge-function caller later — the public
 * interface (runMockAssistant) stays the same.
 */

import type { WizardData } from '@/lib/grant-writer/types';

export type ChatToolName =
  | 'autofill_wizard'
  | 'generate_document'
  | 'web_search'
  | 'plain_response';

export interface ChatToolCall {
  name: ChatToolName;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  label: string; // human-readable label for UI chip
}

export interface RunAssistantArgs {
  userMessage: string;
  wizardData: WizardData;
  currentStepId: string;
  /** Streamed chunks (markdown). Called many times. */
  onToken: (chunk: string) => void;
  /** Tool announcements (UI shows a chip while running). */
  onTool: (tool: ChatToolCall) => void;
  signal?: AbortSignal;
}

export interface RunAssistantResult {
  fullText: string;
  tools: ChatToolCall[];
}

// ---------- Helpers ----------

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

async function streamText(
  text: string,
  onToken: (chunk: string) => void,
  signal?: AbortSignal,
) {
  // Stream word-by-word with small jitter for realism.
  const tokens = text.match(/\S+\s*|\n+/g) ?? [text];
  for (const tok of tokens) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    onToken(tok);
    await wait(15 + Math.random() * 25, signal);
  }
}

// ---------- Intent routing (very lightweight) ----------

function detectIntent(message: string): ChatToolName {
  const m = message.toLowerCase();
  if (/(cari|search|funder|donor terbaru|hibah terbaru|web)/.test(m)) return 'web_search';
  if (/(generate|buatkan|draft|proposal lengkap|executive summary|log\s?frame)/.test(m))
    return 'generate_document';
  if (/(isi|isikan|fill|auto.?fill|lengkapi|tambahkan ke wizard|simpan ke step)/.test(m))
    return 'autofill_wizard';
  return 'plain_response';
}

// ---------- Mock responses ----------

function plainResponse(userMessage: string, stepId: string): string {
  return [
    `Tentu — saya bantu pada langkah **${stepId}**.`,
    ``,
    `Untuk pertanyaan: _"${userMessage.slice(0, 160)}${userMessage.length > 160 ? '…' : ''}"_`,
    ``,
    `Beberapa hal yang perlu Anda pertimbangkan:`,
    ``,
    `1. **Kejelasan masalah** — pastikan satu kalimat masalah inti yang spesifik, terukur, dan terkait konteks lokal.`,
    `2. **Bukti** — sertakan minimal satu data kuantitatif dari sumber kredibel (BPS, Kemenkes, Kemendikbud, dsb.).`,
    `3. **Selaras dengan donor** — gunakan terminologi yang dipakai donor target Anda (mis. "outcome" vs "tujuan khusus").`,
    ``,
    `> Catatan: respons ini di-generate oleh **mock AI**. Setelah backend AI diaktifkan, jawaban akan kontekstual dengan isi wizard Anda.`,
  ].join('\n');
}

function autofillResponse(stepId: string): string {
  return [
    `Saya sudah menyiapkan saran isian untuk langkah **${stepId}**.`,
    ``,
    `**Preview saran:**`,
    `- Akar penyebab #1: Akses pendidikan rendah di pesisir`,
    `- Akar penyebab #2: Minimnya pelatihan guru lokal`,
    `- Akar penyebab #3: Infrastruktur belajar belum memadai`,
    ``,
    `Klik tombol **Terapkan ke wizard** di bawah untuk menyalin ini ke form. Anda bisa edit setelahnya.`,
    ``,
    `_Mock — auto-fill akan benar-benar memodifikasi wizard ketika AI gateway aktif._`,
  ].join('\n');
}

function generateDocResponse(): string {
  return [
    `### Draft Executive Summary`,
    ``,
    `**Judul Proyek:** Penguatan Literasi Pesisir Berbasis Komunitas`,
    ``,
    `Proyek ini bertujuan meningkatkan capaian literasi anak usia 7–12 tahun di 12 desa pesisir Indonesia Timur melalui kombinasi pelatihan guru, perpustakaan komunitas keliling, dan kelas akhir pekan berbasis budaya lokal.`,
    ``,
    `**Goal (Impact):** Meningkatnya akses pendidikan dasar yang inklusif dan kontekstual.`,
    ``,
    `**Outcome:** 70% anak sasaran mencapai standar literasi dasar dalam 18 bulan.`,
    ``,
    `**Output utama:**`,
    `1. 60 guru terlatih metode literasi kontekstual`,
    `2. 12 perpustakaan komunitas aktif`,
    `3. Modul ajar berbasis budaya pesisir tersedia`,
    ``,
    `_Mock — generator nyata akan menggunakan data wizard Anda secara penuh._`,
  ].join('\n');
}

function webSearchResponse(query: string): string {
  return [
    `Hasil pencarian untuk: **"${query}"**`,
    ``,
    `1. **Tanoto Foundation — Pelita Pendidikan** — fokus literasi anak usia dini, geografi: nasional. [Tautan](https://www.tanotofoundation.org)`,
    `2. **Yayasan Sukma — Kartini Awards** — funding pendidikan perempuan, deadline biasanya September. [Tautan](https://yayasansukma.org)`,
    `3. **GPE Knowledge & Innovation Exchange** — call for proposal global, sektor pendidikan dasar. [Tautan](https://www.globalpartnership.org)`,
    ``,
    `> _Mock — tool web_search akan benar-benar memanggil API saat di-wire._`,
  ].join('\n');
}

// ---------- Public runner ----------

export async function runMockAssistant(args: RunAssistantArgs): Promise<RunAssistantResult> {
  const { userMessage, currentStepId, onToken, onTool, signal } = args;

  const intent = detectIntent(userMessage);
  const tools: ChatToolCall[] = [];

  // Initial "thinking" pause
  await wait(250 + Math.random() * 250, signal);

  let body = '';
  switch (intent) {
    case 'web_search': {
      const tool: ChatToolCall = {
        name: 'web_search',
        input: { query: userMessage },
        label: 'Mencari di web…',
      };
      onTool(tool);
      tools.push(tool);
      await wait(600, signal);
      tool.output = { results_count: 3 };
      body = webSearchResponse(userMessage);
      break;
    }
    case 'generate_document': {
      const tool: ChatToolCall = {
        name: 'generate_document',
        input: { kind: 'executive_summary' },
        label: 'Menyusun draft dokumen…',
      };
      onTool(tool);
      tools.push(tool);
      await wait(500, signal);
      tool.output = { sections: 4 };
      body = generateDocResponse();
      break;
    }
    case 'autofill_wizard': {
      const tool: ChatToolCall = {
        name: 'autofill_wizard',
        input: { step: currentStepId },
        label: `Menyiapkan auto-fill untuk ${currentStepId}…`,
      };
      onTool(tool);
      tools.push(tool);
      await wait(500, signal);
      tool.output = { suggested_fields: 3 };
      body = autofillResponse(currentStepId);
      break;
    }
    default: {
      body = plainResponse(userMessage, currentStepId);
    }
  }

  await streamText(body, onToken, signal);
  return { fullText: body, tools };
}

export const STARTER_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Bantu rumuskan masalah inti',
    prompt: 'Bantu saya merumuskan satu kalimat masalah inti yang SMART untuk proyek ini.',
  },
  {
    label: 'Saran indikator OVI',
    prompt: 'Saran 3 indikator OVI yang relevan untuk outcome utama saya.',
  },
  {
    label: 'Cari donor relevan',
    prompt: 'Cari donor internasional yang aktif di sektor pendidikan Indonesia 2026.',
  },
  {
    label: 'Generate executive summary',
    prompt: 'Generate executive summary 1 halaman dari data wizard saya.',
  },
];