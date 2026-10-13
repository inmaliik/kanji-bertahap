# Mulai di sini — Kanji Bertahap

**Kanji Bertahap** adalah web game untuk belajar kanji dan kotoba tingkat N5 (kemudian N4), bagi mahasiswa
semester 1 Pendidikan Bahasa Jepang yang memakai みんなの日本語初級I. Produk ini dikembangkan untuk mata kuliah
教材開発, akan divalidasi ahli, direvisi dua putaran, dipamerkan, dan menjadi bahan skripsi. Pemain memilih karakter
lalu menjelajahi **peta kota**: setiap bab Minna (1–12) adalah satu lokasi. Di setiap lokasi ada beberapa **quest**;
satu quest mengajarkan satu kotoba lewat percakapan pengantar, lalu melatih bentuk kanji, cara baca, kotoba dalam
percakapan uji, dan menulis kalimat sendiri. Setiap bab ditutup 復習 (ulangan). Jawaban dapat direkam untuk
penelitian, hanya jika peserta menyetujuinya.
**Status saat ini: aplikasinya sudah selesai dibangun, tetapi materi dan asetnya belum.** Pengerjaan fitur berhenti;
pekerjaan berikutnya datang bersama materi lengkap dan aset dari tim. Materi bab 1–5 dari dokumen tim sudah diimpor
ke format spreadsheet, tetapi masih menunggu nama tokoh, terjemahan, arti, dan seluruh percakapan uji
(lihat [`BLOCKERS.md`](BLOCKERS.md)). Versi lama berbasis level disimpan di tag git `v1-akhir`.

> ⚠ **Materi masih berstatus `draft-0`.** Artinya nomor bab, contoh kalimat, dan pengecoh belum diperiksa terhadap
> buku. Selama status ini belum dinaikkan, halaman pratinjau materi bertanda **DRAF** dan **tidak boleh dikirim ke
> validator ahli**. Selain itu, teks layar persetujuan peserta masih sementara, sehingga aplikasi **tidak mengirim
> satu pun data jawaban** ke server. Keduanya disengaja, sampai daftar periksa di README selesai.

Semua rincian ada di [`README.md`](README.md). Bagian yang perlu Anda baca bergantung pada peran Anda.

## Saya penulis materi

1. Baca README: [Alur kerja tim konten](README.md#alur-kerja-tim-konten), lalu
   [Kolom spreadsheet](README.md#kolom-spreadsheet) (lima tab), [Sintaks furigana](README.md#sintaks-furigana), dan
   [Aturan `highlight` dan `blank`](README.md#aturan-highlight-dan-blank).
2. Sebelum menulis percakapan, **wajib** baca [Menulis percakapan](README.md#menulis-percakapan),
   [Menulis pengecoh](README.md#menulis-pengecoh), dan
   [Menulis kalimat uji yang tidak ambigu](README.md#menulis-kalimat-uji-yang-tidak-ambigu). Pengecoh yang
   ternyata juga benar adalah kesalahan yang paling sering terjadi di proyek ini. Percakapan ditulis tim
   sendiri dan tidak boleh disalin dari 会話 buku Minna.
3. Mulai dari contoh bentuk kolom di `tools/templates/` (lima file CSV, satu per tab; bisa di-*import* ke Google
   Sheets). Percakapan di template masih sementara dan bukan contoh percakapan yang baik.
4. Periksa pekerjaan Anda sendiri dengan **pemeriksa materi** di browser:
   `https://NAMA-SITUS.netlify.app/tools/convert.html`. Tidak perlu memasang apa pun. Minta tautan persisnya ke
   pengelola aplikasi.
5. Setiap nomor bab dan jumlah guratan yang Anda periksa dicentang di
   [Yang harus diverifikasi terhadap buku](README.md#yang-harus-diverifikasi-terhadap-buku).

## Saya pembuat aset (menggambar peta, ikon, karakter)

1. Baca [`ASSETS.md`](ASSETS.md): daftar setiap gambar yang dibutuhkan, dengan nama berkas persis, ukuran,
   format, dan batas ukuran berkas. Peta digambar sebagai **potongan tegak 1080 × 1440 yang disambung dari atas ke
   bawah**; baca bagian "Sambungan antarpotongan" sebelum mulai.
2. Mengganti gambar = **menimpa berkas dengan nama yang sama**. Tidak perlu menyentuh kode atau JSON.
3. Di aplikasi, gambar yang belum diganti tampil sebagai kotak bertuliskan nama berkas dan ukurannya (potongan peta
   juga menyebut lokasi di dalamnya dan potongan yang harus disambungnya).
   Periksa hasilnya di halaman **Pemeriksaan konten dan aset** (alamatnya di bagian
   [Alamat halaman untuk tim](#alamat-halaman-untuk-tim-tidak-ditautkan-dari-aplikasi)).
4. Jangan menaruh kanji atau kotoba yang diajarkan di dalam gambar: peta dan menu tampil sebelum quest dimainkan.

## Saya yang menjalankan aplikasi (pengelola, koordinator data, penjaga stan)

- **Menaruh aplikasi di internet:** [Menaruh aplikasi di Netlify](README.md#menaruh-aplikasi-di-netlify).
- **Mengumpulkan data jawaban:** [Pengiriman log ke Google Apps Script](README.md#pengiriman-log-ke-google-apps-script)
  dan [Layar persetujuan peserta](README.md#layar-persetujuan-peserta).
- **Sebelum validasi dan pameran:** [Pengujian yang wajib dijalankan tim](README.md#pengujian-yang-wajib-dijalankan-tim),
  lalu [Daftar periksa sebelum validasi ahli](README.md#daftar-periksa-sebelum-validasi-ahli) dan
  [Daftar periksa sebelum pameran](README.md#daftar-periksa-sebelum-pameran).
- **Di stan pameran:** cetak [Prosedur pameran](README.md#prosedur-pameran-untuk-penjaga-stan). Mode pameran (papan
  peringkat) dinyalakan di Pengaturan hanya untuk stan, tidak untuk uji coba penelitian.
- **Peneliti yang memegang spreadsheet:**
  [menghapus data peserta yang menarik persetujuan](README.md#untuk-peneliti-menghapus-data-peserta-yang-menarik-persetujuan).

## Saya validator ahli (atau yang mengirim tautan ke validator)

Validator diberi dua tautan:

- **Daftar materi untuk dinilai dan dicetak:** `https://NAMA-SITUS.netlify.app/#/preview/all`
  (per bab, per quest: kanji, kotoba, percakapan dengan ilustrasinya, dan kotak catatan validator)
- **Aplikasi untuk dicoba dimainkan:** `https://NAMA-SITUS.netlify.app/`

Kirim tautan **hanya setelah** [Daftar periksa sebelum validasi ahli](README.md#daftar-periksa-sebelum-validasi-ahli)
selesai. Jika halaman pratinjau masih bertanda **DRAF**, jangan dikirim.

## Alamat halaman untuk tim (tidak ditautkan dari aplikasi)

Halaman berikut memuat seluruh materi, jadi **sengaja tidak ditautkan** dari dalam aplikasi supaya peserta tidak
membukanya tanpa sengaja. Berkas ini tidak ikut diunggah ke Netlify, jadi alamatnya hanya tercatat di sini.

| Halaman | Alamat |
|---|---|
| Pemeriksaan konten dan aset | `https://NAMA-SITUS.netlify.app/#/content-check` |
| Pratinjau semua materi (untuk validator) | `https://NAMA-SITUS.netlify.app/#/preview/all` |
| Pratinjau satu bab | `https://NAMA-SITUS.netlify.app/#/preview/B03` (ganti nomor babnya) |
| Pemeriksa dan konverter materi (CSV) | `https://NAMA-SITUS.netlify.app/tools/convert.html` |

Ini mencegah paparan tidak sengaja, **bukan** kecurangan yang disengaja: situs statis tidak bisa menyembunyikan
apa pun, dan `data/content.json` bisa dibuka langsung oleh siapa saja yang tahu alamatnya (DECISIONS D-86).

## Saya programmer berikutnya

1. Baca [`DECISIONS.md`](DECISIONS.md): alasan di balik setiap pilihan desain. Daftar "Menunggu keputusan dosen" ada
   di awal berkas.
2. Baca [`BLOCKERS.md`](BLOCKERS.md): apa yang masih menghalangi uji coba sungguhan.
3. Di README, baca [Struktur folder](README.md#struktur-folder) dan [Uji otomatis](README.md#uji-otomatis).

Aturan yang dijaga sejak awal: tanpa framework dan tanpa build step; seluruh materi ada di `data/content.json`,
tidak ada materi bahasa Jepang di kode; teks persetujuan ada di `data/consent.json`. Jalankan
`node --test tests/*.test.mjs` sebelum setiap commit, dan periksa hasilnya di layar ponsel, bukan hanya lewat uji
otomatis.

## Mencadangkan pekerjaan

Salinan cadangan proyek ini disimpan di GitHub, di repo **privat** `inmaliik/kanji-bertahap`. Setiap selesai sesi
kerja, cukup minta ke Claude:

> **Cadangkan pekerjaan hari ini ke GitHub: jalankan uji, commit perubahan, lalu kirim semua cabang dan tag.**

Claude akan melaporkan apa yang terkirim. Folder `sumber/`, `tmp/`, dan file ekspor log tidak pernah ikut (diatur di
`.gitignore`), dan repo-nya tetap privat.

## Yang sedang menghalangi

Ringkasan dari [`BLOCKERS.md`](BLOCKERS.md), yang memuat daftar lengkapnya.

1. **Materi belum lengkap.** Bab 1–5 sudah diimpor, tetapi nama tokoh masih penanda (sehingga belum bisa dimuat),
   terjemahan dan arti belum diisi, percakapan uji belum ditulis untuk satu quest pun, dan bab 6–12 belum ada.
2. **Aset belum diserahkan.** Potongan peta, ikon lokasi, ikon menu, dan ilustrasi adegan masih placeholder.
3. **Redaksi teks persetujuan peserta belum disetujui dosen pembimbing.** Sampai teks final dipasang, tidak ada
   data jawaban yang dapat terkirim, sehingga uji coba penelitian belum bisa dimulai.
