# Rincian Tugas: Core Downloader (TikTok dan Instagram)

Mengacu pada: spec.md dan plan.md (Fitur 001)

## Kelompok 1. Pondasi Proyek

1.1. Inisialisasi proyek Next.js dengan TypeScript.
1.2. Menyusun struktur folder sesuai plan.md.
1.3. Menyusun token desain di globals.css (warna, tipografi monospace, jarak antar elemen).
1.4. Menyiapkan komponen dasar (tombol, kartu, input) mengikuti gaya Dark Professional dan Bento.

## Kelompok 2. Deteksi dan Kontrak Data

2.1. Membuat fungsi detect-platform.ts.
2.2. Mendefinisikan tipe ResolvedMedia di types.ts.
2.3. Menyusun kerangka kesalahan seragam (error shape) yang dipakai semua resolver.

## Kelompok 3. Resolver TikTok

3.1. Menangani tautan pendek (vh.tiktok.com) dan tautan penuh.
3.2. Mengambil data video tanpa watermark sebagai hasil utama.
3.3. Mengambil data video berwatermark sebagai cadangan bila hasil utama gagal.
3.4. Menangani kasus TikTok Photo Mode (kumpulan foto dalam satu tautan).

## Kelompok 4. Resolver Instagram

4.1. Menangani tautan reel.
4.2. Menangani tautan postingan foto tunggal.
4.3. Menangani tautan carousel (banyak item dalam satu postingan).
4.4. Menangani kasus konten privat dengan pesan kesalahan yang sesuai.

## Kelompok 5. Route Handler

5.1. Membuat /api/resolve yang menerima tautan dan memanggil resolver sesuai platform.
5.2. Membuat /api/download sebagai proxy pengunduhan berkas akhir.
5.3. Menyusun format respons JSON yang konsisten untuk hasil sukses maupun gagal.

## Kelompok 6. Antarmuka Pengguna

6.1. Membuat halaman utama dengan kolom input tautan.
6.2. Membuat komponen kartu hasil pratinjau bergaya bento.
6.3. Menyusun status proses (memuat, berhasil, gagal) dengan tipografi terminal.
6.4. Membuat ikon kustom berbasis SVG untuk aksi unduh, salin tautan, dan status.

## Kelompok 7. Pengujian Manual Awal

7.1. Menguji lima tautan video TikTok publik berbeda.
7.2. Menguji tiga tautan reel Instagram publik berbeda.
7.3. Menguji satu tautan carousel Instagram.
7.4. Menguji satu tautan tidak valid untuk memastikan pesan kesalahan tampil dengan benar.

Urutan pengerjaan yang disarankan mengikuti nomor kelompok di atas, dimulai dari Kelompok 1 sampai Kelompok 7.
