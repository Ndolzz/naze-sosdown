import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconDownload } from "@/components/icons/IconDownload";
import styles from "./result-card.module.css";
import type { ResolvedMediaItem, Platform } from "@/lib/resolvers/types";

interface ResultCardProps {
  platform: Platform;
  author: string | null;
  item: ResolvedMediaItem;
  onDownload: (item: ResolvedMediaItem) => void;
}

export function ResultCard({ platform, author, item, onDownload }: ResultCardProps) {
  return (
    <Card>
      <div className={styles.header}>
        <span className={`${styles.platform} mono`}>{platform}</span>
        {item.hasWatermark ? (
          <span className={`${styles.badge} ${styles.badgeWarn} mono`}>berwatermark</span>
        ) : (
          <span className={`${styles.badge} ${styles.badgeOk} mono`}>bersih</span>
        )}
      </div>

      <p className={styles.author}>{author ?? "Akun tidak diketahui"}</p>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>resolusi</dt>
          <dd className="mono">{item.quality}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>format</dt>
          <dd className="mono">{item.mimeType}</dd>
        </div>
      </dl>

      <Button
        variant="secondary"
        icon={<IconDownload />}
        onClick={() => onDownload(item)}
        className={styles.downloadButton}
      >
        Unduh berkas
      </Button>
    </Card>
  );
}
