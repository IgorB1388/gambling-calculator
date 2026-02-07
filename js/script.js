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

// ФЛАГИ ДЛЯ ПЕРЕТАСКИВАНИЯ
let currentDragSource = null;
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
        
        // НЕ БЛОКИРУЕМ события, чтобы drag работал
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
    
    // Предотвращаем выделение текста в колоде
    deckGrid.addEventListener('selectstart', e => {
        e.preventDefault();
    });
    
    // Предотвращаем drag самой колоды
    deckGrid.addEventListener('dragstart', e => {
        if (!e.target.closest('.deck-card')) {
            e.preventDefault();
        }
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
        // Drag из слотов (карт в руке/борде)
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
        
        // Сбрасываем флаги
        currentDragCard = null;
        currentDragSource = null;
        
        // Убираем подсветку секций и колоды
        document.querySelectorAll('.hand-section, .board-section, #deck').forEach(el => {
            el.style.transform = '';
            el.style.boxShadow = '';
            el.style.borderColor = '';
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
            deckGrid.style.borderColor = 'var(--neon-yellow)';
            deckGrid.style.boxShadow = '0 0 20px var(--neon-yellow)';
            deckGrid.style.transform = 'scale(1.01)';
        }
    });
    
    deckGrid.addEventListener('dragleave', e => {
        if (!deckGrid.contains(e.relatedTarget)) {
            deckGrid.style.borderColor = '';
            deckGrid.style.boxShadow = '';
            deckGrid.style.transform = '';
        }
    });
    
    deckGrid.addEventListener('drop', e => {
        e.preventDefault();
        deckGrid.style.borderColor = '';
        deckGrid.style.boxShadow = '';
        deckGrid.style.transform = '';
        
        if (currentDragSource === 'slot' && currentDragCard?.fromSlot) {
            removeCardFromSlot(currentDragCard.fromSlot);
        }
    });
}

// Drop на секции (рука/борд)
function initSectionDrop() {
    const handSection = document.getElementById('handSection');
    const boardSection = document.getElementById('boardSection');
    
    [handSection, boardSection].forEach(section => {
        section.addEventListener('dragover', e => {
            e.preventDefault();
            if (currentDragSource === 'deck') {
                section.style.boxShadow = '0 0 25px rgba(255, 215, 102, 0.7)';
                section.style.transform = 'translateY(-3px) scale(1.01)';
            }
        });
        
        section.addEventListener('dragleave', e => {
            if (!section.contains(e.relatedTarget)) {
                section.style.transform = '';
                section.style.boxShadow = '';
            }
        });
        
        section.addEventListener('drop', e => {
            e.preventDefault();
            section.style.transform = '';
            section.style.boxShadow = '';
            
            if (!currentDragCard || currentDragSource !== 'deck') return;
            
            const cardCode = currentDragCard.cardCode;
            if (usedCards.has(cardCode)) return;
            
            const sectionType = section.id === 'handSection' ? 'hand' : 'board';
            
            // Находим первый свободный слот в этой секции
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
                addCardToSlot(cardCode, freeSlot);
            }
            // Если нет свободных слотов, не делаем ничего
        });
    });
}

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
    
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
}

function selectHandBlock() {
    activeBlock = 'hand';
    updateActiveSection('handSection', 'handTitle');
    document.getElementById('currentBlockName').textContent = 'Ваша рука';
}

function selectBoardBlock() {
    activeBlock = 'board';
    updateActiveSection('boardSection', 'boardTitle');
    document.getElementById('currentBlockName').textContent = 'Борд';
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
    
    for (let i=1; i<=2; i++) {
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
    
    for (let i=1; i<=5; i++) {
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
    
    selectedCards.set(slotId, {
        code: cardCode,
        value: value,
        suit: suitSymbols[suitCode],
        suitCode: suitCode,
        rank: HandEvaluator.ranks[value] || 0
    });
    
    usedCards.add(cardCode);
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
    calculateBtn.disabled = !(checkHandValidity() && checkBoardValidity() && !isCalculating);
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
    document.getElementById('currentOpponents').textContent = count;
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
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('resultsPanel').style.display = 'block';
    
    const SIMULATIONS = 10000;
    let heroWins = 0, opponentWins = 0, ties = 0;
    let deck = createFullDeck().filter(card => !usedCards.has(card.code));
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    for (let i=0; i<SIMULATIONS; i++) {
        if (i % 200 === 0) {
            const progress = Math.round((i/SIMULATIONS)*100);
            progressFill.style.width = progress + '%';
            progressText.textContent = `Идет расчет: ${progress}%`;
            await new Promise(resolve => setTimeout(resolve,0));
        }
        
        const simulationDeck = [...deck];
        shuffleArray(simulationDeck);
        const fullBoard = [...boardCards];
        
        for (let j=0; j<5-boardCards.length; j++) fullBoard.push(simulationDeck.pop());
        
        const opponentScores = [];
        for (let j=0; j<opponentsCount; j++) {
            opponentScores.push(HandEvaluator.evaluate([
                simulationDeck.pop(),
                simulationDeck.pop(),
                ...fullBoard
            ]));
        }
        
        const heroScore = HandEvaluator.evaluate([...heroCards,...fullBoard]);
        const bestOpponentScore = Math.max(...opponentScores);
        
        if (heroScore > bestOpponentScore) heroWins++;
        else if (heroScore < bestOpponentScore) opponentWins++;
        else ties++;
    }
    
    progressFill.style.width = '100%';
    progressText.textContent = 'Расчет завершен!';
    
    const heroPercent = (heroWins/SIMULATIONS*100).toFixed(1);
    const opponentPercent = (opponentWins/SIMULATIONS*100).toFixed(1);
    const tiePercent = (ties/SIMULATIONS*100).toFixed(1);
    
    document.getElementById('resultHero').textContent = heroPercent + '%';
    document.getElementById('resultOpponent').textContent = opponentPercent + '%';
    document.getElementById('resultTie').textContent = tiePercent + '%';
    
    document.getElementById('heroHandDesc').textContent = describeHand(heroCards,boardCards);
    document.getElementById('opponentInfo').textContent = opponentsCount === 1 
        ? "Хедз 1 на 1" 
        : `${opponentsCount} оппонент${opponentsCount===1?'':opponentsCount<=4?'а':'ов'}`;
    
    document.getElementById('resultsPanel').scrollIntoView({behavior:'smooth'});
    
    setTimeout(() => {
        document.getElementById('progressContainer').style.display = 'none';
        isCalculating = false;
        updateStatus();
    }, 1000);
}

function createFullDeck() {
    const suits = ['s','h','c','d'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck = [];
    
    suits.forEach(suit => values.forEach(value => {
        deck.push({
            code: value + suit,
            value: value,
            suit: suit==='h'?'♥':suit==='d'?'♦':suit==='s'?'♠':'♣',
            suitCode: suit,
            rank: HandEvaluator.ranks[value]
        });
    }));
    return deck;
}

function shuffleArray(array) {
    for (let i=array.length-1; i>0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function describeHand(heroCards, boardCards) {
    if (boardCards.length === 0) return "Префлоп";
    const handRank = HandEvaluator.evaluate([...heroCards,...boardCards]) >> 20;
    const handNames = ["Старшая карта","Пара","Две пары","Сет","Стрит","Флеш","Фулл-хаус","Каре","Стрит-флеш","Роял-флеш"];
    return handNames[handRank] || "Неизвестная комбинация";
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
}

// Горячие клавиши
document.addEventListener('keydown', e => {
    switch(e.key) {
        case 'Escape': clearAll(); break;
        case '1': selectHandBlock(); break;
        case '2': selectBoardBlock(); break;
        case 'Enter': case ' ':
            if (!document.getElementById('calculateBtn').disabled) calculateEquity();
            break;
        default:
            if (e.key >= '1' && e.key <= '9') setOpponents(parseInt(e.key));
    }
});


