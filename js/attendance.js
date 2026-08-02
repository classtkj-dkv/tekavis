import { api } from './apiClient.js';
import { getSession } from './session.js';
import { getAccessToken } from './supabaseClient.js';
import { exportButtonsHtml, bindExportButtons } from './exportUtils.js';

// Urutan sesuai yang diminta: Hadir, Sakit, Izin, Alpa
const STATUS_DEFS = [
  { key: 'hadir', label: 'Hadir' },
  { key: 'sakit', label: 'Sakit' },
  { key: 'izin', label: 'Izin' },
  { key: 'alpa', label: 'Alpa' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

function gridRow(student, no, currentStatus, canManage) {
  return `
    <tr data-student-id="${student.id}">
      <td style="text-align:center; color:var(--color-text-muted);">${no}</td>
      <td class="att-name-cell">
        <span class="att-student-photo" style="${student.photo_url ? `background-image:url('${student.photo_url}')` : ''}">${!student.photo_url ? (student.name || '?').trim().slice(0, 1).toUpperCase() : ''}</span>
        <span>${student.name}</span>
      </td>
      ${STATUS_DEFS.map(s => `
        <td style="text-align:center;">
          <input type="radio" class="att-radio att-radio-${s.key}" name="att-${student.id}" value="${s.key}" ${currentStatus === s.key ? 'checked' : ''} ${canManage ? '' : 'disabled'} />
        </td>
      `).join('')}
    </tr>
  `;
}

function recapRow(r, no) {
  return `
    <tr>
      <td style="text-align:center; color:var(--color-text-muted);">${no}</td>
      <td>${r.name}</td>
      <td style="text-align:center; color:var(--color-success); font-weight:700;">${r.hadir}</td>
      <td style="text-align:center; color:var(--color-info); font-weight:700;">${r.sakit}</td>
      <td style="text-align:center; color:var(--color-warning); font-weight:700;">${r.izin}</td>
      <td style="text-align:center; color:var(--color-danger); font-weight:700;">${r.alpa}</td>
      <td style="text-align:center; font-weight:800;">${r.total}</td>
    </tr>
  `;
}

function pickerRow(student) {
  return `
    <label class="student-picker-row">
      <input type="checkbox" class="student-picker-check" value="${student.id}" />
      <span class="att-student-photo" style="${student.photo_url ? `background-image:url('${student.photo_url}')` : ''}">${!student.photo_url ? (student.name || '?').trim().slice(0, 1).toUpperCase() : ''}</span>
      <span>${student.name}</span>
    </label>
  `;
}

export default async function renderAttendancePage(container) {
  const me = await getSession();

  // Absensi cuma buat yang login DAN bukan role Pengunjung — pengunjung
  // sengaja dikecualikan sesuai permintaan, meskipun dia login.
  if (!me || me.role === 'pengunjung') {
    container.innerHTML = `
      <div class="card">
        Halaman Absensi cuma bisa diakses anggota kelas yang login.
        ${!me ? ' <a href="#/login">Masuk / Daftar</a> dulu ya.' : 'Role Pengunjung tidak memiliki akses ke halaman ini.'}
      </div>
    `;
    return;
  }

  const canManage = me.role === 'owner' || me.permissions?.manage_attendance;
  const canBackup = me.role === 'owner';

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Absensi</h1>
      <input type="date" id="att-date" class="input" style="width:auto;" value="${todayStr()}" max="${todayStr()}" />
    </div>
    <p style="font-size:12.5px; margin-bottom:14px;">${canManage ? 'Centang status kehadiran tiap siswa, lalu simpan.' : 'Kamu bisa lihat absensi, tapi gak punya izin buat mengubahnya.'}</p>

    <div class="card" style="overflow-x:auto; margin-bottom:8px; padding:0;">
      <table class="att-table">
        <thead><tr><th style="text-align:center;">No.</th><th>Nama Siswa</th>${STATUS_DEFS.map(s => `<th style="text-align:center;">${s.label}</th>`).join('')}</tr></thead>
        <tbody id="att-grid-body"><tr><td colspan="6" class="empty-state">Memuat...</td></tr></tbody>
      </table>
    </div>
    ${canManage ? `
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:10px; margin-bottom:8px;">
        <span id="att-save-status" style="font-size:12px; color:var(--color-text-muted);"></span>
        <button type="button" id="att-save-btn" class="btn btn-primary">Simpan Absensi</button>
      </div>
    ` : ''}

    <h2 class="section-title" style="margin-top:28px;">Rekap Absensi</h2>
    <div class="card" style="max-width:560px; margin-bottom:16px;">
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
        <div style="flex:1; min-width:130px;">
          <label class="input-label">Dari</label>
          <input type="date" class="input" id="recap-from" />
        </div>
        <div style="flex:1; min-width:130px;">
          <label class="input-label">Sampai</label>
          <input type="date" class="input" id="recap-to" value="${todayStr()}" />
        </div>
      </div>

      <label class="input-label">Siswa</label>
      <button type="button" id="open-picker-btn" class="student-picker-trigger">
        <span id="picker-summary">Semua siswa</span>
        <i class="fa-solid fa-chevron-right"></i>
      </button>

      <button type="button" id="recap-build-btn" class="btn btn-secondary" style="margin-top:14px;">Buat Rekap</button>
    </div>

    <div id="recap-result" style="display:none;">
      <div class="card-header" style="flex-wrap:wrap; gap:8px;">
        <h3 class="section-title" style="margin:0; font-size:15px;">Hasil Rekap</h3>
        ${exportButtonsHtml('recap')}
      </div>
      <span id="recap-export-status" style="font-size:12px; color:var(--color-text-muted);"></span>
      <div class="card" style="overflow-x:auto; margin-top:8px; padding:0;">
        <table class="att-table" id="recap-table">
          <thead><tr><th style="text-align:center;">No.</th><th>Nama Siswa</th><th style="text-align:center;">Hadir</th><th style="text-align:center;">Sakit</th><th style="text-align:center;">Izin</th><th style="text-align:center;">Alpa</th><th style="text-align:center;">Total</th></tr></thead>
          <tbody id="recap-body"></tbody>
        </table>
      </div>
    </div>

    ${me.role === 'owner' ? `
      <h2 class="section-title" style="margin-top:28px; color:var(--color-danger);">Hapus Data Absensi</h2>
      <div class="card" style="max-width:560px; border-color:rgba(220,38,38,.3); margin-bottom:16px;">
        <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:12px;">
          Menghapus data absensi secara permanen (centang kembali ke kosong dari 0). Kosongkan kedua tanggal buat hapus SEMUA data. Aksi ini gak bisa dibatalkan — pastikan sudah backup dulu.
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

    <dialog id="student-picker-dialog" class="modal">
      <div class="modal-content">
        <div class="card-header" style="margin-bottom:12px;">
          <h2 class="section-title" style="margin:0; font-size:16px;">Pilih Siswa</h2>
          <button type="button" class="icon-btn" onclick="this.closest('dialog').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <label class="student-picker-row" style="border-bottom:1px solid var(--color-border); margin-bottom:8px; padding-bottom:10px;">
          <input type="checkbox" id="picker-select-all" />
          <span style="font-weight:700;">Pilih Semua</span>
        </label>
        <div id="picker-list" style="max-height:320px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;"></div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:16px; flex-wrap:wrap;">
          ${canBackup ? '<button type="button" id="picker-backup-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-download"></i> Backup</button>' : '<span></span>'}
          <button type="button" id="picker-apply-btn" class="btn btn-primary">Terapkan</button>
        </div>
        <span id="picker-backup-status" style="font-size:11.5px; color:var(--color-text-muted); display:block; margin-top:6px;"></span>
      </div>
    </dialog>
  `;

  let currentStudents = [];
  let currentRecap = [];
  let selectedIds = [];

  async function loadGrid(date) {
    const body = document.getElementById('att-grid-body');
    body.innerHTML = `<tr><td colspan="6" class="empty-state">Memuat...</td></tr>`;
    const data = await api.get('/api/attendance', { date }).catch(() => null);
    if (!data) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">Gagal memuat absensi.</td></tr>`;
      return;
    }
    currentStudents = data.students;
    body.innerHTML = data.students.length
      ? data.students.map((s, i) => gridRow(s, i + 1, data.marks[s.id]?.status, canManage)).join('')
      : `<tr><td colspan="6" class="empty-state">Belum ada data siswa.</td></tr>`;

    const list = document.getElementById('picker-list');
    if (list && !list.dataset.filled) {
      list.innerHTML = data.students.map(pickerRow).join('');
      list.dataset.filled = '1';
    }
  }

  document.getElementById('att-date').addEventListener('change', (e) => loadGrid(e.target.value));
  await loadGrid(todayStr());

  document.getElementById('att-save-btn')?.addEventListener('click', async () => {
    const date = document.getElementById('att-date').value;
    const marks = currentStudents
      .map(s => {
        const checked = document.querySelector(`input[name="att-${s.id}"]:checked`);
        return checked ? { student_id: s.id, status: checked.value } : null;
      })
      .filter(Boolean);
    const status = document.getElementById('att-save-status');
    if (!marks.length) {
      status.textContent = 'Belum ada yang dicentang.';
      return;
    }
    status.textContent = 'Menyimpan...';
    try {
      await api.post('/api/attendance', { date, marks });
      status.textContent = `Tersimpan ✓ (${marks.length} siswa)`;
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  // ---- Halaman/modal "Pilih Siswa" — ketuk kolom Siswa buat masuk ----
  const pickerDialog = document.getElementById('student-picker-dialog');
  document.getElementById('open-picker-btn')?.addEventListener('click', () => pickerDialog.showModal());

  document.getElementById('picker-select-all')?.addEventListener('change', (e) => {
    document.querySelectorAll('.student-picker-check').forEach(cb => { cb.checked = e.target.checked; });
  });

  document.getElementById('picker-apply-btn')?.addEventListener('click', () => {
    selectedIds = Array.from(document.querySelectorAll('.student-picker-check:checked')).map(cb => cb.value);
    document.getElementById('picker-summary').textContent = selectedIds.length
      ? `${selectedIds.length} dari ${currentStudents.length} siswa dipilih`
      : 'Semua siswa';
    pickerDialog.close();
  });

  document.getElementById('picker-backup-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('picker-backup-status');
    status.textContent = 'Menyiapkan backup...';
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/settings?action=backup', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal mengunduh backup');
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kelas-cms-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      status.textContent = 'Backup terunduh ✓';
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  document.getElementById('recap-build-btn')?.addEventListener('click', async () => {
    const from = document.getElementById('recap-from').value;
    const to = document.getElementById('recap-to').value;
    if (!from || !to) { alert('Isi tanggal Dari & Sampai dulu.'); return; }
    const result = await api.get('/api/attendance', {
      resource: 'recap', from, to,
      student_ids: selectedIds.length ? selectedIds.join(',') : undefined,
    }).catch(() => null);
    if (!result) { alert('Gagal membuat rekap.'); return; }
    currentRecap = result.recap;
    document.getElementById('recap-body').innerHTML = currentRecap.map((r, i) => recapRow(r, i + 1)).join('') || `<tr><td colspan="7" class="empty-state">Tidak ada data.</td></tr>`;
    document.getElementById('recap-result').style.display = '';
  });

  document.getElementById('clear-btn')?.addEventListener('click', async () => {
    const from = document.getElementById('clear-from').value;
    const to = document.getElementById('clear-to').value;
    const password = document.getElementById('clear-password').value;
    const status = document.getElementById('clear-status');
    if (!password) { status.textContent = 'Password wajib diisi.'; return; }
    const scope = (from && to) ? `data absensi tanggal ${from} s/d ${to}` : 'SEMUA data absensi';
    if (!confirm(`Yakin mau hapus ${scope}? Semua centang bakal balik kosong dari 0. Aksi ini gak bisa dibatalkan.`)) return;
    status.textContent = 'Menghapus...';
    try {
      await api.post('/api/attendance?action=clear', { password, from: from || undefined, to: to || undefined });
      status.textContent = 'Data terhapus ✓';
      document.getElementById('clear-password').value = '';
      await loadGrid(document.getElementById('att-date').value);
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  bindExportButtons('recap', () => ({
    title: `Rekap Absensi ${document.getElementById('recap-from').value} s/d ${document.getElementById('recap-to').value}`,
    headers: ['No.', 'Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Total'],
    rows: currentRecap.map((r, i) => [i + 1, r.name, r.hadir, r.sakit, r.izin, r.alpa, r.total]),
    filename: `rekap-absensi-${document.getElementById('recap-from').value}_${document.getElementById('recap-to').value}`,
  }), 'recap-export-status');
}
