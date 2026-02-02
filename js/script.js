// КОНФИГУРАЦИЯ И КОНСТАНТЫ
const CONFIG = {
    simulations: 10000,
    progressStep: 200,
    slotNames: {
        hero: ['hero-1', 'hero-2'],
        board: ['board-1', 'board-2', 'board-3', 'board-4', 'board-5']
    }
};

// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
const State = {
    activeBlock: 'hand',
    selectedCards: new Map(),
    usedCards: new Set(),
    opponentsCount: 1,
    isCalculating: false
};

// КОМПАКТНЫЙ EVALUATOR
const HandEvaluator = {
    ranks: '23456789TJQKA',
    suits: 'shcd',
    
    evaluate(cards) {
        const parsed = cards.map(c => ({
            rank: this.ranks.indexOf(c.value),
            suit: this.suits.indexOf(c.suitCode)
        })).sort((a, b) => b.rank - a.rank);
        
        // Проверка комбинаций в порядке убывания силы
        if (this.isRoyalFlush(parsed)) return 9000000;
        const straightFlush = this.getStraightFlush(parsed);
        if (straightFlush) return 8000000 + straightFlush;
        // ... остальные проверки (сокращено для примера)
        
        return this.getHighCardValue(parsed);
    },
    
    isRoyalFlush(cards) {
        const flush = this.getFlushCards(cards);
        return flush && flush[0].rank === 12 && flush[4].rank === 8;
    },
    
    // ... остальные методы сокращены
};

// DOM ЭЛЕМЕНТЫ (кешируем один раз)
const DOM = {
    handSection: document.getElementById('handSection'),
    boardSection: document.getElementById('boardSection'),
    calculateBtn: document.getElementById('calculateBtn'),
    progressContainer: document.getElementById('progressContainer'),
    resultsPanel: document.getElementById('resultsPanel'),
    deck: document.getElementById('deck')
};

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
    createDeck();
    initEventListeners();
    initDragAndDrop();
    updateStatus();
});

// СОЗДАНИЕ КОЛОДЫ (более компактно)
function createDeck() {
    const suits = ['s♠', 'h♥', 'c♣', 'd♦'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    
    DOM.deck.innerHTML = suits.flatMap(([code, symbol]) => 
        values.map(value => {
            const cardCode = value + code;
            const isRed = code === 'h' || code === 'd';
            
            return `<div class="deck-card ${isRed ? 'red' : 'black'}" 
                        data-card="${cardCode}" draggable="true"
                        onclick="handleCardClick('${cardCode}')">
                    <div class="card-face">
                        <div class="card-value">${value}</div>
                        <div class="card-suit-large">${symbol}</div>
                    </div>
                </div>`;
        })
    ).join('');
}

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ КАРТЫ
function addCard(cardCode, targetType = null) {
    if (State.usedCards.has(cardCode)) {
        showNotification("Эта карта уже выбрана!");
        return;
    }
    
    const type = targetType || State.activeBlock;
    const slots = CONFIG.slotNames[type];
    
    // Ищем свободный слот
    const freeSlot = slots.find(slot => !State.selectedCards.has(slot));
    
    if (!freeSlot) {
        const altType = type === 'hand' ? 'board' : 'hand';
        const altSlots = CONFIG.slotNames[altType];
        const altFreeSlot = altSlots.find(slot => !State.selectedCards.has(slot));
        
        if (altFreeSlot) {
            // Автопереключение блока
            State.activeBlock = altType;
            updateActiveBlock();
            return addCard(cardCode, altType);
        }
        showNotification("Все слоты заполнены!");
        return;
    }
    
    const [value, suitCode] = [cardCode.slice(0,-1), cardCode.slice(-1)];
    const suitSymbols = { s: '♠', h: '♥', c: '♣', d: '♦' };
    
    State.selectedCards.set(freeSlot, {
        code: cardCode,
        value,
        suit: suitSymbols[suitCode],
        suitCode,
        rank: HandEvaluator.ranks.indexOf(value)
    });
    
    State.usedCards.add(cardCode);
    updateUI();
    
    // Автопереключение при заполнении
    if (slots.every(slot => State.selectedCards.has(slot))) {
        const nextType = type === 'hand' ? 'board' : 'hand';
        if (CONFIG.slotNames[nextType].some(slot => !State.selectedCards.has(slot))) {
            setTimeout(() => {
                State.activeBlock = nextType;
                updateActiveBlock();
                showNotification(`${type === 'hand' ? 'Рука' : 'Борд'} заполнен!`, 1500);
            }, 100);
        }
    }
}

// УДАЛЕНИЕ КАРТЫ
function removeCard(slotId) {
    const card = State.selectedCards.get(slotId);
    if (card) {
        State.usedCards.delete(card.code);
        State.selectedCards.delete(slotId);
        updateUI();
        showNotification(`Карта ${card.value}${card.suit} удалена`, 1500);
    }
}

// ОБНОВЛЕНИЕ ВСЕГО UI
function updateUI() {
    // Обновляем слоты
    document.querySelectorAll('.card-slot').forEach(slot => {
        const slotId = slot.dataset.slot;
        const card = State.selectedCards.get(slotId);
        
        if (card) {
            const isRed = card.suit === '♥' || card.suit === '♦';
            slot.innerHTML = `
                <div class="real-card ${isRed ? 'red' : 'black'}" draggable="true">
                    <div class="card-content">${card.value}<br>${card.suit}</div>
                </div>
                <div class="remove-hint">клик для удаления</div>
            `;
        } else {
            slot.innerHTML = `
                <div class="slot-empty">+</div>
                <div class="remove-hint">клик для удаления</div>
            `;
        }
    });
    
    // Обновляем колоду
    document.querySelectorAll('.deck-card').forEach(deckCard => {
        const isSelected = State.usedCards.has(deckCard.dataset.card);
        deckCard.classList.toggle('selected', isSelected);
        deckCard.draggable = !isSelected;
        deckCard.style.cursor = isSelected ? 'default' : 'pointer';
    });
    
    // Проверяем валидность
    checkValidity();
    updateStatus();
}

// УПРОЩЁННЫЙ РАСЧЁТ
async function calculateEquity() {
    if (State.isCalculating) return;
    
    const heroCards = getCardsByType('hero');
    const boardCards = getCardsByType('board');
    
    if (!isValidHand() || !isValidBoard()) {
        showNotification("Проверьте правильность заполнения!");
        return;
    }
    
    State.isCalculating = true;
    DOM.calculateBtn.disabled = true;
    DOM.progressContainer.style.display = 'block';
    DOM.resultsPanel.style.display = 'block';
    
    const deck = createDeckArray().filter(card => !State.usedCards.has(card.code));
    let heroWins = 0, opponentWins = 0, ties = 0;
    
    for (let i = 0; i < CONFIG.simulations; i++) {
        if (i % CONFIG.progressStep === 0) {
            updateProgress(i / CONFIG.simulations * 100);
            await delay(0);
        }
        
        const simResult = runSingleSimulation(deck, heroCards, boardCards);
        heroWins += simResult.heroWin;
        opponentWins += simResult.opponentWin;
        ties += simResult.tie;
    }
    
    showResults(heroWins, opponentWins, ties);
    State.isCalculating = false;
    updateStatus();
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function getCardsByType(type) {
    return [...State.selectedCards.entries()]
        .filter(([slot]) => slot.startsWith(type))
        .map(([, card]) => card);
}

function isValidHand() {
    return getCardsByType('hero').length === 2;
}

function isValidBoard() {
    const count = getCardsByType('board').length;
    return [0, 3, 4, 5].includes(count);
}

function runSingleSimulation(deck, heroCards, boardCards) {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const fullBoard = [...boardCards];
    
    // Добираем борд до 5 карт
    while (fullBoard.length < 5) fullBoard.push(shuffled.pop());
    
    // Генерируем руки оппонентов
    const opponentHands = Array.from({length: State.opponentsCount}, 
        () => [shuffled.pop(), shuffled.pop()]);
    
    const heroScore = HandEvaluator.evaluate([...heroCards, ...fullBoard]);
    const bestOpponentScore = Math.max(...opponentHands.map(hand => 
        HandEvaluator.evaluate([...hand, ...fullBoard])));
    
    return {
        heroWin: heroScore > bestOpponentScore ? 1 : 0,
        opponentWin: heroScore < bestOpponentScore ? 1 : 0,
        tie: heroScore === bestOpponentScore ? 1 : 0
    };
}

function showResults(heroWins, opponentWins, ties) {
    const total = CONFIG.simulations;
    document.getElementById('resultHero').textContent = (heroWins/total*100).toFixed(1) + '%';
    document.getElementById('resultOpponent').textContent = (opponentWins/total*100).toFixed(1) + '%';
    document.getElementById('resultTie').textContent = (ties/total*100).toFixed(1) + '%';
    
    DOM.progressContainer.style.display = 'none';
    showNotification(`Расчёт завершён! ${total} симуляций`);
}

// ГОРЯЧИЕ КЛАВИШИ (компактнее)
document.addEventListener('keydown', e => {
    const keyActions = {
        'Escape': clearAll,
        '1': () => setActiveBlock('hand'),
        '2': () => setActiveBlock('board'),
        'Enter': calculateEquity,
        ' ': calculateEquity
    };
    
    if (keyActions[e.key]) keyActions[e.key]();
    if (e.key >= '1' && e.key <= '9') setOpponents(parseInt(e.key));
});

// ОСТАЛЬНЫЕ ФУНКЦИИ (сокращённые аналоги)
function setActiveBlock(block) { 
    State.activeBlock = block; 
    updateActiveBlock(); 
}

function setOpponents(count) { 
    State.opponentsCount = count; 
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        pill.classList.toggle('active', parseInt(pill.dataset.opponents) === count);
    });
    document.getElementById('currentOpponents').textContent = count;
}

function updateProgress(percent) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = `Идет расчет: ${Math.round(percent)}%`;
}

function showNotification(msg, duration = 2000) {
    const notif = document.getElementById('notification');
    notif.textContent = msg;
    notif.style.display = 'block';
    setTimeout(() => notif.style.display = 'none', duration);
}

function clearAll() {
    State.selectedCards.clear();
    State.usedCards.clear();
    State.activeBlock = 'hand';
    updateUI();
    DOM.resultsPanel.style.display = 'none';
    showNotification("Все карты очищены!");
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
