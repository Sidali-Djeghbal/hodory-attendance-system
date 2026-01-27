'use client';

export type CsvParseResult = {
  headers: string[];
  rows: string[][];
};

export function parseCsv(text: string): CsvParseResult {
  const lines = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCsvLine(line));
  }
  const headers = rows.shift() ?? [];
  return { headers: headers.map((h) => h.trim()), rows };
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out.map((v) => v.trim());
}

