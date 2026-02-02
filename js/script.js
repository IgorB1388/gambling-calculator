// ================== СОСТОЯНИЕ ==================
const cards = new Map();   // slotId -> { code }
const used  = new Set();   // code

let activeBlock = 'hero';  // hero | board

// ================== INIT ==================
document.addEventListener('DOMContentLoaded', () => {
    generateDeck();
    initBlockSelection();
    initClickPick();
    initDragDrop();
});

// ================== DECK ==================
function generateDeck() {
    const deck = document.getElementById('deck');
    const suits = [
        {s:'♠', c:'black'},
        {s:'♥', c:'red'},
        {s:'♣', c:'black'},
        {s:'♦', c:'red'}
    ];
    const values = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];

    deck.innerHTML = '';

    suits.forEach(suit => {
        values.forEach(val => {
            const code = val + suit.s;

            const card = document.createElement('div');
            card.className = `deck-card ${suit.c}`;
            card.draggable = true;
            card.dataset.card = code;

            card.innerHTML = `
                <div class="card-face">
                    <div class="card-value">${val}</div>
                    <div class="card-suit-large">${suit.s}</div>
                </div>
            `;
            deck.appendChild(card);
        });
    });
}

// ================== BLOCK SELECTION ==================
function initBlockSelection() {
    const hand = document.getElementById('handSection');
    const board = document.getElementById('boardSection');
    const label = document.getElementById('currentBlockName');

    function setActive(block) {
        activeBlock = block;
        hand.classList.toggle('active', block === 'hero');
        board.classList.toggle('active', block === 'board');
        label.textContent = block === 'hero' ? 'Ваша рука' : 'Борд';
    }

    hand.addEventListener('click', () => setActive('hero'));
    board.addEventListener('click', () => setActive('board'));

    setActive('hero');
}

// ================== CLICK PICK ==================
function initClickPick() {
    document.getElementById('deck').addEventListener('click', e => {
        const card = e.target.closest('.deck-card');
        if (!card) return;

        const code = card.dataset.card;
        if (used.has(code)) return;

        const slot = findFreeSlot(activeBlock);
        if (!slot) return;

        add(code, slot);
    });
}

// ================== SLOTS ==================
function findFreeSlot(block) {
    const slots = block === 'hero'
        ? ['hero-1', 'hero-2']
        : ['board-1', 'board-2', 'board-3', 'board-4', 'board-5'];

    return slots.find(s => !cards.has(s)) || slots[0];
}

function add(code, slot) {
    remove(slot);

    cards.set(slot, { code });
    used.add(code);

    const slotEl = document.querySelector(`[data-slot="${slot}"]`);
    slotEl.innerHTML = renderRealCard(code);
}

function remove(slot) {
    if (!cards.has(slot)) return;
    const { code } = cards.get(slot);

    cards.delete(slot);
    used.delete(code);

    const slotEl = document.querySelector(`[data-slot="${slot}"]`);
    slotEl.innerHTML = `<div class="slot-empty">+</div>`;
}

function move(from, to) {
    if (!cards.has(from)) return;
    const code = cards.get(from).code;
    remove(from);
    add(code, to);
}

// ================== CARD RENDER ==================
function renderRealCard(code) {
    const suit = code.slice(-1);
    const val = code.slice(0, -1);
    const red = suit === '♥' || suit === '♦';

    return `
        <div class="real-card ${red ? 'red' : 'black'}" draggable="true">
            <div class="card-content">
                <div>${val}</div>
                <div>${suit}</div>
            </div>
        </div>
    `;
}

// ================== DRAG & DROP ==================
function initDragDrop() {
    let dragFromSlot = null;

    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('deck-card')) {
            e.dataTransfer.setData('text', e.target.dataset.card);
            e.dataTransfer.effectAllowed = 'copy';
        }

        if (e.target.classList.contains('real-card')) {
            const slot = e.target.parentElement.dataset.slot;
            dragFromSlot = slot;
            e.dataTransfer.setData('text', JSON.stringify({
                c: cards.get(slot).code,
                s: slot
            }));
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    document.addEventListener('dragend', () => {
        dragFromSlot = null;
    });

    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', e => e.preventDefault());

        slot.addEventListener('drop', e => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text');
            if (!data) return;

            try {
                const p = JSON.parse(data);
                move(p.s, slot.dataset.slot);
            } catch {
                if (!used.has(data)) add(data, slot.dataset.slot);
            }
        });
    });

    document.getElementById('deck').addEventListener('dragover', e => e.preventDefault());

    document.getElementById('deck').addEventListener('drop', e => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text');
        if (!data) return;

        try {
            const p = JSON.parse(data);
            remove(p.s);
        } catch {}
    });
}
