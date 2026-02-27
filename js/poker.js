// --- HandEvaluator ---
const HandEvaluator = {
    ranks: { '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12 },
    suits: { 's':0,'h':1,'c':2,'d':3 },

    evaluateDetailed(cards){
        if(cards.length<5) return {rank:0,mainCards:[],kickers:[]};

        const formatted = cards.map(c=>({
            rank:this.ranks[c.value],
            suit:this.suits[c.suitCode],
            originalValue:c.value
        })).sort((a,b)=>b.rank-a.rank);

        const counts = {};
        formatted.forEach(c=>counts[c.rank]=(counts[c.rank]||0)+1);

        const flushSuit = this.getFlushSuit(formatted);
        const straightHigh = this.getStraightValue(formatted);

        // --- Стрит-флеш ---
        if(flushSuit!==-1){
            const straightFlushCards = this.getStraightFlushCards(formatted,flushSuit);
            if(straightFlushCards.length===5){
                const isRoyal = straightFlushCards.some(c=>c.rank===12);
                return {rank:isRoyal?9:8, mainCards:straightFlushCards.map(c=>c.originalValue), kickers:[]};
            }
        }

        // --- Каре ---
        const quadRank = this.getRankOfCount(counts,4);
        if(quadRank!==-1){
            const kicker = this.getKickersByRanks(formatted,[quadRank],1);
            return {rank:7, mainCards:[this.rankToValue(quadRank)], kickers:kicker.map(r=>this.rankToValue(r))};
        }

        // --- Фулл-хаус ---
        const tripsRanks = this.getRanksOfCount(counts,3).sort((a,b)=>b-a);
        const pairRanks = this.getRanksOfCount(counts,2).sort((a,b)=>b-a);

        if(tripsRanks.length>=1 && (pairRanks.length>=1 || tripsRanks.length>1)){
            const trips = tripsRanks[0];
            let pair = pairRanks.find(r=>r!==trips);
            if(pair===undefined && tripsRanks.length>1) pair = tripsRanks[1];
            return {rank:6, mainCards:[this.rankToValue(trips),this.rankToValue(pair)], kickers:[]};
        }

        // --- Флеш ---
        if(flushSuit!==-1){
            const flushCards = formatted.filter(c=>c.suit===flushSuit).slice(0,5);
            return {rank:5, mainCards:flushCards.map(c=>c.originalValue), kickers:[]};
        }

        // --- Стрит ---
        if(straightHigh!==-1){
            const mainCards = this.getStraightCards(formatted,straightHigh);
            return {rank:4, mainCards:mainCards.map(c=>c.originalValue), kickers:[]};
        }

        // --- Тройка ---
        if(tripsRanks.length>=1){
            const trips = tripsRanks[0];
            const kickers = this.getKickersByRanks(formatted,[trips],2);
            return {rank:3, mainCards:[this.rankToValue(trips)], kickers:kickers.map(r=>this.rankToValue(r))};
        }

        // --- Две пары ---
        const pairs = this.getRanksOfCount(counts,2).sort((a,b)=>b-a);
        if(pairs.length>=2){
            const topPairs = pairs.slice(0,2);
            const kicker = this.getKickersByRanks(formatted,topPairs,1);
            return {rank:2, mainCards:topPairs.map(r=>this.rankToValue(r)), kickers:kicker.map(r=>this.rankToValue(r))};
        }

        // --- Пара ---
        if(pairs.length===1){
            const pair = pairs[0];
            const kickers = this.getKickersByRanks(formatted,[pair],3);
            return {rank:1, mainCards:[this.rankToValue(pair)], kickers:kickers.map(r=>this.rankToValue(r))};
        }

        // --- Старшая карта ---
        const topCards = formatted.slice(0,5);
        return {rank:0, mainCards:topCards.map(c=>c.originalValue), kickers:[]};
    },

    getFlushSuit(cards){
        const suitsCount = [0,0,0,0];
        cards.forEach(c=>suitsCount[c.suit]++);
        const idx = suitsCount.findIndex(c=>c>=5);
        return idx;
    },

    // ФИКС: возвращаем старший ранг, а не первый попавшийся
    getRankOfCount(counts,count,exclude=-1){
        let best = -1;
        for(const [r,c] of Object.entries(counts)){
            const rank = parseInt(r);
            if(c===count && rank!==exclude && rank>best) best=rank;
        }
        return best;
    },

    getRanksOfCount(counts,count){
        return Object.entries(counts).filter(([r,c])=>c===count).map(([r])=>parseInt(r));
    },

    getKickersByRanks(cards,excludeRanks,count){
        return cards.filter(c=>!excludeRanks.includes(c.rank)).map(c=>c.rank).slice(0,count);
    },

    getStraightValue(cards){
        const uniqueRanks=[...new Set(cards.map(c=>c.rank))].sort((a,b)=>b-a);
        for(let i=0;i<=uniqueRanks.length-5;i++){
            if(uniqueRanks[i]-uniqueRanks[i+4]===4) return uniqueRanks[i];
        }
        // wheel (A-2-3-4-5)
        if(uniqueRanks.includes(12)&&uniqueRanks.includes(0)&&uniqueRanks.includes(1)&&uniqueRanks.includes(2)&&uniqueRanks.includes(3)) return 3;
        return -1;
    },

    getStraightCards(cards,high){
        const ranks=[high,high-1,high-2,high-3,high-4].map(r=>r<0?12:r);
        const result=[];
        for(const r of ranks){
            const c = cards.find(c=>c.rank===r && !result.includes(c));
            if(c) result.push(c);
        }
        return result;
    },

    // ФИКС: если стрита в масти нет — возвращаем пустой массив
    getStraightFlushCards(cards,suit){
        const suitCards = cards.filter(c=>c.suit===suit);
        const high = this.getStraightValue(suitCards);
        if(high===-1) return [];
        return this.getStraightCards(suitCards,high);
    },

    rankToValue(rank){
        return Object.keys(this.ranks).find(k=>this.ranks[k]===rank);
    }
};

// --- Сравнение рук ---
function compareHands(h1,h2){
    if(h1.rank>h2.rank) return 1;
    if(h1.rank<h2.rank) return -1;
    for(let i=0;i<h1.mainCards.length;i++){
        const r1=HandEvaluator.ranks[h1.mainCards[i]];
        const r2=HandEvaluator.ranks[h2.mainCards[i]];
        if(r1>r2) return 1;
        if(r1<r2) return -1;
    }
    for(let i=0;i<h1.kickers.length;i++){
        const r1=HandEvaluator.ranks[h1.kickers[i]];
        const r2=HandEvaluator.ranks[h2.kickers[i]];
        if(r1>r2) return 1;
        if(r1<r2) return -1;
    }
    return 0;
}


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

// --- Создание колоды ---
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

// --- Drag & Drop для слотов ---
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
        document.querySelectorAll('.hand-section, .board-section, #deck').forEach(el=>{
            el.classList.remove('drag-over','drag-over-no-space');
        });
        currentDragCard=null;
        currentDragSource=null;
        currentDragOverSection=null;
        if(dragOverTimer){clearTimeout(dragOverTimer);dragOverTimer=null;}
    });
    
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', e => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });
        
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
}

// --- Секция Drop ---
function initSectionDrop(){
    const sections=[document.getElementById('handSection'),document.getElementById('boardSection'),document.getElementById('deck')];
    sections.forEach(section=>{
        section.addEventListener('dragover',e=>{
            e.preventDefault();
            if(dragOverTimer){clearTimeout(dragOverTimer);}
            if(currentDragOverSection && currentDragOverSection!==section){
                currentDragOverSection.classList.remove('drag-over','drag-over-no-space');
            }
            
            let hasFreeSlots;
            if(section.id==='deck'){
                hasFreeSlots = currentDragSource==='slot';
            } else {
                hasFreeSlots = hasFreeSlotsInSection(section.id);
            }
            
            section.classList.toggle('drag-over',hasFreeSlots);
            section.classList.toggle('drag-over-no-space',!hasFreeSlots);
            currentDragOverSection=section;
            
            dragOverTimer=setTimeout(()=>{
                if(!section.contains(document.elementFromPoint(e.clientX,e.clientY))){
                    section.classList.remove('drag-over','drag-over-no-space');
                }
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
                if(currentDragSource==='slot' && currentDragCard.fromSlot){
                    removeCardFromSlot(currentDragCard.fromSlot);
                }
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
                if(currentDragSource==='deck'){
                    addCardToSlot(cardCode,freeSlot);
                } else if(currentDragSource==='slot'){
                    moveCardBetweenSlots(currentDragCard.fromSlot,freeSlot);
                }
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

// --- Вспомогательные для поиска свободных слотов ---
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
    
    document.querySelectorAll('.deck-card').forEach(deckCard=>{
        const isUsed=usedCards.has(deckCard.dataset.card);
        deckCard.classList.toggle('selected',isUsed);
        deckCard.draggable=!isUsed;
        deckCard.style.cursor=isUsed?'default':'pointer';
        deckCard.classList.add('bg-deck-card', 'deck-card-border', 'deck-card-shadow');
        
        const cardCode=deckCard.dataset.card;
        const suitCode=cardCode.slice(-1);
        const isRedSuit=suitCode==='h'||suitCode==='d';
        deckCard.classList.remove('text-red','text-black');
        deckCard.classList.add(isRedSuit?'text-red':'text-black');
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

// --- Обработка клика по карте ---
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

// --- Расчет эквити (ИСПРАВЛЕННЫЙ) ---
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

    const SIMULATIONS = 30000;
    let heroTotal = 0, oppTotal = 0, tieTotal = 0, actualRuns = 0;

    const suits = ['s','h','c','d'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

    const fullDeck = [];
    for (const v of values)
        for (const s of suits)
            fullDeck.push({code:v+s, value:v, suitCode:s});

    const usedCardCodes = new Set(Array.from(usedCards));
    const neededBoardCards = 5 - boardCards.length;
    const totalCardsNeeded = neededBoardCards + opponentsCount * 2;

    // Разбиваем на чанки чтобы не блокировать UI
    const CHUNK_SIZE = 500;
    let i = 0;

    const runChunk = () => {
        const end = Math.min(i + CHUNK_SIZE, SIMULATIONS);

        for (; i < end; i++) {
            let deck = fullDeck.filter(c => !usedCardCodes.has(c.code));
            if (deck.length < totalCardsNeeded) continue;
            actualRuns++;

            // Тасуем
            for (let j = deck.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [deck[j], deck[k]] = [deck[k], deck[j]];
            }

            // Формируем борд
            const fullBoard = [...boardCards];
            for (let j = 0; j < neededBoardCards; j++)
                fullBoard.push(deck[j]);

            let index = neededBoardCards;
            const heroScore = HandEvaluator.evaluateDetailed([...heroCards, ...fullBoard]);

            // ИСПРАВЛЕННАЯ логика определения победителя
            let heroBeaten = false;  // хоть один оппонент бьёт героя
            let tieCount = 1;        // сколько игроков делят банк (герой + тае-оппоненты)

            for (let o = 0; o < opponentsCount; o++) {
                const oppCard1 = deck[index];
                const oppCard2 = deck[index + 1];
                index += 2;
                const oppScore = HandEvaluator.evaluateDetailed([oppCard1, oppCard2, ...fullBoard]);
                const cmp = compareHands(heroScore, oppScore);

                if (cmp < 0) {
                    // Оппонент бьёт героя — стоп
                    heroBeaten = true;
                    break;
                } else if (cmp === 0) {
                    // Ничья с этим оппонентом
                    tieCount++;
                }
                // cmp > 0: герой бьёт этого оппонента — продолжаем
            }

            if (heroBeaten) {
                // Герой проиграл
                oppTotal++;
            } else if (tieCount === 1) {
                // Герой выиграл у всех
                heroTotal++;
            } else {
                // Ничья: делим банк между tieCount игроками
                tieTotal++;
                heroTotal += 1 / tieCount;
                oppTotal += (tieCount - 1) / tieCount;
            }
        }

        if (i < SIMULATIONS) {
            setTimeout(runChunk, 0);
        } else {
            // Финальный расчёт
            if (actualRuns === 0) { isCalculating = false; updateStatus(); return; }

            const heroPercent = (heroTotal / actualRuns) * 100;
            const oppPercent  = (oppTotal  / actualRuns) * 100;

            const heroRounded = Math.round(heroPercent * 10) / 10;
            const oppRounded  = Math.round(oppPercent  * 10) / 10;
            const tieRounded  = Math.max(0, Math.round((100 - heroPercent - oppPercent) * 10) / 10);

            document.getElementById('resultHero').textContent     = heroRounded.toFixed(1) + '%';
            document.getElementById('resultOpponent').textContent = oppRounded.toFixed(1)  + '%';
            document.getElementById('resultTie').textContent      = tieRounded.toFixed(1)  + '%';

            hasCalculatedResults = true;
            isCalculating = false;
            updateStatus();
        }
    };

    setTimeout(runChunk, 0);
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

