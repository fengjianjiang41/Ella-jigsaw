// // Pseudocode for main logic
// // 1. Load 3 images
// // 2. For each, slice into 16 pieces, store their positions
// // 3. On "Start", scatter pieces, animate bouncing, enable drag
// // 4. On drag, allow moving piece, check for snapping/merging
// // 5. When all merged, mark as complete
// // 6. Timer logic

// const imagePaths = [
//   "images/apple.png",
//   "images/eureka.png",
//   "images/hongbao.png",
// ];
// const audioFiles = ["audio/emo.m4a", "audio/ua.m4a", "audio/ui.m4a"];

// const gridSize = 2;
// const canvasXSize = 1344;
// const canvasYSize = 768;
// const pieceXSize = canvasXSize / gridSize;
// const pieceYSize = canvasYSize / gridSize;
// const canvases = [
//   document.getElementById("jigsaw1"),
//   document.getElementById("jigsaw2"),
//   document.getElementById("jigsaw3"),
// ];
// const ctxs = canvases.map((c) => c.getContext("2d"));
// let puzzles = [];
// let timer = 0,
//   timerInterval = null;
// let allSolved = [false, false, false];

// function formatTime(ms) {
//   let s = Math.floor(ms / 1000);
//   let ms2 = Math.floor((ms % 1000) / 10);
//   let min = Math.floor(s / 60);
//   s = s % 60;
//   return `${min.toString().padStart(2, "0")}:${s
//     .toString()
//     .padStart(2, "0")}.${ms2.toString().padStart(2, "0")}`;
// }

// function startTimer() {
//   timer = 0;
//   document.getElementById("floatingTimer").textContent = formatTime(timer);
//   timerInterval = setInterval(() => {
//     timer += 10;
//     document.getElementById("floatingTimer").textContent = formatTime(timer);
//   }, 10);
// }
// function stopTimer() {
//   clearInterval(timerInterval);
// }

// function loadImage(src) {
//   return new Promise((resolve) => {
//     const img = new Image();
//     img.onload = () => resolve(img);
//     img.src = src;
//   });
// }

// class Piece {
//   constructor(img, sx, sy, x, y, idx) {
//     this.img = img;
//     this.sx = sx;
//     this.sy = sy;
//     this.x = x + canvasXSize / 2;
//     this.y = y + canvasYSize / 2;
//     this.vx = 0;
//     this.vy = 0;
//     this.group = [this];
//     this.idx = idx;
//     this.dragging = false;
//     this.offsetX = 0;
//     this.offsetY = 0;
//   }
//   draw(ctx) {
//     ctx.drawImage(
//       this.img,
//       this.sx,
//       this.sy,
//       pieceXSize,
//       pieceYSize,
//       this.x,
//       this.y,
//       pieceXSize,
//       pieceYSize
//     );
//   }
//   contains(mx, my) {
//     return (
//       mx >= this.x &&
//       mx < this.x + pieceXSize &&
//       my >= this.y &&
//       my < this.y + pieceYSize
//     );
//   }
// }

// async function setupPuzzle(canvas, ctx, imgPath, puzzleIdx) {
//   const img = await loadImage(imgPath);
//   let pieces = [];
//   for (let row = 0; row < gridSize; row++) {
//     for (let col = 0; col < gridSize; col++) {
//       pieces.push(
//         new Piece(
//           img,
//           col * pieceXSize,
//           row * pieceYSize,
//           col * pieceXSize,
//           row * pieceYSize,
//           row * gridSize + col
//         )
//       );
//     }
//   }
//   puzzles[puzzleIdx] = {
//     pieces,
//     img,
//     started: false,
//     solved: false,
//     draggingPiece: null,
//     offsetX: 0,
//     offsetY: 0,
//   };
//   drawPuzzle(puzzleIdx);
// }

// function drawPuzzle(idx) {
//   const { pieces } = puzzles[idx];
//   ctxs[idx].clearRect(0, 0, canvasXSize * 2, canvasYSize * 2);
//   for (const piece of pieces) {
//     piece.draw(ctxs[idx]);
//   }
// }

// function scatterPieces(idx) {
//   const { pieces } = puzzles[idx];
//   for (const piece of pieces) {
//     piece.x = Math.random() * (2 * canvasXSize - pieceXSize);
//     piece.y = Math.random() * (2 * canvasYSize - pieceYSize);
//     piece.vx = (Math.random() - 0.5) * 4;
//     piece.vy = (Math.random() - 0.5) * 4;
//   }
// }

// function animatePuzzle(idx) {
//   if (!puzzles[idx].started) return;
//   const { pieces, draggingPiece } = puzzles[idx];
//   for (const piece of pieces) {
//     if (piece.dragging) continue;
//     // Bounce
//     piece.x += piece.vx;
//     piece.y += piece.vy;
//     if (piece.x < 0 || piece.x > 2 * canvasXSize - pieceXSize) {
//       piece.vx *= -1;
//       piece.x = Math.max(0, Math.min(piece.x, 2 * canvasXSize - pieceXSize));
//       // Bounce as a bulk
//       piece.group.forEach((groupPiece) => {
//         if (groupPiece != piece) {
//           groupPiece.vx *= -1;
//           groupPiece.x =
//             piece.x + ((groupPiece.idx - piece.idx) % gridSize) * pieceXSize;
//         }
//       });
//     }
//     if (piece.y < 0 || piece.y > 2 * canvasYSize - pieceYSize) {
//       piece.vy *= -1;
//       piece.y = Math.max(0, Math.min(piece.y, 2 * canvasYSize - pieceYSize));
//       piece.group.forEach((groupPiece) => {
//         if (groupPiece != piece) {
//           groupPiece.vy *= -1;
//           groupPiece.y =
//             piece.y +
//             Math.floor((groupPiece.idx - piece.idx) / gridSize) * pieceYSize;
//         }
//       });
//     }
//   }
//   drawPuzzle(idx);
//   if (!puzzles[idx].solved) requestAnimationFrame(() => animatePuzzle(idx));
// }

// function onMouseDown(idx, e) {
//   if (!puzzles[idx].started) return;
//   const rect = canvases[idx].getBoundingClientRect();
//   const mx = 2 * (e.clientX - rect.left);
//   const my = 2 * (e.clientY - rect.top);
//   const { pieces } = puzzles[idx];
//   for (let i = pieces.length - 1; i >= 0; i--) {
//     const piece = pieces[i];
//     if (piece.contains(mx, my)) {
//       piece.dragging = true;
//       puzzles[idx].draggingPiece = piece;
//       piece.group.forEach((groupPiece) => {
//         if (groupPiece != piece) {
//           groupPiece.group = groupPiece.group.filter((gp) => gp !== piece);
//         } else {
//           piece.group = [piece];
//         }
//       });
//       piece.offsetX = mx - piece.x;
//       piece.offsetY = my - piece.y;
//       // Bring to front
//       pieces.splice(i, 1);
//       pieces.push(piece);
//       break;
//     }
//   }
// }
// function onMouseMove(idx, e) {
//   const piece = puzzles[idx].draggingPiece;
//   if (!piece) return;
//   const rect = canvases[idx].getBoundingClientRect();
//   const mx = 2 * (e.clientX - rect.left);
//   const my = 2 * (e.clientY - rect.top);
//   piece.x = mx - piece.offsetX;
//   piece.y = my - piece.offsetY;
//   drawPuzzle(idx);
// }
// function onMouseUp(idx, e) {
//   const piece = puzzles[idx].draggingPiece;
//   if (!piece) return;
//   piece.dragging = false;
//   puzzles[idx].draggingPiece = null;
//   // Snap logic
//   tryMerge(idx, piece);
//   drawPuzzle(idx);
//   checkSolved(idx);
// }

// function tryMerge(idx, piece) {
//   const { pieces } = puzzles[idx];
//   for (const other of pieces) {
//     if (other === piece) continue;
//     // If adjacent in original grid
//     const dx = (other.idx % gridSize) - (piece.idx % gridSize);
//     const dy =
//       Math.floor(other.idx / gridSize) - Math.floor(piece.idx / gridSize);
//     if (Math.abs(dx) + Math.abs(dy) === 1) {
//       // If close enough in current position
//       if (
//         Math.abs(other.x - piece.x - dx * pieceXSize) < 20 &&
//         Math.abs(other.y - piece.y - dy * pieceYSize) < 20
//       ) {
//         // Merge: align positions
//         piece.x = other.x - dx * pieceXSize;
//         piece.y = other.y - dy * pieceYSize;
//         // Merge: align velocities
//         other.vx = 0;
//         other.vy = 0;
//         piece.vx = 0;
//         piece.vy = 0;
//         // Merge groups
//         piece.group = piece.group.concat(other.group);
//         other.group.forEach((groupPiece) => {
//           groupPiece.group = piece.group;
//         });
//       }
//     }
//   }
// }

// function checkSolved(idx) {
//   const { pieces } = puzzles[idx];
//   // All pieces in one group and at correct positions
//   if (
//     pieces.every((p) => p.group === pieces[0].group)
//     // pieces.every(
//     //   (p) =>
//     //     Math.abs(p.x - (p.idx % gridSize) * pieceXSize) < 5 &&
//     //     Math.abs(p.y - Math.floor(p.idx / gridSize) * pieceYSize) < 5
//     // )
//   ) {
//     puzzles[idx].solved = true;
//     allSolved[idx] = true;
//     if (allSolved.every(Boolean)) {
//       document.getElementById("confirmBtn").disabled = false;
//       stopTimer();
//     }
//   }
// }

// document.getElementById("startBtn").onclick = () => {
//   if (!nickname) return alert("请先输入昵称并点击OK!");
//   document.getElementById("startBtn").disabled = true;
//   document.getElementById("stopBtn").disabled = false;
//   document.getElementById("confirmBtn").disabled = true;
//   document.getElementById("restartBtn").disabled = true;
//   allSolved = [false, false, false];
//   for (let i = 0; i < imagePaths.length; i++) {
//     puzzles[i].started = true;
//     puzzles[i].solved = false;
//     scatterPieces(i);
//     animatePuzzle(i);
//   }
//   startTimer();
// };

// document.getElementById("confirmBtn").onclick = () => {
//   document.getElementById("startBtn").disabled = false;
//   document.getElementById("stopBtn").disabled = true;
//   document.getElementById("confirmBtn").disabled = true;
//   document.getElementById("restartBtn").disabled = false;
//   stopTimer();
// };

// document.getElementById("stopBtn").onclick = () => {
//   document.getElementById("startBtn").disabled = false;
//   document.getElementById("confirmBtn").disabled = true;
//   document.getElementById("stopBtn").disabled = true;
//   document.getElementById("restartBtn").disabled = true;
//   stopTimer();
//   for (let i = 0; i < imagePaths.length; i++) {
//     puzzles[i].started = true;
//     puzzles[i].solved = false;
//     setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
//   }
// };

// for (let i = 0; i < imagePaths.length; i++) {
//   canvases[i].addEventListener("mousedown", (e) => onMouseDown(i, e));
//   canvases[i].addEventListener("mousemove", (e) => onMouseMove(i, e));
//   canvases[i].addEventListener("mouseup", (e) => onMouseUp(i, e));
//   canvases[i].addEventListener("mouseleave", (e) => onMouseUp(i, e));
//   setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
// }

// // Hardcoded global bests (edit as needed)
// const globalBests = [
//   { nickname: "阿见", time: 45.23 },
//   // { nickname: "Bob", time: 47.11 },
//   // { nickname: "Carol", time: 49.87 },
//   // { nickname: "Dave", time: 51.02 },
//   // { nickname: "Eve", time: 52.34 }
// ];

// let nickname = localStorage.getItem("jigsaw_nickname") || "";
// document.getElementById("nicknameInput").value = ""; // Clear the input
// document.getElementById("nicknameInput").value = nickname;

// // Save nickname on OK
// document.getElementById("okBtn").onclick = function () {
//   nickname = document.getElementById("nicknameInput").value.trim();
//   localStorage.setItem("jigsaw_nickname", nickname);
//   document.getElementById("okBtn").disabled = true;
//   document.getElementById("startBtn").disabled = false;
// };

// // Save result on confirm
// document.getElementById("confirmBtn").onclick = function () {
//   const timerText = document.getElementById("floatingTimer").textContent;
//   const [minutes, seconds] = timerText.split(":").map(Number);
//   const time = minutes * 60 + seconds; // Convert to seconds
//   let records = JSON.parse(localStorage.getItem("jigsaw_records") || "{}");
//   // Save the current nickname's time
//   if (!records[nickname]) records[nickname] = [];
//   records[nickname].push(time);
//   records[nickname].sort((a, b) => a - b);
//   records[nickname] = records[nickname].slice(0, 5);
//   // Save all records back to local storage
//   localStorage.setItem("jigsaw_records", JSON.stringify(records));
//   // Update personal list
//   updatePersonalList();
//   // Update global ranking list based on all records
//   // const allRecords = Object.entries(records).map(([name, times]) => {
//   //   return { nickname: name, bestTime: Math.min(...times) };
//   // });
//   // allRecords.sort((a, b) => a.bestTime - b.bestTime);
//   // // Update global list with sorted records
//   // const ol = document.getElementById('globalList');
//   // ol.innerHTML = '';
//   // allRecords.slice(0, 5).forEach((item) => {
//   //   const li = document.createElement('li');
//   //   li.textContent = `${item.nickname}: ${item.bestTime.toFixed(2)} 秒`;
//   //   ol.appendChild(li);
//   // });
//   document.getElementById("confirmBtn").disabled = true;
//   document.getElementById("stopBtn").disabled = true;
//   document.getElementById("restartBtn").disabled = false;
// };

// document.getElementById("restartBtn").onclick = () => {
//   document.getElementById("startBtn").disabled = false;
//   document.getElementById("confirmBtn").disabled = true;
//   document.getElementById("stopBtn").disabled = true;
//   document.getElementById("restartBtn").disabled = true;
//   stopTimer();
//   for (let i = 0; i < imagePaths.length; i++) {
//     puzzles[i].started = true;
//     puzzles[i].solved = false;
//     setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
//   }
// };

// // Update personal ranking list
// function updatePersonalList() {
//   let records = JSON.parse(localStorage.getItem("jigsaw_records") || "{}");
//   let list = records[nickname] || [];
//   const ol = document.getElementById("personalList");
//   ol.innerHTML = "";
//   list.forEach((t, i) => {
//     const li = document.createElement("li");
//     li.textContent = `${t.toFixed(2)} 秒`;
//     ol.appendChild(li);
//   });
// }

// // Update global ranking list
// function updateGlobalList() {
//   const ol = document.getElementById("globalList");
//   ol.innerHTML = "";
//   globalBests.slice(0, 5).forEach((item, i) => {
//     const li = document.createElement("li");
//     li.textContent = `${item.nickname}: ${item.time.toFixed(2)} 秒`;
//     ol.appendChild(li);
//   });
// }

// // Initial update
// // Clear local storage and update lists
// document.getElementById("okBtn").disabled = false;
// document.getElementById("startBtn").disabled = true;
// document.getElementById("confirmBtn").disabled = true;
// document.getElementById("stopBtn").disabled = true;
// document.getElementById("restartBtn").disabled = true;
// localStorage.removeItem("jigsaw_nickname");
// localStorage.removeItem("jigsaw_records");
// updatePersonalList();
// updateGlobalList();

// document.addEventListener("DOMContentLoaded", function () {
//   const pagesContainer = document.getElementById("pagesContainer");
//   const pageNav = document.getElementById("pageNav");
//   const pageBtns = document.querySelectorAll(".page-btn");
//   const startText = document.getElementById("startText");
//   const pages = document.querySelectorAll(".page");

//   // 禁用鼠标滚轮
//   pagesContainer.addEventListener(
//     "wheel",
//     function (e) {
//       e.preventDefault();
//     },
//     { passive: false }
//   );

//   // 按下任意键后：文字消失，显示导航按钮，跳转到第二页
//   document.addEventListener("keydown", function onFirstKey(e) {
//     // 确保只在首页且文字可见时触发
//     if (startText && !startText.classList.contains("hidden")) {
//       // 隐藏"按任意键开始"文字
//       // startText.classList.add("hidden");

//       // 显示分页导航按钮
//       pageNav.style.display = "flex";

//       // 跳转到第二页（快速滑动）
//       const secondPage = document.getElementById("page2");
//       if (secondPage) {
//         secondPage.scrollIntoView({ behavior: "smooth", block: "start" });

//         // 更新按钮状态
//         pageBtns.forEach((btn) => {
//           btn.classList.remove("active");
//           if (btn.dataset.page === "page2") {
//             btn.classList.add("active");
//           }
//         });
//       }

//       // 移除事件监听，只触发一次
//       document.removeEventListener("keydown", onFirstKey);
//     }
//   });

//   // 点击分页按钮跳转到对应页面
//   pageBtns.forEach((btn) => {
//     btn.addEventListener("click", function () {
//       const targetPageId = this.dataset.page;
//       const targetPage = document.getElementById(targetPageId);

//       if (targetPage) {
//         // 快速滑动到目标页面
//         targetPage.scrollIntoView({ behavior: "smooth", block: "start" });

//         // 更新按钮激活状态
//         pageBtns.forEach((b) => b.classList.remove("active"));
//         this.classList.add("active");
//       }
//     });
//   });

//   // 监听滚动结束，更新按钮状态（为了兼容手动滚动的情况，虽然我们禁用了滚轮）
//   let scrollTimeout;
//   pagesContainer.addEventListener("scroll", function () {
//     clearTimeout(scrollTimeout);
//     scrollTimeout = setTimeout(() => {
//       // 检测当前可见的页面
//       const containerRect = pagesContainer.getBoundingClientRect();
//       let currentPageId = "page1"; // 默认第一页

//       pages.forEach((page) => {
//         const pageRect = page.getBoundingClientRect();
//         // 检查页面是否在视口中（粗略判断）
//         if (
//           pageRect.top < containerRect.bottom &&
//           pageRect.bottom > containerRect.top
//         ) {
//           currentPageId = page.id;
//         }
//       });

//       // 更新按钮状态
//       pageBtns.forEach((btn) => {
//         btn.classList.remove("active");
//         if (btn.dataset.page === currentPageId) {
//           btn.classList.add("active");
//         }
//       });
//     }, 50);
//   });
// });

// ...existing code...
const imagePaths = [
  "images/apple.png",
  "images/eureka.png",
  "images/hongbao.png",
];
const audioFiles = ["audio/emo.m4a", "audio/ua.m4a", "audio/ui.m4a"];

const gridSize = 2;
const canvasXSize = 1344;
const canvasYSize = 768;
const pieceXSize = canvasXSize / gridSize;
const pieceYSize = canvasYSize / gridSize;

let canvases = [];
let ctxs = [];
let puzzles = [];
let timer = 0,
  timerInterval = null;
let allSolved = [false, false, false];
let nickname = "";

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
  document.getElementById("floatingTimer").textContent = formatTime(timer);
  timerInterval = setInterval(() => {
    timer += 10;
    document.getElementById("floatingTimer").textContent = formatTime(timer);
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
  const { pieces } = puzzles[idx];
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
  const mx = (e.clientX - rect.left) * (canvases[idx].width / rect.width);
  const my = (e.clientY - rect.top) * (canvases[idx].height / rect.height);
  const { pieces } = puzzles[idx];
  for (let i = pieces.length - 1; i >= 0; i--) {
    const piece = pieces[i];
    if (piece.contains(mx, my)) {
      piece.dragging = true;
      puzzles[idx].draggingPiece = piece;
      piece.group.forEach((groupPiece) => {
        if (groupPiece != piece) {
          groupPiece.group = groupPiece.group.filter((gp) => gp !== piece);
        } else {
          piece.group = [piece];
        }
      });
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
  const mx = (e.clientX - rect.left) * (canvases[idx].width / rect.width);
  const my = (e.clientY - rect.top) * (canvases[idx].height / rect.height);
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
        other.group.forEach((groupPiece) => {
          groupPiece.group = piece.group;
        });
      }
    }
  }
}

function checkSolved(idx) {
  const { pieces } = puzzles[idx];
  if (pieces.every((p) => p.group === pieces[0].group)) {
    puzzles[idx].solved = true;
    allSolved[idx] = true;
    if (allSolved.every(Boolean)) {
      document.getElementById("confirmBtn").disabled = false;
      stopTimer();
      // 自动滚动到结果页
      const resultPage = document.getElementById("page6");
      if (resultPage) resultPage.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

// 排行相关
const globalBests = [
  { nickname: "阿见", time: 45.23 },
];

function updatePersonalList() {
  let records = JSON.parse(localStorage.getItem("jigsaw_records") || "{}");
  let list = records[nickname] || [];
  const ol = document.getElementById("personalList");
  if (!ol) return;
  ol.innerHTML = "";
  list.forEach((t, i) => {
    const li = document.createElement("li");
    li.textContent = `${t.toFixed(2)} 秒`;
    ol.appendChild(li);
  });
}
function updateGlobalList() {
  const ol = document.getElementById("globalList");
  if (!ol) return;
  ol.innerHTML = "";
  globalBests.slice(0, 5).forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = `${item.nickname}: ${item.time.toFixed(2)} 秒`;
    ol.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // DOM 元素
  canvases = [
    document.getElementById("jigsaw1"),
    document.getElementById("jigsaw2"),
    document.getElementById("jigsaw3"),
  ];
  ctxs = canvases.map((c) => c.getContext("2d"));

  const pagesContainer = document.getElementById("pagesContainer");
  const pageNav = document.getElementById("pageNav");
  const pageBtns = document.querySelectorAll(".page-btn");
  const startText = document.getElementById("startText");
  const pages = document.querySelectorAll(".page");
  const startBtn = document.getElementById("startBtn");
  const okBtn = document.getElementById("okBtn");
  const nicknameInput = document.getElementById("nicknameInput");
  const floatingControls = document.getElementById("floatingControls");
  const stopBtn = document.getElementById("stopBtn");
  const restartBtnFloat = document.getElementById("restartBtnFloat");
  const restartBtn = document.getElementById("restartBtn");
  const confirmBtn = document.getElementById("confirmBtn");
  const topBtn = document.getElementById("topBtn");
  const bunImg = document.getElementById("bun-img");

  // 初始化拼图（3个）
  for (let i = 0; i < imagePaths.length; i++) {
    canvases[i].addEventListener("mousedown", (e) => onMouseDown(i, e));
    canvases[i].addEventListener("mousemove", (e) => onMouseMove(i, e));
    canvases[i].addEventListener("mouseup", (e) => onMouseUp(i, e));
    canvases[i].addEventListener("mouseleave", (e) => onMouseUp(i, e));
    setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
  }

  // 禁用鼠标滚轮（保留 scrollIntoView 控制）
  pagesContainer.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
    },
    { passive: false }
  );

  // 首次按键：显示导航并跳到第二页
  document.addEventListener("keydown", function onFirstKey() {
    if (startText && !startText.classList.contains("hidden")) {
      pageNav.style.display = "flex";
      const secondPage = document.getElementById("page2");
      if (secondPage) {
        secondPage.scrollIntoView({ behavior: "smooth", block: "start" });
        pageBtns.forEach((btn) => {
          btn.classList.remove("active");
          if (btn.dataset.page === "page2") btn.classList.add("active");
        });
      }
      document.removeEventListener("keydown", onFirstKey);
    }
  });

  // 分页按钮跳转
  pageBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const targetPageId = this.dataset.page;
      const targetPage = document.getElementById(targetPageId);
      if (targetPage) {
        if (targetPageId == "page1") {
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          const pagesContainer = document.getElementById('pagesContainer');
          if (pagesContainer) pagesContainer.scrollTop = 0;
        }
        else {

          targetPage.scrollIntoView({ behavior: "smooth", block: "start" });
          pageBtns.forEach((b) => b.classList.remove("active"));
          this.classList.add("active");
        }

      }
    });
  });

  // 监听滚动更新当前页面并控制浮动控件显隐（只在 page3-5 显示）
  let scrollTimeout;
  pagesContainer.addEventListener("scroll", function () {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const containerRect = pagesContainer.getBoundingClientRect();
      let currentPageId = "page1";
      pages.forEach((page) => {
        const pageRect = page.getBoundingClientRect();
        if (pageRect.top < containerRect.bottom && pageRect.bottom > containerRect.top) {
          currentPageId = page.id;
        }
      });
      pageBtns.forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.page === currentPageId) btn.classList.add("active");
      });
      // 控制浮动控件只在拼图页显示
      if (["page3", "page4", "page5"].includes(currentPageId)) {
        floatingControls.style.display = "flex";
      } else {
        floatingControls.style.display = "none";
      }
    }, 50);
  });

  // 显示音效与浮动文字（保留）

  bunImg.addEventListener("mousedown", function () {
    this.classList.add("shrink");
  });
  bunImg.addEventListener("mouseup", function () {
    this.classList.remove("shrink");
  });
  bunImg.addEventListener("mouseleave", function () {
    this.classList.remove("shrink");
  });

  function showFloatingText(options = {}) {
    // Default style parameters
    const {
      text = "Hello!",
      fontSize = "24px",
      color = "#ff69b4",
      fontWeight = "bold",
      duration = 1200,
      riseDistance = 60,
      leftOffset = 0,
      topOffset = -40,
      zIndex = 1000,
      fontFamily = "Arial, sans-serif",
      letterSpacing = "2px",
      textShadow = "0 2px 8px rgba(0,0,0,0.2)",
    } = options;

    const bunRect = bunImg.getBoundingClientRect();
    const container = document.body;

    const floating = document.createElement("div");
    floating.textContent = text;
    floating.style.position = "fixed";
    floating.style.left = `${bunRect.left + bunRect.width / 2 + leftOffset}px`;
    floating.style.top = `${bunRect.top + topOffset}px`;
    floating.style.transform = "translateX(-50%)";
    floating.style.fontSize = fontSize;
    floating.style.color = color;
    floating.style.fontWeight = fontWeight;
    floating.style.fontFamily = fontFamily;
    floating.style.letterSpacing = letterSpacing;
    floating.style.textShadow = textShadow;
    floating.style.opacity = "1";
    floating.style.zIndex = zIndex;
    floating.style.pointerEvents = "none";
    container.appendChild(floating);

    // Animate
    let start = null;
    function animate(ts) {
      if (!start) start = ts;
      const progress = ts - start;
      const percent = Math.min(progress / duration, 1);
      floating.style.top = `${bunRect.top + topOffset - percent * riseDistance
        }px`;
      floating.style.opacity = `${1 - percent}`;
      if (percent < 1) {
        requestAnimationFrame(animate);
      } else {
        container.removeChild(floating);
      }
    }
    requestAnimationFrame(animate);
  }

  // Update bunImg click event:
  bunImg.addEventListener("click", function () {
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    const audio = new Audio(audioFiles[randomIndex]);
    audio.play();

    showFloatingText({
      text: "功德+1",
      fontSize: "28px",
      color: "#000000",
      fontWeight: "bold",
      duration: 1500,
      riseDistance: 80,
      topOffset: -50,
      fontFamily: "Microsoft YaHei, sans-serif",
      // textShadow: "0 4px 12px rgba(0,0,0,0.3)",
    });
  });

  // 昵称处理
  nickname = localStorage.getItem("jigsaw_nickname") || "";
  nicknameInput.value = nickname || "";
  okBtn.onclick = function () {
    nickname = nicknameInput.value.trim();
    if (!nickname) return alert("请输入昵称");
    localStorage.setItem("jigsaw_nickname", nickname);
    okBtn.disabled = true;
    startBtn.disabled = false;
    updatePersonalList();
  };

  // Start：在注册页点击，开始所有拼图并跳到 page3，显示浮动控件
  startBtn.onclick = function () {
    if (!nickname) return alert("请先输入昵称并点击OK!");
    startBtn.disabled = true;
    stopBtn.disabled = false;
    confirmBtn.disabled = true;
    restartBtn.disabled = true;
    restartBtnFloat.disabled = true;
    allSolved = [false, false, false];
    for (let i = 0; i < imagePaths.length; i++) {
      puzzles[i].started = true;
      puzzles[i].solved = false;
      scatterPieces(i);
      animatePuzzle(i);
    }
    startTimer();
    // 跳到第3页
    const page3 = document.getElementById("page3");
    if (page3) page3.scrollIntoView({ behavior: "smooth", block: "start" });
    // 显示浮动控件
    floatingControls.style.display = "flex";
  };

  // Stop：停止计时与动画（重置为初始未开始状态）
  stopBtn.onclick = function () {
    startBtn.disabled = false;
    confirmBtn.disabled = true;
    stopBtn.disabled = true;
    restartBtn.disabled = false;
    restartBtnFloat.disabled = false;
    stopTimer();
    // 将每个拼图重置（重新绘制初始状态）
    for (let i = 0; i < imagePaths.length; i++) {
      puzzles[i].started = false;
      puzzles[i].solved = false;
      setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
    }
  };

  // 重启（页面底部/浮动重启共用）
  function doRestart() {
    startBtn.disabled = false;
    confirmBtn.disabled = true;
    stopBtn.disabled = true;
    restartBtn.disabled = true;
    restartBtnFloat.disabled = true;
    stopTimer();
    allSolved = [false, false, false];
    for (let i = 0; i < imagePaths.length; i++) {
      puzzles[i].started = false;
      puzzles[i].solved = false;
      setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
    }
    // Scroll to second page and update nav state
    const secondPage = document.getElementById("page2");
    if (secondPage) {
      secondPage.scrollIntoView({ behavior: "smooth", block: "start" });
      if (pageNav) pageNav.style.display = "flex";
      pageBtns.forEach((b) => b.classList.remove("active"));
      const btn = Array.from(pageBtns).find((b) => b.dataset.page === "page2");
      if (btn) btn.classList.add("active");
    }
  }
  restartBtn.onclick = doRestart;
  restartBtnFloat.onclick = doRestart;

  // Confirm：保存成绩并更新排行
  confirmBtn.onclick = function () {
    // use timer (ms) convert to seconds
    const timeSeconds = (timer / 1000);
    let records = JSON.parse(localStorage.getItem("jigsaw_records") || "{}");
    if (!records[nickname]) records[nickname] = [];
    records[nickname].push(timeSeconds);
    records[nickname].sort((a, b) => a - b);
    records[nickname] = records[nickname].slice(0, 5);
    localStorage.setItem("jigsaw_records", JSON.stringify(records));
    updatePersonalList();
    updateGlobalList();
    confirmBtn.disabled = true;
    stopBtn.disabled = true;
    restartBtn.disabled = false;
    restartBtnFloat.disabled = false;
  };

  // top 按钮回首页
  topBtn.onclick = function () {
    const first = document.getElementById("page1");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 初始按钮状态
  okBtn.disabled = false;
  startBtn.disabled = true;
  confirmBtn.disabled = true;
  stopBtn.disabled = true;
  restartBtn.disabled = true;
  restartBtnFloat.disabled = true;
  localStorage.removeItem("jigsaw_records"); // 可以移除或注释掉以保留记录
  updatePersonalList();
  updateGlobalList();
});
// ...existing code...
