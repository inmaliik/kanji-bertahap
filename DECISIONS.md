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

### D-11 · Definisi `chapter` dan urutan level
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

### D-18 · Tabel cara baca tidak menampilkan notasi bentuk kamus secara mentah
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

### D-27 · Terjemahan kalimat tahap 4 ditampilkan setelah menjawab *(Menunggu dosen)*
**Tanggal:** 2026-09-13. **Keputusan:** Terjemahan bahasa Indonesia baru muncul di umpan balik.
**Alasan:** Jika terjemahan ditampilkan lebih dulu, arti kotoba sasaran langsung terbaca dari
terjemahan, sehingga soal berubah menjadi mencocokkan arti, bukan memahami kotoba dalam konteks
kalimat Jepang. Keputusan ini mungkin terlalu berat bagi mahasiswa semester 1 dan perlu ditinjau
setelah uji coba. **Alternatif ditolak:** Terjemahan selalu tampil; tombol "tampilkan terjemahan"
(ditunda karena pemakaiannya perlu dicatat sebagai variabel tersendiri).

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
