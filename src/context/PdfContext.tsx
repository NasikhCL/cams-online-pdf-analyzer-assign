import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { UploadedPdf } from '../types/pdf';
import type { AnalysisResponse } from '../types/analysis';

interface PdfContextValue {
  pdf: UploadedPdf | null;
  setPdf: (file: File) => void;
  clearPdf: () => void;
  analysis: AnalysisResponse | null;
  setAnalysis: (a: AnalysisResponse | null) => void;
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  skipFetch: boolean;
  loadPdfWithAnalysis: (
    file: File,
    analysis: AnalysisResponse,
    delayMs?: number,
  ) => void;
}

const PdfContext = createContext<PdfContextValue | undefined>(undefined);

export function PdfProvider({ children }: { children: ReactNode }) {
  const [pdf, setPdfState] = useState<UploadedPdf | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [skipFetch, setSkipFetch] = useState(false);
  const pendingTimer = useRef<number | null>(null);

  const cancelPending = () => {
    if (pendingTimer.current !== null) {
      window.clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }
  };

  const setPdf = useCallback((file: File) => {
    cancelPending();
    setPdfState((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return {
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      };
    });
    setAnalysis(null);
    setSelectedFieldId(null);
    setSkipFetch(false);
  }, []);

  const clearPdf = useCallback(() => {
    cancelPending();
    setPdfState((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setAnalysis(null);
    setSelectedFieldId(null);
    setSkipFetch(false);
  }, []);

  const loadPdfWithAnalysis = useCallback(
    (file: File, prebaked: AnalysisResponse, delayMs = 0) => {
      cancelPending();
      setPdfState((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return {
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
        };
      });
      setAnalysis(null);
      setSelectedFieldId(null);
      setSkipFetch(true);
      pendingTimer.current = window.setTimeout(() => {
        setAnalysis(prebaked);
        setSkipFetch(false);
        pendingTimer.current = null;
      }, delayMs);
    },
    [],
  );

  const value = useMemo(
    () => ({
      pdf,
      setPdf,
      clearPdf,
      analysis,
      setAnalysis,
      selectedFieldId,
      setSelectedFieldId,
      skipFetch,
      loadPdfWithAnalysis,
    }),
    [pdf, setPdf, clearPdf, analysis, selectedFieldId, skipFetch, loadPdfWithAnalysis],
  );

  return <PdfContext.Provider value={value}>{children}</PdfContext.Provider>;
}

export const usePdf = (): PdfContextValue => {
  const ctx = useContext(PdfContext);
  if (!ctx) throw new Error('usePdf must be used within a PdfProvider');
  return ctx;
};

export default PdfProvider;
