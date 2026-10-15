# Spesifikasi Fitur: MP3 Universal, Bitrate, Metadata ID3, dan Riwayat Unduhan

Nomor Fitur: 004
Nama Proyek: naze-sosdown
Status: Draft
Metode: Spec Driven Development (SDD)

## 1. Latar Belakang

Fitur 003 menyediakan opsi MP3 hanya untuk YouTube. Pengguna meminta opsi MP3 yang tersedia untuk semua platform video, kemampuan memilih kualitas berkas audio, metadata yang tertanam pada berkas hasil, pratinjau yang bisa diputar langsung, dan kemudahan menelusuri unduhan yang pernah dilakukan. Dari daftar saran fitur yang diajukan, lima prioritas teratas dipilih untuk dikerjakan pada fase ini.

## 2. Tujuan Fase Ini

1. Opsi MP3 tersedia untuk seluruh platform video (YouTube, TikTok, Instagram) melalui halaman unduhan.
2. Pengguna dapat memilih bitrate MP3: 128 kbps, 192 kbps, atau 320 kbps, dengan 192 kbps sebagai bawaan.
3. Berkas MP3 hasil konversi menyimpan metadata ID3v2.3 berupa judul, penulis, dan sampul sehingga pemutar menampilkan informasi tersebut.
4. Halaman unduhan menampilkan pratinjau yang dapat diputar langsung (video inline) tanpa meninggalkan aplikasi.
5. Riwayat unduhan tersimpan di peramban dan dapat dilihat pada halaman khusus /history dengan kemampuan menghapus per entri atau membersihkan seluruhnya.

## 3. Cakupan (In Scope)

1. Navigasi kartu video semua platform menuju halaman unduhan; foto dan carousel tetap terunduh langsung dari kartu hasil.
2. Ekstraksi trek audio dari berkas video TikTok dan Instagram melalui dekode Web Audio API pada jalur konversi yang sama dengan YouTube.
3. Pilihan bitrate 128/192/320 kbps pada panel unduhan; batas durasi 15 menit tetap berlaku untuk semua platform.
4. Penulisan tag ID3v2.3 (TIT2 judul, TPE1 penulis, APIC sampul) secara manual di depan blob MP3; sampul diambil melalui proxy unduhan dengan batas ukuran 2 MB.
5. Pratinjau inline pada halaman unduhan: gambar sampul dengan tombol putar yang membuka pemutar video langsung pada kartu.
6. Riwayat unduhan pada localStorage dengan maksimum 50 entri, direkam setiap unduhan MP4 maupun MP3 berhasil, dan ditampilkan pada halaman /history.
7. Tautan menuju halaman riwayat pada hero halaman utama dan pada baris atas halaman unduhan.

## 4. Di Luar Cakupan (Out of Scope)

1. Sinkronisasi riwayat lintas perangkat atau akun; riwayat bersifat lokal pada peramban.
2. Konversi MP3 sisi server; seluruh konversi tetap berjalan di peramban.
3. Pengeditan metadata secara manual oleh pengguna sebelum unduhan.
4. Tag ID3 selain judul, penulis, dan sampul, misalnya album atau nomor trek.
5. Unduhan massal atau antrean unduhan.

## 5. Pengguna dan Skenario Utama

Skenario A. Pengguna menempelkan tautan video TikTok atau Instagram. Tombol pada kartu hasil membuka halaman unduhan, bukan mengunduh langsung.

Skenario B. Pada halaman unduhan, pengguna memilih MP3 dan bitrate 320 kbps. Berkas hasil disandikan pada bitrate tersebut dengan metadata judul, penulis, dan sampul.

Skenario C. Pengguna memutar video langsung dari halaman unduhan melalui pemutar inline sebelum memutuskan mengunduh.

Skenario D. Setelah unduhan berhasil, entri baru muncul pada halaman /history. Pengguna dapat menghapus satu entri atau membersihkan semuanya.

Skenario E. Pengguna mengunduh foto atau carousel Instagram; perilakunya tidak berubah dan tetap terunduh langsung dari kartu hasil.

## 6. Kriteria Sukses

1. Kartu video semua platform membuka halaman unduhan dan opsi MP3 tersedia untuk semua platform.
2. Bitrate yang dipilih pengguna menentukan ukuran dan kualitas berkas MP3 hasil.
3. Berkas MP3 hasil memuat tag ID3v2.3 yang terbaca oleh pemutar umum.
4. Pratinjau video dapat diputar langsung pada halaman unduhan.
5. Riwayat unduhan terekam setelah unduhan berhasil dan halaman /history menampilkannya.
6. Perilaku unduhan foto dan carousel tidak berubah dari fase sebelumnya.

## 7. Batasan dan Risiko yang Diketahui

1. Konversi MP3 TikTok dan Instagram memuat seluruh berkas video ke memori peramban sebelum audionya diekstraksi; video berukuran sangat besar atau berdurasi panjang berisiko menghabiskan memori. Batas durasi 15 menit meredam sebagian risiko ini.
2. Tag ID3v2.3 memakai pengodean UTF-8 pada frame teks; mayoritas pemutar menerimanya, namun sebagian kecil pemutar lawas mungkin menampilkan teks dengan awalan karakter aneh.
3. Sampul yang melebihi 2 MB dilewati agar tag tidak membengkak; berkas MP3 tetap valid tanpa sampul.
4. Riwayat bergantung pada localStorage yang dapat dibersihkan pengguna atau dibatasi mode privat peramban; kegagalan penyimpanan tidak boleh menggagalkan unduhan.
5. lamejs tetap dimuat dari CDN saat opsi MP3 dipakai; kegagalan CDN hanya memengaruhi opsi MP3.

## 8. Ketergantungan Antar Fitur

Fitur ini memakai kontrak data Fitur 001, label kualitas Fitur 002, serta resolver dan halaman unduhan Fitur 003. Halaman /download menjadi pusat seluruh unduhan video sehingga fitur lanjutan seperti antrean unduhan cukup mengubah satu tempat.
