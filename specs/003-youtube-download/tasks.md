# Rincian Tugas: YouTube Downloader, Halaman Unduhan, dan Opsi MP3

Mengacu pada: spec.md dan plan.md (Fitur 003)

## Kelompok 1. Kontrak Data

1.1. Menambahkan youtube pada tipe Platform. [v]

1.2. Menambahkan bidang opsional audio dan durationSeconds pada ResolvedMedia. [v]

## Kelompok 2. Resolver

2.1. Membuat lib/resolvers/youtube.ts dengan strategi innertube klien ANDROID. [v]

2.2. Menambahkan strategi cadangan halaman watch beserta dekripsi signatureCipher dari base.js. [v]

2.3. Mengenali tautan YouTube pada lib/resolvers/detect-platform.ts. [v]

2.4. Menambahkan dispatch resolver YouTube pada /api/resolve. [v]

## Kelompok 3. Route Unduhan

3.1. Menambahkan ronde percobaan ulang dengan jeda pada proxy unduhan. [v]

3.2. Menambahkan parameter name dan pemetaan ekstensi untuk konten audio. [v]

## Kelompok 4. Halaman Unduhan

4.1. Membuat app/download/page.tsx dengan Suspense. [v]

4.2. Membuat components/download-panel.tsx beserta gaya visualnya. [v]

4.3. Mengarahkan kartu YouTube ke halaman unduhan pada app/page.tsx. [v]

4.4. Memperbarui label tombol result-card, placeholder tautan, dan teks hero. [v]

## Kelompok 5. Konversi MP3

5.1. Membuat lib/mp3.ts dengan pengambilan progresif, dekode Web Audio, dan penyandian lamejs. [v]

5.2. Menambahkan batas durasi 15 menit dan pesan galat yang jelas. [v]

## Kelompok 6. Dokumentasi

6.1. Menambahkan folder specs/003-youtube-download. [v]

6.2. Memperbarui README. [v]

## Kelompok 7. Pengujian Manual

7.1. Menguji tautan YouTube watch dan shorts pada halaman utama. [ ]

7.2. Menguji unduhan MP4 dari halaman unduhan. [ ]

7.3. Menguji konversi MP3 pada video berdurasi pendek. [ ]

7.4. Menguji penolakan MP3 pada video di atas 15 menit. [ ]

7.5. Menguji unduhan pertama TikTok dan Instagram setelah halaman dibuka tanpa refresh. [ ]

7.6. Memastikan unduhan TikTok dan Instagram tidak berubah perilakunya. [ ]

Urutan pengerjaan yang disarankan mengikuti nomor kelompok di atas, dimulai dari Kelompok 1 sampai Kelompok 7.
