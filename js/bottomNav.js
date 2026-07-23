import { getMenuForRole } from './sidebar.js';

// Bottom navigation mobile: ambil maksimal 4 menu utama + tombol "Lainnya"
export function renderBottomNav(role) {
  const menu = getMenuForRole(role).slice(0, 4);
  const currentPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

  const items = menu.map(item => `
    <a href="#${item.path}" class="bottom-nav-link ${currentPath === item.path ? 'active' : ''}">
      <span>${item.label}</span>
    </a>
  `).join('');

  return `<nav class="bottom-nav">${items}</nav>`;
}
