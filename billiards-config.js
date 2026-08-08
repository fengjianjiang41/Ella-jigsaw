// ============================================================
// 台球游戏物理参数配置 (Billiards Physics Configuration)
// ============================================================
// 修改此文件中的参数即可调整游戏物理效果
// ============================================================

const BILLIARDS_CONFIG = {
  // ========== 画布与坐标系统 ==========
  canvas: {
    width: 1000,           // 画布实际像素宽度
    height: 500,           // 画布实际像素高度
    simMinWidth: 2.0,      // 模拟世界最小宽度（用于计算缩放比）
  },

  // ========== 物理模拟 ==========
  physics: {
    dt: 1.0 / 60.0,        // 时间步长（秒）
    gravity: { x: 0.0, y: 0.0 },  // 恒定重力加速度
    restitution: 1.0,      // 弹性系数（0=完全非弹性, 1=完全弹性）
    G: 9.8,                // 万有引力常数
    gravityEnabled: true,  // 是否启用球体间引力
    minDistance: 0.01,     // 避免除零的最小距离
  },

  // ========== 球配置 ==========
  balls: {
    count: 3,              // 球体总数
    draggableIndex: 2,     // 可拖拽球的索引
    // 每个球的半径比例（相对于 simMinWidth）
    radiusRatios: [0.032, 0.0165, 0.02],  // 球0(大), 球1(小), 球2(拖拽)
    initialVelocity: { x: 0.0, y: 0.0 },  // 初始速度
  },

  // ========== 碰撞响应 ==========
  collision: {
    ballBallFriction: 0.5,       // 球-球摩擦系数
    ballWallFriction: 0.5,       // 球-墙摩擦系数
    normalAdjustment: 2.0,       // 法向冲量调整系数
    tangentVelThreshold: 0.001,  // 切向速度阈值（低于此值不应用摩擦）
    soundVolumeThreshold: 0.1,  // 球-球音效触发音量阈值
  },

  // ========== 音效参数 ==========
  sound: {
    enabled: false,
    ballBallAdjustment: 5000,   // 球-球碰撞音效调整系数
    ballWallAdjustment: 100,    // 球-墙碰撞音效调整系数
    ballWallFinalAdjustment: 0.8,  // 球-墙音效最终音量调整
    glassVelocityThreshold: 5.0,  // 玻璃碰撞长短音阈值
    glassVolumeScale: 0.2,      // 玻璃碰撞音量缩放
    pitchRandomMin: 0.8,        // 音高随机最小值
    pitchRandomMax: 1.2,        // 音高随机最大值
  },

  // ========== 音效池配置 ==========
  audioPools: {
    ballWall: {
      maxSize: 10,
      src: "audio/ballwall.mp3",
    },
    ballBall: {
      maxSize: 3,
      src: "audio/ballball.mp3",
    },
    ballGlass: {
      maxSize: 10,
      longSrc: "audio/ballglasslong.mp3",
      shortSrc: "audio/ballglassshort.mp3",
    },
  },

  // ========== 图片资源 ==========
  images: {
    balls: {
      bun: "images/bun_white.png",     // 拖拽球图片
      earth: "images/earth.png",       // 大球图片
      moon: "images/moon.png",         // 小球图片
    },
    wallpapers: [
      "images/wp1.jpg",
      "images/wp2.jpg",
      "images/wp3.jpg",
      "images/wp4.jpg",
      "images/wp5.jpg",
    ],
    wallpaperSourceSize: { w: 1344, h: 768 },  // 壁纸原始尺寸
  },
};

// 导出到全局
window.BILLIARDS_CONFIG = BILLIARDS_CONFIG;
