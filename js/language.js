// language.js - Единая система переводов для всего сайта GTA Casino Tools

let currentLanguage = 'ru';
let translations = {};

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

function applyCurrentLanguage() {
    if (!translations) return;

    if (translations.siteTitle) document.title = translations.siteTitle;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) el.textContent = translations[key];
        else console.warn(`Перевод для ключа "${key}" не найден в ${currentLanguage}.json`);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) el.placeholder = translations[key];
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[key]) el.title = translations[key];
    });

    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
        const key = el.getAttribute('data-i18n-alt');
        if (translations[key]) el.alt = translations[key];
    });

    window.translations = translations;

    // Сигнализируем что переводы готовы (для скриптов которые ждут первой загрузки)
    if (!window.translationsReady) {
        window.translationsReady = true;
        document.dispatchEvent(new CustomEvent('translationsReady'));
    }
}

function updateAllLanguageSwitchers(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        btn.classList.toggle('active', btnLang === lang);
        const names = { ru: 'Русский', en: 'English', es: 'Español' };
        btn.setAttribute('title', names[btnLang] || btnLang);
    });
}

async function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    currentLanguage = lang;
    localStorage.setItem('gta-casino-language', lang);
    document.documentElement.lang = lang;
    updateAllLanguageSwitchers(lang);
    await loadTranslations(lang);
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

function addLanguageButtonListeners() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.removeEventListener('click', handleLanguageButtonClick);
        btn.addEventListener('click', handleLanguageButtonClick);
    });
}

function handleLanguageButtonClick(event) {
    changeLanguage(event.currentTarget.getAttribute('data-lang'));
}

async function initLanguageSystem() {
    const savedLang = localStorage.getItem('gta-casino-language');
    const browserLang = navigator.language.split('-')[0];

    if (savedLang) currentLanguage = savedLang;
    else if (['ru', 'en', 'es'].includes(browserLang)) currentLanguage = browserLang;

    document.documentElement.lang = currentLanguage;
    updateAllLanguageSwitchers(currentLanguage);

    await loadTranslations(currentLanguage);
    addLanguageButtonListeners();

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                const newBtns = Array.from(mutation.addedNodes).flatMap(node =>
                    node.querySelectorAll ? Array.from(node.querySelectorAll('.lang-btn')) : []
                );
                if (newBtns.length) addLanguageButtonListeners();
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function reloadTranslationsForNewContent(container) {
    if (!container || !translations) return;

    container.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) el.textContent = translations[key];
    });

    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) el.placeholder = translations[key];
    });

    container.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[key]) el.title = translations[key];
    });
}

document.addEventListener('DOMContentLoaded', initLanguageSystem);

window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
window.reloadTranslationsForNewContent = reloadTranslationsForNewContent;
window.getTranslation = (key, params = {}) => {
    let text = translations[key] || key;
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    return text;
};
window.translations = translations;
