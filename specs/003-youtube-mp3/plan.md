# Rencana Teknis: Dukungan YouTube dan Pilihan Format MP4/MP3

Mengacu pada: spec.md (Fitur 003)
Tech Stack: Next.js (App Router), TypeScript

## 1. Perubahan Kontrak Data

lib/resolvers/types.ts menambahkan tiga perubahan aditif:

1. Platform bertambah "youtube".
2. ResolvedMediaItem menambahkan bidang opsional formatId (penanda format sumber, misalnya itag YouTube) untuk kebutuhan pembaruan URL pada route unduhan.
3. ResolvedMedia menambahkan bidang opsional audioItem berisi jalur audio mandiri. Null bila platform tidak menyediakannya.

Seluruh bidang bersifat opsional agar konsumen API yang sudah ada tidak rusak.

## 2. Deteksi Platform

lib/resolvers/detect-platform.ts mengenali host youtube.com, music.youtube.com, youtube-nocookie.com, dan youtu.be, dengan ID video diekstraksi dari parameter v atau path shorts, live, embed, dan v. URL dinormalisasi ke bentuk watch baku sehingga resolver dan route unduhan bekerja dengan satu representasi tautun yang sama.

## 3. Resolver YouTube

lib/resolvers/youtube.ts menanyakan endpoint InnerTube youtubei/v1/player tanpa dependensi eksternal:

1. Klien pertama: IOS (URL media langsung tanpa dekripsi signature). Klien kedua: TVHTML5_SIMPLY_EMBEDDED_PLAYER untuk video yang dapat disematkan. Klien pertama yang mengembalikan playabilityStatus OK dipakai.
2. Opsi MP4 diambil dari streamingData.formats dengan mimeType video/mp4 dan URL langsung, diurutkan menurun berdasarkan tinggi resolusinya. qualityLabel menjadi teks resolusi (mis. 720p) dan itag disimpan pada formatId.
3. Opsi MP3 diambil dari streamingData.adaptiveFormats dengan mimeType audio/ dengan bitrate tertinggi, tanpa transcoding; wadah mengikuti sumber.
4. Sampul diambil dari videoDetails.thumbnail (entri resolusi tertinggi) dan menjadi poster pratinjau.
5. Modul mengekspor refreshYouTubeFormatUrl(sourceUrl, formatId) untuk meminta URL segar satu itag; dipakai route unduhan.

## 4. Resolver TikTok

lib/resolvers/tiktok.ts menambahkan buildAudioItem yang membaca itemStruct.music.playUrl sebagai jalur audio mandiri. Wadah dideteksi dari ekstensi URL (mp3 atau m4a) dan sampul diambil dari music.coverLarge. Jalur audio juga didaftarkan ke cache cookie media. Tidak ada perubahan pada item video dan foto yang sudah ada.

## 5. Resolver Instagram

Tidak berubah. Halaman embed Instagram tidak menyediakan jalur audio mandiri sehingga audioItem selalu null dan opsi MP3 tidak tampil.

## 6. Route Unduhan

app/api/download/route.ts:

1. Menambahkan header Referer untuk platform youtube.
2. Menambahkan parameter itag. Ketika unduhan YouTube gagal pada upaya pertama, route memanggil refreshYouTubeFormatUrl untuk mendapatkan URL segar bagi itag yang sama, lalu mengulangi permintaan.
3. Menambahkan parameter ext untuk ekstensi berkas audio (mp3, m4a, webm) dengan fallback dari Content-Type; berkas video tetap mp4 dan gambar tetap jpg.

## 7. Antarmuka

1. app/page.tsx meneruskan audioItem ke setiap kartu hasil, mengirim parameter itag dan ext ke route unduhan, serta memperbarui teks hero dan pesan kesalahan.
2. components/result-card.tsx menambahkan state format (mp4/mp3) dan memgeneralisasi pilihan resolusi: tombol menampilkan label kualitas (HD/SD) bila ada, jika tidak teks resolusi sumber (mis. 720P). Mode MP3 menampilkan sampul, pemutar audio inline, dan tombol Unduh MP3.
3. Kartu foto dengan jalur audio menampilkan tombol Unduh MP3 tambahan di bawah tombol unduhan utama.
4. components/icons/IconMusic.tsx dibuat sebagai SVG kustom mengikuti konvensi ikon proyek.
5. components/link-input.tsx memperbarui placeholder masukan.

## 8. Gaya Visual

components/result-card.module.css menambahkan kelas audioPlayer dan downloadActions, keduanya memakai token desain yang sudah ada pada styles/globals.css. Pemilih format memakai kelas tombol kualitas yang sudah ada.

## 9. Kompatibilitas

Respons /api/resolve hanya menambah bidang opsional. Perilaku unduhan tanpa parameter baru tidak berubah. Konsumen API yang mengabaikan audioItem dan formatId tetap berfungsi seperti sebelumnya.
