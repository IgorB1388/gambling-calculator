document.addEventListener('DOMContentLoaded', () => {
    const deck = document.getElementById('deck');
    deck.style.border = '5px solid red';

    for (let i = 0; i < 10; i++) {
        const d = document.createElement('div');
        d.textContent = 'CARD';
        d.style.background = 'white';
        d.style.color = 'black';
        d.style.padding = '20px';
        deck.appendChild(d);
    }
});
