import { api } from './apiClient.js';
import { getSession } from './session.js';

export default async function renderStudentsPage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_students;

  const students = await api.get('/api/students').catch(() => []);

  const rows = students.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.major}</td>
      <td>${s.birth_place}, ${new Date(s.birth_date).toLocaleDateString('id-ID')}</td>
      <td>${s.nisn || '-'}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="empty-state">Belum ada data siswa.</td></tr>`;

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Data Siswa</h1>
      ${canManage ? '<button id="add-student-btn" class="btn btn-primary">+ Tambah Siswa</button>' : ''}
    </div>

    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Nama</th><th>Jurusan</th><th>Tempat, Tgl Lahir</th><th>NISN</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <dialog id="add-student-dialog" class="modal">
      <form id="add-student-form" class="modal-content">
        <h2 class="section-title">Tambah Siswa</h2>
        <label class="input-label">Nama</label>
        <input class="input" name="name" required />
        <label class="input-label" style="margin-top:10px;">Tempat Lahir</label>
        <input class="input" name="birth_place" required />
        <label class="input-label" style="margin-top:10px;">Tanggal Lahir</label>
        <input class="input" type="date" name="birth_date" required />
        <label class="input-label" style="margin-top:10px;">Jurusan</label>
        <input class="input" name="major" required />
        <label class="input-label" style="margin-top:10px;">NISN (opsional)</label>
        <input class="input" name="nisn" />
        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-student" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('add-student-dialog');
  document.getElementById('add-student-btn')?.addEventListener('click', () => dialog.showModal());
  document.getElementById('cancel-add-student')?.addEventListener('click', () => dialog.close());

  document.getElementById('add-student-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    try {
      await api.post('/api/students', payload);
      dialog.close();
      renderStudentsPage(container);
    } catch (err) {
      alert(err.message);
    }
  });
}
