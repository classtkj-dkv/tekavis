import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { optionalAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { isPublicResource } from './_lib/visibility.js';
import { ok, created, badRequest, serverError, unauthorized } from './_lib/response.js';

// GET    /api/schedule          -> semua jadwal (publik, kecuali Owner set privat)
// POST   /api/schedule          -> tambah jadwal (manage_schedule)
// PATCH  /api/schedule?id=...   -> edit jadwal (manage_schedule)
// DELETE /api/schedule?id=...   -> hapus jadwal (manage_schedule)
export default optionalAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      if (!ctx.profile && !(await isPublicResource(admin, 'schedule'))) {
        return unauthorized(res, 'Jadwal hanya untuk anggota yang login');
      }
      const { data, error } = await admin
        .from('schedules')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'manage_schedule');
      const { day_of_week, start_time, end_time, subject, teacher, room, is_break, notes } = req.body || {};
      if (!day_of_week || !start_time || !end_time || (!subject && !is_break)) {
        return badRequest(res, 'Hari, jam mulai/selesai wajib diisi, dan mata pelajaran wajib diisi kecuali untuk jam istirahat');
      }
      const { data, error } = await admin
        .from('schedules')
        .insert({
          day_of_week,
          start_time,
          end_time,
          subject: is_break ? (subject || 'Istirahat') : subject,
          teacher: is_break ? null : teacher,
          room: is_break ? null : room,
          is_break: Boolean(is_break),
          notes: notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'create_schedule', targetTable: 'schedules', targetId: data.id });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      requirePermission(ctx, 'manage_schedule');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { data, error } = await admin.from('schedules').update(req.body || {}).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_schedule', targetTable: 'schedules', targetId: id });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      requirePermission(ctx, 'manage_schedule');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { error } = await admin.from('schedules').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_schedule', targetTable: 'schedules', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
