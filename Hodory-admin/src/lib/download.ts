export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const raw = String(value ?? '');
          const escaped = raw.replaceAll('"', '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\n');
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

export function downloadExcelHtmlTable(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const headerCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${row.map((v) => `<td>${escapeHtml(String(v ?? ''))}</td>`).join('')}</tr>`
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  downloadBlob(
    filename,
    new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

