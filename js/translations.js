// translations.js
const translations = {
    ru: {
        // Заголовок
        title: "POKER CALCULATOR",
        
        // Панель руки и борда
        panelHandBoard: "ВАША РУКА И БОРД",
        yourHand: "⭐ ВАША РУКА",
        handSubtitle: "2 карты",
        handWarning: "⚠️ В руке должно быть 2 карты",
        
        board: "🎴 БОРД",
        boardSubtitle: "0, 3, 4 или 5 карт",
        boardWarning: "⚠️ На борде должно быть 0, 3, 4 или 5 карт",
        
        // Панель настроек
        panelSettings: "⚙️ НАСТРОЙКИ",
        opponentsLabel: "КОЛИЧЕСТВО ОППОНЕНТОВ:",
        activeSelection: "Активно",
        yourHandText: "Ваша рука",
        boardText: "Борд",
        opponentsText: "Оппонентов",
        
        // Панель выбора карт
        panelChooseCards: "🃏 ВЫБЕРИТЕ КАРТЫ",
        dropHint: "Кликните на карту для выбора или перетаскивайте между слотами",
        
        // Кнопки
        calculateBtn: "🎯 РАССЧИТАТЬ",
        clearBtn: "🗑️ ОЧИСТИТЬ",
        
        // Прогресс
        calculating: "Идет расчет",
        calculationComplete: "Расчет завершен!",
        
        // Результаты
        panelResults: "📊 РЕЗУЛЬТАТЫ (Monte Carlo)",
        yourHandResult: "ВАША РУКА",
        opponentsResult: "ОППОНЕНТЫ",
        tieResult: "НИЧЬЯ",
        splitPot: "Раздел банка",
        
        // Описания
        headsUp: "Хедз 1 на 1",
        opponentSingle: "оппонент",
        opponentFew: "оппонента",
        opponentMany: "оппонентов",
        
        // Комбинации
        preflop: "Префлоп",
        highCard: "Старшая карта",
        pair: "Пара",
        twoPair: "Две пары",
        threeOfAKind: "Сет",
        straight: "Стрит",
        flush: "Флеш",
        fullHouse: "Фулл-хаус",
        fourOfAKind: "Каре",
        straightFlush: "Стрит-флеш",
        royalFlush: "Роял-флеш",
        unknownCombo: "Неизвестная комбинация"
    },

    en: {
        // Header
        title: "POKER CALCULATOR",
        
        // Hand and board panel
        panelHandBoard: "YOUR HAND AND BOARD",
        yourHand: "⭐ YOUR HAND",
        handSubtitle: "2 cards",
        handWarning: "⚠️ Hand must have 2 cards",
        
        board: "🎴 BOARD",
        boardSubtitle: "0, 3, 4 or 5 cards",
        boardWarning: "⚠️ Board must have 0, 3, 4 or 5 cards",
        
        // Settings panel
        panelSettings: "⚙️ SETTINGS",
        opponentsLabel: "NUMBER OF OPPONENTS:",
        activeSelection: "Active",
        yourHandText: "Your hand",
        boardText: "Board",
        opponentsText: "Opponents",
        
        // Choose cards panel
        panelChooseCards: "🃏 CHOOSE CARDS",
        dropHint: "Click to select or drag between slots",
        
        // Buttons
        calculateBtn: "🎯 CALCULATE",
        clearBtn: "🗑️ CLEAR ALL",
        
        // Progress
        calculating: "Calculating",
        calculationComplete: "Calculation complete!",
        
        // Results
        panelResults: "📊 RESULTS (Monte Carlo)",
        yourHandResult: "YOUR HAND",
        opponentsResult: "OPPONENTS",
        tieResult: "TIE",
        splitPot: "Split pot",
        
        // Descriptions
        headsUp: "Heads up 1 vs 1",
        opponentSingle: "opponent",
        opponentFew: "opponents",
        opponentMany: "opponents",
        
        // Hand combinations
        preflop: "Preflop",
        highCard: "High card",
        pair: "Pair",
        twoPair: "Two pair",
        threeOfAKind: "Three of a kind",
        straight: "Straight",
        flush: "Flush",
        fullHouse: "Full house",
        fourOfAKind: "Four of a kind",
        straightFlush: "Straight flush",
        royalFlush: "Royal flush",
        unknownCombo: "Unknown combination"
    },

    es: {
        // Encabezado
        title: "CALCULADORA DE PÓKER",
        
        // Panel de mano y mesa
        panelHandBoard: "TU MANO Y LA MESA",
        yourHand: "⭐ TU MANO",
        handSubtitle: "2 cartas",
        handWarning: "⚠️ La mano debe tener 2 cartas",
        
        board: "🎴 MESA",
        boardSubtitle: "0, 3, 4 o 5 cartas",
        boardWarning: "⚠️ La mesa debe tener 0, 3, 4 o 5 cartas",
        
        // Panel de ajustes
        panelSettings: "⚙️ AJUSTES",
        opponentsLabel: "NÚMERO DE OPONENTES:",
        activeSelection: "Activo",
        yourHandText: "Tu mano",
        boardText: "Mesa",
        opponentsText: "Oponentes",
        
        // Panel de selección de cartas
        panelChooseCards: "🃏 ELIGE CARTAS",
        dropHint: "Haz clic para seleccionar o arrastra entre ranuras",
        
        // Botones
        calculateBtn: "🎯 CALCULAR",
        clearBtn: "🗑️ LIMPIAR TODO",
        
        // Progreso
        calculating: "Calculando",
        calculationComplete: "¡Cálculo completado!",
        
        // Resultados
        panelResults: "📊 RESULTADOS (Monte Carlo)",
        yourHandResult: "TU MANO",
        opponentsResult: "OPONENTES",
        tieResult: "EMPATE",
        splitPot: "Bote dividido",
        
        // Descripciones
        headsUp: "Cara a cara 1 vs 1",
        opponentSingle: "oponente",
        opponentFew: "oponentes",
        opponentMany: "oponentes",
        
        // Combinaciones de mano
        preflop: "Preflop",
        highCard: "Carta alta",
        pair: "Pareja",
        twoPair: "Doble pareja",
        threeOfAKind: "Trío",
        straight: "Escalera",
        flush: "Color",
        fullHouse: "Full house",
        fourOfAKind: "Póker",
        straightFlush: "Escalera de color",
        royalFlush: "Escalera real de color",
        unknownCombo: "Combinación desconocida"
    }
};

// Названия языков для отображения в переключателе
const languageNames = {
    ru: "Русский",
    en: "English", 
    es: "Español"
};

// Символы флагов для кнопок
const languageFlags = {
    ru: "🇷🇺",
    en: "🇬🇧",
    es: "🇪🇸"
};

// Коды языков
const supportedLanguages = ['ru', 'en', 'es'];
