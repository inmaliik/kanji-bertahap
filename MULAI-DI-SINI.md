# Mulai di sini — Kanji Bertahap

**Kanji Bertahap** adalah web game untuk belajar kanji dan kotoba tingkat N5 (kemudian N4), bagi mahasiswa
semester 1 Pendidikan Bahasa Jepang yang memakai みんなの日本語初級I. Produk ini dikembangkan untuk mata kuliah
教材開発, akan divalidasi ahli, direvisi dua putaran, dipamerkan, dan menjadi bahan skripsi. Setiap level melatih
satu kanji dalam lima tahap (bentuk, kun'yomi, on'yomi, kotoba dalam kalimat, menulis kalimat sendiri), dan setiap
tiga level ada level ulangan. Jawaban dapat direkam untuk penelitian, hanya jika peserta menyetujuinya.
**Status saat ini: aplikasinya sudah selesai dibangun, tetapi materinya belum.** Isinya baru tiga level contoh
(食, 飲, 気), dan materi sungguhan menunggu urutan kanji dari mata kuliah Hyouki.

> ⚠ **Materi masih berstatus `draft-0`.** Artinya nomor bab, contoh kalimat, dan pengecoh belum diperiksa terhadap
> buku. Selama status ini belum dinaikkan, halaman pratinjau materi bertanda **DRAF** dan **tidak boleh dikirim ke
> validator ahli**. Selain itu, teks layar persetujuan peserta masih sementara, sehingga aplikasi **tidak mengirim
> satu pun data jawaban** ke server. Keduanya disengaja, sampai daftar periksa di README selesai.

Semua rincian ada di [`README.md`](README.md). Bagian yang perlu Anda baca bergantung pada peran Anda.

## Saya penulis materi

1. Baca README: [Alur kerja tim konten](README.md#alur-kerja-tim-konten), lalu
   [Kolom spreadsheet](README.md#kolom-spreadsheet), [Sintaks furigana](README.md#sintaks-furigana), dan
   [Aturan `blank`](README.md#aturan-blank).
2. Sebelum menulis kalimat, **wajib** baca [Menulis pengecoh](README.md#menulis-pengecoh) dan
   [Menulis kalimat contoh yang tidak ambigu](README.md#menulis-kalimat-contoh-yang-tidak-ambigu). Pengecoh yang
   ternyata juga benar adalah kesalahan yang paling sering terjadi di proyek ini.
3. Mulai dari contoh yang benar: `tools/content-template.csv` (bisa di-*import* ke Google Sheets).
4. Periksa pekerjaan Anda sendiri dengan **pemeriksa materi** di browser:
   `https://NAMA-SITUS.netlify.app/tools/convert.html`. Tidak perlu memasang apa pun. Minta tautan persisnya ke
   pengelola aplikasi.
5. Setiap nomor bab yang Anda periksa di buku dicentang di
   [Yang harus diverifikasi terhadap buku](README.md#yang-harus-diverifikasi-terhadap-buku).

## Saya yang menjalankan aplikasi (pengelola, koordinator data, penjaga stan)

- **Menaruh aplikasi di internet:** [Menaruh aplikasi di Netlify](README.md#menaruh-aplikasi-di-netlify).
- **Mengumpulkan data jawaban:** [Pengiriman log ke Google Apps Script](README.md#pengiriman-log-ke-google-apps-script)
  dan [Layar persetujuan peserta](README.md#layar-persetujuan-peserta).
- **Sebelum validasi dan pameran:** [Pengujian yang wajib dijalankan tim](README.md#pengujian-yang-wajib-dijalankan-tim),
  lalu [Daftar periksa sebelum validasi ahli](README.md#daftar-periksa-sebelum-validasi-ahli) dan
  [Daftar periksa sebelum pameran](README.md#daftar-periksa-sebelum-pameran).
- **Di stan pameran:** cetak [Prosedur pameran](README.md#prosedur-pameran-untuk-penjaga-stan).
- **Peneliti yang memegang spreadsheet:**
  [menghapus data peserta yang menarik persetujuan](README.md#untuk-peneliti-menghapus-data-peserta-yang-menarik-persetujuan).

## Saya validator ahli (atau yang mengirim tautan ke validator)

Validator diberi dua tautan:

- **Daftar materi untuk dinilai dan dicetak:** `https://NAMA-SITUS.netlify.app/#/preview/all`
- **Aplikasi untuk dicoba dimainkan:** `https://NAMA-SITUS.netlify.app/`

Kirim tautan **hanya setelah** [Daftar periksa sebelum validasi ahli](README.md#daftar-periksa-sebelum-validasi-ahli)
selesai. Jika halaman pratinjau masih bertanda **DRAF**, jangan dikirim.

## Saya programmer berikutnya

1. Baca [`DECISIONS.md`](DECISIONS.md): alasan di balik setiap pilihan desain. Daftar "Menunggu keputusan dosen" ada
   di awal berkas.
2. Baca [`BLOCKERS.md`](BLOCKERS.md): apa yang masih menghalangi uji coba sungguhan.
3. Di README, baca [Struktur folder](README.md#struktur-folder) dan [Uji otomatis](README.md#uji-otomatis).

Aturan yang dijaga sejak awal: tanpa framework dan tanpa build step; seluruh materi ada di `data/content.json`,
tidak ada materi bahasa Jepang di kode; teks persetujuan ada di `data/consent.json`. Jalankan
`node --test tests/*.test.mjs` sebelum setiap commit, dan periksa hasilnya di layar ponsel, bukan hanya lewat uji
otomatis.

## Yang sedang menghalangi

Ringkasan dari [`BLOCKERS.md`](BLOCKERS.md), yang memuat daftar lengkapnya.

1. **Urutan kanji dari mata kuliah Hyouki belum diterima.** Urutan level mengikuti urutan itu, jadi materi
   sungguhan belum bisa mulai disusun.
2. **Materi 25–30 level belum ditulis dan diverifikasi.** Termasuk nomor bab setiap kotoba dan kalimat, serta
   minimal tiga pengecoh per kalimat yang sudah diperiksa orang lain.
3. **Redaksi teks persetujuan peserta belum disetujui dosen pembimbing.** Sampai teks final dipasang, tidak ada
   data jawaban yang dapat terkirim, sehingga uji coba penelitian belum bisa dimulai.
