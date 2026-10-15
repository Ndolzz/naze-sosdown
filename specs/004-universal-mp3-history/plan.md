# Rencana Teknis: MP3 Universal, Bitrate, Metadata ID3, dan Riwayat Unduhan

Mengacu pada: spec.md (Fitur 004)
Tech Stack: Next.js (App Router), TypeScript

## 1. Navigasi Universal ke Halaman Unduhan

Semua kartu video, tanpa memandang platform, kini mengarah ke halaman /download. app/page.tsx memanggil router.push("/download?url=...") untuk setiap item bertipe video, sementara foto dan carousel tetap membuka proxy unduhan langsung melalui window.open. components/result-card.tsx memberi label tombol khusus "Buka halaman unduh" untuk tipe video. Perubahan ini disengaja: MP3 untuk TikTok dan Instagram membutuhkan halaman unduhan sebagai tempat pemilihan format.

## 2. Konversi MP3 Universal

lib/mp3.ts menerima opsi bitrate dan metadata pada convertAudioToMp3. Untuk YouTube, sumber audio tetap trek audio terpisah yang dikembalikan resolver. Untuk TikTok dan Instagram yang tidak menyediakan trek audio terpisah, sumbernya adalah berkas video itu sendiri; decodeAudioData mengekstraksi trek audio dari berkas video yang dimuat melalui proxy unduhan. Batas durasi 15 menit berlaku untuk semua platform.

## 3. Pilihan Bitrate

Panel unduhan menampilkan tiga pilihan bitrate (128, 192, 320 kbps) dengan 192 kbps sebagai bawaan. Nilai ini diteruskan ke lamejs sebagai kbps pada konfigurasi penyandian. Ukuran berkas hasil mengikuti bitrate yang dipilih.

## 4. Metadata ID3v2.3

Tag ID3 ditulis manual tanpa dependensi tambahan: header "ID3" versi 3, frame TIT2 (judul), TPE1 (penulis), dan APIC (sampul). Frame teks memakai pengodean UTF-8. Sampul diambil melalui proxy unduhan dengan batas 2 MB; bila gagal atau melebihi batas, frame APIC dilewati tanpa membatalkan konversi. Tag disisipkan di depan blob MP3 hasil sehingga pemutar membacanya tanpa koneksi ke server.

## 5. Pratinjau Inline

components/download-panel.tsx menampilkan gambar sampul dengan tombol putar di tengah. Saat tombol ditekan, elemen video menggantikan sampul dengan kontrol bawaan peramban sehingga pengguna dapat memutar konten langsung sebelum mengunduh.

## 6. Riwayat Unduhan

lib/download-history.ts menyimpan daftar entri pada localStorage dengan kunci "naze-sosdown:history" dan maksimum 50 entri terbaru. Setiap entri memuat tautan sumber, judul, platform, format, tanggal, dan nama berkas. Perekaman dilakukan setelah unduhan MP4 maupun MP3 berhasil; kegagalan localStorage ditangkap agar unduhan tidak pernah gagal karena penyimpanan. components/history-panel.tsx menampilkan daftar pada halaman /history dengan tombol hapus per entri dan tombol bersihkan dengan konfirmasi. Tautan menuju riwayat ditambahkan pada hero halaman utama dan baris atas panel unduhan.

## 7. Kompatibilitas

Kontrak /api/resolve tidak berubah. Respons API dan mode API key opsional tetap sama. Tidak ada dependensi baru pada package.json; lamejs tetap dimuat dari CDN saat opsi MP3 dipakai. Perilaku foto dan carousel tidak berubah.
