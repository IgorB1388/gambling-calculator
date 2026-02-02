// Оптимизированный JavaScript код БЕЗ УВЕДОМЛЕНИЙ
const HandEvaluator = {
    ranks: { '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12 },
    suits: { 's':0,'h':1,'c':2,'d':3 },
    
    evaluate(cards) {
        const formatted = cards.map(c => ({
            rank: this.ranks[c.value],
            suit: this.suits[c.suitCode]
        })).sort((a,b) => b.rank - a.rank);
        
        const flush = this.hasFlush(formatted);
        const straight = this.hasStraight(formatted);
        
        if (flush && straight) {
            const straightValue = this.getStraightValue(formatted, true);
            return straightValue === 12 ? 9 << 20 : (8 << 20) + (straightValue << 16);
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
            const straightValue = this.getStraightValue(formatted,false);
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
        const suitCounts = [0,0,0,0];
        cards.forEach(c => suitCounts[c.suit]++);
        return suitCounts.some(count => count >= 5);
    },
    
    hasStraight(cards) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a,b) => b-a);
        for (let i=0; i<=uniqueRanks.length-5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) return true;
        }
        if (uniqueRanks.includes(12) && [0,1,2,3].every(r => uniqueRanks.includes(r))) return true;
        return false;
    },
    
    getStraightValue(cards, forFlush) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a,b) => b-a);
        for (let i=0; i<=uniqueRanks.length-5; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) return uniqueRanks[i];
        }
        if (uniqueRanks.includes(12) && [0,1,2,3].every(r => uniqueRanks.includes(r))) return 3;
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

// ФЛАГИ ДЛЯ ПЕРЕТАСКИВАНИЯ НА СЕКЦИИ
let isDraggingOverSection = false;
let currentDragCard = null;

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
            if (e.target.classList.contains('slot-empty') || e.target.classList.contains('remove-hint')) return;
            const realCard = e.target.closest('.real-card');
            if (realCard) removeCardFromSlot(slot.dataset.slot);
        });
    });
}

function initDragAndDrop() {
    document.addEventListener('dragstart', e => {
        // Drag из колоды
        const deckCard = e.target.closest('.deck-card');
        if (deckCard?.draggable) {
            currentDragCard = {
                source: 'deck',
                cardCode: deckCard.dataset.card
            };
            e.dataTransfer.setData('text/plain', deckCard.dataset.card);
            deckCard.style.opacity = '0.5';
            return;
        }
        
        // Drag из слотов (карт в руке/борде)
        const realCard = e.target.closest('.real-card');
        if (realCard) {
            const slot = realCard.parentElement;
            const card = selectedCards.get(slot.dataset.slot);
            if (card) {
                currentDragCard = {
                    source: 'slot',
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
        
        // Сбрасываем флаги
        isDraggingOverSection = false;
        currentDragCard = null;
        
        // Убираем подсветку секций
        document.querySelectorAll('.hand-section, .board-section').forEach(section => {
            section.style.transform = '';
            section.style.boxShadow = '';
        });
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
                    moveCardBetweenSlots
