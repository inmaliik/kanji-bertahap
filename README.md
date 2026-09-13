# Kanji Bertahap

Web game penunjang untuk belajar kanji dan kotoba N5–N4, bagi mahasiswa semester 1 yang memakai
みんなの日本語初級I. Dikembangkan untuk mata kuliah 教材開発.

- HTML + CSS + JavaScript murni (ES modules). Tanpa framework, tanpa build step, tanpa backend.
- Seluruh materi ada di `data/content.json`. Tidak ada teks materi bahasa Jepang di file JS.
- Progres pemain disimpan di `localStorage` browser.

> **Status:** langkah 3 dari 5. Kelima tahap bisa dimainkan dan level bisa lulus. Level ulangan,
> ekspor CSV, kode peserta, dan pengiriman log dibangun di langkah 4. Bagian README yang ditandai
> *(menyusul)* akan dilengkapi di langkah berikutnya.
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
js/storage.js               pembungkus localStorage yang tidak pernah error
js/content.js               memuat content.json, mengelompokkan level, menurunkan item soal
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
js/screens/preview.js       pratinjau materi dan pemeriksaan konten
js/screens/settings.js      pengaturan (reset progres, jumlah log, tautan pratinjau)

tools/csv-to-json.mjs       konversi CSV spreadsheet → data/content.json
tools/validate-content.mjs  pemeriksa konten dari terminal
tools/lib/print-issues.mjs  tampilan error/peringatan di terminal
tools/content-template.csv  contoh CSV (level 食)
```
DECISIONS.md                catatan keputusan desain beserta alasannya

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
| `level_chapter` | Bab level; harus = bab terkecil dari kotobanya. `-` jika di luar buku | `6` |
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
| `word_chapter` | Bab kotoba muncul di buku. `-` jika di luar buku | `6` |
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
| `id` | ya | Huruf latin/angka/`-`/`_`. Unik. Format `R` + angka dicadangkan untuk level ulangan. |
| `kanji` | ya | Tepat satu kanji, unik di seluruh materi. |
| `meaning` | ya | Arti kanji (bahasa Indonesia). |
| `jlptLevel` | ya | `N5`, `N4` (juga `N3`–`N1` untuk masa depan). Menentukan kelompok di daftar level. |
| `chapter` | ya | Bilangan 1–50 atau `null`. Harus sama dengan bab terkecil dari `kotoba[].chapter`. |
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
| `chapter` | ya | Bab kotoba muncul di みんなの日本語初級I, atau `null`. |
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

Nomor bab di bawah ini **belum diperiksa** terhadap みんなの日本語初級I. Tim konten mencentang
setiap baris setelah memeriksanya langsung di buku. `contentRevision` tetap `draft-0` sampai
semua baris dicentang.

Yang diperiksa adalah bab kotoba; bab level dihitung dan dicek otomatis dari kotobanya.

- [ ] **L01 食** (bab level tercatat: 6)
  - [ ] 食べます — bab 6
  - [ ] 食事 — bab 13
- [ ] **L02 飲** (bab level tercatat: 6)
  - [ ] 飲みます — bab 6
- [ ] **L03 気** (bab level tercatat: 8)
  - [ ] 元気 — bab 8
  - [ ] 天気 — bab 12

Daftar ini disalin manual dari `data/content.json` pada revisi `draft-0`. Perbarui daftar ini
setiap kali level atau kotoba ditambahkan.

## Aturan urutan dan `chapter`

- `chapter` level = **bab terkecil dari kotoba yang ada di level itu**. Kotoba lain di buku yang
  tidak dimasukkan ke level tidak dihitung (contoh: 食堂 muncul di 第3課, tetapi tidak ada di level 食,
  jadi level 食 tetap bab 6).
- Level harus berurutan menurut `jlptLevel` (N5 dulu), lalu `chapter` menaik (`null` di akhir
  kelompoknya). Pelanggaran adalah **error**: jika dibiarkan, level bab awal akan terkunci di belakang
  level bab akhir.

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
   sesuai urutan bab**.
2. Jalankan konverter atau pemeriksa konten.
3. Muat ulang aplikasi. Tidak ada file JS yang perlu diubah.

Level ber-`jlptLevel: "N4"` otomatis muncul di kelompok N4 beserta tombol saringnya.

## Mengaktifkan pengiriman log *(menyusul di langkah 4)*

## Aturan permainan

Semua ambang ada di bagian atas `js/state.js` sebagai konstanta bernama:

| Konstanta | Nilai | Arti |
|---|---|---|
| `STREAK_TO_MASTER` | 2 | Item dikuasai setelah benar sekian kali berturut-turut. |
| `REQUEUE_GAP_MIN`, `REQUEUE_GAP_MAX` | 2, 3 | Soal yang salah muncul lagi setelah 2–3 soal lain. |
| `REVIEW_EVERY_N_LEVELS` | 3 | Level ulangan disisipkan setiap 3 level. |
| `REVIEW_ITEM_COUNT` | 10 | Jumlah item dalam satu level ulangan. |
| `OPTION_COUNT` | 4 | Jumlah pilihan di tahap 2–4 (jawaban + pengecoh). |

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

**Tahap 4.** Terjemahan kalimat baru ditampilkan setelah menjawab. Jika ditampilkan lebih dulu, soal
berubah menjadi mencocokkan arti, bukan membaca kalimat.

**Tahap 5.** Tidak ada penilaian benar-salah dan tidak ada skor. Setelah pemain mengirim kalimat,
contoh dari materi ditampilkan sebagai pembanding, lalu pemain memilih "Sudah mirip" atau "Masih
ragu". Kalimat dan penilaian diri disimpan bersama sebagai satu baris log saat penilaian dipilih.
Ada petunjuk bahwa pemain boleh menulis dengan hiragana, beserta cara menambah papan ketik Jepang.

**Cara baca yang belum boleh terlihat.** Cara baca sebuah kotoba (furigana, baris tabel bacaan) hanya
ditampilkan jika soal cara bacanya tidak akan segera muncul: sudah dijawab benar sekali (putaran
belajar), atau sudah dikuasai (tahap Produksi dan putaran pemantapan). Tanpa aturan ini, umpan balik
soal 食べます akan memperlihatkan しょくじ tepat sebelum soal cara baca 食事.

**Status terkunci tidak disimpan.** Yang disimpan hanya fakta: streak tiap item, level sudah
dimulai, level sudah lulus. Sebuah level terbuka jika level tepat sebelumnya (termasuk level
ulangan) sudah lulus. Level yang sudah pernah dimulai tidak pernah terkunci lagi, sehingga level
yang disisipkan saat revisi materi tidak menghalangi peserta yang sudah lebih jauh.

## Kemajuan pemain dan reset

Progres disimpan di `localStorage` dengan key `kanjiGame.progress.v1`. Tombol **Reset progres**
ada di Pengaturan: semua progres level dihapus dan pemain berikutnya mendapat `playerId` baru.
**Riwayat jawaban tidak ikut terhapus**, karena itu data penelitian.

Jika data progres rusak, aplikasi menyimpan salinannya di key `kanjiGame.progress.v1.corrupt.<waktu>`
dan memulai progres baru.

## Log jawaban *(ekspor CSV dan pengiriman menyusul di langkah 4)*

Setiap jawaban dicatat di `localStorage` (key `kanjiGame.log.v1` dan `kanjiGame.log.v1.chunk.N`).
Daftar lengkap kolom ada di `LOG_COLUMNS` dalam `js/logger.js`. Kolom yang penting untuk analisis:

| Kolom | Isi |
|---|---|
| `contentRevision` | Revisi materi saat soal dijawab; memisahkan data antarputaran revisi. |
| `phase` | `learning`, `consolidation`, `spacer`, atau `production`. |
| `stage` | `shape`, `kunyomi`, `onyomi`, `sentence`, atau `production`. |
| `options` | Pilihan sesuai urutan tampil, dipisah ` \| `. |
| `optionTypes` | Jenis tiap pilihan dengan urutan yang sama: `answer`, `manual`, `manual-cross`, `auto`. |
| `answer`, `answerType` | Pilihan pemain dan jenisnya. `answerType` = `manual-cross` berarti pemain membaca kanji dengan jenis bacaan yang salah. |
| `isCorrect`, `streakAfter` | 1/0, dan streak item setelah dijawab. |
| `responseMs`, `wasHidden` | Waktu jawab; `wasHidden` = 1 jika tab sempat ditinggalkan, jadi waktunya tidak valid. |
| `selfAssessment`, `containsKanji` | Tahap 5 saja: `similar`/`unsure`, dan 1 jika kalimat memuat kanji level. |

Jika daftar kolom berubah di versi berikutnya, log lama di perangkat otomatis disusun ulang ke urutan
kolom baru saat aplikasi dibuka.
