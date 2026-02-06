// ===== КОНСТАНТЫ И КОНФИГУРАЦИЯ =====
const HandEvaluator = {
    ranks: { '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12 },
    suits: { 's':0,'h':1,'c':2,'d':3 },
    
    evaluate(cards) {
        // Кеширование результатов для производительности
        const cacheKey = cards.map(c => c.code).sort().join('');
        if (this._cache && this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }
        
        const formatted = cards.map(c => ({
            rank: this.ranks[c.value],
            suit: this.suits[c.suitCode]
        })).sort((a,b) => b.rank - a.rank);
        
        const flush = this.hasFlush(formatted);
        const straight = this.hasStraight(formatted);
        
        if (flush && straight) {
            const straightValue = this.getStraightValue(formatted, true);
            const result = straightValue === 3 ? 9 << 20 : (8 << 20) + (straightValue << 16);
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        const counts = this.getRankCounts(formatted);
        const values = Object.values(counts).sort((a,b) => b-a);
        
        if (values[0] === 4) {
            const quadsRank = this.getRankOfCount(counts,4);
            const kicker = this.getKickers(formatted,[quadsRank],1)[0];
            const result = (7 << 20) + (quadsRank << 16) + (kicker << 12);
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        if (values[0] === 3 && values[1] >= 2) {
            const tripsRank = this.getRankOfCount(counts,3);
            const pairRank = this.getRankOfCount(counts,2,tripsRank);
            const result = (6 << 20) + (tripsRank << 16) + (pairRank << 12);
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        if (flush) {
            const flushCards = this.getFlushCards(formatted);
            const result = (5 << 20) + this.getHandValue(flushCards.slice(0,5));
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        if (straight) {
            const straightValue = this.getStraightValue(formatted,false);
            const result = (4 << 20) + (straightValue << 16);
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        if (values[0] === 3) {
            const tripsRank = this.getRankOfCount(counts,3);
            const kickers = this.getKickers(formatted,[tripsRank],2);
            const result = (3 << 20) + (tripsRank << 16) + (kickers[0] << 12) + (kickers[1] << 8);
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        if (values[0] === 2 && values[1] === 2) {
            const pairs = this.getRanksOfCount(counts,2).sort((a,b) => b-a);
            const kicker = this.getKickers(formatted,pairs,1)[0];
            const result = (2 << 20) + (pairs[0] << 16) + (pairs[1] << 12) + (kicker << 8);
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        if (values[0] === 2) {
            const pairRank = this.getRankOfCount(counts,2);
            const kickers = this.getKickers(formatted,[pairRank],3);
            const result = (1 << 20) + (pairRank << 16) + (kickers[0] << 12) + (kickers[1] << 8) + (kickers[2] << 4);
            
            if (!this._cache) this._cache = new Map();
            this._cache.set(cacheKey, result);
            return result;
        }
        
        const result = this.getHandValue(formatted.slice(0,5));
        
        if (!this._cache) this._cache = new Map();
        this._cache.set(cacheKey, result);
        return result;
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
        
        // Проверяем обычные стриты
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) {
                return true;
            }
        }
        
        // Специальная проверка для A-2-3-4-5 (wheel)
        const hasWheel = [12, 0, 1, 2, 3].every(r => uniqueRanks.includes(r));
        return hasWheel;
    },
    
    getStraightValue(cards, forFlush) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a,b) => b-a);
        
        // Проверяем обычные стриты
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) {
                return uniqueRanks[i]; // Возвращаем старшую карту стрита
            }
        }
        
        // Проверяем A-2-3-4-5
        const wheelRanks = [12, 0, 1, 2, 3];
        if (wheelRanks.every(r => uniqueRanks.includes(r))) {
            return 3; // Возвращаем 5 как старшую карту (ранг 3)
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
    },
    
    // Очистка кеша при смене карт
    clearCache() {
        if (this._cache) {
            this._cache.clear();
        }
    }
};

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let activeBlock = 'hand';
const selectedCards = new Map();
const usedCards = new Set();
let opponentsCount = 1;
let isCalculating = false;
let calculationWorker = null;

// ФЛАГИ ДЛЯ ПЕРЕТАСКИВАНИЯ
let currentDragSource = null;
let currentDragCard = null;

// Глобальные переменные для отслеживания drag-over
let currentDragOverSection = null;
let dragOverTimer = null;

// Кеш для быстрой генерации случайных карт
let pregeneratedDecks = [];

// ===== ОСНОВНЫЕ ФУНКЦИИ =====

// Функция для активации блока по ID слота
function activateBlockBySlotId(slotId) {
    if (slotId.startsWith('hero')) {
        selectHandBlock();
    } else if (slotId.startsWith('board')) {
        selectBoardBlock();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Покерный калькулятор запущен!");
    createDeck();
    initEventListeners();
    initDragAndDrop();
    initSectionDrop();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    selectHandBlock();
    
    // Инициализация панели результатов
    updateResultsPanel('waiting');
});

// ===== СОЗДАНИЕ КОЛОДЫ =====
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
        deckCard.setAttribute('role', 'button');
        deckCard.setAttribute('tabindex', '0');
        deckCard.setAttribute('aria-label', `${value} ${suit.code === 's' ? 'пик' : suit.code === 'h' ? 'червей' : suit.code === 'c' ? 'треф' : 'бубен'}`);
        
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
        
        deckCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!deckCard.classList.contains('selected')) {
                    handleCardClick(cardCode);
                }
            }
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

// ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ =====
function initEventListeners() {
    document.getElementById('handSection').addEventListener('click', selectHandBlock);
    document.getElementById('handSection').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectHandBlock();
        }
    });
    
    document.getElementById('boardSection').addEventListener('click', selectBoardBlock);
    document.getElementById('boardSection').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectBoardBlock();
        }
    });
    
    document.getElementById('calculateBtn').addEventListener('click', calculateEquity);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        pill.addEventListener('click', () => setOpponents(parseInt(pill.dataset.opponents)));
        pill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpponents(parseInt(pill.dataset.opponents));
            }
        });
    });
    
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('click', e => {
            const realCard = e.target.closest('.real-card');
            if (realCard) {
                removeCardFromSlot(slot.dataset.slot);
            }
        });
        
        slot.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                removeCardFromSlot(slot.dataset.slot);
            }
        });
    });
}

// ===== DRAG & DROP =====
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
        
        // Сбрасываем подсветку блоков
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
    
    // Drop в слоты
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
    
    // Drop на колоду для возврата карт
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

// Проверка свободных слотов в секции
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

// ===== УПРАВЛЕНИЕ КАРТАМИ =====
function moveCardBetweenSlots(fromSlotId, toSlotId) {
    if (!selectedCards.has(fromSlotId)) return;
    const card = selectedCards.get(fromSlotId);
    
    if (selectedCards.has(toSlotId)) {
        const tempCard = selectedCards.get(toSlotId);
        selectedCards.set(toSlotId, card);
        selectedCards.set(fromSlotId, tempCard);
    } else {
        selectedCards.set(toSlotId, card);
        selectedCards.delete(fromSlotId);
    }
    
    updateResultsPanel('waiting');
    HandEvaluator.clearCache();
    pregeneratedDecks = []; // Сброс предварительно сгенерированных колод
    
    activateBlockBySlotId(toSlotId);
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
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
    if (window.updateActiveBlock) {
        window.updateActiveBlock();
    }
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
    if (window.updateActiveBlock) {
        window.updateActiveBlock();
    }
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
        handCardsCount < 2 ? addCardToHand(cardCode) : addCardToBoard(cardCode);
    } else {
        const boardCardsCount = getBoardCardsCount();
        boardCardsCount < 5 ? addCardToBoard(cardCode) : addCardToHand(cardCode);
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
        addCardToBoard(cardCode);
        return;
    }
    
    for (let i = 1; i <= 2; i++) {
        const slot = `hero-${i}`;
        if (!selectedCards.has(slot)) {
            addCardToSlot(cardCode, slot);
            return;
        }
    }
}

function addCardToBoard(cardCode) {
    if (getBoardCardsCount() >= 5) {
        addCardToHand(cardCode);
        return;
    }
    
    for (let i = 1; i <= 5; i++) {
        const slot = `board-${i}`;
        if (!selectedCards.has(slot)) {
            addCardToSlot(cardCode, slot);
            return;
        }
    }
}

function addCardToSlot(cardCode, slotId) {
    const value = cardCode.slice(0,-1);
    const suitCode = cardCode.slice(-1);
    const suitSymbols = {h:'♥',d:'♦',s:'♠',c:'♣'};
    const suitNames = {h:'червей',d:'бубен',s:'пик',c:'треф'};
    
    selectedCards.set(slotId, {
        code: cardCode,
        value: value,
        suit: suitSymbols[suitCode],
        suitCode: suitCode,
        suitName: suitNames[suitCode],
        rank: HandEvaluator.ranks[value] || 0
    });
    
    usedCards.add(cardCode);
    
    activateBlockBySlotId(slotId);
    updateResultsPanel('waiting');
    HandEvaluator.clearCache();
    pregeneratedDecks = [];
    
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
}

function removeCardFromSlot(slotId) {
    if (selectedCards.has(slotId)) {
        const card = selectedCards.get(slotId);
        usedCards.delete(card.code);
        selectedCards.delete(slotId);
        
        updateResultsPanel('waiting');
        HandEvaluator.clearCache();
        pregeneratedDecks = [];
        
        updateCardDisplay();
        updateStatus();
        checkBoardValidity();
        checkHandValidity();
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
                <div class="real-card ${isRed ? 'red' : 'black'}" draggable="true"
                     aria-label="${card.value} ${card.suitName}" tabindex="0">
                    <div class="card-content">${card.value}<br>${card.suit}</div>
                </div>
            `;
            
            // Добавляем обработчик клавиатуры для карты
            const realCard = slot.querySelector('.real-card');
            if (realCard) {
                realCard.addEventListener('keydown', (e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                        e.preventDefault();
                        removeCardFromSlot(slotId);
                    }
                });
            }
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
        
        // Обновляем ARIA-атрибуты
        if (isUsed) {
            deckCard.setAttribute('aria-disabled', 'true');
        } else {
            deckCard.removeAttribute('aria-disabled');
        }
    });
}

function updateStatus() {
    const calculateBtn = document.getElementById('calculateBtn');
    const isValid = checkHandValidity() && checkBoardValidity() && !isCalculating;
    
    calculateBtn.disabled = !isValid;
    
    // Обновляем текст кнопки если есть результаты
    const hasResults = document.getElementById('resultHero').textContent !== '—' && 
                       document.getElementById('resultHero').textContent !== '';
    
    if (hasResults && !isCalculating) {
        calculateBtn.classList.add('has-results');
        if (window.translations && window.currentLanguage) {
            const lang = window.currentLanguage;
            calculateBtn.textContent = window.translations[lang]?.recalculateBtn || '🔄 ПЕРЕСЧИТАТЬ';
        }
    } else {
        calculateBtn.classList.remove('has-results');
        if (window.translations && window.currentLanguage) {
            const lang = window.currentLanguage;
            calculateBtn.textContent = window.translations[lang]?.calculateBtn || '🎯 РАССЧИТАТЬ';
        }
    }
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

// ===== УПРАВЛЕНИЕ ОППОНЕНТАМИ =====
function setOpponents(count) {
    opponentsCount = count;
    document.querySelectorAll('.opponent-pill').forEach(pill => {
        const isActive = parseInt(pill.dataset.opponents) === count;
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
    document.getElementById('currentOpponents').textContent = count;
    
    // Обновляем текст в блоке оппонентов
    const opponentInfo = document.getElementById('opponentInfo');
    const currentLang = window.currentLanguage || 'ru';
    const translations = window.translations || {};
    
    if (count === 1) {
        opponentInfo.textContent = translations[currentLang]?.oneOpponent || '1 оппонент';
    } else {
        opponentInfo.textContent = `${count} ${translations[currentLang]?.opponents || 'оппонентов'}`;
    }
    
    // Сбрасываем результаты если изменилось количество оппонентов
    if (document.getElementById('resultHero').textContent !== '—') {
        updateResultsPanel('waiting');
    }
}

// ===== РАСЧЕТ ШАНСОВ =====
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
    updateResultsPanel('calculating');
    
    const calculateBtn = document.getElementById('calculateBtn');
    calculateBtn.disabled = true;
    
    const SIMULATIONS = 10000;
    const usedCardsCount = heroCards.length + boardCards.length;
    
    // Предварительная генерация колод для производительности
    if (pregeneratedDecks.length === 0) {
        pregeneratedDecks = pregenerateDeckIndices(SIMULATIONS, usedCardsCount);
    }
    
    const deck = createFullDeck().filter(card => !usedCards.has(card.code));
    let heroWins = 0, opponentWins = 0, ties = 0;
    
    const progressFill = document.getElementById('progressFill');
    const updateInterval = Math.max(1, Math.floor(SIMULATIONS / 100));
    
    for (let i = 0; i < SIMULATIONS; i++) {
        if (i % updateInterval === 0) {
            const progress = Math.round((i / SIMULATIONS) * 100);
            progressFill.style.width = progress + '%';
            progressFill.setAttribute('aria-valuenow', progress);
            
            // Даем браузеру перерисовать
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        
        // Используем предварительно сгенерированные индексы
        const deckIndices = pregeneratedDecks[i];
        const simulationDeck = deckIndices.map(idx => deck[idx]);
        
        // Собираем полный борд
        const fullBoard = [...boardCards];
        const neededBoardCards = 5 - boardCards.length;
        
        for (let j = 0; j < neededBoardCards; j++) {
            fullBoard.push(simulationDeck[j]);
        }
        
        // Раздаем руки оппонентам (уникальные карты)
        const opponentHands = [];
        let cardIndex = neededBoardCards;
        
        for (let opp = 0; opp < opponentsCount; opp++) {
            opponentHands.push([
                simulationDeck[cardIndex++],
                simulationDeck[cardIndex++]
            ]);
        }
        
        // Оцениваем руки
        const heroScore = HandEvaluator.evaluate([...heroCards, ...fullBoard]);
        const opponentScores = opponentHands.map(hand => 
            HandEvaluator.evaluate([...hand, ...fullBoard])
        );
        
        // Правильный подсчет побед с учетом дележа банка
        const bestScore = Math.max(...opponentScores);
        
        if (heroScore > bestScore) {
            heroWins++;
        } else if (heroScore < bestScore) {
            // Считаем сколько оппонентов имеют лучший счет
            const winners = opponentScores.filter(score => score === bestScore).length;
            opponentWins += 1 / winners; // Дележ банка
        } else {
            // Ничья между героем и одним или несколькими оппонентами
            const tyingOpponents = opponentScores.filter(score => score === heroScore).length;
            ties += 1 / (tyingOpponents + 1);
        }
    }
    
    progressFill.style.width = '100%';
    progressFill.setAttribute('aria-valuenow', 100);
    
    // Рассчитываем проценты
    const heroPercent = ((heroWins / SIMULATIONS) * 100).toFixed(1);
    const opponentPercent = ((opponentWins / SIMULATIONS) * 100).toFixed(1);
    const tiePercent = ((ties / SIMULATIONS) * 100).toFixed(1);
    
    // Обновляем интерфейс
    document.getElementById('resultHero').textContent = heroPercent + '%';
    document.getElementById('resultOpponent').textContent = opponentPercent + '%';
    document.getElementById('resultTie').textContent = tiePercent + '%';
    
    // Описание комбинации
    document.getElementById('heroHandDesc').textContent = describeHand(heroCards, boardCards);
    
    // Обновляем информацию об оппонентах
    const currentLang = window.currentLanguage || 'ru';
    const translations = window.translations || {};
    
    if (opponentsCount === 1) {
        document.getElementById('opponentInfo').textContent = 
            translations[currentLang]?.oneOpponent || '1 оппонент';
    } else {
        document.getElementById('opponentInfo').textContent = 
            `${opponentsCount} ${translations[currentLang]?.opponents || 'оппонентов'}`;
    }
    
    // Показываем статус завершения
    updateResultsPanel('completed');
    
    // Анимация внимания к результатам
    const resultsPanel = document.getElementById('resultsPanel');
    resultsPanel.classList.add('new-results');
    setTimeout(() => {
        resultsPanel.classList.remove('new-results');
    }, 3000);
    
    // Восстанавливаем интерфейс
    setTimeout(() => {
        isCalculating = false;
        updateStatus();
    }, 500);
}

// Предварительная генерация случайных индексов для производительности
function pregenerateDeckIndices(simulations, usedCardsCount) {
    const deckSize = 52 - usedCardsCount;
    const indices = [];
    
    for (let i = 0; i < simulations; i++) {
        const arr = Array.from({length: deckSize}, (_, idx) => idx);
        shuffleArrayFast(arr);
        indices.push([...arr]); // Копируем массив
    }
    
    return indices;
}

// Быстрая перетасовка Фишера-Йетса
function shuffleArrayFast(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createFullDeck() {
    const suits = ['s','h','c','d'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck = [];
    
    suits.forEach(suit => values.forEach(value => {
        const suitSymbol = suit === 'h' ? '♥' : suit === 'd' ? '♦' : suit === 's' ? '♠' : '♣';
        const suitName = suit === 'h' ? 'червей' : suit === 'd' ? 'бубен' : suit === 's' ? 'пик' : 'треф';
        
        deck.push({
            code: value + suit,
            value: value,
            suit: suitSymbol,
            suitCode: suit,
            suitName: suitName,
            rank: HandEvaluator.ranks[value]
        });
    }));
    return deck;
}

function describeHand(heroCards, boardCards) {
    const currentLang = window.currentLanguage || 'ru';
    
    if (boardCards.length === 0) {
        return window.translations?.[currentLang]?.preflop || 'Префлоп';
    }
    
    const handRank = HandEvaluator.evaluate([...heroCards, ...boardCards]) >> 20;
    const handNames = [
        window.translations?.[currentLang]?.highCard || 'Старшая карта',
        window.translations?.[currentLang]?.pair || 'Пара',
        window.translations?.[currentLang]?.twoPair || 'Две пары',
        window.translations?.[currentLang]?.threeOfAKind || 'Сет',
        window.translations?.[currentLang]?.straight || 'Стрит',
        window.translations?.[currentLang]?.flush || 'Флеш',
        window.translations?.[currentLang]?.fullHouse || 'Фулл хаус',
        window.translations?.[currentLang]?.fourOfAKind || 'Каре',
        window.translations?.[currentLang]?.straightFlush || 'Стрит-флеш',
        window.translations?.[currentLang]?.royalFlush || 'Флеш-рояль'
    ];
    
    return handNames[handRank] || window.translations?.[currentLang]?.unknownCombo || 'Комбинация';
}

// ===== УПРАВЛЕНИЕ ПАНЕЛЬЮ РЕЗУЛЬТАТОВ =====
function updateResultsPanel(state) {
    const resultsPanel = document.getElementById('resultsPanel');
    const calculationStatus = document.getElementById('calculationStatus');
    const progressFill = document.getElementById('progressFill');
    
    resultsPanel.classList.remove('calculating', 'completed');
    
    switch(state) {
        case 'waiting':
            document.getElementById('resultHero').textContent = '—';
            document.getElementById('resultOpponent').textContent = '—';
            document.getElementById('resultTie').textContent = '—';
            document.getElementById('heroHandDesc').textContent = '';
            progressFill.style.width = '0%';
            progressFill.setAttribute('aria-valuenow', 0);
            calculationStatus.textContent = '';
            break;
            
        case 'calculating':
            resultsPanel.classList.add('calculating');
            calculationStatus.textContent = window.translations?.[window.currentLanguage || 'ru']?.calculating || 'Идет расчет...';
            progressFill.style.width = '0%';
            break;
            
        case 'completed':
            resultsPanel.classList.add('completed');
            calculationStatus.textContent = window.translations?.[window.currentLanguage || 'ru']?.calculationComplete || 'Расчет завершен';
            setTimeout(() => {
                calculationStatus.textContent = '';
            }, 2000);
            break;
    }
}

// ===== ОЧИСТКА =====
function clearAll() {
    selectedCards.clear();
    usedCards.clear();
    updateCardDisplay();
    
    updateResultsPanel('waiting');
    HandEvaluator.clearCache();
    pregeneratedDecks = [];
    
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    selectHandBlock();
}

// ===== ГОРЯЧИЕ КЛАВИШИ =====
document.addEventListener('keydown', e => {
    switch(e.key) {
        case 'Escape':
            clearAll();
            break;
        case '1':
            if (e.altKey) selectHandBlock();
            break;
        case '2':
            if (e.altKey) selectBoardBlock();
            break;
        case 'Enter':
        case ' ':
            if (e.target === document.body && !document.getElementById('calculateBtn').disabled) {
                calculateEquity();
            }
            break;
        default:
            if (e.key >= '1' && e.key <= '9' && e.altKey) {
                setOpponents(parseInt(e.key));
            }
    }
});

// ===== ЭКСПОРТ ФУНКЦИЙ ДЛЯ ДРУГИХ ФАЙЛОВ =====
window.getHandCardsCount = getHandCardsCount;
window.getBoardCardsCount = getBoardCardsCount;
window.checkHandValidity = checkHandValidity;
window.checkBoardValidity = checkBoardValidity;
window.checkFreeSlots = checkFreeSlots;
window.hasFreeSlotsInSection = hasFreeSlotsInSection;
window.activateBlockBySlotId = activateBlockBySlotId;
window.updateResultsPanel = updateResultsPanel;
