# Spesifikasi Fitur: Core Downloader (TikTok dan Instagram)

Nomor Fitur: 001
Nama Proyek: naze-sosdown
Status: Draft
Metode: Spec Driven Development (SDD)

## 1. Latar Belakang

naze-sosdown adalah alat untuk mengunduh video dan foto dari TikTok dan Instagram tanpa menggunakan API resmi kedua platform tersebut. Sistem bekerja dengan mengenali pola tautan yang dimasukkan pengguna, lalu mengambil data media asli melalui pembacaan struktur endpoint internal yang dipakai oleh situs resminya sendiri.

## 2. Tujuan Fase Ini

1. Pengguna dapat menempelkan satu tautan TikTok atau Instagram ke dalam antarmuka.
2. Sistem mengenali platform dan jenis konten secara otomatis.
3. Sistem menampilkan pratinjau hasil sebelum diunduh, meliputi jenis media, resolusi yang tersedia, dan status watermark untuk TikTok.
4. Pengguna dapat mengunduh berkas akhir langsung dari antarmuka.

## 3. Cakupan (In Scope)

1. TikTok: video tanpa watermark, video dengan watermark sebagai cadangan, foto slide (jika tautan berupa TikTok Photo Mode).
2. Instagram: reel, postingan foto tunggal, dan carousel (multi foto atau video dalam satu postingan publik).
3. Deteksi otomatis jenis tautan dari pola URL.
4. Antarmuka satu halaman dengan input tautan dan daftar hasil unduhan.

## 4. Di Luar Cakupan (Out of Scope) untuk Fase 1

1. Instagram Story dan Instagram Live.
2. Konten dari akun privat.
3. Unduhan massal (banyak tautan sekaligus).
4. Akun pengguna, riwayat unduhan tersimpan, dan sistem login.
5. Batasi kuota atau sistem berbayar.

## 5. Pengguna dan Skenario Utama

Skenario A. Pengguna menempelkan tautan video TikTok publik.
Sistem mengembalikan pratinjau video tanpa watermark beserta metadata singkat (nama akun, durasi), lalu pengguna menekan tombol unduh.

Skenario B. Pengguna menempelkan tautan postingan Instagram berupa carousel.
Sistem menampilkan seluruh item dalam carousel sebagai daftar terpisah yang masing masing bisa diunduh sendiri sendiri.

Skenario C. Pengguna menempelkan tautan yang tidak valid atau berasal dari platform yang belum didukung.
Sistem menampilkan pesan kesalahan yang jelas tanpa membuat aplikasi gagal total.

## 6. Kriteria Sukses

1. Tautan video publik TikTok berhasil menghasilkan berkas video tanpa watermark pada percobaan wajar (lebih dari sembilan puluh persen kasus konten publik).
2. Tautan Instagram reel dan foto tunggal publik berhasil diproses dan diunduh.
3. Waktu proses dari tempel tautan sampai pratinjau muncul berada di bawah lima detik pada kondisi jaringan normal.
4. Kegagalan pada satu tautan tidak menghentikan proses tautan lain yang sedang atau akan diproses.

## 7. Batasan dan Risiko yang Diketahui

1. Struktur endpoint internal TikTok dan Instagram dapat berubah sewaktu waktu sehingga resolver perlu pemeliharaan berkala.
2. Pengambilan data dalam skala besar berisiko terkena pembatasan laju permintaan (rate limit) dari sisi platform.
3. Metode ini berada di luar jalur API resmi sehingga penggunaan dalam skala publik memiliki risiko dari sisi ketentuan layanan platform terkait.

## 8. Ketergantungan Antar Fitur Berikutnya

Fitur ini menjadi pondasi untuk fitur lanjutan berikutnya seperti unduhan massal, riwayat, dan dukungan platform tambahan. Fitur fitur tersebut akan didefinisikan sebagai nomor fitur terpisah (002, 003, dan seterusnya) setelah fondasi ini stabil.
