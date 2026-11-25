/**
 * RFC-4180 compliant CSV serialization and parsing helpers with formula-injection neutralization.
 */

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

export const sanitizeCsvCell = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const safe = FORMULA_PREFIX_RE.test(str) ? `'${str}` : str;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

export const toCsv = (headers, rows) => {
  const headerLine = headers.map((h) => sanitizeCsvCell(h.label ?? h.key)).join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const raw = typeof h.value === "function" ? h.value(row) : row[h.key];
        return sanitizeCsvCell(raw);
      })
      .join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
};

export const parseCsv = (text) => {
  if (!text || typeof text !== "string") return [];

  const cleanText = text.replace(/^\uFEFF/, "");
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (ch === "\r" && next === "\n") {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell !== "")) rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      i += 1;
    } else if (ch === "\n" || ch === "\r") {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell !== "")) rows.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += ch;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== "")) rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, idx) => {
      if (header) {
        record[header] = cells[idx] !== undefined ? cells[idx] : "";
      }
    });
    return record;
  });
};
