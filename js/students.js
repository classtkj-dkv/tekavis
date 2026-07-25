import { api } from './apiClient.js';
import { getSession } from './session.js';
import { studentDetailDialogHtml, openStudentDetail } from './studentDetail.js';

export default async function renderStudentsPage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_students;

  const students = await api.get('/api/students').catch(() => []);

  const rows = students.map(s => {
    const initials = (s.name || '?').trim().slice(0, 1).toUpperCase();
    const avatar = s.photo_url
      ? `<img src="${s.photo_url}" alt="${s.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`
      : initials;
    return `
    <tr class="student-row" data-id="${s.id}" style="cursor:pointer;">
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="org-avatar" style="flex-shrink:0; overflow:hidden;">${avatar}</div>
          <span>${s.name}${s.profile_id ? ' <i class="fa-solid fa-circle-check" style="color:var(--color-success); font-size:11px;" title="Punya akun login"></i>' : ''}</span>
        </div>
      </td>
      <td>${s.major}</td>
      <td>${s.birth_place}, ${new Date(s.birth_date).toLocaleDateString('id-ID')}</td>
      <td>${s.nisn || '-'}</td>
      ${canManage ? `<td style="white-space:nowrap;">
        <button class="icon-btn edit-student-btn" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn delete-student-btn" data-id="${s.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </td>` : ''}
    </tr>
  `;
  }).join('') || `<tr><td colspan="${canManage ? 5 : 4}" class="empty-state">Belum ada data siswa.</td></tr>`;

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Data Siswa</h1>
      ${canManage ? '<button id="add-student-btn" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah Siswa</button>' : ''}
    </div>

    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Nama</th><th>Jurusan</th><th>Tempat, Tgl Lahir</th><th>NISN</th>${canManage ? '<th>Aksi</th>' : ''}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${studentDetailDialogHtml('page')}

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

  // Klik baris = buka detail profil. Tombol edit/hapus (kalau ada) dicek
  // duluan biar klik di tombol itu gak ikut kebuka detailnya.
  container.querySelectorAll('.student-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      const s = students.find(x => x.id === row.dataset.id);
      if (s) openStudentDetail('page', s);
    });
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
