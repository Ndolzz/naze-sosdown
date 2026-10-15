"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  clearDownloadHistory,
  listDownloadHistory,
  removeDownloadHistory,
} from "@/lib/download-history";
import type { DownloadHistoryEntry } from "@/lib/download-history";
import styles from "./history-panel.module.css";

/*
  Panel riwayat unduhan pada halaman /history. Data dibaca dari localStorage
  setelah komponen dipasang agar tidak terjadi ketidaksesuaian antara render
  server dan klien.
*/

const FORMAT_LABELS: Record<string, string> = {
  mp4: "MP4",
  mp3: "MP3",
  media: "berkas",
};

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPanel() {
  const [entries, setEntries] = useState<DownloadHistoryEntry[] | null>(null);

  useEffect(() => {
    setEntries(listDownloadHistory());
  }, []);

  function handleRemove(id: string) {
    removeDownloadHistory(id);
    setEntries(listDownloadHistory());
  }

  function handleClear() {
    if (window.confirm("Hapus seluruh riwayat unduhan?")) {
      clearDownloadHistory();
      setEntries([]);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.topRow}>
        <Link href="/" className={styles.backLink + " mono"}>
          Kembali ke beranda
        </Link>
      </div>

      <Card>
        <div className={styles.header}>
          <h1 className={styles.title}>Riwayat unduhan</h1>
          {entries !== null && entries.length > 0 ? (
            <Button variant="ghost" onClick={handleClear}>
              Bersihkan
            </Button>
          ) : null}
        </div>

        {entries === null ? (
          <p className={styles.empty + " mono"}>Memuat riwayat…</p>
        ) : entries.length === 0 ? (
          <p className={styles.empty + " mono"}>Belum ada unduhan yang tercatat.</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry) => (
              <li key={entry.id} className={styles.entry}>
                <div className={styles.entryInfo}>
                  <span className={styles.entryTitle}>{entry.title}</span>
                  <span className={styles.entryMeta + " mono"}>
                    {entry.platform} · {FORMAT_LABELS[entry.format] ?? entry.format} ·{" "}
                    {formatTimestamp(entry.createdAt)}
                  </span>
                </div>
                <div className={styles.entryActions}>
                  <Link
                    className={styles.entryLink}
                    href={"/download?url=" + encodeURIComponent(entry.sourceUrl)}
                  >
                    Buka unduhan
                  </Link>
                  <button
                    type="button"
                    className={styles.entryRemove}
                    onClick={() => handleRemove(entry.id)}
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
