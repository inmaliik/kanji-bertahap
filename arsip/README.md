# Arsip materi

Folder ini **tidak dibaca aplikasi**. Isinya materi yang keluar dari data aktif ketika struktur berpindah ke
versi peta (schemaVersion 2). Disimpan supaya tidak hilang tanpa jejak (DECISIONS D-58).

## `content-v1.json`

Materi contoh struktur lama (schemaVersion 1): tiga level 食, 飲, 気. Isinya sama persis dengan
`data/content.json` versi level (tag git `v1-akhir`, commit `612fb77`). Selain sebagai arsip, berkas ini dipakai uji
otomatis aturan sesi v1 sampai mesin quest menggantikannya di langkah 2.

## Yang dipindahkan ke `data/content.json` (wilayah B06)

| Dari level | Menjadi | Catatan |
|---|---|---|
| L01 食 | entri kanji 食, kotoba `tabemasu`, quest `Q-tabemasu` | 食べます bab 6 (terverifikasi) |
| L02 飲 | entri kanji 飲, kotoba `nomimasu`, quest `Q-nomimasu` | 飲みます bab 6 (terverifikasi) |

Contoh kalimat keduanya menjadi empat **percakapan sementara** satu baris (`isPlaceholder: true`): kalimat
pertama menjadi percakapan pengantar, kalimat kedua menjadi percakapan uji. Semuanya wajib diganti tim konten.

## Yang tidak dipindahkan

| Kotoba | Bab | Alasan |
|---|---|---|
| 食事 | 13 (belum terverifikasi) | **Di luar cakupan bab 1–12.** Tidak bisa masuk wilayah mana pun. |
| 食堂 | 3 (terverifikasi) | Cocok untuk wilayah B03, tetapi materi dimulai dari satu bab saja (B06). Masukkan saat B03 disusun. |
| 電気 | 1 (terverifikasi) | Cocok untuk wilayah B01. Sama seperti 食堂. |
| 元気 | 8 (belum terverifikasi) | Sama seperti 食堂, setelah babnya diverifikasi. |
| 天気 | 12 (belum terverifikasi) | Sama seperti 食堂, setelah babnya diverifikasi. |

Kanji 気 juga belum dipindahkan, karena semua kotobanya di atas belum masuk wilayah mana pun.

Kalimat contoh dan pengecoh lama untuk kotoba di atas tetap ada di `content-v1.json`. Jika dipakai lagi,
kalimat itu harus dijadikan **percakapan tulisan tim**, bukan disalin apa adanya (DECISIONS D-62).
