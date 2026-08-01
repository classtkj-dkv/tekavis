import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, badRequest, forbidden, serverError } from './_lib/response.js';

const STATUSES = ['hadir', 'izin', 'sakit', 'alpa'];
const todayStr = () => new Date().toISOString().slice(0, 10);

function emptyTotals() {
  return { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 };
}

// GET    /api/attendance?date=YYYY-MM-DD                          -> status semua siswa di 1 tanggal (buat grid absen). Login wajib, siapapun boleh lihat KECUALI role Pengunjung.
// GET    /api/attendance?resource=recap&from=...&to=...&student_ids=id1,id2  -> rekap total per siswa dalam rentang tanggal (kosongkan student_ids buat semua siswa)
// GET    /api/attendance?resource=summary&student_id=...          -> total sepanjang waktu 1 siswa (dipakai di profil)
// POST   /api/attendance                                          -> simpan absensi 1 hari sekaligus (manage_attendance). body: { date, marks: [{student_id, status}] }
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { resource } = req.query;

  // Role "Pengunjung" login-nya diizinkan buat fitur lain, tapi sengaja
  // dikecualikan dari absensi (baca maupun tulis) sesuai permintaan Owner.
  if (ctx.profile?.roles?.name === 'pengunjung') {
    return forbidden(res, 'Role Pengunjung tidak memiliki akses ke data absensi');
  }

  try {
    if (req.method === 'GET' && resource === 'summary') {
      const { student_id } = req.query;
      if (!student_id) return badRequest(res, 'Parameter student_id wajib diisi');
      const { data, error } = await admin.from('attendance').select('status').eq('student_id', student_id);
      if (error) throw error;
      const totals = emptyTotals();
      data.forEach(r => { totals[r.status] += 1; totals.total += 1; });
      return ok(res, totals);
    }

    if (req.method === 'GET' && resource === 'recap') {
      const { from, to, student_ids } = req.query;
      if (!from || !to) return badRequest(res, 'Parameter from & to (tanggal) wajib diisi');

      let studentQuery = admin.from('students').select('id, name, major').order('name');
      if (student_ids) studentQuery = studentQuery.in('id', student_ids.split(',').filter(Boolean));
      const { data: students, error: studentsErr } = await studentQuery;
      if (studentsErr) throw studentsErr;

      let attQuery = admin.from('attendance').select('student_id, status').gte('attendance_date', from).lte('attendance_date', to);
      if (student_ids) attQuery = attQuery.in('student_id', student_ids.split(',').filter(Boolean));
      const { data: rows, error: attErr } = await attQuery;
      if (attErr) throw attErr;

      const totalsByStudent = {};
      students.forEach(s => { totalsByStudent[s.id] = { student_id: s.id, name: s.name, major: s.major, ...emptyTotals() }; });
      rows.forEach(r => {
        if (!totalsByStudent[r.student_id]) return;
        totalsByStudent[r.student_id][r.status] += 1;
        totalsByStudent[r.student_id].total += 1;
      });
      return ok(res, { from, to, recap: Object.values(totalsByStudent) });
    }

    if (req.method === 'GET') {
      const date = req.query.date || todayStr();
      const { data: students, error: studentsErr } = await admin.from('students').select('id, name, photo_url, major').order('name');
      if (studentsErr) throw studentsErr;
      const { data: rows, error } = await admin.from('attendance').select('student_id, status, note').eq('attendance_date', date);
      if (error) throw error;
      const marks = {};
      rows.forEach(r => { marks[r.student_id] = { status: r.status, note: r.note }; });
      return ok(res, { date, students, marks });
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'manage_attendance');
      const { date, marks } = req.body || {};
      if (!date || !Array.isArray(marks) || !marks.length) return badRequest(res, 'date dan marks wajib diisi');
      for (const m of marks) {
        if (!m.student_id || !STATUSES.includes(m.status)) return badRequest(res, 'Setiap mark butuh student_id & status yang valid');
      }
      const payload = marks.map(m => ({
        student_id: m.student_id,
        attendance_date: date,
        status: m.status,
        note: m.note || null,
        recorded_by: ctx.profile.id,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await admin.from('attendance').upsert(payload, { onConflict: 'student_id,attendance_date' });
      if (error) throw error;
      await logActivity(req, ctx, { action: 'record_attendance', targetTable: 'attendance', meta: { date, count: marks.length } });
      return ok(res, { saved: marks.length });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
