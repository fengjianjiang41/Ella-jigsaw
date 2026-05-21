// 预加载所有音频文件
const audioFilesPreload = [
  // 根音频文件夹
  "audio/button.m4a",
  "audio/bouncing.m4a",
  "audio/dragging.m4a",
  "audio/success.m4a",
  "audio/bell1.mp3",
  "audio/bell2.mp3",
  "audio/bell3.mp3",
  "audio/fast.mp3",
  "audio/group.mp3",
  "audio/pagebtn.mp3",
  "audio/jcxbroken.m4a",
  "audio/ballwall.mp3",
  "audio/ballball.mp3",
  "audio/ballglasslong.mp3",
  "audio/ballglassshort.mp3",
  "audio/emo.m4a",
  "audio/ua.m4a",
  "audio/ui.m4a",
  "audio/KevinVillecco-Yoshigemia.mp3",
  "audio/open.mp3",
  "audio/close.mp3",
  "audio/autoopen.mp3",
  "audio/autoclose.mp3",

  // music 文件夹
  "audio/music/A3.mp3",
  "audio/music/A4.mp3",
  "audio/music/A5.mp3",
  "audio/music/B3.mp3",
  "audio/music/B4.mp3",
  "audio/music/B5.mp3",
  "audio/music/C3.mp3",
  "audio/music/C4.mp3",
  "audio/music/C5.mp3",
  "audio/music/C6.mp3",
  "audio/music/D3.mp3",
  "audio/music/D4.mp3",
  "audio/music/D5.mp3",
  "audio/music/E3.mp3",
  "audio/music/E4.mp3",
  "audio/music/E5.mp3",
  "audio/music/F3.mp3",
  "audio/music/F4.mp3",
  "audio/music/F5.mp3",
  "audio/music/G3.mp3",
  "audio/music/G4.mp3",
  "audio/music/G5.mp3",
  "audio/music/sA3.mp3",
  "audio/music/sA4.mp3",
  "audio/music/sA5.mp3",
  "audio/music/sC3.mp3",
  "audio/music/sC4.mp3",
  "audio/music/sC5.mp3",
  "audio/music/sD3.mp3",
  "audio/music/sD4.mp3",
  "audio/music/sD5.mp3",
  "audio/music/sF3.mp3",
  "audio/music/sF4.mp3",
  "audio/music/sF5.mp3",
  "audio/music/sG3.mp3",
  "audio/music/sG4.mp3",
  "audio/music/sG5.mp3",

  // water 文件夹
  "audio/water/into1.mp3",
  "audio/water/into2.mp3",
  "audio/water/into3.mp3",
  "audio/water/into4.mp3",
  "audio/water/into5.mp3",
  "audio/water/high1.mp3",
  "audio/water/high2.mp3",
  "audio/water/high3.mp3",
  "audio/water/low1.mp3",
  "audio/water/low2.mp3",
  "audio/water/low3.mp3",
  "audio/water/up1.mp3",
  "audio/water/up2.mp3",
  "audio/water/up3.mp3",
  "audio/water/down1.mp3",
  "audio/water/down2.mp3",
  "audio/water/down3.mp3",
  "audio/water/constant1.mp3",
  "audio/water/constant2.mp3",
  "audio/water/maxuphigh1.mp3",
  "audio/water/maxuphigh2.mp3",
  "audio/water/maxuphigh3.mp3",
  "audio/water/maxuplow1.mp3",
  "audio/water/maxuplow2.mp3",
  "audio/water/maxuplow3.mp3",
  "audio/water/maxdownlow1.mp3",
  "audio/water/maxdownlow2.mp3",
  "audio/water/maxdownlow3.mp3",
  "audio/water/maxdownhigh1.mp3",
  "audio/water/maxdownhigh2.mp3",
  "audio/water/maxdownhigh3.mp3",
];

let audioLoadedCount = 0;
let audioTotalCount = audioFilesPreload.length;

let imageLoadedCount = 0;
let imageTotalCount = 100;

let loadingComplete = false;

// Paintings image paths (source2) - will be populated dynamically
const paintingImages = [];

// Track if current source2 paintings are all solved
let currentSource2AllSolved = false;

// Solved paintings storage with difficulty tracking
function getSolvedPaintings() {
  const stored = localStorage.getItem("jigsaw_solved_paintings");
  return stored ? JSON.parse(stored) : {};
}

function addSolvedPainting(imagePath, difficulty) {
  const solved = getSolvedPaintings();
  // Extract the number from the path (e.g., "images/paintings/1.jpg" -> "1")
  const match = imagePath.match(/images\/paintings\/(\d+)\.jpg/);
  if (match) {
    const num = match[1];
    // Only update if this is a higher difficulty than previously recorded
    if (!solved[num] || difficulty > solved[num].difficulty) {
      solved[num] = {
        difficulty: difficulty,
        timestamp: Date.now(),
      };
      localStorage.setItem("jigsaw_solved_paintings", JSON.stringify(solved));
    }
  }
}

function isPaintingSolved(imagePath) {
  const solved = getSolvedPaintings();
  const match = imagePath.match(/images\/paintings\/(\d+)\.jpg/);
  return match && solved.hasOwnProperty(match[1]);
}

function getPaintingHighestDifficulty(imagePath) {
  const solved = getSolvedPaintings();
  const match = imagePath.match(/images\/paintings\/(\d+)\.jpg/);
  if (match && solved.hasOwnProperty(match[1])) {
    return solved[match[1]].difficulty;
  }
  return 0;
}

function getPaintingSolveTime(imagePath) {
  const solved = getSolvedPaintings();
  const match = imagePath.match(/images\/paintings\/(\d+)\.jpg/);
  if (match && solved.hasOwnProperty(match[1])) {
    return solved[match[1]].timestamp;
  }
  return 0;
}

// Check if all current source2 paintings are solved
function checkSource2AllSolved() {
  if (currentSource !== 2) return false;
  return imagePaths.every((img) => isPaintingSolved(img));
}

// Get solved count for source2
function getSource2SolvedCount() {
  const solved = getSolvedPaintings();
  return Object.keys(solved).length;
}

function initPaintingImages() {
  for (let i = 1; i <= imageTotalCount; i++) {
    const img = new Image();
    const src = `images/paintings/${i}.jpg`;
    img.src = src;

    img.addEventListener("load", () => {
      paintingImages.push(src);
      imageLoadedCount++;
      updateLoadingProgress();
    });
  }
}

function updateLoadingProgress() {
  const progress = (audioLoadedCount + imageLoadedCount) / (audioTotalCount + imageTotalCount);
  const percentage = Math.round(progress * 100);
  console.log("", percentage);
  const progressBar = document.getElementById("loadingProgress");
  const percentageText = document.getElementById("loadingPercentage");
  const startText = document.getElementById("startText");

  if (progressBar) {
    progressBar.style.width = percentage + "%";
  }
  if (percentageText) {
    percentageText.textContent = percentage + "%";
  }

  if (
    audioLoadedCount + imageLoadedCount >= audioTotalCount + imageTotalCount &&
    !loadingComplete
  ) {
    loadingComplete = true;
    completeLoading();
  }
}

function completeLoading() {
  console.log("Reached");
  // Stop loading text toggle
  stopLoadingTextToggle();
  const loadingBar = document.getElementById("loadingBar");
  const startText = document.getElementById("startText");

  if (loadingBar) {
    loadingBar.style.display = "none";
  }
  if (startText) {
    startText.style.display = "flex";
  }

  // 移除滚动阻止
  removeScrollBlock();
}

function loadAudioFiles() {
  audioFilesPreload.forEach((src) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;

    audio.addEventListener("loadeddata", () => {
      audioLoadedCount++;
      updateLoadingProgress();
    });

    audio.addEventListener("error", () => {
      // Even if there's an error, count it as loaded to avoid blocking
      audioLoadedCount++;
      updateLoadingProgress();
    });
  });
}

// Start loading audio files when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // 初始隐藏startText
  const startText = document.getElementById("startText");
  if (startText) {
    startText.style.display = "none";
  }
  // Start loading text toggle
  startLoadingTextToggle();
  initPaintingImages();
  loadAudioFiles();
});

// Default image paths (source1)
const defaultImagePaths = [
  "images/eureka.png",
  "images/apple.png",
  "images/hongbao.png",
];

// Current image paths being used
let imagePaths = [...defaultImagePaths];
const audioFiles = ["audio/emo.mp3", "audio/ua.mp3", "audio/ui.mp3"];
let bunClickCount = 0;

let confirmBtnClicked = false;

let currentLang = "zh"; // Default language: Chinese

// Loading text toggle variables
let loadingTextIndex = 0;
let loadingTextInterval = null;
const loadingTexts = {
  zh: ["加载中……", "初次加载请耐心等候"],
  en: ["loading...", "patience for first loading"]
};

// Function to start loading text toggle
function startLoadingTextToggle() {
  if (loadingTextInterval) return;
  const loadingElement = document.querySelector("#loadingBar div:first-child");
  console.log(loadingElement);
  if (!loadingElement) return;
  console.log(loadingTexts[currentLang]);

  loadingTextInterval = setInterval(() => {
    loadingTextIndex = (loadingTextIndex + 1) % 2;
    loadingElement.textContent = loadingTexts[currentLang][loadingTextIndex];
  }, 5000);
}

// Function to stop loading text toggle
function stopLoadingTextToggle() {
  if (loadingTextInterval) {
    clearInterval(loadingTextInterval);
    loadingTextInterval = null;
    console.log("Loading text toggle stopped");
  }
}

// Sliding text animation variables
let slidingTrack = null;
let slidingAnimationId = null;
let slidingOffset = 0;
let slidingTextWidth = 0; // Store calculated text width

// Function to get current sliding text content
function getSlidingTextContent() {
  return currentLang === "zh" ? "移山工作室出品" : "Made by Moventertain Studio";
}

// Function to initialize sliding text
function initSlidingText() {
  const container = document.getElementById('slidingTextContainer');
  slidingTrack = document.getElementById('slidingTrack');
  if (!container || !slidingTrack) return;

  // Clear existing content
  slidingTrack.innerHTML = '';
  slidingOffset = 0;

  // Calculate text width and fill the track
  const tempSpan = document.createElement('span');
  tempSpan.className = 'sliding-text';
  tempSpan.textContent = getSlidingTextContent();
  document.body.appendChild(tempSpan);
  slidingTextWidth = tempSpan.offsetWidth + 20; // Include margin
  document.body.removeChild(tempSpan);

  // Fill the track with enough text instances
  const containerWidth = container.offsetWidth;
  const instancesNeeded = Math.ceil(containerWidth / slidingTextWidth) + 2;

  for (let i = 0; i < instancesNeeded; i++) {
    const span = document.createElement('span');
    span.className = 'sliding-text';
    span.textContent = getSlidingTextContent();
    slidingTrack.appendChild(span);
  }

  // Start animation
  startSlidingAnimation();
}

// Function to start sliding animation
function startSlidingAnimation() {
  if (!slidingTrack) return;

  const animate = () => {
    slidingOffset -= 0.5; // Slow speed
    slidingTrack.style.transform = `translateX(${slidingOffset}px)`;

    // Check if we need to add/remove elements
    if (slidingOffset <= -slidingTextWidth) {
      // Remove leftmost element
      if (slidingTrack.firstChild) {
        slidingTrack.removeChild(slidingTrack.firstChild);
      }
      // Add new rightmost element
      const span = document.createElement('span');
      span.className = 'sliding-text';
      span.textContent = getSlidingTextContent();
      slidingTrack.appendChild(span);
      slidingOffset += slidingTextWidth;
    }

    slidingAnimationId = requestAnimationFrame(animate);
  };

  animate();
}

// Function to stop sliding animation
function stopSlidingAnimation() {
  if (slidingAnimationId) {
    cancelAnimationFrame(slidingAnimationId);
    slidingAnimationId = null;
  }
}

// Function to update sliding text based on language
function updateSlidingText() {
  const container = document.getElementById('slidingTextContainer');
  if (!container || !container.classList.contains('visible')) return;

  // Stop current animation
  stopSlidingAnimation();

  // Reinitialize with new language
  initSlidingText();
}

// Door button state management
let source2VisitedCount = 0;
let doorAnimationInterval = null;

function getSource2SolvedCount() {
  const solved = getSolvedPaintings();
  return Object.keys(solved).length;
}

function stopDoorAnimation() {
  if (doorAnimationInterval) {
    clearInterval(doorAnimationInterval);
    doorAnimationInterval = null;
  }
}

function startDoorAnimation(period) {
  stopDoorAnimation();
  let isOpen = false;
  let volume = Math.pow(0.95, (10 * 1000) / period);
  doorAnimationInterval = setInterval(() => {
    isOpen = !isOpen;
    const doorImg = document.getElementById("doorImg");
    if (doorImg) {
      doorImg.src = isOpen ? "images/open.png" : "images/close.png";
      // Play auto open/close audio
      playSFX(isOpen ? "audio/autoopen.mp3" : "audio/autoclose.mp3", volume);
    }
  }, period);
}

function updateDoorButtonState(mode) {
  const solvedCount = getSource2SolvedCount();
  const doorImg = document.getElementById("doorImg");

  // Update visited count to catch up with solved count
  if (source2VisitedCount < solvedCount && mode === "click") {
    source2VisitedCount = solvedCount;
    localStorage.setItem(
      "jigsaw_source2_visited",
      source2VisitedCount.toString(),
    );
  }

  const difference = solvedCount - source2VisitedCount;

  if (difference > 0 && doorImg) {
    // Start animation: period = 10 seconds / difference
    const period = (10 * 1000) / difference; // Minimum 100ms
    startDoorAnimation(period);
  } else {
    // Stop animation and reset to closed state
    stopDoorAnimation();
    if (doorImg) {
      doorImg.src = "images/close.png";
    }
  }
}

// Difficulty settings
let currentDifficulty = 1; // 1: 休闲, 2: 普通, 3: 困难, 4: 炼狱
let difficultySelected = false; // 标记是否已选择难度
let difficulty4Unlocked = false; // 标记难度4是否已解锁
let difficulty3SolvedOnce = false; // 标记难度3是否已解决一次

// Piano note bouncing sound variables
let noteIndex = 0;
let currentSong = [];
let currentSongKey = null; // Track the current song key

// Combo mechanism variables
let maxCombo = 0;
let currentCombo = 0;
let comboLimit = 10000; // 2 seconds combo limit
let lastMergeTime = 0;
let comboAnimations = []; // Track active combo animations

// Initialize combo at the start of a new round
function initCombo() {
  maxCombo = 0;
  currentCombo = 0;
  lastMergeTime = 0;
}

// Handle combo when a piece is merged
function handleCombo(puzzleIdx, piece) {
  // Check if the dragged piece has ever been merged before
  // If so, don't increase combo
  if (piece.hasMerged) return;

  const now = Date.now();

  // Mark this piece as having been merged
  piece.hasMerged = true;

  // Check if within combo time limit
  if (now - lastMergeTime <= comboLimit && lastMergeTime > 0) {
    currentCombo++;
    // Update max combo if exceeded
    if (currentCombo > maxCombo) {
      maxCombo = currentCombo;
    }
  } else {
    // Reset combo if time limit exceeded
    currentCombo = 1;
  }

  // Update last merge time
  lastMergeTime = now;

  // Show combo text above the merged piece
  showComboText(currentCombo, puzzleIdx, piece);

  // Update combo display on page buttons
  updateComboDisplay();
}

// Show combo text animation above the merged piece
function showComboText(currentCombo, puzzleIdx, piece) {
  if (currentCombo === 1) return;
  const canvas = canvases[puzzleIdx];
  const rect = canvas.getBoundingClientRect();

  // Calculate position - center of the merged piece on screen
  // const screenX = piece.x;
  // const screenY = piece.y;
  const screenX = rect.left + (piece.x / canvas.width) * rect.width + pieceXSize / 4;
  const screenY = rect.top + (piece.y / canvas.height) * rect.height;

  // Create combo text element
  const comboElement = document.createElement('div');
  comboElement.className = 'combo-text';
  comboElement.textContent = 'ComBo!';
  comboElement.style.left = screenX + 'px';
  comboElement.style.top = screenY + 'px';
  comboElement.style.transform = 'translate(-50%, -100%)';
  comboElement.style.opacity = '1';

  document.body.appendChild(comboElement);

  // Add to active animations
  const animationId = Date.now();
  comboAnimations.push({ id: animationId, element: comboElement });

  // Animate opacity from 1 to 0 over comboLimit duration
  const startTime = Date.now();
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / comboLimit, 1);
    comboElement.style.opacity = (1 - progress).toString();

    // Move text upward
    const riseDistance = 50;
    comboElement.style.top = (screenY - progress * riseDistance) + 'px';

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Remove element and clean up
      document.body.removeChild(comboElement);
      comboAnimations = comboAnimations.filter(a => a.id !== animationId);
    }
  };

  requestAnimationFrame(animate);
}

// Add new variables for combo animation
let comboAnimationFrame = null;
let lastComboUpdateTime = 0;
let flashingButtons = []; // Track all flashing buttons

// Update combo display on the currently active page button
function updateComboDisplay() {
  const confirmBtn = document.getElementById('confirmBtn');
  const activeBtn = document.querySelector('.page-btn.active');
  const allPageBtns = document.querySelectorAll('.page-btn');

  // // Restore images for all buttons (including active one if combo is 0)
  // allPageBtns.forEach(btn => {
  //   // Stop flashing for non-active buttons
  //   if (!btn.classList.contains('active')) {
  //     stopFlashingForButton(btn);
  //     restoreButtonImage(btn);
  //   }
  // });

  if (!confirmBtn || !activeBtn) return;

  if (confirmBtn.disabled && currentCombo > 0) {
    // Show combo count on active page button
    showComboOnButton(activeBtn);

    // Start combo animation loop
    startComboAnimation();
  } else {
    // Restore page button image
    // stopFlashingForButton(activeBtn);
    // restoreButtonImage(activeBtn);

    // Stop combo animation
    // stopComboAnimation();
  }
}

// Show combo text on a button
function showComboOnButton(btn) {
  btn.classList.add('combo-display');
  btn.classList.remove('combo-flashing');
  // Remove any existing inner text element
  const existingInner = btn.querySelector('.combo-text-inner');
  if (existingInner) {
    btn.removeChild(existingInner);
  }
  // Create inner element for combo text
  const innerText = document.createElement('span');
  innerText.className = 'combo-text-inner';
  innerText.textContent = currentCombo.toString();
  btn.innerHTML = '';
  btn.appendChild(innerText);
  // Remove background image when showing combo
  btn.style.backgroundImage = 'none';
}

// Stop flashing for a specific button
function stopFlashingForButton(btn) {
  btn.classList.remove('combo-flashing');
  btn.classList.remove('combo-display');
  btn.style.animationDuration = '';
  // Remove inner text element
  const innerText = btn.querySelector('.combo-text-inner');
  if (innerText) {
    btn.removeChild(innerText);
  }
  btn.textContent = '';
}

// Restore button image
function restoreButtonImage(btn) {
  btn.style.backgroundImage = '';
  btn.style.color = '';
}

// Clear combo and reset display
function clearCombo() {
  currentCombo = 0;
  lastMergeTime = 0;

  // Stop all flashing buttons
  // const allPageBtns = document.querySelectorAll('.page-btn');
  // allPageBtns.forEach(btn => {
  //   stopFlashingForButton(btn);
  //   restoreButtonImage(btn);
  // });

  updateComboDisplay();

  // Remove all active combo animations
  comboAnimations.forEach(anim => {
    if (anim.element.parentNode) {
      document.body.removeChild(anim.element);
    }
  });
  comboAnimations = [];
}

// Start combo animation
function startComboAnimation() {
    if (comboAnimationFrame) return;
    
    const activeBtn = document.querySelector('.page-btn.active');
    if (!activeBtn) return;
    
    const animateCombo = () => {
        // Check if still on active button
        const currentActiveBtn = document.querySelector('.page-btn.active');
        if (currentActiveBtn !== activeBtn) {
            // Button is no longer active, stop animating it
            stopFlashingForButton(activeBtn);
            restoreButtonImage(activeBtn);
            // Start animation on new active button if combo still active
            if (currentActiveBtn && currentCombo > 0) {
                showComboOnButton(currentActiveBtn);
                startComboAnimation();
            }
            return;
        }
        
        const elapsed = Date.now() - lastMergeTime;
        const halfLimit = comboLimit / 2; // 5000ms
        
        if (elapsed >= comboLimit) {
            stopComboAnimation();
            // Restore button image after combo ends
            restoreButtonImage(activeBtn);
            return;
        }
        
        if (elapsed < halfLimit) {
            // First half: Gradually change color from #ff8fab to #ffb3c2
            const progress = elapsed / halfLimit;
            // #ff8fab -> #ffb3c2
            const r = 255;
            const g = Math.round(137 + progress * (179 - 137)); // 137 -> 179
            const b = Math.round(171 + progress * (194 - 171)); // 171 -> 194
            const innerText = activeBtn.querySelector('.combo-text-inner');
            if (innerText) {
                innerText.style.color = `rgb(${r}, ${g}, ${b})`;
            }
            activeBtn.classList.remove('combo-flashing');
        } else {
            // Second half: Black color with flashing
            const innerText = activeBtn.querySelector('.combo-text-inner');
            if (innerText) {
                innerText.style.color = '#000000';
            }
            activeBtn.classList.add('combo-flashing');
            
            // Calculate flash frequency (1Hz to 5Hz)
            const flashProgress = (elapsed - halfLimit) / halfLimit;
            const frequency = 1 + flashProgress * 4; // 1Hz -> 5Hz
            const period = 1000 / frequency;
            
            // Update animation duration dynamically on inner text
            const comboTextInner = activeBtn.querySelector('.combo-text-inner');
            if (comboTextInner) {
                comboTextInner.style.animationDuration = `${period / 2}ms`;
            }
        }
        
        comboAnimationFrame = requestAnimationFrame(animateCombo);
    };
    
    animateCombo();
}

// Stop combo animation
function stopComboAnimation() {
    if (comboAnimationFrame) {
        cancelAnimationFrame(comboAnimationFrame);
        comboAnimationFrame = null;
    }
    
    const activeBtn = document.querySelector('.page-btn.active');
    const innerText = activeBtn.querySelector('.combo-text-inner');
    if (activeBtn) {
        activeBtn.classList.remove('combo-flashing');
        activeBtn.style.animationDuration = '';
    }
    activeBtn.removeChild(innerText);
}

// Available songs
const songs = {
  twinkle: [
    "C4",
    "C4",
    "G4",
    "G4",
    "A4",
    "A4",
    "G4",
    "F4",
    "F4",
    "E4",
    "E4",
    "D4",
    "D4",
    "C4",
    "G4",
    "G4",
    "F4",
    "F4",
    "E4",
    "E4",
    "D4",
    "G4",
    "G4",
    "F4",
    "F4",
    "E4",
    "E4",
    "D4",
    "C4",
    "C4",
    "G4",
    "G4",
    "A4",
    "A4",
    "G4",
    "F4",
    "F4",
    "E4",
    "E4",
    "D4",
    "D4",
    "C4",
  ], // Twinkle Twinkle Little Star
  minuet: [
    "D5",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "G4",
    "G4",
    "E5",
    "C5",
    "D5",
    "E5",
    "sF5",
    "G5",
    "G4",
    "G4",
    "C5",
    "D5",
    "C4",
    "B4",
    "A4",
    "B4",
    "C4",
    "B4",
    "A4",
    "G4",
    "F4",
    "G4",
    "A4",
    "B4",
    "G4",
    "B4",
    "A4",
  ], // Minuets in G major and G minor
  furElise: [
    "E5",
    "sD5",
    "E5",
    "sD5",
    "E5",
    "B4",
    "D5",
    "C5",
    "A4",
    "C4",
    "E4",
    "A4",
    "B4",
    "E4",
    "sG4",
    "B4",
    "C5",
    "E4",
    "E5",
    "sD5",
    "E5",
    "sD5",
    "E5",
    "B4",
    "D5",
    "C5",
    "A4",
    "C4",
    "E4",
    "A4",
    "B4",
    "E4",
    "C5",
    "B4",
    "A4",
  ], // Fur Elise
  entertainer: [
    "D4",
    "sD4",
    "E4",
    "C5",
    "E4",
    "C5",
    "E4",
    "C5",
    "C5",
    "D5",
    "sD5",
    "E5",
    "C5",
    "D5",
    "E5",
    "B4",
    "D5",
    "C5",
    "D5",
    "sD5",
    "E4",
    "C5",
    "E4",
    "C5",
    "E4",
    "C5",
    "A4",
    "G4",
    "sF4",
    "A4",
    "C5",
    "E5",
    "D5",
    "C5",
    "A4",
    "D5",
    "D4",
    "sD4",
    "E4",
    "C5",
    "E4",
    "C5",
    "E4",
    "C5",
    "C5",
    "D5",
    "sD5",
    "E5",
    "C5",
    "D5",
    "E5",
    "B4",
    "D5",
    "C5",
    "C5",
    "D5",
    "E5",
    "C5",
    "D5",
    "E5",
    "C5",
    "D5",
    "C5",
    "E5",
    "C5",
    "D5",
    "E5",
    "C5",
    "D5",
    "C5",
    "E5",
    "C5",
    "D5",
    "E5",
    "B4",
    "D5",
    "C5",
  ], // The Entertainer
  rondoAllaTurca: [
    "B4",
    "A4",
    "sG4",
    "A4",
    "C5",
    "D5",
    "C5",
    "B4",
    "C5",
    "E5",
    "F5",
    "E5",
    "sD5",
    "E5",
    "B5",
    "A5",
    "sG5",
    "A5",
    "B5",
    "A5",
    "sG5",
    "A5",
    "C6",
    "A5",
    "C6",
    "B5",
    "A5",
    "G5",
    "A5",
    "B5",
    "A5",
    "G5",
    "A5",
    "B5",
    "A5",
    "G5",
    "sF5",
    "E5",
    "B4",
    "A4",
    "sG4",
    "A4",
    "C5",
    "D5",
    "C5",
    "B4",
    "C5",
    "E5",
    "F5",
    "E5",
    "sD5",
    "E5",
    "B5",
    "A5",
    "sG5",
    "A5",
    "B5",
    "A5",
    "sG5",
    "A5",
    "C6",
    "A5",
    "C6",
    "B5",
    "A5",
    "G5",
    "A5",
    "B5",
    "A5",
    "G5",
    "A5",
    "B5",
    "A5",
    "G5",
    "sF5",
    "E5",
    "B4",
    "A4",
    "sG4",
    "A4",
    "E5",
    "F5",
    "G5",
    "G5",
    "A4",
    "G4",
    "F4",
    "E4",
    "D4",
    "E4",
    "F4",
    "G4",
    "G4",
    "A4",
    "G4",
    "F4",
    "E4",
    "D4",
    "C4",
    "D4",
    "E4",
    "E4",
    "F4",
    "E4",
    "D4",
    "C4",
    "C4",
    "D4",
    "E4",
    "E4",
    "F4",
    "E4",
    "D4",
    "C4",
    "B4",
    "A4",
    "sG4",
    "A4",
    "C5",
    "D5",
    "C5",
    "B4",
    "C5",
    "E5",
    "F5",
    "E5",
    "sD5",
    "E5",
    "B5",
    "A5",
    "sG5",
    "A5",
    "B5",
    "A5",
    "sG5",
    "A5",
    "C6",
    "A5",
    "B5",
    "C5",
    "B5",
    "A5",
    "sG5",
    "A5",
    "E5",
    "F5",
    "D5",
    "C5",
    "B4",
    "A4",
  ], // Movement 3 (Rondo Alla Turca)
};

// Function to select a random song (never the same as previous)
function selectRandomSong() {
  const songKeys = Object.keys(songs);

  // Filter out the current song key if it exists
  const availableKeys = songKeys.filter((key) => key !== currentSongKey);

  // If only one song is available (first time or all others excluded), pick any
  const keysToChooseFrom = availableKeys.length > 0 ? availableKeys : songKeys;

  const randomKey =
    keysToChooseFrom[Math.floor(Math.random() * keysToChooseFrom.length)];
  currentSongKey = randomKey;
  currentSong = songs[randomKey];
  noteIndex = 0;
}

// Image source settings
let currentSource = 1; // 1: 经典三连, 2: 世界名画, 3: 敬请期待
let sourceSelected = true; // 默认已选择source1
let source2Unlocked = true; // 标记source2是否已解锁
const difficultySettings = {
  1: { gridSize: 2, speed: 4, lensSize: 600 }, // 2x2, 慢, 大镜头
  2: { gridSize: 3, speed: 6, lensSize: 400 }, // 3x3, 中, 中镜头
  3: { gridSize: 4, speed: 8, lensSize: 300 }, // 4x4, 快, 小镜头
  4: { gridSize: 4, speed: 8, lensSize: 300 }, // 4x4, 炼狱难度
};
let gridSize = difficultySettings[currentDifficulty].gridSize;
const canvasXSize = 1344;
const canvasYSize = 768;
let pieceXSize = canvasXSize / gridSize;
let pieceYSize = canvasYSize / gridSize;

let canvases = [];
let ctxs = [];
let puzzles = [];
let timer = 0,
  timerInterval = null;
let allSolved = [false, false, false];
let nickname = "";
let page5ActiveTimer = 0;
let page5TimerInterval = null;
let page5Active = false;
let currentActivePage = "page1"; // Track current active page

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
  const floatingTimer = document.getElementById("floatingTimer");
  const page6Timer = document.getElementById("page6Timer");
  if (floatingTimer) floatingTimer.textContent = formatTime(timer);
  if (page6Timer) page6Timer.textContent = formatTime(timer);
  timerInterval = setInterval(() => {
    timer += 10;
    if (floatingTimer) floatingTimer.textContent = formatTime(timer);
    if (page6Timer) page6Timer.textContent = formatTime(timer);
  }, 10);
}
function stopTimer() {
  clearInterval(timerInterval);
}

function pauseTimer() {
  clearInterval(timerInterval);
}

function resumeTimer() {
  const floatingTimer = document.getElementById("floatingTimer");
  const page6Timer = document.getElementById("page6Timer");
  if (floatingTimer) floatingTimer.textContent = formatTime(timer);
  if (page6Timer) page6Timer.textContent = formatTime(timer);
  timerInterval = setInterval(() => {
    timer += 10;
    if (floatingTimer) floatingTimer.textContent = formatTime(timer);
    if (page6Timer) page6Timer.textContent = formatTime(timer);
  }, 10);
}

// Page5 active timer functions
function startPage5Timer() {
  if (page5TimerInterval) {
    clearInterval(page5TimerInterval);
  }
  page5TimerInterval = setInterval(() => {
    page5ActiveTimer += 100;
    if (page5ActiveTimer > 30000) {
      // 30 seconds
      showPage5Hint();
    }
  }, 100);
}

function stopPage5Timer() {
  if (page5TimerInterval) {
    clearInterval(page5TimerInterval);
    page5TimerInterval = null;
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

class Piece {
  constructor(img, sx, sy, x, y, idx, puzzleIdx) {
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
    this.puzzleIdx = puzzleIdx;
    this.hasMerged = false; // Track if this piece has ever been merged
    // Size animation properties
    this.size = 1.0;
    this.targetSize = 1.0;
    this.sizeSpeed = 0;
    this.animationStartTime = 0;
    this.animationDuration = 0;
    this.originalVx = 0;
    this.originalVy = 0;
    // Breathing effect properties (only for apple and hongbao puzzles)
    if (puzzleIdx === 1 || puzzleIdx === 2) {
      this.alpha = 1;
      this.period = 5000 + Math.random() * 5000; // 2-5 seconds
      this.phase = Math.random() * Math.PI * 2;
      this.time = 0;
    } else {
      this.alpha = 1;
    }
  }
  draw(ctx) {
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(
      this.img,
      this.sx,
      this.sy,
      pieceXSize,
      pieceYSize,
      this.x - (pieceXSize * (this.size - 1)) / 2,
      this.y - (pieceYSize * (this.size - 1)) / 2,
      pieceXSize * this.size,
      pieceYSize * this.size,
    );
    ctx.globalAlpha = 1;
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
          puzzleIdx,
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
    mouseX: 0,
    mouseY: 0,
    mouseOver: false,
    boundaryHighlight: false,
    mergeHighlight: false,
    animationInProgress: false,
    animationTimeout: null,
  };
  drawPuzzle(puzzleIdx);
}

function drawPuzzle(idx) {
  const {
    pieces,
    mouseX,
    mouseY,
    mouseOver,
    boundaryHighlight,
    mergeHighlight,
  } = puzzles[idx];
  ctxs[idx].clearRect(0, 0, canvasXSize * 2, canvasYSize * 2);

  // Draw boundary
  if (mergeHighlight) {
    ctxs[idx].strokeStyle = "#c7ffc7ff";
    ctxs[idx].lineWidth = 40000;
  } else if (boundaryHighlight) {
    ctxs[idx].strokeStyle = "#ffb3c2";
    ctxs[idx].lineWidth = 40;
  } else {
    ctxs[idx].strokeStyle = "#000000";
    ctxs[idx].lineWidth = 2;
  }
  ctxs[idx].strokeRect(0, 0, canvasXSize * 2, canvasYSize * 2);

  // Lens parameters (only for hongbao puzzle)
  const isHongbao = idx === 2;
  const lensDiameter = difficultySettings[currentDifficulty].lensSize;
  const lensRadius = lensDiameter / 2;

  // Check if in kid mode (disable covering layer for hongbao puzzle)
  const isKidMode = window.isKidMode && window.isKidMode();

  // If it's the hongbao puzzle, puzzle is started, mouse is over, no animation in progress, and not in kid mode, draw with lens effect
  if (
    isHongbao &&
    puzzles[idx].started &&
    mouseOver &&
    !puzzles[idx].animationInProgress &&
    !isKidMode
  ) {
    // Draw white blanket first
    ctxs[idx].fillStyle = "white";
    ctxs[idx].fillRect(0, 0, canvasXSize * 2, canvasYSize * 2);

    // Create clipping path for the circular hole
    ctxs[idx].save();
    ctxs[idx].beginPath();
    ctxs[idx].arc(mouseX, mouseY, lensRadius, 0, Math.PI * 2);
    ctxs[idx].clip();

    // Draw all pieces inside the clipping path (visible through the hole)
    for (const piece of pieces) {
      piece.draw(ctxs[idx]);
    }

    // Restore context
    ctxs[idx].restore();

    // Draw border around the hole
    if (mergeHighlight) {
      ctxs[idx].strokeStyle = "#00ff00";
      ctxs[idx].lineWidth = 40;
    } else if (boundaryHighlight) {
      ctxs[idx].strokeStyle = "#ffb3c2";
      ctxs[idx].lineWidth = 40;
    } else {
      ctxs[idx].strokeStyle = "black";
      ctxs[idx].lineWidth = 2;
    }
    ctxs[idx].beginPath();
    ctxs[idx].arc(mouseX, mouseY, lensRadius, 0, Math.PI * 2);
    ctxs[idx].stroke();
  } else {
    // Not hongbao, mouse not over, animation in progress, or kid mode - draw all pieces normally
    for (const piece of pieces) {
      piece.draw(ctxs[idx]);
    }
  }
}

function scatterPieces(idx) {
  const { pieces } = puzzles[idx];
  const speed = difficultySettings[currentDifficulty].speed;
  for (const piece of pieces) {
    piece.x = Math.random() * (2 * canvasXSize - pieceXSize);
    piece.y = Math.random() * (2 * canvasYSize - pieceYSize);
    piece.vx = (Math.random() - 0.5) * speed;
    piece.vy = (Math.random() - 0.5) * speed;
  }
}

function animatePuzzle(idx) {
  if (!puzzles[idx].started) return;
  const { pieces } = puzzles[idx];
  const currentTime = Date.now();
  let boundaryHit = false;

  for (const piece of pieces) {
    if (piece.dragging) continue;

    // Handle size animation
    if (piece.animationStartTime > 0) {
      const elapsed = currentTime - piece.animationStartTime;
      if (elapsed < piece.animationDuration) {
        // Calculate size based on animation progress
        const progress = elapsed / piece.animationDuration;
        if (piece.targetSize > 1.0) {
          // Expanding phase
          piece.size = 1.0 + (piece.targetSize - 1.0) * progress;
          // Slow down speed during expansion
          piece.vx = piece.originalVx * 0.5;
          piece.vy = piece.originalVy * 0.5;
        } else {
          // Shrinking phase
          piece.size = piece.targetSize - (piece.targetSize - 1.0) * progress;
          // Restore original speed during shrinking
          piece.vx = piece.originalVx;
          piece.vy = piece.originalVy;
        }
      } else {
        // Animation complete
        piece.size = piece.targetSize;
        piece.animationStartTime = 0;
        // Restore original speed
        piece.vx = piece.originalVx;
        piece.vy = piece.originalVy;
      }
    }

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
      boundaryHit = true;
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
      boundaryHit = true;
    }
    // Breathing effect for apple and hongbao puzzles (disabled in kid mode)
    if (!window.isKidMode || !window.isKidMode()) {
      if (piece.puzzleIdx === 1 || piece.puzzleIdx === 2) {
        if (piece.group.length === 1) {
          // Only breathe if piece is not connected
          piece.time = currentTime;
          piece.alpha =
            0.5 +
            0.5 *
            Math.sin((piece.time / piece.period) * Math.PI * 2 + piece.phase);
        } else {
          // Stop breathing once connected
          piece.alpha = 1;
        }
      }
    } else {
      // In kid mode, ensure alpha is always 1
      piece.alpha = 1;
    }
  }

  // Handle boundary highlight and sound
  if (boundaryHit) {
    // Check if this puzzle's page is currently active
    const expectedPageId = "page" + (3 + idx);
    if (currentActivePage === expectedPageId) {
      // Play bouncing sound
      if (currentDifficulty > 1 && currentSong.length > 0) {
        // Play piano note for higher difficulties
        const noteName = currentSong[noteIndex % currentSong.length];
        playSFX(`audio/music/${noteName}.mp3`, 0.5);
        noteIndex++;
      } else {
        // Original bouncing sound for difficulty 1
        playSFX("audio/bouncing.m4a", 1);
      }
    }

    puzzles[idx].boundaryHighlight = true;
    // Reset highlight after 300ms
    setTimeout(() => {
      if (puzzles[idx]) {
        puzzles[idx].boundaryHighlight = false;
        drawPuzzle(idx);
      }
    }, 100);
  }

  drawPuzzle(idx);
  if (!puzzles[idx].solved) requestAnimationFrame(() => animatePuzzle(idx));
}

function onMouseDown(idx, e) {
  if (!puzzles[idx].started) return;
  const rect = canvases[idx].getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvases[idx].width / rect.width);
  const my = (e.clientY - rect.top) * (canvases[idx].height / rect.height);
  puzzles[idx].mouseX = mx;
  puzzles[idx].mouseY = my;
  puzzles[idx].mouseOver = true;
  const { pieces } = puzzles[idx];
  for (let i = pieces.length - 1; i >= 0; i--) {
    const piece = pieces[i];
    if (piece.contains(mx, my)) {
      // Play dragging sound
      playSFX("audio/dragging.m4a", 0.2);
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
  const rect = canvases[idx].getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvases[idx].width / rect.width);
  const my = (e.clientY - rect.top) * (canvases[idx].height / rect.height);
  puzzles[idx].mouseX = mx;
  puzzles[idx].mouseY = my;
  puzzles[idx].mouseOver = true;
  const piece = puzzles[idx].draggingPiece;
  if (piece) {
    piece.x = mx - piece.offsetX;
    piece.y = my - piece.offsetY;
  }
  drawPuzzle(idx);
}
function onMouseUp(idx, e) {
  const rect = canvases[idx].getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvases[idx].width / rect.width);
  const my = (e.clientY - rect.top) * (canvases[idx].height / rect.height);
  puzzles[idx].mouseX = mx;
  puzzles[idx].mouseY = my;
  const piece = puzzles[idx].draggingPiece;
  if (piece) {
    piece.dragging = false;
    puzzles[idx].draggingPiece = null;

    // Store original velocity before trying to merge
    const originalVx = piece.vx;
    const originalVy = piece.vy;

    // Snap logic
    tryMerge(idx, piece);

    // Check if piece was NOT merged (still has original group size of 1)
    if (piece.group.length === 1 && currentDifficulty === 4) {
      // Change direction randomly and accelerate to 1.2x speed
      const speedMultiplier = 1.2;
      const newSpeed =
        Math.sqrt(originalVx * originalVx + originalVy * originalVy) *
        speedMultiplier;

      // Generate random angle for new direction
      const angle = Math.random() * Math.PI * 2;

      // Calculate new velocity components
      piece.vx = Math.cos(angle) * newSpeed;
      piece.vy = Math.sin(angle) * newSpeed;
    }

    drawPuzzle(idx);
    checkSolved(idx);
  }
}

function tryMerge(idx, piece) {
  const { pieces } = puzzles[idx];
  let merged = false;
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
        merged = true;
      }
    }
  }
  if (merged) {
    // Play success sound
    playSFX("audio/success.m4a", 0.2);

    // Handle combo
    handleCombo(idx, piece);

    // Trigger merge highlight
    puzzles[idx].mergeHighlight = true;
    // Reset highlight after 500ms
    setTimeout(() => {
      if (puzzles[idx]) {
        puzzles[idx].mergeHighlight = false;
        drawPuzzle(idx);
      }
    }, 500);

    // Set animation in progress flag
    puzzles[idx].animationInProgress = true;
    // Clear any existing timeout
    if (puzzles[idx].animationTimeout) {
      clearTimeout(puzzles[idx].animationTimeout);
    }
    // Reset flag after animation period (400ms total)
    puzzles[idx].animationTimeout = setTimeout(() => {
      if (puzzles[idx]) {
        puzzles[idx].animationInProgress = false;
        drawPuzzle(idx);
      }
    }, 400);

    // Animate all independent unmerged pieces
    const independentPieces = pieces.filter((p) => p.group.length === 1);
    const currentTime = Date.now();

    independentPieces.forEach((piece) => {
      // Store original velocity
      piece.originalVx = piece.vx;
      piece.originalVy = piece.vy;

      // Start expansion animation (1 second)
      piece.targetSize = 1.1;
      piece.animationStartTime = currentTime;
      piece.animationDuration = 300;

      // Schedule shrink animation (0.1 second) after expansion
      setTimeout(() => {
        if (piece && piece.group.length === 1) {
          // Only shrink if still independent
          piece.targetSize = 1.0;
          piece.animationStartTime = Date.now();
          piece.animationDuration = 100;
        }
      }, 300);
    });
  }
}

function showPage5Hint() {
  let page5Hint = document.getElementById("page5Hint");
  if (!page5Hint) {
    // Create the hint element if it doesn't exist
    page5Hint = document.createElement("div");
    page5Hint.id = "page5Hint";
    page5Hint.style.textAlign = "center";
    page5Hint.style.marginTop = "20px";
    page5Hint.style.fontSize = "24px";
    page5Hint.style.color = "#000000";
    page5Hint.style.fontWeight = "bold";
    const page5 = document.getElementById("page5");
    if (page5) {
      page5.appendChild(page5Hint);
    }
  }
  page5Hint.textContent = window.getTranslatedText
    ? window.getTranslatedText("鼠标挪出来，啥都能看见~！")
    : "鼠标挪出来，啥都能看见~！";
  page5Hint.style.display = "block";
}

function solvedScroll() {
  if (allSolved.every(Boolean)) {
    // 播放group.mp3
    playSFX("audio/group.mp3");
    const confirmBtn = document.getElementById("confirmBtn");
    confirmBtn.disabled = false;
    // Update combo display when confirmBtn is enabled
    updateComboDisplay();
    const topBtn = document.getElementById("topBtn");
    topBtn.disabled = true;
    confirmBtn.classList.add("active");
    if (currentDifficulty === 3 && !difficulty3SolvedOnce) {
      difficulty3SolvedOnce = true;
      // 解锁难度4
      difficulty4Unlocked = true;
      document.getElementById("difficulty4").disabled = false;
      // 解锁source2
      source2Unlocked = true;
      document.getElementById("source2").disabled = false;
    }
    stopTimer();
    // 自动滚动到结果页
    const resultPage = document.getElementById("page6");
    if (resultPage)
      resultPage.scrollIntoView({ behavior: "smooth", block: "start" });
    // 显示恭喜文字
    const congratulationsText = document.getElementById("congratulationsText");
    if (congratulationsText) {
      congratulationsText.innerHTML = "<h2>恭  喜</h2>";
    }
    // 激活页面6按钮并停用其他按钮
    try {
      const allBtns = document.querySelectorAll(".page-btn");
      allBtns.forEach((b) => b.classList.remove("active"));
      const activeBtn = document.querySelector(".page-btn[data-page='page6']");
      if (activeBtn) {
        activeBtn.classList.add("active");
        activeBtn.classList.add("has-been-active");
      }
    } catch (e) {
      // ignore if DOM structure is different
    }
  } else {
    // 播放fast.mp3
    playSFX("audio/fast.mp3");
    // If not all solved, scroll to the first unsolved puzzle (frontest unsolved)
    scrollToFirstUnsolved();
  }
}

// Function to handle the first puzzle solved effects
function handleSolvedEffects(idx) {
  // Disable all buttons during the effect
  const allPageButtons = document.querySelectorAll(".page-btn");
  allPageButtons.forEach((button) => {
    button.disabled = true;
    button.style.pointerEvents = "none";
  });

  // Create overlay for darkening background
  const overlay = document.createElement("div");
  overlay.id = "puzzle-solved-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)"; // 90% dark
  overlay.style.zIndex = "9998";
  overlay.style.opacity = "0";
  document.body.appendChild(overlay);

  // Fade in overlay
  setTimeout(() => {
    overlay.style.transition = "opacity 0.3s ease";
    overlay.style.opacity = "1";
  }, 10);

  // Create eureka image element
  const showImg = document.createElement("img");
  switch (idx) {
    case 0:
      showImg.src = "images/eureka.png";
      break;
    case 1:
      showImg.src = "images/apple.png";
      break;
    case 2:
      showImg.src = "images/hongbao.png";
      break;
  }
  showImg.style.position = "fixed";
  showImg.style.bottom = "0px"; // Start from bottom
  showImg.style.left = "50%";
  showImg.style.transform = "translateX(-50%)";
  showImg.style.zIndex = "9999";
  showImg.style.maxWidth = "60vw";
  showImg.style.maxHeight = "60vh";
  showImg.style.opacity = "0";
  document.body.appendChild(showImg);

  playSFX(`audio/solved${idx + 1}.mp3`);

  pauseTimer();

  // Animate eureka image from bottom to center
  setTimeout(() => {
    showImg.style.transition =
      "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"; // Quick bounce effect
    showImg.style.bottom = "50%";
    showImg.style.transform = "translate(-50%, 50%)";
    showImg.style.opacity = "1";
  }, 50);

  // After 3 seconds, move to top and fade out
  setTimeout(() => {
    showImg.style.transition =
      "all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    showImg.style.bottom = "100%";
    showImg.style.transform = "translate(-50%, 60%)";
    showImg.style.opacity = "0";
  }, 3000);

  // After eureka disappears, play turn.mp3 and restore everything
  setTimeout(() => {
    // Remove overlay
    overlay.style.transition = "opacity 0.5s ease";
    overlay.style.opacity = "0";

    // Re-enable buttons after fade out completes
    setTimeout(() => {
      overlay.remove();
      showImg.remove();

      allPageButtons.forEach((button) => {
        button.disabled = false;
        button.style.pointerEvents = "auto";
      });

      resumeTimer();
      solvedScroll();

      // Play turn.mp3
      playSFX("audio/turn.mp3");
    }, 500);
  }, 3800);
}

function checkSolved(idx) {
  const { pieces } = puzzles[idx];
  if (pieces.every((p) => p.group === pieces[0].group)) {
    puzzles[idx].solved = true;
    allSolved[idx] = true;

    // Change song when any puzzle is solved (difficulty > 2)
    if (currentDifficulty > 2 && !allSolved.every(Boolean)) {
      selectRandomSong();
    }

    // Record solved painting if using source2 (world paintings)
    if (currentSource === 2 && imagePaths[idx]) {
      addSolvedPainting(imagePaths[idx], currentDifficulty);
    }

    // Play bell sound for the solved puzzle
    if (confirmBtnClicked) {
      playSFX(`audio/bell${idx + 1}.mp3`);
    }

    if (!confirmBtnClicked) handleSolvedEffects(idx);
    else solvedScroll();

    updateDoorButtonState("empty");
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
    if (activeBtn) {
      activeBtn.classList.add("active");
      activeBtn.classList.add("has-been-active");
    }
  } catch (e) {
    // ignore if DOM structure is different
  }

  // ensure floating controls are visible for puzzle pages
  const floatingControls = document.getElementById("floatingControls");
  if (floatingControls) floatingControls.style.display = "flex";
}

// 排行相关
const globalBests = [{ nickname: "阿见", time: 45.23, difficulty: 1 }];

function updatePersonalList() {
  let records = JSON.parse(localStorage.getItem("jigsaw_records") || "{}");
  let list = records[nickname] || [];
  const ol = document.getElementById("personalList");
  if (!ol) return;
  ol.innerHTML = "";

  // Get translated texts
  const getText =
    window.getTranslatedText ||
    function (k) {
      return k;
    };
  const timeUnit = getText("秒");
  const easyText = getText("休闲");
  const mediumText = getText("普通");
  const hardText = getText("困难");
  const hellText = getText("炼狱");

  list.forEach((record, i) => {
    const li = document.createElement("li");
    const difficultyText =
      record.difficulty === 1
        ? easyText
        : record.difficulty === 2
          ? mediumText
          : record.difficulty === 3
            ? hardText
            : hellText;
    li.textContent = `${nickname}: ${record.time.toFixed(2)} ${timeUnit} (${difficultyText})`;
    ol.appendChild(li);
  });
}
function updateGlobalList() {
  const ol = document.getElementById("globalList");
  if (!ol) return;
  ol.innerHTML = "";

  // Get translated texts
  const getText =
    window.getTranslatedText ||
    function (k) {
      return k;
    };
  const timeUnit = getText("秒");
  const easyText = getText("休闲");
  const mediumText = getText("普通");
  const hardText = getText("困难");
  const hellText = getText("炼狱");

  globalBests.slice(0, 5).forEach((item, i) => {
    const li = document.createElement("li");
    const difficultyText =
      item.difficulty === 1
        ? easyText
        : item.difficulty === 2
          ? mediumText
          : item.difficulty === 3
            ? hardText
            : hellText;
    li.textContent = `${item.nickname}: ${item.time.toFixed(2)} ${timeUnit} (${difficultyText})`;
    ol.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Clear nickname and paintings data when page is opened/refreshed
  localStorage.removeItem("jigsaw_nickname");
  localStorage.removeItem("jigsaw_solved_paintings");
  localStorage.removeItem("jigsaw_records");
  localStorage.removeItem("jigsaw_source2_visited");

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
  const nicknameInput = document.getElementById("nicknameInput");
  const floatingControls = document.getElementById("floatingControls");
  const stopBtn = document.getElementById("stopBtn");
  const restartBtnFloat = document.getElementById("restartBtnFloat");
  const restartBtn = document.getElementById("restartBtn");
  const confirmBtn = document.getElementById("confirmBtn");
  const topBtn = document.getElementById("topBtn");
  const bunImg = document.getElementById("bun-img");

  // Floating Door Button functionality
  const floatingDoorBtn = document.getElementById("floatingDoorBtn");
  const doorImg = document.getElementById("doorImg");

  // Initialize source2 visited count from localStorage
  source2VisitedCount =
    parseInt(localStorage.getItem("jigsaw_source2_visited")) || 0;

  if (floatingDoorBtn && doorImg) {
    floatingDoorBtn.addEventListener("mouseenter", function () {
      stopDoorAnimation();
      doorImg.src = "images/open.png";
      // Play open.mp3 on mouseenter
      playSFX("audio/open.mp3");
    });
    floatingDoorBtn.addEventListener("mouseleave", function () {
      updateDoorButtonState("empty");
      // Play close.mp3 on mouseleave
      playSFX("audio/close.mp3");
    });
    floatingDoorBtn.addEventListener("click", function () {
      // Update door button state after click
      updateDoorButtonState("click");

      // Open collection portal page
      window.open("collection.html", "_blank");
    });

    // Initialize door button state
    updateDoorButtonState("empty");
  }

  // Difficulty buttons event listeners
  const difficulty1Btn = document.getElementById("difficulty1");
  const difficulty2Btn = document.getElementById("difficulty2");
  const difficulty3Btn = document.getElementById("difficulty3");
  const difficulty4Btn = document.getElementById("difficulty4");
  difficulty4Btn.disabled = true;

  difficulty1Btn.addEventListener("click", () => setDifficulty(1));
  difficulty2Btn.addEventListener("click", () => setDifficulty(2));
  difficulty3Btn.addEventListener("click", () => setDifficulty(3));
  difficulty4Btn.addEventListener("click", () => setDifficulty(4));

  // Source buttons event listeners
  const source1Btn = document.getElementById("source1");
  const source2Btn = document.getElementById("source2");
  const source3Btn = document.getElementById("source3");
  source2Btn.disabled = true;
  source3Btn.disabled = true;

  source1Btn.addEventListener("click", () => setSource(1));
  source2Btn.addEventListener("click", () => setSource(2));

  function setSource(source) {
    if (source === 2 && !source2Unlocked) return;
    if (source === 3) return; // source3 is always locked

    currentSource = source;
    sourceSelected = true;

    // Update image paths based on source
    if (source === 1) {
      imagePaths = [...defaultImagePaths];
    } else if (source === 2) {
      // Only select new paintings if none are set yet
      // Otherwise keep the current 3 paintings
      if (!imagePaths[0] || !imagePaths[0].startsWith("images/paintings/")) {
        imagePaths = selectRandomPaintings();
      }
      // Keep current imagePaths if already set to paintings
    }

    // Re-setup puzzles with new images
    for (let i = 0; i < imagePaths.length; i++) {
      if (puzzles[i]) {
        puzzles[i].started = false;
        puzzles[i].solved = false;
      }
      setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
    }

    // Update button styles
    [source1Btn, source2Btn, source3Btn].forEach((btn, idx) => {
      if (idx + 1 === source) {
        btn.style.backgroundColor = "#d5d5d5";
        btn.style.color = "white";
      } else {
        btn.style.backgroundColor = "";
        btn.style.color = "";
      }
    });

    // Check if start button should be enabled
    checkStartButtonEnabled();
  }

  function checkStartButtonEnabled() {
    const hasNickname = nicknameInput.value.trim() !== "";
    startBtn.disabled = !(hasNickname && difficultySelected && sourceSelected);
  }

  // Nickname input event listener
  nicknameInput.addEventListener("input", function () {
    checkStartButtonEnabled();
  });

  // 随机选择3张绘画图片
  // If forceNew is true, select only paintings that can be challenged at current difficulty
  function selectRandomPaintings(forceNew = true) {
    let sourceArray = paintingImages;

    if (forceNew) {
      // Filter paintings that can be selected at current difficulty
      // Can select if: not solved yet, or current difficulty > highest recorded difficulty
      const available = paintingImages.filter((img) => {
        const highestDifficulty = getPaintingHighestDifficulty(img);
        return highestDifficulty === 0 || currentDifficulty > highestDifficulty;
      });
      // If no available paintings (all already solved at this difficulty or higher), use all paintings
      sourceArray = available.length > 0 ? available : paintingImages;
    }

    const shuffled = [...sourceArray].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  // 初始化拼图（3个）
  for (let i = 0; i < imagePaths.length; i++) {
    canvases[i].addEventListener("mousedown", (e) => onMouseDown(i, e));
    canvases[i].addEventListener("mousemove", (e) => onMouseMove(i, e));
    canvases[i].addEventListener("mouseup", (e) => onMouseUp(i, e));
    canvases[i].addEventListener("mouseleave", (e) => {
      puzzles[i].mouseOver = false;
      onMouseUp(i, e);
    });
    canvases[i].addEventListener("mouseenter", (e) => {
      const rect = canvases[i].getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvases[i].width / rect.width);
      const my = (e.clientY - rect.top) * (canvases[i].height / rect.height);
      puzzles[i].mouseX = mx;
      puzzles[i].mouseY = my;
      puzzles[i].mouseOver = true;
      drawPuzzle(i);
    });
    setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
  }

  // 启用鼠标滚轮滚动所有页面
  // 阻止滚动直到加载完成和confirmBtn首次点击
  function handleScroll(e) {
    if (!loadingComplete || !confirmBtnClicked) {
      e.preventDefault();
      return false;
    }
  }
  // Add scroll blocking event listener initially
  pagesContainer.addEventListener("wheel", handleScroll, { passive: false });

  function removeScrollBlock() {
    pagesContainer.removeEventListener("wheel", handleScroll);
  }
  // 首次按键：显示导航并跳到第二页
  function onFirstKey(e) {
    if (!loadingComplete) return; // until loading complete

    const startText = document.getElementById("startText");
    const pageNav = document.getElementById("pageNav");
    const pageBtns = document.querySelectorAll(".page-btn");

    if (startText && !startText.style.display.includes("none")) {
      startText.textContent = window.getTranslatedText
        ? window.getTranslatedText("本页有惊喜")
        : "本页有惊喜"; // Change the text
      pageNav.style.display = "flex";
      const secondPage = document.getElementById("page2");
      if (secondPage) {
        secondPage.scrollIntoView({ behavior: "smooth", block: "start" });
        pageBtns.forEach((btn) => {
          btn.classList.remove("active");
          if (btn.dataset.page === "page2") {
            btn.classList.add("active");
            btn.classList.add("has-been-active"); // 标记为已激活过
          }
        });
      }
      // // Toggle music when first key is pressed
      // if (toggleMusicFunction) {
      //   toggleMusicFunction();
      // }

      // Play turn.mp3 audio when first key is pressed
      playSFX("audio/turn.mp3");

      document.removeEventListener("keydown", onFirstKey);
    }
  }
  document.addEventListener("keydown", onFirstKey);

  // 分页按钮跳转
  pageBtns.forEach((btn) => {
    // 添加悬停事件播放音频
    btn.addEventListener("mouseenter", function () {
      if (!confirmBtnClicked) return;
      const pageBtnAudio = new Audio("audio/pagebtn.mp3");
      pageBtnAudio.currentTime = 0;
      playSFX("audio/pagebtn.mp3", 0.3);
    });

    btn.addEventListener("click", function () {
      if (!loadingComplete || !confirmBtnClicked) return;
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
        this.classList.add("has-been-active"); // 标记为已激活过
        currentActivePage = targetPageId; // Update current active page
      }
      // Handle page5 active state
      if (targetPageId === "page5" && !page5Active) {
        page5Active = true;
        startPage5Timer();
      } else if (targetPageId !== "page5" && page5Active) {
        page5Active = false;
        stopPage5Timer();
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
      currentActivePage = currentPageId; // Update current active page

      // Check scroll position - hide when near top or bottom
      const isNearTop = pagesContainer.scrollTop < 100;
      const isNearBottom = pagesContainer.scrollTop > pagesContainer.scrollHeight - pagesContainer.clientHeight - 100;

      // Show or hide floating controls based on the current page and scroll position
      if (
        ["page2", "page3", "page4", "page5", "page6"].includes(currentPageId) &&
        !isNearTop &&
        !isNearBottom
      ) {
        floatingControls.style.display = "flex";
      } else {
        floatingControls.style.display = "none";
      }
      // Handle page5 active state
      if (currentPageId === "page5" && !page5Active) {
        page5Active = true;
        startPage5Timer();
      } else if (currentPageId !== "page5" && page5Active) {
        page5Active = false;
        stopPage5Timer();
      }
      // Sync page6 timer with floating timer when on page6
      if (currentPageId === "page6") {
        const page6Timer = document.getElementById("page6Timer");
        if (page6Timer) {
          page6Timer.textContent = formatTime(timer);
        }
      }
    }, 100);
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
      fontFamily = "'CustomFont', Arial, sans-serif",
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

  // Replace the existing bunImg click event listener with this one
  bunImg.addEventListener("click", function () {
    bunClickCount++;

    // Get the left-bottom image element
    const leftBottomImg = document.querySelector(".left-bottom-img");

    // Play random audio from existing files
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    playSFX(audioFiles[randomIndex]);
    // Return to pink.png
    if (leftBottomImg) {
      leftBottomImg.src = "images/pink.png";
    }
    // }

    showFloatingText({
      text: "功德+1",
      fontSize: "28px",
      color: "#000000",
      fontWeight: "bold",
      duration: 1500,
      riseDistance: 80,
      topOffset: -50,
      fontFamily: "'CustomFont', Microsoft YaHei, sans-serif",
      // textShadow: "0 4px 12px rgba(0,0,0,0.3)",
    });
  });

  // 昵称处理
  nickname = localStorage.getItem("jigsaw_nickname") || "";
  nicknameInput.value = nickname || "";

  function setDifficulty(level) {
    currentDifficulty = level;
    gridSize = difficultySettings[level].gridSize;
    pieceXSize = canvasXSize / gridSize;
    pieceYSize = canvasYSize / gridSize;
    difficultySelected = true;

    // Re-setup puzzles with new difficulty
    for (let i = 0; i < imagePaths.length; i++) {
      if (puzzles[i]) {
        puzzles[i].started = false;
        puzzles[i].solved = false;
      }
      setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
    }

    // Update button styles
    [difficulty1Btn, difficulty2Btn, difficulty3Btn, difficulty4Btn].forEach(
      (btn, idx) => {
        if (idx + 1 === level) {
          btn.style.backgroundColor = "#d5d5d5";
          btn.style.color = "white";
        } else {
          btn.style.backgroundColor = "";
          btn.style.color = "";
        }
      },
    );

    // Check if start button should be enabled
    checkStartButtonEnabled();
  }

  // Start：在注册页点击，开始所有拼图并跳到 page3，显示浮动控件
  startBtn.onclick = async function () {
    // Save nickname when start button is clicked
    nickname = nicknameInput.value.trim();
    localStorage.setItem("jigsaw_nickname", nickname);
    updatePersonalList();

    if (!difficultySelected) return alert("请选择难度!");
    if (!sourceSelected) return alert("请选择图包!");
    selectRandomSong();

    // Initialize combo for new round
    initCombo();

    if (currentDifficulty > 1) noteIndex = 0;

    // For source2: check if all current paintings are solved
    // If yes, select new unsolved paintings
    if (currentSource === 2) {
      const allCurrentSolved = imagePaths.every((img) => isPaintingSolved(img));
      if (allCurrentSolved) {
        imagePaths = selectRandomPaintings(true); // Force new unsolved paintings
        // Re-setup puzzles with new images
        const setupPromises = [];
        for (let i = 0; i < imagePaths.length; i++) {
          if (puzzles[i]) {
            puzzles[i].started = false;
            puzzles[i].solved = false;
          }
          setupPromises.push(
            setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i),
          );
        }
        // Wait for all puzzles to be set up before continuing
        await Promise.all(setupPromises);
      }
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;
    // Disable nickname input after start button is clicked
    nicknameInput.disabled = true;
    confirmBtn.disabled = true;
    restartBtn.disabled = true;
    restartBtnFloat.disabled = true;
    topBtn.disabled = true;
    // Disable difficulty and source buttons when game starts
    [difficulty1Btn, difficulty2Btn, difficulty3Btn, difficulty4Btn].forEach(
      (btn) => {
        btn.disabled = true;
      },
    );
    [source1Btn, source2Btn].forEach((btn) => {
      btn.disabled = true;
    });
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
      if (btn.dataset.page === "page3") {
        btn.classList.add("active");
        btn.classList.add("has-been-active"); // 标记为已激活过
      }
    });
    floatingControls.style.display = "flex";
  };

  // Stop：停止计时与动画（重置为初始未开始状态）
  stopBtn.onclick = function () {
    confirmBtn.disabled = true;
    confirmBtn.classList.remove("active");
    stopBtn.disabled = true;
    restartBtn.disabled = false;
    restartBtnFloat.disabled = false;

    // Clear combo when game stops
    clearCombo();
    // Enable difficulty buttons when game stops
    [difficulty1Btn, difficulty2Btn, difficulty3Btn, difficulty4Btn].forEach(
      (btn) => {
        btn.disabled = true;
      },
    );
    // Enable source buttons when game stops
    source1Btn.disabled = true;
    source2Btn.disabled = true;
    stopTimer();
    stopPage5Timer();
    page5Active = false;
    page5ActiveTimer = 0;
    // Clear the hint text
    const page5Hint = document.getElementById("page5Hint");
    if (page5Hint) {
      page5Hint.style.display = "none";
    }
    // 将每个拼图重置（重新绘制初始状态）
    for (let i = 0; i < imagePaths.length; i++) {
      puzzles[i].started = false;
      puzzles[i].solved = false;
      setupPuzzle(canvases[i], ctxs[i], imagePaths[i], i);
    }
  };

  // 重启（页面底部/浮动重启共用）
  function doRestart() {
    nicknameInput.disabled = false;
    confirmBtn.disabled = true;
    stopBtn.disabled = true;
    restartBtn.disabled = true;
    restartBtnFloat.disabled = true;
    startBtn.disabled = false;
    checkStartButtonEnabled();

    // Clear combo when game restarts
    clearCombo();
    // Enable difficulty buttons when game restarts
    [difficulty1Btn, difficulty2Btn, difficulty3Btn].forEach((btn) => {
      btn.disabled = false;
    });
    if (difficulty4Unlocked) {
      difficulty4Btn.disabled = false;
    } else {
      difficulty4Btn.disabled = true;
    }
    // Enable source buttons when game restarts
    source1Btn.disabled = false;
    if (source2Unlocked) {
      source2Btn.disabled = false;
    } else {
      source2Btn.disabled = true;
    }
    // Set default difficulty
    stopTimer();
    stopPage5Timer();
    page5Active = false;
    page5ActiveTimer = 0;
    // Clear the hint text
    const page5Hint = document.getElementById("page5Hint");
    if (page5Hint) {
      page5Hint.style.display = "none";
    }
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
      if (btn) {
        btn.classList.add("active");
        btn.classList.add("has-been-active"); // 标记为已激活过
      }
    }
    // 重置为 "往下有惊喜" 当重启按钮被点击
    const congratulationsText = document.getElementById("congratulationsText");
    if (congratulationsText) {
      congratulationsText.innerHTML =
        currentLang === "zh"
          ? "<h2>往下有惊喜</h2>"
          : "<h2>surprise below</h2>";
    }
  }

  restartBtn.onclick = doRestart;
  restartBtnFloat.onclick = doRestart;

  // Confirm：保存成绩并更新排行
  confirmBtn.onclick = function () {
    // Play confirmation sound
    const confirmAudio = new Audio("audio/confirm.mp3");
    confirmAudio.currentTime = 0;
    playSFX("audio/confirm.mp3", 0.2);

    // 标记confirmBtn首次点击
    if (!confirmBtnClicked) {
      confirmBtnClicked = true;
      removeScrollBlock();
      // Show sliding text after first confirmBtn click
      const slidingTextContainer = document.getElementById(
        "slidingTextContainer",
      );
      if (slidingTextContainer) {
        slidingTextContainer.classList.add("visible");
        initSlidingText();
      }
    }

    // 标记page6按钮为已激活过
    const page6Btn = Array.from(pageBtns).find(
      (btn) => btn.dataset.page === "page6",
    );
    if (page6Btn) {
      page6Btn.classList.add("has-been-active");
    }

    // use timer (ms) convert to seconds
    const timeSeconds = timer / 1000;
    let records = JSON.parse(localStorage.getItem("jigsaw_records") || "{}");
    if (!records[nickname]) records[nickname] = [];
    records[nickname].push({
      time: timeSeconds,
      difficulty: currentDifficulty,
    });
    records[nickname].sort((a, b) => a.time - b.time);
    records[nickname] = records[nickname].slice(0, 5);
    localStorage.setItem("jigsaw_records", JSON.stringify(records));
    updatePersonalList();
    updateGlobalList();
    confirmBtn.disabled = true;
    // Update combo display when confirmBtn is disabled
    clearCombo();
    stopBtn.disabled = true;
    restartBtn.disabled = false;
    restartBtnFloat.disabled = false;
    topBtn.disabled = false;
    if (difficulty4Unlocked) {
      difficulty4Btn.disabled = false;
    } else {
      difficulty4Btn.disabled = true;
    }
    // Enable source buttons
    source1Btn.disabled = true;
    source2Btn.disabled = true;

    // Update page6 timer with final time
    const page6Timer = document.getElementById("page6Timer");
    if (page6Timer) {
      page6Timer.textContent = formatTime(timer);
    }

    // Replace congratulations text with particles.gif using absolute positioning
    const congratulationsText = document.getElementById("congratulationsText");
    if (congratulationsText) {
      // Store original content
      const originalContent = congratulationsText.innerHTML;

      // Add relative positioning to the container
      congratulationsText.style.position = "relative";

      // Create gif element and position it absolutely over the text
      const gifElement = document.createElement("img");
      gifElement.src = "images/particles.gif";
      gifElement.alt = "Particles";
      gifElement.style.position = "absolute";
      gifElement.style.top = "0";
      gifElement.style.left = "0";
      gifElement.style.width = "100%";
      gifElement.style.height = "100%";
      gifElement.style.objectFit = "contain";
      gifElement.style.zIndex = "10";

      // Hide the original text temporarily
      const h2 = congratulationsText.querySelector("h2");
      if (h2) {
        h2.style.opacity = "0";
      }

      // Add the gif to the container
      congratulationsText.appendChild(gifElement);

      // After the gif plays once (assuming ~3 seconds), restore the text
      setTimeout(() => {
        // Remove the gif
        if (gifElement.parentNode) {
          gifElement.parentNode.removeChild(gifElement);
        }

        // Restore original content but with "往下有惊喜"
        congratulationsText.innerHTML =
          currentLang === "zh"
            ? "<h2>往下有惊喜</h2>"
            : "<h2>surprise below</h2>";

        // Reset positioning
        congratulationsText.style.position = "";

        // Ensure no animations are applied
        const h2 = congratulationsText.querySelector("h2");
        if (h2) {
          h2.classList.remove("congrats-animate", "color-dancing");
          h2.style.animation = "none";
          h2.style.color = "#000000"; // Reset to original color
        }
      }, 1400); // Adjust timing based on actual gif duration
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
    if (firstPageBtn) {
      firstPageBtn.classList.add("active");
      firstPageBtn.classList.add("has-been-active"); // 标记为已激活过
    }

    // Handle page5 active state
    if (page5Active) {
      page5Active = false;
      stopPage5Timer();
    }
  };

  // 初始按钮状态
  checkStartButtonEnabled();
  confirmBtn.disabled = true;
  stopBtn.disabled = true;
  restartBtn.disabled = true;
  restartBtnFloat.disabled = true;
  // Enable difficulty buttons initially
  [difficulty1Btn, difficulty2Btn, difficulty3Btn].forEach((btn) => {
    btn.disabled = false;
  });
  if (difficulty4Unlocked) {
    difficulty4Btn.disabled = false;
  } else {
    difficulty4Btn.disabled = true;
  }
  // Enable source buttons initially (source1 only)
  source1Btn.disabled = false;
  if (source2Unlocked) {
    source2Btn.disabled = false;
  } else {
    source2Btn.disabled = true;
  }
  // Set default difficulty and source
  setDifficulty(1);
  setSource(1);
  updatePersonalList();
  updateGlobalList();
});

// Color random walk animation function
function startColorRandomWalk(element) {
  // Define base colors (black, red, orange, yellow, white)
  const colors = [
    // { r: 0, g: 0, b: 0 },     // black
    { r: 255, g: 0, b: 0 }, // red
    { r: 255, g: 165, b: 0 }, // orange
    { r: 255, g: 255, b: 0 }, // yellow
    { r: 255, g: 255, b: 255 }, // white
  ];

  // Initialize random weights for each color
  let weights = colors.map(() => Math.random());

  // Normalize weights to sum to 1
  const normalizeWeights = () => {
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map((w) => w / sum);
  };

  normalizeWeights();

  // Animation loop
  const animate = () => {
    // Randomly adjust weights in small increments
    weights = weights.map((w) => {
      // Small random adjustment (-0.05 to 0.05)
      let adjustment = (Math.random() - 0.5) * 0.1;
      return Math.max(0, Math.min(1, w + adjustment));
    });

    normalizeWeights();

    // Calculate weighted average color
    let r = 0,
      g = 0,
      b = 0;
    colors.forEach((color, index) => {
      r += color.r * weights[index];
      g += color.g * weights[index];
      b += color.b * weights[index];
    });

    // Convert to hex color
    const toHex = (num) => {
      const hex = Math.round(num).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Apply color to element
    element.style.color = hexColor;

    // Continue animation
    requestAnimationFrame(animate);
  };

  // Start animation
  animate();
}
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

  handleParticleCollisions(
    obstacleX,
    obstacleY,
    obstacleRadius,
    obsVx,
    obsVy,
    obsOmega,
  ) {
    var h = 1.0 / this.fInvSpacing;
    var r = this.particleRadius;
    var minDist = obstacleRadius + r;
    var minDist2 = minDist * minDist;

    var minX = h + r;
    var maxX = (this.fNumX - 1) * h - r;
    var minY = h + r;
    var maxY = (this.fNumY - 1) * h - r;

    // Viscosity parameters
    var viscosity = scene.viscosity; // Dynamic viscosity

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

        // Calculate obstacle's linear velocity at the contact point
        // (due to rotation: v = ω × r)
        var obsRotVx = -obsOmega * dy;
        var obsRotVy = obsOmega * dx;

        // Total obstacle velocity at contact point
        var totalObsVx = obsVx + obsRotVx;
        var totalObsVy = obsVy + obsRotVy;

        // Two way coupling: Particles inherit obstacle velocity at boundary
        // but with viscous damping based on relative velocity
        var particleVx = this.particleVel[2 * i];
        var particleVy = this.particleVel[2 * i + 1];

        // Calculate relative velocity
        var relVx = particleVx - totalObsVx;
        var relVy = particleVy - totalObsVy;

        // Calculate normal vector
        var nx = dx / d;
        var ny = dy / d;

        // Calculate tangential vector
        var tx = -ny;
        var ty = nx;

        // Decompose relative velocity into normal and tangential components
        var relVn = relVx * nx + relVy * ny;
        var relVt = relVx * tx + relVy * ty;

        // Apply normal velocity (inelastic collision)
        var normalVelX = totalObsVx + nx * relVn * 0.1; // Some restitution
        var normalVelY = totalObsVy + ny * relVn * 0.1;

        // Apply tangential velocity with viscous damping
        var tangentialVelX =
          totalObsVx + tx * relVt * Math.exp(-viscosity * 10);
        var tangentialVelY =
          totalObsVy + ty * relVt * Math.exp(-viscosity * 10);

        // Combine normal and tangential components
        this.particleVel[2 * i] = normalVelX + tangentialVelX - totalObsVx;
        this.particleVel[2 * i + 1] = normalVelY + tangentialVelY - totalObsVy;
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
  calculateFluidForces(obsX, obsY, obsVx, obsVy, obsRadius) {
    let fx = 0.0;
    let fy = 0.0;
    let torque = 0.0;
    let n = this.fNumY;
    let h = this.h;

    // Viscosity parameters
    let viscosity = scene.viscosity; // Dynamic viscosity
    let obstacleAngularVel = scene.obstacleOmega; // Obstacle's angular velocity

    // Reset collision count at the start of each frame
    waterCollisionCount = 0;
    relativeVelocitySum = 0;

    for (let i = 1; i < this.fNumX - 1; i++) {
      for (let j = 1; j < this.fNumY - 1; j++) {
        if (this.cellType[i * n + j] === FLUID_CELL) {
          let dx = (i + 0.5) * h - obsX;
          let dy = (j + 0.5) * h - obsY;
          let dist = Math.sqrt(dx * dx + dy * dy);

          // If fluid cell is exactly at the boundary of the obstacle
          if (dist < obsRadius + h && dist > obsRadius - h) {
            // Increment collision count for this frame
            waterCollisionCount++;

            let pressure = this.p[i * n + j];
            // Normal vector pointing from obstacle to fluid
            let nx = dx / dist;
            let ny = dy / dist;

            // Force is pressure pushing inward against the obstacle
            // We scale down the raw pressure heavily here for stability in 2D
            let scale = 0.005 * h;
            let forceX = -pressure * nx * scale;
            let forceY = -pressure * ny * scale;
            fx += forceX;
            fy += forceY;

            // Calculate torque (r × F)
            torque -= dx * forceY - dy * forceX;

            // --- NEW: Viscous forces for torque ---
            // Get fluid velocity at this cell
            let fluidVelX = this.u[i * n + j];
            let fluidVelY = this.v[i * n + j];

            // Calculate obstacle's linear velocity at the contact point
            // (due to rotation: v = ω × r)
            let obstacleVelX = obsVx + obstacleAngularVel * dy;
            let obstacleVelY = obsVy - obstacleAngularVel * dx;

            // Calculate relative velocity
            let relVelX = fluidVelX - obstacleVelX;
            let relVelY = fluidVelY - obstacleVelY;

            // Calculate tangential velocity (perpendicular to normal)
            let tangentX = -ny; // Tangential vector
            let tangentY = nx;
            let tangentialVel = relVelX * tangentX + relVelY * tangentY;
            relativeVelocitySum += Math.abs(tangentialVel);

            // Calculate viscous force (proportional to tangential velocity)
            let viscousForceMagnitude =
              viscosity * Math.abs(tangentialVel) * scale * 100;
            let viscousForceX =
              Math.sign(relVelX) * Math.abs(tangentX) * viscousForceMagnitude;
            let viscousForceY =
              Math.sign(relVelY) * Math.abs(tangentY) * viscousForceMagnitude;

            // Add viscous force to total force
            fx += viscousForceX;
            fy += viscousForceY;

            // Calculate torque from viscous force
            torque -= dx * viscousForceY - dy * viscousForceX;
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
            let forceX = totalForce * nx;
            let forceY = totalForce * ny;
            fx += forceX;
            fy += forceY;

            // Calculate torque (r × F)
            torque -= dx * forceY - dy * forceX;
          }

          // --- Handle center case (dist == 0) ---
          if (dist === 0.0) {
            // Particle exactly at obstacle center, apply upward force
            fy += 10.0; // Arbitrary upward push
          }
        }
      }
    }

    waterCollisionIncrement = waterCollisionCount - lastWaterCollisionCount;
    lastWaterCollisionCount = waterCollisionCount;

    // Check if we should play a water collision sound
    const currentTime = Date.now();
    if (
      waterCollisionIncrement >= waterCollisionThreshold &&
      currentTime - lastWaterCollisionTime > waterCollisionCooldown
    ) {
      playWaterObstacleSound(waterCollisionIncrement);
      lastWaterCollisionTime = currentTime;
    }

    // Check if we should play a splash sound based on relative velocity
    playSplashSound(relativeVelocitySum);

    return { x: fx, y: fy, torque: torque };
  }

  updateParticleColors() {
    var h1 = this.fInvSpacing;
    // Get current target color from scene
    var colorMode = scene.colorMode || 0;
    const TARGET_R = scene.targetColors[colorMode].r;
    const TARGET_G = scene.targetColors[colorMode].g;
    const TARGET_B = scene.targetColors[colorMode].b;

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
  viscosity: 0.5,
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
  obstacleAng: 0.0, // Angular position (radians)
  obstacleOmega: 0.0, // Angular velocity (radians/s)
  obstacleInertia: 0.0, // Moment of inertia
  isDynamic: true,

  // Force mode settings
  forceMode: false,
  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  forceMagnitude: 10.0,
  minDistance: 1,
  maxDistance: 5,

  paused: true,
  showParticles: true,
  showGrid: false,
  fluid: null,

  // Color cycling settings
  colorMode: 0, // 0: original sky blue, 1: dark blue, 2: dark gray
  targetColors: [
    { r: 135 / 256, g: 206 / 256, b: 235 / 256 }, // Original sky blue
    { r: 11 / 256, g: 61 / 256, b: 146 / 256 }, // Dark blue
    { r: 20 / 256, g: 20 / 256, b: 20 / 256 }, // Dark gray
  ],
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

  // Calculate moment of inertia for a solid sphere: I = (1/2) * m * r^2
  scene.obstacleInertia =
    0.5 * scene.obstacleMass * scene.obstacleRadius * scene.obstacleRadius;

  updateObstacleGrid();
}

// Handle wall collisions for the obstacle in tank scene with rotational dynamics
function handleObstacleWallCollision() {
  var friction = 0.5; // 摩擦系数
  var restitution = 0.8; //  restitution coefficient
  var normalAdjustment = 2.0; //  法向调整系数
  var invMass = 1.0 / scene.obstacleMass;
  var invInertia = 1.0 / scene.obstacleInertia; //  moment of inertia inverse
  var radius = scene.obstacleRadius;
  var h = scene.fluid.h;

  // 左墙碰撞
  if (scene.obstacleX < radius + h) {
    scene.obstacleX = radius + h;

    // 计算碰撞点速度
    var contactPoint = { x: h, y: scene.obstacleY };
    var r = {
      x: contactPoint.x - scene.obstacleX,
      y: contactPoint.y - scene.obstacleY,
    };
    var rotVel = {
      x: scene.obstacleOmega * r.y,
      y: -scene.obstacleOmega * r.x,
    };
    var contactVel = {
      x: scene.obstacleVx + rotVel.x,
      y: scene.obstacleVy + rotVel.y,
    };

    // 法向和切向方向
    var normal = { x: 1, y: 0 };
    var tangent = { x: 0, y: 1 };

    // 相对速度分量
    var normalVel = contactVel.x * normal.x + contactVel.y * normal.y;
    var tangentVel = contactVel.x * tangent.x + contactVel.y * tangent.y;

    // 法向冲量
    var impulseNormal =
      (-(1 + restitution) * normalVel) /
      (invMass + invInertia * radius * radius);

    // 应用法向冲量
    scene.obstacleVx += normalAdjustment * impulseNormal * normal.x * invMass;
    scene.obstacleVy += normalAdjustment * impulseNormal * normal.y * invMass;
    // scene.obstacleOmega -= impulseNormal * radius * invInertia;

    // 播放碰撞音效
    playBallGlassSound(normalVel);

    // 切向冲量（摩擦力）
    if (Math.abs(tangentVel) > 0.001) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      scene.obstacleVx += impulseTangent * tangent.x * invMass;
      scene.obstacleVy += impulseTangent * tangent.y * invMass;
      scene.obstacleOmega -= impulseTangent * radius * invInertia;
    }
  }

  // 右墙碰撞
  if (scene.obstacleX > simWidth - radius - h) {
    scene.obstacleX = simWidth - radius - h;

    var contactPoint = { x: simWidth - h, y: scene.obstacleY };
    var r = {
      x: contactPoint.x - scene.obstacleX,
      y: contactPoint.y - scene.obstacleY,
    };
    var rotVel = {
      x: scene.obstacleOmega * r.y,
      y: -scene.obstacleOmega * r.x,
    };
    var contactVel = {
      x: scene.obstacleVx + rotVel.x,
      y: scene.obstacleVy + rotVel.y,
    };

    var normal = { x: -1, y: 0 };
    var tangent = { x: 0, y: 1 };

    var normalVel = contactVel.x * normal.x + contactVel.y * normal.y;
    var tangentVel = contactVel.x * tangent.x + contactVel.y * tangent.y;

    var impulseNormal =
      (-(1 + restitution) * normalVel) /
      (invMass + invInertia * radius * radius);

    scene.obstacleVx += normalAdjustment * impulseNormal * normal.x * invMass;
    scene.obstacleVy += normalAdjustment * impulseNormal * normal.y * invMass;
    // scene.obstacleOmega -= impulseNormal * radius * invInertia;

    // 播放碰撞音效
    playBallGlassSound(normalVel);

    if (Math.abs(tangentVel) > 0.001) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      scene.obstacleVx += impulseTangent * tangent.x * invMass;
      scene.obstacleVy += impulseTangent * tangent.y * invMass;
      scene.obstacleOmega += impulseTangent * radius * invInertia;
    }
  }

  // 地面碰撞
  if (scene.obstacleY < radius + h) {
    scene.obstacleY = radius + h;

    var contactPoint = { x: scene.obstacleX, y: h };
    var r = {
      x: contactPoint.x - scene.obstacleX,
      y: contactPoint.y - scene.obstacleY,
    };
    var rotVel = {
      x: scene.obstacleOmega * r.y,
      y: -scene.obstacleOmega * r.x,
    };
    var contactVel = {
      x: scene.obstacleVx + rotVel.x,
      y: scene.obstacleVy + rotVel.y,
    };

    var normal = { x: 0, y: 1 };
    var tangent = { x: 1, y: 0 };

    var normalVel = contactVel.x * normal.x + contactVel.y * normal.y;
    var tangentVel = contactVel.x * tangent.x + contactVel.y * tangent.y;

    var impulseNormal =
      (-(1 + restitution) * normalVel) /
      (invMass + invInertia * radius * radius);

    scene.obstacleVx += normalAdjustment * impulseNormal * normal.x * invMass;
    scene.obstacleVy += normalAdjustment * impulseNormal * normal.y * invMass;
    // scene.obstacleOmega -= impulseNormal * radius * invInertia;

    // 播放碰撞音效
    playBallGlassSound(normalVel);

    if (Math.abs(tangentVel) > 0.001) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      scene.obstacleVx += impulseTangent * tangent.x * invMass;
      scene.obstacleVy += impulseTangent * tangent.y * invMass;
      scene.obstacleOmega += impulseTangent * radius * invInertia;
    }
  }
}

function updateObstaclePhysics(dt) {
  if (scene.isDynamic && !mouseDown) {
    // 1. Gravity (only when force mode is disabled)
    if (!scene.forceMode) {
      scene.obstacleVy += scene.gravity * dt;
    }

    // 2. Fluid Forces (Buoyancy/Pressure Integration)
    let fluidForces = scene.fluid.calculateFluidForces(
      scene.obstacleX,
      scene.obstacleY,
      scene.obstacleVx,
      scene.obstacleVy,
      scene.obstacleRadius,
    );
    scene.obstacleVx += (fluidForces.x / scene.obstacleMass) * dt;
    scene.obstacleVy += (fluidForces.y / scene.obstacleMass) * dt;

    // 3. Rotational dynamics (torque)
    if (scene.obstacleInertia > 0) {
      scene.obstacleOmega += (fluidForces.torque / scene.obstacleInertia) * dt;
      // Damping for angular velocity
      // scene.obstacleOmega *= 0.98;
    }

    // 4. Drag / Damping
    scene.obstacleVx *= 0.99;
    scene.obstacleVy *= 0.99;

    // 5. Integration
    scene.obstacleX += scene.obstacleVx * dt;
    scene.obstacleY += scene.obstacleVy * dt;
    scene.obstacleAng += scene.obstacleOmega * dt;

    // 6. Floor/Wall Collision with rotational dynamics
    handleObstacleWallCollision();
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

// Update the mesh vertex shader to include texture coordinates
const meshVertexShader = `
		attribute vec2 attrPosition;
		attribute vec2 attrTexCoord;
		uniform vec2 domainSize;
		uniform vec2 translation;
		uniform float scale;
		uniform float rotation;
		varying vec2 fragTexCoord;
		void main() {
			// Apply rotation
			float cosRot = cos(rotation);
			float sinRot = sin(rotation);
			vec2 rotatedPos = vec2(
				attrPosition.x * cosRot - attrPosition.y * sinRot,
				attrPosition.x * sinRot + attrPosition.y * cosRot
			);
			
			// Use texture coordinates directly (no rotation needed for now)
			// The texture is already mapped correctly to the disk
			vec2 v = translation + rotatedPos * scale;
			vec4 screenTransform = vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
			gl_Position = vec4(v * screenTransform.xy + screenTransform.zw, 0.0, 1.0);
			fragTexCoord = attrTexCoord;
		}`;

// Update the mesh fragment shader to use texture instead of color
const meshFragmentShader = `
		precision mediump float;
		varying vec2 fragTexCoord;
		uniform sampler2D texture;
		void main() { gl_FragColor = texture2D(texture, fragTexCoord); }`;

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
// Add new variables for texture handling
var diskTexCoordBuffer = null;
var obstacleTexture = null;

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

  // Update the disk buffer creation to include texture coordinates
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

    // Create texture coordinates for the disk
    diskTexCoordBuffer = gl.createBuffer();
    var diskTexCoords = new Float32Array(2 * numSegs + 2);
    p = 0;
    diskTexCoords[p++] = 0.5;
    diskTexCoords[p++] = 0.5;
    for (var i = 0; i < numSegs; i++) {
      diskTexCoords[p++] = (Math.cos(i * dphi) + 1.0) / 2.0;
      diskTexCoords[p++] = (Math.sin(i * dphi) + 1.0) / 2.0;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, diskTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, diskTexCoords, gl.DYNAMIC_DRAW);

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

  // Load the obstacle texture if not already loaded
  if (obstacleTexture == null) {
    obstacleTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, obstacleTexture);
    // Set default texture while loading
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    // Load the actual texture
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, obstacleTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    img.src = "images/bun_white.png";
  }

  // Update the rendering code to use the texture
  gl.useProgram(meshShader);
  gl.uniform2f(
    gl.getUniformLocation(meshShader, "domainSize"),
    simWidth,
    simHeight,
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
  gl.uniform1f(
    gl.getUniformLocation(meshShader, "rotation"),
    scene.obstacleAng,
  );

  // Bind the texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, obstacleTexture);
  gl.uniform1i(gl.getUniformLocation(meshShader, "texture"), 0);

  // Set up vertex attributes
  posLoc = gl.getAttribLocation(meshShader, "attrPosition");
  gl.enableVertexAttribArray(posLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, diskVertBuffer);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Set up texture coordinate attribute
  var texCoordLoc = gl.getAttribLocation(meshShader, "attrTexCoord");
  gl.enableVertexAttribArray(texCoordLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, diskTexCoordBuffer);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, diskIdBuffer);
  gl.drawElements(gl.TRIANGLES, 3 * numSegs, gl.UNSIGNED_SHORT, 0);
  gl.disableVertexAttribArray(posLoc);
  gl.disableVertexAttribArray(texCoordLoc);
}

var mouseDown = false;

function startDrag(x, y) {
  if (scene.forceMode) return;
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
  if (scene.forceMode) return;
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

// Water obstacle collision tracking
var waterCollisionCount = 0;
var lastWaterCollisionCount = 0;
var waterCollisionIncrement = 0;
var lastWaterCollisionTime = 0;
// Tank volume control
let tankVolume = 0.5;

const waterCollisionThreshold = 5; // Minimum collisions to trigger sound
const waterCollisionCooldown = 0; // ms between sounds

// Function to play water obstacle collision sound
function playWaterObstacleSound(collisionIntensity) {
  // Randomly select one of the water collision sounds
  const soundIndex = Math.floor(Math.random() * 5) + 1;
  const soundFile = `audio/water/into${soundIndex}.mp3`;

  // Calculate volume based on collision intensity
  const volume = Math.min(Math.pow(collisionIntensity * 0.05, 1.0), 1.0);

  const waterAudio = waterObstacleAudioPool.getAudio(soundFile);
  waterAudio.currentTime = 0;
  waterAudio.volume = volume * tankVolume;
  waterAudio.playbackRate = 0.5 + Math.random() * 1; // Slight pitch variation
  waterAudio.play().catch((e) => console.log("Audio play failed:", e));
}

// Splash sound tracking
var relativeVelocitySum = 0.0;
var lastSplashTime = 0;
const splashCooldown = 100; // ms between splash sounds
const splashLowThreshold = 50; // Threshold for low splash sound
const splashHighThreshold = 200; // Threshold for high splash sound

// Function to play splash sound based on velocity
function playSplashSound(velocitySum) {
  // if (!soundEnabled) return;

  const currentTime = Date.now();
  if (currentTime - lastSplashTime < splashCooldown) return;

  // Randomly select one of the water collision sounds
  const soundIndex = Math.floor(Math.random() * 3) + 1;

  let soundFile;
  if (velocitySum >= splashHighThreshold) {
    soundFile = `audio/water/high${soundIndex}.mp3`;
  } else if (velocitySum >= splashLowThreshold) {
    soundFile = `audio/water/low${soundIndex}.mp3`;
  } else {
    return; // Not enough velocity for splash
  }

  const splashAudio = waterObstacleAudioPool.getAudio(soundFile);
  splashAudio.currentTime = 0;
  // Calculate volume based on velocity sum
  const volume = Math.min(Math.pow(velocitySum * 0.005, 0.7), 1.0);
  splashAudio.volume = volume * tankVolume;
  splashAudio.playbackRate = 0.9 + Math.random() * 0.2; // Slight pitch variation
  splashAudio.play().catch((e) => console.log("Audio play failed:", e));

  lastSplashTime = currentTime;
}

// Wave sound tracking
var avgAbsoluteVelocity = 0.0;
var prevAvgAbsoluteVelocity = 0;
var velocityChange = 0.0;
var lastWaveTime = 0;
var lastConstantTime = 0;
const waveSoundCooldown = 500; // ms between wave sounds
const constantSoundCooldown = 500; // ms between constant sounds
const waveUpThreshold = 0.05; // Positive threshold for up sound
const waveDownThreshold = -0.02; // Negative threshold for down sound
const constantSoundThreshold = 0.1; // Threshold for constant sound trigger

// Function to play wave sound based on velocity change
function playWaveSound(velocityChange) {
  var currentTime = Date.now();
  if (currentTime - lastWaveTime >= waveSoundCooldown) {
    // Randomly select one of the wave sound sounds
    const soundIndex = Math.floor(Math.random() * 3) + 1;

    let soundFile;
    if (velocityChange > waveUpThreshold) {
      soundFile = `audio/water/up${soundIndex}.mp3`;
    } else if (velocityChange <= waveDownThreshold) {
      soundFile = `audio/water/down${soundIndex}.mp3`;
    } else {
      return; // Not enough velocity change for wave sound
    }

    const waveAudio = waterWaveAudioPool.getAudio(soundFile);
    waveAudio.currentTime = 0;
    // Calculate volume based on velocity change magnitude
    const volume = Math.min(
      velocityChange > 0 ? velocityChange * 10 : -velocityChange * 25,
      1.0,
    );
    waveAudio.volume = volume * tankVolume;
    waveAudio.playbackRate = 0.9 + Math.random() * 0.2; // Slight pitch variation
    waveAudio.play().catch((e) => console.log("Audio play failed:", e));
    lastWaveTime = currentTime;
  }
}

// Function to play wave sound based on velocity change
function playConstantSound(velocity) {
  var currentTime = Date.now();
  if (currentTime - lastConstantTime >= constantSoundCooldown) {
    // Randomly select one of the constant sound sounds
    const soundIndex = Math.floor(Math.random() * 2) + 1;

    let soundFile;
    if (velocity > constantSoundThreshold) {
      soundFile = `audio/water/constant${soundIndex}.mp3`;
    } else {
      return; // Not enough velocity change for wave sound
    }

    const waveAudio = waterWaveAudioPool.getAudio(soundFile);
    waveAudio.currentTime = 0;
    // Calculate volume based on velocity change magnitude
    const volume = Math.min(Math.pow(velocity * 0.5, 1.5), 1.0);
    waveAudio.volume = volume * tankVolume;
    waveAudio.playbackRate = 0.9 + Math.random() * 0.2; // Slight pitch variation
    waveAudio.play().catch((e) => console.log("Audio play failed:", e));
    lastConstantTime = currentTime;
  }
}

// Spray sound tracking
var sprayCount = 0;
var lastSprayCount = 0;
var sprayIncrement = 0;
var lastSprayTime = 0;
const sprayUpThresholdLow = 20; // Positive threshold for up sound
const sprayUpThresholdHigh = 200; // Positive threshold for up sound high
const sprayDownThresholdLow = -20; // Negative threshold for down sound
const sprayDownThresholdHigh = -200; // Negative threshold for down sound sound high
const sprayCooldown = 500; // ms between sounds

// Function to play water obstacle collision sound
function playSpraySound(sprayIntensity) {
  const currentTime = Date.now();
  if (currentTime - lastSprayTime > sprayCooldown) {
    const soundIndex = Math.floor(Math.random() * 3) + 1;

    let soundFile;
    if (sprayIntensity > sprayUpThresholdHigh) {
      soundFile = `audio/water/maxuphigh${soundIndex}.mp3`;
    } else if (sprayIntensity > sprayUpThresholdLow) {
      soundFile = `audio/water/maxuplow${soundIndex}.mp3`;
    } else if (sprayIntensity < sprayDownThresholdLow) {
      soundFile = `audio/water/maxdownlow${soundIndex}.mp3`;
    } else if (sprayIntensity < sprayDownThresholdHigh) {
      soundFile = `audio/water/maxdownhigh${soundIndex}.mp3`;
    } else {
      return; // Not enough velocity change for spray sound
    }

    // Calculate volume based on collision intensity
    const volume = Math.min(
      Math.pow(
        sprayIntensity > 0 ? sprayIntensity * 0.001 : -sprayIntensity * 0.001,
        0.2,
      ),
      1.0,
    );

    const sprayAudio = sprayAudioPool.getAudio(soundFile);
    sprayAudio.currentTime = 0;
    sprayAudio.volume = volume * tankVolume;
    sprayAudio.playbackRate = 0.5 + Math.random() * 1; // Slight pitch variation
    sprayAudio.play().catch((e) => console.log("Audio play failed:", e));
  }
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
  button.innerHTML = scene.paused
    ? window.getTranslatedText
      ? window.getTranslatedText("继续")
      : "继续"
    : window.getTranslatedText
      ? window.getTranslatedText("暂停")
      : "暂停";
}

document.addEventListener("DOMContentLoaded", function () {
  const pauseBtn = document.getElementById("pauseButton");
  const dragHint = document.getElementById("dragHint");
  const dragHint2 = document.getElementById("dragHint2");

  if (pauseBtn && dragHint) {
    // Initial check - use visibility instead of display
    const pauseTextZh = "暂停";
    const pauseTextEn = window.getTranslatedText
      ? window.getTranslatedText("暂停")
      : "暂停";
    dragHint.style.visibility =
      pauseBtn.textContent.trim() === pauseTextZh ||
        pauseBtn.textContent.trim() === pauseTextEn
        ? "visible"
        : "hidden";

    // Observe text content changes
    const observer = new MutationObserver(() => {
      dragHint.style.visibility =
        pauseBtn.textContent.trim() === pauseTextZh ||
          pauseBtn.textContent.trim() === pauseTextEn
          ? "visible"
          : "hidden";
    });

    observer.observe(pauseBtn, {
      characterData: true,
      subtree: true,
      childList: true,
    });
  }
  if (pauseBtn && dragHint2) {
    // Initial check - use visibility instead of display
    const pauseTextZh2 = "暂停";
    const pauseTextEn2 = window.getTranslatedText
      ? window.getTranslatedText("暂停")
      : "暂停";
    dragHint2.style.visibility =
      pauseBtn.textContent.trim() === pauseTextZh2 ||
        pauseBtn.textContent.trim() === pauseTextEn2
        ? "visible"
        : "hidden";

    // Observe text content changes
    const observer = new MutationObserver(() => {
      dragHint2.style.visibility =
        pauseBtn.textContent.trim() === pauseTextZh2 ||
          pauseBtn.textContent.trim() === pauseTextEn2
          ? "visible"
          : "hidden";
    });

    observer.observe(pauseBtn, {
      characterData: true,
      subtree: true,
      childList: true,
    });
  }
});

// Global variable to hold the toggleMusic function
let toggleMusicFunction = null;

// Global audio references
let bgmAudio = null;

// Global volume settings
let globalBgmVolume = 0.5;
let globalSfxVolume = 0.5;

// Centralized function to play SFX with global volume
function playSFX(src, baseVolume = 1) {
  const audio = new Audio(src);
  audio.currentTime = 0;
  audio.volume = baseVolume * globalSfxVolume;
  audio.play().catch((e) => console.log("SFX play failed:", e));
}

// Function to set SFX volume globally
function setSfxVolume(volume) {
  globalSfxVolume = Math.max(0, Math.min(1, volume));
}

// Function to set BGM volume globally
function setBgmVolume(volume) {
  globalBgmVolume = Math.max(0, Math.min(1, volume));
  if (bgmAudio) {
    bgmAudio.volume = globalBgmVolume;
  }
}

// Floating Music Button Functionality
document.addEventListener("DOMContentLoaded", function () {
  const musicBtn = document.getElementById("floatingMusicBtn");
  const textContainer = document.querySelector(".music-text-container");
  const musicText = document.querySelector(".music-text");
  let audio = null;
  let isPlaying = false;
  let animationFrameId = null;
  let scrollPosition = 0;
  let scrollDirection = 1;
  let scrollSpeed = 0.5;

  // Preload button sound
  const buttonSound = new Audio("audio/button.m4a");

  // Initialize audio element
  function initAudio() {
    audio = new Audio("audio/KevinVillecco-Yoshigemia.mp3");
    audio.volume = globalBgmVolume;
    audio.loop = true;
    // Store reference globally
    bgmAudio = audio;
  }

  // Attract attention animation for music button
  function startAttentionAnimation() {
    if (!isPlaying && musicBtn) {
      // Animation: expand and shrink twice in 1 second
      musicBtn.classList.add("attention");
      setTimeout(() => {
        musicBtn.classList.remove("attention");
        // Schedule next animation in 10 seconds
        attentionInterval = setTimeout(startAttentionAnimation, 10000);
      }, 1000);
    }
  }

  // Start attention animation
  let attentionInterval = setTimeout(startAttentionAnimation, 1000);

  // Toggle music play/pause
  function toggleMusic() {
    if (!audio) {
      initAudio();
    }

    if (isPlaying) {
      audio.pause();
      musicBtn.classList.remove("playing");
      textContainer.classList.remove("scrolling");
      cancelAnimationFrame(animationFrameId);
    } else {
      audio.play();
      musicBtn.classList.add("playing");
      startScrolling();
      // Stop attention animation when music starts
      if (attentionInterval) {
        clearTimeout(attentionInterval);
        attentionInterval = null;
      }
      musicBtn.classList.remove("attention");
    }
    isPlaying = !isPlaying;
  }

  // Start scrolling animation
  function startScrolling() {
    const textWidth = musicText.offsetWidth;
    const containerWidth = textContainer.offsetWidth;

    function animate() {
      if (scrollDirection === 1) {
        // Scroll left
        scrollPosition += scrollSpeed;
        if (scrollPosition >= textWidth - 0.5 * containerWidth) {
          scrollDirection = -1;
        }
      } else {
        // Scroll right
        scrollPosition -= scrollSpeed;
        if (scrollPosition <= -0.5 * containerWidth) {
          scrollDirection = 1;
        }
      }

      musicText.style.transform = `translateX(-${scrollPosition}px)`;
      animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  // Add click event listener
  if (musicBtn) {
    musicBtn.addEventListener("click", toggleMusic);
  }
  // Add click event listeners to all other buttons (except page buttons)
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    // Skip music button, page buttons, and buttons inside volume controls
    const isVolumeControl = button.closest(".volume-control") !== null;
    const isOptionsWindow = button.closest(".options-window") !== null;
    if (
      button.id !== "floatingMusicBtn" &&
      !button.classList.contains("page-btn") &&
      !isVolumeControl &&
      !isOptionsWindow
    ) {
      button.addEventListener("click", function () {
        // Play button sound
        buttonSound.currentTime = 0; // Reset sound to start
        buttonSound.volume = globalSfxVolume;
        buttonSound.play();
      });
    }
  });

  // Make toggleMusic available globally
  toggleMusicFunction = toggleMusic;
});

// Floating Options Button Functionality
document.addEventListener("DOMContentLoaded", function () {
  const optionsBtn = document.getElementById("floatingOptionsBtn");
  const optionsWindow = document.getElementById("optionsWindow");
  const optionsOverlay = document.getElementById("optionsOverlay");
  const closeOptionsBtn = document.getElementById("closeOptionsBtn");
  const bgmVolumeSlider = document.getElementById("bgmVolumeSlider");
  const sfxVolumeSlider = document.getElementById("sfxVolumeSlider");
  const bgmVolumeValue = bgmVolumeSlider?.nextElementSibling;
  const sfxVolumeValue = sfxVolumeSlider?.nextElementSibling;

  // Was timer running before options window opened
  let wasTimerRunning = false;

  // Update volume display
  function updateVolumeDisplay(slider, valueElement) {
    const volume = parseFloat(slider.value);
    valueElement.textContent = Math.round(volume * 100) + "%";
  }

  // Open options window
  function openOptionsWindow() {
    optionsWindow.style.display = "block";
    optionsOverlay.style.display = "block";

    // Pause timer only if it's running (timerInterval is not null)
    wasTimerRunning = timerInterval !== null;
    if (wasTimerRunning) {
      pauseTimer();
    }

    // Disable mouse interactions outside the window
    document.body.style.pointerEvents = "none";
    optionsWindow.style.pointerEvents = "auto";
    optionsOverlay.style.pointerEvents = "auto";
    optionsBtn.style.pointerEvents = "none";
  }

  // Close options window
  function closeOptionsWindow() {
    optionsWindow.style.display = "none";
    optionsOverlay.style.display = "none";

    // Resume timer only if:
    // 1. It was running before opening the window
    // 2. Not all puzzles are solved
    // 3. Timer is not 0
    // 4. Stop button has not been clicked (still enabled)
    if (wasTimerRunning && !allSolved.every(Boolean) && timer !== 0 && !stopBtn.disabled) {
      resumeTimer();
    }

    // Restore mouse interactions
    document.body.style.pointerEvents = "auto";
    optionsBtn.style.pointerEvents = "auto";
  }

  // Function to update options button image
  function updateOptionsButtonImage(isPausedState) {
    const btnImg = optionsBtn.querySelector("img");
    if (btnImg) {
      btnImg.src = isPausedState ? "images/pause.png" : "images/option.png";
    }
  }

  // Listen for start button click to change to pause icon
  const startBtn = document.getElementById("startBtn");
  startBtn?.addEventListener("click", function () {
    updateOptionsButtonImage(true);
  });

  // Listen for confirm button click to change back to option icon
  const confirmBtn = document.getElementById("confirmBtn");
  confirmBtn?.addEventListener("click", function () {
    updateOptionsButtonImage(false);
  })

  // BGM volume change handler
  bgmVolumeSlider?.addEventListener("input", function () {
    const volume = parseFloat(this.value);
    updateVolumeDisplay(this, bgmVolumeValue);
    setBgmVolume(volume);
  });

  // SFX volume change handler
  sfxVolumeSlider?.addEventListener("input", function () {
    const volume = parseFloat(this.value);
    updateVolumeDisplay(this, sfxVolumeValue);
    setSfxVolume(volume);
  });

  // Event listeners
  optionsBtn?.addEventListener("click", openOptionsWindow);
  closeOptionsBtn?.addEventListener("click", closeOptionsWindow);
  optionsOverlay?.addEventListener("click", closeOptionsWindow);

  // Initialize volume displays
  if (bgmVolumeSlider && bgmVolumeValue) {
    updateVolumeDisplay(bgmVolumeSlider, bgmVolumeValue);
  }
  if (sfxVolumeSlider && sfxVolumeValue) {
    updateVolumeDisplay(sfxVolumeSlider, sfxVolumeValue);
  }
});

// Helper function to play audio with SFX volume
function playAudioWithVolume(audio, volume = 1) {
  audio.volume = volume * (window.sfxVolume || 0.5);
  audio.play().catch((e) => console.log("Audio play failed:", e));
}

// Floating Language Switch Button Functionality
document.addEventListener("DOMContentLoaded", function () {
  const langBtn = document.getElementById("floatingLangBtn");

  // Translation mapping with element selectors
  const translationElements = [
    // Page 1 - Home
    {
      selector: "#startText",
      zh: "按任意键开始",
      en: "press any key to start",
    },
    {
      selector: "#loadingBar div:first-child",
      zh: "加载中……",
      en: "loading...",
    },

    // Page 2 - Registration
    {
      selector: "#page2 .text-row p:first-child",
      zh: "拼 图 侠 注 册 页",
      en: "Puzzle Hero Registration",
    },
    {
      selector: "#page2 .text-row p:last-child",
      zh: "榜上有名，只是时间问题",
      en: "fame is just a matter of time",
    },
    {
      selector: "#nicknameInput",
      zh: "输入昵称",
      en: "enter nickname",
      attr: "placeholder",
    },
    {
      selector: ".difficulty-settings p",
      zh: "选择难度：",
      en: "select difficulty:",
    },
    { selector: ".source-settings p", zh: "选择图包：", en: "select source:" },
    { selector: "#difficulty1", zh: "休闲", en: "easy" },
    { selector: "#difficulty2", zh: "普通", en: "medium" },
    { selector: "#difficulty3", zh: "困难", en: "hard" },
    { selector: "#difficulty4", zh: "炼狱", en: "HELL" },
    { selector: "#startBtn", zh: "点我开始！", en: "start!" },
    { selector: "#source1", zh: "经典三连", en: "classic triple" },
    { selector: "#source2", zh: "世界名画", en: "masterpieces" },
    { selector: "#source3", zh: "敬请期待", en: "coming soon" },

    // Page 3 - Puzzle 1
    {
      selector: "#page3Title",
      zh: "会动的拼图怎么不算 动 作 游 戏 呢",
      en: "a moving puzzle is totally an action game",
    },

    // Page 4 - Puzzle 2
    {
      selector: "#page4Title",
      zh: "防止你胜利的秘诀在于 隐身",
      en: "the secret to prevent your victory is invisibility",
    },

    // Page 5 - Puzzle 3
    {
      selector: "#page5Title",
      zh: "你只能在最近最近的位置找到我！",
      en: "you can only find me at the closest position!",
    },

    // Page 6 - Results & Ranking
    {
      selector: "#page6 h2:first-child",
      zh: "结果与排名",
      en: "Results & Ranking",
    },
    { selector: "#confirmBtn", zh: "确认", en: "confirm" },
    { selector: "#restartBtn", zh: "重新开始", en: "restart" },
    { selector: "#topBtn", zh: "回到首页", en: "back to home" },
    {
      selector: ".personal-ranking h3",
      zh: "个人历史成绩",
      en: "personal history",
    },
    { selector: ".global-ranking h3", zh: "全服最佳", en: "global best" },
    {
      selector: "#congratulationsText h2",
      zh: "往下有惊喜",
      en: "surprise below",
    },
    { selector: "#pauseButton", zh: "开始", en: "start" },
    {
      selector: '[onclick="toggleForce()"]',
      zh: "原力同在",
      en: "may the Force be with you",
    },
    {
      selector: '[onclick="toggleColor()"]',
      zh: "换个颜色",
      en: "change color",
    },
    { selector: 'label[for="tankVolumeSlider"]', zh: "音量", en: "volume" },
    { selector: "#dragHint", zh: "试着鼠标拽一下我", en: "try dragging me" },
    { selector: '[onclick="setupSceneGravity()"]', zh: "重来", en: "reset" },
    {
      selector: '[onclick="toggleGravity()"]',
      zh: "取消重力",
      en: "toggle gravity",
    },
    {
      selector: '[onclick="toggleSound()"]',
      zh: "来点动静",
      en: "toggle sound",
    },
    {
      selector: '[onclick="toggleBilliards()"]',
      zh: "试下壁纸",
      en: "try wallpaper",
    },
    { selector: "#dragHint2", zh: "试着鼠标拽一下我", en: "try dragging me" },

    // Floating controls (拼图页)
    { selector: "#stopBtn", zh: "停止", en: "stop" },
    { selector: "#restartBtnFloat", zh: "重新开始", en: "restart" },

    // Floating kid mode button
    { selector: "#floatingKidBtn", zh: "小孩内桌", en: "Kid Mode" },

    // Footer
    { selector: ".footer-link", zh: "隐私政策", en: "Privacy Policy" },
    { selector: ".wechat-text", zh: "微信公众号", en: "Wechat Official Account" }
  ];

  // Dynamic text translations (used in functions)
  const dynamicTexts = {
    // Page 5 hint
    "鼠标挪出来，啥都能看见~！": "Move mouse out to see everything!",

    // Time unit
    秒: "sec",

    // Difficulty levels
    休闲: "easy",
    普通: "medium",
    困难: "hard",
    炼狱: "HELL",

    // Dynamic start text
    按任意键开始: "press any key to start",
    本页有惊喜: "this page has surprises",

    // Tank scene
    继续: "resume",
    暂停: "pause",
    青花瓷: "Blue Porcelain",
    水墨画: "Ink Painting",
    游泳池: "Swimming Pool",
    原力同在: "may the FORCE be with you",
    原力散去: "FORCE dissipates",

    // Gravity scene
    开启重力: "enable gravity",
    取消重力: "disable gravity",
    来点动静: "make sound",
    安静一下: "mute sound",
    来张壁纸: "add wallpaper",
    不要壁纸: "remove wallpaper",
  };

  // Function to toggle language
  function toggleLanguage() {
    if (currentLang === "zh") {
      // Switch to English
      currentLang = "en";
      langBtn.textContent = "中文";
      translatePage(currentLang);
    } else {
      // Switch to Chinese
      currentLang = "zh";
      langBtn.textContent = "EN";
      translatePage(currentLang);
    }
    // Update loading text when language changes
    const loadingElement = document.querySelector("#loadingBar div:first-child");
    if (loadingElement && loadingElement.style.display !== "none") {
      loadingElement.textContent = loadingTexts[currentLang][loadingTextIndex];
    }

    // Update sliding text with new language
    updateSlidingText();

    // Update kid mode button text based on current language
    const kidBtn = document.getElementById("floatingKidBtn");
    if (kidBtn && typeof window.isKidMode === "function") {
      const isKid = window.isKidMode();
      kidBtn.textContent = isKid
        ? currentLang === "zh"
          ? "大人内桌"
          : "Adult Mode"
        : currentLang === "zh"
          ? "小孩内桌"
          : "Kid Mode";
    }

    // Re-render records with new language
    if (typeof updatePersonalList === "function") {
      updatePersonalList();
    }
    if (typeof updateGlobalList === "function") {
      updateGlobalList();
    }

    // Update sliding text
    updateSlidingText();

    // Update navigation button images using dynamic CSS injection
    updateNavImages(currentLang);

    // Note: Language preference is not saved to localStorage
  }

  // Function to update navigation button images
  function updateNavImages(lang) {
    // Remove existing style element if it exists
    const existingStyle = document.getElementById("nav-lang-style");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const style = document.createElement("style");
    style.id = "nav-lang-style";

    if (lang === "en") {
      style.textContent = `
        .page-nav .page-btn:nth-child(2).active,
        .page-nav .page-btn:nth-child(2).has-been-active {
          background: url('images/b2en.png') no-repeat center center !important;
          background-size: 110% !important;
        }
        .page-nav .page-btn:nth-child(6).active,
        .page-nav .page-btn:nth-child(6).has-been-active {
          background: url('images/b6en.png') no-repeat center center !important;
          background-size: 110% !important;
        }
      `;
    } else {
      style.textContent = `
        .page-nav .page-btn:nth-child(2).active,
        .page-nav .page-btn:nth-child(2).has-been-active {
          background: url('images/b2.png') no-repeat center center !important;
          background-size: 110% !important;
        }
        .page-nav .page-btn:nth-child(6).active,
        .page-nav .page-btn:nth-child(6).has-been-active {
          background: url('images/b6.png') no-repeat center center !important;
          background-size: 110% !important;
        }
      `;
    }

    document.head.appendChild(style);
  }

  // Function to translate the page
  function translatePage(targetLang) {
    translationElements.forEach((item) => {
      const element = document.querySelector(item.selector);
      if (element) {
        const text = targetLang === "en" ? item.en : item.zh;
        if (item.attr) {
          element.setAttribute(item.attr, text);
        } else {
          element.textContent = text;
        }
      }
    });

    // Update document language attribute
    document.documentElement.lang = targetLang;
  }

  // Initialize language: default is Chinese
  langBtn.textContent = "EN";

  // Add click event listener
  if (langBtn) {
    langBtn.addEventListener("click", toggleLanguage);
  }

  // Helper function to get translated text
  function getText(key) {
    if (currentLang === "en" && dynamicTexts[key]) {
      return dynamicTexts[key];
    }
    return key;
  }

  // Make functions available globally
  window.toggleLanguage = toggleLanguage;
  window.getCurrentLang = function () {
    return currentLang;
  };
  window.getTranslatedText = getText;

  window.updateSlidingText = window.updateSlidingText;
});

// Floating Kid Mode Button Functionality
document.addEventListener("DOMContentLoaded", function () {
  const kidBtn = document.getElementById("floatingKidBtn");
  let isKidMode = false;

  // Function to toggle kid mode
  function toggleKidMode() {
    isKidMode = !isKidMode;

    if (isKidMode) {
      // Switch to kid mode
      kidBtn.textContent = currentLang === "zh" ? "大人内桌" : "Adult Mode";
    } else {
      // Switch back to normal mode
      kidBtn.textContent = currentLang === "zh" ? "小孩内桌" : "Kid Mode";
    }
  }

  // Add click event listener
  if (kidBtn) {
    kidBtn.addEventListener("click", toggleKidMode);
  }

  // Make functions and variables available globally
  window.isKidMode = function () {
    return isKidMode;
  };
  window.toggleKidMode = toggleKidMode;
});

// Note: Translation is now handled directly in the language switch functionality above

// Add this function to calculate average absolute velocity
function calculateVelocity() {
  let totalAbsoluteVelocity = 0;
  let currentSprayCount = 0;
  for (let i = 0; i < scene.fluid.numParticles; i++) {
    const vx = scene.fluid.particleVel[2 * i];
    const vy = scene.fluid.particleVel[2 * i + 1];
    const speed = Math.sqrt(vx * vx + vy * vy);
    totalAbsoluteVelocity += speed;
    if (speed > 1) {
      currentSprayCount++;
    }
  }

  sprayCount = currentSprayCount;
  avgAbsoluteVelocity = totalAbsoluteVelocity / scene.fluid.numParticles;
}

function applyForceToParticles() {
  if (!scene.forceMode || !scene.mouseDown) return;

  var f = scene.fluid;
  var dx, dy, distance, force, fx, fy;

  for (var i = 0; i < f.numParticles; i++) {
    var px = f.particlePos[2 * i];
    var py = f.particlePos[2 * i + 1];

    dx = scene.mouseX - px;
    dy = scene.mouseY - py;
    distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < scene.maxDistance) {
      // Calculate force magnitude: constant within minDistance, then 1/distance
      if (distance < scene.minDistance) {
        force = scene.forceMagnitude;
      } else {
        force = scene.forceMagnitude * (scene.minDistance / distance);
      }

      // Normalize direction
      fx = (dx / distance) * force;
      fy = (dy / distance) * force;

      // Apply force to particle velocity
      f.particleVel[2 * i] += fx * scene.dt;
      f.particleVel[2 * i + 1] += fy * scene.dt;
    }
  }
}

function applyForceToObstacle() {
  if (!scene.forceMode || !scene.mouseDown) return;

  var dx = scene.mouseX - scene.obstacleX;
  var dy = scene.mouseY - scene.obstacleY;
  var distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0 && distance < scene.maxDistance) {
    // Calculate force magnitude: constant within minDistance, then 1/distance
    var force;
    if (distance < scene.minDistance) {
      force = scene.forceMagnitude;
    } else {
      force = scene.forceMagnitude * (scene.minDistance / distance);
    }

    // Normalize direction
    var fx = (dx / distance) * force;
    var fy = (dy / distance) * force;

    // Apply force to obstacle
    scene.obstacleVx += (fx / scene.obstacleMass) * scene.dt;
    scene.obstacleVy += (fy / scene.obstacleMass) * scene.dt;
  }
}

function simulateTank() {
  if (!scene.paused) {
    var sdt = scene.dt;

    // Apply force mode if enabled
    if (scene.forceMode) {
      applyForceToParticles();
      applyForceToObstacle();
    }

    // Add the obstacle physics right before integrating the fluid step
    updateObstaclePhysics(sdt);

    // Use zero gravity when force mode is enabled
    var gravity = scene.forceMode ? 0 : scene.gravity;
    scene.fluid.integrateParticles(sdt, gravity);
    if (scene.separateParticles)
      scene.fluid.pushParticlesApart(scene.numParticleIters);
    scene.fluid.handleParticleCollisions(
      scene.obstacleX,
      scene.obstacleY,
      scene.obstacleRadius,
      scene.obstacleVx,
      scene.obstacleVy,
      scene.obstacleOmega,
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

    // Calculate average absolute velocity and check for wave sounds
    calculateVelocity();
    playConstantSound(avgAbsoluteVelocity);
    velocityChange = avgAbsoluteVelocity - prevAvgAbsoluteVelocity;
    playWaveSound(velocityChange);
    prevAvgAbsoluteVelocity = avgAbsoluteVelocity;
    sprayIncrement = sprayCount - lastSprayCount;
    playSpraySound(sprayIncrement);
    lastSprayCount = sprayCount;
  }
}

// drawing -------------------------------------------------------

var canvas2 = document.getElementById("myCanvas2");
var c = canvas2.getContext("2d");

// Set canvas actual size to match CSS size (1000x500)
canvas2.width = 1000;
canvas2.height = 500;

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
  gravity: new Vector2(0.0, 0.0),
  dt: 1.0 / 60.0,
  worldSize: new Vector2(simWidth2, simHeight2),
  paused: true,
  balls: [],
  restitution: 1,
  G: 9.8, // Gravitational constant
  gravityEnabled: true, // Track if gravity is enabled
  ballBallSoundAdjustment: 5000,
  ballWallSoundAdjustment: 100,
  billiardsMode: false,
  billiardsClickCount: 0,
  currentWallpaper: null,
  previousWallpaper: null,
  wallpaperOffset: { x: 0, y: 0 },
  wallpaperImages: [
    "images/wp1.jpg",
    "images/wp2.jpg",
    "images/wp3.jpg",
    "images/wp4.jpg",
    "images/wp5.jpg",
  ],
  wallpaperImage: new Image(),
};

// Add a fixed index for the draggable ball (always the third ball)
var DRAGGABLE_BALL_INDEX = 2;

// Modify setupSceneGravity to always have 3 balls with the third one being draggable
function setupSceneGravity() {
  physicsScene.balls = [];
  var numBalls = 3; // Always 3 balls

  for (i = 0; i < numBalls; i++) {
    var radius = 0.01 * (i === 0 ? 6.4 : i === 1 ? 3.5 : 4.0); // Third ball has radius 0.04
    var mass = Math.PI * radius * radius;
    var inertia = (mass * radius * radius) / 2.0;
    var pos = new Vector2(
      Math.random() * simWidth2,
      Math.random() * simHeight2,
    );
    var vel = new Vector2(
      // -1.0 + 2.0 * Math.random(),
      // -1.0 + 2.0 * Math.random(),
      0.0,
      0.0,
    );
    var ang = 0.0; // 初始角度
    var omega = 0.0; // 初始角速度

    physicsScene.balls.push(
      new Ball(radius, mass, inertia, pos, vel, ang, omega),
    );
  }

  // Reset drag tracking
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
      // Calculate random offset within wallpaper bounds
      // Ensure canvas fits within wallpaper
      const maxOffsetX = Math.max(0, physicsScene.wallpaperImage.width - 1344);
      const maxOffsetY = Math.max(0, physicsScene.wallpaperImage.height - 768);
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

// Functions to handle dragging for canvas2 - always drag the fixed ball
function startDrag2(x, y) {
  let bounds = canvas2.getBoundingClientRect();
  let mx = x - bounds.left - canvas2.clientLeft;
  let my = y - bounds.top - canvas2.clientTop;

  // Convert mouse coordinates to simulation coordinates
  let simX = mx / cScale2;
  let simY = (canvas2.height - my) / cScale2; // Flip Y coordinate

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

    // Convert mouse coordinates to simulation coordinates
    let newX = mx / cScale2;
    let newY = (canvas2.height - my) / cScale2; // Flip Y coordinate

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

// Preload wallpaper images
physicsScene.wallpaperImages.forEach((src) => {
  const img = new Image();
  img.src = src;
});

// draw -------------------------------------------------------

// Load images for the balls
var bunImage = new Image();
bunImage.src = "images/bun_white.png";

var earthImage = new Image();
earthImage.src = "images/earth.png";

var moonImage = new Image();
moonImage.src = "images/moon.png";

function drawGravity() {
  // Clear canvas
  c.clearRect(0, 0, canvas2.width, canvas2.height);

  // Draw wallpaper if in billiards mode and wallpaper is loaded
  if (
    physicsScene.billiardsMode &&
    physicsScene.currentWallpaper &&
    physicsScene.wallpaperImage.complete
  ) {
    // Calculate source rectangle to ensure we don't draw outside the image
    const srcX = Math.max(0, physicsScene.wallpaperOffset.x);
    const srcY = Math.max(0, physicsScene.wallpaperOffset.y);
    const srcWidth = Math.min(1344, physicsScene.wallpaperImage.width - srcX);
    const srcHeight = Math.min(768, physicsScene.wallpaperImage.height - srcY);

    // Calculate destination rectangle to fit within canvas
    const destWidth = (srcWidth / 1344) * canvas2.width;
    const destHeight = (srcHeight / 768) * canvas2.height;
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

    if (i === 0 && earthImage.complete) {
      // Draw earth image for the biggest ball
      c.drawImage(earthImage, -radius, -radius, radius * 2, radius * 2);
    } else if (i === 1 && moonImage.complete) {
      // Draw moon image for the smallest ball
      c.drawImage(moonImage, -radius, -radius, radius * 2, radius * 2);
    } else if (i === DRAGGABLE_BALL_INDEX && bunImage.complete) {
      // Draw the bun image for the draggable ball
      c.drawImage(bunImage, -radius, -radius, radius * 2, radius * 2);
    } else {
      // Draw regular balls as circles
      c.beginPath();
      c.arc(0, 0, radius, 0.0, 2.0 * Math.PI);
      c.closePath();
      c.fill();
    }

    // 恢复Canvas状态
    c.restore();
  }
}

// Global sound enable state
let soundEnabled = false;

// Audio pool for ball-wall collision sounds
const ballWallAudioPool = {
  audioObjects: [],
  maxPoolSize: 10,

  getAudio() {
    // Find an available audio object
    for (let audio of this.audioObjects) {
      if (audio.ended || audio.currentTime === 0) {
        return audio;
      }
    }

    // Create a new audio object if pool is not full
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio("audio/ballwall.mp3");
      this.audioObjects.push(newAudio);
      return newAudio;
    }

    // If pool is full, return the oldest one
    return this.audioObjects[0];
  },
};

// Audio pool for ball-ball collision sounds
const ballBallAudioPool = {
  audioObjects: [],
  maxPoolSize: 3,

  getAudio() {
    // Find an available audio object
    for (let audio of this.audioObjects) {
      if (audio.ended || audio.currentTime === 0) {
        return audio;
      }
    }

    // Create a new audio object if pool is not full
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio("audio/ballball.mp3");
      this.audioObjects.push(newAudio);
      return newAudio;
    }

    // If pool is full, return the oldest one
    return this.audioObjects[0];
  },
};

// Audio pool for obstacle wall collision sounds
const ballGlassAudioPool = {
  audioObjects: [],
  maxPoolSize: 10,

  getAudio(soundFile) {
    // Find an available audio object
    for (let audio of this.audioObjects) {
      if (audio.ended || audio.currentTime === 0) {
        audio.src = soundFile;
        return audio;
      }
    }

    // Create a new audio object if pool is not full
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio(soundFile);
      this.audioObjects.push(newAudio);
      return newAudio;
    }

    // If pool is full, return the oldest one and update its source
    const oldestAudio = this.audioObjects[0];
    oldestAudio.src = soundFile;
    return oldestAudio;
  },
};

// Audio pool for water obstacle collision sounds
const waterObstacleAudioPool = {
  audioObjects: [],
  maxPoolSize: 10,

  getAudio(soundFile) {
    // Create a new audio object if pool is not full
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio(soundFile);
      this.audioObjects.push(newAudio);
      return newAudio;
    }

    // If all are playing, create a new one anyway (temporary fix)
    const newAudio = new Audio(soundFile);
    this.audioObjects.push(newAudio);
    // Remove oldest if pool exceeds max size
    if (this.audioObjects.length > this.maxPoolSize) {
      this.audioObjects.shift();
    }
    return newAudio;
  },
};

// Audio pool for water wave sounds
const waterWaveAudioPool = {
  audioObjects: [],
  maxPoolSize: 10,

  getAudio(soundFile) {
    // Create a new audio object if pool is not full
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio(soundFile);
      this.audioObjects.push(newAudio);
      return newAudio;
    }

    // If all are playing, create a new one anyway (temporary fix)
    const newAudio = new Audio(soundFile);
    this.audioObjects.push(newAudio);
    // Remove oldest if pool exceeds max size
    if (this.audioObjects.length > this.maxPoolSize) {
      this.audioObjects.shift();
    }
    return newAudio;
  },
};

// Audio pool for spray sounds
const sprayAudioPool = {
  audioObjects: [],
  maxPoolSize: 10,

  getAudio(soundFile) {
    // Create a new audio object if pool is not full
    if (this.audioObjects.length < this.maxPoolSize) {
      const newAudio = new Audio(soundFile);
      this.audioObjects.push(newAudio);
      return newAudio;
    }

    // If all are playing, create a new one anyway
    const newAudio = new Audio(soundFile);
    this.audioObjects.push(newAudio);
    // Remove oldest if pool exceeds max size
    if (this.audioObjects.length > this.maxPoolSize) {
      this.audioObjects.shift();
    }
    return newAudio;
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
    var finalAdjustment = 0.8;
    const ballwallAudio = ballWallAudioPool.getAudio();
    ballwallAudio.currentTime = 0;
    // Calculate volume proportional to square of normal velocity
    const volume = Math.min(Math.pow(Math.abs(normalMomentum), 2), 1);
    ballwallAudio.volume = finalAdjustment * volume;
    ballwallAudio.play().catch((e) => console.log("Audio play failed:", e));
  }
}

function playBallBallSound(normalMomentum) {
  if (soundEnabled) {
    // Calculate volume proportional to square of normal velocity
    const volume = Math.min(Math.pow(Math.abs(normalMomentum), 2), 1);

    // Cancel sound if gravity is on and volume is below 0.2
    if (physicsScene.gravityEnabled && volume < 0.1) {
      return;
    }

    const ballballAudio = ballBallAudioPool.getAudio();
    ballballAudio.currentTime = 0;
    ballballAudio.volume = volume;
    ballballAudio.play().catch((e) => console.log("Audio play failed:", e));
  }
}

function playBallGlassSound(normalVel) {
  // Set velocity threshold for long sound
  const velocityThreshold = 5.0;
  const absNormalVel = Math.abs(normalVel);

  // Select sound file based on velocity
  const soundFile =
    absNormalVel > velocityThreshold
      ? "audio/ballglasslong.mp3"
      : "audio/ballglassshort.mp3";

  // Calculate volume based on velocity (louder for faster impacts)
  const volume = Math.min(absNormalVel * 0.2, 1.0);

  const ballglassAudio = ballGlassAudioPool.getAudio(soundFile);
  ballglassAudio.currentTime = 0;
  ballglassAudio.volume = volume;
  // Add pitch randomization (0.8 to 1.2 times original pitch)
  ballglassAudio.pitch = (0.8 + Math.random() * 0.4) * ballglassAudio.pitch;
  ballglassAudio.playbackRate = 0.8 + Math.random() * 0.4;
  ballglassAudio.play().catch((e) => console.log("Audio play failed:", e));
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
  var invInertia1 = 2.0 / (m1 * ball1.radius * ball1.radius); // 球体的转动惯量 I = (2/5)mr²，但这里简化为 (1/2)mr²
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
  // ball1.omega -= impulseNormal * ball1.radius * invInertia1;
  // ball2.omega += impulseNormal * ball2.radius * invInertia2;

  // 计算切向冲量（摩擦力）
  var friction = 0.5; // 摩擦系数
  if (Math.abs(tangentVel) > 0.001) {
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

// ------------------------------------------------------

function handleWallCollision(ball, worldSize, restitution) {
  var friction = 0.5; // 摩擦系数
  var ballWallSoundAdjustment = physicsScene.ballWallSoundAdjustment;
  var invMass = 1.0 / ball.mass;
  var invInertia = 2.0 / (ball.mass * ball.radius * ball.radius); // 球体的转动惯量

  var normalAdjustment = 2.0;

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
    // ball.omega -= impulseNormal * ball.radius * invInertia;

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    // 切向冲量（摩擦力）
    if (Math.abs(tangentVel) > 0.001) {
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
    // ball.omega -= impulseNormal * ball.radius * invInertia;

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    if (Math.abs(tangentVel) > 0.001) {
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
    // ball.omega -= impulseNormal * ball.radius * invInertia;

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    if (Math.abs(tangentVel) > 0.001) {
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
    // ball.omega -= impulseNormal * ball.radius * invInertia;

    // Play wall collision sound
    playBallWallSound(ballWallSoundAdjustment * ball.mass * normalVel);

    if (Math.abs(tangentVel) > 0.001) {
      var impulseTangent = -friction * impulseNormal * Math.sign(tangentVel);
      ball.vel.add(tangent, impulseTangent * invMass);
      ball.omega += impulseTangent * ball.radius * invInertia;
    }
  }
}

// simulation -------------------------------------------------------

function simulateGravity() {
  // Calculate gravitational forces between all pairs of balls
  for (i = 0; i < physicsScene.balls.length; i++) {
    // Skip physics simulation for the draggable ball when it's being dragged
    if (mouseDown2 && i === DRAGGABLE_BALL_INDEX) continue;

    var ball1 = physicsScene.balls[i];

    // Apply constant gravity
    ball1.simulate(physicsScene.dt, physicsScene.gravity);

    // Calculate gravitational forces from other balls
    if (physicsScene.gravityEnabled) {
      for (j = 0; j < physicsScene.balls.length; j++) {
        if (i === j) continue; // Skip self
        // REMOVED: if (mouseDown2 && j === DRAGGABLE_BALL_INDEX) continue; // Skip dragged ball

        var ball2 = physicsScene.balls[j];

        // Calculate distance between balls
        var dir = new Vector2();
        dir.subtractVectors(ball2.pos, ball1.pos);
        var distance = dir.length();

        // Avoid division by zero and extremely small distances
        if (distance < 0.01) continue;

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
        (i === DRAGGABLE_BALL_INDEX || j === DRAGGABLE_BALL_INDEX)
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

function toggleForce() {
  scene.forceMode = !scene.forceMode;
  var button = document.querySelector('button[onclick="toggleForce()"]');
  if (button) {
    button.textContent = scene.forceMode
      ? window.getTranslatedText
        ? window.getTranslatedText("原力散去")
        : "原力散去"
      : window.getTranslatedText
        ? window.getTranslatedText("原力同在")
        : "原力同在";
  }
}

function toggleColor() {
  // Cycle through color modes: 0 → 1 → 2 → 0
  scene.colorMode = (scene.colorMode + 1) % scene.targetColors.length;

  // Update button text to show current color mode
  var button = document.querySelector('button[onclick="toggleColor()"]');
  if (button) {
    var colorNames = [
      window.getTranslatedText ? window.getTranslatedText("游泳池") : "游泳池",
      window.getTranslatedText ? window.getTranslatedText("青花瓷") : "青花瓷",
      window.getTranslatedText ? window.getTranslatedText("水墨画") : "水墨画",
    ];
    button.textContent =
      colorNames[scene.colorMode] ||
      (window.getTranslatedText
        ? window.getTranslatedText("换个颜色")
        : "换个颜色");
  }
}

// Handle mouse events for force mode
function handleTankMouseDown(e) {
  if (!scene.forceMode) return;

  var rect = canvas1.getBoundingClientRect();
  var mx = e.x - rect.left - canvas1.clientLeft;
  var my = e.y - rect.top - canvas1.clientTop;

  scene.mouseX = mx / cScaleX;
  scene.mouseY = (canvas1.height - my) / cScaleY;
  scene.mouseDown = true;
}

function handleTankMouseMove(e) {
  if (!scene.forceMode || !scene.mouseDown) return;

  var rect = canvas1.getBoundingClientRect();
  var mx = e.x - rect.left - canvas1.clientLeft;
  var my = e.y - rect.top - canvas1.clientTop;

  scene.mouseX = mx / cScaleX;
  scene.mouseY = (canvas1.height - my) / cScaleY;
}

function applyExplosionForce() {
  if (!scene.forceMode) return;

  var explosionForce = scene.forceMagnitude * 100;

  var f = scene.fluid;
  var dx, dy, distance, force, fx, fy;

  // Apply explosion force to particles
  for (var i = 0; i < f.numParticles; i++) {
    var px = f.particlePos[2 * i];
    var py = f.particlePos[2 * i + 1];

    // Direction away from mouse
    dx = px - scene.mouseX;
    dy = py - scene.mouseY;
    distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < scene.maxDistance) {
      // Calculate force magnitude: 10x the attraction force
      if (distance < scene.minDistance) {
        force = explosionForce;
      } else {
        force = explosionForce * (scene.minDistance / distance);
      }

      // Normalize direction
      fx = (dx / distance) * force;
      fy = (dy / distance) * force;

      // Apply force to particle velocity
      f.particleVel[2 * i] += fx * scene.dt;
      f.particleVel[2 * i + 1] += fy * scene.dt;
    }
  }

  // Apply explosion force to obstacle
  dx = scene.obstacleX - scene.mouseX;
  dy = scene.obstacleY - scene.mouseY;
  distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0 && distance < scene.maxDistance) {
    // Calculate force magnitude: 10x the attraction force
    if (distance < scene.minDistance) {
      force = scene.forceMagnitude * 10;
    } else {
      force = scene.forceMagnitude * 10 * (scene.minDistance / distance);
    }

    // Normalize direction
    fx = (dx / distance) * force;
    fy = (dy / distance) * force;

    // Apply force to obstacle
    scene.obstacleVx += (fx / scene.obstacleMass) * scene.dt;
    scene.obstacleVy += (fy / scene.obstacleMass) * scene.dt;
  }
}

function handleTankMouseUp(e) {
  if (!scene.forceMode) return;
  // Apply explosion force when mouse is released
  applyExplosionForce();
  scene.mouseDown = false;
}

function updateTank() {
  simulateTank();
  drawTank();
  requestAnimationFrame(updateTank);
}

// Add mouse event listeners for force mode
canvas1.addEventListener("mousedown", handleTankMouseDown);
canvas1.addEventListener("mousemove", handleTankMouseMove);
canvas1.addEventListener("mouseup", handleTankMouseUp);
canvas1.addEventListener("mouseleave", handleTankMouseUp);

setupSceneTank();
updateTank();

// Tank volume slider event listener
const tankVolumeSlider = document.getElementById("tankVolumeSlider");
if (tankVolumeSlider) {
  tankVolumeSlider.addEventListener("input", function () {
    tankVolume = parseFloat(this.value);
  });
}

function updateGravity() {
  simulateGravity();
  drawGravity();
  requestAnimationFrame(updateGravity);
}

setupSceneGravity();
updateGravity();