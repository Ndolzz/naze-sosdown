# Rincian Tugas: Dukungan YouTube dan Pilihan Format MP4/MP3

Mengacu pada: spec.md dan plan.md (Fitur 003)

## Kelompok 1. Kontrak Data

1.1. Menambahkan "youtube" pada tipe Platform. [v]
1.2. Menambahkan bidang opsional formatId pada ResolvedMediaItem. [v]
1.3. Menambahkan bidang opsional audioItem pada ResolvedMedia. [v]

## Kelompok 2. Deteksi Platform

2.1. Mengenali host YouTube (youtube.com, music.youtube.com, youtube-nocookie.com, youtu.be). [v]
2.2. Mengekstraksi ID video dari parameter v dan path shorts, live, embed, v. [v]
2.3. Menormalisasi tautan YouTube ke bentuk watch baku. [v]

## Kelompok 3. Resolver

3.1. Membuat resolver YouTube dengan klien InnerTube IOS dan cadangan TVHTML5_SIMPLY_EMBEDDED_PLAYER. [v]
3.2. Menyusun opsi MP4 dari format muxed dengan label resolusi dan formatId. [v]
3.3. Menyusun opsi MP3 dari jalur audio-only bitrate tertinggi tanpa transcoding. [v]
3.4. Mengekspor refreshYouTubeFormatUrl untuk pembaruan URL per itag. [v]
3.5. Menambahkan opsi MP3 TikTok dari itemStruct.music.playUrl. [v]
3.6. Mendaftarkan URL audio ke cache cookie media. [v]

## Kelompok 4. Route API

4.1. Menambahkan cabang YouTube pada /api/resolve. [v]
4.2. Menambahkan parameter itag dan pembaruan URL YouTube pada /api/download. [v]
4.3. Menambahkan parameter ext untuk penamaan berkas audio. [v]
4.4. Menambahkan header Referer untuk platform youtube. [v]

## Kelompok 5. Antarmuka

5.1. Meneruskan audioItem ke kartu hasil dan mengirim parameter itag/ext saat mengunduh. [v]
5.2. Membuat pemilih format MP4/MP3 pada kartu video. [v]
5.3. Menggeneralisasi pemilih resolusi untuk label HD/SD maupun teks resolusi. [v]
5.4. Menambahkan pemutar audio inline dan tombol Unduh MP3 pada kartu foto. [v]
5.5. Membuat ikon musik SVG kustom. [v]
5.6. Memperbarui placeholder, hero, dan metadata deskripsi. [v]

## Kelompok 6. Pengujian Manual

6.1. Menguji tautan YouTube watch, shorts, dan youtu.be dengan opsi MP4 dan MP3. [ ]
6.2. Menguji pembaruan URL YouTube ketika unduhan pertama ditolak. [ ]
6.3. Menguji tautan video TikTok dengan pilihan MP4 HD/SD dan MP3 lagu latar. [ ]
6.4. Menguji tautan foto TikTok dan memastikan tombol Unduh MP3 muncul. [ ]
6.5. Menguji tautan Instagram dan memastikan tidak ada pilihan format. [ ]
6.6. Memastikan unduhan tanpa parameter baru berperilaku sama seperti sebelumnya. [ ]

Urutan pengerjaan yang disarankan mengikuti nomor kelompok di atas, dimulai dari Kelompok 1 sampai Kelompok 6.
