import { useCallback, useEffect, useRef, useState } from 'react';
import { PdfViewer } from '../PdfViewer';
import { RightPanel } from '../RightPanel';
import styles from './ContentArea.module.css';

const MIN_PERCENT = 20;
const MAX_PERCENT = 80;
const DEFAULT_PERCENT = 60;

export function ContentArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState<number>(DEFAULT_PERCENT);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (event: MouseEvent) => {
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent)));
    };

    const stop = () => setIsDragging(false);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [isDragging]);

  return (
    <div className={styles.content} ref={containerRef}>
      <section
        className={styles.left}
        style={{ flexBasis: `${leftPercent}%` }}
        aria-label="PDF viewer"
      >
        <PdfViewer />
      </section>
      <div
        className={`${styles.divider} ${isDragging ? styles.dividerActive : ''}`}
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftPercent)}
        aria-valuemin={MIN_PERCENT}
        aria-valuemax={MAX_PERCENT}
      />
      <section
        className={styles.right}
        style={{ flexBasis: `${100 - leftPercent}%` }}
        aria-label="Details panel"
      >
        <RightPanel />
      </section>
    </div>
  );
}
