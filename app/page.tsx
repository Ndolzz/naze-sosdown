"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkInput } from "@/components/link-input";
import { ResultCard } from "@/components/result-card";
import { IconAlert } from "@/components/icons/IconAlert";
import { detectPlatform } from "@/lib/resolvers/detect-platform";
import type { ResolvedMediaItem, Platform, MediaKind, ResolvedMedia, ResolverResult } from "@/lib/resolvers/types";
import styles from "./page.module.css";

interface DisplayResult {
  platform: Platform;
  author: string | null;
  type: MediaKind;
  sourceUrl: string | null;
  items: ResolvedMediaItem[];
}

/*
  Mengelompokkan item hasil resolver menjadi kartu tampilan. Video dengan
  beberapa varian kualitas (HD/SD) berada dalam satu kartu yang sama sesuai
  status watermarknya, sedangkan foto carousel menjadi kartu terpisah
  per foto.
*/
function groupResults(data: ResolvedMedia): DisplayResult[] {
  if (data.type !== "video") {
    return data.items.map((item) => ({
      platform: data.platform,
      author: data.author,
      type: data.type,
      sourceUrl: data.sourceUrl ?? null,
      items: [item],
    }));
  }

  const groups: DisplayResult[] = [];
  const withoutWatermark = data.items.filter((item) => !item.hasWatermark);
  const withWatermark = data.items.filter((item) => item.hasWatermark);

  if (withoutWatermark.length > 0) {
    groups.push({
      platform: data.platform,
      author: data.author,
      type: "video",
      sourceUrl: data.sourceUrl ?? null,
      items: withoutWatermark,
    });
  }

  if (withWatermark.length > 0) {
    groups.push({
      platform: data.platform,
      author: data.author,
      type: "video",
      sourceUrl: data.sourceUrl ?? null,
      items: withWatermark,
    });
  }

  return groups;
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<DisplayResult[]>([]);

  async function handleSubmit(url: string) {
    setErrorMessage(null);
    setLoading(true);

    const detected = detectPlatform(url);

    if (!detected) {
      setErrorMessage("Tautan tidak dikenali. Gunakan tautan TikTok, Instagram, atau YouTube yang valid.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: detected.normalizedUrl }),
      });

      const result: ResolverResult = await response.json();

      if (!result.ok) {
        setErrorMessage(result.error.message);
      } else {
        setResults(groupResults(result.data));
      }
    } catch (error) {
      setErrorMessage("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(result: DisplayResult, item: ResolvedMediaItem) {
    // YouTube memiliki pilihan format MP4 atau MP3 yang hanya tersedia pada
    // halaman unduhan, sehingga kartu YouTube membuka halaman tersebut.
    if (result.platform === "youtube") {
      const target = result.sourceUrl ?? item.url;
      router.push("/download?url=" + encodeURIComponent(target));
      return;
    }

    const params = new URLSearchParams({
      url: item.url,
      platform: result.platform,
      type: result.type,
    });
    if (result.sourceUrl) {
      params.set("source", result.sourceUrl);
    }
    window.open("/api/download?" + params.toString(), "_blank");
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <span className={styles.eyebrow + " mono"}>naze-sosdown</span>
        <h1 className={styles.title}>Satu tautan, satu berkas siap unduh.</h1>
        <p className={styles.subtitle}>
          Tempel tautan video atau foto publik dari TikTok, Instagram, maupun YouTube.
          Sistem akan mengambil berkas asli tanpa melalui API resmi platform.
        </p>

        <div className={styles.inputWrap}>
          <LinkInput onSubmit={handleSubmit} loading={loading} />
        </div>

        {errorMessage ? (
          <div className={styles.errorRow}>
            <IconAlert className={styles.errorIcon} />
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </section>

      <section className={styles.results}>
        {results.length === 0 ? (
          <p className={styles.empty + " mono"}>Belum ada hasil untuk ditampilkan.</p>
        ) : (
          <div className="bentoGrid">
            {results.map((result, index) => (
              <ResultCard
                key={index}
                platform={result.platform}
                author={result.author}
                type={result.type}
                sourceUrl={result.sourceUrl}
                items={result.items}
                onDownload={(item) => handleDownload(result, item)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
