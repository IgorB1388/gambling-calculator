// arbs.js - Анализатор вилок

// Цвета для подсветки пар (5 исходов макс)
const ARB_COLORS = [
    '#00f0ff', // циан   — исход 0
    '#ffd966', // жёлтый — исход 1
    '#b36bff', // фиолет — исход 2
    '#ff9966', // оранж  — исход 3
    '#ff5fd2', // розов  — исход 4
];

// Записываем цвета в CSS-переменные на :root
// applyArbColorVars не нужна — используем CSS vars
function applyArbColorVarsNoop() {
    const root = document.documentElement;
    ARB_COLORS.forEach((c, i) => root.style.setProperty(`--arb-color-${i}`, c));
}

let bkCount = 2;
let outcomeCount = 2;
let oddsValues = [];
let strategy = 'guaranteed';
let lastCalculation = null;
let hasCalculated = false;
// bestBkPerOutcome[o] = индекс БК с лучшим кэфом для исхода o
let bestBkPerOutcome = [];

const DEFAULT_ODDS = [2.00, 2.00, 3.00, 4.00, 5.00];
const MAX_STAKE_LENGTH = 9;

function initApp() {
    // цвета берём из CSS переменных темы
    initState();
    renderOddsTable();
    initEventListeners();
    initTooltips();
    loadLastCalculation();
    updateOutcomePillsActive(outcomeCount);
    updateStrategyPillsActive(strategy);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.translationsReady) {
        initApp();
    } else {
        document.addEventListener('translationsReady', initApp, { once: true });
    }
});

function initState() {
    oddsValues = [];
    for (let b = 0; b < bkCount; b++) {
        const row = [];
        for (let o = 0; o < outcomeCount; o++) row.push(DEFAULT_ODDS[o]);
        oddsValues.push(row);
    }
}

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

function formatToTwoDecimals(value) {
    if (value === '' || isNaN(value)) return '2.00';
    const num = parseFloat(value);
    if (num < 1.01) return '2.00';
    return num.toFixed(2);
}

// === Сброс подсветки инпутов ===
function clearInputHighlights() {
    document.querySelectorAll('.odds-input').forEach(inp => {
        for (let i = 0; i < 5; i++) inp.classList.remove(`arb-highlight-${i}`);
        // Восстанавливаем стандартный border
        inp.style.borderColor = '';
        inp.style.boxShadow = '';
    });
}

// === Применить подсветку после расчёта ===
function applyInputHighlights(bestBkArr) {
    clearInputHighlights();
    bestBkArr.forEach((bkIdx, outcomeIdx) => {
        const input = document.getElementById(`odds-${bkIdx}-${outcomeIdx}`);
        if (input) input.classList.add(`arb-highlight-${outcomeIdx}`);
    });
}

// === Сброс результатов при правке ===
function resetOnEdit() {
    if (!hasCalculated) return;
    hasCalculated = false;
    lastCalculation = null;
    bestBkPerOutcome = [];
    clearInputHighlights();
    showPlaceholder();
    localStorage.removeItem('arbLastCalculation');
}

function renderOddsTable() {
    const container = document.getElementById('oddsTable');
    container.innerHTML = '';
    container.style.setProperty('--outcome-count', outcomeCount);

    // Заголовок
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

    // Строки БК
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
            input.type = 'number';
            input.id = `odds-${b}-${o}`;
            input.className = 'odds-input bg-elevated border-5 text-1';
            input.placeholder = '2.50';
            input.min = '1.01';
            input.step = '0.01';
            input.value = oddsValues[b][o].toFixed(2);
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 1.01) oddsValues[b][o] = val;
                resetOnEdit();
            });
            input.addEventListener('blur', (e) => {
                const formatted = formatToTwoDecimals(e.target.value);
                e.target.value = formatted;
                oddsValues[b][o] = parseFloat(formatted);
            });
            row.appendChild(input);
        }
        container.appendChild(row);
    }

    // Кнопка добавить БК — только текст, без плюса
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
    for (let o = 0; o < outcomeCount; o++) newRow.push(DEFAULT_ODDS[o]);
    oddsValues.push(newRow);
    bkCount++;
    resetOnEdit();
    renderOddsTable();
}

function removeBookmaker(index) {
    if (bkCount <= 2) return;
    collectOddsValuesFromDom();
    oddsValues.splice(index, 1);
    bkCount--;
    resetOnEdit();
    renderOddsTable();
}

function collectOddsValuesFromDom() {
    for (let b = 0; b < bkCount; b++) {
        for (let o = 0; o < outcomeCount; o++) {
            const input = document.getElementById(`odds-${b}-${o}`);
            if (input) {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val >= 1.01) oddsValues[b][o] = val;
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
            newRow.push(o < outcomeCount ? oddsValues[b][o] : DEFAULT_ODDS[o]);
        }
        newOddsValues.push(newRow);
    }
    oddsValues = newOddsValues;
    outcomeCount = newCount;
    resetOnEdit();
    updateOutcomePillsActive(newCount);
    renderOddsTable();
}

function changeStrategy(newStrategy) {
    if (newStrategy === strategy) return;
    strategy = newStrategy;
    updateStrategyPillsActive(newStrategy);
    if (hasCalculated) calculateArbitrage();
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
    stakeInput.addEventListener('input', () => {
        showStakeError(false);
        resetOnEdit();
        if (stakeInput.value.length > MAX_STAKE_LENGTH) {
            stakeInput.value = stakeInput.value.slice(0, MAX_STAKE_LENGTH);
        }
    });
    stakeInput.addEventListener('keydown', (e) => {
        if (stakeInput.value.length >= MAX_STAKE_LENGTH &&
            !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) {
            e.preventDefault();
        }
    });

    document.addEventListener('languageChanged', () => {
        renderOddsTable();
        initTooltips();
        if (hasCalculated && lastCalculation) displayResults(lastCalculation);
    });
}

// === getBestOddsWithBk — возвращает лучший кэф И индекс БК для каждого исхода ===
function getBestOddsWithBk() {
    const bestOdds = [];
    const bestBk = [];
    for (let o = 0; o < outcomeCount; o++) {
        let maxOdd = 0;
        let maxBk = 0;
        for (let b = 0; b < bkCount; b++) {
            if (oddsValues[b][o] > maxOdd) {
                maxOdd = oddsValues[b][o];
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
    bestOdds.forEach(odd => sumInverse += 1 / odd);
    const isArb = sumInverse < 1;
    const profitPercent = isArb ? ((1 / sumInverse - 1) * 100) : 0;
    const stakes = bestOdds.map(odd => (totalStake * (1 / odd)) / sumInverse);
    const payouts = stakes.map((stake, i) => stake * bestOdds[i]);
    return { stakes, payouts, guaranteedPayout: payouts[0], isArb, profitPercent, sumInverse };
}

function calculateMaxStrategy(bestOdds, totalStake) {
    let sumInverse = 0;
    bestOdds.forEach(odd => sumInverse += 1 / odd);
    if (sumInverse >= 1) return calculateGuaranteedStrategy(bestOdds, totalStake);

    let maxOddIndex = 0;
    for (let i = 1; i < bestOdds.length; i++) {
        if (bestOdds[i] > bestOdds[maxOddIndex]) maxOddIndex = i;
    }

    const stakes = new Array(bestOdds.length).fill(0);
    let remainingStake = totalStake;
    for (let i = 0; i < bestOdds.length; i++) {
        if (i !== maxOddIndex) {
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

    for (let b = 0; b < bkCount; b++) {
        for (let o = 0; o < outcomeCount; o++) {
            const input = document.getElementById(`odds-${b}-${o}`);
            if (input) {
                const formatted = formatToTwoDecimals(input.value);
                input.value = formatted;
                oddsValues[b][o] = parseFloat(formatted);
            }
        }
    }

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

    // Подсвечиваем инпуты
    if (result.isArb) {
        applyInputHighlights(bestBk);
    } else {
        clearInputHighlights();
    }

    showResults();
    displayResults(lastCalculation);
    saveLastCalculation();
}

function displayResults(data) {
    const indicatorCircle = document.getElementById('indicatorCircle');
    const arbStatus = document.getElementById('arbStatus');
    const indicatorProfit = document.getElementById('indicatorProfit');
    const tableBody = document.getElementById('tableBody');
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
    } else {
        indicatorCircle.className = 'indicator-circle bg-danger-solid';
        arbStatus.textContent = window.getTranslation('arbsNotFound') || '❌ Вилки нет';
        arbStatus.className = 'indicator-status-text text-7';
        indicatorProfit.style.display = 'none';
    }

    const isMaxStrategy = data.strategy === 'max' && data.maxOddIndex !== undefined;
    const winText = window.getTranslation('arbsWin') || 'Выигрыш';
    const returnText = window.getTranslation('arbsReturn') || 'Возврат';
    const outcomeLabel = window.getTranslation('arbsOutcomeLabel') || 'Исход';
    const bkLabel = window.getTranslation('arbsBkLabel') || 'БК';

    tableBody.innerHTML = '';
    data.bestOdds.forEach((odd, i) => {
        const row = document.createElement('div');
        row.className = 'table-row';

        // Исход N — просто текст
        const outcomeCell = `<span class="text-2">${outcomeLabel} ${i + 1}</span>`;

        let badgeHtml = '';
        if (data.isArb) {
            if (isMaxStrategy && i !== data.maxOddIndex) {
                badgeHtml = `<span class="outcome-badge" style="color:var(--color-warning);font-weight:bold;">${returnText}</span>`;
            } else {
                badgeHtml = `<span class="outcome-badge" style="color:var(--color-success);font-weight:bold;">${winText}</span>`;
            }
        } else {
            badgeHtml = `<span class="outcome-badge" style="color:var(--text-muted);display:block;text-align:center;">—</span>`;
        }

        row.innerHTML = `
            ${outcomeCell}
            <span class="kef-cell${data.isArb ? ' arb-highlight-' + i : ''}">${odd.toFixed(2)}</span>
            <span>${data.stakes[i].toFixed(2)} $</span>
            ${badgeHtml}
            <span>${data.payouts[i].toFixed(2)} $</span>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('totalStakeDisplay').textContent = data.totalStake.toFixed(2) + ' $';

    if (data.isArb) {
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
    } else {
        document.getElementById('totalPayout').textContent = '0 $';
        incomeRow.style.display = 'none';
        netProfitBlock.style.display = 'none';
    }
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
    localStorage.removeItem('arbLastCalculation');
}

function saveLastCalculation() {
    if (lastCalculation) localStorage.setItem('arbLastCalculation', JSON.stringify(lastCalculation));
}

function loadLastCalculation() {
    const saved = localStorage.getItem('arbLastCalculation');
    if (saved) {
        try {
            lastCalculation = JSON.parse(saved);
            if (lastCalculation.strategy) {
                strategy = lastCalculation.strategy;
                updateStrategyPillsActive(strategy);
            }
            hasCalculated = true;
            showResults();
            displayResults(lastCalculation);
            if (lastCalculation.isArb && lastCalculation.bestBk) {
                applyInputHighlights(lastCalculation.bestBk);
            }
        } catch (e) {
            console.log('Ошибка загрузки сохранения');
        }
    }
}

window.calculateArbitrage = calculateArbitrage;
window.addBookmaker = addBookmaker;
window.removeBookmaker = removeBookmaker;
window.changeStrategy = changeStrategy;
