import { Suspense } from "react";
import type { Metadata } from "next";
import { DownloadPanel } from "@/components/download-panel";

export const metadata: Metadata = {
  title: "Halaman Unduhan | naze-sosdown",
  description: "Pilih format MP4 atau MP3 lalu unduh media.",
};

/*
  Panel dibungkus Suspense karena komponen klien di dalamnya memakai
  useSearchParams; batasan ini disyaratkan Next.js saat prerender.
*/
export default function DownloadPage() {
  return (
    <Suspense fallback={null}>
      <DownloadPanel />
    </Suspense>
  );
}
