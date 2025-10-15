window.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const toggle  = document.getElementById('menu-toggle');
  const menuItems = document.querySelectorAll('.menu-item');
  const contents = document.querySelectorAll('.tab-content');

  // Activate tab function
  function activateTab(id) {
    menuItems.forEach(item => {
      item.classList.toggle('active', item.dataset.id === id);
    });

    contents.forEach(content => {
      content.classList.toggle('active', content.dataset.id === id);
    });

    localStorage.setItem('activeTab', id);
  }

  // Click on menu items
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      activateTab(item.dataset.id);
    });
  });

  // Load saved tab or default
  const saved = localStorage.getItem('activeTab') || 'play';
  activateTab(saved);

  // Sidebar toggle
  if (window.matchMedia('(max-width: 900px)').matches) {
    sidebar.classList.add('collapsed');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
});
