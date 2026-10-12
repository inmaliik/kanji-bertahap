# Catatan Keputusan Desain

Dokumen ini mencatat setiap keputusan desain pada web game *Kanji Bertahap* beserta alasannya dan
alternatif yang ditolak. Tujuannya menyediakan bahan yang dapat dikutip langsung dalam laporan
pengembangan dan bab metodologi, tanpa perlu merekonstruksi alasan dari riwayat commit.

**Aturan pemakaian.** Setiap keputusan baru ditambahkan di akhir bagian yang sesuai dengan nomor
berikutnya. Keputusan lama tidak dihapus; jika diganti, tambahkan keputusan baru dan tandai yang lama
dengan *Digantikan oleh D-xx*. Status *Menunggu dosen* berarti keputusan berlaku sementara dan akan
ditinjau bersama dosen pengampu.

Kode A1–A11 merujuk pada daftar masalah spesifikasi yang dibahas pada putaran perencanaan pertama.

---

## Menunggu keputusan dosen

Daftar ringkas untuk dibawa ke pertemuan dengan dosen pengampu. Rincian alasan ada di entri masing-masing.

- **D-15 / D-90** — Kanji yang sekaligus bushu (人, 日, 月, …; 16 dari 41 kanji materi tim): di cabang `desain-peta` soal Bentuk diganti kartu perkenalan tanpa nilai. Apakah ini diterima?
- **D-18** — Tabel cara baca menampilkan okurigana redup (た + べる kecil) alih-alih notasi bentuk kamus た(べる): apakah tampilan ini diterima?
- **D-20** — Pengecoh lintas jenis bacaan (misalnya しょくべます untuk 食べます): bolehkah bentuk yang salah ditampilkan kepada pemula?
- **D-50** — Redaksi teks layar persetujuan peserta (saat ini placeholder): apa isi yang disetujui?
- **D-66** — Lisensi data urutan guratan KanjiVG (CC BY-SA 3.0): boleh dipakai, dan bagaimana atribusinya? Sampai diputuskan, tidak ada data guratan di repo.

*Terakhir diperbarui: 2026-10-13.*

---

## Bagian 1 — Keputusan desain

### D-01 · Aplikasi dijalankan lewat server lokal, materi tetap JSON murni
**Tanggal:** 2026-09-13. **Keputusan:** Materi disimpan sebagai `data/content.json` dan kode memakai ES
modules, sehingga aplikasi harus dibuka lewat server (Live Server di VS Code, `python3 -m http.server`,
atau Netlify). Jika dibuka langsung dari disk, halaman menampilkan petunjuk konkret cara menjalankannya.
**Alasan:** Browser memblokir ES modules dan pemuatan file JSON dari alamat `file://`, sehingga klik ganda
pada `index.html` menghasilkan layar kosong. Materi akan dihasilkan dari spreadsheet oleh anggota tim
yang bukan programmer, jadi formatnya harus JSON murni yang tidak mudah rusak. Validator ahli mengakses
versi Netlify. **Alternatif ditolak:** Menyimpan materi sebagai `content.js` bergaya
`window.CONTENT = {...}` tanpa modules; cara ini bisa dibuka dengan klik ganda, tetapi file datanya
bukan JSON murni dan mudah rusak saat disunting.

### D-02 · Bagian yang dikosongkan ditulis eksplisit di field `blank`, ditambah field `pos` (A2)
**Tanggal:** 2026-09-13. **Keputusan:** Setiap contoh kalimat memuat field `blank` berisi teks persis
yang dikosongkan di tahap 4 (misalnya `食べます`), dan setiap kotoba memuat kelas kata `pos`.
**Alasan:** Kalimat memakai bentuk berkonjugasi (`毎朝パンを食べます。`) sehingga kotoba bentuk dasar tidak
dapat dicari di dalamnya; kode tidak dapat menentukan bagian yang dikosongkan tanpa penanda eksplisit.
Kelas kata diperlukan agar pengecoh sebentuk dengan jawaban. **Alternatif ditolak:** Mencari `word` di
dalam kalimat secara otomatis, yang gagal untuk semua kata kerja berkonjugasi.

### D-03 · Furigana ditulis langsung di dalam kalimat dengan sintaks `[漢字|かんじ]` (A3)
**Tanggal:** 2026-09-13. **Keputusan:** Furigana ditulis sebaris dengan kalimat, misalnya
`[毎朝|まいあさ]パンを[食|た]べます。`, dan field `reading` per kalimat dihapus. Parser menolak sintaks yang
salah dengan pesan yang menyebut level, kotoba, nomor contoh, dan karakter yang bermasalah, termasuk
tanda kurung lebar penuh dari IME Jepang. **Alasan:** Mencocokkan bacaan satu kalimat penuh ke setiap
kanji hanya dapat dilakukan dengan tebakan, dan kesalahan penempatan furigana tidak akan terdeteksi
padahal pasti ditandai validator ahli. Sintaks akan ditulis manual oleh tim konten, sehingga kesalahannya
harus dilaporkan dengan jelas, bukan gagal diam-diam. **Alternatif ditolak:** Mempertahankan field
`reading` per kalimat dan menyelaraskannya otomatis dengan kanji.

### D-04 · Field terjemahan bernama `translation` (A4)
**Tanggal:** 2026-09-13. **Keputusan:** Terjemahan contoh kalimat disimpan di `translation`.
**Alasan:** Nama `id` pada spesifikasi awal bentrok dengan `id` level dan `itemId` di log, sehingga
membingungkan tim konten maupun analisis data. **Alternatif ditolak:** Mempertahankan nama `id`.

### D-05 · ID item diturunkan dari isi materi; revisi materi dicatat di setiap baris log (A5)
*Diubah oleh D-57 di cabang `desain-peta`: format ID item baru.*
**Tanggal:** 2026-09-13. **Keputusan:** ID item dibentuk dari isinya (`L01:shape`,
`L01:reading:食べます`, `L01:sentence:<kalimat>`, `L01:production`), bukan dari posisi dalam array.
Versi dipecah menjadi `schemaVersion` (struktur data) dan `contentRevision` (revisi materi), dan
`contentRevision` ikut tercatat di setiap baris log. ID level tidak boleh diganti setelah data mulai
dikumpulkan. **Alasan:** Materi akan direvisi dua putaran; ID berbasis posisi akan berubah ketika urutan
baris ditukar, sehingga progres rusak dan data antarrevisi tidak dapat dibandingkan. Mencatat revisi
di setiap jawaban memungkinkan analisis sebelum dan sesudah tiap putaran revisi. **Alternatif ditolak:**
ID berbasis urutan array, dan satu field `version` untuk dua makna berbeda.

### D-06 · Penguasaan diuji ulang di Putaran Pemantapan, bukan dengan pengulangan langsung (A6)
**Tanggal:** 2026-09-13. **Keputusan:** Tahap 1–4 dijalankan berurutan sekali sebagai putaran belajar
(setiap item sampai benar sekali), lalu tahap 5, lalu Putaran Pemantapan yang mengacak semua item yang
belum dikuasai lintas tahap. Item dikuasai setelah benar dua kali berturut-turut; jawaban salah
mengembalikan streak ke 0 dan item muncul lagi 2–3 soal kemudian. **Alasan:** Tahap Bentuk dan sebagian
tahap cara baca hanya berisi satu item per level, sehingga "benar dua kali berturut-turut" dengan
pengulangan langsung hanya mengukur ingatan jangka pendek. Masalah yang ingin diatasi produk ini adalah
retensi. **Alternatif ditolak:** Mengulang soal yang sama segera setelah dijawab.

### D-07 · Jenis bacaan `special`, tahap kosong dilewati, dan field `note` (A7)
**Tanggal:** 2026-09-13. **Keputusan:** `readingType` menerima `kunyomi`, `onyomi`, dan `special`
(jukujikun atau bacaan campuran seperti 今日); kotoba `special` hanya muncul di tahap 4. Tahap yang tidak
memiliki item dilewati otomatis. Field opsional `note` menampung penjelasan perubahan bunyi.
**Alasan:** Banyak kanji N5 tidak memiliki kotoba kun'yomi pada tingkat N5 (misalnya 語, 円, 学), dan
beberapa kotoba dasar tidak dapat digolongkan kun'yomi atau on'yomi. **Alternatif ditolak:** Mewajibkan
setiap level memiliki kedua jenis bacaan.

### D-08 · Pengecoh manual didahulukan dari pengecoh otomatis (A8)
**Tanggal:** 2026-09-13. **Keputusan:** Tim konten dapat mengisi pengecoh sendiri; isian manual dipakai
lebih dulu dan kekurangannya diisi otomatis. *Untuk tahap 4, dipersempit oleh D-19; untuk pengecoh
lintas jenis bacaan, dilengkapi oleh D-20.* **Alasan:** Kualitas pengecoh hampir pasti dikritik validator
ahli, sehingga harus dapat dikendalikan manusia. **Alternatif ditolak:** Pengecoh sepenuhnya otomatis.

### D-09 · Bushu 食 dicatat sebagai 食, bentuk samping dicatat terpisah
**Tanggal:** 2026-09-13. **Keputusan:** Bushu 食 adalah 食; bentuk samping 飠 (shokuhen) dicatat di
`bushu.variants`. Bushu 飲 adalah 飠 dengan varian 食. Varian tidak boleh dipakai sebagai pengecoh.
**Alasan:** Menurut kamus, 飠 adalah bentuk samping dari radikal 食 yang muncul pada 飲, 飯, dan 館, bukan
bushu dari 食 itu sendiri. Menampilkan varian sebagai pengecoh membuat soal memiliki jawaban yang dapat
dianggap benar. **Alternatif ditolak:** Contoh pada spesifikasi awal yang mencatat bushu 食 sebagai 飠.

### D-10 · Level placeholder 行 diganti 気
*Tidak berlaku lagi di cabang `desain-peta`: level diganti wilayah (D-58).*
**Tanggal:** 2026-09-13. **Keputusan:** Tiga level contoh adalah 食 (bab 6), 飲 (bab 6), dan 気 (bab 8).
**Alasan:** 行 muncul di bab 5, sehingga urutan 食 → 飲 → 行 melanggar aturan bab menaik (D-11) dan akan
membuat level bab awal terkunci di belakang level bab akhir. Dengan 気, 食 tetap menjadi level pertama
yang utuh, dan scaffold sekaligus menguji dua kasus tahap kosong: 飲 tanpa kotoba on'yomi N5, 気 tanpa
kotoba kun'yomi N5. **Alternatif ditolak:** Mengurutkan ulang menjadi 行 → 食 → 飲 (pengunjung pameran
akan memainkan level placeholder lebih dulu), dan menurunkan aturan urutan bab menjadi peringatan.
*Catatan 2026-09-14: alasan urutan bab tidak berlaku lagi sejak D-39; 気 tetap dipakai sebagai level contoh.*

### D-11 · Definisi `chapter` dan urutan level *(Digantikan oleh D-39)*
**Tanggal:** 2026-09-13. **Keputusan:** Setiap kotoba mencatat nomor bab kemunculannya di
みんなの日本語初級I. `chapter` level harus sama dengan bab terkecil dari kotoba yang ada di level itu, dan
validator memeriksanya. Level harus berurutan menurut JLPT (N5 lebih dulu) lalu bab menaik; pelanggaran
urutan adalah error yang ditampilkan paling mencolok. **Alasan:** Tanpa definisi yang tegas, nomor bab
ambigu: 食堂 sudah muncul di 第3課 dan 銀行 di 第4課, lebih awal dari 食べます dan 行きます. Definisi berbasis
kotoba di level dapat diverifikasi dari data. Urutan array menentukan urutan buka kunci, sehingga urutan
bab yang salah langsung merusak alur belajar. **Alternatif ditolak:** Bab pertama kanji muncul di buku
dalam bentuk kotoba apa pun (tidak dapat diperiksa dari data), dan definisi tanpa pemeriksaan otomatis.

### D-12 · Kata kerja ditulis dalam bentuk ます
**Tanggal:** 2026-09-13. **Keputusan:** Field `word` untuk kata kerja memakai bentuk ます (食べます).
**Alasan:** みんなの日本語初級I memperkenalkan kata kerja dalam bentuk ます; bentuk kamus baru diajarkan di
第18課, kemungkinan setelah semester 1. **Alternatif ditolak:** Bentuk kamus (食べる) sesuai contoh
spesifikasi awal dan konvensi daftar JLPT.

### D-13 · Level ulangan wajib diselesaikan sebelum level berikutnya terbuka (A10)
*Diubah oleh D-63 di cabang `desain-peta`: 復習 per wilayah.*
**Tanggal:** 2026-09-13. **Keputusan:** Setiap tiga level, satu level ulangan disisipkan (R01 setelah
L03). Level ulangan harus lulus sebelum level sesudahnya terbuka. **Alasan:** Level yang boleh dilewati
akan dilewati, dan tujuan level ulangan, yaitu mencegah lupa pada materi lama, hilang. Tanpa itu produk
tampak baik saat demo tetapi lemah saat diuji efektivitasnya. **Alternatif ditolak:** Level ulangan
opsional.

### D-14 · Reset progres tidak menghapus log; kode peserta opsional dan anonim (A11)
**Tanggal:** 2026-09-13. **Keputusan:** Tombol reset menghapus progres level dan membuat `playerId`
baru, tetapi riwayat jawaban tetap tersimpan; penghapusan log adalah tindakan terpisah dengan konfirmasi
ganda. Pengaturan menyediakan isian Kode Peserta opsional dengan keterangan bahwa kode sebaiknya anonim,
bukan nama atau NIM. (Reset dibangun di langkah 2; hapus log dan kode peserta di langkah 4.) **Alasan:** Log adalah data penelitian. Reset akan sering dipakai saat pameran,
sehingga setiap pengunjung perlu tercatat sebagai pemain berbeda. `playerId` acak tidak dapat dihubungkan
dengan nilai pretest dan posttest, sehingga kode peserta diperlukan untuk uji efektivitas. **Alternatif
ditolak:** Reset yang ikut menghapus log, dan sistem login.

### D-15 · Varian soal tahap Bentuk untuk kanji yang sekaligus bushu ditunda *(Menunggu dosen)*
*Diselesaikan sementara oleh D-90 di cabang `desain-peta`, menunggu tinjauan dosen.*
**Tanggal:** 2026-09-13. **Keputusan:** Tahap Bentuk tetap berjalan seperti spesifikasi. Field opsional
`bushu.variants` ditambahkan sekarang tetapi belum dipakai logika mana pun. **Alasan:** Untuk kanji yang
sekaligus bushu (食 → 食), soal terlihat identik dengan jawabannya. Namun varian soal lain (misalnya
"kanji mana yang memakai bushu ini?") belum memiliki cukup kandidat jawaban dengan tiga level, dan
pilihannya adalah keputusan pedagogis yang harus dibahas dengan dosen. Menyiapkan field sejak awal
mencegah tim konten mengisi ulang puluhan level nanti. **Alternatif ditolak:** Menetapkan varian soal
sendiri pada tahap scaffold.

### D-16 · Materi ditulis di spreadsheet, dikonversi dan diperiksa dengan alat baris perintah
*Diubah oleh D-59 di cabang `desain-peta`: lima tab.*
**Tanggal:** 2026-09-13. **Keputusan:** Tim konten menulis materi di Google Sheets (satu baris = satu
contoh kalimat), mengekspornya ke CSV, lalu menjalankan `tools/csv-to-json.mjs`. Konverter hanya menulis
`content.json` jika tidak ada error, dan setiap error menyebut nomor baris CSV. Aturan validasi berada di
satu modul yang dipakai browser dan `tools/validate-content.mjs`. Nilai `-` berarti di luar buku;
sel bab yang kosong adalah error. **Alasan:** Materi ditulis empat orang yang bukan programmer, sehingga
jalur spreadsheet adalah titik rawan terbesar. Satu logika validasi mencegah perbedaan hasil antara
terminal dan browser. Lupa mengisi tidak boleh terbaca sebagai keputusan "di luar buku". **Alternatif
ditolak:** Menyunting JSON langsung, dan validasi yang hanya ada di browser.

### D-17 · Materi tetap `draft-0` sampai nomor bab diverifikasi terhadap buku
**Tanggal:** 2026-09-13. **Keputusan:** `contentRevision` tetap `draft-0` sampai seluruh nomor bab
diperiksa langsung terhadap buku oleh tim konten (daftar periksa ada di README). Data ber-`draft-0`
tidak boleh dikirim ke validator ahli. Halaman pratinjau menampilkan tanda DRAF yang mencolok di layar
dan saat dicetak jika `contentRevision` diawali `draft` (dibangun di langkah 4). **Alasan:** Nomor bab
sementara berasal dari ingatan, bukan dari pemeriksaan buku. Aturan yang dijaga aplikasi lebih andal
daripada aturan yang dijaga ingatan anggota tim. **Alternatif ditolak:** Mengandalkan disiplin tim saja.

### D-18 · Tabel cara baca tidak menampilkan notasi bentuk kamus secara mentah *(Menunggu dosen)*
**Tanggal:** 2026-09-13. **Keputusan:** Data tetap memakai notasi `た(べる)`. Tampilan memisahkan bacaan
kanji (`た`, besar dan tebal) dari okurigana (`べる`, kecil dan bergaris putus-putus), dengan legenda
yang contohnya diambil dari data. **Alasan:** Mahasiswa semester 1 belum diajarkan bentuk kamus;
menampilkan `た(べる)` mentah memperkenalkan bentuk yang belum dikenal di tengah materi yang tujuannya
mengurangi beban. Pemisahan visual justru mengajarkan batas antara bacaan kanji dan okurigana. Notasi
data bersifat lossless, sehingga perubahan keputusan kelak cukup di lapisan tampilan. **Alternatif
ditolak:** Menampilkan notasi mentah, dan mengubah format data.

### D-19 · Pengecoh tahap 4 wajib manual, minimal 3
*Diperluas oleh D-60 di cabang `desain-peta`: berlaku untuk baris ber-`blank` di percakapan uji.*
**Tanggal:** 2026-09-13. **Keputusan:** `distractors` pada setiap contoh kalimat wajib diisi manual,
minimal tiga pengecoh berbeda; jumlah yang kurang adalah error sehingga materi tidak dapat dimuat.
Pengecoh otomatis hanya dipakai untuk tahap 2–3. **Alasan:** Soal dengan lebih dari satu jawaban benar
adalah cacat terparah pada bahan ajar, dan kode tidak mungkin memastikan sebuah pengecoh salah dalam
konteks kalimat. Temuan T-01 menunjukkan bahwa pengecoh yang sekelas kata pun dapat menjadi jawaban
benar kedua. **Alternatif ditolak:** Pengecoh otomatis berdasarkan kelas kata sebagai cadangan, dan
peringatan (bukan error) ketika pengecoh kurang.

### D-20 · Pengecoh lintas jenis bacaan: hanya manual, selalu ditampilkan, ditandai di log *(Menunggu dosen)*
**Tanggal:** 2026-09-13. **Keputusan:** Field opsional `readingDistractorsCross` (kolom CSV
`reading_distractors_cross`) menampung pengecoh yang meniru kesalahan membaca dengan jenis bacaan yang
salah, misalnya しょくべます untuk 食べます. Pengecoh jenis ini tidak pernah dibuat otomatis. Jika tersedia,
pengecoh ini selalu dimasukkan ke pilihan jawaban. Log mencatat jenis setiap pilihan (`optionTypes`) dan
jenis pilihan yang dipilih (`answerType` = `manual-cross`); umpan balik menjelaskan kesalahan jenis
bacaan tersebut. **Alasan:** Aturan "jenis bacaan sama" bertujuan menjaga kemasukakalan pengecoh, dan
pengecoh yang meniru kesalahan nyata mahasiswa justru paling masuk akal. Pembuatan otomatis ditolak karena
menuntut sintesis morfologis yang mudah menghasilkan bentuk ngawur tanpa cara pemeriksaan. Pengecoh
selalu ditampilkan agar frekuensi mahasiswa membaca kotoba kun'yomi dengan on'yomi dapat dihitung dengan
penyebut yang konsisten, sehingga menjadi temuan tersendiri. Sebagian pengajar keberatan menampilkan
bentuk salah kepada pemula; jika dosen menolak, cukup kosongkan data manualnya. **Alternatif ditolak:**
Melarang pengecoh lintas jenis sama sekali; menyusunnya otomatis; memasukkannya secara acak (penyebut
analisis tidak konsisten).

### D-21 · Penyela di Putaran Pemantapan
**Tanggal:** 2026-09-13. **Keputusan:** Jika hanya satu soal tersisa di Putaran Pemantapan dan soal itu
baru saja dijawab, satu item yang sudah dikuasai diselipkan lebih dulu sebagai penyela. Jawabannya
tercatat di log dengan `phase` = `spacer` dan tetap memengaruhi streak item tersebut. **Alasan:** Tanpa
penyela, syarat "benar dua kali tidak berturut-turut" (D-06) gagal diam-diam tepat di akhir level.
Mencatatnya sebagai fase tersendiri menjadikan jawaban penyela data retensi tambahan. **Alternatif
ditolak:** Mengizinkan pengulangan berturut-turut untuk soal terakhir.

### D-22 · Header layar bermain hanya menampilkan ID level
**Tanggal:** 2026-09-13. **Keputusan:** Header menampilkan "Level L01", tanpa kanji dan artinya.
**Alasan:** Menampilkan kanji atau artinya membocorkan jawaban tahap 4, karena pemain cukup memilih
kotoba yang memuat kanji tersebut. **Alternatif ditolak:** Header dengan kanji dan arti level.

### D-23 · Status terkunci dihitung dari urutan level, dengan aturan longgar setelah penyisipan
**Tanggal:** 2026-09-13. **Keputusan:** Progres hanya menyimpan fakta (streak item, level dimulai,
level lulus); status terkunci selalu dihitung ulang. Sebuah level terbuka jika level tepat sebelumnya
sudah lulus, dan level yang pernah dimulai tidak pernah terkunci lagi. **Alasan:** Selama uji coba akan
ada level yang disisipkan di antara dua putaran revisi. Status yang disimpan akan rusak ketika urutan
berubah, dan peserta yang sudah jauh tidak boleh tertahan oleh level yang disisipkan belakangan.
**Alternatif ditolak:** Menyimpan status terkunci, dan aturan ketat yang mewajibkan semua level
sebelumnya lulus.

### D-24 · Log disimpan per potongan 200 baris dan tidak pernah menghentikan permainan
**Tanggal:** 2026-09-13. **Keputusan:** Log disimpan di `localStorage` dalam potongan 200 baris,
setiap baris sebagai array menurut urutan kolom. Kegagalan penyimpanan tidak menghentikan permainan;
baris disimpan sementara di memori dan Pengaturan menampilkan peringatan. Jika daftar kolom berubah,
log lama disusun ulang sekali ke urutan kolom baru. **Alasan:** Menulis ulang seluruh riwayat setiap
kali menjawab menjadi lambat di ponsel ketika log membesar. Logging tidak boleh memblokir permainan.
Perubahan kolom antarversi tidak boleh membuat baris lama dan baru bercampur urutan kolomnya.
**Alternatif ditolak:** Satu array besar di satu key.

### D-25 · Pengaturan versi minimal dibangun lebih awal
**Tanggal:** 2026-09-13. **Keputusan:** Layar Pengaturan dengan reset progres (konfirmasi dua langkah)
dan jumlah log dibangun di langkah 2; kode peserta, ekspor CSV, dan pengiriman log menyusul di langkah 4.
**Alasan:** Reset diperlukan untuk menguji alur permainan berulang kali sejak langkah 2. **Alternatif
ditolak:** Menunda seluruh Pengaturan ke langkah 4.

### D-26 · Jalur log saat pameran: pengiriman ke Apps Script, ekspor CSV sebagai cadangan
**Tanggal:** 2026-09-13. **Keputusan:** Jalur utama pengumpulan data saat pameran adalah pengiriman log
ke Google Apps Script Web App; ekspor CSV adalah cadangan jika jaringan mati. Pengaturan menampilkan
indikator kapasitas penyimpanan dengan peringatan sejak sekitar 80 persen. README memuat prosedur
pameran yang dapat dijalankan penjaga stan tanpa memahami kode. Endpoint harus sudah jadi dan diuji jauh
sebelum hari pameran. (Dibangun di langkah 4.) **Alasan:** Satu baris log berukuran sekitar 350 karakter,
sedangkan batas `localStorage` sekitar 5 MB; satu perangkat yang dipakai ratusan pengunjung dapat
mencapai batas tersebut, dan ekspor manual berkala mudah terlupa. **Alternatif ditolak:** Ekspor manual
sebagai jalur utama, dan peringatan hanya ketika penyimpanan sudah penuh.

### D-27 · Terjemahan tahap 4 disembunyikan, dengan bantuan opsional "Tampilkan arti"
**Tanggal:** 2026-09-13 (direvisi 2026-09-13). **Keputusan:** Terjemahan kalimat tidak ditampilkan
sebelum menjawab. Pemain dapat menekan tombol opsional **Tampilkan arti** jika buntu; penekanan tombol
dicatat di kolom log `hintUsed`. Jawaban benar setelah bantuan tetap dihitung benar untuk kelulusan
level, tetapi dapat dipisahkan saat analisis. Setelah menjawab, terjemahan selalu tampil di umpan balik.
**Alasan:** Terjemahan yang tampil lebih dulu mengubah soal menjadi pencocokan arti, tetapi menyembunyikannya
tanpa jalan keluar berisiko menahan mahasiswa semester 1. Bantuan opsional yang tercatat memenuhi kedua
kebutuhan dan menghasilkan data tambahan tentang item yang paling sering membutuhkan bantuan. *Versi awal
keputusan ini (terjemahan disembunyikan tanpa bantuan, berstatus menunggu dosen) digantikan oleh versi ini
atas keputusan kelompok.* **Alternatif ditolak:** Terjemahan selalu tampil; terjemahan disembunyikan tanpa
bantuan; jawaban benar setelah bantuan tidak dihitung benar (menghukum pemain yang jujur meminta bantuan).

### D-28 · Tahap Produksi tanpa skor, satu baris log per kalimat
**Tanggal:** 2026-09-13. **Keputusan:** Tahap 5 tidak memberi penilaian benar-salah maupun skor.
Setelah mengirim, pemain melihat contoh kalimat dari materi lalu memilih "Sudah mirip" atau "Masih
ragu". Kalimat disimpan apa adanya dan dicatat bersama penilaian diri sebagai satu baris log ketika
penilaian dipilih; `containsKanji` hanya dicatat, tidak ditampilkan. Kalimat tidak dapat diubah setelah
contoh terlihat. Petunjuk menyatakan bahwa pemain boleh menulis dengan hiragana, disertai cara menambah
papan ketik Jepang. **Alasan:** Penilaian otomatis kalimat bebas tidak dapat diandalkan. Satu baris per
kalimat mencegah kalimat tercatat ganda. Mengunci kalimat setelah contoh terlihat menjaga kejujuran data.
Pengunjung pameran sering tidak memiliki papan ketik Jepang. **Alternatif ditolak:** Mencatat kalimat
saat dikirim dan penilaian diri sebagai baris terpisah; mengizinkan penyuntingan setelah melihat contoh.

### D-29 · Cara baca kotoba disembunyikan selama soal cara bacanya masih akan muncul
*Diperluas oleh D-79 di cabang `desain-peta`: materi quest tidak tampil di luar quest sebelum percakapan pengantarnya.*
**Tanggal:** 2026-09-13. **Keputusan:** Furigana dan baris tabel bacaan untuk sebuah kotoba hanya
ditampilkan jika soal cara bacanya tidak akan segera diujikan: sudah dijawab benar sekali pada putaran
belajar, atau sudah dikuasai pada tahap Produksi dan Putaran Pemantapan. Ketentuan ini berlaku di umpan
balik tahap 2–4, daftar kotoba dan contoh kalimat tahap 5, serta contoh petunjuk hiragana. **Alasan:**
Temuan T-02: tanpa aturan ini, umpan balik soal 食べます memperlihatkan しょくじ tepat sebelum soal cara baca
食事, sehingga jawaban benar tidak lagi mencerminkan penguasaan. **Alternatif ditolak:** Menampilkan semua
cara baca di umpan balik, dan menghapus tabel bacaan dari umpan balik sepenuhnya.

### D-30 · Semua teks Jepang diberi atribut `lang="ja"`
**Tanggal:** 2026-09-13. **Keputusan:** Setiap elemen berisi teks Jepang diberi `lang="ja"`, dengan
susunan font Jepang yang mencakup font bawaan Android (`Noto Sans CJK JP`); tidak ada font dari
internet. **Alasan:** Tanpa atribut ini, Chrome Android dengan bahasa sistem Indonesia dapat memilih
bentuk huruf Tionghoa untuk kode karakter yang sama. Bagi bahan ajar bentuk huruf, ini kegagalan pada
tujuan utama. **Alternatif ditolak:** Mengandalkan deteksi bahasa otomatis browser, dan memuat font web.

### D-31 · Pratinjau materi dipertahankan untuk validator ahli
**Tanggal:** 2026-09-13. **Keputusan:** Halaman pratinjau per level (`#/preview/L01`) dipertahankan dan
akan diperluas dengan `#/preview/all` yang menampilkan seluruh level dalam satu halaman, rapi saat
dicetak atau disimpan sebagai PDF, dengan `contentRevision` di bagian atas. Tautannya hanya ada di
Pengaturan. (Perluasan dibangun di langkah 4.) **Alasan:** Validator ahli perlu menilai seluruh materi
tanpa memainkan level satu per satu, sering ingin mencoret di kertas, dan catatannya harus dapat
dipastikan mengacu ke revisi tertentu. **Alternatif ditolak:** Menghapus pratinjau setelah langkah 1.

---

### D-32 · Level ulangan: sampel berimbang, disimpan, tanpa putaran belajar dan Produksi
*Diubah oleh D-63 di cabang `desain-peta`: komposisi 70/30.*
**Tanggal:** 2026-09-13. **Keputusan:** Level ulangan berisi `REVIEW_ITEM_COUNT` (10) item tahap 1–4 dari
level-level sebelumnya yang sudah lulus. Item diambil acak secara bergiliran per level, sehingga setiap
level terwakili sebelum level yang sama diambil lagi. Sampel disimpan pada kunjungan pertama. Sesi
ulangan langsung mengacak semua item tanpa putaran belajar dan tanpa Produksi, dengan aturan penguasaan
yang sama (D-06, D-21). Di log tercatat `levelId` = ID ulangan, `isReview` = 1, dan `phase` = `review`.
**Alasan:** Pengambilan acak murni dapat melewatkan satu level sepenuhnya, padahal tujuan level ulangan
adalah mencegah lupa pada semua materi lama. Sampel yang disimpan membuat streak tetap bermakna ketika
pemain keluar dan kembali. Ulangan adalah uji retensi, bukan pembelajaran baru, sehingga putaran belajar
dan Produksi tidak diperlukan. **Alternatif ditolak:** Acak murni dari seluruh item; sampel baru setiap
kali dibuka; memakai alur lengkap level biasa.

### D-33 · Pengiriman log: kelompok baris, `rowId` untuk menyaring duplikat, coba ulang otomatis
**Tanggal:** 2026-09-13. **Keputusan:** Log dikirim per 50 baris sebagai POST `text/plain` ke Web App
Google Apps Script. Baris dianggap terkirim hanya jika server membalas `{"ok": true}`. Setiap baris
memiliki `rowId` unik, dan skrip Apps Script melewati baris yang `rowId`-nya sudah ada. Pengiriman dicoba
lagi otomatis setelah jawaban berikutnya, saat jaringan kembali, dan setiap 60 detik; status serta pesan
galat berbahasa Indonesia tampil di Pengaturan. Fitur ini dinonaktifkan lewat `LOG_REMOTE_ENABLED`
sampai endpoint siap. **Alasan:** Apps Script tidak dapat menjawab permintaan preflight CORS, sehingga
hanya permintaan sederhana `text/plain` yang dapat membaca balasannya. Jaringan pameran yang putus di
tengah pengiriman dapat membuat satu kelompok terkirim dua kali; `rowId` mencegah data ganda tanpa
membutuhkan koordinasi rumit. Logging tidak boleh memblokir permainan. **Alternatif ditolak:** Mode
`no-cors` (keberhasilan tidak dapat dipastikan); `navigator.sendBeacon` (tanpa balasan); kirim satu baris
per jawaban (terlalu banyak permintaan ke Apps Script).

### D-34 · Kapasitas penyimpanan diperkirakan konservatif dan diperingatkan sejak 80%
**Tanggal:** 2026-09-13. **Keputusan:** Pemakaian penyimpanan dihitung dari total karakter key aplikasi
dibandingkan `STORAGE_BUDGET_CHARS` = 2.500.000. Peringatan kuning muncul sejak 80% di Pengaturan dan di
daftar level; peringatan merah muncul sejak 95% atau ketika ada jawaban yang gagal disimpan.
**Alasan:** Browser tidak menyediakan cara membaca batas `localStorage` yang pasti, dan setiap browser
menghitungnya berbeda. Perkiraan yang sengaja rendah membuat peringatan datang lebih awal di semua
browser. Peringatan di daftar level diperlukan karena penjaga stan jarang membuka Pengaturan.
**Alternatif ditolak:** Peringatan hanya saat penyimpanan sudah penuh; menghapus log terkirim secara
otomatis (risiko kehilangan data jika status pengiriman keliru).

### D-35 · Kode peserta divalidasi formatnya dan ikut dikosongkan saat reset
**Tanggal:** 2026-09-13. **Keputusan:** Kode peserta hanya menerima huruf, angka, `-`, dan `_` tanpa spasi
(maksimal 32 karakter); deretan 8 angka atau lebih ditolak dengan pesan bahwa kode tersebut menyerupai
NIM. Kode disimpan bersama progres, sehingga reset progres ikut mengosongkannya. **Alasan:** Larangan
spasi mencegah nama lengkap diketik sebagai kode, dan penolakan pola NIM mencegah data identitas masuk
ke log penelitian. Mengosongkan kode saat reset mencegah jawaban pengunjung berikutnya tercatat dengan
kode peserta sebelumnya. **Alternatif ditolak:** Isian bebas dengan keterangan saja; kode yang bertahan
setelah reset.

### D-36 · Hapus log memakai konfirmasi ganda dan menampilkan data yang belum aman
**Tanggal:** 2026-09-13. **Keputusan:** Menghapus log membutuhkan dua langkah: membuka kotak konfirmasi,
lalu mengetik `HAPUS` sebelum tombol penghapusan aktif. Kotak konfirmasi menyebut jumlah jawaban yang
akan dihapus, yang belum terkirim ke server, dan yang belum pernah diekspor. Reset progres cukup dengan
satu konfirmasi. **Alasan:** Log adalah data penelitian yang tidak dapat dipulihkan, sedangkan reset
progres sering dipakai dan tidak menghapus data. Menampilkan jumlah jawaban yang belum aman membuat
penjaga stan menyadari risiko sebelum menghapus. **Alternatif ditolak:** Dialog `confirm()` bawaan
browser; satu konfirmasi yang sama untuk reset dan hapus log.

### D-37 · Pratinjau cetak untuk validator ahli
**Tanggal:** 2026-09-13. **Keputusan:** Halaman `#/preview/all` menampilkan ringkasan seluruh level lalu
setiap level secara lengkap, termasuk semua jenis pengecoh dan notasi data mentah `た(べる)` di samping
tampilan untuk mahasiswa. Revisi materi dan tanggal tampil di atas. Saat dicetak, setiap level dimulai di
halaman baru dan diakhiri kotak catatan validator. Jika revisi diawali `draft`, spanduk DRAF tampil di atas
dan tanda air DRAF tercetak di setiap halaman. ID level `all` dicadangkan. **Alasan:** Validator menilai
materi di kertas dan sering memasangkannya dengan lembar validasi, sehingga satu level per halaman dan
ruang catatan memudahkan. Validator perlu memeriksa data sebenarnya, bukan hanya tampilannya. Tanda air
di setiap halaman mencegah halaman lepas dari dokumen draf disalahartikan sebagai versi final.
**Alternatif ditolak:** Spanduk DRAF hanya di halaman pertama; pratinjau tanpa tata letak cetak.

### D-38 · Satu tab aplikasi per perangkat
**Tanggal:** 2026-09-13. **Keputusan:** Prosedur pameran dan README menetapkan bahwa aplikasi dibuka di
satu tab saja per perangkat; aplikasi tidak menyinkronkan progres antartab. **Alasan:** Temuan T-07
menunjukkan bahwa dua tab yang terbuka bersamaan saling menimpa progres. Log jawaban tidak terdampak.
Sinkronisasi antartab menambah kerumitan yang tidak sebanding untuk pemakaian satu pengunjung per
perangkat. **Alternatif ditolak:** Sinkronisasi progres lewat event `storage` antartab.

### D-39 · Urutan level mengikuti mata kuliah Hyouki; `chapter` hanya informasi
*Digantikan oleh D-55 di cabang `desain-peta` (tetap berlaku di `main`).*
**Tanggal:** 2026-09-14. **Keputusan:** Urutan level ditentukan urutan array di `content.json`, yaitu urutan
pengajaran kanji di mata kuliah Hyouki. `chapter` pada kotoba tetap berarti bab みんなの日本語 tempat kata itu
diajarkan, tetapi hanya sebagai informasi. Bab level tidak lagi diisi manual: nilainya dihitung dari bab
terkecil kotobanya; field `chapter` pada level diabaikan dengan peringatan, dan kolom `level_chapter` di CSV
ditolak. Urutan bab antarlevel yang tidak naik ditampilkan sebagai catatan di pemeriksa konten, bukan
peringatan, dan tidak pernah menghalangi pemuatan materi. Urutan JLPT (semua N5 sebelum N4) tetap error.
**Alasan:** Verifikasi terhadap buku (T-10) menunjukkan bahwa みんなの日本語初級I tidak mengajarkan kanji
secara bertahap; kanji diajarkan berurutan di mata kuliah Hyouki dengan urutannya sendiri. Bab level yang
diisi manual di samping bab kotoba menciptakan dua sumber kebenaran. Urutan JLPT tetap diwajibkan karena
daftar level dikelompokkan per JLPT, dan level N5 yang diletakkan setelah level N4 akan terkunci di belakang
level dari kelompok lain; ini juga sesuai rencana tahap 1 (N5) lalu tahap 2 (N4). **Alternatif ditolak:**
Mempertahankan aturan bab menaik (D-11); menurunkan urutan JLPT menjadi catatan juga; menghapus perhitungan
urutan bab sepenuhnya (informasinya tetap berguna bagi tim konten).

### D-40 · Daftar level dikelompokkan per JLPT dengan label bab di setiap kartu
*Digantikan oleh D-64 (peta per bab) di cabang `desain-peta` (tetap berlaku di `main`).*
**Tanggal:** 2026-09-14. **Keputusan:** Daftar level hanya dikelompokkan per `jlptLevel`, dengan urutan array
di dalam kelompok. Setiap kartu level menampilkan semua bab kotobanya, misalnya "Minna bab 3, 6, 13", dan
"di luar buku" jika ada kotoba ber-`chapter` null. **Alasan:** Setelah D-39, pengelompokan per bab akan
memecah daftar menjadi potongan yang urutannya melompat-lompat dan tidak mencerminkan urutan belajar.
Menampilkan semua bab memberi tahu pemain dari bab mana saja kata dalam level berasal. **Alternatif
ditolak:** Pengelompokan per bab; label hanya bab terkecil.

### D-41 · Penanda "Kelas sudah sampai bab" tanpa penguncian
*Digantikan oleh D-55 (wilayah sudah berupa bab) di cabang `desain-peta` (tetap berlaku di `main`).*
**Tanggal:** 2026-09-14. **Keputusan:** Di atas daftar level tersedia pilihan opsional bab Minna terakhir yang
sudah dipelajari kelas. Level yang memuat kotoba dari bab sesudahnya diberi tanda "Memuat kata dari bab yang
belum dipelajari (bab …)". Penanda tidak memengaruhi aturan kunci level. Kotoba ber-`chapter` null tidak
diberi tanda. Pilihan disimpan sebagai preferensi perangkat (`kanjiGame.prefs.v1`), tidak ikut terhapus saat
reset progres, dan tidak dicatat di log. **Alasan:** Pengajar perlu tahu materi mana yang memuat kata yang
belum dipelajari tanpa mengubah alur buka kunci yang sudah ditetapkan (D-13, D-23). Bab kotoba di luar buku
tidak diketahui sehingga tidak dapat dibandingkan. Pilihan kelas berlaku untuk perangkat, bukan untuk satu
pemain. **Alternatif ditolak:** Mengunci level yang melewati bab pilihan; menyimpan pilihan di progres
pemain (akan hilang setiap reset di pameran).

### D-42 · Level contoh ditambah 食堂 dan 電気
**Tanggal:** 2026-09-14. **Keputusan:** Level 食 ditambah kotoba on'yomi 食堂 (bab 3, terverifikasi) dan level
気 ditambah kotoba on'yomi 電気 (bab 1, terverifikasi). Contoh kalimat `[食堂|しょくどう]で[昼|ひる]ごはんを[食|た]べます。`
dan `[電気|でんき]をつけます。` beserta pengecohnya adalah draf yang perlu diperiksa tim konten. 食事, 元気, dan 天気
tetap ada dan tetap tercantum sebagai belum terverifikasi. **Alasan:** 食堂 diajarkan lebih awal daripada 食事
dan sama-sama memakai bacaan ショク, sehingga menguatkan kontras on'yomi sejak awal. Kedua kata memiliki bab
yang sudah terverifikasi. Kalimat 電気をつけます memakai つけます yang diajarkan setelah bab 1; ini diterima untuk
level contoh tetapi perlu ditinjau. **Alternatif ditolak:** Mengganti 元気 dengan 電気 (menghapus contoh
na-adjektiva satu-satunya di data).

### D-43 · Deteksi tab ganda sebagai peringatan, tanpa pemblokiran atau sinkronisasi
**Tanggal:** 2026-09-14. **Keputusan:** Setiap tab aplikasi memberi tanda kehidupan lewat `BroadcastChannel`
(cadangan: event `storage` di `localStorage`). Jika tab lain terdeteksi, spanduk peringatan di atas halaman
menjelaskan bahwa progres di dua tab bisa saling menimpa dan menyarankan menutup salah satunya. Jika progres
diubah dari tab lain, spanduk meminta halaman dimuat ulang dan menyediakan tombol untuk itu. Tidak ada yang
diblokir dan tidak ada yang disinkronkan. Tab dianggap tertutup setelah berpamitan atau setelah 75 detik
tanpa tanda. **Alasan:** Prosedur "satu tab per perangkat" (D-38) hanya dijaga manusia dan akan gagal ketika
pengunjung pameran membuka tautan dua kali tanpa sadar. Peringatan membuat kegagalan terlihat dengan biaya
kecil. Batas 75 detik dipilih karena browser memperlambat timer di tab latar. **Alternatif ditolak:**
Sinkronisasi progres antartab; memblokir tab kedua; hanya mengandalkan prosedur.

### D-44 · Format kode peserta yang disarankan: huruf lalu angka
**Tanggal:** 2026-09-14. **Keputusan:** Kolom kode peserta menampilkan contoh `K4-01` sebagai placeholder dan
sebagai teks bantuan di bawah kolom, dan pesan galat menyebut contoh yang sama. Aturan validasi D-35 tidak
berubah. **Alasan:** Larangan tanpa contoh bentuk yang benar membuat orang mencoba-coba sampai lolos. Contoh
yang selalu terlihat mengarahkan peneliti dan penjaga stan ke satu pola yang konsisten. **Alternatif
ditolak:** Memaksakan pola `huruf-angka` secara ketat (skema kode peneliti belum ditetapkan).

### D-45 · Label DRAF di alur isi sebagai cadangan tanda air
**Tanggal:** 2026-09-14. **Keputusan:** Selain spanduk dan tanda air tetap, setiap level di pratinjau diawali
label "DRAF — BELUM DIVERIFIKASI · revisi …" yang menjadi bagian alur isi halaman, dan kotak catatan validator
menyebut revisi draf yang sama. **Alasan:** Halaman pratinjau adalah yang dipegang validator ahli, dan
validasi dijadwalkan jauh sebelum pameran. Tanda air memakai elemen posisi tetap yang belum diuji di Safari
dan Firefox; jika browser tersebut tidak mencetaknya di setiap halaman, label di alur isi tetap tercetak di
halaman pertama setiap level dan di kotak catatannya. Keterbatasan: halaman lanjutan di tengah sebuah level
hanya ditandai oleh tanda air. **Alternatif ditolak:** Mengandalkan tanda air saja; header berulang lewat
tabel cetak (dukungan antarbrowser juga tidak pasti dan merumitkan tata letak).

### D-46 · Uji otomatis logika inti disimpan di repo
**Tanggal:** 2026-09-14. **Keputusan:** Uji logika inti disimpan di folder `tests/` dan dijalankan dengan runner
bawaan Node (`node --test tests/*.test.mjs`), tanpa npm dan tanpa dependensi. Cakupannya: aturan konten,
aturan permainan, log, alat baris perintah, skrip Apps Script dengan tiruan layanan Google, dan pemeriksaan
bahwa tidak ada materi bahasa Jepang di kode aplikasi. Uji tampilan di browser tetap manual. Uji ini sudah
dibuktikan dapat gagal dengan merusak sementara logika penyela dan penanda generasi log. **Alasan:** Uji yang
selama pengembangan hanya ada di folder sementara hilang ketika sesi berganti, padahal aturan seperti
penyela (D-21) dan penanda generasi log (T-08) mudah rusak tanpa terlihat saat kode diubah. Aplikasi tetap
tanpa build step; uji hanya dijalankan pengembang. **Alternatif ditolak:** Kerangka uji pihak ketiga
(membutuhkan npm); tanpa uji di repo.

### D-47 · Pintasan "Mulai / Lanjutkan" di atas daftar level
*Digantikan oleh peta (langkah 3) di cabang `desain-peta` (tetap berlaku di `main`).*
**Tanggal:** 2026-09-14. **Keputusan:** Daftar level diawali tombol yang membuka level atau level ulangan yang
sedang dikerjakan, atau jika tidak ada, level pertama yang terbuka. Daftar tidak digulir otomatis.
**Alasan:** Uji keterbacaan dengan 33 level menunjukkan bahwa setelah menyelesaikan level, pemain kembali ke
puncak daftar dan harus menggulir jauh untuk menemukan level berikutnya. Tombol eksplisit menghindari
lompatan gulir yang membingungkan. **Alternatif ditolak:** Menggulir otomatis ke level berikutnya; tanpa
pintasan.

### D-48 · Kalimat contoh tidak boleh mendahului pelajaran: field `sentenceChapter`
*Diubah oleh D-58 di cabang `desain-peta`: dibandingkan dengan bab wilayah, per percakapan.*
**Tanggal:** 2026-09-14. **Keputusan:** Setiap contoh kalimat wajib memuat `sentenceChapter` (kolom CSV
`example_sentence_chapter`): bab Minna tertinggi yang dibutuhkan kalimat, dari kosakata maupun pola
kalimatnya, diisi manual oleh penulis materi; `null` berarti memakai kata atau pola di luar buku. Pemeriksa
konten memberi peringatan jika nilainya lebih tinggi daripada `chapter` kotoba yang diujikan, dan peringatan
lain jika `null`. Halaman pratinjau menampilkan nilai ini dan menandainya bila lebih tinggi. Nilai untuk
kalimat contoh di data adalah perkiraan pengembang dan tercantum di daftar verifikasi. **Alasan:** Temuan
T-11 menunjukkan kalimat 電気をつけます menguji kata bab 1 dengan kata kerja yang diajarkan jauh sesudahnya.
Aturan kalimat sebelumnya hanya menyangkut ambiguitas; kalimat yang memakai materi yang belum dipelajari
justru menambah beban yang ingin dikurangi produk ini. Peringatan (bukan error) karena kadang tidak ada
kalimat yang wajar dengan materi yang lebih awal. Kode tidak dapat menentukan bab kosakata dan pola kalimat
secara otomatis, sehingga nilainya diisi manusia. **Alternatif ditolak:** Error yang memblokir materi;
menghitung bab kalimat otomatis dari daftar kosakata (membutuhkan kamus bab dan analisis tata bahasa yang
tidak tersedia).

### D-49 · Pemeriksa dan konverter materi di browser (`tools/convert.html`)
**Tanggal:** 2026-09-14. **Keputusan:** Tim konten memeriksa dan mengonversi CSV lewat halaman
`tools/convert.html`: memilih file, mengisi nama revisi, melihat error dan peringatan beserta nomor baris CSV,
lalu mengunduh `content.json` jika tidak ada error. Logika konversi dipindahkan dari skrip Node ke modul
bersama `js/csv-content.js`, sehingga halaman ini dan `tools/csv-to-json.mjs` memakai kode yang sama persis
bersama `js/validate.js`. Halaman dibuka dari situs Netlify atau server lokal, bukan dengan klik ganda; jika
dibuka dari disk, halaman menjelaskan cara membukanya. **Alasan:** Penulis materi bukan programmer dan tidak
akan memasang Node.js. Menyimpan satu salinan logika mencegah hasil pemeriksaan browser dan terminal
berbeda. Pembukaan dengan klik ganda tidak dimungkinkan karena browser memblokir ES modules dari `file://`
(sama dengan D-01); situs Netlify yang memang dibutuhkan untuk validator sekaligus menyediakan halaman ini
tanpa pemasangan. **Alternatif ditolak:** Menyalin logika ke dalam satu berkas HTML (dua salinan yang bisa
berbeda); membangun berkas gabungan otomatis (membutuhkan build step); aplikasi desktop atau makro
spreadsheet.

### D-50 · Layar persetujuan peserta, dengan pilihan bermain tanpa merekam
**Tanggal:** 2026-09-15. **Keputusan:** Sebelum permainan pertama setiap pemain, aplikasi menampilkan layar
persetujuan dengan dua tombol: **Saya setuju** dan **Main tanpa merekam**. Jika pemain memilih yang kedua,
permainan berjalan normal tetapi tidak ada baris log yang ditulis maupun dikirim; semua pencatatan melewati satu
fungsi yang memeriksa persetujuan. Pilihan, waktu, dan versi teks disimpan di progres pemain, sehingga reset
progres mengosongkannya, dan layar muncul lagi jika versi teks berubah. Setiap baris log mencatat
`consentStatus`, `consentVersion`, dan `consentAt`. Teks disimpan di `data/consent.json` sebagai placeholder
yang ditandai jelas (`isPlaceholder`, spanduk "TEKS SEMENTARA") sampai redaksinya disetujui dosen pembimbing.
Jika teks gagal dimuat, hanya pilihan tanpa merekam yang tersedia. Layar dapat dibuka lagi dari Pengaturan.
**Alasan:** Aplikasi merekam kalimat yang diketik peserta, sehingga persetujuan diperlukan untuk penelitian.
Pengunjung umum di pameran bukan peserta penelitian dan harus dapat bermain tanpa direkam. Menyimpan pilihan per
pemain sesuai dengan pemakaian perangkat bergantian. Mencatat versi teks memungkinkan data yang direkam dengan
teks placeholder atau versi lama dipisahkan saat analisis. Redaksi persetujuan adalah dokumen etika penelitian
yang harus disetujui pembimbing, sehingga tidak dikarang pengembang dan tidak disimpan di kode. **Alternatif
ditolak:** Persetujuan per perangkat (terbawa ke pengunjung berikutnya); teks di dalam kode; memblokir tombol
setuju selama teks masih placeholder (menghalangi uji coba internal pencatatan). *Dilengkapi oleh D-52 (pengaman
pengiriman selama teks placeholder) dan D-53 (penarikan persetujuan).*

### D-51 · Deploy lewat unggah folder Netlify, tanpa dokumen internal
**Tanggal:** 2026-09-15. **Keputusan:** Aplikasi ditaruh di Netlify dengan menyeret folder unggahan berisi
`index.html`, `css/`, `js/`, `data/`, dan `tools/`. Folder `.git`, `tests/`, `README.md`, `MULAI-DI-SINI.md`, `DECISIONS.md`,
`BLOCKERS.md`, dan file ekspor log tidak ikut diunggah. Langkahnya ditulis di README untuk orang yang tidak
memakai baris perintah, termasuk cara memperbarui dan mengembalikan versi sebelumnya. **Alasan:** Tim membutuhkan
tautan untuk validator lebih cepat dari rencana, dan tidak ada anggota tim yang diharapkan memakai baris
perintah. Semua isi folder unggahan dapat dibuka siapa pun yang tahu tautannya, sehingga dokumen internal dan
data peserta tidak boleh ikut. `tools/` tetap diunggah karena memuat pemeriksa materi untuk tim konten (D-49).
**Alternatif ditolak:** Menghubungkan repositori Git ke Netlify (membutuhkan repositori daring dan akses Git);
mengunggah seluruh folder proyek.

### D-52 · Pengiriman log dimatikan paksa selama teks persetujuan masih placeholder
**Tanggal:** 2026-09-16. **Keputusan:** Versi teks persetujuan yang diawali `placeholder` menandai teks sementara.
Selama teks yang berlaku berversi placeholder, pengiriman log ke Apps Script dimatikan paksa walaupun diaktifkan di
konfigurasi, dan Pengaturan menampilkan alasannya. Log tetap ditulis di perangkat agar pencatatan dapat diuji.
Selain itu, setiap baris yang direkam dengan persetujuan versi placeholder tidak pernah dikirim, termasuk setelah
teks final dipasang. Pemeriksa teks persetujuan menolak `isPlaceholder` dan `version` yang tidak cocok. **Alasan:**
Persetujuan atas teks yang redaksinya belum disetujui dosen tidak sah untuk data penelitian; jika uji coba dimulai
sebelum teks final, data itu tidak dapat dipakai di skripsi. Pengaman ini membuat kesalahan tersebut mustahil
terjadi tanpa disengaja, sementara tombol setuju tetap aktif untuk pengujian (D-50). Penyaringan per baris
diperlukan karena tanpa itu baris lama akan terkirim begitu teks final dipasang. **Alternatif ditolak:** Hanya
peringatan di Pengaturan; hanya mematikan pengiriman global tanpa menyaring baris lama; menonaktifkan tombol setuju.

### D-53 · Penarikan persetujuan: hapus data lokal, kirim baris penarikan, hapus manual di spreadsheet
**Tanggal:** 2026-09-16. **Keputusan:** Jika peserta yang sudah setuju beralih ke "Main tanpa merekam", aplikasi
menawarkan pilihan "Hapus juga data saya yang sudah terekam". Jika dipilih, semua baris log pemain itu (menurut
`playerId`) dihapus dari penyimpanan lokal, penanda baris terkirim dan terekspor dihitung ulang, lalu satu baris
penarikan ditulis dengan `consentStatus` = `withdrawn`, `playerId`, kode peserta, waktu, dan jumlah baris yang
dihapus. Baris penarikan dikirim ke spreadsheet dan menjadi penanda bagi peneliti untuk menghapus baris yang sudah
terkirim secara manual, dengan prosedur yang ditulis di README. Pilihan "Biarkan data yang sudah terekam" hanya
menghentikan perekaman berikutnya. **Alasan:** Hak peserta untuk menarik data adalah praktik baku etika penelitian,
sehingga tidak perlu menunggu keputusan dosen. Aplikasi tidak dapat menghapus baris yang sudah ada di spreadsheet,
jadi yang dapat dijamin aplikasi adalah penghapusan lokal dan jejak yang jelas bagi peneliti. `playerId` dicatat
selain kode peserta karena kode peserta bersifat opsional. **Alternatif ditolak:** Penghapusan otomatis di
spreadsheet oleh skrip Apps Script (memberi siapa pun yang mengetahui URL kemampuan menghapus data); tidak
menawarkan penghapusan sama sekali.

### D-54 · Versi peta dibangun di cabang `desain-peta`; `main` menjadi cadangan
*Bagian alat ekspor dibatalkan oleh D-96.*
**Tanggal:** 2026-09-29. **Keputusan:** Arah baru dari tim (peta wilayah per bab, quest percakapan, index kanji,
karakter pemain, tabel kana) dibangun di cabang git `desain-peta` dalam lima langkah dengan titik berhenti. Cabang
`main` tidak diubah dan tetap bisa dipakai sebagai cadangan jika versi peta belum siap saat validasi ahli. Tim konten
menulis materi langsung dalam struktur baru; di langkah 5 dibuat alat ekspor satu arah dari struktur baru ke struktur
lama (kanji sasaran menjadi level, kotoba quest menjadi kotoba level, baris ber-`blank` menjadi contoh kalimat),
supaya materi yang sama bisa dimuat di `main`. Arah tim: struktur permainan dibangun lebih dulu dengan aset
placeholder, lalu tim cukup mengganti berkas asetnya (D-70). **Alasan:** Tanpa alat ekspor, cadangan di `main` hanya
ada di atas kertas, karena materi sungguhan belum ditulis dan akan ditulis sekali saja. **Alternatif ditolak:**
Membangun langsung di `main` (tidak ada versi utuh selama pembangunan); menulis materi dua kali untuk dua struktur;
membuat alat ekspor lebih awal (belum dibutuhkan sebelum struktur baru stabil).

### D-55 · Urutan dan isi materi mengikuti bab Minna dan pilihan tim, bukan mata kuliah Hyouki
**Tanggal:** 2026-09-29. **Keputusan:** Membalik D-39. Satu wilayah = satu bab みんなの日本語初級I; urutan wilayah
= urutan bab. Isi wilayah adalah kotoba bab itu **yang dipilih tim**, bukan semua kanji yang muncul di kosakata bab
tersebut. Unit quest berpindah dari kanji ke kotoba (1–2 kanji sasaran, D-61), sedangkan index tetap berpusat pada
kanji. **Alasan:** (1) D-39 dibuat karena Minna tidak mengajarkan kanji secara bertahap, sehingga urutan diambil dari
mata kuliah Hyouki; akibatnya seluruh penyusunan materi terhambat menunggu urutan Hyouki (blocker nomor 1 di
`BLOCKERS.md`). Dengan kotoba sebagai unit dan bab sebagai urutan, materi bisa disusun sekarang dari buku yang
dipegang mahasiswa. (2) Mahasiswa semester 1 bertemu kotoba per bab di kelas; memetakan wilayah ke bab membuat
permainan sejalan dengan kemajuan kelas tanpa penanda tambahan (D-41 tidak diperlukan lagi). (3) Memilih kotoba,
bukan memasukkan semua kanji, menjaga beban per bab tetap wajar, karena sejak bab 1 banyak kanji muncul tanpa
dituntut dikuasai. **Alternatif ditolak:** Tetap mengikuti Hyouki di dalam peta (wilayah tidak lagi berarti bab);
memasukkan semua kanji di kosakata setiap bab (beban terlalu berat, dan banyak kanji belum saatnya dikuasai).
**Dampak:** D-39, D-40, D-41, dan D-47 digantikan di cabang ini.

### D-56 · Kontras kun'yomi–on'yomi melemah — kompromi yang disengaja
**Tanggal:** 2026-09-29. **Keputusan:** Diterima dengan sadar bahwa pengelompokan per bab memisahkan bacaan satu
kanji ke wilayah berbeda (食べます bab 6, 食堂 bab 3), padahal di struktur level ketiganya berada dalam satu level.
Peredamnya: (1) kartu kontras mengambil kotoba lain dengan kanji yang sama **dari wilayah yang sudah terbuka**;
(2) jendela pengantar bab menandai kanji yang muncul lagi dengan bacaan berbeda; (3) jendela detail kanji di index
menampilkan semua bacaan dan kotobanya. **Alasan:** Perubahan bacaan adalah salah satu kesulitan utama menurut
analisis kebutuhan, tetapi keuntungan D-55 lebih besar. Ketiga peredam memanfaatkan data yang sudah ada, tanpa beban
menulis tambahan. **Alternatif ditolak:** Menarik kotoba dari bab lain ke satu wilayah demi kontras (melanggar
aturan bab di D-58).

### D-57 · Struktur data versi 2: wilayah → quest → percakapan, dengan tabel kanji dan kotoba bersama
**Tanggal:** 2026-09-29. **Keputusan:** `schemaVersion` 2. `regions[]` (satu per bab: `chapter`, `title`, `intro`,
`pin`, `quests[]`); setiap quest (`id`, `kotoba`, `targetKanji`, `productionPrompt`) memuat percakapan pengantar
(`intro`) dan percakapan uji (`tests[]`) di dalamnya; `kanji[]` dan `kotoba[]` adalah tabel bersama yang dirujuk
dengan ID. Kotoba punya field baru `ruby`, furigana **per kanji** (`[食|しょく][堂|どう]`), yang diperiksa terhadap
`word` dan `reading`. Relasi kanji ⇄ kotoba, bacaan setiap kanji di dalam kotoba, dan contoh kalimat index tidak
ditulis tim, tetapi dihitung dari data (`js/model.js`). ID wilayah diturunkan dari bab (`B06`). ID item soal:
`K:<kanji>:shape`, `W:<kotoba_id>:reading`, `C:<conversation_id>:test`, `Q:<quest_id>:production`. Materi schemaVersion
1 ditolak dengan pesan yang menunjuk ke format baru. **Alasan:** Satu himpunan data harus melayani quest (berpusat
pada kotoba) dan index (berpusat pada kanji); relasi yang ditulis dua kali akan saling bertentangan. Percakapan
disarangkan di quest karena setiap percakapan milik tepat satu quest. `ruby` per kanji dibutuhkan index dan kartu
kontras. **Perubahan dari D-05:** ID item uji kini dari `conversation_id`, bukan dari teks kalimat, sehingga
menyunting kalimat tanpa mengganti ID tidak membuat item baru; perbedaannya tetap terlihat dari `contentRevision` dan
kolom `prompt` di log. ID kotoba ditulis tim (`kotoba_id`) supaya homograf seperti 一日 (ついたち/いちにち) tetap bisa
dibedakan. **Alternatif ditolak:** Kotoba disarangkan di dalam kanji seperti di versi 1 (kotoba dua kanji harus
ditulis dua kali); relasi kanji–kotoba diisi manual; kotoba dirujuk dengan tulisannya (homograf tidak bisa dibedakan).

### D-58 · Cakupan materi bab 1–12 dan aturan bab
**Tanggal:** 2026-09-29. **Keputusan:** Bab wilayah dan bab kotoba harus 1–12 (**error** jika di luar). Bab kotoba
quest harus sama dengan bab wilayahnya (**error**). `sentenceChapter` kini dimiliki setiap **percakapan** dan
dibandingkan dengan **bab wilayah**, bukan bab kotoba (**peringatan** jika lebih tinggi, seperti D-48). Kotoba yang
babnya belum punya wilayah memunculkan peringatan. Materi yang keluar dari data dipindahkan ke `data/archive/`
beserta catatannya, tidak dihapus tanpa jejak. Dalam data contoh: 食事 (bab 13) keluar karena di luar cakupan; 食堂,
電気, 元気, 天気, dan kanji 気 diarsipkan karena materi dimulai dari satu bab (B06). **Alasan:** Cakupan produk adalah
Minna I bab 1–12; pemeriksaan otomatis mencegah materi di luar cakupan lolos tanpa disadari. **Alternatif ditolak:**
Menjadikan bab di luar cakupan sebagai peringatan (materi di luar cakupan bisa terbawa ke validasi).

### D-59 · Spreadsheet lima tab, konverter menerima banyak berkas
**Tanggal:** 2026-09-29. **Keputusan:** Menggantikan satu lembar di D-16. Spreadsheet terdiri dari lima tab
(`wilayah`, `kanji`, `kotoba`, `quest`, `percakapan` — satu baris percakapan = satu ucapan), masing-masing diunduh
sebagai CSV. Konverter di browser dan di terminal menerima kelima berkas sekaligus dan mengenali jenis tab dari baris
judul, sehingga nama berkas tidak penting. Setiap masalah menyebut tab dan nomor baris, termasuk rujukan ID yang putus
antartab dan percakapan yang tidak dipakai quest mana pun. Urutan wilayah mengikuti bab; urutan quest di dalam wilayah
mengikuti urutan baris tab quest. Tab wilayah tidak punya kolom ID (diturunkan dari bab) dan tidak punya daftar quest
(tab quest menunjuk babnya), supaya satu fakta hanya ditulis sekali; ini menyederhanakan rancangan kolom yang
disetujui. Desimal `42,5` dan `42.5` sama-sama diterima untuk posisi pin; `pemain` di kolom pembicara disimpan sebagai
`player`. **Alasan:** Lima jenis data dengan jumlah baris berbeda tidak muat dalam satu lembar tanpa pengulangan kolom
yang rawan salah. Gesekan mengunduh lima tab diterima tim; urutan unduhnya ditulis di README dan di halaman
konverter. **Alternatif ditolak:** Satu lembar dengan kolom berulang; mengunggah berkas `.xlsx` (butuh pembaca format
zip di browser tanpa pustaka).

### D-60 · Uji di konteks lain menggantikan tahap Kotoba dalam kalimat
**Tanggal:** 2026-09-29. **Keputusan:** Tahap 4 lama (kalimat dengan bagian kosong) tidak ada lagi di quest. Fungsinya
diambil alih percakapan uji: satu baris dengan bagian kosong di percakapan yang konteksnya berbeda dari percakapan
pengantar. Aturan pengecoh manual minimal 3 (D-19) dan terjemahan tersembunyi dengan petunjuk "Tampilkan arti" (D-27)
pindah ke baris itu. Tahap Bentuk, cara baca, dan Produksi tetap. **Alasan:** Keduanya berupa isian dengan pengecoh
manual; jika dua-duanya ada, beban menulis kalimat dan pengecoh berlipat dua, padahal pengecoh adalah cacat paling
dominan di proyek ini (T-12). **Alternatif ditolak:** Mempertahankan tahap kalimat di samping uji konteks.

### D-61 · Kanji sasaran per quest dan penguasaan kanji global
**Tanggal:** 2026-09-29. **Keputusan:** Setiap quest menyebut 1–2 `targetKanji`. Soal Bentuk dan data bushu hanya
untuk kanji sasaran; kotoba tiga kanji (会社員, 銀行員) tetap bisa menjadi quest dengan tim memilih sasarannya. Setiap
kanji sasaran wajib punya entri di tabel kanji dan furigana tersendiri di `ruby` (kecuali `readingType` special);
bacaannya dicocokkan dengan daftar bacaan kanji (peringatan jika tidak ada, atau jika jenisnya berbeda). Soal Bentuk
satu kanji adalah **satu item di seluruh materi** (`K:学:shape`): dikuasai lewat 学生, tidak diulang di 大学.
**Alasan:** Kotoba Minna bab 1–12 tidak selalu satu atau dua kanji; tim yang menentukan kanji mana yang layak
dilatih. Mengulang soal Bentuk yang sudah dikuasai hanya menambah panjang quest. **Alternatif ditolak:** Melatih semua
kanji penyusun kotoba; soal Bentuk per quest.

### D-62 · Aturan percakapan
**Tanggal:** 2026-09-29. **Keputusan:** Diperiksa otomatis: percakapan antara tepat dua pembicara, salah satunya
karakter pemain; percakapan pengantar menyorot kotoba quest (`highlight`) dan tidak punya bagian kosong; percakapan uji
punya tepat satu baris ber-`blank` dengan minimal 3 pengecoh dan tidak boleh memakai sorotan; jawaban tidak boleh
tertulis di baris lain percakapan uji (error), kanji sasaran di baris lain memunculkan peringatan; kalimat ber-`blank`
tidak boleh sama persis dengan kalimat pengantar. Percakapan sementara (`isPlaceholder`) dikecualikan dari aturan dua
pembicara, tetapi selalu memunculkan peringatan yang ditampilkan paling atas. Data contoh B06 memakai empat percakapan
sementara satu baris dari contoh kalimat lama; pengembang tidak menulis percakapan. Tidak diperiksa kode, wajib dijaga
penulis (README "Menulis percakapan"): semua percakapan ditulis tim dan tidak disalin dari 会話 buku Minna; lihat juga
D-72. **Alasan:** Kebocoran jawaban di baris lain dan sorotan di percakapan uji membuat soal bisa dijawab dengan
menyalin, sejenis dengan T-02. **Alternatif ditolak:** Percakapan dengan jumlah pembicara bebas (karakter pemain bisa
tidak ikut bicara).

### D-63 · 復習 per wilayah: 70% wilayah ini, 30% wilayah sebelumnya
**Tanggal:** 2026-09-29. **Keputusan:** 復習 wajib tuntas sebelum wilayah berikutnya terbuka, menggantikan aturan
"setiap 3 level" (D-13). Isinya memakai mekanisme level ulangan yang ada (D-32), dengan komposisi 70% item dari
wilayah ini dan 30% dari wilayah sebelumnya, diatur sebagai konstanta. **Alasan:** Tujuan awal level ulangan adalah
retensi; jika hanya mencakup satu wilayah, wilayah pertama tidak pernah diulang lagi setelah wilayah kedua dimulai.
**Alternatif ditolak:** Cakupan satu wilayah saja. **Diterapkan:** langkah 3.

### D-64 · Peta dari gambar dan pin 48 piksel
**Tanggal:** 2026-09-29. **Keputusan:** Peta adalah satu gambar dari tim; batas wilayah ada di dalam gambar dan tidak
digambar oleh kode. Setiap wilayah punya pin di koordinat persen dari data (`pin`), berupa tombol minimal 48×48 piksel
dengan ikon status dan persentase dalam bentuk teks, bukan warna saja. Daftar wilayah di bawah peta menjadi jalur
cadangan untuk pembaca layar. Pin kosong ditaruh di posisi sementara. **Alasan:** Dua belas wilayah bersekat tidak
beraturan di layar 375 piksel menghasilkan area sentuh di bawah 48 piksel. Gambar dan koordinat cocok dengan arah
"ganti aset" (D-70). **Alternatif ditolak:** Wilayah SVG yang bisa diklik (area sentuh kecil, dan batas wilayah
menjadi urusan kode). **Diterapkan:** langkah 3.

### D-65 · Furigana: tiga mode setelan, pengantar boleh berfurigana, D-29 selalu menang
**Tanggal:** 2026-09-29. **Keputusan:** Setelan furigana tiga tingkat (selalu tampil / tampil setelah menjawab /
tidak pernah), bawaan "selalu tampil", disimpan per pemain, dicatat di setiap baris log sebagai `furiganaMode`. Aturan
anti-bocor D-29 berlaku penuh di latihan, uji konteks, dan putaran pemantapan, dan **selalu menang** atas setelan.
Percakapan pengantar adalah momen mengajar, sehingga kotoba sasaran boleh tampil dengan furigana; di sana mode
"tampil setelah menjawab" berperilaku seperti "selalu tampil" karena tidak ada yang dijawab. **Alasan:** Percakapan
pengantar memang bertugas memperkenalkan bacaan. **Konsekuensi yang disadari:** jawaban benar pertama di soal cara
baca hanya mengukur ingatan jangka pendek; ukuran penguasaan tetap dari putaran pemantapan (D-06). **Diterapkan:**
langkah 2.

### D-66 · Data urutan guratan: slot kosong sampai lisensi diputuskan
**Tanggal:** 2026-09-29. **Keputusan:** Belum ada data guratan apa pun di repo. Entri kanji punya field `strokes`
yang selalu `null`; validator hanya menerima `null` atau jalur berkas gambar `.svg`/`.png`/`.webp`, sehingga berkas
KanjiVG maupun gambar buatan tim masuk lewat slot yang sama tanpa mengubah kode. Tab kanji belum punya kolomnya.
Jumlah guratan (`stroke_count`) diisi manual oleh tim dan diverifikasi. **Status:** *Menunggu dosen* — lisensi
KanjiVG (CC BY-SA 3.0: atribusi dan berbagi-serupa) dipastikan tim dengan dosen. **Alternatif ditolak:** Memasukkan
data KanjiVG sebelum lisensinya diputuskan.

### D-67 · Subtitle: teks Jepang berfurigana dengan terjemahan
**Tanggal:** 2026-09-29. **Keputusan:** Subtitle percakapan berisi kalimat Jepang dengan furigana (mengikuti D-65)
dan terjemahan bahasa Indonesia di bawahnya. Di percakapan pengantar terjemahan selalu tampil; di percakapan uji
terjemahan disembunyikan dan bisa dibuka dengan "Tampilkan arti", yang dicatat sebagai `hintUsed` (D-27).
**Diterapkan:** langkah 2.

### D-68 · Index: hanya di luar quest, isi terbatas wilayah terbuka, pembukaan dicatat sebagai peristiwa
*Batas isi index diganti D-79: hanya yang percakapan pengantarnya sudah dilewati.*
**Tanggal:** 2026-09-29. **Keputusan:** Index bisa dibuka kapan pun kecuali saat pemain berada di dalam quest atau
復習, dan hanya menampilkan kanji dan kotoba dari wilayah yang sudah terbuka. Index adalah rujukan, bukan progres:
membukanya tidak menuntaskan apa pun. Setiap pembukaan dicatat sebagai **satu baris peristiwa** (bukan jawaban),
berisi kanji atau kotoba yang dilihat dan penanda apakah pemain sedang punya quest yang belum tuntas. **Alasan:**
Jalur mencontek yang tersisa (keluar dari quest, buka index, kembali) hanya bisa diukur jika peristiwa ini tercatat;
biayanya kecil. **Alternatif ditolak:** Index bisa dibuka dari dalam quest; tidak mencatat pembukaan index.
**Diterapkan:** langkah 4.

### D-69 · Menu peta tiga pintu, terkunci di dalam quest dan 復習
**Tanggal:** 2026-09-29. **Keputusan:** Layar peta punya menu dengan tiga pintu: Index, Panduan hiragana/katakana, dan
Pengaturan. Ketiganya bisa dibuka dari mana pun di luar quest dan 復習 (peta, jendela pengantar bab, layar lain), dan
tidak tersedia di dalam quest atau 復習. Pemain selalu punya jalan keluar yang jelas dari quest ke peta; keluar di
tengah quest mengikuti aturan sesi yang belum selesai (progres tersimpan, quest bisa dilanjutkan). Ikon ketiga tombol
termasuk slot aset (D-70). **Alasan:** Satu quest selalu dikerjakan dalam satu kondisi furigana, sehingga data tidak
tercampur; index tidak bisa dipakai di tengah soal. **Diterapkan:** langkah 3.

### D-70 · Kontrak aset
**Tanggal:** 2026-09-29. **Keputusan:** (1) `ASSETS.md` mendaftar setiap slot aset dalam satu tabel untuk anggota tim
yang menggambar: nama berkas persis, folder, format, ukuran piksel, rasio, latar transparan, batas ukuran berkas, dan
layar tempat aset muncul. (2) Mengganti aset = menimpa berkas dengan nama yang sama; JSON dan kode tidak perlu diubah.
(3) Setiap placeholder adalah gambar yang menuliskan nama slot dan spesifikasinya. (4) Gambar dipaskan ke wadahnya,
sehingga aset dengan rasio atau ukuran yang sedikit keliru tidak merusak tata letak. (5) Halaman Pemeriksaan konten
memuat pemeriksa aset: slot yang masih placeholder, berkas yang hilang, dan berkas yang melebihi batas ukuran.
(6) Karakter: pilihan jadi saja; struktur datanya direncanakan supaya kustomisasi berlapis bisa ditambahkan kemudian,
tetapi tidak dibangun sekarang. (7) Pratinjau dan cetak untuk validator tidak bergantung pada aset. `MULAI-DI-SINI.md`
mendapat peran baru: pembuat aset. **Alasan:** Arah tim adalah struktur dulu, aset belakangan; batas ukuran penting
karena aplikasi dibuka di Android kelas bawah lewat jaringan pameran. **Diterapkan:** langkah 3 (peta, menu) dan
langkah 5 (karakter).

### D-71 · Keputusan kecil versi peta
**Tanggal:** 2026-09-29. **Keputusan:** Quest di dalam satu wilayah bebas urutan. Persentase wilayah = quest tuntas
dibagi jumlah quest; 復習 tampil sebagai tanda tersendiri. Wilayah tuntas = semua quest dan 復習 selesai. Header layar
quest hanya "Bab 6 · Quest 3", tanpa kotoba (lanjutan D-22). Setelan furigana disimpan per pemain dan ikut terhapus
saat reset. Disclaimer ("materi mengikuti cakupan みんなの日本語初級I bab 1–12; semua kalimat dan percakapan ditulis tim
pengembang") tampil di layar pertama sebelum pemilihan karakter, di menu Tentang, dan di kepala halaman pratinjau.
**Diterapkan:** langkah 2–5.

### D-72 · Aturan penulisan baris karakter pemain dan nama tokoh
**Tanggal:** 2026-09-29. **Keputusan:** Baris milik karakter pemain tidak memuat nama pemain maupun ragam bahasa yang
terikat jenis kelamin; tokoh lain tidak memanggil pemain dengan nama; nama tokoh buatan tim, bukan tokoh buku.
Aturan ini ditulis di README bagian "Menulis percakapan". **Alasan:** Pemain bisa memilih karakter mana pun, jadi
ucapan karakter pemain harus cocok untuk semua karakter; nama buatan tim selaras dengan larangan menyalin percakapan
buku (D-62).

### D-73 · Alur quest, keluar di tengah jalan, dan penerapan furigana
**Tanggal:** 2026-09-29. **Keputusan:** Satu quest = percakapan pengantar (tidak dinilai; baris muncul satu per satu,
bisa diulang) → putaran belajar berurutan Bentuk → Cara baca → Uji konteks → Produksi → putaran pemantapan (D-06).
Tombol **Keluar** selalu ada di kepala layar quest. Setiap jawaban langsung disimpan; quest yang dibuka lagi
meneruskan soal yang belum dijawab benar (putaran belajar) atau item yang belum dikuasai (pemantapan), dengan
pemberitahuan "Melanjutkan quest dari titik terakhir". Soal yang terbuka tetapi belum dijawab ditanyakan lagi, dan
percakapan pengantar yang ditinggalkan sebelum selesai diulang dari awal. Tiga keputusan penerapan furigana:
(1) mode "tidak pernah" juga berlaku di percakapan pengantar; (2) di umpan balik soal cara baca dan kartu kontras,
mode "tidak pernah" menampilkan cara baca sebagai kana di belakang kata, karena cara baca adalah isi umpan balik
itu; (3) di percakapan uji, furigana kanji sasaran selalu disembunyikan sebelum menjawab, di semua baris.
**Alasan:** Urutan antrean tidak disimpan, hanya fakta (streak, status), sesuai D-23, sehingga melanjutkan tidak
bisa rusak oleh perubahan materi. Mengulang pengantar yang terputus lebih aman daripada meneruskan di tengah
percakapan yang konteksnya sudah terlupa. **Alternatif ditolak:** Menyimpan posisi persis di antrean (rapuh
terhadap revisi materi); melarang keluar sebelum quest tuntas.

### D-74 · Streak global dan key progres baru
**Tanggal:** 2026-09-29. **Keputusan:** Streak setiap item disimpan sekali untuk seluruh permainan
(`progress.items`), bukan per level; status quest disimpan terpisah (`progress.quests`). Progres versi peta memakai
key `kanjiGame.progress.v2`; tidak ada migrasi dari `kanjiGame.progress.v1` milik cabang `main`, jadi pemain di
perangkat yang sama dianggap pemain baru (ID pemain baru, persetujuan ditanyakan lagi). Setelan furigana disimpan di
progres pemain. Log tetap memakai key yang sama dengan migrasi kolom otomatis. **Alasan:** Item Bentuk dipakai
bersama beberapa quest (D-61). ID item versi peta berbeda seluruhnya dari versi level, sehingga progres lama tidak
bisa dipetakan; mencampurnya justru merusak kedua versi. **Alternatif ditolak:** Streak per quest (soal Bentuk
diulang di setiap quest); memigrasikan persetujuan dari progres lama (persetujuan melekat pada pemain dan versi
aplikasi yang ia setujui).

### D-75 · Kapan `conversation_id` wajib diganti
**Tanggal:** 2026-09-29. **Keputusan:** Melengkapi D-57. Perbaikan kecil (salah ketik, furigana, terjemahan, satu
pengecoh) mempertahankan `conversation_id`. Percakapan yang ditulis ulang secara substansial, misalnya karena
validator menilainya ambigu, **wajib** diberi `conversation_id` baru. Aturan ini ditulis di README bagian
"Menulis percakapan". **Alasan:** Progres pemain tidak perlu direset untuk perbaikan kecil, tetapi soal yang maknanya
berubah memang soal baru, dan data log-nya tidak boleh dicampur dengan versi sebelumnya. `contentRevision` dan kolom
`prompt` tetap menjadi pengaman kedua. **Alternatif ditolak:** ID dari teks kalimat (D-05 lama; setiap salah ketik
yang dibetulkan mereset progres).

### D-76 · Label antarmuka berbahasa Jepang di `data/ui.json`
**Tanggal:** 2026-09-29. **Keputusan:** Aturan "tidak ada teks Jepang di kode" dipertahankan secara harfiah. Label
antarmuka seperti 復習, 熟語, 画数, dan 書き方 ditulis di `data/ui.json` dengan sintaks furigana materi
(`[復|ふく][習|しゅう]`), selalu ditampilkan dengan ruby (setelan furigana pemain tidak berlaku untuk label), dan
boleh punya padanan bahasa Indonesia opsional yang ditampilkan kecil di dekatnya (misalnya 画数, "jumlah guratan").
**Alasan:** Aturan itu ada supaya tim, termasuk dosen, bisa mengubah semua teks Jepang tanpa menyentuh kode.
Sasarannya mahasiswa semester 1, yang belum tentu mengenal istilah seperti 画数 dan 熟語. **Alternatif ditolak:**
Mengecualikan label antarmuka dari aturan. **Diterapkan:** langkah 3, saat label pertama (復習 di peta) dibutuhkan.

### D-77 · Kolom log versi peta dan baris pengantar
**Tanggal:** 2026-09-29. **Keputusan:** Kolom baru: `regionId`, `questId`, `questStep` (`intro`, `practice`, `test`,
`production`, `consolidation`, `review`, `spacer`), `conversationId`, `blankLine`, `targetKanji`, `furiganaMode`,
`introReplays`. `levelId` tetap ada dan berisi quest atau ulangan wilayah. Nilai `stage` kini `intro`, `shape`,
`reading`, `test`, `production`. Selesainya percakapan pengantar ditulis sebagai satu baris yang bukan jawaban
(`isCorrect` kosong, `responseMs` = lama membaca, `introReplays`). Semua pengaman tetap berlaku: tidak ada baris
tanpa persetujuan (D-50), tidak ada pengiriman selama teks persetujuan masih placeholder (D-52), penarikan menghapus
baris lokal (D-53). **Alasan:** `questStep` memisahkan latihan dan uji konteks di putaran belajar, yang di kolom
`phase` sama-sama `learning`. Lama membaca dan jumlah pengulangan pengantar mengukur keterlibatan pemain.
`appVersion` versi peta selama pengerjaan adalah `0.9.0` (cabang `main` tetap `0.5.0`), sehingga baris log kedua
versi selalu bisa dipisahkan.

### D-78 · Contoh percakapan di template ditulis tim; pengembang hanya memeriksa
**Tanggal:** 2026-09-29. **Keputusan:** Tim menulis satu percakapan sungguhan (pengantar dan uji untuk 食べます). Saat
diserahkan, pengembang menjalankan pemeriksa materi terhadapnya dan melaporkan hasilnya **tanpa memperbaiki isinya
sendiri**; perbaikan dikerjakan penulis. Setelah lolos, percakapan itu menggantikan percakapan sementara di
`tools/templates/`, `data/content.json`, dan README. Prosedurnya ditulis di README bagian "Kolom spreadsheet".
Sejalan dengan itu, jumlah guratan yang diisi pengembang (食 9, 飲 12) tetap berada di daftar verifikasi: yang penting
adalah prosesnya, yaitu setiap angka di data diperiksa manusia terhadap sumber, bukan diisi dari ingatan.
**Alasan:** Template adalah teladan yang akan ditiru; teladan itu harus tulisan tim (D-62) dan sudah lolos
pemeriksaan.

### D-79 · Materi quest tidak tampil di luar quest sebelum percakapan pengantarnya (perluasan D-29)
*Disempurnakan oleh D-100: percakapan pengantar menampilkan furigana untuk semua kata.*
**Tanggal:** 2026-09-29. **Keputusan:** Prinsip: **materi sebuah quest tidak ditampilkan di luar quest itu sebelum
pemain melewati percakapan pengantarnya**; setelah itu kotobanya boleh tampil, dan cara bacanya baru tampil jika
soal cara bacanya tidak lagi tertunda (quest tuntas atau cara baca dikuasai). Penerapan: (1) jendela bab
menampilkan "Quest n · arti" sebelum pengantar, dan kotobanya sesudahnya, sehingga daftar terisi seiring pemain
belajar; (2) index hanya berisi kanji dan kotoba yang pengantarnya sudah dilewati, menggantikan batas "wilayah
yang sudah terbuka" di D-68 (pencatatan pembukaan index tetap berlaku); kotoba yang bukan quest baru tampil
setelah semua quest di babnya tuntas, karena bacaannya bisa menjawab soal quest bab itu; (3) validator: `title`,
`intro.summary`, dan `intro.points` wilayah tidak boleh memuat kotoba **atau cara baca kotoba** quest di wilayah itu
(error), dan kanji sasarannya memunculkan peringatan; (4) pin peta hanya menampilkan bab, status, dan persentase;
(5) furigana kotoba quest lain yang cara bacanya masih tertunda disembunyikan di semua baris percakapan, termasuk
percakapan pengantar, dengan peringatan validator bagi baris yang memuat kotoba quest lain. Yang disembunyikan
hanya bacaan kanji **sebagaimana dibaca di kotoba itu** ([飲|の] selama quest 飲みます tertunda), bukan semua bacaan
kanji yang sama ([食|た] tetap tampil walaupun quest 食堂 tertunda). **Alasan:** Percakapan pengantar adalah momen
mengajar (D-65); tidak ada layar lain yang boleh mendahuluinya. Batas "wilayah terbuka" tidak menolong karena
wilayah terbuka sebelum quest-questnya dimainkan. **Alternatif ditolak:** Menyembunyikan seluruh daftar quest
sampai quest dimainkan (tidak memberi gambaran isi bab dan rasa kemajuan).

### D-80 · Urutan wilayah, persentase, dan 復習 dalam penerapan
**Tanggal:** 2026-09-29. **Keputusan:** Urutan main: wilayah, 復習-nya, wilayah berikutnya (D-55, D-63), diturunkan
dengan aturan kunci D-23 (`computeStatuses`). 復習 terbuka setelah semua quest wilayahnya tuntas. Sampel 復習
(10 item, 70/30, berimbang per quest, tanpa duplikat item Bentuk yang dipakai bersama) diambil saat pertama dibuka
dan disimpan bersama **streak lokal** di entri 復習, sehingga salah menjawab di 復習 tidak menurunkan penguasaan di
quest asal. Jika satu sisi (wilayah ini atau wilayah sebelumnya) kekurangan item, sisi lain menutupinya.
Tombol **Keluar** di quest dan 復習 kembali ke jendela bab. **Alasan:** Semua item di 復習 sudah dikuasai di
quest-nya; dengan streak global, 復習 akan langsung selesai tanpa satu soal pun. **Alternatif ditolak:** Streak
global di 復習 (tidak ada yang diulang); jawaban salah di 復習 membuka kembali quest asal (menghukum pemain yang
sudah lulus, dan membingungkan persentase peta).

### D-81 · Alamat halaman tidak memuat ID quest
**Tanggal:** 2026-09-29. **Keputusan:** Quest dibuka lewat wilayah dan posisinya (`#/quest/B06/2`), 復習 lewat
wilayahnya (`#/review/B06`), jendela bab lewat ID wilayah (`#/region/B06`). ID quest tetap dipakai di progres dan
log. **Alasan:** ID quest ditulis tim dan bisa mengeja kotobanya (`Q-tabemasu`), sehingga bacaan kotoba tampil di
bilah alamat sebelum quest dimainkan, pelanggaran D-79 yang tidak terlihat di layar aplikasi.

### D-82 · Penerapan kontrak aset
**Tanggal:** 2026-09-29. **Keputusan:** Daftar slot ada di `data/assets.json` (nama berkas, format, ukuran piksel,
transparansi, batas KB, layar, dan sidik SHA-256 placeholder); `ASSETS.md` menjelaskannya untuk pembuat aset, dan
uji otomatis memastikan keduanya selaras. Slot langkah 3: peta 1200×1600 PNG (3:4, maks 400 KB) dan tiga ikon menu
192×192 PNG transparan (maks 30 KB). Batas dipilih supaya layar pertama di bawah ±500 KB untuk Android kelas bawah
di jaringan pameran. Placeholder dibuat sekali dengan canvas dan menuliskan nama slot serta spesifikasinya. Gambar
ditampilkan di kotak dengan rasio slot dan `object-fit: contain`; berkas yang hilang diganti kotak bertanda "✗ …
hilang". Pemeriksa aset membandingkan sidik berkas dengan sidik placeholder, memeriksa ukuran berkas dan ukuran
piksel, dan memberi ✗ jika rasio meleset lebih dari 2% (pin peta bergeser). Pin tidak memakai aset; ikon status
berupa teks. **Alasan:** D-70. Placeholder dikenali lewat sidik, jadi tidak perlu penanda terpisah yang bisa lupa
dihapus. **Alternatif ditolak:** Placeholder SVG (format berbeda dari aset akhir, sehingga menimpa berkas tidak
lagi cukup).

### D-83 · Cakupan index di langkah 3
**Tanggal:** 2026-09-29. **Keputusan:** Langkah 3 membangun daftar index (kanji dan kotoba yang sudah diperkenalkan)
dan pencatatan pembukaannya: satu baris peristiwa per pembukaan (`questStep` = `index`, `phase` = `event`, `answer` =
kanji yang tampil, kolom baru `openQuests` = quest yang dimulai tetapi belum tuntas). Jendela kanji (bacaan, bushu,
画数, slot 書き方) dan jendela kotoba (kanji penyusun, 例文) dibangun di langkah 4 seperti rencana awal, dengan aturan
D-79: bushu dan bacaan kanji yang soalnya masih tertunda ikut disembunyikan. Panduan kana juga langkah 4; pintunya
sudah ada dan menampilkan pemberitahuan. **Alasan:** Laporan langkah 3 meminta tangkapan index sebelum dan sesudah,
yang cukup ditunjukkan oleh daftar; jendela detail adalah pekerjaan langkah 4.

### D-84 · Pengecoh cara baca otomatis hanya dari kotoba yang bacaannya sudah aman
**Tanggal:** 2026-10-12. **Keputusan:** Kumpulan pengecoh otomatis soal cara baca hanya mengambil bacaan kotoba yang
bagi pemain itu sudah tidak tertunda (sudah diperkenalkan dan cara bacanya dikuasai, quest-nya tuntas, atau kotoba
bukan quest dari bab yang semua quest-nya tuntas). Validator menghitung kandidat otomatis hanya dari kotoba **bab
sebelumnya**, karena hanya itu yang pasti aman saat quest dimainkan, dan peringatannya menjelaskan alasannya.
**Alasan:** のみます yang muncul sebagai pilihan salah untuk 食べます akan muncul lagi sebagai jawaban benar di quest
飲みます; paparan itu bisa mengacaukan soal tersebut ke dua arah. **Konsekuensi yang diterima:** quest awal di
wilayah pertama kekurangan kandidat otomatis; validator memberi peringatan dan tim mengisi pengecoh manual.

### D-85 · Pengecoh uji konteks manual dari quest lain: kebocoran kecil yang diterima dengan sadar
**Tanggal:** 2026-10-12. **Keputusan:** Pengecoh manual di uji konteks boleh berupa kotoba quest lain yang belum
dimainkan (misalnya 飲みます sebagai pengecoh 食べます). Tidak ada peringatan validator untuk kasus ini.
**Alasan:** Pengecoh terbaik untuk sebuah kotoba justru kotoba sejenis dari bab yang sama (飲みます, 見ます, 読みます).
Melarangnya menurunkan kualitas pengecoh tajam, padahal pengecoh adalah titik paling rawan di proyek ini (T-12).
Paparannya hanya berupa tulisan sebagai pilihan yang salah, tanpa bacaan dan tanpa arti, sehingga tidak mengajarkan
bushu maupun cara bacanya. Peringatan validator sengaja tidak dibuat supaya tim tidak terdorong menghindari
pengecoh terbaik. **Alternatif ditolak:** Melarang atau memperingatkan pengecoh dari quest yang belum dimainkan.
Ini pengecualian yang disengaja dari D-79.

### D-86 · Halaman yang memuat seluruh materi tidak ditautkan dari aplikasi
**Tanggal:** 2026-10-12. **Keputusan:** Tautan ke Pemeriksaan konten (`#/content-check`) dihapus dari Pengaturan, dan
pratinjau (`#/preview/all`, dibangun ulang di langkah 5) juga tidak akan ditautkan. Tim dan validator membukanya
lewat alamat yang dicatat di `MULAI-DI-SINI.md`, yang tidak ikut diunggah ke Netlify (begitu pula README dan
`DECISIONS.md`). **Batas yang harus disadari:** ini hanya mencegah **paparan tidak sengaja**, bukan kecurangan yang
disengaja. Situs statis tidak bisa menyembunyikan apa pun: `data/content.json` dapat dibuka langsung oleh siapa saja
yang tahu alamatnya dan isinya lebih lengkap daripada halaman mana pun; alamat rute juga terbaca di berkas JS yang
diunggah. Pengaman yang sebenarnya adalah data log: pembukaan index tercatat beserta quest yang sedang dikerjakan
(D-68, D-83), dan setiap jawaban mencatat waktu jawab serta apakah tab sempat ditinggalkan (`wasHidden`). Jangan
menganggap masalah ini tertutup sepenuhnya. **Alternatif ditolak:** Kata sandi di sisi browser (bisa dibaca di kode,
memberi rasa aman palsu).

### D-87 · Jendela index dan aturan tampilnya
**Tanggal:** 2026-10-12. **Keputusan:** Index tiga tingkat: daftar → jendela kanji (kanji besar, arti, 熟語/kotoba yang
sudah diperkenalkan) → detail kanji (音読み, 訓読み, 部首, 画数, JLPT, 書き方); daftar atau jendela kanji → jendela kotoba
(kanji penyusun beserta bacaannya, 例文). Aturan D-79 di tingkat detail: baris 音読み atau 訓読み disembunyikan selama
ada kotoba quest dengan kanji itu dan jenis bacaan itu yang soal cara bacanya tertunda, termasuk quest yang belum
dimulai; 部首 disembunyikan sampai soal Bentuk kanji itu dikuasai, karena bushu adalah jawabannya; 例文 hanya baris
percakapan yang sudah pernah dilihat (pengantar yang sudah disimak, uji yang sudah dijawab), dengan furigana bacaan
yang masih tertunda disembunyikan. Alamat yang diketik untuk isi yang belum diperkenalkan menampilkan "Belum tersedia"
dan tidak dicatat. Alamat jendela kotoba memakai posisi, bukan ID (D-81). Setiap pembukaan daftar dan jendela
dicatat sebagai baris peristiwa (`prompt` = `daftar`, `kanji`, `detail kanji`, atau `kotoba`; `answer` = yang dilihat).
Slot 書き方 menampilkan kotak kosong selama `strokes` bernilai `null` (D-66). **Alasan:** Detail kanji memuat jawaban dua
jenis soal (Bentuk dan cara baca), jadi aturan tampilnya harus per bagian, bukan per kanji.

### D-88 · Panduan kana dari data
**Tanggal:** 2026-10-12. **Keputusan:** Tabel hiragana dan katakana (46 dasar, 25 bunyi bersuara, 33 bunyi gabungan)
beserta romaji Hepburn ada di `data/kana.json`, dengan catatan tentang っ kecil dan tanda panjang ー. Satu tabel,
dengan tombol untuk beralih antara hiragana dan katakana. Uji otomatis memastikan setiap katakana sesuai pasangan
hiragananya. **Alasan:** Aturan "tidak ada teks Jepang di kode" (D-76); tim bisa menambah baris tanpa menyentuh kode.

### D-89 · Disclaimer dan layar sambutan
**Tanggal:** 2026-10-12. **Keputusan:** Pemain baru, termasuk setelah reset, pertama kali melihat layar sambutan
berisi disclaimer: materi mengikuti cakupan みんなの日本語初級I bab 1–12, dan semua kalimat serta percakapan ditulis
tim pengembang dan tidak disalin dari buku. Disclaimer yang sama ada di halaman Tentang aplikasi (tautan di bawah
peta dan di Pengaturan) dan akan ada di kepala pratinjau (langkah 5). Judul buku diambil dari `data/ui.json`
(label `bookTitle`, berfurigana). Pemilihan karakter (langkah 5) akan disisipkan setelah layar sambutan.
**Alasan:** D-71.

### D-90 · Kanji yang bushunya dirinya sendiri: kartu perkenalan, bukan soal Bentuk
**Tanggal:** 2026-10-12. **Keputusan:** Menyelesaikan D-15 (A9). Jika `bushu.char` sama dengan kanjinya (人, 日, 月, 木,
…), soal Bentuk ditiadakan. Setelah percakapan pengantar, quest menampilkan kartu tanpa nilai yang menyatakan bahwa
kanji ini sendiri merupakan bushu, beserta nama dan artinya. Kartu ini tidak dicatat sebagai jawaban dan tidak ikut
syarat kelulusan; `bushu_options` boleh kosong untuk kanji ini. Jendela detail kanji di index menampilkan kanji lain
yang memakai bushu yang sama (termasuk variannya), hanya yang soal Bentuknya sudah tidak tertunda (D-79). Deteksinya
dari data, tanpa daftar di kode. **Alasan:** Soal "pilih bushu dari kanji ini" untuk 日 jawabannya 日 itu sendiri, jadi
tidak menguji apa pun; di materi tim, hampir separuh kanji (16 dari 41) termasuk jenis ini. **Status:** *Menunggu
dosen*. **Alternatif ditolak:** Tetap menanyakannya (soal tanpa isi); mengganti dengan soal lain yang belum dirancang.

### D-91 · Penanda di dalam materi
**Tanggal:** 2026-10-12. **Keputusan:** Isi yang belum ditulis diberi penanda di teksnya, bukan dikosongkan.
`«NAMA-…»` menandai nama yang harus dibuat tim (pengganti nama tokoh, perusahaan, dan universitas dari buku) dan
selalu **error**, jadi materi yang masih memuatnya tidak bisa dimuat aplikasi. `«BELUM DIISI: …»`, `«TULIS ULANG: …»`,
dan `«PERIKSA: …»` mengikuti aturan draf (D-92). Setiap teks di materi diperiksa. **Alasan:** Kolom kosong tidak
membedakan "lupa" dari "belum ditulis", dan tidak bisa dicari di spreadsheet. Nama dari buku tidak boleh lolos ke
aplikasi dalam keadaan apa pun, karena materi tidak boleh disalin dari buku (D-62).

### D-92 · Kelengkapan dipaksa saat rilis, bukan saat draf
**Tanggal:** 2026-10-12. **Keputusan:** Selama `contentRevision` diawali `draft`, quest tanpa percakapan uji,
penanda `«BELUM DIISI»`/`«TULIS ULANG»`/`«PERIKSA»`, dan nilai `?` di `sentence_chapter` atau `stroke_count` hanya
memunculkan **peringatan**. Quest tanpa percakapan uji tetap bisa dimainkan: langkah uji dilewati, dan layar quest serta
jendela bab menandainya belum lengkap. Begitu revisi bukan draf, semuanya menjadi **error**. **Alasan:** Tim bisa
mencoba alur pengantar dan latihan dengan materi sungguhan tanpa menunggu puluhan percakapan uji selesai, sementara
materi yang belum lengkap tidak mungkin terbawa ke rilis.

### D-93 · Kotoba khusus index dari daftar jukugo
**Tanggal:** 2026-10-12. **Keputusan:** Kata dari daftar jukugo tim yang bukan kotoba quest diimpor sebagai kotoba
khusus index. Kotoba ini boleh berbab `null` (di luar buku); kotoba quest tetap wajib berbab 1–12. Aturan tampilnya:
kotoba khusus index muncul di index setelah **semua quest yang melatih salah satu kanjinya tuntas** (dan, jika babnya
punya wilayah, semua quest wilayah itu tuntas). Kotoba tanpa kanji sasaran apa pun tidak tampil. Kotoba berbab `null`
tidak ikut kartu kontras di soal cara baca. **Alasan:** Bacaan kotoba seperti 本日 (日 dibaca じつ) bisa menjawab soal
cara baca quest yang memakai kanji yang sama; menunggu quest-quest itu tuntas adalah penerapan langsung D-79. Kotoba
ini tidak punya percakapan pengantar, jadi tidak ada momen pengenalan lain. **Alternatif ditolak:** Menampilkannya
setelah wilayah tertentu terbuka (wilayahnya tidak ada untuk kata di luar buku).

### D-94 · Ilustrasi adegan per percakapan
**Tanggal:** 2026-10-12. **Keputusan:** Deskripsi ilustrasi dari dokumen tim menjadi kolom `scene`. Setiap percakapan
punya slot gambar `assets/adegan/<ID percakapan>.png` (960×640, 3:2, maks 150 KB), tampil di atas percakapan pengantar
dan uji, dengan deskripsi sebagai keterangan di bawahnya. Selama berkasnya belum ada, kotak bertuliskan nama berkas dan
ukurannya menggantikan gambar, sehingga kotak itu bersama deskripsinya menjadi brief bagi tim aset. Slot ini tidak
punya berkas placeholder; pemeriksa aset menandai berkas yang belum ada dengan ⚠, bukan ✗. **Alasan:** Puluhan berkas
placeholder akan dibuat ulang setiap kali ID percakapan berubah; kotak dari kode selalu sesuai data.

### D-95 · Impor materi tim: menyalin, bukan menulis
**Tanggal:** 2026-10-12. **Keputusan:** Isi `konteks.docx` disalin ke lima CSV di `sumber/impor/` (tidak masuk git,
tidak diunggah), bersama `CATATAN-IMPOR.md` berisi tanda per butir. Satu butir = satu quest dengan kotoba dari kurung
di dokumen, kecuali tiga koreksi yang ditetapkan (一階, 八百, 九時); pembagian wilayah mengikuti tabel tim. Yang
**disalin**: kalimat percakapan, pilihan A–D sebagai pengecoh cara baca, deskripsi ilustrasi, arti dari daftar jukugo.
Yang **diisi pengembang sebagai draf dan masuk daftar verifikasi**: furigana setiap baris (dokumen tidak berfurigana),
data kanji (bushu, pilihan bushu, guratan, bacaan kun/on, JLPT), `reading_type` dan `pos`, serta pembagian pembicara.
Yang **tidak diisi** dan diberi penanda: terjemahan, arti kotoba dan kanji, nama dan ringkasan wilayah,
`sentence_chapter`, percakapan uji. Nama dari buku diganti penanda `«NAMA-…»` (D-91). Butir 車 tidak diimpor karena
babnya belum diketahui; isinya tercatat di catatan impor. **Pembicara:** baris yang memuat nama selalu diucapkan
lawan bicara; pada tiga butir (学生, 会社, 社員) kedua baris memuat nama atau identitas, sehingga ditandai untuk ditata
ulang tim. **Alasan:** Materi adalah karya tim; pengembang hanya memindahkan format dan menandai kekurangannya.

### D-96 · Alat ekspor ke `main` dibatalkan; `main` diarsipkan dengan tag
**Tanggal:** 2026-10-12. **Keputusan:** Membatalkan alat ekspor satu arah dari D-54. Di langkah 5, `main` yang sekarang
diberi tag `v1-akhir` sebagai arsip cadangan, lalu `desain-peta` digabung ke `main`. **Alasan:** (1) `desain-peta` sudah
bisa dimainkan utuh dan teruji di empat langkah; (2) materi sungguhan tim hanya ada dalam skema v2 dan memakai hal yang
tidak dikenal skema lama (ilustrasi adegan, kotoba khusus index, kartu bushu), sehingga ekspor hanya menghasilkan versi
yang jauh lebih miskin untuk validator; (3) alat ekspor harus dirawat setiap kali skema v2 berubah, padahal skema itu
masih berubah. Tag memberi cadangan tanpa biaya perawatan.

### D-97 · Aturan pembicara diperjelas: pemain tidak menyebut identitas dirinya
**Tanggal:** 2026-10-13. **Keputusan:** Mengoreksi penerapan D-72 di impor Bagian A, yang memakai aturan terlalu luas
("baris yang memuat nama selalu diucapkan tokoh lain"). Aturan yang benar: karakter pemain **tidak menyebut nama atau
identitas dirinya sendiri** (nama, pekerjaan, perusahaan, asal negara, status lain miliknya); pemain **boleh** menyebut
nama orang lain dan nama entitas, misalnya bertanya 「«NAMA»さんは学生ですか」. Butir 7–11 diatur ulang: pemain bertanya,
tokoh lain menjawab; tanda "pembicara tidak bisa diatur" pada butir 8, 9, dan 10 dihapus. **Alasan:** Tujuan aturan ini
adalah bahwa ucapan pemain cocok untuk karakter mana pun; menyebut orang lain tidak mengganggu tujuan itu.

### D-98 · Kanji angka ditanyakan sebagai kata dalam konteks; peringatan pengecoh yang berupa bacaan kanji
**Tanggal:** 2026-10-13. **Keputusan:** Kotoba quest kanji angka mengikuti kata dalam percakapannya: 二階, 三百, 四階,
六時, 七時, 十万 (bersama 一階, 八百, 九時 dari D-95); 五 tetap. Pengecoh dari dokumen tidak berlaku lagi untuk keenamnya
dan ditandai harus ditulis ulang; `note` 三百 menunggu penjelasan perubahan bunyi. Validator memberi **peringatan** jika
pengecoh cara baca sama dengan salah satu bacaan kanji kata itu di tabel kanji. **Alasan:** Kanji angka sendirian punya
lebih dari satu bacaan sah (四: し/よん, 七: しち/なな, 十: じゅう/とお), sehingga pengecoh seperti し untuk 四 sebenarnya
juga benar: kelas cacat paling dominan di proyek ini (T-12). Peringatan, bukan error, karena bacaan kanji tidak selalu
bacaan kata (じん adalah bacaan 人, tetapi bukan bacaan kata 人). Peringatan ini langsung menemukan ばん sebagai pengecoh
万 di materi tim.

### D-99 · Quest 何 pindah ke B01 dengan kotoba 何歳
**Tanggal:** 2026-10-13. **Keputusan:** 何 sebagai kata tunggal (なん) baru diajarkan di bab 2, tetapi 何歳 ada di kosakata
bab 1. Quest 何 pindah ke B01 dengan kotoba 何歳 (arti dari daftar jukugo: "umur berapa?"). Percakapan dokumen
(それは何ですか…) tidak cocok untuk kotoba ini dan disimpan di catatan impor sebagai bahan tidak terpakai; percakapan
pengantar 何歳 sementara satu baris penanda (`isPlaceholder`) dan harus ditulis tim; pengecohnya harus ditulis ulang.
**Alasan:** 何 muncul di banyak baris bab 1–4 (お名前は何ですか di quest pertama B01), jadi sebaiknya dipelajari sedini
mungkin.

### D-100 · Penyempurnaan D-79: furigana penuh di percakapan pengantar
**Tanggal:** 2026-10-13. **Keputusan:** Di percakapan pengantar, furigana tampil untuk **semua** kata, termasuk kotoba
milik quest lain, mengikuti setelan furigana pemain. Di latihan, uji konteks, Produksi, pemantapan, dan 復習, D-79
tetap berlaku penuh. Peringatan validator "baris memuat kotoba quest lain" kini hanya untuk percakapan uji.
**Alasan:** Kalimat seperti お名前は何ですか di quest pertama tidak bisa dibaca mahasiswa jika furigana 何 disembunyikan,
padahal 何 termasuk kanji yang paling sering muncul. Percakapan pengantar adalah momen mengajar (D-65); paparan bacaan
di sana adalah paparan belajar, sama seperti buku pelajaran, bukan kebocoran jawaban. Ukuran penguasaan tetap dari
putaran pemantapan (D-06), bukan dari jawaban pertama. **Alternatif ditolak:** Menyembunyikan furigana quest lain di
percakapan pengantar (D-79 versi langkah 3), yang membuat kalimat pengantar tidak terbaca.

---

## Bagian 2 — Temuan kendali mutu internal

### T-01 · Dua kalimat contoh memiliki lebih dari satu jawaban benar
**Tanggal:** 2026-09-13. **Temuan:** Saat mengisi pengecoh manual, dua kalimat contoh ternyata dapat
diisi lebih dari satu pilihan. (1) `今晩何を食べますか。` — kata tanya 何 membuat 飲みます, 読みます, dan
書きます juga benar. (2) `きょうはいい天気ですね。` — `いい食事ですね` juga kalimat wajar, sehingga pengecoh
食事 menjadi jawaban benar kedua. **Tindakan:** Kalimat pertama diganti `レストランで晩ごはんを食べます。`
(objek 晩ごはん hanya cocok dengan 食べます); kalimat kedua diganti `あしたの天気は雨です。` (keterangan 雨
hanya cocok dengan 天気). **Dampak:** Menjadi dasar D-19. Kedua kasus dijadikan bahan pelatihan tim konten
di README bagian "Menulis kalimat contoh yang tidak ambigu".

### T-02 · Umpan balik membocorkan jawaban soal berikutnya
**Tanggal:** 2026-09-13. **Temuan:** Pada pengujian tahap 2, panel kontras di umpan balik soal 食べます
menampilkan 食事 beserta furigana しょくじ dan tabel on'yomi ショク, tepat sebelum soal cara baca 食事.
Kebocoran serupa ditemukan pada furigana kotoba di umpan balik tahap 4 selama Putaran Pemantapan, pada
daftar kotoba dan contoh kalimat tahap 5, dan pada contoh petunjuk hiragana (まいあさパンをたべます).
**Tindakan:** Menerapkan D-29; contoh petunjuk diganti menjadi campuran hiragana dan kanji
(まいあさパンを食べます). **Dampak:** Jawaban benar pada Putaran Pemantapan tidak lagi dapat diperoleh dari
tampilan yang baru saja dilihat.

### T-03 · Risiko kehilangan data log saat penyimpanan penuh
**Tanggal:** 2026-09-13. **Temuan:** Pada tinjauan kode logger sebelum commit langkah 2, ditemukan bahwa
jika penyimpanan penuh tepat ketika potongan log baru harus dimulai, potongan sebelumnya yang sudah
berisi 200 baris dapat tertimpa pada penulisan berikutnya. **Tindakan:** Logger menyusun keadaan baru
lebih dulu dan baru memakainya setelah kedua penulisan berhasil; uji otomatis untuk kasus batas ini
ditambahkan. **Dampak:** Kegagalan penyimpanan tidak lagi dapat menghapus data yang sudah tersimpan.

### T-04 · Contoh pada spesifikasi awal bertentangan dengan aturan urutan bab
**Tanggal:** 2026-09-13. **Temuan:** Saat menyusun data, urutan level contoh 食 → 飲 → 行 bertentangan
dengan nomor bab yang disepakati (食 dan 飲 bab 6, 行 bab 5) dan dengan aturan bab menaik. Pada saat yang
sama ditemukan bahwa definisi `chapter` ambigu (食堂 di 第3課, 銀行 di 第4課). **Tindakan:** D-10 dan D-11.
**Dampak:** Aturan urutan dan definisi bab kini diperiksa otomatis oleh validator.

### T-05 · Kesalahan isi pada spesifikasi awal
**Tanggal:** 2026-09-13. **Temuan:** Tinjauan spesifikasi sebelum pembangunan menemukan bushu 食 tercatat
sebagai 飠, bab 13 untuk 食 (bab kemunculan 食事, bukan 食べます), dan kotoba kata kerja dalam bentuk kamus
yang belum diajarkan pada semester 1. **Tindakan:** D-09, D-11, dan D-12. Seluruh nomor bab dimasukkan
ke daftar periksa verifikasi terhadap buku (D-17). **Dampak:** Kesalahan isi terdeteksi sebelum data
sampai ke validator ahli.

### T-06 · Tulisan "null" muncul di layar Pengaturan
**Tanggal:** 2026-09-13. **Temuan:** Pemeriksaan tangkapan layar menunjukkan kata "null" di bawah judul
Pengaturan. Penyebabnya, bagian yang sengaja dikosongkan diserahkan langsung ke fungsi DOM yang mengubah
nilai kosong menjadi teks. Uji otomatis tidak menangkapnya karena semua tombol tetap berfungsi.
**Tindakan:** Layar disusun lewat pembangun elemen yang menyaring nilai kosong; pemanggilan serupa lain
diperiksa. **Dampak:** Menegaskan kebiasaan memeriksa tangkapan layar di setiap langkah.

### T-07 · Dua tab aplikasi saling menimpa progres
**Tanggal:** 2026-09-13. **Temuan:** Saat pengujian, progres yang ditulis ke penyimpanan tertimpa oleh
aplikasi yang masih terbuka di halaman yang sama, karena aplikasi menyimpan progres dari memorinya
sendiri. Situasi yang sama terjadi jika aplikasi dibuka di dua tab. **Tindakan:** D-38, lalu D-43 (deteksi otomatis).
**Dampak:** Risiko dikendalikan lewat prosedur pameran dan spanduk peringatan; log jawaban tidak terdampak.

### T-08 · Pengiriman yang sedang berjalan dapat menandai baris baru sebagai terkirim
**Tanggal:** 2026-09-13. **Temuan:** Pada tinjauan kode, ditemukan bahwa jika log dihapus ketika sebuah
kelompok baris sedang dikirim, konfirmasi pengiriman itu akan menandai baris baru (yang belum terkirim)
sebagai terkirim. **Tindakan:** Log diberi penanda generasi yang berubah setiap kali dihapus; konfirmasi
dari generasi lama diabaikan. Uji otomatis ditambahkan. **Dampak:** Tidak ada baris yang dapat hilang dari
pengiriman karena penghapusan log.

### T-09 · Hasil cetak pratinjau: ruang kosong besar dan tanda air tertutup
**Tanggal:** 2026-09-13. **Temuan:** Pemeriksaan PDF hasil cetak menunjukkan dua cacat: judul "Kotoba"
tertinggal sendirian di bawah halaman dengan ruang kosong besar karena isinya dilarang terpotong
antarhalaman, dan tanda air DRAF hanya terlihat penuh di halaman pertama karena tertutup latar kartu.
**Tindakan:** Kotoba boleh berlanjut ke halaman berikutnya (unit kecil seperti contoh kalimat tetap utuh),
judul dijaga agar tidak terpisah dari isinya, dan latar kartu dibuat transparan saat dicetak.
**Dampak:** Tanda air DRAF tercetak di setiap halaman dan tata letak cetak tidak membuang kertas.

### T-10 · みんなの日本語初級I tidak mengajarkan kanji secara bertahap
**Tanggal:** 2026-09-14. **Temuan:** Verifikasi nomor bab terhadap buku oleh kelompok menunjukkan bahwa kanji
sudah muncul di daftar kosakata sejak 第1課 (lebih dari 30 kanji di pelajaran 1 saja, misalnya 先生, 学生,
会社員, 銀行員, 医者, 大学, 病院, 電気), tanpa mahasiswa dituntut menguasainya di bab itu. Kanji diajarkan
berurutan di mata kuliah Hyouki. Asumsi "urutan level = urutan bab Minna" (D-11) karenanya tidak dapat
dipakai. **Tindakan:** D-39, D-40, D-41. Nomor bab yang terverifikasi dicatat di README. **Dampak:** Urutan
level kini menunggu urutan kanji dari mata kuliah Hyouki; urutan level yang ada di data bersifat sementara.

### T-11 · Pengecoh draf untuk kalimat 電気 ternyata dapat benar
**Tanggal:** 2026-09-14. **Temuan:** Saat menyusun kalimat `電気をつけます。`, pengecoh 食事 yang semula dipilih
ternyata membentuk kalimat wajar `食事をつけます` ("menyertakan makan", misalnya pada paket hotel), sehingga
menjadi jawaban benar kedua. **Tindakan:** Pengecoh diganti 天気, 雨, dan 朝, yang tidak dapat "dinyalakan".
**Dampak:** Contoh tambahan untuk bagian README "Menulis kalimat contoh yang tidak ambigu": kata kerja dengan
banyak makna (つけます) memperluas kemungkinan jawaban benar kedua.

### T-12 · Pola: pengecoh yang juga benar adalah kelas cacat paling dominan
**Tanggal:** 2026-09-14. **Temuan:** Tiga cacat dari jenis yang sama ditemukan selama pengembangan: dua kalimat
ambigu pada T-01 dan pengecoh 食事 untuk 電気をつけます pada T-11. Semuanya lolos dari penulisan yang hati-hati dan
tidak dapat dideteksi kode. **Tindakan:** README menyatakan pola ini secara eksplisit di bagian penulisan kalimat,
bukan hanya menampilkan contoh, dan daftar periksa sebelum validasi ahli mewajibkan anggota tim lain
mengerjakan seluruh soal tanpa melihat jawaban. **Dampak:** Pemeriksaan pengecoh oleh manusia menjadi langkah
kendali mutu yang wajib, bukan opsional.

### T-13 · Tampilan "tanpa furigana" menulis cara baca dalam kana
**Tanggal:** 2026-09-29. **Temuan:** Pada tangkapan layar index langkah 3, kotoba 飲みます yang soal cara bacanya
belum dikuasai tampil sebagai "飲みます (のみます)". Fungsi tampilan kotoba hanya mengenal dua pilihan, furigana
atau tidak; pilihan "tidak" dibuat untuk umpan balik soal cara baca di mode furigana "tidak pernah" (D-73), dan
menulis bacaannya dalam kana. Ketika index dan jendela bab memakainya untuk arti "jangan tampilkan bacaan", bacaan
justru bocor dalam bentuk lain. Kartu kotoba di akhir percakapan pengantar pada mode "tidak pernah" terkena
masalah yang sama. **Tindakan:** Tiga pilihan tampilan yang eksplisit: furigana, kana (hanya untuk umpan balik
jawaban), dan tanpa bacaan. Index, jendela bab, dan kartu pengantar pada mode "tidak pernah" memakai "tanpa
bacaan". Uji otomatis memastikan "tanpa bacaan" menghasilkan kata saja. **Dampak:** Sejenis T-02: kebocoran
lewat jalur tampilan yang dipakai ulang untuk tujuan lain. Hanya terlihat dari tangkapan layar, bukan dari uji
logika.

### T-14 · Panduan kana tampil sebagai teks "[object HTMLDivElement]"
**Tanggal:** 2026-10-12. **Temuan:** Pada tangkapan layar pertama panduan kana, isi halaman tampil sebagai
"[object HTMLDivElement],[object HTMLElement],…". Daftar elemen bersarang diteruskan langsung ke `replaceChildren`,
yang mengubahnya menjadi teks. **Tindakan:** Isi disusun lewat `h()`, yang meratakan daftar bersarang dan melewati
`null`, persis seperti perbaikan T-06. **Dampak:** Kesalahan jenis yang sama terulang di layar baru; setiap
`replaceChildren` yang baru ditulis diperiksa ulang. Uji logika tidak menangkapnya, tangkapan layar menangkapnya.

### T-15 · Folder `assets/` tidak ada di daftar unggahan Netlify
**Tanggal:** 2026-10-12. **Temuan:** Saat memeriksa berkas mana yang ikut diunggah (untuk D-86), ternyata folder
`assets/` yang ditambahkan di langkah 3 belum masuk tabel "Salin" di README bagian deploy. Situs yang diunggah
mengikuti panduan akan tampil tanpa peta dan ikon. **Tindakan:** `assets/` ditambahkan ke daftar salin, dan
`ASSETS.md` ke daftar jangan salin. **Dampak:** Setiap folder baru yang dibaca aplikasi harus ikut diperiksa di
panduan deploy.

### T-16 · On'yomi 日 disembunyikan tanpa alasan
**Tanggal:** 2026-10-12. **Temuan:** Pada tangkapan layar umpan balik soal cara baca 日本 dari materi tim, baris on'yomi
tabel bacaan 日 disembunyikan, dengan pesan versi lama "Ditampilkan setelah soal On'yomi dijawab". Penyebabnya:
kotoba khusus index yang berbab `null` (今日, 本日, 来日, …) ikut terhitung sebagai kotoba "bab sebelumnya", karena di
JavaScript `null <= 1` bernilai benar; kotoba itu belum boleh tampil, sehingga jenis bacaannya ikut disembunyikan.
**Tindakan:** Kartu kontras hanya mengambil kotoba yang babnya bilangan bulat; pesannya diganti "Tampil setelah soal
cara bacanya kamu kuasai". Uji otomatis ditambahkan. **Dampak:** Bukan kebocoran, tetapi penyembunyian berlebihan
yang membuat umpan balik kehilangan isinya. Terlihat hanya dengan materi sungguhan.
