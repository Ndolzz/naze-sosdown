# naze-sosdown

Alat unduh video dan foto dari TikTok dan Instagram tanpa menggunakan API resmi kedua platform. Dibangun dengan metode Spec Driven Development (SDD): setiap fitur didefinisikan lebih dulu dalam bentuk spesifikasi sebelum masuk ke tahap implementasi.

## Metode Kerja

Dokumen di dalam folder specs menjadi sumber kebenaran (source of truth) untuk arah pengembangan. Setiap fitur memiliki tiga dokumen:

1. spec.md, menjelaskan kebutuhan dan kriteria sukses.
2. plan.md, menjelaskan arsitektur teknis untuk memenuhi spec.
3. tasks.md, memecah plan menjadi tugas tugas kecil yang bisa langsung dikerjakan.

## Fitur Aktif

001 Core Downloader (TikTok dan Instagram), lihat folder specs/001-core-downloader.

## Tech Stack

Next.js (App Router) dengan TypeScript, frontend dan backend berada dalam satu proyek yang sama.

## Gaya Desain

Modern SaaS, Minimalist, Dark Professional, dengan sentuhan Bento pada susunan kartu, dan tipografi bergaya terminal untuk elemen teknis. Seluruh ikon dibuat sebagai SVG kustom, tanpa emoji dan tanpa ikon simbol bawaan sistem.
