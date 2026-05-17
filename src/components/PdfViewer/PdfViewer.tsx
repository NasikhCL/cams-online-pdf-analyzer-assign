import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { usePdf } from '../../context/PdfContext';
import { cellKey } from '../../lib/analysisKeys';
import type { AnalysisResponse, BoxPercent } from '../../types/analysis';
import styles from './PdfViewer.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.2;

type HighlightKind = 'label' | 'value' | 'cell' | 'table';

interface HighlightTarget {
  pageNumber: number;
  boxes: Array<{ box: BoxPercent; kind: HighlightKind }>;
}

function buildHighlightMap(
  analysis: AnalysisResponse | null,
): Map<string, HighlightTarget> {
  const map = new Map<string, HighlightTarget>();
  if (!analysis) return map;

  analysis.fields.forEach((f) => {
    const boxes: HighlightTarget['boxes'] = [];
    if (f.labelBoxPercent) boxes.push({ box: f.labelBoxPercent, kind: 'label' });
    if (f.valueBoxPercent) boxes.push({ box: f.valueBoxPercent, kind: 'value' });
    if (boxes.length) {
      map.set(f.id, { pageNumber: f.pageNumber ?? 1, boxes });
    }
  });

  (analysis.tables ?? []).forEach((t) => {
    if (t.boxPercent) {
      map.set(t.id, {
        pageNumber: t.pageNumber ?? 1,
        boxes: [{ box: t.boxPercent, kind: 'table' }],
      });
    }
    t.rows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (!cell.boxPercent) return;
        map.set(cellKey(t.id, row.rowIndex, cell.cellIndex), {
          pageNumber: t.pageNumber ?? 1,
          boxes: [{ box: cell.boxPercent, kind: 'cell' }],
        });
      });
    });
  });

  return map;
}

export function PdfViewer() {
  const { pdf, analysis, selectedFieldId } = usePdf();
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const highlightMap = useMemo(() => buildHighlightMap(analysis), [analysis]);
  const selectedHighlight = selectedFieldId ? highlightMap.get(selectedFieldId) ?? null : null;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setContainerWidth(node.clientWidth - 32);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [pdf]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let initialDistance = 0;
    let initialScale = 1;
    let pinchRatio = 1;
    let pinching = false;
    let wheelBaseScale = 1;
    let wheelRatio = 1;
    let wheelTimer: number | null = null;

    const distance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

    const applyTransform = (ratio: number) => {
      const doc = documentRef.current;
      if (!doc) return;
      doc.style.transform = `scale(${ratio})`;
      doc.style.transformOrigin = 'top center';
      doc.style.willChange = 'transform';
    };

    const clearTransform = () => {
      const doc = documentRef.current;
      if (!doc) return;
      doc.style.transform = '';
      doc.style.transformOrigin = '';
      doc.style.willChange = '';
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();

      if (wheelTimer === null) {
        setScale((s) => {
          wheelBaseScale = s;
          return s;
        });
        wheelRatio = 1;
      } else {
        window.clearTimeout(wheelTimer);
      }

      const delta = -event.deltaY * 0.01;
      const targetFinal = clamp(wheelBaseScale * wheelRatio + delta);
      wheelRatio = targetFinal / wheelBaseScale;
      applyTransform(wheelRatio);

      wheelTimer = window.setTimeout(() => {
        const committed = clamp(+(wheelBaseScale * wheelRatio).toFixed(2));
        clearTransform();
        setScale(committed);
        wheelTimer = null;
      }, 160);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      initialDistance = distance(event.touches);
      pinchRatio = 1;
      pinching = true;
      setScale((s) => {
        initialScale = s;
        return s;
      });
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pinching || event.touches.length !== 2 || initialDistance === 0) return;
      event.preventDefault();
      const raw = distance(event.touches) / initialDistance;
      const clampedFinal = clamp(initialScale * raw);
      pinchRatio = clampedFinal / initialScale;
      applyTransform(pinchRatio);
    };

    const onTouchEnd = () => {
      if (!pinching) return;
      pinching = false;
      initialDistance = 0;
      const committed = clamp(+(initialScale * pinchRatio).toFixed(2));
      clearTransform();
      setScale(committed);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('touchstart', onTouchStart, { passive: false });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [pdf]);

  useEffect(() => {
    if (!selectedHighlight) return;
    const container = containerRef.current;
    const pageEl = pageRefs.current[selectedHighlight.pageNumber];
    if (!container || !pageEl) return;

    const box = selectedHighlight.boxes[0]?.box;
    if (!box) return;

    const pageHeight = pageEl.offsetHeight;
    const pageTopInContainer = pageEl.offsetTop;
    const boxTop = pageTopInContainer + (box.top / 100) * pageHeight;
    const boxCenter = boxTop + ((box.height / 100) * pageHeight) / 2;
    const targetScrollTop = boxCenter - container.clientHeight / 2;

    const maxScroll = container.scrollHeight - container.clientHeight;
    const clamped = Math.max(0, Math.min(maxScroll, targetScrollTop));

    container.scrollTo({ top: clamped, behavior: 'smooth' });
  }, [selectedHighlight]);

  const onLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoadError(null);
  }, []);

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const resetZoom = () => setScale(1);

  if (!pdf) {
    return <div className={styles.placeholder}>No PDF loaded</div>;
  }

  const baseWidth = containerWidth > 0 ? containerWidth : 420;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <span className={styles.pageInfo}>{numPages ? `${numPages} pages` : '—'}</span>
        <div className={styles.zoomGroup}>
          <button type="button" onClick={zoomOut} disabled={scale <= MIN_SCALE} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={resetZoom} className={styles.zoomLabel} aria-label="Reset zoom">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={zoomIn} disabled={scale >= MAX_SCALE} aria-label="Zoom in">
            +
          </button>
        </div>
      </div>
      <div className={styles.documentArea} ref={containerRef}>
        {loadError ? (
          <div className={styles.error}>{loadError}</div>
        ) : (
          <div ref={documentRef} className={styles.documentTransform}>
          <Document
            file={pdf.url}
            onLoadSuccess={onLoadSuccess}
            onLoadError={(err) => setLoadError(err.message)}
            loading={<div className={styles.placeholder}>Loading PDF…</div>}
            className={styles.document}
          >
            {Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1;
              const onThisPage =
                selectedHighlight && selectedHighlight.pageNumber === pageNumber;
              return (
                <div
                  key={`page_${pageNumber}`}
                  className={styles.pageWrapper}
                  ref={(el) => {
                    pageRefs.current[pageNumber] = el;
                  }}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={baseWidth}
                    scale={scale}
                    className={styles.page}
                    renderAnnotationLayer
                    renderTextLayer
                  />
                  {onThisPage &&
                    selectedHighlight!.boxes.map((b, idx) => (
                      <div
                        key={idx}
                        className={`${styles.highlight} ${styles[`highlight_${b.kind}`]}`}
                        style={boxStyle(b.box)}
                      />
                    ))}
                </div>
              );
            })}
          </Document>
          </div>
        )}
      </div>
    </div>
  );
}

function boxStyle(box: BoxPercent): React.CSSProperties {
  return {
    top: `${box.top}%`,
    left: `${box.left}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  };
}
