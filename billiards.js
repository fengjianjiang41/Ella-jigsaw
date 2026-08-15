// ============================================================
// 台球游戏模块 (Billiards Game Module)
// ============================================================
// 使用 BILLIARDS_CONFIG 配置文件管理物理参数
// ============================================================

const config = window.BILLIARDS_CONFIG;

// drawing -------------------------------------------------------

var canvas2 = document.getElementById("myCanvas2");
var c = canvas2.getContext("2d");

// Progress bar (DOM element outside main canvas)
var progressBarContainer = document.getElementById("progressBarContainer");
var progressBarCanvas = document.getElementById("progressBarCanvas");
var pbc = null;
if (progressBarCanvas) {
    // High-DPI support for progress bar canvas
    var dpr = window.devicePixelRatio || 1;
    var pbCssWidth = 600;
    var pbCssHeight = 28;
    progressBarCanvas.width = pbCssWidth * dpr;
    progressBarCanvas.height = pbCssHeight * dpr;
    progressBarCanvas.style.width = pbCssWidth + 'px';
    progressBarCanvas.style.height = pbCssHeight + 'px';
    pbc = progressBarCanvas.getContext("2d");
    pbc.scale(dpr, dpr);
}

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
        this.ejectProtection = 0;  // 土星吐球保护时间（秒）
    }
    simulate(dt, gravity) {
        // 衰减保护时间
        if (this.ejectProtection > 0) {
            this.ejectProtection -= dt;
        }

        // 施加重力
        this.vel.add(gravity, dt);

        // 获取当前星球模式的阻尼参数
        const damping = getCurrentDamping();

        // 平动阻力（速度随时间指数衰减）
        const linDampFactor = Math.pow(1.0 - damping.linear, dt);
        this.vel.scale(linDampFactor);

        // 位置更新
        this.pos.add(this.vel, dt);

        // 转动阻力（角速度随时间指数衰减）
        const angDampFactor = Math.pow(1.0 - damping.angular, dt);
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
    currentPlanetWallpaper: null,
    // 当前星球模式
    currentPlanet: null,  // 当前激活的星球对象
    planetMode: "normal",  // 当前星球模式
    // 木星：动量交换计时器
    jupiterSwapTimer: 0,
    // 木星：需要闪烁的球（闪烁效果）
    jupiterFlashBalls: new Set(),
    jupiterFlashTimer: 0,
    // 土星：进球历史（用于吐球）
    saturnPocketedBalls: [],  // [{ball, pocketIdx, vel, omega}]
    // 土星：吐球历史（已吐出的球位置）
    saturnEjectedBalls: new Set(),
    // 星球进度条
    planetProgressBar: {
        active: false,
        totalPlanets: 5,
        captured: [],
        inDuel: false,
        moonRadius: 0,
    },
    // 虚拟球杆系统星球进度条（粉红色条，显示已捕获的小星体）
    planetProgressBar: {
        active: false,
        totalPlanets: 5,
        captured: [],
        inDuel: false,
        moonRadius: 0,
    },
    // 虚拟球杆系统
    cueStick: {
        active: false,           // 球杆是否显示
        charging: false,         // 是否正在蓄力
        chargeAmount: 0,         // 当前蓄力距离
        mousePos: new Vector2(), // 鼠标位置（sim 坐标）
        direction: new Vector2(),// 球杆方向（从 cueball 指向鼠标）
        braking: false,          // 是否正在刹车（cueball 速度过快时按左键减速）
    },
    // 空间网格系统
    spatialGrid: null,
    cellSize: config.spatialGrid.cellSize,
    gridCols: 0,
    gridRows: 0,
    // 壁纸动画状态
    wallpaperAnim: {
        offsetX: 0,        // 当前偏移
        offsetY: 0,
        scale: 1.0,        // 当前缩放
        targetScale: 1.0,  // 目标缩放
        wanderTimer: 0,    // 漫游计时器
        wanderDirX: 0,     // 漫游方向
        wanderDirY: 0,
        bounceOffsetX: 0,  // 碰撞冲击偏移
        bounceOffsetY: 0,
        bounceDecay: 0,    // 碰撞衰减
    },
    // 对决环节状态
    duelState: {
        active: false,          // 对决是否进行中
        moonBallIdx: -1,        // 月球球索引
        victory: false,         // 是否已胜利
        victoryTimer: 0,        // 胜利后计时
        victoryPos: { x: 100, y: 100, vx: 50, vy: 30 },  // 胜利文字位置和速度
        // GIF 特效状态
        effects: {
            mockTimer: 0,          // mock 特效累计计时
            mockIntervalTimer: 0, // mock 间隔计时器
            mockList: [],         // [{pos:{x,y}, birthTime, lifetime}]
            splashList: [],       // [{pos:{x,y}, normal:{x,y}, birthTime, lifetime, size}]
            hitTimer: 0,           // hit 特效累计计时
            hitIntervalTimer: 0,  // hit 间隔计时器
            hitList: [],          // [{pos:{x,y}, dir:{x,y}, birthTime, lifetime, speed}]
            boomList: [],         // [{pos:{x,y}, birthTime, lifetime, size, alpha}]
        },
    },

};

var DRAGGABLE_BALL_INDEX = config.balls.draggableIndex;

// 壁纸冲击效果：球碰壁时壁纸反方向移动
function triggerWallpaperBounce(wallNormal, impactForce) {
    if (!physicsScene.starBilliardsMode) return;
    const anim = physicsScene.wallpaperAnim;
    const force = Math.min(Math.abs(impactForce) * 0.3, 30);  // 限制最大偏移
    // 反方向：wallNormal 是球的法向（指向墙外），壁纸朝反方向移动
    anim.bounceOffsetX -= wallNormal.x * force;
    anim.bounceOffsetY += wallNormal.y * force;
    anim.bounceDecay = 1.0;  // 启动衰减
}

// Global sound enable state
let soundEnabled = config.sound.enabled;

// Victory Earth mode background music
let victoryBgm = null;

// Moon duel phase background music
let moonSpellBgm = null;

// Small body (catch) phase background music
let catchBgm = null;

// 刹车音效（预加载，循环播放）
let brakeAudio = null;
try {
    brakeAudio = new Audio('audio/brake.mp3');
    brakeAudio.loop = true;
    brakeAudio.preload = 'auto';
    brakeAudio.volume = 0.8 * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
} catch (e) {
    brakeAudio = null;
}

// 爆炸音效（预加载）
let boomAudio = null;
try {
    boomAudio = new Audio('audio/boom.mp3');
    boomAudio.preload = 'auto';
} catch (e) {
    boomAudio = null;
}


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

// Audio pool for cue stick hit sounds
const cueAudioPool = {
    audioObjects: [],
    maxPoolSize: config.audioPools.cueHit.maxSize,

    getAudio() {
        for (let audio of this.audioObjects) {
            if (audio.ended || audio.currentTime === 0) {
                return audio;
            }
        }
        if (this.audioObjects.length < this.maxPoolSize) {
            const newAudio = new Audio(config.audioPools.cueHit.src);
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

function toggleSound() {
    soundEnabled = !soundEnabled;
    // 同步刹车音效：关闭总开关时立即停止
    if (!soundEnabled && brakeAudio) {
        brakeAudio.pause();
        brakeAudio.currentTime = 0;
    }
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
        ballwallAudio.volume = config.sound.ballWallFinalAdjustment * volume * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
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
        ballballAudio.volume = volume * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
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
    ballglassAudio.volume = volume * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
    const pitchRandom = pitchRandomMin + Math.random() * (pitchRandomMax - pitchRandomMin);
    ballglassAudio.pitch = pitchRandom * ballglassAudio.pitch;
    ballglassAudio.playbackRate = pitchRandom;
    ballglassAudio.play().catch((e) => console.log("Audio play failed:", e));
}

// 月球对决音效播放
let laughTimer = 0;
let laughNextInterval = 3 + Math.random() * 3; // 3~6 秒后首次播放

function playLaughSound(moonRadius) {
    if (!soundEnabled) return;
    const maxRadius = canvas2.height / 2;
    const moonRadiusPx = moonRadius * cScale2;
    const ratio = Math.min(moonRadiusPx / maxRadius, 1.0);
    const volume = Math.min(ratio * ratio, 1.0) * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
    const laughAudio = new Audio('audio/laugh.mp3');
    laughAudio.volume = volume;
    laughAudio.play().catch(e => console.log('Laugh play blocked:', e));
}

function playSmallCrySound(moonRadius) {
    if (!soundEnabled) return;
    const idx = Math.floor(Math.random() * 3) + 1;
    const cryAudio = new Audio('audio/smallcry' + idx + '.mp3');
    // 音量正比于月球半径平方（与 laugh 一致）
    const maxRadius = canvas2.height / 2;
    const moonRadiusPx = moonRadius * cScale2;
    const ratio = Math.min(moonRadiusPx / maxRadius, 1.0);
    const volume = Math.min(ratio * ratio, 1.0) * 0.7 * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
    cryAudio.volume = volume;
    cryAudio.play().catch(e => console.log('Small cry play blocked:', e));
}

function playBigCrySound() {
    if (!soundEnabled) return;
    const cryAudio = new Audio('audio/bigcry.mp3');
    cryAudio.volume = 0.8 * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
    cryAudio.play().catch(e => console.log('Big cry play blocked:', e));
}

// 统一管理刹车状态与音效
function setBrakeState(active) {
    const stick = physicsScene.cueStick;
    if (active) {
        if (!stick.braking) {
            stick.braking = true;
            if (soundEnabled && brakeAudio) {
                brakeAudio.currentTime = 0;
                brakeAudio.volume = 0.8 * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
                brakeAudio.play().catch(e => console.log('Brake audio play blocked:', e));
            }
        }
    } else {
        if (stick.braking) {
            stick.braking = false;
            if (brakeAudio) {
                brakeAudio.pause();
                brakeAudio.currentTime = 0;
            }
        }
    }
}


function setupSceneGravity() {
    if (physicsScene.starBilliardsMode) {
        // Full reset of star billiards progress (for reset button)
        if (victoryBgm) {
            victoryBgm.pause();
            victoryBgm.currentTime = 0;
        }
        // Stop moon spell BGM
        if (moonSpellBgm) {
            moonSpellBgm.pause();
            moonSpellBgm.currentTime = 0;
        }

        const ds = physicsScene.duelState;
        ds.victory = false;
        ds.active = false;
        ds.moonBallIdx = -1;
        ds.victoryTimer = 0;
        ds.crawlCanvas = undefined;
        // 清理月球特效 DOM
        _cleanupEffectsDom();
        // 重置 GIF 特效状态
        ds.effects = {
            mockTimer: 0,
            mockIntervalTimer: 0,
            mockList: [],
            splashList: [],
            hitTimer: 0,
            hitIntervalTimer: 0,
            hitList: [],
            boomList: [],
        };
        laughTimer = 0;
        laughNextInterval = 3 + Math.random() * 3;

        // Reset pockets
        for (let i = 0; i < physicsScene.pockets.length; i++) {
            physicsScene.pockets[i].active = false;
            physicsScene.pockets[i].isWhite = false;
            physicsScene.pockets[i].planet = null;
        }
        // Reset physics state
        physicsScene.currentPlanet = null;
        physicsScene.planetMode = "normal";
        config.planetPhysics.currentPlanet = null;
        // Reset saturn state
        physicsScene.saturnPocketedBalls = [];
        physicsScene.saturnEjectedBalls.clear();
        // Reset progress bar
        if (physicsScene.planetProgressBar) {
            physicsScene.planetProgressBar.captured = [];
            physicsScene.planetProgressBar.inDuel = false;
            physicsScene.planetProgressBar.moonRadius = 0;
        }
        // Re-setup everything from scratch
        setupPockets();
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
        // 进入星际台球模式 —— 完全重置进度以支持从头开始
        // Stop victory BGM
        if (victoryBgm) {
            victoryBgm.pause();
            victoryBgm.currentTime = 0;
        }
        // Stop moon spell BGM
        if (moonSpellBgm) {
            moonSpellBgm.pause();
            moonSpellBgm.currentTime = 0;
        }
        // Stop catch BGM (will be restarted by setupPockets)
        if (catchBgm) {
            catchBgm.pause();
            catchBgm.currentTime = 0;
        }

        // Reset duel state (moon battle + victory)
        const ds = physicsScene.duelState;
        ds.victory = false;
        ds.active = false;
        ds.moonBallIdx = -1;
        ds.victoryTimer = 0;
        ds.crawlCanvas = undefined;
        // 重置 GIF 特效状态
        ds.effects = {
            mockTimer: 0,
            mockIntervalTimer: 0,
            mockList: [],
            splashList: [],
            hitTimer: 0,
            hitIntervalTimer: 0,
            hitList: [],
            boomList: [],
        };
        laughTimer = 0;
        laughNextInterval = 3 + Math.random() * 3;

        // Reset pockets (remove white, planet assignments)
        for (let i = 0; i < physicsScene.pockets.length; i++) {
            physicsScene.pockets[i].active = false;
            physicsScene.pockets[i].isWhite = false;
            physicsScene.pockets[i].planet = null;
        }
        // Reset physics state
        physicsScene.currentPlanet = null;
        physicsScene.planetMode = "normal";
        config.planetPhysics.currentPlanet = null;
        // Reset saturn state
        physicsScene.saturnPocketedBalls = [];
        physicsScene.saturnEjectedBalls.clear();
        // Reset progress bar (hide on exit)
        if (progressBarContainer) {
            progressBarContainer.style.display = 'none';
        }
        physicsScene.planetProgressBar = { active: false, totalPlanets: 5, captured: [], inDuel: false, moonRadius: 0 };

        // Update button text
        button.textContent = window.getTranslatedText
            ? window.getTranslatedText("退出星际")
            : "退出星际";
        // Lock gravity and billiards buttons
        gravityBtn.disabled = true;
        gravityBtn.style.opacity = "0.5";
        gravityBtn.style.cursor = "not-allowed";
        billiardsBtn.disabled = true;
        billiardsBtn.style.opacity = "0.5";
        billiardsBtn.style.cursor = "not-allowed";
        // 在星际台球按钮左侧添加帮助图标
        _createHelpIcon();
        // Set up fresh pockets + balls
        setupPockets();
        setupStarBalls();
    } else {
        // 退出星际台球模式
        button.textContent = window.getTranslatedText
            ? window.getTranslatedText("星际台球")
            : "星际台球";
        // Stop victory BGM if playing
        if (victoryBgm) {
            victoryBgm.pause();
            victoryBgm.currentTime = 0;
        }
        if (moonSpellBgm) {
            moonSpellBgm.pause();
            moonSpellBgm.currentTime = 0;
        }
        if (catchBgm) {
            catchBgm.pause();
            catchBgm.currentTime = 0;
        }

        // Reset victory state
        physicsScene.duelState.victory = false;
        // 隐藏星球进度条
        if (physicsScene.planetProgressBar) {
            physicsScene.planetProgressBar.active = false;
        }
        if (progressBarContainer) {
            progressBarContainer.style.display = 'none';
        }
        // 解锁按钮
        gravityBtn.disabled = false;
        gravityBtn.style.opacity = "1";
        gravityBtn.style.cursor = "pointer";
        billiardsBtn.disabled = false;
        billiardsBtn.style.opacity = "1";
        billiardsBtn.style.cursor = "pointer";
        // 恢复原始球
        setupSceneGravity();
        // 移除帮助图标
        _removeHelpIcon();
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
        ripples: [],       // 涟漪动画 [{radius, alpha, speed}]
        rippleTimer: 0,    // 涟漪生成计时
    }));

    // 初始化星球进度条
    const nonEarthPlanets = config.starBilliards.planets.filter(p => p.name !== "earth");
    physicsScene.planetProgressBar = {
        active: true,
        totalPlanets: nonEarthPlanets.length,
        captured: [],
        inDuel: false,
        moonRadius: 0,
    };

    // 启动小星体环节 BGM (catch.mp3 loop)
    if (!catchBgm) {
        catchBgm = new Audio('audio/catch.mp3');
        catchBgm.loop = true;
        catchBgm.volume = typeof globalBgmVolume !== 'undefined' ? globalBgmVolume : 0.8;
    }
    catchBgm.currentTime = 0;
    const catchPromise = catchBgm.play();
    if (catchPromise !== undefined) {
        catchPromise.catch(err => console.log('Catch BGM play blocked:', err));
    }

    // Show the progress bar container
    if (progressBarContainer) {
        progressBarContainer.style.display = 'block';
    }

    // 默认地球口袋激活，并加载地球壁纸和物理
    const earthPlanet = config.starBilliards.planets.find(p => p.name === "earth");
    const earthPocketIndex = physicsScene.pockets.findIndex(p => p.planet.name === "earth");

    if (earthPocketIndex !== -1) {
        physicsScene.pockets[earthPocketIndex].active = true;
    }

    // 加载地球壁纸
    if (earthPlanet) {
        const earthImg = config.starBilliards.planetImagePath + earthPlanet.name + ".png";
        loadPlanetWallpaper(earthImg);
        // 应用地球物理参数
        applyPlanetPhysics(earthPlanet);
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

// 根据游戏阶段动态更新口袋触发半径和涟漪动画
function updatePocketTriggersAndRipples(dt) {
    if (!physicsScene.starBilliardsMode) return;

    const { pockets, planetProgressBar, duelState } = physicsScene;
    const isSmallBodyPhase = planetProgressBar && planetProgressBar.active && !duelState.active && !duelState.victory;
    const isDuelPhase = duelState.active && !duelState.victory;
    const showRipples = isSmallBodyPhase || isDuelPhase;

    // 小星体阶段：每捕获一个小星体，非土星口袋triggerR增加0.001，上限0.025
    let capturedCount = 0;
    if (isSmallBodyPhase && planetProgressBar) {
        capturedCount = planetProgressBar.captured.length;
    }
    const dynamicR = Math.min(0.015 + capturedCount * 0.001, 0.03);

    for (let i = 0; i < pockets.length; i++) {
        const pocket = pockets[i];
        const isSaturn = pocket.planet && pocket.planet.name === "saturn";

        // 更新triggerR
        if (isSaturn || !isSmallBodyPhase) {
            pocket.triggerR = config.starBilliards.pocketTriggerRadius; // 0.01
        } else {
            pocket.triggerR = dynamicR;
        }

        // 涟漪动画：每0.5秒生成一个，从triggerR半径收缩到0
        if (showRipples) {
            pocket.rippleTimer += dt;
            if (pocket.rippleTimer >= 0.5) {
                pocket.rippleTimer -= 0.5;
                pocket.ripples.push({
                    radius: pocket.triggerR,  // 起始半径为当前triggerR
                    alpha: 1.0,
                    speed: pocket.triggerR * 4,  // 0.5秒内收缩到0
                });
            }
            // 更新现有涟漪
            for (let r = pocket.ripples.length - 1; r >= 0; r--) {
                const rip = pocket.ripples[r];
                rip.radius -= rip.speed * dt;
                rip.alpha -= 2 * dt;  // 1秒内淡出
                if (rip.alpha <= 0 || rip.radius <= 0) {
                    pocket.ripples.splice(r, 1);
                }
            }
        } else {
            // 非显示阶段：清空涟漪
            pocket.ripples = [];
            pocket.rippleTimer = 0;
        }
    }
}

// 检测球与口袋碰撞
function checkPocketCollisions() {
    const { pockets, balls } = physicsScene;
    const ballsToRemove = new Set();
    const dragIdx = getDraggableBallIndex();

    for (let i = 0; i < balls.length; i++) {
        // 跳过 cue ball 和保护中的球
        if (i === dragIdx) continue;
        // 胜利后：不检测球进袋（取消所有口袋触发机制）
        if (physicsScene.duelState.victory) continue;
        if (balls[i].ejectProtection > 0) continue;


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

    // ========== 新增：月球进入口袋 -> 胜利（必须在移除球之前检测）==========
    for (let i = 0; i < balls.length; i++) {
        if (!balls[i].isMoon) continue;
        if (balls[i].ejectProtection > 0) continue;
        for (let j = 0; j < pockets.length; j++) {
            const pocket = pockets[j];
            const dx = balls[i].pos.x - pocket.x;
            const dy = balls[i].pos.y - pocket.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < pocket.triggerR) {
                playBigCrySound();
                triggerVictory();
                return;
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


    // 检测是否进入对决环节
    if (physicsScene.starBilliardsMode && !physicsScene.duelState.active && !physicsScene.duelState.victory) {
        // 从索引1开始统计（跳过cueball），排除月球
        let smallBallCount = 0;
        for (let idx = 1; idx < physicsScene.balls.length; idx++) {
            const b = physicsScene.balls[idx];
            if (!b.isMoon) {
                smallBallCount++;
            }
        }
        if (smallBallCount === 0) {
            console.log("=== 进入对决环节 ===");
            startDuelPhase();
        }
    }
}

// 球进入口袋时触发
function onBallEnterPocket(ballIdx, pocketIdx, planet) {
    // 胜利后：取消所有口袋触发机制，保持地球物理
    if (physicsScene.duelState.victory) {
        const earthPlanet = config.starBilliards.planets.find(p => p.name === "earth");
        if (earthPlanet) {
            applyPlanetPhysics(earthPlanet);
        }
        return;
    }

    const pocket = physicsScene.pockets[pocketIdx];
    const ball = physicsScene.balls[ballIdx];

    // 记录进球历史（所有模式都记录，用于土星吐球）

    if (ball && ballIdx !== 0) {  // 不记录cueball
        physicsScene.saturnPocketedBalls.push({
            ball: {
                radius: ball.radius,
                mass: ball.mass,
                inertia: ball.inertia,
                ang: ball.ang,
            },
            pocket: { x: pocket.x, y: pocket.y },
            vel: { x: ball.vel.x, y: ball.vel.y },
            omega: ball.omega,
            pocketIdx: pocketIdx,
        });

        // 添加卫星图到进度条（非地球、非月球的小星体）
        if (!ball.isMoon && planet && planet.name !== "earth" && physicsScene.planetProgressBar) {
            const dx = pocket.x - ball.pos.x;
            const dy = pocket.y - ball.pos.y;
            const angle = Math.atan2(dy, dx);
            physicsScene.planetProgressBar.captured.push({
                planetName: planet.name,
                angle: angle,
                image: satelliteImage,  // 使用 satellite.png
            });
        }
    }

    // 设置口袋为激活状态
    pocket.active = true;

    // 其他口袋恢复为未激活
    for (let i = 0; i < physicsScene.pockets.length; i++) {
        if (i !== pocketIdx) {
            physicsScene.pockets[i].active = false;
        }
    }

    // 对决环节强制使用地球物理和壁纸（无论进入哪个口袋）
    if (physicsScene.duelState.active) {
        const earthPlanet = config.starBilliards.planets.find(p => p.name === "earth");
        if (earthPlanet) {
            applyPlanetPhysics(earthPlanet);
            const earthImg = config.starBilliards.planetImagePath + earthPlanet.name + ".png";
            loadPlanetWallpaper(earthImg);
        }
        console.log(`对决环节：球进入 ${planet.nameCN} 口袋，但物理强制保持地球模式`);
    } else {
        // 切换壁纸为星球图片
        const planetImg = config.starBilliards.planetImagePath + planet.name + ".png";
        loadPlanetWallpaper(planetImg);

        // 切换物理模式
        applyPlanetPhysics(planet);

        console.log(`球进入 ${planet.nameCN} 口袋！物理模式已切换`);
    }
}

// 应用星球物理参数
function applyPlanetPhysics(planet) {
    const multipliers = planet.physicsMultipliers;

    // 计算星球模式下的物理参数
    config.planetPhysics.currentPlanet = planet.name;
    config.planetPhysics.linearDamping = config.physics.linearDamping * multipliers.linearDamping;
    config.planetPhysics.angularDamping = config.physics.angularDamping * multipliers.angularDamping;
    config.planetPhysics.gravity = config.physics.G * multipliers.gravity;
    config.planetPhysics.restitution = config.physics.restitution * multipliers.restitution;

    // 更新 physicsScene
    physicsScene.G = config.planetPhysics.gravity;
    physicsScene.restitution = config.planetPhysics.restitution;

    // 设置星球模式
    physicsScene.currentPlanet = planet;
    physicsScene.planetMode = planet.mode || "normal";

    // 重置木星状态
    physicsScene.jupiterSwapTimer = 0;
    physicsScene.jupiterFlashBalls.clear();

    console.log(`切换到 ${planet.nameCN} 模式: ${planet.mode}`);
}

// 加载星球壁纸
function loadPlanetWallpaper(src) {
    const img = new Image();
    img.onload = function () {
        physicsScene.currentPlanetWallpaper = img;
    };
    img.src = src;
}

// 获取当前星球模式的阻尼参数
function getCurrentDamping() {
    return {
        linear: config.planetPhysics.linearDamping,
        angular: config.planetPhysics.angularDamping,
    };
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
    physicsScene.balls[0].isCueball = true;  // 标记 cueball

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

    // 更新进度条的总槽位数量为实际目标球数（不含cueball）
    if (physicsScene.planetProgressBar && physicsScene.planetProgressBar.active) {
        physicsScene.planetProgressBar.totalPlanets = physicsScene.balls.length - 1;
    }

    mouseDown2 = false;
}

// Global state
var mouseDown2 = false;
var mouseInCanvas = false;
var lastMousePos = new Vector2();

// 获取当前拖拽球索引
function getDraggableBallIndex() {
    return physicsScene.starBilliardsMode ? 0 : DRAGGABLE_BALL_INDEX;
}

// 屏幕坐标转模拟坐标
function screenToSim(x, y) {
    let bounds = canvas2.getBoundingClientRect();
    let mx = x - bounds.left - canvas2.clientLeft;
    let my = y - bounds.top - canvas2.clientTop;
    return new Vector2(mx / cScale2, (canvas2.height - my) / cScale2);
}

// 获取 cueball 速度
function getCueBallSpeed() {
    const ball = physicsScene.balls[0];
    if (!ball) return Infinity;
    return Math.sqrt(ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y);
}

// 检查鼠标是否在交互范围内
function isMouseInCueBallRange(mousePos) {
    const ball = physicsScene.balls[0];
    if (!ball) return false;
    const dx = mousePos.x - ball.pos.x;
    const dy = mousePos.y - ball.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < config.cueStick.interactRadius;
}

// 更新球杆状态
function updateCueStick(mousePos) {
    const ball = physicsScene.balls[0];
    if (!ball) return;

    const speed = getCueBallSpeed();
    const canInteract = speed < config.cueStick.idleSpeedThreshold;
    const inRange = isMouseInCueBallRange(mousePos);

    const stick = physicsScene.cueStick;

    if (!canInteract || !inRange) {
        // 不能交互或超出范围
        if (stick.charging) {
            // 松开前离开范围，取消击打
            cancelCueStick();
        } else {
            stick.active = false;
            stick.charging = false;
            stick.chargeAmount = 0;
        }
        return;
    }

    // 可以交互
    stick.active = true;
    stick.mousePos = mousePos.clone();

    // 计算方向：从 cueball 指向鼠标
    const dx = mousePos.x - ball.pos.x;
    const dy = mousePos.y - ball.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.0001) {
        stick.direction = new Vector2(dx / dist, dy / dist);
    }

    // 正在蓄力：基于鼠标距离 cueball 的远近来决定蓄力量
    if (stick.charging) {
        const mouseDist = dist;  // 鼠标到 cueball 的距离
        const chargeDist = Math.max(0, mouseDist - ball.radius * 2);
        stick.chargeAmount = Math.min(chargeDist, config.cueStick.maxChargeDistance);
    }
}

// 开始蓄力
function startCueCharge(mousePos) {
    const ball = physicsScene.balls[0];
    if (!ball) return false;

    const speed = getCueBallSpeed();
    if (speed >= config.cueStick.idleSpeedThreshold) return false;
    if (!isMouseInCueBallRange(mousePos)) return false;

    const stick = physicsScene.cueStick;
    stick.active = true;
    stick.charging = true;
    stick.chargeAmount = 0;
    stick.mousePos = mousePos.clone();

    // 计算方向
    const dx = ball.pos.x - mousePos.x;
    const dy = ball.pos.y - mousePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.0001) {
        stick.direction = new Vector2(dx / dist, dy / dist);
    }

    return true;
}

// 释放击打
function releaseCueStick() {
    const stick = physicsScene.cueStick;
    const ball = physicsScene.balls[0];

    if (!stick.charging || !ball) {
        cancelCueStick();
        return;
    }

    // 计算击打速度
    const power = config.cueStick.hitPower;
    const speed = stick.chargeAmount * power;

    // 施加沿方向的速度
    ball.vel.x -= stick.direction.x * speed;
    ball.vel.y -= stick.direction.y * speed;

    // 播放音效：cue.mp3 和 ballball.mp3
    if (soundEnabled) {
        const volume = Math.min(stick.chargeAmount / config.cueStick.maxChargeDistance, 1.0);

        // 播放 cue 音效
        const cueAudio = cueAudioPool.getAudio();
        cueAudio.currentTime = 0;
        cueAudio.volume = volume * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0) * 0.8;
        cueAudio.play().catch((e) => console.log("Cue audio play failed:", e));

        // 播放 ballball 音效
        const ballballAudio = ballBallAudioPool.getAudio();
        ballballAudio.currentTime = 0;
        ballballAudio.volume = volume * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
        ballballAudio.play().catch((e) => console.log("Ballball audio play failed:", e));
    }

    // 重置球杆状态
    stick.active = false;
    stick.charging = false;
    stick.chargeAmount = 0;

    // 触发进度条上所有小星体的衰减震荡
    const pb = physicsScene.planetProgressBar;
    if (pb && pb.captured.length > 0) {
        const now = performance.now();
        for (let i = 0; i < pb.captured.length; i++) {
            const entry = pb.captured[i];
            // 每个星体独立的震荡参数
            entry.oscStart = now;
            entry.oscDecay = 0.015 + Math.random() * 0.025;  // 衰减率 0.015~0.04
            entry.oscFreq = 0.015 + Math.random() * 0.02;     // 频率 0.015~0.03
            entry.oscAmp = 3 + Math.random() * 4;            // 初始振幅 3~7 像素
            entry.oscPhaseX = Math.random() * Math.PI * 2;   // X轴相位
            entry.oscPhaseY = Math.random() * Math.PI * 2;   // Y轴相位
        }
    }

    console.log(`击打！速度: ${speed.toFixed(3)}`);
}

// 取消球杆
function cancelCueStick() {
    const stick = physicsScene.cueStick;
    stick.active = false;
    stick.charging = false;
    stick.chargeAmount = 0;
    setBrakeState(false);
}

// 屏幕坐标转模拟坐标的辅助函数
function toSimCoords(clientX, clientY) {
    let bounds = canvas2.getBoundingClientRect();
    let mx = clientX - bounds.left - canvas2.clientLeft;
    let my = clientY - bounds.top - canvas2.clientTop;
    return new Vector2(mx / cScale2, (canvas2.height - my) / cScale2);
}

// 星际台球模式下 document 级事件处理器（用于鼠标移出 canvas 后仍能持续蓄力/刹车）
var starMoveHandler = null;
var starUpHandler = null;

function bindStarGlobalHandlers() {
    if (starMoveHandler) return;
    starMoveHandler = function (event) {
        const simPos = toSimCoords(event.clientX, event.clientY);
        lastMousePos = simPos.clone();
        if (physicsScene.starBilliardsMode && (physicsScene.cueStick.charging || physicsScene.cueStick.braking)) {
            updateCueStick(simPos);
        }
    };
    starUpHandler = function (event) {
        if (!physicsScene.starBilliardsMode) return;
        if (physicsScene.cueStick.braking) {
            setBrakeState(false);
        } else {
            releaseCueStick();
        }
        unbindStarGlobalHandlers();
    };
    document.addEventListener("mousemove", starMoveHandler);
    document.addEventListener("mouseup", starUpHandler);
}

function unbindStarGlobalHandlers() {
    if (starMoveHandler) {
        document.removeEventListener("mousemove", starMoveHandler);
        starMoveHandler = null;
    }
    if (starUpHandler) {
        document.removeEventListener("mouseup", starUpHandler);
        starUpHandler = null;
    }
}


// 鼠标事件处理
canvas2.addEventListener("mousedown", (event) => {
    if (!physicsScene.starBilliardsMode) {
        // 普通模式保持原有拖拽
        if (!achievementsUnlocked[6]) {
            window.unlockAchievement(7);
        }
        const simPos = toSimCoords(event.clientX, event.clientY);
        const ball = physicsScene.balls[getDraggableBallIndex()];
        ball.pos.x = simPos.x;
        ball.pos.y = simPos.y;
        ball.vel.set(new Vector2(0, 0));
        mouseDown2 = true;
        canvas2.style.cursor = 'grabbing';
    } else {
        // 星际模式：球杆系统
        const simPos = toSimCoords(event.clientX, event.clientY);
        const speed = getCueBallSpeed();
        if (speed >= config.cueStick.idleSpeedThreshold) {
            // 速度过快，进入刹车模式（线性减速）
            setBrakeState(true);
            physicsScene.cueStick.charging = false;
            physicsScene.cueStick.active = false;
        } else {
            startCueCharge(simPos);
        }
        // 新增：注册 document 级事件监听，即使鼠标移出 canvas 也能持续响应
        bindStarGlobalHandlers();
    }
});

canvas2.addEventListener("mouseup", (event) => {
    if (!physicsScene.starBilliardsMode) {
        mouseDown2 = false;
        canvas2.style.cursor = 'grab';
    } else {
        // 星际模式：释放球杆或停止刹车
        if (physicsScene.cueStick.braking) {
            setBrakeState(false);
        } else {
            releaseCueStick();
        }
    }
});

canvas2.addEventListener("mouseleave", (event) => {
    mouseInCanvas = false;
    if (physicsScene.starBilliardsMode) {
        // 注意：不再在这里取消蓄力/刹车，而是通过 document 级 mousemove 持续跟踪，
        // 真正超出最大蓄力范围时由 updateCueStick 内部逻辑取消。
        if (!physicsScene.cueStick.charging && !physicsScene.cueStick.braking) {
            setBrakeState(false);
            cancelCueStick();
        }
    } else if (mouseDown2) {
        mouseDown2 = false;
        canvas2.style.cursor = 'grab';
    }
});


canvas2.addEventListener("mousemove", (event) => {
    const simPos = toSimCoords(event.clientX, event.clientY);
    lastMousePos = simPos.clone();

    if (!physicsScene.starBilliardsMode) {
        // 普通模式拖拽
        if (!mouseDown2) {
            canvas2.style.cursor = 'grab';
        }
        if (mouseDown2) {
            const ball = physicsScene.balls[getDraggableBallIndex()];
            ball.vel.x = (simPos.x - ball.pos.x) / physicsScene.dt;
            ball.vel.y = (simPos.y - ball.pos.y) / physicsScene.dt;
            ball.pos.x = simPos.x;
            ball.pos.y = simPos.y;
        }
    } else {
        // 星际模式：更新球杆
        updateCueStick(simPos);
    }
});

canvas2.addEventListener("mouseleave", () => {
    mouseInCanvas = false;
    if (physicsScene.starBilliardsMode) {
        if (!physicsScene.cueStick.charging && !physicsScene.cueStick.braking) {
            setBrakeState(false);
            cancelCueStick();
        }
    }
});


canvas2.addEventListener("mouseenter", () => {
    mouseInCanvas = true;
});

// 触摸支持
canvas2.addEventListener("touchstart", (event) => {
    event.preventDefault();
    if (!physicsScene.starBilliardsMode) {
        if (!achievementsUnlocked[6]) {
            window.unlockAchievement(7);
        }
        const simPos = toSimCoords(event.touches[0].clientX, event.touches[0].clientY);
        const ball = physicsScene.balls[getDraggableBallIndex()];
        ball.pos.x = simPos.x;
        ball.pos.y = simPos.y;
        ball.vel.set(new Vector2(0, 0));
        mouseDown2 = true;
    } else {
        const simPos = toSimCoords(event.touches[0].clientX, event.touches[0].clientY);
        const speed = getCueBallSpeed();
        if (speed >= config.cueStick.idleSpeedThreshold) {
            // 速度过快，进入刹车模式
            setBrakeState(true);
            physicsScene.cueStick.charging = false;
            physicsScene.cueStick.active = false;
        } else {
            startCueCharge(simPos);
        }
    }
}, { passive: false });

canvas2.addEventListener("touchend", (event) => {
    event.preventDefault();
    if (!physicsScene.starBilliardsMode) {
        mouseDown2 = false;
    } else {
        // 星际模式：释放球杆或停止刹车
        if (physicsScene.cueStick.braking) {
            setBrakeState(false);
        } else {
            releaseCueStick();
        }
    }
}, { passive: false });

canvas2.addEventListener("touchmove", (event) => {
    event.preventDefault();
    const simPos = toSimCoords(event.touches[0].clientX, event.touches[0].clientY);
    lastMousePos = simPos.clone();

    if (!physicsScene.starBilliardsMode) {
        if (mouseDown2) {
            const ball = physicsScene.balls[getDraggableBallIndex()];
            ball.vel.x = (simPos.x - ball.pos.x) / physicsScene.dt;
            ball.vel.y = (simPos.y - ball.pos.y) / physicsScene.dt;
            ball.pos.x = simPos.x;
            ball.pos.y = simPos.y;
        }
    } else {
        updateCueStick(simPos);
    }
}, { passive: false });

// Preload wallpaper images
physicsScene.wallpaperImages.forEach((src) => {
    const img = new Image();
    img.src = src;
});

// Load images for the balls
var bunImage = new Image();
bunImage.src = config.images.balls.bun;

var satelliteImage = new Image();
satelliteImage.src = config.images.balls.satellite;

var earthImage = new Image();
earthImage.src = config.images.balls.earth;

var moonImage = new Image();
moonImage.src = config.images.balls.moon;

// 月球对决 GIF 特效图片
var mockGif = new Image();
mockGif.src = config.starBilliards.moonEffects.mock.image;
var splashGif = new Image();
splashGif.src = config.starBilliards.moonEffects.splash.image;
var hitGif = new Image();
hitGif.src = config.starBilliards.moonEffects.hit.image;
var boomGif = new Image();
boomGif.src = config.starBilliards.moonEffects.boom.image;

// 帮助图片（悬停问号图标时显示）
var helpCnImg = new Image();
helpCnImg.src = "images/billiards/helpcn.png";
var helpEnImg = new Image();
helpEnImg.src = "images/billiards/helpen.png";
var helpIconEl = null;       // 帮助图标 DOM 元素
var helpOverlayEl = null;    // 帮助图片 overlay DOM 元素

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

        // 计算基础缩放：保持图片比例，使canvas完全被覆盖（cover模式）+ 额外放大
        const baseScale = Math.max(canvas2.width / imgW, canvas2.height / imgH) * 1.15;

        // 星际台球模式下添加动态效果
        if (physicsScene.starBilliardsMode) {
            const anim = physicsScene.wallpaperAnim;
            const simDt = physicsScene.dt || 1 / 60;

            // 1. 缓慢放大缩小（呼吸效果）
            anim.wanderTimer += simDt;
            anim.targetScale = 1.0 + Math.sin(anim.wanderTimer * 0.3) * 0.03;  // ±3%
            anim.scale += (anim.targetScale - anim.scale) * 0.02;  // 平滑过渡

            // 2. 二维随机游走
            if (anim.wanderTimer > 2.0) {
                anim.wanderTimer = 0;
                anim.wanderDirX = (Math.random() - 0.5) * 2;
                anim.wanderDirY = (Math.random() - 0.5) * 2;
            }
            const wanderSpeed = 8;  // 像素/秒
            anim.offsetX += anim.wanderDirX * wanderSpeed * simDt;
            anim.offsetY += anim.wanderDirY * wanderSpeed * simDt;

            // 3. 边界限制（确保覆盖canvas）
            const maxOffset = 20;
            anim.offsetX = Math.max(-maxOffset, Math.min(maxOffset, anim.offsetX));
            anim.offsetY = Math.max(-maxOffset, Math.min(maxOffset, anim.offsetY));

            // 4. 碰撞冲击衰减
            if (anim.bounceDecay > 0) {
                anim.bounceDecay -= simDt * 3;
                if (anim.bounceDecay <= 0) {
                    anim.bounceOffsetX = 0;
                    anim.bounceOffsetY = 0;
                    anim.bounceDecay = 0;
                }
            } else {
                anim.bounceOffsetX *= 0.9;
                anim.bounceOffsetY *= 0.9;
            }

            // 应用缩放：基于图片原始比例计算显示尺寸
            const totalScale = baseScale * anim.scale;
            const displayW = imgW * totalScale;
            const displayH = imgH * totalScale;

            // 居中 + 偏移
            const centerX = (canvas2.width - displayW) / 2;
            const centerY = (canvas2.height - displayH) / 2;
            const totalOffsetX = centerX + anim.offsetX + anim.bounceOffsetX;
            const totalOffsetY = centerY + anim.offsetY + anim.bounceOffsetY;

            c.drawImage(wallpaperToDraw, totalOffsetX, totalOffsetY, displayW, displayH);
        } else {
            // 普通模式：保持原始比例覆盖canvas
            const displayW = imgW * baseScale;
            const displayH = imgH * baseScale;
            const offsetX = (canvas2.width - displayW) / 2;
            const offsetY = (canvas2.height - displayH) / 2;
            c.drawImage(wallpaperToDraw, offsetX, offsetY, displayW, displayH);
        }
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

            // 计算口袋颜色（优先星球颜色，用于涟漪）
            var pocketColor = "#1a1a1a";
            if (pocket.isWhite) {
                pocketColor = "#ffffff";
            } else if (pocket.planet) {
                pocketColor = pocket.planet.color;
            }

            // 激活的口袋显示星球颜色，未激活的显示黑色
            if (pocket.isWhite) {
                c.fillStyle = "#ffffff";
                c.strokeStyle = "#cccccc";
            } else if (pocket.active && pocket.planet) {
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

            // 绘制涟漪动画（小星体环节和月球对决环节）
            if (pocket.ripples && pocket.ripples.length > 0) {
                c.save();
                for (var r = 0; r < pocket.ripples.length; r++) {
                    var rip = pocket.ripples[r];
                    var ripR = cScale2 * Math.max(0, rip.radius);
                    c.globalAlpha = Math.max(0, rip.alpha);
                    c.strokeStyle = pocketColor;
                    c.lineWidth = 2;
                    c.beginPath();
                    c.arc(px, py, ripR, 0, 2 * Math.PI);
                    c.stroke();
                }
                c.restore();
            }
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
            if (ball.isMoon) {
                // 用 moon.png 绘制月球
                if (moonImage.complete) {
                    c.drawImage(moonImage, -radius, -radius, radius * 2, radius * 2);
                } else {
                    // 图片未加载时用灰色圆形代替
                    c.fillStyle = "#C0C0C0";
                    c.beginPath();
                    c.arc(0, 0, radius, 0, 2 * Math.PI);
                    c.fill();
                    c.strokeStyle = "#ffffff";
                    c.lineWidth = 2;
                    c.stroke();
                }
            } else if (ball.isCueball) {
                // cueball 使用 bun_white
                if (bunImage.complete) {
                    c.drawImage(bunImage, -radius, -radius, radius * 2, radius * 2);
                } else {
                    c.beginPath();
                    c.arc(0, 0, radius, 0.0, 2.0 * Math.PI);
                    c.closePath();
                    c.fill();
                }
            } else {
                // 小星体使用 satellite
                if (satelliteImage.complete) {
                    c.drawImage(satelliteImage, -radius, -radius, radius * 2, radius * 2);
                } else {
                    c.beginPath();
                    c.arc(0, 0, radius, 0.0, 2.0 * Math.PI);
                    c.closePath();
                    c.fill();
                }
            }
        }
        else {
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

    // 绘制月球对决 GIF 特效
    drawMoonEffects();

    // 绘制金星V型势能平衡距离圆环
    drawVenusEquilibriumCircles();
    // 绘制木星闪烁效果
    drawJupiterFlash();
    // 绘制星球进度条
    drawPlanetProgressBar();
    // 绘制虚拟球杆
    drawCueStick();

    // 胜利状态：绘制弹跳的胜利文字
    if (physicsScene.duelState.victory) {
        const state = physicsScene.duelState;
        // ===== 星球大战式 3D 透视滚动文字 =====
        // 初始化离屏 Canvas（把文字当作一张图片）
        if (state.crawlCanvas === undefined) {
            const cc = document.createElement('canvas');
            cc.width = 2800;
            cc.height = 10000;
            const ccx = cc.getContext('2d');
            // ccx.fillStyle = '#000';
            // ccx.fillRect(0, 0, cc.width, cc.height);

            const zhLines = [
                "星际台球（后记）",
                "",
                "星历2387年，人类制造了无数人造卫星，卫星残骸在宇宙中聚集形成黑色诅咒",
                "水金火木土五颗行星，连同地球，全部被诅咒吞噬 化作六个黑暗的黑洞",
                "",
                "你是星际最后的希望，唯一的台球手，将泛滥的人造卫星",
                "一一击向六个黑洞，用纯粹的撞击之力，瓦解诅咒的根源",
                "",
                "当最后一颗卫星入洞，黑洞将逆转为白洞",
                "此时月球BOSS降临，阻挡地球的回归",
                "击败月之暗影，才能重启时光之门，让蓝色星球，重新回到太阳系的怀抱",
            ];
            const enLines = [
                "Star Billiards (Epilogue)",
                "",
                "Star Year 2387: Mankind forged countless satellites",
                "Their debris coalesced into a dark cosmic curse",
                "Mercury, Venus, Mars, Jupiter, Saturn — and Earth",
                "All devoured by the curse, become six black holes",
                "",
                "You are the galaxy's last hope — the lone billiard master",
                "Send each satellite crashing into the six dark holes",
                "Pure impact alone can shatter the curse's root",
                "",
                "When the last satellite sinks in, black holes flip to white",
                "Then the Moon Boss descends, blocking Earth's return",
                "Defeat the lunar shadow to reopen the gate of time",
                "And bring the blue planet home to the Sun once more",
            ];
            const lines = (state.victoryLang === 'en') ? enLines : zhLines;


            const lh = 80;
            ccx.fillStyle = '#FFE81F';
            ccx.strokeStyle = '#663300';
            ccx.lineWidth = 0;
            ccx.textAlign = 'center';
            ccx.textBaseline = 'middle';
            ccx.font = 'bold 80px sans-serif';
            ccx.save();
            ccx.scale(1, 0.2);
            lines.forEach((line, i) => {
                const y = i * lh + lh / 2 + 3200;
                ccx.fillText(line, cc.width / 2, y);
                ccx.strokeText(line, cc.width / 2, y);
            });
            state.crawlCanvas = cc;
            state.crawlOffset = 0;
        }
        state.crawlOffset -= 5 * physicsScene.dt;
        const cc = state.crawlCanvas;
        const vpY = canvas2.height * 0;
        if (state.crawlOffset > cc.height) state.crawlOffset = 0;



        // 绘制随机星空背景（仅首次生成，后续复用）
        if (state.starFieldCanvas === undefined) {
            const sf = document.createElement('canvas');
            sf.width = canvas2.width;
            sf.height = canvas2.height;
            const sfc = sf.getContext('2d');
            // 深空底色
            sfc.fillStyle = '#020208ff';
            sfc.fillRect(0, 0, sf.width, sf.height);
            // 随机生成 200~400 个白色光点
            const starCount = 200 + Math.floor(Math.random() * 200);
            for (let i = 0; i < starCount; i++) {
                const sx = Math.random() * sf.width;
                const sy = Math.random() * sf.height;
                const brightness = 0.3 + Math.random() * 0.7;
                const radius = Math.random() * 0.5 + 0.1;
                sfc.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                sfc.beginPath();
                sfc.arc(sx, sy, radius, 0, Math.PI * 2);
                sfc.fill();
            }
            state.starFieldCanvas = sf;
        }
        c.drawImage(state.starFieldCanvas, 0, 0);

        // 绘制星球大战式 3D 透视滚动文字（梯形文字层）
        (function drawStarWarsCrawl() {
            const cc = state.crawlCanvas;
            const vpX = canvas2.width / 2;
            const focal = 800;
            const angle = -80 * Math.PI / 180;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const step = 1;

            const bottomDy = canvas2.height - vpY;
            const bottomWY = bottomDy * focal / (cosA * focal - bottomDy * sinA);
            const bottomZ = bottomWY * sinA;
            const maxScale = focal / (focal + bottomZ);

            const maxHalfW = canvas2.width * 0.5;

            c.save();
            for (let sY = canvas2.height; sY >= vpY; sY -= step) {
                const dy = sY - vpY;
                const wY = dy * focal / (cosA * focal - dy * sinA);
                if (wY < 0) continue;

                // 越靠近消失点（窄边）透明度越高，逐渐消失
                // fadeStart: 开始淡出的位置（距离消失点的像素数）
                // fadeRange: 淡出过渡范围
                const fadeStart = bottomDy * 0.1;
                const fadeRange = bottomDy * 0.1;
                const fadeDist = dy - fadeStart;
                const alpha = Math.max(0, Math.min(1, fadeDist / fadeRange));
                c.globalAlpha = alpha;

                const z = wY * sinA;
                const rawScale = focal / (focal + z);
                const scale = rawScale / maxScale;

                let srcY = wY - state.crawlOffset;
                srcY = ((srcY % cc.height) + cc.height) % cc.height;

                const dstHalfW = maxHalfW * scale;
                const srcH = step / scale;

                c.drawImage(cc,
                    0, srcY, cc.width, srcH,
                    vpX - dstHalfW, sY, dstHalfW * 2, step);
            }
            c.restore();
        })();


        // 绘制白色口袋（在梯形文字之上）
        {
            const pocketRadius = config.starBilliards.pocketRadius;
            for (var pocket of physicsScene.pockets) {
                var px = cX(new Vector2(pocket.x, 0));
                var py = cY(new Vector2(0, pocket.y));
                var pr = cScale2 * pocketRadius;
                c.fillStyle = "#ffffff";
                c.strokeStyle = "#cccccc";
                c.lineWidth = 2;
                c.beginPath();
                c.arc(px, py, pr, 0, 2 * Math.PI);
                c.fill();
                c.stroke();
            }
        }

        // 绘制 cueball
        const cueBall = physicsScene.balls[0];
        if (cueBall && bunImage.complete) {
            c.save();
            c.translate(cX(cueBall.pos), cY(cueBall.pos));
            c.rotate(cueBall.ang);
            c.drawImage(bunImage, -cScale2 * cueBall.radius, -cScale2 * cueBall.radius, cScale2 * cueBall.radius * 2, cScale2 * cueBall.radius * 2);
            c.restore();
        }

        // 绘制 earth 球（胜利后添加）——去掉延迟，立即显示
        {
            let earthBall = physicsScene.balls.find(b => b.isEarth);
            if (!earthBall) {
                const earthRadius = config.canvas.simMinWidth * config.balls.radiusRatios[2];
                earthBall = new Ball(
                    earthRadius,
                    earthRadius * earthRadius * 0.5,
                    earthRadius * earthRadius * 0.2,
                    new Vector2(simWidth2 * 0.7, simHeight2 * 0.5),
                    new Vector2(0, 0),
                    0,
                    0
                );
                earthBall.isEarth = true;
                physicsScene.balls.push(earthBall);
                updateSpatialGrid();
            }
            // 显式绘制地球球（胜利画面 return 了，不会走正常绘制流程）
            if (earthImage.complete) {
                c.save();
                c.translate(cX(earthBall.pos), cY(earthBall.pos));
                c.rotate(earthBall.ang);
                const r = cScale2 * earthBall.radius;
                c.drawImage(earthImage, -r, -r, r * 2, r * 2);
                c.restore();
            }
        }
        // 绘制球杆和瞄准圆圈（胜利画面背景清除了之前的绘制，需要重画）
        drawCueStick();

        state.victoryTimer += physicsScene.dt;
        return;  // 不绘制其他内容
    }

}

function startDuelPhase() {
    // 立即标记为激活，防止重复触发
    physicsScene.duelState.active = true;

    // 重置 GIF 特效状态
    physicsScene.duelState.effects = {
        mockTimer: 0,
        mockIntervalTimer: 0,
        mockList: [],
        splashList: [],
        hitTimer: 0,
        hitIntervalTimer: 0,
        hitList: [],
        boomList: [],
    };

    // 停止小星体环节 BGM
    if (catchBgm) {
        catchBgm.pause();
        catchBgm.currentTime = 0;
    }

    // 进度条切换到对决模式
    if (physicsScene.planetProgressBar) {
        physicsScene.planetProgressBar.inDuel = true;
    }

    // 进度条切换到对决模式（颜色渐变）
    if (physicsScene.planetProgressBar) {
        physicsScene.planetProgressBar.inDuel = true;
    }

    // Play moon spell BGM (loop)
    if (!moonSpellBgm) {
        moonSpellBgm = new Audio('audio/moonspell.mp3');
        moonSpellBgm.loop = true;
        moonSpellBgm.volume = typeof globalBgmVolume !== 'undefined' ? globalBgmVolume : 0.8;
    }
    moonSpellBgm.currentTime = 0;
    const playPromise = moonSpellBgm.play();
    if (playPromise !== undefined) {
        playPromise.catch(err => console.log('Moon spell play blocked:', err));
    }

    // 初始化笑声定时器
    laughTimer = 0;
    laughNextInterval = 3 + Math.random() * 3;


    // 对决环节强制使用地球物理（包括cueball与月球，全场都是地球模式）
    const earthPlanet = config.starBilliards.planets.find(p => p.name === "earth");
    if (earthPlanet) {
        applyPlanetPhysics(earthPlanet);
        const earthImg = config.starBilliards.planetImagePath + earthPlanet.name + ".png";
        loadPlanetWallpaper(earthImg);
    }

    const { triangleStartX, triangleStartY } = config.starBilliards;
    const duel = config.duel;

    // 使用 cueball 半径作为月球初始半径（稍小一点）
    const cueRadius = config.canvas.simMinWidth * config.balls.radiusRatios[0];
    const moonRadius = cueRadius * duel.moonRadiusRatio;  // 月球初始为 cueball 的 80%

    // 月球从三角形球阵位置生成
    const spawnX = simWidth2 * triangleStartX;
    const spawnY = simHeight2 * triangleStartY;

    // 创建月球球
    const moonBall = new Ball(
        moonRadius,
        moonRadius * moonRadius * duel.moonDensity,
        moonRadius * moonRadius * duel.moonDensity * 0.5,
        new Vector2(spawnX, spawnY),
        new Vector2(duel.moonInitialVel.x, duel.moonInitialVel.y),  // 初始速度
        0,
        0
    );
    moonBall.isMoon = true;
    moonBall.growthRate = duel.growthRate;  // 每秒增长速率（调大）
    moonBall.collisionGrowth = duel.collisionGrowth;  // 每次碰撞增长倍数
    moonBall.wallShrink = duel.wallShrink;  // 撞墙缩小倍数（只缩 15%，不是砍半）
    moonBall.ejectProtection = duel.ejectProtection;  // 2秒保护

    physicsScene.balls.push(moonBall);
    physicsScene.duelState.moonBallIdx = physicsScene.balls.length - 1;

    // 更新空间网格
    if (physicsScene.spatialGrid) {
        initSpatialGrid();
        updateSpatialGrid();
    }

    console.log("月球已生成！半径:", moonRadius, "位置:", spawnX.toFixed(3), spawnY.toFixed(3));
}


function updateMoonBall(dt) {
    const { duelState, balls } = physicsScene;
    if (!duelState.active) return;

    const moonBall = balls[duelState.moonBallIdx];
    if (!moonBall || !moonBall.isMoon) return;

    // 记录当前动量和角动量
    const momentumX = moonBall.mass * moonBall.vel.x;
    const momentumY = moonBall.mass * moonBall.vel.y;
    const angularMomentum = moonBall.inertia * moonBall.omega;

    // 自然缓慢增长
    const oldRadius = moonBall.radius;
    moonBall.radius += moonBall.growthRate * dt;

    // 更新质量和转动惯量（保持密度）
    const areaRatio = (moonBall.radius * moonBall.radius) / (oldRadius * oldRadius);
    moonBall.mass = moonBall.mass * areaRatio;
    moonBall.inertia = moonBall.inertia * areaRatio;

    // 保持动量和角动量不变
    if (moonBall.mass > 0) {
        moonBall.vel.x = momentumX / moonBall.mass;
        moonBall.vel.y = momentumY / moonBall.mass;
    }
    if (moonBall.inertia > 0) {
        moonBall.omega = angularMomentum / moonBall.inertia;
    }
    // 更新进度条月球半径（用于颜色渐变）
    if (physicsScene.planetProgressBar) {
        physicsScene.planetProgressBar.moonRadius = moonBall.radius;
    }

    // ======= GIF 特效更新 =======
    const effects = duelState.effects;
    const cfg = config.starBilliards.moonEffects;
    const now = performance.now() / 1000;  // 当前时间（秒）
    const cueBall = physicsScene.balls[0];
    const maxRadius = canvas2.height / 2 / cScale2;  // sim 坐标下的最大半径

    // 清理过期的 mock 和 splash
    for (let i = effects.mockList.length - 1; i >= 0; i--) {
        if (now - effects.mockList[i].birthTime > cfg.mock.lifetime) {
            effects.mockList.splice(i, 1);
        }
    }
    for (let i = effects.splashList.length - 1; i >= 0; i--) {
        if (now - effects.splashList[i].birthTime > cfg.splash.lifetime) {
            effects.splashList.splice(i, 1);
        }
    }
    if (effects.boomList) {
        for (let i = effects.boomList.length - 1; i >= 0; i--) {
            if (now - effects.boomList[i].birthTime > effects.boomList[i].lifetime) {
                effects.boomList.splice(i, 1);
            }
        }
    }

    // 更新 hit（飞行中的 gif）—— 每时每刻方向指向 cueball
    for (let i = effects.hitList.length - 1; i >= 0; i--) {
        const hit = effects.hitList[i];
        // 实时更新方向：指向当前 cueball 位置
        if (cueBall) {
            const dx = cueBall.pos.x - hit.pos.x;
            const dy = cueBall.pos.y - hit.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.0001) {
                hit.dir.x = dx / dist;
                hit.dir.y = dy / dist;
            }
        }
        // 沿方向移动
        hit.pos.x += hit.dir.x * cfg.hit.speed * dt;
        hit.pos.y += hit.dir.y * cfg.hit.speed * dt;
        // 检测是否碰到 cueball
        // 检测是否碰到 cueball
        if (cueBall) {
            const dx = cueBall.pos.x - hit.pos.x;
            const dy = cueBall.pos.y - hit.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cfg.hit.triggerDistance + cueBall.radius) {
                // 给予 cueball 冲力
                const impulse = cfg.hit.impulseStrength;
                cueBall.vel.x += hit.dir.x * impulse;
                cueBall.vel.y += hit.dir.y * impulse;

                // 在接触点生成 boom.gif 特效（尺寸随机）
                const boomCfg = cfg.boom;
                const boomScale = boomCfg.sizeMin + Math.random() * (boomCfg.sizeMax - boomCfg.sizeMin);
                effects.boomList = effects.boomList || [];
                effects.boomList.push({
                    pos: { x: hit.pos.x, y: hit.pos.y },
                    birthTime: now,
                    lifetime: boomCfg.lifetime,
                    scale: boomScale,
                });

                // 播放 boom.mp3 音效（受总控影响）
                if (soundEnabled && boomAudio) {
                    boomAudio.currentTime = 0;
                    boomAudio.volume = 0.8 * (typeof globalSfxVolume !== 'undefined' ? globalSfxVolume : 1.0);
                    boomAudio.play().catch(e => console.log('Boom audio play blocked:', e));
                }

                effects.hitList.splice(i, 1);
                continue;
            }
        }

        // 超时移除（使用每个 hit 自带的 lifetime）
        if (now - hit.birthTime > hit.lifetime) {
            effects.hitList.splice(i, 1);
        }
    }

    // mock 特效：月球半径超过阈值时，定期在月球→cueball方向释放
    const mockThresholdSim = cfg.mock.radiusThreshold * maxRadius;
    if (moonBall.radius > mockThresholdSim && cueBall) {
        effects.mockIntervalTimer += dt;
        if (effects.mockIntervalTimer >= cfg.mock.interval) {
            effects.mockIntervalTimer -= cfg.mock.interval;
            // 计算位置：月球中心偏向 cueball 方向
            const dx = cueBall.pos.x - moonBall.pos.x;
            const dy = cueBall.pos.y - moonBall.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.0001) {
                const offset = moonBall.radius * cfg.mock.offsetFromMoon * 0.4;  // 更靠近月球中心
                const pos = {
                    x: moonBall.pos.x + (dx / dist) * offset,
                    y: moonBall.pos.y + (dy / dist) * offset,
                };
                effects.mockList.push({ pos, birthTime: now, lifetime: cfg.mock.lifetime, offsetFromMoon: cfg.mock.offsetFromMoon * 0.4 });
            }
        }
    } else {
        effects.mockIntervalTimer = 0;
    }

    // hit 特效：月球半径超过阈值时，每3s向 cueball 方向释放
    const hitThresholdSim = cfg.hit.radiusThreshold * maxRadius;
    if (moonBall.radius > hitThresholdSim && cueBall) {
        effects.hitIntervalTimer += dt;
        if (effects.hitIntervalTimer >= cfg.hit.interval) {
            effects.hitIntervalTimer -= cfg.hit.interval;
            const dx = cueBall.pos.x - moonBall.pos.x;
            const dy = cueBall.pos.y - moonBall.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.0001) {
                // 寿命正比于月球半径：1.5s（阈值）→ 5.0s（最大）
                const ratio = Math.min((moonBall.radius - hitThresholdSim) / (maxRadius - hitThresholdSim), 1.0);
                const lifetime = 1.5 + (5.0 - 1.5) * ratio;
                effects.hitList.push({
                    pos: { x: moonBall.pos.x, y: moonBall.pos.y },
                    dir: { x: dx / dist, y: dy / dist },
                    birthTime: now,
                    lifetime: lifetime,
                    speed: cfg.hit.speed,
                });
                // 每次发射 hit.gif 时播放 mock(laugh.mp3) 音效
                playLaughSound(moonBall.radius);
            }
        }
    } else {
        effects.hitIntervalTimer = 0;
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

    // 月球与cueball碰撞时增长（保持动量不变）
    if (ball1.isMoon && ball2 === physicsScene.balls[0]) {
        const momentumX = ball1.mass * ball1.vel.x;
        const momentumY = ball1.mass * ball1.vel.y;
        const angularMomentum = ball1.inertia * ball1.omega;
        const oldRadius = ball1.radius;
        ball1.radius *= config.duel.collisionGrowth;
        const areaRatio = (ball1.radius * ball1.radius) / (oldRadius * oldRadius);
        ball1.mass *= areaRatio;
        ball1.inertia *= areaRatio;
        ball1.vel.x = momentumX / ball1.mass;
        ball1.vel.y = momentumY / ball1.mass;
        ball1.omega = angularMomentum / ball1.inertia;

        // 碰撞增长后重新分离，避免视觉重叠
        const newMinDist = ball1.radius + ball2.radius;
        const dir = new Vector2();
        dir.subtractVectors(ball1.pos, ball2.pos);
        const curDist = dir.length();
        if (curDist < newMinDist && curDist > 0) {
            const corr = (newMinDist - curDist) / 2.0;
            dir.scale(corr / curDist);
            ball1.pos.add(dir, 1.0);
            ball2.pos.add(dir, -1.0);
        }
    } else if (ball2.isMoon && ball1 === physicsScene.balls[0]) {
        const momentumX = ball2.mass * ball2.vel.x;
        const momentumY = ball2.mass * ball2.vel.y;
        const angularMomentum = ball2.inertia * ball2.omega;
        const oldRadius = ball2.radius;
        ball2.radius *= config.duel.collisionGrowth;
        const areaRatio = (ball2.radius * ball2.radius) / (oldRadius * oldRadius);
        ball2.mass *= areaRatio;
        ball2.inertia *= areaRatio;
        ball2.vel.x = momentumX / ball2.mass;
        ball2.vel.y = momentumY / ball2.mass;
        ball2.omega = angularMomentum / ball2.inertia;

        // 碰撞增长后重新分离，避免视觉重叠
        const newMinDist = ball1.radius + ball2.radius;
        const dir = new Vector2();
        dir.subtractVectors(ball2.pos, ball1.pos);
        const curDist = dir.length();
        if (curDist < newMinDist && curDist > 0) {
            const corr = (newMinDist - curDist) / 2.0;
            dir.scale(corr / curDist);
            ball2.pos.add(dir, 1.0);
            ball1.pos.add(dir, -1.0);
        }
    }

}

function handleWallCollision(ball, worldSize, restitution) {
    var friction = config.collision.ballWallFriction;
    var ballWallSoundAdjustment = physicsScene.ballWallSoundAdjustment;
    var invMass = 1.0 / ball.mass;
    var invInertia = 2.0 / (ball.mass * ball.radius * ball.radius);
    var normalAdjustment = config.collision.normalAdjustment;

    var isHitWall = false;
    var hitWallNormal = null;  // 记录撞击面的法向（墙的方向）
    var hitWallPos = null;    // 记录撞击点位置

    // 左墙碰撞
    if (ball.pos.x < ball.radius) {
        isHitWall = true;
        hitWallNormal = { x: 1, y: 0 };
        hitWallPos = { x: ball.radius * 0.2, y: ball.pos.y };
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
        triggerWallpaperBounce(normal, normalVel);  // 左墙冲击

        // 切向冲量（摩擦力）
        if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
            var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
            ball.vel.add(tangent, impulseTangent * invMass);
            ball.omega += impulseTangent * ball.radius * invInertia;
        }
    }

    // 右墙碰撞
    if (ball.pos.x > worldSize.x - ball.radius) {
        isHitWall = true;
        hitWallNormal = { x: -1, y: 0 };
        hitWallPos = { x: worldSize.x - ball.radius * 0.2, y: ball.pos.y };
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
        triggerWallpaperBounce(normal, normalVel);  // 右墙冲击

        if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
            var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
            ball.vel.add(tangent, impulseTangent * invMass);
            ball.omega -= impulseTangent * ball.radius * invInertia;
        }
    }

    // 地面碰撞
    if (ball.pos.y < ball.radius) {
        isHitWall = true;
        hitWallNormal = { x: 0, y: 1 };
        hitWallPos = { x: ball.pos.x, y: ball.radius * 0.2 };
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
        triggerWallpaperBounce(normal, normalVel);  // 地面冲击

        if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
            var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
            ball.vel.add(tangent, impulseTangent * invMass);
            ball.omega -= impulseTangent * ball.radius * invInertia;
        }
    }

    // 天花板碰撞
    if (ball.pos.y > worldSize.y - ball.radius) {
        isHitWall = true;
        hitWallNormal = { x: 0, y: -1 };
        hitWallPos = { x: ball.pos.x, y: worldSize.y - ball.radius * 0.2 };
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
        triggerWallpaperBounce(normal, normalVel);  // 天花板冲击

        if (Math.abs(tangentVel) > config.collision.tangentVelThreshold) {
            var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
            ball.vel.add(tangent, impulseTangent * invMass);
            ball.omega += impulseTangent * ball.radius * invInertia;
        }
    }

    // 月球撞墙时缩小（保持动量不变）+ splash.gif 特效
    if (ball.isMoon && isHitWall) {
        const momentumX = ball.mass * ball.vel.x;
        const momentumY = ball.mass * ball.vel.y;
        const angularMomentum = ball.inertia * ball.omega;
        const oldRadius = ball.radius;
        ball.radius *= config.duel.wallShrink;
        const areaRatio = (ball.radius * ball.radius) / (oldRadius * oldRadius);
        ball.mass *= areaRatio;
        ball.inertia *= areaRatio;
        ball.vel.x = momentumX / ball.mass;
        ball.vel.y = momentumY / ball.mass;
        ball.omega = angularMomentum / ball.inertia;
        // Play small cry sound on wall hit (volume proportional to moon radius squared)
        playSmallCrySound(ball.radius);

        // splash.gif 特效：在撞击点放置，方向沿墙的法向
        if (hitWallNormal && hitWallPos && physicsScene.duelState.effects) {
            const effects = physicsScene.duelState.effects;
            const now = performance.now() / 1000;
            effects.splashList.push({
                pos: { x: hitWallPos.x, y: hitWallPos.y },
                normal: { x: hitWallNormal.x, y: hitWallNormal.y },
                birthTime: now,
                lifetime: config.starBilliards.moonEffects.splash.lifetime,
                size: config.starBilliards.moonEffects.splash.size,
            });
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
            // 普通模式拖拽时跳过被拖球；星际模式下 cueball 正常参与
            if (!physicsScene.starBilliardsMode && mouseDown2 && i === dragIdx) continue;

            const ball = balls[i];
            ball.simulate(dt, gravity);

            // 刹车机制：cueball 速度过快时按住鼠标左键进行线性减速，直到完全停止
            if (i === 0 && physicsScene.cueStick.braking) {
                const curSpeed = ball.vel.length();
                const decelAmount = config.cueStick.brakeDeceleration * dt;
                if (decelAmount >= curSpeed) {
                    ball.vel.set(new Vector2(0, 0));
                    setBrakeState(false);  // 已停止，自动结束刹车
                }
                else {
                    ball.vel.x -= (ball.vel.x / curSpeed) * decelAmount;
                    ball.vel.y -= (ball.vel.y / curSpeed) * decelAmount;
                }
            }

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

            // 口袋引力效果（球靠近口袋时被吸入）- 跳过 cue ball 和保护中的球
            if (i !== dragIdx && ball.ejectProtection <= 0) {
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

        // 第二遍：碰撞检测
        if (physicsScene.duelState.active && balls.length <= 3) {
            // 对决阶段：只有少量球，使用朴素碰撞检测
            for (let i = 0; i < balls.length; i++) {
                const ball1 = balls[i];

                // 墙壁碰撞
                handleWallCollision(ball1, physicsScene.worldSize, restitution);

                // 球-球碰撞（朴素检测）
                for (let j = i + 1; j < balls.length; j++) {
                    // 跳过拖拽球的碰撞
                    if (mouseDown2 && (i === dragIdx || j === dragIdx)) continue;

                    handleBallCollision(ball1, balls[j], restitution);
                }
            }
        } else {
            // 正常模式：使用空间网格进行碰撞检测
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
        }


        // 检测口袋碰撞
        checkPocketCollisions();

        // 动态更新口袋触发半径和涟漪动画
        updatePocketTriggersAndRipples(dt);

        // 应用星球特殊物理
        applyPlanetSpecialPhysics(dt, dragIdx);
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

// ========== 星球特殊物理处理 ==========

// 应用星球特殊物理
function applyPlanetSpecialPhysics(dt, dragIdx) {

    // 更新月球（对决环节）
    updateMoonBall(dt);

    const mode = physicsScene.planetMode;

    switch (mode) {
        case "vShaped":
            applyVenusVShapedForce(dt, dragIdx);
            break;
        case "superBounce":
            // 火星模式已通过 restitution 全局设置生效
            break;
        case "momentumSwap":
            applyJupiterMomentumSwap(dt, dragIdx);
            break;
        case "ballEjector":
            applySaturnBallEjector(dt);
            break;
    }
}

// 金星：V型势能函数
// 小球（非cueball）之间在平衡距离外吸引、内排斥
function applyVenusVShapedForce(dt, dragIdx) {
    const planet = physicsScene.currentPlanet;
    if (!planet || !planet.vShapedParams) return;

    const { equilibriumDist, wellDepth } = planet.vShapedParams;
    const balls = physicsScene.balls;

    for (let i = 0; i < balls.length; i++) {
        if (i === dragIdx) continue;  // 跳过cueball
        const ball = balls[i];

        // 检查邻近球
        const neighbors = getNeighborBallIndices(i);
        for (let j = 0; j < neighbors.length; j++) {
            const other = balls[neighbors[j]];
            const dx = other.pos.x - ball.pos.x;
            const dy = other.pos.y - ball.pos.y;
            const distSq = dx * dx + dy * dy;
            const minDist = config.physics.minDistance;

            if (distSq < minDist * minDist) continue;

            const dist = Math.sqrt(distSq);
            const invDist = 1.0 / dist;

            // V型势能的力函数
            // F = -dU/dr, U(r) = wellDepth * |r - equilibriumDist|
            // r > eqDist: F = -wellDepth (吸引)
            // r < eqDist: F = +wellDepth (排斥)
            let forceMag;
            if (dist > equilibriumDist) {
                forceMag = wellDepth;  // 吸引力
            } else {
                forceMag = -wellDepth;   // 排斥力
            }

            forceMag *= 10;

            // 应用力
            ball.vel.x += dx * invDist * forceMag * dt;
            ball.vel.y += dy * invDist * forceMag * dt;
        }
    }
}

// 木星：随机交换两个球的动量和角动量
function applyJupiterMomentumSwap(dt, dragIdx) {
    const planet = physicsScene.currentPlanet;
    if (!planet) return;

    physicsScene.jupiterSwapTimer += dt;

    if (physicsScene.jupiterSwapTimer >= planet.swapInterval) {
        physicsScene.jupiterSwapTimer -= planet.swapInterval;

        const balls = physicsScene.balls;
        // 跳过cueball，选两个随机球
        const validIndices = [];
        for (let i = 0; i < balls.length; i++) {
            if (i !== dragIdx) validIndices.push(i);
        }

        if (validIndices.length >= 2) {
            const idx1 = validIndices[Math.floor(Math.random() * validIndices.length)];
            let idx2 = validIndices[Math.floor(Math.random() * validIndices.length)];
            while (idx2 === idx1) {
                idx2 = validIndices[Math.floor(Math.random() * validIndices.length)];
            }

            const ball1 = balls[idx1];
            const ball2 = balls[idx2];

            // 交换动量
            const velTemp = ball1.vel.clone();
            ball1.vel = ball2.vel.clone();
            ball2.vel = velTemp;

            // 交换角动量
            const omegaTemp = ball1.omega;
            ball1.omega = ball2.omega;
            ball2.omega = omegaTemp;

            // 标记闪烁
            physicsScene.jupiterFlashBalls.add(idx1);
            physicsScene.jupiterFlashBalls.add(idx2);
            physicsScene.jupiterFlashTimer = 0.3;  // 闪烁0.3秒
        }
    }

    // 更新闪烁计时器
    if (physicsScene.jupiterFlashTimer > 0) {
        physicsScene.jupiterFlashTimer -= dt;
        if (physicsScene.jupiterFlashTimer <= 0) {
            physicsScene.jupiterFlashBalls.clear();
        }
    }
}

// 土星：吐出所有进球，保持目标球数量为15
function applySaturnBallEjector(dt) {
    const planet = physicsScene.currentPlanet;
    if (!planet) return;

    const history = physicsScene.saturnPocketedBalls;
    const balls = physicsScene.balls;

    // 统计当前目标球数量（不含cueball，索引>0）
    let targetBallCount = 0;
    for (let i = 1; i < balls.length; i++) {
        targetBallCount++;
    }

    const TARGET_COUNT = 15;  // 目标球总数

    // 如果目标球不足15个，从历史中吐出
    if (targetBallCount < TARGET_COUNT && history.length > 0) {
        const pocketed = history.shift();  // 取出最早的进球

        // 进度条：移除最早捕获的小星体
        if (physicsScene.planetProgressBar && physicsScene.planetProgressBar.captured.length > 0) {
            physicsScene.planetProgressBar.captured.shift();
        }

        // 从口袋位置喷出，动量反转
        const ball = new Ball(
            pocketed.ball.radius,
            pocketed.ball.mass,
            pocketed.ball.inertia,
            new Vector2(pocketed.pocket.x, pocketed.pocket.y),
            new Vector2(-pocketed.vel.x, -pocketed.vel.y),
            pocketed.ball.ang,
            -pocketed.omega
        );

        // 设置保护时间，防止立即被吸回去
        ball.ejectProtection = 2.0;  // 2秒保护

        physicsScene.balls.push(ball);

        // 重新初始化空间网格
        if (physicsScene.spatialGrid) {
            initSpatialGrid();
            updateSpatialGrid();
        }
    }
}

// 绘制金星V型势能平衡距离圆环
function drawVenusEquilibriumCircles() {
    if (physicsScene.planetMode !== "vShaped") return;

    const planet = physicsScene.currentPlanet;
    if (!planet || !planet.vShapedParams) return;

    const { equilibriumDist } = planet.vShapedParams;
    const balls = physicsScene.balls;
    const cScale = cScale2;

    c.strokeStyle = "rgba(255, 229, 92, 0.4)";
    c.lineWidth = 1;

    // 绘制每个球的平衡距离环（跳过 cueball）
    for (let i = 1; i < balls.length; i++) {
        const ball = balls[i];
        const cx = cX(ball.pos);
        const cy = cY(ball.pos);
        const r = cScale * equilibriumDist;

        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.stroke();
    }
}

// 绘制星球进度条（粉红色条 + 小星体PNG）
function drawPlanetProgressBar() {
    const pb = physicsScene.planetProgressBar;
    if (!pb || !pb.active || !physicsScene.starBilliardsMode) return;
    if (!pbc || !progressBarCanvas) return;

    const W = progressBarCanvas.clientWidth;
    const H = progressBarCanvas.clientHeight;

    // 清除进度条画布（使用CSS坐标）
    pbc.save();
    pbc.setTransform(1, 0, 0, 1, 0, 0);
    pbc.clearRect(0, 0, progressBarCanvas.width, progressBarCanvas.height);
    pbc.restore();

    const total = Math.max(1, pb.totalPlanets || 1);
    const captured = pb.captured;
    const barHeight = 2;
    const slotWidth = 24;
    const barWidth = total * slotWidth + (total - 1) * 3;
    const barX = (W - barWidth) / 2;
    const barY = H / 2 - 2;

    // 计算颜色（决斗模式下根据月球半径从粉红渐变到红色）
    let barColor;
    if (pb.inDuel) {
        const maxR = canvas2.height / 2;
        const ratio = Math.min(pb.moonRadius * cScale2 / maxR, 1.0);
        const pinkR = 255, pinkG = 105, pinkB = 180;
        const redR = 255, redG = 0, redB = 0;
        const r = Math.round(pinkR + (redR - pinkR) * ratio);
        const g = Math.round(pinkG + (redG - pinkG) * ratio);
        const b = Math.round(pinkB + (redB - pinkB) * ratio);
        barColor = `rgb(${r},${g},${b})`;
    } else {
        barColor = '#FF69B4';
    }

    // 绘制粉红色条
    pbc.save();
    pbc.fillStyle = barColor;
    pbc.shadowColor = barColor;
    pbc.shadowBlur = 6;
    const barRadius = barHeight / 2;
    pbc.beginPath();
    pbc.moveTo(barX + barRadius, barY);
    pbc.lineTo(barX + barWidth - barRadius, barY);
    pbc.arc(barX + barWidth - barRadius, barY + barRadius, barRadius, -Math.PI / 2, Math.PI / 2);
    pbc.lineTo(barX + barRadius, barY + barHeight);
    pbc.arc(barX + barRadius, barY + barRadius, barRadius, Math.PI / 2, -Math.PI / 2);
    pbc.closePath();
    pbc.fill();
    pbc.shadowBlur = 0;

    // 绘制已捕获的卫星PNG（关于中心对称，使用satellite.png）+ 衰减震荡
    const n = captured.length;
    const startSlot = Math.floor((total - n) / 2);
    const pngSize = 16;
    const now = performance.now();

    for (let i = 0; i < n; i++) {
        const slot = startSlot + i;
        const cx = barX + slot * (slotWidth + 4) + slotWidth / 2;
        const cy = barY + barHeight / 2;
        const entry = captured[i];

        // 计算衰减震荡偏移
        let oscDx = 0, oscDy = 0;
        if (entry.oscStart !== undefined) {
            const t = now - entry.oscStart;
            const envelope = Math.exp(-t * entry.oscDecay);
            if (envelope > 0.01) {
                oscDx = entry.oscAmp * envelope * Math.sin(t * entry.oscFreq + entry.oscPhaseX);
                oscDy = entry.oscAmp * envelope * Math.cos(t * entry.oscFreq + entry.oscPhaseY);
            }
        }

        pbc.save();
        pbc.translate(cx + oscDx, cy + oscDy);
        pbc.rotate(entry.angle);

        if (entry.image && entry.image.complete) {
            pbc.drawImage(entry.image, -pngSize / 2, -pngSize / 2, pngSize, pngSize);
        } else {
            // 后备：画一个白色圆
            pbc.fillStyle = '#FFFFFF';
            pbc.beginPath();
            pbc.arc(0, 0, pngSize / 2, 0, Math.PI * 2);
            pbc.fill();
        }
        pbc.restore();
    }

    pbc.restore();
}

// 绘制木星闪烁效果
function drawJupiterFlash() {
    if (physicsScene.planetMode !== "momentumSwap") return;
    if (physicsScene.jupiterFlashBalls.size === 0) return;

    const balls = physicsScene.balls;
    const planet = physicsScene.currentPlanet;
    if (!planet) return;

    c.strokeStyle = planet.color;
    c.lineWidth = 3;

    for (const idx of physicsScene.jupiterFlashBalls) {
        if (idx >= balls.length) continue;
        const ball = balls[idx];
        const cx = cX(ball.pos);
        const cy = cY(ball.pos);
        const r = cScale2 * ball.radius * 1.5;

        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.stroke();
    }
}

// 绘制虚拟球杆
function drawCueStick() {
    if (!physicsScene.starBilliardsMode) return;

    const ball = physicsScene.balls[0];
    if (!ball) return;

    const stick = physicsScene.cueStick;
    const speed = getCueBallSpeed();
    const cfg = config.cueStick;

    // 只有当 cueball 速度足够慢且鼠标在范围内才显示
    const canInteract = speed < cfg.idleSpeedThreshold;
    const inRange = isMouseInCueBallRange(lastMousePos);

    // 刹车指示：仅在真正刹车时显示红色圆圈
    if (!canInteract && stick.braking) {
        const ballCx = cX(ball.pos);
        const ballCy = cY(ball.pos);
        const ballR = cScale2 * ball.radius;

        c.strokeStyle = cfg.brakeRingColor;
        c.lineWidth = 2;
        c.setLineDash([4, 4]);
        c.beginPath();
        c.arc(ballCx, ballCy, ballR * 1.3, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        return;
    }

    if (!canInteract || !inRange) {
        return;
    }

    // 绘制白圆圈（指示 cueball 可击打）
    const ballCx = cX(ball.pos);
    const ballCy = cY(ball.pos);
    const ballR = cScale2 * ball.radius;

    c.strokeStyle = cfg.ringColor;
    c.lineWidth = 2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.arc(ballCx, ballCy, ballR * 1.3, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    // 如果球杆未激活，不绘制球杆
    if (!stick.active) return;

    // 计算球杆位置
    // dir: 从 cueball 指向鼠标的方向
    // 布局: cueball --- 击球端(鼠标位置) --- 球杆尾端
    const dir = stick.direction;
    const cueCx = cX(ball.pos);
    const cueCy = cY(ball.pos);

    // 击球端位置：鼠标位置（在 cueball 和球杆尾端之间）
    // 用 chargeAmount 控制击球端离 cueball 的距离
    const hitEndDist = ball.radius * 0.8 + stick.chargeAmount;  // 击球端到 cueball 的距离
    const tailEndDist = hitEndDist + cfg.stickLength;  // 球杆尾端到 cueball 的距离

    // 转换为屏幕坐标（Y 轴翻转）
    const hitEndX = cueCx + dir.x * cScale2 * hitEndDist;
    const hitEndY = cueCy - dir.y * cScale2 * hitEndDist;
    const tailEndX = cueCx + dir.x * cScale2 * tailEndDist;
    const tailEndY = cueCy - dir.y * cScale2 * tailEndDist;

    // 绘制球杆
    c.strokeStyle = cfg.stickColor;
    c.lineWidth = cfg.stickWidth * cScale2;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(hitEndX, hitEndY);
    c.lineTo(tailEndX, tailEndY);
    c.stroke();

    // 绘制击球端圆圈（跟随鼠标）
    c.strokeStyle = cfg.ringColor;
    c.lineWidth = 1.5;
    c.setLineDash([3, 3]);
    c.beginPath();
    c.arc(hitEndX, hitEndY, ball.radius * 0.3, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    // 绘制蓄力指示
    if (stick.charging && stick.chargeAmount > 0) {
        const chargeRatio = stick.chargeAmount / cfg.maxChargeDistance;
        c.strokeStyle = `rgba(255, 255, 255, ${0.3 + chargeRatio * 0.5})`;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(ballCx, ballCy, ballR * 1.5, -Math.PI / 2, -Math.PI / 2 + chargeRatio * Math.PI * 2);
        c.stroke();
    }


    // 绘制辅助瞄准虚线（沿球杆直线，从 cueball 向远离鼠标的方向）
    if (stick.active) {
        const aimDir = new Vector2(-dir.x, -dir.y);  // 击打方向（远离鼠标）
        const chargeRatio = Math.max(0, stick.chargeAmount) / cfg.maxChargeDistance;

        // 可见总距离：蓄力越大，可见距离越远
        const baseLen = ball.radius * 2.5;
        const extraLen = cfg.maxChargeDistance * 2.0;
        const totalLen = baseLen + chargeRatio * extraLen;

        // 前 40% 保持不透明，后 60% 渐变消失
        const solidLen = totalLen * 0.4;
        const fadeLen = totalLen - solidLen;

        // 分段绘制虚线，每段调整透明度
        const segLen = ball.radius * 0.35;
        const nSeg = Math.ceil(totalLen / segLen);

        c.lineWidth = 2;
        c.lineCap = "butt";

        for (let i = 0; i < nSeg; i++) {
            const d1 = i * segLen;
            const d2 = Math.min((i + 1) * segLen, totalLen);

            let alpha;
            if (d1 < solidLen) {
                alpha = 1.0;
            } else {
                alpha = Math.max(0, 1.0 - (d1 - solidLen) / fadeLen);
            }
            if (alpha <= 0.02) break;

            const sx = cueCx + aimDir.x * cScale2 * d1;
            const sy = cueCy - aimDir.y * cScale2 * d1;
            const ex = cueCx + aimDir.x * cScale2 * d2;
            const ey = cueCy - aimDir.y * cScale2 * d2;

            c.setLineDash([4, 4]);
            c.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            c.beginPath();
            c.moveTo(sx, sy);
            c.lineTo(ex, ey);
            c.stroke();
        }
        c.setLineDash([]);
    }

}

// 绘制月球对决 GIF 特效（Canvas 方式，GIF 自然播放动画）
// ====== DOM 覆盖层（用于动画 GIF 特效）======
var _moonEffectsOverlay = null;
var _effectDomCache = {};  // {key: imgElement}

function _ensureOverlay() {
    if (!_moonEffectsOverlay) {
        _moonEffectsOverlay = document.createElement('div');
        _moonEffectsOverlay.style.position = 'absolute';
        _moonEffectsOverlay.style.pointerEvents = 'none';
        _moonEffectsOverlay.style.overflow = 'hidden';
        _moonEffectsOverlay.style.zIndex = '100';
        _moonEffectsOverlay.style.left = canvas2.offsetLeft + 'px';
        _moonEffectsOverlay.style.top = canvas2.offsetTop + 'px';
        _moonEffectsOverlay.style.width = canvas2.width + 'px';
        _moonEffectsOverlay.style.height = canvas2.height + 'px';
        const parent = canvas2.offsetParent || canvas2.parentElement;
        if (parent) parent.appendChild(_moonEffectsOverlay);
    }
}

function _cleanupEffectsDom() {
    for (const key in _effectDomCache) {
        _effectDomCache[key].remove();
        delete _effectDomCache[key];
    }
}  // end of _cleanupEffectsDom

// 计算 mock.gif 当前位置（随月球移动，始终在月球→cueball 方向偏移处）
function _computeMockPos(moonBall, cueBall, offsetFromMoon) {
    if (!cueBall || !moonBall) return { x: moonBall ? moonBall.pos.x : 0, y: moonBall ? moonBall.pos.y : 0 };
    const dx = cueBall.pos.x - moonBall.pos.x;
    const dy = cueBall.pos.y - moonBall.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.0001) return { x: moonBall.pos.x, y: moonBall.pos.y };
    const offset = moonBall.radius * (offsetFromMoon || 0.6);
    return {
        x: moonBall.pos.x + (dx / dist) * offset,
        y: moonBall.pos.y + (dy / dist) * offset,
    };
}

// ====== 绘制月球对决 GIF 特效 ======
function drawMoonEffects() {
    if (!physicsScene.duelState || !physicsScene.duelState.active) { _cleanupEffectsDom(); return; }
    const effects = physicsScene.duelState.effects;
    if (!effects) { _cleanupEffectsDom(); return; }

    const moonBall = physicsScene.balls[physicsScene.duelState.moonBallIdx];
    if (!moonBall) { _cleanupEffectsDom(); return; }
    const cueBall = physicsScene.balls[0];  // 用于 mock 位置计算
    const refSize = cScale2 * moonBall.radius * 1.2;  // 月球像素直径（随月球增长）
    const now = performance.now() / 1000;

    _ensureOverlay();
    const overlay = _moonEffectsOverlay;
    const activeKeys = new Set();

    // ===== mock.gif ===== （位置随月球移动）
    for (let i = 0; i < effects.mockList.length; i++) {
        const m = effects.mockList[i];
        const key = 'm_' + i + '_' + m.birthTime.toFixed(3);
        activeKeys.add(key);
        let el = _effectDomCache[key];
        if (!el) {
            el = document.createElement('img');
            el.src = mockGif.src;
            el.style.position = 'absolute';
            el.style.transformOrigin = 'center center';
            overlay.appendChild(el);
            _effectDomCache[key] = el;
        }
        const age = now - m.birthTime;
        const t = Math.min(age / m.lifetime, 1.0);
        const alpha = 1.0 - t;
        const scale = 1.0 + t * 0.3;
        const size = refSize * scale;
        // 位置实时跟随月球：从保存的相对偏移重新计算
        const curPos = _computeMockPos(moonBall, cueBall, m.offsetFromMoon);
        el.style.left = (cX(curPos) - size / 2) + 'px';
        el.style.top = (cY(curPos) - size / 2) + 'px';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.opacity = alpha.toString();
    }

    // ===== splash.gif =====
    for (let i = 0; i < effects.splashList.length; i++) {
        const s = effects.splashList[i];
        const key = 's_' + i + '_' + s.birthTime.toFixed(3);
        activeKeys.add(key);
        let el = _effectDomCache[key];
        if (!el) {
            el = document.createElement('img');
            el.src = splashGif.src;
            el.style.position = 'absolute';
            el.style.transformOrigin = 'center center';
            overlay.appendChild(el);
            _effectDomCache[key] = el;
        }
        const age = now - s.birthTime;
        const t = Math.min(age / s.lifetime, 1.0);
        const alpha = 1.0 - t;
        const size = refSize * s.size;
        const cx = cX(s.pos);
        const cy = cY(s.pos);
        const angle = Math.atan2(s.normal.y, -s.normal.x) * 180 / Math.PI - 90;
        el.style.left = (cx - size / 2) + 'px';
        el.style.top = (cy - size / 2) + 'px';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.transform = 'rotate(' + angle + 'deg)';
        el.style.opacity = alpha.toString();
    }

    // ===== hit.gif =====
    for (let i = 0; i < effects.hitList.length; i++) {
        const h = effects.hitList[i];
        const key = 'h_' + i + '_' + h.birthTime.toFixed(3);
        activeKeys.add(key);
        let el = _effectDomCache[key];
        if (!el) {
            el = document.createElement('img');
            el.src = hitGif.src;
            el.style.position = 'absolute';
            el.style.transformOrigin = 'center center';
            overlay.appendChild(el);
            _effectDomCache[key] = el;
        }
        const age = now - h.birthTime;
        const t = Math.min(age / h.lifetime, 1.0);
        const alpha = 1.0 - t;
        const size = refSize * 0.4 * (1.0 + t * 0.2);  // hit.gif 尺寸减半
        const cx = cX(h.pos);
        const cy = cY(h.pos);
        const angle = Math.atan2(h.dir.y, h.dir.x) * 180 / Math.PI;
        el.style.left = (cx - size / 2) + 'px';
        el.style.top = (cy - size / 2) + 'px';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.transform = 'rotate(' + angle + 'deg)';
        el.style.opacity = alpha.toString();
    }

    // ===== boom.gif =====
    if (effects.boomList) {
        for (let i = 0; i < effects.boomList.length; i++) {
            const b = effects.boomList[i];
            const key = 'b_' + i + '_' + b.birthTime.toFixed(3);
            activeKeys.add(key);
            let el = _effectDomCache[key];
            if (!el) {
                el = document.createElement('img');
                el.src = boomGif.src;
                el.style.position = 'absolute';
                el.style.transformOrigin = 'center center';
                overlay.appendChild(el);
                _effectDomCache[key] = el;
            }
            const age = now - b.birthTime;
            const t = Math.min(age / b.lifetime, 1.0);
            // 淡出
            const alpha = 1.0 - t;
            // 尺寸：基础为 cueball 像素直径 * 随机缩放 * （1→1.2 生长）
            const cueRpx = cScale2 * physicsScene.balls[0].radius;
            const baseSize = cueRpx * 2 * b.scale;
            const size = baseSize * (1.0 + t * 0.2);
            const cx = cX(b.pos);
            const cy = cY(b.pos);
            el.style.left = (cx - size / 2) + 'px';
            el.style.top = (cy - size / 2) + 'px';
            el.style.width = size + 'px';
            el.style.height = size + 'px';
            el.style.opacity = alpha.toString();
        }
    }

    // 清理已过期的 DOM 元素
    for (const key in _effectDomCache) {
        if (!activeKeys.has(key)) {
            _effectDomCache[key].remove();
            delete _effectDomCache[key];
        }
    }
}

function triggerVictory() {
    // 清理月球特效 DOM
    _cleanupEffectsDom();

    // Stop moon spell BGM
    if (moonSpellBgm) {
        moonSpellBgm.pause();
        moonSpellBgm.currentTime = 0;
    }

    // Stop catch BGM (if still playing)
    if (catchBgm) {
        catchBgm.pause();
        catchBgm.currentTime = 0;
    }

    const state = physicsScene.duelState;
    state.victory = true;
    state.victoryLang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
    state.active = false;

    // Play victory Earth mode BGM
    if (!victoryBgm) {
        victoryBgm = new Audio('audio/song.mp3');
        victoryBgm.loop = true;
        victoryBgm.volume = typeof globalBgmVolume !== 'undefined' ? globalBgmVolume : 0.8;
    }
    victoryBgm.currentTime = 0;
    const playPromise = victoryBgm.play();
    if (playPromise !== undefined) {
        playPromise.catch(err => console.log('Victory BGM play blocked:', err));
    }

    state.victoryTimer = 0;
    state.victoryPos = {
        x: canvas2.width / 2,
        y: canvas2.height / 2,
        vx: 100 + Math.random() * 100,
        vy: 80 + Math.random() * 80
    };

    // 移除除了cueball之外的所有球
    physicsScene.balls = [physicsScene.balls[0]];

    // 将所有口袋变成白色
    for (let i = 0; i < physicsScene.pockets.length; i++) {
        physicsScene.pockets[i].active = true;
        physicsScene.pockets[i].isWhite = true;  // 标记为白色
    }

    // 切换到地球物理模式
    const earthPlanet = config.starBilliards.planets.find(p => p.name === "earth");
    if (earthPlanet) {
        applyPlanetPhysics(earthPlanet);
    }

    // 生成地球球（类似普通模式的地球）
    const cueBall = physicsScene.balls[0];
    const earthRadius = cueBall.radius;  // 地球和 cueball 同样大小
    const earthMass = Math.PI * earthRadius * earthRadius * 0.5;
    const earthInertia = earthMass * earthRadius * earthRadius / 2.0;

    const earthBall = new Ball(
        earthRadius,
        earthMass,
        earthInertia,
        new Vector2(simWidth2 * 0.7, simHeight2 * 0.5),  // 右侧
        new Vector2(0, 0),
        0,
        0
    );
    earthBall.isEarth = true;  // 标记为地球球（胜利后出现）


    physicsScene.balls.push(earthBall);

    // 清理壁纸动画
    const anim = physicsScene.wallpaperAnim;
    anim.offsetX = 0;
    anim.offsetY = 0;
    anim.bounceOffsetX = 0;
    anim.bounceOffsetY = 0;

    // 切换到地球壁纸
    loadPlanetWallpaper(earthPlanet ? config.starBilliards.planetImagePath + earthPlanet.name + ".png" : "images/earth.png");

    // 更新空间网格
    if (physicsScene.spatialGrid) {
        initSpatialGrid();
        updateSpatialGrid();
    }
}  // end of toggleStarBilliards()


// ========== 帮助图标（星际台球模式下显示） ==========
function _createHelpIcon() {
    // 移除已存在的图标
    _removeHelpIcon();

    const btn = document.getElementById('starBilliardsBtn');
    if (!btn) return;

    // 创建问号图标
    const icon = document.createElement('div');
    icon.id = 'starBilliardsHelpIcon';
    icon.textContent = '?';
    icon.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;' +
        'width:32px;height:32px;border-radius:50%;' +
        'background:rgba(255,255,255,0.9);color:#ff69b4;font-weight:bold;font-size:18px;' +
        'cursor:default;user-select:none;' +
        'border:2px solid #ffb3c2;box-shadow:0 2px 8px rgba(0,0,0,0.15);' +
        'vertical-align:middle;margin-right:8px;';

    // 在按钮左侧插入
    btn.parentNode.insertBefore(icon, btn);
    helpIconEl = icon;

    // 创建 overlay（用于显示帮助图片）
    const overlay = document.createElement('div');
    overlay.id = 'starBilliardsHelpOverlay';
    overlay.style.cssText = 'display:none;position:absolute;z-index:9999;' +
        'pointer-events:none;';
    overlay.innerHTML = '<img id="starBilliardsHelpImg" style="max-width:400px;max-height:300px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);" />';
    document.body.appendChild(overlay);
    helpOverlayEl = overlay;

    // 悬停显示帮助图片
    icon.addEventListener('mouseenter', function () {
        const img = document.getElementById('starBilliardsHelpImg');
        if (!img) return;
        const lang = (typeof currentLang !== 'undefined') ? currentLang : 'zh';
        img.src = (lang === 'en') ? helpEnImg.src : helpCnImg.src;
        overlay.style.display = 'block';
        // 定位到 canvas 背景中心
        const canvas = document.getElementById('myCanvas2');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const overlayRect = overlay.getBoundingClientRect();
            const top = rect.top + window.scrollY + (rect.height - overlayRect.height) / 2;
            const left = rect.left + window.scrollX + (rect.width - overlayRect.width) / 2;
            overlay.style.top = Math.max(10, top) + 'px';
            overlay.style.left = Math.max(10, left) + 'px';
        }
    });
    icon.addEventListener('mouseleave', function () {
        overlay.style.display = 'none';
    });
}

function _removeHelpIcon() {
    if (helpIconEl && helpIconEl.parentNode) {
        helpIconEl.parentNode.removeChild(helpIconEl);
    }
    helpIconEl = null;
    if (helpOverlayEl && helpOverlayEl.parentNode) {
        helpOverlayEl.parentNode.removeChild(helpOverlayEl);
    }
    helpOverlayEl = null;
}


// ========== 星球特殊物理处理 ==========
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