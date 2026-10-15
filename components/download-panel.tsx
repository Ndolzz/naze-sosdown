"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconAlert } from "@/components/icons/IconAlert";
import { IconCheck } from "@/components/icons/IconCheck";
import { IconDownload } from "@/components/icons/IconDownload";
import { canConvertToMp3, convertAudioToMp3, Mp3ConversionError } from "@/lib/mp3";
import type { Mp3Progress } from "@/lib/mp3";
import type { QualityLabel, ResolvedMedia, ResolvedMediaItem, ResolverResult } from "@/lib/resolvers/types";
import styles from "./download-panel.module.css";

/*
  Panel unduhan pada halaman /download. Panel mengurai ulang tautan sumber
  lalu menawarkan pilihan format MP4 atau MP3. Unduhan MP4 diserahkan ke
  peramban melalui navigasi agar berkas besar dikelola tanpa membebani
  memori halaman, sedangkan MP3 dikonversi di peramban melalui lib/mp3.
*/

type PanelPhase = "resolving" | "error" | "ready" | "downloading";
type DownloadFormat = "mp4" | "mp3";

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
  const hasAudio = audioItem !== null && audioItem.url.length > 0;
  const mp3Allowed = hasAudio && canConvertToMp3(data ? data.durationSeconds ?? null : null);

  useEffect(() => {
    if (!hasAudio) {
      setFormat("mp4");
    }
  }, [hasAudio]);

  function toggleClass(active: boolean): string {
    const base = styles.formatButton + " mono";
    return active ? base + " " + styles.formatButtonActive : base;
  }

  function startMp4Download() {
    if (!data || !selectedItem) return;

    setNotice(null);
    const name = fileBaseName(data) + "-" + selectedItem.quality;
    window.location.assign(buildProxyUrl(selectedItem.url, data, "video", "attachment", name));
    setNotice("Unduhan dimulai. Bila tidak berjalan, tekan tombol unduh sekali lagi.");
  }

  async function startMp3Download() {
    if (!data || !audioItem) return;

    setPhase("downloading");
    setErrorMessage(null);
    setNotice(null);
    setProgress({ stage: "fetch", percent: null });

    try {
      const proxyUrl = buildProxyUrl(audioItem.url, data, "audio", "attachment", null);
      const blob = await convertAudioToMp3(proxyUrl, data.durationSeconds ?? null, setProgress);

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileBaseName(data) + ".mp3";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 10000);

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

  const durationText = data ? formatDuration(data.durationSeconds ?? null) : null;
  const progressPercent = progress ? progress.percent : null;
  const progressLabel =
    progress && progress.stage === "fetch"
      ? "Mengunduh audio"
      : progress && progress.stage === "decode"
      ? "Memproses audio"
      : "Menyandikan MP3";

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink + " mono"}>
        Kembali ke beranda
      </Link>

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

          {selectedItem && selectedItem.thumbnailUrl ? (
            <div className={styles.preview}>
              <img
                className={styles.previewImage}
                src={buildProxyUrl(selectedItem.thumbnailUrl, data, "video", "inline", null)}
                alt="Pratinjau media"
              />
            </div>
          ) : null}

          <h1 className={styles.title}>{data.caption ?? data.author ?? "Media tanpa judul"}</h1>
          <p className={styles.author}>{data.author ?? "Akun tidak diketahui"}</p>

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
              disabled={!hasAudio}
              title={hasAudio ? undefined : "Trek audio tidak tersedia untuk konten ini"}
            >
              MP3 · Audio
            </button>
          </div>

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
            {format === "mp4" && selectedItem ? (
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
            ) : audioItem ? (
              <>
                <div className={styles.metaRow}>
                  <dt>bitrate sumber</dt>
                  <dd className="mono">{audioItem.quality}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>hasil</dt>
                  <dd className="mono">MP3 192 kbps</dd>
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
              disabled={(format === "mp4" && !selectedItem) || (format === "mp3" && !mp3Allowed)}
              title={
                format === "mp3" && !mp3Allowed
                  ? "Durasi melebihi batas konversi MP3 (15 menit)"
                  : undefined
              }
              onClick={() => (format === "mp3" ? void startMp3Download() : startMp4Download())}
            >
              {format === "mp3" ? "Unduh MP3" : "Unduh MP4"}
            </Button>
          )}

          {format === "mp3" ? (
            <p className={styles.note}>
              Konversi MP3 192 kbps berjalan langsung di peramban. Video di atas 15 menit tidak
              dapat dikonversi.
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
