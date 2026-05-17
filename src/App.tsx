import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { PdfProvider, usePdf } from './context/PdfContext';

function ClickOutsideClearer() {
  const { setSelectedFieldId } = usePdf();

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('input, button, label, textarea, select, a')) return;
      setSelectedFieldId(null);
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === 'function') active.blur();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setSelectedFieldId]);

  return null;
}

function App() {
  return (
    <PdfProvider>
      <ClickOutsideClearer />
      <Layout />
    </PdfProvider>
  );
}

export default App;
