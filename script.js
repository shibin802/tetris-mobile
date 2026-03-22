const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const EMPTY = 0;

const COLORS = {
  1: '#22c55e',
  2: '#60a5fa',
  3: '#f59e0b',
  4: '#fb7185',
  5: '#a78bfa',
  6: '#facc15',
  7: '#2dd4bf'
};

const SHAPES = [
  [],
  [[1,1,1],[0,1,0]],
  [[2,2,2,2]],
  [[3,3],[3,3]],
  [[0,4,4],[4,4,0]],
  [[5,5,0],[0,5,5]],
  [[6,6,6],[6,0,0]],
  [[7,7,7],[0,0,7]]
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const nextMobileCanvas = document.getElementById('next-mobile');
const nextMobileCtx = nextMobileCanvas ? nextMobileCanvas.getContext('2d') : null;

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('status');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlay-title');
const overlayTextEl = document.getElementById('overlay-text');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');

let board;
let piece;
let nextPiece;
let score;
let lines;
let level;
let dropCounter;
let lastTime;
let dropInterval;
let running = false;
let paused = false;
let animationId = null;
let touchStartX = 0;
let touchStartY = 0;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  return {
    matrix: SHAPES[type].map(row => [...row]),
    color: type,
    x: Math.floor(COLS / 2) - Math.ceil(SHAPES[type][0].length / 2),
    y: 0
  };
}

function resetGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 700;
  dropCounter = 0;
  lastTime = 0;
  paused = false;
  running = false;
  piece = randomPiece();
  nextPiece = randomPiece();
  updateHud();
  setStatus('点击开始游戏');
  showOverlay('准备开始', '手机点按下方按钮，电脑可用方向键 + 上键旋转。');
  draw();
  drawNext();
  stopLoop();
}

function updateHud() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function showOverlay(title, text, buttonText = '开始游戏') {
  overlayTitleEl.textContent = title;
  overlayTextEl.textContent = text;
  startBtn.textContent = buttonText;
  overlayEl.classList.add('visible');
}

function hideOverlay() {
  overlayEl.classList.remove('visible');
}

function startGame() {
  if (!running) {
    running = true;
    paused = false;
    hideOverlay();
    setStatus('进行中');
    lastTime = 0;
    loop();
  }
}

function stopLoop() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
}

function loop(time = 0) {
  if (!running || paused) return;
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  animationId = requestAnimationFrame(loop);
}

function collide(targetBoard, targetPiece) {
  const { matrix, x, y } = targetPiece;
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col] !== EMPTY) {
        const newY = y + row;
        const newX = x + col;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        if (newY >= 0 && targetBoard[newY][newX] !== EMPTY) return true;
      }
    }
  }
  return false;
}

function merge() {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== EMPTY) {
        board[piece.y + y][piece.x + x] = value;
      }
    });
  });
}

function sweepLines() {
  let cleared = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] === EMPTY) continue outer;
    }
    const row = board.splice(y, 1)[0].fill(EMPTY);
    board.unshift(row);
    cleared++;
    y++;
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 8) + 1;
    dropInterval = Math.max(180, 700 - (level - 1) * 45);
    updateHud();
  }
}

function spawnPiece() {
  piece = nextPiece;
  piece.x = Math.floor(COLS / 2) - Math.ceil(piece.matrix[0].length / 2);
  piece.y = 0;
  nextPiece = randomPiece();
  drawNext();

  if (collide(board, piece)) {
    gameOver();
  }
}

function gameOver() {
  running = false;
  paused = false;
  stopLoop();
  setStatus('游戏结束');
  showOverlay('游戏结束', `本局得分 ${score}，共消除 ${lines} 行。`, '重新开始');
}

function playerMove(dir) {
  piece.x += dir;
  if (collide(board, piece)) piece.x -= dir;
  draw();
}

function rotate(matrix) {
  return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
}

function playerRotate() {
  const old = piece.matrix;
  piece.matrix = rotate(piece.matrix);
  if (collide(board, piece)) {
    piece.matrix = old;
  }
  draw();
}

function playerDrop() {
  piece.y++;
  if (collide(board, piece)) {
    piece.y--;
    merge();
    sweepLines();
    spawnPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(board, piece)) {
    piece.y++;
  }
  piece.y--;
  merge();
  sweepLines();
  spawnPiece();
  dropCounter = 0;
  draw();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    stopLoop();
    setStatus('已暂停');
    showOverlay('已暂停', '休息一下也行，点继续就能接着玩。', '继续游戏');
  } else {
    hideOverlay();
    setStatus('进行中');
    lastTime = 0;
    loop();
  }
}

function drawCell(targetCtx, x, y, value, size) {
  if (value === EMPTY) return;
  targetCtx.fillStyle = COLORS[value];
  targetCtx.fillRect(x * size, y * size, size, size);
  targetCtx.strokeStyle = 'rgba(255,255,255,0.18)';
  targetCtx.lineWidth = 2;
  targetCtx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawBoard() {
  ctx.fillStyle = '#08111d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      drawCell(ctx, x, y, board[y][x], BLOCK);
    }
  }
}

function drawPiece() {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== EMPTY) drawCell(ctx, piece.x + x, piece.y + y, value, BLOCK);
    });
  });
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(canvas.width, y * BLOCK);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  drawBoard();
  drawGrid();
  drawPiece();
}

function paintNext(targetCtx, targetCanvas, size) {
  if (!targetCtx || !targetCanvas) return;
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const matrix = nextPiece.matrix;
  const offsetX = (targetCanvas.width - matrix[0].length * size) / 2;
  const offsetY = (targetCanvas.height - matrix.length * size) / 2;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== EMPTY) {
        targetCtx.fillStyle = COLORS[value];
        targetCtx.fillRect(offsetX + x * size, offsetY + y * size, size, size);
        targetCtx.strokeStyle = 'rgba(255,255,255,0.18)';
        targetCtx.strokeRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
      }
    });
  });
}

function drawNext() {
  paintNext(nextCtx, nextCanvas, 24);
  paintNext(nextMobileCtx, nextMobileCanvas, 18);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const controlKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'];
  if (controlKeys.includes(key)) event.preventDefault();

  if (!running && (key === 'arrowleft' || key === 'arrowright' || key === 'arrowdown' || key === 'arrowup')) {
    startGame();
  }

  if (key === 'arrowleft' || key === 'a') playerMove(-1);
  else if (key === 'arrowright' || key === 'd') playerMove(1);
  else if (key === 'arrowdown' || key === 's') playerDrop();
  else if (key === 'arrowup' || key === 'w') playerRotate();
  else if (key === ' ') togglePause();
});

document.querySelectorAll('.control-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (!running && action) startGame();
    if (action === 'left') playerMove(-1);
    else if (action === 'right') playerMove(1);
    else if (action === 'down') playerDrop();
    else if (action === 'rotate') playerRotate();
    else if (action === 'drop') hardDrop();
  });
});

startBtn.addEventListener('click', () => {
  if (paused) togglePause();
  else {
    resetGame();
    startGame();
  }
});

pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', () => {
  resetGame();
});

canvas.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener('touchmove', (event) => {
  event.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (!running) startGame();

  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
    playerRotate();
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 18) playerMove(1);
    else if (dx < -18) playerMove(-1);
  } else {
    if (dy > 18) playerDrop();
    else if (dy < -18) playerRotate();
  }
}, { passive: true });

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) event.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });

resetGame();
