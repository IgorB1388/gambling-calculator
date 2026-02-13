// arbs.js - Анализатор вилок (арбитражный калькулятор)

let currentOutcomes = 2;
let lastCalculation = null;

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    generateOddsInputs(2);
    initEventListeners();
    loadLastCalculation();
});

// --- Обработчики событий ---
function initEventListeners() {
    // Кнопки количества исходов
    document.querySelectorAll('.outcome-pill').forEach(btn => {
        btn.addEventListener('click', function() {
            const outcomes = parseInt(this.dataset.outcomes);
            if (outcomes === currentOutcomes) return;
            
            document.querySelectorAll('.outcome-pill').forEach(b => {
                b.classList.remove('active', 'opponent-active');
            });
            this.classList.add('active', 'opponent-active');
            
            currentOutcomes = outcomes;
            generateOddsInputs(outcomes);
        });
    });

    // Кнопка расчета
    document.getElementById('calculateArbBtn').addEventListener('click', calculateArbitrage);
    
    // Кнопка сброса
    document.getElementById('resetArbBtn').addEventListener('click', resetCalculator);
}

// --- Генерация полей для коэффициентов ---
function generateOddsInputs(count) {
    const container = document.getElementById('oddsTable');
    container.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const row = document.createElement('div');
        row.className = 'odds-row';
        row.innerHTML = `
            <div class="odds-index text-medium">${i}</div>
            <input type="number" id="odds-${i}-1" class="odds-input bg-elevated border-muted text-light" placeholder="2.50" min="1.01" step="0.01" value="2.00">
            <input type="number" id="odds-${i}-2" class="odds-input bg-elevated border-muted text-light" placeholder="2.50" min="1.01" step="0.01" value="2.00">
        `;
        container.appendChild(row);
    }
}

// --- ОСНОВНАЯ ФУНКЦИЯ РАСЧЕТА ---
function calculateArbitrage() {
    // Собираем коэффициенты
    const odds = [];
    for (let i = 1; i <= currentOutcomes; i++) {
        const odd1 = parseFloat(document.getElementById(`odds-${i}-1`).value);
        const odd2 = parseFloat(document.getElementById(`odds-${i}-2`).value);
        
        if (isNaN(odd1) || isNaN(odd2) || odd1 < 1.01 || odd2 < 1.01) {
            alert('Пожалуйста, введите корректные коэффициенты (минимум 1.01)');
            return;
        }
        
        // Берем лучший коэффициент
        odds.push(Math.max(odd1, odd2));
    }

    const totalStake = parseFloat(document.getElementById('totalStake').value);
    if (isNaN(totalStake) || totalStake <= 0) {
        alert('Введите корректную сумму ставки');
        return;
    }

    // Расчет суммы вероятностей (V)
    let sumInverse = 0;
    odds.forEach(odd => {
        sumInverse += 1 / odd;
    });

    const isArb = sumInverse < 1;
    const profitPercent = isArb ? ((1 / sumInverse - 1) * 100) : 0;

    // Расчет распределения ставок
    const stakes = [];
    odds.forEach(odd => {
        stakes.push((totalStake * (1 / odd)) / sumInverse);
    });

    // Расчет выплат
    const payouts = [];
    stakes.forEach((stake, i) => {
        payouts.push(stake * odds[i]);
    });

    // Сохраняем результат
    lastCalculation = {
        odds,
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
        indicatorCircle.style.backgroundColor = 'var(--color-success)';
        arbStatus.textContent = '✅ Вилка найдена!';
        arbStatus.className = 'text-success';
    } else {
        indicatorCircle.style.backgroundColor = 'var(--color-danger)';
        arbStatus.textContent = '❌ Вилки нет';
        arbStatus.className = 'text-danger';
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
    data.odds.forEach((odd, i) => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <span class="text-light">Исход ${i+1}</span>
            <span class="text-light">${odd.toFixed(2)}</span>
            <span class="text-light">${data.stakes[i].toFixed(2)} ₽</span>
            <span class="text-light">${data.payouts[i].toFixed(2)} ₽</span>
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
    generateOddsInputs(2);
    document.getElementById('totalStake').value = 1000;
    
    // Сброс результатов
    document.getElementById('indicatorCircle').style.backgroundColor = '';
    document.getElementById('arbStatus').textContent = '—';
    document.getElementById('arbStatus').className = 'text-light';
    document.getElementById('profitCard').style.display = 'none';
    document.getElementById('tableBody').innerHTML = '';
    document.getElementById('totalStakeDisplay').textContent = '0 ₽';
    document.getElementById('totalPayout').textContent = '0 ₽';
    document.getElementById('profitRow').style.display = 'none';
    
    // Сброс активной кнопки
    document.querySelectorAll('.outcome-pill').forEach(btn => {
        btn.classList.remove('active', 'opponent-active');
        if (btn.dataset.outcomes === '2') {
            btn.classList.add('active', 'opponent-active');
        }
    });
    currentOutcomes = 2;
    
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
            // Восстанавливаем интерфейс
            currentOutcomes = lastCalculation.odds.length;
            
            // Активируем нужную кнопку
            document.querySelectorAll('.outcome-pill').forEach(btn => {
                btn.classList.remove('active', 'opponent-active');
                if (parseInt(btn.dataset.outcomes) === currentOutcomes) {
                    btn.classList.add('active', 'opponent-active');
                }
            });
            
            // Генерируем поля и заполняем
            generateOddsInputs(currentOutcomes);
            
            // Заполняем коэффициенты
            for (let i = 1; i <= currentOutcomes; i++) {
                // Просто для демо - в реальном приложении нужно сохранять исходные коэффициенты
            }
            
            document.getElementById('totalStake').value = lastCalculation.totalStake;
            displayResults(lastCalculation);
        } catch (e) {
            console.log('Ошибка загрузки сохранения');
        }
    }
}

// Экспорт для отладки
window.calculateArbitrage = calculateArbitrage;
