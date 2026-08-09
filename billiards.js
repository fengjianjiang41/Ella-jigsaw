// ============================================================
// 台球游戏模块 (Billiards Game Module)
// ============================================================
// 使用 BILLIARDS_CONFIG 配置文件管理物理参数
// ============================================================

const config = window.BILLIARDS_CONFIG;

// drawing -------------------------------------------------------

var canvas2 = document.getElementById("myCanvas2");
var c = canvas2.getContext("2d");

// Set canvas actual size to match CSS size
canvas2.width = config.canvas.width;
canvas2.height = config.canvas.height;

var simMinWidth = config.canvas.simMinWidth;
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
  constructor(radius, mass, inertia, pos, vel, ang, omega) {
    this.radius = radius;
    this.mass = mass;
    this.inertia = inertia;
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.ang = ang;
    this.omega = omega;
  }
  simulate(dt, gravity) {
    // 施加重力
    this.vel.add(gravity, dt);
    
    // 平动阻力（速度随时间指数衰减）
    const linDamp = config.physics.linearDamping;
    const linDampFactor = Math.pow(1.0 - linDamp, dt);
    this.vel.scale(linDampFactor);
    
    // 位置更新
    this.pos.add(this.vel, dt);
    
    // 转动阻力（角速度随时间指数衰减）
    const angDamp = config.physics.angularDamping;
    const angDampFactor = Math.pow(1.0 - angDamp, dt);
    this.omega *= angDampFactor;
    
    // 角度更新
    this.ang += this.omega * dt;
  }
}

var physicsScene = {
  gravity: new Vector2(config.physics.gravity.x, config.physics.gravity.y),
  dt: config.physics.dt,
  worldSize: new Vector2(simWidth2, simHeight2),
  paused: true,
  balls: [],
  restitution: config.physics.restitution,
  G: config.physics.G,
  gravityEnabled: config.physics.gravityEnabled,
  ballBallSoundAdjustment: config.sound.ballBallAdjustment,
  ballWallSoundAdjustment: config.sound.ballWallAdjustment,
  billiardsMode: false,
  billiardsClickCount: 0,
  currentWallpaper: null,
  previousWallpaper: null,
  wallpaperOffset: { x: 0, y: 0 },
  wallpaperImages: config.images.wallpapers,
  wallpaperImage: new Image(),
  starBilliardsMode: false,
  pockets: [],
  currentPlanetWallpaper: null,  // 当前星球壁纸
  // 空间网格系统 - 用于高效碰撞检测
  spatialGrid: null,
  cellSize: config.spatialGrid.cellSize,
  gridCols: 0,
  gridRows: 0,
};

var DRAGGABLE_BALL_INDEX = config.balls.draggableIndex;

// Global sound enable state
let soundEnabled = config.sound.enabled;

// Audio pool for ball-wall collision sounds
const ballWallAudioPool = {
  audioObjects: [],
  maxPoolSize: config.audioPools.ballWall.maxSize,

  getAudio() {
    for (let audio of this.audioObjects) {
      if (audio.ended || audio.currentTime === 0) {
        return audio;
      }
    }
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio(config.audioPools.ballWall.src);
      this.audioObjects.push(newAudio);
      return newAudio;
    }
    return this.audioObjects[0];
  },
};

// Audio pool for ball-ball collision sounds
const ballBallAudioPool = {
  audioObjects: [],
  maxPoolSize: config.audioPools.ballBall.maxSize,

  getAudio() {
    for (let audio of this.audioObjects) {
      if (audio.ended || audio.currentTime === 0) {
        return audio;
      }
    }
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio(config.audioPools.ballBall.src);
      this.audioObjects.push(newAudio);
      return newAudio;
    }
    return this.audioObjects[0];
  },
};

// Audio pool for obstacle wall collision sounds
const ballGlassAudioPool = {
  audioObjects: [],
  maxPoolSize: config.audioPools.ballGlass.maxSize,

  getAudio(soundFile) {
    for (let audio of this.audioObjects) {
      if (audio.ended || audio.currentTime === 0) {
        audio.src = soundFile;
        return audio;
      }
    }
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio(soundFile);
      this.audioObjects.push(newAudio);
      return newAudio;
    }
    const oldestAudio = this.audioObjects[0];
    oldestAudio.src = soundFile;
    return oldestAudio;
  },
};

// Toggle sound on/off
function toggleSound() {
  soundEnabled = !soundEnabled;
  const button = document.querySelector('button[onclick="toggleSound()"]');
  if (button) {
    button.textContent = soundEnabled
      ? window.getTranslatedText
        ? window.getTranslatedText("安静一下")
        : "安静一下"
      : window.getTranslatedText
        ? window.getTranslatedText("来点动静")
        : "来点动静";
  }
}

function playBallWallSound(normalMomentum) {
  if (soundEnabled) {
    const ballwallAudio = ballWallAudioPool.getAudio();
    ballwallAudio.currentTime = 0;
    const volume = Math.min(Math.pow(Math.abs(normalMomentum), 2), 1);
    ballwallAudio.volume = config.sound.ballWallFinalAdjustment * volume;
    ballwallAudio.play().catch((e) => console.log("Audio play failed:", e));
  }
}

function playBallBallSound(normalMomentum) {
  if (soundEnabled) {
    const volume = Math.min(Math.pow(Math.abs(normalMomentum), 2), 1);

    if (physicsScene.gravityEnabled && volume < config.collision.soundVolumeThreshold) {
      return;
    }

    const ballballAudio = ballBallAudioPool.getAudio();
    ballballAudio.currentTime = 0;
    ballballAudio.volume = volume;
    ballballAudio.play().catch((e) => console.log("Audio play failed:", e));
  }
}

function playBallGlassSound(normalVel) {
  const absNormalVel = Math.abs(normalVel);
  const { glassVelocityThreshold, glassVolumeScale, pitchRandomMin, pitchRandomMax } = config.sound;
  const { longSrc, shortSrc } = config.audioPools.ballGlass;

  const soundFile = absNormalVel > glassVelocityThreshold ? longSrc : shortSrc;
  const volume = Math.min(absNormalVel * glassVolumeScale, 1.0);

  const ballglassAudio = ballGlassAudioPool.getAudio(soundFile);
  ballglassAudio.currentTime = 0;
  ballglassAudio.volume = volume;
  const pitchRandom = pitchRandomMin + Math.random() * (pitchRandomMax - pitchRandomMin);
  ballglassAudio.pitch = pitchRandom * ballglassAudio.pitch;
  ballglassAudio.playbackRate = pitchRandom;
  ballglassAudio.play().catch((e) => console.log("Audio play failed:", e));
}

function setupSceneGravity() {
  if (physicsScene.starBilliardsMode) {
    setupStarBalls();
    return;
  }

  physicsScene.balls = [];
  const numBalls = config.balls.count;
  const { radiusRatios, initialVelocity } = config.balls;

  for (i = 0; i < numBalls; i++) {
    var radius = config.canvas.simMinWidth * radiusRatios[i];
    var mass = Math.PI * radius * radius;
    var inertia = (mass * radius * radius) / 2.0;
    var pos = new Vector2(
      Math.random() * simWidth2,
      Math.random() * simHeight2,
    );
    var vel = new Vector2(initialVelocity.x, initialVelocity.y);
    var ang = 0.0;
    var omega = 0.0;

    physicsScene.balls.push(
      new Ball(radius, mass, inertia, pos, vel, ang, omega),
    );
  }

  mouseDown2 = false;
}

// Toggle gravity between balls
function toggleGravity() {
  physicsScene.gravityEnabled = !physicsScene.gravityEnabled;
  var button = document.querySelector('button[onclick="toggleGravity()"]');
  if (physicsScene.gravityEnabled) {
    button.textContent = window.getTranslatedText
      ? window.getTranslatedText("取消重力")
      : "取消重力";
  } else {
    button.textContent = window.getTranslatedText
      ? window.getTranslatedText("开启重力")
      : "开启重力";
  }
}

function toggleBilliards() {
  physicsScene.billiardsClickCount++;

  if (physicsScene.billiardsClickCount % 2 === 1) {
    // Single click: enable billiards mode with random wallpaper
    physicsScene.billiardsMode = true;

    // Select random wallpaper, excluding previous one
    let availableWallpapers = physicsScene.wallpaperImages.filter(
      (img) => img !== physicsScene.previousWallpaper,
    );

    if (availableWallpapers.length === 0) {
      // All wallpapers used, reset previous
      physicsScene.previousWallpaper = null;
      availableWallpapers = physicsScene.wallpaperImages;
    }

    const randomIndex = Math.floor(Math.random() * availableWallpapers.length);
    physicsScene.currentWallpaper = availableWallpapers[randomIndex];

    // Load the wallpaper image
    physicsScene.wallpaperImage.src = physicsScene.currentWallpaper;

    // Set initial offset to 0 (will be updated when image loads)
    physicsScene.wallpaperOffset.x = 0;
    physicsScene.wallpaperOffset.y = 0;

    // Update offset when image loads
    physicsScene.wallpaperImage.onload = function () {
      const { w, h } = config.images.wallpaperSourceSize;
      const maxOffsetX = Math.max(0, physicsScene.wallpaperImage.width - w);
      const maxOffsetY = Math.max(0, physicsScene.wallpaperImage.height - h);
      physicsScene.wallpaperOffset.x = Math.random() * maxOffsetX;
      physicsScene.wallpaperOffset.y = Math.random() * maxOffsetY;
    };

    // Update button text
    var button = document.querySelector('button[onclick="toggleBilliards()"]');
    button.textContent = window.getTranslatedText
      ? window.getTranslatedText("不要壁纸")
      : "不要壁纸";
  } else {
    // Double click: disable billiards mode
    physicsScene.billiardsMode = false;
    physicsScene.previousWallpaper = physicsScene.currentWallpaper;
    physicsScene.currentWallpaper = null;

    // Update button text
    var button = document.querySelector('button[onclick="toggleBilliards()"]');
    button.textContent = window.getTranslatedText
      ? window.getTranslatedText("来张壁纸")
      : "来张壁纸";
  }
}

// 星际台球模式
function toggleStarBilliards() {
  physicsScene.starBilliardsMode = !physicsScene.starBilliardsMode;
  var button = document.getElementById("starBilliardsBtn");
  var gravityBtn = document.getElementById("gravityBtn");
  var billiardsBtn = document.getElementById("billiardsBtn");

  if (physicsScene.starBilliardsMode) {
    // 进入星际台球模式
    button.textContent = "退出星际";
    // 锁住取消重力和试下壁纸按钮
    gravityBtn.disabled = true;
    gravityBtn.style.opacity = "0.5";
    gravityBtn.style.cursor = "not-allowed";
    billiardsBtn.disabled = true;
    billiardsBtn.style.opacity = "0.5";
    billiardsBtn.style.cursor = "not-allowed";
    // 设置6个点位
    setupPockets();
    // 移除地球球（索引0），只保留月球和拖拽球
    setupStarBalls();
  } else {
    // 退出星际台球模式
    button.textContent = "星际台球";
    // 解锁按钮
    gravityBtn.disabled = false;
    gravityBtn.style.opacity = "1";
    gravityBtn.style.cursor = "pointer";
    billiardsBtn.disabled = false;
    billiardsBtn.style.opacity = "1";
    billiardsBtn.style.cursor = "pointer";
    // 恢复原始球
    setupSceneGravity();
  }
}

// 设置6个点位（4个角 + 2个长边中间），随机分配星球
function setupPockets() {
  const { pocketMargin, pocketRadius, pocketSideOffset } = config.starBilliards;
  const w = simWidth2;
  const h = simHeight2;
  
  // 随机分配星球到6个口袋
  const planets = [...config.starBilliards.planets];
  shuffleArray(planets);
  
  const pocketPositions = [
    { x: pocketMargin, y: pocketMargin },                    // 左上角
    { x: w - pocketMargin, y: pocketMargin },                // 右上角
    { x: pocketMargin, y: h - pocketMargin },                // 左下角
    { x: w - pocketMargin, y: h - pocketMargin },            // 右下角
    { x: w / 2, y: pocketMargin - pocketSideOffset },         // 上边中间
    { x: w / 2, y: h - pocketMargin + pocketSideOffset },     // 下边中间
  ];
  
  physicsScene.pockets = pocketPositions.map((pos, i) => ({
    x: pos.x,
    y: pos.y,
    r: pocketRadius,
    triggerR: config.starBilliards.pocketTriggerRadius,
    planet: planets[i],
    active: false,
  }));
  
  // 默认地球口袋激活，并加载地球壁纸
  const earthPlanet = config.starBilliards.planets.find(p => p.name === "earth");
  const earthPocketIndex = physicsScene.pockets.findIndex(p => p.planet.name === "earth");
  
  if (earthPocketIndex !== -1) {
    physicsScene.pockets[earthPocketIndex].active = true;
  }
  
  // 加载地球壁纸
  if (earthPlanet) {
    const earthImg = config.starBilliards.planetImagePath + earthPlanet.name + ".png";
    loadPlanetWallpaper(earthImg);
  }
}

// 数组随机洗牌
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 初始化空间网格
function initSpatialGrid() {
  const { cellSize } = physicsScene;
  physicsScene.gridCols = Math.ceil(simWidth2 / cellSize);
  physicsScene.gridRows = Math.ceil(simHeight2 / cellSize);
  physicsScene.spatialGrid = new Array(physicsScene.gridCols * physicsScene.gridRows);
  for (let i = 0; i < physicsScene.spatialGrid.length; i++) {
    physicsScene.spatialGrid[i] = [];
  }
}

// 更新空间网格
function updateSpatialGrid() {
  const { cellSize, gridCols, gridRows, spatialGrid } = physicsScene;
  // 清空网格
  for (let i = 0; i < spatialGrid.length; i++) {
    spatialGrid[i].length = 0;
  }
  // 填充球体
  for (let i = 0; i < physicsScene.balls.length; i++) {
    const ball = physicsScene.balls[i];
    const col = Math.floor(ball.pos.x / cellSize);
    const row = Math.floor(ball.pos.y / cellSize);
    if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
      const cellIdx = row * gridCols + col;
      spatialGrid[cellIdx].push(i);
    }
  }
}

// 获取相邻网格中的所有球索引
function getNeighborBallIndices(ballIdx) {
  const { cellSize, gridCols, gridRows, spatialGrid } = physicsScene;
  const ball = physicsScene.balls[ballIdx];
  const col = Math.floor(ball.pos.x / cellSize);
  const row = Math.floor(ball.pos.y / cellSize);
  const result = [];
  
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
        const cellIdx = nr * gridCols + nc;
        const cell = spatialGrid[cellIdx];
        for (let k = 0; k < cell.length; k++) {
          if (cell[k] !== ballIdx) {
            result.push(cell[k]);
          }
        }
      }
    }
  }
  return result;
}

// 检测球与口袋碰撞
function checkPocketCollisions() {
  const { pockets, balls } = physicsScene;
  const ballsToRemove = new Set();
  const dragIdx = getDraggableBallIndex();
  
  for (let i = 0; i < balls.length; i++) {
    // 跳过 cue ball
    if (i === dragIdx) continue;
    
    const ball = balls[i];
    for (let j = 0; j < pockets.length; j++) {
      const pocket = pockets[j];
      const dx = ball.pos.x - pocket.x;
      const dy = ball.pos.y - pocket.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < pocket.triggerR) {
        // 球进入口袋
        onBallEnterPocket(i, j, pocket.planet);
        ballsToRemove.add(i);
        break;
      }
    }
  }
  
  // 移除已进球的球（从后往前，避免索引变化）
  if (ballsToRemove.size > 0) {
    const indices = [...ballsToRemove].sort((a, b) => b - a);
    for (const idx of indices) {
      balls.splice(idx, 1);
    }
    // 重新初始化空间网格
    if (physicsScene.spatialGrid) {
      initSpatialGrid();
      updateSpatialGrid();
    }
  }
}

// 球进入口袋时触发
function onBallEnterPocket(ballIdx, pocketIdx, planet) {
  const pocket = physicsScene.pockets[pocketIdx];
  
  // 设置口袋为激活状态
  pocket.active = true;
  
  // 其他口袋恢复为未激活
  for (let i = 0; i < physicsScene.pockets.length; i++) {
    if (i !== pocketIdx) {
      physicsScene.pockets[i].active = false;
    }
  }
  
  // 切换壁纸为星球图片
  const planetImg = config.starBilliards.planetImagePath + planet.name + ".png";
  loadPlanetWallpaper(planetImg);
  
  console.log(`球进入 ${planet.nameCN} 口袋！`);
}

// 加载星球壁纸
function loadPlanetWallpaper(src) {
  const img = new Image();
  img.onload = function() {
    physicsScene.currentPlanetWallpaper = img;
  };
  img.src = src;
}

// 星际台球模式的球设置
function setupStarBalls() {
  physicsScene.balls = [];
  const { cueBallX, cueBallY, triangleStartX, triangleStartY, ballSpacingRatio, pocketRadius, triangleRows } = config.starBilliards;
  
  // 主球（Cue Ball）- 拖拽球
  const cueRadius = config.canvas.simMinWidth * config.balls.radiusRatios[2];
  const cueMass = Math.PI * cueRadius * cueRadius;
  const cueInertia = (cueMass * cueRadius * cueRadius) / 2.0;
  const cuePos = new Vector2(simWidth2 * cueBallX, simHeight2 * cueBallY);
  physicsScene.balls.push(new Ball(cueRadius, cueMass, cueInertia, cuePos, new Vector2(0, 0), 0.0, 0.0));
  
  // 15个目标球 - 三角形排列
  const ballRadius = pocketRadius;
  const ballMass = Math.PI * ballRadius * ballRadius;
  const ballInertia = (ballMass * ballRadius * ballRadius) / 2.0;
  
  const startX = simWidth2 * triangleStartX;
  const startY = simHeight2 * triangleStartY;
  const spacing = ballRadius * ballSpacingRatio;
  
  // 三角形排列：第1行1个，第2行2个，...，第5行5个
  for (let row = 0; row < triangleRows; row++) {
    const ballsInRow = row + 1;
    const rowWidth = (ballsInRow - 1) * spacing;
    const rowStartX = startX + row * spacing * Math.cos(Math.PI / 6);
    const rowY = startY - row * spacing * Math.sin(Math.PI / 6);
    
    for (let col = 0; col < ballsInRow; col++) {
      const x = rowStartX;
      const y = rowY + col * spacing - rowWidth / 2;
      const pos = new Vector2(x, y);
      const vel = new Vector2(0.0, 0.0);
      physicsScene.balls.push(new Ball(ballRadius, ballMass, ballInertia, pos, vel, 0.0, 0.0));
    }
  }
  
  // 初始化空间网格
  initSpatialGrid();
  
  mouseDown2 = false;
}

// Global drag state
var mouseDown2 = false;

// 获取当前拖拽球索引
function getDraggableBallIndex() {
  return physicsScene.starBilliardsMode ? 0 : DRAGGABLE_BALL_INDEX;
}

// Functions to handle dragging for canvas2 - always drag the fixed ball
function startDrag2(x, y) {
  if (!achievementsUnlocked[6]) {
    window.unlockAchievement(7);
  }
  let bounds = canvas2.getBoundingClientRect();
  let mx = x - bounds.left - canvas2.clientLeft;
  let my = y - bounds.top - canvas2.clientTop;

  // Convert mouse coordinates to simulation coordinates
  let simX = mx / cScale2;
  let simY = (canvas2.height - my) / cScale2; // Flip Y coordinate

  // Always target the fixed draggable ball
  const ball = physicsScene.balls[getDraggableBallIndex()];

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

    // Convert mouse coordinates to simulation coordinates
    let newX = mx / cScale2;
    let newY = (canvas2.height - my) / cScale2; // Flip Y coordinate

    let ball = physicsScene.balls[getDraggableBallIndex()];

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

// Preload wallpaper images
physicsScene.wallpaperImages.forEach((src) => {
  const img = new Image();
  img.src = src;
});

// Load images for the balls
var bunImage = new Image();
bunImage.src = config.images.balls.bun;

var earthImage = new Image();
earthImage.src = config.images.balls.earth;

var moonImage = new Image();
moonImage.src = config.images.balls.moon;

function drawGravity() {
  // Clear canvas
  c.clearRect(0, 0, canvas2.width, canvas2.height);

  // 决定使用哪个壁纸
  let wallpaperToDraw = null;
  let useBilliardsWallpaper = false;
  
  if (physicsScene.starBilliardsMode && physicsScene.currentPlanetWallpaper && physicsScene.currentPlanetWallpaper.complete) {
    // 星际模式：使用星球壁纸
    wallpaperToDraw = physicsScene.currentPlanetWallpaper;
  } else if (physicsScene.billiardsMode && physicsScene.currentWallpaper && physicsScene.wallpaperImage.complete) {
    // 普通模式：使用普通壁纸
    wallpaperToDraw = physicsScene.wallpaperImage;
    useBilliardsWallpaper = true;
  }

  if (wallpaperToDraw && wallpaperToDraw.width > 0 && wallpaperToDraw.height > 0) {
    const imgW = wallpaperToDraw.width;
    const imgH = wallpaperToDraw.height;
    
    // 计算缩放比例：保持图片比例，使canvas完全被覆盖
    const scale = Math.max(canvas2.width / imgW, canvas2.height / imgH);
    const displayW = imgW * scale;
    const displayH = imgH * scale;
    const offsetX = (canvas2.width - displayW) / 2;
    const offsetY = (canvas2.height - displayH) / 2;
    
    c.drawImage(wallpaperToDraw, offsetX, offsetY, displayW, displayH);
  } else {
    c.fillStyle = "#ffe4e1";
    c.fillRect(0, 0, canvas2.width, canvas2.height);
  }

  // 绘制星际台球模式的6个点位
  if (physicsScene.starBilliardsMode) {
    const pocketRadius = config.starBilliards.pocketRadius;
    for (var pocket of physicsScene.pockets) {
      var px = cX(new Vector2(pocket.x, 0));
      var py = cY(new Vector2(0, pocket.y));
      var pr = cScale2 * pocketRadius;
      
      // 激活的口袋显示星球颜色，未激活的显示黑色
      if (pocket.active && pocket.planet) {
        c.fillStyle = pocket.planet.color;
        c.strokeStyle = "#ffffff";
      } else {
        c.fillStyle = "#1a1a1a";
        c.strokeStyle = "#4a4a4a";
      }
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px, py, pr, 0, 2 * Math.PI);
      c.fill();
      c.stroke();
    }
  }

  c.fillStyle = "#000000";

  for (i = 0; i < physicsScene.balls.length; i++) {
    var ball = physicsScene.balls[i];
    var radius = cScale2 * ball.radius;
    var centerX = cX(ball.pos);
    var centerY = cY(ball.pos);

    // 保存当前Canvas状态
    c.save();

    // 平移到球体中心
    c.translate(centerX, centerY);

    // 旋转Canvas到球体的角度
    c.rotate(ball.ang);

    if (physicsScene.starBilliardsMode) {
      // 星际台球模式：主球(索引0)和所有目标球(索引1-15)都使用bun_white
      if (bunImage.complete) {
        c.drawImage(bunImage, -radius, -radius, radius * 2, radius * 2);
      } else {
        c.beginPath();
        c.arc(0, 0, radius, 0.0, 2.0 * Math.PI);
        c.closePath();
        c.fill();
      }
    } else {
      // 普通模式
      if (i === 0 && earthImage.complete) {
        c.drawImage(earthImage, -radius, -radius, radius * 2, radius * 2);
      } else if (i === 1 && moonImage.complete) {
        c.drawImage(moonImage, -radius, -radius, radius * 2, radius * 2);
      } else if (i === DRAGGABLE_BALL_INDEX && bunImage.complete) {
        c.drawImage(bunImage, -radius, -radius, radius * 2, radius * 2);
      } else {
        c.beginPath();
        c.arc(0, 0, radius, 0.0, 2.0 * Math.PI);
        c.closePath();
        c.fill();
      }
    }

    // 恢复Canvas状态
    c.restore();
  }
}

// collision handling -------------------------------------------------------

function handleBallCollision(ball1, ball2, restitution) {
  var ballBallSoundAdjustment = physicsScene.ballBallSoundAdjustment;
  var dir = new Vector2();
  dir.subtractVectors(ball2.pos, ball1.pos);
  var d = dir.length();
  if (d == 0.0 || d > ball1.radius + ball2.radius) return;

  dir.scale(1.0 / d);

  var corr = (ball1.radius + ball2.radius - d) / 2.0;
  ball1.pos.add(dir, -corr);
  ball2.pos.add(dir, corr);

  // 计算碰撞点
  var contactPoint1 = new Vector2();
  contactPoint1.addVectors(ball1.pos, dir, ball1.radius);
  var contactPoint2 = new Vector2();
  contactPoint2.subtractVectors(ball2.pos, dir, ball2.radius);

  // 计算碰撞点的速度
  var vel1 = new Vector2();
  var vel2 = new Vector2();
  var tangent1 = new Vector2(-dir.y, dir.x); // 切向方向
  var tangent2 = new Vector2(-tangent1.x, -tangent1.y);

  // 球体1碰撞点的速度（平动+转动）
  var r1 = new Vector2();
  r1.subtractVectors(contactPoint1, ball1.pos);
  var rotVel1 = new Vector2(ball1.omega * r1.y, -ball1.omega * r1.x);
  vel1.addVectors(ball1.vel, rotVel1);

  // 球体2碰撞点的速度（平动+转动）
  var r2 = new Vector2();
  r2.subtractVectors(contactPoint2, ball2.pos);
  var rotVel2 = new Vector2(ball2.omega * r2.y, -ball2.omega * r2.x);
  vel2.addVectors(ball2.vel, rotVel2);

  // 相对速度
  var relVel = new Vector2();
  relVel.subtractVectors(vel2, vel1);

  // 分解为法向和切向分量
  var normalVel = relVel.dot(dir);
  var tangentVel = relVel.dot(tangent1);

  // 计算法向冲量
  var m1 = ball1.mass;
  var m2 = ball2.mass;
  var invMass1 = 1.0 / m1;
  var invMass2 = 1.0 / m2;
  var invInertia1 = 2.0 / (m1 * ball1.radius * ball1.radius); // 球体的转动惯量
  var invInertia2 = 2.0 / (m2 * ball2.radius * ball2.radius);

  // 计算法向冲量
  var impulseNormal =
    (-(1 + restitution) * normalVel) /
    (invMass1 +
      invMass2 +
      invInertia1 * ball1.radius * ball1.radius +
      invInertia2 * ball2.radius * ball2.radius);

  // 应用法向冲量
  ball1.vel.add(dir, -impulseNormal * invMass1);
  ball2.vel.add(dir, impulseNormal * invMass2);

  // 计算切向冲量（摩擦力）
  var friction = config.collision.ballBallFriction;
  if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
    var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);

    // 应用切向冲量
    ball1.vel.add(tangent1, -impulseTangent * invMass1);
    ball2.vel.add(tangent1, impulseTangent * invMass2);
    ball1.omega += impulseTangent * ball1.radius * invInertia1;
    ball2.omega += impulseTangent * ball2.radius * invInertia2;
  }

  // Play ball-ball collision sound
  playBallBallSound(
    ballBallSoundAdjustment * ball1.mass * ball2.mass * normalVel,
  );
}

function handleWallCollision(ball, worldSize, restitution) {
  var friction = config.collision.ballWallFriction;
  var ballWallSoundAdjustment = physicsScene.ballWallSoundAdjustment;
  var invMass = 1.0 / ball.mass;
  var invInertia = 2.0 / (ball.mass * ball.radius * ball.radius);
  var normalAdjustment = config.collision.normalAdjustment;

  // 左墙碰撞
  if (ball.pos.x < ball.radius) {
    ball.pos.x = ball.radius;

    // 计算碰撞点速度
    var contactPoint = new Vector2(0, ball.pos.y);
    var r = new Vector2();
    r.subtractVectors(contactPoint, ball.pos);
    var rotVel = new Vector2(ball.omega * r.y, -ball.omega * r.x);
    var contactVel = new Vector2();
    contactVel.addVectors(ball.vel, rotVel);

    // 法向和切向方向
    var normal = new Vector2(1, 0);
    var tangent = new Vector2(0, 1);

    // 相对速度分量
    var normalVel = contactVel.dot(normal);
    var tangentVel = contactVel.dot(tangent);

    // 法向冲量
    var impulseNormal =
      (-(1 + restitution) * normalVel) /
      (invMass + invInertia * ball.radius * ball.radius);

    // 应用法向冲量
    ball.vel.add(normal, normalAdjustment * impulseNormal * invMass);

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    // 切向冲量（摩擦力）
    if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      ball.vel.add(tangent, impulseTangent * invMass);
      ball.omega += impulseTangent * ball.radius * invInertia;
    }
  }

  // 右墙碰撞
  if (ball.pos.x > worldSize.x - ball.radius) {
    ball.pos.x = worldSize.x - ball.radius;

    var contactPoint = new Vector2(worldSize.x, ball.pos.y);
    var r = new Vector2();
    r.subtractVectors(contactPoint, ball.pos);
    var rotVel = new Vector2(ball.omega * r.y, -ball.omega * r.x);
    var contactVel = new Vector2();
    contactVel.addVectors(ball.vel, rotVel);

    var normal = new Vector2(-1, 0);
    var tangent = new Vector2(0, 1);

    var normalVel = contactVel.dot(normal);
    var tangentVel = contactVel.dot(tangent);

    var impulseNormal =
      (-(1 + restitution) * normalVel) /
      (invMass + invInertia * ball.radius * ball.radius);

    ball.vel.add(normal, normalAdjustment * impulseNormal * invMass);

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      ball.vel.add(tangent, impulseTangent * invMass);
      ball.omega -= impulseTangent * ball.radius * invInertia;
    }
  }

  // 地面碰撞
  if (ball.pos.y < ball.radius) {
    ball.pos.y = ball.radius;

    var contactPoint = new Vector2(ball.pos.x, 0);
    var r = new Vector2();
    r.subtractVectors(contactPoint, ball.pos);
    var rotVel = new Vector2(ball.omega * r.y, -ball.omega * r.x);
    var contactVel = new Vector2();
    contactVel.addVectors(ball.vel, rotVel);

    var normal = new Vector2(0, 1);
    var tangent = new Vector2(1, 0);

    var normalVel = contactVel.dot(normal);
    var tangentVel = contactVel.dot(tangent);

    var impulseNormal =
      (-(1 + restitution) * normalVel) /
      (invMass + invInertia * ball.radius * ball.radius);

    ball.vel.add(normal, normalAdjustment * impulseNormal * invMass);

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      ball.vel.add(tangent, impulseTangent * invMass);
      ball.omega -= impulseTangent * ball.radius * invInertia;
    }
  }

  // 天花板碰撞
  if (ball.pos.y > worldSize.y - ball.radius) {
    ball.pos.y = worldSize.y - ball.radius;

    var contactPoint = new Vector2(ball.pos.x, worldSize.y);
    var r = new Vector2();
    r.subtractVectors(contactPoint, ball.pos);
    var rotVel = new Vector2(ball.omega * r.y, -ball.omega * r.x);
    var contactVel = new Vector2();
    contactVel.addVectors(ball.vel, rotVel);

    var normal = new Vector2(0, -1);
    var tangent = new Vector2(1, 0);

    var normalVel = contactVel.dot(normal);
    var tangentVel = contactVel.dot(tangent);

    var impulseNormal =
      (-(1 + restitution) * normalVel) /
      (invMass + invInertia * ball.radius * ball.radius);

    ball.vel.add(normal, normalAdjustment * impulseNormal * invMass);

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      ball.vel.add(tangent, impulseTangent * invMass);
      ball.omega += impulseTangent * ball.radius * invInertia;
    }
  }
}

// simulation -------------------------------------------------------

function simulateGravity() {
  const dragIdx = getDraggableBallIndex();
  const isStarMode = physicsScene.starBilliardsMode;
  
  // 星际台球模式使用空间网格优化
  if (isStarMode && physicsScene.spatialGrid) {
    // 更新空间网格
    updateSpatialGrid();
    
    const balls = physicsScene.balls;
    const dt = physicsScene.dt;
    const gravity = physicsScene.gravity;
    const gravityEnabled = physicsScene.gravityEnabled;
    const G = physicsScene.G;
    const restitution = physicsScene.restitution;
    const minDist = config.physics.minDistance;
    
    // 第一遍：应用物理和计算引力
    for (let i = 0; i < balls.length; i++) {
      if (mouseDown2 && i === dragIdx) continue;
      
      const ball = balls[i];
      ball.simulate(dt, gravity);
      
      // 计算球间引力（仅检查邻近球）
      if (gravityEnabled) {
        const neighbors = getNeighborBallIndices(i);
        for (let j = 0; j < neighbors.length; j++) {
          const other = balls[neighbors[j]];
          const dx = other.pos.x - ball.pos.x;
          const dy = other.pos.y - ball.pos.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < minDist * minDist) continue;
          
          const dist = Math.sqrt(distSq);
          const forceMag = (G * ball.mass * other.mass) / distSq;
          const invDist = 1.0 / dist;
          ball.vel.x += dx * invDist * forceMag * dt / ball.mass;
          ball.vel.y += dy * invDist * forceMag * dt / ball.mass;
        }
      }
      
      // 口袋引力效果（球靠近口袋时被吸入）- 跳过 cue ball
      if (i !== dragIdx) {
        for (let p = 0; p < physicsScene.pockets.length; p++) {
          const pocket = physicsScene.pockets[p];
          const dx = pocket.x - ball.pos.x;
          const dy = pocket.y - ball.pos.y;
          const distSq = dx * dx + dy * dy;
          const triggerR = pocket.triggerR * 3; // 吸引范围
          
          if (distSq < triggerR * triggerR && distSq > minDist * minDist) {
            const dist = Math.sqrt(distSq);
            // 吸引力随距离减小而增大
            const attractForce = 0.5 / (dist * dist);
            const invDist = 1.0 / dist;
            ball.vel.x += dx * invDist * attractForce * dt;
            ball.vel.y += dy * invDist * attractForce * dt;
          }
        }
      }
    }
    
    // 第二遍：使用空间网格进行碰撞检测
    updateSpatialGrid();
    const processed = new Set();
    
    for (let i = 0; i < balls.length; i++) {
      const ball1 = balls[i];
      
      // 墙壁碰撞
      handleWallCollision(ball1, physicsScene.worldSize, restitution);
      
      // 球-球碰撞（仅检查邻近球）
      const neighbors = getNeighborBallIndices(i);
      for (let j = 0; j < neighbors.length; j++) {
        const idx2 = neighbors[j];
        const pairKey = i < idx2 ? i + '_' + idx2 : idx2 + '_' + i;
        
        if (processed.has(pairKey)) continue;
        processed.add(pairKey);
        
        // 跳过拖拽球的碰撞
        if (mouseDown2 && (i === dragIdx || idx2 === dragIdx)) continue;
        
        handleBallCollision(ball1, balls[idx2], restitution);
      }
    }
    
    // 检测口袋碰撞
    checkPocketCollisions();
  } else {
    // 普通模式：原始碰撞检测
    for (let i = 0; i < physicsScene.balls.length; i++) {
      if (mouseDown2 && i === dragIdx) continue;

      var ball1 = physicsScene.balls[i];
      ball1.simulate(physicsScene.dt, physicsScene.gravity);

      if (physicsScene.gravityEnabled) {
        for (let j = 0; j < physicsScene.balls.length; j++) {
          if (i === j) continue;
          var ball2 = physicsScene.balls[j];
          var dir = new Vector2();
          dir.subtractVectors(ball2.pos, ball1.pos);
          var distance = dir.length();
          if (distance < config.physics.minDistance) continue;
          var forceMagnitude = (physicsScene.G * ball1.mass * ball2.mass) / (distance * distance);
          dir.scale(forceMagnitude / distance);
          ball1.vel.add(dir, physicsScene.dt / ball1.mass);
        }
      }

      for (let j = i + 1; j < physicsScene.balls.length; j++) {
        if (mouseDown2 && (i === dragIdx || j === dragIdx)) continue;
        var ball2 = physicsScene.balls[j];
        handleBallCollision(ball1, ball2, physicsScene.restitution);
      }

      handleWallCollision(ball1, physicsScene.worldSize, physicsScene.restitution);
    }
  }
}

function updateGravity() {
  simulateGravity();
  drawGravity();
  requestAnimationFrame(updateGravity);
}

// ========== 启动台球游戏 ==========
setupSceneGravity();
updateGravity();

// ========== 导出到全局作用域 ==========
window.Vector2 = Vector2;
window.physicsScene = physicsScene;
window.setupSceneGravity = setupSceneGravity;
window.toggleGravity = toggleGravity;
window.toggleBilliards = toggleBilliards;
window.toggleSound = toggleSound;
window.toggleStarBilliards = toggleStarBilliards;
window.getDraggableBallIndex = getDraggableBallIndex;