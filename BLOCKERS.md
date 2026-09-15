# Penghambat Uji Coba Sungguhan

Daftar hal yang masih menghalangi *Kanji Bertahap* dipakai dalam uji coba sungguhan, termasuk yang bukan
pekerjaan kode. Disusun di akhir pembangunan scaffold (2026-09-14) dan diperbarui 2026-09-15.

**Cara memakai:** perbarui status setiap butir saat ada kemajuan. Status: **Terbuka**, **Sebagian**,
**Teratasi**, atau **Diterima** (risiko diterima dengan prosedur, tidak akan dikerjakan).

Rincian alasan keputusan ada di `DECISIONS.md`; langkah kerja ada di `README.md`.

---

## Materi (paling berat)

### 1. Urutan kanji dari mata kuliah Hyouki belum diterima — **Terbuka**
Urutan level mengikuti urutan pengajaran Hyouki (D-39). Tanpa urutan itu, materi sungguhan belum bisa mulai
disusun; tiga level di `data/content.json` hanya contoh dengan urutan sementara.

### 2. Penulisan 25–30 level — **Terbuka**
Setiap level membutuhkan bushu dan pilihannya, bacaan, kotoba, contoh kalimat, minimal 3 pengecoh manual per
kalimat, dan `sentenceChapter` per kalimat. Pengalaman dengan tiga level contoh menunjukkan bahwa **pengecoh
yang ternyata juga benar** adalah cacat yang paling sering muncul (T-12), sehingga setiap kalimat perlu
diperiksa orang lain. Pemeriksa materi di browser (`tools/convert.html`) sudah tersedia untuk memeriksa pekerjaan
sendiri.

### 3. Verifikasi terhadap buku — **Terbuka**
- Bab kotoba 食事, 元気, dan 天気 belum terverifikasi.
- Semua nilai `sentenceChapter` di data contoh adalah perkiraan pengembang.
- Kalimat dan pengecoh draf untuk 食堂 dan 電気 (D-42) belum diperiksa tim konten.
- `contentRevision` harus tetap `draft-0` sampai semuanya terverifikasi, lalu dinaikkan.

### 4. Keputusan dosen — **Terbuka**
Lihat daftar "Menunggu keputusan dosen" di awal `DECISIONS.md`: varian soal tahap Bentuk (D-15), tampilan
okurigana (D-18), pengecoh lintas jenis bacaan (D-20), dan redaksi teks persetujuan (D-50).

---

## Penelitian (bukan pekerjaan kode, tetapi menentukan)

### 5. Persetujuan peserta — **Sebagian**
Layar persetujuan, pilihan "Main tanpa merekam", penarikan persetujuan dengan penghapusan data (D-53), dan
pengaman yang mematikan pengiriman selama teks masih placeholder (D-52) sudah dibangun. Yang belum: **redaksi teks
persetujuan yang disetujui dosen pembimbing** (saat ini placeholder). Selama itu belum ada, tidak ada data yang
dapat terkirim ke spreadsheet.

### 6. Instrumen penelitian — **Terbuka**
Pretest dan posttest, lembar validasi ahli, daftar kode peserta anonim yang disimpan terpisah dari daftar nama,
dan rencana analisis log. Kolom log sudah terdefinisi (README bagian "Log jawaban"), tetapi belum ada skrip
analisisnya.

### 7. Durasi sesi belum diukur — **Terbuka**
Jadwal uji coba perlu tahu berapa menit dibutuhkan per level dan per level ulangan. Dengan 30 level ada 10 level
ulangan. Ukur dari kolom `timestamp` dan `sessionId` pada uji coba internal.

---

## Teknis dan logistik

### 8. Aplikasi belum di-deploy; endpoint Apps Script belum dibuat — **Sebagian**
Langkah menaruh aplikasi di Netlify tanpa baris perintah dan langkah membuat endpoint Apps Script sudah ditulis di
README. Belum dijalankan. Tautan untuk validator dibutuhkan lebih cepat dari rencana awal.

### 9. Aplikasi butuh jaringan saat dibuka — **Diterima**
Aplikasi tidak menyimpan dirinya untuk dipakai offline (PWA tidak dibangun, keputusan disetujui). Jika jaringan
pameran mati sebelum halaman dimuat, aplikasi tidak bisa dibuka; setelah terbuka, permainan tetap jalan asal
halaman tidak dimuat ulang. Dikendalikan lewat prosedur pagi hari di README.

### 10. Pengujian yang belum bisa dilakukan pengembang — **Terbuka**
Sesuai urutan prioritas di README bagian "Pengujian yang wajib dijalankan tim":
1. cetak pratinjau di Safari dan Firefox (sebelum validasi ahli);
2. endpoint Apps Script di akun Google sungguhan (jauh sebelum pameran);
3. unduhan CSV di iPhone (sebelum pameran).

Ditambah: uji di perangkat nyata (Android kelas bawah, iPhone), tampilan karakter bushu seperti 飠 dan 丨 di font
bawaan Android, dan uji keterbacaan dengan mahasiswa sungguhan.

### 11. Konverter CSV membutuhkan Node.js — **Teratasi**
Tim konten memakai `tools/convert.html` di browser (D-49). Halaman ini dibuka dari situs Netlify atau server
lokal, jadi bergantung pada butir 8.
