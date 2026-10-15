"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconDownload } from "@/components/icons/IconDownload";
import { IconPlay } from "@/components/icons/IconPlay";
import styles from "./result-card.module.css";
import type { ResolvedMediaItem, Platform, MediaKind, QualityLabel } from "@/lib/resolvers/types";

interface ResultCardProps {
  platform: Platform;
  author: string | null;
  type: MediaKind;
  sourceUrl: string | null;
  items: ResolvedMediaItem[];
  onDownload: (item: ResolvedMediaItem) => void;
}

/*
  Membangun URL pratinjau lewat proxy unduhan dengan disposition inline
  karena CDN sumber menolak akses langsung dari peramban. Parameter source
  memungkinkan proxy memperbarui sesi bila CDN menolak 403.
*/
function buildPreviewUrl(
  url: string,
  platform: Platform,
  type: MediaKind,
  sourceUrl: string | null
): string {
  const params = new URLSearchParams({
    url,
    platform,
    type,
    disposition: "inline",
  });
  if (sourceUrl) {
    params.set("source", sourceUrl);
  }
  return "/api/download?" + params.toString();
}

export function ResultCard({ platform, author, type, sourceUrl, items, onDownload }: ResultCardProps) {
  const primary = items[0];
  const hdItem = items.find((item) => item.label === "hd") ?? null;
  const sdItem = items.find((item) => item.label === "sd") ?? null;
  const hasQualityChoice = hdItem !== null && sdItem !== null;

  const [selectedLabel, setSelectedLabel] = useState<QualityLabel>("hd");
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedItem = hasQualityChoice
    ? selectedLabel === "hd"
      ? hdItem
      : sdItem
    : primary;

  if (!selectedItem) return null;

  const isVideo = selectedItem.mimeType.startsWith("video/");
  const previewUrl = buildPreviewUrl(selectedItem.url, platform, type, sourceUrl);
  const posterUrl = selectedItem.thumbnailUrl
    ? buildPreviewUrl(selectedItem.thumbnailUrl, platform, type, sourceUrl)
    : null;
  const previewAlt = "Pratinjau dari " + (author ?? "media");

  // YouTube memiliki pilihan format MP4 atau MP3 pada halaman unduhan,
  // sehingga tombol kartu YouTube membuka halaman tersebut.
  const downloadLabel =
    platform === "youtube"
      ? "Buka halaman unduh"
      : hasQualityChoice
      ? "Unduh " + selectedLabel.toUpperCase()
      : "Unduh berkas";

  function qualityClass(label: QualityLabel): string {
    const base = styles.qualityButton + " mono";
    return label === selectedLabel
      ? base + " " + styles.qualityButtonActive
      : base;
  }

  return (
    <Card>
      <div className={styles.header}>
        <span className={styles.platform + " mono"}>{platform}</span>
        {primary.hasWatermark ? (
          <span className={styles.badge + " " + styles.badgeWarn + " mono"}>berwatermark</span>
        ) : (
          <span className={styles.badge + " " + styles.badgeOk + " mono"}>bersih</span>
        )}
      </div>

      <div className={styles.preview}>
        {isVideo ? (
          isPlaying ? (
            <video
              className={styles.previewVideo}
              src={previewUrl}
              poster={posterUrl ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : posterUrl ? (
            <button
              type="button"
              className={styles.playButton}
              onClick={() => setIsPlaying(true)}
              aria-label="Putar pratinjau video"
            >
              <img className={styles.previewImage} src={posterUrl} alt={previewAlt} />
              <span className={styles.playIcon}>
                <IconPlay />
              </span>
            </button>
          ) : null
        ) : (
          <img className={styles.previewImage} src={previewUrl} alt={previewAlt} />
        )}
      </div>

      {hasQualityChoice ? (
        <div className={styles.qualityToggle} role="group" aria-label="Pilihan kualitas unduhan">
          <button type="button" className={qualityClass("hd")} onClick={() => setSelectedLabel("hd")}>
            HD
          </button>
          <button type="button" className={qualityClass("sd")} onClick={() => setSelectedLabel("sd")}>
            SD
          </button>
        </div>
      ) : null}

      <p className={styles.author}>{author ?? "Akun tidak diketahui"}</p>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>resolusi</dt>
          <dd className="mono">{selectedItem.quality}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>format</dt>
          <dd className="mono">{selectedItem.mimeType}</dd>
        </div>
      </dl>

      <Button
        variant="secondary"
        icon={<IconDownload />}
        onClick={() => onDownload(selectedItem)}
        className={styles.downloadButton}
      >
        {downloadLabel}
      </Button>
    </Card>
  );
}
