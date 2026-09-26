# Rencana Teknis: Core Downloader (TikTok dan Instagram)

Mengacu pada: spec.md (Fitur 001)
Tech Stack: Next.js (App Router), TypeScript

## 1. Arsitektur Umum

Sistem dibangun sebagai satu aplikasi Next.js yang menggabungkan frontend dan backend dalam satu proyek. Backend berjalan sebagai Route Handler (API route) di dalam Next.js sendiri, sehingga tidak diperlukan server terpisah pada fase ini.

Alur data secara umum:

1. Pengguna menempelkan tautan di frontend.
2. Frontend mengirim tautan ke Route Handler internal (/api/resolve).
3. Route Handler mendeteksi platform, lalu memanggil modul resolver yang sesuai.
4. Resolver mengambil data mentah dari sumber (halaman publik atau endpoint internal platform), lalu menormalkan hasilnya ke satu bentuk data yang seragam.
5. Route Handler mengirim hasil normalisasi ke frontend dalam format JSON.
6. Frontend menampilkan pratinjau dan tombol unduh yang mengarah ke Route Handler kedua (/api/download) yang menjadi proxy pengunduhan berkas.

## 2. Struktur Folder

```
naze-sosdown/
  app/
    page.tsx                  Halaman utama, input tautan dan daftar hasil
    api/
      resolve/route.ts        Menerima tautan, mengembalikan metadata media
      download/route.ts       Proxy pengunduhan berkas akhir
  lib/
    resolvers/
      tiktok.ts                Logika pengambilan data TikTok
      instagram.ts             Logika pengambilan data Instagram
      types.ts                 Tipe data hasil resolver yang seragam
      detect-platform.ts       Fungsi deteksi platform dari pola URL
  components/
    ui/                        Komponen dasar (tombol, kartu, input)
    link-input.tsx             Komponen input tautan
    result-card.tsx            Komponen kartu hasil pratinjau
  styles/
    globals.css                Token warna dan tipografi global
  specs/
    001-core-downloader/       Dokumen spesifikasi fase ini
```

## 3. Modul Resolver

Setiap platform memiliki modul resolver sendiri yang mengikuti kontrak (interface) yang sama, sehingga penambahan platform baru di masa depan tidak mengubah kode di lapisan atas.

Kontrak dasar:

```
type ResolvedMedia = {
  platform: "tiktok" | "instagram"
  type: "video" | "photo" | "carousel"
  items: Array<{
    url: string
    quality: string
    hasWatermark: boolean
    mimeType: string
  }>
  author: string | null
  caption: string | null
}
```

Resolver TikTok bertugas mengenali pola tautan (termasuk tautan pendek vh.tiktok.com), menormalkannya menjadi tautan penuh, lalu mengambil data video asli dari struktur halaman resmi TikTok.

Resolver Instagram bertugas mengenali tiga bentuk tautan (reel, p untuk postingan, dan carousel di dalam postingan yang sama), lalu mengambil data media dari struktur halaman publik Instagram.

## 4. Deteksi Platform

Fungsi detect-platform.ts memeriksa domain dari tautan yang dimasukkan pengguna dan mengembalikan salah satu dari tiga hasil: tiktok, instagram, atau tidak dikenali. Deteksi ini berjalan sebelum resolver dipanggil sehingga kesalahan tautan bisa ditangani lebih awal dengan pesan yang jelas.

## 5. Penanganan Kesalahan

Setiap resolver mengembalikan bentuk kesalahan yang seragam berupa kode kesalahan dan pesan yang bisa ditampilkan ke pengguna, dengan tiga kategori utama:

1. Tautan tidak valid atau platform tidak didukung.
2. Konten tidak dapat diakses (privat atau sudah dihapus).
3. Struktur sumber berubah sehingga resolver gagal mengurai data (dicatat sebagai kesalahan teknis untuk pemeliharaan).

## 6. Desain Antarmuka

Mengikuti arahan gaya proyek yaitu Modern SaaS, Minimalist, Dark Professional, dengan sentuhan Bento pada susunan kartu hasil, dan tipografi bergaya terminal untuk elemen teknis seperti status proses dan metadata.

Prinsip desain:

1. Latar gelap sebagai dasar, dengan aksen warna tunggal untuk elemen aktif (tombol utama, status berhasil).
2. Susunan kartu hasil mengikuti pola bento, ukuran kartu menyesuaikan jenis konten (video landscape berbeda proporsi dengan foto potret).
3. Font monospace digunakan pada bagian metadata teknis (durasi, resolusi, ukuran berkas) untuk memberi kesan presisi ala terminal.
4. Semua ikon dibuat sebagai SVG kustom, tidak menggunakan set ikon emoji ataupun karakter simbol bawaan sistem operasi.
5. Tidak ada karakter tanda hubung digunakan sebagai penanda daftar pada antarmuka maupun salinan teks, penomoran atau simbol grafis dipakai sebagai gantinya.

## 7. Batasan Teknis Awal

1. Fase ini berjalan sepenuhnya di sisi server milik proyek sendiri (server side fetching), tanpa memanggil API resmi berbayar dari TikTok maupun Meta.
2. Tidak ada penyimpanan permanen berkas media di server, proxy unduhan bersifat sekali pakai per permintaan.
3. Tidak ada autentikasi pengguna pada fase ini.
