// roulette.js - Анализатор стратегий рулетки

// --- Конфигурация рулетки ---
const RouletteConfig = {
    european: {
        numbers: 37,
        zero: 0,
        zeroNumbers: [0],
        type: 'european',
        payouts: {
            straight: 35, split: 17, street: 11, corner: 8, line: 5,
            dozen: 2, column: 2, even: 1, odd: 1, red: 1, black: 1,
            low: 1, high: 1, zero: 35
        }
    },
    american: {
        numbers: 38,
        zero: [0, 37],
        zeroNumbers: [0, 37],
        type: 'american',
        payouts: {
            straight: 35, split: 17, street: 11, corner: 8, line: 5,
            dozen: 2, column: 2, even: 1, odd: 1, red: 1, black: 1,
            low: 1, high: 1, zero: 35, doublezero: 35
        }
    }
};

// --- Ставки и их условия (числовые множества) ---
const BetDefinitions = {
    red:     { numbers: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] },
    black:   { numbers: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35] },
    even:    { numbers: Array.from({length: 36}, (_, i) => i + 1).filter(n => n % 2 === 0) },
    odd:     { numbers: Array.from({length: 36}, (_, i) => i + 1).filter(n => n % 2 === 1) },
    low:     { numbers: Array.from({length: 18}, (_, i) => i + 1) },
    high:    { numbers: Array.from({length: 18}, (_, i) => i + 19) },
    zero:    { numbers: [0] },
    doublezero: { numbers: [37] },
    dozen1:  { numbers: Array.from({length: 12}, (_, i) => i + 1) },
    dozen2:  { numbers: Array.from({length: 12}, (_, i) => i + 13) },
    dozen3:  { numbers: Array.from({length: 12}, (_, i) => i + 25) },
    column1: { numbers: [1,4,7,10,13,16,19,22,25,28,31,34] },
    column2: { numbers: [2,5,8,11,14,17,20,23,26,29,32,35] },
    column3: { numbers: [3,6,9,12,15,18,21,24,27,30,33,36] }
};

// --- Состояние интерфейса ---
let isSimulating = false;
let conditions = [];
const MAX_CONDITIONS = 5;
let percentActive = true;

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    updateTargetInputState();
    initConditions();
});

// --- Парсинг своих чисел с поддержкой диапазонов ---
function parseCustomNumbers(input) {
    if (!input || input.trim() === '') return [];
    const parts = input.split(',').map(s => s.trim());
    let numbers = [];
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    if (i >= 0 && i <= 36) numbers.push(i);
                }
            }
        } else {
            const num = parseInt(part);
            if (!isNaN(num) && num >= 0 && num <= 36) numbers.push(num);
        }
    });
    return [...new Set(numbers)].sort((a, b) => a - b);
}

// --- Инициализация условий ---
function initConditions() {
    conditions = [{ not: false, type: 'custom', customNumbers: '', percent: 100 }];
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

        // Номер
        const numberDiv = document.createElement('div');
        numberDiv.className = 'condition-number';
        numberDiv.textContent = index + 1;
        row.appendChild(numberDiv);

        // Чекбокс "НЕ"
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
        notLabel.setAttribute('data-i18n', 'not');
        notDiv.appendChild(notCheckbox);
        notDiv.appendChild(notLabel);
        row.appendChild(notDiv);

        // Список типов ставок
        const select = document.createElement('select');
        select.className = 'condition-select settings-select bg-surface border-muted text-light';
        const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';

        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.setAttribute('data-i18n', 'customNumbersTitle');
        select.appendChild(customOption);

        const zeroOption = document.createElement('option');
        zeroOption.value = 'zero';
        zeroOption.setAttribute('data-i18n', 'strategyZero');
        select.appendChild(zeroOption);

        if (rouletteType === 'american') {
            const doubleZeroOption = document.createElement('option');
            doubleZeroOption.value = 'doublezero';
            doubleZeroOption.setAttribute('data-i18n', 'strategyDoubleZero');
            select.appendChild(doubleZeroOption);
        }

        ['red','black','even','odd','low','high'].forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.setAttribute('data-i18n', `strategy${key.charAt(0).toUpperCase() + key.slice(1)}`);
            select.appendChild(option);
        });

        ['dozen1','dozen2','dozen3'].forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.setAttribute('data-i18n', `strategy${key.charAt(0).toUpperCase() + key.slice(1)}`);
            select.appendChild(option);
        });

        ['column1','column2','column3'].forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.setAttribute('data-i18n', `strategy${key.charAt(0).toUpperCase() + key.slice(1)}`);
            select.appendChild(option);
        });

        if (window.reloadTranslationsForNewContent) window.reloadTranslationsForNewContent(select);

        select.value = cond.type;
        select.addEventListener('change', () => {
            conditions[index].type = select.value;
            renderConditions();
            calculateTotalBet();
        });
        row.appendChild(select);

        // Поле своих чисел
        if (cond.type === 'custom') {
            const customInput = document.createElement('input');
            customInput.type = 'text';
            customInput.className = 'condition-custom-input settings-input bg-elevated border-muted text-light';
            customInput.setAttribute('data-i18n-placeholder', 'customNumbersPlaceholder');
            customInput.value = cond.customNumbers;
            customInput.addEventListener('input', () => {
                conditions[index].customNumbers = customInput.value;
                calculateTotalBet();
            });
            row.appendChild(customInput);
        }

        // Поле процента
        const percentWrapper = document.createElement('div');
        percentWrapper.className = 'percent-wrapper';
        percentWrapper.style.cssText = 'display:flex;align-items:center;gap:4px;';

        const percentInput = document.createElement('input');
        percentInput.type = 'number';
        percentInput.className = 'condition-percent settings-input bg-elevated border-muted text-light';
        percentInput.value = cond.percent || 0;
        percentInput.min = '0';
        percentInput.max = '100';
        percentInput.step = '0.1';
        percentInput.disabled = !percentActive;

        percentInput.addEventListener('input', () => {
            if (!percentActive) return;
            let val = parseFloat(percentInput.value);
            conditions[index].percent = isNaN(val) ? 0 : val;
            if (isNaN(val)) percentInput.value = 0;
            calculateTotalBet();
        });

        percentInput.addEventListener('blur', () => {
            if (!percentActive) return;
            let val = Math.round((parseFloat(percentInput.value) || 0) * 10) / 10;
            conditions[index].percent = val;
            percentInput.value = val;
            calculateTotalBet();
        });

        percentWrapper.appendChild(percentInput);

        const percentSymbol = document.createElement('span');
        percentSymbol.className = 'text-medium';
        percentSymbol.setAttribute('data-i18n', 'percent');
        percentWrapper.appendChild(percentSymbol);
        row.appendChild(percentWrapper);

        // Кнопка удаления
        if (conditions.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'condition-remove';
            removeBtn.innerHTML = '✕';
            removeBtn.setAttribute('data-i18n-title', 'removeCondition');
            removeBtn.addEventListener('click', () => removeCondition(index));
            row.appendChild(removeBtn);
        }

        container.appendChild(row);
    });

    if (window.reloadTranslationsForNewContent) window.reloadTranslationsForNewContent(container);

    updatePercentWarning();

    setTimeout(() => { calculateTotalBet(); }, 50);
}

// --- Предупреждение о процентах ---
function updatePercentWarning() {
    const oldWarning = document.getElementById('percentWarning');
    if (oldWarning) oldWarning.remove();
    if (!percentActive) return;

    const totalPercent = conditions.reduce((sum, cond) => sum + (cond.percent || 0), 0);
    if (Math.abs(totalPercent - 100) > 0.1) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'percentWarning';
        warningDiv.className = 'percent-warning text-warning';
        const msg = window.getTranslation('totalPercentWarning');
        warningDiv.textContent = `⚠️ ${msg ? msg.replace('{total}', totalPercent.toFixed(1)) : `Сумма процентов: ${totalPercent.toFixed(1)}% (должна быть 100%)`}`;
        const container = document.getElementById('conditionsContainer');
        container.parentNode.insertBefore(warningDiv, container.nextSibling);
    }
}

// --- Добавить условие ---
function addCondition() {
    if (conditions.length >= MAX_CONDITIONS) {
        alert(window.getTranslation('maxConditions'));
        return;
    }
    conditions.push({ not: false, type: 'custom', customNumbers: '', percent: 0 });
    renderConditions();
    calculateTotalBet();
}

// --- Удалить условие ---
function removeCondition(index) {
    if (conditions.length <= 1) return;
    conditions.splice(index, 1);
    renderConditions();
    calculateTotalBet();
}

// --- Получить числа для условия ---
function getNumbersForCondition(cond) {
    const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';
    const config = RouletteConfig[rouletteType];
    let numbers = cond.type === 'custom'
        ? parseCustomNumbers(cond.customNumbers)
        : (BetDefinitions[cond.type]?.numbers || []);
    if (cond.not) {
        const allNumbers = Array.from({length: config.numbers}, (_, i) => i);
        numbers = allNumbers.filter(n => !numbers.includes(n));
    }
    return numbers;
}

// --- Рассчитать итоговое пересечение ---
function calculateTotalBet() {
    if (conditions.length === 0) {
        document.getElementById('totalBetText').textContent = '—';
        return { finalNumbers: [], totalPercent: 0 };
    }

    const conditionNumbers = conditions.map(cond => getNumbersForCondition(cond));
    let finalNumbers = conditionNumbers[0];
    for (let i = 1; i < conditionNumbers.length; i++) {
        finalNumbers = finalNumbers.filter(num => conditionNumbers[i].includes(num));
    }

    finalNumbers.sort((a, b) => {
        if (a === 0) return -1;
        if (b === 0) return 1;
        if (a === 37) return -1;
        if (b === 37) return 1;
        return a - b;
    });

    let totalPercent = 0;
    if (percentActive) {
        totalPercent = conditions.reduce((sum, cond) => sum + (cond.percent || 0), 0);
    }

    let displayText = '';
    if (finalNumbers.length === 0) {
        displayText = window.getTranslation('noCommonNumbers') || '❌ Нет общих чисел';
    } else {
        const displayNumbers = finalNumbers.map(n => n === 37 ? '00' : n.toString());
        let numbersStr = displayNumbers.length <= 10
            ? displayNumbers.join(', ')
            : displayNumbers.slice(0, 8).join(', ') + '...' + displayNumbers.slice(-2).join(', ');
        displayText = percentActive ? `${numbersStr} = ${totalPercent.toFixed(1)}%` : numbersStr;
    }

    document.getElementById('totalBetText').textContent = displayText;
    updatePercentWarning();
    return { finalNumbers, totalPercent };
}

// --- Обработчики событий ---
function initEventListeners() {
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderConditions();
            calculateTotalBet();
        });
    });

    document.getElementById('stopTarget').addEventListener('change', updateTargetInputState);
    document.getElementById('stopSpins').addEventListener('change', updateTargetInputState);
    document.getElementById('simulateBtn').addEventListener('click', simulateStrategy);
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);

    const addBtn = document.getElementById('addConditionBtn');
    if (addBtn) addBtn.addEventListener('click', addCondition);

    const percentToggle = document.getElementById('percentToggle');
    if (percentToggle) {
        percentToggle.addEventListener('change', function() {
            percentActive = this.checked;
            renderConditions();
            calculateTotalBet();
        });
    }

    document.addEventListener('languageChanged', () => {
        renderConditions();
        calculateTotalBet();
    });
}

function updateTargetInputState() {
    document.getElementById('targetAmount').disabled = !document.getElementById('stopTarget').checked;
    document.getElementById('maxSpins').disabled = !document.getElementById('stopSpins').checked;
}

// --- Симуляция ---
async function simulateStrategy() {
    if (isSimulating) return;

    const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';
    const config = RouletteConfig[rouletteType];
    const startingBankroll = parseInt(document.getElementById('startingBankroll').value) || 1000;
    const betAmount = parseInt(document.getElementById('betAmount').value) || 10;
    const triggerType = document.getElementById('triggerType').value;
    const triggerCount = parseInt(document.getElementById('triggerCount').value) || 3;
    const stopBankrupt = document.getElementById('stopBankrupt').checked;
    const stopTarget = document.getElementById('stopTarget').checked;
    const targetAmount = parseInt(document.getElementById('targetAmount').value) || 2000;
    const stopSpins = document.getElementById('stopSpins').checked;
    const maxSpins = parseInt(document.getElementById('maxSpins').value) || 100;
    const sessionCount = parseInt(document.getElementById('sessionCount').value) || 500;

    const { finalNumbers, totalPercent } = calculateTotalBet();

    if (finalNumbers.length === 0) {
        alert(window.getTranslation('noCommonNumbers') || '❌ Нет общих чисел');
        return;
    }
    if (percentActive && Math.abs(totalPercent - 100) > 0.1) {
        alert(window.getTranslation('percentTotalError') || 'Сумма процентов должна быть 100%!');
        return;
    }
    if (betAmount > startingBankroll) {
        alert(window.getTranslation('betTooLarge') || 'Ставка не может быть больше банка!');
        return;
    }

    isSimulating = true;
    document.getElementById('simulateBtn').disabled = true;
    document.getElementById('simulateBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-i18n="simulating"></span>';

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
        document.getElementById('simulateBtn').innerHTML = '<i class="fas fa-cogs"></i> <span data-i18n="simulateBtn"></span>';
        if (window.reloadTranslationsForNewContent) {
            window.reloadTranslationsForNewContent(document.getElementById('simulateBtn'));
        }
    }, 50);
}

// --- Симуляция одной сессии ---
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
            if (!isWin) triggerCounter++; else triggerCounter = 0;
        } else {
            if (isWin) triggerCounter++; else triggerCounter = 0;
        }

        if (triggerCounter >= triggerCount && !betPlaced) {
            betPlaced = true;
            if (bankroll >= betAmount) {
                bankroll -= betAmount;
                if (isWin) bankroll += betAmount + (betAmount * 35);
            }
        }

        if (betPlaced) { betPlaced = false; triggerCounter = 0; }
    }

    return { profit: bankroll - startingBankroll, spins, bankrupt: bankroll <= 0 };
}

// --- Запуск множества сессий ---
function runSimulation(config, startingBankroll, betAmount, targetNumbers, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins, sessionCount) {
    const sessions = [];
    for (let i = 0; i < sessionCount; i++) {
        sessions.push(simulateSession(config, startingBankroll, betAmount, targetNumbers, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins));
    }
    const successfulSessions = sessions.filter(s => s.profit > 0).length;
    const bankruptSessions = sessions.filter(s => s.bankrupt).length;
    const avgProfit = sessions.reduce((sum, s) => sum + s.profit, 0) / sessionCount;
    const avgSpins = sessions.reduce((sum, s) => sum + s.spins, 0) / sessionCount;
    const maxProfit = Math.max(...sessions.map(s => s.profit));
    const minProfit = Math.min(...sessions.map(s => s.profit));
    return {
        winRate: successfulSessions / sessionCount,
        avgProfit, riskRate: bankruptSessions / sessionCount,
        successfulSessions, bankruptSessions, totalSessions: sessionCount,
        avgSpins, maxProfit, maxLoss: Math.abs(minProfit),
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
        chartContainer.innerHTML = '<span class="text-muted" data-i18n="noData"></span>';
        return;
    }
    const positivePercent = (distribution.filter(v => v > 0).length / distribution.length) * 100;
    chartContainer.innerHTML = `
        <div style="width:100%;padding:10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span class="text-medium" data-i18n="profitableSessions"></span>
                <span class="text-success">${positivePercent.toFixed(1)}%</span>
            </div>
            <div style="width:100%;height:20px;background:var(--bg-elevated);border-radius:10px;overflow:hidden;">
                <div style="width:${positivePercent}%;height:100%;background:var(--color-success);border-radius:10px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;">
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
    if (chartContainer) chartContainer.innerHTML = '<span class="text-muted" data-i18n="chartPlaceholder"></span>';
    initConditions();
}

window.simulateStrategy = simulateStrategy;
