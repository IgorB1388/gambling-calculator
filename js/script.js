// ============= ГЛОБАЛЬНОЕ СОСТОЯНИЕ =============
const State = {
    activeBlock: 'hand',
    selectedCards: new Map(),  // slotId -> card
    usedCards: new Set(),      // cardCode -> true
    opponentsCount: 1,
    isCalculating: false
};

// ============= ПРОФЕССИОНАЛЬНЫЙ АЛГОРИТМ ОЦЕНКИ РУК =============
const HandEvaluator = {
    ranks: { '2':0, '3':1, '4':2, '5':3, '6':4, '7':5, '8':6, '9':7, '10':8, 'J':9, 'Q':10, 'K':11, 'A':12 },
    suits: { 's':0, 'h':1, 'c':2, 'd':3 },
    
    evaluate(cards) {
        const formatted = cards.map(c => ({ rank: this.ranks[c.value], suit: this.suits[c.suitCode] }));
        formatted.sort((a,b) => b.rank - a.rank);
        
        const flush = this.hasFlush(formatted);
        const straight = this.hasStraight(formatted);
        
        if (flush && straight) {
            const straightValue = this.getStraightValue(formatted, true);
            if (straightValue === 12) return 9 << 20;
            return (8 << 20) + (straightValue << 16);
        }
        
        const counts = this.getRankCounts(formatted);
        const values = Object.values(counts).sort((a,b) => b - a);
        
        if (values[0] === 4) {
            const quadsRank = this.getRankOfCount(counts, 4);
            const kicker = this.getKickers(formatted, [quadsRank], 1);
            return (7 << 20) + (quadsRank << 16) + (kicker[0] << 12);
        }
        
        if (values[0] === 3 && values[1] >= 2) {
            const tripsRank = this.getRankOfCount(counts, 3);
            const pairRank = this.getRankOfCount(counts, 2, tripsRank);
            return (6 << 20) + (tripsRank << 16) + (pairRank << 12);
        }
        
        if (flush) {
            const flushCards = this.getFlushCards(formatted);
            return (5 << 20) + this.getHandValue(flushCards.slice(0,5));
        }
        
        if (straight) {
            const straightValue = this.getStraightValue(formatted, false);
            return (4 << 20) + (straightValue << 16);
        }
        
        if (values[0] === 3) {
            const tripsRank = this.getRankOfCount(counts, 3);
            const kickers = this.getKickers(formatted, [tripsRank], 2);
            return (3 << 20) + (tripsRank << 16) + (kickers[0] << 12) + (kickers[1] << 8);
        }
        
        if (values[0] === 2 && values[1] === 2) {
            const pairs = this.getRanksOfCount(counts, 2);
            pairs.sort((a,b) => b - a);
            const kicker = this.getKickers(formatted, pairs, 1)[0];
            return (2 << 20) + (pairs[0] << 16) + (pairs[1] << 12) + (kicker << 8);
        }
        
        if (values[0] === 2) {
            const pairRank = this.getRankOfCount(counts, 2);
            const kickers = this.getKickers(formatted, [pairRank], 3);
            return (1 << 20) + (pairRank << 16) + (kickers[0] << 12) + (kickers[1] << 8) + (kickers[2] << 4);
        }
        
        return this.getHandValue(formatted.slice(0,5));
    },
    
    hasFlush(cards) {
        const suitCounts = [0,0,0,0];
        cards.forEach(c => suitCounts[c.suit]++);
        return suitCounts.some(count => count >= 5);
    },
    
    hasStraight(cards) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))];
        uniqueRanks.sort((a,b) => b - a);
        
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) return true;
        }
        
        if (uniqueRanks.includes(12)) {
            const lowStraight = [0,1,2,3];
            if (lowStraight.every(r => uniqueRanks.includes(r))) return true;
        }
        
        return false;
    },
    
    getStraightValue(cards) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))];
        uniqueRanks.sort((a,b) => b - a);
        
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) return uniqueRanks[i];
        }
        
        if (uniqueRanks.includes(12)) {
            const lowStraight = [0,1,2,3];
            if (lowStraight.every(r => uniqueRanks.includes(r))) return 3;
        }
        
        return -1;
    },
    
    getRankCounts(cards) {
        const counts = {};
        cards.forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
        return counts;
    },
    
    getRankOfCount(counts, targetCount, exclude = -1) {
        for (const [rank, count] of Object.entries(counts)) {
            const rankNum = parseInt(rank);
            if (count === targetCount && rankNum !== exclude) return rankNum;
        }
        return -1;
    },
    
    getRanksOfCount(counts, targetCount) {
        const result = [];
        for (const [rank, count] of Object.entries(counts)) {
            if (count === targetCount) result.push(parseInt(rank));
        }
        return result;
    },
    
    getKickers(cards, excludeRanks, count) {
        const kickers = cards
            .filter(c => !excludeRanks.includes(c.rank))
            .map(c => c.rank)
            .sort((a,b) => b - a)
            .slice(0, count);
        while (kickers.length < count) kickers.push(0);
        return kickers;
    },
    
    getFlushCards(cards) {
        const suitCounts = [0,0,0,0];
        cards.forEach(c => suitCounts[c.suit]++);
        const flushSuit = suitCounts.findIndex(count => count >= 5);
        return cards.filter(c => c.suit === flushSuit).sort((a,b) => b.rank - a.rank).slice(0,5);
    },
    
    getHandValue(cards) {
        let value = 0;
        cards.forEach((c,i) => { value += c.rank << (4 * (4 - i)); });
        return value;
    }
};

// ============= ИНИЦИАЛИЗАЦИЯ =============
document.addEventListener('DOMContentLoaded', () => {
    console.log("Poker Calculator v2 - оптимизированная версия");
    createDeck();
    initEventListeners();
    initDragAndDrop();
    selectBlock('hand');
    updateStatus();
});

// ============= СОЗДАНИЕ КОЛОДЫ =============
function createDeck() {
    const deck = document.getElementById('deck');
    deck.innerHTML = '';
    
    const suits = [
        {code:'s', symbol:'♠', color:'black'},
        {code:'h', symbol:'♥', color:'red'},
        {code:'c', symbol:'♣', color:'black'},
        {code:'d', symbol:'♦', color:'red'}
    ];
    
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    
    suits.forEach(suit => {
        values.forEach(value => {
            const cardCode = value + suit.code;
            const card = document.createElement('div');
            card.className = `deck-card ${suit.color}`;
            card.dataset.card = cardCode;
            card.draggable = true;
            card.innerHTML = `<div class="card-face"><div class="card-value">${value}</div><div class="card-suit-large">${suit.symbol}</div></div>`;
            deck.appendChild(card);
            
            // Клик по карте в колоде
            card.addEventListener('click', (e) => {
                if (card.classList.contains('selected')) return;
                handleDeckCardClick(cardCode);
            });
        });
    });
}

function handleDeckCardClick(cardCode) {
    if (State.usedCards.has(cardCode)) {
        showNotification("Эта карта уже выбрана!");
        return;
    }
    
    // Ищем свободный слот в активном блоке
    const slots = State.activeBlock === 'hand' 
        ? ['hero-1','hero-2'] 
        : ['board-1','board-2','board-3','board-4','board-5'];
    
    // Находим свободный слот
    let freeSlot = null;
    for (const slot of slots) {
        if (!State.selectedCards.has(slot)) {
            freeSlot = slot;
            break;
        }
    }
    
    // Если в текущем блоке нет места, пробуем другой
    if (!freeSlot) {
        const otherSlots = State.activeBlock === 'hand' 
            ? ['board-1','board-2','board-3','board-4','board-5']
            : ['hero-1','hero-2'];
        
        for (const slot of otherSlots) {
            if (!State.selectedCards.has(slot)) {
                State.activeBlock = State.activeBlock === 'hand' ? 'board' : 'hand';
                updateActiveBlockUI();
                freeSlot = slot;
                break;
            }
        }
        
        if (!freeSlot) {
            showNotification("Все слоты заполнены!");
            return;
        }
    }
    
    // Создаем объект карты
    const value = cardCode.slice(0,-1);
    const suitCode = cardCode.slice(-1);
    const suitSymbols = { 's':'♠', 'h':'♥', 'c':'♣', 'd':'♦' };
    
    State.selectedCards.set(freeSlot, {
        code: cardCode,
        value: value,
        suit: suitSymbols[suitCode],
        suitCode: suitCode,
        rank: HandEvaluator.ranks[value]
    });
    
    State.usedCards.add(cardCode);
    updateCardDisplay();
    checkValidity();
    updateStatus();
}

// ============= ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ =============
function updateCardDisplay() {
    // Обновляем слоты
    document.querySelectorAll('.card-slot').forEach(slot => {
        const slotId = slot.dataset.slot;
        const card = State.selectedCards.get(slotId);
        
        if (card) {
            const isRed = card.suit === '♥' || card.suit === '♦';
            slot.innerHTML = `
                <div class="real-card ${isRed?'red':'black'}" draggable="true">
                    <div class="card-content">${card.value}<br>${card.suit}</div>
                </div>
                <div class="remove-hint">клик для удаления</div>
            `;
        } else {
            slot.innerHTML = '<div class="slot-empty">+</div><div class="remove-hint">клик для удаления</div>';
        }
    });
    
    // Обновляем колоду
    document.querySelectorAll('.deck-card').forEach(deckCard => {
        const cardCode = deckCard.dataset.card;
        const isSelected = State.usedCards.has(cardCode);
        deckCard.classList.toggle('selected', isSelected);
        deckCard.draggable = !isSelected;
    });
}

// ============= ОБРАБОТЧИКИ СОБЫТИЙ =============
function initEventListeners() {
    document.getElementById('handSection').addEventListener('click', () => selectBlock('hand'));
    document.getElementById('boardSection').addEventListener('click', () => selectBlock('board'));
    document.getElementById('calculateBtn').addEventListener('click', calculateEquity);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        pill.addEventListener('click', () => setOpponents(parseInt(pill.dataset.opponents)));
    });
    
    // Клик по слотам для удаления карт
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            if (e.target.classList.contains('slot-empty') || e.target.classList.contains('remove-hint')) return;
            if (e.target.closest('.real-card')) {
                removeCardFromSlot(slot.dataset.slot);
            }
        });
    });
    
    // Горячие клавиши
    document.addEventListener('keydown', handleHotkeys);
}

function handleHotkeys(e) {
    switch(e.key) {
        case 'Escape': clearAll(); break;
        case '1': selectBlock('hand'); break;
        case '2': selectBlock('board'); break;
        case 'Enter':
        case ' ': if (!document.getElementById('calculateBtn').disabled) calculateEquity(); break;
        default: if (e.key >= '1' && e.key <= '9') setOpponents(parseInt(e.key));
    }
}

// ============= DRAG & DROP =============
function initDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
        const deckCard = e.target.closest('.deck-card');
        if (deckCard && deckCard.draggable) {
            e.dataTransfer.setData('text/plain', deckCard.dataset.card);
            e.dataTransfer.effectAllowed = 'copyMove';
            deckCard.style.opacity = '0.5';
            return;
        }
        
        const realCard = e.target.closest('.real-card');
        if (realCard) {
            const slot = realCard.parentElement;
            const slotId = slot.dataset.slot;
            const card = State.selectedCards.get(slotId);
            if (card) {
                e.dataTransfer.setData('text/plain', JSON.stringify({cardCode:card.code, fromSlot:slotId}));
                e.dataTransfer.effectAllowed = 'move';
                realCard.style.opacity = '0.5';
            }
        }
    });
    
    document.addEventListener('dragend', () => {
        document.querySelectorAll('.deck-card, .real-card').forEach(el => el.style.opacity = '1');
        document.querySelectorAll('.card-slot').forEach(slot => slot.classList.remove('drag-over'));
    });
    
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
        slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
        slot.addEventListener('drop', (e) => handleDrop(e, slot));
    });
}

function handleDrop(e, slot) {
    e.preventDefault();
    slot.classList.remove('drag-over');
    
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    const slotId = slot.dataset.slot;
    
    try {
        // Drag из слота (перемещение)
        const parsed = JSON.parse(data);
        const fromSlot = parsed.fromSlot;
        if (fromSlot && fromSlot !== slotId) {
            const card = State.selectedCards.get(fromSlot);
            if (card) {
                if (State.selectedCards.has(slotId)) {
                    const otherCard = State.selectedCards.get(slotId);
                    State.selectedCards.set(fromSlot, otherCard);
                    State.selectedCards.set(slotId, card);
                } else {
                    State.selectedCards.delete(fromSlot);
                    State.selectedCards.set(slotId, card);
                }
                updateCardDisplay();
                checkValidity();
                updateStatus();
            }
        }
    } catch {
        // Drag из колоды (добавление)
        const cardCode = data;
        if (State.usedCards.has(cardCode)) {
            showNotification("Эта карта уже выбрана!");
            return;
        }
        if (State.selectedCards.has(slotId)) {
            showNotification("Слот уже занят!");
            return;
        }
        
        const value = cardCode.slice(0,-1);
        const suitCode = cardCode.slice(-1);
        const suitSymbols = { 's':'♠', 'h':'♥', 'c':'♣', 'd':'♦' };
        
        State.selectedCards.set(slotId, {
            code: cardCode,
            value: value,
            suit: suitSymbols[suitCode],
            suitCode: suitCode,
            rank: HandEvaluator.ranks[value]
        });
        
        State.usedCards.add(cardCode);
        updateCardDisplay();
        checkValidity();
        updateStatus();
    }
}

// ============= ОСНОВНЫЕ ФУНКЦИИ =============
function selectBlock(block) {
    State.activeBlock = block;
    updateActiveBlockUI();
}

function updateActiveBlockUI() {
    const isHand = State.activeBlock === 'hand';
    document.getElementById('handSection').classList.toggle('active', isHand);
    document.getElementById('boardSection').classList.toggle('active', !isHand);
    document.getElementById('handTitle').classList.toggle('active', isHand);
    document.getElementById('boardTitle').classList.toggle('active', !isHand);
    document.getElementById('currentBlockName').textContent = isHand ? 'Ваша рука' : 'Борд';
}

function setOpponents(count) {
    State.opponentsCount = count;
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        pill.classList.toggle('active', parseInt(pill.dataset.opponents) === count);
    });
    document.getElementById('currentOpponents').textContent = count;
}

function removeCardFromSlot(slotId) {
    const card = State.selectedCards.get(slotId);
    if (card) {
        State.selectedCards.delete(slotId);
        State.usedCards.delete(card.code);
        updateCardDisplay();
        checkValidity();
        updateStatus();
        showNotification(`Карта ${card.value}${card.suit} удалена`, 1500);
    }
}

function checkValidity() {
    const heroCards = Array.from(State.selectedCards.keys()).filter(s => s.startsWith('hero')).length;
    const boardCards = Array.from(State.selectedCards.keys()).filter(s => s.startsWith('board')).length;
    
    const handValid = heroCards === 2;
    const boardValid = boardCards === 0 || boardCards === 3 || boardCards === 4 || boardCards === 5;
    
    document.getElementById('handWarning').style.display = handValid ? 'none' : 'block';
    document.getElementById('boardWarning').style.display = boardValid ? 'none' : 'block';
    
    return handValid && boardValid;
}

function updateStatus() {
    const calculateBtn = document.getElementById('calculateBtn');
    const isValid = checkValidity();
    calculateBtn.disabled = State.isCalculating || !isValid;
}

// ============= РАСЧЁТ ВЕРОЯТНОСТЕЙ =============
async function calculateEquity() {
    if (State.isCalculating || !checkValidity()) return;
    
    State.isCalculating = true;
    document.getElementById('calculateBtn').disabled = true;
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('resultsPanel').style.display = 'block';
    
    const heroCards = Array.from(State.selectedCards.entries())
        .filter(([s]) => s.startsWith('hero')).map(([,c]) => c);
    const boardCards = Array.from(State.selectedCards.entries())
        .filter(([s]) => s.startsWith('board')).map(([,c]) => c);
    
    // Создаем колоду
    const deck = createDeckArray().filter(c => !State.usedCards.has(c.code));
    const SIMULATIONS = 10000;
    let heroWins = 0, opponentWins = 0, ties = 0;
    
    for (let i = 0; i < SIMULATIONS; i++) {
        if (i % 200 === 0) {
            const progress = Math.round((i / SIMULATIONS) * 100);
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('progressText').textContent = `Идет расчет: ${progress}%`;
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        const shuffled = [...deck].sort(() => Math.random() - 0.5);
        const fullBoard = [...boardCards];
        while (fullBoard.length < 5) fullBoard.push(shuffled.pop());
        
        const opponentHands = [];
        for (let j = 0; j < State.opponentsCount; j++) {
            opponentHands.push([shuffled.pop(), shuffled.pop()]);
        }
        
        const heroScore = HandEvaluator.evaluate([...heroCards, ...fullBoard]);
        const opponentScores = opponentHands.map(h => HandEvaluator.evaluate([...h, ...fullBoard]));
        const bestOpponentScore = Math.max(...opponentScores);
        
        if (heroScore > bestOpponentScore) heroWins++;
        else if (heroScore < bestOpponentScore) opponentWins++;
        else ties++;
    }
    
    // Результаты
    document.getElementById('resultHero').textContent = (heroWins / SIMULATIONS * 100).toFixed(1) + '%';
    document.getElementById('resultOpponent').textContent = (opponentWins / SIMULATIONS * 100).toFixed(1) + '%';
    document.getElementById('resultTie').textContent = (ties / SIMULATIONS * 100).toFixed(1) + '%';
    
    // Описание руки
    const handDesc = describeHand(heroCards, boardCards);
    document.getElementById('heroHandDesc').textContent = handDesc;
    
    // Оппоненты
    const plural = State.opponentsCount === 1 ? '' : State.opponentsCount >= 2 && State.opponentsCount <= 4 ? 'а' : 'ов';
    const oppText = State.opponentsCount === 1 ? "Хедз-ап (1 на 1)" : `${State.opponentsCount} оппонент${plural}`;
    document.getElementById('opponentInfo').textContent = oppText;
    
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressText').textContent = 'Расчет завершен!';
    showNotification(`Расчёт завершён! ${SIMULATIONS} симуляций, точность ±0.5%`);
    document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth' });
    
    setTimeout(() => {
        document.getElementById('progressContainer').style.display = 'none';
        State.isCalculating = false;
        updateStatus();
    }, 1000);
}

function createDeckArray() {
    const suits = ['s','h','c','d'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck = [];
    
    for (const suit of suits) {
        for (const value of values) {
            const suitSymbols = { 's':'♠', 'h':'♥', 'c':'♣', 'd':'♦' };
            deck.push({
                code: value + suit,
                value: value,
                suit: suitSymbols[suit],
                suitCode: suit,
                rank: HandEvaluator.ranks[value]
            });
        }
    }
    return deck;
}

function describeHand(heroCards, boardCards) {
    if (boardCards.length === 0) return "Префлоп";
    const allCards = [...heroCards, ...boardCards];
    const score = HandEvaluator.evaluate(allCards);
    const handRank = score >> 20;
    
    switch(handRank) {
        case 9: return "Роял-флеш";
        case 8: return "Стрит-флеш";
        case 7: return "Каре";
        case 6: return "Фулл-хаус";
        case 5: return "Флеш";
        case 4: return "Стрит";
        case 3: return "Сет";
        case 2: return "Две пары";
        case 1: return "Пара";
        default: return "Старшая карта";
    }
}

function clearAll() {
    State.selectedCards.clear();
    State.usedCards.clear();
    State.activeBlock = 'hand';
    State.isCalculating = false;
    updateCardDisplay();
    updateActiveBlockUI();
    checkValidity();
    updateStatus();
    document.getElementById('resultsPanel').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    showNotification("Все карты очищены!");
}

function showNotification(message, duration = 2000) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.style.display = 'block';
    setTimeout(() => notif.style.display = 'none', duration);
}
