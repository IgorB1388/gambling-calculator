// arbs.js - Анализатор вилок (арбитражный калькулятор)
// Новая версия: БК как строки, исходы как колонки + две стратегии

// --- Состояние приложения ---
let bkCount = 2;              // количество БК (строк) от 2 до 5
let outcomeCount = 2;         // количество исходов (колонок) от 2 до 5
let oddsValues = [];          // 2D массив значений [БК][исход]
let strategy = 'guaranteed';  // 'guaranteed' или 'max'
let lastCalculation = null;

// Дефолтные значения для новых исходов в зависимости от индекса
const DEFAULT_ODDS = [2.00, 2.00, 3.00, 4.00, 5.00];

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    initState();
    renderOddsTable();
    initEventListeners();
    loadLastCalculation();
    updateOutcomePillsActive(outcomeCount);
    updateStrategyPillsActive(strategy);
});

// --- Инициализация состояния ---
function initState() {
    oddsValues = [];
    for (let b = 0; b < bkCount; b++) {
        const row = [];
        for (let o = 0; o < outcomeCount; o++) {
            row.push(DEFAULT_ODDS[o]);
        }
        oddsValues.push(row);
    }
}

// --- Обновление подсветки кнопок исходов ---
function updateOutcomePillsActive(count) {
    document.querySelectorAll('.outcome-pill').forEach(btn => {
        const btnValue = parseInt(btn.dataset.outcomes);
        if (btnValue === count) {
            btn.classList.add('active', 'opponent-active');
        } else {
            btn.classList.remove('active', 'opponent-active');
        }
    });
}

// --- Обновление подсветки кнопок стратегии ---
function updateStrategyPillsActive(activeStrategy) {
    document.querySelectorAll('.strategy-mini-btn').forEach(btn => {
        const btnStrategy = btn.dataset.strategy;
        if (btnStrategy === activeStrategy) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- Форматирование числа до сотых ---
function formatToTwoDecimals(value) {
    if (value === '' || isNaN(value)) return '2.00';
    const num = parseFloat(value);
    if (num < 1.01) return '2.00';
    return num.toFixed(2);
}

// --- Отрисовка таблицы коэффициентов ---
function renderOddsTable() {
    const container = document.getElementById('oddsTable');
    container.innerHTML = '';
    
    container.style.setProperty('--outcome-count', outcomeCount);
    
    // Заголовки исходов
    const headerRow = document.createElement('div');
    headerRow.className = 'odds-header-row';
    
    const emptyCell = document.createElement('div');
    emptyCell.className = 'odds-corner';
    headerRow.appendChild(emptyCell);
    
    for (let o = 0; o < outcomeCount; o++) {
        const header = document.createElement('div');
        header.className = 'odds-header text-2';
        header.textContent = `Исход ${o + 1}`;
        headerRow.appendChild(header);
    }
    
    container.appendChild(headerRow);
    
    // Строки для каждой БК
    for (let b = 0; b < bkCount; b++) {
        const row = document.createElement('div');
        row.className = 'odds-row';
        row.dataset.bkIndex = b;
        
        const labelCell = document.createElement('div');
        labelCell.className = 'odds-bk-label';
        
        const labelText = document.createElement('span');
        labelText.className = 'text-3';
        labelText.textContent = `БК ${b + 1}`;
        labelCell.appendChild(labelText);
        
        if (bkCount > 2) {
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-bk text-7';
            removeBtn.textContent = '✖️';
            removeBtn.setAttribute('data-bk-index', b);
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeBookmaker(b);
            });
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
                if (!isNaN(val) && val >= 1.01) {
                    oddsValues[b][o] = val;
                }
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
    
    // Строка с кнопкой добавления БК
    if (bkCount < 5) {
        const addRow = document.createElement('div');
        addRow.className = 'add-bk-row';
        
        const addCell = document.createElement('div');
        addCell.className = 'odds-add-bk';
        
        const addBtn = document.createElement('button');
        addBtn.className = 'add-bk-btn';
        addBtn.textContent = '➕';
        addBtn.addEventListener('click', addBookmaker);
        
        addCell.appendChild(addBtn);
        addRow.appendChild(addCell);
        
        for (let o = 0; o < outcomeCount; o++) {
            const emptyCell = document.createElement('div');
            addRow.appendChild(emptyCell);
        }
        
        container.appendChild(addRow);
    }
    
    updateOutcomePillsActive(outcomeCount);
}

// --- Добавление БК ---
function addBookmaker() {
    if (bkCount >= 5) return;
    
    collectOddsValuesFromDom();
    
    const newRow = [];
    for (let o = 0; o < outcomeCount; o++) {
        newRow.push(DEFAULT_ODDS[o]);
    }
    oddsValues.push(newRow);
    
    bkCount++;
    renderOddsTable();
}

// --- Удаление БК ---
function removeBookmaker(index) {
    if (bkCount <= 2) return;
    
    collectOddsValuesFromDom();
    
    oddsValues.splice(index, 1);
    bkCount--;
    
    renderOddsTable();
}

// --- Сбор значений из DOM в массив oddsValues ---
function collectOddsValuesFromDom() {
    for (let b = 0; b < bkCount; b++) {
        for (let o = 0; o < outcomeCount; o++) {
            const input = document.getElementById(`odds-${b}-${o}`);
            if (input) {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val >= 1.01) {
                    oddsValues[b][o] = val;
                }
            }
        }
    }
}

// --- Изменение количества исходов ---
function changeOutcomeCount(newCount) {
    if (newCount < 2 || newCount > 5 || newCount === outcomeCount) return;
    
    collectOddsValuesFromDom();
    
    const newOddsValues = [];
    for (let b = 0; b < bkCount; b++) {
        const newRow = [];
        for (let o = 0; o < newCount; o++) {
            if (o < outcomeCount) {
                newRow.push(oddsValues[b][o]);
            } else {
                newRow.push(DEFAULT_ODDS[o]);
            }
        }
        newOddsValues.push(newRow);
    }
    
    oddsValues = newOddsValues;
    outcomeCount = newCount;
    
    updateOutcomePillsActive(newCount);
    renderOddsTable();
}

// --- Изменение стратегии ---
function changeStrategy(newStrategy) {
    if (newStrategy === strategy) return;
    strategy = newStrategy;
    updateStrategyPillsActive(newStrategy);
    
    if (lastCalculation) {
        calculateArbitrage();
    }
}

// --- Обработчики событий ---
function initEventListeners() {
    document.querySelectorAll('.outcome-pill').forEach(btn => {
        btn.addEventListener('click', function() {
            const outcomes = parseInt(this.dataset.outcomes);
            changeOutcomeCount(outcomes);
        });
    });
    
    document.querySelectorAll('.strategy-mini-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const newStrategy = this.dataset.strategy;
            changeStrategy(newStrategy);
        });
    });

    document.getElementById('calculateArbBtn').addEventListener('click', calculateArbitrage);
    document.getElementById('resetArbBtn').addEventListener('click', resetCalculator);
}

// --- Получение лучших коэффициентов ---
function getBestOdds() {
    const bestOdds = [];
    for (let o = 0; o < outcomeCount; o++) {
        let maxOdd = 0;
        for (let b = 0; b < bkCount; b++) {
            if (oddsValues[b][o] > maxOdd) {
                maxOdd = oddsValues[b][o];
            }
        }
        bestOdds.push(maxOdd);
    }
    return bestOdds;
}

// --- Стратегия 1: Гарантированная прибыль ---
function calculateGuaranteedStrategy(bestOdds, totalStake) {
    let sumInverse = 0;
    bestOdds.forEach(odd => sumInverse += 1 / odd);
    
    const isArb = sumInverse < 1;
    const profitPercent = isArb ? ((1 / sumInverse - 1) * 100) : 0;
    
    const stakes = bestOdds.map(odd => (totalStake * (1 / odd)) / sumInverse);
    const payouts = stakes.map((stake, i) => stake * bestOdds[i]);
    const guaranteedPayout = payouts[0]; // Все выплаты одинаковы
    
    return { stakes, payouts, guaranteedPayout, isArb, profitPercent, sumInverse };
}

// --- Стратегия 2: Максимальная прибыль с возвратом ---
function calculateMaxStrategy(bestOdds, totalStake) {
    // Если нет вилки, возвращаем гарантированную стратегию
    let sumInverse = 0;
    bestOdds.forEach(odd => sumInverse += 1 / odd);
    if (sumInverse >= 1) {
        return calculateGuaranteedStrategy(bestOdds, totalStake);
    }
    
    // Находим индекс максимального коэффициента
    let maxOddIndex = 0;
    for (let i = 1; i < bestOdds.length; i++) {
        if (bestOdds[i] > bestOdds[maxOddIndex]) {
            maxOddIndex = i;
        }
    }
    
    const stakes = new Array(bestOdds.length).fill(0);
    let remainingStake = totalStake;
    
    // Страхуем все исходы кроме максимального (чтобы получить возврат)
    for (let i = 0; i < bestOdds.length; i++) {
        if (i !== maxOddIndex) {
            stakes[i] = totalStake / bestOdds[i];
            remainingStake -= stakes[i];
        }
    }
    
    // Если остатка нет или он отрицательный - возвращаем гарантированную стратегию
    if (remainingStake <= 0) {
        return calculateGuaranteedStrategy(bestOdds, totalStake);
    }
    
    // Всё остальное ставим на максимальный коэффициент
    stakes[maxOddIndex] = remainingStake;
    
    const payouts = stakes.map((stake, i) => stake * bestOdds[i]);
    const guaranteedPayout = payouts[maxOddIndex]; // Это наша выплата при выигрыше
    
    // Пересчитываем процент прибыли для максимального исхода
    const profit = guaranteedPayout - totalStake;
    const profitPercent = (profit / totalStake) * 100;
    
    return {
        stakes,
        payouts,
        guaranteedPayout,
        isArb: true,
        profitPercent,
        sumInverse,
        maxOddIndex
    };
}

// --- Основная функция расчета ---
function calculateArbitrage() {
    collectOddsValuesFromDom();
    
    // Форматирование
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
    
    const bestOdds = getBestOdds();
    const totalStake = parseFloat(document.getElementById('totalStake').value);
    
    if (isNaN(totalStake) || totalStake <= 0) {
        alert('Введите корректную сумму ставки');
        return;
    }
    
    const result = strategy === 'guaranteed' 
        ? calculateGuaranteedStrategy(bestOdds, totalStake)
        : calculateMaxStrategy(bestOdds, totalStake);
    
    lastCalculation = {
        bestOdds,
        stakes: result.stakes,
        payouts: result.payouts,
        totalStake,
        sumInverse: result.sumInverse,
        isArb: result.isArb,
        profitPercent: result.profitPercent,
        strategy,
        guaranteedPayout: result.guaranteedPayout
    };
    
    displayResults(lastCalculation);
    saveLastCalculation();
}

// --- Отображение результатов ---
function displayResults(data) {
    const indicatorCircle = document.getElementById('indicatorCircle');
    const arbStatus = document.getElementById('arbStatus');
    const profitCard = document.getElementById('profitCard');
    const profitPercent = document.getElementById('profitPercent');
    const tableBody = document.getElementById('tableBody');
    const totalStakeDisplay = document.getElementById('totalStakeDisplay');
    const totalPayout = document.getElementById('totalPayout');
    const profitRow = document.getElementById('profitRow');
    const netProfit = document.getElementById('netProfit');

    if (data.isArb) {
        indicatorCircle.classList.remove('bg-danger-solid');
        indicatorCircle.classList.add('bg-success-solid');
        arbStatus.textContent = '✅ Вилка найдена!';
        arbStatus.className = 'text-4';
    } else {
        indicatorCircle.classList.remove('bg-success-solid');
        indicatorCircle.classList.add('bg-danger-solid');
        arbStatus.textContent = '❌ Вилки нет';
        arbStatus.className = 'text-7';
    }

    if (data.isArb) {
        profitCard.style.display = 'flex';
        profitPercent.textContent = data.profitPercent.toFixed(2) + '%';
    } else {
        profitCard.style.display = 'none';
    }

    tableBody.innerHTML = '';
    data.bestOdds.forEach((odd, i) => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <span class="text-2">Исход ${i+1}</span>
            <span class="text-1">${odd.toFixed(2)}</span>
            <span class="text-1">${data.stakes[i].toFixed(2)} ₽</span>
            <span class="text-1">${data.payouts[i].toFixed(2)} ₽</span>
        `;
        tableBody.appendChild(row);
    });

    totalStakeDisplay.textContent = data.totalStake.toFixed(2) + ' ₽';
    
    if (data.isArb) {
        totalPayout.textContent = data.guaranteedPayout.toFixed(2) + ' ₽';
        profitRow.style.display = 'flex';
        const profit = data.guaranteedPayout - data.totalStake;
        netProfit.textContent = profit.toFixed(2) + ' ₽';
    } else {
        totalPayout.textContent = '0 ₽';
        profitRow.style.display = 'none';
    }
}

// --- Сброс калькулятора ---
function resetCalculator() {
    bkCount = 2;
    outcomeCount = 2;
    strategy = 'guaranteed';
    initState();
    renderOddsTable();
    
    document.getElementById('totalStake').value = 1000;
    
    document.getElementById('indicatorCircle').classList.remove('bg-success-solid', 'bg-danger-solid');
    document.getElementById('arbStatus').textContent = '—';
    document.getElementById('arbStatus').className = 'text-1';
    document.getElementById('profitCard').style.display = 'none';
    document.getElementById('tableBody').innerHTML = '';
    document.getElementById('totalStakeDisplay').textContent = '0 ₽';
    document.getElementById('totalPayout').textContent = '0 ₽';
    document.getElementById('profitRow').style.display = 'none';
    
    updateOutcomePillsActive(2);
    updateStrategyPillsActive('guaranteed');
    
    lastCalculation = null;
    localStorage.removeItem('arbLastCalculation');
}

// --- Сохранение и загрузка ---
function saveLastCalculation() {
    if (lastCalculation) {
        localStorage.setItem('arbLastCalculation', JSON.stringify(lastCalculation));
    }
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
            displayResults(lastCalculation);
        } catch (e) {
            console.log('Ошибка загрузки сохранения');
        }
    }
}

// Экспорт
window.calculateArbitrage = calculateArbitrage;
window.addBookmaker = addBookmaker;
window.removeBookmaker = removeBookmaker;
window.changeStrategy = changeStrategy;
