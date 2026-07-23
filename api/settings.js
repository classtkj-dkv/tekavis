import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, forbidden, badRequest, serverError } from './_lib/response.js';

const BACKUP_TABLES = [
  'roles', 'profiles', 'students', 'albums', 'photos',
  'announcements', 'schedules', 'finance_transactions',
  'notifications', 'site_settings',
];
const RESTORE_ORDER = BACKUP_TABLES;

// GET   /api/settings                 -> site settings
// PATCH /api/settings                 -> update settings (Owner)
// GET   /api/settings?action=backup   -> unduh seluruh isi tabel sebagai JSON (Owner)
// POST  /api/settings?action=restore  -> timpa data dari JSON backup (Owner)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { action } = req.query;

  try {
    if (req.method === 'GET' && action === 'backup') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat melakukan backup');
      const backup = { generated_at: new Date().toISOString(), tables: {} };
      for (const table of BACKUP_TABLES) {
        const { data, error } = await admin.from(table).select('*');
        if (error) throw error;
        backup.tables[table] = data;
      }
      await logActivity(req, ctx, { action: 'backup_database' });
      res.setHeader('Content-Disposition', `attachment; filename="kelas-cms-backup-${Date.now()}.json"`);
      return ok(res, backup);
    }

    if (req.method === 'POST' && action === 'restore') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat melakukan restore');
      const { tables } = req.body || {};
      if (!tables || typeof tables !== 'object') return badRequest(res, 'Format backup tidak valid');

      const results = {};
      for (const table of RESTORE_ORDER) {
        const rows = tables[table];
        if (!Array.isArray(rows)) continue;

        if (table === 'site_settings') {
          if (rows[0]) {
            const { error } = await admin.from('site_settings').update(rows[0]).eq('id', 1);
            if (error) throw error;
          }
          results[table] = 1;
          continue;
        }

        const { error: delError } = await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delError) throw delError;
        if (rows.length > 0) {
          const { error: insError } = await admin.from(table).insert(rows);
          if (insError) throw insError;
        }
        results[table] = rows.length;
      }
      await logActivity(req, ctx, { action: 'restore_database', meta: results });
      return ok(res, { restored: results });
    }

    if (req.method === 'GET') {
      const { data, error } = await admin.from('site_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'PATCH') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat mengubah pengaturan website');
      const allowed = ['site_name', 'logo_url', 'favicon_url', 'footer_text', 'theme', 'homepage', 'contact', 'social_media'];
      const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
      const { data, error } = await admin.from('site_settings').update(patch).eq('id', 1).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_settings', targetTable: 'site_settings', targetId: '1' });
      return ok(res, data);
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
