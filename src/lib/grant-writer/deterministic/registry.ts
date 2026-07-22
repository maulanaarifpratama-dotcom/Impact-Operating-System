import type {
  InterventionArchetype,
  OutcomeFamily,
  OutputFamily,
  Sector,
  Actor,
  ProblemFamily,
  AntiSignalRule
} from './types';

export const REGISTRY_VERSION = '1.2';
export const REGISTRY_SOURCE = 'docs/impactory_deterministic_program_context_sdg_mapping_v1_2.md';

// 14 Priority Intervention Archetypes from §7.1
export const INTERVENTION_ARCHETYPES: InterventionArchetype[] = [
  {
    archetype_id: "ARCH-TRAINING-001",
    name_id: "Pelatihan & Workshop",
    name_en: "Training & Workshop",
    definition: "Meningkatkan pengetahuan dan keterampilan teknis individu melalui modul terstruktur dan sesi kelas.",
    positive_action_signals: ["melatih", "pelatihan", "workshop", "bimtek", "penataran", "kurikulum", "modul", "train", "training", "sekolah lapang"],
    object_signals: ["peserta", "materi", "sertifikat", "kompetensi", "computers", "computer", "software"],
    actor_signals: ["ACT-019", "ACT-017", "ACT-007", "ACT-001"],
    explicit_user_phrases: ["menyelenggarakan kelas pelatihan", "melatih kader", "mengajarkan modul"],
    problem_family_ids: ["PF-015", "PF-018", "PF-005"],
    expected_output_family_ids: ["OPF-001", "OPF-002", "OPF-024"],
    expected_intermediate_outcome_ids: ["OF-001", "OF-002"],
    expected_outcome_family_ids: ["OF-003"],
    wbs_pattern_ids: ["WBS-TRAIN-01"],
    cost_driver_pattern_ids: ["COST-TRAIN-01"],
    meal_pattern_ids: ["MEAL-TRAIN-01"],
    negative_signals: ["melatih hewan"],
    anti_signals: ["SDG-ANTI-TRAINING-006"],
    confusable_archetype_ids: [
      { archetype_id: "ARCH-TOT-002", disambiguation: "ToT ditargetkan khusus untuk melatih individu agar melatih orang lain." }
    ],
    minimum_evidence: "Daftar hadir peserta terverifikasi + hasil pre-post test",
    disambiguation_questions: "Apakah program ini fokus pada penyampaian materi kelas, atau pendampingan praktik lapangan berkelanjutan?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-TOT-002",
    name_id: "Training of Trainers (ToT)",
    name_en: "Training of Trainers",
    definition: "Melatih pelatih atau kader lokal agar memiliki kemampuan mengajarkan kembali modul kepada komunitas sasaran.",
    positive_action_signals: ["ToT", "melatih pelatih", "melatih fasilitator", "kaderisasi", "melatih kader", "melatih kader kesehatan", "kader kesehatan"],
    object_signals: ["master trainer", "modul ToT", "kader"],
    actor_signals: ["ACT-017", "ACT-034"],
    explicit_user_phrases: ["melatih kader agar bisa mengajar", "kaderisasi fasilitator"],
    problem_family_ids: ["PF-007", "PF-017"],
    expected_output_family_ids: ["OPF-002"],
    expected_intermediate_outcome_ids: ["OF-002"],
    expected_outcome_family_ids: ["OF-003"],
    wbs_pattern_ids: ["WBS-TOT-02"],
    cost_driver_pattern_ids: ["COST-TOT-02"],
    meal_pattern_ids: ["MEAL-TOT-02"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [
      { archetype_id: "ARCH-TRAINING-001", disambiguation: "Training biasa tidak mensyaratkan peserta melatih kembali orang lain." }
    ],
    minimum_evidence: "Sertifikasi kelulusan kader sebagai trainer + log sesi pengajaran mandiri",
    disambiguation_questions: "Apakah peserta ToT memiliki kewajiban formal untuk melatih kelompok sasaran di wilayah mereka?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-MENTOR-003",
    name_id: "Pendampingan & Mentoring",
    name_en: "Mentoring & Coaching",
    definition: "Memberikan bimbingan langsung, personal, dan berkala di lapangan untuk mengawal penerapan praktik baru.",
    positive_action_signals: ["mendampingi", "coaching", "mentoring", "pendampingan lapangan", "asistensi", "coach", "mentor", "mentoring"],
    object_signals: ["mentee", "usaha pendampingan", "lembar asistensi"],
    actor_signals: ["ACT-001", "ACT-007", "ACT-014", "ACT-035"],
    explicit_user_phrases: ["melakukan kunjungan lapangan rutin", "mengawal implementasi bisnis"],
    problem_family_ids: ["PF-005", "PF-006", "PF-001"],
    expected_output_family_ids: ["OPF-002"],
    expected_intermediate_outcome_ids: ["OF-003"],
    expected_outcome_family_ids: ["OF-009", "OF-012"],
    wbs_pattern_ids: ["WBS-MENT-03"],
    cost_driver_pattern_ids: ["COST-MENT-03"],
    meal_pattern_ids: ["MEAL-MENT-03"],
    negative_signals: ["mendampingi pejabat"],
    anti_signals: [],
    confusable_archetype_ids: [
      { archetype_id: "ARCH-TRAINING-001", disambiguation: "Mentoring bersifat personal dan pasca-kelas, sedangkan training bersifat klasikal." }
    ],
    minimum_evidence: "Logbook pendampingan lapangan dengan tanda tangan basah/geotag",
    disambiguation_questions: "Apakah pendampingan dilakukan secara berkala (misal seminggu sekali) atau hanya bersifat insidental?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-FACIL-004",
    name_id: "Fasilitasi Komunitas",
    name_en: "Community Facilitation",
    definition: "Mengorganisasikan warga lokal untuk melakukan rembuk, mengidentifikasi kebutuhan bersama, dan mengelola aksi kolektif.",
    positive_action_signals: ["memfasilitasi", "pengorganisasian komunitas", "rembuk warga", "musyawarah", "memobilisasi"],
    object_signals: ["komunitas", "kelompok warga", "forum warga"],
    actor_signals: ["ACT-030", "ACT-021", "ACT-031"],
    explicit_user_phrases: ["memfasilitasi pembentukan kelompok", "rembuk warga tahunan"],
    problem_family_ids: ["PF-011", "PF-012"],
    expected_output_family_ids: ["OPF-005", "OPF-018"],
    expected_intermediate_outcome_ids: ["OF-010"],
    expected_outcome_family_ids: ["OF-018"],
    wbs_pattern_ids: ["WBS-FACIL-04"],
    cost_driver_pattern_ids: ["COST-FACIL-04"],
    meal_pattern_ids: ["MEAL-FACIL-04"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [],
    minimum_evidence: "Berita acara rembuk warga dengan daftar tanda tangan kehadiran",
    disambiguation_questions: "Apakah fasilitasi ini diarahkan untuk membentuk kelompok swadaya baru atau hanya pertemuan sosialisasi sesaat?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-BCC-005",
    name_id: "Komunikasi Perubahan Perilaku (BCC)",
    name_en: "Behavior Change Communication",
    definition: "Kampanye komunikasi strategis interpersonal untuk mengubah praktik kebiasaan sehari-hari.",
    positive_action_signals: ["kampanye perilaku", "konseling menyusui", "penyuluhan gizi", "BCC"],
    object_signals: ["materi edukasi", "perubahan kebiasaan", "ibu hamil"],
    actor_signals: ["ACT-015", "ACT-017"],
    explicit_user_phrases: ["kampanye perubahan perilaku sanitasi", "konseling pintu ke pintu"],
    problem_family_ids: ["PF-004", "PF-008"],
    expected_output_family_ids: ["OPF-003", "OPF-004"],
    expected_intermediate_outcome_ids: ["OF-001"],
    expected_outcome_family_ids: ["OF-003"],
    wbs_pattern_ids: ["WBS-BCC-05"],
    cost_driver_pattern_ids: ["COST-BCC-05"],
    meal_pattern_ids: ["MEAL-BCC-05"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [
      { archetype_id: "ARCH-AWARE-006", disambiguation: "BCC mengukur perubahan praktik konkret, sedangkan Awareness hanya mengukur jangkauan paparan informasi." }
    ],
    minimum_evidence: "Laporan survei kepatuhan perilaku sebelum & sesudah kampanye",
    disambiguation_questions: "Apakah pesan kampanye ini menargetkan tindakan spesifik individu, atau sekadar penyebaran informasi umum?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-AWARE-006",
    name_id: "Penyuluhan & Kampanye Kesadaran",
    name_en: "Awareness & Sensitization",
    definition: "Menyebarluaskan informasi krusial secara masif untuk meningkatkan kesadaran publik tanpa paksaan tindakan individual.",
    positive_action_signals: ["penyuluhan", "sosialisasi", "kampanye", "pemberitahuan", "siaran pers"],
    object_signals: ["brosur", "poster", "paparan informasi", "masyarakat umum"],
    actor_signals: ["ACT-017", "ACT-030"],
    explicit_user_phrases: ["melakukan sosialisasi program", "menyebarkan pamflet kesadaran"],
    problem_family_ids: ["PF-015", "PF-018"],
    expected_output_family_ids: ["OPF-003"],
    expected_intermediate_outcome_ids: ["OF-001"],
    expected_outcome_family_ids: [],
    wbs_pattern_ids: ["WBS-AWARE-06"],
    cost_driver_pattern_ids: ["COST-AWARE-06"],
    meal_pattern_ids: ["MEAL-AWARE-06"],
    negative_signals: ["sosialisasi politik"],
    anti_signals: [],
    confusable_archetype_ids: [
      { archetype_id: "ARCH-BCC-005", disambiguation: "Awareness tidak menuntut adanya verifikasi penerapan praktik beralih secara individual." }
    ],
    minimum_evidence: "Foto dokumentasi kegiatan + log jumlah pamflet/siaran digital terdistribusi",
    disambiguation_questions: "Apakah efektivitas program diukur dari jumlah orang yang terpapar informasi atau dari perubahan perilaku riil mereka?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-DIGDEV-007",
    name_id: "Pengembangan Sistem & Aplikasi",
    name_en: "Digital Platform Development",
    definition: "Membangun atau mengadaptasi fungsionalitas software aplikasi, website, atau platform digital interaktif.",
    positive_action_signals: ["mendevelop", "pembuatan aplikasi", "coding", "pemrograman", "sistem informasi", "merancang", "membangun", "melaunching", "menerbitkan", "meluncurkan"],
    object_signals: ["source code", "user interface", "server", "database", "aplikasi", "aplikasi mobile", "website", "portal", "platform", "sistem", "digital", "SP4N-LAPOR"],
    actor_signals: ["ACT-035", "ACT-007"],
    explicit_user_phrases: ["membangun sistem database", "merancang aplikasi mobile"],
    problem_family_ids: ["PF-006", "PF-016"],
    expected_output_family_ids: ["OPF-006", "OPF-007"],
    expected_intermediate_outcome_ids: ["OF-004"],
    expected_outcome_family_ids: ["OF-011"],
    wbs_pattern_ids: ["WBS-DIG-07"],
    cost_driver_pattern_ids: ["COST-DIG-07"],
    meal_pattern_ids: ["MEAL-DIG-07"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [
      { archetype_id: "ARCH-DASH-009", disambiguation: "Platform digital fokus pada fungsionalitas pengguna interaktif, sedangkan Dashboard fokus pada penyajian data visual." }
    ],
    minimum_evidence: "UAT (User Acceptance Test) sign-off + link repositori kode aktif",
    disambiguation_questions: "Apakah platform ini memiliki fitur transaksi/input interaktif oleh pengguna, atau hanya menampilkan visualisasi statis?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-DASH-009",
    name_id: "Penyusunan Dashboard & Sistem Agregasi",
    name_en: "Dashboard & Aggregation System",
    definition: "Menyusun panel visual pelaporan data eksekutif untuk mendukung pengambilan keputusan berbasis data.",
    positive_action_signals: ["membuat dashboard", "dashboard pemantauan", "visualisasi data", "agregasi pelaporan"],
    object_signals: ["panel visual", "metrik KPI", "grafik", "report"],
    actor_signals: ["ACT-019", "ACT-035"],
    explicit_user_phrases: ["menyusun dashboard monitoring", "mengintegrasikan data pelaporan"],
    problem_family_ids: ["PF-016", "PF-015"],
    expected_output_family_ids: ["OPF-007"],
    expected_intermediate_outcome_ids: ["OF-011"],
    expected_outcome_family_ids: ["OF-019"],
    wbs_pattern_ids: ["WBS-DASH-09"],
    cost_driver_pattern_ids: ["COST-DASH-09"],
    meal_pattern_ids: ["MEAL-DASH-09"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [
      { archetype_id: "ARCH-DIGDEV-007", disambiguation: "Dashboard murni berfokus pada agregasi visual data pelaporan eksekutif." }
    ],
    minimum_evidence: "Screenshot tampilan dashboard aktif yang terisi data riil + kredensial akses demonstrasi",
    disambiguation_questions: "Apakah sistem ini mengolah data input lapangan secara langsung, atau sekadar menampilkan ringkasan visual dari laporan manual?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-EQUIP-010",
    name_id: "Distribusi Alat, Bibit, & Sarana Fisik",
    name_en: "Equipment & Physical Asset Provision",
    definition: "Mengadakan dan membagikan barang modal produksi, bibit, atau sarana fisik penunjang kerja.",
    positive_action_signals: ["membagikan", "distribusi bibit", "pengadaan mesin", "penyerahan alat", "bantuan sarana", "menyalurkan", "pasokan", "penyaluran", "menyediakan", "distribusi", "pembagian"],
    object_signals: ["traktor", "susu", "biskuit sehat", "multivitamin", "pupuk", "mesin jahit", "peralatan medis", "tangki air", "tensimeter", "tensimeter digital", "alat", "modal", "hibah modal", "modal usaha", "zakat"],
    actor_signals: ["ACT-001", "ACT-017"],
    explicit_user_phrases: ["menyerahkan bantuan mesin produksi", "membagikan paket bibit unggul"],
    problem_family_ids: ["PF-001", "PF-003", "PF-005"],
    expected_output_family_ids: ["OPF-014", "OPF-020"],
    expected_intermediate_outcome_ids: ["OF-004"],
    expected_outcome_family_ids: ["OF-012"],
    wbs_pattern_ids: ["WBS-EQUIP-10"],
    cost_driver_pattern_ids: ["COST-EQUIP-10"],
    meal_pattern_ids: ["MEAL-EQUIP-10"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [],
    minimum_evidence: "BAP (Berita Acara Penyerahan) ditandatangani penerima manfaat + dokumentasi foto serah terima fisik",
    disambiguation_questions: "Apakah barang yang dibagikan bersifat hibah habis pakai, atau aset produktif jangka panjang?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-A2F-013",
    name_id: "Fasilitasi Akses Keuangan & Kredit",
    name_en: "Access to Finance Facilitation",
    definition: "Menghubungkan kelompok sasaran ke lembaga penyedia modal, bank, koperasi, atau skema kredit mikro.",
    positive_action_signals: ["akses keuangan", "kredit mikro", "pendanaan usaha", "akses permodalan", "simpan pinjam"],
    object_signals: ["pinjaman", "buku tabungan", "koperasi", "rekening"],
    actor_signals: ["ACT-001", "ACT-007", "ACT-014"],
    explicit_user_phrases: ["memfasilitasi pembukaan rekening", "menghubungkan ke bank pembina"],
    problem_family_ids: ["PF-005", "PF-001"],
    expected_output_family_ids: ["OPF-016"],
    expected_intermediate_outcome_ids: ["OF-012"],
    expected_outcome_family_ids: ["OF-009"],
    wbs_pattern_ids: ["WBS-A2F-13"],
    cost_driver_pattern_ids: ["COST-A2F-13"],
    meal_pattern_ids: ["MEAL-A2F-13"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [],
    minimum_evidence: "Daftar pengajuan kredit yang disetujui lembaga keuangan mitra + rekap mutasi penyaluran",
    disambiguation_questions: "Apakah program ini menyalurkan modal hibah gratis secara langsung, atau mengupayakan skema pinjaman bergulir?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-MARKET-015",
    name_id: "Fasilitasi Akses Pasar & Kemitraan Dagang",
    name_en: "Market Access & Trade Partnership",
    definition: "Menghubungkan produsen lokal ke pasar pembeli langsung (offtaker) untuk mengunci harga jual yang adil.",
    positive_action_signals: ["akses pasar", "kemitraan dagang", "offtaker", "pemasaran hasil bumi", "kontrak pembelian", "temu bisnis", "business matching"],
    object_signals: ["pembeli siaga", "memorandum of understanding", "skema bagi hasil"],
    actor_signals: ["ACT-001", "ACT-007"],
    explicit_user_phrases: ["menandatangani MoU pembelian hasil tani", "menghubungkan ke jaringan retail"],
    problem_family_ids: ["PF-005", "PF-010"],
    expected_output_family_ids: ["OPF-015"],
    expected_intermediate_outcome_ids: ["OF-012"],
    expected_outcome_family_ids: ["OF-009"],
    wbs_pattern_ids: ["WBS-MARKET-15"],
    cost_driver_pattern_ids: ["COST-MARKET-15"],
    meal_pattern_ids: ["MEAL-MARKET-15"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [],
    minimum_evidence: "Salinan naskah kerja sama pembelian (MoU/PKS) aktif yang ditandatangani offtaker & perwakilan warga",
    disambiguation_questions: "Apakah program ini hanya melatih cara memasarkan produk, atau secara aktif mengontrak kemitraan dengan pembeli siaga?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-CAPACITY-018",
    name_id: "Penguatan Kapasitas Kelembagaan",
    name_en: "Institutional Capacity Strengthening",
    definition: "Meningkatkan kemampuan tata kelola internal organisasi mitra, kelompok tani, atau lembaga lokal.",
    positive_action_signals: ["kapasitas kelembagaan", "manajemen koperasi", "penyusunan SOP", "struktur pengurus", "SOP", "SOP respons"],
    object_signals: ["dokumen SOP", "legalitas lembaga", "rencana strategis"],
    actor_signals: ["ACT-007", "ACT-019"],
    explicit_user_phrases: ["menyusun standar operasional koperasi", "membenahi tata kelola kelembagaan"],
    problem_family_ids: ["PF-017", "PF-016"],
    expected_output_family_ids: ["OPF-018"],
    expected_intermediate_outcome_ids: ["OF-018"],
    expected_outcome_family_ids: ["OF-019"],
    wbs_pattern_ids: ["WBS-CAP-18"],
    cost_driver_pattern_ids: ["COST-CAP-18"],
    meal_pattern_ids: ["MEAL-CAP-18"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [],
    minimum_evidence: "Naskah SOP/legalitas resmi yang disahkan rapat anggota tahunan pengurus",
    disambiguation_questions: "Apakah program ini melatih individu, atau membenahi sistem manajemen formal yang mengikat organisasi?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-POLICY-019",
    name_id: "Advokasi Kebijakan & Regulasi",
    name_en: "Policy Advocacy & Regulation Support",
    definition: "Mendorong perumusan, pengesahan, atau peninjauan ulang regulasi resmi di tingkat pemerintah daerah/pusat.",
    positive_action_signals: ["advokasi kebijakan", "rancangan perda", "peraturan desa", "legal drafting", "policy brief", "ringkasan kebijakan", "kebijakan"],
    object_signals: ["naskah akademik", "draft perda", "surat keputusan", "rekomendasi"],
    actor_signals: ["ACT-019", "ACT-030"],
    explicit_user_phrases: ["mengawal draf peraturan daerah", "menyusun naskah akademis perbup"],
    problem_family_ids: ["PF-012", "PF-016"],
    expected_output_family_ids: ["OPF-019"],
    expected_intermediate_outcome_ids: ["OF-019"],
    expected_outcome_family_ids: ["OF-018"],
    wbs_pattern_ids: ["WBS-POL-19"],
    cost_driver_pattern_ids: ["COST-POL-19"],
    meal_pattern_ids: ["MEAL-POL-19"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [],
    minimum_evidence: "Lembar berita daerah atau salinan naskah SK/Perda resmi yang ditandatangani pejabat berwenang",
    disambiguation_questions: "Apakah advokasi ini menargetkan keputusan formal bupati/desa yang mengikat hukum, atau sekadar saran diskusi?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    archetype_id: "ARCH-PREPAREDNESS-036",
    name_id: "Mitigasi & Kesiapsiagaan Bencana",
    name_en: "Disaster Preparedness & Mitigation",
    definition: "Membangun sistem peringatan dini, struktur evakuasi, dan melatih kesiapsiagaan warga terhadap ancaman bencana alam.",
    positive_action_signals: ["kesiapsiagaan bencana", "mitigasi bencana", "peringatan dini", "jalur evakuasi", "simulasi bencana", "tangki air", "tangki air bersih", "sarana tangki"],
    object_signals: ["rambu evakuasi", "alat sirine", "peta rawan bencana", "sensor cuaca", "sensor cuaca digital", "cuaca"],
    actor_signals: ["ACT-030", "ACT-017"],
    explicit_user_phrases: ["memasang sirine deteksi longsor", "menyelenggarakan simulasi evakuasi warga"],
    problem_family_ids: ["PF-003", "PF-015"],
    expected_output_family_ids: ["OPF-020", "OPF-011"],
    expected_intermediate_outcome_ids: ["OF-020"],
    expected_outcome_family_ids: ["OF-021"],
    wbs_pattern_ids: ["WBS-DIS-36"],
    cost_driver_pattern_ids: ["COST-DIS-36"],
    meal_pattern_ids: ["MEAL-DIS-36"],
    negative_signals: [],
    anti_signals: [],
    confusable_archetype_ids: [],
    minimum_evidence: "SOP tanggap darurat yang disahkan bersama + foto terpasangnya papan jalur evakuasi berkoordinat",
    disambiguation_questions: "Apakah program ini menyalurkan logistik darurat paska-bencana, atau mendesain ketangguhan kesiapan sebelum bencana?",
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  }
];

// Active Outcome Families from §7.2 (Sample relevant entries for fixtures)
export const OUTCOME_FAMILIES: OutcomeFamily[] = [
  {
    outcome_family_id: "OF-001",
    canonical_name_id: "pengetahuan_meningkat",
    canonical_name_en: "knowledge_increased",
    definition: "Peningkatan pemahaman kognitif kelompok sasaran terhadap konsep, metodologi, atau isu tertentu.",
    allowed_target_actor_types: ["ACT-019", "ACT-017", "ACT-001", "ACT-007"],
    positive_predicates_id: ["paham", "mengerti", "memiliki wawasan", "sadar", "mengetahui"],
    positive_predicates_en: ["understands", "aware", "acquired knowledge"],
    object_of_change_ids: ["wawasan teoritis", "skor pre-post test"],
    negative_signals: ["menghadiri kelas"],
    anti_signals: ["SDG-ANTI-TRAINING-006"],
    minimum_evidence: "Hasil rekapitulasi penilaian ujian kognitif pre-test dan post-test",
    likely_sectors: ["SECTOR-EDU-006", "SECTOR-HEALTH-007"],
    likely_archetypes: ["ARCH-TRAINING-001", "ARCH-AWARE-006"],
    indicator_family_ids: ["IND-EDU-TEACH-013"],
    sdg_affinities: [],
    time_horizon_guidance: "Sekejap paska pelatihan (1-2 hari)",
    common_output_confusions: ["OPF-001", "OPF-002"],
    common_activity_confusions: ["kegiatan penyuluhan"],
    causal_leap_risks: ["ANTI-01", "ANTI-12"],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    outcome_family_id: "OF-002",
    canonical_name_id: "keahlian_dikuasai",
    canonical_name_en: "skill_retained",
    definition: "Penguasaan keahlian psikomotorik atau kompetensi teknis praktis yang terverifikasi melalui uji kompetensi.",
    allowed_target_actor_types: ["ACT-019", "ACT-007", "ACT-016"],
    positive_predicates_id: ["mampu mempraktikkan", "terampil", "menguasai metode", "cakap"],
    positive_predicates_en: ["competent", "mastered", "skilled", "capable"],
    object_of_change_ids: ["skor unjuk kerja", "pencatatan teknis"],
    negative_signals: ["memiliki sertifikat kehadiran"],
    anti_signals: ["SDG-ANTI-TRAINING-006"],
    minimum_evidence: "Rubrik lembar penilaian uji kompetensi praktik langsung",
    likely_sectors: ["SECTOR-SKILLS-005", "SECTOR-EDU-006"],
    likely_archetypes: ["ARCH-TRAINING-001", "ARCH-TOT-002"],
    indicator_family_ids: ["IND-HLTH-CAPAC-056"],
    sdg_affinities: [],
    time_horizon_guidance: "1-4 minggu paska intervensi teknis",
    common_output_confusions: ["OPF-002"],
    common_activity_confusions: ["sesi praktikum"],
    causal_leap_risks: ["ANTI-01"],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    outcome_family_id: "OF-003",
    canonical_name_id: "praktik_diadopsi",
    canonical_name_en: "practice_adopted",
    definition: "Penerapan kompetensi baru secara konsisten di dalam rutinitas kerja sehari-hari oleh kelompok sasaran.",
    allowed_target_actor_types: ["ACT-019", "ACT-001", "ACT-017", "ACT-007"],
    positive_predicates_id: ["mengadopsi", "mempraktikkan rutin", "rutin mencatat", "rutin menyusui", "menerapkan praktik"],
    positive_predicates_en: ["routinely applies", "adopted practice", "systematically registers"],
    object_of_change_ids: ["rutinitas harian", "buku pencatatan"],
    negative_signals: ["mengetahui cara"],
    anti_signals: [],
    minimum_evidence: "Observasi berkala tim penilai independen di lapangan",
    likely_sectors: ["SECTOR-AGRI-001", "SECTOR-LIVELIHOOD-002", "SECTOR-EDU-006", "SECTOR-CCA-010"],
    likely_archetypes: ["ARCH-MENTOR-003", "ARCH-BCC-005"],
    indicator_family_ids: ["IND-MSME-PRACT-002", "IND-AGRI-ADOPT-009", "IND-EDU-TEACH-013", "IND-CCA-PRACT-023"],
    sdg_affinities: [{ sdg_id: "SDG_4", official_target_ids: ["4.1"], condition: "Bila target actor adalah guru" }],
    time_horizon_guidance: "3-6 bulan paska pendampingan rutin",
    common_output_confusions: ["OPF-002", "OPF-009"],
    common_activity_confusions: ["praktik terbimbing"],
    causal_leap_risks: ["ANTI-01", "ANTI-12"],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    outcome_family_id: "OF-004",
    canonical_name_id: "teknologi_digunakan",
    canonical_name_en: "technology_used",
    definition: "Penggunaan alat produksi atau platform digital secara aktif oleh pengguna akhir dalam frekuensi normal.",
    allowed_target_actor_types: ["ACT-001", "ACT-007", "ACT-027"],
    positive_predicates_id: ["menggunakan alat", "mengoperasikan mesin", "login aktif", "bertransaksi digital"],
    positive_predicates_en: ["routinely operates", "active usage", "logged in actively"],
    object_of_change_ids: ["utilitas mesin", "log aplikasi MAU"],
    negative_signals: ["menerima pembagian mesin"],
    anti_signals: ["SDG-ANTI-DIGITAL-004"],
    minimum_evidence: "Data analitik digital (MAU/DAU) atau lembar log utilitas jam mesin",
    likely_sectors: ["SECTOR-DIGITAL-023", "SECTOR-AGRI-001"],
    likely_archetypes: ["ARCH-DIGDEV-007", "ARCH-EQUIP-010"],
    indicator_family_ids: ["IND-DIG-MAU-043", "IND-MSME-DIGTX-003"],
    sdg_affinities: [],
    time_horizon_guidance: "3-12 bulan paska go-live/serah terima",
    common_output_confusions: ["OPF-006", "OPF-014", "OPF-020"],
    common_activity_confusions: ["instalasi hardware"],
    causal_leap_risks: ["ANTI-03", "ANTI-06"],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: ["S-C1"]
  },
  {
    outcome_family_id: "OF-005",
    canonical_name_id: "layanan_diakses",
    canonical_name_en: "service_accessed",
    definition: "Pencapaian akses fisik, finansial, atau prosedural ke titik layanan publik oleh kelompok sasaran terpinggirkan.",
    allowed_target_actor_types: ["ACT-010", "ACT-011", "ACT-015", "ACT-022"],
    positive_predicates_id: ["mengakses faskes", "mendaftar sekolah", "mendapat rujukan", "terdaftar layanan", "mengakses air bersih"],
    positive_predicates_en: ["accessed facility", "registered to service", "referred successfully"],
    object_of_change_ids: ["akses layanan"],
    negative_signals: [],
    anti_signals: [],
    minimum_evidence: "Berita acara pendaftaran / log akses database layanan resmi",
    likely_sectors: ["SECTOR-HEALTH-007", "SECTOR-EDU-006", "SECTOR-WASH-009"],
    likely_archetypes: [],
    indicator_family_ids: [],
    sdg_affinities: [],
    time_horizon_guidance: "1-3 bulan",
    common_output_confusions: [],
    common_activity_confusions: [],
    causal_leap_risks: [],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: []
  },
  {
    outcome_family_id: "OF-009",
    canonical_name_id: "pendapatan_meningkat",
    canonical_name_en: "income_increased",
    definition: "Peningkatan pendapatan finansial penerima manfaat dari aktivitas produktif mandiri.",
    allowed_target_actor_types: ["ACT-001", "ACT-007", "ACT-014"],
    positive_predicates_id: ["menaikkan pendapatan", "pendapatan naik", "omset meningkat", "lebih menguntungkan"],
    positive_predicates_en: ["increased income", "income rose"],
    object_of_change_ids: ["omset usaha", "pendapatan bulanan"],
    negative_signals: [],
    anti_signals: [],
    minimum_evidence: "Laporan audit kas / buku kas usaha mikro",
    likely_sectors: ["SECTOR-FININC-004", "SECTOR-LIVELIHOOD-002"],
    likely_archetypes: ["ARCH-MENTOR-003", "ARCH-A2F-013"],
    indicator_family_ids: [],
    sdg_affinities: [],
    time_horizon_guidance: "6-12 bulan",
    common_output_confusions: [],
    common_activity_confusions: [],
    causal_leap_risks: [],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: []
  },
  {
    outcome_family_id: "OF-012",
    canonical_name_id: "produktivitas_meningkat",
    canonical_name_en: "productivity_increased",
    definition: "Peningkatan efisiensi atau volume produksi per satuan waktu/luas lahan.",
    allowed_target_actor_types: ["ACT-001", "ACT-007"],
    positive_predicates_id: ["produktivitas naik", "panen melimpah", "hasil produksi bertambah"],
    positive_predicates_en: ["productivity increased"],
    object_of_change_ids: ["ton per hektar", "unit per jam"],
    negative_signals: [],
    anti_signals: [],
    minimum_evidence: "Data timbangan hasil panen terverifikasi lapangan",
    likely_sectors: ["SECTOR-AGRI-001"],
    likely_archetypes: ["ARCH-EQUIP-010"],
    indicator_family_ids: [],
    sdg_affinities: [],
    time_horizon_guidance: "3-6 bulan",
    common_output_confusions: [],
    common_activity_confusions: [],
    causal_leap_risks: [],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: []
  },
  {
    outcome_family_id: "OF-018",
    canonical_name_id: "compliance_improved", // Resolves informal OF-018-kolab
    canonical_name_en: "compliance_improved",
    definition: "Kepatuhan tata kelola yang membaik.",
    allowed_target_actor_types: [],
    positive_predicates_id: ["patuh", "taat aturan", "tata kelola membaik", "kolaborasi terjalin"],
    positive_predicates_en: [],
    object_of_change_ids: [],
    negative_signals: [],
    anti_signals: [],
    minimum_evidence: "",
    likely_sectors: [],
    likely_archetypes: [],
    indicator_family_ids: [],
    sdg_affinities: [],
    time_horizon_guidance: "",
    common_output_confusions: [],
    common_activity_confusions: [],
    causal_leap_risks: [],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: []
  },
  {
    outcome_family_id: "OF-019",
    canonical_name_id: "accountability_improved", // Resolves informal OF-019-gender
    canonical_name_en: "accountability_improved",
    definition: "Akuntabilitas lembaga membaik.",
    allowed_target_actor_types: [],
    positive_predicates_id: ["akuntabel", "tanggung jawab membaik", "responsif gender"],
    positive_predicates_en: [],
    object_of_change_ids: [],
    negative_signals: [],
    anti_signals: [],
    minimum_evidence: "",
    likely_sectors: [],
    likely_archetypes: [],
    indicator_family_ids: [],
    sdg_affinities: [],
    time_horizon_guidance: "",
    common_output_confusions: [],
    common_activity_confusions: [],
    causal_leap_risks: [],
    epistemic_label: "CANONICAL_IMPACTORY",
    sources: []
  }
];

// Active Output Families from §7.3
export const OUTPUT_FAMILIES: OutputFamily[] = [
  {
    output_family_id: "OPF-001",
    canonical_name: "training_conducted",
    project_control_level: "FULL",
    expected_verification: "Absensi digital + foto geotag + sertifikat fisik terbit.",
    likely_outcome_family_ids: ["OF-001", "OF-002"],
    common_confusions: "Melatih diklaim otomatis melahirkan adopsi kebiasaan harian (HN-1).",
    positive_signals: ["kegiatan melatih", "kelas terselenggara", "materi diajarkan", "melatih literasi keuangan", "melatih ibu-ibu"]
  },
  {
    output_family_id: "OPF-002",
    canonical_name: "capacity_strengthened",
    project_control_level: "FULL",
    expected_verification: "Logbook mentoring + berita acara pendampingan berkala.",
    likely_outcome_family_ids: ["OF-003", "OF-009"],
    common_confusions: "Mentoring selesai diklaim sebagai jaminan peningkatan omset dagang.",
    positive_signals: ["mentoring dilakukan", "pendampingan terlaksana"]
  },
  {
    output_family_id: "OPF-012",
    canonical_name: "facility_rehabilitated",
    project_control_level: "FULL",
    expected_verification: "BA serah terima paska renovasi + foto perbandingan sebelum/sesudah.",
    likely_outcome_family_ids: ["OF-005", "OF-006"],
    common_confusions: "Renovasi selesai diklaim sebagai perbaikan kualitas layanan.",
    positive_signals: ["merenovasi loket", "merenovasi faskes"]
  },
  {
    output_family_id: "OPF-013",
    canonical_name: "equipment_procured_deprecated_alias",
    project_control_level: "FULL",
    expected_verification: "DIALIASKAN DAN DIGABUNGKAN DENGAN OPF-014. JANGAN GUNAKAN UNTUK CATATAN BARU.",
    likely_outcome_family_ids: [],
    common_confusions: "Pengadaan fisik di gudang diklaim sebagai adopsi teknologi.",
    positive_signals: ["pengadaan mesin", "traktor dibeli", "susu dibeli", "biskuit dibeli"]
  },
  {
    output_family_id: "OPF-014",
    canonical_name: "equipment_distributed",
    project_control_level: "FULL",
    expected_verification: "BAP (Berita Acara Penyerahan) tertanda tangan basah + foto geotag penerima bersama barang.",
    likely_outcome_family_ids: ["OF-004", "OF-011"],
    common_confusions: "Barang diterima diklaim otomatis meningkatkan produktivitas (ANTI-03).",
    positive_signals: ["membagikan susu", "membagikan biskuit", "membagikan multivitamin", "menyerahkan bantuan mesin", "membagikan paket bibit", "traktor diserahkan"]
  },
  {
    output_family_id: "OPF-026",
    canonical_name: "referral_mechanism_established",
    project_control_level: "FULL",
    expected_verification: "SOP rujukan formal terbit + log rujukan pasien digital.",
    likely_outcome_family_ids: ["OF-005"],
    common_confusions: "Log rujukan terbentuk diklaim langsung menurunkan angka kematian ibu.",
    positive_signals: ["sistem rujukan dibentuk", "skema rujukan diaktifkan"]
  }
];

// Active Sectors
export const SECTORS: Sector[] = [
  {
    id: "SECTOR-AGRI-001",
    name: "Pangan & Pertanian",
    positive_signals: ["pertanian", "tani", "petani", "tanam", "sawah", "panen", "kebun", "agro", "padi", "benih", "pupuk", "tanaman", "hasil bumi"],
    negative_signals: ["tani kota hias"]
  },
  {
    id: "SECTOR-LIVELIHOOD-002",
    name: "Pemberdayaan Ekonomi",
    positive_signals: ["pendapatan", "omset", "livelihood", "ekonomi", "usaha mikro", "bisnis", "mandiri keuangan", "koperasi", "pelaku usaha", "kuliner", "jualan", "omzet", "penjualan"],
    negative_signals: []
  },
  {
    id: "SECTOR-COOP-003",
    name: "Koperasi",
    positive_signals: ["koperasi", "RAT", "SHU", "anggota"],
    negative_signals: []
  },
  {
    id: "SECTOR-FININC-004",
    name: "Inklusi Keuangan",
    positive_signals: ["literasi keuangan", "keuangan", "perbankan", "tabungan", "simpan pinjam", "rekening", "kredit mikro"],
    negative_signals: []
  },
  {
    id: "SECTOR-SKILLS-005",
    name: "Keterampilan Kerja",
    positive_signals: ["menjahit", "keterampilan", "kerja", "keahlian", "teknis", "mekanik", "otomotif", "magang", "sertifikasi", "nganggur", "ICT", "training", "computers", "computer", "software", "master"],
    negative_signals: []
  },
  {
    id: "SECTOR-EDU-006",
    name: "Pendidikan",
    positive_signals: ["sekolah", "guru", "murid", "belajar", "kognitif", "pendidikan", "kurikulum", "buku", "literacy", "teachers", "schools", "learning", "students"],
    negative_signals: []
  },
  {
    id: "SECTOR-HEALTH-007",
    name: "Kesehatan",
    positive_signals: ["kesehatan", "medis", "dokter", "faskes", "puskesmas", "menyusui", "imunisasi", "obat", "skrining", "posyandu", "kader", "tensi", "hipertensi", "tensimeter"],
    negative_signals: []
  },
  {
    id: "SECTOR-NUTRI-008",
    name: "Gizi & Pangan Tambahan",
    positive_signals: ["balita", "kurang gizi", "gizi", "susu", "makanan tambahan", "biskuit sehat", "multivitamin", "nutrisi", "stunting", "PMBA", "MPASI"],
    negative_signals: []
  },
  {
    id: "SECTOR-WASH-009",
    name: "Air & Sanitasi",
    positive_signals: ["air bersih", "sanitasi", "toilet", "wash", "pipa air", "MCK", "jamban", "CTPS", "BABS", "ODF", "buang air sembarangan"],
    negative_signals: []
  },
  {
    id: "SECTOR-CCA-010",
    name: "Lingkungan & Iklim",
    positive_signals: ["perubahan iklim", "lingkungan", "kehutanan", "bencana", "karbon", "konservasi", "iklim", "kekeringan", "adaptasi", "musim", "cuaca", "suhu"],
    negative_signals: []
  },
  {
    id: "SECTOR-MITIG-011",
    name: "Mitigasi Emisi & Karbon",
    positive_signals: ["emisi", "karbon", "energi bersih", "GHG", "greenhouse gas"],
    negative_signals: []
  },
  {
    id: "SECTOR-ENV-012",
    name: "Konservasi Lingkungan",
    positive_signals: ["sampah", "konservasi", "mangrove", "DAS", "pohon", "hutan"],
    negative_signals: []
  },
  {
    id: "SECTOR-DRR-013",
    name: "Pengurangan Risiko Bencana",
    positive_signals: ["bencana", "siaga", "evakuasi", "Destana", "kebencanaan", "satgas kebencanaan", "BPBD"],
    negative_signals: []
  },
  {
    id: "SECTOR-HUM-014",
    name: "Kemanusiaan & Darurat",
    positive_signals: ["darurat", "pengungsi", "bantuan", "terdampak", "tanggap darurat", "tangki air", "musim kemarau", "pasokan", "bencana alam"],
    negative_signals: []
  },
  {
    id: "SECTOR-SOCPRO-015",
    name: "Perlindungan Sosial",
    positive_signals: ["bansos", "DTKS", "PKH", "tepat sasaran", "zakat", "mustahik", "prasejahtera", "modal usaha mikro", "miskin"],
    negative_signals: []
  },
  {
    id: "SECTOR-CHILD-016",
    name: "Perlindungan Anak",
    positive_signals: ["anak", "kekerasan", "perlindungan", "PATBM"],
    negative_signals: []
  },
  {
    id: "SECTOR-GEWE-017",
    name: "Kesetaraan Gender",
    positive_signals: ["perempuan", "kesetaraan", "KDRT", "PEKKA", "wanita", "hak suara", "kontrol keputusan"],
    negative_signals: []
  },
  {
    id: "SECTOR-DISAB-018",
    name: "Inklusi Disabilitas",
    positive_signals: ["disabilitas", "aksesibilitas", "inklusi"],
    negative_signals: []
  },
  {
    id: "SECTOR-YOUTH-019",
    name: "Kepemudaan",
    positive_signals: ["pemuda", "NEET", "karang taruna", "anak muda"],
    negative_signals: []
  },
  {
    id: "SECTOR-GOV-020",
    name: "Tata Kelola Pemerintahan",
    positive_signals: ["OPD", "musrenbang", "layanan publik", "SAKIP"],
    negative_signals: []
  },
  {
    id: "SECTOR-CSO-021",
    name: "Tata Kelola Organisasi Sipil",
    positive_signals: ["OMS", "yayasan", "tata kelola", "audit", "LSM", "Lembaga Swadaya Masyarakat", "organisasi nirlaba", "non-profit"],
    negative_signals: []
  },
  {
    id: "SECTOR-CIVTECH-022",
    name: "Teknologi Kewargaan",
    positive_signals: ["lapor", "platform warga", "partisipasi digital", "pengaduan", "suara warga", "transparansi", "SP4N-LAPOR", "portal pengaduan"],
    negative_signals: []
  },
  {
    id: "SECTOR-DIGITAL-023",
    name: "Digital",
    positive_signals: ["aplikasi mobile", "sistem database", "platform digital", "transaksi digital", "coding", "software", "website", "portal", "digitalisasi"],
    negative_signals: []
  },
  {
    id: "SECTOR-PEACE-024",
    name: "Peramaian & Hubungan Sosial",
    positive_signals: ["konflik", "damai", "antar-kelompok"],
    negative_signals: []
  },
  {
    id: "SECTOR-MIGR-025",
    name: "Migrasi & Pekerja Migran",
    positive_signals: ["PMI", "migran", "pengungsi", "prosedural"],
    negative_signals: []
  },
  {
    id: "SECTOR-URBAN-026",
    name: "Permukiman Perkotaan",
    positive_signals: ["kumuh", "hunian", "sertifikat", "gusur"],
    negative_signals: []
  },
  {
    id: "SECTOR-RURAL-027",
    name: "Pembangunan Perdesaan",
    positive_signals: ["desa", "BUMDes", "dana desa", "musdes"],
    negative_signals: []
  },
  {
    id: "SECTOR-ENERGY-028",
    name: "Energi Bersih",
    positive_signals: ["listrik", "PLTS", "energi", "terang"],
    negative_signals: []
  },
  {
    id: "SECTOR-CSR-029",
    name: "Keberlanjutan Bisnis",
    positive_signals: ["rantai pasok", "pemasok", "keberlanjutan bisnis"],
    negative_signals: []
  },
  {
    id: "SECTOR-KNOW-030",
    name: "Riset & Kebijakan",
    positive_signals: ["riset", "kajian", "policy brief", "advokasi", "ringkasan kebijakan", "sosialisasi", "sadar"],
    negative_signals: []
  }
];

// Active Actors
export const ACTORS: Actor[] = [
  {
    id: "ACT-001",
    name: "Petani Kecil",
    positive_signals: ["petani", "pekebun", "peternak"]
  },
  {
    id: "ACT-014",
    name: "Perempuan Prasejahtera",
    positive_signals: ["perempuan prasejahtera", "ibu-ibu prasejahtera", "ibu rumah tangga miskin", "kepala keluarga perempuan"]
  },
  {
    id: "ACT-017",
    name: "Anak Balita",
    positive_signals: ["anak balita", "balita", "bayi", "anak kurang gizi"]
  },
  {
    id: "ACT-019",
    name: "Kader Desa / Guru",
    positive_signals: ["kader", "guru", "fasilitator lokal", "kader posyandu"]
  }
];

// Active Problem Families
export const PROBLEM_FAMILIES: ProblemFamily[] = [
  {
    id: "PF-015",
    name: "Kurangnya Keterampilan Keuangan",
    positive_signals: ["pengeluaran boros", "kurang literasi", "tidak mencatat keuangan"]
  },
  {
    id: "PF-018-cognitive-learning-gap",
    name: "Learning Gap (Kognitif)",
    positive_signals: ["kualitas belajar rendah", "nilai ujian anjlok", "gap kognitif"]
  },
  {
    id: "PF-019-attendance-school-dropout",
    name: "Putus Sekolah (Presensi)",
    positive_signals: ["bolos sekolah", "putus sekolah", "tidak masuk sekolah"]
  }
];

// Active Anti-Signals
export const ANTI_SIGNALS: AntiSignalRule[] = [
  {
    id: "SDG-ANTI-FARMER-001",
    target_id: "SDG_2",
    positive_signals: ["petani sayur", "petani kecil", "pekebun", "hasil tani"]
  },
  {
    id: "SDG-ANTI-WOMAN-002",
    target_id: "SDG_5",
    positive_signals: ["perempuan", "ibu-ibu", "ibu rumah tangga", "perempuan kepala keluarga"]
  },
  {
    id: "SDG-ANTI-TRAINING-006",
    target_id: "SDG_4",
    positive_signals: ["pelatihan", "melatih", "workshop", "bimtek"]
  },
  {
    id: "SDG-ANTI-DIGITAL-004",
    target_id: "SDG_9",
    positive_signals: ["aplikasi", "platform", "sistem", "digital"]
  }
];

// Early Aliases Mapping
export const ALIAS_MAPPINGS: Record<string, string> = {
  "OPF-013": "OPF-014" // equipment_procured resolves to equipment_distributed
};

// Integrity Verification on load
export function verifyRegistryIntegrity(): void {
  const allIds = new Set<string>();
  
  // Check duplicates in Archetypes
  for (const item of INTERVENTION_ARCHETYPES) {
    if (allIds.has(item.archetype_id)) {
      throw new Error(`Registry Duplicate-ID failure: Archetype ID "${item.archetype_id}" is registered more than once.`);
    }
    allIds.add(item.archetype_id);
  }

  // Check duplicates in Outcomes
  for (const item of OUTCOME_FAMILIES) {
    if (allIds.has(item.outcome_family_id)) {
      throw new Error(`Registry Duplicate-ID failure: Outcome Family ID "${item.outcome_family_id}" is registered more than once.`);
    }
    allIds.add(item.outcome_family_id);
  }

  // Check duplicates in Outputs
  for (const item of OUTPUT_FAMILIES) {
    if (allIds.has(item.output_family_id)) {
      throw new Error(`Registry Duplicate-ID failure: Output Family ID "${item.output_family_id}" is registered more than once.`);
    }
    allIds.add(item.output_family_id);
  }

  // Check duplicates in Sectors
  for (const item of SECTORS) {
    if (allIds.has(item.id)) {
      throw new Error(`Registry Duplicate-ID failure: Sector ID "${item.id}" is registered more than once.`);
    }
    allIds.add(item.id);
  }

  // Check duplicates in Actors
  for (const item of ACTORS) {
    if (allIds.has(item.id)) {
      throw new Error(`Registry Duplicate-ID failure: Actor ID "${item.id}" is registered more than once.`);
    }
    allIds.add(item.id);
  }

  // Verify unresolved aliases
  for (const [aliasId, targetId] of Object.entries(ALIAS_MAPPINGS)) {
    if (!allIds.has(targetId)) {
      throw new Error(`Unresolved Alias failure: Alias "${aliasId}" points to unmapped Target ID "${targetId}".`);
    }
  }
}

// Automatically verify on import
verifyRegistryIntegrity();
