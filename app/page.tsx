"use client";

import { useState } from "react";
import { LinkInput } from "@/components/link-input";
import { ResultCard } from "@/components/result-card";
import { IconAlert } from "@/components/icons/IconAlert";
import { detectPlatform } from "@/lib/resolvers/detect-platform";
import type { ResolvedMediaItem, Platform, ResolvedMedia, ResolverResult } from "@/lib/resolvers/types";
import styles from "./page.module.css";

interface DisplayResult {
  platform: Platform;
  author: string | null;
  item: ResolvedMediaItem;
  type: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<DisplayResult[]>([]);

  async function handleSubmit(url: string) {
    setErrorMessage(null);
    setLoading(true);

    const detected = detectPlatform(url);

    if (!detected) {
      setErrorMessage("Tautan tidak dikenali. Gunakan tautan TikTok atau Instagram yang valid.");
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
        const { data } = result;
        // Flatten items to display each as a card
        const newDisplayItems: DisplayResult[] = data.items.map((item) => ({
          platform: data.platform,
          author: data.author,
          item: item,
          type: data.type,
        }));
        
        setResults(newDisplayItems);
      }
    } catch (error) {
      setErrorMessage("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(result: DisplayResult) {
    const downloadUrl = `/api/download?url=${encodeURIComponent(result.item.url)}&platform=${result.platform}&type=${result.type}`;
    window.open(downloadUrl, "_blank");
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <span className={`${styles.eyebrow} mono`}>naze-sosdown</span>
        <h1 className={styles.title}>Satu tautan, satu berkas siap unduh.</h1>
        <p className={styles.subtitle}>
          Tempel tautan video atau foto publik dari TikTok maupun Instagram.
          Sistem akan mengambil berkas asli tanpa melalui API resmi kedua platform.
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
          <p className={`${styles.empty} mono`}>Belum ada hasil untuk ditampilkan.</p>
        ) : (
          <div className="bentoGrid">
            {results.map((result, index) => (
              <ResultCard
                key={index}
                platform={result.platform}
                author={result.author}
                item={result.item}
                onDownload={() => handleDownload(result)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
