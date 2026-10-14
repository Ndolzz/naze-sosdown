"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconDownload } from "@/components/icons/IconDownload";
import { IconMusic } from "@/components/icons/IconMusic";
import { IconPlay } from "@/components/icons/IconPlay";
import styles from "./result-card.module.css";
import type { ResolvedMediaItem, Platform, MediaKind } from "@/lib/resolvers/types";

interface ResultCardProps {
  platform: Platform;
  author: string | null;
  type: MediaKind;
  sourceUrl: string | null;
  items: ResolvedMediaItem[];
  audioItem?: ResolvedMediaItem | null;
  onDownload: (item: ResolvedMediaItem) => void;
}

type DownloadFormat = "mp4" | "mp3";

/*
  Membangun URL pratinjau lewat proxy unduhan dengan disposition inline
  karena CDN sumber menolak akses langsung dari peramban. Parameter source
  memungkinkan proxy memperbarui sesi bila CDN menolak 403.
*/
function buildPreviewUrl(
  url: string,
  platform: Platform,
  type: string,
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

/*
  Label tombol pilihan resolusi: label kualitas varian (hd/sd) bila ada,
  jika tidak memakai teks resolusi dari sumber, misalnya 720p pada YouTube.
*/
function optionLabel(item: ResolvedMediaItem): string {
  if (item.label) return item.label.toUpperCase();
  return item.quality.toUpperCase();
}

export function ResultCard({
  platform,
  author,
  type,
  sourceUrl,
  items,
  audioItem = null,
  onDownload,
}: ResultCardProps) {
  const primary = items[0];
  const hasAudioOption = audioItem !== null;
  const hasFormatChoice = type === "video" && hasAudioOption;
  const hasQualityChoice = type === "video" && items.length > 1;

  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>("mp4");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedVideo = items[Math.min(selectedIndex, items.length - 1)] ?? primary;
  const isAudioMode = hasFormatChoice && selectedFormat === "mp3";
  const selectedItem = isAudioMode && audioItem ? audioItem : selectedVideo;

  if (!selectedItem) return null;

  const isAudio = selectedItem.mimeType.startsWith("audio/");
  const isVideo = selectedItem.mimeType.startsWith("video/");
  const previewKind = isAudio ? "audio" : type;
  const previewUrl = buildPreviewUrl(selectedItem.url, platform, previewKind, sourceUrl);
  const posterUrl = selectedItem.thumbnailUrl
    ? buildPreviewUrl(selectedItem.thumbnailUrl, platform, previewKind, sourceUrl)
    : null;
  const previewAlt = "Pratinjau dari " + (author ?? "media");

  function optionClass(index: number): string {
    const base = styles.qualityButton + " mono";
    return index === selectedIndex ? base + " " + styles.qualityButtonActive : base;
  }

  function formatClass(format: DownloadFormat): string {
    const base = styles.qualityButton + " mono";
    return format === selectedFormat ? base + " " + styles.qualityButtonActive : base;
  }

  function switchFormat(format: DownloadFormat) {
    setSelectedFormat(format);
    setIsPlaying(false);
  }

  const downloadLabel = isAudio
    ? "Unduh MP3"
    : selectedVideo.label
    ? "Unduh " + selectedVideo.label.toUpperCase()
    : hasQualityChoice
    ? "Unduh " + optionLabel(selectedVideo)
    : "Unduh berkas";

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
        {isAudio ? (
          posterUrl ? (
            <img className={styles.previewImage} src={posterUrl} alt={previewAlt} />
          ) : null
        ) : isVideo ? (
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

      {isAudioMode && audioItem ? (
        <audio
          className={styles.audioPlayer}
          controls
          src={buildPreviewUrl(audioItem.url, platform, "audio", sourceUrl)}
        />
      ) : null}

      {hasFormatChoice ? (
        <div className={styles.qualityToggle} role="group" aria-label="Pilihan format unduhan">
          <button type="button" className={formatClass("mp4")} onClick={() => switchFormat("mp4")}>
            MP4
          </button>
          <button type="button" className={formatClass("mp3")} onClick={() => switchFormat("mp3")}>
            MP3
          </button>
        </div>
      ) : null}

      {!isAudioMode && hasQualityChoice ? (
        <div className={styles.qualityToggle} role="group" aria-label="Pilihan resolusi unduhan">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              className={optionClass(index)}
              onClick={() => setSelectedIndex(index)}
            >
              {optionLabel(item)}
            </button>
          ))}
        </div>
      ) : null}

      <p className={styles.author}>{author ?? "Akun tidak diketahui"}</p>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>{isAudio ? "bitrate" : "resolusi"}</dt>
          <dd className="mono">{selectedItem.quality}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>format</dt>
          <dd className="mono">{selectedItem.mimeType}</dd>
        </div>
      </dl>

      {hasAudioOption && !hasFormatChoice && audioItem ? (
        <div className={styles.downloadActions}>
          <Button
            variant="secondary"
            icon={<IconDownload />}
            onClick={() => onDownload(selectedItem)}
            className={styles.downloadButton}
          >
            {downloadLabel}
          </Button>
          <Button
            variant="ghost"
            icon={<IconMusic />}
            onClick={() => onDownload(audioItem)}
            className={styles.downloadButton}
          >
            Unduh MP3
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          icon={<IconDownload />}
          onClick={() => onDownload(selectedItem)}
          className={styles.downloadButton}
        >
          {downloadLabel}
        </Button>
      )}
    </Card>
  );
}
