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

function initApp() {
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

// Форматирование при потере фокуса:
// - если дробная часть отсутствует → добавляем .00
// - если 1 цифра → добавляем ноль (2.1 → 2.10)
// - если 2 или 3 цифры → оставляем как есть
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
    else if (fracPart.length === 2) {} // оставляем
    else if (fracPart.length > 3) fracPart = fracPart.slice(0, 3); // обрезаем до 3 (не должно случиться)
    return intPart + '.' + fracPart;
}

// Валидация во время ввода: ограничиваем длину целой (4) и дробной (3) частей.
// Автоматически вставляет точку, если целая часть достигла 4 и пользователь продолжает вводить цифры.
function validateOddsInput(inputElement) {
    let rawValue = inputElement.value;
    const selectionStart = inputElement.selectionStart;
    const selectionEnd = inputElement.selectionEnd;
    
    // Разрешаем только цифры и одну точку
    let cleaned = rawValue.replace(/[^\d.]/g, '');
    
    // Ограничиваем количество точек (оставляем только первую)
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Автоматическая вставка точки, если целая часть уже 4 символа и нет точки
    const hasDot = cleaned.includes('.');
    let integerPart = parts[0] || '';
    if (!hasDot && integerPart.length === 4) {
        // Если пользователь пытается ввести пятую цифру, вставляем точку
        // Но мы уже на стадии обработки ввода: нужно определить, была ли попытка добавить цифру.
        // Проверим, не совпадает ли очищенное значение с исходным после удаления последнего символа.
        // Простой подход: если длина cleaned стала больше 4, значит пользователь добавил цифру.
        // Но cleaned может быть длиннее из-за уже существующего ввода. Лучше сравнить с предыдущим состоянием.
        // Мы можем определить по увеличению длины integerPart. Однако проще: если integerPart.length === 4 и пользователь вводит ещё цифру,
        // то cleaned будет иметь длину 5 (без точки). Мы тогда вставим точку перед последней цифрой.
        // Используем более надёжный метод: если после очистки integerPart.length === 4 и общая длина cleaned > 4, значит есть лишняя цифра.
        if (cleaned.length > 4) {
            // вставляем точку после первых 4 символов
            cleaned = integerPart + '.' + cleaned.slice(4);
            // теперь integerPart остаётся 4, а дробная часть начинается
        }
    }
    
    // Повторно разбиваем после возможной вставки точки
    const finalParts = cleaned.split('.');
    integerPart = finalParts[0] || '';
    let fractionalPart = finalParts[1] || '';
    
    // Целая часть: максимум 4 знака
    let wasTruncated = false;
    if (integerPart.length > 4) {
        integerPart = integerPart.slice(0, 4);
        cleaned = integerPart + (fractionalPart !== '' ? '.' + fractionalPart : '');
        wasTruncated = true;
    }
    
    // Дробная часть: максимум 3 знака
    if (fractionalPart.length > 3) {
        fractionalPart = fractionalPart.slice(0, 3);
        cleaned = integerPart + '.' + fractionalPart;
        wasTruncated = true;
    }
    
    // Если ввели только точку, очищаем
    if (cleaned === '.') cleaned = '';
    
    // Если было обрезание, то запрещаем ввод (не даём дописать лишние символы)
    if (wasTruncated) {
        inputElement.value = cleaned;
        return false;
    }
    
    inputElement.value = cleaned;
    return true;
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
            input.placeholder = '2.50';
            input.value = oddsValues[b][o] !== undefined && oddsValues[b][o] !== null 
                ? formatOddsForDisplay(oddsValues[b][o]) 
                : '';

            input.addEventListener('input', (e) => {
                const oldValue = input.value;
                const isValid = validateOddsInput(input);
                if (!isValid) {
                    return;
                }
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
                } else if (input.value === '') {
                    oddsValues[b][o] = null;
                    input.value = '';
                } else {
                    oddsValues[b][o] = null;
                    input.value = '';
                }
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
    if (hasCalculated) { calculateArbitrage(); }
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
    });

    document.addEventListener('languageChanged', () => {
        renderOddsTable();
        initTooltips();
        if (hasCalculated && lastCalculation) displayResults(lastCalculation);
    });
}

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

    tableBody.innerHTML = '';
    data.bestOdds.forEach((odd, i) => {
        const tr = document.createElement('tr');

        const tdOutcome = document.createElement('td');
        tdOutcome.textContent = `${outcomeLabel} ${i + 1}`;
        tr.appendChild(tdOutcome);

        const tdOdds = document.createElement('td');
        const kefSpan = document.createElement('span');
        kefSpan.className = `kef-cell${data.isArb ? ' arb-highlight-' + i : ''}`;
        // Отображаем с тем же форматированием (2 знака по умолчанию, 3 если введено)
        kefSpan.textContent = formatOddsForDisplay(odd);
        tdOdds.appendChild(kefSpan);
        tr.appendChild(tdOdds);

        const tdStake = document.createElement('td');
        tdStake.textContent = `${data.stakes[i].toFixed(2)} $`;
        tr.appendChild(tdStake);

        const tdResult = document.createElement('td');
        if (data.isArb) {
            const badge = document.createElement('span');
            badge.className = 'outcome-badge';
            if (isMaxStrategy && i !== data.maxOddIndex) {
                badge.style.color = 'var(--color-warning)';
                badge.style.fontWeight = 'bold';
                badge.textContent = returnText;
            } else {
                badge.style.color = 'var(--color-success)';
                badge.style.fontWeight = 'bold';
                badge.textContent = winText;
            }
            tdResult.appendChild(badge);
        } else {
            tdResult.textContent = '—';
        }
        tr.appendChild(tdResult);

        const tdPayout = document.createElement('td');
        tdPayout.textContent = `${data.payouts[i].toFixed(2)} $`;
        tr.appendChild(tdPayout);

        tableBody.appendChild(tr);
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
