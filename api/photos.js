import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { uploadImage, deleteImage } from './_lib/cloudinary.js';
import { requireAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, notFound, badRequest, serverError } from './_lib/response.js';

// GET    /api/photos?id=...    -> detail foto (metadata lengkap dari DB, bukan dari Cloudinary)
// POST   /api/photos           -> upload foto baru (upload_album) — body termasuk file base64
// PATCH  /api/photos?id=...    -> edit metadata foto (manage_gallery)
// DELETE /api/photos?id=...    -> hapus foto dari Cloudinary + DB (manage_gallery)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { data, error } = await admin
        .from('photos')
        .select('id, url, name, description, category, tags, location, taken_or_uploaded_at, album_id, uploaded_by, albums(name, year, month)')
        .eq('id', id)
        .single();
      if (error || !data) return notFound(res);
      return ok(res, data);
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'upload_album');
      const { file, album_id, name, category, tags, location, description, taken_or_uploaded_at } = req.body || {};
      if (!file || !album_id || !name) return badRequest(res, 'File, album, dan nama foto wajib diisi');

      const uploadResult = await uploadImage(file, { folder: `kelas-cms/albums/${album_id}` });

      const { data, error } = await admin
        .from('photos')
        .insert({
          album_id,
          cloudinary_public_id: uploadResult.publicId,
          url: uploadResult.url,
          name,
          category: category || null,
          tags: tags || [],
          location: location || null,
          description: description || null,
          taken_or_uploaded_at: taken_or_uploaded_at || new Date().toISOString().slice(0, 10),
          uploaded_by: ctx.profile.id,
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity(req, ctx, { action: 'upload_photo', targetTable: 'photos', targetId: data.id, meta: { album_id } });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      requirePermission(ctx, 'manage_gallery');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const allowed = ['name', 'description', 'category', 'tags', 'location', 'taken_or_uploaded_at'];
      const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
      const { data, error } = await admin.from('photos').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_photo', targetTable: 'photos', targetId: id });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      requirePermission(ctx, 'manage_gallery');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { data: photo } = await admin.from('photos').select('cloudinary_public_id').eq('id', id).single();
      if (photo?.cloudinary_public_id) await deleteImage(photo.cloudinary_public_id);
      const { error } = await admin.from('photos').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_photo', targetTable: 'photos', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
