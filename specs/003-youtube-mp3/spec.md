# Spesifikasi Fitur: Dukungan YouTube dan Pilihan Format MP4/MP3

Nomor Fitur: 003
Nama Proyek: naze-sosdown
Status: Draft
Metode: Spec Driven Development (SDD)

## 1. Latar Belakang

Fitur 001 dan 002 hanya mendukung TikTok dan Instagram. Pengguna membutuhkan dukungan YouTube, termasuk pilihan resolusi, serta kemampuan memilih format unduhan antara MP4 (video) dan MP3 (audio) yang juga berlaku untuk platform yang sudah ada.

## 2. Tujuan Fase Ini

1. Tautan YouTube (watch, shorts, youtu.be, music.youtube.com) dikenali dan dapat diunduh.
2. Pengguna dapat memilih resolusi unduhan MP4 dari varian yang tersedia pada platform sumber.
3. Pengguna dapat memilih format MP4 atau MP3 pada kartu hasil ketika platform sumber menyediakan jalur audio mandiri.

## 3. Cakupan (In Scope)

1. Resolver YouTube melalui endpoint internal InnerTube (youtubei/v1/player) dengan klien seluler IOS dan cadangan TVHTML5_SIMPLY_EMBEDDED_PLAYER, tanpa dependensi eksternal baru.
2. Opsi MP4 YouTube berasal dari format muxed (video dan audio dalam satu berkas) yang tersedia; setiap varian menampilkan label resolusinya.
3. Opsi MP3 YouTube berasal dari jalur audio-only dengan bitrate tertinggi; audio diunduh apa adanya tanpa transcoding.
4. Opsi MP3 TikTok berasal dari lagu latar (itemStruct.music.playUrl) yang disediakan TikTok sebagai jalur audio mandiri.
5. Pemilih format MP4/MP3 dan pemilih resolusi digeneralisasi pada kartu hasil; kartu foto menampilkan tombol unduhan audio tambahan bila jalur audio tersedia.
6. Route unduhan meminta URL segar untuk itag yang sama ketika URL media YouTube lama ditolak karena terikat IP instance berbeda.
7. Route unduhan menamai berkas audio sesuai wadah aslinya (mp3, m4a, webm) melalui parameter ext.

## 4. Di Luar Cakupan (Out of Scope)

1. Transkoding audio menjadi MP3 sejati dengan ffmpeg. Lingkungan serverless tidak menyediakan ffmpeg; opsi MP3 mengunduh jalur audio asli dari sumber.
2. Penggabungan stream video resolusi tinggi dengan stream audio (muxing). Opsi MP4 dibatasi pada format muxed yang disediakan sumber, umumnya 360p dan 720p.
3. MP3 untuk Instagram. Halaman embed Instagram tidak menyediakan jalur audio mandiri sehingga opsi tersebut tidak tampil untuk platform ini.
4. Unduhan playlist, live stream, atau konten berbayar YouTube.

## 5. Pengguna dan Skenario Utama

Skenario A. Pengguna menempelkan tautan video YouTube. Kartu hasil menampilkan pilihan format MP4/MP3 dan daftar resolusi MP4 yang tersedia. Unduhan mengikuti pilihan aktif.

Skenario B. Pengguna memilih format MP3 pada video YouTube. Kartu menampilkan pratinjau audio yang dapat diputar langsung, dan berkas hasil diunduh dari jalur audio asli tanpa transcoding.

Skenario C. Pengguna menempelkan tautan video TikTok. Kartu hasil menampilkan pilihan format MP4/MP3. Opsi MP4 tetap menawarkan pilihan HD/SD seperti sebelumnya; opsi MP3 mengunduh lagu latar video.

Skenario D. Pengguna menempelkan tautan Instagram. Kartu hasil berperilaku sama seperti sebelumnya tanpa pilihan format karena tidak ada jalur audio mandiri.

Skenario E. Unduhan YouTube ditolak karena URL media diterbitkan untuk IP instance lain. Route unduhan mengulangi resolve untuk itag yang sama dan memakai URL segar tanpa interaksi pengguna.

## 6. Kriteria Sukses

1. Tautan YouTube yang valid menghasilkan kartu hasil dengan minimal satu opsi MP4 dan satu opsi MP3.
2. Pemilih resolusi menampilkan seluruh varian MP4 muxed yang tersedia, dan unduhan sesuai dengan resolusi yang dipilih.
3. Pemilih format hanya tampil ketika platform menyediakan jalur audio mandiri; kartu tanpa jalur audio tetap berfungsi seperti sebelumnya.
4. Respons /api/resolve hanya menambahkan bidang opsional (audioItem, formatId) sehingga konsumen API yang sudah ada tidak rusak.
5. Perilaku unduhan TikTok dan Instagram tanpa opsi audio tidak berubah dibandingkan Fitur 002.

## 7. Batasan dan Risiko yang Diketahui

1. Struktur respons InnerTube dan kebijakan klien YouTube dapat berubah sewaktu waktu, termasuk penuntutan PO token atau verifikasi bot. Konfigurasi klien pada resolver adalah titik perawatan pertama; kegagalan luas harus diatasi dengan memperbarui urutan atau konfigurasi klien.
2. URL googlevideo terikat IP instance penerbitnya. Pembaruan URL lewat itag mengurangi gejala ini, tetapi pada lingkungan serverless tidak ada jaminan permanen; unduhan dapat tetap gagal bila YouTube menolak seluruh klien.
3. Opsi MP4 YouTube dibatasi pada format muxed. Video yang hanya menyediakan stream terpisah resolusi tinggi tidak akan menawarkan resolusi tersebut.
4. Opsi MP3 TikTok mengunduh lagu latar, bukan hasil ekstraksi audio dari video. Untuk video dengan audio asli campuran, jalur ini mungkin tidak identik dengan audio video.
5. Kebijakan platform dapat membatasi unduhan dari IP pusat data (mis. Vercel) tanpa peringatan. Resolver harus menampilkan pesan kesalahan yang jelas, bukan kegagalan senyap.

## 8. Ketergantungan Antar Fitur

Fitur ini membangun di atas kontrak data Fitur 001 dan 002. Bidang audioItem dan formatId bersifat opsional. Pemilih format dan resolusi pada kartu hasil menjadi dasar untuk fitur lanjutan seperti unduhan massal per format.
