const game = new Chess();
let board = null;
const moveHistory = [];
const capturedByWhite = [];
const capturedByBlack = [];
let whiteTime = 600; // 10 minutes in seconds
let blackTime = 600;
let activeTimer = null;
let timerInterval = null;
let opponentSelect = null;
const difficultySelect = document.getElementById('difficulty-select');
const difficultyLevels = {
  easy: 5,
  medium: 15,
  hard: 25
};

// Initialize the board and UI
function initializeBoard() {
  opponentSelect = document.getElementById('opponent-select');

  const config = {
    draggable: true,
    position: 'start',
    pieceTheme: 'img/{piece}.png',
    onDragStart,
    onDrop,
    onSnapEnd
  };
  
  board = Chessboard('board', config);

  updateStatus();
  updateTimerDisplay();
  startTimer();
  window.addEventListener('resize', board.resize);

  const pauseButton = document.getElementById('pause-button');

  pauseButton.addEventListener('click', () => {
    if (timerInterval) {
      stopTimer(); // Pause the timer
      pauseButton.textContent = 'Resume';
    } else {
      startTimer(); // Resume the timer
      pauseButton.textContent = 'Pause';
    }
  });
}

// Prevent illegal drags
function onDragStart(source, piece) {
  if (game.game_over()) return false;
  if (
    (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)
  ) return false;
}

// Handle a human move
function onDrop(source, target) {
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) return 'snapback';

  moveHistory.push(move);

  // Track captures
  if (move.captured) {
    const capColor = move.color === 'w' ? 'b' : 'w';
    const capPiece = move.captured.toUpperCase();
    const code = capColor + capPiece;  // e.g. 'bP' for a black pawn
    if (move.color === 'w') {
      capturedByWhite.push(code);
    } else {
      capturedByBlack.push(code);
    }
    updateCaptured();
  }

  updateStatus();
  updateMoveHistory();

  // If Stockfish is chosen and it's Black's turn, ask the engine
  if (
    opponentSelect &&
    opponentSelect.value === 'stockfish' &&
    game.turn() === 'b' &&
    !game.game_over()
  ) {
    // small delay so UI updates first
    setTimeout(requestStockfishMove, 250);
  }
}

// Sync the board graphic
function onSnapEnd() {
  board.position(game.fen());
}

// Ask the Stockfish REST API for a move
async function requestStockfishMove() {
  const fen = game.fen();
  const depth = difficultyLevels[difficultySelect.value] || 15; // Default to medium if not set
  const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.success) {
      const parts = data.bestmove.split(' ');
      const uci = parts[1];
      const from = uci.slice(0, 2);
      const to   = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : 'q';

      const engineMove = game.move({ from, to, promotion });
      if (engineMove) {
        if (engineMove.captured) {
          const capColor = engineMove.color === 'w' ? 'b' : 'w';
          const capPiece = engineMove.captured.toUpperCase();
          const code = capColor + capPiece;

          if (engineMove.color === 'w') {
            capturedByWhite.push(code);
          } else {
            capturedByBlack.push(code);
          }
        }

        moveHistory.push(engineMove);
        board.position(game.fen());
        updateStatus();
        updateMoveHistory();
        updateCaptured();
      }
    } else {
      console.error('Stockfish error:', data.data);
    }
  } catch (err) {
    console.error('API call failed:', err);
  }
}

// Update game status
function updateStatus() {
  let status = '';
  const turn = game.turn() === 'w' ? 'White' : 'Black';
  
  if (game.game_over()) {
    if (game.in_checkmate()) {
      status = `Checkmate! ${turn === 'White' ? 'Black' : 'White'} wins`;
      stopTimer();
    } else if (game.in_draw()) {
      status = 'Game ended in draw';
      stopTimer();
    }
  } else {
    status = `${turn} to move`;
    if (game.in_check()) {
      status += ' (in check)';
    }
    
    // Switch active timer if needed
    if (activeTimer !== game.turn()) {
      activeTimer = game.turn();
      updateTimerDisplay();
    }
  }
  
  document.getElementById('status').textContent = status;
}

// Update move history display
function updateMoveHistory() {
  const historyElement = document.getElementById('move-history');
  historyElement.innerHTML = '';
  
  let moveNum = 1;
  let html = '';
  
  for (let i = 0; i < moveHistory.length; i += 2) {
    html += `<div class="move-pair">`;
    html += `<span class="move-number">${moveNum}.</span>`;
    html += `<span class="move-notation">${moveHistory[i].san}</span>`;
    
    if (i + 1 < moveHistory.length) {
      html += `<span class="move-notation">${moveHistory[i+1].san}</span>`;
    }
    
    html += `</div>`;
    moveNum++;
  }
  
  historyElement.innerHTML = html;
  historyElement.scrollTop = historyElement.scrollHeight;
}

// Update captured pieces display
function updateCaptured() {
  const whiteDiv = document.querySelector('#captured-by-white .captured-pieces');
  whiteDiv.innerHTML = '';
  capturedByWhite.forEach(code => {
    const img = document.createElement('img');
    img.src = `img/${code}.png`;
    img.className = 'captured-piece';
    whiteDiv.appendChild(img);
  });

  const blackDiv = document.querySelector('#captured-by-black .captured-pieces');
  blackDiv.innerHTML = '';
  capturedByBlack.forEach(code => {
    const img = document.createElement('img');
    img.src = `img/${code}.png`;
    img.className = 'captured-piece';
    blackDiv.appendChild(img);
  });
}

// Timer functions
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateTimerDisplay() {
  document.querySelector('#white-timer span').textContent = formatTime(whiteTime);
  document.querySelector('#black-timer span').textContent = formatTime(blackTime);
  
  // Remove active class from both timers
  document.getElementById('white-timer').classList.remove('active-timer');
  document.getElementById('black-timer').classList.remove('active-timer');
  
  // Add active class to current player's timer
  if (activeTimer === 'w') {
    document.getElementById('white-timer').classList.add('active-timer');
  } else if (activeTimer === 'b') {
    document.getElementById('black-timer').classList.add('active-timer');
  }
}

function startTimer() {
  activeTimer = game.turn();
  updateTimerDisplay();
  
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    if (activeTimer === 'w') {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        stopTimer();
        alert("Time's up! Black wins.");
      }
    } else if (activeTimer === 'b') {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        stopTimer();
        alert("Time's up! White wins.");
      }
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeBoard);