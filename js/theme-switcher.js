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
        
        // Удаляем старую тему
        const oldThemeLink = document.getElementById('theme-style');
        if (oldThemeLink) {
            oldThemeLink.remove();
        }
        
        // Создаем новую ссылку на CSS темы
   
        const link = document.createElement('link');
        link.id = 'theme-style';
        link.rel = 'stylesheet';
        link.href = `css/themes/${theme}-theme.css`;
        document.head.appendChild(link);
        this.themeLink = link;
        
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
    
    updateBodyClass(theme) {
        document.body.classList.remove(...this.themes);
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
        if (!header) return;
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
        
        const langSwitcher = document.querySelector('.language-switcher-header');
        if (langSwitcher) {
            langSwitcher.parentNode.insertBefore(themeSwitcher, langSwitcher.nextSibling);
        } else {
            header.appendChild(themeSwitcher);
        }
        
        themeSwitcher.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadThemeCSS(btn.dataset.theme);
            });
        });
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.addThemeSwitcherToHeader();
                this.loadThemeCSS(this.currentTheme);
            });
        } else {
            this.addThemeSwitcherToHeader();
            this.loadThemeCSS(this.currentTheme);
        }
        
        new MutationObserver(() => this.addThemeSwitcherToHeader())
            .observe(document.body, { childList: true, subtree: true });
    }
}

const themeManager = new ThemeManager();
themeManager.init();
window.themeManager = themeManager;


