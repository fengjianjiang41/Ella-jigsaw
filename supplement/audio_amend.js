// 预加载所有音频文件
const audioFilesPreload = [
  // 根音频文件夹
  'audio/button.m4a',
  'audio/bouncing.m4a',
  'audio/dragging.m4a',
  'audio/success.m4a',
  'audio/bell1.mp3',
  'audio/bell2.mp3',
  'audio/bell3.mp3',
  'audio/fast.mp3',
  'audio/group.mp3',
  'audio/pagebtn.mp3',
  'audio/jcxbroken.m4a',
  'audio/ballwall.mp3',
  'audio/ballball.mp3',
  'audio/ballglasslong.mp3',
  'audio/ballglassshort.mp3',
  'audio/emo.m4a',
  'audio/ua.m4a',
  'audio/ui.m4a',
  'audio/KevinVillecco-Yoshigemia.mp3',

  // dragging 文件夹
  'audio/dragging/slow1.mp3',
  'audio/dragging/slow2.mp3',
  'audio/dragging/slow3.mp3',
  'audio/dragging/medium1.mp3',
  'audio/dragging/medium2.mp3',
  'audio/dragging/medium3.mp3',
  'audio/dragging/fast1.mp3',
  'audio/dragging/fast2.mp3',
  'audio/dragging/fast3.mp3',
  'audio/dragging/superfast1.mp3',
  'audio/dragging/superfast2.mp3',
  'audio/dragging/superfast3.mp3',

  // water 文件夹
  'audio/water/into1.mp3',
  'audio/water/into2.mp3',
  'audio/water/into3.mp3',
  'audio/water/into4.mp3',
  'audio/water/into5.mp3',
  'audio/water/high1.mp3',
  'audio/water/high2.mp3',
  'audio/water/high3.mp3',
  'audio/water/low1.mp3',
  'audio/water/low2.mp3',
  'audio/water/low3.mp3',
  'audio/water/up1.mp3',
  'audio/water/up2.mp3',
  'audio/water/up3.mp3',
  'audio/water/down1.mp3',
  'audio/water/down2.mp3',
  'audio/water/down3.mp3',
  'audio/water/constant1.mp3',
  'audio/water/constant2.mp3',
  'audio/water/maxuphigh1.mp3',
  'audio/water/maxuphigh2.mp3',
  'audio/water/maxuphigh3.mp3',
  'audio/water/maxuplow1.mp3',
  'audio/water/maxuplow2.mp3',
  'audio/water/maxuplow3.mp3',
  'audio/water/maxdownlow1.mp3',
  'audio/water/maxdownlow2.mp3',
  'audio/water/maxdownlow3.mp3',
  'audio/water/maxdownhigh1.mp3',
  'audio/water/maxdownhigh2.mp3',
  'audio/water/maxdownhigh3.mp3'
];

// ============= 音频系统优化 =============
// 全局音频解锁状态
let audioUnlocked = false;

// 优化的音频池类
class OptimizedAudioPool {
  constructor(options = {}) {
    this.poolSize = options.poolSize || 5;
    this.preloadFiles = options.preloadFiles || [];
    this.pool = [];
    this.availableIndex = 0;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // 预创建音频元素
    for (let i = 0; i < this.poolSize; i++) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 0.5;
      
      this.pool.push({
        element: audio,
        busy: false,
        ready: false
      });
    }

    // 预加载声音文件到内存
    const loadPromises = this.preloadFiles.map(file => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = file;
        audio.preload = 'auto';
        audio.load();
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => resolve(); // 即使出错也继续
        // 超时保护
        setTimeout(resolve, 3000);
      });
    });

    await Promise.all(loadPromises);
    this.initialized = true;
    console.log(`Audio pool initialized with ${this.preloadFiles.length} sounds`);
  }

  getAvailableAudio(soundFile) {
    if (!this.initialized) return null;
    
    // 轮询查找可用音频
    for (let i = 0; i < this.poolSize; i++) {
      const idx = (this.availableIndex + i) % this.poolSize;
      const item = this.pool[idx];
      
      if (!item.busy || item.element.ended) {
        item.busy = true;
        item.element.src = soundFile;
        
        // 设置播放完成后释放
        const onEnded = () => {
          item.busy = false;
          item.element.removeEventListener('ended', onEnded);
        };
        item.element.addEventListener('ended', onEnded);
        
        this.availableIndex = (idx + 1) % this.poolSize;
        return item.element;
      }
    }
    
    // 如果没有可用音频，复用最旧的一个
    const oldestItem = this.pool[this.availableIndex];
    oldestItem.busy = true;
    oldestItem.element.src = soundFile;
    oldestItem.element.currentTime = 0;
    
    const onEnded = () => {
      oldestItem.busy = false;
      oldestItem.element.removeEventListener('ended', onEnded);
    };
    oldestItem.element.addEventListener('ended', onEnded);
    
    this.availableIndex = (this.availableIndex + 1) % this.poolSize;
    return oldestItem.element;
  }

  async play(soundFile, options = {}) {
    if (!audioUnlocked) {
      console.log('Audio not unlocked yet');
      return false;
    }
    
    const audio = this.getAvailableAudio(soundFile);
    if (!audio) return false;
    
    audio.volume = options.volume !== undefined ? options.volume : 0.5;
    audio.playbackRate = options.playbackRate || 1.0;
    
    try {
      await audio.play();
      return true;
    } catch (e) {
      console.log('Audio play failed:', e);
      return false;
    }
  }
}

// 声音节流器
class SoundThrottle {
  constructor(minInterval = 50) {
    this.minInterval = minInterval;
    this.lastPlayTime = new Map();
  }

  canPlay(soundType) {
    const now = Date.now();
    const lastTime = this.lastPlayTime.get(soundType) || 0;
    
    if (now - lastTime >= this.minInterval) {
      this.lastPlayTime.set(soundType, now);
      return true;
    }
    return false;
  }

  reset(soundType) {
    this.lastPlayTime.delete(soundType);
  }
}

// 创建各种音频池实例
let waterObstaclePool, waterWavePool, sprayPool, ballWallPool, ballBallPool, ballGlassPool;
let soundThrottle = new SoundThrottle(30); // 30ms 最小间隔

// 解锁音频系统
async function unlockAudioSystem() {
  if (audioUnlocked) return;
  
  console.log('Unlocking audio system...');
  
  // 创建并播放静音来解锁
  const silentAudio = new Audio();
  silentAudio.volume = 0;
  
  try {
    await silentAudio.play();
    audioUnlocked = true;
    console.log('Audio system unlocked');
  } catch (e) {
    console.log('Audio unlock failed, will retry on user interaction');
  }
  
  // 初始化所有音频池
  waterObstaclePool = new OptimizedAudioPool({
    poolSize: 8,
    preloadFiles: [
      'audio/water/into1.mp3', 'audio/water/into2.mp3', 'audio/water/into3.mp3',
      'audio/water/into4.mp3', 'audio/water/into5.mp3',
      'audio/water/high1.mp3', 'audio/water/high2.mp3', 'audio/water/high3.mp3',
      'audio/water/low1.mp3', 'audio/water/low2.mp3', 'audio/water/low3.mp3'
    ]
  });
  
  waterWavePool = new OptimizedAudioPool({
    poolSize: 6,
    preloadFiles: [
      'audio/water/up1.mp3', 'audio/water/up2.mp3', 'audio/water/up3.mp3',
      'audio/water/down1.mp3', 'audio/water/down2.mp3', 'audio/water/down3.mp3',
      'audio/water/constant1.mp3', 'audio/water/constant2.mp3'
    ]
  });
  
  sprayPool = new OptimizedAudioPool({
    poolSize: 6,
    preloadFiles: [
      'audio/water/maxuphigh1.mp3', 'audio/water/maxuphigh2.mp3', 'audio/water/maxuphigh3.mp3',
      'audio/water/maxuplow1.mp3', 'audio/water/maxuplow2.mp3', 'audio/water/maxuplow3.mp3',
      'audio/water/maxdownlow1.mp3', 'audio/water/maxdownlow2.mp3', 'audio/water/maxdownlow3.mp3',
      'audio/water/maxdownhigh1.mp3', 'audio/water/maxdownhigh2.mp3', 'audio/water/maxdownhigh3.mp3'
    ]
  });
  
  ballWallPool = new OptimizedAudioPool({
    poolSize: 5,
    preloadFiles: ['audio/ballwall.mp3']
  });
  
  ballBallPool = new OptimizedAudioPool({
    poolSize: 3,
    preloadFiles: ['audio/ballball.mp3']
  });
  
  ballGlassPool = new OptimizedAudioPool({
    poolSize: 4,
    preloadFiles: ['audio/ballglasslong.mp3', 'audio/ballglassshort.mp3']
  });
  
  await Promise.all([
    waterObstaclePool.init(),
    waterWavePool.init(),
    sprayPool.init(),
    ballWallPool.init(),
    ballBallPool.init(),
    ballGlassPool.init()
  ]);
  
  console.log('All audio pools initialized');
}

// ============= 原有的加载进度代码 =============
let audioLoadedCount = 0;
let audioTotalCount = audioFilesPreload.length;
let loadingComplete = false;

function updateLoadingProgress() {
  const progress = Math.round((audioLoadedCount / audioTotalCount) * 100);
  const progressBar = document.getElementById('loadingProgress');
  const percentageText = document.getElementById('loadingPercentage');
  const startText = document.getElementById('startText');

  if (progressBar) {
    progressBar.style.width = progress + '%';
  }
  if (percentageText) {
    percentageText.textContent = progress + '%';
  }

  if (audioLoadedCount >= audioTotalCount && !loadingComplete) {
    loadingComplete = true;
    completeLoading();
  }
}

function completeLoading() {
  const loadingBar = document.getElementById('loadingBar');
  const startText = document.getElementById('startText');

  if (loadingBar) {
    loadingBar.style.display = 'none';
  }
  if (startText) {
    startText.style.display = 'flex';
  }

  removeScrollBlock();
}

function loadAudioFiles() {
  audioFilesPreload.forEach(src => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;

    audio.addEventListener('loadeddata', () => {
      audioLoadedCount++;
      updateLoadingProgress();
    });

    audio.addEventListener('error', () => {
      audioLoadedCount++;
      updateLoadingProgress();
    });
  });
}

// ============= 优化的声音播放函数 =============
async function playWaterObstacleSound(collisionIntensity) {
  if (!audioUnlocked || !soundThrottle.canPlay('water_obstacle')) return;
  
  const soundIndex = Math.floor(Math.random() * 5) + 1;
  const soundFile = `audio/water/into${soundIndex}.mp3`;
  const volume = Math.min(Math.pow(collisionIntensity * 0.05, 1.0), 1.0);
  
  await waterObstaclePool.play(soundFile, {
    volume: volume,
    playbackRate: 0.5 + Math.random() * 1
  });
}

async function playSplashSound(velocitySum) {
  if (!audioUnlocked || !soundThrottle.canPlay('splash')) return;
  
  const splashLowThreshold = 50;
  const splashHighThreshold = 200;
  
  let soundType;
  if (velocitySum >= splashHighThreshold) {
    soundType = 'high';
  } else if (velocitySum >= splashLowThreshold) {
    soundType = 'low';
  } else {
    return;
  }
  
  const soundIndex = Math.floor(Math.random() * 3) + 1;
  const soundFile = `audio/water/${soundType}${soundIndex}.mp3`;
  const volume = Math.min(Math.pow(velocitySum * 0.005, 0.7), 1.0);
  
  await waterObstaclePool.play(soundFile, {
    volume: volume,
    playbackRate: 0.9 + Math.random() * 0.2
  });
}

async function playWaveSound(velocityChange) {
  if (!audioUnlocked || !soundThrottle.canPlay('wave')) return;
  
  const waveUpThreshold = 0.05;
  const waveDownThreshold = -0.02;
  
  let soundType;
  if (velocityChange > waveUpThreshold) {
    soundType = 'up';
  } else if (velocityChange <= waveDownThreshold) {
    soundType = 'down';
  } else {
    return;
  }
  
  const soundIndex = Math.floor(Math.random() * 3) + 1;
  const soundFile = `audio/water/${soundType}${soundIndex}.mp3`;
  const volume = Math.min(velocityChange > 0 ? velocityChange * 10 : -velocityChange * 25, 1.0);
  
  await waterWavePool.play(soundFile, {
    volume: volume,
    playbackRate: 0.9 + Math.random() * 0.2
  });
}

async function playConstantSound(velocity) {
  if (!audioUnlocked || !soundThrottle.canPlay('constant')) return;
  
  const constantSoundThreshold = 0.1;
  
  if (velocity <= constantSoundThreshold) return;
  
  const soundIndex = Math.floor(Math.random() * 2) + 1;
  const soundFile = `audio/water/constant${soundIndex}.mp3`;
  const volume = Math.min(Math.pow(velocity * 0.5, 1.5), 1.0);
  
  await waterWavePool.play(soundFile, {
    volume: volume,
    playbackRate: 0.9 + Math.random() * 0.2
  });
}

async function playSpraySound(sprayIntensity) {
  if (!audioUnlocked || !soundThrottle.canPlay('spray')) return;
  
  const sprayUpThresholdLow = 20;
  const sprayUpThresholdHigh = 200;
  const sprayDownThresholdLow = -20;
  const sprayDownThresholdHigh = -200;
  
  let soundType;
  if (sprayIntensity > sprayUpThresholdHigh) {
    soundType = 'maxuphigh';
  } else if (sprayIntensity > sprayUpThresholdLow) {
    soundType = 'maxuplow';
  } else if (sprayIntensity < sprayDownThresholdHigh) {
    soundType = 'maxdownhigh';
  } else if (sprayIntensity < sprayDownThresholdLow) {
    soundType = 'maxdownlow';
  } else {
    return;
  }
  
  const soundIndex = Math.floor(Math.random() * 3) + 1;
  const soundFile = `audio/water/${soundType}${soundIndex}.mp3`;
  const volume = Math.min(Math.pow(Math.abs(sprayIntensity) * 0.001, 0.2), 1.0);
  
  await sprayPool.play(soundFile, {
    volume: volume,
    playbackRate: 0.5 + Math.random() * 1
  });
}

async function playBallWallSound(normalMomentum) {
  if (!audioUnlocked) return;
  
  const volume = Math.min(Math.pow(Math.abs(normalMomentum), 2), 1) * 0.8;
  await ballWallPool.play('audio/ballwall.mp3', { volume });
}

async function playBallBallSound(normalMomentum) {
  if (!audioUnlocked) return;
  
  const volume = Math.min(Math.pow(Math.abs(normalMomentum), 2), 1);
  
  if (physicsScene.gravityEnabled && volume < 0.1) return;
  
  await ballBallPool.play('audio/ballball.mp3', { volume });
}

async function playBallGlassSound(normalVel) {
  if (!audioUnlocked) return;
  
  const velocityThreshold = 5.0;
  const absNormalVel = Math.abs(normalVel);
  const soundFile = absNormalVel > velocityThreshold ? 'audio/ballglasslong.mp3' : 'audio/ballglassshort.mp3';
  const volume = Math.min(absNormalVel * 0.2, 1.0);
  
  await ballGlassPool.play(soundFile, {
    volume: volume,
    playbackRate: 0.8 + Math.random() * 0.4
  });
}