// language.js - ИСПРАВЛЕННЫЙ ФАЙЛ (без мигания, с правильным переключателем)
let currentLanguage = 'ru';

// Применяем язык ДО загрузки DOM (чтобы не было мигания)
function applyLanguageImmediately() {
    const savedLang = localStorage.getItem('poker-calc-language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
        console.log(`Применяем сохраненный язык: ${savedLang}`);
    }
    
    // СРАЗУ обновляем переключатель языка если он уже в DOM
    updateLanguageSwitcherImmediately();
    
    // Устанавливаем атрибут lang
    document.documentElement.lang = currentLanguage;
    
    // Применяем язык как можно раньше
    if (document.readyState === 'loading') {
        // DOM еще загружается, используем MutationObserver
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
        // DOM уже загружен
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
    
    console.log(`Смена языка с ${currentLanguage} на ${lang}`);
    
    currentLanguage = lang;
    
    // 1. Сохраняем в localStorage
    localStorage.setItem('poker-calc-language', lang);
    
    // 2. Устанавливаем атрибут lang у html
    document.documentElement.lang = lang;
    
    // 3. Обновляем переключатель языка СРАЗУ
    updateLanguageSwitcher(lang);
    
    // 4. Применяем переводы
    applyCurrentLanguage();
    
    // 5. Обновляем остальные элементы
    updateUIAfterLanguageChange();
}

// Применяет текущий язык ко всем элементам
function applyCurrentLanguage() {
    if (!translations[currentLanguage]) return;
    
    // 1. Обновляем все элементы с data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    applyTranslationsToElements(elements);
    
    console.log(`Применен язык: ${currentLanguage} к ${elements.length} элементам`);
}

// Применяет переводы к конкретным элементам
function applyTranslationsToElements(elements) {
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            const translation = translations[currentLanguage][key];
            
            // Сохраняем специальные атрибуты
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
                // Для обычных элементов
                element.textContent = translation;
            }
        }
    });
}

// Обновляет интерфейс после смены языка
function updateUIAfterLanguageChange() {
    // 1. Обновляем активный блок
    updateActiveBlock();
    
    // 2. Обновляем текст оппонентов в результатах
    updateOpponentText();
    
    // 3. Обновляем описание руки (если есть расчет)
    updateHandDescription();
}

// Обновляет активный блок
function updateActiveBlock() {
    const currentBlockName = document.getElementById('currentBlockName');
    if (!currentBlockName || !translations[currentLanguage]) return;
    
    const isHand = document.getElementById('handSection')?.classList.contains('active');
    
    if (isHand) {
        currentBlockName.textContent = translations[currentLanguage].yourHandText;
    } else {
        currentBlockName.textContent = translations[currentLanguage].boardText;
    }
}

// Обновляет текст оппонентов
function updateOpponentText() {
    const opponentInfo = document.getElementById('opponentInfo');
    if (!opponentInfo || !translations[currentLanguage]) return;
    
    const currentOpponents = document.getElementById('currentOpponents');
    if (!currentOpponents) return;
    
    const count = parseInt(currentOpponents.textContent) || 1;
    
    if (count === 1) {
        opponentInfo.textContent = translations[currentLanguage].headsUp || '1 opponent';
    } else {
        if (currentLanguage === 'en') {
            opponentInfo.textContent = `${count} ${translations[currentLanguage].opponents}`;
        } else if (currentLanguage === 'ru') {
            // Русские формы
            const lastDigit = count % 10;
            const lastTwoDigits = count % 100;
            
            if (lastDigit === 1 && lastTwoDigits !== 11) {
                opponentInfo.textContent = `${count} оппонент`;
            } else if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
                opponentInfo.textContent = `${count} оппонента`;
            } else {
                opponentInfo.textContent = `${count} оппонентов`;
            }
        } else if (currentLanguage === 'es') {
            // Испанские формы
            opponentInfo.textContent = count === 1 
                ? `${count} ${translations[currentLanguage].opponentSingle || 'oponente'}`
                : `${count} ${translations[currentLanguage].opponents || 'oponentes'}`;
        }
    }
}

// Обновляет описание руки
function updateHandDescription() {
    const heroHandDesc = document.getElementById('heroHandDesc');
    if (!heroHandDesc || !heroHandDesc.textContent || heroHandDesc.textContent === '') return;
    
    // Если уже есть описание руки, обновляем его
    if (window.describeHand && window.selectedCards) {
        const heroCards = Array.from(selectedCards.entries())
            .filter(([slot]) => slot.startsWith('hero'))
            .map(([,card]) => card);
        const boardCards = Array.from(selectedCards.entries())
            .filter(([slot]) => slot.startsWith('board'))
            .map(([,card]) => card);
        
        heroHandDesc.textContent = window.describeHand(heroCards, boardCards);
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
    console.log("Инициализация языковой системы...");
    
    // 1. Применяем язык СРАЗУ (чтобы не было мигания)
    applyLanguageImmediately();
    
    // 2. Добавляем обработчики на кнопки языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
    
    // 3. Переназначаем describeHand для поддержки языков
    if (typeof window.describeHand === 'function') {
        const originalDescribeHand = window.describeHand;
        window.describeHand = function(heroCards, boardCards) {
            if (!translations[currentLanguage]) return originalDescribeHand(heroCards, boardCards);
            
            if (boardCards.length === 0) return translations[currentLanguage].preflop;
            
            const handRank = HandEvaluator.evaluate([...heroCards, ...boardCards]) >> 20;
            const handNames = [
                translations[currentLanguage].highCard,
                translations[currentLanguage].pair,
                translations[currentLanguage].twoPair,
                translations[currentLanguage].threeOfAKind,
                translations[currentLanguage].straight,
                translations[currentLanguage].flush,
                translations[currentLanguage].fullHouse,
                translations[currentLanguage].fourOfAKind,
                translations[currentLanguage].straightFlush,
                translations[currentLanguage].royalFlush
            ];
            
            const result = handNames[handRank] || translations[currentLanguage].unknownCombo;
            return result || originalDescribeHand(heroCards, boardCards);
        };
    }
    
    console.log("Языковая система инициализирована");
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
