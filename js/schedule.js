import { api } from './apiClient.js';
import { getSession } from './session.js';
import { renderScheduleWeek, bindScheduleWeek, DAY_NAMES, todayDbDay } from './scheduleWidget.js';
import { showToast } from './toast.js';
import { showAlert, showConfirm } from './ui.js';

export default async function renderSchedulePage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_schedule;

  const list = await api.get('/api/schedule').catch(() => []);

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Jadwal Pelajaran</h1>
      ${canManage ? '<button id="add-schedule-btn" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah Jadwal</button>' : ''}
    </div>

    ${renderScheduleWeek(list, { canManage, idPrefix: 'page-sched' })}

    <dialog id="add-schedule-dialog" class="modal">
      <form id="add-schedule-form" class="modal-content">
        <h2 class="section-title">Tambah Jadwal</h2>
        <label class="input-label">Hari</label>
        <select class="input" name="day_of_week" required>
          ${DAY_NAMES.slice(1).map((d, i) => `<option value="${i + 1}">${d}</option>`).join('')}
        </select>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <div style="flex:1;"><label class="input-label">Jam Mulai</label><input class="input" type="time" name="start_time" required /></div>
          <div style="flex:1;"><label class="input-label">Jam Selesai</label><input class="input" type="time" name="end_time" required /></div>
        </div>

        <label style="display:flex; align-items:center; gap:8px; margin-top:14px; font-size:13px; font-weight:600; cursor:pointer;">
          <input type="checkbox" id="is-break-checkbox" name="is_break" style="width:16px; height:16px;" />
          <i class="fa-solid fa-mug-hot" style="color:var(--color-warning);"></i> Ini jam istirahat
        </label>

        <div id="subject-field-group">
          <label class="input-label" style="margin-top:10px;">Mata Pelajaran</label>
          <input class="input" name="subject" id="subject-input" required />
        </div>

        <div id="teacher-room-fields">
          <label class="input-label" style="margin-top:10px;">Guru</label>
          <input class="input" name="teacher" />
          <label class="input-label" style="margin-top:10px;">Ruangan</label>
          <input class="input" name="room" />
        </div>

        <label class="input-label" style="margin-top:10px;">Materi / Catatan (opsional)</label>
        <textarea class="input" name="notes" rows="2" placeholder="Contoh: Bab 3 - Aljabar, atau catatan lain"></textarea>

        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-schedule" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  bindScheduleWeek('page-sched');

  const dialog = document.getElementById('add-schedule-dialog');
  const form = document.getElementById('add-schedule-form');
  const isBreakCheckbox = document.getElementById('is-break-checkbox');
  const subjectFieldGroup = document.getElementById('subject-field-group');
  const subjectInput = document.getElementById('subject-input');
  const teacherRoomFields = document.getElementById('teacher-room-fields');
  let editingId = null;

  function syncBreakFields() {
    const isBreak = isBreakCheckbox.checked;
    subjectInput.required = !isBreak;
    subjectInput.placeholder = isBreak ? 'Istirahat' : '';
    teacherRoomFields.style.display = isBreak ? 'none' : 'block';
    subjectFieldGroup.querySelector('.input-label').textContent = isBreak ? 'Label (opsional)' : 'Mata Pelajaran';
  }
  isBreakCheckbox?.addEventListener('change', syncBreakFields);

  document.getElementById('add-schedule-btn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    form.day_of_week.value = todayDbDay();
    syncBreakFields();
    dialog.showModal();
  });
  document.getElementById('cancel-add-schedule')?.addEventListener('click', () => dialog.close());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    payload.day_of_week = Number(payload.day_of_week);
    payload.is_break = isBreakCheckbox.checked;
    try {
      if (editingId) {
        await api.patch(`/api/schedule?id=${editingId}`, payload);
      } else {
        await api.post('/api/schedule', payload);
      }
      dialog.close();
      renderSchedulePage(container);
    } catch (err) {
      await showAlert(err.message);
    }
  });

  container.querySelectorAll('.copy-schedule-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = list.find(x => x.id === btn.dataset.id);
      if (!s) return;
      const newSubject = s.is_break ? (s.subject || 'Istirahat') : `${s.subject} (Copy)`;
      try {
        await api.post('/api/schedule', {
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          subject: newSubject,
          teacher: s.teacher,
          room: s.room,
          notes: s.notes,
          is_break: s.is_break,
        });
        showToast(`Jadwal "${newSubject}" berhasil ditambahkan (+1)`, { type: 'success' });
        renderSchedulePage(container);
      } catch (err) {
        showToast('Gagal menduplikat jadwal: ' + err.message, { type: 'danger' });
      }
    });
  });

  container.querySelectorAll('.edit-schedule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = list.find(x => x.id === btn.dataset.id);
      if (!s) return;
      editingId = s.id;
      form.day_of_week.value = s.day_of_week;
      form.start_time.value = s.start_time;
      form.end_time.value = s.end_time;
      form.subject.value = s.subject || '';
      form.teacher.value = s.teacher || '';
      form.room.value = s.room || '';
      form.notes.value = s.notes || '';
      isBreakCheckbox.checked = Boolean(s.is_break);
      syncBreakFields();
      dialog.showModal();
    });
  });

  container.querySelectorAll('.delete-schedule-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!(await showConfirm('Hapus jadwal ini?', { okText: 'Ya, hapus', danger: true }))) return;
      try {
        await api.delete(`/api/schedule?id=${btn.dataset.id}`);
        renderSchedulePage(container);
      } catch (err) {
        await showAlert(err.message);
      }
    });
  });
}
