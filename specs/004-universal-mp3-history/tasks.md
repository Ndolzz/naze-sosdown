# Rincian Tugas: MP3 Universal, Bitrate, Metadata ID3, dan Riwayat Unduhan

Mengacu pada: spec.md dan plan.md (Fitur 004)

## Kelompok 1. Navigasi Universal

1.1. Mengarahkan semua kartu video ke halaman unduhan pada app/page.tsx. [v]

1.2. Mengubah label tombol video pada components/result-card.tsx menjadi Buka halaman unduh. [v]

1.3. Merekam riwayat unduhan langsung untuk foto dan carousel. [v]

## Kelompok 2. Konversi MP3 Universal

2.1. Menambahkan opsi bitrate dan metadata pada convertAudioToMp3 di lib/mp3.ts. [v]

2.2. Mendukung sumber berkas video penuh untuk TikTok dan Instagram melalui dekode Web Audio. [v]

## Kelompok 3. Metadata ID3

3.1. Menulis tag ID3v2.3 TIT2, TPE1, dan APIC secara manual di depan blob MP3. [v]

3.2. Mengambil sampul melalui proxy unduhan dengan batas 2 MB dan melewati frame saat gagal. [v]

## Kelompok 4. Panel Unduhan

4.1. Menambahkan pilihan bitrate 128/192/320 kbps dengan bawaan 192. [v]

4.2. Menambahkan pratinjau inline dengan tombol putar dan pemutar video. [v]

4.3. Merekam riwayat setelah unduhan MP4 dan MP3 berhasil. [v]

4.4. Menambahkan tautan riwayat pada baris atas panel unduhan. [v]

## Kelompok 5. Riwayat Unduhan

5.1. Membuat lib/download-history.ts dengan penyimpanan localStorage maksimum 50 entri. [v]

5.2. Membuat components/history-panel.tsx beserta gaya visualnya. [v]

5.3. Membuat app/history/page.tsx dengan metadata halaman. [v]

5.4. Menambahkan tautan riwayat pada hero halaman utama. [v]

## Kelompok 6. Dokumentasi

6.1. Menambahkan folder specs/004-universal-mp3-history. [v]

6.2. Memperbarui README. [v]

## Kelompok 7. Pengujian Manual

7.1. Menguji tautan video TikTok dan Instagram membuka halaman unduhan. [ ]

7.2. Menguji konversi MP3 dari video TikTok dan Instagram berdurasi pendek. [ ]

7.3. Menguji ketiga pilihan bitrate menghasilkan ukuran berkas berbeda. [ ]

7.4. Menguji metadata judul, penulis, dan sampul terbaca pada pemutar. [ ]

7.5. Menguji pratinjau inline memutar video langsung pada halaman unduhan. [ ]

7.6. Menguji riwayat terekam setelah unduhan dan halaman /history menampilkannya. [ ]

7.7. Menguji hapus per entri dan bersihkan riwayat. [ ]

7.8. Memastikan unduhan foto dan carousel tidak berubah perilakunya. [ ]

Urutan pengerjaan yang disarankan mengikuti nomor kelompok di atas, dimulai dari Kelompok 1 sampai Kelompok 7.
