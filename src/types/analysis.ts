export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'email'
  | 'name'
  | 'phone'
  | 'address'
  | 'checkbox'
  | 'signature'
  | 'id'
  | 'other'
  | string;

export interface BoxPercent {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface AnalyzedField {
  id: string;
  label: string;
  value: string;
  fieldType: FieldType;
  checked: boolean | null;
  confidence: number | null;
  pageNumber: number;
  valueBoundingBox: number[] | null;
  labelBoundingBox: number[] | null;
  valueBoxPercent: BoxPercent | null;
  labelBoxPercent: BoxPercent | null;
}

export interface TableCell {
  cellIndex: number;
  text: string;
  checked: boolean | null;
  confidence: number | null;
  boundingBox: number[] | null;
  boxPercent: BoxPercent | null;
}

export interface TableRow {
  rowIndex: number;
  cells: TableCell[];
}

export interface AnalyzedTable {
  id: string;
  title: string;
  pageNumber: number;
  headers: string[];
  rows: TableRow[];
  boundingBox: number[] | null;
  boxPercent: BoxPercent | null;
}

export interface AnalysisResponse {
  success: boolean;
  documentType: string;
  language: string;
  totalPages: number;
  fieldCount: number;
  tableCount: number;
  fields: AnalyzedField[];
  tables: AnalyzedTable[];
  warnings: string[];
  extractedAt: string;
}
