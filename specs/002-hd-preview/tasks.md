# Rincian Tugas: Opsi Unduhan HD dan Pratinjau Media

Mengacu pada: spec.md dan plan.md (Fitur 002)

## Kelompok 1. Kontrak Data

1.1. Menambahkan tipe QualityLabel serta bidang opsional label dan thumbnailUrl pada ResolvedMediaItem. [v]

## Kelompok 2. Resolver

2.1. Membaca video.bitrateInfo pada resolver TikTok dan memberi label hd/sd sesuai urutan bitrate. [v]
2.2. Menyediakan jalur cadangan video.playAddr bila bitrateInfo tidak tersedia. [v]
2.3. Mengisi thumbnailUrl untuk video TikTok dan seluruh media Instagram. [v]
2.4. Mendaftarkan URL sampul ke cache cookie media. [v]

## Kelompok 3. Route Unduhan

3.1. Menambahkan parameter disposition=inline pada /api/download. [v]
3.2. Meneruskan header Range dan mengembalikan Content-Range serta Accept-Ranges. [v]

## Kelompok 4. Antarmuka

4.1. Mengelompokkan varian video ke dalam kartu per status watermark. [v]
4.2. Membuat sakelar kualitas HD/SD pada kartu hasil. [v]
4.3. Membuat area pratinjau gambar dan pemutaran video inline. [v]
4.4. Membuat ikon putar SVG kustom. [v]

## Kelompok 5. Pengujian Manual

5.1. Menguji tautan video TikTok dengan varian bitrate ganda. [ ]
5.2. Menguji tautan video TikTok tanpa bitrateInfo. [ ]
5.3. Menguji tautan foto dan carousel Instagram. [ ]
5.4. Memastikan unduhan berperilaku sama seperti sebelumnya. [ ]

Urutan pengerjaan yang disarankan mengikuti nomor kelompok di atas, dimulai dari Kelompok 1 sampai Kelompok 5.
