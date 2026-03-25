// arbs.js - Анализатор вилок

const ARB_COLORS = [
    '#00f0ff',
    '#ffd966',
    '#b36bff',
    '#ff9966',
    '#ff5fd2',
];

let bkCount = 2;
let outcomeCount = 2;
let oddsValues = [];
let strategy = 'guaranteed';
let lastCalculation = null;
let hasCalculated = false;
let bestBkPerOutcome = [];

const DEFAULT_ODDS = [2.00, 2.00, 3.00, 4.00, 5.00];

// ========== СОХРАНЕНИЕ И ЗАГРУЗКА СОСТОЯНИЯ (только введённые данные) ==========
function saveSettingsState() {
    const state = {
        oddsValues: oddsValues,
        bkCount: bkCount,
        outcomeCount: outcomeCount,
        strategy: strategy,
        totalStake: document.getElementById('totalStake')?.value || '1000'
    };
    localStorage.setItem('arbSettingsState', JSON.stringify(state));
}

function loadSettingsState() {
    const saved = localStorage.getItem('arbSettingsState');
    if (!saved) return false;
    try {
        const state = JSON.parse(saved);
        oddsValues = state.oddsValues;
        bkCount = state.bkCount;
        outcomeCount = state.outcomeCount;
        strategy = state.strategy;
        if (document.getElementById('totalStake')) {
            document.getElementById('totalStake').value = state.totalStake;
        }
        return true;
    } catch (e) {
        console.log('Ошибка загрузки настроек');
        return false;
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initApp() {
    const loaded = loadSettingsState();
    if (!loaded) {
        initState();
    } else {
        // Убедимся, что oddsValues имеет правильную размерность
        if (!oddsValues || oddsValues.length !== bkCount) {
            initState();
        } else {
            for (let b = 0; b < bkCount; b++) {
                if (!oddsValues[b] || oddsValues[b].length !== outcomeCount) {
                    oddsValues[b] = [];
                    for (let o = 0; o < outcomeCount; o++) {
                        oddsValues[b][o] = DEFAULT_ODDS[o % DEFAULT_ODDS.length];
                    }
                }
            }
        }
    }
    renderOddsTable();
    initEventListeners();
    initTooltips();
    updateOutcomePillsActive(outcomeCount);
    updateStrategyPillsActive(strategy);
    // Сбрасываем результат
    hasCalculated = false;
    lastCalculation = null;
    clearInputHighlights();
    showPlaceholder();
    // Скрываем детали (контейнер с таблицей и т.д.)
    const detailsContainer = document.getElementById('arbDetailsContainer');
    if (detailsContainer) detailsContainer.style.display = 'none';
}

function initState() {
    oddsValues = [];
    for (let b = 0; b < bkCount; b++) {
        const row = [];
        for (let o = 0; o < outcomeCount; o++) row.push(DEFAULT_ODDS[o % DEFAULT_ODDS.length]);
        oddsValues.push(row);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.translationsReady) {
        initApp();
    } else {
        document.addEventListener('translationsReady', initApp, { once: true });
    }
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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
    popup.style.left = Math.min(x, window.innerWidth - popup.offsetWidth - 16) + 'px';
    popup.style.top = Math.min(y, window.innerHeight - popup.offsetHeight - 16) + 'px';
}

function showPlaceholder() {
    document.getElementById('resultsPlaceholder').style.display = 'flex';
    document.getElementById('resultsContent').style.display = 'none';
    const detailsContainer = document.getElementById('arbDetailsContainer');
    if (detailsContainer) detailsContainer.style.display = 'none';
}

function showResults() {
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'flex';
}

function showStakeError(show) {
    const input = document.getElementById('totalStake');
    const errorEl = document.getElementById('stakeError');
    if (show) {
        input.classList.add('input-error');
        errorEl.style.display = 'block';
        errorEl.textContent = window.getTranslation('invalidStake') || 'Введите корректную сумму ставки';
    } else {
        input.classList.remove('input-error');
        errorEl.style.display = 'none';
    }
}

function updateOutcomePillsActive(count) {
    document.querySelectorAll('.outcome-pill').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.outcomes) === count);
    });
}

function updateStrategyPillsActive(activeStrategy) {
    document.querySelectorAll('.strategy-mini-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.strategy === activeStrategy);
    });
}

// Форматирование для отображения: 2 знака после запятой по умолчанию, 3 если введено
function formatOddsForDisplay(value) {
    if (value === '' || value === null || isNaN(value)) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    const str = num.toString();
    if (!str.includes('.')) return str + '.00';
    const parts = str.split('.');
    const intPart = parts[0];
    let fracPart = parts[1];
    if (fracPart.length === 1) fracPart += '0';
    else if (fracPart.length === 2) {}
    else if (fracPart.length > 3) fracPart = fracPart.slice(0, 3);
    return intPart + '.' + fracPart;
}

// Обработка ввода с ограничениями
function processOddsInput(inputElement, event) {
    const oldValue = inputElement.value;
    const inputType = event.inputType;
    const isDelete = inputType === 'deleteContentBackward' || inputType === 'deleteContentForward';
    const isInsert = inputType === 'insertText' || inputType === 'insertCompositionText';
    
    if (isDelete) return true;
    if (!isInsert) return true;
    
    const newChar = event.data;
    if (!newChar) return true;
    
    if (!/[\d.]/.test(newChar)) {
        event.preventDefault();
        return false;
    }
    
    if (newChar === '.') {
        if (oldValue.includes('.')) {
            event.preventDefault();
            return false;
        }
        if (oldValue === '' || oldValue === '-') {
            event.preventDefault();
            return false;
        }
        return true;
    }
    
    const dotPos = oldValue.indexOf('.');
    let isIntegerPart = true;
    if (dotPos !== -1 && inputElement.selectionStart > dotPos) {
        isIntegerPart = false;
    }
    
    let newValue = oldValue.slice(0, inputElement.selectionStart) + newChar + oldValue.slice(inputElement.selectionEnd);
    
    if (isIntegerPart) {
        const parts = newValue.split('.');
        let intPart = parts[0];
        if (intPart.length > 4) {
            if (!oldValue.includes('.')) {
                const newInt = intPart.slice(0, 4);
                const extraDigit = intPart.slice(4);
                let newFrac = extraDigit + (parts[1] || '');
                if (newFrac.length > 3) newFrac = newFrac.slice(0, 3);
                newValue = newInt + '.' + newFrac;
                inputElement.value = newValue;
                const newDotPos = newValue.indexOf('.');
                inputElement.setSelectionRange(newDotPos + 1, newDotPos + 1);
                event.preventDefault();
                return false;
            } else {
                event.preventDefault();
                return false;
            }
        }
        return true;
    } else {
        const parts = newValue.split('.');
        const fracPart = parts[1] || '';
        if (fracPart.length > 3) {
            event.preventDefault();
            return false;
        }
        return true;
    }
}

function clearInputHighlights() {
    document.querySelectorAll('.odds-input').forEach(inp => {
        for (let i = 0; i < 5; i++) inp.classList.remove(`arb-highlight-${i}`);
        inp.style.borderColor = '';
        inp.style.boxShadow = '';
    });
}

function applyInputHighlights(bestBkArr) {
    clearInputHighlights();
    bestBkArr.forEach((bkIdx, outcomeIdx) => {
        const input = document.getElementById(`odds-${bkIdx}-${outcomeIdx}`);
        if (input) input.classList.add(`arb-highlight-${outcomeIdx}`);
    });
}

function resetOnEdit() {
    if (hasCalculated) {
        hasCalculated = false;
        lastCalculation = null;
        bestBkPerOutcome = [];
        clearInputHighlights();
        showPlaceholder();
        const detailsContainer = document.getElementById('arbDetailsContainer');
        if (detailsContainer) detailsContainer.style.display = 'none';
    }
    saveSettingsState();
}

// ========== ОТРИСОВКА ТАБЛИЦЫ КОЭФФИЦИЕНТОВ ==========
function renderOddsTable() {
    const container = document.getElementById('oddsTable');
    container.innerHTML = '';
    container.style.setProperty('--outcome-count', outcomeCount);

    const headerRow = document.createElement('div');
    headerRow.className = 'odds-header-row';
    headerRow.appendChild(Object.assign(document.createElement('div'), { className: 'odds-corner' }));
    for (let o = 0; o < outcomeCount; o++) {
        const header = document.createElement('div');
        header.className = 'odds-header text-1';
        header.textContent = `${window.getTranslation('arbsOutcomeLabel') || 'Исход'} ${o + 1}`;
        headerRow.appendChild(header);
    }
    container.appendChild(headerRow);

    for (let b = 0; b < bkCount; b++) {
        const row = document.createElement('div');
        row.className = 'odds-row';

        const labelCell = document.createElement('div');
        labelCell.className = 'odds-bk-label';
        const labelText = document.createElement('span');
        labelText.className = 'text-1';
        labelText.textContent = `${window.getTranslation('arbsBkLabel') || 'БК'} ${b + 1}`;
        labelCell.appendChild(labelText);

        if (bkCount > 2) {
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-bk text-7';
            removeBtn.textContent = '✖️';
            removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeBookmaker(b); });
            labelCell.appendChild(removeBtn);
        }
        row.appendChild(labelCell);

        for (let o = 0; o < outcomeCount; o++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `odds-${b}-${o}`;
            input.className = 'odds-input bg-elevated border-5';
            input.value = oddsValues[b][o] !== undefined && oddsValues[b][o] !== null 
                ? formatOddsForDisplay(oddsValues[b][o]) 
                : '';

            input.addEventListener('beforeinput', (e) => {
                processOddsInput(input, e);
            });

            input.addEventListener('input', (e) => {
                const val = parseFloat(input.value);
                if (!isNaN(val)) {
                    oddsValues[b][o] = val;
                } else if (input.value === '' || input.value === '-') {
                    oddsValues[b][o] = null;
                }
                resetOnEdit();
            });

            input.addEventListener('blur', (e) => {
                let val = parseFloat(input.value);
                if (!isNaN(val)) {
                    oddsValues[b][o] = val;
                    input.value = formatOddsForDisplay(val);
                } else if (input.value === '' || input.value === '-') {
                    const defaultVal = DEFAULT_ODDS[o % DEFAULT_ODDS.length];
                    oddsValues[b][o] = defaultVal;
                    input.value = formatOddsForDisplay(defaultVal);
                    resetOnEdit();
                } else {
                    oddsValues[b][o] = null;
                    input.value = '';
                }
                saveSettingsState();
            });

            row.appendChild(input);
        }
        container.appendChild(row);
    }

    if (bkCount < 5) {
        const addRow = document.createElement('div');
        addRow.className = 'add-bk-row';
        const addCell = document.createElement('div');
        addCell.className = 'odds-add-bk';
        const addBtn = document.createElement('button');
        addBtn.className = 'add-bk-btn';
        addBtn.textContent = window.getTranslation('arbsAddBk') || 'Добавить БК';
        addBtn.addEventListener('click', addBookmaker);
        addCell.appendChild(addBtn);
        addRow.appendChild(addCell);
        for (let o = 0; o < outcomeCount; o++) addRow.appendChild(document.createElement('div'));
        container.appendChild(addRow);
    }
    updateOutcomePillsActive(outcomeCount);
}

function addBookmaker() {
    if (bkCount >= 5) return;
    collectOddsValuesFromDom();
    const newRow = [];
    for (let o = 0; o < outcomeCount; o++) newRow.push(DEFAULT_ODDS[o % DEFAULT_ODDS.length]);
    oddsValues.push(newRow);
    bkCount++;
    resetOnEdit();
    renderOddsTable();
    saveSettingsState();
}

function removeBookmaker(index) {
    if (bkCount <= 2) return;
    collectOddsValuesFromDom();
    oddsValues.splice(index, 1);
    bkCount--;
    resetOnEdit();
    renderOddsTable();
    saveSettingsState();
}

function collectOddsValuesFromDom() {
    for (let b = 0; b < bkCount; b++) {
        for (let o = 0; o < outcomeCount; o++) {
            const input = document.getElementById(`odds-${b}-${o}`);
            if (input) {
                const val = parseFloat(input.value);
                if (!isNaN(val)) oddsValues[b][o] = val;
            }
        }
    }
}

function changeOutcomeCount(newCount) {
    if (newCount < 2 || newCount > 5 || newCount === outcomeCount) return;
    collectOddsValuesFromDom();
    const newOddsValues = [];
    for (let b = 0; b < bkCount; b++) {
        const newRow = [];
        for (let o = 0; o < newCount; o++) {
            newRow.push(o < outcomeCount ? oddsValues[b][o] : DEFAULT_ODDS[o % DEFAULT_ODDS.length]);
        }
        newOddsValues.push(newRow);
    }
    oddsValues = newOddsValues;
    outcomeCount = newCount;
    resetOnEdit();
    updateOutcomePillsActive(newCount);
    renderOddsTable();
    saveSettingsState();
}

function changeStrategy(newStrategy) {
    if (newStrategy === strategy) return;
    strategy = newStrategy;
    updateStrategyPillsActive(newStrategy);
    if (hasCalculated) { calculateArbitrage(); }
    saveSettingsState();
}

// ========== ЛОГИКА РАСЧЁТА ==========
function getBestOddsWithBk() {
    const bestOdds = [];
    const bestBk = [];
    for (let o = 0; o < outcomeCount; o++) {
        let maxOdd = 0;
        let maxBk = 0;
        for (let b = 0; b < bkCount; b++) {
            const odd = oddsValues[b][o] || 0;
            if (odd > maxOdd) {
                maxOdd = odd;
                maxBk = b;
            }
        }
        bestOdds.push(maxOdd);
        bestBk.push(maxBk);
    }
    return { bestOdds, bestBk };
}

function calculateGuaranteedStrategy(bestOdds, totalStake) {
    let sumInverse = 0;
    bestOdds.forEach(odd => { if (odd > 0) sumInverse += 1 / odd; });
    const isArb = sumInverse < 1;
    const profitPercent = isArb ? ((1 / sumInverse - 1) * 100) : 0;
    const stakes = bestOdds.map(odd => (totalStake * (1 / odd)) / sumInverse);
    const payouts = stakes.map((stake, i) => stake * bestOdds[i]);
    return { stakes, payouts, guaranteedPayout: payouts[0], isArb, profitPercent, sumInverse };
}

function calculateMaxStrategy(bestOdds, totalStake) {
    let sumInverse = 0;
    bestOdds.forEach(odd => { if (odd > 0) sumInverse += 1 / odd; });
    if (sumInverse >= 1) return calculateGuaranteedStrategy(bestOdds, totalStake);

    let maxOddIndex = 0;
    for (let i = 1; i < bestOdds.length; i++) {
        if (bestOdds[i] > bestOdds[maxOddIndex]) maxOddIndex = i;
    }

    const stakes = new Array(bestOdds.length).fill(0);
    let remainingStake = totalStake;
    for (let i = 0; i < bestOdds.length; i++) {
        if (i !== maxOddIndex && bestOdds[i] > 0) {
            stakes[i] = totalStake / bestOdds[i];
            remainingStake -= stakes[i];
        }
    }
    if (remainingStake <= 0) return calculateGuaranteedStrategy(bestOdds, totalStake);

    stakes[maxOddIndex] = remainingStake;
    const payouts = stakes.map((stake, i) => stake * bestOdds[i]);
    const guaranteedPayout = payouts[maxOddIndex];
    const profitPercent = ((guaranteedPayout - totalStake) / totalStake) * 100;
    return { stakes, payouts, guaranteedPayout, isArb: true, profitPercent, sumInverse, maxOddIndex };
}

function calculateArbitrage() {
    collectOddsValuesFromDom();

    const { bestOdds, bestBk } = getBestOddsWithBk();
    bestBkPerOutcome = bestBk;

    const totalStake = parseFloat(document.getElementById('totalStake').value);

    if (isNaN(totalStake) || totalStake <= 0) {
        showStakeError(true);
        return;
    }

    showStakeError(false);

    const result = strategy === 'guaranteed'
        ? calculateGuaranteedStrategy(bestOdds, totalStake)
        : calculateMaxStrategy(bestOdds, totalStake);

    lastCalculation = {
        bestOdds,
        bestBk,
        stakes: result.stakes,
        payouts: result.payouts,
        totalStake,
        sumInverse: result.sumInverse,
        isArb: result.isArb,
        profitPercent: result.profitPercent,
        strategy,
        guaranteedPayout: result.guaranteedPayout,
        maxOddIndex: result.maxOddIndex
    };

    hasCalculated = true;

    if (result.isArb) {
        applyInputHighlights(bestBk);
    } else {
        clearInputHighlights();
    }

    showResults();
    displayResults(lastCalculation);
    saveSettingsState();
}

function displayResults(data) {
    const detailsContainer = document.getElementById('arbDetailsContainer');
    const indicatorCircle = document.getElementById('indicatorCircle');
    const arbStatus = document.getElementById('arbStatus');
    const indicatorProfit = document.getElementById('indicatorProfit');
    const tableBody = document.getElementById('tableBody');
    const tableHeader = document.getElementById('tableHeader');
    const netProfitBlock = document.getElementById('netProfitBlock');
    const netProfitEl = document.getElementById('netProfit');
    const incomeRow = document.getElementById('incomeRow');
    const incomePercent = document.getElementById('incomePercent');

    if (data.isArb) {
        indicatorCircle.className = 'indicator-circle bg-success-solid';
        const pct = data.profitPercent.toFixed(2);
        arbStatus.textContent = `${window.getTranslation('arbsFound') || '✅ Вилка найдена!'} +${pct}%`;
        arbStatus.className = 'indicator-status-text text-4';
        indicatorProfit.style.display = 'none';
        if (detailsContainer) detailsContainer.style.display = 'flex';
    } else {
        indicatorCircle.className = 'indicator-circle bg-danger-solid';
        arbStatus.textContent = window.getTranslation('arbsNotFound') || '❌ Вилки нет';
        arbStatus.className = 'indicator-status-text text-7';
        indicatorProfit.style.display = 'none';
        if (detailsContainer) detailsContainer.style.display = 'none';
        return;
    }

    const isMaxStrategy = data.strategy === 'max' && data.maxOddIndex !== undefined;
    const winText = window.getTranslation('arbsWin') || 'Выигрыш';
    const returnText = window.getTranslation('arbsReturn') || 'Возврат';
    const outcomeLabel = window.getTranslation('arbsOutcomeLabel') || 'Исход';

    // Транспонированная таблица
    const outcomes = data.bestOdds.length;
    const metricLabels = [
        window.getTranslation('arbsOdds') || 'Коэффициент',
        window.getTranslation('arbsStake') || 'Ставка',
        window.getTranslation('arbsOutcomeType') || 'Результат',
        window.getTranslation('arbsPayout') || 'Выплата'
    ];

    // Заголовки: пустая левая ячейка + исходы
    let headerHtml = '<th></th>';
    for (let i = 0; i < outcomes; i++) {
        headerHtml += `<th>${outcomeLabel} ${i + 1}</th>`;
    }
    tableHeader.innerHTML = headerHtml;

    // Строки таблицы
    let rowsHtml = '';
    for (let m = 0; m < metricLabels.length; m++) {
        let rowHtml = `<td class="metric-label">${metricLabels[m]}</td>`;
        for (let i = 0; i < outcomes; i++) {
            if (m === 0) { // Коэффициент
                const odd = data.bestOdds[i];
                const highlightClass = data.isArb ? ` arb-highlight-${i}` : '';
                rowHtml += `<td><span class="kef-cell${highlightClass}">${formatOddsForDisplay(odd)}</span></td>`;
            } else if (m === 1) { // Ставка
                rowHtml += `<td>${data.stakes[i].toFixed(2)} $</td>`;
            } else if (m === 2) { // Результат
                if (data.isArb) {
                    const isMaxWin = isMaxStrategy && i !== data.maxOddIndex;
                    const badgeClass = isMaxWin ? 'outcome-badge' : 'outcome-badge';
                    const badgeStyle = isMaxWin ? 'color: var(--color-warning); font-weight: bold;' : 'color: var(--color-success); font-weight: bold;';
                    const badgeText = isMaxWin ? returnText : winText;
                    rowHtml += `<td><span class="${badgeClass}" style="${badgeStyle}">${badgeText}</span></td>`;
                } else {
                    rowHtml += `<td>—</td>`;
                }
            } else { // Выплата
                rowHtml += `<td>${data.payouts[i].toFixed(2)} $</td>`;
            }
        }
        rowsHtml += `<tr>${rowHtml}</tr>`;
    }
    tableBody.innerHTML = rowsHtml;

    document.getElementById('totalStakeDisplay').textContent = data.totalStake.toFixed(2) + ' $';
    document.getElementById('totalPayout').textContent = data.guaranteedPayout.toFixed(2) + ' $';
    incomeRow.style.display = 'flex';
    if (isMaxStrategy) {
        const minPct = (Math.min(...data.payouts) / data.totalStake * 100 - 100).toFixed(1);
        const maxPct = (Math.max(...data.payouts) / data.totalStake * 100 - 100).toFixed(1);
        incomePercent.textContent = `+${minPct}% — +${maxPct}%`;
    } else {
        const pct = (data.guaranteedPayout / data.totalStake * 100 - 100).toFixed(1);
        incomePercent.textContent = `+${pct}%`;
    }
    const netProfit = data.guaranteedPayout - data.totalStake;
    netProfitBlock.style.display = 'flex';
    netProfitEl.textContent = '+' + netProfit.toFixed(2) + ' $';
    netProfitEl.className = 'net-profit-value text-4';
}

function resetCalculator() {
    bkCount = 2;
    outcomeCount = 2;
    strategy = 'guaranteed';
    hasCalculated = false;
    lastCalculation = null;
    bestBkPerOutcome = [];
    initState();
    renderOddsTable();
    clearInputHighlights();
    document.getElementById('totalStake').value = 1000;
    showStakeError(false);
    updateOutcomePillsActive(2);
    updateStrategyPillsActive('guaranteed');
    document.getElementById('incomeRow').style.display = 'none';
    document.getElementById('netProfitBlock').style.display = 'none';
    showPlaceholder();
    const detailsContainer = document.getElementById('arbDetailsContainer');
    if (detailsContainer) detailsContainer.style.display = 'none';
    localStorage.removeItem('arbSettingsState');
}

function initEventListeners() {
    document.querySelectorAll('.outcome-pill').forEach(btn => {
        btn.addEventListener('click', function() { changeOutcomeCount(parseInt(this.dataset.outcomes)); });
    });
    document.querySelectorAll('.strategy-mini-btn').forEach(btn => {
        btn.addEventListener('click', function() { changeStrategy(this.dataset.strategy); });
    });
    document.getElementById('calculateArbBtn').addEventListener('click', calculateArbitrage);
    document.getElementById('resetArbBtn').addEventListener('click', resetCalculator);

    const stakeInput = document.getElementById('totalStake');
    stakeInput.addEventListener('input', (e) => {
        showStakeError(false);
        resetOnEdit();
        saveSettingsState();
    });

    document.addEventListener('languageChanged', () => {
        renderOddsTable();
        initTooltips();
        if (hasCalculated && lastCalculation) displayResults(lastCalculation);
    });
}

window.calculateArbitrage = calculateArbitrage;
window.addBookmaker = addBookmaker;
window.removeBookmaker = removeBookmaker;
window.changeStrategy = changeStrategy;
