import axios from 'axios';
import type { AnalysisResponse } from '../types/analysis';

const ANALYZE_ENDPOINT =
  'https://camsonline-assignment-ai-helper.nasikcl.workers.dev/analyze';

export async function analyzePdf(
  file: File,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<AnalysisResponse>(ANALYZE_ENDPOINT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
  });

  return response.data;
}
