// header-loader.js - Загрузка шапки сайта
function loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = '<div class="header-loading">Загрузка...</div>';
    }
    
    fetch('header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            // Вставляем шапку
            headerPlaceholder.innerHTML = html;
            
            // После загрузки шапки обновляем активный пункт меню
            setActiveNavItem();
            
            // Инициализируем переключатель языков
            initHeaderLanguageSwitcher();
            
            // Применяем переводы к шапке
            reloadTranslationsForNewContent(headerPlaceholder);

            // Добавляем дорожную разметку для SA темы
            if (!document.querySelector('.road-marking')) {
                document.body.insertAdjacentHTML('beforeend', '<div class="road-marking"></div>');
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки шапки:', error);
            headerPlaceholder.innerHTML = '<div class="header-error">Ошибка загрузки шапки</div>';
        });
}

// Функция для подсветки активного пункта меню
function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-list a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.remove('active', 'nav-link-active');
        
        if (href === currentPage) {
            link.classList.add('active', 'nav-link-active');
        }
    });
}

// Функция для инициализации переключателя языков в шапке
function initHeaderLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.lang-btn');
    
    langButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const lang = this.getAttribute('data-lang');
            
            if (typeof changeLanguage === 'function') {
                changeLanguage(lang);
            } else {
                console.warn('Функция changeLanguage не найдена');
                localStorage.setItem('preferred-language', lang);
                window.location.reload();
            }
        });
    });
}

// Загружаем шапку когда DOM готов
document.addEventListener('DOMContentLoaded', loadHeader);
