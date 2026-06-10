document.addEventListener("DOMContentLoaded", () => {
  // --- Mobile Menu Toggle ---
  const mobileMenu = document.getElementById("mobile-menu");
  const navLinks = document.querySelector(".nav-links");
  if (mobileMenu) {
    mobileMenu.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // --- Configuration Channels & Webhooks ---
  const DISCORD_WEBHOOK_URL =
    "https://discord.com/api/webhooks/1511925348378345502/LPi0UDaqq4phhMqjp-Pyyo4FF8M2c9njAQlPXzWtlnDBYAtk4MRu3fLtcLBL9d2ugiRJ";
  const TARGET_CHANNEL_ID = "1511923669721546762";

  // --- Dynamic Word Lists ---
  const HAWAII_WORD_POOL = [
    "TREES", "OCEAN", "BEACH", "PALMS", "SHINE", "DRINK", "FOODS", "PIZZA", "TACOS", "TUNGS", "SIGMA", "WAVES", "ALOHA", "COAST", "REEFS", "SHORE", "SANDY", "SHELL", "SHARK", "WHALE", "FRUIT", "MANGO", "WATER", "BALLS", "SUNNY", "GRAPE", "HELLO"
  ];

  let VALID_DICTIONARY = [];
  let TARGET_WORD = "";

  let currentRow = 0;
  let currentTile = 0;
  let isGameOver = false;
  let ACTIVE_USER_DISCORD_ID = "Guest/Anonymous";

  const guessMatrix = [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ];

  const emojiHistoryMatrix = [];

  // --- DOM Component Initialization ---
  const gridContainer = document.getElementById("wordleGrid");
  const keyboardContainer = document.getElementById("keyboard");
  const gameWrapper = document.getElementById("gameWrapper");
  const lockoutOverlay = document.getElementById("lockoutOverlay");
  const timerElement = document.getElementById("countdownTimer");
  const lockStatusMsg = document.getElementById("lockoutStatusMsg");

  // Discord Modal Specific Nodes
  const discordOverlay = document.getElementById("discordOverlay");
  const discordCard = document.getElementById("discordCard");
  const discordIdInput = document.getElementById("discordIdInput");
  const discordSkipBtn = document.getElementById("discordSkipBtn");
  const discordContinueBtn = document.getElementById("discordContinueBtn");
  const discordPromptScreen = document.getElementById("discordPromptScreen");
  const discordStatusScreen = document.getElementById("discordStatusScreen");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  // --- Main Initialization Flow ---
  async function initGame() {
    try {
      const response = await fetch("wordlist.txt");
      if (!response.ok) {
        throw new Error(`Failed to load word list: ${response.statusText}`);
      }
      const rawText = await response.text();

      const words = rawText
        .split(/\r?\n/)
        .map((word) => word.trim().toUpperCase())
        .filter((word) => word.length > 0);

      if (words.length === 0) {
        throw new Error("The wordlist.txt file is empty.");
      }

      VALID_DICTIONARY = words;
      TARGET_WORD = getSessionWord();

      buildGrid();
      buildKeyboard();

      const isCurrentlyLocked = checkPersistentLockout();
      if (!isCurrentlyLocked) {
        setupDiscordPrompt();
      }
    } catch (error) {
      console.error("Game Initialization Error:", error);
      showToast("Error loading game data.");
    }
  }

  function getSessionWord() {
    let sessionWord = sessionStorage.getItem("currentWordleTarget");
    if (!sessionWord || !HAWAII_WORD_POOL.includes(sessionWord)) {
      const index = Math.floor(Math.random() * HAWAII_WORD_POOL.length);
      sessionWord = HAWAII_WORD_POOL[index];
      sessionStorage.setItem("currentWordleTarget", sessionWord);
    }
    return sessionWord;
  }

  function buildGrid() {
    gridContainer.innerHTML = "";
    for (let r = 0; r < 6; r++) {
      const rowElement = document.createElement("div");
      rowElement.className = "grid-row";
      rowElement.id = `row-${r}`;
      for (let c = 0; c < 5; c++) {
        const tileElement = document.createElement("div");
        tileElement.className = "tile";
        tileElement.id = `tile-${r}-${c}`;
        rowElement.appendChild(tileElement);
      }
      gridContainer.appendChild(rowElement);
    }
  }

  function buildKeyboard() {
    keyboardContainer.innerHTML = "";
    const keyboardRows = [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
    ];

    keyboardRows.forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "keyboard-row";
      row.forEach((key) => {
        const button = document.createElement("button");
        button.innerText = key;
        button.className = "key";
        if (key === "ENTER" || key === "DELETE") button.classList.add("wide");
        button.setAttribute("data-key", key);
        button.addEventListener("click", () => handleInput(key));
        rowDiv.appendChild(button);
      });
      keyboardContainer.appendChild(rowDiv);
    });
  }

  function setupDiscordPrompt() {
    discordIdInput.value = "";
    discordOverlay.style.display = "flex";

    const cachedDiscordId = localStorage.getItem("hserp_discord_id");
    if (cachedDiscordId) {
      discordIdInput.value = cachedDiscordId;
    }

    discordSkipBtn.addEventListener("click", () => {
      dismissDiscordModal();
    });

    discordContinueBtn.addEventListener("click", async () => {
      const discordIdValue = discordIdInput.value.trim();

      if (!discordIdValue) {
        showToast("Please input a valid Discord ID.");
        return;
      }

      if (!/^\d+$/.test(discordIdValue)) {
        showToast("IDs must consist strictly of digits.");
        return;
      }

      ACTIVE_USER_DISCORD_ID = discordIdValue;
      localStorage.setItem("hserp_discord_id", discordIdValue);

      discordPromptScreen.style.display = "none";
      discordStatusScreen.style.display = "block";

      const webhookSuccess = await fireInitializationWebhook(discordIdValue);

      if (webhookSuccess) {
        statusIndicator.classList.remove("status-loading");
        statusIndicator.classList.add("status-success");
        statusText.innerText = "Session Linked!";

        setTimeout(() => {
          dismissDiscordModal();
        }, 1000);
      } else {
        showToast("Webhook sync error. Continuing as Guest.");
        discordStatusScreen.style.display = "none";
        discordPromptScreen.style.display = "block";
        ACTIVE_USER_DISCORD_ID = "Guest/Anonymous";
      }
    });
  }

  async function fireInitializationWebhook(userId) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("YOUR_DISCORD_WEBHOOK")) {
      return true;
    }

    const payload = {
      embeds: [
        {
          title: "🔗 Wordle Account Linked",
          description: `A user has joined the match matrix for today's puzzle event loop.`,
          color: 0x5865f2,
          fields: [
            { name: "Discord User ID", value: `<@${userId}> (\`${userId}\`)`, inline: true },
            { name: "Channel Destination ID", value: `\`${TARGET_CHANNEL_ID}\``, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  async function fireGuessWebhook(currentEmojis) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("YOUR_DISCORD_WEBHOOK")) {
      return;
    }

    const boardStateGridString = emojiHistoryMatrix.join("\n");
    const payload = {
      embeds: [
        {
          title: `🟩 Wordle Turn Submission — Attempt ${currentRow + 1}/6`,
          description: `Progress matrices submitted by profile: <@${ACTIVE_USER_DISCORD_ID}>`,
          color: currentEmojis === "🟩🟩🟩🟩🟩" ? 0x10b981 : 0xf59e0b,
          fields: [
            { name: "User Identification Parameters", value: `\`${ACTIVE_USER_DISCORD_ID}\``, inline: true },
            { name: "Latest Line State", value: currentEmojis, inline: true },
            { name: "Cumulative Match Grid View", value: `\`\`\`\n${boardStateGridString}\n\`\`\``, inline: false },
          ],
          footer: { text: `Channel Map Destination: ${TARGET_CHANNEL_ID}` },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Guess tracking relay down:", err);
    }
  }

  function dismissDiscordModal() {
    discordOverlay.style.opacity = "0";
    discordCard.style.transform = "scale(0.9) translateY(-20px)";
    setTimeout(() => {
      discordOverlay.style.display = "none";
      discordPromptScreen.style.display = "block";
      discordStatusScreen.style.display = "none";
      statusIndicator.className = "status-circle status-loading";
      statusText.innerText = "Verifying Profile Account...";
    }, 500);
  }

  function handleInput(key) {
    if (isGameOver || !TARGET_WORD) return;

    if (key === "ENTER") {
      submitGuess();
    } else if (key === "DELETE" || key === "BACKSPACE") {
      removeLetter();
    } else if (/^[A-Z]$/.test(key.toUpperCase())) {
      addLetter(key.toUpperCase());
    }
  }

  window.addEventListener("keydown", (e) => {
    let key = e.key.toUpperCase();
    if (e.key === "Backspace") key = "DELETE";
    handleInput(key);
  });

  function addLetter(letter) {
    if (currentTile < 5 && currentRow < 6) {
      guessMatrix[currentRow][currentTile] = letter;
      const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
      tile.innerText = letter;
      tile.setAttribute("data-state", "toggled");
      currentTile++;
    }
  }

  function removeLetter() {
    if (currentTile > 0) {
      currentTile--;
      guessMatrix[currentRow][currentTile] = "";
      const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
      tile.innerText = "";
      tile.removeAttribute("data-state");
    }
  }

  // --- Evaluation Logic ---
  function submitGuess() {
    if (currentTile < 5) {
      showToast("Not enough letters");
      return;
    }

    const currentGuess = guessMatrix[currentRow].join("");
    const currentRowElement = document.getElementById(`row-${currentRow}`);

    if (!VALID_DICTIONARY.includes(currentGuess)) {
      showToast("Not in word list");
      currentRowElement.classList.add("shake");
      setTimeout(() => currentRowElement.classList.remove("shake"), 500);
      return;
    }

    const letterCounts = {};
    for (let i = 0; i < TARGET_WORD.length; i++) {
      letterCounts[TARGET_WORD[i]] = (letterCounts[TARGET_WORD[i]] || 0) + 1;
    }

    const rowTiles = [];
    const finalStates = new Array(5);
    const roundEmojiRowArray = new Array(5);

    for (let i = 0; i < 5; i++) {
      rowTiles.push(document.getElementById(`tile-${currentRow}-${i}`));
    }

    for (let i = 0; i < 5; i++) {
      if (currentGuess[i] === TARGET_WORD[i]) {
        finalStates[i] = "correct";
        roundEmojiRowArray[i] = "🟩";
        letterCounts[currentGuess[i]]--;
      }
    }

    for (let i = 0; i < 5; i++) {
      if (finalStates[i] === "correct") continue;

      const guessedLetter = currentGuess[i];
      if (TARGET_WORD.includes(guessedLetter) && letterCounts[guessedLetter] > 0) {
        finalStates[i] = "present";
        roundEmojiRowArray[i] = "🟨";
        letterCounts[guessedLetter]--;
      } else {
        finalStates[i] = "absent";
        roundEmojiRowArray[i] = "⬛";
      }
    }

    const computedEmojiString = roundEmojiRowArray.join("");
    emojiHistoryMatrix.push(computedEmojiString);

    fireGuessWebhook(computedEmojiString);

    rowTiles.forEach((tile, index) => {
      setTimeout(() => {
        tile.classList.add("flip");
        setTimeout(() => {
          tile.setAttribute("data-state", finalStates[index]);
          updateKeyboardKey(currentGuess[index], finalStates[index]);
        }, 250);
      }, index * 150);
    });

    setTimeout(() => {
      if (currentGuess === TARGET_WORD) {
        showToast("Excellent! Word found.");
        triggerLockout(true);
      } else {
        currentRow++;
        currentTile = 0;
        if (currentRow >= 6) {
          showToast(`Game Over! Word was: ${TARGET_WORD}`);
          triggerLockout(false);
        }
      }
    }, 5 * 150 + 250);
  }

  function updateKeyboardKey(letter, state) {
    const keyButton = document.querySelector(`.key[data-key="${letter}"]`);
    if (!keyButton) return;
    const currentState = keyButton.getAttribute("data-state");
    if (currentState === "correct") return;
    if (currentState === "present" && state === "absent") return;
    keyButton.setAttribute("data-state", state);
  }

  function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // RILEY: Cooldown is back, but configured to exactly 3 hours!
  function triggerLockout(isVictory) {
    isGameOver = true;
    lockStatusMsg.innerText = isVictory
      ? `Phenomenal job! You successfully uncovered the word: ${TARGET_WORD}.`
      : `Nice try! The correct word today was: ${TARGET_WORD}.`;

    const threeHoursInMs = 3 * 60 * 60 * 1000; 
    const lockEndTimeStamp = Date.now() + threeHoursInMs;

    localStorage.setItem("wordleLockEndTime", lockEndTimeStamp.toString());
    localStorage.setItem("wordleLockMessage", lockStatusMsg.innerText);

    applyLockoutUI();
    startCountdown(lockEndTimeStamp);
  }

  function applyLockoutUI() {
    gameWrapper.classList.add("blurred");
    lockoutOverlay.style.display = "flex";
  }

  function startCountdown(endTime) {
    function updateClock() {
      const now = Date.now();
      const distance = endTime - now;

      if (distance <= 0) {
        clearInterval(timerInterval);
        localStorage.removeItem("wordleLockEndTime");
        localStorage.removeItem("wordleLockMessage");
        localStorage.removeItem("hserp_discord_id");

        gameWrapper.classList.remove("blurred");
        lockoutOverlay.style.display = "none";
        window.location.reload();
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      timerElement.innerText = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    updateClock();
    const timerInterval = setInterval(updateClock, 1000);
  }

  function checkPersistentLockout() {
    const storedLockTime = localStorage.getItem("wordleLockEndTime");
    const storedMessage = localStorage.getItem("wordleLockMessage");

    if (storedLockTime) {
      const endTimeParsed = parseInt(storedLockTime, 10);
      if (Date.now() < endTimeParsed) {
        isGameOver = true;
        if (storedMessage) lockStatusMsg.innerText = storedMessage;
        applyLockoutUI();
        startCountdown(endTimeParsed);
        return true;
      } else {
        localStorage.removeItem("wordleLockEndTime");
        localStorage.removeItem("wordleLockMessage");
        localStorage.removeItem("hserp_discord_id");
      }
    }
    return false;
  }

  initGame();
});
