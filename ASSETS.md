# Aset gambar — panduan untuk pembuat aset

Dokumen ini untuk anggota tim yang **menggambar**. Tidak perlu membuka kode.

Aplikasi sudah jalan dengan **gambar placeholder**: kotak abu-abu bergaris putus-putus yang menuliskan nama slot,
ukuran, dan formatnya. Tugas Anda hanya menggantinya dengan gambar buatan tim.

## Cara mengganti satu aset

1. Lihat tabel di bawah: cari slotnya, catat **nama berkas persis**, **folder**, **ukuran**, dan **format**.
2. Buat gambarnya dengan ukuran dan format itu.
3. **Timpa** berkas lama di folder yang sama dengan nama yang **persis sama** (huruf kecil semua, ekstensi
   sama). Tidak ada file lain yang perlu diubah: tidak perlu menyentuh JSON, tidak perlu menyentuh kode.
4. Serahkan berkasnya ke pengelola aplikasi, atau timpa sendiri di folder proyek lalu unggah ulang ke Netlify
   (README bagian "Menaruh aplikasi di Netlify").
5. Periksa di aplikasi: buka halaman **Pemeriksaan konten dan aset** (alamatnya ada di `MULAI-DI-SINI.md`,
   bagian "Alamat halaman untuk tim"), bagian **Aset gambar**. Slot yang sudah diganti
   bertanda ✓; yang masih placeholder bertanda ⚠; berkas yang hilang, terlalu besar, atau salah rasio bertanda ✗.

## Daftar slot

| Slot | Berkas (nama persis) | Format | Ukuran (piksel) | Rasio | Latar | Batas ukuran berkas | Muncul di |
|---|---|---|---|---|---|---|---|
| `potongan-peta` | `assets/peta/<nama potongan>.png`, satu per potongan, nama sesuai daftar di `data/map.json`, misalnya `assets/peta/potongan-01.png` | PNG | 1080 × 1440 | 3 : 4 (tegak) | tidak transparan | 150 KB per potongan | Peta, layar utama: potongan-potongan latar yang disambung dari atas ke bawah |
| `lokasi` | `assets/lokasi/<ID wilayah>.png`, satu per wilayah, misalnya `assets/lokasi/B06.png` | PNG | 256 × 256 | 1 : 1 | **transparan** | 40 KB | Peta: ikon lokasi (gedung, toko, stasiun, …) satu per wilayah |
| `jalur` (opsional) | `assets/peta/jalur.png` | PNG | 64 × 64, ubin berulang | 1 : 1 | **transparan** | 10 KB | Peta: motif jalur antar lokasi |
| `menu-index` | `assets/ui/menu-index.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu di peta dan layar lain di luar quest: tombol Index |
| `menu-kana` | `assets/ui/menu-kana.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Panduan kana |
| `menu-pengaturan` | `assets/ui/menu-pengaturan.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Pengaturan |
| `karakter-hana`, `karakter-kazu` | `assets/karakter/hana.png`, `assets/karakter/kazu.png` | PNG | 1080 × 1080 | 1 : 1 | **transparan** | 150 KB | Pemilihan karakter; potret pembicara di percakapan |
| potret (opsional) | `assets/karakter/<id>-potret.png`, misalnya `assets/karakter/hana-potret.png` | PNG | 512 × 512 | 1 : 1 | **transparan** | 60 KB | Menggantikan potongan otomatis di potret percakapan |
| `adegan` | `assets/adegan/<ID percakapan>.png`, satu per percakapan, misalnya `assets/adegan/C-B01-01-pengantar.png` | PNG | 960 × 640 | 3 : 2 (mendatar) | tidak transparan | 150 KB | Di atas percakapan pengantar dan percakapan uji |

Slot karakter pemain dan tokoh percakapan ditambahkan di tahap berikutnya dan akan didaftarkan di tabel ini.

## Yang digambar tim dan yang dibuat kode

| Digambar tim (berkas gambar) | Dibuat kode (CSS, dengan palet dan garis tinta) |
|---|---|
| Karakter | Tombol, kartu, tab |
| Potongan latar peta | Lembar pengantar bab yang muncul dari bawah layar |
| Ikon lokasi | Bilah progres, bilah level dan XP |
| Motif jalur | Lencana persentase, lencana eksplorasi, gembok, tanda centang |
| Ilustrasi adegan | Keadaan terkunci lokasi (dipucatkan dan diberi gembok) |
| Ikon menu | Bilah menu di bawah layar |

**Alasannya:** elemen antarmuka berbentuk gambar memberatkan ponsel kelas bawah, buram di ukuran layar tertentu, dan
teks di dalamnya tidak bisa dibaca pembaca layar. Jadi jangan menggambar tombol, panel, atau bilah; cukup gambar yang
ada di kolom kiri. Semua desain untuk **tampilan tegak 375 piksel**; gambar referensi tim yang mendatar hanya diambil
strukturnya, bukan tata letaknya.

## Aturan umum

- **Gambar dipaskan ke kotaknya.** Kalau ukuran atau rasionya sedikit keliru, tampilan tidak rusak: gambar
  diperkecil sampai muat, dan sisanya dibiarkan kosong. Tetapi usahakan persis, terutama rasio potongan peta (lihat di bawah).
- **Batas ukuran berkas itu penting.** Aplikasi akan dibuka di ponsel Android kelas bawah lewat jaringan pameran
  yang dipakai banyak orang sekaligus. Seluruh gambar di layar pertama sebaiknya di bawah ±500 KB. Jika berkas
  terlalu besar, kompres dengan alat seperti Squoosh (situs `squoosh.app`, pilih OxiPNG atau kurangi jumlah warna).
- **Latar transparan** untuk ikon: bagian di luar gambar harus benar-benar transparan (bukan putih), karena
  tombolnya punya warna latar sendiri.
- **Tidak ada teks penting di dalam gambar.** Nama tombol dan wilayah sudah ditulis aplikasi di sebelahnya, dan
  teks di dalam gambar tidak terbaca pembaca layar.
- **Jangan menaruh materi di gambar**, misalnya kanji atau kotoba yang diajarkan di sebuah wilayah. Peta dan menu
  tampil sebelum quest dimainkan, jadi gambar yang memuat materi membocorkan jawaban.

## Lokasi di peta (`assets/lokasi/`)

- **Satu ikon per wilayah**, nama berkasnya ID wilayah: bab 1 → `B01.png`, bab 6 → `B06.png`. Setiap wilayah adalah
  satu tempat di kota: gedung, toko, stasiun, dan sejenisnya.
- **Cukup satu gambar per lokasi.** Keadaan terkunci dibuat kode (dipucatkan dan diberi lencana gembok), persentase
  progres dan nama bab ditulis kode di bawah ikon. Tidak perlu menggambar versi terkunci atau versi tuntas.
- 256 × 256, transparan, maks 40 KB; tampil ±64 piksel. Bentuk yang jelas pada ukuran kecil lebih penting daripada detail.
- Selama berkasnya belum ada, peta menampilkan lingkaran bertuliskan ID wilayah. Pemeriksa aset menandainya ⚠.
- **Jangan menulis nama tempat, kanji, atau kotoba di dalam ikon.** Nama lokasi diambil dari judul wilayah di
  spreadsheet, yang diperiksa supaya tidak membocorkan kotoba.

## Jalur antar lokasi (`assets/peta/jalur.png`, opsional)

- Satu **ubin motif** 64 × 64 transparan yang diulang sepanjang jalur antar lokasi (misalnya batu jalan atau rel).
  Jalurnya sendiri digambar kode, mengikuti urutan wilayah.
- Tanpa berkas ini, jalur tampil sebagai garis putus-putus tinta. Jalur juga boleh digambar langsung di latar peta;
  dalam hal itu ubin ini tidak perlu dibuat.

## Peta (`assets/peta/potongan-*.png` dan `data/map.json`)

Peta adalah **susunan potongan gambar tegak yang disambung dari atas ke bawah** dan digulir ke bawah di ponsel. Setiap
potongan memuat dua atau tiga lokasi. Menambah bab berarti menambah satu potongan di bawah; potongan yang sudah ada
tidak perlu digambar ulang.

- **Ukuran setiap potongan sama: 1080 × 1440 (3 : 4), tidak transparan, maks 150 KB.** Lebar 1080 mengikuti standar
  karakter: di ponsel 375 piksel peta tampil ±343 piksel lebarnya, dan 1080 cukup tajam untuk layar berkerapatan 3×.
  Tinggi 1440 memberi tempat untuk dua atau tiga lokasi. Satu layar ponsel memperlihatkan kira-kira dua potongan,
  jadi dua potongan × 150 KB tetap di bawah anggaran ±500 KB layar pertama. Potongan yang jauh dari layar baru
  diunduh ketika pemain menggulir mendekatinya.
- **Urutan potongan ada di `data/map.json`**, dari atas ke bawah:
  `{ "segments": ["potongan-01", "potongan-02", "potongan-03", "potongan-04"] }`. Nama di daftar adalah nama berkas
  tanpa `.png`. Empat potongan di daftar sekarang adalah usulan untuk bab 1–12 (tiga lokasi per potongan); ubah
  daftarnya kalau tim memutuskan lain.
- **Menambah potongan:** gambar potongan baru, simpan sebagai `assets/peta/potongan-05.png`, lalu tambahkan
  `"potongan-05"` di akhir daftar `data/map.json`.
- **Posisi lokasi diisi tim konten di tab `wilayah`**, tiga kolom sekaligus: `pin_segment` (nomor potongan, 1 untuk
  yang paling atas), `pin_x` dan `pin_y` (persen lebar dan tinggi **potongan itu**, bukan seluruh peta). Contoh:
  titik tengah potongan 2 adalah `2`, `50`, `50`. Setelah potongan jadi, beri tim konten posisi setiap lokasi.
  Usahakan `pin_y` di antara 15 dan 85 supaya lokasi tidak terbelah sambungan.
- **Setiap lokasi menempati sekitar 90 × 110 piksel di layar** (ikon, nama bab, dan persentase), yaitu kira-kira
  **26% lebar** dan **24% tinggi** satu potongan. Sisakan ruang itu di setiap tempat supaya lokasi tidak saling menutupi.
- **Aplikasi tidak menggambar batas wilayah;** kota, jalan, dan batas semuanya ada di gambar.
- **Jika rasio potongan berbeda dari 3 : 4, lokasi bergeser** dan sambungan tidak bertemu. Pemeriksa aset memberi
  tanda ✗ jika rasionya meleset lebih dari 2%.
- Selama potongan belum ada, aplikasi menampilkan kotak keterangan di tempatnya: nama berkas, ukuran, lokasi yang
  ada di potongan itu, dan potongan yang harus disambungnya. Itulah brief untuk pembuat aset.

### Sambungan antarpotongan

Potongan ditampilkan rapat tanpa celah. Supaya sambungannya tidak terlihat:

1. **Gambar seluruh peta di satu kanvas panjang** (1080 × 1440 × jumlah potongan), lalu potong tepat di setiap
   kelipatan 1440 piksel. Dengan cara ini tepi bawah potongan *n* dan tepi atas potongan *n* + 1 pasti cocok.
2. **Jalan, sungai, dan latar yang melewati sambungan harus menyentuh tepi bawah potongan *n* dan tepi atas
   potongan *n* + 1 di posisi piksel yang sama** (sama x-nya, sama lebarnya, sama warnanya). Usulan baku: jalan utama
   menyeberangi setiap sambungan di tengah (x 460–620) dan warna latar di kedua tepi polos, sehingga potongan baru
   selalu bisa disambung.
3. **Jangan ada benda yang terbelah sambungan:** gedung, pohon, papan, dan lokasi diletakkan utuh di dalam satu potongan.
4. **Tanpa bingkai, bayangan, atau gradasi** di tepi atas dan bawah potongan.
5. **Saat menambah potongan nanti**, salin baris paling bawah potongan terakhir (±40 piksel) sebagai awal tepi atas
   potongan baru, lalu lanjutkan menggambar ke bawah.
6. Tepi atas potongan pertama dan tepi bawah potongan terakhir adalah ujung peta; tidak perlu disambung ke mana pun.

- Status wilayah (terkunci, terbuka, tuntas) ditunjukkan lokasi dengan ikon dan teks. Tidak perlu menggambar versi
  peta per status.

## Ilustrasi adegan (`assets/adegan/`)

- **Satu gambar per percakapan.** Nama berkasnya adalah ID percakapan dari tab `percakapan` di spreadsheet, ditambah
  `.png`. Contoh: percakapan `C-B01-01-pengantar` → `assets/adegan/C-B01-01-pengantar.png`.
- **Brief-nya sudah ada di aplikasi.** Selama gambar belum ada, aplikasi menampilkan kotak bertuliskan nama berkas dan
  ukurannya, dan **deskripsi adegan dari tim konten** (kolom `scene`) tepat di bawahnya. Deskripsi itulah yang digambar.
- Berbeda dari slot lain, slot ini tidak punya berkas placeholder: berkas yang belum ada bukan kesalahan, hanya tanda
  bahwa ilustrasinya belum digambar. Pemeriksa aset menandainya ⚠.
- **Mendatar 960 × 640 (3 : 2)**, tampil selebar layar (±343 piksel). Ilustrasi berwarna penuh biasanya lebih kecil
  jika disimpan dengan jumlah warna dikurangi; batasnya 150 KB per berkas karena ada puluhan percakapan.
- **Jangan menulis kotoba atau kanji yang diajarkan di dalam gambar**, misalnya di papan nama atau kalender: percakapan
  uji memakai ilustrasi yang sama, dan tulisan di gambar bisa menjadi jawaban soal.

## Karakter (`assets/karakter/`)

**Standar karakter** (sama untuk setiap karakter, sekarang dan nanti):

- Kanvas **persegi 1080 × 1080**, PNG dengan **latar transparan**. **Simpan berkas induk 2160 × 2160 di tim**; yang masuk
  aplikasi adalah ekspor 1080 dari berkas induk itu, diperkecil tepat setengah tanpa dipotong atau digeser.
- Sosok **di tengah kanvas**, dengan **skala yang sama** antar karakter: tinggi kepala, posisi mata, dan posisi kaki
  sejajar seperti Hana dan Kazu. Karena itu satu kotak potong cocok untuk semua karakter.
- Garis luar tinta `#403C3C`, warna yang juga dipakai untuk semua teks dan garis di aplikasi.

**Potret di percakapan** diambil dari gambar utuh lewat **kotak potong** di `data/characters.json` (`portrait`: `x`, `y`,
`size`, dalam persen gambar). Kartu di layar pemilihan memakai kotak kedua (`figure`: `x`, `y`, `width`, `height`)
supaya sosoknya tampil besar. Selama karakter baru mengikuti standar di atas, kotak yang sama bisa disalin apa
adanya. Kalau tim membuat **berkas potret khusus** `assets/karakter/<id>-potret.png` (512 × 512, transparan),
berkas itu otomatis menggantikan potongan otomatis.

**Menambah karakter pemain:** taruh gambarnya di `assets/karakter/<id>.png`, lalu tambahkan satu entri di bagian
`players` di `data/characters.json` (id, nama, jalur gambar, dan kedua kotak potong). Kode tidak perlu diubah.

**Ukuran berkas.** Sosok di kanvas 1080 tingginya sekitar 730 piksel, sedangkan tampilan terbesar di aplikasi ±160
piksel CSS (±480 piksel di layar 3×), jadi 1080 cukup, termasuk untuk potret wajah. Batasnya 150 KB per karakter.
Hana 143 KB dan Kazu 124 KB (diperkecil pengembang dari berkas induk 2160 tim).

**Lawan bicara** (bagian `others` di `data/characters.json`) belum punya gambar; potretnya tampil sebagai lingkaran
dengan huruf awal nama. Namanya masih penanda `«NAMA-…»` sampai tim mengisinya.

## Ikon menu (`assets/ui/menu-*.png`)

- 192 × 192, transparan, tampil sekitar 40 × 40 piksel di layar. Buat bentuk sederhana yang tetap jelas pada
  ukuran kecil; detail halus akan hilang.
- Ketiga ikon sebaiknya satu gaya.

## Mengembalikan placeholder

Semua placeholder tersimpan di riwayat git. Minta pengelola aplikasi mengembalikan berkasnya jika perlu.
