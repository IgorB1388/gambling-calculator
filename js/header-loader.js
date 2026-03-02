// header-loader.js - Загрузка шапки сайта

function loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    
    // Показываем заглушку пока грузится шапка (опционально)
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
        })
        .catch(error => {
            console.error('Ошибка загрузки шапки:', error);
            headerPlaceholder.innerHTML = '<div class="header-error">Ошибка загрузки шапки</div>';
        });
}

// Функция для подсветки активного пункта меню
function setActiveNavItem() {
    // Получаем текущую страницу из URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Находим все ссылки в навигации
    const navLinks = document.querySelectorAll('.nav-list a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Убираем активный класс у всех
        link.classList.remove('active', 'nav-link-active');
        
        // Добавляем активный класс текущей странице
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
            
            // Здесь вызываем функцию смены языка из language.js
            if (typeof changeLanguage === 'function') {
                changeLanguage(lang);
            } else {
                console.warn('Функция changeLanguage не найдена');
                // Альтернативное сохранение языка
                localStorage.setItem('preferred-language', lang);
                window.location.reload();
            }
        });
    });
}

// Загружаем шапку когда DOM готов
document.addEventListener('DOMContentLoaded', loadHeader);
