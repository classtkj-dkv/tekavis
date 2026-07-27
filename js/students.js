import { api } from './apiClient.js';
import { getSession } from './session.js';
import { studentDetailDialogHtml, openStudentDetail } from './studentDetail.js';

function studentCardHtml(s) {
  const initials = (s.name || '?').trim().slice(0, 1).toUpperCase();
  return `
    <div class="student-card">
      <div class="student-card-photo" style="${s.photo_url ? `background-image:url('${s.photo_url}')` : ''}">
        ${!s.photo_url ? initials : ''}
      </div>
      <div class="student-card-info">
        <span class="student-card-name" title="${s.name}">${s.name}</span>
        <button type="button" class="student-card-menu-btn detail-trigger" data-id="${s.id}" title="Lihat detail">
          <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>
      </div>
      ${s.profile_id ? '' : ''}
    </div>
  `;
}

export default async function renderStudentsPage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_students;

  const [students, settings] = await Promise.all([
    api.get('/api/students').catch(() => []),
    api.get('/api/settings').catch(() => null),
  ]);
  const footerText = settings?.contact?.card_footer || `${settings?.site_name || 'Class Tekavis'} • Data Siswa`;

  const grid = students.length
    ? `<div class="student-card-grid">${students.map(studentCardHtml).join('')}</div>`
    : '<div class="empty-state">Belum ada data siswa.</div>';

  const manageRows = canManage ? students.map(s => `
    <tr>
      <td>${s.name}${s.profile_id ? ' <i class="fa-solid fa-circle-check" style="color:var(--color-success); font-size:11px;" title="Punya akun login"></i>' : ''}</td>
      <td>${s.major}</td>
      <td>${s.birth_place}${s.birth_date ? ', ' + new Date(s.birth_date).toLocaleDateString('id-ID') : ''}</td>
      <td>${s.nisn || '-'}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn edit-student-btn" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn delete-student-btn" data-id="${s.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('') : '';

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Data Siswa</h1>
      ${canManage ? '<button id="add-student-btn" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah Siswa</button>' : ''}
    </div>

    <p style="font-size:12.5px; margin-bottom:14px;">Ketuk <i class="fa-solid fa-ellipsis-vertical"></i> di kartu buat lihat detail profil.</p>
    ${grid}

    ${studentDetailDialogHtml('page')}

    ${canManage ? `
      <h2 class="section-title" style="margin-top:32px; font-size:16px;">Kelola Data (Admin/Owner)</h2>
      <div class="card" style="overflow-x:auto; margin-top:10px;">
        <table class="table">
          <thead><tr><th>Nama</th><th>Jurusan</th><th>Tempat, Tgl Lahir</th><th>NISN</th><th>Aksi</th></tr></thead>
          <tbody>${manageRows || '<tr><td colspan="5" class="empty-state">Belum ada data siswa.</td></tr>'}</tbody>
        </table>
      </div>
    ` : ''}

    <dialog id="student-dialog" class="modal">
      <form id="student-form" class="modal-content">
        <h2 class="section-title" id="student-dialog-title">Tambah Siswa</h2>
        <p style="font-size:12px; color:var(--color-text-muted); margin:6px 0 12px;">
          Akun ini dipakai siswa buat login &amp; edit moto/hobi/cita-cita di profilnya sendiri.
          Nama, NISN, tempat/tanggal lahir, dan jurusan tetap dikunci — cuma Admin/Owner (wali kelas) yang bisa ubah.
        </p>

        <label class="input-label">Gmail (email login)</label>
        <input class="input" type="email" name="email" id="student-email" required />
        <span id="email-hint" style="font-size:11px; color:var(--color-text-muted); display:block; margin-top:4px;">Kosongkan kalau tidak ingin mengubah email.</span>

        <label class="input-label" style="margin-top:10px;">Password</label>
        <input class="input" type="text" name="password" id="student-password" required placeholder="Minimal 6 karakter" />
        <span id="password-hint" style="font-size:11px; color:var(--color-text-muted); display:block; margin-top:4px;">Kosongkan kalau tidak ingin mengubah password.</span>

        <label class="input-label" style="margin-top:10px;">Nama</label>
        <input class="input" name="name" required />

        <label class="input-label" style="margin-top:10px;">NISN (opsional)</label>
        <input class="input" name="nisn" />

        <div style="display:flex; gap:10px; margin-top:10px;">
          <div style="flex:1;"><label class="input-label">Tempat Lahir</label><input class="input" name="birth_place" required /></div>
          <div style="flex:1;"><label class="input-label">Tanggal Lahir</label><input class="input" type="date" name="birth_date" required /></div>
        </div>

        <label class="input-label" style="margin-top:10px;">Jurusan</label>
        <input class="input" name="major" required />

        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-student" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  document.querySelectorAll('.detail-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = students.find(x => x.id === btn.dataset.id);
      if (s) openStudentDetail('page', s, footerText);
    });
  });

  if (!canManage) return;

  const dialog = document.getElementById('student-dialog');
  const form = document.getElementById('student-form');
  const emailInput = document.getElementById('student-email');
  const passwordInput = document.getElementById('student-password');
  const emailHint = document.getElementById('email-hint');
  const passwordHint = document.getElementById('password-hint');
  let editingId = null;

  function setMode(mode) {
    const isEdit = mode === 'edit';
    document.getElementById('student-dialog-title').textContent = isEdit ? 'Edit Siswa' : 'Tambah Siswa';
    emailInput.required = !isEdit;
    passwordInput.required = !isEdit;
    emailHint.style.display = isEdit ? 'block' : 'none';
    passwordHint.style.display = isEdit ? 'block' : 'none';
  }

  document.getElementById('add-student-btn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    setMode('add');
    dialog.showModal();
  });
  document.getElementById('cancel-student')?.addEventListener('click', () => dialog.close());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    if (editingId && !payload.email) delete payload.email;
    if (editingId && !payload.password) delete payload.password;
    try {
      if (editingId) {
        await api.patch(`/api/students?id=${editingId}`, payload);
      } else {
        await api.post('/api/students', payload);
      }
      dialog.close();
      renderStudentsPage(container);
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll('.edit-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = students.find(x => x.id === btn.dataset.id);
      if (!s) return;
      editingId = s.id;
      form.reset();
      form.name.value = s.name || '';
      form.nisn.value = s.nisn || '';
      form.birth_place.value = s.birth_place || '';
      form.birth_date.value = s.birth_date || '';
      form.major.value = s.major || '';
      setMode('edit');
      dialog.showModal();
    });
  });

  container.querySelectorAll('.delete-student-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus data siswa ini? Akun login-nya (kalau ada) juga akan ikut terhapus.')) return;
      try {
        await api.delete(`/api/students?id=${btn.dataset.id}`);
        renderStudentsPage(container);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
