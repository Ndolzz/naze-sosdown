"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconAlert } from "@/components/icons/IconAlert";
import { IconCheck } from "@/components/icons/IconCheck";
import { IconDownload } from "@/components/icons/IconDownload";
import { IconPlay } from "@/components/icons/IconPlay";
import { canConvertToMp3, convertAudioToMp3, Mp3ConversionError } from "@/lib/mp3";
import type { Mp3Progress } from "@/lib/mp3";
import { recordDownloadHistory } from "@/lib/download-history";
import type { QualityLabel, ResolvedMedia, ResolvedMediaItem, ResolverResult } from "@/lib/resolvers/types";
import styles from "./download-panel.module.css";

/*
  Panel unduhan pada halaman /download. Panel mengurai ulang tautan sumber
  lalu menawarkan pilihan format MP4 atau MP3 untuk seluruh video: YouTube
  menyediakan trek audio terpisah, sedangkan TikTok dan Instagram diekstrak
  dari berkas videonya. Unduhan MP4 diserahkan ke peramban melalui navigasi
  agar berkas besar dikelola tanpa membebani memori halaman; MP3 dikonversi
  di peramban melalui lib/mp3 dengan bitrate pilihan dan metadata ID3.
  Setiap unduhan tercatat pada riwayat lokal.
*/

type PanelPhase = "resolving" | "error" | "ready" | "downloading";
type DownloadFormat = "mp4" | "mp3";

const MP3_BITRATES = [128, 192, 320];
const DEFAULT_MP3_BITRATE = 192;
const MAX_COVER_BYTES = 2 * 1000 * 1000;

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes + ":" + String(rest).padStart(2, "0");
}

function fileBaseName(data: ResolvedMedia): string {
  const raw = data.caption ?? data.author ?? "naze-sosdown";
  const cleaned = raw.replace(/[^\w\-. ]+/g, "").trim().slice(0, 80);
  return cleaned.length > 0 ? cleaned : "naze-sosdown";
}

function buildProxyUrl(
  mediaUrl: string,
  data: ResolvedMedia,
  type: string,
  disposition: "inline" | "attachment",
  name: string | null
): string {
  const params = new URLSearchParams({
    url: mediaUrl,
    platform: data.platform,
    type,
    disposition,
  });
  if (data.sourceUrl) {
    params.set("source", data.sourceUrl);
  }
  if (name) {
    params.set("name", name);
  }
  return "/api/download?" + params.toString();
}

export function DownloadPanel() {
  const searchParams = useSearchParams();
  const sourceUrl = searchParams.get("url");

  const [data, setData] = useState<ResolvedMedia | null>(null);
  const [phase, setPhase] = useState<PanelPhase>("resolving");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [format, setFormat] = useState<DownloadFormat>("mp4");
  const [selectedLabel, setSelectedLabel] = useState<QualityLabel>("hd");
  const [bitrate, setBitrate] = useState<number>(DEFAULT_MP3_BITRATE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<Mp3Progress | null>(null);
  const resolveToken = useRef(0);

  const resolveMedia = useCallback(async () => {
    if (!sourceUrl) {
      setPhase("error");
      setErrorMessage(
        "Parameter url tidak ditemukan. Kembali ke halaman utama lalu buka unduhan dari kartu hasil."
      );
      return;
    }

    const token = resolveToken.current + 1;
    resolveToken.current = token;

    setPhase("resolving");
    setErrorMessage(null);
    setNotice(null);
    setIsPlaying(false);

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });

      const result: ResolverResult = await response.json();
      if (token !== resolveToken.current) return;

      if (!result.ok) {
        setPhase("error");
        setErrorMessage(result.error.message);
        return;
      }

      setData(result.data);
      setPhase("ready");
    } catch {
      if (token !== resolveToken.current) return;
      setPhase("error");
      setErrorMessage("Terjadi kesalahan koneksi ke server.");
    }
  }, [sourceUrl]);

  useEffect(() => {
    void resolveMedia();
  }, [resolveMedia]);

  const videoItems = data ? data.items : [];
  const hdItem = videoItems.find((item) => item.label === "hd") ?? null;
  const sdItem = videoItems.find((item) => item.label === "sd") ?? null;
  const hasQualityChoice = hdItem !== null && sdItem !== null;
  const selectedItem: ResolvedMediaItem | null = hasQualityChoice
    ? selectedLabel === "hd"
      ? hdItem
      : sdItem
    : videoItems[0] ?? null;

  const audioItem = data && data.audio ? data.audio : null;
  const isVideoItem = selectedItem
    ? selectedItem.mimeType.startsWith("video/")
    : false;
  const durationSeconds = data ? data.durationSeconds ?? null : null;

  // MP3 tersedia bila ada trek audio terpisah (YouTube) atau bila media
  // berupa video yang trek audionya dapat diekstrak (TikTok/Instagram).
  const hasMp3Path = audioItem !== null || isVideoItem;
  const mp3Allowed = hasMp3Path && canConvertToMp3(durationSeconds);

  useEffect(() => {
    if (!hasMp3Path) {
      setFormat("mp4");
    }
  }, [hasMp3Path]);

  function toggleClass(active: boolean): string {
    const base = styles.formatButton + " mono";
    return active ? base + " " + styles.formatButtonActive : base;
  }

  // Sampul untuk metadata ID3 diambil lewat proxy dan dibatasi ukurannya
  // agar berkas MP3 tidak membengkak.
  async function fetchCoverBytes(media: ResolvedMedia): Promise<Uint8Array | null> {
    if (!selectedItem || !selectedItem.thumbnailUrl) return null;

    try {
      const response = await fetch(
        buildProxyUrl(selectedItem.thumbnailUrl, media, media.type, "inline", null)
      );
      if (!response.ok) return null;

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_COVER_BYTES) return null;

      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  function startMediaDownload() {
    if (!data || !selectedItem) return;

    setNotice(null);
    const name = fileBaseName(data) + (isVideoItem ? "-" + selectedItem.quality : "");
    window.location.assign(buildProxyUrl(selectedItem.url, data, data.type, "attachment", name));

    recordDownloadHistory({
      platform: data.platform,
      title: data.caption ?? data.author ?? "media",
      format: isVideoItem ? "mp4" : "media",
      sourceUrl: data.sourceUrl ?? sourceUrl ?? "",
    });

    setNotice("Unduhan dimulai. Bila tidak berjalan, tekan tombol unduh sekali lagi.");
  }

  async function startMp3Download() {
    if (!data) return;

    const source = audioItem ?? (isVideoItem ? selectedItem : null);
    if (!source) return;

    setPhase("downloading");
    setErrorMessage(null);
    setNotice(null);
    setProgress({ stage: "fetch", percent: null });

    try {
      const proxyUrl = buildProxyUrl(source.url, data, "audio", "attachment", null);
      const cover = await fetchCoverBytes(data);

      const blob = await convertAudioToMp3(
        proxyUrl,
        data.durationSeconds ?? null,
        {
          bitrate,
          metadata: {
            title: data.caption ?? fileBaseName(data),
            artist: data.author,
            cover,
          },
        },
        setProgress
      );

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileBaseName(data) + ".mp3";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 10000);

      recordDownloadHistory({
        platform: data.platform,
        title: data.caption ?? data.author ?? "media",
        format: "mp3",
        sourceUrl: data.sourceUrl ?? sourceUrl ?? "",
      });

      setPhase("ready");
      setNotice("Berkas MP3 telah selesai diunduh.");
    } catch (error) {
      const message =
        error instanceof Mp3ConversionError ? error.message : "Konversi MP3 gagal. Coba lagi.";
      setPhase("ready");
      setErrorMessage(message);
    } finally {
      setProgress(null);
    }
  }

  const durationText = formatDuration(durationSeconds);
  const progressPercent = progress ? progress.percent : null;
  const progressLabel =
    progress && progress.stage === "fetch"
      ? "Mengunduh audio"
      : progress && progress.stage === "decode"
      ? "Memproses audio"
      : "Menyandikan MP3";
  const downloadLabel =
    format === "mp3" ? "Unduh MP3" : isVideoItem ? "Unduh MP4" : "Unduh berkas";

  return (
    <main className={styles.main}>
      <div className={styles.topRow}>
        <Link href="/" className={styles.backLink + " mono"}>
          Kembali ke beranda
        </Link>
        <Link href="/history" className={styles.backLink + " mono"}>
          Riwayat unduhan
        </Link>
      </div>

      {phase === "resolving" ? (
        <p className={styles.status + " mono"}>Memproses tautan…</p>
      ) : phase === "error" ? (
        <Card>
          <div className={styles.errorRow}>
            <IconAlert className={styles.errorIcon} />
            <span>{errorMessage}</span>
          </div>
          <div className={styles.errorActions}>
            <Button variant="secondary" onClick={() => void resolveMedia()}>
              Coba lagi
            </Button>
          </div>
        </Card>
      ) : data ? (
        <Card>
          <div className={styles.header}>
            <span className={styles.platform + " mono"}>{data.platform}</span>
            {durationText ? (
              <span className={styles.duration + " mono"}>{durationText}</span>
            ) : null}
          </div>

          {selectedItem && isVideoItem ? (
            <div className={styles.preview}>
              {isPlaying ? (
                <video
                  className={styles.previewVideo}
                  src={buildProxyUrl(selectedItem.url, data, data.type, "inline", null)}
                  poster={
                    selectedItem.thumbnailUrl
                      ? buildProxyUrl(selectedItem.thumbnailUrl, data, data.type, "inline", null)
                      : undefined
                  }
                  controls
                  autoPlay
                  playsInline
                />
              ) : selectedItem.thumbnailUrl ? (
                <button
                  type="button"
                  className={styles.playButton}
                  onClick={() => setIsPlaying(true)}
                  aria-label="Putar pratinjau media"
                >
                  <img
                    className={styles.previewImage}
                    src={buildProxyUrl(selectedItem.thumbnailUrl, data, data.type, "inline", null)}
                    alt="Pratinjau media"
                  />
                  <span className={styles.playIcon}>
                    <IconPlay />
                  </span>
                </button>
              ) : null}
            </div>
          ) : selectedItem && selectedItem.thumbnailUrl ? (
            <div className={styles.preview}>
              <img
                className={styles.previewImage}
                src={buildProxyUrl(selectedItem.thumbnailUrl, data, data.type, "inline", null)}
                alt="Pratinjau media"
              />
            </div>
          ) : null}

          <h1 className={styles.title}>{data.caption ?? data.author ?? "Media tanpa judul"}</h1>
          <p className={styles.author}>{data.author ?? "Akun tidak diketahui"}</p>

          {hasMp3Path ? (
            <div className={styles.formatToggle} role="group" aria-label="Pilihan format unduhan">
              <button
                type="button"
                className={toggleClass(format === "mp4")}
                onClick={() => setFormat("mp4")}
              >
                MP4 · Video
              </button>
              <button
                type="button"
                className={toggleClass(format === "mp3")}
                onClick={() => setFormat("mp3")}
                title={
                  canConvertToMp3(durationSeconds)
                    ? undefined
                    : "Durasi melebihi batas konversi MP3 (15 menit)"
                }
              >
                MP3 · Audio
              </button>
            </div>
          ) : null}

          {format === "mp3" ? (
            <div className={styles.qualityToggle} role="group" aria-label="Pilihan bitrate MP3">
              {MP3_BITRATES.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={toggleClass(bitrate === option)}
                  onClick={() => setBitrate(option)}
                >
                  {option} kbps
                </button>
              ))}
            </div>
          ) : null}

          {hasQualityChoice && format === "mp4" ? (
            <div className={styles.qualityToggle} role="group" aria-label="Pilihan kualitas unduhan">
              <button
                type="button"
                className={toggleClass(selectedLabel === "hd")}
                onClick={() => setSelectedLabel("hd")}
              >
                HD
              </button>
              <button
                type="button"
                className={toggleClass(selectedLabel === "sd")}
                onClick={() => setSelectedLabel("sd")}
              >
                SD
              </button>
            </div>
          ) : null}

          <dl className={styles.meta}>
            {format === "mp3" ? (
              <>
                <div className={styles.metaRow}>
                  <dt>sumber audio</dt>
                  <dd className="mono">{audioItem ? audioItem.quality : "trek dari video"}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>hasil</dt>
                  <dd className="mono">MP3 {bitrate} kbps</dd>
                </div>
              </>
            ) : selectedItem ? (
              <>
                <div className={styles.metaRow}>
                  <dt>resolusi</dt>
                  <dd className="mono">{selectedItem.quality}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>format</dt>
                  <dd className="mono">{selectedItem.mimeType}</dd>
                </div>
              </>
            ) : null}
            {durationText ? (
              <div className={styles.metaRow}>
                <dt>durasi</dt>
                <dd className="mono">{durationText}</dd>
              </div>
            ) : null}
          </dl>

          {phase === "downloading" ? (
            <div className={styles.progressBlock}>
              <div className={styles.progressTrack}>
                <div
                  className={
                    progressPercent === null
                      ? styles.progressFillIndeterminate
                      : styles.progressFill
                  }
                  style={{ width: progressPercent === null ? undefined : Math.round(progressPercent * 100) + "%" }}
                />
              </div>
              <p className={styles.progressText + " mono"}>
                {progressLabel}
                {progressPercent !== null ? " " + Math.round(progressPercent * 100) + "%" : "…"}
              </p>
            </div>
          ) : (
            <Button
              icon={<IconDownload />}
              className={styles.downloadButton}
              disabled={
                (format === "mp4" && !selectedItem) ||
                (format === "mp3" && !mp3Allowed)
              }
              title={
                format === "mp3" && !mp3Allowed
                  ? "Durasi melebihi batas konversi MP3 (15 menit)"
                  : undefined
              }
              onClick={() => (format === "mp3" ? void startMp3Download() : startMediaDownload())}
            >
              {downloadLabel}
            </Button>
          )}

          {format === "mp3" ? (
            <p className={styles.note}>
              Konversi MP3 berjalan langsung di peramban dan menyertakan judul, penulis, serta
              sampul pada berkas. Video di atas 15 menit tidak dapat dikonversi.
            </p>
          ) : null}

          {errorMessage ? (
            <div className={styles.errorRow}>
              <IconAlert className={styles.errorIcon} />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {notice ? (
            <div className={styles.successRow}>
              <IconCheck className={styles.successIcon} />
              <span>{notice}</span>
            </div>
          ) : null}
        </Card>
      ) : null}
    </main>
  );
}
