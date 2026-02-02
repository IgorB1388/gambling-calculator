// Глобальные переменные
let activeBlock = 'hand';
let selectedCards = new Map();
let usedCards = new Set();
let opponentsCount = 1;
let isCalculating = false;

// ПРОФЕССИОНАЛЬНЫЙ АЛГОРИТМ ОЦЕНКИ РУК
const HandEvaluator = {
    ranks: {
        '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5,
        '8': 6, '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12
    },
    
    suits: { 's': 0, 'h': 1, 'c': 2, 'd': 3 },
    
    evaluate(cards) {
        const formatted = cards.map(c => ({
            rank: this.ranks[c.value],
            suit: this.suits[c.suitCode]
        }));
        
        formatted.sort((a, b) => b.rank - a.rank);
        
        const flush = this.hasFlush(formatted);
        const straight = this.hasStraight(formatted);
        
        if (flush && straight) {
            const straightValue = this.getStraightValue(formatted, true);
            if (straightValue === 12) return 9 << 20;
            return (8 << 20) + (straightValue << 16);
        }
        
        const counts = this.getRankCounts(formatted);
        const values = Object.values(counts).sort((a, b) => b - a);
        
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
            return (5 << 20) + this.getHandValue(flushCards.slice(0, 5));
        }
        
        if (straight) {
            const straightValue = this.getStraightValue(formatted, false);
            return (4 << 20) + (straightValue << 16);
        }
        
        if (values[0] === 3) {
            const tripsRank = this.getRankOfCount(counts, 3);
            const kickers = this.getKickers(formatted, [tripsRank], 2);
            return (3 << 20) + (tripsRank << 16) + 
                   (kickers[0] << 12) + (kickers[1] << 8);
        }
        
        if (values[0] === 2 && values[1] === 2) {
            const pairs = this.getRanksOfCount(counts, 2);
            pairs.sort((a, b) => b - a);
            const kicker = this.getKickers(formatted, pairs, 1)[0];
            return (2 << 20) + (pairs[0] << 16) + 
                   (pairs[1] << 12) + (kicker << 8);
        }
        
        if (values[0] === 2) {
            const pairRank = this.getRankOfCount(counts, 2);
            const kickers = this.getKickers(formatted, [pairRank], 3);
            return (1 << 20) + (pairRank << 16) + 
                   (kickers[0] << 12) + (kickers[1] << 8) + 
                   (kickers[2] << 4);
        }
        
        return this.getHandValue(formatted.slice(0, 5));
    },
    
    hasFlush(cards) {
        const suitCounts = [0, 0, 0, 0];
        cards.forEach(c => suitCounts[c.suit]++);
        return suitCounts.some(count => count >= 5);
    },
    
    hasStraight(cards) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))];
        uniqueRanks.sort((a, b) => b - a);
        
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
                return true;
            }
        }
        
        if (uniqueRanks.includes(12)) {
            const lowStraight = [0, 1, 2, 3];
            if (lowStraight.every(r => uniqueRanks.includes(r))) {
                return true;
            }
        }
        
        return false;
    },
    
    getStraightValue(cards, forFlush) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))];
        uniqueRanks.sort((a, b) => b - a);
        
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
                return uniqueRanks[i];
            }
        }
        
        if (uniqueRanks.includes(12)) {
            const lowStraight = [0, 1, 2, 3];
            if (lowStraight.every(r => uniqueRanks.includes(r))) {
                return 3;
            }
        }
        
        return -1;
    },
    
    getRankCounts(cards) {
        const counts = {};
        cards.forEach(c => {
            counts[c.rank] = (counts[c.rank] || 0) + 1;
        });
        return counts;
    },
    
    getRankOfCount(counts, targetCount, exclude = -1) {
        for (const [rank, count] of Object.entries(counts)) {
            const rankNum = parseInt(rank);
            if (count === targetCount && rankNum !== exclude) {
                return rankNum;
            }
        }
        return -1;
    },
    
    getRanksOfCount(counts, targetCount) {
        const result = [];
        for (const [rank, count] of Object.entries(counts)) {
            if (count === targetCount) {
                result.push(parseInt(rank));
            }
        }
        return result;
    },
    
    getKickers(cards, excludeRanks, count) {
        const kickers = cards
            .filter(c => !excludeRanks.includes(c.rank))
            .map(c => c.rank)
            .sort((a, b) => b - a)
            .slice(0, count);
        
        while (kickers.length < count) kickers.push(0);
        return kickers;
    },
    
    getFlushCards(cards) {
        const suitCounts = [0, 0, 0, 0];
        cards.forEach(c => suitCounts[c.suit]++);
        const flushSuit = suitCounts.findIndex(count => count >= 5);
        return cards
            .filter(c => c.suit === flushSuit)
            .sort((a, b) => b.rank - a.rank)
            .slice(0, 5);
    },
    
    getHandValue(cards) {
        let value = 0;
        cards.forEach((c, i) => {
            value += c.rank << (4 * (4 - i));
        });
        return value;
    }
};

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', function() {
    console.log("Покерный калькулятор запущен!");
    createDeck();
    initEventListeners();
    initDragAndDrop();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    selectHandBlock();
});

function createDeck() {
    const deckGrid = document.getElementById('deck');
    deckGrid.innerHTML = '';
    
    const suits = [
        {code: 's', symbol: '♠', color: 'black'},
        {code: 'h', symbol: '♥', color: 'red'},
        {code: 'c', symbol: '♣', color: 'black'},
        {code: 'd', symbol: '♦', color: 'red'}
    ];
    
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    suits.forEach(suit => {
        values.forEach(value => {
            const cardCode = value + suit.code;
            const deckCard = document.createElement('div');
            deckCard.className = `deck-card ${suit.color}`;
            deckCard.dataset.card = cardCode;
            deckCard.draggable = true;
            
            const cardFace = document.createElement('div');
            cardFace.className = 'card-face';
            cardFace.innerHTML = `
                <div class="card-value">${value}</div>
                <div class="card-suit-large">${suit.symbol}</div>
            `;
            
            deckCard.appendChild(cardFace);
            deckGrid.appendChild(deckCard);
            
            // Обработчик клика на карту в колоде
            deckCard.addEventListener('click', function(e) {
                if (this.classList.contains('selected')) return;
                handleCardClick(cardCode);
            });
        });
    });
}

function initEventListeners() {
    document.getElementById('handSection').addEventListener('click', selectHandBlock);
    document.getElementById('boardSection').addEventListener('click', selectBoardBlock);
    
    document.getElementById('calculateBtn').addEventListener('click', calculateEquity);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    
    // Обработчики для оппонентов
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            const count = parseInt(this.dataset.opponents);
            setOpponents(count);
        });
    });
    
    // Обработчик клика на карты в слотах для удаления
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('click', function(e) {
            // Не удаляем если кликнули на пустой слот или на подсказку
            if (e.target.classList.contains('slot-empty') || 
                e.target.classList.contains('remove-hint')) {
                return;
            }
            
            const realCard = e.target.closest('.real-card');
            if (realCard) {
                const slotId = this.dataset.slot;
                removeCardFromSlot(slotId);
            }
        });
    });
}

function initDragAndDrop() {
    // Drag из колоды и слотов
    document.addEventListener('dragstart', function(e) {
        // Drag из колоды
        const deckCard = e.target.closest('.deck-card');
        if (deckCard && deckCard.draggable) {
            e.dataTransfer.setData('text/plain', deckCard.dataset.card);
            e.dataTransfer.effectAllowed = 'copyMove';
            deckCard.style.opacity = '0.5';
            return;
        }
        
        // Drag из слотов (карт в руке/борде)
        const realCard = e.target.closest('.real-card');
        if (realCard) {
            const slot = realCard.parentElement;
            const slotId = slot.dataset.slot;
            const card = selectedCards.get(slotId);
            if (card) {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    cardCode: card.code,
                    fromSlot: slotId
                }));
                e.dataTransfer.effectAllowed = 'move';
                realCard.style.opacity = '0.5';
            }
        }
    });
    
    document.addEventListener('dragend', function(e) {
        document.querySelectorAll('.deck-card, .real-card').forEach(el => {
            el.style.opacity = '1';
        });
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.classList.remove('drag-over');
        });
    });
    
    // Drop в слоты
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
            // Разрешаем и copy и move
            e.dataTransfer.dropEffect = ['copy', 'move'].includes(e.dataTransfer.effectAllowed) ? e.dataTransfer.effectAllowed : 'move';
            this.classList.add('drag-over');
        });
        
        slot.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;
            
            const targetSlotId = this.dataset.slot;
            
            try {
                // Пробуем распарсить как JSON (перетаскивание из слота)
                const parsed = JSON.parse(data);
                const cardCode = parsed.cardCode;
                const fromSlot = parsed.fromSlot;
                
                if (fromSlot && fromSlot !== targetSlotId) {
                    moveCardBetweenSlots(fromSlot, targetSlotId);
                    return;
                }
            } catch {
                // Если не JSON, то это drag из колоды
                const cardCode = data;
                
                // Проверяем, не занята ли уже эта карта
                if (usedCards.has(cardCode)) {
                    showNotification("Эта карта уже выбрана!");
                    return;
                }
                
                // Проверяем, есть ли карта в этом слоте
                if (selectedCards.has(targetSlotId)) {
                    showNotification("Слот уже занят!");
                    return;
                }
                
                // Добавляем карту в слот
                addCardToSlot(cardCode, targetSlotId);
            }
        });
    });
    
    // Drop на колоду (для возврата карт)
    const deckGrid = document.getElementById('deck');
    deckGrid.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.style.borderColor = 'var(--neon-yellow)';
        this.style.boxShadow = '0 0 15px var(--neon-yellow)';
    });
    
    deckGrid.addEventListener('dragleave', function(e) {
        if (!this.contains(e.relatedTarget)) {
            this.style.borderColor = '';
            this.style.boxShadow = '';
        }
    });
    
    deckGrid.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '';
        this.style.boxShadow = '';
        
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        
        try {
            const parsed = JSON.parse(data);
            const fromSlot = parsed.fromSlot;
            
            if (fromSlot) {
                removeCardFromSlot(fromSlot);
                showNotification("Карта возвращена в колоду");
            }
        } catch {
            // Не из слота, игнорируем
        }
    });
}

function moveCardBetweenSlots(fromSlotId, toSlotId) {
    if (!selectedCards.has(fromSlotId)) return;
    
    const card = selectedCards.get(fromSlotId);
    
    if (selectedCards.has(toSlotId)) {
        // Если целевой слот занят, меняем карты местами
        const tempCard = selectedCards.get(toSlotId);
        selectedCards.set(toSlotId, card);
        selectedCards.set(fromSlotId, tempCard);
    } else {
        // Если целевой слот пустой, просто перемещаем
        selectedCards.set(toSlotId, card);
        selectedCards.delete(fromSlotId);
    }
    
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
}

function selectHandBlock() {
    activeBlock = 'hand';
    document.getElementById('handSection').classList.remove('active');
    document.getElementById('boardSection').classList.remove('active');
    document.getElementById('handTitle').classList.remove('active');
    document.getElementById('boardTitle').classList.remove('active');
    document.getElementById('handSection').classList.add('active');
    document.getElementById('handTitle').classList.add('active');
    document.getElementById('currentBlockName').textContent = 'Ваша рука';
}

function selectBoardBlock() {
    activeBlock = 'board';
    document.getElementById('handSection').classList.remove('active');
    document.getElementById('boardSection').classList.remove('active');
    document.getElementById('handTitle').classList.remove('active');
    document.getElementById('boardTitle').classList.remove('active');
    document.getElementById('boardSection').classList.add('active');
    document.getElementById('boardTitle').classList.add('active');
    document.getElementById('currentBlockName').textContent = 'Борд';
}

function handleCardClick(cardCode) {
    if (usedCards.has(cardCode)) {
        showNotification("Эта карта уже выбрана!");
        return;
    }
    
    if (activeBlock === 'hand') {
        const handCardsCount = getHandCardsCount();
        if (handCardsCount < 2) {
            addCardToHand(cardCode);
        } else {
            addCardToBoard(cardCode);
        }
    } else if (activeBlock === 'board') {
        const boardCardsCount = getBoardCardsCount();
        if (boardCardsCount < 5) {
            addCardToBoard(cardCode);
        } else {
            const handCardsCount = getHandCardsCount();
            if (handCardsCount < 2) {
                addCardToHand(cardCode);
            } else {
                showNotification("Все слоты заполнены!");
            }
        }
    }
}

function getHandCardsCount() {
    return Array.from(selectedCards.keys())
        .filter(slot => slot.startsWith('hero'))
        .length;
}

function getBoardCardsCount() {
    return Array.from(selectedCards.keys())
        .filter(slot => slot.startsWith('board'))
        .length;
}

function addCardToHand(cardCode) {
    if (getHandCardsCount() >= 2) {
        selectBoardBlock();
        addCardToBoard(cardCode);
        return;
    }
    
    let freeSlot = null;
    for (let i = 1; i <= 2; i++) {
        const slot = `hero-${i}`;
        if (!selectedCards.has(slot)) {
            freeSlot = slot;
            break;
        }
    }
    
    if (!freeSlot) {
        selectBoardBlock();
        addCardToBoard(cardCode);
        return;
    }
    
    addCardToSlot(cardCode, freeSlot);
}

function addCardToBoard(cardCode) {
    if (getBoardCardsCount() >= 5) {
        selectHandBlock();
        addCardToHand(cardCode);
        return;
    }
    
    let freeSlot = null;
    for (let i = 1; i <= 5; i++) {
        const slot = `board-${i}`;
        if (!selectedCards.has(slot)) {
            freeSlot = slot;
            break;
        }
    }
    
    if (!freeSlot) {
        selectHandBlock();
        addCardToHand(cardCode);
        return;
    }
    
    addCardToSlot(cardCode, freeSlot);
}

function addCardToSlot(cardCode, slotId) {
    const value = cardCode.slice(0, -1);
    const suitCode = cardCode.slice(-1);
    const suit = suitCode === 'h' ? '♥' : 
                suitCode === 'd' ? '♦' : 
                suitCode === 's' ? '♠' : '♣';
    
    selectedCards.set(slotId, {
        code: cardCode,
        value: value,
        suit: suit,
        suitCode: suitCode,
        rank: HandEvaluator.ranks[value] || 0
    });
    
    usedCards.add(cardCode);
    
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    
    // Автоматическое переключение при заполнении
    if (slotId.startsWith('hero') && getHandCardsCount() >= 2) {
        setTimeout(() => {
            if (activeBlock === 'hand') {
                selectBoardBlock();
                showNotification("Рука заполнена! Переключаюсь на борд", 1500);
            }
        }, 100);
    } else if (slotId.startsWith('board') && getBoardCardsCount() >= 5) {
        setTimeout(() => {
            if (activeBlock === 'board') {
                selectHandBlock();
                showNotification("Борд заполнен! Переключаюсь на руку", 1500);
            }
        }, 100);
    }
}

function removeCardFromSlot(slotId) {
    if (selectedCards.has(slotId)) {
        const card = selectedCards.get(slotId);
        usedCards.delete(card.code);
        selectedCards.delete(slotId);
        
        updateCardDisplay();
        updateStatus();
        checkBoardValidity();
        checkHandValidity();
        
        showNotification(`Карта ${card.value}${card.suit} удалена`, 1500);
    }
}

function updateCardDisplay() {
    // Обновляем слоты
    document.querySelectorAll('.card-slot').forEach(slot => {
        const slotId = slot.dataset.slot;
        const hasCard = selectedCards.has(slotId);
        
        if (hasCard) {
            const card = selectedCards.get(slotId);
            const isRed = card.suit === '♥' || card.suit === '♦';
            
            slot.innerHTML = '';
            
            const cardDiv = document.createElement('div');
            cardDiv.className = `real-card ${isRed ? 'red' : 'black'}`;
            cardDiv.draggable = true;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'card-content';
            contentDiv.innerHTML = `${card.value}<br>${card.suit}`;
            
            cardDiv.appendChild(contentDiv);
            slot.appendChild(cardDiv);
            
            const hintDiv = document.createElement('div');
            hintDiv.className = 'remove-hint';
            hintDiv.textContent = 'клик для удаления';
            slot.appendChild(hintDiv);
        } else {
            slot.innerHTML = `
                <div class="slot-empty">+</div>
                <div class="remove-hint">клик для удаления</div>
            `;
        }
    });
    
    // ОБНОВЛЯЕМ КОЛОДУ
    document.querySelectorAll('.deck-card').forEach(deckCard => {
        const cardCode = deckCard.dataset.card;
        
        if (usedCards.has(cardCode)) {
            deckCard.classList.add('selected');
            deckCard.draggable = false;
            deckCard.style.cursor = 'default';
        } else {
            deckCard.classList.remove('selected');
            deckCard.draggable = true;
            deckCard.style.cursor = 'pointer';
        }
    });
}

function updateStatus() {
    const calculateBtn = document.getElementById('calculateBtn');
    const boardValid = checkBoardValidity();
    const handValid = checkHandValidity();
    
    if (handValid && boardValid && !isCalculating) {
        calculateBtn.disabled = false;
    } else {
        calculateBtn.disabled = true;
    }
}

function checkHandValidity() {
    const handCards = getHandCardsCount();
    const warning = document.getElementById('handWarning');
    
    if (handCards !== 2) {
        warning.style.display = 'block';
        return false;
    } else {
        warning.style.display = 'none';
        return true;
    }
}

function checkBoardValidity() {
    const boardCards = getBoardCardsCount();
    const warning = document.getElementById('boardWarning');
    const isValid = boardCards === 0 || boardCards === 3 || boardCards === 4 || boardCards === 5;
    
    if (boardCards === 1 || boardCards === 2) {
        warning.style.display = 'block';
        return false;
    } else {
        warning.style.display = 'none';
        return isValid;
    }
}

function setOpponents(count) {
    opponentsCount = count;
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        pill.classList.remove('active');
        if (parseInt(pill.dataset.opponents) === count) {
            pill.classList.add('active');
        }
    });
    document.getElementById('currentOpponents').textContent = count;
}

async function calculateEquity() {
    if (isCalculating) return;
    
    const heroCards = Array.from(selectedCards.entries())
        .filter(([slot]) => slot.startsWith('hero'))
        .map(([, card]) => card);
    
    const boardCards = Array.from(selectedCards.entries())
        .filter(([slot]) => slot.startsWith('board'))
        .map(([, card]) => card);
    
    if (!checkHandValidity() || !checkBoardValidity()) {
        showNotification("Проверьте правильность заполнения!");
        return;
    }
    
    isCalculating = true;
    document.getElementById('calculateBtn').disabled = true;
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('resultsPanel').style.display = 'block';
    
    const SIMULATIONS = 10000;
    let heroWins = 0;
    let opponentWins = 0;
    let ties = 0;
    
    let deck = createFullDeck();
    deck = deck.filter(card => !usedCards.has(card.code));
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    for (let i = 0; i < SIMULATIONS; i++) {
        if (i % 200 === 0) {
            const progress = Math.round((i / SIMULATIONS) * 100);
            progressFill.style.width = progress + '%';
            progressText.textContent = `Идет расчет: ${progress}%`;
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        const simulationDeck = [...deck];
        shuffleArray(simulationDeck);
        
        const fullBoard = [...boardCards];
        const boardNeeded = 5 - boardCards.length;
        for (let j = 0; j < boardNeeded; j++) {
            fullBoard.push(simulationDeck.pop());
        }
        
        const opponentHands = [];
        for (let j = 0; j < opponentsCount; j++) {
            opponentHands.push([simulationDeck.pop(), simulationDeck.pop()]);
        }
        
        const heroScore = HandEvaluator.evaluate([...heroCards, ...fullBoard]);
        const opponentScores = opponentHands.map(hand => 
            HandEvaluator.evaluate([...hand, ...fullBoard]));
        const bestOpponentScore = Math.max(...opponentScores);
        
        if (heroScore > bestOpponentScore) {
            heroWins++;
        } else if (heroScore < bestOpponentScore) {
            opponentWins++;
        } else {
            ties++;
        }
    }
    
    progressFill.style.width = '100%';
    progressText.textContent = 'Расчет завершен!';
    
    const heroPercent = (heroWins / SIMULATIONS * 100).toFixed(1);
    const opponentPercent = (opponentWins / SIMULATIONS * 100).toFixed(1);
    const tiePercent = (ties / SIMULATIONS * 100).toFixed(1);
    
    document.getElementById('resultHero').textContent = heroPercent + '%';
    document.getElementById('resultOpponent').textContent = opponentPercent + '%';
    document.getElementById('resultTie').textContent = tiePercent + '%';
    
    const handDesc = describeHand(heroCards, boardCards);
    document.getElementById('heroHandDesc').textContent = handDesc;
    
    let opponentText = opponentsCount + " оппонент" + getRussianPlural(opponentsCount);
    if (opponentsCount === 1) opponentText = "Хедз-ап (1 на 1)";
    document.getElementById('opponentInfo').textContent = opponentText;
    
    document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth' });
    showNotification(`Расчёт завершён! ${SIMULATIONS} симуляций, точность ±0.5%`);
    
    setTimeout(() => {
        document.getElementById('progressContainer').style.display = 'none';
        isCalculating = false;
        updateStatus();
    }, 1000);
}

function createFullDeck() {
    const suits = ['s', 'h', 'c', 'd'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (const suit of suits) {
        for (const value of values) {
            deck.push({
                code: value + suit,
                value: value,
                suit: suit === 'h' ? '♥' : suit === 'd' ? '♦' : suit === 's' ? '♠' : '♣',
                suitCode: suit,
                rank: HandEvaluator.ranks[value]
            });
        }
    }
    return deck;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function describeHand(heroCards, boardCards) {
    if (boardCards.length === 0) return "Префлоп";
    
    const allCards = [...heroCards, ...boardCards];
    const score = HandEvaluator.evaluate(allCards);
    const handRank = score >> 20;
    
    switch (handRank) {
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

function getRussianPlural(num) {
    if (num === 1) return '';
    if (num >= 2 && num <= 4) return 'а';
    return 'ов';
}

function clearAll() {
    selectedCards.clear();
    usedCards.clear();
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    document.getElementById('resultsPanel').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    selectHandBlock();
    showNotification("Все карты очищены!");
}

function showNotification(message, duration = 2000) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.style.display = 'block';
    setTimeout(() => { notif.style.display = 'none'; }, duration);
}

// ГОРЯЧИЕ КЛАВИШИ
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') clearAll();
    if (e.key === '1') selectHandBlock();
    if (e.key === '2') selectBoardBlock();
    if (e.key === 'Enter' || e.key === ' ') {
        if (!document.getElementById('calculateBtn').disabled) {
            calculateEquity();
        }
    }
    if (e.key >= '1' && e.key <= '9') {
        setOpponents(parseInt(e.key));
    }
});