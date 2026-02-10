let currentLanguage = 'ru';

// Применяем язык ДО загрузки DOM
function applyLanguageImmediately() {
    const savedLang = localStorage.getItem('poker-calc-language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
    }
    
    // СРАЗУ обновляем переключатель языка если он уже в DOM
    updateLanguageSwitcherImmediately();
    
    // Устанавливаем атрибут lang
    document.documentElement.lang = currentLanguage;
    
    // Применяем язык как можно раньше
    if (document.readyState === 'loading') {
        const observer = new MutationObserver((mutations, obs) => {
            const elements = document.querySelectorAll('[data-i18n]');
            if (elements.length > 0) {
                applyTranslationsToElements(elements);
                obs.disconnect();
            }
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    } else {
        setTimeout(applyCurrentLanguage, 0);
    }
}

// Сразу обновляет переключатель языка
function updateLanguageSwitcherImmediately() {
    if (!document.querySelector('.lang-btn')) return;
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === currentLanguage) {
            btn.classList.add('active');
            btn.classList.remove('inactive');
        } else {
            btn.classList.remove('active');
            btn.classList.add('inactive');
        }
    });
}

// Основная функция смены языка
function changeLanguage(lang) {
    if (!translations[lang] || currentLanguage === lang) return;
    
    currentLanguage = lang;
    
    // 1. Сохраняем в localStorage
    localStorage.setItem('poker-calc-language', lang);
    
    // 2. Устанавливаем атрибут lang у html
    document.documentElement.lang = lang;
    
    // 3. Обновляем переключатель языка СРАЗУ
    updateLanguageSwitcher(lang);
    
    // 4. Применяем переводы
    applyCurrentLanguage();
}

// Применяет текущий язык ко всем элементам
function applyCurrentLanguage() {
    if (!translations[currentLanguage]) return;
    
    const elements = document.querySelectorAll('[data-i18n]');
    applyTranslationsToElements(elements);
}

// Применяет переводы к конкретным элементам
function applyTranslationsToElements(elements) {
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            const translation = translations[currentLanguage][key];
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = translation;
                }
                if (element.hasAttribute('title')) {
                    element.title = translation;
                }
                if (element.hasAttribute('value') && element.type !== 'submit' && element.type !== 'button') {
                    element.value = translation;
                }
            } else if (element.tagName === 'IMG') {
                if (element.hasAttribute('alt')) {
                    element.alt = translation;
                }
            } else {
                element.textContent = translation;
            }
        }
    });
}

// Обновляет интерфейс после смены языка (упрощенная версия)
function updateUIAfterLanguageChange() {
    // Обновляем только то, что осталось после удаления лишних элементов
    if (window.updateActiveBlock) {
        window.updateActiveBlock();
    }
}

// Обновляет переключатель языка
function updateLanguageSwitcher(activeLang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === activeLang) {
            btn.classList.add('active');
            btn.classList.remove('inactive');
        } else {
            btn.classList.remove('active');
            btn.classList.add('inactive');
        }
    });
}

// Инициализация языковой системы
function initLanguageSystem() {
    // 1. Применяем язык СРАЗУ (чтобы не было мигания)
    applyLanguageImmediately();
    
    // 2. Добавляем обработчики на кнопки языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
}

// Запускаем инициализацию при загрузке DOM
document.addEventListener('DOMContentLoaded', initLanguageSystem);

// Запускаем предварительную инициализацию как можно раньше
if (document.readyState === 'loading') {
    // Если скрипт загружается в head, DOM еще не готов
    // Применяем язык при полной загрузке
    document.addEventListener('DOMContentLoaded', () => {
        // Уже запустится в initLanguageSystem
    });
} else {
    // DOM уже загружен
    initLanguageSystem();
}

// Экспортируем функции
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
window.updateLanguageSwitcher = updateLanguageSwitcher;