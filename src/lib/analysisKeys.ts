export const cellKey = (tableId: string, rowIndex: number, cellIndex: number) =>
  `${tableId}-r${rowIndex}-c${cellIndex}`;
