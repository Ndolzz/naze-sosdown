import type { Metadata } from "next";
import { HistoryPanel } from "@/components/history-panel";

export const metadata: Metadata = {
  title: "Riwayat Unduhan | naze-sosdown",
  description: "Riwayat unduhan yang tersimpan di peramban.",
};

export default function HistoryPage() {
  return <HistoryPanel />;
}
