import { useContext } from 'react';
import { PdfContext } from './PdfContext';
import type { PdfContextValue } from './PdfContext';

export const usePdf = (): PdfContextValue => {
  const ctx = useContext(PdfContext);
  if (!ctx) throw new Error('usePdf must be used within a PdfProvider');
  return ctx;
};
