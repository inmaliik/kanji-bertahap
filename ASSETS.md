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
| `peta` | `assets/map/peta.png` | PNG | 1200 × 1600 | 3 : 4 (tegak) | tidak transparan | 400 KB | Peta, layar utama: gambar latar seluruh wilayah |
| `menu-index` | `assets/ui/menu-index.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu di peta dan layar lain di luar quest: tombol Index |
| `menu-kana` | `assets/ui/menu-kana.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Panduan kana |
| `menu-pengaturan` | `assets/ui/menu-pengaturan.png` | PNG | 192 × 192 | 1 : 1 | **transparan** | 30 KB | Menu: tombol Pengaturan |
| `adegan` | `assets/adegan/<ID percakapan>.png`, satu per percakapan, misalnya `assets/adegan/C-B01-01-pengantar.png` | PNG | 960 × 640 | 3 : 2 (mendatar) | tidak transparan | 150 KB | Di atas percakapan pengantar dan percakapan uji |

Slot karakter pemain dan tokoh percakapan ditambahkan di tahap berikutnya dan akan didaftarkan di tabel ini.

## Aturan umum

- **Gambar dipaskan ke kotaknya.** Kalau ukuran atau rasionya sedikit keliru, tampilan tidak rusak: gambar
  diperkecil sampai muat, dan sisanya dibiarkan kosong. Tetapi usahakan persis, terutama rasio peta (lihat di bawah).
- **Batas ukuran berkas itu penting.** Aplikasi akan dibuka di ponsel Android kelas bawah lewat jaringan pameran
  yang dipakai banyak orang sekaligus. Seluruh gambar di layar pertama sebaiknya di bawah ±500 KB. Jika berkas
  terlalu besar, kompres dengan alat seperti Squoosh (situs `squoosh.app`, pilih OxiPNG atau kurangi jumlah warna).
- **Latar transparan** untuk ikon: bagian di luar gambar harus benar-benar transparan (bukan putih), karena
  tombolnya punya warna latar sendiri.
- **Tidak ada teks penting di dalam gambar.** Nama tombol dan wilayah sudah ditulis aplikasi di sebelahnya, dan
  teks di dalam gambar tidak terbaca pembaca layar.
- **Jangan menaruh materi di gambar**, misalnya kanji atau kotoba yang diajarkan di sebuah wilayah. Peta dan menu
  tampil sebelum quest dimainkan, jadi gambar yang memuat materi membocorkan jawaban.

## Peta (`assets/map/peta.png`)

- **Satu gambar berisi semua wilayah**, termasuk batas-batas wilayahnya. Aplikasi tidak menggambar batas wilayah;
  semuanya ada di gambar ini.
- **Tegak, 1200 × 1600 (3 : 4).** Di ponsel selebar 375 piksel, peta tampil ±343 piksel lebarnya.
- **Pin wilayah ditaruh aplikasi di atas gambar.** Posisinya diisi tim konten di tab `wilayah` (kolom `pin_x` dan
  `pin_y`), dalam persen lebar dan tinggi gambar. Contoh: titik tengah gambar adalah `50` dan `50`.
  Setelah peta jadi, beri tim konten posisi tengah setiap wilayah.
- **Setiap pin berupa tombol sekitar 48 piksel tinggi dan ±110 piksel lebar di layar**, yaitu kira-kira **30%
  lebar** dan **10% tinggi** peta. Sisakan ruang itu di setiap wilayah supaya pin tidak saling menutupi. Dua
  belas wilayah (bab 1–12) perlu muat.
- **Jika rasio gambar berbeda dari 3 : 4, pin bergeser** dari wilayahnya, karena posisi pin dihitung dari kotak
  3 : 4. Pemeriksa aset memberi tanda ✗ jika rasionya meleset lebih dari 2%.
- Status wilayah (terkunci, terbuka, tuntas) ditunjukkan pin dengan ikon dan teks. Tidak perlu menggambar versi
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

## Ikon menu (`assets/ui/menu-*.png`)

- 192 × 192, transparan, tampil sekitar 40 × 40 piksel di layar. Buat bentuk sederhana yang tetap jelas pada
  ukuran kecil; detail halus akan hilang.
- Ketiga ikon sebaiknya satu gaya.

## Mengembalikan placeholder

Semua placeholder tersimpan di riwayat git. Minta pengelola aplikasi mengembalikan berkasnya jika perlu.
