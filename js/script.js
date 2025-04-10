const game = new Chess();
let board = null;
const moveHistory = [];
let whiteTime = 600; // 10 minutes in seconds
let blackTime = 600;
let activeTimer = null;
let timerInterval = null;

// Initialize the board
function initializeBoard() {
  const config = {
    draggable: true,
    position: 'start',
    pieceTheme: 'img/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  };
  
  board = Chessboard('board', config);
  
  // Initial UI update
  updateStatus();
  updateTimerDisplay();
  
  // Start timers
  startTimer();

  // Handle window resize
  window.addEventListener('resize', board.resize);
}

function onDragStart(source, piece) {
  // Don't allow moves if game is over
  if (game.game_over()) return false;

  // Only allow the current player to move their pieces
  if (
    (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
}

function onDrop(source, target) {
  // Try to make the move
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q' // Always promote to queen for simplicity
  });

  // If illegal move
  if (move === null) return 'snapback';
  
  // Valid move
  moveHistory.push(move);
  updateStatus();
  updateMoveHistory();
}

function onSnapEnd() {
  board.position(game.fen());
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