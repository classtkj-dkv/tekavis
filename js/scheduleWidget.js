// Komponen jadwal mingguan yang bisa digeser per hari — dipakai bareng di
// dashboard (preview, read-only) dan halaman Jadwal penuh (bisa dikelola).
// Satu hari = satu kartu/slide, semua jam di hari itu digabung jadi satu
// tabel (bukan kotak terpisah per jam). Otomatis kebuka di hari ini, tinggal
// digeser ke kiri/kanan buat liat hari lain.

export const DAY_NAMES = ['', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_SHORT = ['', 'Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export function todayDbDay() {
  return new Date().getDay() + 1; // JS: 0=Minggu..6=Sabtu -> DB: 1=Minggu..7=Sabtu
}

function scheduleRowHtml(s, canManage) {
  if (s.is_break) {
    return `
      <tr class="schedule-break-row">
        <td>${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}</td>
        <td colspan="3"><span class="badge badge-draft"><i class="fa-solid fa-mug-hot"></i> ${s.subject || 'Istirahat'}</span> ${s.notes ? `<span style="color:var(--color-text-muted); font-size:12px;">— ${s.notes}</span>` : ''}</td>
        ${canManage ? `<td style="white-space:nowrap;">
          <button class="icon-btn copy-schedule-btn" data-id="${s.id}" title="Duplikat"><i class="fa-solid fa-copy"></i></button>
          <button class="icon-btn edit-schedule-btn" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn delete-schedule-btn" data-id="${s.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </td>` : ''}
      </tr>
    `;
  }
  return `
    <tr>
      <td>${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}</td>
      <td>${s.subject}${s.notes ? `<div style="font-size:12px; color:var(--color-text-muted); margin-top:2px;">${s.notes}</div>` : ''}</td>
      <td>${s.teacher || '-'}</td>
      <td>${s.room || '-'}</td>
      ${canManage ? `<td style="white-space:nowrap;">
        <button class="icon-btn copy-schedule-btn" data-id="${s.id}" title="Duplikat"><i class="fa-solid fa-copy"></i></button>
        <button class="icon-btn edit-schedule-btn" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn delete-schedule-btn" data-id="${s.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </td>` : ''}
    </tr>
  `;
}

export function renderScheduleWeek(schedule, { canManage = false, idPrefix = 'sw' } = {}) {
  const byDay = {};
  schedule.forEach(s => {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  });
  Object.values(byDay).forEach(list => list.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')));

  const tabs = ALL_DAYS.map(d => `<button type="button" class="day-tab" data-day="${d}">${DAY_SHORT[d]}</button>`).join('');

  const slides = ALL_DAYS.map(d => {
    const items = byDay[d] || [];
    const body = items.length
      ? `<div class="table-wrapper"><table class="table">
          <thead><tr><th>Jam</th><th>Mapel / Kegiatan</th><th>Guru</th><th>Ruangan</th>${canManage ? '<th>Aksi</th>' : ''}</tr></thead>
          <tbody>${items.map(s => scheduleRowHtml(s, canManage)).join('')}</tbody>
        </table></div>`
      : `<div class="empty-state">Belum ada jadwal hari ${DAY_NAMES[d]}.</div>`;
    return `<div class="day-slide" data-day="${d}">${body}</div>`;
  }).join('');

  return `
    <div class="schedule-week" id="${idPrefix}-week">
      <div class="day-tabs" id="${idPrefix}-tabs">${tabs}</div>
      <div class="day-track" id="${idPrefix}-track">${slides}</div>
    </div>
  `;
}

export function bindScheduleWeek(idPrefix = 'sw') {
  const track = document.getElementById(`${idPrefix}-track`);
  if (!track) return;
  const tabs = Array.from(document.querySelectorAll(`#${idPrefix}-tabs .day-tab`));

  function setActiveTab(day) {
    tabs.forEach(t => t.classList.toggle('active', Number(t.dataset.day) === day));
  }

  function scrollToDay(day, smooth = true) {
    const idx = ALL_DAYS.indexOf(day);
    track.scrollTo({ left: track.clientWidth * idx, behavior: smooth ? 'smooth' : 'auto' });
    setActiveTab(day);
  }

  // Langsung buka di hari ini tanpa animasi (biar gak keliatan "geser" pas baru buka)
  scrollToDay(todayDbDay(), false);

  track.addEventListener('scroll', () => {
    clearTimeout(track._scrollTimer);
    track._scrollTimer = setTimeout(() => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      setActiveTab(ALL_DAYS[idx] ?? todayDbDay());
    }, 80);
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => scrollToDay(Number(tab.dataset.day)));
  });
}
