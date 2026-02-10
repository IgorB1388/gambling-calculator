// language.js - Загрузка переводов из JSON файлов (1 JSON на язык)

let currentLanguage = 'ru';
let translations = {};

// Минимальные fallback переводы (на случай если JSON не загрузятся)
const fallbackTranslations = {
    ru: { siteTitle: "GTA Casino Tools", navHome: "Главная", navPoker: "Покер" },
    en: { siteTitle: "GTA Casino Tools", navHome: "Home", navPoker: "Poker" },
    es: { siteTitle: "GTA Casino Tools", navHome: "Inicio", navPoker: "Póker" }
};

// Загружает переводы для языка
async function loadTranslations(lang) {
    try {
        const response = await fetch(`data/translations/${lang}.json`);
        translations = await response.json();
    } catch (error) {
        console.warn(`Переводы ${lang}.json не загружены, используем fallback`, error);
        translations = fallbackTranslations[lang] || fallbackTranslations.en;
    }
    
    applyCurrentLanguage();
}

// Применяет переводы
function applyCurrentLanguage() {
    if (!translations) return;
    
    // Title страницы
    if (translations.siteTitle) {
        document.title = translations.siteTitle;
    }
    
    // Все элементы с data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });
}

// Обновляет переключатель языка
function updateLanguageSwitcher(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        btn.classList.toggle('active', btnLang === lang);
    });
}

// Смена языка
async function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    
    currentLanguage = lang;
    localStorage.setItem('poker-calc-language', lang);
    document.documentElement.lang = lang;
    
    updateLanguageSwitcher(lang);
    await loadTranslations(lang);
}

// Инициализация
async function initLanguageSystem() {
    const savedLang = localStorage.getItem('poker-calc-language');
    if (savedLang) currentLanguage = savedLang;
    
    document.documentElement.lang = currentLanguage;
    updateLanguageSwitcher(currentLanguage);
    
    await loadTranslations(currentLanguage);
    
    // Обработчики кнопок
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
}

// Запуск
document.addEventListener('DOMContentLoaded', initLanguageSystem);

// Экспорт
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
