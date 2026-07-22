export const BLUEPRINT_TEMPLATES = {
  problem: 'Masalah terverifikasi: [PROBLEM_EVIDENCE].',
  impact: 'Dampak jangka panjang terverifikasi: [IMPACT_EVIDENCE].',
  outcome: 'Perubahan hasil terverifikasi: [OUTCOME_EVIDENCE].',
  output: 'Keluaran terverifikasi: [OUTPUT_EVIDENCE].',
  activity: 'Aktivitas terverifikasi: [ACTIVITY_EVIDENCE].'
};

export const BLUEPRINT_FALLBACKS: Record<string, string> = {
  UNRESOLVED_UI_MARKER: 'UNRESOLVED_NEEDS_EVIDENCE'
};
