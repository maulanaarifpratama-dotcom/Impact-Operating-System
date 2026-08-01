import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_element(name):
    return OxmlElement(name)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_callout(doc, text, title="💡 PETUNJUK & TIPS DARI AHLI", border_color="0F382C", bg_color="F0F7F4"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Set left border thick
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_t = p.add_run(f"{title}\n")
    run_t.bold = True
    run_t.font.name = 'Calibri'
    run_t.font.size = Pt(10.5)
    run_t.font.color.rgb = RGBColor(15, 56, 44)
    
    run_b = p.add_run(text)
    run_b.font.name = 'Calibri'
    run_b.font.size = Pt(9.5)
    run_b.font.color.rgb = RGBColor(50, 50, 50)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def add_screenshot(doc, img_path, caption):
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(2)
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=Inches(6.0))
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(0)
        p_cap.paragraph_format.space_after = Pt(12)
        run_cap = p_cap.add_run(f"Gambar: {caption}")
        run_cap.font.name = 'Calibri'
        run_cap.font.size = Pt(8.5)
        run_cap.font.italic = True
        run_cap.font.color.rgb = RGBColor(100, 100, 100)
    else:
        p_err = doc.add_paragraph(f"[Gambar tidak ditemukan: {img_path}]")
        p_err.paragraph_format.space_after = Pt(6)

def build_manual_book():
    doc = docx.Document()
    
    # Page Margins (1 inch)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
    # Standard styles setup
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(40, 40, 40)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(6)

    # --- COVER PAGE ---
    p_cov_space = doc.add_paragraph()
    p_cov_space.paragraph_format.space_before = Pt(30)
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("PANDUAN PENGGUNA LENGKAP (MANUAL BOOK)\nIMPACTORY.ID")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(24)
    run_title.bold = True
    run_title.font.color.rgb = RGBColor(15, 56, 44) # Emerald
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Sistem Operasi Pertumbuhan NGO, Perancangan Program, Proposal AI, LFA, Budget, MEAL, dan Pengukuran Dampak SROI dari A sampai Z")
    run_sub.font.name = 'Calibri'
    run_sub.font.size = Pt(13)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 110, 100)
    
    # Horizontal Rule / Line
    p_hr = doc.add_paragraph()
    p_hr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_hr.paragraph_format.space_before = Pt(20)
    p_hr.paragraph_format.space_after = Pt(40)
    run_hr = p_hr.add_run("____________________________________________________")
    run_hr.font.color.rgb = RGBColor(212, 175, 55) # Gold
    run_hr.bold = True

    # Cover Meta Box
    table_meta = doc.add_table(rows=5, cols=2)
    table_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Nama Platform", "Impactory.id (NGO Growth OS)"),
        ("Versi Dokumen", "v2.5 - Enterprise Edition 2026"),
        ("Target Pengguna", "Pimpinan NGO, Program Manager, Grantwriter, Finance & MEAL Officer"),
        ("Tanggal Terbit", "28 Juli 2026"),
        ("Penerbit", "Tim Pengembangan Sistem Impactory.id")
    ]
    for idx, (k, v) in enumerate(meta_data):
        row = table_meta.rows[idx]
        c1, c2 = row.cells[0], row.cells[1]
        c1.width = Inches(2.0)
        c2.width = Inches(4.0)
        set_cell_background(c1, "F0F7F4")
        set_cell_background(c2, "FAFAFA")
        set_cell_margins(c1, top=60, bottom=60, left=100, right=100)
        set_cell_margins(c2, top=60, bottom=60, left=100, right=100)
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(k)
        r1.bold = True
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(15, 56, 44)
        
        p2 = c2.paragraphs[0]
        r2 = p2.add_run(v)
        r2.font.size = Pt(10)

    doc.add_page_break()

    # --- DAFTAR ISI & STRUKTUR MODUL ---
    h1 = doc.add_heading("Daftar Isi & Peta Navigasi Fitur (A-Z)", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)
    
    p_toc_desc = doc.add_paragraph("Manual Book ini disusun secara terstruktur langkah demi langkah untuk memandu pengguna dalam memanfaatkan seluruh ekosistem Impactory.id dari tahap awal autentikasi hingga pelaporan dampak tingkat lanjut:")
    
    modules_toc = [
        ("MODUL 1: AUTENTIKASI & ONBOARDING", [
            "1.1 Halaman Login & Akses Masuk",
            "1.2 Registrasi Akun Baru (Sign Up)",
            "1.3 Onboarding Organisasi & Inisialisasi Profil"
        ]),
        ("MODUL 2: NGO GROWTH OS (MANAJEMEN KETAHANAN ORGANISASI)", [
            "2.1 Executive Dashboard Utama (90-Day Roadmap)",
            "2.2 Readiness Scorecard (Audit Matriks G.R.O.W.T.H)",
            "2.3 Resource Access Tracker (Hibah Teknologi TechSoup, Google, Microsoft)",
            "2.4 Donor CRM & Manajemen Hubungan Sponsor"
        ]),
        ("MODUL 3: PROGRAM DESIGN & PROPOSAL AI SYSTEM", [
            "3.1 Grant Pipeline & Database Peluang Hibah Internasional",
            "3.2 Grantwriter Proposal Manager",
            "3.3 Quick Wizard Generator Proposal Berbasis AI",
            "3.4 Editor Proposal AI & Kustomisasi Dokumen Donor"
        ]),
        ("MODUL 4: LOGICAL FRAMEWORK APPROACH (LFA BUILDER & WBS)", [
            "4.1 LFA Matrix Builder (Goal, Outcome, Output, Activity)",
            "4.2 Matriks Indikator & Means of Verification (MoV)",
            "4.3 LFA Vertical Logic & Integrity Audit",
            "4.4 Work Breakdown Structure (WBS Builder)",
            "4.5 Detail Aktivitas WBS & Pelacakan Variansi Jadwal"
        ]),
        ("MODUL 5: PERENCANAAN BUDGET & PENGUKURAN MEAL", [
            "5.1 Budget Calculator (RAB Scaffolds & Target Envelope)",
            "5.2 Realisasi Anggaran & Variance Tracker",
            "5.3 MEAL Planner (Monitoring, Evaluation, Accountability, Learning)",
            "5.4 Pencatatan Capaian Indikator MEAL"
        ]),
        ("MODUL 6: PENGUKURAN DAMPAK SOSIAL & LINGKUNGAN", [
            "6.1 SROI Wizard & Stakeholder Mapping",
            "6.2 Kalkulator Rasio SROI (Social Return on Investment)",
            "6.3 E-ROI Carbon & Environmental Impact Tracker",
            "6.4 Beneficiary Registry (Database Penerima Manfaat)"
        ]),
        ("MODUL 7: PELAPORAN EXECUTIVE & MANAJEMEN TIM", [
            "7.1 Impact Library (Aset Cerita & Galeri Dampak)",
            "7.2 Campaign Builder / Impactory Ads",
            "7.3 Executive Impact Dashboard (3-Lens Health Rollup)",
            "7.4 Monthly Operating Review (Rhythm Pertemuan Organisasi)",
            "7.5 Monthly Impact Report Generator",
            "7.6 Pengaturan Profil Organisasi & Manajemen Anggota Tim"
        ])
    ]

    for mod_title, sub_items in modules_toc:
        p_m = doc.add_paragraph()
        r_m = p_m.add_run(mod_title)
        r_m.bold = True
        r_m.font.color.rgb = RGBColor(15, 56, 44)
        p_m.paragraph_format.space_before = Pt(8)
        p_m.paragraph_format.space_after = Pt(2)
        
        for sub in sub_items:
            p_s = doc.add_paragraph()
            p_s.paragraph_format.left_indent = Inches(0.25)
            p_s.paragraph_format.space_after = Pt(2)
            p_s.add_run(f"• {sub}")

    doc.add_page_break()

    # Base screenshots dir
    img_dir = "scratch/manual-screenshots"

    # ==========================================
    # MODUL 1: AUTENTIKASI & ONBOARDING
    # ==========================================
    h1 = doc.add_heading("MODUL 1: AUTENTIKASI & ONBOARDING ORGANISASI", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)
    
    # 1.1 Login
    doc.add_heading("1.1 Halaman Login & Akses Masuk", level=2)
    doc.add_paragraph("Impactory.id menyediakan sistem autentikasi aman dengan opsi Login menggunakan akun Google atau Magic Link berbasis email tanpa perlu mengingat password yang rumit.")
    doc.add_paragraph("Langkah-langkah Akses Masuk:")
    p_step = doc.add_paragraph()
    p_step.add_run("1. Buka browser dan navigasikan ke alamat URL resmi ").font.size = Pt(11)
    r_url = p_step.add_run("https://impactory.id/login\n")
    r_url.bold = True
    p_step.add_run("2. Pilih metode login:\n")
    p_step.add_run("   • Masuk dengan Google: Klik tombol 'Masuk dengan Google' untuk otentikasi sekali klik.\n")
    p_step.add_run("   • Magic Link: Masukkan email terdaftar Anda, lalu klik 'Kirim magic link'. Cek kotak masuk email Anda dan klik tautan verifikasi.\n")
    p_step.add_run("   • Password: Klik tab 'Password' jika Anda mendaftar menggunakan kata sandi manual.\n")
    p_step.add_run("3. Setelah berhasil terverifikasi, sistem akan mengarahkan Anda ke Dashboard Utama.")
    
    add_screenshot(doc, os.path.join(img_dir, "01-02-login-page.png"), "Antarmuka Halaman Login Impactory.id")
    add_callout(doc, "Pastikan Anda menggunakan email domain resmi organisasi/NGO saat pendaftaran awal agar memudahkan integrasi verifikasi hibah teknologi Google for Nonprofits dan Microsoft for Nonprofits.")

    # 1.2 Sign Up & Onboarding
    doc.add_heading("1.2 Registrasi Akun & Inisialisasi Profil Organisasi", level=2)
    doc.add_paragraph("Bagi pengguna baru, proses registrasi dirancang sangat ringkas untuk langsung mendaftarkan entitas NGO/Yayasan Anda ke dalam ekosistem.")
    doc.add_paragraph("Langkah-langkah Registrasi:")
    p_step = doc.add_paragraph()
    p_step.add_run("1. Pada halaman Login, klik tautan 'Daftar gratis' di bagian bawah modal.\n")
    p_step.add_run("2. Isikan Nama Lengkap, Email Organisasi, Nama Yayasan/NGO, serta Kata Sandi.\n")
    p_step.add_run("3. Klik tombol 'Daftar Sekarang' dan lakukan verifikasi email.\n")
    p_step.add_run("4. Saat pertama kali masuk, Anda akan disambut oleh Wizard Onboarding untuk mengisi sektor fokus utama (Pendidikan, Kesehatan, Lingkungan, Kesejahteraan Sosial) dan kapasitas anggaran tahunan.")
    
    add_screenshot(doc, os.path.join(img_dir, "01-01-landing-page.png"), "Halaman Utama Landing Page & Pintu Masuk Registrasi")

    doc.add_page_break()

    # ==========================================
    # MODUL 2: NGO GROWTH OS
    # ==========================================
    h1 = doc.add_heading("MODUL 2: NGO GROWTH OS (MANAJEMEN KETAHANAN ORGANISASI)", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)

    # 2.1 Executive Dashboard
    doc.add_heading("2.1 Executive Dashboard Utama (90-Day Plan & Health Overview)", level=2)
    doc.add_paragraph("Executive Dashboard merupakan pusat kendali (Control Tower) pimpinan NGO untuk memantau ketahanan organisasi, progres roadmap 90 hari, dan akses cepat ke seluruh sistem perancangan program.")
    
    add_screenshot(doc, os.path.join(img_dir, "01-03-dashboard-home.png"), "Executive Dashboard Utama Impactory Growth OS")
    
    doc.add_paragraph("Komponen Utama Dashboard:")
    p_comp = doc.add_paragraph()
    p_comp.add_run("• Executive Health Cards: ").bold = True
    p_comp.add_run("Menampilkan skor kesiapan institusi, jumlah proposal aktif, total nilai pipeline grant, dan indeks tata kelola.\n")
    p_comp.add_run("• Interactive 90-Day Plan: ").bold = True
    p_comp.add_run("Peta jalan strategis yang membagi prioritas kerja organisasi ke dalam 3 fase (Bulan 1: Fondasi & Scorecard, Bulan 2: Desain Program & Pipeline, Bulan 3: Mobilisasi Sumber Daya & Dampak).\n")
    p_comp.add_run("• Quick Actions Hub: ").bold = True
    p_comp.add_run("Tombol navigasi cepat untuk membuat Proposal Baru, menyusun LFA, mengukur SROI, atau melakukan audit Readiness.")

    add_callout(doc, "Gunakan fitur checklist pada 90-Day Plan saat rapat koordinasi mingguan tim manajemen untuk memastikan setiap milestone ketahanan organisasi tercapai sesuai jadwal.")

    # 2.2 Readiness Scorecard
    doc.add_heading("2.2 Readiness Scorecard (Audit Matriks G.R.O.W.T.H)", level=2)
    doc.add_paragraph("Readiness Scorecard adalah alat diagnostik komprehensif untuk mengukur tingkat kesiapan dan akreditasi internal NGO sebelum mengajukan grant ke donor internasional.")
    
    add_screenshot(doc, os.path.join(img_dir, "02-01-readiness-scorecard.png"), "Antarmuka Audit Readiness Scorecard Matriks G.R.O.W.T.H")

    doc.add_paragraph("Prosedur Pelaksanaan Audit Readiness:")
    p_read = doc.add_paragraph()
    p_read.add_run("1. Buka menu ").font.size = Pt(11)
    p_read.add_run("NGO Growth OS > Readiness Scorecard.\n").bold = True
    p_read.add_run("2. Evaluasi 6 Pilar G.R.O.W.T.H:\n")
    p_read.add_run("   - G (Grant Governance): Keberadaan SOP Keuangan, Audit Eksternal, dan Kebijakan Anti-Korupsi.\n")
    p_read.add_run("   - R (Readiness & Compliance): Legalitas Hukum (Ata Notaris, Kemenkumham, NIB, NPWP).\n")
    p_read.add_run("   - O (Operating Model): Kejelasan Struktur Organisasi & Deskripsi Kerja Tim.\n")
    p_read.add_run("   - W (Workflow & Systems): Digitalisasi sistem kerja dan manajemen proyek.\n")
    p_read.add_run("   - T (Technology & Security): Perlindungan data penerima manfaat & lisensi perangkat lunak.\n")
    p_read.add_run("   - H (Human Capital): Kapasitas SDM dan program pelatihan berkelanjutan.\n")
    p_read.add_run("3. Jawab kuesioner Self-Assessment (Skala 1 - 5) pada setiap indikator.\n")
    p_read.add_run("4. Lihat hasil kalkulasi otomatis berupa Skor Tingkat Kesiapan (misal: 82% - Grant-Ready) beserta rekomendasi aksi perbaikan.")

    # 2.3 Resource Access Tracker
    doc.add_heading("2.3 Resource Access Tracker (Hibah Teknologi)", level=2)
    doc.add_paragraph("Fasilitas pemantauan dan klaim lisensi hibah perangkat lunak internasional bernilai ribuan dolar untuk NGO terdaftar.")
    
    add_screenshot(doc, os.path.join(img_dir, "01-05-resource-access.png"), "Resource Access Tracker untuk Hibah Google, Microsoft, & TechSoup")

    doc.add_paragraph("Langkah Klaim Resource Access:")
    doc.add_paragraph("1. Pilih program hibah yang dituju (misal: Google for Nonprofits - $10,000/bulan Google Ad Grants, Microsoft 365 Cloud Grants, Canva for Nonprofits, atau TechSoup Asia-Pacific).\n2. Ikuti instruksi verifikasi dokumen legalitas yang tertera.\n3. Perbarui status aplikasi (Draft -> Submitted -> Approved) untuk mencatat inventaris aset digital organisasi.")

    # 2.4 Donor CRM
    doc.add_heading("2.4 Donor CRM & Database Hubungan Sponsor", level=2)
    doc.add_paragraph("Sistem manajemen relasi donor untuk mengelola kontak mitra donor, riwayat komunikasi, komitmen pendanaan, serta jadwal pelaporan berkala.")
    
    add_screenshot(doc, os.path.join(img_dir, "01-06-donor-crm.png"), "Antarmuka Manajemen Donor CRM & Pipeline Hubungan Sponsor")

    doc.add_paragraph("Fitur Utama Donor CRM:\n• Database Donor Multilateral, Bawaan Pemerintah, Filantropi, dan CSR Perusahaan.\n• Pipeline Status Mitra: Prospect -> Contacted -> Proposal Submitted -> Agreement Signed -> Active Funder.\n• Pencatatan Log Interaksi & Pengingat Tenggat Laporan Keuangan/Program.")

    doc.add_page_break()

    # ==========================================
    # MODUL 3: PROGRAM DESIGN & PROPOSAL AI
    # ==========================================
    h1 = doc.add_heading("MODUL 3: PROGRAM DESIGN & PROPOSAL AI SYSTEM", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)

    # 3.1 Grant Pipeline
    doc.add_heading("3.1 Grant Pipeline & Database Peluang Hibah", level=2)
    doc.add_paragraph("Modul pencarian peluang pendanaan (Grant Opportunities) yang menyediakan database terkurasi dari berbagai donor global dan lokal.")
    
    add_screenshot(doc, os.path.join(img_dir, "02-01b-grant-pipeline.png"), "Grant Pipeline & Search Engine Peluang Pendanaan")

    doc.add_paragraph("Cara Mencari & Mengelola Grant:\n1. Buka menu Program Design > Grant Pipeline.\n2. Gunakan kata kunci (seperti: 'Stunting', 'Youth Employment', 'Climate Resilience') atau filter berdasarkan Wilayah & Pagu Anggaran.\n3. Klik 'Simpan ke Pipeline' untuk melacak tenggat waktu pendaftaran dan persyaratan khusus donor.")

    # 3.2 Grantwriter Index & Quick Wizard
    doc.add_heading("3.2 Grantwriter Proposal Manager & Quick Wizard AI", level=2)
    doc.add_paragraph("Impactory Grantwriter menggabungkan kecerdasan buatan (AI) dengan standar penulisan proposal donor internasional (USAID, EU, DFAT, Global Fund) untuk memproduksi draft proposal lengkap dalam hitungan menit.")
    
    add_screenshot(doc, os.path.join(img_dir, "02-02-grant-writer-index.png"), "Daftar Manajemen Dokumen Proposal pada Grantwriter Index")
    add_screenshot(doc, os.path.join(img_dir, "02-03-grant-writer-wizard.png"), "Quick Wizard Generator Proposal Berbasis AI")

    doc.add_paragraph("Langkah Membuat Proposal Baru dengan Quick Wizard:")
    p_gw = doc.add_paragraph()
    p_gw.add_run("1. Klik tombol ").font.size = Pt(11)
    p_gw.add_run("'+ Proposal Baru' ").bold = True
    p_gw.add_run("pada halaman Grantwriter Index.\n")
    p_gw.add_run("2. Isikan formulir Quick Wizard:\n")
    p_gw.add_run("   - Judul Program: Masukkan judul program yang informatif dan berdampak.\n")
    p_gw.add_run("   - Latar Belakang Masalah: Deskripsikan akar masalah, data kuantitatif, dan lokasi spesifik.\n")
    p_gw.add_run("   - Target Penerima Manfaat: Tentukan kelompok sasaran (misal: 150 kader Posyandu dan 500 balita).\n")
    p_gw.add_run("   - Pagu Anggaran (Budget Ceiling): Masukkan estimasi total anggaran (misal: Rp 450.000.000).\n")
    p_gw.add_run("   - Durasi Program: Tentukan jangka waktu pelaksanaan (misal: 12 Bulan).\n")
    p_gw.add_run("3. Klik tombol 'Generate Proposal dengan AI'. Sistem akan bekerja di latar belakang mengolah struktur narasi proposal.")

    # 3.3 Editor Proposal AI
    doc.add_heading("3.3 Editor Proposal AI & Kustomisasi Dokumen", level=2)
    doc.add_paragraph("Setelah generasi selesai, dokumen proposal akan terbuka di Editor Rich-Text interaktif yang dilengkapi fitur pendamping AI untuk menyempurnakan setiap bab narasi.")
    
    add_screenshot(doc, os.path.join(img_dir, "02-04-grant-writer-proposal.png"), "Editor Proposal AI Interaktif dengan Fitur Format Donor")

    doc.add_paragraph("Fungsi Editor Proposal:\n• Struktur Otomatis: Terdiri dari Executive Summary, Rationale, Theory of Change, Target Group, Risk Management, & Sustainability Plan.\n• AI Text Assistant: Sorot paragraf mana saja lalu gunakan perintah AI ('Pertajam Bahasa Donor', 'Tambahkan Data Statistik', 'Sederhanakan Paragraf').\n• Ekspor Dokumen: Unduh proposal langsung ke format PDF atau DOCX untuk dikirimkan ke donor.")

    doc.add_page_break()

    # ==========================================
    # MODUL 4: LOGICAL FRAMEWORK APPROACH (LFA)
    # ==========================================
    h1 = doc.add_heading("MODUL 4: LOGICAL FRAMEWORK APPROACH (LFA & WBS)", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)

    # 4.1 LFA Matrix
    doc.add_heading("4.1 LFA Matrix Builder (Goal, Outcome, Output, Activity)", level=2)
    doc.add_paragraph("LFA Builder adalah inti dari perancangan logis program. Sistem secara otomatis mematerialisasi proposal AI menjadi Matriks Kerangka Logis 4x4 berstandar internasional.")
    
    add_screenshot(doc, os.path.join(img_dir, "03-01-lfa-matrix.png"), "Matriks Kerangka Logis (LFA Matrix 4x4) Impactory")

    doc.add_paragraph("Hierarki Struktural LFA:\n1. Goal (Dampak Jangka Panjang): Perubahan tingkat tinggi pada masyarakat/lingkungan.\n2. Outcome (Perubahan Perilaku/Kapasitas): Hasil menengah yang dicapai setelah penerima manfaat mengikuti program.\n3. Output (Hasil Langsung): Produk, layanan, atau fasilitas yang diserahterimakan.\n4. Activity (Aktivitas Lapangan): Rangkaian kegiatan operasional untuk menghasilkan Output.")

    # 4.2 Indikator & MoV
    doc.add_heading("4.2 Matriks Indikator & Means of Verification (MoV)", level=2)
    doc.add_paragraph("Setiap tingkatan dalam LFA dilengkapi dengan Indikator Kinerja Kunci (KPI), Baseline, Target Kuantitatif, serta Alat Bukti Verifikasi (Means of Verification).")
    
    add_screenshot(doc, os.path.join(img_dir, "03-02-lfa-indicators-mov.png"), "Pengaturan Indikator Kinerja Kunci dan Means of Verification (MoV)")

    # 4.3 Vertical Logic Audit
    doc.add_heading("4.3 LFA Vertical Logic & Integrity Audit", level=2)
    doc.add_paragraph("Fitur AI Audit Otomatis yang memeriksa konsistensi logika vertikal (If Activity then Output; If Output then Outcome) serta kelengkapan asumsi risiko.")
    
    add_screenshot(doc, os.path.join(img_dir, "03-03-lfa-integrity-tracker.png"), "LFA Integrity Tracker & Vertical Logic Checker")

    # 4.4 WBS Builder
    doc.add_heading("4.4 Work Breakdown Structure (WBS Builder)", level=2)
    doc.add_paragraph("WBS mengubah aktivitas LFA menjadi breakdown operasional bertingkat (Level 1, Level 2, Level 3) lengkap dengan penetapan penanggung jawab (Person in Charge) dan linimasa waktu.")
    
    add_screenshot(doc, os.path.join(img_dir, "04-01-wbs-builder.png"), "Work Breakdown Structure (WBS Builder) Bertingkat")
    add_screenshot(doc, os.path.join(img_dir, "04-02-wbs-detail-variance.png"), "Detail Aktivitas WBS & Pelacakan Progress Fisik")

    doc.add_page_break()

    # ==========================================
    # MODUL 5: BUDGET CALCULATOR & MEAL PLANNER
    # ==========================================
    h1 = doc.add_heading("MODUL 5: PERENCANAAN BUDGET & PENGUKURAN MEAL", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)

    # 5.1 Budget Calculator
    doc.add_heading("5.1 Budget Calculator (RAB Scaffolds & Target Envelope)", level=2)
    doc.add_paragraph("Budget Calculator secara otomatis menarik struktur aktivitas WBS dan menyusun Draf Rencana Anggaran Biaya (RAB) bertingkat yang dikategorikan berdasarkan Standar Biaya Masukan (SBM) / INKINDO.")
    
    add_screenshot(doc, os.path.join(img_dir, "05-01-budget-calculator.png"), "Budget Calculator dengan Banner Target Envelope Proposal")

    doc.add_paragraph("Mekanisme Alur Kerja Budget:\n1. Materialisasi Awal: GrantWriter merancang item scaffold anggaran dengan harga satuan Rp 0 (Unpriced State).\n2. Display Envelope: Banner bagian atas menampilkan 'Target Budget Proposal' (misal: Rp 450.000.000) dan status '⏳ Pending SBM Pricing'.\n3. Pengisian Harga Satuan: Pengguna mengisi Kuantitas, Satuan, dan Harga Satuan (Unit Price IDR) atau mengunduh referensi SBM Assistant.\n4. Kalkulasi Otomatis: Sistem menghitung Total per Kategori dan Persentase Coverage terhadap Target Proposal.")

    # 5.2 Realisasi Anggaran
    doc.add_heading("5.2 Realisasi Anggaran & Variance Tracker", level=2)
    doc.add_paragraph("Modul pelacakan pengeluaran aktual (Actual Expenditure) dibandingkan dengan anggaran yang disetujui (Approved Budget) untuk mencegah overbudget.")
    
    add_screenshot(doc, os.path.join(img_dir, "05-02-budget-realization.png"), "Tampilan Pelacakan Realisasi Anggaran vs Variance Biaya")

    # 5.3 MEAL Planner & Record Achievement
    doc.add_heading("5.3 MEAL Planner (Monitoring, Evaluation, Accountability, Learning)", level=2)
    doc.add_paragraph("MEAL Planner mengelola rencana pemantauan indikator, instrumen pengumpulan data lapangan, akuntabilitas publik, dan pembelajaran program.")
    
    add_screenshot(doc, os.path.join(img_dir, "06-01-meal-planner.png"), "MEAL Planner Framework & Matriks Pemantauan Indikator")
    add_screenshot(doc, os.path.join(img_dir, "06-02-meal-record-achievement.png"), "Modal Pencatatan Capaian Realisasi Indikator MEAL di Lapangan")

    doc.add_paragraph("Cara Mencatat Capaian MEAL:\n1. Pilih indikator target pada MEAL Planner.\n2. Klik tombol 'Catat Realisasi'.\n3. Isikan Angka Capaian Terbaru, Tanggal Pengambilan Data, Lokasi, dan Unggah Bukti Verifikasi (Foto/Daftar Hadir/Laporan).\n4. Sistem akan memperbarui persentase progres capaian fisik secara langsung.")

    doc.add_page_break()

    # ==========================================
    # MODUL 6: PENGUKURAN DAMPAK SROI & E-ROI
    # ==========================================
    h1 = doc.add_heading("MODUL 6: PENGUKURAN DAMPAK SOSIAL & LINGKUNGAN (SROI & E-ROI)", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)

    # 6.1 SROI Wizard & Ratio Calculator
    doc.add_heading("6.1 SROI Wizard & Kalkulator Rasio Dampak Sosial", level=2)
    doc.add_paragraph("Social Return on Investment (SROI) mengkuantifikasi nilai moneter dari dampak sosial yang dihasilkan program dibandingkan dengan investasi biaya yang dikeluarkan.")
    
    add_screenshot(doc, os.path.join(img_dir, "07-01-sroi-wizard.png"), "SROI Wizard untuk Pemetaan Stakeholder & Financial Proxies")
    add_screenshot(doc, os.path.join(img_dir, "07-02-sroi-matrix-ratio.png"), "Kalkulator Rasio SROI dan Matriks Nilai Dampak Net Present Value")

    doc.add_paragraph("Langkah Analisis SROI:\n1. Identifikasi Stakeholder Utama (misal: Kader Posyandu, Orang Tua Balita, Puskesmas).\n2. Tentukan Intended Outcome dan Financial Proxy (Nila Moneter dari perubahan, misal: Penghematan Biaya Berobat Balita Sakit).\n3. Masukkan Faktor Penyesuaian Risiko:\n   - Deadweight (% perubahan yang tetap terjadi tanpa program).\n   - Attribution (% kontribusi pihak lain).\n   - Displacement (% pemindahan masalah ke tempat lain).\n   - Drop-off (% penurunan dampak dari tahun ke tahun).\n4. Dapatkan Hasil Rasio SROI (Contoh: 1 : 3.85, artinya setiap Rp 1.000 investasi menghasilkan nilai manfaat sosial sebesar Rp 3.850).")

    # 6.2 E-ROI Carbon Tracker
    doc.add_heading("6.2 E-ROI Carbon & Environmental Impact Tracker", level=2)
    doc.add_paragraph("Kalkulator Environmental Return on Investment untuk mengukur jejak emisi karbon yang dihasilkan operasional program serta upaya mitigasi sekuestrasi karbon.")
    
    add_screenshot(doc, os.path.join(img_dir, "08-01-eroi-carbon-tracker.png"), "E-ROI Carbon Tracker & Pengukuran Emisi Karbon Program")

    # 6.3 Beneficiary Registry
    doc.add_heading("6.3 Beneficiary Registry (Database Penerima Manfaat)", level=2)
    doc.add_paragraph("Database terpusat terdekristal untuk mengelola data individu dan kelompok penerima manfaat yang menerima intervensi program.")
    
    add_screenshot(doc, os.path.join(img_dir, "09-01-beneficiary-registry.png"), "Beneficiary Registry & Registrasi Penerima Manfaat Lapangan")

    doc.add_page_break()

    # ==========================================
    # MODUL 7: PELAPORAN EXECUTIVE & MANAJEMEN TIM
    # ==========================================
    h1 = doc.add_heading("MODUL 7: PELAPORAN EXECUTIVE & MANAJEMEN TIM", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)

    # 7.1 Impact Library
    doc.add_heading("7.1 Impact Library (Galeri & Aset Cerita Dampak)", level=2)
    doc.add_paragraph("Perpustakaan digital tempat menyimpan studi kasus, testimonial, dokumentasi foto/video, dan narasi keberhasilan program yang siap pakai untuk materi komunikasi donor.")
    
    add_screenshot(doc, os.path.join(img_dir, "09-02-impact-library.png"), "Impact Library & Perpustakaan Digital Cerita Dampak")

    # 7.2 Campaign Builder
    doc.add_heading("7.2 Campaign Builder / Impactory Ads", level=2)
    doc.add_paragraph("Pembuat materi kampanye penggalangan dana publik dan publikasi media sosial yang dilengkapi AI Copywriter khusus pesan kemanusiaan.")
    
    add_screenshot(doc, os.path.join(img_dir, "09-03-campaign-builder.png"), "Campaign Builder & Generator Materi Kampanye Digital")

    # 7.3 Impact Dashboard
    doc.add_heading("7.3 Executive Impact Dashboard (3-Lens Health Rollup)", level=2)
    doc.add_paragraph("Dashboard agregat tingkat eksekutif yang mengkonsolidasikan 3 Lensa Utama Kesehatan Program: Progress Fisik (WBS), Progress Keuangan (Budget), dan Capaian Hasil (MEAL).")
    
    add_screenshot(doc, os.path.join(img_dir, "09-04-impact-dashboard.png"), "Executive Impact Dashboard dengan Rollup 3 Lensa Kesehatan Program")

    # 7.4 Monthly Operating Review & Monthly Report
    doc.add_heading("7.4 Monthly Operating Review & Monthly Impact Report", level=2)
    doc.add_paragraph("Fasilitas ritme manajemen bulanan untuk mengevaluasi kinerja operasional serta generator Laporan Dampak Bulanan otomatis siap cetak.")
    
    add_screenshot(doc, os.path.join(img_dir, "09-05-monthly-operating-review.png"), "Monthly Operating Review untuk Evaluasi Rhythm Manajemen Bulanan")
    add_screenshot(doc, os.path.join(img_dir, "09-06-monthly-report.png"), "Generator Laporan Dampak Bulanan Otomatis Siap Kirim Donor")

    # 7.5 Settings & Team Management
    doc.add_heading("7.5 Pengaturan Organisasi & Manajemen Anggota Tim", level=2)
    doc.add_paragraph("Menu konfigurasi akun organisasi, pengelolaan peran pengguna (Admin, Program Manager, Finance, Auditor), serta pengaturan integrasi API.")
    
    add_screenshot(doc, os.path.join(img_dir, "01-04-settings-team.png"), "Pengaturan Profil Organisasi & Manajemen Anggota Tim")

    doc.add_paragraph("Prosedur Mengundang Anggota Tim Baru:\n1. Buka menu Pengaturan (Settings) > Tim & Peran.\n2. Klik tombol '+ Undang Anggota'.\n3. Masukkan Email calon anggota dan pilih Peran (Role):\n   - Owner / Admin: Akses penuh ke seluruh fitur dan keuangan.\n   - Program Officer: Akses membuat proposal, LFA, WBS, dan MEAL.\n   - Finance Officer: Akses ke Budget Calculator dan Pelaporan Keuangan.\n   - Viewer / Auditor: Akses baca saja untuk kebutuhan evaluasi independen.\n4. Anggota yang diundang akan menerima email konfirmasi untuk bergabung.")

    add_callout(doc, "Selalu perbarui hak akses anggota tim yang sudah tidak aktif untuk menjaga keamanan data penerima manfaat dan dokumen proposal rahasia organisasi Anda.")

    # --- GLOSARIUM & PENUTUP ---
    doc.add_page_break()
    h1 = doc.add_heading("GLOSARIUM ISTILAH & SUPORT TEKNIS", level=1)
    h1.style.font.color.rgb = RGBColor(15, 56, 44)

    glosarium = [
        ("NGO Growth OS", "Sistem operasi terpadu untuk mengakselerasi tata kelola, pendanaan, dan dampak organisasi nirlaba."),
        ("LFA (Logical Framework Approach)", "Metodologi perencanaan program yang menyusun hubungan logis antara tujuan, hasil, aktivitas, dan asumsi risiko."),
        ("WBS (Work Breakdown Structure)", "Dekomposisi operasional bertingkat dari aktivitas program menjadi tugas-tugas kerja konkret."),
        ("MEAL", "Monitoring, Evaluation, Accountability, and Learning - sistem pemantauan dan akuntabilitas program."),
        ("SROI (Social Return on Investment)", "Metode pengukuran nilai dampak sosial dan ekonomi relatif terhadap investasi biaya."),
        ("E-ROI", "Environmental Return on Investment - pengukuran dampak lingkungan dan jejak emisi karbon."),
        ("Budget Scaffold", "Struktur draf rincian anggaran biaya yang terhubung otomatis dengan aktivitas WBS."),
        ("SBM", "Standar Biaya Masukan - acuan standar tarif biaya yang ditetapkan pemerintah/donor.")
    ]

    table_glo = doc.add_table(rows=len(glosarium)+1, cols=2)
    table_glo.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table_glo.rows[0]
    set_cell_background(hdr.cells[0], "0F382C")
    set_cell_background(hdr.cells[1], "0F382C")
    
    p_h1 = hdr.cells[0].paragraphs[0].add_run("Istilah / Singkatan")
    p_h1.bold = True
    p_h1.font.color.rgb = RGBColor(255, 255, 255)
    
    p_h2 = hdr.cells[1].paragraphs[0].add_run("Definisi & Penjelasan")
    p_h2.bold = True
    p_h2.font.color.rgb = RGBColor(255, 255, 255)

    for idx, (k, v) in enumerate(glosarium):
        row = table_glo.rows[idx+1]
        c1, c2 = row.cells[0], row.cells[1]
        c1.width = Inches(2.2)
        c2.width = Inches(3.8)
        bg = "F0F7F4" if idx % 2 == 0 else "FFFFFF"
        set_cell_background(c1, bg)
        set_cell_background(c2, bg)
        
        p1 = c1.paragraphs[0].add_run(k)
        p1.bold = True
        p1.font.size = Pt(9.5)
        
        p2 = c2.paragraphs[0].add_run(v)
        p2.font.size = Pt(9.5)

    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(30)
    p_end.add_run("Dokumen Manual Book ini disusun secara otomatis dan diverifikasi penuh oleh Tim Pengembangan Impactory.id. Untuk bantuan teknis atau pertanyaan lebih lanjut, silakan hubungi layanan bantuan kami melalui email: ").font.size = Pt(10)
    r_supp = p_end.add_run("support@impactory.id")
    r_supp.bold = True

    # Save output DOCX
    output_filename = "Manual_Book_Impactory_A_sampai_Z.docx"
    doc.save(output_filename)
    print(f"Berhasil membuat dokumen DOCX: {output_filename}")

if __name__ == "__main__":
    build_manual_book()
