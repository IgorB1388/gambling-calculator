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
        // wheel: A-2-3-4-5
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

// --- Создание колоды ---
function createDeck(){
    const deckGrid=document.getElementById('deck');
    deckGrid.innerHTML='';
    const suits=[{code:'s',symbol:'♠',color:'black'},{code:'h',symbol:'♥',color:'red'},{code:'c',symbol:'♣',color:'black'},{code:'d',symbol:'♦',color:'red'}];
    const values=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    
    suits.forEach(suit=>values.forEach(value=>{
        const cardCode=value+suit.code;
        const deckCard=document.createElement('div');
        deckCard.className=`deck-card ${suit.color}`;
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
        
        deckCard.addEventListener('click',()=>handleCardClick(cardCode));
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

// --- Управление картами ---
function addCardToSlot(cardCode,slotId){
    const value=cardCode.slice(0,-1), suitCode=cardCode.slice(-1), suitSymbols={h:'♥',d:'♦',s:'♠',c:'♣'};
    selectedCards.set(slotId,{code:cardCode,value,suit:suitSymbols[suitCode],suitCode,rank:HandEvaluator.ranks[value]});
    usedCards.add(cardCode);
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

function updateCardDisplay(){
    document.querySelectorAll('.card-slot').forEach(slot=>{
        const slotId=slot.dataset.slot;
        if(selectedCards.has(slotId)){
            const card=selectedCards.get(slotId);
            const isRed=card.suit==='♥'||card.suit==='♦';
            slot.innerHTML=`<div class="real-card ${isRed?'red':'black'}" draggable="true"><div class="card-content">${card.value}<br>${card.suit}</div></div>`;
        } else slot.innerHTML='<div class="slot-empty">+</div>';
    });
    document.querySelectorAll('.deck-card').forEach(deckCard=>{
        const isUsed=usedCards.has(deckCard.dataset.card);
        deckCard.classList.toggle('selected',isUsed);
        deckCard.draggable=!isUsed;
        deckCard.style.cursor=isUsed?'default':'pointer';
    });
}

// --- Проверки и статус ---
function updateStatus(){
    document.getElementById('calculateBtn').disabled=!(checkHandValidity() && checkBoardValidity() && !isCalculating);
}
function checkHandValidity(){const w=document.getElementById('handWarning');const valid=getHandCardsCount()===2;w.style.display=valid?'none':'block';return valid;}
function checkBoardValidity(){const w=document.getElementById('boardWarning');const count=getBoardCardsCount();const valid=count===0||count===3||count===4||count===5;w.style.display=(count===1||count===2)?'block':'none';return valid;}

// --- Расчёт эквити ---
async function calculateEquity(){
    if(isCalculating) return;
    const heroCards=Array.from(selectedCards.entries()).filter(([s])=>s.startsWith('hero')).map(([,c])=>c);
    const boardCards=Array.from(selectedCards.entries()).filter(([s])=>s.startsWith('board')).map(([,c])=>c);
    if(!checkHandValidity() || !checkBoardValidity()) return;
    isCalculating=true;
    document.getElementById('calculateBtn').disabled=true;

    const SIMULATIONS=25000;
    let heroTotal=0,oppTotal=0,tieHands=0;

    const createOptimizedDeck=()=>{
        const suits=['s','h','c','d'], values=['2','3','4','5','6','7','8','9','10','J','Q','K','A'], deck=[];
        for(const v of values) for(const s of suits) deck.push({code:v+s,value:v,suit:s==='h'?'♥':s==='d'?'♦':s==='s'?'♠':'♣',suitCode:s,rank:HandEvaluator.ranks[v]});
        return deck;
    };
    const initialDeck=createOptimizedDeck();
    const usedCardCodes=new Set(Array.from(usedCards));
    const neededBoardCards=5-boardCards.length;
    const totalCardsNeeded=neededBoardCards+opponentsCount*2;

    for(let i=0;i<SIMULATIONS;i++){
        const availableDeck=initialDeck.filter(c=>!usedCardCodes.has(c.code));
        if(availableDeck.length<totalCardsNeeded) continue;
        const shuffled=[...availableDeck];
        for(let j=shuffled.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[shuffled[j],shuffled[k]]=[shuffled[k],shuffled[j]];}
        const fullBoard=[...boardCards];
        for(let j=0;j<neededBoardCards;j++) fullBoard.push(shuffled[j]);
        const opponentHands=[];
        let idx=neededBoardCards;
        for(let o=0;o<opponentsCount;o++){if(idx+1>=shuffled.length) break;opponentHands.push([shuffled[idx],shuffled[idx+1]]);idx+=2;}
        if(opponentHands.length!==opponentsCount) continue;

        const heroScore=HandEvaluator.evaluate([...heroCards,...fullBoard]);
        let bestOpponentScore=-1,tyingOpponents=0;
        for(const hand of opponentHands){
            const score=HandEvaluator.evaluate([...hand,...fullBoard]);
            if(score>bestOpponentScore){bestOpponentScore=score;tyingOpponents=1;}
            else if(score===bestOpponentScore) tyingOpponents++;
        }
        if(heroScore>bestOpponentScore) heroTotal+=1;
        else if(heroScore<bestOpponentScore) oppTotal+=1;
        else{tieHands+=1;const totalTie=tyingOpponents+1;heroTotal+=1/totalTie;oppTotal+=tyingOpponents/totalTie;}
    }

    let heroPercent=(heroTotal/SIMULATIONS)*100;
    let oppPercent=(oppTotal/SIMULATIONS)*100;
    let tiePercent=(tieHands/SIMULATIONS)*100;

    heroPercent=Math.max(0,Math.round(heroPercent*10)/10);
    oppPercent=Math.max(0,Math.round(oppPercent*10)/10);
    tiePercent=Math.max(0,Math.round(tiePercent*10)/10);

    let sum=heroPercent+oppPercent+tiePercent;
    let diff=100-sum;
    if(Math.abs(diff)>0.001){
        const maxVal=Math.max(heroPercent,oppPercent,tiePercent);
        if(maxVal===heroPercent) heroPercent=Math.round((heroPercent+diff)*10)/10;
        else if(maxVal===oppPercent) oppPercent=Math.round((oppPercent+diff)*10)/10;
        else tiePercent=Math.round((tiePercent+diff)*10)/10;
    }

    heroPercent=Math.max(0,Math.round(heroPercent*10)/10);
    oppPercent=Math.max(0,Math.round(oppPercent*10)/10);
    tiePercent=Math.max(0,Math.round(tiePercent*10)/10);

    sum=heroPercent+oppPercent+tiePercent;
    diff=100-sum;
    if(Math.abs(diff)>0.001){let newVal=heroPercent+diff;newVal=Math.round(newVal*10)/10;heroPercent=Math.max(0,newVal);}

    document.getElementById('resultHero').textContent=heroPercent.toFixed(1)+'%';
    document.getElementById('resultOpponent').textContent=oppPercent.toFixed(1)+'%';
    document.getElementById('resultTie').textContent=tiePercent.toFixed(1)+'%';
    hasCalculatedResults=true;
    isCalculating=false;
    updateStatus();
}

// --- Прочие функции ---
function getHandCardsCount(){return Array.from(selectedCards.keys()).filter(k=>k.startsWith('hero')).length;}
function getBoardCardsCount(){return Array.from(selectedCards.keys()).filter(k=>k.startsWith('board')).length;}
function activateBlockBySlotId(slotId){if(slotId.startsWith('hero')) selectHandBlock(); else if(slotId.startsWith('board')) selectBoardBlock();}
function selectHandBlock(){activeBlock='hand';updateActiveSection('handSection','handTitle');}
function selectBoardBlock(){activeBlock='board';updateActiveSection('boardSection','boardTitle');}
function updateActiveSection(sectionId,titleId){['handSection','boardSection'].forEach(id=>document.getElementById(id).classList.remove('active'));['handTitle','boardTitle'].forEach(id=>document.getElementById(id).classList.remove('active'));document.getElementById(sectionId).classList.add('active');document.getElementById(titleId).classList.add('active');}
function setOpponents(count){opponentsCount=count;document.querySelectorAll('.opponent-pill').forEach(pill=>pill.classList.toggle('active',parseInt(pill.dataset.opponents)===count));resetResults();}
function checkAndSwitchActiveBlock(){const hc=getHandCardsCount(),bc=getBoardCardsCount();if(activeBlock==='hand' && hc>=2 && bc<5) selectBoardBlock();else if(activeBlock==='board' && bc>=5 && hc<2) selectHandBlock();}
function resetResults(){if(hasCalculatedResults){document.getElementById('resultHero').textContent='—';document.getElementById('resultOpponent').textContent='—';document.getElementById('resultTie').textContent='—';hasCalculatedResults=false;}}
function handleCardClick(cardCode){if(usedCards.has(cardCode)) return;activeBlock==='hand'?addCardToHand(cardCode):addCardToBoard(cardCode);}
function addCardToHand(cardCode){if(getHandCardsCount()<2){for(let i=1;i<=2;i++){const s=`hero-${i}`;if(!selectedCards.has(s)){addCardToSlot(cardCode,s);if(getHandCardsCount()>=2 && getBoardCardsCount()<5) selectBoardBlock();return;}}} else addCardToBoard(cardCode);}
function addCardToBoard(cardCode){if(getBoardCardsCount()<5){for(let i=1;i<=5;i++){const s=`board-${i}`;if(!selectedCards.has(s)){addCardToSlot(cardCode,s);if(getBoardCardsCount()>=5 && getHandCardsCount()<2) selectHandBlock();return;}}} else addCardToHand(cardCode);}
function moveCardBetweenSlots(from,to){if(!selectedCards.has(from)) return;const c=selectedCards.get(from);resetResults();if(selectedCards.has(to)){const temp=selectedCards.get(to);selectedCards.set(to,c);selectedCards.set(from,temp);}else{selectedCards.set(to,c);selectedCards.delete(from);}activateBlockBySlotId(to);updateCardDisplay();updateStatus();checkBoardValidity();checkHandValidity();checkAndSwitchActiveBlock();}
function clearAll(){selectedCards.clear();usedCards.clear();resetResults();updateCardDisplay();updateStatus();checkBoardValidity();checkHandValidity();}
