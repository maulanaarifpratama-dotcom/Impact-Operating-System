# Akses Juri Hackathon

Cara memberi juri akun berisi data contoh yang lengkap, tanpa menaruh satu pun
kredensial di repositori publik.

## Ringkasan keputusan

| Pertanyaan | Jawaban |
|---|---|
| Juri masuk sebagai apa? | `owner` dari **satu organisasi demo** khusus |
| Apakah ada admin platform? | Tidak ada, dan itu memang disengaja |
| Di mana kredensialnya disimpan? | `.env.judge` (gitignored), **tidak pernah** di-commit |
| Bagaimana juri menerimanya? | Lewat formulir submission hackathon / kanal privat |
| Datanya dari mana? | `scripts/seed-judge-demo.mjs` |

## Mengapa `owner` satu organisasi, bukan admin platform

Impactory tidak punya super-admin global. Otoritas selalu terikat pada satu
organisasi dan ditegakkan oleh Row Level Security di database, bukan oleh UI —
lihat [tenant-isolation.spec.ts](../tests/e2e/tenant-isolation.spec.ts).

Menjadikan juri `owner` sebuah organisasi demo memberi mereka **semua**
kewenangan yang layak dinilai: membuat, mengedit, menghapus, mengundang
anggota, mengelola organisasi. Yang tidak mereka dapat hanyalah data tenant
lain — dan itu bukan sesuatu yang perlu dinilai.

Kalau kita justru membuat "admin platform" demi penjurian, kita menyerahkan
seluruh data organisasi lain kepada orang luar untuk memperagakan fitur yang
sudah tercakup oleh kepemilikan organisasi. Itu menukar keamanan dengan nol
manfaat penilaian.

## Yang tidak boleh dilakukan

Repositori ini publik. Tiga hal berikut akan membocorkan akses secara permanen,
karena riwayat Git tetap menyimpannya meski file-nya dihapus kemudian:

- **Jangan** menulis email + password juri di `README.md` atau dokumen mana pun
  di dalam repo.
- **Jangan** menaruhnya sebagai nilai default di berkas e2e. Test membaca
  kredensial dari `.env.e2e` yang gitignored — pertahankan pola itu.
- **Jangan** menampilkannya di video demo atau tangkapan layar.

Kalau kredensial pernah ter-commit, memutar ulang password saja tidak cukup:
service role key yang ikut bocor harus di-rotate dari Supabase Dashboard.

## Menyiapkan akun

```bash
cp .env.judge.example .env.judge
```

Isi `.env.judge`. Untuk password, pakai yang acak:

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

Lalu jalankan seed:

```bash
node scripts/seed-judge-demo.mjs
```

Script akan menolak jalan bila password kurang dari 16 karakter atau mudah
ditebak. Script aman dijalankan berulang: fixture lama dihapus dulu, jadi
workspace juri selalu bersih.

## Yang akan dilihat juri

Seed memakai RPC `materialize_grantwriter_document` — jalur yang sama persis
dengan yang dipakai pengguna asli — sehingga datanya konsisten, bukan baris
yang ditempel manual ke sepuluh tabel.

Program contoh: **Desa Digital Kopi Garut**, digitalisasi rantai pasok kopi
bersama 300 petani muda di Jawa Barat, anggaran Rp 2,5 miliar, 24 bulan.

Rantai yang terbentuk:

1. **Grant Writer** — proposal dan matriks LFA kanonis
2. **LFA Builder** — goal, purpose, outcomes, outputs berikut indikatornya
3. **WBS** — struktur kerja bertingkat dengan dependensi dan jalur kritis
4. **Budget** — item anggaran yang tertaut ke tugas, mengacu SBM 2026
5. **MEAL** — indikator dengan baseline, target, frekuensi, dan disagregasi

SROI sengaja berhenti sebagai draf yang menunggu validasi. Di tahap desain
belum ada data lapangan, sehingga rasio SROI apa pun yang ditampilkan di sini
akan menjadi angka karangan. Yang diperlihatkan adalah modelnya dan input yang
masih dibutuhkan — itu justru poin metodologis yang layak dinilai.

## Menyerahkan kredensial ke juri

Tempatkan di kolom "catatan untuk juri" pada formulir submission, atau kirim
lewat kanal privat panitia. Sertakan:

```
URL      : https://impactory.vercel.app/login
Email    : (isi JUDGE_EMAIL Anda)
Password : (isi JUDGE_PASSWORD Anda)
Masuk    : pilih tab "Password" di halaman login
Program  : Dashboard > LFA Builder > "Desa Digital Kopi Garut (Demo Juri)"
```

## Setelah penjurian selesai

```bash
node scripts/seed-judge-demo.mjs --reset
```

Perintah itu menghapus data contoh tetapi membiarkan akunnya. Untuk menutup
akses sepenuhnya, hapus user tersebut dari Supabase Dashboard >
Authentication > Users, lalu hapus organisasi demonya.
