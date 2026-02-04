// language.js
let currentLanguage = 'ru';

// Загружаем переводы из translations.js (они уже в глобальной области)

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
    
    // 2. Обновляем активный блок (рука/борд)
    updateActiveBlockText();
    
    // 3. Обновляем текст оппонентов в результатах
    updateOpponentText();
    
    // 4. Обновляем комбинацию в результатах
    updateHandDescription();
    
    // 5. Обновляем переключатель языка
    updateLanguageSwitcher(lang);
    
    // 6. Сохраняем в localStorage
    localStorage.setItem('poker-calc-language', lang);
    
    // 7. Обновляем атрибут lang у html
    document.documentElement.lang = lang;
}

function updateActiveBlockText() {
    const blockName = document.getElementById('currentBlockName');
    if (blockName) {
        const isHand = document.getElementById('handSection').classList.contains('active');
        blockName.textContent = isHand 
            ? translations[currentLanguage].yourHandText 
            : translations[currentLanguage].boardText;
    }
}

function updateOpponentText() {
    const opponentInfo = document.getElementById('opponentInfo');
    if (!opponentInfo) return;
    
    const count = parseInt(document.getElementById('currentOpponents').textContent);
    let text;
    
    if (count === 1) {
        text = translations[currentLanguage].headsUp;
    } else {
        const word = count <= 4 
            ? translations[currentLanguage].opponentFew 
            : translations[currentLanguage].opponentMany;
        text = `${count} ${word}`;
    }
    
    opponentInfo.textContent = text;
}

function updateHandDescription() {
    const heroHandDesc = document.getElementById('heroHandDesc');
    if (heroHandDesc && heroHandDesc.textContent !== '-') {
        // Обновляем описание комбинации на текущем языке
        const handRank = HandEvaluator.evaluate ? 0 : 0; // Здесь нужно получить реальный ранг
        // Эта функция будет вызвана после расчета
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // 1. Проверяем сохраненный язык
    const savedLang = localStorage.getItem('poker-calc-language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
    }
    
    // 2. Устанавливаем язык
    changeLanguage(currentLanguage);
    
    // 3. Добавляем обработчики на кнопки языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
    
    // 4. Переопределяем функцию describeHand для поддержки языков
    const originalDescribeHand = window.describeHand;
    if (originalDescribeHand) {
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
    
    // 5. Переопределяем прогресс-текст
    const originalUpdateProgress = window.updateProgress;
    if (originalUpdateProgress) {
        // Нужно будет обновить текст прогресса
    }
});

// Экспортируем функцию для использования в script.js
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
