import { api } from './apiClient.js';
import { getSession } from './session.js';

const DAYS = ['', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default async function renderSchedulePage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_schedule;

  const list = await api.get('/api/schedule').catch(() => []);

  const rows = list.map(s => `
    <tr>
      <td>${DAYS[s.day_of_week]}</td>
      <td>${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}</td>
      <td>${s.subject}</td>
      <td>${s.teacher || '-'}</td>
      <td>${s.room || '-'}</td>
      ${canManage ? `<td style="white-space:nowrap;">
        <button class="icon-btn edit-schedule-btn" data-id="${s.id}" title="Edit">✏️</button>
        <button class="icon-btn delete-schedule-btn" data-id="${s.id}" title="Hapus">🗑️</button>
      </td>` : ''}
    </tr>
  `).join('') || `<tr><td colspan="${canManage ? 6 : 5}" class="empty-state">Belum ada jadwal.</td></tr>`;

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Jadwal Pelajaran</h1>
      ${canManage ? '<button id="add-schedule-btn" class="btn btn-primary">+ Tambah Jadwal</button>' : ''}
    </div>

    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Hari</th><th>Jam</th><th>Mapel</th><th>Guru</th><th>Ruangan</th>${canManage ? '<th>Aksi</th>' : ''}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <dialog id="add-schedule-dialog" class="modal">
      <form id="add-schedule-form" class="modal-content">
        <h2 class="section-title">Tambah Jadwal</h2>
        <label class="input-label">Hari</label>
        <select class="input" name="day_of_week" required>
          ${DAYS.slice(1).map((d, i) => `<option value="${i + 1}">${d}</option>`).join('')}
        </select>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <div style="flex:1;"><label class="input-label">Jam Mulai</label><input class="input" type="time" name="start_time" required /></div>
          <div style="flex:1;"><label class="input-label">Jam Selesai</label><input class="input" type="time" name="end_time" required /></div>
        </div>
        <label class="input-label" style="margin-top:10px;">Mata Pelajaran</label>
        <input class="input" name="subject" required />
        <label class="input-label" style="margin-top:10px;">Guru</label>
        <input class="input" name="teacher" />
        <label class="input-label" style="margin-top:10px;">Ruangan</label>
        <input class="input" name="room" />
        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-schedule" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('add-schedule-dialog');
  const form = document.getElementById('add-schedule-form');
  let editingId = null;

  document.getElementById('add-schedule-btn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    dialog.showModal();
  });
  document.getElementById('cancel-add-schedule')?.addEventListener('click', () => dialog.close());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    payload.day_of_week = Number(payload.day_of_week);
    try {
      if (editingId) {
        await api.patch(`/api/schedule?id=${editingId}`, payload);
      } else {
        await api.post('/api/schedule', payload);
      }
      dialog.close();
      renderSchedulePage(container);
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll('.edit-schedule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = list.find(x => x.id === btn.dataset.id);
      if (!s) return;
      editingId = s.id;
      form.day_of_week.value = s.day_of_week;
      form.start_time.value = s.start_time;
      form.end_time.value = s.end_time;
      form.subject.value = s.subject;
      form.teacher.value = s.teacher || '';
      form.room.value = s.room || '';
      dialog.showModal();
    });
  });

  container.querySelectorAll('.delete-schedule-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus jadwal ini?')) return;
      try {
        await api.delete(`/api/schedule?id=${btn.dataset.id}`);
        renderSchedulePage(container);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
