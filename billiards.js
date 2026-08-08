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
    this.ang = ang; // 角度是标量
    this.omega = omega; // 角速度是标量
  }
  simulate(dt, gravity) {
    this.vel.add(gravity, dt);
    this.pos.add(this.vel, dt);
    this.ang += this.omega * dt; // 角度更新
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
  pockets: [], // 6个点位
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

// 设置6个点位（4个角 + 2个长边中间）
function setupPockets() {
  const margin = 0.006; // 边距（模拟坐标）
  const pocketRadius = 0.012; // 点位半径
  const w = simWidth2;
  const h = simHeight2;
  
  physicsScene.pockets = [
    // 4个角
    { x: margin, y: margin, r: pocketRadius },
    { x: w - margin, y: margin, r: pocketRadius },
    { x: margin, y: h - margin, r: pocketRadius },
    { x: w - margin, y: h - margin, r: pocketRadius },
    // 2个长边中间
    { x: w / 2, y: margin-0.004, r: pocketRadius },
    { x: w / 2, y: h - margin+0.004, r: pocketRadius },
  ];
}

// 星际台球模式的球设置（移除地球，只保留月球和拖拽球）
function setupStarBalls() {
  physicsScene.balls = [];
  
  // 月球（小球，原索引1）
  const moonRadius = config.canvas.simMinWidth * config.balls.radiusRatios[1];
  const moonMass = Math.PI * moonRadius * moonRadius;
  const moonInertia = (moonMass * moonRadius * moonRadius) / 2.0;
  const moonPos = new Vector2(simWidth2 * 0.3, simHeight2 * 0.5);
  const moonVel = new Vector2(0.0, 0.0);
  physicsScene.balls.push(new Ball(moonRadius, moonMass, moonInertia, moonPos, moonVel, 0.0, 0.0));
  
  // 拖拽球（包子，原索引2）
  const bunRadius = config.canvas.simMinWidth * config.balls.radiusRatios[2];
  const bunMass = Math.PI * bunRadius * bunRadius;
  const bunInertia = (bunMass * bunRadius * bunRadius) / 2.0;
  const bunPos = new Vector2(simWidth2 * 0.7, simHeight2 * 0.5);
  const bunVel = new Vector2(0.0, 0.0);
  physicsScene.balls.push(new Ball(bunRadius, bunMass, bunInertia, bunPos, bunVel, 0.0, 0.0));
  
  mouseDown2 = false;
}

// Global drag state
var mouseDown2 = false;

// 获取当前拖拽球索引
function getDraggableBallIndex() {
  return physicsScene.starBilliardsMode ? 1 : DRAGGABLE_BALL_INDEX;
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

  // Draw wallpaper if in billiards mode and wallpaper is loaded
  if (
    physicsScene.billiardsMode &&
    physicsScene.currentWallpaper &&
    physicsScene.wallpaperImage.complete
  ) {
    const { w: srcW, h: srcH } = config.images.wallpaperSourceSize;

    // Calculate source rectangle to ensure we don't draw outside the image
    const srcX = Math.max(0, physicsScene.wallpaperOffset.x);
    const srcY = Math.max(0, physicsScene.wallpaperOffset.y);
    const srcWidth = Math.min(srcW, physicsScene.wallpaperImage.width - srcX);
    const srcHeight = Math.min(srcH, physicsScene.wallpaperImage.height - srcY);

    // Calculate destination rectangle to fit within canvas
    const destWidth = (srcWidth / srcW) * canvas2.width;
    const destHeight = (srcHeight / srcH) * canvas2.height;
    const destX = (canvas2.width - destWidth) / 2;
    const destY = (canvas2.height - destHeight) / 2;

    c.drawImage(
      physicsScene.wallpaperImage,
      srcX,
      srcY,
      srcWidth,
      srcHeight,
      destX,
      destY,
      destWidth,
      destHeight,
    );
  } else {
    // Draw original pink background
    c.fillStyle = "#ffe4e1";
    c.fillRect(0, 0, canvas2.width, canvas2.height);
  }

  // 绘制星际台球模式的6个点位
  if (physicsScene.starBilliardsMode) {
    c.fillStyle = "#1a1a1a";
    c.strokeStyle = "#4a4a4a";
    c.lineWidth = 2;
    for (var pocket of physicsScene.pockets) {
      var px = cX(new Vector2(pocket.x, 0));
      var py = cY(new Vector2(0, pocket.y));
      var pr = cScale2 * pocket.r;
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
      // 星际台球模式：只有月球(索引0)和拖拽球(索引1)
      if (i === 0 && moonImage.complete) {
        c.drawImage(moonImage, -radius, -radius, radius * 2, radius * 2);
      } else if (i === 1 && bunImage.complete) {
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
  // Calculate gravitational forces between all pairs of balls
  const dragIdx = getDraggableBallIndex();
  for (i = 0; i < physicsScene.balls.length; i++) {
    // Skip physics simulation for the draggable ball when it's being dragged
    if (mouseDown2 && i === dragIdx) continue;

    var ball1 = physicsScene.balls[i];

    // Apply constant gravity
    ball1.simulate(physicsScene.dt, physicsScene.gravity);

    // Calculate gravitational forces from other balls
    if (physicsScene.gravityEnabled) {
      for (j = 0; j < physicsScene.balls.length; j++) {
        if (i === j) continue; // Skip self

        var ball2 = physicsScene.balls[j];

        // Calculate distance between balls
        var dir = new Vector2();
        dir.subtractVectors(ball2.pos, ball1.pos);
        var distance = dir.length();

        if (distance < config.physics.minDistance) continue;

        // Calculate gravitational force (F = G * m1 * m2 / r^2)
        var forceMagnitude =
          (physicsScene.G * ball1.mass * ball2.mass) / (distance * distance);

        // Normalize direction and apply force
        dir.scale(forceMagnitude / distance);
        ball1.vel.add(dir, physicsScene.dt / ball1.mass);
      }
    }

    // Handle collisions
    for (j = i + 1; j < physicsScene.balls.length; j++) {
      // Skip collision if either ball is the draggable ball and is currently being dragged
      if (
        mouseDown2 &&
        (i === dragIdx || j === dragIdx)
      )
        continue;

      var ball2 = physicsScene.balls[j];
      handleBallCollision(ball1, ball2, physicsScene.restitution);
    }

    handleWallCollision(
      ball1,
      physicsScene.worldSize,
      physicsScene.restitution,
    );
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