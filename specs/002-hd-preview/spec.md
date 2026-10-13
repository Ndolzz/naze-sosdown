# Spesifikasi Fitur: Opsi Unduhan HD dan Pratinjau Media

Nomor Fitur: 002
Nama Proyek: naze-sosdown
Status: Draft
Metode: Spec Driven Development (SDD)

## 1. Latar Belakang

Resolver pada Fitur 001 hanya mengembalikan satu varian video tanpa watermark, ditambah versi berwatermark sebagai cadangan, padahal data sumber TikTok menyertakan beberapa varian bitrate pada satu video. Selain itu, antarmuka belum menampilkan gambar pratinjau sehingga pengguna harus mengunduh berkas untuk memastikan isinya.

## 2. Tujuan Fase Ini

1. Sistem menawarkan pilihan resolusi HD dan SD ketika platform sumber menyediakan lebih dari satu varian video.
2. Kartu hasil menampilkan pratinjau: gambar sampul untuk video dan gambar penuh untuk foto sebelum pengguna mengunduh.
3. Pratinjau video dapat diputar langsung di dalam kartu hasil.

## 3. Cakupan (In Scope)

1. TikTok: pembacaan video.bitrateInfo, varian bitrate tertinggi diberi label hd dan varian di bawahnya diberi label sd.
2. TikTok dan Instagram: URL gambar sampul sebagai data pratinjau pada setiap item media.
3. Route /api/download mendukung disposition inline agar media dapat dirender sebagai pratinjau, termasuk penerusan header Range untuk pemutaran video.
4. Antarmuka: sakelar kualitas HD/SD pada kartu hasil, area pratinjau, dan pemutaran video inline.

## 4. Di Luar Cakupan (Out of Scope)

1. Transkoding, peningkatan resolusi, atau pemrosesan berkas di sisi server.
2. Pratinjau untuk media yang tidak menyediakan sampul pada data sumbernya.
3. Platform di luar TikTok dan Instagram.

## 5. Pengguna dan Skenario Utama

Skenario A. Pengguna menempelkan tautan video TikTok yang menyediakan beberapa varian bitrate. Kartu hasil menampilkan pilihan HD dan SD, dan pilihan tersebut menentukan berkas yang diunduh.

Skenario B. Pengguna menempelkan tautan video dengan gambar sampul. Kartu hasil menampilkan gambar sampul, dan menekan gambar tersebut memutar video secara inline tanpa meninggalkan halaman.

Skenario C. Pengguna menempelkan tautan foto atau carousel. Setiap kartu menampilkan gambar penuh sebagai pratinjau sebelum diunduh.

Skenario D. Media hanya menyediakan satu varian. Kartu tetap berfungsi seperti sebelumnya tanpa pilihan kualitas.

## 6. Kriteria Sukses

1. Ketika varian ganda tersedia, kartu hasil menampilkan pilihan HD dan SD, dan unduhan sesuai dengan pilihan aktif.
2. Ketika hanya satu varian tersedia, kartu tetap berfungsi tanpa pilihan kualitas (kompatibel dengan perilaku sebelumnya).
3. Respons /api/resolve hanya menambahkan bidang opsional sehingga konsumen API yang sudah ada tidak rusak.
4. Pratinjau tidak mengubah perilaku tombol unduhan sebelumnya.

## 7. Batasan dan Risiko yang Diketahui

1. Struktur video.bitrateInfo pada data rehidrasi TikTok dapat berubah sewaktu waktu. Resolver menyediakan jalur cadangan video.playAddr sehingga kegagalan pembacaan varian tidak menghentikan fitur unduhan inti.
2. Halaman embed Instagram tidak menyediakan varian kualitas ganda sehingga pilihan HD/SD hanya berlaku untuk TikTok.
3. Pratinjau inline menambah pemakaian bandwidth karena media melewati proxy unduhan, bukan langsung dari peramban.

## 8. Ketergantungan Antar Fitur

Fitur ini membangun di atas kontrak data Fitur 001 tanpa merusak kompatibilitas. Label kualitas dan pratinjau menjadi dasar untuk fitur lanjutan seperti unduhan massal dengan pilihan kualitas.
