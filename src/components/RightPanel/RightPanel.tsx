import { useEffect, useState } from 'react';
import axios from 'axios';
import { usePdf } from '../../context/PdfContext';
import { analyzePdf } from '../../lib/analyzePdf';
import type { UploadedPdf } from '../../types/pdf';
import type {
  AnalyzedField,
  AnalyzedTable,
  AnalysisResponse,
} from '../../types/analysis';
import { AnalysisSkeleton } from './AnalysisSkeleton';
import { cellKey } from '../../lib/analysisKeys';
import styles from './RightPanel.module.css';

interface FetchState {
  pdf: UploadedPdf | null;
  error: string | null;
}

const INITIAL: FetchState = { pdf: null, error: null };

const inputTypeFor = (fieldType: string): string => {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    default:
      return 'text';
  }
};

function LocateButton({
  selected,
  onClick,
}: {
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.locateBtn} ${selected ? styles.locateBtnActive : ''}`}
      onClick={onClick}
      aria-label="Locate in PDF"
      title="Locate in PDF"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      </svg>
    </button>
  );
}

export function RightPanel() {
  const {
    pdf,
    analysis,
    setAnalysis,
    selectedFieldId,
    setSelectedFieldId,
    skipFetch,
  } = usePdf();
  const [errorState, setErrorState] = useState<FetchState>(INITIAL);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!pdf || skipFetch || analysis) return;
    const controller = new AbortController();

    analyzePdf(pdf.file, controller.signal)
      .then((data: AnalysisResponse) => {
        if (controller.signal.aborted) return;
        setAnalysis(data);
      })
      .catch((err) => {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        const message = axios.isAxiosError(err)
          ? err.response?.data
            ? JSON.stringify(err.response.data, null, 2)
            : err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error';
        setErrorState({ pdf, error: message });
      });

    return () => controller.abort();
  }, [pdf, skipFetch, analysis, setAnalysis]);

  useEffect(() => {
    if (!analysis) return;
    const v: Record<string, string> = {};
    const c: Record<string, boolean> = {};

    analysis.fields.forEach((f) => {
      v[f.id] = f.value ?? '';
      if (f.fieldType === 'checkbox') c[f.id] = !!f.checked;
    });

    (analysis.tables ?? []).forEach((t) => {
      t.rows.forEach((row) => {
        row.cells.forEach((cell) => {
          const k = cellKey(t.id, row.rowIndex, cell.cellIndex);
          v[k] = cell.text ?? '';
          if (cell.checked !== null) c[k] = !!cell.checked;
        });
      });
    });

    setValues(v);
    setChecks(c);
  }, [analysis]);

  const status: 'idle' | 'loading' | 'success' | 'error' = !pdf
    ? 'idle'
    : errorState.pdf === pdf && errorState.error
      ? 'error'
      : !analysis
        ? 'loading'
        : 'success';

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>{analysis?.documentType ?? 'Analysis'}</h3>
        {status === 'loading' && <span className={styles.badgeLoading}>Analyzing…</span>}
        {status === 'success' && analysis && (
          <span className={styles.badgeSuccess}>
            {analysis.fieldCount} fields
            {analysis.tableCount ? ` · ${analysis.tableCount} tables` : ''}
          </span>
        )}
        {status === 'error' && <span className={styles.badgeError}>Error</span>}
      </div>

      {status === 'idle' && <p className={styles.empty}>Upload a PDF to see analysis.</p>}
      {status === 'loading' && <AnalysisSkeleton />}
      {status === 'error' && errorState.error && (
        <pre className={styles.errorBlock}>{errorState.error}</pre>
      )}

      {status === 'success' && analysis && (
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          {analysis.fields.length > 0 && (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Fields</h4>
              {analysis.fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={values[field.id] ?? ''}
                  checked={checks[field.id] ?? false}
                  selected={selectedFieldId === field.id}
                  onLocate={() => setSelectedFieldId(field.id)}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                  onToggle={(b) => setChecks((prev) => ({ ...prev, [field.id]: b }))}
                />
              ))}
            </section>
          )}

          {(analysis.tables ?? []).map((table) => (
            <TableSection
              key={table.id}
              table={table}
              values={values}
              checks={checks}
              selectedKey={selectedFieldId}
              onSelect={setSelectedFieldId}
              onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
              onToggle={(k, b) => setChecks((prev) => ({ ...prev, [k]: b }))}
            />
          ))}
        </form>
      )}
    </aside>
  );
}

interface FieldRowProps {
  field: AnalyzedField;
  value: string;
  checked: boolean;
  selected: boolean;
  onLocate: () => void;
  onChange: (v: string) => void;
  onToggle: (b: boolean) => void;
}

function FieldRow({
  field,
  value,
  checked,
  selected,
  onLocate,
  onChange,
  onToggle,
}: FieldRowProps) {
  const isCheckbox = field.fieldType === 'checkbox';

  return (
    <div className={`${styles.row} ${selected ? styles.rowSelected : ''}`}>
      <div className={styles.rowMain}>
        {isCheckbox ? (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={checked}
              onFocus={onLocate}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span>{field.label}</span>
          </label>
        ) : (
          <>
            <label className={styles.label} htmlFor={field.id}>
              {field.label}
            </label>
            <input
              id={field.id}
              type={inputTypeFor(field.fieldType)}
              className={styles.input}
              value={value}
              placeholder={field.value ? '' : '—'}
              onFocus={onLocate}
              onChange={(e) => onChange(e.target.value)}
            />
          </>
        )}
      </div>
      <LocateButton selected={selected} onClick={onLocate} />
    </div>
  );
}

interface TableSectionProps {
  table: AnalyzedTable;
  values: Record<string, string>;
  checks: Record<string, boolean>;
  selectedKey: string | null;
  onSelect: (k: string) => void;
  onChange: (k: string, v: string) => void;
  onToggle: (k: string, b: boolean) => void;
}

function TableSection({
  table,
  values,
  checks,
  selectedKey,
  onSelect,
  onChange,
  onToggle,
}: TableSectionProps) {
  const colCount =
    table.headers.length > 0
      ? table.headers.length
      : table.rows[0]?.cells.length ?? 1;
  const gridTemplate = `repeat(${colCount}, minmax(0, 1fr))`;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h4 className={styles.sectionTitle}>{table.title || 'Table'}</h4>
        <LocateButton
          selected={selectedKey === table.id}
          onClick={() => onSelect(table.id)}
        />
      </div>

      <div className={styles.tableGrid}>
        {table.headers.length > 0 && (
          <div className={styles.tableHeaderRow} style={{ gridTemplateColumns: gridTemplate }}>
            {table.headers.map((h, i) => (
              <div key={i} className={styles.th}>
                {h}
              </div>
            ))}
          </div>
        )}

        {table.rows.map((row) => (
          <div
            key={row.rowIndex}
            className={styles.tableDataRow}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {row.cells.map((cell) => {
              const k = cellKey(table.id, row.rowIndex, cell.cellIndex);
              const selected = selectedKey === k;
              const isCheckbox = cell.checked !== null;
              return (
                <div
                  key={k}
                  className={`${styles.td} ${selected ? styles.tdSelected : ''}`}
                >
                  <div className={styles.tdContent}>
                    {isCheckbox ? (
                      <input
                        type="checkbox"
                        className={styles.tdCheckbox}
                        checked={checks[k] ?? false}
                        onFocus={() => onSelect(k)}
                        onChange={(e) => onToggle(k, e.target.checked)}
                      />
                    ) : cell.text ? (
                      <span className={styles.tdText}>{cell.text}</span>
                    ) : (
                      <input
                        type="text"
                        className={styles.input}
                        value={values[k] ?? ''}
                        placeholder="—"
                        onFocus={() => onSelect(k)}
                        onChange={(e) => onChange(k, e.target.value)}
                      />
                    )}
                  </div>
                  <LocateButton selected={selected} onClick={() => onSelect(k)} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
