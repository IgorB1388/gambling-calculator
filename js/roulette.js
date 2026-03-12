// roulette.js - Анализатор стратегий рулетки

// --- Конфигурация ---
const RouletteConfig = {
    european: {
        numbers: 37, zeroNumbers: [0], type: 'european',
        payouts: { red: 1, black: 1, even: 1, odd: 1, low: 1, high: 1, dozen: 2, column: 2, zero: 35 }
    },
    american: {
        numbers: 38, zeroNumbers: [0, 37], type: 'american',
        payouts: { red: 1, black: 1, even: 1, odd: 1, low: 1, high: 1, dozen: 2, column: 2, zero: 35, doublezero: 35 }
    }
};

const BetDefinitions = {
    red:        { numbers: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36], payout: 1 },
    black:      { numbers: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35], payout: 1 },
    even:       { numbers: Array.from({length:36},(_,i)=>i+1).filter(n=>n%2===0), payout: 1 },
    odd:        { numbers: Array.from({length:36},(_,i)=>i+1).filter(n=>n%2===1), payout: 1 },
    low:        { numbers: Array.from({length:18},(_,i)=>i+1), payout: 1 },
    high:       { numbers: Array.from({length:18},(_,i)=>i+19), payout: 1 },
    zero:       { numbers: [0], payout: 35 },
    doublezero: { numbers: [37], payout: 35 },
    dozen1:     { numbers: Array.from({length:12},(_,i)=>i+1), payout: 2 },
    dozen2:     { numbers: Array.from({length:12},(_,i)=>i+13), payout: 2 },
    dozen3:     { numbers: Array.from({length:12},(_,i)=>i+25), payout: 2 },
    column1:    { numbers: [1,4,7,10,13,16,19,22,25,28,31,34], payout: 2 },
    column2:    { numbers: [2,5,8,11,14,17,20,23,26,29,32,35], payout: 2 },
    column3:    { numbers: [3,6,9,12,15,18,21,24,27,30,33,36], payout: 2 }
};

// Пресеты стратегий
const Presets = {
    martingale_red: {
        conditions: [{ not: false, type: 'red', customNumbers: '', percent: 100 }],
        progression: 'martingale',
        triggerType: 'missed',
        triggerCount: 1,
        afterTrigger: 'until_win',
        betAmount: 10,
        bankroll: 1000,
        maxSpins: 200
    },
    flat_even: {
        conditions: [{ not: false, type: 'even', customNumbers: '', percent: 100 }],
        progression: 'flat',
        triggerType: 'missed',
        triggerCount: 3,
        afterTrigger: 'once',
        betAmount: 10,
        bankroll: 1000,
        maxSpins: 100
    },
    fibonacci_dozens: {
        conditions: [{ not: false, type: 'dozen1', customNumbers: '', percent: 100 }],
        progression: 'fibonacci',
        triggerType: 'missed',
        triggerCount: 2,
        afterTrigger: 'until_win',
        betAmount: 10,
        bankroll: 1000,
        maxSpins: 150
    },
    antimartingale_black: {
        conditions: [{ not: false, type: 'black', customNumbers: '', percent: 100 }],
        progression: 'antimartingale',
        triggerType: 'hit',
        triggerCount: 1,
        afterTrigger: 'until_win',
        betAmount: 10,
        bankroll: 1000,
        maxSpins: 100
    }
};

// Подсказки к прогрессиям
const ProgressionHints = {
    flat: 'progressionHintFlat',
    martingale: 'progressionHintMartingale',
    antimartingale: 'progressionHintAntiMartingale',
    fibonacci: 'progressionHintFibonacci',
    dalembert: 'progressionHintDalembert'
};

let isSimulating = false;
let conditions = [];
const MAX_CONDITIONS = 5;

// --- Инициализация ---
function initApp() {
    initEventListeners();
    initTooltips();
    updateTargetInputState();
    initConditions();
    updateProgressionHint();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.translationsReady) {
        initApp();
    } else {
        document.addEventListener('translationsReady', initApp, { once: true });
    }
});

// --- Тултипы ---
function initTooltips() {
    const popup = document.getElementById('tooltipPopup');
    if (!popup) return;

    document.querySelectorAll('.tooltip-icon').forEach(icon => {
        icon.addEventListener('mouseenter', (e) => {
            const key = icon.getAttribute('data-tooltip-key');
            const text = window.getTranslation ? window.getTranslation(key) : key;
            if (!text) return;
            popup.textContent = text;
            popup.style.display = 'block';
            positionTooltip(e, popup);
        });
        icon.addEventListener('mousemove', (e) => positionTooltip(e, popup));
        icon.addEventListener('mouseleave', () => { popup.style.display = 'none'; });
    });
}

function positionTooltip(e, popup) {
    const x = e.clientX + 12;
    const y = e.clientY + 12;
    const maxX = window.innerWidth - popup.offsetWidth - 16;
    const maxY = window.innerHeight - popup.offsetHeight - 16;
    popup.style.left = Math.min(x, maxX) + 'px';
    popup.style.top = Math.min(y, maxY) + 'px';
}

// --- Прогрессия ---
function updateProgressionHint() {
    const sel = document.getElementById('progressionType');
    const hint = document.getElementById('progressionHint');
    if (!sel || !hint) return;
    const key = ProgressionHints[sel.value];
    hint.textContent = window.getTranslation ? (window.getTranslation(key) || '') : '';
}

// --- Парсинг чисел ---
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

// --- Условия ---
function initConditions() {
    conditions = [{ not: false, type: 'red', customNumbers: '', percent: 100 }];
    renderConditions();
    calculateTotalBet();
}

function renderConditions() {
    const container = document.getElementById('conditionsContainer');
    if (!container) return;
    container.innerHTML = '';
    const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';

    conditions.forEach((cond, index) => {
        const row = document.createElement('div');
        row.className = 'condition-row';

        const numberDiv = document.createElement('div');
        numberDiv.className = 'condition-number text-4';
        numberDiv.textContent = index + 1;
        row.appendChild(numberDiv);

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

        const select = document.createElement('select');
        select.className = 'condition-select';

        const orderedOptions = [
            { value: 'red', i18n: 'strategyRed' },
            { value: 'black', i18n: 'strategyBlack' },
            { value: 'even', i18n: 'strategyEven' },
            { value: 'odd', i18n: 'strategyOdd' },
            { value: 'low', i18n: 'strategyLow' },
            { value: 'high', i18n: 'strategyHigh' },
            { value: 'dozen1', i18n: 'strategyDozen1' },
            { value: 'dozen2', i18n: 'strategyDozen2' },
            { value: 'dozen3', i18n: 'strategyDozen3' },
            { value: 'column1', i18n: 'strategyColumn1' },
            { value: 'column2', i18n: 'strategyColumn2' },
            { value: 'column3', i18n: 'strategyColumn3' },
            { value: 'zero', i18n: 'strategyZero' },
            { value: 'custom', i18n: 'customNumbersTitle' }
        ];

        if (rouletteType === 'american') {
            orderedOptions.splice(13, 0, { value: 'doublezero', i18n: 'strategyDoubleZero' });
        }

        orderedOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.setAttribute('data-i18n', opt.i18n);
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

        if (cond.type === 'custom') {
            const customInput = document.createElement('input');
            customInput.type = 'text';
            customInput.className = 'condition-custom-input';
            const placeholder = window.getTranslation ? (window.getTranslation('customNumbersPlaceholder') || '') : '';
            customInput.placeholder = placeholder;
            customInput.value = cond.customNumbers;
            customInput.addEventListener('input', () => {
                conditions[index].customNumbers = customInput.value;
                calculateTotalBet();
            });
            row.appendChild(customInput);
        }

        if (conditions.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'condition-remove';
            removeBtn.innerHTML = '✕';
            removeBtn.addEventListener('click', () => removeCondition(index));
            row.appendChild(removeBtn);
        }

        container.appendChild(row);
    });

    if (window.reloadTranslationsForNewContent) window.reloadTranslationsForNewContent(container);
    calculateTotalBet();
}

function addCondition() {
    if (conditions.length >= MAX_CONDITIONS) return;
    conditions.push({ not: false, type: 'red', customNumbers: '', percent: 0 });
    renderConditions();
    calculateTotalBet();
}

function removeCondition(index) {
    if (conditions.length <= 1) return;
    conditions.splice(index, 1);
    renderConditions();
    calculateTotalBet();
}

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

function getPayoutForNumbers(numbers) {
    if (numbers.length === 0) return 1;
    for (const [key, def] of Object.entries(BetDefinitions)) {
        if (def.numbers.length === numbers.length &&
            def.numbers.every(n => numbers.includes(n))) {
            return def.payout;
        }
    }
    if (numbers.length === 1) return 35;
    if (numbers.length === 2) return 17;
    if (numbers.length === 3) return 11;
    if (numbers.length === 4) return 8;
    if (numbers.length === 6) return 5;
    return 1;
}

function calculateTotalBet() {
    if (conditions.length === 0) {
        document.getElementById('totalBetText').textContent = '—';
        return { finalNumbers: [] };
    }

    const conditionNumbers = conditions.map(cond => getNumbersForCondition(cond));
    let finalNumbers = conditionNumbers[0] || [];
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

    const el = document.getElementById('totalBetText');
    if (!el) return { finalNumbers };

    if (finalNumbers.length === 0) {
        el.textContent = window.getTranslation ? (window.getTranslation('noCommonNumbers') || '❌ Нет общих чисел') : '❌ Нет общих чисел';
    } else {
        const displayNumbers = finalNumbers.map(n => n === 37 ? '00' : n.toString());
        const numbersStr = displayNumbers.length <= 10
            ? displayNumbers.join(', ')
            : displayNumbers.slice(0, 8).join(', ') + ' ... ' + displayNumbers.slice(-1).join(', ');
        el.textContent = `${numbersStr} (${finalNumbers.length})`;
    }

    return { finalNumbers };
}

// --- Пресеты ---
function applyPreset(presetKey) {
    const preset = Presets[presetKey];
    if (!preset) return;

    conditions = preset.conditions.map(c => ({ ...c }));

    document.getElementById('betAmount').value = preset.betAmount;
    document.getElementById('startingBankroll').value = preset.bankroll;
    document.getElementById('triggerType').value = preset.triggerType;
    document.getElementById('triggerCount').value = preset.triggerCount;
    document.getElementById('afterTriggerMode').value = preset.afterTrigger;
    document.getElementById('progressionType').value = preset.progression;
    document.getElementById('maxSpins').value = preset.maxSpins;
    document.getElementById('stopSpins').checked = true;
    document.getElementById('stopTarget').checked = false;
    updateTargetInputState();
    updateProgressionHint();
    renderConditions();
    calculateTotalBet();
}

// --- Симуляция ---
function getNextBet(baseBet, currentBet, progression, consecutiveLosses, consecutiveWins, fibSeq) {
    switch (progression) {
        case 'flat':
            return baseBet;
        case 'martingale':
            return consecutiveLosses > 0 ? baseBet * Math.pow(2, consecutiveLosses) : baseBet;
        case 'antimartingale':
            return consecutiveWins > 0 ? baseBet * Math.pow(2, consecutiveWins) : baseBet;
        case 'fibonacci': {
            while (fibSeq.length <= consecutiveLosses + 1) {
                fibSeq.push(fibSeq[fibSeq.length - 1] + fibSeq[fibSeq.length - 2]);
            }
            const idx = Math.max(0, consecutiveLosses);
            return baseBet * fibSeq[idx];
        }
        case 'dalembert':
            return Math.max(baseBet, baseBet + consecutiveLosses * baseBet - consecutiveWins * baseBet);
        default:
            return baseBet;
    }
}

function simulateSession(config, startingBankroll, baseBet, targetNumbers, payout,
    triggerType, triggerCount, afterTriggerMode, progression,
    stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins) {

    let bankroll = startingBankroll;
    let spins = 0;
    let triggerCounter = 0;
    let inBettingMode = false;
    let consecutiveLosses = 0;
    let consecutiveWins = 0;
    let fibSeq = [1, 1];
    let bankruptSpins = null;

    while (true) {
        if (stopBankrupt && bankroll <= 0) { bankruptSpins = spins; break; }
        if (stopTarget && bankroll >= targetAmount) break;
        if (stopSpins && spins >= maxSpins) break;

        const number = Math.floor(Math.random() * config.numbers);
        spins++;
        const isHit = targetNumbers.includes(number);

        if (!inBettingMode) {
            if (triggerType === 'missed') {
                if (!isHit) triggerCounter++; else triggerCounter = 0;
            } else {
                if (isHit) triggerCounter++; else triggerCounter = 0;
            }
            if (triggerCounter >= triggerCount) {
                inBettingMode = true;
                triggerCounter = 0;
                consecutiveLosses = 0;
                consecutiveWins = 0;
                fibSeq = [1, 1];
            }
        }

        if (inBettingMode) {
            const currentBet = getNextBet(baseBet, baseBet, progression, consecutiveLosses, consecutiveWins, fibSeq);
            const actualBet = Math.min(currentBet, bankroll);

            if (actualBet <= 0) { bankruptSpins = spins; break; }

            bankroll -= actualBet;

            if (isHit) {
                bankroll += actualBet + actualBet * payout;
                consecutiveWins++;
                consecutiveLosses = 0;

                if (afterTriggerMode === 'once' || afterTriggerMode === 'until_win') {
                    inBettingMode = false;
                    triggerCounter = 0;
                }
            } else {
                consecutiveLosses++;
                consecutiveWins = 0;

                if (afterTriggerMode === 'once') {
                    inBettingMode = false;
                    triggerCounter = 0;
                }
            }
        }
    }

    return {
        profit: bankroll - startingBankroll,
        spins,
        bankrupt: bankroll <= 0,
        bankruptSpins
    };
}

function runSimulation(config, startingBankroll, baseBet, targetNumbers, payout,
    triggerType, triggerCount, afterTriggerMode, progression,
    stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins, sessionCount) {

    const sessions = [];
    for (let i = 0; i < sessionCount; i++) {
        sessions.push(simulateSession(
            config, startingBankroll, baseBet, targetNumbers, payout,
            triggerType, triggerCount, afterTriggerMode, progression,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins
        ));
    }

    const successfulSessions = sessions.filter(s => s.profit > 0).length;
    const bankruptSessions = sessions.filter(s => s.bankrupt);
    const avgProfit = sessions.reduce((sum, s) => sum + s.profit, 0) / sessionCount;
    const avgSpins = sessions.reduce((sum, s) => sum + s.spins, 0) / sessionCount;
    const maxProfit = Math.max(...sessions.map(s => s.profit));
    const minProfit = Math.min(...sessions.map(s => s.profit));

    const bankruptSpinsArr = bankruptSessions.map(s => s.bankruptSpins).filter(v => v !== null);
    const avgSpinsBankrupt = bankruptSpinsArr.length > 0
        ? bankruptSpinsArr.reduce((a, b) => a + b, 0) / bankruptSpinsArr.length
        : 0;

    return {
        winRate: successfulSessions / sessionCount,
        avgProfit,
        riskRate: bankruptSessions.length / sessionCount,
        successfulSessions,
        bankruptSessions: bankruptSessions.length,
        totalSessions: sessionCount,
        avgSpins,
        avgSpinsBankrupt,
        maxProfit,
        maxLoss: Math.abs(minProfit),
        profitDistribution: sessions.map(s => s.profit).sort((a, b) => a - b)
    };
}

// --- Отображение результатов ---
function getRiskHint(riskRate) {
    if (riskRate < 0.1) return window.getTranslation('riskLow') || '✅ Низкий риск';
    if (riskRate < 0.3) return window.getTranslation('riskMedium') || '⚠️ Средний риск';
    return window.getTranslation('riskHigh') || '🔴 Высокий риск';
}

function getWinRateHint(winRate) {
    if (winRate >= 0.6) return window.getTranslation('winRateGood') || '✅ Хорошая';
    if (winRate >= 0.4) return window.getTranslation('winRateAvg') || '⚠️ Средняя';
    return window.getTranslation('winRateBad') || '🔴 Низкая';
}

function getProfitHint(avgProfit) {
    if (avgProfit > 0) return window.getTranslation('profitPositive') || '✅ В плюсе';
    if (avgProfit === 0) return window.getTranslation('profitNeutral') || '➖ В ноль';
    return window.getTranslation('profitNegative') || '🔴 В минусе';
}

function displayResults(results) {
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'flex';
    document.getElementById('resultsContent').style.flexDirection = 'column';
    document.getElementById('resultsContent').style.gap = '16px';

    document.getElementById('winRate').textContent = (results.winRate * 100).toFixed(1) + '%';
    document.getElementById('avgProfit').textContent = '$' + Math.round(results.avgProfit);
    document.getElementById('riskPercent').textContent = (results.riskRate * 100).toFixed(1) + '%';

    document.getElementById('winRateHint').textContent = getWinRateHint(results.winRate);
    document.getElementById('avgProfitHint').textContent = getProfitHint(results.avgProfit);
    document.getElementById('riskHint').textContent = getRiskHint(results.riskRate);

    document.getElementById('sessionsSimulated').textContent = results.totalSessions;
    document.getElementById('successfulSessions').textContent = results.successfulSessions;
    document.getElementById('bankruptSessions').textContent = results.bankruptSessions;
    document.getElementById('avgSpins').textContent = Math.round(results.avgSpins);
    document.getElementById('avgSpinsBankrupt').textContent =
        results.avgSpinsBankrupt > 0 ? Math.round(results.avgSpinsBankrupt) : '—';
    document.getElementById('maxProfit').textContent = '$' + results.maxProfit;
    document.getElementById('maxLoss').textContent = '$' + results.maxLoss;

    drawChart(results.profitDistribution);
}

function drawChart(distribution) {
    const container = document.getElementById('chartPlaceholder');
    if (!container || distribution.length === 0) return;

    const positivePercent = (distribution.filter(v => v > 0).length / distribution.length) * 100;
    const min = Math.min(...distribution);
    const max = Math.max(...distribution);

    container.innerHTML = `
        <div style="width:100%;padding:8px 4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span class="text-muted" style="font-size:0.82rem;" data-i18n="profitableSessions"></span>
                <span class="text-4" style="font-weight:bold;">${positivePercent.toFixed(1)}%</span>
            </div>
            <div style="width:100%;height:22px;background:var(--bg-body);border-radius:11px;overflow:hidden;margin-bottom:12px;">
                <div style="width:${positivePercent}%;height:100%;background:var(--color-success);border-radius:11px;transition:width 0.5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                <span class="text-7">мин: $${min}</span>
                <span class="text-muted">медиана: $${distribution[Math.floor(distribution.length/2)]}</span>
                <span class="text-4">макс: +$${max}</span>
            </div>
        </div>
    `;

    if (window.reloadTranslationsForNewContent) window.reloadTranslationsForNewContent(container);
}

// --- Главная функция симуляции ---
async function simulateStrategy() {
    if (isSimulating) return;

    const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';
    const config = RouletteConfig[rouletteType];
    const startingBankroll = parseInt(document.getElementById('startingBankroll').value) || 1000;
    const betAmount = parseInt(document.getElementById('betAmount').value) || 10;
    const triggerType = document.getElementById('triggerType').value;
    const triggerCount = parseInt(document.getElementById('triggerCount').value) || 3;
    const afterTriggerMode = document.getElementById('afterTriggerMode').value;
    const progression = document.getElementById('progressionType').value;
    const stopBankrupt = document.getElementById('stopBankrupt').checked;
    const stopTarget = document.getElementById('stopTarget').checked;
    const targetAmount = parseInt(document.getElementById('targetAmount').value) || 2000;
    const stopSpins = document.getElementById('stopSpins').checked;
    const maxSpins = parseInt(document.getElementById('maxSpins').value) || 100;
    const sessionCount = parseInt(document.getElementById('sessionCount').value) || 500;

    const { finalNumbers } = calculateTotalBet();

    if (!finalNumbers || finalNumbers.length === 0) {
        alert(window.getTranslation('noCommonNumbers') || '❌ Нет общих чисел');
        return;
    }
    if (betAmount > startingBankroll) {
        alert(window.getTranslation('betTooLarge') || 'Ставка не может быть больше банка!');
        return;
    }

    const payout = getPayoutForNumbers(finalNumbers);

    isSimulating = true;
    const btn = document.getElementById('simulateBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-i18n="simulating"></span>';
    if (window.reloadTranslationsForNewContent) window.reloadTranslationsForNewContent(btn);

    setTimeout(() => {
        const results = runSimulation(
            config, startingBankroll, betAmount, finalNumbers, payout,
            triggerType, triggerCount, afterTriggerMode, progression,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins, sessionCount
        );
        displayResults(results);
        isSimulating = false;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-cogs"></i> <span data-i18n="simulateBtn"></span>';
        if (window.reloadTranslationsForNewContent) window.reloadTranslationsForNewContent(btn);
    }, 50);
}

// --- Сброс ---
function resetSimulation() {
    document.getElementById('startingBankroll').value = 1000;
    document.getElementById('betAmount').value = 10;
    document.getElementById('triggerType').value = 'missed';
    document.getElementById('triggerCount').value = 3;
    document.getElementById('afterTriggerMode').value = 'once';
    document.getElementById('progressionType').value = 'flat';
    document.getElementById('targetAmount').value = 2000;
    document.getElementById('maxSpins').value = 100;
    document.getElementById('sessionCount').value = 500;
    document.getElementById('stopTarget').checked = false;
    document.getElementById('stopSpins').checked = true;
    const presetsSelect = document.getElementById('presetsSelect');
    if (presetsSelect) presetsSelect.value = '';
    updateTargetInputState();
    updateProgressionHint();
    document.getElementById('resultsPlaceholder').style.display = 'flex';
    document.getElementById('resultsContent').style.display = 'none';
    initConditions();
}

// --- Listeners ---
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

    const progressionSel = document.getElementById('progressionType');
    if (progressionSel) progressionSel.addEventListener('change', updateProgressionHint);

    const presetsSelect = document.getElementById('presetsSelect');
    if (presetsSelect) {
        presetsSelect.addEventListener('change', function() {
            if (this.value) {
                applyPreset(this.value);
                this.value = '';
            }
        });
    }

    document.addEventListener('languageChanged', () => {
        renderConditions();
        calculateTotalBet();
        updateProgressionHint();
        initTooltips();
    });
}

function updateTargetInputState() {
    const targetEl = document.getElementById('targetAmount');
    const spinsEl = document.getElementById('maxSpins');
    if (targetEl) targetEl.disabled = !document.getElementById('stopTarget').checked;
    if (spinsEl) spinsEl.disabled = !document.getElementById('stopSpins').checked;
}

window.simulateStrategy = simulateStrategy;
