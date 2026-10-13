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
  items: ResolvedMediaItem[];
  onDownload: (item: ResolvedMediaItem) => void;
}

/*
  Membangun URL pratinjau lewat proxy unduhan dengan disposition inline
  karena CDN sumber menolak akses langsung dari peramban.
*/
function buildPreviewUrl(url: string, platform: Platform, type: MediaKind): string {
  const params = new URLSearchParams({
    url,
    platform,
    type,
    disposition: "inline",
  });
  return "/api/download?" + params.toString();
}

export function ResultCard({ platform, author, type, items, onDownload }: ResultCardProps) {
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
  const previewUrl = buildPreviewUrl(selectedItem.url, platform, type);
  const posterUrl = selectedItem.thumbnailUrl
    ? buildPreviewUrl(selectedItem.thumbnailUrl, platform, type)
    : null;
  const previewAlt = "Pratinjau dari " + (author ?? "media");

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
        {hasQualityChoice ? "Unduh " + selectedLabel.toUpperCase() : "Unduh berkas"}
      </Button>
    </Card>
  );
}
