// roulette.js - Анализатор стратегий рулетки

// --- Конфигурация рулетки ---
const RouletteConfig = {
    european: {
        numbers: 37,
        zero: 0,
        zeroNumbers: [0],
        type: 'european',
        payouts: {
            straight: 35,
            split: 17,
            street: 11,
            corner: 8,
            line: 5,
            dozen: 2,
            column: 2,
            even: 1,
            odd: 1,
            red: 1,
            black: 1,
            low: 1,
            high: 1,
            zero: 35
        }
    },
    american: {
        numbers: 38,
        zero: [0, 37],
        zeroNumbers: [0, 37],
        type: 'american',
        payouts: {
            straight: 35,
            split: 17,
            street: 11,
            corner: 8,
            line: 5,
            dozen: 2,
            column: 2,
            even: 1,
            odd: 1,
            red: 1,
            black: 1,
            low: 1,
            high: 1,
            zero: 35,
            doublezero: 35
        }
    }
};

// --- Ставки и их условия (числовые множества) ---
const BetDefinitions = {
    red: {
        numbers: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
    },
    black: {
        numbers: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]
    },
    even: {
        numbers: Array.from({length: 36}, (_, i) => i + 1).filter(n => n % 2 === 0)
    },
    odd: {
        numbers: Array.from({length: 36}, (_, i) => i + 1).filter(n => n % 2 === 1)
    },
    low: {
        numbers: Array.from({length: 18}, (_, i) => i + 1)
    },
    high: {
        numbers: Array.from({length: 18}, (_, i) => i + 19)
    },
    zero: {
        numbers: [0]
    },
    doublezero: {
        numbers: [37]
    },
    dozen1: {
        numbers: Array.from({length: 12}, (_, i) => i + 1)
    },
    dozen2: {
        numbers: Array.from({length: 12}, (_, i) => i + 13)
    },
    dozen3: {
        numbers: Array.from({length: 12}, (_, i) => i + 25)
    },
    column1: {
        numbers: [1,4,7,10,13,16,19,22,25,28,31,34]
    },
    column2: {
        numbers: [2,5,8,11,14,17,20,23,26,29,32,35]
    },
    column3: {
        numbers: [3,6,9,12,15,18,21,24,27,30,33,36]
    }
};

// --- Состояние интерфейса ---
let isSimulating = false;
let conditions = [];
const MAX_CONDITIONS = 5;

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    updateTargetInputState();
    updateStrategyOptions();
    initConditions();
});

// --- Функция для получения перевода ---
function getTranslation(key, params = {}) {
    let text = window.translations && window.translations[key] ? window.translations[key] : key;
    
    // Замена параметров вида {number}
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// --- Инициализация условий (одно по умолчанию) ---
function initConditions() {
    conditions = [
        { not: false, type: 'red', customNumbers: '', percent: 100 }
    ];
    renderConditions();
    calculateTotalBet();
}

// --- Рендер условий в HTML ---
function renderConditions() {
    const container = document.getElementById('conditionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    conditions.forEach((cond, index) => {
        const row = document.createElement('div');
        row.className = 'condition-row';
        row.setAttribute('data-condition-index', index);
        
        // ===== ЧЕКБОКС "НЕ" =====
        const notDiv = document.createElement('div');
        notDiv.className = 'condition-not';
        
        const notCheckbox = document.createElement('input');
        notCheckbox.type = 'checkbox';
        notCheckbox.id = `not_${index}`;
        notCheckbox.checked = cond.not;
        notCheckbox.addEventListener('change', () => {
            conditions[index].not = notCheckbox.checked;
            calculateTotalBet();
        });
        
        const notLabel = document.createElement('label');
        notLabel.htmlFor = `not_${index}`;
        notLabel.textContent = getTranslation('not');
        
        notDiv.appendChild(notCheckbox);
        notDiv.appendChild(notLabel);
        row.appendChild(notDiv);
        
        // ===== ВЫПАДАЮЩИЙ СПИСОК ТИПОВ СТАВОК =====
        const select = document.createElement('select');
        select.className = 'condition-select settings-select bg-surface border-muted text-light';
        
        // Группа основных ставок
        const baseGroup = document.createElement('optgroup');
        baseGroup.label = getTranslation('strategyGroupBasic');
        addOption(baseGroup, 'red', getTranslation('strategyRed'));
        addOption(baseGroup, 'black', getTranslation('strategyBlack'));
        addOption(baseGroup, 'even', getTranslation('strategyEven'));
        addOption(baseGroup, 'odd', getTranslation('strategyOdd'));
        addOption(baseGroup, 'zero', getTranslation('strategyZero'));
        select.appendChild(baseGroup);
        
        // Группа половин
        const halvesGroup = document.createElement('optgroup');
        halvesGroup.label = getTranslation('strategyGroupHalves');
        addOption(halvesGroup, 'low', getTranslation('strategyLow'));
        addOption(halvesGroup, 'high', getTranslation('strategyHigh'));
        select.appendChild(halvesGroup);
        
        // Группа дюжин
        const dozensGroup = document.createElement('optgroup');
        dozensGroup.label = getTranslation('strategyGroupDozens');
        addOption(dozensGroup, 'dozen1', getTranslation('strategyDozen1'));
        addOption(dozensGroup, 'dozen2', getTranslation('strategyDozen2'));
        addOption(dozensGroup, 'dozen3', getTranslation('strategyDozen3'));
        select.appendChild(dozensGroup);
        
        // Группа колонн
        const columnsGroup = document.createElement('optgroup');
        columnsGroup.label = getTranslation('strategyGroupColumns');
        addOption(columnsGroup, 'column1', getTranslation('strategyColumn1'));
        addOption(columnsGroup, 'column2', getTranslation('strategyColumn2'));
        addOption(columnsGroup, 'column3', getTranslation('strategyColumn3'));
        select.appendChild(columnsGroup);
        
        // Группа своих чисел
        const customGroup = document.createElement('optgroup');
        customGroup.label = '--- ✏️ ---';
        addOption(customGroup, 'custom', getTranslation('customNumbersTitle'));
        select.appendChild(customGroup);
        
        select.value = cond.type;
        select.addEventListener('change', () => {
            conditions[index].type = select.value;
            renderConditions(); // Перерендерим чтобы показать/скрыть поле ввода
            calculateTotalBet();
        });
        row.appendChild(select);
        
        // ===== ПОЛЕ ДЛЯ СВОИХ ЧИСЕЛ (только если выбран тип custom) =====
        if (cond.type === 'custom') {
            const customInput = document.createElement('input');
            customInput.type = 'text';
            customInput.className = 'condition-custom-input settings-input bg-elevated border-muted text-light';
            customInput.placeholder = getTranslation('customNumbersPlaceholder');
            customInput.value = cond.customNumbers;
            customInput.addEventListener('input', () => {
                conditions[index].customNumbers = customInput.value;
                calculateTotalBet();
            });
            row.appendChild(customInput);
        }
        
        // ===== ПОЛЕ ПРОЦЕНТА =====
        const percentInput = document.createElement('input');
        percentInput.type = 'number';
        percentInput.className = 'condition-percent settings-input bg-elevated border-muted text-light';
        percentInput.value = cond.percent;
        percentInput.min = '0';
        percentInput.max = '100';
        percentInput.step = '1';
        percentInput.addEventListener('input', () => {
            let val = parseInt(percentInput.value) || 0;
            val = Math.min(100, Math.max(0, val));
            conditions[index].percent = val;
            percentInput.value = val;
            
            // Пересчитываем проценты, чтобы сумма была 100%
            normalizePercents(index);
            calculateTotalBet();
        });
        row.appendChild(percentInput);
        
        // ===== КНОПКА УДАЛЕНИЯ (только если условий больше 1) =====
        if (conditions.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'condition-remove';
            removeBtn.innerHTML = '✕';
            removeBtn.title = getTranslation('removeCondition');
            removeBtn.addEventListener('click', () => {
                removeCondition(index);
            });
            row.appendChild(removeBtn);
        }
        
        container.appendChild(row);
    });
}

// --- Вспомогательная функция добавления option ---
function addOption(group, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    group.appendChild(option);
    return option;
}

// --- Нормализация процентов (чтобы сумма была 100%) ---
function normalizePercents(changedIndex) {
    const total = 100;
    const currentSum = conditions.reduce((sum, cond) => sum + cond.percent, 0);
    
    if (currentSum === total) return;
    
    // Если изменили одно поле, подгоняем остальные
    const otherConditions = conditions.filter((_, i) => i !== changedIndex);
    const otherSum = otherConditions.reduce((sum, cond) => sum + cond.percent, 0);
    
    if (otherSum === 0) {
        // Если у других 0, равномерно распределяем
        const equalShare = Math.floor(total / conditions.length);
        let remainder = total - (equalShare * conditions.length);
        
        conditions.forEach((cond, i) => {
            cond.percent = equalShare + (i < remainder ? 1 : 0);
        });
    } else {
        // Масштабируем остальные
        const targetOtherSum = total - conditions[changedIndex].percent;
        const scale = targetOtherSum / otherSum;
        
        conditions.forEach((cond, i) => {
            if (i !== changedIndex) {
                cond.percent = Math.round(cond.percent * scale);
            }
        });
        
        // Корректируем погрешность округления
        const newSum = conditions.reduce((sum, cond) => sum + cond.percent, 0);
        if (newSum !== total) {
            conditions[0].percent += (total - newSum);
        }
    }
    
    // Перерендериваем для обновления значений в полях
    renderConditions();
}

// --- Добавить новое условие ---
function addCondition() {
    if (conditions.length >= MAX_CONDITIONS) {
        alert(getTranslation('maxConditions'));
        return;
    }
    
    conditions.push({
        not: false,
        type: 'red',
        customNumbers: '',
        percent: 0
    });
    
    normalizePercents(conditions.length - 1);
    renderConditions();
    calculateTotalBet();
}

// --- Удалить условие ---
function removeCondition(index) {
    if (conditions.length <= 1) return;
    conditions.splice(index, 1);
    normalizePercents(0);
    renderConditions();
    calculateTotalBet();
}

// --- Получить числа для одного условия с учетом НЕ и типа рулетки ---
function getNumbersForCondition(cond) {
    const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';
    const config = RouletteConfig[rouletteType];
    
    let numbers = [];
    
    if (cond.type === 'custom') {
        // Парсим свои числа из строки (поддерживаем запятые и пробелы)
        const parts = cond.customNumbers.split(',').map(s => s.trim());
        numbers = parts
            .map(p => parseInt(p))
            .filter(n => !isNaN(n) && n >= 0 && n <= 36);
    } else {
        // Берем из BetDefinitions
        numbers = BetDefinitions[cond.type]?.numbers || [];
    }
    
    // Применяем НЕ - берем все числа 0-36, которых нет в текущем множестве
    if (cond.not) {
        const allNumbers = Array.from({length: config.numbers}, (_, i) => i);
        numbers = allNumbers.filter(n => !numbers.includes(n));
    }
    
    return numbers;
}

// --- Рассчитать итоговое пересечение всех условий ---
function calculateTotalBet() {
    if (conditions.length === 0) {
        document.getElementById('totalBetText').textContent = '—';
        return { finalNumbers: [], totalPercent: 0 };
    }
    
    // Получаем числа для каждого условия
    const conditionNumbers = conditions.map(cond => getNumbersForCondition(cond));
    
    // Находим пересечение (числа, которые есть во всех условиях)
    let finalNumbers = conditionNumbers[0];
    for (let i = 1; i < conditionNumbers.length; i++) {
        finalNumbers = finalNumbers.filter(num => conditionNumbers[i].includes(num));
    }
    
    // Сортируем
    finalNumbers.sort((a, b) => a - b);
    
    // Считаем сумму процентов
    const totalPercent = conditions.reduce((sum, cond) => sum + cond.percent, 0);
    
    // Формируем текст для отображения
    let displayText = '';
    if (finalNumbers.length === 0) {
        displayText = getTranslation('noCommonNumbers');
    } else {
        // Показываем первые 10 чисел, если больше - добавляем "..."
        const numbersStr = finalNumbers.length <= 10 
            ? finalNumbers.join(', ')
            : finalNumbers.slice(0, 10).join(', ') + '...';
        
        displayText = `${numbersStr} = ${totalPercent}%`;
    }
    
    document.getElementById('totalBetText').textContent = displayText;
    
    return { finalNumbers, totalPercent };
}

// --- Обновление выпадающего списка стратегий (старый) ---
function updateStrategyOptions() {
    const select = document.getElementById('strategySelect');
    const type = document.querySelector('[data-type].active')?.dataset.type || 'european';
    
    select.innerHTML = '';
    
    // Зеро в зависимости от типа
    if (type === 'european') {
        const zeroOption = document.createElement('option');
        zeroOption.value = 'zero';
        zeroOption.setAttribute('data-i18n', 'strategyZero');
        select.appendChild(zeroOption);
    } else {
        const zeroOption = document.createElement('option');
        zeroOption.value = 'zero';
        zeroOption.setAttribute('data-i18n', 'strategyZero');
        select.appendChild(zeroOption);
        
        const doubleZeroOption = document.createElement('option');
        doubleZeroOption.value = 'doublezero';
        doubleZeroOption.setAttribute('data-i18n', 'strategyDoubleZero');
        select.appendChild(doubleZeroOption);
    }
    
    // Базовые ставки
    const baseKeys = ['red', 'black', 'even', 'odd', 'low', 'high'];
    baseKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.setAttribute('data-i18n', `strategy${key.charAt(0).toUpperCase() + key.slice(1)}`);
        select.appendChild(option);
    });
    
    // Дюжины
    const dozenKeys = ['dozen1', 'dozen2', 'dozen3'];
    dozenKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.setAttribute('data-i18n', `strategy${key.charAt(0).toUpperCase() + key.slice(1)}`);
        select.appendChild(option);
    });
    
    // Колонны
    const columnKeys = ['column1', 'column2', 'column3'];
    columnKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.setAttribute('data-i18n', `strategy${key.charAt(0).toUpperCase() + key.slice(1)}`);
        select.appendChild(option);
    });
    
    // Применяем переводы
    if (window.reloadTranslationsForNewContent) {
        window.reloadTranslationsForNewContent(select);
    }
}

// --- Обработчики событий ---
function initEventListeners() {
    // Переключение типа рулетки
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-type]').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            updateStrategyOptions();
            calculateTotalBet(); // Пересчитываем для нового типа
        });
    });

    // Условия остановки
    document.getElementById('stopTarget').addEventListener('change', updateTargetInputState);
    document.getElementById('stopSpins').addEventListener('change', updateTargetInputState);
    
    // Кнопки
    document.getElementById('simulateBtn').addEventListener('click', simulateStrategy);
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);
    
    // Кнопка добавления условия
    const addBtn = document.getElementById('addConditionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addCondition);
    }
    
    // Обновление при смене языка
    document.addEventListener('languageChanged', () => {
        updateStrategyOptions();
        renderConditions();
        calculateTotalBet();
    });
}

function updateTargetInputState() {
    const targetChecked = document.getElementById('stopTarget').checked;
    document.getElementById('targetAmount').disabled = !targetChecked;
    
    const spinsChecked = document.getElementById('stopSpins').checked;
    document.getElementById('maxSpins').disabled = !spinsChecked;
}

// --- ОСНОВНАЯ ФУНКЦИЯ СИМУЛЯЦИИ ---
async function simulateStrategy() {
    if (isSimulating) return;
    
    const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';
    const config = RouletteConfig[rouletteType];
    
    const startingBankroll = parseInt(document.getElementById('startingBankroll').value) || 1000;
    const betAmount = parseInt(document.getElementById('betAmount').value) || 10;
    const strategy = document.getElementById('strategySelect').value; // Пока оставляем для совместимости
    
    const triggerType = document.getElementById('triggerType').value;
    const triggerCount = parseInt(document.getElementById('triggerCount').value) || 3;
    
    const stopBankrupt = document.getElementById('stopBankrupt').checked;
    const stopTarget = document.getElementById('stopTarget').checked;
    const targetAmount = parseInt(document.getElementById('targetAmount').value) || 2000;
    const stopSpins = document.getElementById('stopSpins').checked;
    const maxSpins = parseInt(document.getElementById('maxSpins').value) || 100;
    
    const sessionCount = parseInt(document.getElementById('sessionCount').value) || 500;
    
    // Получаем итоговые числа из условий
    const { finalNumbers, totalPercent } = calculateTotalBet();
    
    if (finalNumbers.length === 0) {
        alert('Нет чисел для ставки! Проверьте условия.');
        return;
    }
    
    if (totalPercent !== 100) {
        alert('Сумма процентов должна быть 100%!');
        return;
    }
    
    if (betAmount > startingBankroll) {
        alert(getTranslation('betTooLarge'));
        return;
    }
    
    isSimulating = true;
    document.getElementById('simulateBtn').disabled = true;
    document.getElementById('simulateBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>' + getTranslation('simulating') + '</span>';
    
    setTimeout(() => {
        const results = runSimulation(
            config, startingBankroll, betAmount, finalNumbers,
            triggerType, triggerCount,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins,
            sessionCount
        );
        
        displayResults(results);
        
        isSimulating = false;
        document.getElementById('simulateBtn').disabled = false;
        document.getElementById('simulateBtn').innerHTML = '<i class="fas fa-cogs"></i> <span>' + getTranslation('simulateBtn') + '</span>';
    }, 50);
}

// --- Функция симуляции одной сессии (обновленная) ---
function simulateSession(config, startingBankroll, betAmount, targetNumbers, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins) {
    let bankroll = startingBankroll;
    let spins = 0;
    let triggerCounter = 0;
    let betPlaced = false;
    
    while (true) {
        if (stopBankrupt && bankroll <= 0) break;
        if (stopTarget && bankroll >= targetAmount) break;
        if (stopSpins && spins >= maxSpins) break;
        
        const number = Math.floor(Math.random() * config.numbers);
        spins++;
        
        const isWin = targetNumbers.includes(number);
        
        if (triggerType === 'missed') {
            if (!isWin) triggerCounter++;
            else triggerCounter = 0;
        } else {
            if (isWin) triggerCounter++;
            else triggerCounter = 0;
        }
        
        if (triggerCounter >= triggerCount && !betPlaced) {
            betPlaced = true;
            
            if (bankroll >= betAmount) {
                bankroll -= betAmount;
                
                if (isWin) {
                    // Для нескольких чисел ставка распределяется поровну
                    const numbersCount = targetNumbers.length;
                    const payout = 35; // straight up
                    bankroll += betAmount + (betAmount * payout);
                }
            }
        }
        
        if (betPlaced) {
            betPlaced = false;
            triggerCounter = 0;
        }
    }
    
    return {
        profit: bankroll - startingBankroll,
        spins: spins,
        bankrupt: bankroll <= 0
    };
}

// --- Функция запуска множества сессий (обновленная) ---
function runSimulation(config, startingBankroll, betAmount, targetNumbers, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins, sessionCount) {
    const sessions = [];
    
    for (let i = 0; i < sessionCount; i++) {
        const session = simulateSession(
            config, startingBankroll, betAmount, targetNumbers,
            triggerType, triggerCount,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins
        );
        sessions.push(session);
    }
    
    const successfulSessions = sessions.filter(s => s.profit > 0).length;
    const bankruptSessions = sessions.filter(s => s.bankrupt).length;
    const totalProfit = sessions.reduce((sum, s) => sum + s.profit, 0);
    const avgProfit = totalProfit / sessionCount;
    const avgSpins = sessions.reduce((sum, s) => sum + s.spins, 0) / sessionCount;
    const maxProfit = Math.max(...sessions.map(s => s.profit));
    const minProfit = Math.min(...sessions.map(s => s.profit));
    
    return {
        winRate: successfulSessions / sessionCount,
        avgProfit: avgProfit,
        riskRate: bankruptSessions / sessionCount,
        successfulSessions,
        bankruptSessions,
        totalSessions: sessionCount,
        avgSpins,
        maxProfit,
        maxLoss: Math.abs(minProfit),
        profitDistribution: sessions.map(s => s.profit).sort((a,b) => a - b)
    };
}

// --- Отображение результатов ---
function displayResults(results) {
    document.getElementById('winRate').textContent = (results.winRate * 100).toFixed(1) + '%';
    document.getElementById('avgProfit').textContent = '$' + Math.round(results.avgProfit);
    document.getElementById('riskPercent').textContent = (results.riskRate * 100).toFixed(1) + '%';
    
    document.getElementById('sessionsSimulated').textContent = results.totalSessions;
    document.getElementById('successfulSessions').textContent = results.successfulSessions;
    document.getElementById('bankruptSessions').textContent = results.bankruptSessions;
    document.getElementById('avgSpins').textContent = Math.round(results.avgSpins);
    document.getElementById('maxProfit').textContent = '$' + results.maxProfit;
    document.getElementById('maxLoss').textContent = '$' + results.maxLoss;
    
    drawSimpleChart(results.profitDistribution);
}

function drawSimpleChart(distribution) {
    const chartContainer = document.querySelector('.chart-placeholder');
    if (!chartContainer) return;
    
    if (distribution.length === 0) {
        chartContainer.innerHTML = '<span class="text-muted">' + getTranslation('noData') + '</span>';
        return;
    }
    
    const positiveCount = distribution.filter(v => v > 0).length;
    const positivePercent = (positiveCount / distribution.length) * 100;
    
    chartContainer.innerHTML = `
        <div style="width: 100%; padding: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span class="text-medium">${getTranslation('profitableSessions')}</span>
                <span class="text-success">${positivePercent.toFixed(1)}%</span>
            </div>
            <div style="width: 100%; height: 20px; background: var(--bg-elevated); border-radius: 10px; overflow: hidden;">
                <div style="width: ${positivePercent}%; height: 100%; background: var(--color-success); border-radius: 10px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                <span class="text-danger">$${Math.min(...distribution)}</span>
                <span class="text-light">0</span>
                <span class="text-success">+$${Math.max(...distribution)}</span>
            </div>
        </div>
    `;
}

function resetSimulation() {
    document.getElementById('startingBankroll').value = 1000;
    document.getElementById('betAmount').value = 10;
    document.getElementById('triggerCount').value = 3;
    document.getElementById('targetAmount').value = 2000;
    document.getElementById('maxSpins').value = 100;
    document.getElementById('sessionCount').value = 500;
    
    document.getElementById('stopTarget').checked = false;
    document.getElementById('stopSpins').checked = true;
    updateTargetInputState();
    
    document.getElementById('winRate').textContent = '0.0%';
    document.getElementById('avgProfit').textContent = '$0';
    document.getElementById('riskPercent').textContent = '0.0%';
    document.getElementById('sessionsSimulated').textContent = '0';
    document.getElementById('successfulSessions').textContent = '0';
    document.getElementById('bankruptSessions').textContent = '0';
    document.getElementById('avgSpins').textContent = '0';
    document.getElementById('maxProfit').textContent = '$0';
    document.getElementById('maxLoss').textContent = '$0';
    
    const chartContainer = document.querySelector('.chart-placeholder');
    if (chartContainer) {
        chartContainer.innerHTML = '<span class="text-muted">' + getTranslation('chartPlaceholder') + '</span>';
    }
    
    // Сброс условий
    initConditions();
}

window.simulateStrategy = simulateStrategy;
