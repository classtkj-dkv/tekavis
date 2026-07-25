// Default: semua publik KECUALI Kas (finance), sesuai permintaan — cuma Kas
// yang wajib login. Owner bisa ubah semuanya lewat Pengaturan Website
// (kolom site_settings.visibility), jadi ini cuma fallback kalau kolomnya
// masih kosong / belum pernah diisi Owner.
export const DEFAULT_VISIBILITY = {
  students: true,
  schedule: true,
  announcements: true,
  albums: true,
  struktur: true,
  finance: false,
};

export async function getVisibility(admin) {
  const { data } = await admin.from('site_settings').select('visibility').eq('id', 1).single();
  return { ...DEFAULT_VISIBILITY, ...(data?.visibility || {}) };
}

export async function isPublicResource(admin, key) {
  const visibility = await getVisibility(admin);
  return visibility[key] !== false;
}
