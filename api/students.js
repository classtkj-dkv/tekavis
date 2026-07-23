import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, badRequest, serverError } from './_lib/response.js';

// GET    /api/students          -> daftar siswa
// POST   /api/students          -> tambah siswa (manage_students)
// PATCH  /api/students?id=...   -> edit siswa (manage_students)
// DELETE /api/students?id=...   -> hapus siswa (manage_students)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const { data, error } = await admin.from('students').select('*').order('name', { ascending: true });
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'manage_students');
      const { name, birth_place, birth_date, major, nisn } = req.body || {};
      if (!name || !birth_place || !birth_date || !major) {
        return badRequest(res, 'Nama, tempat lahir, tanggal lahir, dan jurusan wajib diisi');
      }
      const { data, error } = await admin
        .from('students')
        .insert({ name, birth_place, birth_date, major, nisn: nisn || null })
        .select()
        .single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'create_student', targetTable: 'students', targetId: data.id });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      requirePermission(ctx, 'manage_students');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { data, error } = await admin.from('students').update(req.body || {}).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_student', targetTable: 'students', targetId: id });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      requirePermission(ctx, 'manage_students');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { error } = await admin.from('students').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_student', targetTable: 'students', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
