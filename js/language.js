// language.js - Загрузка переводов из JSON файлов (1 JSON на язык)

let currentLanguage = 'ru';
let translations = {}; // Загруженные переводы

// Загружает переводы для выбранного языка
async function loadTranslations(lang) {
    try {
        const response = await fetch(`data/translations/${lang}.json`);
        if (!response.ok) throw new Error('Translation file not found');
        
        translations = await response.json();
        applyCurrentLanguage();
        
    } catch (error) {
        console.error(`Ошибка загрузки переводов (${lang}):`, error);
        
        // Fallback: пробуем английский
        if (lang !== 'en') {
            console.log('Пробуем загрузить английские переводы...');
            await loadTranslations('en');
        }
    }
}

// Основная функция смены языка
async function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    
    currentLanguage = lang;
    localStorage.setItem('poker-calc-language', lang);
    document.documentElement.lang = lang;
    
    // Обновляем переключатель СРАЗУ
    updateLanguageSwitcher(lang);
    
    // Загружаем и применяем новые переводы
    await loadTranslations(lang);
}

// Применяет текущий язык ко всем элементам
function applyCurrentLanguage() {
    if (!translations) return;
    
    // Обновляем title страницы
    document.title = translations.siteTitle || document.title;
    
    // Обновляем все элементы с data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = translations[key];
        
        if (translation) {
            applyTranslationToElement(element, translation);
        }
    });
}

// Применяет перевод к конкретному элементу
function applyTranslationToElement(element, translation) {
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
async function initLanguageSystem() {
    // 1. Проверяем сохраненный язык
    const savedLang = localStorage.getItem('poker-calc-language');
    if (savedLang) {
        currentLanguage = savedLang;
    }
    
    // 2. Устанавливаем атрибут lang
    document.documentElement.lang = currentLanguage;
    
    // 3. Загружаем переводы
    await loadTranslations(currentLanguage);
    
    // 4. Добавляем обработчики на кнопки языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const lang = btn.getAttribute('data-lang');
            await changeLanguage(lang);
        });
    });
}

// Запускаем инициализацию
document.addEventListener('DOMContentLoaded', initLanguageSystem);

// Экспортируем функции
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
