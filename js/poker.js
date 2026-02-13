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
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) return true;
        }
        const ranksWithWheel = uniqueRanks.map(r => r === 12 ? -1 : r).sort((a,b) => b-a);
        const wheelRanks = [-1,0,1,2,3];
        for (let i=0;i<=ranksWithWheel.length-5;i++){
            const slice=ranksWithWheel.slice(i,i+5);
            if(slice[0]-slice[4]===4 && wheelRanks.every(r=>slice.includes(r))) return true;
        }
        return false;
    },
    
    getStraightValue(cards) {
        const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a,b)=>b-a);
        for(let i=0;i<=uniqueRanks.length-5;i++){
            if(uniqueRanks[i]-uniqueRanks[i+4]===4) return uniqueRanks[i];
        }
        const ranksWithWheel=uniqueRanks.map(r=>r===12?-1:r).sort((a,b)=>b-a);
        const wheelRanks=[-1,0,1,2,3];
        for(let i=0;i<=ranksWithWheel.length-5;i++){
            const slice=ranksWithWheel.slice(i,i+5);
            if(slice[0]-slice[4]===4 && wheelRanks.every(r=>slice.includes(r))) return 3;
        }
        return -1;
    },
    
    getRankCounts(cards){
        const counts={};
        cards.forEach(c=>counts[c.rank]=(counts[c.rank]||0)+1);
        return counts;
    },
    
    getRankOfCount(counts,targetCount,exclude=-1){
        for(const [rank,count] of Object.entries(counts)){
            const rankNum=parseInt(rank);
            if(count===targetCount && rankNum!==exclude) return rankNum;
        }
        return -1;
    },
    
    getRanksOfCount(counts,targetCount){
        return Object.entries(counts)
            .filter(([,count])=>count===targetCount)
            .map(([rank])=>parseInt(rank));
    },
    
    getKickers(cards,excludeRanks,count){
        const kickers=cards.filter(c=>!excludeRanks.includes(c.rank)).map(c=>c.rank).sort((a,b)=>b-a).slice(0,count);
        while(kickers.length<count) kickers.push(0);
        return kickers;
    },
    
    getFlushCards(cards){
        const suitCounts=[0,0,0,0];
        cards.forEach(c=>suitCounts[c.suit]++);
        const flushSuit=suitCounts.findIndex(c=>c>=5);
        return cards.filter(c=>c.suit===flushSuit).sort((a,b)=>b.rank-a.rank).slice(0,5);
    },
    
    getHandValue(cards){
        return cards.reduce((v,c,i)=>v+(c.rank<<(4*(4-i))),0);
    }
};

// --- Переменные состояния ---
let activeBlock='hand';
const selectedCards=new Map();
const usedCards=new Set();
let opponentsCount=1;
let isCalculating=false;
let hasCalculatedResults=false;

let currentDragSource=null;
let currentDragCard=null;
let currentDragOverSection=null;
let dragOverTimer=null;

// --- Инициализация ---
document.addEventListener('DOMContentLoaded',()=>{
    createDeck();
    initEventListeners();
    initDragAndDrop();
    initSectionDrop();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    selectHandBlock();
});

// --- Создание колоды (БЕЛЫЙ ФОН + КРАСНЫЕ/ЧЕРНЫЕ МАСТИ) ---
function createDeck(){
    const deckGrid=document.getElementById('deck');
    deckGrid.innerHTML='';
    const suits=[{code:'s',symbol:'♠',color:'black'},{code:'h',symbol:'♥',color:'red'},{code:'c',symbol:'♣',color:'black'},{code:'d',symbol:'♦',color:'red'}];
    const values=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    
    suits.forEach(suit=>values.forEach(value=>{
        const cardCode=value+suit.code;
        const deckCard=document.createElement('div');
        deckCard.className=`deck-card bg-deck-card deck-card-border deck-card-shadow ${suit.color==='red' ? 'text-red' : 'text-black'}`;
        deckCard.dataset.card=cardCode;
        deckCard.draggable=true;
        
        deckCard.addEventListener('dragstart',e=>{
            if(deckCard.classList.contains('selected')){e.preventDefault();return;}
            currentDragSource='deck';
            currentDragCard={cardCode};
            e.dataTransfer.setData('text/plain',cardCode);
            deckCard.style.opacity='0.5';
        });
        
        const cardFace=document.createElement('div');
        cardFace.className='card-face';
        cardFace.innerHTML=`<div class="card-value">${value}</div><div class="card-suit-large">${suit.symbol}</div>`;
        deckCard.appendChild(cardFace);
        deckGrid.appendChild(deckCard);
        
        deckCard.addEventListener('click',()=>{
            if(deckCard.classList.contains('selected')) return;
            handleCardClick(cardCode);
        });
    }));
    
    deckGrid.addEventListener('selectstart',e=>e.preventDefault());
}

// --- Обработчики ---
function initEventListeners(){
    document.getElementById('handSection').addEventListener('click',selectHandBlock);
    document.getElementById('boardSection').addEventListener('click',selectBoardBlock);
    document.getElementById('calculateBtn').addEventListener('click',calculateEquity);
    document.getElementById('clearAllBtn').addEventListener('click',clearAll);
    document.querySelectorAll('.opponent-pill').forEach(pill=>{
        pill.addEventListener('click',()=>setOpponents(parseInt(pill.dataset.opponents)));
    });
    document.querySelectorAll('.card-slot').forEach(slot=>{
        slot.addEventListener('click',e=>{
            const realCard=e.target.closest('.real-card');
            if(realCard) removeCardFromSlot(slot.dataset.slot);
        });
    });
}

// --- Drag & Drop ---
function initDragAndDrop(){
    document.addEventListener('dragstart',e=>{
        const realCard=e.target.closest('.real-card');
        if(realCard){
            const slot=realCard.parentElement;
            const card=selectedCards.get(slot.dataset.slot);
            if(card){
                currentDragSource='slot';
                currentDragCard={cardCode:card.code,fromSlot:slot.dataset.slot};
                e.dataTransfer.setData('text/plain',JSON.stringify(currentDragCard));
                realCard.style.opacity='0.5';
            }
        }
    });
    document.addEventListener('dragend',()=>{
        document.querySelectorAll('.deck-card, .real-card').forEach(el=>el.style.opacity='1');
        document.querySelectorAll('.card-slot').forEach(s=>s.classList.remove('drag-over'));
        document.querySelectorAll('.hand-section, .board-section, #deck').forEach(el=>el.classList.remove('drag-over','drag-over-no-space'));
        currentDragCard=null;
        currentDragSource=null;
        currentDragOverSection=null;
        if(dragOverTimer){clearTimeout(dragOverTimer);dragOverTimer=null;}
    });
}

// --- Секция Drop ---
function initSectionDrop(){
    const sections=[document.getElementById('handSection'),document.getElementById('boardSection'),document.getElementById('deck')];
    sections.forEach(section=>{
        section.addEventListener('dragover',e=>{
            e.preventDefault();
            if(dragOverTimer){clearTimeout(dragOverTimer);}
            if(currentDragOverSection && currentDragOverSection!==section) currentDragOverSection.classList.remove('drag-over','drag-over-no-space');
            
            let hasFreeSlots=section.id==='deck'?currentDragSource==='slot':hasFreeSlotsInSection(section.id);
            section.classList.toggle('drag-over',hasFreeSlots);
            section.classList.toggle('drag-over-no-space',!hasFreeSlots);
            currentDragOverSection=section;
            
            dragOverTimer=setTimeout(()=>{
                if(!section.contains(document.elementFromPoint(e.clientX,e.clientY))) section.classList.remove('drag-over','drag-over-no-space');
            },50);
        });
        
        section.addEventListener('dragleave',e=>{
            if(dragOverTimer) clearTimeout(dragOverTimer);
            dragOverTimer=setTimeout(()=>{
                if(!section.contains(e.relatedTarget)){
                    section.classList.remove('drag-over','drag-over-no-space');
                    currentDragOverSection=null;
                }
            },100);
        });
        
        section.addEventListener('drop',e=>{
            e.preventDefault();
            section.classList.remove('drag-over','drag-over-no-space');
            currentDragOverSection=null;
            if(dragOverTimer){clearTimeout(dragOverTimer);dragOverTimer=null;}
            if(!currentDragCard) return;
            const cardCode=currentDragCard.cardCode;
            
            if(section.id==='deck'){
                if(currentDragSource==='slot' && currentDragCard.fromSlot) removeCardFromSlot(currentDragCard.fromSlot);
                return;
            }
            
            if(usedCards.has(cardCode) && currentDragSource!=='slot') return;
            
            const sectionType=section.id==='handSection'?'hand':'board';
            let freeSlot=null;
            const max=sectionType==='hand'?2:5;
            for(let i=1;i<=max;i++){
                const slotId=`${sectionType==='hand'?'hero':'board'}-${i}`;
                if(!selectedCards.has(slotId)){freeSlot=slotId;break;}
            }
            
            if(freeSlot){
                if(currentDragSource==='deck') addCardToSlot(cardCode,freeSlot);
                else if(currentDragSource==='slot') moveCardBetweenSlots(currentDragCard.fromSlot,freeSlot);
                activateBlockBySlotId(freeSlot);
            }
        });
    });
}

function hasFreeSlotsInSection(sectionId){
    if(sectionId==='handSection') return getHandCardsCount()<2;
    if(sectionId==='boardSection') return getBoardCardsCount()<5;
    return false;
}

// --- Вспомогательные для поиска свободных слотов (НОВЫЕ) ---
function getFirstFreeSlotInHand() {
    for (let i = 1; i <= 2; i++) {
        const slotId = `hero-${i}`;
        if (!selectedCards.has(slotId)) return slotId;
    }
    return null;
}

function getFirstFreeSlotInBoard() {
    for (let i = 1; i <= 5; i++) {
        const slotId = `board-${i}`;
        if (!selectedCards.has(slotId)) return slotId;
    }
    return null;
}

// --- Управление картами ---
function addCardToSlot(cardCode,slotId){
    const value=cardCode.slice(0,-1), suitCode=cardCode.slice(-1), suitSymbols={h:'♥',d:'♦',s:'♠',c:'♣'};
    selectedCards.set(slotId,{code:cardCode,value,suit:suitSymbols[suitCode],suitCode,rank:HandEvaluator.ranks[value]});
    usedCards.add(cardCode);
    activateBlockBySlotId(slotId);
    resetResults();
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    checkAndSwitchActiveBlock();
}

function removeCardFromSlot(slotId){
    if(selectedCards.has(slotId)){
        const card=selectedCards.get(slotId);
        usedCards.delete(card.code);
        selectedCards.delete(slotId);
        resetResults();
        updateCardDisplay();
        updateStatus();
        checkBoardValidity();
        checkHandValidity();
        checkAndSwitchActiveBlock();
    }
}

// --- Отображение карт ---
function updateCardDisplay(){
    // Обновляем карты в слотах (рука/борд)
    document.querySelectorAll('.card-slot').forEach(slot=>{
        const slotId=slot.dataset.slot;
        if(selectedCards.has(slotId)){
            const card=selectedCards.get(slotId);
            const isRed=card.suit==='♥'||card.suit==='♦';
            slot.innerHTML=`
                <div class="real-card bg-card-white border-card-light shadow-card ${isRed ? 'text-red' : 'text-black'}" draggable="true">
                    <div class="card-content">${card.value}<br>${card.suit}</div>
                </div>
            `;
        } else {
            slot.innerHTML='<div class="slot-empty text-slot">+</div>';
        }
    });
    
    // Обновляем карты в колоде (БЕЛЫЙ ФОН + КРАСНЫЕ/ЧЕРНЫЕ МАСТИ)
    document.querySelectorAll('.deck-card').forEach(deckCard=>{
        const isUsed=usedCards.has(deckCard.dataset.card);
        deckCard.classList.toggle('selected',isUsed);
        deckCard.draggable=!isUsed;
        deckCard.style.cursor=isUsed?'default':'pointer';
        
        // Добавляем белый фон и тень (если вдруг потерялись)
        deckCard.classList.add('bg-deck-card', 'deck-card-border', 'deck-card-shadow');
        
        // КРАСНЫЕ И ЧЕРНЫЕ МАСТИ - ОБЯЗАТЕЛЬНО!
        const cardCode = deckCard.dataset.card;
        const suitCode = cardCode.slice(-1);
        const isRedSuit = suitCode === 'h' || suitCode === 'd';
        
        // Удаляем старые классы цветов
        deckCard.classList.remove('text-red', 'text-black');
        // Добавляем правильный цвет
        deckCard.classList.add(isRedSuit ? 'text-red' : 'text-black');
    });
}

// --- Проверки и статус ---
function updateStatus(){
    document.getElementById('calculateBtn').disabled=!(checkHandValidity() && checkBoardValidity() && !isCalculating);
}
function checkHandValidity(){
    const w=document.getElementById('handWarning');
    const valid=getHandCardsCount()===2;
    w.style.display=valid?'none':'block';
    return valid;
}
function checkBoardValidity(){
    const w=document.getElementById('boardWarning');
    const count=getBoardCardsCount();
    const valid=count===0||count===3||count===4||count===5;
    w.style.display=(count===1||count===2)?'block':'none';
    return valid;
}

// --- Переключение блоков ---
function selectHandBlock(){
    activeBlock='hand';
    document.getElementById('handSection').classList.add('active');
    document.getElementById('boardSection').classList.remove('active');
}
function selectBoardBlock(){
    activeBlock='board';
    document.getElementById('boardSection').classList.add('active');
    document.getElementById('handSection').classList.remove('active');
}
function checkAndSwitchActiveBlock(){
    const handCount=getHandCardsCount();
    const boardCount=getBoardCardsCount();
    if(activeBlock==='hand' && handCount>=2 && boardCount<5) selectBoardBlock();
    if(activeBlock==='board' && boardCount>=5 && handCount<2) selectHandBlock();
}
function activateBlockBySlotId(slotId){
    if(slotId.startsWith('hero')) selectHandBlock();
    else selectBoardBlock();
}

// --- Вспомогательные ---
function getHandCardsCount(){return Array.from(selectedCards.keys()).filter(k=>k.startsWith('hero')).length;}
function getBoardCardsCount(){return Array.from(selectedCards.keys()).filter(k=>k.startsWith('board')).length;}

// --- Обработка клика по карте (ИСПРАВЛЕНО) ---
function handleCardClick(cardCode) {
    if (usedCards.has(cardCode)) return;
    
    if (activeBlock === 'hand') {
        const freeSlot = getFirstFreeSlotInHand();
        if (freeSlot) {
            addCardToSlot(cardCode, freeSlot);
        } else if (getBoardCardsCount() < 5) {
            selectBoardBlock();
            const freeBoardSlot = getFirstFreeSlotInBoard();
            if (freeBoardSlot) addCardToSlot(cardCode, freeBoardSlot);
        }
    } else {
        const freeSlot = getFirstFreeSlotInBoard();
        if (freeSlot) {
            addCardToSlot(cardCode, freeSlot);
        } else if (getHandCardsCount() < 2) {
            selectHandBlock();
            const freeHandSlot = getFirstFreeSlotInHand();
            if (freeHandSlot) addCardToSlot(cardCode, freeHandSlot);
        }
    }
}

function moveCardBetweenSlots(fromSlot,toSlot){
    if(!selectedCards.has(fromSlot)) return;
    const card=selectedCards.get(fromSlot);
    if(selectedCards.has(toSlot)){
        const tempCard=selectedCards.get(toSlot);
        selectedCards.set(toSlot,card);
        selectedCards.set(fromSlot,tempCard);
    } else {
        selectedCards.set(toSlot,card);
        selectedCards.delete(fromSlot);
    }
    activateBlockBySlotId(toSlot);
    resetResults();
    updateCardDisplay();
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    checkAndSwitchActiveBlock();
}

// --- Оппоненты ---
function setOpponents(count){
    opponentsCount=count;
    document.querySelectorAll('.opponent-pill').forEach(pill=>{
        pill.classList.toggle('active',parseInt(pill.dataset.opponents)===count);
    });
    resetResults();
}

// --- Очистка ---
function clearAll(){
    const clearBtn=document.getElementById('clearAllBtn');
    clearBtn.classList.add('clicked');
    setTimeout(()=>clearBtn.classList.remove('clicked'),300);
    
    selectedCards.clear();
    usedCards.clear();
    updateCardDisplay();
    document.getElementById('resultHero').textContent='—';
    document.getElementById('resultOpponent').textContent='—';
    document.getElementById('resultTie').textContent='—';
    hasCalculatedResults=false;
    updateStatus();
    checkBoardValidity();
    checkHandValidity();
    selectHandBlock();
}

// --- Сброс результатов ---
function resetResults(){
    if(hasCalculatedResults){
        document.getElementById('resultHero').textContent='—';
        document.getElementById('resultOpponent').textContent='—';
        document.getElementById('resultTie').textContent='—';
        hasCalculatedResults=false;
    }
}

// --- Расчёт эквити ---
async function calculateEquity() {
    if (isCalculating) return;

    const heroCards = Array.from(selectedCards.entries())
        .filter(([s]) => s.startsWith('hero'))
        .map(([, c]) => c);

    const boardCards = Array.from(selectedCards.entries())
        .filter(([s]) => s.startsWith('board'))
        .map(([, c]) => c);

    if (!checkHandValidity() || !checkBoardValidity()) return;

    isCalculating = true;
    document.getElementById('calculateBtn').disabled = true;

    const SIMULATIONS = 25000;
    let heroTotal = 0, oppTotal = 0, tieHands = 0;

    const suits = ['s','h','c','d'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const fullDeck = [];
    for (const v of values) for (const s of suits) fullDeck.push({code:v+s, value:v, suitCode:s, rank:HandEvaluator.ranks[v]});
    const usedCardCodes = new Set(Array.from(usedCards));

    const neededBoardCards = 5 - boardCards.length;
    const totalCardsNeeded = neededBoardCards + opponentsCount * 2;

    for (let i = 0; i < SIMULATIONS; i++) {
        let deck = fullDeck.filter(c => !usedCardCodes.has(c.code));
        if (deck.length < totalCardsNeeded) continue;

        for (let j = deck.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [deck[j], deck[k]] = [deck[k], deck[j]];
        }

        const fullBoard = [...boardCards];
        for (let j = 0; j < neededBoardCards; j++) fullBoard.push(deck[j]);

        let cardIndex = neededBoardCards;
        const opponentHands = [];
        for (let opp = 0; opp < opponentsCount; opp++) {
            opponentHands.push([deck[cardIndex], deck[cardIndex + 1]]);
            cardIndex += 2;
        }

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

    let heroRounded = Math.max(0, Math.round(heroPercent * 10) / 10);
    let oppRounded = Math.max(0, Math.round(oppPercent * 10) / 10);
    let tieRounded = Math.max(0, Math.round(tiePercent * 10) / 10);

    // Корректировка до 100%
    let sum = heroRounded + oppRounded + tieRounded;
    if (Math.abs(100 - sum) > 0.1) {
        const factor = 100 / sum;
        heroRounded = Math.round(heroRounded * factor * 10) / 10;
        oppRounded = Math.round(oppRounded * factor * 10) / 10;
        tieRounded = Math.round(tieRounded * factor * 10) / 10;
    }

    document.getElementById('resultHero').textContent = heroRounded.toFixed(1) + '%';
    document.getElementById('resultOpponent').textContent = oppRounded.toFixed(1) + '%';
    document.getElementById('resultTie').textContent = tieRounded.toFixed(1) + '%';

    const resultsPanel = document.querySelector('.results-panel');
    resultsPanel.classList.remove('fresh-result');
    void resultsPanel.offsetWidth;
    resultsPanel.classList.add('fresh-result');
    
    hasCalculatedResults = true;
    setTimeout(() => resultsPanel.classList.remove('fresh-result'), 300);

    isCalculating = false;
    updateStatus();
}

// --- Смена темы: пересоздаем колоду ---
document.addEventListener('themeChanged', () => {
    createDeck();
    updateCardDisplay();
});

// --- Экспорт для отладки ---
window.getHandCardsCount = getHandCardsCount;
window.getBoardCardsCount = getBoardCardsCount;
window.checkHandValidity = checkHandValidity;
window.checkBoardValidity = checkBoardValidity;
window.hasFreeSlotsInSection = hasFreeSlotsInSection;
window.activateBlockBySlotId = activateBlockBySlotId;
