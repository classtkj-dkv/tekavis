import { api } from './apiClient.js';
import { getSession } from './session.js';
import { exportButtonsHtml, bindExportButtons } from './exportUtils.js';

const rupiah = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function groupByMonth(transactions) {
  const map = {};
  transactions.forEach(t => {
    const d = new Date(t.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) {
      map[key] = { key, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, income: 0, expense: 0, transactions: [] };
    }
    map[key].transactions.push(t);
    if (t.type === 'income') map[key].income += Number(t.amount);
    else map[key].expense += Number(t.amount);
  });
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

function downloadMonthlyCSV(month) {
  const header = 'Tanggal,Jenis,Kategori,Keterangan,Nominal\n';
  const rows = month.transactions.map(t => {
    const cells = [
      t.transaction_date,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      (t.category || '-').replace(/,/g, ' '),
      (t.description || '-').replace(/,/g, ' '),
      t.amount,
    ];
    return cells.join(',');
  }).join('\n');
  const summary = `\n\nTotal Pemasukan,${month.income}\nTotal Pengeluaran,${month.expense}\nSaldo Bulan Ini,${month.income - month.expense}`;
  const blob = new Blob([header + rows + summary], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-kas-${month.key}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function monthlyRecapCard(month) {
  return `
    <div class="card" style="margin-bottom:10px;">
      <div class="card-header" style="margin-bottom:8px;">
        <div>
          <div style="font-weight:700; font-size:14px;">${month.label}</div>
          <div style="font-size:12px; color:var(--color-text-muted); margin-top:2px;">
            ${month.transactions.length} transaksi · Masuk ${rupiah(month.income)} · Keluar ${rupiah(month.expense)}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:15px; color:${month.income - month.expense >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${rupiah(month.income - month.expense)}</span>
          <button type="button" class="btn btn-secondary btn-sm recap-download-btn" data-key="${month.key}"><i class="fa-solid fa-download"></i> Simpan</button>
        </div>
      </div>
    </div>
  `;
}

export default async function renderFinancePage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_finance;

  const finance = await api.get('/api/finance').catch(() => null);
  if (!finance) {
    container.innerHTML = '<div class="card">Anda tidak memiliki izin untuk melihat kas.</div>';
    return;
  }

  const rows = finance.transactions.map(t => `
    <tr>
      <td>${new Date(t.transaction_date).toLocaleDateString('id-ID')}</td>
      <td><span class="badge badge-${t.type === 'income' ? 'published' : 'draft'}">${t.type === 'income' ? 'Masuk' : 'Keluar'}</span></td>
      <td>${t.category || '-'}</td>
      <td>${t.description || '-'}</td>
      <td style="text-align:right; font-weight:600;">${rupiah(t.amount)}</td>
      ${canManage ? `<td style="white-space:nowrap;">
        <button class="icon-btn edit-tx-btn" data-id="${t.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn delete-tx-btn" data-id="${t.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </td>` : ''}
    </tr>
  `).join('') || `<tr><td colspan="${canManage ? 6 : 5}" class="empty-state">Belum ada transaksi.</td></tr>`;

  const months = groupByMonth(finance.transactions);
  const recapSection = months.length
    ? `<h2 class="section-title" style="margin-bottom:10px;">Rekap Kas Per Bulan</h2>${months.map(monthlyRecapCard).join('')}`
    : '';

  container.innerHTML = `
    <div class="stat-grid">
      <div class="card stat-card"><span class="stat-value">${rupiah(finance.summary.balance)}</span><span class="stat-label">Saldo</span></div>
      <div class="card stat-card"><span class="stat-value" style="color:var(--color-success);">${rupiah(finance.summary.income)}</span><span class="stat-label">Pemasukan</span></div>
      <div class="card stat-card"><span class="stat-value" style="color:var(--color-danger);">${rupiah(finance.summary.expense)}</span><span class="stat-label">Pengeluaran</span></div>
    </div>

    ${recapSection}

    <div class="card-header" style="margin-top:22px; flex-wrap:wrap; gap:8px;">
      <h1 class="section-title" style="margin:0;">Riwayat Transaksi</h1>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        ${exportButtonsHtml('kas')}
        ${canManage ? '<button id="add-tx-btn" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah Transaksi</button>' : ''}
      </div>
    </div>
    <span id="kas-export-status" style="font-size:12px; color:var(--color-text-muted);"></span>

    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th style="text-align:right;">Nominal</th>${canManage ? '<th>Aksi</th>' : ''}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${me.role === 'owner' ? `
      <h2 class="section-title" style="margin-top:28px; color:var(--color-danger);">Hapus Data Kas</h2>
      <div class="card" style="max-width:560px; border-color:rgba(220,38,38,.3); margin-bottom:16px;">
        <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:12px;">
          Menghapus riwayat transaksi kas secara permanen. Kosongkan kedua tanggal buat hapus SEMUA data. Aksi ini gak bisa dibatalkan — pastikan sudah backup dulu.
        </p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
          <div style="flex:1; min-width:120px;">
            <label class="input-label">Dari (kosongkan = semua)</label>
            <input type="date" class="input" id="clear-from" />
          </div>
          <div style="flex:1; min-width:120px;">
            <label class="input-label">Sampai</label>
            <input type="date" class="input" id="clear-to" />
          </div>
        </div>
        <label class="input-label">Password Akun Owner</label>
        <input type="password" class="input" id="clear-password" placeholder="Konfirmasi password" autocomplete="current-password" />
        <button type="button" id="clear-btn" class="btn btn-danger" style="margin-top:12px;"><i class="fa-solid fa-trash"></i> Hapus Data</button>
        <span id="clear-status" style="font-size:12px; color:var(--color-text-muted); display:block; margin-top:8px;"></span>
      </div>
    ` : ''}

    <dialog id="add-tx-dialog" class="modal">
      <form id="add-tx-form" class="modal-content">
        <h2 class="section-title">Tambah Transaksi</h2>
        <label class="input-label">Jenis</label>
        <select class="input" name="type" required>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
        <label class="input-label" style="margin-top:10px;">Nominal</label>
        <input class="input" type="number" min="0" name="amount" required />
        <label class="input-label" style="margin-top:10px;">Kategori</label>
        <input class="input" name="category" />
        <label class="input-label" style="margin-top:10px;">Keterangan</label>
        <input class="input" name="description" />
        <label class="input-label" style="margin-top:10px;">Tanggal</label>
        <input class="input" type="date" name="transaction_date" />
        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-tx" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('add-tx-dialog');
  const form = document.getElementById('add-tx-form');
  let editingId = null;

  document.getElementById('add-tx-btn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    dialog.showModal();
  });
  document.getElementById('cancel-add-tx')?.addEventListener('click', () => dialog.close());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    payload.amount = Number(payload.amount);
    try {
      if (editingId) {
        await api.patch(`/api/finance?id=${editingId}`, payload);
      } else {
        await api.post('/api/finance', payload);
      }
      dialog.close();
      renderFinancePage(container);
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll('.recap-download-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const month = months.find(m => m.key === btn.dataset.key);
      if (month) downloadMonthlyCSV(month);
    });
  });

  container.querySelectorAll('.edit-tx-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = finance.transactions.find(x => x.id === btn.dataset.id);
      if (!t) return;
      editingId = t.id;
      form.type.value = t.type;
      form.amount.value = t.amount;
      form.category.value = t.category || '';
      form.description.value = t.description || '';
      form.transaction_date.value = t.transaction_date;
      dialog.showModal();
    });
  });

  container.querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus transaksi ini?')) return;
      try {
        await api.delete(`/api/finance?id=${btn.dataset.id}`);
        renderFinancePage(container);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  document.getElementById('clear-btn')?.addEventListener('click', async () => {
    const from = document.getElementById('clear-from').value;
    const to = document.getElementById('clear-to').value;
    const password = document.getElementById('clear-password').value;
    const status = document.getElementById('clear-status');
    if (!password) { status.textContent = 'Password wajib diisi.'; return; }
    const scope = (from && to) ? `data kas tanggal ${from} s/d ${to}` : 'SEMUA data kas';
    if (!confirm(`Yakin mau hapus ${scope}? Aksi ini gak bisa dibatalkan.`)) return;
    status.textContent = 'Menghapus...';
    try {
      await api.post('/api/finance?action=clear', { password, from: from || undefined, to: to || undefined });
      status.textContent = 'Data terhapus ✓';
      renderFinancePage(container);
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  bindExportButtons('kas', () => ({
    title: 'Riwayat Kas Class Tekavis',
    headers: ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal'],
    rows: finance.transactions.map(t => [
      new Date(t.transaction_date).toLocaleDateString('id-ID'),
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.category || '-',
      t.description || '-',
      rupiah(t.amount),
    ]),
    filename: `riwayat-kas-${new Date().toISOString().slice(0, 10)}`,
  }), 'kas-export-status');
}
