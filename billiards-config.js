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
    G: 4,                // 万有引力常数
    gravityEnabled: true,  // 是否启用球体间引力
    minDistance: 0.01,     // 避免除零的最小距离
    // 阻力（每秒减少的比例，0=无阻力，1=瞬间停止）
    linearDamping: 0.05,    // 平动阻尼系数
    angularDamping: 0.10,  // 转动阻尼系数
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
    normalAdjustment: 2.5,       // 法向冲量调整系数
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
    cueHit: {
      maxSize: 3,
      src: "audio/cue.mp3",
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
      satellite: "images/satellite.png",  // 卫星球图片
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

  // ========== 星际台球模式 ==========
  starBilliards: {
    // 点位配置
    pocketMargin: 0.006,        // 点位距边缘的距离
    pocketRadius: 0.012,        // 点位半径
    pocketSideOffset: 0.004,    // 侧边点位偏移量
    pocketTriggerRadius: 0.05, // 球被口袋吸入的触发半径
    
    // 球桌布局
    triangleStartX: 0.65,       // 三角形起始位置（占宽度比例）
    triangleStartY: 0.5,        // 三角形中心Y位置（占高度比例）
    ballSpacingRatio: 2.1,      // 球间距与半径的比例
    targetBallRadiusRatio: 0.85, // 目标球半径与主球半径的比例
    triangleRows: 1,            // 三角形行数（5行=15球）
    
    // 主球位置
    cueBallX: 0.25,             // 主球X位置（占宽度比例）
    cueBallY: 0.5,              // 主球Y位置（占高度比例）
    
    // 星球配置（包含物理参数倍率和特殊模式）
    planets: [
      {
        name: "mercury", color: "#C0C0C0", nameCN: "水星",
        physicsMultipliers: {
          linearDamping: 10.0,
          angularDamping: 10.0,
          gravity: 1.0,
          restitution: 1.0,
        },
        mode: "damped",  // 高阻力模式
      },
      {
        name: "venus", color: "#FFE55C", nameCN: "金星",
        physicsMultipliers: {
          linearDamping: 1.0,
          angularDamping: 1.0,
          gravity: 1.0,
          restitution: 1.0,
        },
        mode: "vShaped",  // V型势能模式
        vShapedParams: {
          equilibriumDist: 0.08,  // 平衡距离
          wellDepth: 2.0,         // 势阱深度
          repulsionRange: 0.03,   // 排斥范围
        },
      },
      {
        name: "earth", color: "#4B7BE5", nameCN: "地球",
        physicsMultipliers: {
          linearDamping: 1.0,
          angularDamping: 1.0,
          gravity: 1.0,
          restitution: 1.0,
        },
        mode: "normal",  // 正常模式
      },
      {
        name: "mars", color: "#E54B4B", nameCN: "火星",
        physicsMultipliers: {
          linearDamping: 1.0,
          angularDamping: 1.0,
          gravity: 1.0,
          restitution: 2.0,  // 弹性系数2
        },
        mode: "superBounce",  // 超级弹跳模式
      },
      {
        name: "jupiter", color: "#FFA500", nameCN: "木星",
        physicsMultipliers: {
          linearDamping: 1.0,
          angularDamping: 1.0,
          gravity: 1.0,
          restitution: 1.0,
        },
        mode: "momentumSwap",  // 动量交换模式
        swapInterval: 1.0,  // 每秒交换
      },
      {
        name: "saturn", color: "#B8860B", nameCN: "土星",
        physicsMultipliers: {
          linearDamping: 1.0,
          angularDamping: 1.0,
          gravity: 1.0,
          restitution: 1.0,
        },
        mode: "ballEjector",  // 吐球模式
        ejectCount: 2,  // 吐出前2个进球
      },
    ],
    planetImagePath: "images/billiards/",
  },

  // ========== 星球物理模式 ==========
  // 当前星球模式使用的物理参数（由 planets 配置的倍率计算）
  planetPhysics: {
    currentPlanet: "earth",  // 当前激活的星球
    // 运行时计算的参数（基础参数 * 倍率）
    linearDamping: 0.5,
    angularDamping: 1.0,
    gravity: 4,
    restitution: 1.0,
  },

  // ========== 虚拟球杆配置 ==========
  cueStick: {
    idleSpeedThreshold: 0.5,    // cueball 速度低于此值可击打
    stickLength: 0.28,          // 球杆固定长度（sim 坐标）
    maxChargeDistance: 0.8,    // 最大蓄力距离
    chargeSpeed: 0.8,          // 蓄力速度（每秒增加的距离）
    hitPower: 8.0,              // 击打功率（将蓄力距离转换为速度）
    cueBallRadius: 0.0165,      // cueball 半径
    interactRadius: 1.5,       // 可交互半径（相对于 cueball）
    ringColor: "#ffffff",       // 白圆圈颜色
    stickColor: "#ffffff",      // 球杆颜色
    stickWidth: 0.005,          // 球杆宽度（sim 坐标）
  },

  // ========== 空间网格配置 ==========
  spatialGrid: {
    cellSize: 0.05,             // 网格单元大小
  },

  // ========== 对决环节配置 ==========
  duel: {
    // 月球初始属性
    moonRadiusRatio: 0.8,       // 月球初始半径与 cueball 半径的比例
    moonDensity: 0.4,           // 月球密度（用于计算质量）
    moonInitialVel: { x: 0, y: 0 },  // 月球初始速度
    
    // 月球大小变化参数
    growthRate: 0.001,          // 每秒自然增长速率
    collisionGrowth: 1.01,       // 与 cueball 碰撞时的增长倍数
    wallShrink: 0.9,            // 撞墙时的缩小倍数
    
    // 保护机制
    ejectProtection: 2.0,       // 生成后的保护时间（秒）
  },
};

// 导出到全局
window.BILLIARDS_CONFIG = BILLIARDS_CONFIG;