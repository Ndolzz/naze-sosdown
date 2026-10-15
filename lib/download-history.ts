/*
  Riwayat unduhan sisi klien.

  Riwayat tersimpan sepenuhnya di peramban melalui localStorage sehingga
  tidak memerlukan server, database, maupun akun. Daftar dibatasi 50 entri
  terbaru. Kegagalan penyimpanan (misalnya mode privat atau kuota penuh)
  bersifat tidak fatal: operasi dibatalkan secara diam-diam agar fitur
  unduhan inti tetap berjalan.
*/

const STORAGE_KEY = "naze-sosdown:history";
const MAX_ENTRIES = 50;

export type DownloadFormat = "mp4" | "mp3" | "media";

export interface DownloadHistoryEntry {
  id: string;
  platform: string;
  title: string;
  format: DownloadFormat;
  sourceUrl: string;
  createdAt: number;
}

export type NewHistoryEntry = Omit<DownloadHistoryEntry, "id" | "createdAt">;

function readRaw(): DownloadHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(entries: DownloadHistoryEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Penyimpanan tidak tersedia; riwayat dilewati tanpa menggangu unduhan.
  }
}

export function listDownloadHistory(): DownloadHistoryEntry[] {
  return readRaw();
}

export function recordDownloadHistory(entry: NewHistoryEntry): void {
  try {
    const full: DownloadHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    writeRaw([full, ...readRaw()].slice(0, MAX_ENTRIES));
  } catch {
    // ID acak tidak tersedia; entri riwayat dilewati.
  }
}

export function removeDownloadHistory(id: string): void {
  writeRaw(readRaw().filter((entry) => entry.id !== id));
}

export function clearDownloadHistory(): void {
  writeRaw([]);
}
