# Kanji Bertahap

> **Baru pertama kali membuka proyek ini?** Baca [`MULAI-DI-SINI.md`](MULAI-DI-SINI.md) dulu.

Web game penunjang untuk belajar kanji dan kotoba N5–N4, bagi mahasiswa semester 1 yang memakai
みんなの日本語初級I. Dikembangkan untuk mata kuliah 教材開発.

- HTML + CSS + JavaScript murni (ES modules). Tanpa framework, tanpa build step, tanpa backend.
- Seluruh materi ada di `data/content.json`. Tidak ada teks materi bahasa Jepang di file JS.
- Progres pemain disimpan di `localStorage` browser.

> **Cabang `desain-peta` — versi peta dalam pengerjaan (langkah 2 dari 5 selesai: struktur data dan quest).**
> Materi tersusun sebagai wilayah, quest, dan percakapan (schemaVersion 2). Quest sudah bisa dimainkan dari
> beranda sementara: percakapan pengantar, latihan, uji konteks, Produksi, dan pemantapan. Peta, penguncian
> wilayah, dan 復習 dibangun di langkah 3. Bagian README tentang tim konten, aturan permainan, dan log sudah
> mengikuti versi peta; bagian tentang daftar level, pratinjau, dan prosedur pameran masih menjelaskan versi
> lama dan diperbarui di langkah berikutnya.
> Versi yang bisa dimainkan, dan menjadi cadangan untuk validasi ahli, ada di cabang `main`.
>
> Alasan di balik setiap keputusan desain dicatat di [`DECISIONS.md`](DECISIONS.md).

> ⚠ **Materi masih `draft-0`.** Nomor bab belum diperiksa terhadap buku. Jangan kirim data
> ber-`draft-0` ke validator ahli; lihat [Yang harus diverifikasi terhadap buku](#yang-harus-diverifikasi-terhadap-buku).

---

## Menjalankan

Aplikasi **tidak bisa** dibuka dengan klik ganda pada `index.html`, karena browser memblokir
pemuatan `data/content.json` dari disk. Jika tetap dibuka dari disk, halaman akan menampilkan
petunjuk ini.

**VS Code + Live Server**
1. Buka folder proyek di VS Code.
2. Pasang ekstensi **Live Server** (Ritwick Dey).
3. Klik kanan `index.html` → **Open with Live Server**.

**Terminal (Python)**
```bash
cd path/ke/folder-proyek
python3 -m http.server 8000     # Windows: python -m http.server 8000
```
Lalu buka <http://localhost:8000>. Tekan Ctrl+C untuk berhenti.

**Netlify** — untuk tautan yang bisa dibuka siapa pun, termasuk validator ahli. Lihat
[Menaruh aplikasi di Netlify](#menaruh-aplikasi-di-netlify).

---

## Menaruh aplikasi di Netlify

Tanpa perintah baris perintah. Hasilnya tautan seperti `https://kanji-bertahap.netlify.app` yang bisa
dibuka dari ponsel atau komputer mana pun. Nama menu di bawah mengikuti tampilan Netlify berbahasa Inggris
dan bisa sedikit berbeda.

### 1. Siapkan folder unggahan

Buat folder baru, misalnya `kanji-bertahap-situs`, lalu **salin** isi berikut dari folder proyek ke dalamnya:

| Salin | Jangan salin |
|---|---|
| `index.html` | `.git` (folder tersembunyi) |
| `css/` | `tests/` |
| `js/` | `README.md`, `MULAI-DI-SINI.md`, `DECISIONS.md`, `BLOCKERS.md` |
| `data/` | file CSV ekspor log jawaban |
| `tools/` (berisi pemeriksa materi untuk tim konten) | |

Dokumen internal tidak disalin karena semua isi folder unggahan dapat dibuka siapa pun yang tahu tautannya.

Sebelum menyalin, pastikan:
- `data/content.json` adalah versi materi yang ingin ditampilkan (periksa revisinya);
- jika pengiriman log sudah siap, `js/config.js` sudah berisi `LOG_REMOTE_ENABLED = true` dan URL Apps Script
  (lihat [Pengiriman log](#pengiriman-log-ke-google-apps-script)).

### 2. Unggah pertama kali

1. Buka <https://app.netlify.com> dan buat akun gratis (bisa dengan akun Google). Akun diperlukan supaya situs
   tidak terhapus dan bisa diperbarui.
2. Di halaman **Sites**, pilih **Add new site → Deploy manually**.
3. **Seret folder `kanji-bertahap-situs`** (foldernya, bukan isinya satu per satu) ke kotak unggah.
4. Tunggu sampai status **Published**. Netlify memberi nama acak, misalnya `https://acak-12345.netlify.app`.

### 3. Beri nama yang mudah

1. Buka situsnya → **Site configuration** → **General** → **Site details** → **Change site name**.
2. Isi nama, misalnya `kanji-bertahap`. Tautannya menjadi `https://kanji-bertahap.netlify.app`.

### 4. Periksa hasilnya

- [ ] Tautan utama membuka daftar level di ponsel.
- [ ] `https://nama-situs.netlify.app/tools/convert.html` membuka pemeriksa materi.
- [ ] ⚙ Pengaturan → **Pratinjau semua materi** menampilkan materi dengan revisi yang benar.
- [ ] Satu level bisa dimainkan sampai layar persetujuan dan soal pertama.

### 5. Memperbarui situs

Setiap kali materi atau aplikasi berubah:

1. Siapkan ulang folder unggahan (langkah 1) dengan file terbaru.
2. Buka situs di Netlify → tab **Deploys**.
3. Seret folder ke kotak **"Need to update your site? Drag and drop your site output folder here"**.
4. Tautan tetap sama. Di ponsel, muat ulang halaman untuk melihat versi baru.

Jika pembaruan ternyata salah: tab **Deploys** → pilih unggahan sebelumnya → **Publish deploy**.

### Tautan untuk validator ahli

Berikan tautan langsung ke pratinjau: `https://nama-situs.netlify.app/#/preview/all`. Sebelum mengirimnya,
jalankan [Daftar periksa sebelum validasi ahli](#daftar-periksa-sebelum-validasi-ahli). Selama revisi
materi masih `draft-…`, halaman itu bertanda DRAF dan **tidak boleh** dikirim ke validator.

Situs dapat dibuka siapa pun yang mengetahui tautannya. Jangan menaruh data jawaban peserta di folder
unggahan.

---

## Struktur folder

```
index.html                  halaman utama + pesan untuk file://
css/style.css               tampilan (mobile-first)
data/content.json           SELURUH materi pembelajaran (schemaVersion 2: wilayah, quest, percakapan, kanji, kotoba)
data/archive/               materi yang keluar dari data aktif (tidak dibaca aplikasi); lihat README di dalamnya
data/consent.json           teks layar persetujuan peserta (saat ini PLACEHOLDER)

js/main.js                  bootstrap aplikasi, routing antar layar
js/config.js                konfigurasi umum (judul, versi, lokasi content.json)
js/state.js                 progres di localStorage + SEMUA aturan permainan (ambang, kunci, ulangan, setelan furigana)
js/session.js               antrean soal satu quest: putaran belajar, produksi, pemantapan, lanjut setelah keluar
js/furigana.js              furigana mana yang tampil: setelan pemain + aturan anti-bocor
js/logger.js                pencatatan jawaban ke localStorage, konversi CSV
js/log-sender.js            pengiriman log ke Google Apps Script
js/storage.js               pembungkus localStorage yang tidak pernah error
js/tab-guard.js             peringatan jika aplikasi terbuka di tab lain
js/consent.js               memuat dan memeriksa teks persetujuan (data/consent.json)
js/content.js               memuat dan memeriksa content.json
js/model.js                 relasi wilayah ⇄ quest ⇄ percakapan dan kanji ⇄ kotoba, ID item soal
js/validate.js              aturan validasi konten (dipakai browser DAN terminal)
js/csv-content.js           konversi lima CSV spreadsheet → struktur content.json (dipakai browser DAN terminal)
js/ruby.js                  parser sintaks furigana [漢字|かんじ] dan render <ruby>
js/jp-text.js               pengenalan hiragana/katakana/kanji, pemisah notasi た(べる)
js/dom.js                   pembuat elemen HTML

js/distractors.js           penyusunan pilihan jawaban dan pengecoh
js/random.js                pengacak

js/stages/choice.js         komponen soal pilihan ganda (Bentuk, Cara baca, Uji konteks)
js/stages/conversation.js   gelembung subtitle percakapan
js/stages/intro.js          percakapan pengantar quest
js/stages/shape.js          Bentuk
js/stages/reading.js        Cara baca, dengan kartu kontras lintas wilayah
js/stages/test.js           Uji konteks (percakapan dengan bagian kosong)
js/stages/production.js     Produksi

js/screens/common.js        komponen bersama (tabel bacaan, daftar error, label)
js/screens/quest.js         layar quest: menjalankan sesi, mencatat log
js/screens/content-check.js daftar peringatan konten
js/screens/build-status.js  SEMENTARA: beranda cabang desain-peta sampai peta selesai (langkah 3)
js/screens/settings.js      pengaturan: reset, persetujuan, kode peserta, kapasitas, pengiriman, ekspor, hapus log
js/screens/consent.js       layar persetujuan perekaman

tools/convert.html          pemeriksa dan konverter CSV → content.json di browser (untuk tim konten)
tools/csv-to-json.mjs       konversi lima CSV → data/content.json dari terminal
tools/validate-content.mjs  pemeriksa konten dari terminal
tools/lib/print-issues.mjs  tampilan error/peringatan di terminal
tools/templates/            contoh CSV, satu per tab (wilayah, kanji, kotoba, quest, percakapan)
tools/apps-script-log.gs    skrip Google Apps Script penerima log (siap tempel)

tests/                      uji otomatis logika inti (lihat "Uji otomatis")
MULAI-DI-SINI.md            titik masuk: arahan per peran
DECISIONS.md                catatan keputusan desain beserta alasannya
BLOCKERS.md                 hal yang masih menghalangi uji coba sungguhan
```

---

## Alur kerja tim konten

Materi ditulis di **satu Google Sheet dengan lima tab**, bukan langsung di JSON. **Tidak perlu memasang apa pun.**

| Tab | Satu baris = | Isi |
|---|---|---|
| `wilayah` | satu bab Minna | judul wilayah, ringkasan pengantar bab, posisi pin di peta |
| `kanji` | satu kanji | arti, JLPT, jumlah guratan, bushu, bacaan |
| `kotoba` | satu kotoba | tulisan, furigana per kanji, cara baca, bab, pengecoh cara baca |
| `quest` | satu quest | kotoba yang diajarkan, kanji sasaran, percakapan pengantar dan uji |
| `percakapan` | satu baris ucapan | pembicara, kalimat, terjemahan, sorotan atau bagian kosong |

1. Buat spreadsheet dengan lima tab di atas. Nama tab bebas; yang menentukan adalah **baris judul (baris 1)**,
   yang harus persis seperti [Kolom spreadsheet](#kolom-spreadsheet). Contoh yang benar ada di
   `tools/templates/` (satu file CSV per tab; bisa di-*import* ke Google Sheets, satu file ke satu tab).
2. Unduh **kelima tab satu per satu**, dengan urutan **wilayah → kanji → kotoba → quest → percakapan**: buka
   tabnya, lalu **File → Download → Comma Separated Values (.csv)**. Google Sheets hanya mengunduh tab yang
   sedang dibuka, jadi tab yang terlewat tidak ikut. Urutan tetap memudahkan mengecek bahwa kelimanya
   sudah terunduh.
3. Buka **pemeriksa materi** di browser:
   - dari situs Netlify: `https://nama-situs.netlify.app/tools/convert.html`, atau
   - dari server lokal: `http://localhost:8000/tools/convert.html`.

   Halaman ini **tidak bisa** dibuka dengan klik ganda pada file `tools/convert.html`, karena alasan yang
   sama dengan aplikasinya (lihat [Menjalankan](#menjalankan)). File CSV tidak diunggah ke mana pun;
   pemeriksaan berjalan di browser.
4. Pilih **kelima file CSV sekaligus** (tahan Ctrl, di Mac Cmd, sambil mengklik), isi **Nama revisi**, tekan
   **Periksa**. Halaman menampilkan file mana dikenali sebagai tab apa.
   - Nama revisi dicatat di setiap baris log, supaya data sebelum dan sesudah tiap putaran revisi bisa
     dibandingkan. Tetap `draft-0` sampai semua nomor bab terverifikasi, lalu `rev-1`, `rev-2`, dan seterusnya.
   - Setiap error dan peringatan menyebut **tab dan nomor barisnya**, misalnya `Tab percakapan, baris 5`.
5. Perbaiki semua **error** di spreadsheet, unduh ulang CSV-nya, periksa lagi. Baca setiap **peringatan**.
6. Jika lolos, tekan **Unduh content.json** dan serahkan file itu ke pengelola aplikasi, yang meletakkannya di
   folder `data/` lalu mengunggah ulang aplikasi ke Netlify (lihat [Menaruh aplikasi di Netlify](#menaruh-aplikasi-di-netlify)).

Anggota tim konten sebaiknya memeriksa bagiannya sendiri dengan halaman ini sebelum menyerahkan pekerjaan.

**Alternatif untuk pengelola aplikasi (terminal, butuh Node.js 22+).** Logikanya sama persis dengan halaman
pemeriksa; keduanya memakai `js/csv-content.js` dan `js/validate.js`. Taruh kelima CSV dalam satu folder:
```bash
node tools/csv-to-json.mjs ~/Downloads/materi --revision rev-1   # menulis data/content.json jika lolos
node tools/validate-content.mjs                                 # memeriksa data/content.json
```

Pemeriksaan yang sama juga berjalan otomatis saat aplikasi dibuka. Jika ada error, aplikasi berhenti dan
menampilkan daftar error. Peringatan tidak menghentikan aplikasi; daftarnya ada di **Pemeriksaan konten**.

---

## Kolom spreadsheet

Kolom berisi **daftar** dipisah titik koma: `食;人;米;皿`. Sel yang boleh kosong ditandai *boleh kosong*.

### Tab `wilayah`

Satu baris = satu bab = satu wilayah di peta. Wilayah selalu diurutkan menurut nomor bab, apa pun urutan barisnya.

| Kolom | Isi | Contoh |
|---|---|---|
| `chapter` | Nomor bab Minna, **1–12**. Satu bab hanya boleh satu baris. | `6` |
| `title` | Nama wilayah yang tampil di peta | `Wilayah Bab 6` |
| `intro_summary` | Ringkasan bab untuk jendela pengantar: apa yang dipelajari di bab ini (bahasa Indonesia) | |
| `intro_points` | *Daftar, boleh kosong.* Poin-poin tambahan jendela pengantar | |
| `pin_x`, `pin_y` | *Boleh kosong.* Posisi pin wilayah di gambar peta, dalam **persen** lebar dan tinggi gambar (0–100; `42,5` dan `42.5` sama-sama diterima). Diisi setelah gambar peta jadi; selama kosong, pin ditaruh di posisi sementara. | `42,5` · `30` |

### Tab `kanji`

Satu baris = satu kanji. Wajib ada untuk setiap **kanji sasaran** quest. Kanji lain di dalam kotoba boleh tidak
punya baris; di index kanji itu tampil dengan bacaannya saja.

| Kolom | Isi | Contoh |
|---|---|---|
| `kanji` | Tepat satu kanji, tidak boleh ganda | `食` |
| `meaning` | Arti kanji | `makan` |
| `jlpt_level` | `N5` atau `N4` | `N5` |
| `stroke_count` | *Boleh kosong.* Jumlah guratan (画数), diperiksa di kamus. Kosong memunculkan peringatan. | `9` |
| `bushu_char` | Bushu (jawaban benar soal Bentuk) | `食` |
| `bushu_name` | Nama bushu | `shoku` |
| `bushu_meaning` | Arti bushu | `makan / makanan` |
| `bushu_variants` | *Daftar, boleh kosong.* Bentuk lain bushu yang sama | `飠` |
| `bushu_options` | *Daftar.* Pilihan soal Bentuk, termasuk jawaban benar | `食;人;米;皿` |
| `kunyomi` | *Daftar, boleh kosong.* Hiragana, okurigana dalam kurung | `た(べる);く(う)` |
| `onyomi` | *Daftar, boleh kosong.* Katakana | `ショク` |

Data urutan guratan (書き方) **belum** punya kolom: menunggu keputusan lisensi (DECISIONS D-66).

### Tab `kotoba`

Satu baris = satu kotoba. Kotoba masuk ke wilayah bab yang sama dengan kolom `chapter`-nya.

| Kolom | Isi | Contoh |
|---|---|---|
| `kotoba_id` | ID permanen: huruf latin, angka, `-`, `_`, tanpa spasi. Dirujuk dari tab quest dan dicatat di log. | `tabemasu` |
| `word` | Kotoba (bentuk ます untuk kata kerja) | `食べます` |
| `word_ruby` | Kotoba dengan furigana **per kanji** (lihat [Sintaks furigana](#sintaks-furigana)). Setiap kanji wajib diberi furigana. | `[食\|た]べます` · `[食\|しょく][堂\|どう]` |
| `reading` | Cara baca, hiragana. Harus sama dengan gabungan furigana di `word_ruby` (dicek otomatis). | `たべます` |
| `reading_type` | `kunyomi`, `onyomi`, atau `special` (jukujikun seperti 今日, atau bacaan yang tidak bisa dipisah per kanji) | `kunyomi` |
| `pos` | `verb`, `noun`, `i-adj`, `na-adj`, `adverb`, `other` | `verb` |
| `meaning` | Arti kotoba | `makan` |
| `chapter` | Bab Minna tempat kotoba ini diajarkan, **1–12**. Di luar itu adalah error. | `6` |
| `note` | *Boleh kosong.* Catatan untuk umpan balik, misalnya perubahan bunyi | |
| `reading_distractors` | *Daftar, boleh kosong.* Pengecoh cara baca **sejenis** buatan tim | `くべます;のべます;しらべます` |
| `reading_distractors_cross` | *Daftar, boleh kosong.* Pengecoh cara baca **lintas jenis** (lihat [Menulis pengecoh](#menulis-pengecoh)) | `しょくべます` |

Kotoba yang bukan quest tetap boleh ditulis: kotoba itu tampil di index sebagai kotoba terkait kanjinya.

### Tab `quest`

Satu baris = satu quest = satu kotoba yang diajarkan. **Urutan baris = urutan quest di dalam wilayahnya.**
Quest di dalam satu wilayah boleh dikerjakan dalam urutan bebas.

| Kolom | Isi | Contoh |
|---|---|---|
| `quest_id` | ID permanen, unik. Tidak boleh diawali `REV-` (dicadangkan untuk ulangan wilayah). | `Q-tabemasu` |
| `chapter` | Bab wilayah quest ini. Harus sama dengan bab kotobanya. | `6` |
| `kotoba_id` | Kotoba yang diajarkan (dari tab kotoba). Satu kotoba hanya boleh menjadi satu quest. | `tabemasu` |
| `target_kanji` | **1–2 kanji** yang dilatih (soal Bentuk dan bacaan). Untuk 会社員, misalnya, tim memilih kanji mana yang menjadi sasaran. | `食` · `会;社` |
| `intro_conversation` | ID percakapan pengantar (tepat satu) | `C-tabemasu-pengantar` |
| `test_conversations` | *Daftar.* ID percakapan uji, minimal satu | `C-tabemasu-uji-1` |
| `production_prompt` | Instruksi menulis kalimat sendiri di akhir quest | `Buat satu kalimat memakai kotoba ini.` |

### Tab `percakapan`

Satu baris = **satu ucapan**. Semua baris dengan `conversation_id` yang sama membentuk satu percakapan.
Kolom `sentence_chapter`, `scene`, dan `placeholder` cukup diisi di baris pertama percakapan; jika diisi di
beberapa baris, isinya harus sama.

| Kolom | Isi | Contoh |
|---|---|---|
| `conversation_id` | ID percakapan, unik di seluruh materi | `C-tabemasu-uji-1` |
| `line_no` | Nomor urut ucapan di dalam percakapan (1, 2, 3, …). Urutan tampil mengikuti nomor ini, bukan urutan baris. | `1` |
| `speaker` | `pemain` untuk karakter pemain, atau ID tokoh (huruf kecil latin, misalnya `hana`) | `pemain` |
| `ja` | Kalimat dengan sintaks furigana | `パンを[食\|た]べます。` |
| `translation` | Terjemahan bahasa Indonesia | `Saya makan roti.` |
| `highlight` | *Hanya percakapan pengantar, boleh kosong.* Bagian kalimat yang disorot (kotoba quest, dalam bentuk yang muncul di kalimat) | `食べます` |
| `blank` | *Hanya percakapan uji.* Bagian yang dikosongkan; tepat satu baris per percakapan uji | `食べます` |
| `distractors` | *Hanya baris ber-`blank`, wajib minimal 3.* Pengecoh buatan tim | `飲みます;読みます;書きます` |
| `sentence_chapter` | **Wajib.** Bab Minna tertinggi yang dibutuhkan **seluruh** percakapan. `-` jika memakai kata atau pola di luar buku. | `6` |
| `scene` | Keterangan situasi dalam bahasa Indonesia, tampil di atas percakapan | `Di kantin kampus` |
| `placeholder` | *Boleh kosong.* `ya` hanya untuk percakapan sementara buatan pengembang | |

> Template `tools/templates/percakapan.csv` masih berisi **empat percakapan sementara** satu baris, disusun dari
> contoh kalimat lama supaya aplikasi bisa diuji. Template itu contoh **bentuk kolom**, bukan contoh percakapan
> yang baik. Bentuk percakapan yang dimaksud dijelaskan di [Menulis percakapan](#menulis-percakapan).
>
> **Mengganti contoh ini.** Tim menulis satu percakapan sungguhan, pengantar dan uji untuk 食べます, lalu
> menyerahkan kelima CSV kepada pengelola aplikasi. Pengelola menjalankan pemeriksa materi terhadapnya dan
> melaporkan hasilnya ke tim **tanpa memperbaiki isinya sendiri**; perbaikan dikerjakan penulis. Setelah lolos,
> percakapan itu menggantikan percakapan sementara 食べます di `tools/templates/`, di `data/content.json`, dan
> sebagai contoh di bagian [Menulis percakapan](#menulis-percakapan).

---

## Sintaks furigana

Tulis kanji dan furigananya di dalam kurung siku, dipisah garis tegak:

```
[毎朝|まいあさ]パンを[食|た]べます。
```

- Gunakan `[`, `|`, `]` **setengah lebar**. Matikan IME Jepang saat mengetik tanda ini;
  versi lebar penuh `［ ｜ ］` ditolak dengan pesan error.
- Okurigana (べます) ditulis **di luar** kurung.
- Di kalimat percakapan, kanji yang tidak diberi kurung memunculkan peringatan "kanji tanpa furigana".
- Kesalahan sintaks ditunjukkan dengan tanda ⟪ ⟫ pada karakter yang bermasalah, misalnya:
  `Ada "[" yang tidak ditutup dengan "]". Lokasi: パン⟪[⟫毎朝|まいあさ`.

**Di kolom `word_ruby` (tab kotoba), furigana ditulis per kanji**: `[食|しょく][堂|どう]`, bukan
`[食堂|しょくどう]`. Index dan kartu kontras kun'yomi–on'yomi mengambil bacaan setiap kanji dari sini. Setiap
kanji di `word_ruby` wajib diberi furigana. Pengecualian: jukujikun seperti `[今日|きょう]`, yang memang tidak
bisa dipisah; isi `reading_type` kotoba itu dengan `special`.

Pemeriksa konten mencocokkan bacaan kanji sasaran dengan daftar kun'yomi/on'yomi di tab kanji, lalu
memberi **peringatan** jika tidak ada di daftar, atau jika jenisnya berbeda dari `reading_type`. Perubahan
bunyi di dalam kata (sokuon, rendaku) memang wajar memunculkan peringatan ini; baca, lalu putuskan.

## Aturan `highlight` dan `blank`

`highlight` dan `blank` adalah teks **persis** seperti di kalimat (tanpa tanda furigana), termasuk bentuk
kata kerjanya: untuk `…を[食|た]べました。` isinya `食べました`, bukan `食べます`.

- Harus muncul tepat satu kali di kalimat.
- Harus mengandung minimal satu kanji sasaran quest.
- Tidak boleh memotong isi kurung furigana: untuk `[食事|しょくじ]`, isinya boleh `食事`
  tetapi tidak boleh `食` saja.
- `highlight` hanya di percakapan pengantar; `blank` hanya di percakapan uji. Sorotan di percakapan uji akan
  menunjuk jawabannya, jadi ditolak.

---

## Field `content.json`

Hasil konverter. Tim konten tidak perlu menulis JSON, tetapi tabel ini menjelaskan isinya.

```json
{
  "schemaVersion": 2,
  "contentRevision": "draft-0",
  "regions": [ { "chapter": 6, "title": "…", "intro": {…}, "pin": null, "quests": [ … ] } ],
  "kanji":   [ { "char": "食", … } ],
  "kotoba":  [ { "id": "tabemasu", "word": "食べます", "ruby": "[食|た]べます", … } ]
}
```

| Bagian | Asal tab | Keterangan |
|---|---|---|
| `regions[]` | wilayah | `chapter`, `title`, `intro.summary`, `intro.points`, `pin` (`{x, y}` atau `null`), `quests`. ID wilayah di log dan layar diturunkan dari bab: bab 6 → `B06`. |
| `regions[].quests[]` | quest | `id`, `kotoba` (ID kotoba), `targetKanji`, `productionPrompt`, `intro` (satu percakapan), `tests` (daftar percakapan). |
| percakapan | percakapan | `id`, `scene`, `sentenceChapter`, `isPlaceholder` (hanya jika `true`), `lines[]`: `speaker` (`player` atau ID tokoh), `ja`, `translation`, dan `highlight` atau `blank` + `distractors`. |
| `kanji[]` | kanji | `char`, `meaning`, `jlptLevel`, `strokeCount` (atau `null`), `bushu`, `bushuOptions`, `readings`, `strokes` (selalu `null` sampai lisensi diputuskan). |
| `kotoba[]` | kotoba | `id`, `word`, `ruby`, `reading`, `readingType`, `pos`, `meaning`, `chapter`, `note`, `readingDistractors`, `readingDistractorsCross`. |

**Yang tidak ditulis, tetapi dihitung dari data** (`js/model.js`): kanji penyusun setiap kotoba beserta
bacaannya (dari `ruby`), daftar kotoba untuk setiap kanji di index, dan contoh kalimat di index (baris
percakapan yang memuat kotoba itu). Dengan begitu satu data melayani quest (berpusat pada kotoba) dan index
(berpusat pada kanji) sekaligus.

## Menulis percakapan

Satu quest = satu **percakapan pengantar** yang memperkenalkan kotoba, lalu minimal satu **percakapan uji**
di konteks lain, dengan kotoba itu dikosongkan.

**Aturan yang diperiksa otomatis**
- Setiap percakapan antara **dua pembicara**, dan salah satunya **karakter pemain** (`pemain`).
- Percakapan pengantar menyorot kotoba quest (`highlight`) minimal di satu baris, dan tidak punya bagian kosong.
- Percakapan uji punya **tepat satu** baris ber-`blank` dengan minimal 3 pengecoh.
- Jawaban tidak boleh tertulis di baris lain percakapan uji yang sama (error), dan kanji sasaran di baris lain
  memunculkan peringatan.
- Kalimat ber-`blank` tidak boleh sama persis dengan kalimat di percakapan pengantar: uji harus di konteks lain.
- `sentence_chapter` diperiksa terhadap **bab wilayah** (lihat [Kalimat tidak boleh mendahului pelajaran](#kalimat-tidak-boleh-mendahului-pelajaran)).

**Aturan yang tidak bisa diperiksa kode — wajib dijaga penulis**
- **Semua percakapan dan kalimat ditulis tim sendiri. Percakapan tidak boleh disalin dari 会話 buku Minna.**
- **Baris karakter pemain** tidak boleh memuat nama pemain, dan tidak boleh memakai ragam bahasa yang terikat
  jenis kelamin (misalnya kata ganti orang pertama atau partikel akhir yang khas laki-laki atau perempuan).
  Pemain bisa memilih karakter mana pun, jadi ucapannya harus cocok untuk semua karakter.
- **Tokoh lain tidak memanggil pemain dengan nama.**
- **Nama tokoh adalah buatan tim**, bukan tokoh buku (ミラー, 山田, dan sebagainya). ID tokoh di kolom `speaker`
  (misalnya `hana`) nanti dicocokkan dengan daftar tokoh di data karakter.
- Konteks percakapan uji harus **berbeda** dari percakapan pengantar, bukan hanya kalimatnya yang diubah sedikit.
- Semua aturan kalimat tidak ambigu di bawah berlaku untuk baris ber-`blank`, dan konteksnya adalah **seluruh
  percakapan**, bukan hanya baris itu.

**Kapan `conversation_id` harus diganti**

| Perubahan | `conversation_id` | Alasan |
|---|---|---|
| Perbaikan kecil: salah ketik, furigana, terjemahan, satu pengecoh | **tetap** | Soalnya sama; progres pemain tidak perlu diulang. |
| Percakapan ditulis ulang secara substansial, misalnya karena dinilai ambigu oleh validator | **wajib ID baru** (misalnya `C-tabemasu-uji-1` → `C-tabemasu-uji-1b`) | Maknanya berubah, jadi soalnya soal baru. Jawaban untuk versi lama dan versi baru tidak boleh tercampur di log dengan ID yang sama. |

Ragu termasuk yang mana? Pilih ID baru. `contentRevision` dan kolom `prompt` di log tetap menjadi pengaman
kedua, tetapi keduanya tidak menggantikan aturan ini. Setelah ID diganti, jangan lupa memperbarui kolom
`intro_conversation` atau `test_conversations` di tab quest.

## Menulis pengecoh

Pengecoh yang tidak masuk akal membuat soal bisa dijawab tanpa menguasai materi.

### Soal cara baca

Setiap quest punya satu soal cara baca untuk kotobanya, dengan label jenis bacaannya (kun'yomi atau on'yomi).
Kotoba ber-`reading_type` `special` tidak punya soal cara baca.

Pilihan jawaban disusun dengan urutan prioritas berikut sampai berjumlah 4 (jawaban + 3 pengecoh):

1. `reading_distractors_cross` — manual, lintas jenis bacaan. **Selalu ditampilkan.**
2. `reading_distractors` — manual, sejenis.
3. Otomatis — cara baca **kotoba lain** dengan **jenis bacaan yang sama**, yang **tidak memakai kanji yang sama**,
   diutamakan yang panjangnya mirip.

**Pengecoh sejenis** (`reading_distractors`): ganti bagian yang dibaca oleh kanji sasaran dengan bacaan sejenis
(kun'yomi untuk soal kun'yomi, on'yomi untuk soal on'yomi), dari kanji ini atau kanji lain. Okurigana dan
bagian kata yang lain tetap.

| Kotoba | Jawaban | Pengecoh | Asal |
|---|---|---|---|
| 食べます | たべます | くべます · のべます · しらべます | く(う) dari 食 · の(む) dari 飲 · 調べます |
| 食事 | しょくじ | じきじ · いんじ · きじ | ジキ dari 食 · イン dari 飲 · キ dari 気 |

**Pengecoh lintas jenis** (`reading_distractors_cross`): meniru kesalahan nyata mahasiswa, yaitu membaca kanji
dengan jenis bacaan yang salah. Contoh: しょくべます untuk 食べます (食 dibaca dengan on'yomi ショク). Pengecoh ini
**hanya boleh diisi manual**; aplikasi tidak pernah membuatnya sendiri, karena bentuk seperti ini gampang menjadi
ngawur jika disusun otomatis. Jika pemain memilihnya, umpan balik menjelaskan bahwa kanji itu dibaca dengan
jenis bacaan yang salah, dan log mencatat `answerType` = `manual-cross`.

> Status: masih dibahas dengan dosen, karena sebagian pengajar keberatan menampilkan bentuk salah
> kepada pemula. Jika ditolak, cukup kosongkan kolom ini; kode tidak perlu diubah.

Jika jumlah pengecoh (manual + otomatis) kurang dari 3, pemeriksa konten memberi **peringatan** dan
soal ditampilkan dengan pilihan lebih sedikit.

### Uji konteks (bagian kosong di percakapan)

Kolom `distractors` **wajib diisi manual, minimal 3**. Kurang dari itu adalah **error**, dan materi tidak bisa
dimuat. Tidak ada pengecoh otomatis di sini: kode tidak bisa memastikan sebuah pengecoh benar-benar salah di
dalam percakapan.

Setiap pengecoh harus:
- sekelas kata dan sebentuk dengan `blank` (kata kerja bentuk ます dengan kata kerja bentuk ます);
- **salah dalam konteks percakapan**. Baca percakapannya utuh dengan pengecoh terpasang: jika tetap benar,
  pengecoh tersebut adalah jawaban benar kedua dan harus diganti.

## Menulis kalimat uji yang tidak ambigu

Baris ber-`blank` dipakai sebagai soal, jadi percakapannya harus cukup untuk menentukan **satu** jawaban.

> ⚠ **Pengecoh yang ternyata juga benar adalah jenis cacat yang paling sering ditemukan di proyek ini.**
> Selama pengembangan, cacat ini muncul tiga kali (T-01 dan T-11 di `DECISIONS.md`), termasuk pada
> kalimat yang ditulis dengan hati-hati. Kode tidak bisa mendeteksinya. Satu-satunya pengaman adalah
> memeriksa setiap pengecoh di dalam percakapannya, satu per satu, dan meminta orang lain mengerjakan soalnya.

Tiga kasus berikut pernah ada di materi contoh dan diganti karena cacat ini.

**Kasus 1 — konteks terlalu terbuka**

| | Kalimat | Masalah |
|---|---|---|
| ✗ | 今晩何を＿＿か。 (*Malam ini [Anda] ＿ apa?*) | 飲みます, 読みます, 書きます juga benar: siapa pun bisa "minum apa", "membaca apa", "menulis apa" malam ini. Semua pengecoh kata kerja menjadi jawaban benar. |
| ✓ | レストランで晩ごはんを＿＿。 (*Saya ＿ makan malam di restoran.*) | 晩ごはん (makan malam) hanya bisa "dimakan". 飲みます, 読みます, 書きます jelas salah. |

Pelajarannya: kata tanya seperti 何 membuka terlalu banyak kemungkinan. Ganti dengan **objek yang
konkret** yang hanya cocok dengan satu kata kerja.

**Kasus 2 — pengecoh ternyata juga benar**

| | Kalimat | Masalah |
|---|---|---|
| ✗ | きょうはいい＿＿ですね。 (*Hari ini ＿ bagus, ya.*) | いい食事ですね ("makanannya enak, ya") juga kalimat yang wajar. Pengecoh 食事 menjadi jawaban benar kedua. |
| ✓ | あしたの＿＿は雨です。 (*＿ besok hujan.*) | Hanya 天気 (cuaca) yang bisa "hujan". 食事, 手紙, 新聞 jelas salah. |

Pelajarannya: pola seperti いい＿ですね bisa diisi hampir semua kata benda. Tambahkan **keterangan
yang hanya cocok dengan kotoba sasaran** (雨 hanya cocok dengan 天気).

**Kasus 3 — kata kerja dengan banyak makna**

| | Kalimat dan pengecoh | Masalah |
|---|---|---|
| ✗ | ＿＿をつけます。 dengan pengecoh 食事 | つけます tidak hanya berarti "menyalakan". 食事をつけます ("menyertakan makan", misalnya paket hotel) juga wajar, jadi 食事 menjadi jawaban benar kedua. |
| ✓ | ＿＿をつけます。 dengan pengecoh 天気, 雨, 朝 | Tidak satu pun bisa "dinyalakan" atau "disertakan". |

Pelajarannya: jika kalimat memakai kata kerja yang maknanya banyak, periksa pengecoh terhadap **semua**
makna kata kerja itu, bukan hanya makna yang dimaksud.

Di percakapan, baris sebelumnya bisa **membantu** (menyempitkan konteks) atau **merusak** (misalnya lawan bicara
menyebut makanan dan minuman sekaligus, sehingga 食べます dan 飲みます sama-sama cocok). Periksa seluruh percakapan.

### Kalimat tidak boleh mendahului pelajaran

Percakapan juga tidak boleh memakai kosakata atau pola kalimat yang **belum dipelajari** mahasiswa pada bab
wilayahnya. Jika dilanggar, produk ini justru menambah beban, padahal beban itulah yang ingin dikurangi.

Karena itu setiap percakapan wajib diberi `sentence_chapter`: **bab Minna tertinggi yang dibutuhkan seluruh
barisnya**, dilihat dari semua kosakata dan pola kalimatnya, bukan hanya kotoba quest. Pemeriksa konten memberi
**peringatan** jika nilainya lebih tinggi daripada **bab wilayah**. Peringatan, bukan error, karena kadang memang
tidak terhindarkan; tetapi setiap peringatan harus dibaca dan diputuskan.

**Contoh pelanggaran**

| | Kalimat | Wilayah | Bab kalimat | Masalah |
|---|---|---|---|---|
| ⚠ | 電気をつけます。 | bab 1 (電気) | 14 (つけます) | Mahasiswa sudah mengenal 電気 sejak bab 1, tetapi kata kerja つけます baru diajarkan jauh sesudahnya. Soal di wilayah bab 1 menuntut kata bab 14. |

Cara menentukan nilainya: tulis bab setiap kata dan setiap pola kalimat di **semua baris** percakapan (termasuk
partikel dan bentuk kata kerja seperti ～ています atau ～たいです), lalu ambil **yang tertinggi**.

**Daftar periksa sebelum menulis satu percakapan uji**
1. Tutup bagian `blank`, lalu pasang setiap pengecoh satu per satu. Apakah ada yang tetap menghasilkan
   percakapan wajar? Jika ya, ganti pengecohnya atau ganti percakapannya.
2. Apakah percakapan memuat kata yang **hanya** cocok dengan kotoba sasaran?
3. Apakah jawabannya tidak tertulis, dan tidak tersirat jelas, di baris lain?
4. Apakah semua kata dan pola kalimat sudah dipelajari sampai bab wilayah? Isi `sentence_chapter` dengan bab tertinggi.
5. Minta anggota tim lain mengerjakan soalnya tanpa melihat jawaban.

## Tampilan cara baca

Data menulis kun'yomi dengan notasi kamus, misalnya `た(べる)`, karena notasi ini menandai batas
okurigana. Aplikasi **tidak menampilkan notasi mentah** tersebut, karena mahasiswa semester 1
belum diajarkan bentuk kamus: bacaan kanji (`た`) ditampilkan besar dan tebal, okurigana (`べる`)
kecil dan bergaris putus-putus, dengan legenda di bawah tabel. Jika kelak diputuskan lain, cukup
ubah `readingNotation()` di `js/screens/common.js`; data tidak perlu diubah.

## Yang harus diverifikasi terhadap buku

Tim konten mencentang setiap baris setelah memeriksa langsung di みんなの日本語初級I (nomor bab) atau di kamus
(jumlah guratan). `contentRevision` tetap `draft-0` sampai semua baris dicentang.

- **Wilayah B06**
  - [x] 食べます — bab 6
  - [x] 飲みます — bab 6
- **Jumlah guratan** — diisi pengembang, belum diperiksa:
  - [ ] 食 — 9
  - [ ] 飲 — 12
- **Bab yang dibutuhkan percakapan (`sentence_chapter`)** — keempat percakapan di data contoh masih
  **sementara** dan akan diganti; nilainya perkiraan pengembang dan tidak perlu diverifikasi.

Bab yang sudah terverifikasi untuk konten mendatang (belum ada di data): 食堂 — bab 3, 電気 — bab 1,
銀行員 — bab 1, 自転車 — bab 5, 行きます — bab 5. Kotoba yang dikeluarkan dari data contoh tercatat di
`data/archive/README.md`.

Daftar ini disalin manual dari `data/content.json`. Perbarui setiap kali wilayah, kanji, atau kotoba ditambahkan.

## Cakupan bab dan urutan wilayah

- **Materi dibatasi bab 1–12** みんなの日本語初級I. Wilayah atau kotoba dengan bab di luar itu adalah **error**.
  Materi yang terpaksa keluar dicatat di `data/archive/`, tidak dihapus tanpa jejak.
- **Satu wilayah = satu bab.** Urutan wilayah = urutan bab. Wilayah berikutnya terbuka setelah wilayah sebelumnya
  tuntas.
- **Isi wilayah = kotoba bab itu yang dipilih tim**, bukan semua kanji di kosakata bab tersebut. Urutan tidak lagi
  mengikuti mata kuliah Hyouki (keputusan lama D-39 dibalik oleh D-55; lihat alasannya di `DECISIONS.md`).
- **Kotoba harus berada di wilayah babnya sendiri** (error jika berbeda). Kotoba yang babnya belum punya wilayah
  memunculkan peringatan, karena belum tampil di mana pun.
- Percakapan boleh membutuhkan bab lebih tinggi dari wilayahnya, tetapi memunculkan peringatan (lihat di atas).
- Kun'yomi dan on'yomi satu kanji kini tersebar di wilayah berbeda (食べます bab 6, 食堂 bab 3). Kompromi ini
  disengaja (D-56): kartu kontras mengambil kotoba lain dengan kanji yang sama dari wilayah yang sudah terbuka,
  dan index menampilkan semua bacaan kanji beserta kotobanya.

## Aturan ID

ID dipakai di progres dan log. **Jangan pernah mengganti atau memakai ulang `kotoba_id`, `quest_id`, atau
`conversation_id` setelah data mulai dikumpulkan.** ID item soal diturunkan dari ID tersebut:

| Item | Format ID | Keterangan |
|---|---|---|
| Soal Bentuk | `K:食:shape` | Satu per kanji di seluruh materi: dikuasai sekali, berlaku di semua quest |
| Soal cara baca | `W:tabemasu:reading` | Satu per kotoba |
| Uji konteks | `C:C-tabemasu-uji-1:test` | Satu per percakapan uji |
| Produksi | `Q:Q-tabemasu:production` | Satu per quest |

Menukar urutan baris tidak mengubah ID. Mengubah **isi** percakapan tanpa mengganti `conversation_id` membuat
jawaban lama dan baru tercatat dengan ID yang sama, jadi percakapan yang ditulis ulang secara substansial wajib
diberi ID baru (lihat [Menulis percakapan](#menulis-percakapan)).

---

## Menambah wilayah dan quest

1. Tambahkan satu baris di tab `wilayah` (jika babnya belum ada), baris kanji sasaran di tab `kanji`, baris
   kotoba di tab `kotoba`, satu baris di tab `quest`, dan baris-baris percakapannya di tab `percakapan`.
2. Unduh kelima tab dan jalankan pemeriksa materi.
3. Muat ulang aplikasi. Tidak ada file JS yang perlu diubah.

## Aturan permainan

Semua ambang ada di bagian atas `js/state.js` sebagai konstanta bernama:

| Konstanta | Nilai | Arti |
|---|---|---|
| `STREAK_TO_MASTER` | 2 | Item dikuasai setelah benar sekian kali berturut-turut. |
| `REQUEUE_GAP_MIN`, `REQUEUE_GAP_MAX` | 2, 3 | Soal yang salah muncul lagi setelah 2–3 soal lain. |
| `REVIEW_ITEM_COUNT` | 10 | Jumlah item dalam satu ulangan wilayah (dipakai di langkah 3). |
| `OPTION_COUNT` | 4 | Jumlah pilihan di soal cara baca dan uji konteks (jawaban + pengecoh). |
| `STORAGE_BUDGET_CHARS` | 2.500.000 | Perkiraan batas penyimpanan browser, sengaja rendah. |
| `STORAGE_WARNING_RATIO` | 0,8 | Peringatan kapasitas muncul sejak 80% dari perkiraan batas. |

**Alur satu quest**

1. **Percakapan pengantar** (tidak dinilai). Baris percakapan muncul satu per satu; kotoba quest disorot,
   terjemahan selalu tampil. Di akhir, kotoba diperkenalkan beserta cara baca dan artinya. Pemain boleh
   mengulang percakapan sebelum menekan **Mulai latihan**.
2. **Putaran belajar**, berurutan: **Bentuk** (bushu setiap kanji sasaran), **Cara baca** (kotoba quest,
   dengan label kun'yomi atau on'yomi), lalu **Uji konteks** (percakapan lain, kotoba dikosongkan). Setiap
   item sampai dijawab benar sekali. Soal yang salah muncul lagi di tahap yang sama.
3. **Produksi**: menulis satu kalimat sendiri.
4. **Putaran pemantapan**: semua item yang belum dikuasai, diacak lintas tahap. Jawaban salah
   mengembalikan streak ke 0. Soal yang sama tidak pernah muncul dua kali berturut-turut; jika hanya satu
   soal tersisa, satu item yang sudah dikuasai diselipkan sebagai jeda (dicatat di log dengan `phase` =
   `spacer`).

Quest tuntas bila semua item dikuasai dan Produksi sudah dikirim. Kotoba ber-`reading_type` `special` tidak
punya soal cara baca.

**Soal Bentuk berlaku di seluruh permainan.** Satu kanji punya satu item Bentuk (`K:食:shape`). Jika sudah
dikuasai di satu quest, quest lain dengan kanji sasaran yang sama tidak menanyakannya lagi, tetapi item itu
tetap dihitung sebagai item yang dikuasai di quest tersebut.

**Kontras kun'yomi–on'yomi.** Setelah soal cara baca dijawab, umpan balik menampilkan kotoba lain yang memakai
kanji sasaran yang sama dari wilayah yang sudah terbuka (bab yang sama atau sebelumnya), beserta tabel bacaan
kanji itu (D-56).

**Uji konteks.** Terjemahan percakapan uji tidak ditampilkan sebelum menjawab; jika ditampilkan lebih dulu,
soal berubah menjadi mencocokkan arti. Pemain yang buntu boleh menekan **Tampilkan arti**. Jawaban benar
setelah bantuan tetap dihitung benar, tetapi log mencatat `hintUsed` = 1 sehingga bisa dipisahkan saat analisis.

**Produksi.** Tidak ada penilaian benar-salah dan tidak ada skor. Setelah pemain mengirim kalimat, baris
percakapan yang memuat kotoba quest ditampilkan sebagai pembanding, lalu pemain memilih "Sudah mirip" atau
"Masih ragu". Kalimat dan penilaian diri disimpan bersama sebagai satu baris log saat penilaian dipilih.

**Keluar di tengah quest.** Tombol **‹ Keluar** selalu ada di kepala layar quest. Setiap jawaban langsung
disimpan, jadi quest yang dibuka lagi melanjutkan dari titik terakhir: putaran belajar meneruskan soal yang
belum dijawab benar, dan putaran pemantapan meneruskan item yang belum dikuasai. Soal yang sedang terbuka
tetapi belum dijawab ditanyakan lagi. Percakapan pengantar yang ditinggalkan sebelum selesai diulang dari awal.
Menu (index, panduan kana, Pengaturan) tidak tersedia di dalam quest (D-69).

**Furigana.** Pengaturan → Furigana: **Selalu tampil** (bawaan), **Tampil setelah menjawab**, atau **Tidak
pernah**. Setelan disimpan per pemain, ikut kembali ke bawaan saat reset, tidak bisa diubah di tengah quest,
dan dicatat di setiap baris log (`furiganaMode`). Di percakapan pengantar, "tampil setelah menjawab" berlaku
seperti "selalu tampil", karena di sana tidak ada yang ditanyakan.

**Cara baca yang belum boleh terlihat (selalu menang atas setelan furigana).** Furigana kanji sasaran dan
cara baca kotoba hanya ditampilkan jika soal cara bacanya tidak akan segera muncul: sudah dijawab benar sekali
(putaran belajar) atau sudah dikuasai (Produksi dan putaran pemantapan). Di percakapan uji, furigana kanji
sasaran selalu disembunyikan sebelum menjawab. Pengecualian: percakapan pengantar, karena memang bertugas
memperkenalkan cara baca (D-65).

**Ulangan wilayah (復習) dan penguncian wilayah** dibangun di langkah 3 (D-63). Saat ini semua quest di
beranda sementara bisa langsung dimainkan.

**Status terkunci tidak disimpan.** Yang disimpan hanya fakta: streak tiap item, quest sudah dimulai, quest
sudah tuntas. Status terkunci selalu dihitung dari urutan materi, sehingga quest yang disisipkan saat revisi
tidak menghalangi peserta yang sudah lebih jauh.

## Kemajuan pemain dan reset

Progres disimpan di `localStorage` dengan key `kanjiGame.progress.v2`. Key ini berbeda dari versi level di
cabang `main` (`kanjiGame.progress.v1`), sehingga progres kedua versi tidak pernah tercampur. **Reset progres**
(Pengaturan) menghapus progres quest, membuat `playerId` baru, mengosongkan kode peserta, dan mengembalikan
setelan furigana ke bawaan. **Riwayat jawaban tidak ikut terhapus**, karena itu data penelitian.

Jika data progres rusak, aplikasi menyimpan salinannya di key `kanjiGame.progress.v2.corrupt.<waktu>`
dan memulai progres baru.

> Buka aplikasi di **satu tab saja** per perangkat. Dua tab yang terbuka bersamaan saling menimpa
> progres; yang terakhir menyimpan yang berlaku.

## Layar persetujuan peserta

Aplikasi merekam jawaban peserta, termasuk kalimat yang mereka ketik sendiri di tahap 5. Karena itu setiap
pemain memilih lebih dulu, **sebelum permainan pertama**:

- **Saya setuju** — jawaban direkam dan dikirim seperti biasa.
- **Main tanpa merekam** — permainan berjalan normal, tetapi **tidak ada satu baris log pun yang ditulis maupun
  dikirim**. Pilihan untuk pengunjung umum di pameran yang bukan peserta penelitian.

Layar ini muncul lagi setelah **Reset progres** (pemain berikutnya), dan ketika **versi teks persetujuan
berubah**. Pilihan beserta waktunya disimpan, dan setiap baris log mencatat `consentStatus`, `consentVersion`,
dan `consentAt`. Pemain dapat membuka layar ini lagi dari ⚙ Pengaturan → Persetujuan perekaman dan mengubah
pilihannya; perubahan berlaku untuk jawaban berikutnya.

> ⚠ **Teks persetujuan saat ini adalah PLACEHOLDER** dan belum boleh dipakai untuk peserta penelitian.
> Redaksinya harus disetujui dosen pembimbing.

**Pengaman teks placeholder.** Selama versi teks persetujuan diawali `placeholder` (saat ini `placeholder-0`),
**pengiriman log ke server dimatikan paksa**, walaupun sudah diaktifkan di `js/config.js`. Jawaban tetap
tersimpan di perangkat supaya pencatatan bisa diuji, dan Pengaturan menampilkan alasannya. Jawaban yang direkam
dengan persetujuan versi placeholder **tidak pernah dikirim**, termasuk setelah teks final dipasang; jawaban itu
hanya ada di perangkat dan di file CSV ekspor. Tujuannya membuat mustahil, tanpa disengaja, merekam data
penelitian atas dasar persetujuan yang redaksinya belum disetujui.

### Mengganti teks persetujuan

Teksnya ada di `data/consent.json`, bukan di kode:

```json
{
  "version": "v1-2026-10",
  "isPlaceholder": false,
  "title": "Judul layar",
  "sections": [
    { "heading": "Judul bagian", "paragraphs": ["Paragraf 1", "Paragraf 2"] }
  ]
}
```

1. Tulis redaksi yang sudah disetujui dosen pembimbing di `title` dan `sections`. Jumlah bagian bebas.
2. Ubah `isPlaceholder` menjadi `false` (spanduk "TEKS SEMENTARA" hilang).
3. **Ganti `version`** setiap kali redaksi berubah. Semua pemain akan diminta memilih ulang, dan log mencatat
   versi yang disetujui. Versi final **tidak boleh** diawali `placeholder`; pemeriksa menolak `isPlaceholder` dan
   `version` yang tidak cocok.
4. Unggah ulang aplikasi ke Netlify.

### Data yang secara teknis direkam (bahan penyusunan teks)

Daftar ini fakta teknis untuk membantu penyusun teks, **bukan** redaksi persetujuan. Untuk setiap jawaban:

- waktu menjawab dan lama berpikir (milidetik), serta apakah tab sempat ditinggalkan;
- ID pemain acak (dibuat di perangkat, bukan identitas), kode peserta jika diisi, dan ID sesi;
- level, tahap, soal yang ditampilkan, pilihan jawaban beserta urutannya, jawaban yang dipilih, benar atau
  salah, dan apakah bantuan "Tampilkan arti" dipakai;
- di tahap 5: **kalimat yang diketik peserta apa adanya** dan penilaian dirinya ("sudah mirip"/"masih ragu");
- versi aplikasi, revisi materi, dan status serta versi persetujuan.

Aplikasi tidak merekam nama, NIM, alamat email, lokasi, atau informasi perangkat. Data disimpan di perangkat
dan, jika pengiriman diaktifkan, dikirim ke Google Sheet milik tim.

### Peserta yang menarik persetujuan

Jika peserta yang sudah setuju membuka layar persetujuan (⚙ Pengaturan → Persetujuan perekaman) lalu memilih
**Main tanpa merekam**, aplikasi menanyakan apa yang dilakukan dengan jawaban yang sudah terekam:

- **Hapus juga data saya yang sudah terekam** — semua jawaban pemain itu dihapus dari perangkat, lalu aplikasi
  menulis **satu baris penarikan** (`consentStatus` = `withdrawn`) berisi `playerId`, kode peserta jika ada, waktu,
  dan jumlah baris yang dihapus dari perangkat (kolom `answer`). Baris ini ikut dikirim ke spreadsheet, kecuali
  persetujuannya dulu diberikan atas teks placeholder.
- **Biarkan data yang sudah terekam** — hanya berhenti merekam jawaban berikutnya.

Jawaban yang **sudah terkirim** ke spreadsheet tidak bisa dihapus oleh aplikasi. Peneliti menghapusnya secara
manual; lihat [Untuk peneliti: menghapus data peserta yang menarik persetujuan](#untuk-peneliti-menghapus-data-peserta-yang-menarik-persetujuan).

## Untuk peneliti: menghapus data peserta yang menarik persetujuan

Lakukan setiap kali memeriksa spreadsheet log, minimal sebelum data dianalisis, dan paling lambat satu minggu
setelah baris penarikan muncul.

1. Buka Google Sheet log, sheet `log`. Pilih **Data → Buat filter**.
2. Pada kolom `consentStatus`, tampilkan hanya **withdrawn**. Setiap baris yang muncul adalah satu permintaan
   penarikan. Catat nilai `playerId` dan `participantCode`-nya.
3. Untuk setiap `playerId` yang dicatat:
   1. Ubah filter: kolom `consentStatus` kembali ke semua nilai, kolom `playerId` hanya nilai tersebut.
   2. Pilih semua baris yang tampil **kecuali baris penarikan itu sendiri**, klik kanan → **Hapus baris yang dipilih**.
   3. Jika peserta memakai kode peserta dan pernah bermain di perangkat lain atau setelah reset (sehingga punya
      `playerId` lain), ulangi dengan filter kolom `participantCode`.
4. Biarkan baris penarikan tetap ada sebagai bukti bahwa permintaan sudah diproses. Tambahkan kolom `diproses`
   di sebelah kanan dan isi tanggal penghapusan.
5. Hapus juga data peserta itu dari **semua file CSV ekspor** yang pernah dibuat (buka di spreadsheet, filter
   `playerId` yang sama, hapus barisnya, simpan ulang), termasuk salinan di laptop atau drive tim.
6. Catat penghapusan di catatan penelitian: tanggal, `playerId`/kode peserta, dan jumlah baris yang dihapus.

## Pengaturan

Dibuka dari tombol **⚙ Pengaturan** di daftar level.

| Bagian | Isi |
|---|---|
| Pemain berikutnya | ID pemain saat ini dan tombol **Reset progres** (dengan konfirmasi). |
| Persetujuan perekaman | Pilihan pemain saat ini, versi teks, dan tombol **Buka layar persetujuan**. |
| Kode peserta | Opsional. Hanya huruf, angka, `-`, `_`, tanpa spasi; deretan 8 angka atau lebih ditolak karena menyerupai NIM. Gunakan kode anonim dari peneliti dengan format **huruf lalu angka**, misalnya `K4-01`. Tercatat di setiap baris log dan dikosongkan saat reset. |
| Riwayat jawaban | Jumlah jawaban, **indikator kapasitas** (peringatan sejak ±80%), status pengiriman ke server, **Ekspor CSV**, dan **Hapus log** (konfirmasi ganda: kotak konfirmasi, lalu mengetik `HAPUS`). |
| Materi | Revisi materi, tanda DRAF, tautan pratinjau semua level dan per level, pemeriksaan konten. |

Peringatan kapasitas juga muncul di daftar level, supaya penjaga stan melihatnya tanpa membuka
Pengaturan. Persentasenya adalah **perkiraan**: browser tidak memberi tahu batas pastinya.

## Log jawaban

Setiap jawaban dicatat di `localStorage` (key `kanjiGame.log.v1` dan `kanjiGame.log.v1.chunk.N`).
Daftar lengkap kolom ada di `LOG_COLUMNS` dalam `js/logger.js`. Kolom yang penting untuk analisis:

| Kolom | Isi |
|---|---|
| `rowId` | ID unik tiap baris. Dipakai spreadsheet untuk membuang baris yang terkirim dua kali. |
| `contentRevision` | Revisi materi saat soal dijawab; memisahkan data antarputaran revisi. |
| `participantCode` | Kode peserta anonim, jika diisi. |
| `consentStatus`, `consentVersion`, `consentAt` | `agreed` untuk jawaban (baris hanya ditulis setelah persetujuan), atau `withdrawn` untuk baris penarikan; versi teks persetujuan yang disetujui dan waktu persetujuan diberikan. Pada baris penarikan, `timestamp` adalah waktu penarikan dan `answer` jumlah baris yang dihapus dari perangkat. |
| `levelId`, `isReview` | Quest (`Q-…`) atau ulangan wilayah (`REV-B06`) tempat baris ditulis, dan 1 jika ulangan. |
| `regionId`, `questId` | Wilayah (`B06`) dan quest asal item. |
| `questStep` | Langkah quest: `intro`, `practice` (Bentuk dan Cara baca di putaran belajar), `test` (uji konteks di putaran belajar), `production`, `consolidation`, `review`, atau `spacer`. |
| `phase` | `intro`, `learning`, `consolidation`, `spacer`, `production`, atau `review`. |
| `stage` | `intro`, `shape`, `reading`, `test`, atau `production`. |
| `itemId` | `K:<kanji>:shape`, `W:<kotoba_id>:reading`, `C:<conversation_id>:test`, atau `Q:<quest_id>:production`. |
| `conversationId`, `blankLine` | Baris pengantar dan uji: percakapan yang ditampilkan; baris uji: nomor baris yang dikosongkan. |
| `targetKanji` | Kanji sasaran quest, dipisah ` \| `. |
| `options` | Pilihan sesuai urutan tampil, dipisah ` \| `. |
| `optionTypes` | Jenis tiap pilihan dengan urutan yang sama: `answer`, `manual`, `manual-cross`, `auto`. |
| `answer`, `answerType` | Pilihan pemain dan jenisnya. `answerType` = `manual-cross` berarti pemain membaca kanji dengan jenis bacaan yang salah. |
| `hintUsed` | Uji konteks saja: 1 jika **Tampilkan arti** ditekan sebelum menjawab. |
| `furiganaMode` | Setelan furigana pemain saat baris ditulis: `always`, `after`, atau `never`. |
| `isCorrect`, `streakAfter` | 1/0, dan streak item setelah dijawab. Kosong untuk baris pengantar dan Produksi. |
| `responseMs`, `wasHidden` | Waktu jawab; `wasHidden` = 1 jika tab sempat ditinggalkan, jadi waktunya tidak valid. Baris pengantar: lama membaca percakapan. |
| `introReplays` | Baris pengantar saja: berapa kali percakapan diulang. |
| `selfAssessment`, `containsKanji` | Produksi saja: `similar`/`unsure`, dan 1 jika kalimat memuat kanji sasaran quest. |

**Baris pengantar.** Satu baris ditulis saat pemain menekan **Mulai latihan** di akhir percakapan pengantar
(`questStep` = `intro`). Baris ini bukan jawaban: `isCorrect` kosong.

Jika daftar kolom berubah di versi berikutnya, log lama di perangkat otomatis disusun ulang ke urutan
kolom baru saat aplikasi dibuka. Skrip Apps Script juga menambahkan kolom baru ke spreadsheet secara
otomatis.

## Pengiriman log ke Google Apps Script

**Ini jalur utama pengumpulan data**, termasuk saat pameran. Ekspor CSV hanya cadangan.

Cara kerjanya: setiap jawaban disimpan di perangkat lebih dulu, lalu dikirim per kelompok (50 baris)
ke Web App. Baris dianggap terkirim hanya jika server membalas `{"ok": true}`. Jika gagal (jaringan
mati, server lambat), aplikasi tetap berjalan normal, baris tetap tersimpan, dan pengiriman dicoba lagi
otomatis: 2 detik setelah jawaban berikutnya, saat jaringan kembali, dan setiap 60 detik. Status dan
pesan galat terlihat di Pengaturan → Riwayat jawaban → Pengiriman ke server.

> ⚠ **Siapkan dan uji endpoint jauh sebelum hari pameran, jangan di hari-H.** Skrip di bawah sudah
> diuji dengan tiruan layanan Google, tetapi tim wajib mengujinya sendiri di akun Google yang akan
> dipakai.

### 1. Buat spreadsheet dan tempel skrip

1. Buat Google Sheet baru, misalnya **Log Kanji Bertahap**.
2. Buka **Ekstensi → Apps Script**.
3. Hapus isi `Code.gs`, lalu tempel seluruh skrip di bawah (sama dengan `tools/apps-script-log.gs`).
4. Klik **Simpan** (ikon disket).

```javascript
/**
 * Google Apps Script endpoint for the Kanji Bertahap answer log.
 *
 * Paste this whole file into Extensions → Apps Script of the Google Sheet
 * that will hold the data, then deploy it as a Web App (see README,
 * "Pengiriman log ke Google Apps Script").
 *
 * - Rows are appended to the sheet named SHEET_NAME (created if missing).
 * - Columns are matched by name; new columns sent by a newer app version are
 *   added to the header automatically.
 * - Rows whose rowId already exists are skipped, so a batch that is sent twice
 *   after a network drop does not create duplicates.
 * - Every cell is stored as plain text; values that start with = + - @ get a
 *   leading apostrophe so Sheets never runs them as formulas.
 */

var SHEET_NAME = "log";
var APP_ID = "kanji-bertahap";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.app !== APP_ID || !Array.isArray(payload.columns) || !Array.isArray(payload.rows)) {
      return jsonResponse({ ok: false, error: "format data tidak dikenal" });
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

    var header = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newColumns = payload.columns.concat(["receivedAt"]).filter(function (name) {
      return header.indexOf(name) === -1;
    });
    if (newColumns.length) {
      sheet.getRange(1, header.length + 1, 1, newColumns.length).setValues([newColumns]);
      header = header.concat(newColumns);
    }

    var rowIdColumn = header.indexOf("rowId");
    var existing = {};
    if (sheet.getLastRow() > 1) {
      sheet
        .getRange(2, rowIdColumn + 1, sheet.getLastRow() - 1, 1)
        .getValues()
        .forEach(function (row) {
          existing[String(row[0])] = true;
        });
    }

    var receivedAt = new Date().toISOString();
    var output = [];
    payload.rows.forEach(function (values) {
      var record = {};
      payload.columns.forEach(function (name, i) {
        record[name] = values[i];
      });
      var rowId = String(record.rowId || "");
      if (rowId && existing[rowId]) return;
      existing[rowId] = true;
      record.receivedAt = receivedAt;
      output.push(
        header.map(function (name) {
          return asText(record[name]);
        })
      );
    });

    if (output.length) {
      var range = sheet.getRange(sheet.getLastRow() + 1, 1, output.length, header.length);
      range.setNumberFormat("@");
      range.setValues(output);
    }
    return jsonResponse({ ok: true, received: payload.rows.length, appended: output.length });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Opening the Web App URL in a browser shows whether the endpoint is alive. */
function doGet() {
  return jsonResponse({ ok: true, message: "Endpoint log Kanji Bertahap aktif." });
}

function asText(value) {
  if (value === undefined || value === null) return "";
  var text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
```

### 2. Deploy sebagai Web App

Nama menu di bawah mengikuti tampilan Google berbahasa Indonesia; di akun berbahasa Inggris namanya
*Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone*.

1. Klik **Terapkan (Deploy) → Deployment baru**.
2. Klik ikon roda gigi di samping "Pilih jenis", pilih **Aplikasi web**.
3. Isi:
   - **Jalankan sebagai:** *Saya* (akun pemilik spreadsheet)
   - **Siapa yang memiliki akses:** *Siapa saja* (Anyone)
4. Klik **Terapkan**, izinkan akses saat diminta, lalu salin **URL aplikasi web** (berakhiran `/exec`).
5. Uji: buka URL itu di browser. Harus muncul `{"ok":true,"message":"Endpoint log Kanji Bertahap aktif."}`.

Jika skrip diubah, jangan membuat deployment baru (URL-nya akan berubah). Pakai **Terapkan → Kelola
deployment → ikon pensil → Versi: Versi baru → Terapkan**; URL tetap sama.

### 3. Aktifkan di aplikasi

Buka `js/config.js`, ubah dua baris ini, lalu deploy ulang ke Netlify:

```javascript
export const LOG_REMOTE_ENABLED = true;
export const LOG_REMOTE_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

### 4. Uji dari perangkat

1. Buka aplikasi dari Netlify, mainkan beberapa soal.
2. Buka **Pengaturan**. Setelah beberapa detik harus tertulis **✓ Semua jawaban sudah terkirim.**
3. Periksa sheet `log` di spreadsheet: baris baru muncul dengan kolom `receivedAt`.

### Jika pengiriman gagal

| Pesan di Pengaturan | Penyebab paling mungkin |
|---|---|
| Balasan server bukan JSON | Akses Web App bukan *Siapa saja*, atau URL bukan yang berakhiran `/exec`. |
| Tidak bisa terhubung ke server | Jaringan mati, URL salah ketik, atau Web App belum di-deploy. |
| Server tidak membalas dalam 15 detik | Apps Script sedang lambat; akan dicoba lagi otomatis. |
| Server menolak data | Skrip di spreadsheet bukan versi terbaru, atau spreadsheet dikunci. |

**Keterbatasan.** URL Web App tersimpan di kode aplikasi dan bisa dilihat siapa pun yang membuka
aplikasi, sehingga orang lain secara teori bisa mengirim data sampah. Saring data dengan kolom
`appVersion`, `contentRevision`, dan `participantCode` saat analisis.

## Ekspor CSV (cadangan)

Dipakai jika pengiriman ke server tidak bisa diandalkan, misalnya jaringan pameran mati.

1. Pengaturan → Riwayat jawaban → **Ekspor CSV**.
2. File `kanji-bertahap-log-TAHUNBULANTANGGAL-JAMMENIT.csv` masuk ke folder Unduhan perangkat.
3. File bisa dibuka langsung di Excel atau Google Sheets; huruf Jepang tampil benar.
4. Ekspor tidak menghapus apa pun. Pengaturan mencatat kapan terakhir diekspor dan berapa jawaban baru
   sejak itu.

Nilai yang diawali `=`, `+`, `-`, atau `@` diberi tanda `'` di depannya supaya spreadsheet tidak
menjalankannya sebagai rumus.

## Prosedur pameran (untuk penjaga stan)

Tidak perlu memahami kode. Semua langkah dilakukan dari aplikasi.

### Seminggu sebelum pameran (koordinator data)

1. Pastikan pengiriman log sudah aktif dan sudah diuji dari ponsel yang akan dipakai
   (bagian [Pengiriman log](#pengiriman-log-ke-google-apps-script), langkah 4).
2. Di setiap perangkat pameran, buka aplikasi dari tautan Netlify di **satu tab saja**.
3. Catat nomor telepon koordinator data untuk ditanya jika ada masalah.

### Pagi hari sebelum stan dibuka

1. Nyalakan perangkat dan pastikan terhubung ke internet.
2. Buka aplikasi → **⚙ Pengaturan** → bagian **Riwayat jawaban**.
3. Periksa tiga hal:
   - **Pengiriman ke server** tidak menampilkan pesan merah.
   - **Penyimpanan terpakai** di bawah 80%. Jika sudah 80% atau lebih, jalankan langkah
     *Jika muncul peringatan kapasitas* di bawah sebelum mulai.
   - Tidak ada tulisan "jawaban tidak bisa disimpan".
4. Tekan **Reset progres** → **Ya, reset progres**.

### Setiap kali pengunjung berganti

1. Pengaturan → **Reset progres** → **Ya, reset progres**.
2. Jika pengunjung adalah peserta penelitian dan membawa kode dari peneliti: isi **Kode peserta**
   (bentuknya huruf lalu angka, misalnya `K4-01`), lalu **Simpan kode**. Jangan pernah mengisi nama atau NIM.
3. Tekan **‹ Daftar level**, serahkan perangkat ke pengunjung.
4. Saat pengunjung membuka level pertama, **layar persetujuan** muncul:
   - **Pengunjung umum** (bukan peserta penelitian): minta mereka memilih **Main tanpa merekam**.
   - **Peserta penelitian**: minta mereka membaca teksnya sampai selesai, lalu memilih sendiri. Jangan memilihkan.

Reset **tidak** menghapus jawaban pengunjung sebelumnya; semuanya tetap tersimpan dan terkirim.

### Jika muncul spanduk kuning "Aplikasi ini juga terbuka di tab lain"

Artinya aplikasi terbuka dua kali di perangkat yang sama, dan progres bisa saling menimpa.

1. Tutup semua tab aplikasi kecuali satu (di ponsel: buka daftar tab browser, geser tab yang berlebih).
2. Jika spanduk meminta **Muat ulang halaman ini**, tekan tombol itu.
3. Jika pengunjung sedang bermain, progres level yang sedang dimainkan mungkin perlu diulang. Jawaban
   yang sudah tercatat di log tidak hilang.

### Setiap satu jam atau saat istirahat

1. Buka Pengaturan → Riwayat jawaban.
2. Jika tertulis **✓ Semua jawaban sudah terkirim**: tidak perlu melakukan apa-apa.
3. Jika tertulis **Belum terkirim: N jawaban** dan ada pesan merah:
   - Periksa koneksi internet, lalu tekan **Kirim sekarang**.
   - Jika masih gagal, tekan **Ekspor CSV** sebagai cadangan dan beri tahu koordinator data.
     Permainan tetap bisa berjalan seperti biasa.

### Jika muncul peringatan kapasitas

Peringatan kuning "Penyimpanan perangkat hampir penuh" muncul di daftar level dan di Pengaturan.

1. Buka Pengaturan → Riwayat jawaban.
2. Pastikan tertulis **✓ Semua jawaban sudah terkirim**. Jika belum, tekan **Kirim sekarang** dan tunggu.
3. Tekan **Ekspor CSV** dan simpan filenya (kirim ke koordinator data atau salin ke laptop).
4. Periksa bahwa file CSV bisa dibuka.
5. Baru setelah itu: **Hapus log…** → ketik `HAPUS` → **Hapus log permanen**.

Jika muncul pesan **merah** "Penyimpanan penuh", lakukan langkah di atas **sekarang juga**, sebelum
pengunjung berikutnya bermain.

### Akhir hari

1. Pengaturan → pastikan **✓ Semua jawaban sudah terkirim**.
2. **Ekspor CSV** sebagai cadangan harian, beri nama file sesuai tanggal jika perlu, serahkan ke
   koordinator data.
3. Jangan menghapus log sebelum koordinator memastikan data di spreadsheet dan file CSV lengkap.

## Pratinjau dan cetak untuk validator ahli

Pengaturan → Materi → **Pratinjau semua materi (bisa dicetak)** membuka `#/preview/all`:

- ringkasan seluruh level (nomor, ID, kanji, arti, JLPT, bab, jumlah kotoba dan kalimat);
- setiap level lengkap: bushu dan pilihannya, tabel cara baca beserta notasi data mentah, kotoba,
  pengecoh (sejenis, lintas jenis, dan kalimat), contoh kalimat dengan bagian kosong ditandai,
  instruksi Produksi;
- revisi materi dan tanggal dicetak di bagian atas.

Tekan **Cetak / simpan PDF**. Pada hasil cetak, setiap level dimulai di halaman baru dan diakhiri
**kotak catatan validator**. Jika revisi materi diawali `draft`, materi ditandai DRAF dengan tiga cara:

1. spanduk **DRAF — BELUM DIVERIFIKASI** di halaman pertama;
2. tanda air **DRAF** di setiap halaman (bergantung pada dukungan cetak browser);
3. label **DRAF — BELUM DIVERIFIKASI · revisi …** di awal setiap level dan di kotak catatan validator. Label
   ini bagian dari isi halaman, sehingga tetap tercetak walaupun browser tidak mencetak tanda air.

Pratinjau per level (`#/preview/L01`) juga menampilkan ID item soal untuk pemeriksaan teknis.

## Daftar level

- Level dikelompokkan per JLPT (N5, lalu N4) dengan urutan sesuai `content.json`.
- Tombol biru **Mulai / Lanjutkan** di bagian atas langsung membuka level yang sedang dikerjakan, atau
  level pertama yang terbuka. Berguna ketika daftar sudah berisi puluhan level.
- Setiap kartu menampilkan ID level, bab Minna dari kotobanya, dan status (terkunci, belum dimulai,
  sedang dikerjakan beserta jumlah item yang dikuasai, atau lulus).
- Penanda **Kelas sudah sampai bab Minna** (versi lama; tidak dipakai lagi di versi peta, lihat D-41 dan D-55).

## Uji otomatis

Untuk anggota tim yang mengubah kode. Butuh Node.js 22 atau lebih baru; tanpa npm dan tanpa dependensi.

```bash
node --test tests/*.test.mjs
```

Uji ini memeriksa aturan konten (furigana, validator, bab, pengecoh), aturan permainan (sesi, penyela,
kunci level, level ulangan), log (penyimpanan penuh, migrasi kolom, antrean pengiriman, CSV), alat
baris perintah, skrip Apps Script (dengan tiruan layanan Google), dan bahwa tidak ada materi bahasa
Jepang yang ditulis langsung di kode. Jalankan sebelum setiap commit. Tampilan di browser tidak diuji di
sini; periksa manual di ponsel.

---

## Pengujian yang wajib dijalankan tim

Tiga hal berikut **belum bisa diuji oleh pengembang**. Kerjakan sesuai urutan; urutannya mengikuti
jadwal: validasi ahli jauh lebih dulu daripada pameran.

### 1. Cetak pratinjau di Safari dan Firefox — sebelum validasi ahli

**Kenapa paling mendesak:** halaman pratinjau adalah yang dipegang validator ahli. Cetak baru diuji di
Chrome. Jika tanda DRAF tidak tercetak di browser lain, dokumen draf bisa sampai ke validator tanpa ada
yang sadar.

Lakukan di **Safari** (Mac atau iPhone) dan **Firefox**:

1. Buka aplikasi dari tautan Netlify → ⚙ Pengaturan → **Pratinjau semua materi (bisa dicetak)**.
2. Tekan **Cetak / simpan PDF** → pilih **Simpan sebagai PDF**.
3. Buka PDF-nya dan periksa setiap halaman:
   - [ ] Halaman pertama berisi spanduk **DRAF — BELUM DIVERIFIKASI**.
   - [ ] Setiap level dimulai di halaman baru dengan label **DRAF — BELUM DIVERIFIKASI · revisi …**.
   - [ ] Tanda air besar **DRAF** terlihat di setiap halaman. *(Jika tidak ada, catat nama browsernya.
         Label di awal level tetap menandai dokumen sebagai draf, tetapi beri tahu pengembang.)*
   - [ ] Huruf Jepang dan furigana terbaca, tidak berubah menjadi kotak.
   - [ ] Setiap level diakhiri kotak **Catatan validator**.
4. Jika ada yang gagal, **jangan kirim PDF dari browser tersebut**. Pakai PDF dari browser yang lolos.

### 2. Endpoint Apps Script di akun Google sungguhan — jauh sebelum pameran

**Kenapa:** ini jalur utama pengumpulan data di pameran. Skrip baru diuji dengan tiruan layanan Google,
belum di akun Google yang sebenarnya. Masalah izin atau akses hanya muncul di akun sungguhan.

1. Ikuti [Pengiriman log ke Google Apps Script](#pengiriman-log-ke-google-apps-script) langkah 1–4.
2. Periksa:
   - [ ] Membuka URL `/exec` di browser menampilkan `{"ok":true,...}`.
   - [ ] Setelah bermain beberapa soal, Pengaturan menampilkan **✓ Semua jawaban sudah terkirim**.
   - [ ] Sheet `log` berisi baris baru; huruf Jepang tampil benar.
   - [ ] Matikan Wi-Fi, jawab beberapa soal, nyalakan lagi: dalam 1 menit semua terkirim, dan tidak ada
         baris ganda di sheet (periksa kolom `rowId`).
   - [ ] Uji dari minimal dua ponsel berbeda yang akan dipakai di pameran.

### 3. Unduhan CSV di iPhone — sebelum pameran

**Kenapa:** ekspor CSV adalah cadangan saat jaringan pameran mati. Unduhan file di iPhone berbeda dari
Android dan komputer, dan belum pernah dicoba.

1. Di iPhone, buka aplikasi di Safari, mainkan beberapa soal.
2. ⚙ Pengaturan → **Ekspor CSV**. Jika Safari bertanya, pilih **Unduh**.
3. Periksa:
   - [ ] File muncul di aplikasi **File** → **Unduhan**.
   - [ ] File bisa dibuka (Numbers atau Google Sheets) dan huruf Jepang tampil benar.
   - [ ] File bisa dikirim ke koordinator data (AirDrop, WhatsApp, atau email).
4. Ulangi di satu ponsel Android untuk perbandingan.

---

## Daftar periksa sebelum validasi ahli

Dijalankan oleh ketua tim konten. Semua butir harus dicentang sebelum materi dikirim ke validator.

- [ ] Urutan kanji dari mata kuliah Hyouki sudah diterima, dan urutan level di spreadsheet mengikutinya.
- [ ] Semua level sudah ditulis di spreadsheet, dikonversi, dan pemeriksa konten menyatakan **lolos tanpa
      error**. Peringatan yang tersisa sudah dibaca dan diputuskan.
- [ ] **Seluruh nomor bab** di [Yang harus diverifikasi terhadap buku](#yang-harus-diverifikasi-terhadap-buku)
      sudah dicentang setelah dicek langsung di buku.
- [ ] **Pengecoh manual lengkap di semua level**: setiap contoh kalimat punya minimal 3 pengecoh, dan setiap
      pengecoh sudah diperiksa dengan cara di [Menulis kalimat uji yang tidak ambigu](#menulis-kalimat-uji-yang-tidak-ambigu).
- [ ] Minimal satu anggota tim lain sudah mengerjakan seluruh soal tanpa melihat jawaban, dan tidak menemukan
      soal dengan dua jawaban benar.
- [ ] Keputusan yang menunggu dosen (daftar di awal `DECISIONS.md`) sudah dibahas, atau diputuskan untuk
      dibiarkan sementara.
- [ ] `contentRevision` **sudah dinaikkan** dari `draft-0` (misalnya menjadi `rev-1`) saat konversi CSV.
- [ ] Pratinjau dibuka ulang: spanduk dan label **DRAF sudah tidak muncul**, dan revisi yang tertulis sesuai.
- [ ] Pengujian tim nomor 1 (cetak di Safari dan Firefox) sudah lolos.
- [ ] PDF pratinjau untuk validator dibuat dari browser yang lolos, dan nama filenya memuat nama revisi.

## Daftar periksa sebelum pameran

Dijalankan oleh koordinator data dan penjaga stan.

- [ ] Aplikasi dengan materi final sudah di-deploy ke Netlify (lihat [Menaruh aplikasi di Netlify](#menaruh-aplikasi-di-netlify)), dan tautannya sudah dicoba.
- [ ] Pengujian tim nomor 2 (endpoint Apps Script) sudah lolos, dan `LOG_REMOTE_ENABLED` aktif di versi
      yang di-deploy.
- [ ] Pengujian tim nomor 3 (CSV di iPhone) sudah lolos.
- [ ] Setiap perangkat pameran sudah dicoba: aplikasi terbuka dari tautan Netlify di **satu tab**, satu level
      dimainkan sampai lulus, dan Pengaturan menampilkan **✓ Semua jawaban sudah terkirim**.
- [ ] Setiap perangkat sudah di-**Reset progres** dan log uji coba sudah dihapus setelah diekspor.
- [ ] Bagian [Prosedur pameran](#prosedur-pameran-untuk-penjaga-stan) sudah **dicetak** dan ada di meja stan.
- [ ] Penjaga stan sudah berlatih: reset, mengisi kode peserta, membaca status pengiriman, ekspor CSV, dan
      menangani spanduk tab ganda.
- [ ] Teks persetujuan di `data/consent.json` sudah diganti dengan redaksi yang disetujui dosen pembimbing,
      `isPlaceholder` bernilai `false`, dan `version` sudah diganti. Layar persetujuan dibuka ulang dan spanduk
      **TEKS SEMENTARA** sudah tidak muncul.
- [ ] Teks persetujuan menjelaskan bahwa peserta boleh berhenti dan meminta datanya dihapus, sesuai prosedur di
      [Peserta yang menarik persetujuan](#peserta-yang-menarik-persetujuan).
- [ ] Peneliti yang memegang spreadsheet sudah membaca [prosedur penghapusan manual](#untuk-peneliti-menghapus-data-peserta-yang-menarik-persetujuan).
- [ ] Jika ada peserta penelitian: daftar kode peserta anonim (misalnya `K4-01`, `K4-02`, …) sudah disiapkan
      peneliti, terpisah dari daftar nama.
- [ ] Nomor telepon koordinator data tertulis di lembar prosedur.
- [ ] Pengisi daya dan koneksi internet cadangan (misalnya hotspot ponsel) tersedia.
