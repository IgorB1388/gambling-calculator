function initDragDrop(){
    let dragFromDeck = false;
    let dragFromSlot = null;
    let dragCardData = null;
    
    // Drag start
    document.addEventListener('dragstart', function(e){
        // Карта из колоды
        if(e.target.classList.contains('deck-card') && e.target.draggable){
            dragFromDeck = true;
            dragFromSlot = null;
            dragCardData = e.target.dataset.card;
            e.dataTransfer.setData('text', dragCardData);
            e.dataTransfer.effectAllowed = 'copy';
            e.target.style.opacity = '0.5';
            
            // Подсвечиваем возможные цели
            document.getElementById('handSection').classList.add('block-highlight');
            document.getElementById('boardSection').classList.add('block-highlight');
            document.getElementById('deck').classList.remove('block-highlight');
        }
        
        // Карта из слота
        if(e.target.classList.contains('real-card')){
            dragFromDeck = false;
            const slot = e.target.parentElement;
            dragFromSlot = slot.dataset.slot;
            const card = cards.get(dragFromSlot);
            if(card){
                dragCardData = JSON.stringify({c:card.code, s:dragFromSlot});
                e.dataTransfer.setData('text', dragCardData);
                e.dataTransfer.effectAllowed = 'move';
                e.target.style.opacity = '0.5';
                
                // Подсвечиваем возможные цели
                if(dragFromSlot.startsWith('hero')){
                    // Из руки -> в борд или колоду
                    document.getElementById('boardSection').classList.add('block-highlight');
                    document.getElementById('deck').classList.add('block-highlight');
                    document.getElementById('handSection').classList.remove('block-highlight');
                } else {
                    // Из борда -> в руку или колоду
                    document.getElementById('handSection').classList.add('block-highlight');
                    document.getElementById('deck').classList.add('block-highlight');
                    document.getElementById('boardSection').classList.remove('block-highlight');
                }
            }
        }
    });
    
    // Drag end
    document.addEventListener('dragend', function(e){
        document.querySelectorAll('.deck-card, .real-card').forEach(x => x.style.opacity = '1');
        document.querySelectorAll('.card-slot').forEach(x => x.classList.remove('drag-over'));
        
        // Убираем все подсветки
        document.getElementById('handSection').classList.remove('block-highlight', 'drag-target');
        document.getElementById('boardSection').classList.remove('block-highlight', 'drag-target');
        document.getElementById('deck').classList.remove('block-highlight', 'drag-target');
        
        dragFromDeck = false;
        dragFromSlot = null;
        dragCardData = null;
    });
    
    // ========== ОБРАБОТЧИКИ ДЛЯ СЛОТОВ ==========
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', function(e){
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.classList.add('drag-over');
        });
        
        slot.addEventListener('dragleave', function(){
            this.classList.remove('drag-over');
        });
        
        slot.addEventListener('drop', function(e){
            e.preventDefault();
            this.classList.remove('drag-over');
            const data = e.dataTransfer.getData('text');
            if(!data) return;
            
            const slotId = this.dataset.slot;
            
            try {
                // Пробуем распарсить как JSON (карта из слота)
                const p = JSON.parse(data);
                if(p.s && p.s !== slotId) {
                    // Карта из слота (перемещение)
                    move(p.s, slotId);
                }
            } catch(error) {
                // Если не JSON, то это карта из колоды
                const cardCode = data;
                if(used.has(cardCode)) {
                    // Карта уже используется - можем заменить если слот занят
                    if(cards.has(slotId)) {
                        const oldCard = cards.get(slotId);
                        if(oldCard.code !== cardCode) {
                            // Заменяем карту
                            used.delete(oldCard.code);
                            add(cardCode, slotId);
                        }
                    }
                    return;
                }
                
                // Добавляем карту из колоды в слот
                if(cards.has(slotId)) {
                    // Если слот занят - заменяем карту
                    const oldCard = cards.get(slotId);
                    used.delete(oldCard.code);
                    cards.delete(slotId);
                }
                add(cardCode, slotId);
            }
        });
    });
    
    // ========== ОБРАБОТЧИКИ ДЛЯ БЛОКОВ ==========
    const handSection = document.getElementById('handSection');
    const boardSection = document.getElementById('boardSection');
    const deckSection = document.getElementById('deck');
    
    // Drop на блок РУКИ
    handSection.addEventListener('dragover', function(e){
        e.preventDefault();
        // Запрещаем если drag из руки
        if(dragFromSlot && dragFromSlot.startsWith('hero')) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('drag-target');
        this.classList.remove('block-highlight');
    });
    
    handSection.addEventListener('dragleave', function(e){
        if(!this.contains(e.relatedTarget)){
            this.classList.remove('drag-target');
        }
    });
    
    handSection.addEventListener('drop', function(e){
        e.preventDefault();
        this.classList.remove('drag-target', 'block-highlight');
        
        const data = e.dataTransfer.getData('text');
        if(!data) return;
        
        // Находим первый свободный слот в руке
        let freeSlot = ['hero-1', 'hero-2'].find(slot => !cards.has(slot));
        if(!freeSlot) {
            // Если нет свободных слотов, берем первый слот
            freeSlot = 'hero-1';
        }
        
        try {
            const p = JSON.parse(data);
            if(p.s) {
                // Карта из другого слота
                if(p.s !== freeSlot) {
                    move(p.s, freeSlot);
                }
            }
        } catch(error) {
            // Карта из колоды
            const cardCode = data;
            if(!used.has(cardCode)) {
                if(cards.has(freeSlot)) {
                    const oldCard = cards.get(freeSlot);
                    used.delete(oldCard.code);
                }
                add(cardCode, freeSlot);
            } else if(cards.has(freeSlot)) {
                // Карта уже используется - заменяем
                const oldCard = cards.get(freeSlot);
                if(oldCard.code !== cardCode) {
                    used.delete(oldCard.code);
                    add(cardCode, freeSlot);
                }
            }
        }
    });
    
    // Drop на блок БОРДА
    boardSection.addEventListener('dragover', function(e){
        e.preventDefault();
        // Запрещаем если drag из борда
        if(dragFromSlot && dragFromSlot.startsWith('board')) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('drag-target');
        this.classList.remove('block-highlight');
    });
    
    boardSection.addEventListener('dragleave', function(e){
        if(!this.contains(e.relatedTarget)){
            this.classList.remove('drag-target');
        }
    });
    
    boardSection.addEventListener('drop', function(e){
        e.preventDefault();
        this.classList.remove('drag-target', 'block-highlight');
        
        const data = e.dataTransfer.getData('text');
        if(!data) return;
        
        // Находим первый свободный слот в борде
        let freeSlot = ['board-1', 'board-2', 'board-3', 'board-4', 'board-5']
            .find(slot => !cards.has(slot));
        if(!freeSlot) {
            // Если нет свободных слотов, берем первый слот
            freeSlot = 'board-1';
        }
        
        try {
            const p = JSON.parse(data);
            if(p.s) {
                if(p.s !== freeSlot) {
                    move(p.s, freeSlot);
                }
            }
        } catch(error) {
            const cardCode = data;
            if(!used.has(cardCode)) {
                if(cards.has(freeSlot)) {
                    const oldCard = cards.get(freeSlot);
                    used.delete(oldCard.code);
                }
                add(cardCode, freeSlot);
            } else if(cards.has(freeSlot)) {
                const oldCard = cards.get(freeSlot);
                if(oldCard.code !== cardCode) {
                    used.delete(oldCard.code);
                    add(cardCode, freeSlot);
                }
            }
        }
    });
    
    // Drop на КОЛОДУ (возврат карты)
    deckSection.addEventListener('dragover', function(e){
        e.preventDefault();
        // Разрешаем только если drag НЕ из колоды
        if(dragFromDeck) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('drag-target');
        this.classList.remove('block-highlight');
    });
    
    deckSection.addEventListener('dragleave', function(e){
        if(!this.contains(e.relatedTarget)){
            this.classList.remove('drag-target');
        }
    });
    
    deckSection.addEventListener('drop', function(e){
        e.preventDefault();
        this.classList.remove('drag-target', 'block-highlight');
        
        const data = e.dataTransfer.getData('text');
        if(!data) return;
        
        try {
            const p = JSON.parse(data);
            if(p.s) {
                // Удаляем карту из слота (возвращаем в колоду)
                remove(p.s);
            }
        } catch(error) {
            // Карта из колоды - ничего не делаем
        }
    });
}
