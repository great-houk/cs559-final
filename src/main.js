import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';


const canvas = document.getElementById('c');
const menuEl = document.getElementById('menu');
const btnFull = document.getElementById('btnFull');
const btnProto = document.getElementById('btnProto');
const btnLevel = document.getElementById('btnLevel');
const btnHowTo = document.getElementById('btnHowTo');
const btnHowBack = document.getElementById('btnHowBack');
const btnDevEnd = document.getElementById('btnDevEnd');
const devToolbarEl = document.getElementById('devToolbar');
const devMiniButtons = Array.from(document.querySelectorAll('[data-dev-game]'));

const overlayEl = document.getElementById('overlay');
const closeMiniBtn = document.getElementById('closeMini');
const minigameEl = document.getElementById('minigame');
const minigameTitleEl = document.getElementById('minigameTitle');

const taskTextEl = document.getElementById('taskText');
const scoreTextEl = document.getElementById('scoreText');
const highScoreValueEl = document.getElementById('highScoreValue');
const menuMainEl = document.getElementById('menuMain');
const menuHelpEl = document.getElementById('menuHelp');

const patienceBarEl = document.getElementById('patienceBar');
const patienceMoodEl = document.getElementById('patienceMood');
const toastEl = document.getElementById('toast');
const hudEl = document.getElementById('hud');
const patienceWrapEl = document.getElementById('patienceWrap');

const endOverlayEl = document.getElementById('end');
const endTitleEl = document.getElementById('endTitle');
const endReasonEl = document.getElementById('endReason');
const endScoreEl = document.getElementById('endScore');
const btnRestart = document.getElementById('btnRestart');
const btnBack = document.getElementById('btnBack');

const mobileControlsEl = document.getElementById('mobileControls');
const joystickEl = document.getElementById('joystick');
const stickEl = document.getElementById('stick');
const btnUse = document.getElementById('btnUse');

const mgCoding = document.getElementById('mgCoding');
const codeTargetEl = document.getElementById('codeTarget');
const codeFeedbackEl = document.getElementById('codeFeedback');
const codeInputEl = document.createElement('div');
codeInputEl.id = 'codeInput';
codeInputEl.className = 'codeinput';
codeInputEl.setAttribute('contenteditable', 'true');
codeInputEl.setAttribute('spellcheck', 'false');
codeInputEl.setAttribute('autocorrect', 'off');
codeInputEl.setAttribute('autocomplete', 'off');
codeInputEl.setAttribute('autocapitalize', 'off');
codeInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
});
codeInputEl.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text.replace(/\r?\n/g, ' '));
});

const mgWiring = document.getElementById('mgWiring');
const wiringCanvas = document.getElementById('wiringCanvas');
const wiringPinsEl = document.getElementById('wiringPins');
const wiringFeedbackEl = document.getElementById('wiringFeedback');
const wiringCircuitArt = document.getElementById('wiringCircuitArt');
const wiringIronArt = document.getElementById('wiringIronArt');

const mgMeter = document.getElementById('mgMeter');
const meterCanvas = document.getElementById('meterCanvas');
const meterPinsEl = document.getElementById('meterPins');
const meterFeedbackEl = document.getElementById('meterFeedback');
const meterProbeEl = document.getElementById('meterProbe');

const isTouchDevice = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouchDevice) mobileControlsEl.classList.remove('hidden');

const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    MINIGAME: 'minigame',
    ENDED: 'ended'
};

let state = GameState.MENU;
let mode = 'full'; // 'prototype' or 'full'

// Three.js globals
let renderer, scene, camera, clock;
let player, manager;
let interactables = [];
let stationByType = new Map(); // taskType -> station
let loader;
let managerBubble;
let managerBubbleTexture;
let managerBubbleCanvas;
let lastHighlightTarget = null;
const tableColliders = [];
const PRIMITIVE_SCALE = 1.4;

// Input
const keys = new Set();
let joystickVec = new THREE.Vector2(0, 0); // x=right, y=forward (screen: up is forward)
let actionQueued = false;

// Game
let score = 0;
let currentTask = null;
let taskQueue = [];
let difficulty = 1;
let patienceMax = 14;
let patienceLeft = patienceMax;
let lastToastAt = 0;
let highScore = Number(localStorage?.getItem('eeDashHighScore') || 0);

let playerMixer = null;
let playerActionIdle = null;
let playerActionWalk = null;
let playerIsMoving = false;
let playerProcedural = null;
let wiringGame = null;
let wiringIronTapTimer = null;
let devMinigameReturnTask = null;
let devMinigameReturnState = null;

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const TMP_QUAT = new THREE.Quaternion();


const TaskType = {
    CODING: 'coding',
    WIRING: 'wiring',
    METER: 'meter'
};

const TASK_NAMES = {
    [TaskType.CODING]: 'Coding Task',
    [TaskType.WIRING]: 'Wiring Task',
    [TaskType.METER]: 'Multimeter Task'
};

const CODING_LINES = {
    easy: [
        'if (voltage > 5) ledOn();',
        'const amps = watts / volts;',
        'let checksum = (a + b + c) & 0xff;',
        'pulsePin(13, 200);',
        'status = readPin(7);',
        'counter++;',
        'flag = !flag;',
        'delay(10);',
        'tempC = (tempF - 32) * 5 / 9;',
        'output = input & mask;',
        'enableMotor();',
        'disableInterrupts();',
        'value = adcRead(0);',
        'setPWM(128);',
        'error = false;',
        'timeout = 1000;',
        'buffer.clear();',
        'pinMode(LED, OUTPUT);',
        'writeByte(addr, data);',
        'sync();'
    ],
    standard: [
        'const avg = readings.reduce((s,v)=>s+v,0)/readings.length;',
        'for (let i = 0; i < wires.length; i++) wires[i] ^= mask;',
        'if (Math.abs(target - probe) < 0.05) calibrate();',
        'while (queue.length > 0) process(queue.shift());',
        'const filtered = samples.filter(v => v > threshold);',
        'state = (state + 1) % STATES;',
        'crc = updateCRC(crc, byte);',
        'for (const key in map) total += map[key];',
        'if (!device.online) reconnect();',
        'buffer[index++] = value;',
        'const slope = (y2 - y1) / (x2 - x1);',
        'retryCount = Math.min(retryCount + 1, MAX_RETRIES);',
        'data = data.map(v => v * scale + offset);',
        'if ((flags & READY) !== 0) start();',
        'for (let t = 0; t < 1; t += step) integrate(t);',
        'payload = serialize(packet);',
        'watchdog.kick();',
        'errorCount += response.ok ? 0 : 1;',
        'if (index >= limit) index = 0;',
        'sort(samples, compareFn);'
    ],
    hard: [
        'const gain = (r1 + r2) / Math.max(r1 * r2, 1e-6) * Math.sin(theta);',
        'matrix = matrix.map((row,i)=>row.map((v,j)=>v + kernel[j] * input[i]));',
        'while (time < 1.0) { buffer.push(Math.sin(time * freq) * decay); time += step; }',
        'jacobian[i][j] = partial(f, i, j, epsilon);',
        'state = transition[state][event] ?? ERROR;',
        'fft(real, imag, log2N);',
        'cov = multiply(transpose(A), A);',
        'solution = gaussianElimination(system);',
        'accumulator += error * dt;',
        'phase = (phase + omega * dt) % TAU;',
        'for (let k = 0; k < iterations; k++) refine(estimate);',
        'const eigen = powerIteration(matrix, tol);',
        'output[n] = b0*x[n] + b1*x[n-1] - a1*y[n-1];',
        'if (det(matrix) === 0) throw new SingularMatrix();',
        'simulate(system, t0, t1, h);',
        'prob = Math.exp(-energy / temperature);',
        'cache[line] = fetch(address & ~MASK);',
        'loss += gradient * learningRate;',
        'signal = convolve(input, impulseResponse);',
        'while (!converged) update();'
    ]
};

const METER_VOLTAGES = [
    0.9, 1.2, 1.8, 2.5, 3.3, 5.0, 6.0, 7.4, 9.0, 12.0, 15.0, 24.0
];

const CODING_CONTEXT_ABOVE = [
    'function updateVoltage(node) {',
    'const gain = computeGain(node);',
    'let index = 0;',
    'if (!sensor.ready) return;',
    'for (const pin of pins) {',
    'while (index < buffer.length) {',
    'switch(mode) {',
    'void process() {',
    'async function loop() {',
    'if (errorCount > 3) throw new Error("panic");',
    'try {',
    'if (initialized) {',
    'for (let i = 0; i < N; i++) {',
    'while (running) {',
    'if (state === IDLE) {',
    'lock(mutex);',
    'with (context) {',
    'onInterrupt(() => {',
    'def handler(event):',
    'template<typename T>',
    'fn execute() {'
];

const CODING_CONTEXT_BELOW = [
    'index++;',
    'logReading(node, value);',
    'return value;',
    'setTimeout(loop, 16);',
    '}',
    'break;',
    'renderFrame();',
    'await tick();',
    'printf("done");',
    'shutdown();',
    '} catch (e) {',
    'unlock(mutex);',
    'continue;',
    'return;',
    'emit(event);',
    'yield;',
    'pass;',
    '});',
    '});',
    'end;',
    '}'
];

const CODING_FILE_NAMES = [
    'main.c',
    'drivers.js',
    'control.lua',
    'system.py',
    'kernel.rs',
    'adc.c',
    'scheduler.cpp',
    'dsp.c',
    'hal.h',
    'bus_driver.asm',
    'interrupts.c',
    'firmware.bin',
    'signal_processing.py',
    'math_utils.rs',
    'io_map.json'
];


const BUBBLE_CANVAS_SIZE = 256;
const TASK_BUBBLE_CONFIG = {
    [TaskType.CODING]: {
        stroke: '#4da3ff',
        icon: drawCodingIcon
    },
    [TaskType.WIRING]: {
        stroke: '#ffc84a',
        icon: drawWiringIcon
    },
    [TaskType.METER]: {
        stroke: '#9e72ff',
        icon: drawMeterIcon
    }
};

const DIFFICULTY_LEVELS = [
    { id: 'easy', label: 'Easy', wiringSpeed: 0.6, wiringHits: 3, meterSequence: 4 },
    { id: 'standard', label: 'Standard', wiringSpeed: 0.8, wiringHits: 4, meterSequence: 6 },
    { id: 'hard', label: 'Hard', wiringSpeed: 1.05, wiringHits: 5, meterSequence: 10 }
];
const LEVEL_UNLOCK_TARGET = 10;
const METER_NODE_COUNT = 18;
let selectedLevelIndex = 0;
let unlockedLevelIndex = Number(localStorage?.getItem('eeDashUnlockedLevel') || 0) || 0;
if (!Number.isFinite(unlockedLevelIndex)) unlockedLevelIndex = 0;
unlockedLevelIndex = clamp(Math.floor(unlockedLevelIndex), 0, DIFFICULTY_LEVELS.length - 1);
selectedLevelIndex = Math.min(selectedLevelIndex, unlockedLevelIndex);
let activeLevel = DIFFICULTY_LEVELS[selectedLevelIndex];
let devModeActive = false;
let menuCheatBuffer = '';

const ROOM_BOUNDS = {
    width: 24,
    depth: 18,
    margin: 2
};
const ROOM_WALL_HEIGHT = 12;
const CAMERA_FIT_PADDING = 0.5;
const STATIC_CAMERA_TARGET = new THREE.Vector3(0, 1.4, 0);
const STATIC_CAMERA_DIR = new THREE.Vector3(0, 1, 1.6).normalize();
const frontWallTextureLoader = new THREE.TextureLoader();
let customFrontWallTextureUrl = null;
let frontWallTexture = null;
let lastSceneWasPrototype = false;

const wallTextureLoader = new THREE.TextureLoader();
let wallTextureUrl = "./textures/wall.png";
let wallTexture = null;
const posterTextureLoader = new THREE.TextureLoader();
let hangPosterTexture = null;

// track wall meshes so we can update materials after buildRoom()
let roomWalls = [];


const menuMusic = new Audio('./music/Refreshing Elevator music.mp3');
const gameplayMusic = new Audio('./music/bad piggies drip.mp3');
for (const track of [menuMusic, gameplayMusic]) {
    track.loop = true;
    track.preload = 'auto';
    track.volume = 0.4;
}
const musicTracks = { menu: menuMusic, game: gameplayMusic };
let currentMusic = null;
let pendingUnlockTrack = null;
let audioUnlockHandlerAttached = false;

function setMenuBackgroundActive(active) {
    document.body.classList.toggle('menu-bg-active', !!active);
}


function refreshMenuBackground() {
    setMenuBackgroundActive(state === GameState.MENU);
}

function setHelpView(showHelp) {
    if (!menuMainEl || !menuHelpEl) return;
    menuMainEl.classList.toggle('hidden', !!showHelp);
    menuHelpEl.classList.toggle('hidden', !showHelp);
}

function getActiveLevel() {
    if (!activeLevel) activeLevel = DIFFICULTY_LEVELS[0];
    return activeLevel;
}

function setSelectedLevel(index) {
    const total = DIFFICULTY_LEVELS.length;
    let normalized = ((index % total) + total) % total;
    if (!devModeActive) {
        const maxIdx = Math.min(unlockedLevelIndex, total - 1);
        normalized = Math.min(normalized, maxIdx);
    }
    selectedLevelIndex = normalized;
    activeLevel = DIFFICULTY_LEVELS[selectedLevelIndex];
    updateLevelButton();
}

function cycleLevel() {
    const total = DIFFICULTY_LEVELS.length;
    if (devModeActive) {
        setSelectedLevel(selectedLevelIndex + 1);
        return true;
    }
    const prev = selectedLevelIndex;
    for (let step = 1; step <= total; step++) {
        const candidate = (selectedLevelIndex + step) % total;
        if (candidate <= unlockedLevelIndex) {
            if (candidate === prev) break;
            setSelectedLevel(candidate);
            return true;
        }
    }
    showToast(`Level locked. Reach ${LEVEL_UNLOCK_TARGET} tasks to unlock the next difficulty.`);
    return false;
}

function updateLevelButton() {
    if (!btnLevel) return;
    const lvl = getActiveLevel();
    const suffix = devModeActive ? ' (DEV)' : '';
    btnLevel.textContent = `Level: ${lvl.label}${suffix}`;
}

function persistUnlockedLevel() {
    try {
        localStorage?.setItem('eeDashUnlockedLevel', String(unlockedLevelIndex));
    } catch (err) {
        console.warn('Unable to persist unlocked level', err);
    }
}

function tryUnlockNextLevel(currentLevelIdx) {
    if (devModeActive) return;
    const nextIdx = currentLevelIdx + 1;
    if (score < LEVEL_UNLOCK_TARGET) return;
    if (nextIdx >= DIFFICULTY_LEVELS.length) return;
    if (unlockedLevelIndex >= nextIdx) return;
    unlockedLevelIndex = nextIdx;
    persistUnlockedLevel();
    showToast(`${DIFFICULTY_LEVELS[nextIdx].label} unlocked!`);
    updateLevelButton();
}

function playMusicTrack(name) {
    const target = musicTracks[name];
    if (!target) return;

    if (currentMusic !== target) {
        for (const track of Object.values(musicTracks)) {
            if (track !== target) {
                track.pause();
                track.currentTime = 0;
            }
        }
        currentMusic = target;
    }

    const playPromise = target.play();
    if (playPromise && playPromise.catch) {
        pendingUnlockTrack = target;
        attachAudioUnlockListener();
        playPromise.catch(() => {});
    } else {
        pendingUnlockTrack = null;
    }
}

function attachAudioUnlockListener() {
    if (audioUnlockHandlerAttached) return;
    audioUnlockHandlerAttached = true;
    window.addEventListener('pointerdown', unlockPendingMusic, { once: true });
}

function unlockPendingMusic() {
    audioUnlockHandlerAttached = false;
    if (!pendingUnlockTrack) return;
    pendingUnlockTrack.play().catch(() => {});
    pendingUnlockTrack = null;
}

function updateAudioForState() {
    const trackName = (state === GameState.MENU || state === GameState.ENDED) ? 'menu' : 'game';
    playMusicTrack(trackName);
}

function getHangPosterTexture() {
    if (hangPosterTexture) return hangPosterTexture;
    hangPosterTexture = posterTextureLoader.load(
        './textures/hanginthere.png',
        (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 4;
        },
        undefined,
        (err) => {
            console.warn('Hang In There texture failed to load:', err);
        }
    );
    hangPosterTexture.colorSpace = THREE.SRGBColorSpace;
    hangPosterTexture.anisotropy = 4;
    return hangPosterTexture;
}

// Helpers

function updateUIForState() {
    const inMenu = (state === GameState.MENU);
    const playing = (state === GameState.PLAYING);

    // Show/hide menu and end overlay appropriately (adjust if you want end overlay visible in menu)
    menuEl.classList.toggle('hidden', !inMenu);

    // IMPORTANT: hide the canvas so body background can show
    canvas.classList.toggle('hidden', inMenu);

    refreshMenuBackground();
    updateAudioForState();
    setHUDVisibility(playing);
    updateDevControlsVisibility();
}


function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function applyWallTextureToRoom() {
    if (!scene) return;

    // If no custom texture, revert to the default wall look (color-only)
    if (!wallTextureUrl) {
        if (wallTexture) {
            wallTexture.dispose();
            wallTexture = null;
        }

        for (const w of roomWalls) {
            if (!w?.material) continue;
              w.material.map = wallTexture;
              w.material.color.set(0xffffff);   // prevents blue tint
              w.material.needsUpdate = true;

        }
        return;
    }

    // If already loaded, just assign it
    if (wallTexture) {
        for (const w of roomWalls) {
            if (!w?.material) continue;
                w.material.map = wallTexture;
                w.material.color.set(0xffffff);   // prevents blue tint
                w.material.needsUpdate = true;

        }
        return;
    }

    const requestedUrl = wallTextureUrl;
    wallTextureLoader.load(
        requestedUrl,
        (tex) => {
            if (requestedUrl !== wallTextureUrl) {
                tex.dispose();
                return;
            }

            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

            // Tiling amount — adjust as you like
            tex.repeat.set(4, 1);

            if (wallTexture) wallTexture.dispose();
            wallTexture = tex;

            for (const w of roomWalls) {
                if (!w?.material) continue;
               w.material.map = wallTexture;
                w.material.color.set(0xffffff);   // prevents blue tint
                w.material.needsUpdate = true;

            }
        },
        undefined,
        (err) => {
            if (requestedUrl !== wallTextureUrl) return;
            console.warn('Wall texture failed to load:', err);
            wallTextureUrl = null;
            applyWallTextureToRoom();
        }
    );
}


function returnToMenu() {
    if (renderer) renderer.setAnimationLoop(null);
    animating = false;

    disposeScene();
    scene = null;

    resetGameState();
    state = GameState.MENU;
    endOverlayEl.classList.add('hidden');
    updateUIForState();
}



function setWallTexture(url) {
    const normalized = url || null;

    // If changing textures, dispose the old one
    if (normalized !== wallTextureUrl && wallTexture) {
        wallTexture.dispose();
        wallTexture = null;
    }

    wallTextureUrl = normalized;
    if (scene) applyWallTextureToRoom();
}

// optional: expose for UI / dev console
window.eeDashSetWallTexture = setWallTexture;


function rememberBaseScale(obj) {
    if (!obj) return;
    obj.userData = obj.userData || {};
    obj.userData._baseScale = obj.scale.clone();
}

function restoreBaseScale(obj) {
    if (!obj || !obj.userData || !obj.userData._baseScale) return;
    obj.scale.copy(obj.userData._baseScale);
}

function applyEntityScale(obj, isPrototype, fullScale) {
    if (!obj) return;
    if (isPrototype) {
        obj.scale.setScalar(PRIMITIVE_SCALE);
    } else if (typeof fullScale === 'number') {
        obj.scale.setScalar(fullScale);
    } else if (Array.isArray(fullScale)) {
        const [sx = 1, sy = sx, sz = sy] = fullScale;
        obj.scale.set(sx, sy, sz);
    } else {
        obj.scale.setScalar(1);
    }
    rememberBaseScale(obj);
}

function pickRandom(arr) {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resetTableColliders() {
    tableColliders.length = 0;
}

function addTableCollider(x, z, halfX = 1.3, halfZ = 0.7) {
    tableColliders.push({ x, z, halfX, halfZ });
}

function applyTableCollisions() {
    if (!player) return;
    for (const c of tableColliders) {
        const dx = player.position.x - c.x;
        const dz = player.position.z - c.z;
        const overlapX = c.halfX - Math.abs(dx);
        const overlapZ = c.halfZ - Math.abs(dz);
        if (overlapX > 0 && overlapZ > 0) {
            if (overlapX < overlapZ) {
                const pushX = (dx >= 0 ? 1 : -1) * (c.halfX + 0.01);
                player.position.x = c.x + pushX;
            } else {
                const side = dz >= 0 ? 1 : -1;
                player.position.z = c.z + side * (c.halfZ + 0.01);
            }
        }
    }
}

function isInFrontOfStation(station, slack = 0.35) {
    if (!station || !player) return false;
    return player.position.z > (station.position.z + slack);
}

function buildManagerBubble() {
    if (!manager) return;
    managerBubbleCanvas = document.createElement('canvas');
    managerBubbleCanvas.width = BUBBLE_CANVAS_SIZE;
    managerBubbleCanvas.height = BUBBLE_CANVAS_SIZE;
    managerBubbleTexture = new THREE.CanvasTexture(managerBubbleCanvas);
    managerBubbleTexture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.SpriteMaterial({
        map: managerBubbleTexture,
        transparent: true,
        depthWrite: false
    });

    managerBubble = new THREE.Sprite(mat);
    managerBubble.position.set(0, 2.6, 0);
    managerBubble.scale.set(2.2, 2.2, 2.2);
    manager.add(managerBubble);

    managerBubble.visible = false;
    updateManagerBubble(null);
}

function setupPlayerAnimations(model) {
    playerMixer = null;
    playerActionIdle = null;
    playerActionWalk = null;
    playerIsMoving = false;
    playerProcedural = null;

    const clips = model?.userData?._animations;
    if (!clips || clips.length === 0) {
        setupProceduralWalk(model);
        return;
    }

    playerMixer = new THREE.AnimationMixer(model);

    const findClip = (needle) => clips.find(c => (c.name || '').toLowerCase().includes(needle));

    const idleClip = findClip('idle') || findClip('stand') || clips[0];
    const walkClip = findClip('walk') || findClip('run') || clips[1] || clips[0];

    if (idleClip) {
        playerActionIdle = playerMixer.clipAction(idleClip);
        playerActionIdle.play();
    }

    if (walkClip) {
        playerActionWalk = playerMixer.clipAction(walkClip);
        playerActionWalk.play();
        playerActionWalk.enabled = false;
        playerActionWalk.weight = 0;
    }
}

function setPlayerMoving(moving) {
    if (playerMixer) {
        if (moving === playerIsMoving) {
            // still update procedural flag below
        } else {
            playerIsMoving = moving;
            const fade = 0.15;
            if (moving) {
                if (playerActionWalk) {
                    playerActionWalk.enabled = true;
                    playerActionWalk.reset();
                    playerActionWalk.fadeIn(fade);
                }
                if (playerActionIdle) playerActionIdle.fadeOut(fade);
            } else {
                if (playerActionIdle) {
                    playerActionIdle.enabled = true;
                    playerActionIdle.reset();
                    playerActionIdle.fadeIn(fade);
                }
                if (playerActionWalk) playerActionWalk.fadeOut(fade);
            }
        }
    }
    if (playerProcedural) {
        playerProcedural.isMoving = moving;
    }
}

function setupProceduralWalk(model) {
    const importantBones = {
        hipL: 'bip_hip_L_077',
        hipR: 'bip_hip_R_03',
        kneeL: 'bip_knee_L_078',
        kneeR: 'bip_knee_R_04',
        armL: 'bip_upperArm_L_017',
        armR: 'bip_upperArm_R_046'
    };

    const bones = {};
    for (const [key, name] of Object.entries(importantBones)) {
        const bone = model.getObjectByName(name);
        if (bone) {
            bones[key] = { bone, rest: bone.quaternion.clone() };
        }
    }

    if (Object.keys(bones).length === 0) return;

    playerProcedural = {
        model,
        bones,
        phase: 0,
        amount: 0,
        isMoving: false,
        baseY: model.position.y
    };
}

function updateProceduralWalk(dt) {
    if (!playerProcedural) return;
    const ctrl = playerProcedural;
    const speed = ctrl.isMoving ? 6 : 3;

    ctrl.phase = (ctrl.phase + dt * speed) % (Math.PI * 2);

    const targetAmount = ctrl.isMoving ? 1 : 0;
    ctrl.amount += (targetAmount - ctrl.amount) * Math.min(1, dt * 8);

    const swing = Math.sin(ctrl.phase) * 0.45 * ctrl.amount;
    const oppositeSwing = -swing;

    applyProceduralSwing(ctrl.bones.hipL, AXIS_X, swing);
    applyProceduralSwing(ctrl.bones.hipR, AXIS_X, oppositeSwing);

    const kneeLAngle = Math.max(0, swing) * 1.2;
    const kneeRAngle = Math.max(0, -swing) * 1.2;

    applyProceduralSwing(ctrl.bones.kneeL, AXIS_X, kneeLAngle);
    applyProceduralSwing(ctrl.bones.kneeR, AXIS_X, kneeRAngle);

    const armSwing = Math.sin(ctrl.phase + Math.PI) * 0.35 * ctrl.amount;
    applyProceduralSwing(ctrl.bones.armL, AXIS_Z, armSwing * 0.6);
    applyProceduralSwing(ctrl.bones.armR, AXIS_Z, -armSwing * 0.6);

    const bob = Math.abs(Math.sin(ctrl.phase * 2)) * 0.08 * ctrl.amount;
    ctrl.model.position.y = ctrl.baseY + bob;
}

function applyProceduralSwing(entry, axis, angle) {
    if (!entry) return;
    TMP_QUAT.setFromAxisAngle(axis, angle);
    entry.bone.quaternion.copy(entry.rest).multiply(TMP_QUAT);
}


function updateManagerBubble(taskType, phase = 'work') {
    if (!managerBubbleCanvas || !managerBubbleTexture || !managerBubble) return;

    const ctx = managerBubbleCanvas.getContext('2d');
    ctx.clearRect(0, 0, managerBubbleCanvas.width, managerBubbleCanvas.height);

    if (!taskType || !TASK_BUBBLE_CONFIG[taskType]) {
        managerBubble.visible = false;
        managerBubbleTexture.needsUpdate = true;
        return;
    }

    const config = TASK_BUBBLE_CONFIG[taskType];
    managerBubble.visible = true;
    drawSpeechBubble(ctx, config.stroke, phase);
    config.icon(ctx, BUBBLE_CANVAS_SIZE / 2, BUBBLE_CANVAS_SIZE / 2 - 12, config.stroke);
    if (phase === 'deliver') drawDeliverBadge(ctx);
    managerBubbleTexture.needsUpdate = true;
}

function drawSpeechBubble(ctx, accentColor, phase) {
    const padding = 24;
    const w = BUBBLE_CANVAS_SIZE - padding * 2;
    const h = BUBBLE_CANVAS_SIZE - 96;
    const x = padding;
    const y = 24;
    const r = 28;

    ctx.save();
    ctx.fillStyle = phase === 'deliver' ? 'rgba(24,46,32,0.95)' : 'rgba(15,23,36,0.95)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // tail
    const tailY = y + h;
    const tailX = BUBBLE_CANVAS_SIZE / 2;

    ctx.beginPath();
    ctx.moveTo(tailX - 24, tailY);
    ctx.lineTo(tailX, tailY + 34);
    ctx.lineTo(tailX + 44, tailY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawCodingIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 32);
    ctx.lineTo(cx - 88, cy);
    ctx.lineTo(cx - 60, cy + 32);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 60, cy - 32);
    ctx.lineTo(cx + 88, cy);
    ctx.lineTo(cx + 60, cy + 32);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 36);
    ctx.lineTo(cx + 12, cy - 36);
    ctx.stroke();

    ctx.restore();
}

function drawWiringIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - 70, cy);
    ctx.lineTo(cx - 35, cy - 36);
    ctx.lineTo(cx, cy + 36);
    ctx.lineTo(cx + 35, cy - 36);
    ctx.lineTo(cx + 70, cy + 36);
    ctx.stroke();

    ctx.restore();
}

function drawMeterIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(cx, cy + 8, 54, Math.PI, 0, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx + 34, cy - 18);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 56, cy + 48);
    ctx.lineTo(cx + 56, cy + 48);
    ctx.stroke();

    ctx.restore();
}

function drawDeliverBadge(ctx) {
    ctx.save();
    const cx = BUBBLE_CANVAS_SIZE - 58;
    const cy = 58;

    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(84,226,138,0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = '#0b0f14';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx - 2, cy + 14);
    ctx.lineTo(cx + 18, cy - 14);
    ctx.stroke();

    ctx.restore();
}

function applyFrontWallTexture() {
    if (!scene) return;

    if (!customFrontWallTextureUrl) {
        if (frontWallTexture) {
            frontWallTexture.dispose();
            frontWallTexture = null;
        }
        scene.background = new THREE.Color(lastSceneWasPrototype ? 0x0b0f14 : 0x081018);
        return;
    }

    if (frontWallTexture) {
        scene.background = frontWallTexture;
        return;
    }

    const requestedUrl = customFrontWallTextureUrl;
    frontWallTextureLoader.load(
        requestedUrl,
        (tex) => {
            if (requestedUrl !== customFrontWallTextureUrl) {
                tex.dispose();
                return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            if (frontWallTexture) frontWallTexture.dispose();
            frontWallTexture = tex;
            if (scene) scene.background = tex;
        },
        undefined,
        (err) => {
            if (requestedUrl !== customFrontWallTextureUrl) return;
            console.warn('Front wall texture failed to load:', err);
            customFrontWallTextureUrl = null;
            applyFrontWallTexture();
        }
    );
}

function setFrontWallTexture(url) {
    const normalized = url || null;
    if (normalized !== customFrontWallTextureUrl && frontWallTexture) {
        frontWallTexture.dispose();
        frontWallTexture = null;
    }
    customFrontWallTextureUrl = normalized;
    if (scene) applyFrontWallTexture();
}

function showToast(msg, holdMs = 1400) {
    const now = performance.now();
    if (now - lastToastAt < 300) return;
    lastToastAt = now;

    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    window.setTimeout(() => toastEl.classList.add('hidden'), holdMs);
}

function setPatience(pct) {
    const clamped = clamp(pct, 0, 1);
    const w = clamped * 100;
    patienceBarEl.style.width = `${w}%`;
    if (clamped > 0.55) patienceBarEl.style.background = 'var(--ok)';
    else if (clamped > 0.25) patienceBarEl.style.background = 'var(--warn)';
    else patienceBarEl.style.background = 'var(--danger)';

    if (patienceMoodEl) {
        let face = '😐';
        let label = 'Manager is neutral';
        if (clamped > 0.55) {
            face = '😃';
            label = 'Manager is happy';
        } else if (clamped < 0.25) {
            face = '😡';
            label = 'Manager is angry';
        }
        patienceMoodEl.textContent = face;
        patienceMoodEl.setAttribute('aria-label', label);
        patienceMoodEl.setAttribute('title', label);
    }
}

function setHUD(taskText, scoreVal) {
    taskTextEl.textContent = taskText ?? '-';
    scoreTextEl.textContent = String(scoreVal ?? 0);
}

function setHUDVisibility(isVisible) {
    const method = isVisible ? 'remove' : 'add';
    hudEl?.classList[method]('hidden');
    patienceWrapEl?.classList[method]('hidden');
    patienceMoodEl?.classList[method]('hidden');
}

function updateHighScoreUI() {
    if (highScoreValueEl) highScoreValueEl.textContent = String(highScore);
}

function recordHighScoreIfNeeded() {
    if (score <= highScore) return;
    highScore = score;
    try {
        localStorage?.setItem('eeDashHighScore', String(highScore));
    } catch (e) {
        console.warn('Unable to persist high score', e);
    }
    updateHighScoreUI();
}

function resetOverlays() {
    overlayEl.classList.add('hidden');
    mgCoding.classList.add('hidden');
    mgWiring.classList.add('hidden');
    mgMeter.classList.add('hidden');
    minigameEl?.classList.remove('workbench-theme');
    wiringFeedbackEl.textContent = '';
    wiringGame = null;
    if (wiringIronArt) wiringIronArt.classList.remove('tap');
    meterFeedbackEl.textContent = '';
    if (meterProbeEl) meterProbeEl.classList.add('hidden');
    codeInputEl.textContent = '';
    codeInputEl.classList.remove('error');
}

function enterMinigame(title) {
    state = GameState.MINIGAME;
    minigameTitleEl.textContent = title;
    overlayEl.classList.remove('hidden');
    updateDevControlsVisibility();
}

function exitMinigame() {
    const wasDevTask = !!currentTask?.isDevTask;
    resetOverlays();
    const targetState = (wasDevTask && devMinigameReturnState) ? devMinigameReturnState : GameState.PLAYING;
    state = targetState;
    updateUIForState();
    actionQueued = false;
    if (wasDevTask) {
        currentTask = devMinigameReturnTask || null;
    }
    devMinigameReturnTask = null;
    devMinigameReturnState = null;
}

closeMiniBtn.addEventListener('click', () => {
    if (!devModeActive) return;
    exitMinigame();
});

btnRestart.addEventListener('click', () => {
    startGame(mode);
});
btnBack.addEventListener('click', returnToMenu);

if (btnLevel) {
    btnLevel.addEventListener('click', () => {
        const changed = cycleLevel();
        if (changed) {
            const lvl = getActiveLevel();
            showToast(`Selected level: ${lvl.label}`);
        }
    });
}
if (btnDevEnd) {
    btnDevEnd.addEventListener('click', () => {
        if (state !== GameState.PLAYING) return;
        const reason = devModeActive ? 'Stopped via dev controls.' : 'Stopped manually.';
        endGame('Game Over', reason);
    });
}
if (devMiniButtons.length) {
    devMiniButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.devGame;
            launchDevMinigame(type);
        });
    });
}
btnFull.addEventListener('click', () => startGame('full'));
btnProto.addEventListener('click', () => startGame('prototype'));
if (btnHowTo) {
    btnHowTo.setAttribute('aria-expanded', 'false');
    btnHowTo.addEventListener('click', () => {
        setHelpView(true);
        btnHowTo.setAttribute('aria-expanded', 'true');
    });
}
if (btnHowBack) {
    btnHowBack.addEventListener('click', () => {
        setHelpView(false);
        btnHowTo?.setAttribute('aria-expanded', 'false');
    });
}

// keyboard
window.addEventListener('keydown', (e) => {
    const lower = e.key.toLowerCase();

    if (e.code === 'Space' && state === GameState.MINIGAME && currentTask?.type === TaskType.WIRING) {
        e.preventDefault();
        handleWiringHit();
        return;
    }

    keys.add(lower);
    if (lower === 'e') actionQueued = true;
    handleMenuDevCheat(lower);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

btnUse.addEventListener('click', () => { actionQueued = true; });

// joystick (mobile)
(function setupJoystick() {
    if (!isTouchDevice) return;

    let active = false;
    let origin = { x: 0, y: 0 };
    const maxR = 42;

    function setStick(dx, dy) {
        const r = Math.hypot(dx, dy);
        const k = r > maxR ? (maxR / r) : 1;
        const sx = dx * k;
        const sy = dy * k;
        stickEl.style.left = `calc(50% + ${sx}px)`;
        stickEl.style.top = `calc(50% + ${sy}px)`;
        joystickVec.set(sx / maxR, -sy / maxR); // y inverted so up is positive forward
    }

    function resetStick() {
        stickEl.style.left = '50%';
        stickEl.style.top = '50%';
        joystickVec.set(0, 0);
    }

    joystickEl.addEventListener('pointerdown', (e) => {
        active = true;
        joystickEl.setPointerCapture(e.pointerId);
        const rect = joystickEl.getBoundingClientRect();
        origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        setStick(e.clientX - origin.x, e.clientY - origin.y);
    });
    joystickEl.addEventListener('pointermove', (e) => {
        if (!active) return;
        setStick(e.clientX - origin.x, e.clientY - origin.y);
    });
    joystickEl.addEventListener('pointerup', () => { active = false; resetStick(); });
    joystickEl.addEventListener('pointercancel', () => { active = false; resetStick(); });
})();

// Three.js scene setup
function buildRenderer() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function buildCamera() {
    camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
    configureStaticCamera();
}

function configureStaticCamera() {
    if (!camera) return;
    camera.aspect = innerWidth / innerHeight;

    const halfWidth = ROOM_BOUNDS.width * 0.5;
    const halfDepth = ROOM_BOUNDS.depth * 0.5;
    const radius = Math.sqrt(halfWidth * halfWidth + halfDepth * halfDepth);
    const paddedRadius = (radius + ROOM_BOUNDS.margin) * CAMERA_FIT_PADDING;

    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const minFov = Math.min(vFov, hFov);
    const distance = paddedRadius / Math.sin(minFov / 2);

    const offsetDir = STATIC_CAMERA_DIR.clone().normalize();
    const position = STATIC_CAMERA_TARGET.clone().add(offsetDir.multiplyScalar(distance));

    camera.position.copy(position);
    camera.lookAt(STATIC_CAMERA_TARGET);
    camera.updateProjectionMatrix();
}

function buildLights() {
    const amb = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(8, 14, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -15;
    dir.shadow.camera.right = 15;
    dir.shadow.camera.top = 15;
    dir.shadow.camera.bottom = -15;
    scene.add(dir);
}

function buildRoom(isPrototype) {
    resetTableColliders();

    // floor
    const floorGeo = new THREE.PlaneGeometry(24, 18);
    const tex = new THREE.TextureLoader().load('./textures/tiles.png');
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4);
    tex.colorSpace = THREE.SRGBColorSpace;

    const floorMat = isPrototype
        ? new THREE.MeshStandardMaterial({ color: 0x2b3340, roughness: 0.95, metalness: 0.0 })
        : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.0 });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'Floor';
    scene.add(floor);

    const wallMat = isPrototype
        ? new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 1.0 })
        : new THREE.MeshStandardMaterial({ color: 0x223045, roughness: 0.95 });

    const wallHeight = ROOM_WALL_HEIGHT;
    const wallThickness = 0.4;

    const wallPanelGeo = new THREE.BoxGeometry(24, wallHeight, wallThickness);
    // BACK wall (behind manager)
    const wallBack = new THREE.Mesh(wallPanelGeo, wallMat.clone());
    wallBack.position.set(0, wallHeight * 0.5, -9);
    wallBack.receiveShadow = true;
    scene.add(wallBack);
    roomWalls.push(wallBack);
    const posterWidth = 4.2;
    const posterHeight = 5.2;
    const posterGeo = new THREE.PlaneGeometry(posterWidth, posterHeight);
    let posterMat = null;
    if (isPrototype) {
        posterMat = new THREE.MeshStandardMaterial({
            color: 0xffc84a,
            emissive: 0x2b1d00,
            roughness: 0.8
        });
    } else {
        const posterTexture = getHangPosterTexture();
        if (posterTexture) {
            posterMat = new THREE.MeshBasicMaterial({
                map: posterTexture,
                transparent: true,
                toneMapped: false
            });
        }
    }
    if (posterMat) {
        const posterMesh = new THREE.Mesh(posterGeo, posterMat);
        posterMesh.position.set(6.5, wallHeight * 0.4, -9 + wallThickness * 0.5 + 0.02);
        posterMesh.castShadow = false;
        posterMesh.receiveShadow = false;
        scene.add(posterMesh);
    }

    // LEFT/RIGHT walls (depth x height)
    const wallSideGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 18);
    const wallLeft = new THREE.Mesh(wallSideGeo, wallMat.clone());
    wallLeft.position.set(-12, wallHeight * 0.5, 0);
    scene.add(wallLeft);
    roomWalls.push(wallLeft);

    const wallRight = new THREE.Mesh(wallSideGeo, wallMat.clone());
    wallRight.position.set(12, wallHeight * 0.5, 0);
    scene.add(wallRight);
    roomWalls.push(wallRight);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(24, 18);
    const ceilingMat = wallMat.clone();
    ceilingMat.side = THREE.DoubleSide;
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, wallHeight, 0);
    ceiling.receiveShadow = true;
    ceiling.castShadow = false;
    scene.add(ceiling);

    applyWallTextureToRoom();
    // decor: tables
    for (const p of [
        { x: -5, z: 1.5 },
        { x: 0, z: 1.5 },
        { x: 5, z: 1.5 }
    ]) {
        const table = makeModelOrPrimitive(isPrototype, './models/prop_table.glb', 0x6d5a48, 'Table');
        table.position.set(p.x, 0.6, p.z);
        applyEntityScale(table, isPrototype, [1, 0.7, 0.7]);
        table.castShadow = true;
        table.receiveShadow = true;
        scene.add(table);
        addTableCollider(p.x, p.z, 1.4, 0.8);
    }
}

// model caching (SAFE for skinned meshes)
const modelCache = new Map(); // path -> Promise<GLTF>

async function loadModel(path) {
    if (!modelCache.has(path)) {
        modelCache.set(path, loader.loadAsync(path));
    }

    const gltf = await modelCache.get(path);

    // IMPORTANT: clone via SkeletonUtils' clone function
    const root = cloneSkeleton(gltf.scene);

    root.traverse(o => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material) o.material.side = THREE.FrontSide;
        }
    });

      // Keep animations available after cloning
    root.userData = root.userData || {};
    root.userData._animations = gltf.animations || [];

    return root;
}



function makePrimitive(colorHex = 0xffffff) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.95, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function makeModelOrPrimitive(isPrototype, modelPath, colorHex, name) {
    if (isPrototype) {
        const m = makePrimitive(colorHex);
        m.name = name;
        m.userData = m.userData || {};
        return m;
    }

    // Full mode: use packaged glTF models via GLTFLoader (swap later)
    const placeholder = makePrimitive(colorHex);
    placeholder.name = name;
    placeholder.userData = placeholder.userData || {};
    placeholder.userData._pendingModel = modelPath;
    return placeholder;
}

async function resolvePendingModels(root) {
    const pending = [];
    root.traverse(o => {
        if (o.userData && o.userData._pendingModel) pending.push(o);
    });

    const wp = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    const ws = new THREE.Vector3();

    for (const node of pending) {
        const path = node.userData._pendingModel;

        try {
            // Capture WORLD transform of placeholder
            node.updateMatrixWorld(true);
            node.matrixWorld.decompose(wp, wq, ws);

            const model = await loadModel(path);

            model.name = node.name;

            const placeholderUserData = node.userData || {};
            const modelUserData = model.userData || {};
            model.userData = { ...modelUserData, ...placeholderUserData };
            delete model.userData._pendingModel;

            const parent = node.parent;
            if (parent) {
                parent.add(model);

                // Convert world -> local under the same parent
                parent.updateMatrixWorld(true);
                const invParent = new THREE.Matrix4().copy(parent.matrixWorld).invert();

                const localM = new THREE.Matrix4().compose(wp, wq, ws).premultiply(invParent);
                localM.decompose(model.position, model.quaternion, model.scale);

                parent.remove(node);
            } else {
                // Fallback: no parent, just apply world
                model.position.copy(wp);
                model.quaternion.copy(wq);
                model.scale.copy(ws);
            }

            rememberBaseScale(model);

            const replacedPlayer = (node === player);
            const replacedManagerNode = (node === manager);

            if (replacedPlayer) {
                player = model;
                setupPlayerAnimations(player);
            }

            if (replacedManagerNode) {
                manager = model;
                manager.position.z = -5.5;

                if (managerBubble) {
                    managerBubble.position.set(0, 2.6, 0);
                    managerBubble.scale.set(2.2, 2.2, 2.2);
                    manager.add(managerBubble);
                } else {
                    buildManagerBubble();
                }
            }

            for (const [type, st] of stationByType.entries()) {
                if (st === node) stationByType.set(type, model);
            }

            interactables = interactables.map(obj => (obj === node ? model : obj));
        } catch (e) {
            console.warn('Model load failed, using primitive:', path, e);
        }
    }
}


function buildActors(isPrototype) {
    player = makeModelOrPrimitive(isPrototype, './models/player.glb', 0x3399ff, 'Player');
    player.position.set(0, 0.5, 6.5);
    applyEntityScale(player, isPrototype, 0.03);
    scene.add(player);

    manager = makeModelOrPrimitive(isPrototype, './models/manager.glb', 0xff5565, 'Manager');
    manager.position.set(0, 2, -6.5);
    applyEntityScale(manager, isPrototype, 1.6);
    scene.add(manager);

    // Raise manager along z axis (closer to player)
    manager.position.z = -5.5;

    buildManagerBubble();

    // Stations
    const sComputer = makeModelOrPrimitive(isPrototype, './models/station_computer.glb', 0x3fe17a, 'ComputerStation');
    sComputer.position.set(-5, 1.9, 1.5);
    applyEntityScale(sComputer, isPrototype, 1);
    scene.add(sComputer);

    const sWiring = makeModelOrPrimitive(isPrototype, './models/station_wiring.glb', 0xffc84a, 'WiringStation');
    sWiring.position.set(0, 1.9, 1.5);
    applyEntityScale(sWiring, isPrototype, 7);
    scene.add(sWiring);

    const solderingIron = makeModelOrPrimitive(isPrototype, './models/soldering_iron.glb', 0xd17f3f, 'SolderingIron');
    solderingIron.position.set(1, 1.9, 1.5);
    applyEntityScale(solderingIron, isPrototype, 7);
    scene.add(solderingIron);

    const sMeter = makeModelOrPrimitive(isPrototype, './models/station_meter.glb', 0x9e72ff, 'MeterStation');
    sMeter.position.set(5, 1.9, 1.5);
    applyEntityScale(sMeter, isPrototype, 7);
    scene.add(sMeter);

    stationByType.set(TaskType.CODING, sComputer);
    stationByType.set(TaskType.WIRING, sWiring);
    stationByType.set(TaskType.METER, sMeter);

    interactables = [manager, sComputer, sWiring, sMeter];
}

function setCameraFollow() {
    // Camera stays static; movement updates are handled via configureStaticCamera().
}

// Movement & bounds
function updateMovement(dt) {
    const speed = 5.0;
    let vx = 0, vz = 0;

    const up = keys.has('w') || keys.has('arrowup');
    const down = keys.has('s') || keys.has('arrowdown');
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');

    if (up) vz -= 1;
    if (down) vz += 1;
    if (left) vx -= 1;
    if (right) vx += 1;

    // joystick adds analog movement
    vx += joystickVec.x;
    vz += -joystickVec.y; // joystick y: forward positive, but our z- is forward

    const len = Math.hypot(vx, vz);
    if (len > 0.0001) {
        vx /= len;
        vz /= len;
    }

    setPlayerMoving(len > 0.2);

    player.position.x += vx * speed * dt;
    player.position.z += vz * speed * dt;

    // bounds inside room
    player.position.x = clamp(player.position.x, -11.2, 11.2);
    player.position.z = clamp(player.position.z, -8.2, 8.2);
    applyTableCollisions();

    // visual facing
    if (len > 0.2) {
        const yaw = Math.atan2(vx, vz);
        player.rotation.y = yaw;
    }
}

function distanceTo(obj) {
    return player.position.distanceTo(obj.position);
}

function canInteractWith(obj) {
    return distanceTo(obj) < 2.4;
}

function highlightStation() {
    let target = null;

    if (currentTask) {
        target = currentTask.phase === 'deliver'
            ? manager
            : stationByType.get(currentTask.type);
    }

    if (!target) {
        if (lastHighlightTarget) {
            restoreBaseScale(lastHighlightTarget);
            lastHighlightTarget = null;
        }
        return;
    }

    if (!target.userData || !target.userData._baseScale) {
        rememberBaseScale(target);
    }

    const t = clock.getElapsedTime();
    const amp = currentTask.phase === 'deliver' ? 0.09 : 0.06;
    const pulse = 1.0 + amp * Math.sin(t * 6.0);
    target.scale.copy(target.userData._baseScale).multiplyScalar(pulse);

    lastHighlightTarget = target;
}

// Task system
function makeTask(type) {
    const baseTime = 16 - difficulty * 0.8;
    const maxTime = clamp(baseTime, 8, 18);
    const level = getActiveLevel();

    const task = {
        type,
        title: TASK_NAMES[type],
        maxTime,
        payload: {},
        phase: 'work'
    };

    if (type === TaskType.CODING) {
        const snippet = generateCodingSnippet(level.id);
        task.payload.line = snippet.target;
        task.payload.snippet = snippet;
    } else if (type === TaskType.WIRING) {
        const hits = level.wiringHits + Math.max(0, Math.floor(difficulty / 2));
        task.payload.requiredHits = hits;
        const extraSpeed = Math.max(0, (difficulty - 1) * 0.08);
        task.payload.wiringSpeed = level.wiringSpeed + extraSpeed;
    } else if (type === TaskType.METER) {
        const nodeCount = METER_NODE_COUNT;
        const seqLength = Math.min(nodeCount, level.meterSequence);
        task.payload.nodeCount = nodeCount;
        task.payload.sequence = makeMeterSequence(nodeCount, seqLength);
        task.payload.currentStep = 0;
    }

    return task;
}

function nextTaskType() {
    const r = Math.random();
    if (r < 0.34) return TaskType.CODING;
    if (r < 0.68) return TaskType.WIRING;
    return TaskType.METER;
}

function assignNextTask() {
    if (taskQueue.length === 0) {
        for (let i = 0; i < 3; i++) taskQueue.push(makeTask(nextTaskType()));
    }

    currentTask = taskQueue.shift();
    currentTask.phase = 'work';

    patienceMax = currentTask.maxTime;
    patienceLeft = patienceMax;

    setHUD(`${currentTask.title} - go to station`, score);
    showToast(`New task: ${currentTask.title}`);
    updateManagerBubble(currentTask.type, 'work');
}

function markTaskReadyForDelivery() {
    if (!currentTask) return;

    currentTask.phase = 'deliver';
    patienceLeft = Math.max(patienceLeft, 5);

    setHUD('Deliver to manager', score);
    showToast('Deliver the task to the manager.');
    updateManagerBubble(currentTask.type, 'deliver');
}

function completeTask() {
    score += 1;
    difficulty = 1 + Math.floor(score / 4);

    setHUD('Awaiting next task', score);
    showToast('Task delivered!');

    updateManagerBubble(null);
    currentTask = null;

    setPatience(1);

    if (lastHighlightTarget) {
        restoreBaseScale(lastHighlightTarget);
        lastHighlightTarget = null;
    }

    tryUnlockNextLevel(selectedLevelIndex);

    const hardTargetReached = (getActiveLevel().id === 'hard' && score >= LEVEL_UNLOCK_TARGET);
    if (hardTargetReached) {
        endGame('Promotion Secured', `Cleared ${LEVEL_UNLOCK_TARGET} tasks on Hard difficulty.`);
        return;
    }

    window.setTimeout(() => {
        if (state === GameState.PLAYING) assignNextTask();
    }, 600);
}

function endGame(title, reason) {
    state = GameState.ENDED;
    recordHighScoreIfNeeded();

    let appliedTitle = title;
    if (title === 'Game Over') {
        appliedTitle = score >= 10 ? 'Congrats on your promotion!' : "You're FIRED!";
    }
    endTitleEl.textContent = appliedTitle;
    endReasonEl.textContent = reason;
    endScoreEl.textContent = String(score);

    endOverlayEl.classList.remove('hidden');
    resetOverlays();

    updateManagerBubble(null);

    if (lastHighlightTarget) {
        restoreBaseScale(lastHighlightTarget);
        lastHighlightTarget = null;
    }

    currentTask = null;
    updateUIForState();
}

function updatePatience(dt) {
    if (!currentTask) return;
    if (devModeActive) {
        patienceLeft = patienceMax;
        setPatience(1);
        return;
    }

    patienceLeft -= dt;
    setPatience(patienceLeft / patienceMax);

    if (patienceLeft <= 0) {
        endGame('Game Over', 'Manager lost patience.');
    }
}

function deliverCurrentTask() {
    if (!currentTask || currentTask.phase !== 'deliver') return;
    completeTask();
}

function tryInteract() {
    if (state !== GameState.PLAYING || !currentTask) return;

    if (currentTask.phase === 'deliver') {
        if (canInteractWith(manager)) {
            deliverCurrentTask();
        } else {
            showToast('Bring the finished task to the manager.');
        }
        return;
    }

    const station = stationByType.get(currentTask.type);
    if (station && canInteractWith(station)) {
        if (!isInFrontOfStation(station)) {
            showToast('Stand in front of the station to start.');
            return;
        }
        openMinigameForTask();
        return;
    }

    if (canInteractWith(manager)) {
        showToast('Manager: Finish the current assignment.');
        return;
    }

    showToast('Move closer to the active station.');
}

async function openMinigameForTask() {
    if (!currentTask || currentTask.phase !== 'work') return;

    enterMinigame(currentTask.title);

    if (currentTask.type === TaskType.CODING) {
        minigameEl?.classList.remove('workbench-theme');
        mgCoding.classList.remove('hidden');
        codeInputEl.textContent = '';
        codeInputEl.classList.remove('error');
        codeFeedbackEl.textContent = '';
        if (!currentTask.payload.snippet) {
            const fallbackSnippet = generateCodingSnippet(getActiveLevel().id);
            currentTask.payload.snippet = fallbackSnippet;
            currentTask.payload.line = fallbackSnippet.target;
        }
        renderCodingSnippet(currentTask.payload.snippet);
        setTimeout(() => codeInputEl.focus(), 0);
    } else if (currentTask.type === TaskType.WIRING) {
        minigameEl?.classList.add('workbench-theme');
        mgWiring.classList.remove('hidden');
        wiringFeedbackEl.textContent = '';
        buildWiringBoard(
            currentTask.payload.requiredHits || 3,
            currentTask.payload.wiringSpeed
        );
    } else if (currentTask.type === TaskType.METER) {
        minigameEl?.classList.add('workbench-theme');
        mgMeter.classList.remove('hidden');
        meterFeedbackEl.textContent = '';
        if (typeof currentTask.payload.currentStep !== 'number') currentTask.payload.currentStep = 0;
        buildMeterBoard(currentTask.payload);
    }
}

function launchDevMinigame(type) {
    if (!devModeActive) return;
    const key = typeof type === 'string' ? type.toLowerCase() : '';
    let targetType = null;
    if (key === 'coding') targetType = TaskType.CODING;
    else if (key === 'wiring') targetType = TaskType.WIRING;
    else if (key === 'meter') targetType = TaskType.METER;
    if (!targetType) return;

    if (state === GameState.MINIGAME) {
        exitMinigame();
    }

    const devTask = makeTask(targetType);
    devTask.title = `${devTask.title} (DEV)`;
    devTask.isDevTask = true;
    devMinigameReturnTask = currentTask;
    devMinigameReturnState = state;
    currentTask = devTask;
    openMinigameForTask();
}

function finishMinigameSuccess() {
    const wasDevTask = !!currentTask?.isDevTask;
    exitMinigame();
    if (!wasDevTask) markTaskReadyForDelivery();
}

// Coding mini-game
function generateCodingSnippet(levelId) {
    const targetPool = CODING_LINES[levelId] || CODING_LINES.easy;
    const targetLine = pickRandom(targetPool) || '';
    const aboveCount = 2;
    const belowCount = 2;
    const before = Array.from({ length: aboveCount }, () => pickRandom(CODING_CONTEXT_ABOVE));
    const after = Array.from({ length: belowCount }, () => pickRandom(CODING_CONTEXT_BELOW));
    const targetNumber = Math.floor(Math.random() * 50) + 10;
    const startLine = Math.max(1, targetNumber - before.length);
    const lines = [
        ...before.map(text => ({ text, type: 'context' })),
        { text: targetLine, type: 'target' },
        ...after.map(text => ({ text, type: 'context' }))
    ];
    return {
        file: pickRandom(CODING_FILE_NAMES) || 'main.c',
        startLine,
        lines,
        target: targetLine
    };
}

function renderCodingSnippet(snippet) {
    if (!codeTargetEl) return;
    if (codeInputEl.parentElement) codeInputEl.remove();
    const data = snippet || { file: 'main.c', startLine: 1, lines: [] };
    const start = data.startLine || 1;
    const lines = Array.isArray(data.lines) ? data.lines : [];
    const body = lines.map((line, idx) => {
        const lineClass = line.type === 'target' ? 'vim-line target' : 'vim-line';
        const lineNumber = String(start + idx).padStart(3, ' ');
        const overlaySlot = line.type === 'target' ? '<span class="code-overlay-slot"></span>' : '';
        return `<div class="${lineClass}"><span class="vim-line-number">${lineNumber}</span><span class="vim-text">${escapeHtml(line.text)}</span>${overlaySlot}</div>`;
    }).join('');
    const status = '-- INSERT --';
    const fileLabel = escapeHtml(data.file || 'main.c');
    codeTargetEl.innerHTML = `<div class="vim-buffer">${body}</div><div class="vim-status"><span>${status}</span><span>${fileLabel}</span></div>`;
    const slot = codeTargetEl.querySelector('.code-overlay-slot');
    if (slot) slot.replaceWith(codeInputEl);
}

function onCodingInput() {

    if (!currentTask || currentTask.type !== TaskType.CODING) return;



    const target = currentTask.payload.line;

    const got = codeInputEl.textContent || '';



    let k = 0;

    for (; k < Math.min(target.length, got.length); k++) {

        if (target[k] !== got[k]) break;

    }

    const okPrefix = k === got.length;



    if (got.length === 0) {

        codeFeedbackEl.textContent = '';

        codeInputEl.classList.remove('error');

        return;

    }



    if (got === target) {

        codeFeedbackEl.textContent = 'Correct!';

        codeInputEl.classList.remove('error');

        finishMinigameSuccess();

    } else if (okPrefix) {

        codeFeedbackEl.textContent = 'So far so good...';

        codeInputEl.classList.remove('error');

    } else {

        codeFeedbackEl.textContent = 'Mismatch - fix the highlighted text.';

        codeInputEl.classList.add('error');

    }

}



codeInputEl.addEventListener('input', onCodingInput);

// Wiring mini-game board
function clearPins(pinsEl) {
    while (pinsEl.firstChild) pinsEl.removeChild(pinsEl.firstChild);
}

function drawBoardGrid(ctx, w, h, cols, rows, title) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.0)';
    ctx.fillRect(0, 0, w, h);

    // title
    ctx.fillStyle = 'rgba(230,237,247,0.9)';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(title, 14, 24);

    // board area
    const pad = 54;
    const bw = w - pad * 2;
    const bh = h - pad * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(pad, pad, bw, bh);

    // grid dots
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = pad + (c + 0.5) * (bw / cols);
            const y = pad + (r + 0.5) * (bh / rows);
            ctx.beginPath();
            ctx.arc(x, y, 2.0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fill();
        }
    }

    return { pad, bw, bh };
}

function buildWiringBoard(requiredHits, speedOverride) {
    const ctx = wiringCanvas.getContext('2d');
    clearPins(wiringPinsEl);
    wiringPinsEl.classList.add('hidden');

    wiringGame = {
        ctx,
        width: wiringCanvas.width,
        height: wiringCanvas.height,
        pos: 0,
        dir: 1,
        speed: speedOverride || 0.65,
        hits: 0,
        requiredHits,
        greenLeft: 0.47,
        greenRight: 0.53
    };

    wiringFeedbackEl.textContent = `Hit space in the green zone ${requiredHits} times.`;
    drawWiringGauge();
}

function drawWiringGauge() {
    if (!wiringGame) return;
    const { ctx, width: w, height: h, pos, greenLeft, greenRight } = wiringGame;

    ctx.clearRect(0, 0, w, h);
    // ctx.fillStyle = 'rgba(10,14,20,0.95)';
    // ctx.fillRect(0, 0, w, h);

    // ctx.fillStyle = 'rgba(230,237,247,0.75)';

    const barX = 80;
    const barY = h / 13;
    const barW = w - 160;
    const barH = 28;

    const redWidth = barW * 0.5;
    ctx.fillStyle = 'rgba(125, 0, 12, 1)';
    ctx.fillRect(barX, barY - barH / 2, redWidth, barH);
    ctx.fillRect(barX + barW - redWidth, barY - barH / 2, redWidth, barH);

    const greenW = barW * (greenRight - greenLeft);
    ctx.fillStyle = 'rgba(0, 139, 53, 1)';
    ctx.fillRect(barX + barW * greenLeft, barY - barH / 2, greenW, barH);

    const indicatorX = barX + barW * pos;
    ctx.fillStyle = '#7cff6b';
    ctx.fillRect(indicatorX - 2, barY - barH, 4, barH * 2);
}

function tapSolderingIron() {
    if (!wiringIronArt) return;
    wiringIronArt.classList.add('tap');
    clearTimeout(wiringIronTapTimer);
    wiringIronTapTimer = window.setTimeout(() => {
        wiringIronArt.classList.remove('tap');
    }, 140);
}

function updateWiringGame(dt) {
    if (!wiringGame) return;
    if (state !== GameState.MINIGAME || currentTask?.type !== TaskType.WIRING) return;

    wiringGame.pos += wiringGame.dir * wiringGame.speed * dt;
    if (wiringGame.pos >= 1) {
        wiringGame.pos = 1;
        wiringGame.dir = -1;
    } else if (wiringGame.pos <= 0) {
        wiringGame.pos = 0;
        wiringGame.dir = 1;
    }

    drawWiringGauge();
}


function handleWiringHit() {
    if (!wiringGame || !currentTask || currentTask.type !== TaskType.WIRING) return;
    tapSolderingIron();
    const pos = wiringGame.pos;
    if (pos >= wiringGame.greenLeft && pos <= wiringGame.greenRight) {
        wiringGame.hits += 1;
        const remaining = wiringGame.requiredHits - wiringGame.hits;
        if (remaining <= 0) {
            wiringFeedbackEl.textContent = 'Perfect timing!';
            finishMinigameSuccess();
            return;
        }
        wiringFeedbackEl.textContent = `Nice timing - ${remaining} more to go.`;
    } else {
        wiringFeedbackEl.textContent = 'Miss! Hit space only in the green zone.';
    }
}



// Multimeter mini-game board
function setMeterProbeVisible(visible) {
    if (!meterProbeEl) return;
    meterProbeEl.classList.toggle('hidden', !visible);
}

function moveMeterProbeTo(x, y, w, h) {
    if (!meterProbeEl) return;
    const left = (x / w) * 100;
    const top = (y / h) * 100;
    meterProbeEl.style.left = `${left}%`;
    meterProbeEl.style.top = `${top}%`;
}

function makeMeterSequence(nodeCount, sequenceLength) {
    const indices = Array.from({ length: nodeCount }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const len = Math.min(sequenceLength, nodeCount);
    const sequence = [];
    for (let i = 0; i < len; i++) {
        const node = indices[i];
        const voltage = METER_VOLTAGES[Math.floor(Math.random() * METER_VOLTAGES.length)];
        sequence.push({ node, voltage });
    }
    return sequence;
}


function buildMeterBoard(payload) {
    if (!payload) return;
    const ctx = meterCanvas.getContext('2d');
    const w = meterCanvas.width;
    const h = meterCanvas.height;

    clearPins(meterPinsEl);
    setMeterProbeVisible(false);
    if (meterProbeEl) meterPinsEl.appendChild(meterProbeEl);

    function buildMeterBoardBase(ctx2, w2, h2) {
        ctx2.clearRect(0, 0, w2, h2);
        ctx2.fillStyle = 'rgba(5,8,12,0.75)';
        ctx2.fillRect(0, 0, w2, h2);
    }

    function drawProbeLine(node) {
        // buildMeterBoardBase(ctx, w, h);
        // ctx.beginPath();
        // ctx.moveTo(node.x, node.y);
        // ctx.lineTo(90, 170);
        // ctx.strokeStyle = 'rgba(77,163,255,0.9)';
        // ctx.lineWidth = 5;
        // ctx.stroke();
        moveMeterProbeTo(node.x, node.y, w, h);
        setMeterProbeVisible(true);
    }

    // buildMeterBoardBase(ctx, w, h);

    const nodes = [];
    const nodeCount = payload.nodeCount || METER_NODE_COUNT;
    const padX = 120;
    const padY = 90;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;
    const minSpacing = Math.min(usableW, usableH) / Math.max(Math.sqrt(nodeCount) * 1.6, 1);
    let attempts = 0;
    while (nodes.length < nodeCount && attempts < nodeCount * 40) {
        attempts++;
        const x = padX + Math.random() * usableW;
        const y = padY + Math.random() * usableH;
        const farEnough = nodes.every(n => {
            const dx = n.x - x;
            const dy = n.y - y;
            return Math.hypot(dx, dy) >= minSpacing;
        });
        if (farEnough) nodes.push({ i: nodes.length, x, y });
    }
    while (nodes.length < nodeCount) {
        const angle = (nodes.length / nodeCount) * Math.PI * 2;
        const radius = Math.min(usableW, usableH) * 0.4;
        const x = padX + usableW / 2 + Math.cos(angle) * radius;
        const y = padY + usableH / 2 + Math.sin(angle) * radius;
        nodes.push({ i: nodes.length, x, y });
    }

    function updateMeterInstructions() {
        const sequence = payload.sequence || [];
        const idx = payload.currentStep || 0;
        if (sequence.length === 0) {
            meterFeedbackEl.textContent = 'No targets configured.';
            return;
        }
        if (idx >= sequence.length) {
            meterFeedbackEl.textContent = 'All readings captured!';
            return;
        }
        const target = sequence[idx];
        meterFeedbackEl.textContent = `Probe ${idx + 1}/${sequence.length}: Find node at ${target.voltage.toFixed(1)}V`;
    }

    function updateTargetHighlight() {
        const targetNode = (payload.sequence || [])[payload.currentStep || 0]?.node;
        const pins = meterPinsEl.querySelectorAll('.pin');
        pins.forEach(pin => {
            const isTarget = Number(pin.dataset.index) === targetNode;
            pin.classList.toggle('hot', !!isTarget);
        });
    }

    updateMeterInstructions();

    const sequence = payload.sequence || [];
    if (!Array.isArray(sequence) || sequence.length === 0) return;

    for (const n of nodes) {
        const el = document.createElement('div');
        el.className = 'pin';
        el.dataset.index = String(n.i);
        el.style.left = `${(n.x / w) * 100}%`;
        el.style.top = `${(n.y / h) * 100}%`;

        el.addEventListener('click', () => {
            if (!currentTask || currentTask.type !== TaskType.METER) return;

            drawProbeLine(n);

            const step = payload.currentStep || 0;
            const target = sequence[step];
            if (!target) return;

            if (n.i === target.node) {
                payload.currentStep = step + 1;
                if (payload.currentStep >= sequence.length) {
                    meterFeedbackEl.textContent = `Reading: ${target.voltage.toFixed(1)}V - sequence complete!`;
                    finishMinigameSuccess();
                } else {
                    meterFeedbackEl.textContent = `Reading: ${target.voltage.toFixed(1)}V - locked. Next target ready.`;
                    updateMeterInstructions();
                    updateTargetHighlight();
                }
            } else {
                const noise = (Math.random() * 2 - 1) * 0.5;
                meterFeedbackEl.textContent = `Reading: ${(target.voltage + noise).toFixed(2)}V - wrong node.`;
            }
        });

        meterPinsEl.appendChild(el);
    }

    updateTargetHighlight();
}



// Pointer click ray interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('pointerdown', (e) => {
    if (state !== GameState.PLAYING) return;
    if (overlayEl && !overlayEl.classList.contains('hidden')) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length === 0) return;

    // climb to top-level named object
    let obj = hits[0].object;
    while (obj && obj.parent && obj.parent !== scene) obj = obj.parent;
    if (!obj) return;

    if (obj.name.includes('Station') && canInteractWith(obj)) {
        if (currentTask?.phase === 'deliver') {
            showToast('Deliver the task before starting another.');
            return;
        }

        const typeNeeded = currentTask?.type;
        const expected = stationByType.get(typeNeeded);
        if (expected && (obj === expected)) {
            if (!isInFrontOfStation(expected)) {
                showToast('Move to the front of the station.');
            } else {
                openMinigameForTask();
            }
        } else {
            showToast('That station is not the active task.');
        }
    } else if (obj.name === 'Manager') {
        if (currentTask?.phase === 'deliver' && canInteractWith(manager)) {
            deliverCurrentTask();
        } else if (canInteractWith(manager)) {
            showToast('Manager: Hurry up.');
        } else {
            showToast('Get closer to talk to the manager.');
        }
    }
});

// Main
function disposeScene() {
    if (!scene) return;

    scene.traverse(o => {
        if (o.isMesh) {
            o.geometry?.dispose?.();
            if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
                else o.material.dispose?.();
            }
        } else if (o.isSprite) {
            o.material?.dispose?.();
        }
    });

    if (managerBubbleTexture) {
        managerBubbleTexture.dispose();
        managerBubbleTexture = null;
    }
    managerBubbleCanvas = null;
    managerBubble = null;
    lastHighlightTarget = null;
    playerMixer = null;
    playerActionIdle = null;
    playerActionWalk = null;
    playerProcedural = null;
    playerIsMoving = false;
}

async function initThree(isPrototype) {
    disposeScene();

    scene = new THREE.Scene();
    lastSceneWasPrototype = isPrototype;
    applyFrontWallTexture();

    clock = new THREE.Clock();
    loader = new GLTFLoader();

    buildRenderer();
    buildCamera();
    buildLights();
    buildRoom(isPrototype);
    applyWallTextureToRoom(); // add this
    buildActors(isPrototype);

    // swap pending primitives with models (Full mode)
    if (!isPrototype) {
        resolvePendingModels(scene).catch(err => {
            console.warn('resolvePendingModels failed:', err);
            showToast('Some models failed to load; using primitives.');
        });
    }


    window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    configureStaticCamera();
  });
}

function resetGameState() {
    score = 0;
    difficulty = 1;
    patienceLeft = 1;
    patienceMax = 1;
    currentTask = null;
    taskQueue = [];
    devMinigameReturnTask = null;
    devMinigameReturnState = null;

    setPatience(1);
    setHUD('-', 0);
    setHUDVisibility(false);

    resetOverlays();
    endOverlayEl.classList.add('hidden');
    updateManagerBubble(null);

    if (lastHighlightTarget) {
        restoreBaseScale(lastHighlightTarget);
        lastHighlightTarget = null;
    }
}

async function startGame(selectedMode) {
    mode = selectedMode;
    setSelectedLevel(selectedLevelIndex);

    menuEl.classList.add('hidden');
    endOverlayEl.classList.add('hidden');

    resetGameState();

    const isPrototype = (mode === 'prototype');
    await initThree(isPrototype);

    state = GameState.PLAYING;
    updateUIForState();
    const lvlLabel = getActiveLevel().label;
    showToast(`${isPrototype ? 'Prototype' : 'Full'} Mode - ${lvlLabel} Level`);

    // initial task
    assignNextTask();

    animate();
}

let animating = false;

function animate() {
    if (animating) return;
    animating = true;

    renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.05);

        if (state === GameState.PLAYING) {
            updateMovement(dt);

            updatePatience(dt);
            highlightStation();

            if (actionQueued) {
                actionQueued = false;
                tryInteract();
            }

            setCameraFollow();
        } else if (state === GameState.MINIGAME) {
            setCameraFollow();
            updatePatience(dt);
        }

        if (state === GameState.MINIGAME && currentTask?.type === TaskType.WIRING) {
            updateWiringGame(dt);
        }


        if (playerMixer) playerMixer.update(dt);
        updateProceduralWalk(dt);

        // (Change applied) No manager idle bobbing.


        renderer.render(scene, camera);
    });
}

function handleMenuDevCheat(key) {
    if (state !== GameState.MENU) {
        menuCheatBuffer = '';
        return;
    }
    if (!/^[a-z]$/.test(key)) return;
    menuCheatBuffer = (menuCheatBuffer + key).slice(-8);
    if (!devModeActive && menuCheatBuffer.endsWith('dev')) {
        activateDevMode();
    }
}

function activateDevMode() {
    devModeActive = true;
    menuCheatBuffer = '';
    showToast('Developer mode enabled.');
    updateLevelButton();
    updateDevControlsVisibility();
}

function updateDevControlsVisibility() {
    const showToolbar = devModeActive;
    if (devToolbarEl) devToolbarEl.classList.toggle('hidden', !showToolbar);
    if (btnDevEnd) {
        const showEnd = state === GameState.PLAYING;
        btnDevEnd.classList.toggle('hidden', !showEnd);
    }
    if (closeMiniBtn) {
        const showClose = devModeActive && state === GameState.MINIGAME;
        closeMiniBtn.classList.toggle('hidden', !showClose);
    }
    if (devMiniButtons.length) {
        devMiniButtons.forEach(btn => {
            btn.disabled = !devModeActive;
        });
    }
}

// Start in menu
updateHighScoreUI();
window.eeDashSetFrontWallTexture = setFrontWallTexture;
resetGameState();
setHelpView(false);
updateLevelButton();
updateUIForState();
