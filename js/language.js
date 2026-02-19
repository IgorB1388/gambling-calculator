// language.js - Единая система переводов для всего сайта GTA Casino Tools

let currentLanguage = 'ru';
let translations = {};

// Минимальные fallback переводы (на случай если JSON не загрузятся)
const fallbackTranslations = {
    ru: { 
        siteTitle: "GTA Casino Tools", 
        navHome: "Главная", 
        navPoker: "Покер-калькулятор",
        navRoulette: "Анализатор рулетки",
        navArbs: "Анализатор вилок",
        navFaq: "FAQ"
    },
    en: { 
        siteTitle: "GTA Casino Tools", 
        navHome: "Home", 
        navPoker: "Poker Calculator",
        navRoulette: "Roulette Analyzer",
        navArbs: "Arbitrage Scanner",
        navFaq: "FAQ"
    },
    es: { 
        siteTitle: "GTA Casino Tools", 
        navHome: "Inicio", 
        navPoker: "Calculadora de póker",
        navRoulette: "Analizador de ruleta",
        navArbs: "Escáner de arbitraje",
        navFaq: "FAQ"
    }
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

// Применяет переводы ко всем элементам на странице
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
        } else {
            console.warn(`Перевод для ключа "${key}" не найден в ${currentLanguage}.json`);
        }
    });
    
    // Для элементов с атрибутами placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            element.placeholder = translations[key];
        }
    });
    
    // Для элементов с атрибутами title
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        if (translations[key]) {
            element.title = translations[key];
        }
    });
    
    // Для элементов с атрибутами alt
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
        const key = element.getAttribute('data-i18n-alt');
        if (translations[key]) {
            element.alt = translations[key];
        }
    });
}

// Обновляет все переключатели языка на странице
function updateAllLanguageSwitchers(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        btn.classList.toggle('active', btnLang === lang);
    });
    
    // Обновляем title у кнопок
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        let langName = '';
        switch(btnLang) {
            case 'ru': langName = 'Русский'; break;
            case 'en': langName = 'English'; break;
            case 'es': langName = 'Español'; break;
        }
        btn.setAttribute('title', langName);
    });
}

// Смена языка
async function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    
    currentLanguage = lang;
    localStorage.setItem('gta-casino-language', lang);
    document.documentElement.lang = lang;
    
    updateAllLanguageSwitchers(lang);
    await loadTranslations(lang);
    
    // Отправляем событие о смене языка (для других скриптов)
    document.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language: lang }
    }));
}

// Добавляет обработчики клика на кнопки переключения языка
function addLanguageButtonListeners() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        // Удаляем старые обработчики, чтобы избежать дублирования
        btn.removeEventListener('click', handleLanguageButtonClick);
        btn.addEventListener('click', handleLanguageButtonClick);
    });
}

// Обработчик клика на кнопку языка
function handleLanguageButtonClick(event) {
    const btn = event.currentTarget;
    const lang = btn.getAttribute('data-lang');
    changeLanguage(lang);
}

// Инициализация системы переводов
async function initLanguageSystem() {
    // Определяем язык
    const savedLang = localStorage.getItem('gta-casino-language');
    const browserLang = navigator.language.split('-')[0];
    
    if (savedLang) {
        currentLanguage = savedLang;
    } else if (['ru', 'en', 'es'].includes(browserLang)) {
        currentLanguage = browserLang;
    }
    
    document.documentElement.lang = currentLanguage;
    updateAllLanguageSwitchers(currentLanguage);
    
    await loadTranslations(currentLanguage);
    addLanguageButtonListeners();
    
    // Наблюдатель за DOM для динамически добавленных кнопок
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                const newLangButtons = Array.from(mutation.addedNodes).flatMap(node => 
                    node.querySelectorAll ? Array.from(node.querySelectorAll('.lang-btn')) : []
                );
                if (newLangButtons.length) {
                    addLanguageButtonListeners();
                }
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// Перезагрузка переводов для динамически добавленного контента
function reloadTranslationsForNewContent(container) {
    if (!container || !translations) return;
    
    // Применяем переводы ко всем элементам внутри контейнера
    container.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });
}

// Запуск системы переводов при загрузке DOM
document.addEventListener('DOMContentLoaded', initLanguageSystem);

// Экспорт функций для использования в других скриптах
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
window.reloadTranslationsForNewContent = reloadTranslationsForNewContent;
window.getTranslation = (key) => translations[key] || key;
window.translations = translations; // Экспортируем объект переводов
