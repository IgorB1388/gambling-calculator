// arbs.js - Анализатор вилок (арбитражный калькулятор)
// Новая версия: БК как строки, динамические исходы как колонки

// --- Состояние приложения ---
let bkCount = 2;              // количество БК (строк) от 2 до 5
let outcomeCount = 2;         // количество исходов (колонок) от 2 до 5
let oddsValues = [];          // 2D массив значений [БК][исход]

let lastCalculation = null;

// Дефолтные значения для новых исходов в зависимости от индекса
const DEFAULT_ODDS = [2.00, 2.00, 3.00, 4.00, 5.00];

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    initState();
    renderOddsTable();
    initEventListeners();
    loadLastCalculation();
    
    // Убеждаемся что активная кнопка исходов подсвечена
    updateOutcomePillsActive(outcomeCount);
});

// --- Инициализация состояния ---
function initState() {
    // Создаем массив bkCount x outcomeCount с дефолтными значениями
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
    
    // Устанавливаем CSS-переменную для количества колонок
    container.style.setProperty('--outcome-count', outcomeCount);
    
    // Заголовки исходов (номера колонок)
    const headerRow = document.createElement('div');
    headerRow.className = 'odds-header-row';
    
    // Пустая ячейка в углу (над метками БК)
    const emptyCell = document.createElement('div');
    emptyCell.className = 'odds-corner';
    headerRow.appendChild(emptyCell);
    
    // Заголовки исходов
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
        
        // Метка БК с номером и кнопкой удаления (если БК > 2)
        const labelCell = document.createElement('div');
        labelCell.className = 'odds-bk-label';
        
        const labelText = document.createElement('span');
        labelText.className = 'text-3';
        labelText.textContent = `БК ${b + 1}`;
        labelCell.appendChild(labelText);
        
        // Кнопка удаления (только если БК больше 2)
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
        
        // Поля ввода для каждого исхода
        for (let o = 0; o < outcomeCount; o++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `odds-${b}-${o}`;
            input.className = 'odds-input bg-elevated border-5 text-1';
            input.placeholder = '2.50';
            input.min = '1.01';
            input.step = '0.01';
            input.value = oddsValues[b][o].toFixed(2);
            
            // Сохраняем значение при изменении
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 1.01) {
                    oddsValues[b][o] = val;
                }
            });
            
            // Форматирование при потере фокуса
            input.addEventListener('blur', (e) => {
                const formatted = formatToTwoDecimals(e.target.value);
                e.target.value = formatted;
                oddsValues[b][o] = parseFloat(formatted);
            });
            
            row.appendChild(input);
        }
        
        container.appendChild(row);
    }
    
    // Строка с кнопкой добавления БК (если БК < 5) - ТОЛЬКО ПЛЮС, БЕЗ ТЕКСТА
    if (bkCount < 5) {
        const addRow = document.createElement('div');
        addRow.className = 'odds-row add-bk-row';
        
        const addCell = document.createElement('div');
        addCell.className = 'odds-add-bk';
        
        const addBtn = document.createElement('button');
        addBtn.className = 'add-bk-btn text-1';
        addBtn.textContent = '➕';  // Только плюс, без текста
        addBtn.addEventListener('click', addBookmaker);
        
        addCell.appendChild(addBtn);
        addRow.appendChild(addCell);
        
        // Пустые ячейки для выравнивания
        for (let o = 0; o < outcomeCount; o++) {
            const emptyCell = document.createElement('div');
            addRow.appendChild(emptyCell);
        }
        
        container.appendChild(addRow);
    }
    
    // Обновляем подсветку кнопок исходов
    updateOutcomePillsActive(outcomeCount);
}

// --- Добавление БК ---
function addBookmaker() {
    if (bkCount >= 5) return;
    
    // Собираем текущие значения из полей
    collectOddsValuesFromDom();
    
    // Добавляем новую строку с дефолтными значениями
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
    
    // Собираем текущие значения
    collectOddsValuesFromDom();
    
    // Удаляем строку
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
    
    // Собираем текущие значения из полей (ВАЖНО!)
    collectOddsValuesFromDom();
    
    // Создаем новый массив с новым размером
    const newOddsValues = [];
    for (let b = 0; b < bkCount; b++) {
        const newRow = [];
        for (let o = 0; o < newCount; o++) {
            if (o < outcomeCount) {
                // Существующий исход - берем старое значение
                newRow.push(oddsValues[b][o]);
            } else {
                // Новый исход - дефолт по индексу
                newRow.push(DEFAULT_ODDS[o]);
            }
        }
        newOddsValues.push(newRow);
    }
    
    oddsValues = newOddsValues;
    outcomeCount = newCount;
    
    // Обновляем подсветку кнопок
    updateOutcomePillsActive(newCount);
    
    renderOddsTable();
}

// --- Обработчики событий ---
function initEventListeners() {
    // Кнопки количества исходов
    document.querySelectorAll('.outcome-pill').forEach(btn => {
        btn.addEventListener('click', function() {
            const outcomes = parseInt(this.dataset.outcomes);
            changeOutcomeCount(outcomes);
        });
    });

    // Кнопка расчета
    document.getElementById('calculateArbBtn').addEventListener('click', calculateArbitrage);
    
    // Кнопка сброса
    document.getElementById('resetArbBtn').addEventListener('click', resetCalculator);
}

// --- ОСНОВНАЯ ФУНКЦИЯ РАСЧЕТА ---
function calculateArbitrage() {
    // Собираем актуальные значения из полей
    collectOddsValuesFromDom();
    
    // Форматируем все поля ввода (приводим к сотым)
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
    
    // Для каждого исхода берем максимальный кэф среди всех БК
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

    const totalStake = parseFloat(document.getElementById('totalStake').value);
    if (isNaN(totalStake) || totalStake <= 0) {
        alert('Введите корректную сумму ставки');
        return;
    }

    // Расчет суммы вероятностей (V)
    let sumInverse = 0;
    bestOdds.forEach(odd => {
        sumInverse += 1 / odd;
    });

    const isArb = sumInverse < 1;
    const profitPercent = isArb ? ((1 / sumInverse - 1) * 100) : 0;

    // Расчет распределения ставок
    const stakes = [];
    bestOdds.forEach(odd => {
        stakes.push((totalStake * (1 / odd)) / sumInverse);
    });

    // Расчет выплат
    const payouts = [];
    stakes.forEach((stake, i) => {
        payouts.push(stake * bestOdds[i]);
    });

    // Сохраняем результат
    lastCalculation = {
        bestOdds,
        stakes,
        payouts,
        totalStake,
        sumInverse,
        isArb,
        profitPercent
    };

    // Отображаем результаты
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

    // Индикатор
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

    // Процент прибыли
    if (data.isArb) {
        profitCard.style.display = 'flex';
        profitPercent.textContent = data.profitPercent.toFixed(2) + '%';
    } else {
        profitCard.style.display = 'none';
    }

    // Таблица распределения
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

    // Итоги
    const totalPayoutValue = data.payouts.reduce((a, b) => a + b, 0);
    totalStakeDisplay.textContent = data.totalStake.toFixed(2) + ' ₽';
    totalPayout.textContent = totalPayoutValue.toFixed(2) + ' ₽';

    if (data.isArb) {
        profitRow.style.display = 'flex';
        netProfit.textContent = (totalPayoutValue - data.totalStake).toFixed(2) + ' ₽';
    } else {
        profitRow.style.display = 'none';
    }
}

// --- Сброс калькулятора ---
function resetCalculator() {
    bkCount = 2;
    outcomeCount = 2;
    initState();
    renderOddsTable();
    
    document.getElementById('totalStake').value = 1000;
    
    // Сброс индикатора
    document.getElementById('indicatorCircle').classList.remove('bg-success-solid', 'bg-danger-solid');
    document.getElementById('arbStatus').textContent = '—';
    document.getElementById('arbStatus').className = 'text-1';
    document.getElementById('profitCard').style.display = 'none';
    document.getElementById('tableBody').innerHTML = '';
    document.getElementById('totalStakeDisplay').textContent = '0 ₽';
    document.getElementById('totalPayout').textContent = '0 ₽';
    document.getElementById('profitRow').style.display = 'none';
    
    // Обновляем подсветку кнопок исходов
    updateOutcomePillsActive(2);
    
    lastCalculation = null;
    localStorage.removeItem('arbLastCalculation');
}

// --- Сохранение последнего расчета ---
function saveLastCalculation() {
    if (lastCalculation) {
        localStorage.setItem('arbLastCalculation', JSON.stringify(lastCalculation));
    }
}

// --- Загрузка последнего расчета ---
function loadLastCalculation() {
    const saved = localStorage.getItem('arbLastCalculation');
    if (saved) {
        try {
            lastCalculation = JSON.parse(saved);
            displayResults(lastCalculation);
        } catch (e) {
            console.log('Ошибка загрузки сохранения');
        }
    }
}

// Экспорт для отладки
window.calculateArbitrage = calculateArbitrage;
window.addBookmaker = addBookmaker;
window.removeBookmaker = removeBookmaker;
