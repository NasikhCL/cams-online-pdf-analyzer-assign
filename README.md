# CAMS Online — PDF Form Assistant

A React + TypeScript + Vite app that lets a user upload a scanned/filled PDF form, view it side-by-side with extracted fields, and review/edit the extracted values.

---

## Setup

Prerequisites: Node 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
# → open the URL printed in the terminal (typically http://localhost:5173)

# 3. Production build
npm run build
npm run preview

# 4. Lint
npm run lint
```

No environment variables are required. The analysis endpoint is hard-coded to a public Cloudflare Worker in [src/lib/analyzePdf.ts](src/lib/analyzePdf.ts); change `ANALYZE_ENDPOINT` there if you need to point at a different backend.

---

## Approach

The app is structured around three panels rendered by [Layout](src/components/Layout):

1. **PdfUploader** — drag-and-drop / file-picker entry point. Accepts a PDF, creates an object URL, and hands the file to the central context.
2. **PdfViewer** — renders the PDF using `react-pdf` (which wraps PDF.js). Clicking a field in the right panel scrolls to the matching page and highlights it.
3. **RightPanel / ContentArea** — shows the structured fields returned by the analysis backend, lets the user select a field (which syncs with the viewer), and edit values inline.

When a file is uploaded, the app `POST`s it as `multipart/form-data` to the analysis worker and receives an `AnalysisResponse` containing the extracted fields (label, value, page, bounding box, confidence, etc.). The response is stored in context and drives both panels.

A small `dummyresponse.ts` is included so the UI can be exercised without hitting the network — `loadPdfWithAnalysis` injects a prebaked response after an optional delay, useful for demos and tests.

---

## State Management Strategy

All cross-component state lives in a single React Context — [PdfContext](src/context/PdfContext.tsx) — rather than Redux/Zustand. The app has exactly one "document in focus" at a time, so a single provider is the right size:

| State | Purpose |
| --- | --- |
| `pdf` | The uploaded `File`, its blob `URL`, name, and size. |
| `analysis` | The `AnalysisResponse` from the backend (or the prebaked fixture). |
| `selectedFieldId` | The currently focused field — shared between viewer (highlight) and right panel (selection). |
| `skipFetch` | Flag set by `loadPdfWithAnalysis` so the upload effect doesn't re-trigger a network call when a fixture has been injected. |

Key design choices:

- **Object URLs are revoked** whenever the PDF is replaced or cleared, to avoid blob leaks.
- **A pending-timer ref** lets the demo flow show the "analyzing…" state briefly before the prebaked response appears, and is cancelled if the user uploads again mid-delay.
- **Click-outside clearing** of `selectedFieldId` is centralised in `App.tsx` rather than scattered across components.
- **No global form state** — field edits are owned by the analysis object itself, updated via `setAnalysis`, so the right panel and viewer always agree on truth.

The context value is memoised so unrelated re-renders don't cascade through the tree.

---

## How real AI-based field extraction would work

The current backend is a Cloudflare Worker that returns a structured `AnalysisResponse`. For a production-grade pipeline I would build it as follows:

1. **Ingest & normalise**
   - Accept the PDF, render each page to a high-DPI image (PDF.js or `pdf2image` server-side).
   - Run OCR (Google Document AI, AWS Textract, or open-source: PaddleOCR / Tesseract) to get text plus per-word bounding boxes and confidence.

2. **Layout-aware extraction**
   - For scanned forms, pure text OCR isn't enough — field labels and values are spatially related. Use either:
     - A **vision-language model** (Claude with vision, GPT-4o, or Gemini) with a prompt that includes the page image and a JSON schema of expected fields, asking for `{ label, value, page, bbox, confidence }` per field. This handles novel layouts with zero training.
     - Or a **specialised model** (LayoutLMv3, Donut, Document AI Form Parser) when the form template is fixed and volume is high — cheaper per call once trained.

3. **Schema-validated output**
   - Define the target schema (e.g. with Zod or Pydantic) and validate the model's JSON. Re-prompt on schema failure with the validation error attached — far more reliable than free-form parsing.
   - Enforce types per field (dates, currency, PAN/Aadhaar regex, etc.) and surface validation errors back to the UI alongside the value, so the user can correct low-confidence fields.

4. **Bounding-box grounding**
   - The UI highlights fields on the page, so each extracted field needs an accurate bbox. For VLM-based extraction, ask the model to return the *text span* of the value and then look that span up against OCR word boxes to compute the bbox deterministically — models hallucinate coordinates but OCR doesn't.

5. **Caching & cost control**
   - Hash the PDF (sha256) and cache the analysis result — re-uploads are free.
   - Use prompt caching on the system prompt + schema (large, static) when calling the Claude API, so only the per-page image content is billed at full rate.

6. **Human-in-the-loop**
   - Surface confidence per field. Anything below a threshold gets flagged in the right panel for review before submission. Corrections can be logged as training data for fine-tuning a smaller, cheaper extractor over time.
