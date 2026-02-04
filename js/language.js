// language.js
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
    
    // 2. Обновляем активный блок (рука/борд)
    updateActiveBlockText();
    
    // 3. Обновляем текст оппонентов в результатах (если есть)
    updateOpponentText();
    
    // 4. Обновляем комбинацию в результатах (если уже рассчитано)
    updateHandDescription();
    
    // 5. Обновляем прогресс текст (если виден)
    updateProgressText();
    
    // 6. Обновляем переключатель языка
    updateLanguageSwitcher(lang);
    
    // 7. Сохраняем в localStorage
    localStorage.setItem('poker-calc-language', lang);
    
    // 8. Обновляем атрибут lang у html
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
    
    // Если текст не стандартный (уже есть результаты расчета)
    if (opponentInfo.textContent.includes('оппонент') || 
        opponentInfo.textContent.includes('opponent') ||
        opponentInfo.textContent.includes('oponente')) {
        
        const count = parseInt(document.getElementById('currentOpponents').textContent);
        let text;
        
        if (count === 1) {
            text = translations[currentLanguage].headsUp;
        } else {
            if (currentLanguage === 'en') {
                text = `${count} ${translations[currentLanguage].opponents}`;
            } else if (currentLanguage === 'ru') {
                // Русские формы: 1 оппонент, 2-4 оппонента, 5+ оппонентов
                const lastDigit = count % 10;
                const lastTwoDigits = count % 100;
                
                if (lastDigit === 1 && lastTwoDigits !== 11) {
                    text = `${count} оппонент`;
                } else if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
                    text = `${count} оппонента`;
                } else {
                    text = `${count} оппонентов`;
                }
            } else if (currentLanguage === 'es') {
                // Испанские формы: 1 oponente, 2+ oponentes
                text = count === 1 
                    ? `${count} ${translations[currentLanguage].opponentSingle}`
                    : `${count} ${translations[currentLanguage].opponents}`;
            }
        }
        
        opponentInfo.textContent = text;
    }
}

function updateHandDescription() {
    const heroHandDesc = document.getElementById('heroHandDesc');
    if (heroHandDesc && heroHandDesc.textContent !== '-') {
        // Функция describeHand теперь использует текущий язык
        // Она была переопределена в initLanguage
    }
}

function updateProgressText() {
    const progressText = document.getElementById('progressText');
    if (progressText && progressText.style.display !== 'none') {
        const currentText = progressText.textContent;
        if (currentText.includes('Идет расчет') || 
            currentText.includes('Calculating') || 
            currentText.includes('Calculando')) {
            
            const percentMatch = currentText.match(/(\d+)%/);
            if (percentMatch) {
                const percent = percentMatch[1];
                progressText.textContent = `${translations[currentLanguage].calculating}: ${percent}%`;
            }
        } else if (currentText.includes('Расчет завершен') || 
                   currentText.includes('Calculation complete') || 
                   currentText.includes('Cálculo completado')) {
            
            progressText.textContent = translations[currentLanguage].calculationComplete;
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
        const originalDescribeHand = window.describeHand;
        
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
    // 1. Проверяем сохраненный язык
    const savedLang = localStorage.getItem('poker-calc-language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
    }
    
    // 2. Инициализируем систему языков
    initLanguage();
    
    // 3. Устанавливаем язык (но только после полной загрузки)
    setTimeout(() => {
        changeLanguage(currentLanguage);
    }, 100);
    
    // 4. Добавляем обработчики на кнопки языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
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
            setTimeout(updateOpponentText, 100);
        };
    }
});

// Экспортируем функции для использования в script.js
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
window.updateOpponentText = updateOpponentText;
