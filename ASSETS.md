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
| `potongan-peta` | `assets/peta/<nama potongan>.png`, satu per potongan, nama sesuai daftar di `data/map.json` (per dunia), misalnya `assets/peta/potongan-01.png` | PNG | 1080 × 1440 | 3 : 4 (tegak) | tidak transparan | 150 KB per potongan | Peta, layar utama: potongan-potongan latar yang disambung dari atas ke bawah |
| `lokasi` | `assets/lokasi/<ID wilayah>.png`, satu per wilayah, misalnya `assets/lokasi/B06.png` | PNG | 256 × 256 | 1 : 1 | **transparan** | 40 KB | Peta: ikon lokasi (gedung, toko, stasiun, …) satu per wilayah |
| `jalur` (opsional) | `assets/peta/jalur.png` | PNG | 64 × 64, ubin berulang | 1 : 1 | **transparan** | 10 KB | Peta: motif jalur antar lokasi |
| `menu-index` | `assets/ui/menu-index.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu di peta dan layar lain di luar quest: tombol Index |
| `menu-kucing` | `assets/ui/menu-kucing.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Kucing (koleksi kucing) |
| `menu-cerita` | `assets/ui/menu-cerita.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Cerita (adegan cerita) |
| `menu-kana` | `assets/ui/menu-kana.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Panduan kana |
| `menu-pengaturan` | `assets/ui/menu-pengaturan.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Setelan |
| `karakter-hana`, `karakter-kazu` | `assets/karakter/hana.png`, `assets/karakter/kazu.png` | PNG | 1080 × 1080 | 1 : 1 | **transparan** | 150 KB | Pemilihan karakter; potret pembicara di percakapan |
| potret (opsional) | `assets/karakter/<id>-potret.png`, misalnya `assets/karakter/hana-potret.png` | PNG | 512 × 512 | 1 : 1 | **transparan** | 60 KB | Menggantikan potongan otomatis di potret percakapan |
| `adegan` | `assets/adegan/<ID percakapan>.png`, satu per percakapan, misalnya `assets/adegan/C-B01-01-pengantar.png` | PNG | 960 × 640 | 3 : 2 (mendatar) | tidak transparan | 150 KB | Di atas percakapan pengantar dan percakapan uji |
| `kucing-tubuh` | `assets/kucing/tubuh/<id>-isi.png` dan `assets/kucing/tubuh/<id>-garis.png`, dua berkas per tubuh, misalnya `assets/kucing/tubuh/duduk-isi.png` | PNG | 512 × 512 | 1 : 1 | **transparan** | 40 KB | Kucing di koleksi, di peta, dan di momen penyelamatan (lihat [Kucing](#kucing-assetskucing-dan-datalayersjson)) |
| `kucing-corak` | `assets/kucing/corak/<id>.png`, misalnya `assets/kucing/corak/belang.png` | PNG | 512 × 512 | 1 : 1 | **transparan** | 40 KB | Corak bulu, dipotong otomatis mengikuti tubuh |
| `kucing-aksesori` | `assets/kucing/aksesori/<id>.png`, misalnya `assets/kucing/aksesori/pita.png` | PNG | 256 × 256 | 1 : 1 | **transparan** | 20 KB | Aksesori di kepala atau leher kucing |
| `panel-cerita` | `assets/cerita/<ID adegan>/<panel_image>.png`, misalnya `assets/cerita/S-D1-pembuka/05.png` | PNG abu-abu 16 tingkat | 2048 × 1536 | 4 : 3 (mendatar) | tidak transparan | 250 KB per halaman; batas sebenarnya **±2,5 MB per adegan** | Pemutar adegan cerita: satu halaman, boleh berisi beberapa panel (lihat [Adegan cerita](#adegan-cerita-assetscerita-dan-assetssuara)) |
| suara adegan | `assets/suara/<ID adegan>/<audio>.mp3`, misalnya `assets/suara/S-D1-pembuka/02-1.mp3` | **MP3** mono | ≤ 8 detik | | | 64 KB | Suara satu baris naskah |

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
| Lapisan kucing (tubuh, corak, aksesori) | Penumpukan lapisan, warna bulu, bayangan siluet, efek kecil saat kucing bebas |

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
tidak perlu digambar ulang. **Setiap dunia punya peta sendiri** (D-117): Dunia 1 (初級I, bab 1–25) dan Dunia 2
(初級II, bab 26–50). Peta Dunia 2 baru dibutuhkan saat materi bab 26 ke atas ada.

- **Ukuran setiap potongan sama: 1080 × 1440 (3 : 4), tidak transparan, maks 150 KB.** Lebar 1080 mengikuti standar
  karakter: di ponsel 375 piksel peta tampil ±343 piksel lebarnya, dan 1080 cukup tajam untuk layar berkerapatan 3×.
  Tinggi 1440 memberi tempat untuk dua atau tiga lokasi. Satu layar ponsel memperlihatkan kira-kira dua potongan,
  jadi dua potongan × 150 KB tetap di bawah anggaran ±500 KB layar pertama. Potongan yang jauh dari layar baru
  diunduh ketika pemain menggulir mendekatinya.
- **Urutan potongan ada di `data/map.json`**, per dunia, dari atas ke bawah:
  `{ "worlds": [ { "world": 1, "segments": ["potongan-01", "potongan-02"] } ] }`. Nama di daftar adalah nama berkas
  tanpa `.png`, dan satu nama hanya boleh dipakai satu dunia. Dua potongan Dunia 1 sekarang menampung bab 1–5,
  satu-satunya materi yang sudah ada (tiga lokasi per potongan, D-110). Untuk Dunia 2, tambahkan
  `{ "world": 2, "segments": ["d2-potongan-01"] }` di daftar `worlds` dan simpan `assets/peta/d2-potongan-01.png`.
  **Potongan berikutnya digambar bersama babnya**, bukan sebelumnya.
- **Menambah potongan:** gambar potongan baru, simpan sebagai `assets/peta/potongan-03.png`, lalu tambahkan
  `"potongan-03"` di akhir daftar `segments` dunia itu di `data/map.json`.
- **Posisi lokasi diisi tim konten di tab `wilayah`**, tiga kolom sekaligus: `pin_segment` (nomor potongan, 1 untuk
  yang paling atas), `pin_x` dan `pin_y` (persen lebar dan tinggi **potongan itu**, bukan seluruh peta). Nomor potongan dihitung di
  peta dunia wilayah itu: wilayah bab 26 di potongan `1` berarti potongan teratas peta Dunia 2. Contoh:
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
- Kelima ikon (Index, Kucing, Cerita, Panduan kana, Setelan) sebaiknya satu gaya.

## Kucing (`assets/kucing/` dan `data/layers.json`)

Setiap misi yang tuntas membebaskan satu kucing (DECISIONS D-121). Kucing **tidak digambar utuh satu per satu**:
aplikasi menumpuk beberapa **lapisan** yang digambar sekali, sehingga 9 berkas cukup untuk 72 kucing berbeda.

### Templat kanvas

Mulai dari templat di folder `templat/` di repo (minta berkasnya ke pengelola aplikasi jika tidak membuka GitHub):

| Berkas | Untuk | Cara pakai |
|---|---|---|
| `templat/kucing-tubuh-corak.svg` | tubuh dan corak | Buka langsung di Inkscape, Adobe Illustrator, atau Affinity Designer. Lapisan bernama **PANDUAN …** hanya untuk menggambar; gambar di lapisan **GAMBAR**. |
| `templat/kucing-tubuh-corak.png` | tubuh dan corak, untuk aplikasi yang tidak membuka SVG (Procreate, ibisPaint, Krita, MediBang) | Buat kanvas **512 × 512 piksel**, impor PNG ini sebagai lapisan paling atas, turunkan opasitasnya, lalu gambar di lapisan di bawahnya. |
| `templat/kucing-aksesori.svg` dan `.png` | aksesori | Sama, dengan kanvas **256 × 256 piksel**. |

**Sebelum mengekspor, sembunyikan atau hapus semua lapisan panduan.** Ekspor PNG dengan latar transparan, ukuran
persis 512 × 512 (tubuh, corak) atau 256 × 256 (aksesori). Boleh menggambar di kanvas 1024 × 1024 (atau 512 untuk
aksesori) asalkan semua ukuran di bawah dikali dua, lalu ekspor setengahnya.

### Aturan yang sama untuk semua lapisan

- **Garis dasar y = 480:** telapak kaki setiap tubuh menyentuh garis merah di templat. Kucing berdiri di tempat yang
  sama di setiap kartu koleksi.
- **Titik tengah x = 256:** badan kucing berada di tengah kanvas (garis putus-putus hitam). Ekor dan telinga boleh keluar
  dari tengah.
- **Batas aman 24 px:** tidak ada bagian gambar di luar garis pink.
- **Garis tinta 6 px, warna `#403C3C`**, sama dengan garis karakter Hana dan Kazu. Di kanvas aksesori 256 px, garisnya
  3 px supaya tampil sama tebal.
- **Gaya warna datar** dengan garis tebal, seperti karakter. Bayangan ada di lapisan garis, bukan di lapisan isi.
- Tidak ada teks di gambar, dan tidak ada kanji atau kotoba (gambar kucing tampil di luar misi).

### Aturan tiap lapisan

| Lapisan | Berkas | Isi | Aturan |
|---|---|---|---|
| **Isi tubuh** | `assets/kucing/tubuh/<id>-isi.png` | **Bentuk** tubuh saja: seluruh siluet kucing (kepala, telinga, badan, kaki, ekor) diwarnai penuh, **tanpa garis, tanpa bayangan, tanpa wajah** | Warnanya tidak penting: aplikasi memakai bentuk ini sebagai cetakan dan mengecatnya dengan warna bulu dari data. Bentuk ini juga menjadi bayangan siluet kucing yang belum bebas. Tepinya harus rapi, tanpa piksel setengah transparan di luar garis. |
| **Garis tubuh** | `assets/kucing/tubuh/<id>-garis.png` | Garis tinta, wajah (mata, hidung, mulut, kumis), garis kaki, dan **bayangan** (abu-abu atau tinta transparan) | Bagian dalamnya **transparan**, supaya warna bulu dan corak terlihat. Garis harus tepat menutupi tepi bentuk isi. |
| **Corak** | `assets/kucing/corak/<id>.png` | Belang, totol, bercak, dan sejenisnya | Gambar corak **menutupi seluruh zona tubuh** (kotak biru di templat), bukan hanya satu bentuk tubuh: aplikasi memotongnya otomatis mengikuti bentuk isi, sehingga satu corak cocok untuk semua tubuh. Pakai warna tinta atau gelap yang **agak transparan** (misalnya 20–30%), supaya cocok di atas setiap warna bulu. |
| **Aksesori** | `assets/kucing/aksesori/<id>.png` | Pita, lonceng, bunga, topi, dan sejenisnya | Titik tengah kanvas aksesori (128, 128) ditaruh aplikasi tepat di **titik jangkar** tubuh: `kepala` atau `leher`. Gambar aksesori dengan titik itu sebagai pusatnya. |

**Titik jangkar** ditulis per tubuh di `data/layers.json`, dalam piksel kanvas 512: misalnya untuk tubuh duduk,
`"kepala": [256, 86]` (puncak kepala, di antara telinga) dan `"leher": [256, 262]`. Saat menggambar tubuh baru,
catat dua titik itu dari templat dan kirimkan bersama berkasnya.

### Warna bulu dan jumlah kombinasi

Warna bulu ditulis di `data/layers.json` (`"colors"`), bukan digambar. Sekarang: krem `#F7E4C8`, abu `#DCD8D4`,
jingga `#F9C99B`; tim boleh menggantinya. Warna yang terlalu gelap ditandai pemeriksa, karena garis tinta tidak terlihat
di atasnya. Jumlah kucing berbeda = tubuh × (corak + polos) × (aksesori + tanpa) × warna:

| Pilihan | Berkas | Kombinasi |
|---|---|---|
| **Sekarang** (warna dari data): 2 tubuh, 2 corak, 3 aksesori, 3 warna | 9 | 2 × 3 × 4 × 3 = **72** |
| Tanpa warna dari data: tubuh digambar berwarna, 2 tubuh, 4 corak, 4 aksesori | 12 | 2 × 5 × 5 = **50** |

Pilihan kedua dipakai jika tim aset lebih suka mewarnai sendiri: lapisan isi lalu digambar berwarna, dan daftar
`"colors"` dihapus dari `data/layers.json`. Kode tidak perlu diubah.

### Cara menyerahkan

1. Beri nama berkas **persis** seperti di `data/layers.json`, misalnya `duduk-isi.png`, `duduk-garis.png`,
   `belang.png`, `pita.png`. Tubuh, corak, atau aksesori **baru** juga boleh: sertakan namanya (huruf kecil, tanpa spasi,
   misalnya `berdiri`) dan, untuk tubuh, kedua titik jangkarnya.
2. Kirim semua berkas ke pengelola aplikasi (misalnya lewat Google Drive), yang menaruhnya di `assets/kucing/tubuh/`,
   `assets/kucing/corak/`, atau `assets/kucing/aksesori/` dan menambahkan pilihan baru ke `data/layers.json`.
3. Periksa hasilnya di halaman **Pemeriksaan konten** (alamatnya di `MULAI-DI-SINI.md`): bagian **Lapisan kucing**
   menyebut berapa berkas yang sudah ada, dan pemeriksa aset menandai berkas yang ukuran pikselnya atau beratnya salah.
   Selama berkas belum ada, aplikasi menampilkan gambar pengganti buatan kode di tempatnya.

Kombinasi setiap misi dan nama kucingnya ditulis tim konten di tab `quest` (README, Kolom spreadsheet), bukan oleh
tim aset.

## Adegan cerita (`assets/cerita/` dan `assets/suara/`)

Adegan pembuka dan penutup dunia (D-124). Naskahnya ada di tab `cerita` dan `naskah` spreadsheet (README,
[Menulis naskah adegan cerita](README.md#menulis-naskah-adegan-cerita)); nama setiap berkas di bawah diambil dari
kolom `panel_image` dan `audio` di tab naskah.

### Gambar halaman (ilustrator)

Spesifikasi ini mengikuti bentuk yang sudah dikirim tim untuk prolog Dunia 1 (D-125), supaya tidak ada yang perlu
digambar ulang.

- **Berkas mentah tim:** PNG **2048 × 1536 (4 : 3, mendatar)**, satu berkas per halaman, latar transparan atau putih.
  Satu halaman boleh berisi **satu panel atau beberapa panel** bergaya manga, dengan garis bingkai panel tergambar.
  Berkas mentah disimpan tim (dan di `sumber/`, yang tidak masuk repo).
- **Yang masuk aplikasi: PNG abu-abu 16 tingkat, ukuran penuh 2048 × 1536**, dibuat pengelola aplikasi dari berkas
  mentah dengan `node tools/ekspor-halaman.mjs sumber/scene/scene5.png assets/cerita/S-D1-pembuka/05.png` (latar
  transparan menjadi putih). Gambar garis tetap tajam saat pemutar zoom ke panel kecil (panel kanan halaman 05 ±3,6×),
  karena tidak ada pengecilan dan tidak ada kompresi yang mengaburkan garis.
- **Anggaran dihitung per adegan, bukan per halaman: ±2,5 MB** termasuk suara. Semua halaman mulai diunduh saat kartu
  mulai adegan tampil. Perbandingan untuk 9 halaman prolog Dunia 1 (diukur 2026-10-14):

  | Format | Ukuran | Total 9 halaman | Garis saat di-zoom |
  |---|---|---|---|
  | JPEG abu-abu q60 (sebelumnya) | 1600 × 1200 | 971 KB | kabur: diperkecil dan artefak JPEG |
  | PNG abu-abu 256 tingkat | 2048 × 1536 | 1.115 KB | tajam |
  | WebP lossless | 2048 × 1536 | 860 KB | tajam |
  | WebP q90 | 2048 × 1536 | 618 KB | lossy: tidak persis sama dengan gambar tim |
  | **PNG abu-abu 16 tingkat (dipakai)** | **2048 × 1536** | **576 KB** (26–99 KB per halaman) | **tajam** |

  Dengan suara (±64 KB × 11 baris), prolog tetap di bawah 1,5 MB.
- **Halaman berwarna** tidak cocok dengan alat ini (semuanya menjadi abu-abu). Jika tim mengirim halaman berwarna,
  formatnya diputuskan saat itu dengan anggaran adegan yang sama.
- **Rasio lain tetap tampil**: pemutar membaca rasio gambar sendiri dan menampilkannya utuh. Pemeriksa aset hanya
  memberi catatan.
- **Di ponsel tegak**, panggung adegan berbingkai 3 : 4. Halaman mendatar tampil utuh dulu (dengan ruang kosong di atas
  dan bawah), lalu **zoom ke setiap panel** yang ditulis di naskah: kotak panel ditulis di kolom `panel_box` dalam persen
  halaman (x, y, lebar, tinggi), seperti kotak potong potret karakter. Satu ketukan = satu panel (atau satu ucapan).
  Urutan baca, kanan ke kiri atau kiri ke kanan, adalah urutan panel di naskah. Panel yang garis bingkainya miring
  cukup diberi kotak yang memuat isinya; sudut panel tetangga yang ikut terlihat tidak apa-apa.
- **Teks di dalam gambar** (balon, efek suara, tulisan tangan) boleh, **asal ada transkripnya** di kolom `panel_text`
  tab naskah, persis seperti tergambar. Pemeriksa tidak bisa membaca gambar, jadi transkrip itulah yang diperiksa
  terhadap aturan D-79, dan subtitle memakai teks dari transkrip itu. Balon yang dibiarkan kosong di gambar diisi oleh
  subtitle.
- Bagian bawah ±30% bingkai bisa tertutup tokoh yang ditumpuk kode (kolom `figures`). Untuk halaman yang tokohnya
  sudah digambar tim, kolom itu dikosongkan.
- **Karakter pemain.** Rancangan semula: karakter pemain tidak digambar di panel, karena kode menumpuk Hana atau Kazu
  sesuai pilihan pemain. Prolog tim menggambar seorang tokoh perempuan berambut bob di beberapa halaman; apakah ia
  karakter pemain, tokoh lain, atau Hana saja, **belum diputuskan tim** (BLOCKERS).
- Kolom `panel_note` di tab naskah adalah brief untuk ilustrator dan tampil di kotak pengganti selama gambarnya belum ada.

### Berkas suara (pengisi suara)

- **MP3 mono, 64 kbps, paling lama 8 detik, maks 64 KB per berkas**, satu per baris naskah yang bersuara, di
  `assets/suara/<ID adegan>/<audio>.mp3`. Nama berkas **persis** sama dengan kolom `audio`, misalnya `02-1.mp3`.
- **Baris pemain tidak direkam** (kolom `audio`-nya kosong), kecuali tim memutuskan satu rekaman per karakter: nama
  berkas di naskah memuat `{karakter}`, dan berkasnya `02-2-hana.mp3` serta `02-2-kazu.mp3`.
- Rekam dengan volume yang sama untuk semua baris, tanpa jeda panjang di awal dan akhir, tanpa musik latar.
- Aplikasi tidak pernah menunggu suara: berkas yang terlambat terunduh atau belum ada berarti baris itu tampil dengan
  subtitle saja. Jadi berkas boleh diserahkan bertahap.

### Batas per adegan

**Paling banyak ±2,5 MB per adegan**: gambar ±1,2 MB (8 halaman × 150 KB) dan suara ±1 MB. Halaman yang dipakai
beberapa panel dihitung sekali. Halaman pemeriksaan konten,
bagian **Adegan cerita**, menghitung berkas yang sudah ada, berkas suara yang melebihi 64 KB, dan total ukuran setiap
adegan. Saat diputar, aplikasi mengunduh panel berikutnya dan suara tiga baris ke depan di belakang layar; saat suara
dimatikan, berkas suara tidak diunduh sama sekali.

### Cara menyerahkan

1. Beri nama berkas persis seperti kolom `panel_image` (`.png`) atau `audio` (`.mp3`) di tab naskah.
2. Kirim ke pengelola aplikasi (misalnya lewat Google Drive), dikelompokkan per adegan, yang menaruhnya di
   `assets/cerita/<ID adegan>/` dan `assets/suara/<ID adegan>/`.
3. Periksa di halaman Pemeriksaan konten (bagian Adegan cerita dan pemeriksa aset), lalu tonton adegannya dari menu
   **Cerita** (adegan yang sudah pernah diputar) atau dengan pemain baru.

## Mengembalikan placeholder

Semua placeholder tersimpan di riwayat git. Minta pengelola aplikasi mengembalikan berkasnya jika perlu.
