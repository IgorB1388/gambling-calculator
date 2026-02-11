// theme-switcher.js - Система смены тем GTA Casino Tools

class ThemeManager {
    constructor() {
        this.themes = ['vice-city', 'san-andreas', 'gta4'];
        this.themeNames = {
            'vice-city': 'Vice City',
            'san-andreas': 'San Andreas', 
            'gta4': 'GTA 4'
        };
        this.currentTheme = this.getSavedTheme() || 'vice-city';
        this.themeLink = null;
    }
    
    getSavedTheme() {
        return localStorage.getItem('gta-casino-theme');
    }
    
    saveTheme(theme) {
        localStorage.setItem('gta-casino-theme', theme);
    }
    
    loadThemeCSS(theme) {
        console.log(`Загружаем тему: ${theme}`);
        
        // Удаляем старую тему, если есть
        const oldThemeLink = document.getElementById('theme-style');
        if (oldThemeLink) {
            oldThemeLink.remove();
        }
        
        // Создаем новую ссылку на CSS темы
        const link = document.createElement('link');
        link.id = 'theme-style';
        link.rel = 'stylesheet';
        link.href = `${theme}-theme.css`;
        document.head.appendChild(link);
        
        this.themeLink = link;
        this.currentTheme = theme;
        this.saveTheme(theme);
        
        // Обновляем кнопки
        this.updateThemeButtons();
        
        // Обновляем класс body для специфичных стилей
        this.updateBodyClass(theme);
        
        // Отправляем событие о смене темы
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
    }
    
    updateBodyClass(theme) {
        // Удаляем старые классы тем
        document.body.classList.remove(...this.themes);
        document.body.classList.add(theme);
    }
    
    updateThemeButtons() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            const theme = btn.dataset.theme;
            const isActive = theme === this.currentTheme;
            btn.classList.toggle('active', isActive);
            
            // Обновляем подсказку
            btn.title = this.themeNames[theme] + (isActive ? ' ✓' : '');
        });
    }
    
    addThemeSwitcherToHeader() {
        const header = document.querySelector('.header-content');
        if (!header) return;
        
        // Проверяем, нет ли уже переключателя тем
        if (document.querySelector('.theme-switcher')) return;
        
        const themeSwitcher = document.createElement('div');
        themeSwitcher.className = 'theme-switcher';
        themeSwitcher.innerHTML = `
            <button class="theme-btn active" data-theme="vice-city" title="Vice City">
                <i class="fas fa-palette"></i>
            </button>
            <button class="theme-btn" data-theme="san-andreas" title="San Andreas">
                <i class="fas fa-sun"></i>
            </button>
            <button class="theme-btn" data-theme="gta4" title="GTA 4">
                <i class="fas fa-building"></i>
            </button>
        `;
        
        // Вставляем после языкового переключателя
        const langSwitcher = document.querySelector('.language-switcher-header');
        if (langSwitcher) {
            langSwitcher.parentNode.insertBefore(themeSwitcher, langSwitcher.nextSibling);
        } else {
            // Или в конец header-content
            header.appendChild(themeSwitcher);
        }
        
        // Добавляем обработчики
        themeSwitcher.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const theme = btn.dataset.theme;
                this.loadThemeCSS(theme);
            });
        });
    }
    
    init() {
        // Добавляем переключатель тем в шапку
        this.addThemeSwitcherToHeader();
        
        // Загружаем сохраненную тему
        this.loadThemeCSS(this.currentTheme);
        
        // Для динамически загруженных страниц
        const observer = new MutationObserver(() => {
            this.addThemeSwitcherToHeader();
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const themeManager = new ThemeManager();
    themeManager.init();
    window.themeManager = themeManager;
    
    console.log('Theme Manager initialized');
});
