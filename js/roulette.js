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
        zero: [0, 37],
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
    },
    custom: {
        condition: (num, type, customNumbers) => {
            return customNumbers && customNumbers.includes(num);
        }
    }
};

// --- Состояние интерфейса ---
let isSimulating = false;
let customNumbers = [];

// --- Функция для получения перевода ---
function getTranslation(key, params = {}) {
    let text = window.translations && window.translations[key] ? window.translations[key] : key;
    
    // Замена параметров вида {number}
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    updateTargetInputState();
    createEnhancedStrategySelect();
});

// --- СОЗДАНИЕ УЛУЧШЕННОГО ВЫПАДАЮЩЕГО СПИСКА (с каскадным меню) ---
function createEnhancedStrategySelect() {
    const select = document.getElementById('strategySelect');
    if (!select) return;
    
    const container = select.parentNode;
    
    // Сохраняем текущее значение если было
    const currentValue = select.value;
    
    // Очищаем select
    select.innerHTML = '';
    
    // 1. Группа основных ставок
    const baseGroup = document.createElement('optgroup');
    baseGroup.label = getTranslation('strategyGroupBasic');
    
    addOption(baseGroup, 'red', getTranslation('strategyRed'));
    addOption(baseGroup, 'black', getTranslation('strategyBlack'));
    addOption(baseGroup, 'even', getTranslation('strategyEven'));
    addOption(baseGroup, 'odd', getTranslation('strategyOdd'));
    addOption(baseGroup, 'zero', getTranslation('strategyZero'));
    
    select.appendChild(baseGroup);
    
    // 2. Группа конкретных цифр (включая "Свои цифры")
    const numbersGroup = document.createElement('optgroup');
    numbersGroup.label = getTranslation('strategyGroupNumbers');
    
    addOption(numbersGroup, 'custom', getTranslation('strategyCustom'));
    
    // Добавляем отдельные цифры 1-36
    for (let i = 1; i <= 36; i++) {
        addOption(numbersGroup, `num_${i}`, getTranslation('strategyNumber', {number: i}));
    }
    
    select.appendChild(numbersGroup);
    
    // 3. Группа половин
    const halvesGroup = document.createElement('optgroup');
    halvesGroup.label = getTranslation('strategyGroupHalves');
    
    addOption(halvesGroup, 'low', getTranslation('strategyLow'));
    addOption(halvesGroup, 'high', getTranslation('strategyHigh'));
    
    select.appendChild(halvesGroup);
    
    // 4. Группа дюжин
    const dozensGroup = document.createElement('optgroup');
    dozensGroup.label = getTranslation('strategyGroupDozens');
    
    addOption(dozensGroup, 'dozen1', getTranslation('strategyDozen1'));
    addOption(dozensGroup, 'dozen2', getTranslation('strategyDozen2'));
    addOption(dozensGroup, 'dozen3', getTranslation('strategyDozen3'));
    
    select.appendChild(dozensGroup);
    
    // 5. Группа колонн
    const columnsGroup = document.createElement('optgroup');
    columnsGroup.label = getTranslation('strategyGroupColumns');
    
    addOption(columnsGroup, 'column1', getTranslation('strategyColumn1'));
    addOption(columnsGroup, 'column2', getTranslation('strategyColumn2'));
    addOption(columnsGroup, 'column3', getTranslation('strategyColumn3'));
    
    select.appendChild(columnsGroup);
    
    // Восстанавливаем выбранное значение если возможно
    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    }
    
    // Обработчик изменения выбора
    select.addEventListener('change', function(e) {
        const container = document.getElementById('customNumbersContainer');
        if (container) {
            if (this.value === 'custom') {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
                customNumbers = [];
            }
        }
    });
    
    // Создаем или обновляем контейнер для custom чисел
    updateCustomNumbersContainer(select);
}

// --- Вспомогательная функция добавления option ---
function addOption(group, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    group.appendChild(option);
    return option;
}

// --- Создание/обновление контейнера для своих цифр ---
function updateCustomNumbersContainer(select) {
    let customContainer = document.getElementById('customNumbersContainer');
    
    if (!customContainer) {
        customContainer = document.createElement('div');
        customContainer.id = 'customNumbersContainer';
        customContainer.style.marginTop = '10px';
        customContainer.style.display = 'none';
        
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.id = 'customNumbersInput';
        customInput.className = 'settings-input bg-elevated border-muted text-5';
        customInput.style.width = '100%';
        customInput.placeholder = getTranslation('customNumbersPlaceholder');
        
        const customHint = document.createElement('div');
        customHint.className = 'text-muted';
        customHint.style.fontSize = '0.85rem';
        customHint.style.marginTop = '5px';
        customHint.textContent = getTranslation('customNumbersHint');
        
        customContainer.appendChild(customInput);
        customContainer.appendChild(customHint);
        
        select.parentNode.insertBefore(customContainer, select.nextSibling);
        
        customInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value) {
                customNumbers = value.split(',')
                    .map(num => parseInt(num.trim()))
                    .filter(num => !isNaN(num) && num >= 0 && num <= 36);
            } else {
                customNumbers = [];
            }
        });
    }
}

// --- Обработчики событий ---
function initEventListeners() {
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-type]').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            // Обновляем список стратегий при смене типа рулетки
            createEnhancedStrategySelect();
        });
    });

    document.getElementById('stopTarget').addEventListener('change', updateTargetInputState);
    document.getElementById('stopSpins').addEventListener('change', updateTargetInputState);
    
    document.getElementById('simulateBtn').addEventListener('click', simulateStrategy);
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);
    
    // Обновляем при смене языка
    document.addEventListener('languageChanged', () => {
        createEnhancedStrategySelect();
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
    const strategy = document.getElementById('strategySelect').value;
    
    const triggerType = document.getElementById('triggerType').value;
    const triggerCount = parseInt(document.getElementById('triggerCount').value) || 3;
    
    const stopBankrupt = document.getElementById('stopBankrupt').checked;
    const stopTarget = document.getElementById('stopTarget').checked;
    const targetAmount = parseInt(document.getElementById('targetAmount').value) || 2000;
    const stopSpins = document.getElementById('stopSpins').checked;
    const maxSpins = parseInt(document.getElementById('maxSpins').value) || 100;
    
    const sessionCount = parseInt(document.getElementById('sessionCount').value) || 500;
    
    // Получаем custom числа если выбраны
    let customNumbersArray = [];
    if (strategy === 'custom') {
        customNumbersArray = customNumbers;
        if (customNumbersArray.length === 0) {
            alert(getTranslation('customNumbersRequired'));
            return;
        }
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
            config, startingBankroll, betAmount, strategy,
            triggerType, triggerCount,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins,
            sessionCount, customNumbersArray
        );
        
        displayResults(results);
        
        isSimulating = false;
        document.getElementById('simulateBtn').disabled = false;
        document.getElementById('simulateBtn').innerHTML = '<i class="fas fa-cogs"></i> <span>' + getTranslation('simulateBtn') + '</span>';
    }, 50);
}

// --- Функция симуляции одной сессии ---
function simulateSession(config, startingBankroll, betAmount, strategy, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins, customNumbersArray) {
    let bankroll = startingBankroll;
    let spins = 0;
    let triggerCounter = 0;
    let betPlaced = false;
    
    // Обработка специальных стратегий
    let actualStrategy = strategy;
    let actualCustomNumbers = [];
    
    if (strategy.startsWith('num_')) {
        // Конкретная цифра
        const num = parseInt(strategy.split('_')[1]);
        actualStrategy = 'custom';
        actualCustomNumbers = [num];
    } else if (strategy === 'custom') {
        actualStrategy = 'custom';
        actualCustomNumbers = customNumbersArray;
    }
    
    while (true) {
        if (stopBankrupt && bankroll <= 0) break;
        if (stopTarget && bankroll >= targetAmount) break;
        if (stopSpins && spins >= maxSpins) break;
        
        const number = Math.floor(Math.random() * config.numbers);
        spins++;
        
        let isWin = false;
        if (actualStrategy === 'custom') {
            isWin = BetDefinitions.custom.condition(number, config.type, actualCustomNumbers);
        } else {
            isWin = BetDefinitions[actualStrategy]?.condition(number, config.type);
        }
        
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
                    // Для конкретных цифр выплата 35:1
                    let payout = 1;
                    if (actualStrategy === 'custom' || strategy.startsWith('num_')) {
                        payout = 35; // Straight up
                    } else {
                        payout = config.payouts[actualStrategy] || 1;
                    }
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

// --- Функция запуска множества сессий ---
function runSimulation(config, startingBankroll, betAmount, strategy, triggerType, triggerCount, stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins, sessionCount, customNumbersArray) {
    const sessions = [];
    
    for (let i = 0; i < sessionCount; i++) {
        const session = simulateSession(
            config, startingBankroll, betAmount, strategy,
            triggerType, triggerCount,
            stopBankrupt, stopTarget, targetAmount, stopSpins, maxSpins,
            customNumbersArray
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
}

window.simulateStrategy = simulateStrategy;
