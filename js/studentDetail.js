// Kartu detail profil siswa — dipanggil pas tombol titik-tiga (⋮) di kartu
// siswa ditekan. Field yang tampil udah DITENTUKAN SERVER (api/students.js)
// sesuai level akses viewer — guest paling terbatas, pengunjung menengah,
// member (siswa/pengurus/admin/owner) full. Di sini tinggal render apa yang
// dikirim, gak perlu logic tier lagi.

export function studentDetailDialogHtml(idPrefix = 'sd') {
  return `
    <dialog id="${idPrefix}-detail-dialog" class="modal id-card-modal">
      <div class="modal-content" id="${idPrefix}-detail-body" style="padding:0;"></div>
    </dialog>
  `;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function openStudentDetail(idPrefix, student, footerText = 'Class Tekavis', showAttendance = false) {
  const dialog = document.getElementById(`${idPrefix}-detail-dialog`);
  const body = document.getElementById(`${idPrefix}-detail-body`);
  if (!dialog || !body) return;

  const p = student.profiles || {};
  const hasBirthDate = Boolean(student.birth_date);
  const hasBirthPlace = Boolean(student.birth_place);
  const hasNisn = Boolean(student.nisn);

  const rows = [
    ['🏷️', 'Nama', student.name],
    hasBirthDate ? ['🎂', 'TTL', `${student.birth_place || '-'}, ${formatDate(student.birth_date)}`] : (hasBirthPlace ? ['🎂', 'Asal', student.birth_place] : null),
    hasNisn ? ['🔢', 'NISN', student.nisn] : null,
    student.major ? ['💻', 'Jurusan', student.major] : null,
    p.hobby ? ['🎮', 'Hobi', p.hobby] : null,
    p.dream_job ? ['🚀', 'Cita-cita', p.dream_job] : null,
  ].filter(Boolean);

  body.innerHTML = `
    <div class="id-card-photo" style="${student.photo_url ? `background-image:url('${student.photo_url}')` : ''}">
      ${!student.photo_url ? `<span>${(student.name || '?').trim().slice(0, 1).toUpperCase()}</span>` : ''}
      ${student.major ? `<span class="id-card-major-badge">${student.major}</span>` : ''}
      <button type="button" class="icon-btn id-card-close" onclick="this.closest('dialog').close()" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.4); color:#fff;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="id-card-body">
      <dl class="id-card-fields">
        ${rows.map(([icon, label, value]) => `
          <div class="id-card-row">
            <dt>${icon} ${label}</dt>
            <dd>${value}</dd>
          </div>
        `).join('')}
      </dl>
      ${showAttendance ? `<div id="${idPrefix}-att-summary" class="id-card-attendance">Memuat absensi...</div>` : ''}
    </div>
    <div class="id-card-footer">🆔 ${footerText}</div>
  `;
  dialog.showModal();

  if (showAttendance) {
    const { api } = await import('./apiClient.js');
    const totals = await api.get('/api/attendance', { resource: 'summary', student_id: student.id }).catch(() => null);
    const slot = document.getElementById(`${idPrefix}-att-summary`);
    if (slot && totals) {
      slot.innerHTML = `
        <div class="id-card-att-item"><span class="id-card-att-value" style="color:var(--color-success);">${totals.hadir}</span><span>Hadir</span></div>
        <div class="id-card-att-item"><span class="id-card-att-value" style="color:var(--color-warning);">${totals.izin}</span><span>Izin</span></div>
        <div class="id-card-att-item"><span class="id-card-att-value" style="color:var(--color-info);">${totals.sakit}</span><span>Sakit</span></div>
        <div class="id-card-att-item"><span class="id-card-att-value" style="color:var(--color-danger);">${totals.alpa}</span><span>Alpa</span></div>
      `;
    } else if (slot) {
      slot.remove();
    }
  }
}

export function bindStudentDetailClicks(containerSelector, students, idPrefix = 'sd', footerText, showAttendance = false) {
  document.querySelectorAll(containerSelector).forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const student = students.find(s => s.id === trigger.dataset.id);
      if (student) openStudentDetail(idPrefix, student, footerText, showAttendance);
    });
  });
}
