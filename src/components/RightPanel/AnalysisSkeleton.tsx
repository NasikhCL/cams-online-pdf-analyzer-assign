import styles from './AnalysisSkeleton.module.css';

const ROW_VARIANTS: Array<'short' | 'normal' | 'long'> = [
  'normal',
  'short',
  'long',
  'normal',
  'short',
  'long',
  'normal',
  'short',
];

export function AnalysisSkeleton() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.banner} role="status" aria-live="polite">
        <span className={styles.spark} aria-hidden="true">
          ✨
        </span>
        <div className={styles.bannerText}>
          <span className={styles.bannerTitle}>AI is working its magic…</span>
          <span className={styles.bannerSub}>
            Extracting form fields. Please wait and don't refresh.
          </span>
        </div>
      </div>

      <div className={styles.list}>
        {ROW_VARIANTS.map((variant, i) => (
          <div className={styles.row} key={i}>
            <div className={`${styles.line} ${styles.labelLine}`} />
            <div
              className={`${styles.line} ${styles.valueLine} ${
                variant === 'short'
                  ? styles.valueLineShort
                  : variant === 'long'
                    ? styles.valueLineLong
                    : ''
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
