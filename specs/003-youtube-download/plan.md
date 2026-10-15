# Rencana Teknis: YouTube Downloader, Halaman Unduhan, dan Opsi MP3

Mengacu pada: spec.md (Fitur 003)
Tech Stack: Next.js (App Router), TypeScript

## 1. Perubahan Kontrak Data

lib/resolvers/types.ts menambahkan youtube pada tipe Platform serta dua bidang opsional pada ResolvedMedia: audio (item trek audio terpisah) dan durationSeconds (durasi konten dalam detik). Keduanya opsional sehingga konsumen API yang sudah ada tidak rusak.

## 2. Resolver YouTube

lib/resolvers/youtube.ts diimplementasikan dengan dua strategi. Strategi utama memanggil endpoint innertube player dengan konteks klien ANDROID yang mengembalikan URL media langsung tanpa signatureCipher. Strategi cadangan mengambil halaman watch, membaca ytInitialPlayerResponse dengan penelusuran kurung kurawal berimbang, lalu mendekripsi signatureCipher melalui fungsi decipher yang dibangun dari berkas base.js; deteksi fungsi decipher memakai ciri split/join ditambah pemanggilan helper pada objek eksternal. Item video diambil dari format progresif MP4 (video dan audio dalam satu berkas) dan diberi label hd/sd mengikuti konvensi Fitur 002. Item audio dipilih dari format adaptif audio dengan prioritas M4A/AAC. lib/resolvers/detect-platform.ts mengenali host youtube.com (watch, shorts, embed, live), music.youtube.com, dan youtu.be. app/api/resolve/route.ts menambahkan dispatch ke resolver baru.

## 3. Route Unduhan

app/api/download/route.ts menjalankan tiga upaya berjenjang (cookie tersimpan, cookie segar dari halaman sumber, permintaan polos) dalam dua ronde dengan jeda singkat. Cookie segar juga disimpan ke cache sehingga ronde kedua langsung memakainya pada upaya pertama; pola inilah yang memperbaiki unduhan pertama yang sebelumnya gagal padahal percobaan ulang berhasil. Ekstensi nama berkas kini mengikuti jenis konten audio (m4a/weba), dan parameter name opsional memungkinkan nama berkas yang bersih dengan penyaringan karakter sebelum dipakai sebagai header.

## 4. Halaman Unduhan

app/download/page.tsx membungkus components/download-panel.tsx dengan Suspense karena panel memakai useSearchParams. Panel mengurai ulang tautan melalui /api/resolve, menampilkan pratinjau sampul, judul, penulis, durasi, sakelar kualitas, dan sakelar format MP4/MP3. Unduhan MP4 berjalan melalui navigasi ke proxy unduhan agar peramban mengelola berkas besar tanpa membebani memori halaman. Galat ditampilkan dengan tombol coba lagi.

## 5. Konversi MP3

lib/mp3.ts mengambil trek audio lewat proxy unduhan dengan progres baca stream, mendekode dengan Web Audio API, lalu menyandikan MP3 192 kbps memakai lamejs yang dimuat dinamis dari CDN esm.sh saat fitur dipakai (komentar webpackIgnore mencegah bundler memprosesnya). Pendekatan ini menjaga bundel tetap ringan dan tidak menambah dependensi pada package.json. Durasi dibatasi 15 menit untuk menjaga pemakaian memori peramban; melebihi itu, opsi MP3 menolak dengan pesan yang jelas.

## 6. Antarmuka Halaman Utama

app/page.tsx mengarahkan kartu YouTube ke halaman unduhan; tombol pada components/result-card.tsx diberi label khusus untuk YouTube. Teks hero, pesan galat tautan, dan placeholder pada components/link-input.tsx diperbarui untuk menyebut dukungan YouTube. app/layout.tsx memperbarui deskripsi metadata.

## 7. Kompatibilitas

TikTok dan Instagram tetap terunduh langsung dari kartu hasil seperti sebelumnya. Respons /api/resolve lama tidak berubah bentuk; bidang baru opsional. Mode API key opsional tidak berubah.
