# Spesifikasi Fitur: YouTube Downloader, Halaman Unduhan, dan Opsi MP3

Nomor Fitur: 003
Nama Proyek: naze-sosdown
Status: Draft
Metode: Spec Driven Development (SDD)

## 1. Latar Belakang

Fitur 001 dan 002 menangani TikTok dan Instagram dengan unduhan langsung dari kartu hasil. Pengguna meminta tiga hal baru: dukungan YouTube, halaman unduhan khusus dengan pilihan format, dan opsi unduhan MP3. Selain itu terdapat keluhan: unduhan pertama setelah halaman dibuka sering gagal dengan galat dari CDN, padahal percobaan kedua setelah refresh berhasil.

## 2. Tujuan Fase Ini

1. Resolver mendukung tautan YouTube (watch, shorts, youtu.be, embed) dan mengembalikan varian video MP4 beserta trek audio terpisah.
2. Halaman unduhan khusus pada /download menampilkan pratinjau, pilihan kualitas, pilihan format MP4 atau MP3, status progres, dan pesan galat dengan tombol coba lagi.
3. Opsi MP3 menghasilkan berkas MP3 192 kbps melalui konversi di sisi peramban.
4. Route /api/download lebih tahan terhadap penolakan pertama dari CDN melalui ronde percobaan berulang dan pembaruan cookie sesi yang di-cache.

## 3. Cakupan (In Scope)

1. Resolver YouTube: strategi utama endpoint innertube dengan klien ANDROID, strategi cadangan halaman watch dengan dekripsi signatureCipher dari base.js.
2. Kontrak data: tipe platform youtube, bidang opsional audio dan durationSeconds pada ResolvedMedia.
3. Halaman /download: resolusi ulang tautan, sakelar format MP4/MP3, sakelar kualitas HD/SD bila tersedia, unduhan dengan umpan balik status.
4. Konversi MP3 sisi klien: pengambilan audio lewat proxy unduhan, dekode Web Audio API, penyandian lamejs yang dimuat dari CDN saat fitur dipakai.
5. Perbaikan keandalan proxy unduhan: beberapa ronde percobaan dengan jeda dan pembaruan cookie sesi.
6. Pilihan nama berkas unduhan melalui parameter name yang disaring dari karakter berbahaya.

## 4. Di Luar Cakupan (Out of Scope)

1. Transkode sisi server; lingkungan serverless tidak memiliki ffmpeg.
2. Penggabungan video dan audio adaptif (DASH muxing); hanya format progresif MP4 yang disediakan sehingga resolusi maksimum mengikuti format tersebut.
3. Penanganan parameter pembatas kecepatan (n) pada URL googlevideo; unduhan mungkin lebih lambat dari biasanya.
4. Opsi MP3 untuk TikTok dan Instagram.

## 5. Pengguna dan Skenario Utama

Skenario A. Pengguna menempelkan tautan YouTube pada halaman utama. Kartu hasil muncul dan tombolnya membuka halaman unduhan.

Skenario B. Pada halaman unduhan, pengguna memilih MP4, memilih kualitas bila tersedia, lalu unduhan dimulai.

Skenario C. Pengguna memilih MP3. Audio diambil, didekode, disandikan ulang di peramban, dan tersimpan sebagai berkas MP3 dengan progres terlihat.

Skenario D. Unduhan pertama ditolak CDN. Route melakukan percobaan ulang secara otomatis; bila tetap gagal, halaman menampilkan galat dengan tombol coba lagi.

Skenario E. Tautan TikTok dan Instagram tetap terunduh langsung dari kartu hasil seperti sebelumnya.

## 6. Kriteria Sukses

1. Tautan YouTube valid menghasilkan kartu di halaman utama dan halaman unduhan berfungsi.
2. Pilihan MP4 dan MP3 menentukan jenis berkas yang diunduh.
3. Respons /api/resolve untuk TikTok dan Instagram tidak berubah bentuknya; bidang baru bersifat opsional.
4. Unduhan pertama setelah halaman dibuka berhasil tanpa refresh manual dalam kondisi normal.
5. Video berdurasi lebih dari 15 menit menolak opsi MP3 dengan pesan yang jelas.

## 7. Batasan dan Risiko yang Diketahui

1. Sisi YouTube berubah cepat: kunci dan versi klien innertube, pola fungsi decipher pada base.js, serta struktur halaman watch dapat berubah sewaktu waktu.
2. YouTube dapat meminta verifikasi bot pada sebagian video atau IP server; resolver mengembalikan pesan konten tidak tersedia pada kasus tersebut.
3. Konversi MP3 memuat lamejs dari CDN esm.sh; kegagalan CDN hanya memengaruhi opsi MP3.
4. Konversi MP3 memakai memori peramban sebanding durasi audio sehingga dibatasi 15 menit.

## 8. Ketergantungan Antar Fitur

Fitur ini memakai kontrak data Fitur 001 dan label kualitas Fitur 002 tanpa merusak kompatibilitas. Halaman unduhan menjadi dasar untuk fitur lanjutan seperti antrean unduhan atau unduhan massal.
