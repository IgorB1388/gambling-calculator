// language.js - ПОЛНЫЙ ФАЙЛ
let currentLanguage = 'ru';

function changeLanguage(lang) {
    if (!translations[lang]) return;
    
    currentLanguage = lang;
    
    // 1. Обновляем все элементы с data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // 2. Обновляем переключатель языка
    updateLanguageSwitcher(lang);
    
    // 3. Обновляем активный блок
    updateActiveBlock();
    
    // 4. Обновляем текст оппонентов в результатах (если уже рассчитано)
    updateOpponentText();
    
    // 5. Сохраняем в localStorage
    localStorage.setItem('poker-calc-language', lang);
    
    // 6. Обновляем атрибут lang у html
    document.documentElement.lang = lang;
    
    console.log(`Язык изменен на: ${lang}`);
}

function updateActiveBlock() {
    const currentBlockName = document.getElementById('currentBlockName');
    if (!currentBlockName) return;
    
    // Определяем какой блок активен
    const isHand = document.getElementById('handSection').classList.contains('active');
    
    // Обновляем текст и цвет
    if (isHand) {
        currentBlockName.textContent = translations[currentLanguage].yourHandText;
        currentBlockName.className = 'hand-color';
    } else {
        currentBlockName.textContent = translations[currentLanguage].boardText;
        currentBlockName.className = 'board-color';
    }
}

function updateOpponentText() {
    const opponentInfo = document.getElementById('opponentInfo');
    if (!opponentInfo) return;
    
    // Получаем текущее количество оппонентов
    const currentOpponents = document.getElementById('currentOpponents');
    if (!currentOpponents) return;
    
    const count = parseInt(currentOpponents.textContent) || 1;
    
    // Обновляем текст оппонентов в результатах
    if (count === 1) {
        opponentInfo.textContent = translations[currentLanguage].headsUp;
    } else {
        if (currentLanguage === 'en') {
            opponentInfo.textContent = `${count} ${translations[currentLanguage].opponents}`;
        } else if (currentLanguage === 'ru') {
            // Русские формы: 1 оппонент, 2-4 оппонента, 5+ оппонентов
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
            // Испанские формы: 1 oponente, 2+ oponentes
            opponentInfo.textContent = count === 1 
                ? `${count} ${translations[currentLanguage].opponentSingle}`
                : `${count} ${translations[currentLanguage].opponents}`;
        }
    }
}

function updateLanguageSwitcher(activeLang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === activeLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Переопределяем функцию describeHand для поддержки языков
function initLanguage() {
    // Сохраняем оригинальную функцию
    if (typeof window.describeHand === 'function') {
        console.log("Переопределяем describeHand для поддержки языков");
        
        // Создаем новую функцию с поддержкой языков
        window.describeHand = function(heroCards, boardCards) {
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
            return handNames[handRank] || translations[currentLanguage].unknownCombo;
        };
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log("Инициализация языка...");
    
    // 1. Проверяем сохраненный язык
    const savedLang = localStorage.getItem('poker-calc-language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
        console.log(`Найден сохраненный язык: ${savedLang}`);
    } else {
        console.log("Используем язык по умолчанию: ru");
    }
    
    // 2. Инициализируем систему языков
    initLanguage();
    
    // 3. Устанавливаем язык (с небольшой задержкой для гарантии)
    setTimeout(() => {
        changeLanguage(currentLanguage);
    }, 50);
    
    // 4. Добавляем обработчики на кнопки языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            console.log(`Клик по языку: ${lang}`);
            changeLanguage(lang);
        });
    });
    
    // 5. Перехватываем клик на кнопку расчета для обновления текста оппонентов
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        const originalClick = calculateBtn.onclick;
        calculateBtn.onclick = function(e) {
            if (originalClick) originalClick.call(this, e);
            // После расчета обновляем текст оппонентов
            setTimeout(() => {
                updateOpponentText();
            }, 150);
        };
    }
    
    console.log("Языковая система инициализирована");
});

// Экспортируем функции для использования в script.js
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
window.updateOpponentText = updateOpponentText;
window.updateActiveBlock = updateActiveBlock;
