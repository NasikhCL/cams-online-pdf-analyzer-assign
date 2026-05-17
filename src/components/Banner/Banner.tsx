import { useState } from 'react';
import styles from './Banner.module.css';

const MESSAGE =
  '⚠️ Heads up: field highlighting / bounding-box accuracy may be off — this demo uses a free AI model for extraction.';

export function Banner() {
  const [closed, setClosed] = useState(false);

  return (
    <div
      className={`${styles.banner} ${closed ? styles.bannerClosed : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={closed}
    >
      <div className={styles.track}>
        <span>{MESSAGE}</span>
        <span>{MESSAGE}</span>
      </div>
      <div className={styles.fade} aria-hidden="true" />
      <button
        type="button"
        className={styles.close}
        onClick={() => setClosed(true)}
        aria-label="Dismiss notice"
      >
        ×
      </button>
    </div>
  );
}
