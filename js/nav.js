// js/nav.js - Shared navigation component

function renderNav(currentPage) {
  const user = Storage.getCurrentUser();
  const isLoggedIn = !!user;
  const username = user?.user_metadata?.username || 'User';

  const sidebarLinks = [
    { id: 'library', href: '/', label: 'Library', icon: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>' },
    { id: 'favorites', href: '/favorites.html', label: 'Favorites', icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' },
    { id: 'history', href: '/history.html', label: 'History', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
    { id: 'profile', href: '/profile.html', label: 'Profile', icon: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  ];

  const sidebarLinksHtml = sidebarLinks.map(link => `
    <a href="${link.href}" class="sidebar-link ${currentPage === link.id ? 'active' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${link.icon}</svg>
      ${link.label}
    </a>
  `).join('');

  const sidebarAuthHtml = isLoggedIn ? `
    <div class="sidebar-user">
      <div class="sidebar-avatar">${username.charAt(0).toUpperCase()}</div>
      <div class="sidebar-user-info">
        <span class="sidebar-username">${username}</span>
      </div>
      <button class="sidebar-logout" onclick="handleLogout()" title="Logout" aria-label="Logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  ` : `
    <a href="/login.html" class="sidebar-login-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      Login / Sign Up
    </a>
  `;

  const bottomNavLinks = [
    { id: 'library', href: '/', label: 'Library', icon: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>' },
    { id: 'favorites', href: '/favorites.html', label: 'Favorites', icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' },
    { id: 'profile', href: '/profile.html', label: 'Profile', icon: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  ];

  const bottomNavHtml = bottomNavLinks.map(link => `
    <a href="${link.href}" class="bottomnav-item ${currentPage === link.id ? 'active' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${link.icon}</svg>
      ${link.label}
    </a>
  `).join('');

  // Update sidebar nav
  const sidebarNav = document.querySelector('.sidebar-nav');
  if (sidebarNav) sidebarNav.innerHTML = sidebarLinksHtml;

  // Update sidebar auth area (insert before theme-toggle)
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    // Remove old user/login elements
    const oldUser = document.querySelector('.sidebar-user');
    const oldLogin = document.querySelector('.sidebar-login-btn');
    if (oldUser) oldUser.remove();
    if (oldLogin) oldLogin.remove();
    themeToggle.insertAdjacentHTML('beforebegin', sidebarAuthHtml);
  }

  // Update bottom nav
  const bottomNav = document.querySelector('.bottomnav');
  if (bottomNav) bottomNav.innerHTML = bottomNavHtml;
}

async function handleLogout() {
  await Storage.logout();
  window.location.href = '/';
}

// Initialize nav when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || 'library';
  renderNav(page);
});

// Mobile sidebar toggle
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) {
    sidebar.classList.toggle('open');
    if (overlay) {
      overlay.classList.toggle('active', sidebar.classList.contains('open'));
    }
  }
}

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
  const sidebar = document.querySelector('.sidebar');
  const hamburger = document.querySelector('.hamburger-btn');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar && sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) && !hamburger?.contains(e.target)) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }
});

// Swipe-to-close on sidebar for touch devices
(function() {
  let startX = 0;
  let swiping = false;

  document.addEventListener('touchstart', (e) => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      startX = e.touches[0].clientX;
      swiping = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX;
    if (diff < -50) {
      swiping = false;
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }
  }, { passive: true });

  document.addEventListener('touchend', () => { swiping = false; }, { passive: true });
})();
