// Set up global constants and functions accessible to all HTML files
const LS_VOCAB = 'det_vocab_v2';
const LS_BLANKS = 'det_blanks_v2';
const LS_SCORE_HISTORY = 'det_score_history';
const QUIZ_LENGTH = 20;
const VOCAB_TIMER = 6;
const BLANKS_TIMER = 30;
const POINTS_PER_CORRECT = 5;
const KEY_ENTER = 13;
// Initialize AudioContext outside of functions for immediate availability
const AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)(); 

/** * Duolingo-style sound synthesis using Web Audio API
 */
function playSound(type) {
    const osc = AUDIO_CONTEXT.createOscillator();
    const gain = AUDIO_CONTEXT.createGain();
    osc.connect(gain);
    gain.connect(AUDIO_CONTEXT.destination);
    
    switch (type) {
        case 'correct':
            // High-pitched, short ding (like Duo's correct sound)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, AUDIO_CONTEXT.currentTime);
            gain.gain.setValueAtTime(0.5, AUDIO_CONTEXT.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, AUDIO_CONTEXT.currentTime + 0.15);
            break;
        case 'wrong':
            // Low-pitched, sharp 'bip' or 'fail' sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, AUDIO_CONTEXT.currentTime);
            gain.gain.setValueAtTime(0.4, AUDIO_CONTEXT.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, AUDIO_CONTEXT.currentTime + 0.3);
            break;
        case 'timeout':
             // Soft low chime
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, AUDIO_CONTEXT.currentTime);
            gain.gain.setValueAtTime(0.3, AUDIO_CONTEXT.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, AUDIO_CONTEXT.currentTime + 0.5);
            break;
        default:
            return;
    }
    
    osc.start();
    osc.stop(AUDIO_CONTEXT.currentTime + (type === 'wrong' ? 0.3 : 0.2));
}

/** * Data Utilities and Generator (Mock data for 5000/3000 items)
 * The generator now includes mock definitions and difficulty tagging.
 */
// The IIFE is immediately executed, setting up appData right away.
const appData = (() => {
    // Large, complex array used for mocking words/blanks
    const SEED_WORDS = [
        "ubiquitous", "ephemeral", "juxtapose", "serendipity", "melancholy",
        "eloquent", "benevolent", "obfuscate", "pragmatic", "dichotomy",
        "zenith", "labyrinth", "epiphany", "crescendo", "soliloquy",
        "belligerent", "cacophony", "euphemism", "paradigm", "vicarious",
        "ruminate", "alacrity", "equivocate", "recalcitrant", "pernicious",
        "pulchritudinous", "superfluous", "vociferous", "transient", "garrulous",
        "arduous", "fortitude", "gregarious", "mitigate", "ostentatious"
    ];

    const MOCK_BLANKS = [
        "The scientist carefully _______ the data.",
        "She decided to _______ the door and leave.",
        "It was a truly _______ experience for everyone.",
        "The manager tried to _______ the conflict quickly.",
        "You must _______ to the rules of the competition.",
        "I need to _______ the package before tomorrow.",
        "The ancient ruins were mostly _______ by sand.",
        "His _______ remark angered the whole crowd.",
        "They planned to _______ the project in the spring.",
        "Can you _______ what happened last night?",
    ];
    
    // Simple helper to shuffle an array
    const shuffle = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    const getDifficulty = (word) => {
        if (word.length <= 6) return 'Beginner';
        if (word.length <= 10) return 'Intermediate';
        return 'Advanced';
    };

    const mockDefinition = (word) => {
        const firstLetter = word.charAt(0).toUpperCase();
        return `Mock definition for ${word}. Related to: ${firstLetter}-something.`;
    };
    
    const mockExample = (word) => {
        return `The student used the word "${word}" correctly in the test.`;
    };

    // Generates the massive datasets
    function generateDatasets() {
        console.log("Generating 5000 Vocab and 3000 Blanks...");
        
        const vocab = [];
        const blanks = [];
        const numReal = 2500;
        const numFake = 2500;
        const numBlanks = 3000;
        
        // 1. Generate Real Words (2500)
        let realWordCounter = 0;
        while(realWordCounter < numReal) {
            const baseWord = SEED_WORDS[realWordCounter % SEED_WORDS.length];
            const word = baseWord + (Math.floor(Math.random() * 50) + realWordCounter).toString(36).substring(0, 2);
            vocab.push({
                word: word,
                isReal: true,
                difficulty: getDifficulty(word),
                definition: mockDefinition(word),
                example: mockExample(word)
            });
            realWordCounter++;
        }

        // 2. Generate Fake Words (2500)
        let fakeWordCounter = 0;
        while(fakeWordCounter < numFake) {
            const word = shuffle(SEED_WORDS.join('')).substring(0, 5) + (Math.floor(Math.random() * 99)).toString();
            vocab.push({
                word: word,
                isReal: false
            });
            fakeWordCounter++;
        }

        // 3. Generate Blanks (3000)
        let blankCounter = 0;
        while(blankCounter < numBlanks) {
            const sentenceTemplate = MOCK_BLANKS[blankCounter % MOCK_BLANKS.length];
            const answer = SEED_WORDS[blankCounter % SEED_WORDS.length];
            blanks.push({
                sentence: sentenceTemplate.replace('_______', '***'), // Use *** as the placeholder
                answer: answer,
                difficulty: getDifficulty(answer)
            });
            blankCounter++;
        }
        
        shuffle(vocab);
        shuffle(blanks);

        return { vocab, blanks };
    }

    // Loads/Generates and saves the datasets
    function ensureDatasetsReady() {
        if (localStorage.getItem(LS_VOCAB) && localStorage.getItem(LS_BLANKS)) {
            console.log("Datasets loaded from localStorage.");
            return;
        }

        const datasets = generateDatasets();
        
        try {
            localStorage.setItem(LS_VOCAB, JSON.stringify(datasets.vocab));
            localStorage.setItem(LS_BLANKS, JSON.stringify(datasets.blanks));
            console.log("Datasets generated and saved to localStorage.");
        } catch (error) {
            console.error("Error saving datasets to localStorage:", error);
            // Fallback for full storage: don't save, just use in memory
            return datasets;
        }
    }

    function getVocabArray() {
        const data = localStorage.getItem(LS_VOCAB);
        if (!data) return [];
        return JSON.parse(data);
    }

    function getBlanksArray() {
        const data = localStorage.getItem(LS_BLANKS);
        if (!data) return [];
        return JSON.parse(data);
    }
    
    function downloadJSON(filename, data){
        const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }
    
    function downloadDatasets(){
        const v = getVocabArray(); const b = getBlanksArray();
        downloadJSON('det_vocab_5000_v2.json', v);
        downloadJSON('det_blanks_3000_v2.json', b);
        console.log("Datasets downloaded.");
    }

    return {
        ensureDatasetsReady, getVocabArray, getBlanksArray, downloadDatasets, shuffle, getDifficulty
    };
})();
window.appData = appData; // Explicitly expose appData immediately


// -------------------------------------------
// Game State and Core Logic
// -------------------------------------------

let currentQuizArray = [];
let currentQuestionIndex = 0;
let currentScore = 0;
let currentMistakes = [];
let timerInterval = null;
let timeLeft = 0;

/** * UI and State Management Functions 
 */

// Saves the user's overall score history
function saveScoreHistory(mode, score) {
    const history = JSON.parse(localStorage.getItem(LS_SCORE_HISTORY) || '[]');
    history.push({
        mode: mode,
        score: score,
        date: new Date().toISOString(),
        correctCount: QUIZ_LENGTH - currentMistakes.length,
        mistakeCount: currentMistakes.length
    });
    localStorage.setItem(LS_SCORE_HISTORY, JSON.stringify(history));
}

// Resets game variables for a new season
function resetState() {
    currentQuizArray = [];
    currentQuestionIndex = 0;
    currentScore = 0;
    currentMistakes = [];
    stopTimer();
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('score-display');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${currentScore} | Q: ${currentQuestionIndex}/${QUIZ_LENGTH}`;
    }
}

function updateProgressBar() {
    const progressElement = document.getElementById('progress-bar');
    if (progressElement) {
        const percentage = (currentQuestionIndex / QUIZ_LENGTH) * 100;
        progressElement.style.width = `${percentage}%`;
    }
}

/** * Timer Functions 
 */

function startTimer(duration, callback) {
    stopTimer();
    timeLeft = duration;
    const timerElement = document.getElementById('timer-display');
    if (!timerElement) return;

    timerElement.textContent = `${timeLeft}s`;
    timerElement.style.color = (timeLeft <= 3) ? 'var(--color-duo-red)' : 'var(--color-primary-text)';

    timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `${timeLeft}s`;
        if (timeLeft <= 3) {
            timerElement.style.color = 'var(--color-duo-red)';
        }

        if (timeLeft <= 0) {
            stopTimer();
            callback();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/** * Dark Mode Functions 
 */

function setupDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    
    // Attach event listener to the toggle button (if present)
    const toggleButton = document.getElementById('dark-mode-toggle');
    if (toggleButton) {
        toggleButton.onclick = toggleDarkMode;
        // Update icon based on current state
        toggleButton.innerHTML = isDarkMode ? '&#9728;' : '&#9790;'; // Sun or Moon
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    const toggleButton = document.getElementById('dark-mode-toggle');
    if (toggleButton) {
        toggleButton.innerHTML = isDarkMode ? '&#9728;' : '&#9790;'; // Sun or Moon
    }
}


// Expose necessary functions globally for use in HTML files
// NOTE: appData is already exposed above for immediate access
window.resetState = resetState;
window.updateScoreDisplay = updateScoreDisplay;
window.updateProgressBar = updateProgressBar;
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.playSound = playSound;
window.saveScoreHistory = saveScoreHistory;
window.setupDarkMode = setupDarkMode; // Now setupDarkMode is defined when onload is called

// Make core state variables available for modification in practice pages
window.currentQuizArray = currentQuizArray;
window.currentQuestionIndex = currentQuestionIndex;
window.currentScore = currentScore;
window.currentMistakes = currentMistakes;
window.QUIZ_LENGTH = QUIZ_LENGTH;
window.POINTS_PER_CORRECT = POINTS_PER_CORRECT;
window.VOCAB_TIMER = VOCAB_TIMER;
window.BLANKS_TIMER = BLANKS_TIMER;
window.KEY_ENTER = KEY_ENTER;
