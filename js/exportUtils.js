// Export tabel (headers + rows generik) jadi Gambar (PNG), PDF, atau Teks.
// Library berat (html2canvas, jsPDF) sengaja di-load dari CDN cuma pas
// tombolnya beneran dipencet — bukan pas halaman dibuka — biar gak
// nambah beban di halaman yang gak butuh export sama sekali.

const loadedScripts = new Set();
function loadScript(src) {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => { loadedScripts.add(src); resolve(); };
    el.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    document.head.appendChild(el);
  });
}

function buildTempTable(title, headers, rows) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed; left:-9999px; top:0; background:#fff; padding:20px; width:fit-content; font-family:Inter,system-ui,sans-serif;';
  wrap.innerHTML = `
    ${title ? `<div style="font-weight:800; font-size:16px; margin-bottom:12px; color:#111;">${title}</div>` : ''}
    <table style="border-collapse:collapse; font-size:13px; color:#111;">
      <thead>
        <tr>${headers.map(h => `<th style="border:1px solid #ddd; padding:8px 12px; background:#f3f4f6; text-align:left; white-space:nowrap;">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #ddd; padding:8px 12px; white-space:nowrap;">${c}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;
  document.body.appendChild(wrap);
  return wrap;
}

export async function exportAsImage(title, headers, rows, filename) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  const el = buildTempTable(title, headers, rows);
  try {
    const canvas = await window.html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${filename}.png`;
    a.click();
  } finally {
    el.remove();
  }
}

export async function exportAsPDF(title, headers, rows, filename) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait' });
  if (title) doc.text(title, 14, 15);
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: title ? 20 : 10,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 110, 247] },
  });
  doc.save(`${filename}.pdf`);
}

export function exportAsText(title, headers, rows, filename) {
  const colWidths = headers.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i] ?? '').length)) + 2);
  const line = (cells) => cells.map((c, i) => String(c).padEnd(colWidths[i])).join('');
  const sep = colWidths.reduce((a, w) => a + w, 0);
  const text = [
    ...(title ? [title, ''] : []),
    line(headers),
    '-'.repeat(sep),
    ...rows.map(line),
  ].join('\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Tombol grup Unduh (Gambar/PDF/Teks) — dipakai bareng di Absensi & Kas.
export function exportButtonsHtml(idPrefix) {
  return `
    <div class="export-btn-group">
      <button type="button" class="btn btn-secondary btn-sm" id="${idPrefix}-export-image"><i class="fa-solid fa-image"></i> Gambar</button>
      <button type="button" class="btn btn-secondary btn-sm" id="${idPrefix}-export-pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      <button type="button" class="btn btn-secondary btn-sm" id="${idPrefix}-export-text"><i class="fa-solid fa-file-lines"></i> Teks</button>
    </div>
  `;
}

export function bindExportButtons(idPrefix, getData, statusElId) {
  const status = statusElId ? document.getElementById(statusElId) : null;
  const setStatus = (msg) => { if (status) status.textContent = msg; };

  document.getElementById(`${idPrefix}-export-image`)?.addEventListener('click', async () => {
    const { title, headers, rows, filename } = getData();
    setStatus('Menyiapkan gambar...');
    try { await exportAsImage(title, headers, rows, filename); setStatus(''); }
    catch (err) { setStatus('Gagal: ' + err.message); }
  });
  document.getElementById(`${idPrefix}-export-pdf`)?.addEventListener('click', async () => {
    const { title, headers, rows, filename } = getData();
    setStatus('Menyiapkan PDF...');
    try { await exportAsPDF(title, headers, rows, filename); setStatus(''); }
    catch (err) { setStatus('Gagal: ' + err.message); }
  });
  document.getElementById(`${idPrefix}-export-text`)?.addEventListener('click', () => {
    const { title, headers, rows, filename } = getData();
    exportAsText(title, headers, rows, filename);
  });
}
