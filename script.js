let soundEnabled = true;
let audioContext = null;
let screenTransitionNumber = 0;
let audioInitialized = false;
let audioErrorCount = 0;
let confettiElements = []; // מעקב אחר אלמנטי confetti

// אפקטי חלקיקים
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            left: ${x}px;
            top: ${y}px;
        `;
        
        document.body.appendChild(particle);
        
        const angle = (Math.PI * 2 * i) / count;
        const velocity = 50 + Math.random() * 50;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
        ], {
            duration: 800 + Math.random() * 400,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => particle.remove();
    }
}

// עדכון מחוון עגול
function updateCircularProgress() {
    const circle = document.getElementById('progress-circle');
    const text = document.getElementById('progress-text');
    if (!circle || !text) return;
    
    const progress = (gameState.currentQuestion + 1) / getTotalQuestions();
    const circumference = 2 * Math.PI * 26;
    const offset = circumference - (progress * circumference);
    
    circle.style.strokeDashoffset = offset;
    text.textContent = `${gameState.currentQuestion + 1}/40`;
}

// אנימציות כפתורים עם פידבק
function animateButtonSuccess(button) {
    button.classList.add('btn-feedback-success');
    const rect = button.getBoundingClientRect();
    createParticles(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        '#4CAF50',
        8
    );
    setTimeout(() => button.classList.remove('btn-feedback-success'), 600);
}

function animateButtonError(button) {
    button.classList.add('btn-feedback-error');
    const rect = button.getBoundingClientRect();
    createParticles(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        '#f44336',
        6
    );
    setTimeout(() => button.classList.remove('btn-feedback-error'), 600);
}

// אייקונים חכמים לשאלות - מותאמים לתוכן השאלה
function getQuestionIcon(questionText) {
    const text = questionText.toLowerCase();
    
    // אייקונים ספציפיים לפי תוכן השאלה
    if (text.includes('קפה')) return '☕';
    if (text.includes('דייט')) return '💕';
    if (text.includes('סרט') || text.includes('קולנוע')) return '🎬';
    if (text.includes('אוכל') || text.includes('מסעדה') || text.includes('טייקאווי') || text.includes('משלוח')) return '🍽️';
    if (text.includes('טלפון') || text.includes('הודעה')) return '📱';
    if (text.includes('בית') || text.includes('ישנתם')) return '🏠';
    if (text.includes('ספורט') || text.includes('פעילות ספורטיבית')) return '🏃‍♂️';
    if (text.includes('חג') || text.includes('יום הולדת') || text.includes('ערב חג')) return '🍷';
    if (text.includes('מתנה')) return '🎁';
    if (text.includes('נסיעה') || text.includes('מונית') || text.includes('אוטובוס')) return '🚗';
    if (text.includes('חברים') || text.includes('משפחה')) return '👨‍👩‍👧‍👦';
    if (text.includes('חברים משותפים')) return '👥';
    if (text.includes('חופשה')) return '✈️';
    if (text.includes('יום האהבה') || text.includes('ולנטיין')) return '💘';
    if (text.includes('נשיקה') || text.includes('רומנטי')) return '💋';
    if (text.includes('ביחד') || text.includes('משותף')) return '💑';
    if (text.includes('סדרה') || text.includes('טלוויזיה')) return '📺';
    if (text.includes('חנות') || text.includes('קניות')) return '🛍️';
    if (text.includes('זוגיות') || text.includes('אהבה')) return '❤️';
    if (text.includes('מי התחיל עם מי')) return '💏';
    
    // אייקונים לפי סוג השאלה
    if (text.startsWith('איפה')) return '📍';
    if (text.startsWith('מתי')) return '⏰';
    if (text.startsWith('מה')) return '❓';
    if (text.startsWith('מי')) return '👤';
    if (text.startsWith('איך')) return '🤔';
    if (text.startsWith('איזה') || text.startsWith('איזו')) return '🔍';
    
    // ברירת מחדל
    return '💭';
}

// שמירה ב-localStorage (עם try-catch למקרה שלא זמין)
function saveToLocalStorage(key, value) {
    try {
        if (typeof Storage !== 'undefined') {
            localStorage.setItem('memoryGame_' + key, JSON.stringify(value));
        }
    } catch (e) {
        console.warn('לא ניתן לשמור נתונים:', e);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        if (typeof Storage !== 'undefined') {
            const stored = localStorage.getItem('memoryGame_' + key);
            if (stored) {
                return JSON.parse(stored);
            }
        }
    } catch (e) {
        console.warn('לא ניתן לטעון נתונים:', e);
    }
    return defaultValue;
}

// אתחול אודיו - רק אחרי אינטראקציה של המשתמש
function initializeAudio() {
    if (audioInitialized) return;
    
    try {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioInitialized = true;
            
            // במובייל, AudioContext נוצר ב-suspended state
            if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
                audioContext.resume().then(() => {
                    console.log('Audio context resumed');
                }).catch(e => {
                    console.warn('Failed to resume audio context:', e);
                });
            }
        } else {
            throw new Error('Web Audio API not supported');
        }
    } catch (e) {
        console.warn('Web Audio API not supported:', e);
        soundEnabled = false;
        updateSoundButton();
    }
}

// אתחול אודיו בהקלקה הראשונה
function ensureAudioReady() {
    if (!audioInitialized && soundEnabled) {
        initializeAudio();
    }
    
    if (audioContext && audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
        audioContext.resume().catch(e => {
            console.warn('Failed to resume audio:', e);
        });
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!soundEnabled) return;
    
    // ודא שהאודיו מוכן
    ensureAudioReady();
    
    if (!audioContext || audioContext.state === 'closed') {
        console.warn('Audio context not available');
        return;
    }
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
        
        // איפוס מונה השגיאות בהצלחה
        audioErrorCount = 0;
        
    } catch (e) {
        console.warn('Error playing sound:', e);
        audioErrorCount++;
        
        // אם יש יותר מדי שגיאות, כבה צלילים אוטומטית
        if (audioErrorCount > 3) {
            soundEnabled = false;
            updateSoundButton();
            console.warn('Too many audio errors, disabling sound');
        }
    }
}

function playButtonClick() {
    playTone(800, 0.1, 'square', 0.05);
    // הוספת haptic feedback למובייל
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function playSuccess() {
    setTimeout(() => playTone(523.25, 0.15), 0);    // C5
    setTimeout(() => playTone(659.25, 0.15), 100);  // E5
    setTimeout(() => playTone(783.99, 0.3), 200);   // G5
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

function playError() {
    playTone(220, 0.3, 'sawtooth', 0.1);
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
}

function playTransition() {
    const transitions = [
        () => {
            playTone(440, 0.1);
            setTimeout(() => playTone(554.37, 0.1), 100);
        },
        () => {
            playTone(659.25, 0.15);
            setTimeout(() => playTone(783.99, 0.15), 100);
        },
        () => {
            playTone(523.25, 0.1);
            setTimeout(() => playTone(659.25, 0.1), 80);
            setTimeout(() => playTone(783.99, 0.1), 160);
        }
    ];
    
    transitions[screenTransitionNumber % transitions.length]();
    screenTransitionNumber++;
}

function playCountdown() {
    playTone(800, 0.2, 'square', 0.08);
}

function playVictory() {
    const melody = [523.25, 659.25, 783.99, 1046.5]; // C-E-G-C
    melody.forEach((freq, index) => {
        setTimeout(() => playTone(freq, 0.3), index * 150);
    });
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
    }
}

function updateSoundButton() {
    const soundBtn = document.getElementById('sound-toggle');
    if (!soundBtn) return;
    
    if (soundEnabled) {
        soundBtn.textContent = '🔊';
        soundBtn.classList.remove('muted');
        soundBtn.title = 'כבה צלילים';
        soundBtn.setAttribute('aria-label', 'כבה צלילים');
        soundBtn.setAttribute('aria-pressed', 'true');
    } else {
        soundBtn.textContent = '🔇';
        soundBtn.classList.add('muted');
        soundBtn.title = 'הפעל צלילים';
        soundBtn.setAttribute('aria-label', 'הפעל צלילים');
        soundBtn.setAttribute('aria-pressed', 'false');
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    saveToLocalStorage('soundEnabled', soundEnabled);
    updateSoundButton();
    
    if (soundEnabled) {
        // נסה לאתחל אודיו כשמפעילים
        initializeAudio();
        // נגן צליל בדיקה
        setTimeout(() => playButtonClick(), 100);
    }
}

// משתני המשחק
let gameState = {
    currentScreen: 0,
    currentQuestion: 0,
    currentChapter: 0,
    player1: { name: '', gender: 'male', emoji: '😊', score: 0, failures: 0, consecutiveFailures: 0 },
    player2: { name: '', gender: 'male', emoji: '😎', score: 0, failures: 0, consecutiveFailures: 0 },
    prize: '',
    sensualTasks: true,
    currentTaskIndex: 0,
    lastAction: null,
    currentTaskPlayer: null,
    hasUsedUndo: false,
    gameStartTime: null,
    statistics: {
        totalQuestions: 40,
        questionsAnswered: 0,
        timePerQuestion: []
    }
};

const chapters = [
    {
        title: "🌟 חלק 1: זיכרונות קלאסיים",
        questions: [
            "איפה היה הדייט הראשון שלכם?",
            "באיזו עיר נפגשתם בפעם הראשונה?",
            "מה הייתה המתנה הראשונה שנתתם אחד לשני?",
            "באיזה יום בשבוע היה הדייט הראשון שלכם?",
            "איפה שתיתם קפה זוגי לאחרונה מחוץ לבית?",
            "איפה חגגתם לראשונה משהו זוגי (כמו חודש, חצי שנה או יום הולדת)?"
        ]
    },
    {
        title: "⚡ חלק 2: הרגעים של עכשיו",
        questions: [
            "איפה היה הדייט האחרון שלכם מחוץ לבית שלא היה במסעדה?",
            "מתי בפעם האחרונה אמרתם \"אני אוהב/ת אותך\"?",
            "מה הייתה ההודעה האחרונה ששלחתם אחד לשני?",
            "מתי בפעם האחרונה עשיתם פעילות ספורטיבית ביחד?",
            "מה היה הסרט האחרון שראיתם יחד בקולנוע?",
            "מתי בפעם האחרונה הלכתם יחד לחנות – ואיזו חנות זו הייתה?",
            "מתי בפעם האחרונה נסעתם יחד במונית או אוטובוס – ולאן?",
            "איפה הייתם כששניכם קמתם מאוחר במיוחד?"
        ]
    },
    {
        title: "👥 חלק 3: מפגשים חברתיים",
        questions: [
            "איפה נפגשתם לראשונה עם המשפחה של PLAYER1?",
                "מתי הייתה הפעם האחרונה שנפגשתם עם חברים משותפים – ואצל מי זה היה?",
            "מתי עשיתם ערב חג ראשון אצל המשפחה של PLAYER2?",
            "איפה פגשתם לראשונה את החברים הכי קרובים של PLAYER1?",
			 "איפה נפגשתם לראשונה עם המשפחה של PLAYER2?",
            "מה היה האירוע החברתי האחרון שהייתם בו יחד – ואיפה זה היה?"
        ]
    },
    {
        title: "🔄 חלק 4: מה קרה בפעם האחרונה ש...",
        questions: [
            "איפה הייתם בפעם האחרונה שישנתם מחוץ לבית?",
            "מה היה המקום האחרון שבו אכלתם יחד בחוץ (מסעדה/בית קפה)?",
            "מה הייתה התמונה הזוגית האחרונה שצילמתם?",
			  "מי אמר \"אני אוהב/ת אותך\" בפעם האחרונה – ומתי זה היה?",
            "לאן נסעתם ביחד בפעם האחרונה?"
        ]
    },
    {
        title: "💝 חלק 5: אירועים זוגיים מיוחדים",
        questions: [
            "איפה חגגתם בפעם הראשונה יום הולדת (של אחד מכם)?",
            "איפה הייתם ביום האהבה הראשון שלכם (ולנטיין / ט\"ו באב)?",
            "מתי בפעם האחרונה עשיתם יחד יום כיף בבית? (מרתון טלוויזיה, אוכל טוב וכו')",
            "מתי הייתה הפעם האחרונה שקניתם אחד לשני מתנה שלא ליום הולדת – ומה הייתה המתנה?",
            "מתי הייתה הפעם הראשונה שאמרתם אני אוהב\ת אותך?",
            "מתי ואיפה הייתם כשקיבלתם יחד החלטה על משהו משמעותי – כמו לקנות משהו גדול, לשנות כיוון או להתחיל משהו חדש?"
        ]
    },
    {
        title: "🎭 חלק 6: מאחורי הקלעים של הזוגיות",
        questions: [
            "מי התחיל עם מי?",
            "מי בחר את המקום שבו היה הדייט הראשון שלכם?",
            "מתי החלטתם רשמית שאתם זוג?",
            "מי יזם את הפעם האחרונה שנסעתם לחופשה יחד?",
            "מי זה שהביא את הרעיון לבלות את הסופ\"ש האחרון כמו שהוא היה?",
            "מי בחר את הסדרה האחרונה שראיתם יחד?",
			"מה היו ההודעות הראשונות ששלחתם אחד לשנייה?",
            "מי הציע לעשות משהו רומנטי בפעם האחרונה – ומה זה היה?",
            "מי זה שבחר את המסעדה האחרונה?",
            "רגע של שיתוף – מתי הייתה הפעם האחרונה שהסתכלתם אחד על השני וחשבתם \"איזה מזל שאנחנו יחד\"? ואיפה זה היה?"
        ]
    }
];

const sensualTasks = [
    "PLAYER1, שב/י על הברכיים של PLAYER2 והביטו אחד לשני בעיניים במשך דקה – בלי לחייך.",
    "PLAYER1, תן/י לPLAYER2 נשיקה ארוכה של דקה – בלי להפסיק.",
    "PLAYER1, הורד/י את החולצה שלך.",
    "PLAYER1, לחש/י משפט מיני באוזן של PLAYER2.",
    "PLAYER1, לקק/י בעדינות את השפתיים של PLAYER2 – למשך 10 שניות.",
    "PLAYER1, נשק/י את PLAYER2 בשלושה מקומות אינטימיים בגוף.",
    "PLAYER1, הורד/י את המכנס שלך או של PLAYER2.",
    "PLAYER1, תאר/י בקצרה פנטזיה מינית שיש לך.",
    "שניכם - הדגימו תנוחה אהובה (בלבוש בלבד) – בלי מילים.",
    "PLAYER1, העבר/י את הלשון לאורך אזור בגוף של PLAYER2 – לפי בחירתו/ה."
];

const coupleTasks = [
    "עליכם להתנשק למשך דקה שלמה – בלי להפסיק.",
    "שניכם הורידו את החולצות שלכם.",
    "עליכם לעשות מסאז' הדדי למשך 3 דקות.",
    "שניכם צריכים להגיד פנטזיה מינית אחד על השני.",
    "עליכם להתחבק בחוזקה למשך דקה ולהגיד מילות אהבה.",
    "שניכם עושים striptease קצר אחד בפני השני.",
    "עליכם לבחור תנוחה אינטימית ולהישאר בה דקה.",
    "שניכם מליטפים אחד את השני בעדינות במקומות שאתם אוהבים.",
    "עליכם להתנשק בשלושה מקומות שונים בגוף אחד של השני.",
    "שניכם מספרים מה הכי מעורר אתכם אחד בשני."
];

const encouragementMessages = [
    { type: 'tease', message: 'PLAYER, את/ה ממש מתקשה להיזכר! OTHER_PLAYER, תתכונן/י לניצחון!' },
    { type: 'encourage', message: 'PLAYER, אל תתייאש/י - עוד רגע את/ה חוזר/ת לעצמך!' },
    { type: 'compliment', message: 'OTHER_PLAYER, את/ה מדהים/ה! שתי הצלחות רצופות זה לא מובן מאליו.' },
    { type: 'funny', message: 'PLAYER, נראה שהזיכרון שלך יצא לחופשה... OTHER_PLAYER מוביל/ה!' },
    { type: 'motivate', message: 'PLAYER, זה הזמן לחזור למשחק! OTHER_PLAYER, תיזהר/י - הוא/היא עוד יחזור/תחזור!' },
    { type: 'sweet', message: 'אולי PLAYER לא זוכר/ת הכל, אבל OTHER_PLAYER בטוח זוכר/ת למה הוא/היא התאהב/ה!' },
    { type: 'challenge', message: 'OTHER_PLAYER, נראה שיש לך זיכרון של פיל! PLAYER, תראה/י לו/לה מה את/ה יודע/ת!' },
    { type: 'romantic', message: 'PLAYER, אולי הזיכרון בוגד בך, אבל האהבה שלכם חזקה מתמיד!' },
    { type: 'playful', message: 'PLAYER צריך/ה כנראה ויטמינים לזיכרון... OTHER_PLAYER, אל תרחם/י!' },
    { type: 'supportive', message: 'זה בסדר PLAYER, לא תמיד זוכרים הכל. OTHER_PLAYER, תן/י לו/לה צ\'אנס!' }
];

function getGenderText(gender, maleText, femaleText) {
    return gender === 'male' ? maleText : femaleText;
}

function getGenderVerb(gender, maleVerb, femaleVerb) {
    return gender === 'male' ? maleVerb : femaleVerb;
}

function getGenderAddress(gender, maleAddress, femaleAddress) {
    return gender === 'male' ? maleAddress : femaleAddress;
}

function updateButtonTexts() {
    const player1Verb = getGenderVerb(gameState.player1.gender, 'ניצח', 'ניצחה');
    const player2Verb = getGenderVerb(gameState.player2.gender, 'ניצח', 'ניצחה');
    
    document.getElementById('player1-btn').textContent = `${gameState.player1.name} ${player1Verb}`;
    document.getElementById('player2-btn').textContent = `${gameState.player2.name} ${player2Verb}`;
}

function replacePlayerNames(text) {
    return text
        .replace(/PLAYER1/g, gameState.player1.name)
        .replace(/PLAYER2/g, gameState.player2.name);
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showScreen(screenId, animation = 'fadeInUp') {
    const currentScreen = document.querySelector('.screen.active');
    const nextScreen = document.getElementById(screenId);
    
    if (currentScreen) {
        currentScreen.classList.remove('active');
    }
    
    nextScreen.classList.add('active');
    
    // הוספת אנימציה
    nextScreen.classList.remove('slide-right', 'slide-left', 'zoom');
    if (animation === 'slideRight') {
        nextScreen.classList.add('slide-right');
    } else if (animation === 'slideLeft') {
        nextScreen.classList.add('slide-left');
    } else if (animation === 'zoom') {
        nextScreen.classList.add('zoom');
    }
    
    playTransition();
}

function showErrorMessage(message) {
    // מחיקת הודעות שגיאה קודמות
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const activeScreen = document.querySelector('.screen.active .screen-content');
    if (activeScreen) {
        activeScreen.appendChild(errorDiv);
        
        // הסרת ההודעה אחרי 4 שניות
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 4000);
    }
}

// פונקציה לעבור למסך הבא
function nextScreen() {
    playButtonClick();
    
    if (gameState.currentScreen === 1) { // מסך שחקנים
        if (!savePlayersInfo()) return;
    } else if (gameState.currentScreen === 2) { // מסך פרס
        savePrizeInfo();
    }

    const screens = ['welcome-screen', 'players-screen', 'prize-screen', 'rules-screen','spice-screen'];
    gameState.currentScreen++;

    if (gameState.currentScreen < screens.length) {
        showScreen(screens[gameState.currentScreen], 'slideRight');
    }
}

function validateName(name) {
    if (!name || name.trim().length === 0) {
        return 'אנא הכנס שם';
    }
    if (name.trim().length < 2) {
        return 'השם חייב להכיל לפחות 2 תווים';
    }
    if (name.trim().length > 15) {
        return 'השם לא יכול להכיל יותר מ-15 תווים';
    }
    // regex מעודכן שמאפשר יותר תווים (כולל מספרים, apostrophe ומקף)
    if (!/^[\u0590-\u05FFa-zA-Z0-9\s\u200E\u200F'\-\.]+$/.test(name.trim())) {
        return 'השם יכול להכיל רק אותיות, מספרים, רווחים, מקפים ו apostrophe';
    }
    return null;
}

function setupEmojiSelectors() {
    const player1Selector = document.getElementById('player1-emoji-selector');
    const player2Selector = document.getElementById('player2-emoji-selector');
    const player1CustomInput = document.getElementById('player1-custom-input');
    const player2CustomInput = document.getElementById('player2-custom-input');
    const player1CustomBtn = document.getElementById('player1-custom-emoji');
    const player2CustomBtn = document.getElementById('player2-custom-emoji');

    // פונקציה לבדיקה אם הטקסט הוא אמוג'י
    function isEmoji(str) {
        const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)$/u;
        return emojiRegex.test(str);
    }

    // פונקציה להוספת אמוג'י מותאם אישית
    function addCustomEmoji(player, emoji, selector, customBtn) {
        if (!isEmoji(emoji)) {
            alert("אנא הכנס סמיילי תקין");
            return false;
        }

        // עדכון הבחירה
        selector.querySelectorAll('.emoji-option').forEach(option => {
            option.classList.remove('selected');
        });
        customBtn.classList.add('selected');
        customBtn.textContent = emoji;
        customBtn.dataset.emoji = emoji;
        
        // עדכון המשחק
        gameState[player].emoji = emoji;
        
        return true;
    }

    // השחקן הראשון - אמוג'י רגיל
    player1Selector.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-option') && !e.target.classList.contains('emoji-custom')) {
            player1Selector.querySelectorAll('.emoji-option').forEach(option => {
                option.classList.remove('selected');
            });
            e.target.classList.add('selected');
            gameState.player1.emoji = e.target.dataset.emoji;
            player1CustomInput.style.display = 'none';
        }
    });

    // השחקן הראשון - כפתור אמוג'י מותאם
    player1CustomBtn.addEventListener('click', () => {
        player1CustomInput.style.display = player1CustomInput.style.display === 'none' ? 'block' : 'none';
        if (player1CustomInput.style.display === 'block') {
            player1CustomInput.focus();
            player1CustomBtn.classList.add('active');
        } else {
            player1CustomBtn.classList.remove('active');
        }
    });

    // השחקן הראשון - קלט אמוג'י מותאם
    player1CustomInput.addEventListener('input', (e) => {
        const emoji = e.target.value.trim();
        if (emoji && addCustomEmoji('player1', emoji, player1Selector, player1CustomBtn)) {
            player1CustomInput.style.display = 'none';
            player1CustomBtn.classList.remove('active');
            playSuccess();
        }
    });

    // השחקן השני - אמוג'י רגיל
    player2Selector.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-option') && !e.target.classList.contains('emoji-custom')) {
            player2Selector.querySelectorAll('.emoji-option').forEach(option => {
                option.classList.remove('selected');
            });
            e.target.classList.add('selected');
            gameState.player2.emoji = e.target.dataset.emoji;
            player2CustomInput.style.display = 'none';
        }
    });

    // השחקן השני - כפתור אמוג'י מותאם
    player2CustomBtn.addEventListener('click', () => {
        player2CustomInput.style.display = player2CustomInput.style.display === 'none' ? 'block' : 'none';
        if (player2CustomInput.style.display === 'block') {
            player2CustomInput.focus();
            player2CustomBtn.classList.add('active');
        } else {
            player2CustomBtn.classList.remove('active');
        }
    });

    // השחקן השני - קלט אמוג'י מותאם
    player2CustomInput.addEventListener('input', (e) => {
        const emoji = e.target.value.trim();
        if (emoji && addCustomEmoji('player2', emoji, player2Selector, player2CustomBtn)) {
            player2CustomInput.style.display = 'none';
            player2CustomBtn.classList.remove('active');
            playSuccess();
        }
    });

    // הוספת תמיכה ב-paste
    player1CustomInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            const emoji = e.target.value.trim();
            if (emoji && addCustomEmoji('player1', emoji, player1Selector, player1CustomBtn)) {
                player1CustomInput.style.display = 'none';
                player1CustomBtn.classList.remove('active');
                playSuccess();
            }
        }, 10);
    });

    player2CustomInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            const emoji = e.target.value.trim();
            if (emoji && addCustomEmoji('player2', emoji, player2Selector, player2CustomBtn)) {
                player2CustomInput.style.display = 'none';
                player2CustomBtn.classList.remove('active');
                playSuccess();
            }
        }, 10);
    });
}

function savePlayersInfo() {
    const player1Name = document.getElementById('player1-name').value.trim();
    const player2Name = document.getElementById('player2-name').value.trim();
    
    // בדיקת validation
    const player1Error = validateName(player1Name);
    const player2Error = validateName(player2Name);
    
    if (player1Error) {
        playError();
        showErrorMessage(`שגיאה בשם השחקן הראשון: ${player1Error}`);
        return false;
    }
    
    if (player2Error) {
        playError();
        showErrorMessage(`שגיאה בשם השחקן השני: ${player2Error}`);
        return false;
    }
    
    if (player1Name.toLowerCase() === player2Name.toLowerCase()) {
        playError();
        showErrorMessage('שמות השחקנים חייבים להיות שונים');
        return false;
    }

    gameState.player1.name = player1Name;
    gameState.player1.gender = document.getElementById('player1-gender').value;
    gameState.player2.name = player2Name;
    gameState.player2.gender = document.getElementById('player2-gender').value;

    updatePlayerDisplay();
    updateButtonTexts();

    playSuccess();
    return true;
}

function updatePlayerDisplay() {
    const player1Display = document.getElementById('player1-display');
    const player2Display = document.getElementById('player2-display');
    const player1Emoji = document.getElementById('player1-emoji');
    const player2Emoji = document.getElementById('player2-emoji');

    player1Display.querySelector('span:last-child').textContent = sanitizeHTML(gameState.player1.name);
    player2Display.querySelector('span:last-child').textContent = sanitizeHTML(gameState.player2.name);
    player1Emoji.textContent = gameState.player1.emoji;
    player2Emoji.textContent = gameState.player2.emoji;
}

function savePrizeInfo() {
    gameState.prize = document.getElementById('prize').value.trim() || 'הנצחון!';
    playSuccess();
}

function startCountdown() {
    playButtonClick();
    gameState.sensualTasks = document.getElementById('sensual-tasks').checked;
    gameState.gameStartTime = Date.now();
    showScreen('countdown-screen', 'zoom');
    let count = 3;
    const timer = document.getElementById('countdown-timer');
    
    const countdown = setInterval(() => {
        if (count > 0) {
            timer.textContent = count;
            playCountdown();
            count--;
        } else if (count === 0) {
            timer.textContent = 'בהצלחה! 🎮';
            playVictory();
            count--;
        } else {
            clearInterval(countdown);
            startGame();
        }
    }, 1000);
}

function startGame() {
    gameState.currentQuestion = 0;
    gameState.currentChapter = 0;
    showChapter();
}

function showChapter() {
    if (gameState.currentChapter < chapters.length) {
        document.getElementById('chapter-title').textContent = chapters[gameState.currentChapter].title;
        showScreen('chapter-screen', 'zoom');
    } else {
        showResults();
    }
}

function startQuestions() {
    playButtonClick();
    showScreen('game-screen', 'slideLeft');
    displayCurrentQuestion();
}

function displayCurrentQuestion() {
    const chapter = chapters[gameState.currentChapter];
    const questionIndex = gameState.currentQuestion - getTotalQuestionsBeforeChapter(gameState.currentChapter);
    
    if (questionIndex < chapter.questions.length) {
        let questionText = chapter.questions[questionIndex];
        questionText = replacePlayerNames(questionText);
        
        // הוספת אייקון חכם לשאלה
        const icon = getQuestionIcon(questionText);
        
        // אנימציה של החלפת שאלה
        const questionDisplay = document.getElementById('question-display');
        questionDisplay.classList.add('changing');
        
        setTimeout(() => {
            questionDisplay.innerHTML = `<span style="font-size: 1.2em; margin-left: 10px;">${icon}</span>${questionText}`;
            questionDisplay.classList.remove('changing');
        }, 300);
        
        document.getElementById('current-question').textContent = gameState.currentQuestion + 1;
        updateCircularProgress();
        updateScoreDisplay();
    } else {
        gameState.currentChapter++;
        if (gameState.currentChapter < chapters.length) {
            showChapter();
        } else {
            showResults();
        }
    }
}

function getTotalQuestions() {
    return chapters.reduce((total, chapter) => total + chapter.questions.length, 0);
}

function getTotalQuestionsBeforeChapter(chapterIndex) {
    let total = 0;
    for (let i = 0; i < chapterIndex; i++) {
        total += chapters[i].questions.length;
    }
    return total;
}

function checkForSensualTask() {
    if (!gameState.sensualTasks) {
        // אם לא נבחרו משימות חושניות - הצג אזהרה אדומה
        if (gameState.player1.failures >= 3 || gameState.player2.failures >= 3) {
            let playerWith3Failures = null;
            if (gameState.player1.failures >= 3) {
                playerWith3Failures = gameState.player1;
                gameState.player1.failures = 0;
                gameState.player1.consecutiveFailures = 0; // איפוס גם כאן
            }
            if (gameState.player2.failures >= 3) {
                playerWith3Failures = gameState.player2;
                gameState.player2.failures = 0;
                gameState.player2.consecutiveFailures = 0; // איפוס גם כאן
            }
            
            // הצג הודעה אדומה שאין משימות
            document.getElementById('failure-warning-content').innerHTML = `
                <strong>שימו לב!</strong><br><br>
                <span style="color: #ff6b6b; font-size: 1.2em;">לא יהיו משימות כלל במשחק</span><br><br>
                בחרתם שלא לכלול משימות אינטימיות, לכן אין משימה עבור השחקן שהגיע ל-3 פסילות.
            `;
            
            // שינוי הצבע של הפופאפ לאדום
            const popup = document.getElementById('failure-warning-popup');
            const popupContent = popup.querySelector('.popup-content');
            popupContent.style.background = 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
            
            const readyButton = document.querySelector('#failure-warning-popup .btn-danger');
            readyButton.innerHTML = `<span class="interactive-icon">✅</span> הבנו`;
            readyButton.onclick = () => {
                playButtonClick();
                // החזר את הצבע הרגיל
                popupContent.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                document.getElementById('failure-warning-popup').style.display = 'none';
            };
            
            // הסתר את כפתור הדילוג
            const skipButton = document.querySelector('#failure-warning-popup .btn-secondary');
            skipButton.style.display = 'none';
            
            document.getElementById('failure-warning-popup').style.display = 'flex';
        }
        return;
    }


    if (gameState.player1.failures >= 3 && gameState.player2.failures >= 3) {
        gameState.currentTaskPlayer = 'both';
        gameState.player1.failures = 0;
        gameState.player2.failures = 0;
        // איפוס פסילות רצופות של שני השחקנים
        gameState.player1.consecutiveFailures = 0;
        gameState.player2.consecutiveFailures = 0;
        showCoupleTask();
        return;
    }

    let taskPlayer = null;
    if (gameState.player1.failures >= 3) {
        taskPlayer = gameState.player1;
        gameState.currentTaskPlayer = gameState.player1;
        gameState.player1.failures = 0; // איפוס לאחר הגעה ל-3
        gameState.player1.consecutiveFailures = 0; // איפוס פסילות רצופות
    } else if (gameState.player2.failures >= 3) {
        taskPlayer = gameState.player2;
        gameState.currentTaskPlayer = gameState.player2;
        gameState.player2.failures = 0; // איפוס לאחר הגעה ל-3
        gameState.player2.consecutiveFailures = 0; // איפוס פסילות רצופות
    }

    if (taskPlayer) {
        if (gameState.currentTaskIndex >= sensualTasks.length) {
            gameState.currentTaskIndex = 0;
            showMessage(`נגמרו המשימות! חוזרים להתחלה... 😏`);
            setTimeout(() => {
                showFailureWarning(taskPlayer);
            }, 2000);
        } else {
            showFailureWarning(taskPlayer);
        }
    }
}


function answerQuestion(answer, event) {
    playButtonClick();
    const clickedButton = event?.target.closest('.btn');
    
    // שמירת זמן תחילת שאלה
    const questionStartTime = Date.now();
    
    // שמירת מצב רק אם לא השתמשו ב-undo
    gameState.lastAction = {
        question: gameState.currentQuestion,
        chapter: gameState.currentChapter,
        player1Score: gameState.player1.score,
        player2Score: gameState.player2.score,
        player1Failures: gameState.player1.failures,
        player2Failures: gameState.player2.failures,
        player1ConsecutiveFailures: gameState.player1.consecutiveFailures,
        player2ConsecutiveFailures: gameState.player2.consecutiveFailures,
        actionType: answer
    };
    
    // איפוס הדגל של undo לאחר שמירת מצב חדש
    gameState.hasUsedUndo = false;

    let willHaveThreeFailures = false;
    
    if (answer === 1) {
        gameState.player1.score++;
        gameState.player1.consecutiveFailures = 0;
        gameState.player2.failures++;
        gameState.player2.consecutiveFailures++;
		gameState.player2.totalFailures++;
        if (gameState.player2.failures === 3) willHaveThreeFailures = true;
        playSuccess();
    } else if (answer === 2) {
        gameState.player2.score++;
        gameState.player2.consecutiveFailures = 0;
        gameState.player1.failures++;
        gameState.player1.consecutiveFailures++;
		gameState.player1.totalFailures++;
        if (gameState.player1.failures === 3) willHaveThreeFailures = true;
        playSuccess();
    } else if (answer === 'both') {
        gameState.player1.score++;
        gameState.player2.score++;
        gameState.player1.consecutiveFailures = 0;
        gameState.player2.consecutiveFailures = 0;
        playSuccess();
    } else if (answer === 'none') {
        gameState.player1.failures++;
        gameState.player2.failures++;
        gameState.player1.consecutiveFailures++;
        gameState.player2.consecutiveFailures++;
		gameState.player1.totalFailures++;
gameState.player2.totalFailures++;
        if (gameState.player1.failures === 3 || gameState.player2.failures === 3) willHaveThreeFailures = true;
        playError();
    }

    // אנימציות כפתורים
    if (answer === 1 || answer === 2 || answer === 'both') {
        if (clickedButton) animateButtonSuccess(clickedButton);
    } else if (answer === 'none') {
        if (clickedButton) animateButtonError(clickedButton);
    }

    // בדיקת הודעות עידוד רק אם לא תהיה משימה
    if (!willHaveThreeFailures) {
        checkForEncouragementMessage();
    }
    
    // עדכון סטטיסטיקות
    gameState.statistics.questionsAnswered++;
    gameState.statistics.timePerQuestion.push(questionStartTime - (gameState.lastQuestionTime || questionStartTime));
    gameState.lastQuestionTime = Date.now();
    
    checkForSensualTask();
    
    gameState.currentQuestion++;
    displayCurrentQuestion();
}
// תיקון בדיקת הודעות עידוד - תיקון החלפת שמות
// תיקון הפונקציה checkForEncouragementMessage
function checkForEncouragementMessage() {
    let messagePlayer = null;
    let otherPlayer = null;

    

// בדיקה: 4 פסילות כוללות ו-2 רצופות אחרונות
const player1Had4With2Consecutive = gameState.player1.totalFailures >= 4 && gameState.player1.consecutiveFailures === 2;
const player2Had4With2Consecutive = gameState.player2.totalFailures >= 4 && gameState.player2.consecutiveFailures === 2;

   if (player1Had4With2Consecutive) {
    messagePlayer = gameState.player1;
    otherPlayer = gameState.player2;
    gameState.player1.consecutiveFailures = 0; // איפוס רצופות
  gameState.player1.totalFailures = 0; // איפוס הספירה הכוללת - מתחיל מחדש!
} else if (player2Had4With2Consecutive) {
    messagePlayer = gameState.player2;
    otherPlayer = gameState.player1;
    gameState.player2.consecutiveFailures = 0; // איפוס רצופות  
 gameState.player2.totalFailures = 0; // איפוס הספירה הכוללת - מתחיל מחדש!
}

    if (messagePlayer) {
        const messageType = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
        
        // החלפת שמות בצורה בטוחה - תיקון הבאג
        let message = messageType.message;
        
        // החלפה ישירה בלי placeholders - זה יפתור את הבעיה
        message = message.replace(/OTHER_PLAYER/g, otherPlayer.name);
        message = message.replace(/PLAYER/g, messagePlayer.name);

        // התאמה לפי מגדר השחקן הנוכחי
        if (messagePlayer.gender === 'female') {
            message = message
                .replace(/את\/ה/g, 'את')
                .replace(/מתקשה/g, 'מתקשה')
                .replace(/תתייאש\/י/g, 'תתייאשי')
                .replace(/חוזר\/ת/g, 'חוזרת')
                .replace(/זוכר\/ת/g, 'זוכרת')
                .replace(/יודע\/ת/g, 'יודעת')
                .replace(/צריך\/ה/g, 'צריכה')
                .replace(/תראה\/י/g, 'תראי')
                .replace(/לו\/לה/g, 'לה')
                .replace(/הוא\/היא/g, 'היא')
                .replace(/יחזור\/תחזור/g, 'תחזור');
        } else {
            message = message
                .replace(/את\/ה/g, 'אתה')
                .replace(/תתייאש\/י/g, 'תתייאש')
                .replace(/חוזר\/ת/g, 'חוזר')
                .replace(/זוכר\/ת/g, 'זוכר')
                .replace(/יודע\/ת/g, 'יודע')
                .replace(/צריך\/ה/g, 'צריך')
                .replace(/תראה\/י/g, 'תראה')
                .replace(/לו\/לה/g, 'לו')
                .replace(/הוא\/היא/g, 'הוא')
                .replace(/יחזור\/תחזור/g, 'יחזור');
        }

        // התאמה לפי מגדר השחקן השני
        if (otherPlayer.gender === 'female') {
            message = message
                .replace(/תתכונן\/י/g, 'תתכונני')
                .replace(/מדהים\/ה/g, 'מדהימה')
                .replace(/מוביל\/ה/g, 'מובילה')
                .replace(/תיזהר\/י/g, 'תיזהרי')
                .replace(/התאהב\/ה/g, 'התאהבה')
                .replace(/תן\/י/g, 'תני')
                .replace(/תרחם\/י/g, 'תרחמי')
                .replace(/זוכר\/ת/g, 'זוכרת');
        } else {
            message = message
                .replace(/תתכונן\/י/g, 'תתכונן')
                .replace(/מדהים\/ה/g, 'מדהים')
                .replace(/מוביל\/ה/g, 'מוביל')
                .replace(/תיזהר\/י/g, 'תיזהר')
                .replace(/התאהב\/ה/g, 'התאהב')
                .replace(/תן\/י/g, 'תן')
                .replace(/תרחם\/י/g, 'תרחם')
                .replace(/זוכר\/ת/g, 'זוכר');
        }

        showMessage(message);
    }
}

function showFailureWarning(player) {
    const genderReady = getGenderAddress(player.gender, 'מוכן', 'מוכנה');
    const genderReceive = getGenderVerb(player.gender, 'תקבל', 'תקבלי');
    
    document.getElementById('failure-warning-content').innerHTML = `
        <strong>${sanitizeHTML(player.name)}, הגעת ל-3 פסילות!</strong><br><br>
        לכן ${genderReceive} משימה מינית במיוחד...<br><br>
        ${genderReady} למשימה שלך? 😏
    `;
    
    // עדכון טקסט הכפתור
    const readyButton = document.querySelector('#failure-warning-popup .btn-danger');
    readyButton.innerHTML = `<span class="interactive-icon">😈</span> כן, אני ${genderReady} למשימה!`;
    
    document.getElementById('failure-warning-popup').style.display = 'flex';
}

function showSensualTask() {
    playButtonClick();
    document.getElementById('failure-warning-popup').style.display = 'none';
    
    let task;
    let taskTitle;
    
    // בדיקה אם זו משימה זוגית
    if (gameState.currentTaskPlayer === 'both') {
        task = coupleTasks[gameState.currentTaskIndex % coupleTasks.length];
        taskTitle = 'המשימה שלכם!';
        // החלפת שמות במשימה זוגית
        task = task.replace(/עליכם/g, 'עליכם')
                  .replace(/שניכם/g, 'שניכם');
    } else {
        task = sensualTasks[gameState.currentTaskIndex];
        taskTitle = 'המשימה שלך!';
        const currentPlayer = gameState.currentTaskPlayer;
        const otherPlayer = currentPlayer === gameState.player1 ? gameState.player2 : gameState.player1;
        
        task = task.replace(/PLAYER1/g, currentPlayer.name).replace(/PLAYER2/g, otherPlayer.name);
        
        if (currentPlayer.gender === 'female') {
            task = task.replace(/שב\/י/g, 'שבי')
                      .replace(/תן\/י/g, 'תני')
                      .replace(/הורד\/י/g, 'הורידי')
                      .replace(/לחש\/י/g, 'לחשי')
                      .replace(/לקק\/י/g, 'לקקי')
                      .replace(/נשק\/י/g, 'נשקי')
                      .replace(/תאר\/י/g, 'תארי')
                      .replace(/העבר\/י/g, 'העבירי');
        }
        else {
            task = task.replace(/שב\/י/g, 'שב')
                      .replace(/תן\/י/g, 'תן')
                      .replace(/הורד\/י/g, 'הורד')
                      .replace(/לחש\/י/g, 'לחש')
                      .replace(/לקק\/י/g, 'לקק')
                      .replace(/נשק\/י/g, 'נשק')
                      .replace(/תאר\/י/g, 'תאר')
                      .replace(/העבר\/י/g, 'העבר');
        }
        
        if (otherPlayer.gender === 'female') {
            task = task.replace(/בחירתו\/ה/g, 'בחירתה');
        } else {
            task = task.replace(/בחירתו\/ה/g, 'בחירתו');
        }
    }
    
    document.getElementById('task-title').innerHTML = `<span class="interactive-icon">💕</span> ${taskTitle}`;
    document.getElementById('task-content').innerHTML = `
        <div style="padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 15px; font-size: 1.4rem; line-height: 1.6;">
            ${sanitizeHTML(task)}
        </div>
    `;
    
    // עדכון טקסט כפתור ההשלמה
    const completeButton = document.querySelector('#task-popup .btn-success');
    if (gameState.currentTaskPlayer === 'both') {
        completeButton.innerHTML = '<span class="interactive-icon">✅</span> ביצענו את המשימה';
    } else {
        completeButton.innerHTML = '<span class="interactive-icon">✅</span> ביצעתי את המשימה';
    }
    
    document.getElementById('task-popup').style.display = 'flex';
    gameState.currentTaskIndex++;
}

function skipTask() {
    playButtonClick();
    document.getElementById('failure-warning-popup').style.display = 'none';
}

function completeTask() {
    playButtonClick();
    playSuccess();
    document.getElementById('task-popup').style.display = 'none';
}

// תיקון הודעות - שינוי "הבנתי" ל"הבנו" במקומות הנכונים
function showMessage(message) {
    document.getElementById('message-content').innerHTML = `
        <div style="font-size: 1.4rem; padding: 1.5rem; line-height: 1.6;">
            ${sanitizeHTML(message)}
        </div>
    `;
    document.getElementById('message-popup').style.display = 'flex';
    
    // שינוי הטקסט של הכפתור - תמיד "הבנו" כי זה משחק זוגי
    const closeButton = document.querySelector('#message-popup .btn');
    closeButton.innerHTML = '<span class="interactive-icon">✅</span> הבנו';
}

function closeMessagePopup() {
    playButtonClick();
    document.getElementById('message-popup').style.display = 'none';
}

function undoLastAction() {
    playButtonClick();
    
    if (!gameState.lastAction) {
        playError();
        showMessage('אין פעולה לביטול');
        return;
    }

    if (gameState.hasUsedUndo) {
        playError();
        showMessage('ניתן לבטל רק פעם אחת');
        return;
    }

    // הצגת אישור עם פרטי הפעולה
    let actionDescription = '';
    const lastAction = gameState.lastAction.actionType;
    
    if (lastAction === 1) {
        const verb = getGenderVerb(gameState.player1.gender, 'ניצח', 'ניצחה');
        actionDescription = `האם ברצונכם לבטל את הנקודה של ${gameState.player1.name}? (${gameState.player1.name} ${verb})`;
    } else if (lastAction === 2) {
        const verb = getGenderVerb(gameState.player2.gender, 'ניצח', 'ניצחה');
        actionDescription = `האם ברצונכם לבטל את הנקודה של ${gameState.player2.name}? (${gameState.player2.name} ${verb})`;
    } else if (lastAction === 'both') {
        actionDescription = 'האם ברצונכם לבטל את הנקודות של שני השחקנים? (שניהם הצליחו)';
    } else if (lastAction === 'none') {
        actionDescription = 'האם ברצונכם לבטל את הפסילות של שני השחקנים? (שניהם לא זכרו)';
    }

    document.getElementById('undo-confirmation-content').textContent = actionDescription;
    document.getElementById('undo-confirmation-popup').style.display = 'flex';
}

function confirmUndo() {
    playButtonClick();
    
    gameState.currentQuestion = gameState.lastAction.question;
    gameState.currentChapter = gameState.lastAction.chapter;
    gameState.player1.score = gameState.lastAction.player1Score;
    gameState.player2.score = gameState.lastAction.player2Score;
    gameState.player1.failures = gameState.lastAction.player1Failures;
    gameState.player2.failures = gameState.lastAction.player2Failures;
    gameState.player1.consecutiveFailures = gameState.lastAction.player1ConsecutiveFailures;
    gameState.player2.consecutiveFailures = gameState.lastAction.player2ConsecutiveFailures;
    
    gameState.hasUsedUndo = true;
    document.getElementById('undo-confirmation-popup').style.display = 'none';
    displayCurrentQuestion();
    playSuccess();
    showMessage('הפעולה בוטלה');
}

function cancelUndo() {
    playButtonClick();
    document.getElementById('undo-confirmation-popup').style.display = 'none';
}

function updateScoreDisplay() {
    document.getElementById('player1-failures').textContent = gameState.player1.failures;
    document.getElementById('player2-failures').textContent = gameState.player2.failures;
    
    // הוספת אזהרה ויזואלית כשמתקרבים ל-3 פסילות
    const player1Card = document.getElementById('player1-card');
    const player2Card = document.getElementById('player2-card');
    
    if (gameState.player1.failures >= 2) {
        player1Card.classList.add('warning');
    } else {
        player1Card.classList.remove('warning');
    }
    
    if (gameState.player2.failures >= 2) {
        player2Card.classList.add('warning');
    } else {
        player2Card.classList.remove('warning');
    }
}

// פונקציית אנימציית העלאת ניקוד
function animateScoreCount(element, targetScore) {
    let currentScore = 0;
    const increment = Math.max(1, Math.floor(targetScore / 20)); // מהירות האנימציה
    
    const countAnimation = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(countAnimation);
        }
        
        element.textContent = currentScore;
        element.style.animation = 'countUp 0.3s ease-out';
        
        // איפוס האנימציה
        setTimeout(() => {
            element.style.animation = '';
        }, 300);
        
    }, 50); // כל 50ms
}

function createConfetti() {
    cleanupConfetti(); // נקה confetti ישן לפני יצירת חדש
    
    const colors = ['#ff0084', '#00ffff', '#ffeaa7', '#fab1a0', '#74b9ff'];
    const confettiPool = []; // object pooling
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            let confetti = confettiPool.pop();
            if (!confetti) {
                confetti = document.createElement('div');
                confetti.className = 'confetti';
            }
            
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(confetti);
            
            // הוספה למעקב
            confettiElements.push(confetti);
            
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
                // החזרה לpool במקום הסרה מהמעקב
                const index = confettiElements.indexOf(confetti);
                if (index > -1) {
                    confettiElements.splice(index, 1);
                    confettiPool.push(confetti);
                }
            }, 5000);
        }, i * 50);
    }
}

function cleanupConfetti() {
    confettiElements.forEach(confetti => {
        if (confetti.parentNode) {
            confetti.remove();
        }
    });
    confettiElements = [];
}

function showResults() {
    const player1Score = gameState.player1.score;
    const player2Score = gameState.player2.score;
    let winner, winnerGender;
    
    if (player1Score > player2Score) {
        winner = gameState.player1.name;
        winnerGender = gameState.player1.gender;
        createConfetti();
        playVictory();
    } else if (player2Score > player1Score) {
        winner = gameState.player2.name;
        winnerGender = gameState.player2.gender;
        createConfetti();
        playVictory();
    } else {
        winner = null;
        playVictory();
    }

    let resultsHTML = `
        <div style="text-align: center;">
            <h2 style="font-size: 2rem; margin-bottom: 2rem;"><span class="interactive-icon">📊</span> תוצאות סופיות</h2>
            <div style="display: flex; justify-content: space-around; margin: 2rem 0; flex-wrap: wrap; align-items: center;">
                <div style="margin: 1.5rem; min-width: 200px;">
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem;">
                        ${gameState.player1.emoji} ${sanitizeHTML(gameState.player1.name)}
                    </h3>
                    <div class="score-animation" style="font-size: 3rem;" id="final-score-1">0</div>
                    <div style="font-size: 1.2rem; margin-top: 0.5rem;">נקודות</div>
                </div>
                <div style="margin: 1.5rem; min-width: 200px;">
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem;">
                        ${gameState.player2.emoji} ${sanitizeHTML(gameState.player2.name)}
                    </h3>
                    <div class="score-animation" style="font-size: 3rem;" id="final-score-2">0</div>
                    <div style="font-size: 1.2rem; margin-top: 0.5rem;">נקודות</div>
                </div>
            </div>
    `;

    if (winner) {
        const winnerVerb = getGenderVerb(winnerGender, 'ניצח', 'ניצחה');
        resultsHTML += `
            <div style="background: linear-gradient(45deg, #ffeaa7, #fab1a0); color: #333; padding: 2rem; border-radius: 25px; margin: 2rem 0; animation: pulse 2s infinite;">
                <h3 style="font-size: 2rem; margin-bottom: 1rem;"><span class="interactive-icon">🏆</span> ${sanitizeHTML(winner)} ${winnerVerb}!</h3>
                <p style="font-size: 1.4rem; margin-top: 1rem;">
                    הפרס ${getGenderAddress(winnerGender, 'שלך', 'שלך')}: <strong>${sanitizeHTML(gameState.prize)}</strong>
                </p>
            </div>
        `;
    } else {
        resultsHTML += `
            <div style="background: linear-gradient(45deg, #74b9ff, #0984e3); padding: 2rem; border-radius: 25px; margin: 2rem 0; animation: pulse 2s infinite;">
                <h3 style="font-size: 2rem; margin-bottom: 1rem;"><span class="interactive-icon">🤝</span> תיקו!</h3>
                <p style="font-size: 1.4rem; margin-top: 1rem;">
                    שניכם זוכים ב: <strong>${sanitizeHTML(gameState.prize)}</strong>
                </p>
            </div>
        `;
    }

    resultsHTML += `
            <div style="margin-top: 2rem; font-size: 1.2rem; line-height: 1.8;">
                <p><span class="interactive-icon">💕</span> תודה שיחקתם במשחק הזיכרון הגדול!</p>
                <p>איזה כיף לראות כמה אתם מכירים אחד את השני!</p>
            </div>
        </div>
    `;

    document.getElementById('final-results').innerHTML = resultsHTML;
    showScreen('results-screen', 'zoom');
    
    // אנימציית העלאת הניקוד
    setTimeout(() => {
        animateScoreCount(document.getElementById('final-score-1'), player1Score);
        animateScoreCount(document.getElementById('final-score-2'), player2Score);
    }, 1000);
}

function shareResults() {
    playButtonClick();
    
    const player1Score = gameState.player1.score;
    const player2Score = gameState.player2.score;
    let winner = '';
    
    if (player1Score > player2Score) {
        const winnerVerb = getGenderVerb(gameState.player1.gender, 'ניצח', 'ניצחה');
        winner = `🏆 ${gameState.player1.name} ${winnerVerb}!`;
    } else if (player2Score > player1Score) {
        const winnerVerb = getGenderVerb(gameState.player2.gender, 'ניצח', 'ניצחה');
        winner = `🏆 ${gameState.player2.name} ${winnerVerb}!`;
    } else {
        winner = '🤝 תיקו!';
    }

    const message = `🎮 סיימנו את משחק הזיכרון הגדול!\n\n` +
                  `${gameState.player1.emoji} ${gameState.player1.name}: ${player1Score} נקודות\n` +
                  `${gameState.player2.emoji} ${gameState.player2.name}: ${player2Score} נקודות\n\n` +
                  `${winner}\n\n` +
                  `הפרס: ${gameState.prize}\n\n` +
                  `💕 היה כיף לראות כמה אנחנו מכירים אחד את השני!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function submitFeedback() {
    playButtonClick();
    const feedback = document.getElementById('feedback-text').value.trim();
    
    if (!feedback) {
        showMessage('אנא כתבו משוב לפני השליחה');
        return;
    }

    // אתחול EmailJS (רק פעם אחת)
    if (!window.emailjsInitialized) {
        emailjs.init('JnxSe17bH1XzmVWlp');
        window.emailjsInitialized = true;
    }

    // שליחת המייל ישירות
    emailjs.send('service_eidiga8', 'template_qblegu6', {
    rating: `${gameState.player1.name} ו-${gameState.player2.name}`,
    message: feedback
    }).then(() => {
        document.getElementById('feedback-text').value = '';
        showMessage('תודה! המשוב נשלח בהצלחה!');
        playSuccess();
    }).catch((error) => {
        console.error('EmailJS Error:', error);
        showMessage('שגיאה בשליחה. נסו שוב מאוחר יותר.');
        playError();
    });
}

function showConfirmDialog(title, message, onConfirm, onCancel) {
    // יצירת popup אישור
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.style.display = 'flex';
    popup.setAttribute('role', 'dialog');
    popup.innerHTML = `
        <div class="popup-content">
            <div class="title">${sanitizeHTML(title)}</div>
            <div style="font-size: 1.2rem; margin: 2rem 0; line-height: 1.6;">
                ${sanitizeHTML(message)}
            </div>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-danger" id="confirm-yes">✅ כן, התחל משחק חדש</button>
                <button class="btn btn-secondary" id="confirm-no">❌ לא, המשך במשחק הנוכחי</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    document.getElementById('confirm-yes').addEventListener('click', () => {
        document.body.removeChild(popup);
        onConfirm();
    });
    
    document.getElementById('confirm-no').addEventListener('click', () => {
        document.body.removeChild(popup);
        onCancel();
    });
}

function saveGameState() {
    try {
        saveToLocalStorage('gameState', gameState);
        console.log('Game state saved');
    } catch (e) {
        console.warn('Could not save game state:', e);
    }
}

function loadGameState() {
    try {
        const saved = loadFromLocalStorage('gameState');
        if (saved && saved.currentQuestion > 0) {
            return saved;
        }
    } catch (e) {
        console.warn('Could not load game state:', e);
    }
    return null;
}

function doRestartGame() {
    // ניקוי confetti
    cleanupConfetti();
    
    // ניקוי מצב שמור
    saveToLocalStorage('gameState', null);
    
    gameState = {
        currentScreen: 0,
        currentQuestion: 0,
        currentChapter: 0,
   player1: { name: '', gender: 'male', emoji: '😊', score: 0, failures: 0, consecutiveFailures: 0, totalFailures: 0 },
player2: { name: '', gender: 'male', emoji: '😎', score: 0, failures: 0, consecutiveFailures: 0, totalFailures: 0 },
        prize: '',
        sensualTasks: true,
        currentTaskIndex: 0,
        lastAction: null,
        currentTaskPlayer: null,
        hasUsedUndo: false,
        gameStartTime: null,
        statistics: {
            totalQuestions: 40,
            questionsAnswered: 0,
            timePerQuestion: []
        }
    };

    document.getElementById('player1-name').value = '';
    document.getElementById('player2-name').value = '';
    document.getElementById('prize').value = '';
    document.getElementById('sensual-tasks').checked = true;
    document.getElementById('feedback-text').value = '';

    // איפוס בחירת אמוג'י
    document.querySelectorAll('.emoji-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector('#player1-emoji-selector .emoji-option').classList.add('selected');
    document.querySelector('#player2-emoji-selector .emoji-option[data-emoji="😎"]').classList.add('selected');

    showScreen('welcome-screen', 'zoom');
}
       
function restartGame() {
    playButtonClick();
    
    const currentProgress = gameState.currentQuestion;
    if (currentProgress > 5) { // רק אם יש התקדמות משמעותית
        showConfirmDialog(
            '🔄 האם להתחיל משחק חדש?',
            `כבר ענית על ${currentProgress} שאלות. כל ההתקדמות תאבד.`,
            () => doRestartGame(),
            () => {} // ביטול - לא עושה כלום
        );
    } else {
        doRestartGame();
    }
}

function toggleSettingsSection(section) {
    playButtonClick();
    const content = document.getElementById(section + '-content');
    const sectionElement = document.getElementById(section + '-settings-section');
    
    if (content.classList.contains('show')) {
        content.classList.remove('show');
        sectionElement.classList.remove('expanded');
    } else {
        // סגור את כל הסקציות האחרות
        document.querySelectorAll('.settings-section .hidden-content').forEach(el => {
            el.classList.remove('show');
        });
        document.querySelectorAll('.settings-section').forEach(el => {
            el.classList.remove('expanded');
        });
        
        // פתח את הסקציה הנוכחית
        content.classList.add('show');
        sectionElement.classList.add('expanded');
    }
}

function sendContactMessage() {
    playButtonClick();
    const message = document.getElementById('contact-message').value.trim();
    
    if (!message) {
        showMessage('אנא כתבו הודעה לפני השליחה');
        return;
    }

    const subject = encodeURIComponent('יצירת קשר - משחק הזיכרון הגדול');
    const body = encodeURIComponent(`הודעה ממשחק הזיכרון הגדול:

${message}

---
נשלח אוטומטית ממשחק הזיכרון הגדול`);

    const mailtoUrl = `mailto:rotemadini@gmail.com?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
    
    document.getElementById('contact-message').value = '';
    showMessage('תודה על ההודעה! המייל נפתח - אנא שלחו אותו.');
}

function openSettings() {
    playButtonClick();
    document.getElementById('settings-player1-name').value = gameState.player1.name;
    document.getElementById('settings-player2-name').value = gameState.player2.name;
    document.getElementById('settings-prize').value = gameState.prize;
    
    // סגירת כל הסקציות
    document.querySelectorAll('.settings-section .hidden-content').forEach(el => {
        el.classList.remove('show');
    });
    document.querySelectorAll('.settings-section').forEach(el => {
        el.classList.remove('expanded');
    });
    
    document.getElementById('settings-popup').style.display = 'flex';
}

function saveSettings() {
    playButtonClick();
    
    // validation עבור שמות בהגדרות
    const newPlayer1Name = document.getElementById('settings-player1-name').value.trim();
    const newPlayer2Name = document.getElementById('settings-player2-name').value.trim();
    
    if (newPlayer1Name && validateName(newPlayer1Name)) {
        showMessage(`שגיאה בשם שחקן 1: ${validateName(newPlayer1Name)}`);
        return;
    }
    
    if (newPlayer2Name && validateName(newPlayer2Name)) {
        showMessage(`שגיאה בשם שחקן 2: ${validateName(newPlayer2Name)}`);
        return;
    }
    
    if (newPlayer1Name && newPlayer2Name && newPlayer1Name.toLowerCase() === newPlayer2Name.toLowerCase()) {
        showMessage('שמות השחקנים חייבים להיות שונים');
        return;
    }
    
    if (newPlayer1Name) gameState.player1.name = newPlayer1Name;
    if (newPlayer2Name) gameState.player2.name = newPlayer2Name;
    if (document.getElementById('settings-prize').value.trim()) {
        gameState.prize = document.getElementById('settings-prize').value.trim();
    }
    
    updatePlayerDisplay();
    updateButtonTexts();
    
    closeSettings();
    playSuccess();
    showMessage('ההגדרות נשמרו בהצלחה!');
}

function closeSettings() {
    playButtonClick();
    document.getElementById('settings-popup').style.display = 'none';
}

// מניעת גלילה בטעות במובייל
function preventScroll(e) {
    if (e.target.closest('.popup-content')) return;
    if (e.target.closest('.screen.active .screen-content')) {
        // אפשר גלילה רק אם התוכן גולש
        const element = e.target.closest('.screen-content');
        if (element && element.scrollHeight > element.clientHeight) {
            return; // אפשר גלילה
        }
    }
    e.preventDefault();
}

// טיפול בלחיצות מקלדת
function handleKeyPress(e) {
    if (e.key === 'Enter') {
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const nextButton = activeScreen.querySelector('.btn:not(.btn-secondary):not(.btn-warning)');
            if (nextButton && !nextButton.disabled) {
                nextButton.click();
            }
        }
    } else if (e.key === 'Escape') {
        // סגירת פופאפים בESC
        const openPopups = document.querySelectorAll('.popup[style*="flex"]');
        openPopups.forEach(popup => {
            popup.style.display = 'none';
        });
    }
}

// בדיקה אם יש משחק שמור
function checkForSavedGame() {
    const saved = loadGameState();
    if (saved && saved.currentQuestion > 0) {
        showConfirmDialog(
            '🎮 נמצא משחק שמור',
            `נמצא משחק שמור בשאלה ${saved.currentQuestion + 1}. האם להמשיך את המשחק הקודם?`,
            () => {
                // טען משחק שמור
                gameState = saved;
                updatePlayerDisplay();
                updateButtonTexts();
                
                if (gameState.currentQuestion >= getTotalQuestions()) {
                    showResults();
                } else {
                    showScreen('game-screen', 'zoom');
                    displayCurrentQuestion();
                }
            },
            () => {
                // התחל משחק חדש
                doRestartGame();
            }
        );
    }
}

// שמירה אוטומטית של המשחק
function autoSaveGame() {
    if (gameState.currentQuestion > 0) {
        saveGameState();
    }
}

function showCoupleTask() {
    document.getElementById('failure-warning-content').innerHTML = `
        <strong>שניכם הגעתם ל-3 פסילות!</strong><br><br>
        זאת משימה זוגית במיוחד...<br><br>
        מוכנים למשימה שלכם? 😏
    `;
    
    // עדכון טקסט הכפתור
    const readyButton = document.querySelector('#failure-warning-popup .btn-danger');
    readyButton.innerHTML = `<span class="interactive-icon">😈</span> כן, אנחנו מוכנים למשימה!`;
    
    document.getElementById('failure-warning-popup').style.display = 'flex';
}

// בקיצור, אני אשלח לך בסוף את כל הקובץ המתוקן
// הנה השלמת הקוד המתוקן...

// אתחול המערכת
document.addEventListener('DOMContentLoaded', function() {
    // טעינת הגדרות משמורות
    soundEnabled = loadFromLocalStorage('soundEnabled', true);
    updateSoundButton();

    // אתחול אודיו בהקלקה הראשונה על כל דבר
    document.addEventListener('click', function(e) {
        ensureAudioReady();
    }, { once: true });

    // אתחול אודיו גם במגע (למובייל)
    document.addEventListener('touchstart', function(e) {
        ensureAudioReady();
    }, { once: true });

    // הגדרת בוחרי האמוג'י
    setupEmojiSelectors();
        
    // הגדרת מתג המשימות החושניות
    const sensualToggle = document.getElementById('sensual-tasks');
    const warning = document.getElementById('sensual-warning');
    
    function updateSensualWarning() {
        if (sensualToggle.checked) {
            warning.style.display = 'block';
            warning.innerHTML = '<span class="interactive-icon"></span> בחירה ב"כן" תוסיף משימות אינטימיות למשחק';
            warning.className = 'sensual-warning';
            warning.style.background = 'linear-gradient(45deg, #4ecdc4, #44a08d)';
            warning.style.animation = 'pulse 2s infinite';
        } else {
            warning.style.display = 'block';
            warning.innerHTML = '<span class="interactive-icon">❌</span> שימו לב - לא יהיו משימות בכלל במהלך המשחק';
            warning.className = 'sensual-warning';
            warning.style.background = 'linear-gradient(45deg, #ff416c, #ff4b2b)';
            warning.style.color = 'white';
            warning.style.animation = 'pulse 2s infinite';
        }
    }
    
    sensualToggle.addEventListener('change', updateSensualWarning);
    updateSensualWarning();

    // מניעת גלילה בטעות במובייל
    document.addEventListener('touchmove', preventScroll, { passive: false });

    // טיפול באירועי מקלדת
    document.addEventListener('keydown', handleKeyPress);
    
    // שמירה אוטומטית כל 30 שניות
    setInterval(autoSaveGame, 30000);
    
    // שמירה בעת סגירת הדף
    window.addEventListener('beforeunload', () => {
        autoSaveGame();
        cleanupConfetti();
    });

    // בדיקה למשחק שמור
    setTimeout(checkForSavedGame, 1000);
});

// הגדרת פונקציות גלובליות
window.nextScreen = nextScreen;
window.savePlayersInfo = savePlayersInfo;
window.savePrizeInfo = savePrizeInfo;
window.startCountdown = startCountdown;
window.startQuestions = startQuestions;
window.answerQuestion = answerQuestion;
window.undoLastAction = undoLastAction;
window.showSensualTask = showSensualTask;
window.skipTask = skipTask;
window.completeTask = completeTask;
window.closeMessagePopup = closeMessagePopup;
window.confirmUndo = confirmUndo;
window.cancelUndo = cancelUndo;
window.shareResults = shareResults;
window.submitFeedback = submitFeedback;
window.restartGame = restartGame;
window.openSettings = openSettings;
window.saveSettings = saveSettings;
window.closeSettings = closeSettings;
window.toggleSettingsSection = toggleSettingsSection;
window.sendContactMessage = sendContactMessage;

window.toggleSound = toggleSound;
