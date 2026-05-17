import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, MouseEvent } from 'react';
import { usePdf } from '../../context/PdfContext';
import sampleFormUrl from '../../assets/sample-form.pdf?url';
import { dummyResponse } from '../../dummyresponse';
import type { AnalysisResponse } from '../../types/analysis';
import styles from './PdfUploader.module.css';

const ACCEPTED_TYPE = 'application/pdf';
const SAMPLE_FILE_NAME = 'sample-form.pdf';

export function PdfUploader() {
  const { setPdf, loadPdfWithAnalysis } = usePdf();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== ACCEPTED_TYPE) {
      setError('Only PDF files are supported.');
      return;
    }
    setError(null);
    setPdf(file);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const openPicker = () => inputRef.current?.click();

  const loadSample = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      setError(null);
      const res = await fetch(sampleFormUrl);
      if (!res.ok) throw new Error(`Failed to load sample (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], SAMPLE_FILE_NAME, { type: ACCEPTED_TYPE });
      loadPdfWithAnalysis(file, dummyResponse as AnalysisResponse, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sample PDF');
    }
  };

  return (
    <div className={styles.uploader}>
      <div
        className={`${styles.dropzone} ${isDragging ? styles.active : ''}`}
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
      >
        <p className={styles.title}>Upload a PDF</p>
        <p className={styles.hint}>Drag &amp; drop a file here, or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className={styles.input}
          onChange={onChange}
        />
        <div className={styles.divider}>
          <span>or</span>
        </div>
        <button type="button" className={styles.sampleButton} onClick={loadSample}>
          Try with sample form
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
