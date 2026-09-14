# Kanji Bertahap

Web game penunjang untuk belajar kanji dan kotoba N5–N4, bagi mahasiswa semester 1 yang memakai
みんなの日本語初級I. Dikembangkan untuk mata kuliah 教材開発.

- HTML + CSS + JavaScript murni (ES modules). Tanpa framework, tanpa build step, tanpa backend.
- Seluruh materi ada di `data/content.json`. Tidak ada teks materi bahasa Jepang di file JS.
- Progres pemain disimpan di `localStorage` browser.

> **Status:** scaffold selesai (langkah 5 dari 5). Semua fitur ada dan teruji dengan data uji 33 level.
> `data/content.json` masih berisi **tiga level contoh** dengan urutan sementara; materi sungguhan
> menunggu urutan kanji dari mata kuliah Hyouki. Lihat [Sebelum validasi ahli](#daftar-periksa-sebelum-validasi-ahli)
> dan [Sebelum pameran](#daftar-periksa-sebelum-pameran) di akhir dokumen ini.
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

**Netlify**
Seret folder proyek ke <https://app.netlify.com/drop>. Folder `tools/` ikut terunggah; tidak masalah,
karena aplikasi tidak memakainya.

---

## Struktur folder

```
index.html                  halaman utama + pesan untuk file://
css/style.css               tampilan (mobile-first)
data/content.json           SELURUH materi pembelajaran

js/main.js                  bootstrap aplikasi, routing antar layar
js/config.js                konfigurasi umum (judul, versi, lokasi content.json)
js/state.js                 progres di localStorage + SEMUA aturan permainan (ambang, kunci, ulangan)
js/session.js               antrean soal satu level: putaran belajar, produksi, pemantapan
js/logger.js                pencatatan jawaban ke localStorage, konversi CSV
js/log-sender.js            pengiriman log ke Google Apps Script
js/storage.js               pembungkus localStorage yang tidak pernah error
js/tab-guard.js             peringatan jika aplikasi terbuka di tab lain
js/content.js               memuat content.json, mengelompokkan level, menurunkan item soal
js/chapters.js              bab Minna sebuah level, dihitung dari kotobanya
js/validate.js              aturan validasi konten (dipakai browser DAN terminal)
js/ruby.js                  parser sintaks furigana [漢字|かんじ] dan render <ruby>
js/jp-text.js               pengenalan hiragana/katakana/kanji, pemisah notasi た(べる)
js/dom.js                   pembuat elemen HTML

js/distractors.js           penyusunan pilihan jawaban dan pengecoh
js/random.js                pengacak

js/stages/choice.js         komponen soal pilihan ganda (dipakai tahap 1–4)
js/stages/shape.js          tahap 1 — Bentuk
js/stages/reading.js        tahap 2 dan 3 — Kun'yomi / On'yomi
js/stages/sentence.js       tahap 4 — Kotoba dalam kalimat
js/stages/production.js     tahap 5 — Produksi

js/screens/common.js        komponen bersama (tabel bacaan, daftar error, label)
js/screens/level-list.js    daftar level, status terkunci, kartu level ulangan
js/screens/play.js          layar bermain: menjalankan sesi, mencatat log
js/screens/preview.js       pratinjau materi (per level dan semua level, bisa dicetak), pemeriksaan konten
js/screens/settings.js      pengaturan: reset, kode peserta, kapasitas, pengiriman, ekspor, hapus log

tools/csv-to-json.mjs       konversi CSV spreadsheet → data/content.json
tools/validate-content.mjs  pemeriksa konten dari terminal
tools/lib/print-issues.mjs  tampilan error/peringatan di terminal
tools/content-template.csv  contoh CSV (level 食)
tools/apps-script-log.gs    skrip Google Apps Script penerima log (siap tempel)

tests/                      uji otomatis logika inti (lihat "Uji otomatis")
DECISIONS.md                catatan keputusan desain beserta alasannya
```

---

## Alur kerja tim konten

Materi ditulis di Google Sheets, bukan langsung di JSON.

1. Isi spreadsheet dengan kolom persis seperti [Kolom spreadsheet](#kolom-spreadsheet).
   Contoh yang benar ada di `tools/content-template.csv` (bisa di-*import* ke Google Sheets).
2. Unduh: **File → Download → Comma Separated Values (.csv)**.
3. Jalankan konverter (butuh [Node.js](https://nodejs.org) versi 22 atau lebih baru):
   ```bash
   node tools/csv-to-json.mjs ~/Downloads/materi.csv --revision rev-1
   ```
   - `--revision` wajib. Nama ini dicatat di setiap baris log, supaya data sebelum dan sesudah
     tiap putaran revisi bisa dibandingkan. Ganti setiap kali materi direvisi
     (`draft-0` → `rev-1` → `rev-2`).
   - `--out` opsional (bawaan: `data/content.json`).
   - File hanya ditulis jika **tidak ada error**. Setiap error menyebut nomor baris CSV.
4. Muat ulang aplikasi di browser.

Jika `content.json` diedit langsung, periksa dengan:
```bash
node tools/validate-content.mjs            # bawaan: data/content.json
```
Pemeriksaan yang sama berjalan otomatis saat aplikasi dibuka. Jika ada error, aplikasi berhenti dan
menampilkan daftar error. Peringatan tidak menghentikan aplikasi; daftarnya bisa dibuka dari
tautan "peringatan konten" di daftar level.

---

## Kolom spreadsheet

**Satu baris = satu contoh kalimat.** Kolom level dan kolom kotoba diulang di setiap baris.
Sel yang dikosongkan pada baris berikutnya dari level/kotoba yang sama ikut nilai baris sebelumnya.
Jika dua baris berisi nilai berbeda untuk kolom yang sama, konverter menolak.

Kolom berisi **daftar** dipisah titik koma: `食;人;米;皿`.

| Kolom | Isi | Contoh |
|---|---|---|
| `level_id` | ID level, permanen (lihat [Aturan ID](#aturan-id)) | `L01` |
| `kanji` | Tepat satu kanji | `食` |
| `level_meaning` | Arti kanji | `makan` |
| `jlpt_level` | `N5` atau `N4` | `N5` |
| `bushu_char` | Bushu (jawaban benar tahap Bentuk) | `食` |
| `bushu_name` | Nama bushu | `shoku` |
| `bushu_meaning` | Arti bushu | `makan / makanan` |
| `bushu_variants` | *Daftar, boleh kosong.* Bentuk lain bushu yang sama | `飠` |
| `bushu_options` | *Daftar.* Pilihan tahap Bentuk, termasuk jawaban benar | `食;人;米;皿` |
| `kunyomi` | *Daftar, boleh kosong.* Hiragana, okurigana dalam kurung | `た(べる);く(う)` |
| `onyomi` | *Daftar, boleh kosong.* Katakana | `ショク` |
| `production_prompt` | Instruksi tahap Produksi | `Buat satu kalimat …` |
| `word` | Kotoba (bentuk ます untuk kata kerja) | `食べます` |
| `word_reading` | Cara baca kotoba, hiragana | `たべます` |
| `reading_type` | `kunyomi`, `onyomi`, atau `special` | `kunyomi` |
| `pos` | `verb`, `noun`, `i-adj`, `na-adj`, `adverb`, `other` | `verb` |
| `word_meaning` | Arti kotoba | `makan` |
| `word_chapter` | Bab Minna tempat kotoba ini diajarkan. `-` jika di luar buku. Bab level dihitung otomatis dari kolom ini (tidak ada kolom bab level) | `6` |
| `word_note` | *Boleh kosong.* Catatan, misalnya perubahan bunyi | |
| `reading_distractors` | *Daftar, boleh kosong.* Pengecoh cara baca **sejenis** buatan tim | `くべます;のべます;しらべます` |
| `reading_distractors_cross` | *Daftar, boleh kosong.* Pengecoh cara baca **lintas jenis** (lihat [Menulis pengecoh](#menulis-pengecoh)) | `しょくべます` |
| `example_ja` | Kalimat dengan sintaks furigana | `[毎朝\|まいあさ]パンを[食\|た]べます。` |
| `example_blank` | Bagian kalimat yang dikosongkan di tahap 4 | `食べます` |
| `example_translation` | Terjemahan | `Setiap pagi saya makan roti.` |
| `example_distractors` | ***Wajib, minimal 3.*** Pengecoh buatan tim untuk tahap 4 | `飲みます;読みます;聞きます` |

Kotoba tanpa contoh kalimat: tulis satu baris dengan keempat kolom `example_*` kosong.

---

## Sintaks furigana

Tulis kanji dan furigananya di dalam kurung siku, dipisah garis tegak:

```
[毎朝|まいあさ]パンを[食|た]べます。
```

- Gunakan `[`, `|`, `]` **setengah lebar**. Matikan IME Jepang saat mengetik tanda ini;
  versi lebar penuh `［ ｜ ］` ditolak dengan pesan error.
- Okurigana (べます) ditulis **di luar** kurung.
- Kanji yang tidak diberi kurung memunculkan peringatan "kanji tanpa furigana".
- Kesalahan sintaks ditunjukkan dengan tanda ⟪ ⟫ pada karakter yang bermasalah, misalnya:
  `Ada "[" yang tidak ditutup dengan "]". Lokasi: パン⟪[⟫毎朝|まいあさ`.

## Aturan `blank`

`example_blank` adalah teks **persis** seperti di kalimat (tanpa tanda furigana), termasuk bentuk
kata kerjanya: untuk `…を[食|た]べます。` isinya `食べます`, bukan `食べる`.

- Harus muncul tepat satu kali di kalimat.
- Harus mengandung kanji level tersebut.
- Tidak boleh memotong isi kurung furigana: untuk `[食事|しょくじ]`, `blank` boleh `食事`
  tetapi tidak boleh `食` saja.

---

## Field `content.json`

```json
{
  "schemaVersion": 1,
  "contentRevision": "draft-0",
  "levels": [ ... ]
}
```

| Field | Wajib | Keterangan |
|---|---|---|
| `schemaVersion` | ya | Versi struktur data. Saat ini `1`. |
| `contentRevision` | ya | Nama revisi materi; dicatat di setiap baris log. |
| `levels` | ya | Daftar level. **Urutan array = urutan buka kunci.** |

**Level**

| Field | Wajib | Keterangan |
|---|---|---|
| `id` | ya | Huruf latin/angka/`-`/`_`. Unik. Format `R` + angka dicadangkan untuk level ulangan, dan `all` untuk halaman pratinjau semua level. |
| `kanji` | ya | Tepat satu kanji, unik di seluruh materi. |
| `meaning` | ya | Arti kanji (bahasa Indonesia). |
| `jlptLevel` | ya | `N5`, `N4` (juga `N3`–`N1` untuk masa depan). Menentukan kelompok di daftar level. |
| `bushu.char` | ya | Bushu; jawaban benar tahap Bentuk. |
| `bushu.name`, `bushu.meaning` | ya | Nama dan arti bushu. |
| `bushu.variants` | tidak | Bentuk lain dari bushu yang sama (misalnya 飠 untuk 食). **Belum dipakai logika mana pun**; disiapkan untuk varian soal tahap Bentuk yang masih dibahas dengan dosen. Boleh dikosongkan. Tidak boleh muncul sebagai pengecoh di `bushuOptions`. |
| `bushuOptions` | ya | Pilihan tahap Bentuk, minimal 2, harus memuat `bushu.char`. |
| `readings.kunyomi`, `readings.onyomi` | ya | Daftar bacaan (boleh `[]`, tetapi tidak keduanya). Ditampilkan sebagai tabel kontras. |
| `kotoba` | ya | Minimal satu kotoba. |
| `productionPrompt` | ya | Instruksi tahap Produksi. |

**Kotoba**

| Field | Wajib | Keterangan |
|---|---|---|
| `word` | ya | Harus mengandung kanji level. Kata kerja ditulis dalam bentuk ます. |
| `reading` | ya | Hiragana/katakana. Harus cocok dengan okurigana di `word` (dicek otomatis). |
| `readingType` | ya | `kunyomi` → tahap 2, `onyomi` → tahap 3, `special` (jukujikun, bacaan campuran seperti 今日) → hanya tahap 4. Tahap tanpa item dilewati. |
| `pos` | ya | Kelas kata. Pengecoh tahap 4 harus sekelas kata dengan kotoba ini. |
| `meaning` | ya | Arti kotoba. |
| `chapter` | ya | Bab みんなの日本語 tempat kotoba ini diajarkan (1–50), atau `null` jika di luar buku. Hanya informasi: ditampilkan di kartu level dan dipakai penanda "sampai bab berapa". Tidak menentukan urutan level. |
| `note` | tidak | Catatan untuk umpan balik, misalnya perubahan bunyi. |
| `readingDistractors` | tidak | Pengecoh cara baca **sejenis** buatan tim; dipakai sebelum pengecoh otomatis. |
| `readingDistractorsCross` | tidak | Pengecoh cara baca **lintas jenis** buatan tim, misalnya bacaan on'yomi untuk kotoba kun'yomi. Selalu ditampilkan dan ditandai `manual-cross` di log. |
| `examples` | ya | Daftar contoh kalimat (boleh `[]`). |

**Contoh kalimat**

| Field | Wajib | Keterangan |
|---|---|---|
| `ja` | ya | Kalimat dengan sintaks furigana. |
| `blank` | ya | Lihat [Aturan `blank`](#aturan-blank). |
| `translation` | ya | Terjemahan bahasa Indonesia. |
| `distractors` | **ya** | Minimal 3 pengecoh buatan tim untuk tahap 4. Kurang dari itu adalah error. |

## Menulis pengecoh

Pengecoh yang tidak masuk akal membuat soal bisa dijawab tanpa menguasai materi.

### Tahap 2–3: cara baca

Pilihan jawaban disusun dengan urutan prioritas berikut sampai berjumlah 4 (jawaban + 3 pengecoh):

1. `readingDistractorsCross` — manual, lintas jenis bacaan. **Selalu ditampilkan.**
2. `readingDistractors` — manual, sejenis.
3. Otomatis — cara baca kotoba di **level lain** dengan **jenis bacaan yang sama**, diutamakan yang
   panjangnya mirip.

**Pengecoh sejenis** (`reading_distractors`): ganti bagian yang dibaca oleh kanji level dengan
bacaan sejenis (kun'yomi untuk soal kun'yomi, on'yomi untuk soal on'yomi), dari kanji ini atau kanji
lain. Okurigana dan bagian kata yang lain tetap.

| Kotoba | Jawaban | Pengecoh | Asal |
|---|---|---|---|
| 食べます | たべます | くべます · のべます · しらべます | く(う) dari 食 · の(む) dari 飲 · 調べます |
| 食事 | しょくじ | じきじ · いんじ · きじ | ジキ dari 食 · イン dari 飲 · キ dari 気 |

**Pengecoh lintas jenis** (`reading_distractors_cross`): meniru kesalahan nyata mahasiswa, yaitu
membaca kanji dengan jenis bacaan yang salah. Contoh: しょくべます untuk 食べます (食 dibaca dengan
on'yomi ショク). Pengecoh ini **hanya boleh diisi manual**; aplikasi tidak pernah membuatnya sendiri,
karena bentuk seperti ini gampang menjadi ngawur jika disusun otomatis. Jika pemain memilihnya,
umpan balik menjelaskan bahwa kanji itu dibaca dengan jenis bacaan yang salah, dan log mencatat
`answerType` = `manual-cross`.

> Status: masih dibahas dengan dosen, karena sebagian pengajar keberatan menampilkan bentuk salah
> kepada pemula. Jika ditolak, cukup kosongkan kolom ini; kode tidak perlu diubah.

Jika jumlah pengecoh (manual + otomatis) kurang dari 3, pemeriksa konten memberi **peringatan** dan
soal ditampilkan dengan pilihan lebih sedikit.

### Tahap 4: kotoba dalam kalimat

`example_distractors` **wajib diisi manual, minimal 3**. Kurang dari itu adalah **error**, dan
materi tidak bisa dimuat. Tidak ada pengecoh otomatis di tahap ini: kode tidak bisa memastikan
sebuah pengecoh benar-benar salah di dalam kalimat.

Setiap pengecoh harus:
- sekelas kata dan sebentuk dengan `blank` (kata kerja bentuk ます dengan kata kerja bentuk ます);
- **salah dalam konteks kalimat**. Baca kalimatnya utuh dengan pengecoh terpasang: jika kalimat itu
  tetap benar, pengecoh tersebut adalah jawaban benar kedua dan harus diganti.

## Menulis kalimat contoh yang tidak ambigu

Kalimat contoh dipakai sebagai soal di tahap 4, jadi konteksnya harus cukup untuk menentukan **satu**
jawaban. Dua kalimat berikut pernah ada di materi contoh dan dibuang karena cacat ini.

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

**Daftar periksa sebelum menulis satu kalimat**
1. Tutup bagian `blank`, lalu pasang setiap pengecoh satu per satu. Apakah ada yang tetap
   menghasilkan kalimat wajar? Jika ya, ganti pengecohnya atau ganti kalimatnya.
2. Apakah konteks kalimat memuat kata yang **hanya** cocok dengan kotoba sasaran?
3. Minta anggota tim lain mengerjakan soalnya tanpa melihat jawaban.

## Tampilan cara baca

Data menulis kun'yomi dengan notasi kamus, misalnya `た(べる)`, karena notasi ini menandai batas
okurigana. Aplikasi **tidak menampilkan notasi mentah** tersebut, karena mahasiswa semester 1
belum diajarkan bentuk kamus: bacaan kanji (`た`) ditampilkan besar dan tebal, okurigana (`べる`)
kecil dan bergaris putus-putus, dengan legenda di bawah tabel. Jika kelak diputuskan lain, cukup
ubah `readingNotation()` di `js/screens/common.js`; data tidak perlu diubah.

## Yang harus diverifikasi terhadap buku

Tim konten mencentang setiap baris setelah memeriksa nomor babnya langsung di みんなの日本語初級I.
`contentRevision` tetap `draft-0` sampai semua baris dicentang.

- **L01 食**
  - [x] 食べます — bab 6
  - [x] 食堂 — bab 3
  - [ ] 食事 — bab 13 *(tidak muncul di bab 1–6; belum terverifikasi)*
- **L02 飲**
  - [x] 飲みます — bab 6
- **L03 気**
  - [x] 電気 — bab 1
  - [ ] 元気 — bab 8 *(belum terverifikasi)*
  - [ ] 天気 — bab 12 *(belum terverifikasi)*

Bab yang sudah terverifikasi untuk konten mendatang (belum ada di data): 銀行員 — bab 1,
自転車 — bab 5, 行きます — bab 5.

Daftar ini disalin manual dari `data/content.json`. Perbarui setiap kali level atau kotoba ditambahkan.

## Urutan level dan `chapter`

みんなの日本語初級I tidak mengajarkan kanji secara bertahap: sejak 第1課 banyak kanji sudah muncul di
daftar kosakata (先生, 学生, 会社員, 銀行員, 医者, 大学, 病院, 電気, …) tanpa dituntut dikuasai. Kanji
diajarkan berurutan di mata kuliah Hyouki. Karena itu:

- **Urutan level = urutan array di `content.json`**, mengikuti urutan pengajaran mata kuliah Hyouki.
  Urutan ini juga urutan buka kunci level.
- **Semua level N5 harus berada sebelum level N4.** Pelanggaran adalah **error**, karena daftar level
  dikelompokkan per JLPT dan level N5 akan terkunci di belakang level dari kelompok N4.
- **`chapter` kotoba hanya informasi**: bab Minna tempat kata itu diajarkan. Kartu level menampilkan
  semua bab kotobanya ("Minna bab 3, 6, 13").
- **Bab level dihitung otomatis** (bab terkecil dari kotobanya) dan tidak diisi manual. Field `chapter`
  pada level diabaikan dan memunculkan peringatan; kolom `level_chapter` di CSV ditolak.
- **Urutan bab yang tidak naik itu wajar.** Pemeriksa konten hanya menampilkannya sebagai **catatan**,
  bukan peringatan, dan tidak pernah menghalangi pemuatan materi.

**Penanda "Kelas sudah sampai bab Minna".** Di atas daftar level, pemain atau pengajar dapat memilih
bab terakhir yang sudah dipelajari kelas. Level yang memuat kata dari bab sesudahnya diberi tanda
"⚠ Memuat kata dari bab yang belum dipelajari". Tanda ini **tidak mengunci** level. Kotoba di luar buku
(`chapter` = `null`) tidak diberi tanda karena babnya tidak diketahui. Pilihan disimpan di perangkat
dan tidak ikut terhapus saat reset progres.

## Aturan ID

ID level dan ID item dipakai di progres dan log. **Jangan pernah mengganti atau memakai ulang ID
level setelah data mulai dikumpulkan.** ID item diturunkan dari isi, bukan dari urutan:

| Item | Format ID |
|---|---|
| Tahap Bentuk | `L01:shape` |
| Tahap Kun'yomi / On'yomi | `L01:reading:食べます` |
| Tahap Kotoba dalam kalimat | `L01:sentence:毎朝パンを食べます。` |

Menukar urutan baris tidak mengubah ID. Mengubah teks kotoba atau kalimat menghasilkan item baru;
itu disengaja, karena soalnya memang berbeda.

---

## Menambah level

1. Tambahkan baris di spreadsheet (atau satu objek di `levels` pada `content.json`) di **posisi yang
   sesuai urutan pengajaran mata kuliah Hyouki**.
2. Jalankan konverter atau pemeriksa konten.
3. Muat ulang aplikasi. Tidak ada file JS yang perlu diubah.

Level ber-`jlptLevel: "N4"` otomatis muncul di kelompok N4 beserta tombol saringnya. Letakkan level
N4 setelah semua level N5.

## Aturan permainan

Semua ambang ada di bagian atas `js/state.js` sebagai konstanta bernama:

| Konstanta | Nilai | Arti |
|---|---|---|
| `STREAK_TO_MASTER` | 2 | Item dikuasai setelah benar sekian kali berturut-turut. |
| `REQUEUE_GAP_MIN`, `REQUEUE_GAP_MAX` | 2, 3 | Soal yang salah muncul lagi setelah 2–3 soal lain. |
| `REVIEW_EVERY_N_LEVELS` | 3 | Level ulangan disisipkan setiap 3 level. |
| `REVIEW_ITEM_COUNT` | 10 | Jumlah item dalam satu level ulangan. |
| `OPTION_COUNT` | 4 | Jumlah pilihan di tahap 2–4 (jawaban + pengecoh). |
| `STORAGE_BUDGET_CHARS` | 2.500.000 | Perkiraan batas penyimpanan browser, sengaja rendah. |
| `STORAGE_WARNING_RATIO` | 0,8 | Peringatan kapasitas muncul sejak 80% dari perkiraan batas. |

**Alur satu level**

1. **Putaran belajar**: tahap 1–4 berurutan. Setiap item sampai dijawab benar sekali. Soal yang
   salah muncul lagi di tahap yang sama.
2. **Produksi** (tahap 5).
3. **Putaran pemantapan**: semua item yang belum dikuasai, diacak lintas tahap. Jawaban salah
   mengembalikan streak ke 0. Soal yang sama tidak pernah muncul dua kali berturut-turut; jika
   hanya satu soal tersisa, satu item yang sudah dikuasai diselipkan sebagai jeda (dicatat di log
   dengan `phase` = `spacer`).

Level lulus bila semua item tahap 1–4 dikuasai dan tahap 5 sudah dikirim.

**Tahap 3 dan kontras dengan tahap 2.** Di putaran belajar, soal on'yomi didahului kartu yang
menampilkan kotoba kun'yomi dari tahap 2 beserta furigananya. Setelah menjawab soal cara baca apa pun,
umpan balik menampilkan kotoba kun'yomi dan on'yomi berdampingan, ditambah tabel bacaan.

**Tahap 4.** Terjemahan kalimat tidak ditampilkan sebelum menjawab; jika ditampilkan lebih dulu, soal
berubah menjadi mencocokkan arti. Pemain yang benar-benar buntu boleh menekan **Tampilkan arti**.
Jawaban benar setelah bantuan tetap dihitung benar untuk kelulusan, tetapi log mencatat `hintUsed` = 1
sehingga bisa dipisahkan saat analisis.

**Tahap 5.** Tidak ada penilaian benar-salah dan tidak ada skor. Setelah pemain mengirim kalimat,
contoh dari materi ditampilkan sebagai pembanding, lalu pemain memilih "Sudah mirip" atau "Masih
ragu". Kalimat dan penilaian diri disimpan bersama sebagai satu baris log saat penilaian dipilih.
Ada petunjuk bahwa pemain boleh menulis dengan hiragana, beserta cara menambah papan ketik Jepang.

**Cara baca yang belum boleh terlihat.** Cara baca sebuah kotoba (furigana, baris tabel bacaan) hanya
ditampilkan jika soal cara bacanya tidak akan segera muncul: sudah dijawab benar sekali (putaran
belajar), atau sudah dikuasai (tahap Produksi dan putaran pemantapan). Tanpa aturan ini, umpan balik
soal 食べます akan memperlihatkan しょくじ tepat sebelum soal cara baca 食事.

**Level ulangan.** Setelah setiap 3 level, satu level ulangan (R01, R02, …) wajib diselesaikan
sebelum level berikutnya terbuka.
- Isinya 10 item tahap 1–4 yang diambil acak dari semua level yang sudah lulus, **berimbang per level**
  (setiap level terwakili sebelum level yang sama diambil lagi).
- Tanpa putaran belajar dan tanpa Produksi: semua item langsung diacak, dengan aturan penguasaan yang
  sama (benar 2 kali berturut-turut, tidak berdampingan).
- Sampel disimpan saat level ulangan pertama kali dibuka, sehingga keluar lalu masuk lagi
  melanjutkan item yang sama.
- Di log: `levelId` = `R01`, `isReview` = 1, `phase` = `review` (atau `spacer`), dan `itemId` tetap
  menunjukkan level asal item.

**Status terkunci tidak disimpan.** Yang disimpan hanya fakta: streak tiap item, level sudah
dimulai, level sudah lulus. Sebuah level terbuka jika level tepat sebelumnya (termasuk level
ulangan) sudah lulus. Level yang sudah pernah dimulai tidak pernah terkunci lagi, sehingga level
yang disisipkan saat revisi materi tidak menghalangi peserta yang sudah lebih jauh.

## Kemajuan pemain dan reset

Progres disimpan di `localStorage` dengan key `kanjiGame.progress.v1`. **Reset progres** (Pengaturan)
menghapus progres level, membuat `playerId` baru, dan mengosongkan kode peserta. **Riwayat jawaban
tidak ikut terhapus**, karena itu data penelitian.

Jika data progres rusak, aplikasi menyimpan salinannya di key `kanjiGame.progress.v1.corrupt.<waktu>`
dan memulai progres baru.

> Buka aplikasi di **satu tab saja** per perangkat. Dua tab yang terbuka bersamaan saling menimpa
> progres; yang terakhir menyimpan yang berlaku.

## Pengaturan

Dibuka dari tombol **⚙ Pengaturan** di daftar level.

| Bagian | Isi |
|---|---|
| Pemain berikutnya | ID pemain saat ini dan tombol **Reset progres** (dengan konfirmasi). |
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
| `levelId`, `isReview` | Level tempat soal dijawab (`L01`, `R01`, …) dan 1 jika level ulangan. |
| `phase` | `learning`, `consolidation`, `spacer`, `production`, atau `review`. |
| `stage` | `shape`, `kunyomi`, `onyomi`, `sentence`, atau `production`. |
| `itemId` | ID item; diawali ID level asal item. |
| `options` | Pilihan sesuai urutan tampil, dipisah ` \| `. |
| `optionTypes` | Jenis tiap pilihan dengan urutan yang sama: `answer`, `manual`, `manual-cross`, `auto`. |
| `answer`, `answerType` | Pilihan pemain dan jenisnya. `answerType` = `manual-cross` berarti pemain membaca kanji dengan jenis bacaan yang salah. |
| `hintUsed` | Tahap 4 saja: 1 jika **Tampilkan arti** ditekan sebelum menjawab. |
| `isCorrect`, `streakAfter` | 1/0, dan streak item setelah dijawab. |
| `responseMs`, `wasHidden` | Waktu jawab; `wasHidden` = 1 jika tab sempat ditinggalkan, jadi waktunya tidak valid. |
| `selfAssessment`, `containsKanji` | Tahap 5 saja: `similar`/`unsure`, dan 1 jika kalimat memuat kanji level. |

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
- Penanda **Kelas sudah sampai bab Minna** dijelaskan di [Urutan level dan `chapter`](#urutan-level-dan-chapter).

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
      pengecoh sudah diperiksa dengan cara di [Menulis kalimat contoh yang tidak ambigu](#menulis-kalimat-contoh-yang-tidak-ambigu).
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

- [ ] Aplikasi dengan materi final sudah di-deploy ke Netlify, dan tautannya sudah dicoba.
- [ ] Pengujian tim nomor 2 (endpoint Apps Script) sudah lolos, dan `LOG_REMOTE_ENABLED` aktif di versi
      yang di-deploy.
- [ ] Pengujian tim nomor 3 (CSV di iPhone) sudah lolos.
- [ ] Setiap perangkat pameran sudah dicoba: aplikasi terbuka dari tautan Netlify di **satu tab**, satu level
      dimainkan sampai lulus, dan Pengaturan menampilkan **✓ Semua jawaban sudah terkirim**.
- [ ] Setiap perangkat sudah di-**Reset progres** dan log uji coba sudah dihapus setelah diekspor.
- [ ] Bagian [Prosedur pameran](#prosedur-pameran-untuk-penjaga-stan) sudah **dicetak** dan ada di meja stan.
- [ ] Penjaga stan sudah berlatih: reset, mengisi kode peserta, membaca status pengiriman, ekspor CSV, dan
      menangani spanduk tab ganda.
- [ ] Jika ada peserta penelitian: daftar kode peserta anonim (misalnya `K4-01`, `K4-02`, …) sudah disiapkan
      peneliti, terpisah dari daftar nama.
- [ ] Nomor telepon koordinator data tertulis di lembar prosedur.
- [ ] Pengisi daya dan koneksi internet cadangan (misalnya hotspot ponsel) tersedia.
