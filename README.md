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
- **No global form state** — field edits are owned by the analysis object itself, updated via `setAnalysis`, so the right panel and viewer always agree on truth.

The context value is memoised so unrelated re-renders don't cascade through the tree.

---

## How real AI-based field extraction from scanned forms is Handled

Right now the frontend just hits a Cloudflare Worker that wraps a free vision model and returns the structured `AnalysisResponse` the UI consumes. That's enough for the demo but the bboxes drift sometimes (hence the running banner).

If this were production I'd expect the backend to:

- run OCR (Optical Character Recognition) first (Textract / Document AI / PaddleOCR) to get real per-word bounding boxes,
- pass the page + OCR text to a vision model with a fixed JSON schema,
- return a `confidence` per field so the UI can flag low-confidence ones for the user to verify.

From the frontend side nothing really changes — the contract is already `AnalysisResponse`, so swapping the worker for a better pipeline is a drop-in.
