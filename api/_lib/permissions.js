/**
 * Sistem permission dinamis: setiap role punya kolom `permissions` (JSON)
 * berisi daftar key permission, misal:
 * { "edit_profile_photo": true, "view_kas": true, "upload_album": false }
 *
 * Owner selalu lolos semua pengecekan permission.
 */
export function hasPermission(ctx, permissionKey) {
  if (!ctx?.profile) return false;

  const roleName = ctx.profile.roles?.name;
  if (roleName === 'owner') return true;

  const permissions = ctx.profile.roles?.permissions || {};
  return Boolean(permissions[permissionKey]);
}

export function requirePermission(ctx, permissionKey) {
  if (!hasPermission(ctx, permissionKey)) {
    const err = new Error(`Tidak memiliki izin: ${permissionKey}`);
    err.statusCode = 403;
    throw err;
  }
}

export function isRole(ctx, ...roleNames) {
  const roleName = ctx?.profile?.roles?.name;
  return roleNames.includes(roleName);
}
