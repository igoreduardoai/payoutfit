/** RFC 4180 reader. Keeps quoted commas and doubled quotes. */
export function parseCsvRows(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((parsed) => parsed.some((value) => value.trim() !== ""));
}

export function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Cells that start with a formula trigger are forced to text for Excel. */
export function spreadsheetText(value: string): string {
  const flat = value.replace(/[\r\n]+/g, " ").trim();
  if (/^[=+\-@]/.test(flat)) return `'${flat}`;
  return flat;
}

export function writeCsv(rows: string[][]): string {
  const lines = rows.map((row) =>
    row
      .map((value, index) => {
        const isAmount = index >= 3;
        if (isAmount && value === "") return "";
        if (isAmount && /^-?\d+\.\d{2}$/.test(value)) return value;
        const safe = spreadsheetText(value);
        return `"${safe.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
