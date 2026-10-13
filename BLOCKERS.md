# Penghambat Uji Coba Sungguhan

Daftar hal yang masih menghalangi *Kanji Bertahap* (versi peta) dipakai untuk validasi ahli, pameran, dan uji coba
penelitian, termasuk yang bukan pekerjaan kode. Ditulis ulang 2026-10-13, di akhir pembangunan versi peta; versi
lama berbasis level disimpan di tag git `v1-akhir`.

**Cara memakai:** perbarui status setiap butir saat ada kemajuan. Status: **Terbuka**, **Sebagian**,
**Teratasi**, atau **Diterima** (risiko diterima dengan prosedur, tidak akan dikerjakan).

Rincian alasan keputusan ada di `DECISIONS.md`; langkah kerja ada di `README.md`.

**Pengerjaan fitur sudah berhenti.** Pekerjaan kode berikutnya datang bersama materi lengkap dan aset dari tim:
memasukkan materi, mengganti aset, dan memperbaiki apa yang ditemukan saat materi itu dimainkan.

---

## Materi (paling berat)

Materi impor tim saat ini (bab 1–5 dari `konteks.docx` dan `jukugo.txt`: 5 wilayah, 40 quest, 41 kanji, 66 kotoba)
ada sebagai lima CSV di `sumber/impor/` di komputer pengembang (tidak masuk git). Pemeriksa materi melaporkan
12 error dan 273 peringatan; rinciannya di butir 1–4.

### 1. Nama tokoh, perusahaan, dan universitas — **Terbuka**
Nama dari buku diganti penanda: `«NAMA-TOKOH-1»`…`«NAMA-TOKOH-5»`, `«NAMA-PERUSAHAAN-1»`, `«NAMA-PERUSAHAAN-2»`,
`«NAMA-UNIVERSITAS-1»`, `«NAMA-UNIVERSITAS-2»` (12 tempat). Penanda ini **selalu error**, sehingga materi impor
belum bisa dimuat aplikasi sama sekali sampai tim mengisi nama buatan sendiri (D-95). Nama tokoh lawan bicara di
`data/characters.json` (`«NAMA-TOKOH-LAWAN-BICARA»`) juga belum diisi.

### 2. Isi yang belum ada di dokumen tim — **Terbuka**
Ditandai `«BELUM DIISI: …»` (peringatan selama draf, error saat rilis):
- terjemahan setiap baris percakapan (79);
- arti kanji (41) dan arti kotoba (32);
- nama dan ringkasan wilayah (5 + 5);
- pengecoh cara baca yang harus ditulis ulang (10) dan penjelasan perubahan bunyi (4);
- satu percakapan pengantar, satu deskripsi adegan, dan satu kalimat yang harus ditulis ulang
  (`«TULIS ULANG: …»`).

### 3. Percakapan uji untuk semua quest — **Terbuka**
Tidak ada di dokumen tim, dan pengembang tidak menulisnya (semua percakapan ditulis tim). Selama draf, quest bisa
dimainkan tanpa langkah uji dan bertanda belum lengkap (D-92). Setiap quest butuh minimal satu percakapan uji dengan
satu bagian kosong dan minimal tiga pengecoh manual yang sudah diperiksa orang lain (README: Menulis pengecoh,
Menulis kalimat uji yang tidak ambigu). Ini beban terbesar: 40 quest untuk bab 1–5 saja.

### 4. Verifikasi terhadap buku dan data draf pengembang — **Terbuka**
- `sentence_chapter` semua percakapan masih `?` (40).
- Data yang diisi pengembang sebagai draf dan wajib diperiksa tim: furigana di semua baris percakapan, bushu dan
  pilihannya, jumlah guratan, daftar kun'yomi dan on'yomi, JLPT, `reading_type`, `pos`. Daftar per jenisnya di
  `sumber/impor/DAFTAR-VERIFIKASI.md`.
- 4 bacaan yang belum tercantum di tabel kanji (`READING_NOT_LISTED`), 1 kotoba dengan pengecoh kurang dari tiga, dan
  1 pengecoh yang sama dengan bacaan sah kanji (`DISTRACTOR_IS_KANJI_READING`, 万: ばん).
- Bab 6–12 belum ada sama sekali; `data/content.json` di repo masih contoh bab 6 dengan percakapan sementara.
- `contentRevision` tetap `draft-0` sampai semuanya terverifikasi, lalu dinaikkan tim saat konversi.
- **Kolom baru di tab `wilayah`:** `pin_segment` (sebelum `pin_x`) untuk peta bersambung (D-108). Jika CSV impor
  sudah dimasukkan ke Google Sheets sebelum 2026-10-13, tambahkan kolom itu (boleh kosong); pemeriksa materi menolak
  tab tanpa kolom ini dan menyebut namanya.

### 5. Keputusan dosen — **Terbuka**
Lihat daftar "Menunggu keputusan dosen" di awal `DECISIONS.md`:
- kanji yang sekaligus bushu (16 dari 41 kanji materi tim): soal Bentuk diganti kartu perkenalan tanpa nilai
  (D-15/D-90);
- tampilan okurigana (D-18);
- pengecoh lintas jenis bacaan (D-20);
- redaksi teks persetujuan (D-50);
- lisensi data urutan guratan KanjiVG (D-66).

---

## Aset dari tim

### 6. Gambar belum diserahkan — **Sebagian**
Karakter Hana dan Kazu sudah ada (1080×1080, D-107). Yang masih placeholder atau belum ada, dengan spesifikasi di
`ASSETS.md`:
- **potongan peta** `assets/peta/potongan-01.png` … (1080×1440, maks 150 KB; empat potongan diusulkan untuk bab 1–12;
  panduan sambungan antarpotongan, D-108);
- ikon lokasi per wilayah (`assets/lokasi/B01.png` …);
- ikon menu (tiga);
- ilustrasi adegan per percakapan (`assets/adegan/<ID percakapan>.png`), opsional tetapi ditunggu;
- motif jalur (opsional).
Setelah potongan peta jadi, tim konten mengisi posisi setiap lokasi (`pin_segment`, `pin_x`, `pin_y`).

### 7. Urutan guratan — **Terbuka** (menunggu D-66)
Tempat untuk urutan guratan sudah disiapkan, tetapi **tidak ada data guratan di repo** sampai lisensinya diputuskan.

---

## Penelitian (bukan pekerjaan kode, tetapi menentukan)

### 8. Persetujuan peserta — **Sebagian**
Layar persetujuan, pilihan "Main tanpa merekam", penarikan persetujuan dengan penghapusan data (D-53), dan
pengaman yang mematikan pengiriman selama teks masih placeholder (D-52) sudah dibangun. Yang belum: **redaksi teks
persetujuan yang disetujui dosen pembimbing** (saat ini placeholder). Selama itu belum ada, tidak ada data yang
dapat terkirim ke spreadsheet.

### 9. Instrumen penelitian — **Terbuka**
Pretest dan posttest, lembar validasi ahli (pratinjau cetak sudah menyediakan kotak catatan per quest, D-109),
daftar kode peserta anonim yang disimpan terpisah dari daftar nama, dan rencana analisis log. Kolom log sudah
terdefinisi (README bagian "Log jawaban"), tetapi belum ada skrip analisisnya.

### 10. Durasi sesi belum diukur — **Terbuka**
Jadwal uji coba perlu tahu berapa menit dibutuhkan per quest dan per 復習. Ukur dari kolom `timestamp` dan
`sessionId` pada uji coba internal setelah percakapan uji tersedia.

---

## Teknis dan logistik

### 11. Aplikasi belum di-deploy; endpoint Apps Script belum dibuat — **Sebagian**
Langkah menaruh aplikasi di Netlify tanpa baris perintah (dengan daftar folder yang diunggah: `index.html`, `css/`,
`js/`, `data/`, `assets/`, `tools/`) dan langkah membuat endpoint Apps Script sudah ditulis di README. Belum
dijalankan.

### 12. Aplikasi butuh jaringan saat dibuka — **Diterima**
Aplikasi tidak menyimpan dirinya untuk dipakai offline (PWA tidak dibangun, keputusan disetujui). Jika jaringan
pameran mati sebelum halaman dimuat, aplikasi tidak bisa dibuka; setelah terbuka, permainan tetap jalan asal
halaman tidak dimuat ulang. Dikendalikan lewat prosedur pagi hari di README.

### 13. Pengujian yang belum bisa dilakukan pengembang — **Terbuka**
Sesuai urutan prioritas di README bagian "Pengujian yang wajib dijalankan tim":
1. cetak pratinjau di Safari dan Firefox (sebelum validasi ahli; baru diuji di Chrome);
2. endpoint Apps Script di akun Google sungguhan (jauh sebelum pameran);
3. unduhan CSV di iPhone (sebelum pameran).

Ditambah: uji di perangkat nyata (Android kelas bawah, iPhone), termasuk menggulir peta bersambung dan
pemuatan potongan; tampilan karakter bushu seperti 飠 dan 丨 di font bawaan Android; dan uji keterbacaan dengan
mahasiswa sungguhan.

### 14. Konverter CSV membutuhkan Node.js — **Teratasi**
Tim konten memakai `tools/convert.html` di browser (D-49). Halaman ini dibuka dari situs Netlify atau server
lokal, jadi bergantung pada butir 11.

### 15. Urutan kanji dari mata kuliah Hyouki — **Teratasi** (tidak berlaku lagi)
Hanya dibutuhkan versi level (tag `v1-akhir`). Versi peta mengikuti bab Minna (D-55).
