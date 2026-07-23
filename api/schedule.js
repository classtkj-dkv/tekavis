import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, badRequest, serverError } from './_lib/response.js';

// GET    /api/schedule          -> semua jadwal
// POST   /api/schedule          -> tambah jadwal (manage_schedule)
// PATCH  /api/schedule?id=...   -> edit jadwal (manage_schedule)
// DELETE /api/schedule?id=...   -> hapus jadwal (manage_schedule)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
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
      const { day_of_week, start_time, end_time, subject, teacher, room } = req.body || {};
      if (!day_of_week || !start_time || !end_time || !subject) {
        return badRequest(res, 'Hari, jam mulai/selesai, dan mata pelajaran wajib diisi');
      }
      const { data, error } = await admin
        .from('schedules')
        .insert({ day_of_week, start_time, end_time, subject, teacher, room })
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
