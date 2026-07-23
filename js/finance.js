import { api } from './apiClient.js';
import { getSession } from './session.js';

const rupiah = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

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
        <button class="icon-btn edit-tx-btn" data-id="${t.id}" title="Edit">✏️</button>
        <button class="icon-btn delete-tx-btn" data-id="${t.id}" title="Hapus">🗑️</button>
      </td>` : ''}
    </tr>
  `).join('') || `<tr><td colspan="${canManage ? 6 : 5}" class="empty-state">Belum ada transaksi.</td></tr>`;

  container.innerHTML = `
    <div class="stat-grid">
      <div class="card stat-card"><span class="stat-value">${rupiah(finance.summary.balance)}</span><span class="stat-label">Saldo</span></div>
      <div class="card stat-card"><span class="stat-value" style="color:var(--color-success);">${rupiah(finance.summary.income)}</span><span class="stat-label">Pemasukan</span></div>
      <div class="card stat-card"><span class="stat-value" style="color:var(--color-danger);">${rupiah(finance.summary.expense)}</span><span class="stat-label">Pengeluaran</span></div>
    </div>

    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Riwayat Transaksi</h1>
      ${canManage ? '<button id="add-tx-btn" class="btn btn-primary">+ Tambah Transaksi</button>' : ''}
    </div>

    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th style="text-align:right;">Nominal</th>${canManage ? '<th>Aksi</th>' : ''}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

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
}
