// Pseudocode for main logic
// 1. Load 3 images
// 2. For each, slice into 16 pieces, store their positions
// 3. On "Start", scatter pieces, animate bouncing, enable drag
// 4. On drag, allow moving piece, check for snapping/merging
// 5. When all merged, mark as complete
// 6. Timer logic

const imagePaths = [
  "images/apple.png",
  // "images/eureka.png",
  // "images/hongbao.png",
];
const gridSize = 2;
const canvasXSize = 1344;
const canvasYSize = 768;
const pieceXSize = canvasXSize / gridSize;
const pieceYSize = canvasYSize / gridSize;
const canvases = [
  document.getElementById("jigsaw1"),
  // document.getElementById("jigsaw2"),
  // document.getElementById("jigsaw3"),
];
const ctxs = canvases.map((c) => c.getContext("2d"));
let puzzles = [];
let timer = 0,
  timerInterval = null;
let allSolved = [false]
// , false, false];

function formatTime(ms) {
  let s = Math.floor(ms / 1000);
  let ms2 = Math.floor((ms % 1000) / 10);
  let min = Math.floor(s / 60);
  s = s % 60;
  return `${min.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}.${ms2.toString().padStart(2, "0")}`;
}

function startTimer() {
  timer = 0;
  document.getElementById("timer").textContent = formatTime(timer);
  timerInterval = setInterval(() => {
    timer += 10;
    document.getElementById("timer").textContent = formatTime(timer);
  }, 10);
}
function stopTimer() {
  clearInterval(timerInterval);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

class Piece {
  constructor(img, sx, sy, x, y, idx) {
    this.img = img;
    this.sx = sx;
    this.sy = sy;
    this.x = x + canvasXSize / 2;
    this.y = y + canvasYSize / 2;
    this.vx = 0;
    this.vy = 0;
    this.group = [this];
    this.idx = idx;
    this.dragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
  }
  draw(ctx) {
    ctx.drawImage(
      this.img,
      this.sx,
      this.sy,
      pieceXSize,
      pieceYSize,
      this.x,
      this.y,
      pieceXSize,
      pieceYSize
    );
  }
  contains(mx, my) {
    return (
      mx >= this.x &&
      mx < this.x + pieceXSize &&
      my >= this.y &&
      my < this.y + pieceYSize
    );
  }
}

async function setupPuzzle(canvas, ctx, imgPath, puzzleIdx) {
  const img = await loadImage(imgPath);
  let pieces = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      pieces.push(
        new Piece(
          img,
          col * pieceXSize,
          row * pieceYSize,
          col * pieceXSize,
          row * pieceYSize,
          row * gridSize + col
        )
      );
    }
  }
  puzzles[puzzleIdx] = {
    pieces,
    img,
    started: false,
    solved: false,
    draggingPiece: null,
    offsetX: 0,
    offsetY: 0,
  };
  drawPuzzle(puzzleIdx);
}

function drawPuzzle(idx) {
  const { pieces } = puzzles[idx];
  ctxs[idx].clearRect(0, 0, canvasXSize * 2, canvasYSize * 2);
  for (const piece of pieces) {
    piece.draw(ctxs[idx]);
  }
}

function scatterPieces(idx) {
  const { pieces } = puzzles[idx];
  for (const piece of pieces) {
    piece.x = Math.random() * (2 * canvasXSize - pieceXSize);
    piece.y = Math.random() * (2 * canvasYSize - pieceYSize);
    piece.vx = (Math.random() - 0.5) * 4;
    piece.vy = (Math.random() - 0.5) * 4;
  }
}

function animatePuzzle(idx) {
  if (!puzzles[idx].started) return;
  const { pieces, draggingPiece } = puzzles[idx];
  for (const piece of pieces) {
    if (piece.dragging) continue;
    // Bounce
    piece.x += piece.vx;
    piece.y += piece.vy;
    if (piece.x < 0 || piece.x > 2 * canvasXSize - pieceXSize) {
      piece.vx *= -1;
      piece.x = Math.max(0, Math.min(piece.x, 2 * canvasXSize - pieceXSize));
      // Bounce as a bulk
      piece.group.forEach((groupPiece) => {
        if (groupPiece != piece) {
          groupPiece.vx *= -1;
          groupPiece.x =
            piece.x + ((groupPiece.idx - piece.idx) % gridSize) * pieceXSize;
        }
      });
    }
    if (piece.y < 0 || piece.y > 2 * canvasYSize - pieceYSize) {
      piece.vy *= -1;
      piece.y = Math.max(0, Math.min(piece.y, 2 * canvasYSize - pieceYSize));
      piece.group.forEach((groupPiece) => {
        if (groupPiece != piece) {
          groupPiece.vy *= -1;
          groupPiece.y =
            piece.y +
            Math.floor((groupPiece.idx - piece.idx) / gridSize) * pieceYSize;
        }
      });
    }
  }
  drawPuzzle(idx);
  if (!puzzles[idx].solved) requestAnimationFrame(() => animatePuzzle(idx));
}

function onMouseDown(idx, e) {
  if (!puzzles[idx].started) return;
  const rect = canvases[idx].getBoundingClientRect();
  const mx = 2 * (e.clientX - rect.left);
  const my = 2 * (e.clientY - rect.top);
  const { pieces } = puzzles[idx];
  for (let i = pieces.length - 1; i >= 0; i--) {
    const piece = pieces[i];
    if (piece.contains(mx, my)) {
      piece.dragging = true;
      puzzles[idx].draggingPiece = piece;
      piece.group.forEach((groupPiece) => {
        if (groupPiece != piece) {
          groupPiece.group = groupPiece.group.filter(gp => gp !== piece);
        }else{
          piece.group = [piece];
        }
      })
      piece.offsetX = mx - piece.x;
      piece.offsetY = my - piece.y;
      // Bring to front
      pieces.splice(i, 1);
      pieces.push(piece);
      break;
    }
  }
}
function onMouseMove(idx, e) {
  const piece = puzzles[idx].draggingPiece;
  if (!piece) return;
  const rect = canvases[idx].getBoundingClientRect();
  const mx = 2 * (e.clientX - rect.left);
  const my = 2 * (e.clientY - rect.top);
  piece.x = mx - piece.offsetX;
  piece.y = my - piece.offsetY;
  drawPuzzle(idx);
}
function onMouseUp(idx, e) {
  const piece = puzzles[idx].draggingPiece;
  if (!piece) return;
  piece.dragging = false;
  puzzles[idx].draggingPiece = null;
  // Snap logic
  tryMerge(idx, piece);
  drawPuzzle(idx);
  checkSolved(idx);
}

function tryMerge(idx, piece) {
  const { pieces } = puzzles[idx];
  for (const other of pieces) {
    if (other === piece) continue;
    // If adjacent in original grid
    const dx = (other.idx % gridSize) - (piece.idx % gridSize);
    const dy =
      Math.floor(other.idx / gridSize) - Math.floor(piece.idx / gridSize);
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      // If close enough in current position
      if (
        Math.abs(other.x - piece.x - dx * pieceXSize) < 20 &&
        Math.abs(other.y - piece.y - dy * pieceYSize) < 20
      ) {
        // Merge: align positions
        piece.x = other.x - dx * pieceXSize;
        piece.y = other.y - dy * pieceYSize;
        // Merge: align velocities
        other.vx = 0;
        other.vy = 0;
        piece.vx = 0;
        piece.vy = 0;
        // Merge groups
        piece.group = piece.group.concat(other.group);
        other.group.forEach((groupPiece) => {groupPiece.group = piece.group;});
      }
    }
  }
}

function checkSolved(idx) {
  const { pieces } = puzzles[idx];
  // All pieces in one group and at correct positions
  if (
    pieces.every((p) => p.group === pieces[0].group)
    // pieces.every(
    //   (p) =>
    //     Math.abs(p.x - (p.idx % gridSize) * pieceXSize) < 5 &&
    //     Math.abs(p.y - Math.floor(p.idx / gridSize) * pieceYSize) < 5
    // )
  ) {
    puzzles[idx].solved = true;
    allSolved[idx] = true;
    if (allSolved.every(Boolean)) {
      document.getElementById("confirmBtn").disabled = false;
      stopTimer();
    }
  }
}

document.getElementById("startBtn").onclick = () => {
  if (!nickname) return alert('请先输入昵称并点击OK!');
  document.getElementById("startBtn").disabled = true;
  document.getElementById("stopBtn").disabled = false;
  document.getElementById("confirmBtn").disabled = true;
  document.getElementById('restartBtn').disabled = true;
  allSolved = [false]
  // , false, false];
  for (let i = 0; i < imagePaths.length; i++) {
    puzzles[i].started = true;
    puzzles[i].solved = false;
    scatterPieces(i);
    animatePuzzle(i);
  }
  startTimer();
};

document.getElementById("confirmBtn").onclick = () => {
  document.getElementById("startBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
  document.getElementById("confirmBtn").disabled = true;
  document.getElementById('restartBtn').disabled = false;
  stopTimer();
};

document.getElementById("stopBtn").onclick = () => {
  document.getElementById("startBtn").disabled = false;
  document.getElementById("confirmBtn").disabled = true;
  document.getElementById("stopBtn").disabled = true;
  document.getElementById('restartBtn').disabled = true;
  stopTimer();
  for (let i = 0; i < imagePaths.length; i++) {
    puzzles[i].started = true;
    puzzles[i].solved = false;
    setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
  }
};

for (let i = 0; i < imagePaths.length; i++) {
  canvases[i].addEventListener("mousedown", (e) => onMouseDown(i, e));
  canvases[i].addEventListener("mousemove", (e) => onMouseMove(i, e));
  canvases[i].addEventListener("mouseup", (e) => onMouseUp(i, e));
  canvases[i].addEventListener("mouseleave", (e) => onMouseUp(i, e));
  setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
}

// Hardcoded global bests (edit as needed)
const globalBests = [
    { nickname: "Alice", time: 45.23 },
    { nickname: "Bob", time: 47.11 },
    { nickname: "Carol", time: 49.87 },
    { nickname: "Dave", time: 51.02 },
    { nickname: "Eve", time: 52.34 }
];

let nickname = localStorage.getItem('jigsaw_nickname') || '';
document.getElementById('nicknameInput').value = ''; // Clear the input
document.getElementById('nicknameInput').value = nickname;

// Save nickname on OK
document.getElementById('okBtn').onclick = function() {
    nickname = document.getElementById('nicknameInput').value.trim();
    localStorage.setItem('jigsaw_nickname', nickname);
};

// Save result on confirm
document.getElementById('confirmBtn').onclick = function() {
  const timerText = document.getElementById('timer').textContent;
  const [minutes, seconds] = timerText.split(':').map(Number);
  const time = (minutes * 60) + seconds; // Convert to seconds
  let records = JSON.parse(localStorage.getItem('jigsaw_records') || '{}');
  // Save the current nickname's time
  if (!records[nickname]) records[nickname] = [];
  records[nickname].push(time);
  records[nickname].sort((a, b) => a - b);
  records[nickname] = records[nickname].slice(0, 5);
  // Save all records back to local storage
  localStorage.setItem('jigsaw_records', JSON.stringify(records));
  // Update personal list
  updatePersonalList();
  // Update global ranking list based on all records
  const allRecords = Object.entries(records).map(([name, times]) => {
    return { nickname: name, bestTime: Math.min(...times) };
  });
  allRecords.sort((a, b) => a.bestTime - b.bestTime);
  // Update global list with sorted records
  const ol = document.getElementById('globalList');
  ol.innerHTML = '';
  allRecords.slice(0, 5).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.nickname}: ${item.bestTime.toFixed(2)} 秒`;
    ol.appendChild(li);
  });
  document.getElementById("confirmBtn").disabled = true;
  document.getElementById("stopBtn").disabled = true;
  document.getElementById("restartBtn").disabled = false;
};

document.getElementById("restartBtn").onclick = () => {
  document.getElementById("startBtn").disabled = false;
  document.getElementById("confirmBtn").disabled = true;
  document.getElementById("stopBtn").disabled = true;
  document.getElementById('restartBtn').disabled = true;
  stopTimer();
  for (let i = 0; i < imagePaths.length; i++) {
    puzzles[i].started = true;
    puzzles[i].solved = false;
    setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
  }
};

// Update personal ranking list
function updatePersonalList() {
    let records = JSON.parse(localStorage.getItem('jigsaw_records') || '{}');
    let list = records[nickname] || [];
    const ol = document.getElementById('personalList');
    ol.innerHTML = '';
    list.forEach((t, i) => {
        const li = document.createElement('li');
        li.textContent = `${t.toFixed(2)} 秒`;
        ol.appendChild(li);
    });
}

// Update global ranking list
function updateGlobalList() {
    const ol = document.getElementById('globalList');
    ol.innerHTML = '';
    globalBests.slice(0, 5).forEach((item, i) => {
        const li = document.createElement('li');
        li.textContent = `${item.nickname}: ${item.time.toFixed(2)} 秒`;
        ol.appendChild(li);
    });
}

// Initial update
// Clear local storage and update lists
localStorage.removeItem('jigsaw_nickname');
localStorage.removeItem('jigsaw_records');
updatePersonalList();
updateGlobalList();