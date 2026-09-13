# Kanji Bertahap

Web game penunjang untuk belajar kanji dan kotoba N5–N4, bagi mahasiswa semester 1 yang memakai
みんなの日本語初級I. Dikembangkan untuk mata kuliah 教材開発.

- HTML + CSS + JavaScript murni (ES modules). Tanpa framework, tanpa build step, tanpa backend.
- Seluruh materi ada di `data/content.json`. Tidak ada teks materi bahasa Jepang di file JS.
- Progres pemain disimpan di `localStorage` browser.

> **Status:** langkah 1 dari 5 (struktur data, pemuatan, dan validasi). Permainan belum bisa
> dimainkan; kartu level baru membuka pratinjau materi. Bagian README yang ditandai *(menyusul)*
> akan dilengkapi di langkah berikutnya.

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
index.html              halaman utama + pesan untuk file://
css/style.css           tampilan (mobile-first)
data/content.json       SELURUH materi pembelajaran
js/main.js              bootstrap aplikasi, routing antar layar
js/config.js            konfigurasi umum (judul, lokasi content.json)
js/content.js           memuat content.json, mengelompokkan level, menurunkan item soal
js/validate.js          aturan validasi konten (dipakai browser DAN terminal)
js/ruby.js              parser sintaks furigana [漢字|かんじ] dan render <ruby>
js/jp-text.js           pengenalan hiragana/katakana/kanji
js/dom.js               pembuat elemen HTML
tools/csv-to-json.mjs   konversi CSV spreadsheet → data/content.json
tools/validate-content.mjs  pemeriksa konten dari terminal
tools/content-template.csv  contoh CSV (level 食)
```
Menyusul: `js/state.js`, `js/logger.js`, `js/session.js`, `js/distractors.js`, `js/stages/`.

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
| `reading_distractors` | *Daftar, boleh kosong.* Pengecoh cara baca buatan tim | |
| `example_ja` | Kalimat dengan sintaks furigana | `[毎朝\|まいあさ]パンを[食\|た]べます。` |
| `example_blank` | Bagian kalimat yang dikosongkan di tahap 4 | `食べます` |
| `example_translation` | Terjemahan | `Setiap pagi saya makan roti.` |
| `example_distractors` | *Daftar, boleh kosong.* Pengecoh buatan tim untuk tahap 4 | |

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
| `pos` | ya | Kelas kata; dipakai memilih pengecoh yang sejenis di tahap 4. |
| `meaning` | ya | Arti kotoba. |
| `chapter` | ya | Bab kotoba muncul di みんなの日本語初級I, atau `null`. |
| `note` | tidak | Catatan untuk umpan balik, misalnya perubahan bunyi. |
| `readingDistractors` | tidak | Pengecoh cara baca buatan tim; dipakai lebih dulu sebelum pengecoh otomatis. |
| `examples` | ya | Daftar contoh kalimat (boleh `[]`). |

**Contoh kalimat**

| Field | Wajib | Keterangan |
|---|---|---|
| `ja` | ya | Kalimat dengan sintaks furigana. |
| `blank` | ya | Lihat [Aturan `blank`](#aturan-blank). |
| `translation` | ya | Terjemahan bahasa Indonesia. |
| `distractors` | tidak | Pengecoh buatan tim untuk tahap 4. |

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

## Kemajuan pemain dan reset *(menyusul di langkah 4)*
