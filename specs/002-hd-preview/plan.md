# Rencana Teknis: Opsi Unduhan HD dan Pratinjau Media

Mengacu pada: spec.md (Fitur 002)
Tech Stack: Next.js (App Router), TypeScript

## 1. Perubahan Kontrak Data

lib/resolvers/types.ts menambahkan tipe QualityLabel ("hd" atau "sd") beserta dua bidang opsional pada ResolvedMediaItem:

1. label: label kualitas varian, null untuk item di luar pilihan kualitas.
2. thumbnailUrl: URL gambar sampul untuk pratinjau.

Kedua bidang bersifat opsional agar konsumen API yang sudah ada, termasuk contoh integrasi Baileys, tidak rusak.

## 2. Resolver TikTok

buildVideoItems membaca video.bitrateInfo bila tersedia: varian diurutkan menurun berdasarkan bitrate, varian tertinggi diberi label hd, sisanya sd. Bila bitrateInfo tidak tersedia, video.playAddr tetap menjadi item utama dengan label hd. video.downloadAddr tetap menjadi item berwatermark cadangan tanpa label. Sampul diambil dari video.originCover dengan video.cover sebagai cadangan dan disimpan pada thumbnailUrl setiap item video. Cache cookie pada lib/media-cookies juga menerima URL sampul agar proxy pratinjau tidak ditolak 403.

## 3. Resolver Instagram

buildItemsFromNode mengisi thumbnailUrl dengan display_url, yang menjadi poster video dan pratinjau foto. Tidak ada pilihan kualitas karena halaman embed Instagram hanya menyediakan satu varian media.

## 4. Route Unduhan

app/api/download/route.ts menambahkan parameter disposition=inline yang mengubah Content-Disposition dari attachment menjadi inline untuk keperluan pratinjau. Header Range dari klien diteruskan ke CDN, dan Content-Range serta Accept-Ranges dikembalikan pada respons pratinjau agar video dapat di-seek. Tanpa parameter tersebut, perilaku unduhan sama seperti sebelumnya.

## 5. Antarmuka

1. app/page.tsx mengelompokkan item video ke dalam kartu per status watermark sehingga seluruh varian HD/SD berada dalam satu kartu, sedangkan foto carousel tetap menjadi kartu terpisah per foto.
2. components/result-card.tsx menjadi komponen klien dengan state pilihan kualitas dan state pemutaran.
3. Area pratinjau: gambar sampul dengan tombol putar untuk video, tag video untuk pratinjau aktif, dan gambar penuh untuk foto.
4. Ikon putar dibuat sebagai SVG kustom pada components/icons/IconPlay.tsx mengikuti konvensi ikon proyek.

## 6. Gaya Visual

components/result-card.module.css menambahkan kelas preview, previewImage, previewVideo, playButton, playIcon, qualityToggle, qualityButton, dan qualityButtonActive, seluruhnya memakai token desain yang sudah ada pada styles/globals.css.

## 7. Kompatibilitas

Respons /api/resolve hanya menambah bidang opsional. Tombol unduhan tetap memakai disposition attachment (bawaan) sehingga perilaku unduhan tidak berubah.
