document.addEventListener('DOMContentLoaded', () => {
    let selectedWord = '';
    let guessedLetters = [];
    let incorrectGuesses = 0;
    const maxIncorrectGuesses = 6;
    let currentDifficulty = 'moderate'; // Default difficulty

    // Hint related variables
    let hintsRemaining = 0;
    let maxHints = 0;

    // Sound Effects - Make sure to replace with your actual filenames in assets/sounds/
    const correctSound = new Audio('assets/sounds/correct_sound.mp3');
    const incorrectSound = new Audio('assets/sounds/incorrect_sound.mp3');
    const winSound = new Audio('assets/sounds/win_sound.mp3');
    const loseSound = new Audio('assets/sounds/lose_sound.mp3');
    const hintUsedSound = new Audio('assets/sounds/hint_sound.mp3');
    const modeChangeSound = new Audio('assets/sounds/mode_change_sound.mp3');
    const resetSound = new Audio('assets/sounds/reset_sound.mp3');

    const wordDisplay = document.getElementById('word-display');
    const guessesLeftDisplay = document.getElementById('guesses-left');
    const keyboardContainer = document.getElementById('keyboard');
    const hangmanParts = document.querySelectorAll('.body-part');
    const resetButton = document.getElementById('reset-button');
    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverMessage = document.getElementById('game-over-message');
    const correctWordDisplay = document.getElementById('correct-word-display');
    const playAgainButton = document.getElementById('play-again-button');
    const gameContainer = document.getElementById('game-container');
    const confettiContainer = document.getElementById('confetti-container');
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    const hintButton = document.getElementById('hint-button');
    const hintsRemainingDisplay = document.getElementById('hints-remaining');

    const RANDOM_WORD_API_URL_BASE = 'https://random-word-api.herokuapp.com/word';

    difficultyRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value !== currentDifficulty) {
                if (modeChangeSound) modeChangeSound.play().catch(e => console.error("Error playing mode change sound:", e));
            }
            currentDifficulty = this.value;
            // Visually update which radio is checked (though browser does this, good for state consistency if needed elsewhere)
            difficultyRadios.forEach(r => r.checked = (r.value === currentDifficulty));
            initializeGame();
        });
    });

    hintButton.addEventListener('click', useHint);

    resetButton.addEventListener('click', () => {
        if (resetSound) resetSound.play().catch(e => console.error("Error playing reset sound:", e));
        initializeGame();
    });

    playAgainButton.addEventListener('click', () => {
        if (resetSound) resetSound.play().catch(e => console.error("Error playing reset sound:", e));
        initializeGame();
    });


    function setMaxHints() {
        switch (currentDifficulty) {
            case 'easy':
                maxHints = 2;
                break;
            case 'moderate':
                maxHints = 3;
                break;
            case 'hard':
                maxHints = 4;
                break;
            default:
                maxHints = 1;
        }
        hintsRemaining = maxHints;
    }

    function updateHintButtonUI() {
        if (hintsRemainingDisplay) {
            hintsRemainingDisplay.textContent = `(${hintsRemaining} left)`;
        }
        if (hintButton) {
            const gameIsOver = incorrectGuesses >= maxIncorrectGuesses || (selectedWord && selectedWord.split('').every(char => guessedLetters.includes(char)));
            hintButton.disabled = hintsRemaining <= 0 || !selectedWord || gameIsOver;
        }
    }

    function useHint() {
        if (hintsRemaining <= 0 || !selectedWord) return;

        const unrevealedLetters = selectedWord.split('').filter(letter => !guessedLetters.includes(letter));

        if (unrevealedLetters.length > 0) {
            if (hintUsedSound) hintUsedSound.play().catch(e => console.error("Error playing hint sound:", e));

            const hintLetter = unrevealedLetters[Math.floor(Math.random() * unrevealedLetters.length)];
            const keyButtons = keyboardContainer.querySelectorAll('.key-button');
            let letterButtonElement;
            keyButtons.forEach(btn => {
                if (btn.textContent === hintLetter) {
                    letterButtonElement = btn;
                }
            });

            if (letterButtonElement && !letterButtonElement.disabled) {
                guessedLetters.push(hintLetter);
                letterButtonElement.disabled = true;
                letterButtonElement.classList.add('correct');
                // letterButtonElement.classList.add('hint-revealed'); // Optional

                updateWordDisplay();
                checkWinCondition();

                hintsRemaining--;
                updateHintButtonUI();
            }
        }
    }

    async function fetchRandomWord() {
        let wordLengthMin, wordLengthMax, targetLength;
        const maxOverallAttempts = 5, maxAttemptsPerLength = 3;

        switch (currentDifficulty) {
            case 'easy': wordLengthMin = 3; wordLengthMax = 5; break;
            case 'hard': wordLengthMin = 9; wordLengthMax = 12; break;
            case 'moderate':
            default: wordLengthMin = 6; wordLengthMax = 8; break;
        }

        for (let overallAttempt = 0; overallAttempt < maxOverallAttempts; overallAttempt++) {
            targetLength = Math.floor(Math.random() * (wordLengthMax - wordLengthMin + 1)) + wordLengthMin;
            try {
                for (let attempt = 0; attempt < maxAttemptsPerLength; attempt++) {
                    const response = await fetch(`${RANDOM_WORD_API_URL_BASE}?length=${targetLength}`);
                    if (!response.ok) {
                        console.warn(`API (len ${targetLength}): ${response.status}. Attempt ${attempt + 1}`);
                        if (attempt === maxAttemptsPerLength - 1) break;
                        continue;
                    }
                    const data = await response.json();
                    const word = data[0] ? data[0].toUpperCase() : null;
                    if (word && /^[A-Z]+$/.test(word) && word.length === targetLength) return word;
                    // console.warn(`Invalid word (len ${targetLength}): ${word}. Attempt ${attempt + 1}`);
                }
            } catch (error) { console.error(`Err fetch len ${targetLength}:`, error); }
        }
        console.warn("Fallback: Fetching any random word.");
        try {
            const response = await fetch(RANDOM_WORD_API_URL_BASE);
            if (!response.ok) throw new Error("Fallback API fail");
            const data = await response.json();
            const word = data[0] ? data[0].toUpperCase() : null;
            if (word && /^[A-Z]+$/.test(word)) return word;
        } catch (error) { console.error("Fallback API fetch failed:", error); }

        console.error("Ultimate fallback: Using predefined word for difficulty: " + currentDifficulty);
        const fallbacks = {
            "easy": ["CAT", "SUN", "DOG", "RUN", "FLY"],
            "moderate": ["PLANET", "ORANGE", "ACTIVE", "SILVER", "PYTHON"],
            "hard": ["CHAMPION", "KEYBOARD", "LANGUAGE", "WONDERFUL", "MYSTERY"]
        };
        const set = fallbacks[currentDifficulty] || fallbacks["moderate"];
        return set[Math.floor(Math.random() * set.length)];
    }

    async function initializeGame() {
        disableKeyboardTemporarily(true);
        wordDisplay.innerHTML = '<p class="loading-text">Fetching a new word...</p>';
        keyboardContainer.innerHTML = '';

        difficultyRadios.forEach(radio => {
            radio.checked = radio.value === currentDifficulty;
        });

        setMaxHints();
        selectedWord = await fetchRandomWord();

        guessedLetters = [];
        incorrectGuesses = 0;

        wordDisplay.innerHTML = '';
        if (selectedWord) {
            selectedWord.split('').forEach(() => {
                const letterCard = document.createElement('div');
                letterCard.classList.add('letter-card');
                letterCard.textContent = '_';
                wordDisplay.appendChild(letterCard);
            });
        } else {
            wordDisplay.innerHTML = '<p class="loading-text" style="color:red;">Error loading word. Please Reset.</p>';
        }

        guessesLeftDisplay.textContent = maxIncorrectGuesses;
        resetHangman();
        createKeyboard();
        updateHintButtonUI();
        gameOverModal.style.display = 'none';
        gameContainer.classList.remove('grayscale-fade');
        stopConfetti();
        disableKeyboardTemporarily(false);
    }

    function resetHangman() {
        hangmanParts.forEach(part => {
            part.classList.remove('visible');
            part.style.opacity = '0';
            part.style.transform = 'scale(0.5)';
        });
    }

    function createKeyboard() {
        keyboardContainer.innerHTML = '';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        letters.split('').forEach(letter => {
            const button = document.createElement('button');
            button.classList.add('key-button');
            button.textContent = letter;
            button.addEventListener('click', () => handleGuess(letter, button));
            keyboardContainer.appendChild(button);
        });
    }

    function handleGuess(letter, buttonElement) {
        if (guessedLetters.includes(letter) || incorrectGuesses >= maxIncorrectGuesses || !selectedWord) {
            return;
        }
        guessedLetters.push(letter);
        buttonElement.disabled = true;

        if (selectedWord.includes(letter)) {
            if (correctSound) correctSound.play().catch(e => console.error("Error playing correct sound:", e));
            buttonElement.classList.add('correct');
            updateWordDisplay();
            checkWinCondition();
        } else {
            if (incorrectSound) incorrectSound.play().catch(e => console.error("Error playing incorrect sound:", e));
            buttonElement.classList.add('incorrect');
            incorrectGuesses++;
            guessesLeftDisplay.textContent = maxIncorrectGuesses - incorrectGuesses;
            updateHangmanDrawing();
            checkLoseCondition();
        }
    }

    function updateWordDisplay() {
        if (!selectedWord) return;
        const letterCards = wordDisplay.children;
        selectedWord.split('').forEach((char, index) => {
            if (letterCards[index] && guessedLetters.includes(char)) {
                if (letterCards[index].textContent === '_') {
                    letterCards[index].textContent = char;
                    letterCards[index].classList.add('revealed');
                }
            }
        });
    }

    function updateHangmanDrawing() {
        if (incorrectGuesses > 0 && incorrectGuesses <= hangmanParts.length) {
            const partToShow = document.getElementById(getHangmanPartId(incorrectGuesses));
            if (partToShow) {
                partToShow.classList.add('visible');
            }
        }
    }

    function getHangmanPartId(guessCount) {
        const partsOrder = ['head', 'body', 'left-arm', 'right-arm', 'left-leg', 'right-leg'];
        return partsOrder[guessCount - 1];
    }

    function checkWinCondition() {
        if (!selectedWord) return;
        const allLettersGuessed = selectedWord.split('').every(char => guessedLetters.includes(char));
        if (allLettersGuessed) {
            if (winSound) winSound.play().catch(e => console.error("Error playing win sound:", e));
            gameOverMessage.textContent = '🎉 You Win! 🎉';
            correctWordDisplay.textContent = `The word was: ${selectedWord}`;
            gameOverModal.style.display = 'flex';
            disableKeyboard();
            startConfetti();
            updateHintButtonUI();
        }
    }

    function checkLoseCondition() {
        if (incorrectGuesses >= maxIncorrectGuesses) {
            if (loseSound) loseSound.play().catch(e => console.error("Error playing lose sound:", e));
            gameOverMessage.textContent = '😭 You Lost 😭';
            correctWordDisplay.textContent = `The word was: ${selectedWord}`;
            gameOverModal.style.display = 'flex';
            gameContainer.classList.add('grayscale-fade');
            revealFullWord();
            disableKeyboard();
            updateHintButtonUI();
        }
    }

    function revealFullWord() {
        if (!selectedWord) return;
        const letterCards = wordDisplay.children;
        selectedWord.split('').forEach((char, index) => {
            if (letterCards[index] && letterCards[index].textContent === '_') {
                letterCards[index].textContent = char;
                letterCards[index].classList.add('revealed');
            }
        });
    }

    function disableKeyboard() {
        const buttons = keyboardContainer.querySelectorAll('.key-button');
        buttons.forEach(button => button.disabled = true);
    }

    function disableKeyboardTemporarily(disable) {
        resetButton.disabled = disable;
        playAgainButton.disabled = disable;
        difficultyRadios.forEach(radio => radio.disabled = disable);

        if (hintButton) {
            if (disable) {
                hintButton.disabled = true;
            } else {
                updateHintButtonUI();
            }
        }

        const keyButtons = keyboardContainer.querySelectorAll('.key-button');
        keyButtons.forEach(btn => btn.disabled = disable);
    }

    function startConfetti() {
        confettiContainer.innerHTML = '';
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.classList.add(`c${Math.ceil(Math.random() * 5)}`);
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confettiContainer.appendChild(confetti);
        }
    }

    function stopConfetti() {
        confettiContainer.innerHTML = '';
    }

    // Initial game setup: Ensure the correct radio button is checked based on currentDifficulty
    difficultyRadios.forEach(radio => {
        if (radio.value === currentDifficulty) {
            radio.checked = true;
        }
    });
    initializeGame();
});
