const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const EMPTY = 0;

const COLORS = {
  1: '#22c55e', 2: '#60a5fa', 3: '#f59e0b', 4: '#fb7185',
  5: '#a78bfa', 6: '#facc15', 7: '#2dd4bf'
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
const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
const nextMobileCanvas = document.getElementById('next-mobile');
const nextMobileCtx = nextMobileCanvas ? nextMobileCanvas.getContext('2d') : null;

// Score elements: desktop + mobile
const $ = (id) => document.getElementById(id);
const scoreEls = [$('score-d'), $('score-m')].filter(Boolean);
const linesEls = [$('lines-d'), $('lines-m')].filter(Boolean);
const levelEls = [$('level-d'), $('level-m')].filter(Boolean);
const statusEl = $('status');
const overlayEl = $('overlay');
const overlayTitleEl = $('overlay-title');
const overlayTextEl = $('overlay-text');
const startBtn = $('start-btn');
const pauseBtn = $('pause-btn');
const restartBtn = $('restart-btn');
const pauseBtnM = $('pause-btn-m');
const restartBtnM = $('restart-btn-m');

let board, piece, nextPiece, score, lines, level;
let dropCounter, lastTime, dropInterval;
let running = false, paused = false, animationId = null;
let touchStartX = 0, touchStartY = 0;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  return {
    matrix: SHAPES[type].map(r => [...r]),
    color: type,
    x: Math.floor(COLS / 2) - Math.ceil(SHAPES[type][0].length / 2),
    y: 0
  };
}

function resetGame() {
  board = createBoard();
  score = 0; lines = 0; level = 1;
  dropInterval = 700; dropCounter = 0; lastTime = 0;
  paused = false; running = false;
  piece = randomPiece();
  nextPiece = randomPiece();
  updateHud();
  if (statusEl) statusEl.textContent = '点击开始游戏';
  showOverlay('准备开始', '手机点按下方按钮或在画布上滑动。电脑用方向键。');
  draw(); drawNext(); stopLoop();
}

function updateHud() {
  scoreEls.forEach(el => el.textContent = score);
  linesEls.forEach(el => el.textContent = lines);
  levelEls.forEach(el => el.textContent = level);
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function showOverlay(title, text, buttonText = '开始游戏') {
  if (overlayTitleEl) overlayTitleEl.textContent = title;
  if (overlayTextEl) overlayTextEl.textContent = text;
  if (startBtn) startBtn.textContent = buttonText;
  if (overlayEl) overlayEl.classList.add('visible');
}

function hideOverlay() {
  if (overlayEl) overlayEl.classList.remove('visible');
}

function startGame() {
  if (!running) {
    running = true; paused = false;
    hideOverlay(); setStatus('进行中');
    lastTime = 0; loop();
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
  if (dropCounter > dropInterval) playerDrop();
  draw();
  animationId = requestAnimationFrame(loop);
}

function collide(b, p) {
  const { matrix, x, y } = p;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] !== EMPTY) {
        const ny = y + r, nx = x + c;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && b[ny][nx] !== EMPTY) return true;
      }
    }
  }
  return false;
}

function merge() {
  piece.matrix.forEach((row, y) => {
    row.forEach((v, x) => { if (v !== EMPTY) board[piece.y + y][piece.x + x] = v; });
  });
}

function sweepLines() {
  let cleared = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) if (board[y][x] === EMPTY) continue outer;
    board.splice(y, 1)[0].fill(EMPTY);
    board.unshift(Array(COLS).fill(EMPTY));
    cleared++; y++;
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
  if (collide(board, piece)) gameOver();
}

function gameOver() {
  running = false; paused = false; stopLoop();
  setStatus('游戏结束');
  showOverlay('游戏结束', `本局得分 ${score}，共消除 ${lines} 行。`, '重新开始');
}

function playerMove(dir) {
  piece.x += dir;
  if (collide(board, piece)) piece.x -= dir;
  draw();
}

function rotate(m) {
  return m[0].map((_, i) => m.map(row => row[i]).reverse());
}

function playerRotate() {
  const old = piece.matrix;
  piece.matrix = rotate(piece.matrix);
  if (collide(board, piece)) piece.matrix = old;
  draw();
}

function playerDrop() {
  piece.y++;
  if (collide(board, piece)) { piece.y--; merge(); sweepLines(); spawnPiece(); }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(board, piece)) piece.y++;
  piece.y--;
  merge(); sweepLines(); spawnPiece();
  dropCounter = 0; draw();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    stopLoop(); setStatus('已暂停');
    showOverlay('已暂停', '休息一下也行，点继续就能接着玩。', '继续游戏');
  } else {
    hideOverlay(); setStatus('进行中');
    lastTime = 0; loop();
  }
}

function drawCell(tCtx, x, y, v, s) {
  if (v === EMPTY) return;
  tCtx.fillStyle = COLORS[v];
  tCtx.fillRect(x*s, y*s, s, s);
  tCtx.strokeStyle = 'rgba(255,255,255,0.18)';
  tCtx.lineWidth = 2;
  tCtx.strokeRect(x*s+1, y*s+1, s-2, s-2);
}

function drawBoard() {
  ctx.fillStyle = '#08111d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      drawCell(ctx, x, y, board[y][x], BLOCK);
}

function drawPiece() {
  piece.matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v !== EMPTY) drawCell(ctx, piece.x + x, piece.y + y, v, BLOCK);
    });
  });
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x*BLOCK, 0); ctx.lineTo(x*BLOCK, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y*BLOCK); ctx.lineTo(canvas.width, y*BLOCK); ctx.stroke(); }
  ctx.restore();
}

function draw() { drawBoard(); drawGrid(); drawPiece(); }

function paintNext(tCtx, tCanvas, size) {
  if (!tCtx || !tCanvas) return;
  tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);
  const m = nextPiece.matrix;
  const ox = (tCanvas.width - m[0].length * size) / 2;
  const oy = (tCanvas.height - m.length * size) / 2;
  m.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v !== EMPTY) {
        tCtx.fillStyle = COLORS[v];
        tCtx.fillRect(ox + x*size, oy + y*size, size, size);
        tCtx.strokeStyle = 'rgba(255,255,255,0.18)';
        tCtx.strokeRect(ox + x*size + 1, oy + y*size + 1, size-2, size-2);
      }
    });
  });
}

function drawNext() {
  paintNext(nextCtx, nextCanvas, 24);
  paintNext(nextMobileCtx, nextMobileCanvas, 18);
}

// Keyboard
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  const ctrl = ['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'];
  if (ctrl.includes(k)) e.preventDefault();
  if (!running && ['arrowleft','arrowright','arrowdown','arrowup'].includes(k)) startGame();
  if (k === 'arrowleft' || k === 'a') playerMove(-1);
  else if (k === 'arrowright' || k === 'd') playerMove(1);
  else if (k === 'arrowdown' || k === 's') playerDrop();
  else if (k === 'arrowup' || k === 'w') playerRotate();
  else if (k === ' ') togglePause();
});

// Touch controls
document.querySelectorAll('.control-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const a = btn.dataset.action;
    if (!running && a) startGame();
    if (a === 'left') playerMove(-1);
    else if (a === 'right') playerMove(1);
    else if (a === 'down') playerDrop();
    else if (a === 'rotate') playerRotate();
    else if (a === 'drop') hardDrop();
  });
});

// Buttons
if (startBtn) startBtn.addEventListener('click', () => {
  if (paused) togglePause(); else { resetGame(); startGame(); }
});
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
if (restartBtn) restartBtn.addEventListener('click', resetGame);
if (pauseBtnM) pauseBtnM.addEventListener('click', togglePause);
if (restartBtnM) restartBtnM.addEventListener('click', resetGame);

// Canvas swipe
canvas.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
}, { passive: true });

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (!running) startGame();
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) { playerRotate(); return; }
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 18) playerMove(1); else if (dx < -18) playerMove(-1);
  } else {
    if (dy > 18) playerDrop(); else if (dy < -18) playerRotate();
  }
}, { passive: true });

// Prevent zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

resetGame();
