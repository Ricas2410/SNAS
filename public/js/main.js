// Toggle Sidebar on mobile
document.getElementById('sidebarToggle').addEventListener('click', function () {
  const sidebar = document.getElementById('sidebar');
  const content = document.getElementById('content');
  sidebar.classList.toggle('active');
  content.classList.toggle('active');
  const icon = this.querySelector('i');
  if (sidebar.classList.contains('active')) {
      icon.classList.remove('fa-chevron-right');
      icon.classList.add('fa-chevron-left');
  } else {
      icon.classList.remove('fa-chevron-left');
      icon.classList.add('fa-chevron-right');
  }
});

// Show selected section and hide others
document.querySelectorAll('#sidebar .nav-link').forEach(function (link) {
  link.addEventListener('click', function (e) {
      e.preventDefault();
      // Hide all content sections
      document.querySelectorAll('.content-section').forEach(function (section) {
          section.classList.add('d-none');
      });
      // Show selected content section
      const sectionId = this.getAttribute('data-section');
      if (sectionId) {
          document.getElementById(sectionId).classList.remove('d-none');
      }
      // Automatically hide sidebar on mobile after a link is clicked
      if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('active');
          document.getElementById('content').classList.remove('active');
          document.querySelector('#sidebarToggle i').classList.remove('fa-chevron-left');
          document.querySelector('#sidebarToggle i').classList.add('fa-chevron-right');
      }
  });
});

// Display 'Your Classes' section by default on page load
document.getElementById('classesSection').classList.remove('d-none');


