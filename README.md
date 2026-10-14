# naze-sosdown

Alat unduh video, foto, dan audio dari YouTube, TikTok, dan Instagram tanpa menggunakan API resmi platform. Dibangun dengan metode Spec Driven Development (SDD): setiap fitur didefinisikan lebih dulu dalam bentuk spesifikasi sebelum masuk ke tahap implementasi.

## Metode Kerja

Dokumen di dalam folder specs menjadi sumber kebenaran (source of truth) untuk arah pengembangan. Setiap fitur memiliki tiga dokumen:

1. spec.md, menjelaskan kebutuhan dan kriteria sukses.
2. plan.md, menjelaskan arsitektur teknis untuk memenuhi spec.
3. tasks.md, memecah plan menjadi tugas tugas kecil yang bisa langsung dikerjakan.

## Fitur Aktif

001 Core Downloader (TikTok dan Instagram), lihat folder specs/001-core-downloader.

002 Opsi Unduhan HD dan Pratinjau Media, lihat folder specs/002-hd-preview. Fitur ini menambahkan pilihan kualitas HD dan SD pada video TikTok dengan varian bitrate ganda, gambar sampul sebagai pratinjau, serta pemutaran video inline pada kartu hasil.

003 Dukungan YouTube dan Pilihan Format, lihat folder specs/003-youtube-mp3. Fitur ini menambahkan unduhan video YouTube dengan pilihan resolusi, pemilih format MP4 atau MP3 pada kartu hasil, opsi unduhan MP3 dari jalur audio mandiri YouTube dan lagu latar TikTok, serta pembaruan URL media YouTube secara otomatis ketika permintaan unduhan ditolak.

Catatan untuk Fitur 003: opsi MP3 mengunduh jalur audio asli dari sumber tanpa transcoding, sehingga wadah berkasnya mengikuti sumber (mp3, m4a, atau webm). Instagram tidak menyediakan jalur audio mandiri pada halaman embed sehingga opsi MP3 tidak tersedia untuk platform tersebut.

## Tech Stack

Next.js (App Router) dengan TypeScript, frontend dan backend berada dalam satu proyek yang sama.

## Gaya Desain

Modern SaaS, Minimalist, Dark Professional, dengan sentuhan Bento pada susunan kartu, dan tipografi bergaya terminal untuk elemen teknis. Seluruh ikon dibuat sebagai SVG kustom, tanpa emoji dan tanpa ikon simbol bawaan sistem.


## API Key (Opsional)

Mode terproteksi API key diaktifkan lewat environment variable. Tanpa itu, aplikasi berjalan bebas.

### Environment Variables

- `API_KEYS`: daftar key valid, dipisah koma. Contoh: `naze-20260926-abc123def456, naze-prod-xyz789`
- `REQUIRE_API_KEY`: isi `true` untuk mengaktifkan mode terproteksi. Selain itu, mode bebas.

Kerangka konfigurasi tersedia pada berkas `.env.example`. Salin menjadi `.env.local` lalu sesuaikan nilainya.

### Membuat Key Baru

Jalankan skrip CLI lalu salin hasilnya ke `API_KEYS`:

```bash
node scripts/generate-api-key.mjs --prefix naze
```

### Mengirim Key dari Klien

Pilih salah satu cara:

```bash
# Header x-api-key
curl -H "x-api-key: naze-20260926-abc123def456" -X POST https://app.example.com/api/resolve -d '{"url":"https://www.tiktok.com/@user/video/123"}'

# Header Authorization Bearer
curl -H "Authorization: Bearer naze-20260926-abc123def456" ...

# Query parameter
curl "https://app.example.com/api/download?url=...&key=naze-20260926-abc123def456"
```

Request tanpa key yang valid akan menerima respons 401 dengan pesan JSON.

## Lisensi

Proyek ini dilisensikan di bawah MIT License. Lihat berkas LICENSE untuk teks lengkapnya.
