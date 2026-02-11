const HandEvaluator = {
    ranks: { '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12 },
    suits: { 's':0,'h':1,'c':2,'d':3 },
    
    evaluate(cards) {
        if (cards.length < 5) return 0;
        
        const formatted = cards.map(c => ({
            rank: this.ranks[c.value],
            suit: this.suits[c.suitCode],
            originalRank: this.ranks[c.value]
        })).sort((a,b) => b.rank - a.rank);
        
        const flush = this.hasFlush(formatted);
        const straight = this.hasStraight(formatted);
        
        if (flush && straight) {
            const straightValue = this.getStraightValue(formatted);
            const isRoyal = straightValue === 12 && formatted.some(c => c.rank === 12);
            return isRoyal ? 9 << 20 : (8 << 20) + (straightValue << 16);
        }
        
        const counts = this.getRankCounts(formatted);
        const values = Object.values(counts).sort((a,b) => b-a);
        
        if (values[0] === 4) {
            const quadsRank = this.getRankOfCount(counts,4);
            const kicker = this.getKickers(formatted,[quadsRank],1)[0];
            return (7 << 20) + (quadsRank << 16) + (kicker << 12);
        }
        
        if (values[0] === 3 && values[1] >= 2) {
            const tripsRank = this.getRankOfCount(counts,3);
            const pairRank = this.getRankOfCount(counts,2,tripsRank);
            return (6 << 20) + (tripsRank << 16) + (pairRank << 12);
        }
        
        if (flush) {
            const flushCards = this.getFlushCards(formatted);
            return (5 << 20) + this.getHandValue(flushCards.slice(0,5));
        }
        
        if (straight) {
            const straightValue = this.getStraightValue(formatted);
            return (4 << 20) + (straightValue << 16);
        }
        
        if (values[0] === 3) {
            const tripsRank = this.getRankOfCount(counts,3);
            const kickers = this.getKickers(formatted,[tripsRank],2);
            return (3 << 20) + (tripsRank << 16) + (kickers[0] << 12) + (kickers[1] << 8);
        }
        
        if (values[0] === 2 && values[1] === 2) {
            const pairs = this.getRanksOfCount(counts,2).sort((a,b) => b-a);
            const kicker = this.getKickers(formatted,pairs,1)[0];
            return (2 << 20) + (pairs[0] << 16) + (pairs[1] << 12) + (kicker << 8);
        }
        
        if (values[0] === 2) {
            const pairRank = this.getRankOfCount(counts,2);
            const kickers = this.getKickers(formatted,[pairRank],3);
            return (1 << 20) + (pairRank << 16) + (kickers[0] << 12) + (kickers[1] << 8) + (kickers[2] << 4);
        }
        
        return this.getHandValue(formatted.slice(0,5));
    },
    
    hasFlush(cards) {
        if (cards.length < 5) return false;
        const suitCounts = [0,0,0,0];
        cards.forEach(c => suitCounts[c.suit]++);
        return suitCounts.some(count => count >= 5);
    },
    
    hasStraight(cards) {
        if (cards.length < 5) return false;
        
        const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a,b) => b-a);
        
        for (let i=0; i<=uniqueRanks.length-5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) {
                return true;
            }
        }
        
        const ranksWithWheel = uniqueRanks.map(r => r === 12 ? -1 : r).sort((a,b) => b-a);
        const wheelRanks = [-1, 0, 1, 2, 3];
        
        for (let i=0; i<=ranksWithWheel.length-5; i++) {
            const slice = ranksWithWheel.slice(i, i+5);
            if (slice[0] - slice[4] === 4) {
                const hasAllWheelCards = wheelRanks.every(r => slice.includes(r));
                if (hasAllWheelCards) return true;
            }
        }
        
        return false;
    },
    
    getStraightValue(cards) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a,b) => b-a);
        
        for (let i=0; i<=uniqueRanks.length-5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) {
                return uniqueRanks[i];
            }
        }
        
        const ranksWithWheel = uniqueRanks.map(r => r === 12 ? -1 : r).sort((a,b) => b-a);
        const wheelRanks = [-1, 0, 1, 2, 3];
        
        for (let i=0; i<=ranksWithWheel.length-5; i++) {
            const slice = ranksWithWheel.slice(i, i+5);
            if (slice[0] - slice[4] === 4) {
                const hasAllWheelCards = wheelRanks.every(r => slice.includes(r));
                if (hasAllWheelCards) {
                    return 3;
                }
            }
        }
        
        return -1;
    },
    
    getRankCounts(cards) {
        const counts = {};
        cards.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
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
        return Object.entries(counts)
            .filter(([,count]) => count === targetCount)
            .map(([rank]) => parseInt(rank));
    },
    
    getKickers(cards, excludeRanks, count) {
        const kickers = cards
            .filter(c => !excludeRanks.includes(c.rank))
            .map(c => c.rank)
            .sort((a,b) => b-a)
            .slice(0,count);
        while (kickers.length < count) kickers.push(0);
        return kickers;
    },
    
    getFlushCards(cards) {
        const suitCounts = [0,0,0,0];
        cards.forEach(c => suitCounts[c.suit]++);
        const flushSuit = suitCounts.findIndex(count => count >= 5);
        return cards
            .filter(c => c.suit === flushSuit)
            .sort((a,b) => b.rank - a.rank)
            .slice(0,5);
    },
    
    getHandValue(cards) {
        return cards.reduce((value,c,i) => value + (c.rank << (4*(4-i))), 0);
    }
};

let activeBlock = 'hand';
const selectedCards = new Map();
const usedCards = new Set();
let opponentsCount = 1;
let isCalculating = false;
let hasCalculatedResults = false; // Новый флаг

let currentDragSource = null;
let currentDragCard = null;

let currentDragOverSection = null;
let dragOverTimer = null;

function activateBlockBySlotId(slotId) {
    if (slotId.startsWith('hero')) {
        selectHandBlock();
    } else if (slotId.startsWith('board')) {
        selectBoardBlock();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createDeck();
    initEventListeners();
    initDragAndDrop();
    initSectionDrop();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    selectHandBlock();
});

function createDeck() {
    const deckGrid = document.getElementById('deck');
    deckGrid.innerHTML = '';
    
    const suits = [
        {code:'s',symbol:'♠',color:'black'},
        {code:'h',symbol:'♥',color:'red'},
        {code:'c',symbol:'♣',color:'black'},
        {code:'d',symbol:'♦',color:'red'}
    ];
    
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    
    suits.forEach(suit => values.forEach(value => {
        const cardCode = value + suit.code;
        const deckCard = document.createElement('div');
        deckCard.className = `deck-card ${suit.color}`;
        deckCard.dataset.card = cardCode;
        deckCard.draggable = true;
        
        deckCard.addEventListener('dragstart', function(e) {
            if (this.classList.contains('selected')) {
                e.preventDefault();
                return;
            }
            currentDragSource = 'deck';
            currentDragCard = { cardCode: cardCode };
            e.dataTransfer.setData('text/plain', cardCode);
            this.style.opacity = '0.5';
        });
        
        const cardFace = document.createElement('div');
        cardFace.className = 'card-face';
        cardFace.innerHTML = `<div class="card-value">${value}</div><div class="card-suit-large">${suit.symbol}</div>`;
        deckCard.appendChild(cardFace);
        deckGrid.appendChild(deckCard);
        
        deckCard.addEventListener('click', e => {
            if (deckCard.classList.contains('selected')) return;
            handleCardClick(cardCode);
        });
    }));
    
    deckGrid.addEventListener('selectstart', e => e.preventDefault());
    deckGrid.addEventListener('dragstart', e => {
        if (!e.target.closest('.deck-card')) e.preventDefault();
    });
}

function initEventListeners() {
    document.getElementById('handSection').addEventListener('click', selectHandBlock);
    document.getElementById('boardSection').addEventListener('click', selectBoardBlock);
    document.getElementById('calculateBtn').addEventListener('click', calculateEquity);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        pill.addEventListener('click', () => setOpponents(parseInt(pill.dataset.opponents)));
    });
    
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('click', e => {
            const realCard = e.target.closest('.real-card');
            if (realCard) {
                removeCardFromSlot(slot.dataset.slot);
            }
        });
    });
}

function initDragAndDrop() {
    document.addEventListener('dragstart', e => {
        const realCard = e.target.closest('.real-card');
        if (realCard) {
            const slot = realCard.parentElement;
            const card = selectedCards.get(slot.dataset.slot);
            if (card) {
                currentDragSource = 'slot';
                currentDragCard = {
                    cardCode: card.code,
                    fromSlot: slot.dataset.slot
                };
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    cardCode: card.code,
                    fromSlot: slot.dataset.slot
                }));
                realCard.style.opacity = '0.5';
            }
        }
    });
    
    document.addEventListener('dragend', () => {
        document.querySelectorAll('.deck-card, .real-card').forEach(el => el.style.opacity = '1');
        document.querySelectorAll('.card-slot').forEach(slot => slot.classList.remove('drag-over'));
        
        document.querySelectorAll('.hand-section, .board-section, #deck').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-no-space');
        });
        
        currentDragCard = null;
        currentDragSource = null;
        currentDragOverSection = null;
        
        if (dragOverTimer) {
            clearTimeout(dragOverTimer);
            dragOverTimer = null;
        }
    });
    
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', e => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        
        slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
        
        slot.addEventListener('drop', e => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;
            
            const targetSlotId = slot.dataset.slot;
            
            try {
                const parsed = JSON.parse(data);
                if (parsed.fromSlot && parsed.fromSlot !== targetSlotId) {
                    moveCardBetweenSlots(parsed.fromSlot, targetSlotId);
                    return;
                }
            } catch {
                const cardCode = data;
                if (usedCards.has(cardCode)) return;
                if (selectedCards.has(targetSlotId)) return;
                addCardToSlot(cardCode, targetSlotId);
            }
        });
    });
    
    const deckGrid = document.getElementById('deck');
    
    deckGrid.addEventListener('dragover', e => {
        e.preventDefault();
        if (currentDragSource === 'slot') {
            deckGrid.classList.add('drag-over');
        }
    });
    
    deckGrid.addEventListener('dragleave', e => {
        if (!deckGrid.contains(e.relatedTarget)) {
            deckGrid.classList.remove('drag-over', 'drag-over-no-space');
        }
    });
    
    deckGrid.addEventListener('drop', e => {
        e.preventDefault();
        deckGrid.classList.remove('drag-over', 'drag-over-no-space');
        
        if (currentDragSource === 'slot' && currentDragCard?.fromSlot) {
            removeCardFromSlot(currentDragCard.fromSlot);
        }
    });
}

function hasFreeSlotsInSection(sectionId) {
    if (sectionId === 'handSection') {
        return getHandCardsCount() < 2;
    } else if (sectionId === 'boardSection') {
        return getBoardCardsCount() < 5;
    }
    return false;
}

function initSectionDrop() {
    const handSection = document.getElementById('handSection');
    const boardSection = document.getElementById('boardSection');
    const deckGrid = document.getElementById('deck');
    
    [handSection, boardSection, deckGrid].forEach(section => {
        section.addEventListener('dragover', e => {
            e.preventDefault();
            
            if (dragOverTimer) {
                clearTimeout(dragOverTimer);
            }
            
            if (currentDragOverSection && currentDragOverSection !== section) {
                currentDragOverSection.classList.remove('drag-over', 'drag-over-no-space');
            }
            
            let hasFreeSlots = true;
            if (section !== deckGrid) {
                hasFreeSlots = hasFreeSlotsInSection(section.id);
            } else {
                hasFreeSlots = currentDragSource === 'slot';
            }
            
            if (hasFreeSlots) {
                section.classList.remove('drag-over-no-space');
                section.classList.add('drag-over');
            } else {
                section.classList.remove('drag-over');
                section.classList.add('drag-over-no-space');
            }
            
            currentDragOverSection = section;
            
            dragOverTimer = setTimeout(() => {
                if (!section.contains(document.elementFromPoint(e.clientX, e.clientY))) {
                    section.classList.remove('drag-over', 'drag-over-no-space');
                }
            }, 50);
        });
        
        section.addEventListener('dragleave', e => {
            if (dragOverTimer) {
                clearTimeout(dragOverTimer);
            }
            
            dragOverTimer = setTimeout(() => {
                if (!section.contains(e.relatedTarget)) {
                    section.classList.remove('drag-over', 'drag-over-no-space');
                    currentDragOverSection = null;
                }
            }, 100);
        });
        
        section.addEventListener('drop', e => {
            e.preventDefault();
            
            section.classList.remove('drag-over', 'drag-over-no-space');
            currentDragOverSection = null;
            
            if (dragOverTimer) {
                clearTimeout(dragOverTimer);
                dragOverTimer = null;
            }
            
            if (!currentDragCard) return;
            
            const cardCode = currentDragCard.cardCode;
            
            if (section === deckGrid) {
                if (currentDragSource === 'slot' && currentDragCard?.fromSlot) {
                    removeCardFromSlot(currentDragCard.fromSlot);
                }
                return;
            }
            
            if (usedCards.has(cardCode) && currentDragSource !== 'slot') return;
            
            const sectionType = section.id === 'handSection' ? 'hand' : 'board';
            
            let freeSlot = null;
            if (sectionType === 'hand') {
                for (let i = 1; i <= 2; i++) {
                    const slotId = `hero-${i}`;
                    if (!selectedCards.has(slotId)) {
                        freeSlot = slotId;
                        break;
                    }
                }
            } else {
                for (let i = 1; i <= 5; i++) {
                    const slotId = `board-${i}`;
                    if (!selectedCards.has(slotId)) {
                        freeSlot = slotId;
                        break;
                    }
                }
            }
            
            if (freeSlot) {
                if (currentDragSource === 'deck') {
                    addCardToSlot(cardCode, freeSlot);
                } else if (currentDragSource === 'slot') {
                    moveCardBetweenSlots(currentDragCard.fromSlot, freeSlot);
                }
                
                activateBlockBySlotId(freeSlot);
            }
        });
    });
}

function moveCardBetweenSlots(fromSlotId, toSlotId) {
    if (!selectedCards.has(fromSlotId)) return;
    const card = selectedCards.get(fromSlotId);
    
    // Сбрасываем результаты перед изменением карт
    resetResults();
    
    if (selectedCards.has(toSlotId)) {
        const tempCard = selectedCards.get(toSlotId);
        selectedCards.set(toSlotId, card);
        selectedCards.set(fromSlotId, tempCard);
    } else {
        selectedCards.set(toSlotId, card);
        selectedCards.delete(fromSlotId);
    }
    
    activateBlockBySlotId(toSlotId);
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    checkAndSwitchActiveBlock();
}

function selectHandBlock() {
    activeBlock = 'hand';
    
    document.querySelectorAll('.hand-section, .board-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const handSection = document.getElementById('handSection');
    handSection.classList.add('active');
    
    const boardSection = document.getElementById('boardSection');
    boardSection.classList.remove('active');
    
    updateActiveSection('handSection', 'handTitle');
}

function selectBoardBlock() {
    activeBlock = 'board';
    
    document.querySelectorAll('.hand-section, .board-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const boardSection = document.getElementById('boardSection');
    boardSection.classList.add('active');
    
    const handSection = document.getElementById('handSection');
    handSection.classList.remove('active');
    
    updateActiveSection('boardSection', 'boardTitle');
}

function updateActiveSection(sectionId, titleId) {
    ['handSection','boardSection'].forEach(id => document.getElementById(id).classList.remove('active'));
    ['handTitle','boardTitle'].forEach(id => document.getElementById(id).classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.getElementById(titleId).classList.add('active');
}

function handleCardClick(cardCode) {
    if (usedCards.has(cardCode)) return;
    
    if (activeBlock === 'hand') {
        const handCardsCount = getHandCardsCount();
        if (handCardsCount < 2) {
            addCardToHand(cardCode);
        } else {
            if (getBoardCardsCount() < 5) {
                selectBoardBlock();
            }
            addCardToBoard(cardCode);
        }
    } else {
        const boardCardsCount = getBoardCardsCount();
        if (boardCardsCount < 5) {
            addCardToBoard(cardCode);
        } else {
            if (getHandCardsCount() < 2) {
                selectHandBlock();
            }
            addCardToHand(cardCode);
        }
    }
}

function getHandCardsCount() {
    return Array.from(selectedCards.keys()).filter(slot => slot.startsWith('hero')).length;
}

function getBoardCardsCount() {
    return Array.from(selectedCards.keys()).filter(slot => slot.startsWith('board')).length;
}

function addCardToHand(cardCode) {
    if (getHandCardsCount() >= 2) {
        if (getBoardCardsCount() < 5) {
            selectBoardBlock();
        }
        addCardToBoard(cardCode);
        return;
    }
    
    for (let i=1; i<=2; i++) {
        const slot = `hero-${i}`;
        if (!selectedCards.has(slot)) {
            addCardToSlot(cardCode, slot);
            
            if (getHandCardsCount() >= 2 && getBoardCardsCount() < 5) {
                selectBoardBlock();
            }
            return;
        }
    }
}

function addCardToBoard(cardCode) {
    if (getBoardCardsCount() >= 5) {
        if (getHandCardsCount() < 2) {
            selectHandBlock();
        }
        addCardToHand(cardCode);
        return;
    }
    
    for (let i=1; i<=5; i++) {
        const slot = `board-${i}`;
        if (!selectedCards.has(slot)) {
            addCardToSlot(cardCode, slot);
            
            if (getBoardCardsCount() >= 5 && getHandCardsCount() < 2) {
                selectHandBlock();
            }
            return;
        }
    }
}

function addCardToSlot(cardCode, slotId) {
    const value = cardCode.slice(0,-1);
    const suitCode = cardCode.slice(-1);
    const suitSymbols = {h:'♥',d:'♦',s:'♠',c:'♣'};
    
    selectedCards.set(slotId, {
        code: cardCode,
        value: value,
        suit: suitSymbols[suitCode],
        suitCode: suitCode,
        rank: HandEvaluator.ranks[value] || 0
    });
    
    usedCards.add(cardCode);
    
    activateBlockBySlotId(slotId);
    
    // Сбрасываем результаты при добавлении новой карты
    resetResults();
    
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    
    checkAndSwitchActiveBlock();
}

function removeCardFromSlot(slotId) {
    if (selectedCards.has(slotId)) {
        const card = selectedCards.get(slotId);
        usedCards.delete(card.code);
        selectedCards.delete(slotId);
        
        // Сбрасываем результаты при удалении карты
        resetResults();
        
        updateCardDisplay();
        updateStatus();
        checkBoardValidity();
        checkHandValidity();
        
        checkAndSwitchActiveBlock();
    }
}

function updateCardDisplay() {
    document.querySelectorAll('.card-slot').forEach(slot => {
        const slotId = slot.dataset.slot;
        const hasCard = selectedCards.has(slotId);
        
        if (hasCard) {
            const card = selectedCards.get(slotId);
            const isRed = card.suit === '♥' || card.suit === '♦';
            
            slot.innerHTML = `
                <div class="real-card ${isRed ? 'red' : 'black'}" draggable="true">
                    <div class="card-content">${card.value}<br>${card.suit}</div>
                </div>
            `;
        } else {
            slot.innerHTML = '<div class="slot-empty">+</div>';
        }
    });
    
    document.querySelectorAll('.deck-card').forEach(deckCard => {
        const cardCode = deckCard.dataset.card;
        const isUsed = usedCards.has(cardCode);
        deckCard.classList.toggle('selected', isUsed);
        deckCard.draggable = !isUsed;
        deckCard.style.cursor = isUsed ? 'default' : 'pointer';
    });
}

function updateStatus() {
    const calculateBtn = document.getElementById('calculateBtn');
    const isValid = checkHandValidity() && checkBoardValidity() && !isCalculating;
    
    calculateBtn.disabled = !isValid;
}

function checkHandValidity() {
    const warning = document.getElementById('handWarning');
    const isValid = getHandCardsCount() === 2;
    warning.style.display = isValid ? 'none' : 'block';
    return isValid;
}

function checkBoardValidity() {
    const warning = document.getElementById('boardWarning');
    const boardCards = getBoardCardsCount();
    const isValid = boardCards === 0 || boardCards === 3 || boardCards === 4 || boardCards === 5;
    warning.style.display = (boardCards === 1 || boardCards === 2) ? 'block' : 'none';
    return isValid;
}

function setOpponents(count) {
    opponentsCount = count;
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        const isActive = parseInt(pill.dataset.opponents) === count;
        pill.classList.toggle('active', isActive);
    });
    
    // Сбрасываем результаты при изменении количества оппонентов
    resetResults();
}

function checkAndSwitchActiveBlock() {
    const handCardsCount = getHandCardsCount();
    const boardCardsCount = getBoardCardsCount();
    
    if (activeBlock === 'hand' && handCardsCount >= 2 && boardCardsCount < 5) {
        selectBoardBlock();
        return;
    }
    
    if (activeBlock === 'board' && boardCardsCount >= 5 && handCardsCount < 2) {
        selectHandBlock();
        return;
    }
}

// Функция сброса результатов без анимации
function resetResults() {
    if (hasCalculatedResults) {
        document.getElementById('resultHero').textContent = '—';
        document.getElementById('resultOpponent').textContent = '—';
        document.getElementById('resultTie').textContent = '—';
        hasCalculatedResults = false;
    }
}

async function calculateEquity() {
    if (isCalculating) return;
    
    const heroCards = Array.from(selectedCards.entries())
        .filter(([slot]) => slot.startsWith('hero'))
        .map(([,card]) => card);
    const boardCards = Array.from(selectedCards.entries())
        .filter(([slot]) => slot.startsWith('board'))
        .map(([,card]) => card);
    
    if (!checkHandValidity() || !checkBoardValidity()) {
        return;
    }
    
    isCalculating = true;
    document.getElementById('calculateBtn').disabled = true;
    
    const SIMULATIONS = 25000;
    
    let heroTotal = 0;
    let oppTotal = 0;
    let tieHands = 0;
    
    const createOptimizedDeck = () => {
        const suits = ['s','h','c','d'];
        const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        const deck = new Array(52);
        let index = 0;
        
        for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < suits.length; j++) {
                const value = values[i];
                const suit = suits[j];
                deck[index++] = {
                    code: value + suit,
                    value: value,
                    suit: suit==='h'?'♥':suit==='d'?'♦':suit==='s'?'♠':'♣',
                    suitCode: suit,
                    rank: HandEvaluator.ranks[value]
                };
            }
        }
        return deck;
    };
    
    const initialDeck = createOptimizedDeck();
    const usedCardCodes = new Set(Array.from(usedCards));
    const neededBoardCards = 5 - boardCards.length;
    const totalCardsNeeded = neededBoardCards + opponentsCount * 2;
    
    for (let i = 0; i < SIMULATIONS; i++) {
        const availableDeck = [];
        for (const card of initialDeck) {
            if (!usedCardCodes.has(card.code)) {
                availableDeck.push(card);
            }
        }
        
        if (availableDeck.length < totalCardsNeeded) {
            continue;
        }
        
        const shuffled = [...availableDeck];
        for (let j = shuffled.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
        }
        
        const fullBoard = [...boardCards];
        for (let j = 0; j < neededBoardCards; j++) {
            fullBoard.push(shuffled[j]);
        }
        
        const opponentHands = [];
        let cardIndex = neededBoardCards;
        
        for (let opp = 0; opp < opponentsCount; opp++) {
            if (cardIndex + 1 >= shuffled.length) break;
            opponentHands.push([shuffled[cardIndex], shuffled[cardIndex + 1]]);
            cardIndex += 2;
        }
        
        if (opponentHands.length !== opponentsCount) continue;
        
        const heroScore = HandEvaluator.evaluate([...heroCards, ...fullBoard]);
        
        let bestOpponentScore = -1;
        let tyingOpponents = 0;
        
        for (const hand of opponentHands) {
            const score = HandEvaluator.evaluate([...hand, ...fullBoard]);
            if (score > bestOpponentScore) {
                bestOpponentScore = score;
                tyingOpponents = 1;
            } else if (score === bestOpponentScore) {
                tyingOpponents++;
            }
        }
           
        if (heroScore > bestOpponentScore) {
            heroTotal += 1;
        } else if (heroScore < bestOpponentScore) {
            oppTotal += 1;
        } else {
            tieHands += 1;
            const totalPlayersInTie = tyingOpponents + 1;
            heroTotal += 1 / totalPlayersInTie;
            oppTotal += tyingOpponents / totalPlayersInTie;
        }
    }
    
const heroPercent = (heroTotal / SIMULATIONS) * 100;
const oppPercent = (oppTotal / SIMULATIONS) * 100;
const tiePercent = (tieHands / SIMULATIONS) * 100;

// Округляем до 1 знака
let heroRounded = Math.round(heroPercent * 10) / 10;
let oppRounded = Math.round(oppPercent * 10) / 10;
let tieRounded = Math.round(tiePercent * 10) / 10;

// ЖЕСТКАЯ ЗАЩИТА ОТ МИНУСОВ
heroRounded = Math.max(0, heroRounded);
oppRounded = Math.max(0, oppRounded);
tieRounded = Math.max(0, tieRounded);

// ПЕРВАЯ КОРРЕКТИРОВКА - добавляем к самому большому
let sum = heroRounded + oppRounded + tieRounded;
let diff = 100 - sum;

if (Math.abs(diff) > 0.001) {
    const maxVal = Math.max(heroRounded, oppRounded, tieRounded);
    
    if (maxVal === heroRounded) {
        heroRounded = Math.round((heroRounded + diff) * 10) / 10;
    } else if (maxVal === oppRounded) {
        oppRounded = Math.round((oppRounded + diff) * 10) / 10;
    } else {
        tieRounded = Math.round((tieRounded + diff) * 10) / 10;
    }
}

// ФИНАЛЬНАЯ ЗАЩИТА ОТ МИНУСОВ
heroRounded = Math.max(0, Math.round(heroRounded * 10) / 10);
oppRounded = Math.max(0, Math.round(oppRounded * 10) / 10);
tieRounded = Math.max(0, Math.round(tieRounded * 10) / 10);

// ВТОРАЯ КОРРЕКТИРОВКА - принудительно добиваем до 100
sum = heroRounded + oppRounded + tieRounded;
diff = 100 - sum;

if (Math.abs(diff) > 0.001) {
    // Корректируем ГЕРОЯ, но НЕ ДАЕМ УЙТИ В МИНУС
    let newVal = heroRounded + diff;
    newVal = Math.round(newVal * 10) / 10;
    heroRounded = Math.max(0, newVal);
    
    // Если герой стал 0 и diff отрицательный - добавляем к оппонентам
    if (heroRounded === 0 && diff < 0) {
        oppRounded = Math.max(0, Math.round((oppRounded + diff) * 10) / 10);
    }
}

// ФИНАЛЬНОЕ ОКРУГЛЕНИЕ
heroRounded = Math.round(heroRounded * 10) / 10;
oppRounded = Math.round(oppRounded * 10) / 10;
tieRounded = Math.round(tieRounded * 10) / 10;

// ГАРАНТИЯ 100% СУММЫ
sum = heroRounded + oppRounded + tieRounded;
if (Math.abs(100 - sum) > 0.01) {
    // Если все еще не 100 - последняя корректировка героя
    heroRounded = Math.round((heroRounded + (100 - sum)) * 10) / 10;
    heroRounded = Math.max(0, heroRounded);
}

document.getElementById('resultHero').textContent = heroRounded.toFixed(1) + '%';
document.getElementById('resultOpponent').content = oppRounded.toFixed(1) + '%';
document.getElementById('resultTie').textContent = tieRounded.toFixed(1) + '%';
