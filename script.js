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
      pieceYSize,
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
          row * gridSize + col,
        ),
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
      if (resultPage)
        resultPage.scrollIntoView({ behavior: "smooth", block: "start" });
      // 显示恭喜文字
      const congratulationsText = document.getElementById(
        "congratulationsText",
      );
      if (congratulationsText) {
        congratulationsText.innerHTML = "<h2>恭  喜</h2>";
      }
    } else {
      // If not all solved, scroll to the first unsolved puzzle (frontest unsolved)
      scrollToFirstUnsolved();
    }
  }
}

// Scroll to the first unsolved puzzle (assumes puzzles 0..N map to pages 3..(3+N-1))
function scrollToFirstUnsolved() {
  if (!puzzles || puzzles.length === 0) return;
  const firstUnsolvedIdx = puzzles.findIndex((p) => !p || !p.solved);
  if (firstUnsolvedIdx === -1) return;

  const targetPageId = "page" + (3 + firstUnsolvedIdx);
  const targetPage = document.getElementById(targetPageId);
  if (targetPage) {
    targetPage.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // update navigation buttons (if present)
  try {
    const allBtns = document.querySelectorAll(".page-btn");
    allBtns.forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(
      `.page-btn[data-page="${targetPageId}"]`,
    );
    if (activeBtn) activeBtn.classList.add("active");
  } catch (e) {
    // ignore if DOM structure is different
  }

  // ensure floating controls are visible for puzzle pages
  const floatingControls = document.getElementById("floatingControls");
  if (floatingControls) floatingControls.style.display = "flex";
}

// 排行相关
const globalBests = [{ nickname: "阿见", time: 45.23 }];

function updatePersonalList() {
  let records = JSON.parse(localStorage.getItem("jigsaw_records") || "{}");
  let list = records[nickname] || [];
  const ol = document.getElementById("personalList");
  if (!ol) return;
  ol.innerHTML = "";
  list.forEach((t, i) => {
    const li = document.createElement("li");
    li.textContent = `${nickname}: ${t.toFixed(2)} 秒`;
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
    { passive: false },
  );

  // 首次按键：显示导航并跳到第二页
  document.addEventListener("keydown", function onFirstKey() {
    if (startText && !startText.classList.contains("hidden")) {
      startText.textContent = "本页有惊喜"; // Change the text
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
          window.scrollTo({ top: 0, behavior: "instant" });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          const pagesContainer = document.getElementById("pagesContainer");
          if (pagesContainer) pagesContainer.scrollTop = 0;
        } else {
          targetPage.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        pageBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
      }
    });
  });

  // 监听滚动更新当前页面并控制浮动控件显隐（只在 page3-5 显示）
  let scrollTimeout;
  pagesContainer.addEventListener("scroll", function () {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      let currentPageId = "page1";
      const activeBtn = Array.from(pageBtns).find((btn) =>
        btn.classList.contains("active"),
      );
      currentPageId = activeBtn ? activeBtn.dataset.page : "page1";

      // Show or hide floating controls based on the current page
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
      floating.style.top = `${
        bunRect.top + topOffset - percent * riseDistance
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
    pageBtns.forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.page === "page3") btn.classList.add("active");
    });
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
    okBtn.disabled = false;
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
    // 重置为 "往下有惊喜" 当重启按钮被点击
    const congratulationsText = document.getElementById("congratulationsText");
    if (congratulationsText) {
      congratulationsText.innerHTML = "<h2>往下有惊喜</h2>";
    }
  }

  restartBtn.onclick = doRestart;
  restartBtnFloat.onclick = doRestart;

  // Confirm：保存成绩并更新排行
  confirmBtn.onclick = function () {
    // use timer (ms) convert to seconds
    const timeSeconds = timer / 1000;
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

    // Add smooth transition animation to "恭喜" text using CSS keyframes
    const congratulationsText = document.getElementById("congratulationsText");
    if (congratulationsText) {
      const h2 = congratulationsText.querySelector("h2");
      if (h2) {
        h2.classList.remove("congrats-animate"); // reset if needed
        // Force reflow to restart animation if needed
        void h2.offsetWidth;
        h2.classList.add("congrats-animate");
        h2.addEventListener("animationend", function handler() {
          h2.classList.remove("congrats-animate");
          h2.removeEventListener("animationend", handler);
        });
      }
    }
  };

  // top 按钮回首页
  topBtn.onclick = function () {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const pagesContainer = document.getElementById("pagesContainer");
    if (pagesContainer) pagesContainer.scrollTop = 0;
    pageBtns.forEach((btn) => {
      btn.classList.remove("active");
    });
    const firstPageBtn = Array.from(pageBtns).find(
      (btn) => btn.dataset.page === "page1",
    );
    if (firstPageBtn) firstPageBtn.classList.add("active");
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

// ------------------------------------------------------------------

var canvas1 = document.getElementById("myCanvas1");
var gl = canvas1.getContext("webgl");
canvas1.width = parseInt(getComputedStyle(canvas1).width, 10);
canvas1.height = parseInt(getComputedStyle(canvas1).height, 10);

canvas1.focus();

var simAspectRatio = canvas1.width / canvas1.height;
var simHeight = 3.0;
var simWidth = simHeight * simAspectRatio; // Maintain aspect ratio

var cScaleX = canvas1.width / simWidth;
var cScaleY = canvas1.height / simHeight;

var U_FIELD = 0;
var V_FIELD = 1;

var FLUID_CELL = 0;
var AIR_CELL = 1;
var SOLID_CELL = 2;

var cnt = 0;

function clamp(x, min, max) {
  if (x < min) return min;
  else if (x > max) return max;
  else return x;
}

// ----------------- start of simulator ------------------------------

class FlipFluid {
  constructor(density, width, height, spacing, particleRadius, maxParticles) {
    this.density = density;
    this.fNumX = Math.floor(width / spacing) + 1;
    this.fNumY = Math.floor(height / spacing) + 1;
    this.h = Math.max(width / this.fNumX, height / this.fNumY);
    this.fInvSpacing = 1.0 / this.h;
    this.fNumCells = this.fNumX * this.fNumY;

    this.u = new Float32Array(this.fNumCells);
    this.v = new Float32Array(this.fNumCells);
    this.du = new Float32Array(this.fNumCells);
    this.dv = new Float32Array(this.fNumCells);
    this.prevU = new Float32Array(this.fNumCells);
    this.prevV = new Float32Array(this.fNumCells);
    this.p = new Float32Array(this.fNumCells);
    this.s = new Float32Array(this.fNumCells);
    this.cellType = new Int32Array(this.fNumCells);
    this.cellColor = new Float32Array(3 * this.fNumCells);

    this.maxParticles = maxParticles;
    this.particlePos = new Float32Array(2 * this.maxParticles);
    this.particleColor = new Float32Array(3 * this.maxParticles);
    // for (var i = 0; i < this.maxParticles; i++)
    //   this.particleColor[3 * i + 2] = 1.0;

    this.particleVel = new Float32Array(2 * this.maxParticles);
    this.particleDensity = new Float32Array(this.fNumCells);
    this.particleRestDensity = 0.0;

    this.particleRadius = particleRadius;
    this.pInvSpacing = 1.0 / (2.2 * particleRadius);
    this.pNumX = Math.floor(width * this.pInvSpacing) + 1;
    this.pNumY = Math.floor(height * this.pInvSpacing) + 1;
    this.pNumCells = this.pNumX * this.pNumY;

    this.numCellParticles = new Int32Array(this.pNumCells);
    this.firstCellParticle = new Int32Array(this.pNumCells + 1);
    this.cellParticleIds = new Int32Array(maxParticles);
    this.numParticles = 0;
  }

  integrateParticles(dt, gravity) {
    for (var i = 0; i < this.numParticles; i++) {
      this.particleVel[2 * i + 1] += dt * gravity;
      this.particlePos[2 * i] += this.particleVel[2 * i] * dt;
      this.particlePos[2 * i + 1] += this.particleVel[2 * i + 1] * dt;
    }
  }

  pushParticlesApart(numIters) {
    var colorDiffusionCoeff = 0.001;
    this.numCellParticles.fill(0);

    for (var i = 0; i < this.numParticles; i++) {
      var x = this.particlePos[2 * i];
      var y = this.particlePos[2 * i + 1];
      var xi = clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1);
      var yi = clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1);
      var cellNr = xi * this.pNumY + yi;
      this.numCellParticles[cellNr]++;
    }

    var first = 0;
    for (var i = 0; i < this.pNumCells; i++) {
      first += this.numCellParticles[i];
      this.firstCellParticle[i] = first;
    }
    this.firstCellParticle[this.pNumCells] = first;

    for (var i = 0; i < this.numParticles; i++) {
      var x = this.particlePos[2 * i];
      var y = this.particlePos[2 * i + 1];
      var xi = clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1);
      var yi = clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1);
      var cellNr = xi * this.pNumY + yi;
      this.firstCellParticle[cellNr]--;
      this.cellParticleIds[this.firstCellParticle[cellNr]] = i;
    }

    var minDist = 2.0 * this.particleRadius;
    var minDist2 = minDist * minDist;

    for (var iter = 0; iter < numIters; iter++) {
      for (var i = 0; i < this.numParticles; i++) {
        var px = this.particlePos[2 * i];
        var py = this.particlePos[2 * i + 1];
        var pxi = Math.floor(px * this.pInvSpacing);
        var pyi = Math.floor(py * this.pInvSpacing);
        var x0 = Math.max(pxi - 1, 0);
        var y0 = Math.max(pyi - 1, 0);
        var x1 = Math.min(pxi + 1, this.pNumX - 1);
        var y1 = Math.min(pyi + 1, this.pNumY - 1);

        for (var xi = x0; xi <= x1; xi++) {
          for (var yi = y0; yi <= y1; yi++) {
            var cellNr = xi * this.pNumY + yi;
            var first = this.firstCellParticle[cellNr];
            var last = this.firstCellParticle[cellNr + 1];
            for (var j = first; j < last; j++) {
              var id = this.cellParticleIds[j];
              if (id == i) continue;
              var qx = this.particlePos[2 * id];
              var qy = this.particlePos[2 * id + 1];

              var dx = qx - px;
              var dy = qy - py;
              var d2 = dx * dx + dy * dy;
              if (d2 > minDist2 || d2 == 0.0) continue;
              var d = Math.sqrt(d2);
              var s = (0.5 * (minDist - d)) / d;
              dx *= s;
              dy *= s;
              this.particlePos[2 * i] -= dx;
              this.particlePos[2 * i + 1] -= dy;
              this.particlePos[2 * id] += dx;
              this.particlePos[2 * id + 1] += dy;

              for (var k = 0; k < 3; k++) {
                var color0 = this.particleColor[3 * i + k];
                var color1 = this.particleColor[3 * id + k];
                var color = (color0 + color1) * 0.5;
                this.particleColor[3 * i + k] =
                  color0 + (color - color0) * colorDiffusionCoeff;
                this.particleColor[3 * id + k] =
                  color1 + (color - color1) * colorDiffusionCoeff;
              }
            }
          }
        }
      }
    }
  }

  handleParticleCollisions(obstacleX, obstacleY, obstacleRadius, obsVx, obsVy) {
    var h = 1.0 / this.fInvSpacing;
    var r = this.particleRadius;
    var minDist = obstacleRadius + r;
    var minDist2 = minDist * minDist;

    var minX = h + r;
    var maxX = (this.fNumX - 1) * h - r;
    var minY = h + r;
    var maxY = (this.fNumY - 1) * h - r;

    for (var i = 0; i < this.numParticles; i++) {
      var x = this.particlePos[2 * i];
      var y = this.particlePos[2 * i + 1];
      var dx = x - obstacleX;
      var dy = y - obstacleY;
      var d2 = dx * dx + dy * dy;

      if (d2 < minDist2) {
        var d = Math.sqrt(d2);
        var s = (minDist - d) / d;
        this.particlePos[2 * i] += dx * s;
        this.particlePos[2 * i + 1] += dy * s;

        // Two way coupling: Particles inherit obstacle velocity at boundary
        this.particleVel[2 * i] = obsVx;
        this.particleVel[2 * i + 1] = obsVy;
      }

      var damping = 0.5;
      if (x < minX) {
        x = minX;
        this.particleVel[2 * i] = 0.0;
        this.particleVel[2 * i + 1] *= damping;
      }
      if (x > maxX) {
        x = maxX;
        this.particleVel[2 * i] = 0.0;
        this.particleVel[2 * i + 1] *= damping;
      }
      if (y < minY) {
        y = minY;
        this.particleVel[2 * i + 1] = 0.0;
        this.particleVel[2 * i] *= damping;
      }
      if (y > maxY) {
        y = maxY;
        this.particleVel[2 * i + 1] = 0.0;
        this.particleVel[2 * i] *= damping;
      }

      this.particlePos[2 * i] = x;
      this.particlePos[2 * i + 1] = y;
    }
  }

  updateParticleDensity() {
    var n = this.fNumY;
    var h = this.h;
    var h1 = this.fInvSpacing;
    var h2 = 0.5 * h;
    var d = this.particleDensity;
    d.fill(0.0);

    for (var i = 0; i < this.numParticles; i++) {
      var x = this.particlePos[2 * i];
      var y = this.particlePos[2 * i + 1];
      x = clamp(x, h, (this.fNumX - 1) * h);
      y = clamp(y, h, (this.fNumY - 1) * h);

      var x0 = Math.floor((x - h2) * h1);
      var tx = (x - h2 - x0 * h) * h1;
      var x1 = Math.min(x0 + 1, this.fNumX - 2);

      var y0 = Math.floor((y - h2) * h1);
      var ty = (y - h2 - y0 * h) * h1;
      var y1 = Math.min(y0 + 1, this.fNumY - 2);

      var sx = 1.0 - tx;
      var sy = 1.0 - ty;

      if (x0 < this.fNumX && y0 < this.fNumY) d[x0 * n + y0] += sx * sy;
      if (x1 < this.fNumX && y0 < this.fNumY) d[x1 * n + y0] += tx * sy;
      if (x1 < this.fNumX && y1 < this.fNumY) d[x1 * n + y1] += tx * ty;
      if (x0 < this.fNumX && y1 < this.fNumY) d[x0 * n + y1] += sx * ty;
    }

    if (this.particleRestDensity == 0.0) {
      var sum = 0.0;
      var numFluidCells = 0;
      for (var i = 0; i < this.fNumCells; i++) {
        if (this.cellType[i] == FLUID_CELL) {
          sum += d[i];
          numFluidCells++;
        }
      }
      if (numFluidCells > 0) this.particleRestDensity = sum / numFluidCells;
    }
  }

  transferVelocities(toGrid, flipRatio) {
    var n = this.fNumY;
    var h = this.h;
    var h1 = this.fInvSpacing;
    var h2 = 0.5 * h;

    if (toGrid) {
      this.prevU.set(this.u);
      this.prevV.set(this.v);
      this.du.fill(0.0);
      this.dv.fill(0.0);
      this.u.fill(0.0);
      this.v.fill(0.0);

      for (var i = 0; i < this.fNumCells; i++)
        this.cellType[i] = this.s[i] == 0.0 ? SOLID_CELL : AIR_CELL;

      for (var i = 0; i < this.numParticles; i++) {
        var x = this.particlePos[2 * i];
        var y = this.particlePos[2 * i + 1];
        var xi = clamp(Math.floor(x * h1), 0, this.fNumX - 1);
        var yi = clamp(Math.floor(y * h1), 0, this.fNumY - 1);
        var cellNr = xi * n + yi;
        if (this.cellType[cellNr] == AIR_CELL)
          this.cellType[cellNr] = FLUID_CELL;
      }
    }

    for (var component = 0; component < 2; component++) {
      var dx = component == 0 ? 0.0 : h2;
      var dy = component == 0 ? h2 : 0.0;
      var f = component == 0 ? this.u : this.v;
      var prevF = component == 0 ? this.prevU : this.prevV;
      var d = component == 0 ? this.du : this.dv;

      for (var i = 0; i < this.numParticles; i++) {
        var x = this.particlePos[2 * i];
        var y = this.particlePos[2 * i + 1];
        x = clamp(x, h, (this.fNumX - 1) * h);
        y = clamp(y, h, (this.fNumY - 1) * h);

        var x0 = Math.min(Math.floor((x - dx) * h1), this.fNumX - 2);
        var tx = (x - dx - x0 * h) * h1;
        var x1 = Math.min(x0 + 1, this.fNumX - 2);

        var y0 = Math.min(Math.floor((y - dy) * h1), this.fNumY - 2);
        var ty = (y - dy - y0 * h) * h1;
        var y1 = Math.min(y0 + 1, this.fNumY - 2);

        var sx = 1.0 - tx;
        var sy = 1.0 - ty;

        var d0 = sx * sy;
        var d1 = tx * sy;
        var d2 = tx * ty;
        var d3 = sx * ty;

        var nr0 = x0 * n + y0;
        var nr1 = x1 * n + y0;
        var nr2 = x1 * n + y1;
        var nr3 = x0 * n + y1;

        if (toGrid) {
          var pv = this.particleVel[2 * i + component];
          f[nr0] += pv * d0;
          d[nr0] += d0;
          f[nr1] += pv * d1;
          d[nr1] += d1;
          f[nr2] += pv * d2;
          d[nr2] += d2;
          f[nr3] += pv * d3;
          d[nr3] += d3;
        } else {
          var offset = component == 0 ? n : 1;
          var valid0 =
            this.cellType[nr0] != AIR_CELL ||
            this.cellType[nr0 - offset] != AIR_CELL
              ? 1.0
              : 0.0;
          var valid1 =
            this.cellType[nr1] != AIR_CELL ||
            this.cellType[nr1 - offset] != AIR_CELL
              ? 1.0
              : 0.0;
          var valid2 =
            this.cellType[nr2] != AIR_CELL ||
            this.cellType[nr2 - offset] != AIR_CELL
              ? 1.0
              : 0.0;
          var valid3 =
            this.cellType[nr3] != AIR_CELL ||
            this.cellType[nr3 - offset] != AIR_CELL
              ? 1.0
              : 0.0;

          var v = this.particleVel[2 * i + component];
          var d_val = valid0 * d0 + valid1 * d1 + valid2 * d2 + valid3 * d3;

          if (d_val > 0.0) {
            var picV =
              (valid0 * d0 * f[nr0] +
                valid1 * d1 * f[nr1] +
                valid2 * d2 * f[nr2] +
                valid3 * d3 * f[nr3]) /
              d_val;
            var corr =
              (valid0 * d0 * (f[nr0] - prevF[nr0]) +
                valid1 * d1 * (f[nr1] - prevF[nr1]) +
                valid2 * d2 * (f[nr2] - prevF[nr2]) +
                valid3 * d3 * (f[nr3] - prevF[nr3])) /
              d_val;
            var flipV = v + corr;
            this.particleVel[2 * i + component] =
              (1.0 - flipRatio) * picV + flipRatio * flipV;
          }
        }
      }

      if (toGrid) {
        for (var i = 0; i < f.length; i++) {
          if (d[i] > 0.0) f[i] /= d[i];
        }
        // Restore solid cells
        for (var i = 0; i < this.fNumX; i++) {
          for (var j = 0; j < this.fNumY; j++) {
            var solid = this.cellType[i * n + j] == SOLID_CELL;
            if (
              solid ||
              (i > 0 && this.cellType[(i - 1) * n + j] == SOLID_CELL)
            )
              this.u[i * n + j] = this.prevU[i * n + j];
            if (solid || (j > 0 && this.cellType[i * n + j - 1] == SOLID_CELL))
              this.v[i * n + j] = this.prevV[i * n + j];
          }
        }
      }
    }
  }

  solveIncompressibility(numIters, dt, overRelaxation, compensateDrift) {
    this.p.fill(0.0);
    this.prevU.set(this.u);
    this.prevV.set(this.v);

    var n = this.fNumY;
    var cp = (this.density * this.h) / dt;

    for (var iter = 0; iter < numIters; iter++) {
      for (var i = 1; i < this.fNumX - 1; i++) {
        for (var j = 1; j < this.fNumY - 1; j++) {
          if (this.cellType[i * n + j] != FLUID_CELL) continue;

          var center = i * n + j;
          var left = (i - 1) * n + j;
          var right = (i + 1) * n + j;
          var bottom = i * n + j - 1;
          var top = i * n + j + 1;

          var sx0 = this.s[left];
          var sx1 = this.s[right];
          var sy0 = this.s[bottom];
          var sy1 = this.s[top];
          var s = sx0 + sx1 + sy0 + sy1; //
          if (s == 0.0) continue;

          var div =
            this.u[right] - this.u[center] + this.v[top] - this.v[center];

          if (this.particleRestDensity > 0.0 && compensateDrift) {
            var k = 1.0;
            var compression =
              this.particleDensity[i * n + j] - this.particleRestDensity;
            if (compression > 0.0) div = div - k * compression;
          }

          var p = -div / s;
          p *= overRelaxation;

          // Store pressure for buoyancy calculation
          this.p[center] += cp * p;

          this.u[center] -= sx0 * p;
          this.u[right] += sx1 * p;
          this.v[center] -= sy0 * p;
          this.v[top] += sy1 * p;
        }
      }
    }
  }

  // --- NEW: Calculate the force exerted by the fluid on the obstacle ---
  calculateFluidForces(obsX, obsY, obsRadius) {
    let fx = 0.0;
    let fy = 0.0;
    let n = this.fNumY;
    let h = this.h;

    for (let i = 1; i < this.fNumX - 1; i++) {
      for (let j = 1; j < this.fNumY - 1; j++) {
        if (this.cellType[i * n + j] === FLUID_CELL) {
          let dx = (i + 0.5) * h - obsX;
          let dy = (j + 0.5) * h - obsY;
          let dist = Math.sqrt(dx * dx + dy * dy);

          // If fluid cell is exactly at the boundary of the obstacle
          if (dist < obsRadius + h && dist > obsRadius - h) {
            let pressure = this.p[i * n + j];
            // Normal vector pointing from obstacle to fluid
            let nx = dx / dist;
            let ny = dy / dist;

            // Force is pressure pushing inward against the obstacle
            // We scale down the raw pressure heavily here for stability in 2D
            let scale = 0.005 * h;
            fx -= pressure * nx * scale;
            fy -= pressure * ny * scale;
          }

          // --- NEW: Kinematic bouncing for deeply penetrating particles ---
          if (dist <= obsRadius - h && dist > 0.0) {
            let penetrationDepth = obsRadius - h - dist;
            let nx = dx / dist; // Normal pointing from obstacle to fluid
            let ny = dy / dist;

            // Spring-like repulsive force (Hooke's law)
            let springConstant = 50.0; // Adjust for desired stiffness
            let bounceForce = springConstant * penetrationDepth;

            // Add velocity-based damping
            let cellVelX = this.u[i * n + j];
            let cellVelY = this.v[i * n + j];
            let relativeVel = cellVelX * nx + cellVelY * ny;
            let dampingCoeff = 0.5;
            let dampingForce = dampingCoeff * relativeVel;

            // Total repulsive force
            let totalForce = bounceForce + dampingForce;

            fx += totalForce * nx;
            fy += totalForce * ny;
          }

          // --- Handle center case (dist == 0) ---
          if (dist === 0.0) {
            // Particle exactly at obstacle center, apply upward force
            fy += 10.0; // Arbitrary upward push
          }
        }
      }
    }
    return { x: fx, y: fy };
  }

  updateParticleColors() {
    var h1 = this.fInvSpacing;
    // Target sky blue color for dense/calm particles (135, 206, 235)/256
    const TARGET_R = 135 / 256; // ≈ 0.527
    const TARGET_G = 206 / 256; // ≈ 0.805
    const TARGET_B = 235 / 256; // ≈ 0.918

    // Color for sparse particles
    const SPARSE_R = 0.8;
    const SPARSE_G = 0.8;
    const SPARSE_B = 1.0;
    for (var i = 0; i < this.numParticles; i++) {
      var s = 0.01;
      // Gradually shift towards target sky blue for dense particles
      this.particleColor[3 * i] = clamp(
        this.particleColor[3 * i] + (TARGET_R - this.particleColor[3 * i]) * s,
        0.0,
        1.0,
      );
      this.particleColor[3 * i + 1] = clamp(
        this.particleColor[3 * i + 1] +
          (TARGET_G - this.particleColor[3 * i + 1]) * s,
        0.0,
        1.0,
      );
      this.particleColor[3 * i + 2] = clamp(
        this.particleColor[3 * i + 2] +
          (TARGET_B - this.particleColor[3 * i + 2]) * s,
        0.0,
        1.0,
      );

      var x = this.particlePos[2 * i];
      var y = this.particlePos[2 * i + 1];
      var xi = clamp(Math.floor(x * h1), 1, this.fNumX - 1);
      var yi = clamp(Math.floor(y * h1), 1, this.fNumY - 1);
      var cellNr = xi * this.fNumY + yi;

      var d0 = this.particleRestDensity;
      if (d0 > 0.0) {
        var relDensity = this.particleDensity[cellNr] / d0;
        if (relDensity < 0.7) {
          //   var s_val = 0.8;
          //   this.particleColor[3 * i] = s_val;
          //   this.particleColor[3 * i + 1] = s_val;
          //   this.particleColor[3 * i + 2] = 1.0;
          this.particleColor[3 * i] = SPARSE_R;
          this.particleColor[3 * i + 1] = SPARSE_G;
          this.particleColor[3 * i + 2] = SPARSE_B;
        }
      }
    }
  }

  setSciColor(cellNr, val, minVal, maxVal) {
    val = Math.min(Math.max(val, minVal), maxVal - 0.0001);
    var d = maxVal - minVal;
    val = d == 0.0 ? 0.5 : (val - minVal) / d;
    var m = 0.25;
    var num = Math.floor(val / m);
    var s = (val - num * m) / m;
    var r, g, b;
    switch (num) {
      case 0:
        r = 0.0;
        g = s;
        b = 1.0;
        break;
      case 1:
        r = 0.0;
        g = 1.0;
        b = 1.0 - s;
        break;
      case 2:
        r = s;
        g = 1.0;
        b = 0.0;
        break;
      case 3:
        r = 1.0;
        g = 1.0 - s;
        b = 0.0;
        break;
    }
    this.cellColor[3 * cellNr] = r;
    this.cellColor[3 * cellNr + 1] = g;
    this.cellColor[3 * cellNr + 2] = b;
  }

  updateCellColors() {
    this.cellColor.fill(0.0);
    for (var i = 0; i < this.fNumCells; i++) {
      if (this.cellType[i] == SOLID_CELL) {
        this.cellColor[3 * i] = 0.5;
        this.cellColor[3 * i + 1] = 0.5;
        this.cellColor[3 * i + 2] = 0.5;
      } else if (this.cellType[i] == FLUID_CELL) {
        var d = this.particleDensity[i];
        if (this.particleRestDensity > 0.0) d /= this.particleRestDensity;
        this.setSciColor(i, d, 0.0, 2.0);
      }
    }
  }
}

var scene = {
  gravity: -9.81,
  dt: 1.0 / 120.0,
  flipRatio: 0.9,
  numPressureIters: 50,
  numParticleIters: 2,
  overRelaxation: 1.9,
  compensateDrift: true,
  separateParticles: true,

  // Dynamic Obstacle Physics Settings
  obstacleX: 0.5,
  obstacleY: 1.0,
  obstacleVx: 0.0,
  obstacleVy: 0.0,
  obstacleRadius: 0.15,
  obstacleMass: 0.3, // High mass required for stability against pressure spikes
  isDynamic: true,

  paused: true,
  showParticles: true,
  showGrid: false,
  fluid: null,
};

function setupSceneTank() {
  var res = 100;
  var tankHeight = 1.0 * simHeight;
  var tankWidth = 1.0 * simWidth;
  var h = tankHeight / res;
  var density = 1000.0;

  var relWaterHeight = 0.6;
  var relWaterWidth = 0.5;

  var r = 0.3 * h;
  var dx = 2.0 * r;
  var dy = (Math.sqrt(3.0) / 2.0) * dx;

  var numX = Math.floor((relWaterWidth * tankWidth - 2.0 * h - 2.0 * r) / dx);
  var numY = Math.floor((relWaterHeight * tankHeight - 2.0 * h - 2.0 * r) / dy);
  var maxParticles = numX * numY;

  f = scene.fluid = new FlipFluid(
    density,
    tankWidth,
    tankHeight,
    h,
    r,
    maxParticles,
  );

  f.numParticles = numX * numY;
  var p = 0;
  for (var i = 0; i < numX; i++) {
    for (var j = 0; j < numY; j++) {
      f.particlePos[p++] = h + r + dx * i + (j % 2 == 0 ? 0.0 : r);
      f.particlePos[p++] = h + r + dy * j;
    }
  }

  var n = f.fNumY;
  for (var i = 0; i < f.fNumX; i++) {
    for (var j = 0; j < f.fNumY; j++) {
      var s = 1.0;
      if (i == 0 || i == f.fNumX - 1 || j == 0) s = 0.0;
      f.s[i * n + j] = s;
    }
  }
  updateObstacleGrid();
}

function updateObstaclePhysics(dt) {
  if (scene.isDynamic && !mouseDown) {
    // 1. Gravity
    scene.obstacleVy += scene.gravity * dt;

    // 2. Fluid Forces (Buoyancy/Pressure Integration)
    let fluidForces = scene.fluid.calculateFluidForces(
      scene.obstacleX,
      scene.obstacleY,
      scene.obstacleRadius,
    );
    scene.obstacleVx += (fluidForces.x / scene.obstacleMass) * dt;
    scene.obstacleVy += (fluidForces.y / scene.obstacleMass) * dt;

    // // 3. Drag / Damping
    // scene.obstacleVx *= 0.98;
    // scene.obstacleVy *= 0.98;

    // 4. Integration
    scene.obstacleX += scene.obstacleVx * dt;
    scene.obstacleY += scene.obstacleVy * dt;

    // 5. Floor/Wall Collision
    if (scene.obstacleY < scene.obstacleRadius + scene.fluid.h) {
      scene.obstacleY = scene.obstacleRadius + scene.fluid.h;
      scene.obstacleVy *= -1; // Bounce
    }
    if (scene.obstacleX < scene.obstacleRadius + scene.fluid.h) {
      scene.obstacleX = scene.obstacleRadius + scene.fluid.h;
      scene.obstacleVx *= -1;
    }
    if (scene.obstacleX > simWidth - scene.obstacleRadius - scene.fluid.h) {
      scene.obstacleX = simWidth - scene.obstacleRadius - scene.fluid.h;
      scene.obstacleVx *= -1;
    }
  }
  updateObstacleGrid();
}

function updateObstacleGrid() {
  var f = scene.fluid;
  var n = f.fNumY;
  var r = scene.obstacleRadius;

  // Reset grid
  for (var i = 1; i < f.fNumX - 1; i++) {
    for (var j = 1; j < f.fNumY - 1; j++) {
      f.s[i * n + j] = 1.0;
    }
  }

  for (var i = 1; i < f.fNumX - 2; i++) {
    for (var j = 1; j < f.fNumY - 2; j++) {
      var dx = (i + 0.5) * f.h - scene.obstacleX;
      var dy = (j + 0.5) * f.h - scene.obstacleY;

      if (dx * dx + dy * dy < r * r) {
        f.s[i * n + j] = 0.0;
        f.u[i * n + j] = scene.obstacleVx;
        f.u[(i + 1) * n + j] = scene.obstacleVx;
        f.v[i * n + j] = scene.obstacleVy;
        f.v[i * n + j + 1] = scene.obstacleVy;
      }
    }
  }
}

const pointVertexShader = `
		attribute vec2 attrPosition;
		attribute vec3 attrColor;
		uniform vec2 domainSize;
		uniform float pointSize;
		uniform float drawDisk;
		varying vec3 fragColor;
		varying float fragDrawDisk;
		void main() {
			vec4 screenTransform = vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
			gl_Position = vec4(attrPosition * screenTransform.xy + screenTransform.zw, 0.0, 1.0);
			gl_PointSize = pointSize;
			fragColor = attrColor;
			fragDrawDisk = drawDisk;
		}`;

const pointFragmentShader = `
		precision mediump float;
		varying vec3 fragColor;
		varying float fragDrawDisk;
		void main() {
			if (fragDrawDisk == 1.0) {
				float rx = 0.5 - gl_PointCoord.x;
				float ry = 0.5 - gl_PointCoord.y;
				float r2 = rx * rx + ry * ry;
				if (r2 > 0.25) discard;
			}
			gl_FragColor = vec4(fragColor, 1.0);
		}`;

const meshVertexShader = `
		attribute vec2 attrPosition;
		uniform vec2 domainSize;
		uniform vec3 color;
		uniform vec2 translation;
		uniform float scale;
		varying vec3 fragColor;
		void main() {
			vec2 v = translation + attrPosition * scale;
			vec4 screenTransform = vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
			gl_Position = vec4(v * screenTransform.xy + screenTransform.zw, 0.0, 1.0);
			fragColor = color;
		}`;

const meshFragmentShader = `
		precision mediump float;
		varying vec3 fragColor;
		void main() { gl_FragColor = vec4(fragColor, 1.0); }`;

function createShader(gl, vsSource, fsSource) {
  const vsShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsShader, vsSource);
  gl.compileShader(vsShader);
  const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsShader, fsSource);
  gl.compileShader(fsShader);
  var shader = gl.createProgram();
  gl.attachShader(shader, vsShader);
  gl.attachShader(shader, fsShader);
  gl.linkProgram(shader);
  return shader;
}

var pointShader = null;
var meshShader = null;
var pointVertexBuffer = null;
var pointColorBuffer = null;
var gridVertBuffer = null;
var gridColorBuffer = null;
var diskVertBuffer = null;
var diskIdBuffer = null;

function drawTank() {
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  if (pointShader == null)
    pointShader = createShader(gl, pointVertexShader, pointFragmentShader);
  if (meshShader == null)
    meshShader = createShader(gl, meshVertexShader, meshFragmentShader);

  if (gridVertBuffer == null) {
    var f = scene.fluid;
    gridVertBuffer = gl.createBuffer();
    var cellCenters = new Float32Array(2 * f.fNumCells);
    var p = 0;
    for (var i = 0; i < f.fNumX; i++) {
      for (var j = 0; j < f.fNumY; j++) {
        cellCenters[p++] = (i + 0.5) * f.h;
        cellCenters[p++] = (j + 0.5) * f.h;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gridVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cellCenters, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  if (gridColorBuffer == null) gridColorBuffer = gl.createBuffer();

  if (scene.showGrid) {
    var pointSize = ((0.9 * scene.fluid.h) / simWidth) * canvas1.width;
    gl.useProgram(pointShader);
    // In drawTank(), update the domainSize uniform
    gl.uniform2f(
      gl.getUniformLocation(pointShader, "domainSize"),
      simWidth,
      simHeight,
    );
    gl.uniform1f(gl.getUniformLocation(pointShader, "pointSize"), pointSize);
    gl.uniform1f(gl.getUniformLocation(pointShader, "drawDisk"), 0.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gridVertBuffer);
    var posLoc = gl.getAttribLocation(pointShader, "attrPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gridColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, scene.fluid.cellColor, gl.DYNAMIC_DRAW);
    var colorLoc = gl.getAttribLocation(pointShader, "attrColor");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, scene.fluid.fNumCells);
    gl.disableVertexAttribArray(posLoc);
    gl.disableVertexAttribArray(colorLoc);
  }

  if (scene.showParticles) {
    var pointSize =
      ((2.0 * scene.fluid.particleRadius) / simWidth) * canvas1.width;
    gl.useProgram(pointShader);
    gl.uniform2f(
      gl.getUniformLocation(pointShader, "domainSize"),
      simWidth,
      simHeight,
    );
    gl.uniform1f(gl.getUniformLocation(pointShader, "pointSize"), pointSize);
    gl.uniform1f(gl.getUniformLocation(pointShader, "drawDisk"), 1.0);

    if (pointVertexBuffer == null) pointVertexBuffer = gl.createBuffer();
    if (pointColorBuffer == null) pointColorBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, scene.fluid.particlePos, gl.DYNAMIC_DRAW);
    var posLoc = gl.getAttribLocation(pointShader, "attrPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, pointColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, scene.fluid.particleColor, gl.DYNAMIC_DRAW);
    var colorLoc = gl.getAttribLocation(pointShader, "attrColor");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, scene.fluid.numParticles);
    gl.disableVertexAttribArray(posLoc);
    gl.disableVertexAttribArray(colorLoc);
  }

  var numSegs = 50;
  if (diskVertBuffer == null) {
    diskVertBuffer = gl.createBuffer();
    var dphi = (2.0 * Math.PI) / numSegs;
    var diskVerts = new Float32Array(2 * numSegs + 2);
    var p = 0;
    diskVerts[p++] = 0.0;
    diskVerts[p++] = 0.0;
    for (var i = 0; i < numSegs; i++) {
      diskVerts[p++] = Math.cos(i * dphi);
      diskVerts[p++] = Math.sin(i * dphi);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, diskVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, diskVerts, gl.DYNAMIC_DRAW);

    diskIdBuffer = gl.createBuffer();
    var diskIds = new Uint16Array(3 * numSegs);
    p = 0;
    for (var i = 0; i < numSegs; i++) {
      diskIds[p++] = 0;
      diskIds[p++] = 1 + i;
      diskIds[p++] = 1 + ((i + 1) % numSegs);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, diskIdBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, diskIds, gl.DYNAMIC_DRAW);
  }

  var diskColor = [0.8, 0.2, 0.2];
  gl.useProgram(meshShader);
  gl.uniform2f(
    gl.getUniformLocation(meshShader, "domainSize"),
    simWidth,
    simHeight,
  );
  gl.uniform3f(
    gl.getUniformLocation(meshShader, "color"),
    diskColor[0],
    diskColor[1],
    diskColor[2],
  );
  gl.uniform2f(
    gl.getUniformLocation(meshShader, "translation"),
    scene.obstacleX,
    scene.obstacleY,
  );
  gl.uniform1f(
    gl.getUniformLocation(meshShader, "scale"),
    scene.obstacleRadius,
  );

  posLoc = gl.getAttribLocation(meshShader, "attrPosition");
  gl.enableVertexAttribArray(posLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, diskVertBuffer);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, diskIdBuffer);
  gl.drawElements(gl.TRIANGLES, 3 * numSegs, gl.UNSIGNED_SHORT, 0);
  gl.disableVertexAttribArray(posLoc);
}

var mouseDown = false;
function startDrag(x, y) {
  let bounds = canvas1.getBoundingClientRect();
  let mx = x - bounds.left - canvas1.clientLeft;
  let my = y - bounds.top - canvas1.clientTop;
  mouseDown = true;
  scene.obstacleX = mx / cScaleX;
  scene.obstacleY = (canvas1.height - my) / cScaleY; // Flip Y for WebGL
  scene.obstacleVx = 0.0;
  scene.obstacleVy = 0.0;
}

function drag(x, y) {
  if (mouseDown) {
    let bounds = canvas1.getBoundingClientRect();
    let mx = x - bounds.left - canvas1.clientLeft;
    let my = y - bounds.top - canvas1.clientTop;

    let newX = mx / cScaleX;
    let newY = (canvas1.height - my) / cScaleY;

    // Kinematic velocity calculation while dragging
    scene.obstacleVx = (newX - scene.obstacleX) / scene.dt;
    scene.obstacleVy = (newY - scene.obstacleY) / scene.dt;

    scene.obstacleX = newX;
    scene.obstacleY = newY;
  }
}

function endDrag() {
  mouseDown = false;
}

canvas1.addEventListener("mousedown", (event) => startDrag(event.x, event.y));
canvas1.addEventListener("mouseup", (event) => endDrag());
canvas1.addEventListener("mousemove", (event) => drag(event.x, event.y));
canvas1.addEventListener("touchstart", (event) =>
  startDrag(event.touches[0].clientX, event.touches[0].clientY),
);
canvas1.addEventListener("touchend", (event) => endDrag());
canvas1.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    drag(event.touches[0].clientX, event.touches[0].clientY);
  },
  { passive: false },
);

function togglePause() {
  var button = document.getElementById("pauseButton");
  scene.paused = !scene.paused;
  button.innerHTML = scene.paused ? "继续" : "暂停";
}

document.addEventListener("DOMContentLoaded", function () {
  const pauseBtn = document.getElementById("pauseButton");
  const dragHint = document.getElementById("dragHint");

  if (pauseBtn && dragHint) {
    // Initial check - use visibility instead of display
    dragHint.style.visibility =
      pauseBtn.textContent.trim() === "暂停" ? "visible" : "hidden";

    // Observe text content changes
    const observer = new MutationObserver(() => {
      dragHint.style.visibility =
        pauseBtn.textContent.trim() === "暂停" ? "visible" : "hidden";
    });

    observer.observe(pauseBtn, {
      characterData: true,
      subtree: true,
      childList: true,
    });
  }
});

function simulateTank() {
  if (!scene.paused) {
    var sdt = scene.dt;
    // Add the obstacle physics right before integrating the fluid step
    updateObstaclePhysics(sdt);

    scene.fluid.integrateParticles(sdt, scene.gravity);
    if (scene.separateParticles)
      scene.fluid.pushParticlesApart(scene.numParticleIters);
    scene.fluid.handleParticleCollisions(
      scene.obstacleX,
      scene.obstacleY,
      scene.obstacleRadius,
      scene.obstacleVx,
      scene.obstacleVy,
    );
    scene.fluid.transferVelocities(true, scene.flipRatio);
    scene.fluid.updateParticleDensity();
    scene.fluid.solveIncompressibility(
      scene.numPressureIters,
      sdt,
      scene.overRelaxation,
      scene.compensateDrift,
    );
    scene.fluid.transferVelocities(false, scene.flipRatio);
    scene.fluid.updateParticleColors();
    scene.fluid.updateCellColors();
  }
}

// drawing -------------------------------------------------------

var canvas2 = document.getElementById("myCanvas2");
var c = canvas2.getContext("2d");

canvas2.width = window.innerWidth - 20;
canvas2.height = window.innerHeight - 100;

var simMinWidth = 2.0;
var cScale2 = canvas2.width / simMinWidth;
var simWidth2 = canvas2.width / cScale2;
var simHeight2 = canvas2.height / cScale2;

function cX(pos) {
  return pos.x * cScale2;
}

function cY(pos) {
  return canvas2.height - pos.y * cScale2;
}

// vector math -------------------------------------------------------

class Vector2 {
  constructor(x = 0.0, y = 0.0) {
    this.x = x;
    this.y = y;
  }

  set(v) {
    this.x = v.x;
    this.y = v.y;
  }

  clone() {
    return new Vector2(this.x, this.y);
  }

  add(v, s = 1.0) {
    this.x += v.x * s;
    this.y += v.y * s;
    return this;
  }

  addVectors(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    return this;
  }

  subtract(v, s = 1.0) {
    this.x -= v.x * s;
    this.y -= v.y * s;
    return this;
  }

  subtractVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
}

// physics scene -------------------------------------------------------

class Ball {
  constructor(radius, mass, pos, vel) {
    this.radius = radius;
    this.mass = mass;
    this.pos = pos.clone();
    this.vel = vel.clone();
  }
  simulate(dt, gravity) {
    this.vel.add(gravity, dt);
    this.pos.add(this.vel, dt);
  }
}

var physicsScene = {
  gravity: new Vector2(0.0, 0.0),
  dt: 1.0 / 60.0,
  worldSize: new Vector2(simWidth2, simHeight2),
  paused: true,
  balls: [],
  restitution: 1.0,
};

// Add a fixed index for the draggable ball (always the third ball)
var DRAGGABLE_BALL_INDEX = 2;

// Modify setupSceneGravity to always have 3 balls with the third one being draggable
function setupSceneGravity() {
  physicsScene.balls = [];
  var numBalls = 3; // Always 3 balls

  for (i = 0; i < numBalls; i++) {
    var radius = 0.01 * (i===0? 6.4 : i===1? 3.5 : 4.0); // Third ball has radius 0.04
    var mass = Math.PI * radius * radius;
    var pos = new Vector2(Math.random() * simWidth2, Math.random() * simHeight2);
    var vel = new Vector2(
      -1.0 + 2.0 * Math.random(),
      -1.0 + 2.0 * Math.random(),
    );

    physicsScene.balls.push(new Ball(radius, mass, pos, vel));
  }
  
  // Reset drag tracking
  mouseDown2 = false;
}

// Functions to handle dragging for canvas2 - always drag the fixed ball
function startDrag2(x, y) {
  let bounds = canvas2.getBoundingClientRect();
  let mx = x - bounds.left - canvas2.clientLeft;
  let my = y - bounds.top - canvas2.clientTop;
  
  // Adjust for canvas scaling (actual size vs displayed size)
  let scaleX = canvas2.width / bounds.width;
  let scaleY = canvas2.height / bounds.height;
  let actualX = mx * scaleX;
  let actualY = my * scaleY;
  
  // Convert mouse coordinates to simulation coordinates
  let simX = actualX / cScale2;
  let simY = (canvas2.height - actualY) / cScale2; // Flip Y coordinate
  
  // Always target the fixed draggable ball
  const ball = physicsScene.balls[DRAGGABLE_BALL_INDEX];
  
  // Set the ball's position to the mouse position
  ball.pos.x = simX;
  ball.pos.y = simY;
  
  // Set velocity to zero when starting drag
  ball.vel.set(new Vector2(0, 0));
  
  mouseDown2 = true;
}

function drag2(x, y) {
  if (mouseDown2) {
    let bounds = canvas2.getBoundingClientRect();
    let mx = x - bounds.left - canvas2.clientLeft;
    let my = y - bounds.top - canvas2.clientTop;
    
    // Adjust for canvas scaling (actual size vs displayed size)
    let scaleX = canvas2.width / bounds.width;
    let scaleY = canvas2.height / bounds.height;
    let actualX = mx * scaleX;
    let actualY = my * scaleY;
    
    // Convert mouse coordinates to simulation coordinates
    let newX = actualX / cScale2;
    let newY = (canvas2.height - actualY) / cScale2; // Flip Y coordinate

    let ball = physicsScene.balls[DRAGGABLE_BALL_INDEX];

    ball.vel.x = (newX - ball.pos.x) / physicsScene.dt;
    ball.vel.y = (newY - ball.pos.y) / physicsScene.dt;
    
    // Update the fixed draggable ball position directly
    ball.pos.x = newX;
    ball.pos.y = newY;
  }
}

function endDrag2() {
  mouseDown2 = false;
}

// Add event listeners for canvas2
canvas2.addEventListener("mousedown", (event) => startDrag2(event.x, event.y));
canvas2.addEventListener("mouseup", (event) => endDrag2());
canvas2.addEventListener("mousemove", (event) => drag2(event.x, event.y));
canvas2.addEventListener("touchstart", (event) =>
  startDrag2(event.touches[0].clientX, event.touches[0].clientY),
);
canvas2.addEventListener("touchend", (event) => endDrag2());
canvas2.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    drag2(event.touches[0].clientX, event.touches[0].clientY);
  },
  { passive: false },
);

// draw -------------------------------------------------------

function drawGravity() {
  c.clearRect(0, 0, canvas2.width, canvas2.height);

  c.fillStyle = "#000000";

  for (i = 0; i < physicsScene.balls.length; i++) {
    var ball = physicsScene.balls[i];
    c.beginPath();
    c.arc(
      cX(ball.pos),
      cY(ball.pos),
      cScale2 * ball.radius,
      0.0,
      2.0 * Math.PI,
    );
    c.closePath();
    c.fill();
  }
}

// collision handling -------------------------------------------------------

function handleBallCollision(ball1, ball2, restitution) {
  var dir = new Vector2();
  dir.subtractVectors(ball2.pos, ball1.pos);
  var d = dir.length();
  if (d == 0.0 || d > ball1.radius + ball2.radius) return;

  dir.scale(1.0 / d);

  var corr = (ball1.radius + ball2.radius - d) / 2.0;
  ball1.pos.add(dir, -corr);
  ball2.pos.add(dir, corr);

  var v1 = ball1.vel.dot(dir);
  var v2 = ball2.vel.dot(dir);

  var m1 = ball1.mass;
  var m2 = ball2.mass;

  var newV1 = (m1 * v1 + m2 * v2 - m2 * (v1 - v2) * restitution) / (m1 + m2);
  var newV2 = (m1 * v1 + m2 * v2 - m1 * (v2 - v1) * restitution) / (m1 + m2);

  ball1.vel.add(dir, newV1 - v1);
  ball2.vel.add(dir, newV2 - v2);
}

// ------------------------------------------------------

function handleWallCollision(ball, worldSize) {
  if (ball.pos.x < ball.radius) {
    ball.pos.x = ball.radius;
    ball.vel.x = -ball.vel.x;
  }
  if (ball.pos.x > worldSize.x - ball.radius) {
    ball.pos.x = worldSize.x - ball.radius;
    ball.vel.x = -ball.vel.x;
  }
  if (ball.pos.y < ball.radius) {
    ball.pos.y = ball.radius;
    ball.vel.y = -ball.vel.y;
  }

  if (ball.pos.y > worldSize.y - ball.radius) {
    ball.pos.y = worldSize.y - ball.radius;
    ball.vel.y = -ball.vel.y;
  }
}

// simulation -------------------------------------------------------

// Modify simulateGravity to exclude the fixed draggable ball from physics simulation during drag
function simulateGravity() {
  for (i = 0; i < physicsScene.balls.length; i++) {
    // Skip physics simulation for the draggable ball when it's being dragged
    if (mouseDown2 && i === DRAGGABLE_BALL_INDEX) continue;
    
    var ball1 = physicsScene.balls[i];
    ball1.simulate(physicsScene.dt, physicsScene.gravity);

    for (j = i + 1; j < physicsScene.balls.length; j++) {
      // Skip collision if either ball is the draggable ball and is currently being dragged
      if ((mouseDown2 && (i === DRAGGABLE_BALL_INDEX || j === DRAGGABLE_BALL_INDEX))) continue;
      
      var ball2 = physicsScene.balls[j];
      handleBallCollision(ball1, ball2, physicsScene.restitution);
    }

    handleWallCollision(ball1, physicsScene.worldSize);
  }
}

function updateTank() {
  simulateTank();
  drawTank();
  requestAnimationFrame(updateTank);
}

setupSceneTank();
updateTank();

function updateGravity() {
  simulateGravity();
  drawGravity();
  requestAnimationFrame(updateGravity);
}

setupSceneGravity();
updateGravity();