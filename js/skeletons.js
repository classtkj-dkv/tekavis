// Skeleton loading — ditampilin sebentar pas halaman lagi ambil data, biar
// gak keliatan kosong/patah-patah. Bentuknya nyesuain kira-kira layout asli
// tiap halaman (banner buat beranda, tabel buat data siswa, dst).

function repeat(html, n) {
  return Array.from({ length: n }, () => html).join('');
}

const dashboardSkeleton = () => `
  <div class="skel skel-banner"></div>
  <div class="skel skel-title"></div>
  <div class="skel-grid">${repeat('<div class="skel skel-card"></div>', 4)}</div>
  <div class="skel skel-line" style="width:30%; height:18px; margin-bottom:14px;"></div>
  ${repeat('<div class="skel skel-row"></div>', 2)}
  <div class="skel skel-line" style="width:30%; height:18px; margin:18px 0 14px;"></div>
  <div class="skel-grid">${repeat('<div class="skel skel-card" style="height:140px;"></div>', 4)}</div>
  <div class="skel skel-line" style="width:30%; height:18px; margin-bottom:14px;"></div>
  ${repeat('<div class="skel-flex-row"><div class="skel skel-circle"></div><div class="skel skel-line" style="flex:1;"></div></div>', 4)}
`;

const tableSkeleton = () => `
  <div class="skel skel-title"></div>
  <div class="card">
    ${repeat('<div class="skel-flex-row"><div class="skel skel-circle"></div><div class="skel skel-line" style="flex:1;"></div></div>', 6)}
  </div>
`;

const cardsSkeleton = () => `
  <div class="skel skel-title"></div>
  <div class="skel-grid">${repeat('<div class="skel skel-card" style="height:140px;"></div>', 6)}</div>
`;

const genericSkeleton = () => `
  <div class="skel skel-title"></div>
  ${repeat('<div class="skel skel-line"></div>', 4)}
`;

const SKELETON_BY_PATH = {
  '/': dashboardSkeleton,
  '/students': tableSkeleton,
  '/schedule': tableSkeleton,
  '/announcements': tableSkeleton,
  '/finance': tableSkeleton,
  '/users': tableSkeleton,
  '/roles': tableSkeleton,
  '/albums': cardsSkeleton,
  '/struktur': cardsSkeleton,
};

export function getSkeleton(pathname) {
  const factory = SKELETON_BY_PATH[pathname] || genericSkeleton;
  return factory();
}
