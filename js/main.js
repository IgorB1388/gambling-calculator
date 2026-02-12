document.addEventListener('DOMContentLoaded', function() {
    console.log('GTA Casino Tools loaded');
    
    // подсветка активной страницы в меню
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});
