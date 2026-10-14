# Mulai di sini — Kanji Bertahap

**Kanji Bertahap** adalah web game untuk belajar kanji dan kotoba tingkat N5 (kemudian N4), bagi mahasiswa
semester 1 Pendidikan Bahasa Jepang yang memakai みんなの日本語初級I. Produk ini dikembangkan untuk mata kuliah
教材開発, akan divalidasi ahli, direvisi dua putaran, dipamerkan, dan menjadi bahan skripsi. Pemain memilih karakter
lalu memilih **dunia** (Dunia 1 = 初級I, Dunia 2 = 初級II) dan menjelajahi **peta kota**-nya: setiap bab Minna
adalah satu lokasi. Di setiap lokasi ada beberapa **misi** (di spreadsheet dan data tetap disebut quest);
satu misi mengajarkan satu kotoba lewat percakapan pengantar, lalu melatih bentuk kanji, cara baca, kotoba dalam
percakapan uji, dan menulis kalimat sendiri. Setiap bab ditutup 復習 (ulangan). Jawaban dapat direkam untuk
penelitian, hanya jika peserta menyetujuinya.
**Situs:** <https://kanjikucing.netlify.app/>, terbit otomatis dari cabang `main` di GitHub.

**Status saat ini: aplikasi sedang dikembangkan lagi, dalam enam tahap** (DECISIONS D-116), masing-masing diakhiri
titik berhenti untuk ditinjau:

| Tahap | Isi | Status |
|---|---|---|
| 1 | Deploy otomatis ke Netlify, `buildId` di log | ✓ Selesai |
| 2 | Dunia di atas wilayah, peta per dunia, "Misi", warna dominan biru di peta | ✓ Selesai |
| 3 | Kucing: satu kucing per misi tuntas, koleksi kucing | ✓ Selesai; templat untuk tim aset di `templat/` |
| 4 | Hadiah diskon kartu fisik (tidak ada di mode penelitian) | ✓ Selesai; tonggak dan teks hadiah menunggu tim |
| 5 | Adegan cerita berdubbing (pembuka dan penutup dunia) | Menunggu tinjauan; prolog Dunia 1 memakai 9 halaman tim (D-125); naskah, transkrip, dan suara menunggu tim |
| 6 | Pemolesan antarmuka dengan arah visual baru (lihat [Rencana tahap 6](#rencana-tahap-6-pemolesan-antarmuka)) | Belum |

Di samping itu, materi dan aset dari tim masih ditunggu. Materi bab 1–5 dari dokumen tim sudah diimpor ke format
spreadsheet, tetapi masih menunggu nama tokoh, terjemahan, arti, dan seluruh percakapan uji
(lihat [`BLOCKERS.md`](BLOCKERS.md)). Versi lama berbasis level disimpan di tag git `v1-akhir`.

> ⚠ **Materi masih berstatus `draft-0`.** Artinya nomor bab, contoh kalimat, dan pengecoh belum diperiksa terhadap
> buku. Selama status ini belum dinaikkan, halaman pratinjau materi bertanda **DRAF** dan **tidak boleh dikirim ke
> validator ahli**. Selain itu, teks layar persetujuan peserta masih sementara, sehingga aplikasi **tidak mengirim
> satu pun data jawaban** ke server. Keduanya disengaja, sampai daftar periksa di README selesai.

## Rencana tahap 6: pemolesan antarmuka

Belum dimulai. Arah ini ditetapkan 2026-10-14 dan menggantikan "warna biru di semua layar" sebagai satu-satunya arah.

**Kosakata visual game kasual Jepang yang boleh dipakai** (referensi tim di `sumber/referensi/`, tidak masuk repo):
langit gradasi lembut; panel kertas buku bergaris kotak dengan lubang spiral; kepala panel berbentuk pita; tombol pil
mengilap; ikon stiker bulat berbingkai putih; bayangan lembut, sudut membulat, sentuhan maskot kucing; ilustrasi latar dari
aset tim. **Tetap tidak diambil dari referensi:** logo, lencana bertelinga kucing, ikon barang, ilustrasi, dan komposisi
persisnya.

**Penyesuaian:**
- **Tombol utama: pil biru dan pil kuning bertulisan tinta** di atas panel kertas putih. Isian muda saja tidak cukup
  berbeda dari kertas putih (biru `#BAE1FF` 1,37 : 1, kuning `#FFE27A` 1,28 : 1), jadi usulan tepi tombol tanpa garis tinta
  tebal: **tepi 2 piksel dengan warna tua sewarna** (biru `#2F78C4`, 4,56 : 1 terhadap putih; kuning `#A86B00`, 4,40 : 1)
  ditambah **bibir bawah 3–4 piksel** dengan warna yang sama, yang sekaligus memberi kesan tombol game mengilap. Kilau
  berupa gradasi putih di setengah atas isian. Tulisan tinta `#403c3c` di isian: 7,93 : 1 (biru) dan 8,51 : 1 (kuning).
  Angka akhirnya diperiksa uji kontras.
- **Ornamen boleh gambar dari tim**, tetapi teks di atasnya tetap teks sungguhan (D-104).
- **Di 1024 piksel ke atas: dua kolom**, peta di satu sisi dan panel wilayah di sisi lain; di ponsel tetap satu kolom.
- Semua layar lolos uji kontras dan uji semua layar (T-20, T-21).

**Cara kerja tahap 6:** sebelum membangun, usulan per layar dengan pratinjau ponsel dan laptop berdampingan dengan
referensinya, untuk disetujui; baru kemudian dikerjakan.

**Peta dari tim** (temuan 2026-10-14; berkasnya di `sumber/map/`, rincian di BLOCKERS butir 6):
- Satu peta Jepang utuh, **1536 × 2048, rasio 3 : 4 sama dengan potongan 1080 × 1440**, sehingga bisa dipakai sebagai satu
  potongan tegak. Mentahnya 348–423 KB; diekspor 1080 × 1440 menjadi ±275 KB sebagai PNG (melebihi batas 150 KB) atau
  ±75 KB sebagai JPEG kualitas 70, jadi format potongan peta perlu diputuskan di tahap ini.
- **Ada versi terang dan gelap** (terbuka dan terkunci) dari gambar tim, dengan garis pantai yang identik di keenam
  berkas. Keadaan terkunci memakai versi gelap tim, **bukan penggelapan oleh kode**.
- **Panduan sambungan tidak berlaku**: tidak ada potongan yang disambung, semuanya satu kanvas.
- **Tiga bagian, materi lima bab:** bab 1–3 di peta tim, **bab 4–5 tetap di potongan placeholder**; materi tidak diubah.
  Usulan lokasi pin (persen gambar, titik tengah daratan setiap bagian): barat x 34, y 75; Honshu tengah–timur x 67,
  y 55; Hokkaido x 74, y 21. Urutan bab ke bagian belum ditentukan tim.
- Berkas 33 % dan 66 % menyalakan bagian secara berurutan (barat, lalu Honshu, lalu Hokkaido). Jika wilayah boleh
  dituntaskan tidak berurutan, perlu satu lapisan terang per bagian (diekspor dari berkas induk yang sama, tanpa
  menggambar ulang).

Semua rincian ada di [`README.md`](README.md). Bagian yang perlu Anda baca bergantung pada peran Anda.

## Saya penulis materi

1. Baca README: [Alur kerja tim konten](README.md#alur-kerja-tim-konten), lalu
   [Kolom spreadsheet](README.md#kolom-spreadsheet) (lima tab wajib, ditambah tab opsional `hadiah`, `cerita`, dan `naskah`), [Sintaks furigana](README.md#sintaks-furigana), dan
   [Aturan `highlight` dan `blank`](README.md#aturan-highlight-dan-blank).
2. Sebelum menulis percakapan, **wajib** baca [Menulis percakapan](README.md#menulis-percakapan),
   [Menulis pengecoh](README.md#menulis-pengecoh), dan
   [Menulis kalimat uji yang tidak ambigu](README.md#menulis-kalimat-uji-yang-tidak-ambigu). Pengecoh yang
   ternyata juga benar adalah kesalahan yang paling sering terjadi di proyek ini. Percakapan ditulis tim
   sendiri dan tidak boleh disalin dari 会話 buku Minna.
3. Mulai dari contoh bentuk kolom di `tools/templates/` (lima file CSV, satu per tab; bisa di-*import* ke Google
   Sheets). Percakapan di template masih sementara dan bukan contoh percakapan yang baik.
4. Periksa pekerjaan Anda sendiri dengan **pemeriksa materi** di browser:
   `https://kanjikucing.netlify.app/tools/convert.html`. Tidak perlu memasang apa pun.
5. Setiap nomor bab dan jumlah guratan yang Anda periksa dicentang di
   [Yang harus diverifikasi terhadap buku](README.md#yang-harus-diverifikasi-terhadap-buku).

## Saya penulis naskah atau pengisi suara adegan cerita

1. Penulis naskah: baca README [Tab `cerita` dan `naskah`](README.md#tab-cerita-dan-naskah-opsional-berdua) dan
   [Menulis naskah adegan cerita](README.md#menulis-naskah-adegan-cerita): satu baris per ketukan, subtitle paling
   banyak 120 karakter, baris pemain tanpa suara, dan tidak mendahului pelajaran (D-79). Halaman berpanel ditulis
   satu panel naskah per kotak (`panel_box`), dan setiap teks yang tergambar ditranskripsi di `panel_text` (D-125).
   Mulai dari `tools/templates/cerita.csv` dan `naskah.csv`.
2. Pengisi suara dan ilustrator panel: baca [`ASSETS.md`, bagian Adegan cerita](ASSETS.md#adegan-cerita-assetscerita-dan-assetssuara):
   format MP3 dan PNG, halaman mendatar 4 : 3 yang boleh berisi beberapa panel, batas ukuran, dan cara menyerahkan berkas.

## Saya pembuat aset (menggambar peta, ikon, karakter, kucing)

1. Baca [`ASSETS.md`](ASSETS.md): daftar setiap gambar yang dibutuhkan, dengan nama berkas persis, ukuran,
   format, dan batas ukuran berkas. Peta digambar sebagai **potongan tegak 1080 × 1440 yang disambung dari atas ke
   bawah**; baca bagian "Sambungan antarpotongan" sebelum mulai.
2. Mengganti gambar = **menimpa berkas dengan nama yang sama**. Tidak perlu menyentuh kode atau JSON.
3. Di aplikasi, gambar yang belum diganti tampil sebagai kotak bertuliskan nama berkas dan ukurannya (potongan peta
   juga menyebut lokasi di dalamnya dan potongan yang harus disambungnya).
   Periksa hasilnya di halaman **Pemeriksaan konten dan aset** (alamatnya di bagian
   [Alamat halaman untuk tim](#alamat-halaman-untuk-tim-tidak-ditautkan-dari-aplikasi)).
4. Jangan menaruh kanji atau kotoba yang diajarkan di dalam gambar: peta dan menu tampil sebelum quest dimainkan.
5. **Kucing** digambar sebagai lapisan (tubuh, corak, aksesori), bukan kucing utuh. Mulai dari templat di folder
   `templat/` (SVG untuk Inkscape, Illustrator, Affinity; PNG untuk Procreate, ibisPaint, Krita) dan baca
   [`ASSETS.md`, bagian Kucing](ASSETS.md#kucing-assetskucing-dan-datalayersjson): garis dasar, titik tengah, tebal
   garis, aturan tiap lapisan, dan cara menyerahkan berkasnya.

## Saya yang menjalankan aplikasi (pengelola, koordinator data, penjaga stan)

- **Menaruh aplikasi di internet:** [Menaruh aplikasi di Netlify](README.md#menaruh-aplikasi-di-netlify).
- **Mengumpulkan data jawaban:** [Pengiriman log ke Google Apps Script](README.md#pengiriman-log-ke-google-apps-script)
  dan [Layar persetujuan peserta](README.md#layar-persetujuan-peserta).
- **Tiga mode sesi:** umum (bawaan), pameran (tidak merekam apa pun, papan peringkat), dan penelitian (lewat tautan
  khusus, persetujuan dan kode peserta wajib). Lihat [Mode sesi](README.md#mode-sesi). Data penelitian dipisahkan
  dengan kolom `sessionMode` = `research` di log.
- **Sebelum validasi, pameran, dan uji coba:** [Pengujian yang wajib dijalankan tim](README.md#pengujian-yang-wajib-dijalankan-tim),
  lalu [Daftar periksa sebelum validasi ahli](README.md#daftar-periksa-sebelum-validasi-ahli),
  [Daftar periksa sebelum pameran](README.md#daftar-periksa-sebelum-pameran), dan
  [Daftar periksa sebelum uji coba penelitian](README.md#daftar-periksa-sebelum-uji-coba-penelitian).
- **Di stan pameran:** cetak [Prosedur pameran](README.md#prosedur-pameran-untuk-penjaga-stan).
- **Sesi penelitian:** [Prosedur uji coba penelitian](README.md#prosedur-uji-coba-penelitian-untuk-peneliti).
- **Peneliti yang memegang spreadsheet:**
  [menghapus data peserta yang menarik persetujuan](README.md#untuk-peneliti-menghapus-data-peserta-yang-menarik-persetujuan).

## Saya validator ahli (atau yang mengirim tautan ke validator)

Validator diberi dua tautan:

- **Daftar materi untuk dinilai dan dicetak:** `https://kanjikucing.netlify.app/#/preview/all`
  (per bab, per quest: kanji, kotoba, percakapan dengan ilustrasinya, dan kotak catatan validator)
- **Aplikasi untuk dicoba dimainkan:** `https://kanjikucing.netlify.app/`

Kirim tautan **hanya setelah** [Daftar periksa sebelum validasi ahli](README.md#daftar-periksa-sebelum-validasi-ahli)
selesai. Jika halaman pratinjau masih bertanda **DRAF**, jangan dikirim.

## Alamat halaman untuk tim (tidak ditautkan dari aplikasi)

Halaman berikut memuat seluruh materi, jadi **sengaja tidak ditautkan** dari dalam aplikasi supaya peserta tidak
membukanya tanpa sengaja. Berkas ini tidak ikut terbit di Netlify, tetapi **repo GitHub-nya publik**, jadi daftar di
bawah juga bisa dibaca siapa pun di GitHub. **Alamat-alamat ini tidak rahasia** dan tidak pernah dimaksudkan rahasia
(DECISIONS D-86, D-119).

| Halaman | Alamat |
|---|---|
| Pemeriksaan konten dan aset | `https://kanjikucing.netlify.app/#/content-check` |
| Pratinjau semua materi (untuk validator) | `https://kanjikucing.netlify.app/#/preview/all` |
| Pratinjau satu bab | `https://kanjikucing.netlify.app/#/preview/B03` (ganti nomor babnya) |
| Pemeriksa dan konverter materi (CSV) | `https://kanjikucing.netlify.app/tools/convert.html` |
| **Tautan penelitian** (bagikan hanya kepada peserta) | `https://kanjikucing.netlify.app/#/penelitian` |

Tidak menautkan halaman-halaman ini hanya mencegah peserta **tidak sengaja** membukanya, **bukan** mencegah orang yang
sengaja mencari: situs statis tidak bisa menyembunyikan apa pun, dan `data/content.json` bisa dibuka langsung oleh
siapa saja (DECISIONS D-86). Jadi jangan pernah menaruh sesuatu yang memang rahasia di situs maupun di repo.

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

Salinan cadangan proyek ini disimpan di GitHub, di repo `inmaliik/kanji-bertahap`. **Repo ini publik dengan sengaja**:
siapa pun bisa membacanya, tetapi isinya tetap milik «NAMA-TIM» dan tidak boleh dipakai ulang tanpa izin (berkas
[`NOTICE`](NOTICE), README bagian "Hak cipta"). Setiap selesai sesi kerja, cukup minta ke Claude:

> **Cadangkan pekerjaan hari ini ke GitHub: jalankan uji, commit perubahan, lalu kirim semua cabang dan tag.**

Karena repo publik, pelindung yang sebenarnya adalah **isinya**. Sebelum setiap push, Claude memastikan:

1. **Seluruh uji otomatis lulus.** Tidak ada push dengan uji yang gagal.
2. **Tidak ada yang tidak boleh terbit di repo:** `sumber/` (materi turunan buku dan data mentah tim), `tmp/`, file
   log, file ekspor jawaban, dan CSV apa pun di luar `tools/templates/`. Ini dicek di semua commit yang akan dikirim,
   bukan hanya di berkas yang ada sekarang, dan uji `tests/repo.test.mjs` menjaganya juga.
3. **Uji browser** sudah dijalankan sebagai langkah terakhir sebelum commit.

Claude lalu melaporkan apa yang terkirim. `.gitignore` sudah menolak `sumber/`, `tmp/`, dan file log.

Mencadangkan ke `main` juga **menerbitkan**: situs ikut diperbarui sekitar satu menit kemudian, kecuali terbitan
sedang dikunci untuk uji coba penelitian (README, "Kunci terbitan selama uji coba penelitian").

**Riwayat yang sudah ada di GitHub tidak pernah ditulis ulang, dan tidak ada push paksa** (DECISIONS D-113).
Kesalahan diperbaiki dengan commit baru. Jika suatu saat penulisan ulang tampak perlu, Claude berhenti dan
menjelaskan alasannya dulu; tidak ada yang dijalankan sebelum Anda menyetujuinya.

## Yang sedang menghalangi

Ringkasan dari [`BLOCKERS.md`](BLOCKERS.md), yang memuat daftar lengkapnya.

1. **Materi belum lengkap.** Bab 1–5 sudah diimpor, tetapi nama tokoh masih penanda (sehingga belum bisa dimuat),
   terjemahan dan arti belum diisi, percakapan uji belum ditulis untuk satu quest pun, dan bab 6–12 belum ada.
2. **Aset belum diserahkan.** Potongan peta, ikon lokasi, ikon menu, dan ilustrasi adegan masih placeholder.
3. **Redaksi teks persetujuan peserta belum disetujui dosen pembimbing.** Sampai teks final dipasang, tidak ada
   data jawaban yang dapat terkirim, sehingga uji coba penelitian belum bisa dimulai.
