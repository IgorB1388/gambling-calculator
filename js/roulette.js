// roulette.js - Анализатор стратегий рулетки

// --- Конфигурация рулетки ---
const RouletteConfig = {
    european: {
        numbers: 37,
        zero: 0,
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
        zero: [0, 37], // 0 и 00
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

// --- Ставки и их условия ---
const BetDefinitions = {
    red: {
        condition: (num, type) => {
            if (num === 0 || (type === 'american' && num === 37)) return false;
            return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num);
        }
    },
    black: {
        condition: (num, type) => {
            if (num === 0 || (type === 'american' && num === 37)) return false;
            return [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].includes(num);
        }
    },
    even: {
        condition: (num, type) => num !== 0 && (type !== 'american' || num !== 37) && num % 2 === 0
    },
    odd: {
        condition: (num, type) => num !== 0 && (type !== 'american' || num !== 37) && num % 2 === 1
    },
    low: {
        condition: (num, type) => num !== 0 && (type !== 'american' || num !== 37) && num <= 18
    },
    high: {
        condition: (num, type) => num !== 0 && (type !== 'american' || num !== 37) && num >= 19
    },
    zero: {
        condition: (num, type) => num === 0
    },
    doublezero: {
        condition: (num, type) => type === 'american' && num === 37
    },
    dozen1: {
        condition: (num, type) => num >= 1 && num <= 12
    },
    dozen2: {
        condition: (num, type) => num >= 13 && num <= 24
    },
    dozen3: {
        condition: (num, type) => num >= 25 && num <= 36
    },
    column1: {
        condition: (num, type) => num % 3 === 1 && num <= 34
    },
    column2: {
        condition: (num, type) => num % 3 === 2 && num <= 35
    },
    column3: {
        condition: (num, type) => num % 3 === 0 && num <= 36 && num !== 0
    }
};

// --- Состояние интерфейса ---
let isSimulating = false;

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    updateTargetInputState();
    updateStrategyOptions(); // Заполняем выпадающий список
});

// --- Обновление выпадающего списка стратегий ---
function updateStrategyOptions() {
    const select = document.getElementById('strategySelect');
    const type = document.querySelector('[data-type].active')?.dataset.type || 'european';
    
    // Очищаем
    select.innerHTML = '';
    
    // Базовые опции
    const baseOptions = [
        { value: 'red', text: '🔴 Красное' },
        { value: 'black', text: '⚫ Черное' },
        { value: 'even', text: 'Четное' },
        { value: 'odd', text: 'Нечетное' },
        { value: 'low', text: '1-18' },
        { value: 'high', text: '19-36' }
    ];
    
    // Добавляем зеро в зависимости от типа
    if (type === 'european') {
        const zeroOption = document.createElement('option');
        zeroOption.value = 'zero';
        zeroOption.textContent = '0 (Зеро)';
        select.appendChild(zeroOption);
    } else {
        const zeroOption = document.createElement('option');
        zeroOption.value = 'zero';
        zeroOption.textContent = '0 (Зеро)';
        select.appendChild(zeroOption);
        
        const doubleZeroOption = document.createElement('option');
        doubleZeroOption.value = 'doublezero';
        doubleZeroOption.textContent = '00 (Двойное зеро)';
        select.appendChild(doubleZeroOption);
    }
    
    // Добавляем базовые опции
    baseOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    
    // Добавляем дюжины
    const dozens = [
        { value: 'dozen1', text: '1-я дюжина (1-12)' },
        { value: 'dozen2', text: '2-я дюжина (13-24)' },
        { value: 'dozen3', text: '3-я дюжина (25-36)' }
    ];
    
    dozens.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    
    // Добавляем колонны
    const columns = [
        { value: 'column1', text: '1-я колонна' },
        { value: 'column2', text: '2-я колонна' },
        { value: 'column3', text: '3-я колонна' }
    ];
    
    columns.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
}

// --- Обработчики событий ---
function initEventListeners() {
    // Тип рулетки
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-type]').forEach(b => {
                b.classList.remove('active', 'opponent-active');
            });
            this.classList.add('active', 'opponent-active');
            
            // Обновляем список стратегий при смене типа
            updateStrategyOptions();
        });
    });

    // Чекбоксы условий остановки
    document.getElementById('stopTarget').addEventListener('change', updateTargetInputState);
    document.getElementById('stopSpins').addEventListener('change', updateTargetInputState);
    
    // Кнопки
    document.getElementById('simulateBtn').addEventListener('click', simulateStrategy);
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);
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
    
    // Получаем настройки
    const rouletteType = document.querySelector('[data-type].active')?.dataset.type || 'european';
    const config = RouletteConfig[rouletteType];
    config.type = rouletteType; // добавляем тип в конфиг
    
    const startingBankroll = parseInt(document.getElementById('startingBankroll').value) || 1000;
    const betAmount = parseInt(document.getElementById('betAmount').value) || 10;
    const strategy = document.getElementById('strategySelect').value;
    
    const triggerType = document.getElementById('triggerType').value; // 'missed' или 'hit'
    const triggerCount = parseInt(document.getElementById('triggerCount').value) || 3;
    
    const stopBankrupt = document.getElementById('stopBankrupt').checked;
    const stopTarget = document.getElementById('stopTarget').checked;
    const targetAmount = parseInt(document.getElementById('targetAmount').value) || 2000;
    const stopSpins = document.getElementById('stopSpins').checked;
    const maxSpins = parseInt(document.getElementById('maxSpins').value) || 100;
    
    const sessionCount = parseInt(document.getElementById('sessionCount').value) || 500;
    
    // Валидация
    if (betAmount > startingBankroll) {
        alert('Ставка не может быть больше банка!');
        return;
    }
    
    isSimulating = true;
    document.getElementById('simulateBtn').disabled = true;
    document.getElementById('simulateBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-i18n="simulating"></span>';
    
    // Запускаем симуляцию асинхронно
    setTimeout(() => {
        const results = runSimulation(
            config, startingBankroll, betAmount, strategy,
            triggerType, triggerCount,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins,
            sessionCount
        );
        
        displayResults(results);
        
        isSimulating = false;
        document.getElementById('simulateBtn').disabled = false;
        document.getElementById('simulateBtn').innerHTML = '<i class="fas fa-cogs"></i> <span data-i18n="simulateBtn"></span>';
    }, 50);
}

// --- Функция симуляции одной сессии ---
function simulateSession(config, startingBankroll, betAmount, strategy, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins) {
    let bankroll = startingBankroll;
    let spins = 0;
    let history = [];
    let triggerCounter = 0;
    let betPlaced = false;
    
    while (true) {
        // Проверка условий остановки
        if (stopBankrupt && bankroll <= 0) break;
        if (stopTarget && bankroll >= targetAmount) break;
        if (stopSpins && spins >= maxSpins) break;
        
        // Генерируем номер
        const number = Math.floor(Math.random() * config.numbers);
        history.push(number);
        spins++;
        
        // Проверяем условие активации
        const isWin = BetDefinitions[strategy]?.condition(number, config.type);
        
        if (triggerType === 'missed') {
            if (!isWin) {
                triggerCounter++;
            } else {
                triggerCounter = 0;
            }
        } else { // 'hit'
            if (isWin) {
                triggerCounter++;
            } else {
                triggerCounter = 0;
            }
        }
        
        // Делаем ставку, если условие выполнено
        if (triggerCounter >= triggerCount && !betPlaced) {
            betPlaced = true;
            
            if (bankroll >= betAmount) {
                bankroll -= betAmount;
                
                if (isWin) {
                    const payout = config.payouts[strategy] || 1;
                    bankroll += betAmount + (betAmount * payout);
                }
            }
        }
        
        // Сбрасываем флаг ставки после розыгрыша
        if (betPlaced) {
            betPlaced = false;
            triggerCounter = 0;
        }
    }
    
    return {
        finalBankroll: bankroll,
        profit: bankroll - startingBankroll,
        spins: spins,
        success: bankroll > startingBankroll,
        bankrupt: bankroll <= 0,
        hitTarget: bankroll >= targetAmount
    };
}

// --- Функция запуска множества сессий ---
function runSimulation(config, startingBankroll, betAmount, strategy, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins, sessionCount) {
    const sessions = [];
    
    for (let i = 0; i < sessionCount; i++) {
        const session = simulateSession(
            config, startingBankroll, betAmount, strategy,
            triggerType, triggerCount,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins
        );
        sessions.push(session);
    }
    
    // Анализируем результаты
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
        chartContainer.innerHTML = '<span class="text-muted" data-i18n="noData"></span>';
        return;
    }
    
    const positiveCount = distribution.filter(v => v > 0).length;
    const positivePercent = (positiveCount / distribution.length) * 100;
    
    chartContainer.innerHTML = `
        <div style="width: 100%; padding: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span class="text-medium" data-i18n="profitableSessions"></span>
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
    
    // Сброс результатов
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
        chartContainer.innerHTML = '<span class="text-muted" data-i18n="chartPlaceholder"></span>';
    }
}

// Экспорт для отладки
window.simulateStrategy = simulateStrategy;
