"use client";

import { useState } from "react";
import { LinkInput } from "@/components/link-input";
import { ResultCard } from "@/components/result-card";
import { IconAlert } from "@/components/icons/IconAlert";
import { detectPlatform } from "@/lib/resolvers/detect-platform";
import type { ResolvedMediaItem, Platform } from "@/lib/resolvers/types";
import styles from "./page.module.css";

interface DemoResult {
  platform: Platform;
  author: string | null;
  item: ResolvedMediaItem;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<DemoResult[]>([]);

  async function handleSubmit(url: string) {
    setErrorMessage(null);
    setLoading(true);

    const detected = detectPlatform(url);

    if (!detected) {
      setErrorMessage("Tautan tidak dikenali. Gunakan tautan TikTok atau Instagram yang valid.");
      setLoading(false);
      return;
    }

    // Titik integrasi untuk Kelompok 3 sampai 5: pemanggilan /api/resolve
    // dengan detected.platform dan detected.normalizedUrl akan menggantikan
    // simulasi di bawah ini pada tahap berikutnya.
    await new Promise((resolve) => setTimeout(resolve, 400));

    setLoading(false);
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
                onDownload={() => {}}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
