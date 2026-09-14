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

- **D-15** — Varian soal tahap Bentuk untuk kanji yang sekaligus bushu (misalnya 食 → 食): soal apa yang dipakai sebagai pengganti?
- **D-18** — Tabel cara baca menampilkan okurigana redup (た + べる kecil) alih-alih notasi bentuk kamus た(べる): apakah tampilan ini diterima?
- **D-20** — Pengecoh lintas jenis bacaan (misalnya しょくべます untuk 食べます): bolehkah bentuk yang salah ditampilkan kepada pemula?

*Terakhir diperbarui: 2026-09-13.*

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
**Tanggal:** 2026-09-13. **Keputusan:** Tahap Bentuk tetap berjalan seperti spesifikasi. Field opsional
`bushu.variants` ditambahkan sekarang tetapi belum dipakai logika mana pun. **Alasan:** Untuk kanji yang
sekaligus bushu (食 → 食), soal terlihat identik dengan jawabannya. Namun varian soal lain (misalnya
"kanji mana yang memakai bushu ini?") belum memiliki cukup kandidat jawaban dengan tiga level, dan
pilihannya adalah keputusan pedagogis yang harus dibahas dengan dosen. Menyiapkan field sejak awal
mencegah tim konten mengisi ulang puluhan level nanti. **Alternatif ditolak:** Menetapkan varian soal
sendiri pada tahap scaffold.

### D-16 · Materi ditulis di spreadsheet, dikonversi dan diperiksa dengan alat baris perintah
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
**Tanggal:** 2026-09-14. **Keputusan:** Daftar level hanya dikelompokkan per `jlptLevel`, dengan urutan array
di dalam kelompok. Setiap kartu level menampilkan semua bab kotobanya, misalnya "Minna bab 3, 6, 13", dan
"di luar buku" jika ada kotoba ber-`chapter` null. **Alasan:** Setelah D-39, pengelompokan per bab akan
memecah daftar menjadi potongan yang urutannya melompat-lompat dan tidak mencerminkan urutan belajar.
Menampilkan semua bab memberi tahu pemain dari bab mana saja kata dalam level berasal. **Alternatif
ditolak:** Pengelompokan per bab; label hanya bab terkecil.

### D-41 · Penanda "Kelas sudah sampai bab" tanpa penguncian
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
