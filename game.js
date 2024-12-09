// Access the canvas and set up the context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set the canvas size to the full window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create a "Connect Wallet" overlay
const connectWalletButton = document.createElement("button");
connectWalletButton.textContent = "Connect Wallet";
connectWalletButton.style.position = "absolute";
connectWalletButton.style.left = "50%";
connectWalletButton.style.top = "50%";
connectWalletButton.style.transform = "translate(-50%, -50%)";
connectWalletButton.style.padding = "10px 20px";
connectWalletButton.style.fontSize = "20px";
connectWalletButton.style.cursor = "pointer";
document.body.appendChild(connectWalletButton);

// Create a leaderboard container
const leaderboardContainer = document.createElement("div");
leaderboardContainer.style.position = "absolute";
leaderboardContainer.style.left = "50%";
leaderboardContainer.style.top = "60%";
leaderboardContainer.style.transform = "translate(-50%, 0)";
leaderboardContainer.style.width = "80%";
leaderboardContainer.style.maxWidth = "600px";
leaderboardContainer.style.textAlign = "center";
leaderboardContainer.style.fontSize = "24px";
leaderboardContainer.style.lineHeight = "1.5";
leaderboardContainer.style.color = "#333";
leaderboardContainer.style.fontFamily = "Arial, sans-serif";
document.body.appendChild(leaderboardContainer);

// Pause the game until the wallet is connected
let gamePaused = true;
let walletPublicKey = null;

// Phantom Wallet Connection
async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const response = await window.solana.connect();
      walletPublicKey = response.publicKey.toString();
      alert(`Connected to Phantom Wallet: ${walletPublicKey}`);
      gamePaused = false;
      connectWalletButton.remove();
      leaderboardContainer.style.display = "none";
      gameLoop(); // Ensure the game loop starts
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  } else {
    alert("Phantom Wallet not found. Please install it!");
  }
}

connectWalletButton.addEventListener("click", connectWallet);

// Initialize the score and leaderboard
let score = 0;
let highestY = canvas.height;
let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

// Helper function to format numbers with commas
function formatNumber(number) {
  return number.toLocaleString("en-US");
}

// Function to update the leaderboard container
function updateLeaderboardContainer() {
  leaderboardContainer.innerHTML = "<h2>Leaderboard</h2>";
  const topPlayers = [...leaderboard]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (topPlayers.length === 0) {
    leaderboardContainer.innerHTML += "<p>No scores yet!</p>";
  } else {
    topPlayers.forEach((player, index) => {
      leaderboardContainer.innerHTML += `<p>${index + 1}. ${player.wallet}: ${formatNumber(player.score)}</p>`;
    });
  }
}

// Call this function initially to populate the leaderboard
updateLeaderboardContainer();

// Save the leaderboard to localStorage
function saveLeaderboard() {
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
}

// Define the player
const player = {
  x: canvas.width / 2,
  y: canvas.height - 150,
  width: 30,
  height: 60,
  headRadius: 15,
  dy: 0,
  gravity: 0.3,
  jumpStrength: -13,
};

// Define platforms, springs, and bombs
let platforms = [];
let springs = [];
let bombs = [];

// Add a permanent base platform
const basePlatform = {
  x: canvas.width / 2 - 60,
  y: canvas.height - 20,
  width: 120,
  height: 12,
  color: "green",
};
platforms.push(basePlatform);

// Create additional platforms, springs, and bombs
function initializeGameObjects() {
  platforms = [basePlatform];
  springs = [];
  bombs = [];

  for (let i = 1; i <= 35; i++) {
    const platform = {
      x: Math.random() * (canvas.width - 120),
      y: canvas.height - i * 50,
      width: 120,
      height: 12,
      color: "green",
    };
    platforms.push(platform);

    if (Math.random() < 0.3) {
      springs.push({
        x: platform.x + platform.width / 2 - 10,
        y: platform.y - 10,
        width: 20,
        height: 10,
        color: "yellow",
      });
    }

    if (Math.random() < 0.2) {
      bombs.push({
        x: platform.x + platform.width / 4,
        y: platform.y - 15,
        radius: 10,
        color: "black",
      });
    }
  }
}

// Initialize game objects
initializeGameObjects();

// Controls for player movement
let keys = {};
window.addEventListener("keydown", (e) => (keys[e.code] = true));
window.addEventListener("keyup", (e) => (keys[e.code] = false));

// Draw the player as a white-and-black cow
function drawPlayer() {
  // Body
  ctx.fillStyle = "white";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Black spots
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(player.x + player.width / 3, player.y + player.height / 4, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(player.x + (2 * player.width) / 3, player.y + (2 * player.height) / 3, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  // Head
  ctx.beginPath();
  ctx.arc(player.x + player.width / 2, player.y - player.headRadius, player.headRadius, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.closePath();

  // Eyes
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(player.x + player.width / 2 - 5, player.y - player.headRadius - 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(player.x + player.width / 2 + 5, player.y - player.headRadius - 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}

// Draw platforms
function drawPlatforms() {
  platforms.forEach((platform) => {
    ctx.fillStyle = platform.color;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  });
}

// Draw the scoreboard
function drawScoreboard() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${formatNumber(Math.floor(score))}`, 20, 40);
}

// Update the score based on the player's position
let lastScoreUpdate = Date.now();

function updateScore() {
  const now = Date.now();
  if (player.y < highestY) {
    score += Math.floor(highestY - player.y); // Accumulate score for upward movement
    highestY = player.y; // Update highest position
  } else if (player.dy < 0 || now - lastScoreUpdate > 100) {
    // Add points when the player is actively jumping upwards or over time
    score += 1;
    lastScoreUpdate = now;
  }
}

// Handle player movement
function updatePlayer() {
  player.dy += player.gravity;
  player.y += player.dy;

  if (keys["ArrowLeft"]) player.x -= 5;
  if (keys["ArrowRight"]) player.x += 5;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

  platforms.forEach((platform) => {
    if (
      player.y + player.height >= platform.y &&
      player.y + player.height <= platform.y + platform.height &&
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width &&
      player.dy > 0
    ) {
      player.dy = player.jumpStrength;
    }
  });

  // Check if player falls off the screen
  if (player.y > canvas.height) {
    alert("Game Over! Restarting...");
    restartGame();
  }
}

// Restart the game
function restartGame() {
  leaderboard.push({ wallet: walletPublicKey, score: Math.floor(score) });
  saveLeaderboard();
  updateLeaderboardContainer();
  score = 0;
  highestY = canvas.height;
  player.x = canvas.width / 2;
  player.y = canvas.height - 150;
  player.dy = 0;
  initializeGameObjects();
}

// Move platforms downward when the player goes higher
function updatePlatforms() {
  if (player.y < canvas.height / 2) {
    const displacement = canvas.height / 2 - player.y;
    player.y = canvas.height / 2;
    platforms.forEach((platform) => (platform.y += displacement));
    springs.forEach((spring) => (spring.y += displacement));
    bombs.forEach((bomb) => (bomb.y += displacement));
  }

  platforms.forEach((platform) => {
    if (platform.y > canvas.height) {
      platform.y = 0;
      platform.x = Math.random() * (canvas.width - platform.width);
    }
  });
}

// Main game loop
function gameLoop() {
  if (gamePaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePlayer();
  updatePlatforms();
  updateScore(); // Ensure score updates every frame
  drawPlayer();
  drawPlatforms();
  drawScoreboard();
  requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();