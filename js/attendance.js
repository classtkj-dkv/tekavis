import { api } from './apiClient.js';
import { getSession } from './session.js';
import { exportButtonsHtml, bindExportButtons } from './exportUtils.js';

const STATUS_DEFS = [
  { key: 'hadir', label: 'Hadir' },
  { key: 'izin', label: 'Izin' },
  { key: 'sakit', label: 'Sakit' },
  { key: 'alpa', label: 'Alpa' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

function gridRow(student, currentStatus, canManage) {
  return `
    <tr data-student-id="${student.id}">
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

function recapRow(r) {
  return `
    <tr>
      <td>${r.name}</td>
      <td style="text-align:center; color:var(--color-success); font-weight:700;">${r.hadir}</td>
      <td style="text-align:center; color:var(--color-warning); font-weight:700;">${r.izin}</td>
      <td style="text-align:center; color:var(--color-info); font-weight:700;">${r.sakit}</td>
      <td style="text-align:center; color:var(--color-danger); font-weight:700;">${r.alpa}</td>
      <td style="text-align:center; font-weight:800;">${r.total}</td>
    </tr>
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

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Absensi</h1>
      <input type="date" id="att-date" class="input" style="width:auto;" value="${todayStr()}" max="${todayStr()}" />
    </div>
    <p style="font-size:12.5px; margin-bottom:14px;">${canManage ? 'Centang status kehadiran tiap siswa, lalu simpan.' : 'Kamu bisa lihat absensi, tapi gak punya izin buat mengubahnya.'}</p>

    <div class="card" style="overflow-x:auto; margin-bottom:8px; padding:0;">
      <table class="att-table">
        <thead><tr><th>Siswa</th>${STATUS_DEFS.map(s => `<th style="text-align:center;">${s.label}</th>`).join('')}</tr></thead>
        <tbody id="att-grid-body"><tr><td colspan="5" class="empty-state">Memuat...</td></tr></tbody>
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
      <select class="input" id="recap-student-select" multiple size="5" style="height:auto;"></select>
      <p style="font-size:11.5px; color:var(--color-text-muted); margin:4px 0 0;">Kosongkan pilihan buat semua siswa. Tahan Ctrl/Cmd buat pilih beberapa sekaligus.</p>
      <button type="button" id="recap-build-btn" class="btn btn-secondary" style="margin-top:12px;">Buat Rekap</button>
    </div>

    <div id="recap-result" style="display:none;">
      <div class="card-header" style="flex-wrap:wrap; gap:8px;">
        <h3 class="section-title" style="margin:0; font-size:15px;">Hasil Rekap</h3>
        ${exportButtonsHtml('recap')}
      </div>
      <span id="recap-export-status" style="font-size:12px; color:var(--color-text-muted);"></span>
      <div class="card" style="overflow-x:auto; margin-top:8px; padding:0;">
        <table class="att-table" id="recap-table">
          <thead><tr><th>Siswa</th><th style="text-align:center;">Hadir</th><th style="text-align:center;">Izin</th><th style="text-align:center;">Sakit</th><th style="text-align:center;">Alpa</th><th style="text-align:center;">Total</th></tr></thead>
          <tbody id="recap-body"></tbody>
        </table>
      </div>
    </div>
  `;

  let currentStudents = [];
  let currentRecap = [];

  async function loadGrid(date) {
    const body = document.getElementById('att-grid-body');
    body.innerHTML = `<tr><td colspan="5" class="empty-state">Memuat...</td></tr>`;
    const data = await api.get('/api/attendance', { date }).catch(() => null);
    if (!data) {
      body.innerHTML = `<tr><td colspan="5" class="empty-state">Gagal memuat absensi.</td></tr>`;
      return;
    }
    currentStudents = data.students;
    body.innerHTML = data.students.length
      ? data.students.map(s => gridRow(s, data.marks[s.id]?.status, canManage)).join('')
      : `<tr><td colspan="5" class="empty-state">Belum ada data siswa.</td></tr>`;

    const select = document.getElementById('recap-student-select');
    if (select && !select.dataset.filled) {
      select.innerHTML = data.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      select.dataset.filled = '1';
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

  document.getElementById('recap-build-btn')?.addEventListener('click', async () => {
    const from = document.getElementById('recap-from').value;
    const to = document.getElementById('recap-to').value;
    if (!from || !to) { alert('Isi tanggal Dari & Sampai dulu.'); return; }
    const selected = Array.from(document.getElementById('recap-student-select').selectedOptions).map(o => o.value);
    const result = await api.get('/api/attendance', {
      resource: 'recap', from, to,
      student_ids: selected.length ? selected.join(',') : undefined,
    }).catch(() => null);
    if (!result) { alert('Gagal membuat rekap.'); return; }
    currentRecap = result.recap;
    document.getElementById('recap-body').innerHTML = currentRecap.map(recapRow).join('') || `<tr><td colspan="6" class="empty-state">Tidak ada data.</td></tr>`;
    document.getElementById('recap-result').style.display = '';
  });

  bindExportButtons('recap', () => ({
    title: `Rekap Absensi ${document.getElementById('recap-from').value} s/d ${document.getElementById('recap-to').value}`,
    headers: ['Siswa', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Total'],
    rows: currentRecap.map(r => [r.name, r.hadir, r.izin, r.sakit, r.alpa, r.total]),
    filename: `rekap-absensi-${document.getElementById('recap-from').value}_${document.getElementById('recap-to').value}`,
  }), 'recap-export-status');
}
