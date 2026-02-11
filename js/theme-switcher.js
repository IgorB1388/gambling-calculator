// theme-switcher.js - Система смены тем GTA Casino Tools

class ThemeManager {
    constructor() {
        this.themes = ['base', 'vice-city', 'san-andreas', 'gta4'];
        this.themeNames = {
            'base': 'Неон (базовый)',
            'vice-city': 'Vice City',
            'san-andreas': 'San Andreas', 
            'gta4': 'GTA 4'
        };
        this.currentTheme = this.getSavedTheme() || 'base';
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
        
        // Проверяем, что base.css загружен
        if (!document.querySelector('link[href="base.css"]')) {
            console.error('base.css не найден!');
            return;
        }
        
        // Удаляем старую тему
        const oldThemeLink = document.getElementById('theme-style');
        if (oldThemeLink) {
            oldThemeLink.remove();
        }
        
        // Если выбрана базовая тема - только убираем дополнительный CSS
        if (theme === 'base') {
            this.removeThemeCSS();
        } else {
            // Создаем новую ссылку на CSS темы
            const link = document.createElement('link');
            link.id = 'theme-style';
            link.rel = 'stylesheet';
            link.href = `${theme}-theme.css`;
            document.head.appendChild(link);
            this.themeLink = link;
        }
        
        this.currentTheme = theme;
        this.saveTheme(theme);
        
        // Обновляем кнопки
        this.updateThemeButtons();
        
        // Обновляем класс body
        this.updateBodyClass(theme);
        
        // Отправляем событие о смене темы
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
    }
    
    removeThemeCSS() {
        const themeLink = document.getElementById('theme-style');
        if (themeLink) {
            themeLink.remove();
        }
        this.themeLink = null;
    }
    
    updateBodyClass(theme) {
        // Удаляем старые классы тем
        document.body.classList.remove(...this.themes);
        // Добавляем новый класс
        document.body.classList.add(theme);
    }
    
    updateThemeButtons() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            const theme = btn.dataset.theme;
            const isActive = theme === this.currentTheme;
            btn.classList.toggle('active', isActive);
            btn.title = this.themeNames[theme] + (isActive ? ' ✓' : '');
        });
    }
    
    addThemeSwitcherToHeader() {
        const header = document.querySelector('.header-content');
        if (!header) {
            console.log('Header not found, waiting...');
            return;
        }
        
        // Проверяем, нет ли уже переключателя
        if (document.querySelector('.theme-switcher')) return;
        
        const themeSwitcher = document.createElement('div');
        themeSwitcher.className = 'theme-switcher';
        themeSwitcher.innerHTML = `
            <button class="theme-btn active" data-theme="base" title="Неон (базовый)">
                <i class="fas fa-star"></i>
            </button>
            <button class="theme-btn" data-theme="vice-city" title="Vice City">
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
            // Если нет языкового переключателя, добавляем в конец header
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
        
        console.log('Theme switcher added to header');
    }
    
    init() {
        console.log('Initializing Theme Manager...');
        
        // Ждем полной загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    this.addThemeSwitcherToHeader();
                    this.loadThemeCSS(this.currentTheme);
                }, 100);
            });
        } else {
            setTimeout(() => {
                this.addThemeSwitcherToHeader();
                this.loadThemeCSS(this.currentTheme);
            }, 100);
        }
        
        // Наблюдатель для динамически добавляемого контента
        const observer = new MutationObserver(() => {
            this.addThemeSwitcherToHeader();
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

// Единая точка инициализации
const themeManager = new ThemeManager();
themeManager.init();
window.themeManager = themeManager;

console.log('Theme Manager ready');
