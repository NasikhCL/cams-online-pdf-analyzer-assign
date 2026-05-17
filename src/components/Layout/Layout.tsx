import { usePdf } from '../../context/PdfContext';
import { ContentArea } from '../ContentArea';
import { PdfUploader } from '../PdfUploader';
import styles from './Layout.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function Layout() {
  const { pdf, clearPdf } = usePdf();

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <span>CAMS Online</span>
        {pdf && (
          <span className={styles.fileMeta}>
            <span>{pdf.name}</span>
            <span>·</span>
            <span>{formatSize(pdf.size)}</span>
            <button type="button" className={styles.clearBtn} onClick={clearPdf}>
              Remove
            </button>
          </span>
        )}
      </header>
      <main className={styles.main}>
        {pdf ? (
          <ContentArea />
        ) : (
          <div className={styles.uploadOnly}>
            <PdfUploader />
          </div>
        )}
      </main>
    </div>
  );
}
