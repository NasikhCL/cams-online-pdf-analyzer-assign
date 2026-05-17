import { Layout } from './components/Layout';
import { PdfProvider } from './context/PdfContext';

function App() {
  return (
    <PdfProvider>
      <Layout />
    </PdfProvider>
  );
}

export default App;
