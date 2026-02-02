let active='hand', cards=new Map(), used=new Set(), opponents=1, calculating=false;
const ranks={'2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12};
const suits={'s':0,'h':1,'c':2,'d':3};
const HandEvaluator={
    eval(cards){
        const f=cards.map(c=>({r:ranks[c.v],s:suits[c.s]}));
        f.sort((a,b)=>b.r-a.r);
        const fl=this.flush(f),st=this.straight(f);
        if(fl&&st){const sv=this.straightVal(f);if(sv===12)return 9<<20;return (8<<20)+(sv<<16);}
        const cnt=this.counts(f),vals=Object.values(cnt).sort((a,b)=>b-a);
        if(vals[0]===4){const q=this.rankOf(cnt,4),k=this.kickers(f,[q],1);return (7<<20)+(q<<16)+(k[0]<<12);}
        if(vals[0]===3&&vals[1]>=2){const t=this.rankOf(cnt,3),p=this.rankOf(cnt,2,t);return (6<<20)+(t<<16)+(p<<12);}
        if(fl){const fc=this.flushCards(f);return (5<<20)+this.handVal(fc.slice(0,5));}
        if(st){return (4<<20)+(this.straightVal(f)<<16);}
        if(vals[0]===3){const t=this.rankOf(cnt,3),k=this.kickers(f,[t],2);return (3<<20)+(t<<16)+(k[0]<<12)+(k[1]<<8);}
        if(vals[0]===2&&vals[1]===2){const p=this.ranksOf(cnt,2);p.sort((a,b)=>b-a);const k=this.kickers(f,p,1)[0];return (2<<20)+(p[0]<<16)+(p[1]<<12)+(k<<8);}
        if(vals[0]===2){const p=this.rankOf(cnt,2),k=this.kickers(f,[p],3);return (1<<20)+(p<<16)+(k[0]<<12)+(k[1]<<8)+(k[2]<<4);}
        return this.handVal(f.slice(0,5));
    },
    flush(c){let s=[0,0,0,0];c.forEach(x=>s[x.s]++);return s.some(x=>x>=5);},
    straight(c){let u=[...new Set(c.map(x=>x.r))];u.sort((a,b)=>b-a);
        for(let i=0;i<=u.length-5;i++)if(u[i]-u[i+4]===4)return true;
        if(u.includes(12)&&[0,1,2,3].every(r=>u.includes(r)))return true;
        return false;
    },
    straightVal(c){let u=[...new Set(c.map(x=>x.r))];u.sort((a,b)=>b-a);
        for(let i=0;i<=u.length-5;i++)if(u[i]-u[i+4]===4)return u[i];
        if(u.includes(12)&&[0,1,2,3].every(r=>u.includes(r)))return 3;
        return -1;
    },
    counts(c){let o={};c.forEach(x=>{o[x.r]=(o[x.r]||0)+1;});return o;},
    rankOf(cnt,target,exclude=-1){for(const[r,c]of Object.entries(cnt)){const rn=parseInt(r);if(c===target&&rn!==exclude)return rn;}return -1;},
    ranksOf(cnt,target){let res=[];for(const[r,c]of Object.entries(cnt))if(c===target)res.push(parseInt(r));return res;},
    kickers(c,exclude,count){let k=c.filter(x=>!exclude.includes(x.r)).map(x=>x.r).sort((a,b)=>b-a).slice(0,count);while(k.length<count)k.push(0);return k;},
    flushCards(c){let s=[0,0,0,0];c.forEach(x=>s[x.s]++);const fs=s.findIndex(x=>x>=5);return c.filter(x=>x.s===fs).sort((a,b)=>b.r-a.r).slice(0,5);},
    handVal(c){let v=0;c.forEach((x,i)=>{v+=x.r<<(4*(4-i));});return v;}
};

document.addEventListener('DOMContentLoaded',()=>{
    createDeck();
    document.getElementById('handSection').onclick=()=>select('hand');
    document.getElementById('boardSection').onclick=()=>select('board');
    document.getElementById('calculateBtn').onclick=calculate;
    document.getElementById('clearAllBtn').onclick=clear;
    document.querySelectorAll('.opponent-pill').forEach(p=>p.onclick=()=>setOpp(parseInt(p.dataset.opponents)));
    document.querySelectorAll('.card-slot').forEach(s=>{
        s.onclick=function(e){
            if(e.target.classList.contains('slot-empty')||e.target.classList.contains('remove-hint'))return;
            const realCard=e.target.closest?e.target.closest('.real-card'):e.target.parentElement.closest('.real-card');
            if(realCard)remove(this.dataset.slot);
        };
    });
    initDragDrop();
    select('hand');
});

function createDeck(){
    const d=document.getElementById('deck');
    d.innerHTML='';
    const suits=[{c:'s',s:'♠',cl:'black'},{c:'h',s:'♥',cl:'red'},{c:'c',s:'♣',cl:'black'},{c:'d',s:'♦',cl:'red'}];
    const vals=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    
    suits.forEach(suit=>vals.forEach(v=>{
        const code=v+suit.c,card=document.createElement('div');
        card.className=`deck-card ${suit.cl}`;
        card.dataset.card=code;
        card.draggable=true;
        card.innerHTML=`<div class="card-face"><div class="card-value">${v}</div><div class="card-suit-large">${suit.s}</div></div>`;
        
        // ИСПРАВЛЕНО: без closest
        card.onclick=function(){
            if(!this.classList.contains('selected'))cardClick(code);
        };
        
        d.appendChild(card);
    }));
}

function initDragDrop(){
    document.addEventListener('dragstart',e=>{
        const dc=e.target.closest?e.target.closest('.deck-card'):e.target;
        if(dc&&dc.draggable){e.dataTransfer.setData('text',dc.dataset.card);e.dataTransfer.effectAllowed='copyMove';dc.style.opacity='0.5';return;}
        const rc=e.target.closest?e.target.closest('.real-card'):e.target;
        if(rc&&rc.classList.contains('real-card')){
            const s=rc.parentElement,id=s.dataset.slot,c=cards.get(id);
            if(c){e.dataTransfer.setData('text',JSON.stringify({c:c.code,s:id}));e.dataTransfer.effectAllowed='move';rc.style.opacity='0.5';}
        }
    });
    
    document.addEventListener('dragend',()=>{
        document.querySelectorAll('.deck-card, .real-card').forEach(x=>x.style.opacity='1');
        document.querySelectorAll('.card-slot').forEach(x=>x.classList.remove('drag-over'));
        document.getElementById('deck').classList.remove('deck-highlight');
    });
    
    // Drop в слоты
    document.querySelectorAll('.card-slot').forEach(slot=>{
        slot.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';slot.classList.add('drag-over');};
        slot.ondragleave=()=>slot.classList.remove('drag-over');
        slot.ondrop=e=>{e.preventDefault();slot.classList.remove('drag-over');
            const data=e.dataTransfer.getData('text');
            if(!data)return;
            const sid=slot.dataset.slot;
            try{
                const p=JSON.parse(data);
                if(p.s&&p.s!==sid)move(p.s,sid);
            }catch{
                const cardCode=data;
                if(used.has(cardCode))return;
                if(cards.has(sid)){
                    const oldCard=cards.get(sid);
                    used.delete(oldCard.code);
                    cards.delete(sid);
                }
                add(cardCode,sid);
            }
        };
    });
    
    // Drop на колоду (только для возврата карт)
    const dg=document.getElementById('deck');
    dg.ondragover=e=>{
        e.preventDefault();
        const data=e.dataTransfer.getData('text');
        if(!data)return;
        try{
            const p=JSON.parse(data);
            if(p.s){e.dataTransfer.dropEffect='move';dg.classList.add('deck-highlight');}
        }catch{}
    };
    dg.ondragleave=()=>dg.classList.remove('deck-highlight');
    dg.ondrop=e=>{
        e.preventDefault();
        dg.classList.remove('deck-highlight');
        const data=e.dataTransfer.getData('text');
        if(!data)return;
        try{
            const p=JSON.parse(data);
            if(p.s)remove(p.s);
        }catch{}
    };
}

function move(from,to){
    if(!cards.has(from))return;
    const card=cards.get(from);
    if(cards.has(to)){
        const temp=cards.get(to);
        cards.set(to,card);
        cards.set(from,temp);
    }else{
        cards.set(to,card);
        cards.delete(from);
    }
    updateUI();checkAll();
}

function select(block){
    active=block;
    document.getElementById('handSection').classList.toggle('active',block==='hand');
    document.getElementById('boardSection').classList.toggle('active',block==='board');
    document.getElementById('handTitle').classList.toggle('active',block==='hand');
    document.getElementById('boardTitle').classList.toggle('active',block==='board');
    document.getElementById('currentBlockName').textContent=block==='hand'?'Ваша рука':'Борд';
}

function cardClick(code){
    if(used.has(code))return;
    if(active==='hand'){
        if(handCount()<2)addCard(code,'hand');
        else addCard(code,'board');
    }else{
        if(boardCount()<5)addCard(code,'board');
        else{
            if(handCount()<2)addCard(code,'hand');
            else return;
        }
    }
}

function handCount(){return Array.from(cards.keys()).filter(s=>s.startsWith('hero')).length;}
function boardCount(){return Array.from(cards.keys()).filter(s=>s.startsWith('board')).length;}

function addCard(code,type=null){
    const t=type||active;
    const slots=t==='hand'?['hero-1','hero-2']:['board-1','board-2','board-3','board-4','board-5'];
    let free=slots.find(s=>!cards.has(s));
    if(!free){
        const other=t==='hand'?['board-1','board-2','board-3','board-4','board-5']:['hero-1','hero-2'];
        free=other.find(s=>!cards.has(s));
        if(free){active=t==='hand'?'board':'hand';select(active);}
        else return;
    }
    add(code,free);
}

function add(code,slot){
    const v=code.slice(0,-1),s=code.slice(-1);
    const suit=s==='h'?'♥':s==='d'?'♦':s==='s'?'♠':'♣';
    cards.set(slot,{code:v+s,v:v,s:suit,sc:s,r:ranks[v]});
    used.add(code);
    updateUI();checkAll();
    if(slot.startsWith('hero')&&handCount()>=2){setTimeout(()=>{if(active==='hand')select('board');},100);}
    else if(slot.startsWith('board')&&boardCount()>=5){setTimeout(()=>{if(active==='board')select('hand');},100);}
}

function remove(slot){
    const c=cards.get(slot);
    if(c){used.delete(c.code);cards.delete(slot);updateUI();checkAll();}
}

function updateUI(){
    document.querySelectorAll('.card-slot').forEach(s=>{
        const id=s.dataset.slot,c=cards.get(id);
        if(c){
            const red=c.s==='♥'||c.s==='♦';
            s.innerHTML=`<div class="real-card ${red?'red':'black'}" draggable="true"><div class="card-content">${c.v}<br>${c.s}</div></div><div class="remove-hint">клик для удаления</div>`;
        }else s.innerHTML='<div class="slot-empty">+</div><div class="remove-hint">клик для удаления</div>';
    });
    document.querySelectorAll('.deck-card').forEach(dc=>{
        const is=used.has(dc.dataset.card);
        dc.classList.toggle('selected',is);
        dc.draggable=!is;
    });
}

function checkAll(){
    const hc=handCount(),bc=boardCount();
    document.getElementById('handWarning').style.display=hc===2?'none':'block';
    document.getElementById('boardWarning').style.display=(bc===0||bc===3||bc===4||bc===5)?'none':'block';
    document.getElementById('calculateBtn').disabled=calculating||hc!==2||!(bc===0||bc===3||bc===4||bc===5);
}

function setOpp(cnt){
    opponents=cnt;
    document.querySelectorAll('.opponent-pill').forEach(p=>p.classList.toggle('active',parseInt(p.dataset.opponents)===cnt));
    document.getElementById('currentOpponents').textContent=cnt;
}

async function calculate(){
    if(calculating)return;
    const hero=Array.from(cards.entries()).filter(([s])=>s.startsWith('hero')).map(([,c])=>c);
    const board=Array.from(cards.entries()).filter(([s])=>s.startsWith('board')).map(([,c])=>c);
    if(handCount()!==2||!(boardCount()===0||boardCount()===3||boardCount()===4||boardCount()===5))return;
    
    calculating=true;
    document.getElementById('calculateBtn').disabled=true;
    document.getElementById('progressContainer').style.display='block';
    document.getElementById('resultsPanel').style.display='block';
    
    const SIM=10000;
    let hw=0,ow=0,ties=0;
    let deck=fullDeck().filter(c=>!used.has(c.code));
    const pf=document.getElementById('progressFill'),pt=document.getElementById('progressText');
    
    for(let i=0;i<SIM;i++){
        if(i%200===0){
            const p=Math.round((i/SIM)*100);
            pf.style.width=p+'%';
            pt.textContent=`Идет расчет: ${p}%`;
            await new Promise(r=>setTimeout(r,0));
        }
        const d=[...deck].sort(()=>Math.random()-0.5);
        const fb=[...board];
        while(fb.length<5)fb.push(d.pop());
        const oh=[];
        for(let j=0;j<opponents;j++)oh.push([d.pop(),d.pop()]);
        const hs=HandEvaluator.eval([...hero,...fb]);
        const os=oh.map(h=>HandEvaluator.eval([...h,...fb]));
        const best=Math.max(...os);
        if(hs>best)hw++;else if(hs<best)ow++;else ties++;
    }
    
    pf.style.width='100%';
    pt.textContent='Расчет завершен!';
    document.getElementById('resultHero').textContent=(hw/SIM*100).toFixed(1)+'%';
    document.getElementById('resultOpponent').textContent=(ow/SIM*100).toFixed(1)+'%';
    document.getElementById('resultTie').textContent=(ties/SIM*100).toFixed(1)+'%';
    document.getElementById('heroHandDesc').textContent=describe(hero,board);
    const pl=opponents===1?'':opponents>=2&&opponents<=4?'а':'ов';
    document.getElementById('opponentInfo').textContent=opponents===1?"Хедз-ап (1 на 1)":`${opponents} оппонент${pl}`;
    document.getElementById('resultsPanel').scrollIntoView({behavior:'smooth'});
    
    setTimeout(()=>{
        document.getElementById('progressContainer').style.display='none';
        calculating=false;
        checkAll();
    },1000);
}

function fullDeck(){
    const ss=['s','h','c','d'];
    const vs=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let d=[];
    ss.forEach(s=>vs.forEach(v=>{
        const suit=s==='h'?'♥':s==='d'?'♦':s==='s'?'♠':'♣';
        d.push({code:v+s,v:v,s:suit,sc:s,r:ranks[v]});
    }));
    return d;
}

function describe(hero,board){
    if(board.length===0)return"Префлоп";
    const all=[...hero,...board];
    const sc=HandEvaluator.eval(all);
    const hr=sc>>20;
    switch(hr){
        case 9:return"Роял-флеш";case 8:return"Стрит-флеш";case 7:return"Каре";case 6:return"Фулл-хаус";
        case 5:return"Флеш";case 4:return"Стрит";case 3:return"Сет";case 2:return"Две пары";
        case 1:return"Пара";default:return"Старшая карта";
    }
}

function clear(){
    cards.clear();used.clear();active='hand';
    updateUI();select('hand');
    document.getElementById('resultsPanel').style.display='none';
    document.getElementById('progressContainer').style.display='none';
}

document.addEventListener('keydown',e=>{
    if(e.key==='Escape')clear();
    if(e.key==='1')select('hand');
    if(e.key==='2')select('board');
    if((e.key==='Enter'||e.key===' ')&&!document.getElementById('calculateBtn').disabled)calculate();
    if(e.key>='1'&&e.key<='9')setOpp(parseInt(e.key));
});
