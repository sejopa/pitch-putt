/* ============================================================
   MOTOR 3D · RELOJ VIRTUAL + BARRA DE TIEMPO TIPO VÍDEO
   Todo el replay depende de state.clock (segundos del hoyo).
   Play y scrub usan el mismo seekTo() → determinista y coherente.
   Usa window.GolfAvatars, window.GolfCourse y window.GOLF_TUNE
   ============================================================ */
window.__GOLF_AUDIO = window.__GOLF_AUDIO || null;
window.__GOLF_REPLAYS = window.__GOLF_REPLAYS || [];

function sharedAudio() {
  if (!window.__GOLF_AUDIO) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) window.__GOLF_AUDIO = new AC();
  }
  if (window.__GOLF_AUDIO && window.__GOLF_AUDIO.state === 'suspended') window.__GOLF_AUDIO.resume();
  return window.__GOLF_AUDIO;
}
function fnv(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var PALETTE = [
  { color: 0xef4444, css: "#ef4444" },
  { color: 0x3b82f6, css: "#3b82f6" },
  { color: 0x10b981, css: "#10b981" },
  { color: 0xf59e0b, css: "#f59e0b" },
  { color: 0xa855f7, css: "#a855f7" },
  { color: 0xec4899, css: "#ec4899" }
];

window.initRetroReplay = function (container, matchData) {

  var retroHTML =
    '<div class="retro-wrapper">' +
      '<header class="retro-header"><h1>⛳ BADALONA GOLF TOUR · DIRECTO</h1></header>' +
      //'<div class="retro-screen" id="scr">' +
      //  '<div id="retroBadge" class="retro-badge">TURNO: --</div>' +
      //  '<div id="retroScore" class="retro-score"></div>' +
      //CAMBIO CON RESULTADOS
      '<div id="retroScore" class="retro-score"></div>' +
      '<div class="retro-screen" id="scr">' +
        '<div id="retroBadge" class="retro-badge">TURNO: --</div>' +
      //FIN

        '<div id="specHint" class="retro-badge hide" style="top:auto;bottom:8px;left:8px">🖱️ Arrastra: girar · Rueda: zoom</div>' +
        '<div id="holeResultScreen" class="hole-result-screen hide"></div>' +
      '</div>' +
      '<div class="retro-timeline">' +
        '<span id="tlCur" class="tl-time">0:00</span>' +
        '<input id="tlBar" type="range" min="0" max="1000" value="0" step="1" aria-label="Línea de tiempo del hoyo">' +
        '<span id="tlTot" class="tl-time">0:00</span>' +
      '</div>' +
      '<div id="retroCommentary" class="retro-commentary">¡Pulsa REPRODUCIR!</div>' +
      '<div class="retro-controls">' +
        '<button id="retroPlayBtn" class="retro-btn-play">▶ REPRODUCIR</button>' +
        '<button id="retroPauseBtn" class="retro-btn-pause hide">⏸ PAUSA</button>' +
        '<button id="retroResetBtn" class="retro-btn-reset">🔄 REINICIAR</button>' +
        '<button id="retroPrevBtn" class="retro-btn-nav">◀ HOYO</button>' +
        '<span id="retroHoleLabel" class="retro-hole-label">HOYO 1/9</span>' +
        '<button id="retroNextBtn" class="retro-btn-nav">HOYO ▶</button>' +
        '<button id="retroSpecBtn" class="retro-btn-nav">👁️ ESPECTADOR</button>' +
        //añadimos boton control pantalla completa.
        '<button id="retroFsBtn" class="retro-btn-nav">⛶ PANTALLA</button>' +
      '</div>' +
    '</div>';
  container.innerHTML = retroHTML;

  var screenEl = container.querySelector('#scr');
  var commentaryBox = container.querySelector('#retroCommentary');
  var badgeBox = container.querySelector('#retroBadge');
  var scoreBox = container.querySelector('#retroScore');
  var playBtn = container.querySelector('#retroPlayBtn');
  var pauseBtn = container.querySelector('#retroPauseBtn');
  var holeResultScreen = container.querySelector('#holeResultScreen');
  var tlBar = container.querySelector('#tlBar');
  var tlCur = container.querySelector('#tlCur');
  var tlTot = container.querySelector('#tlTot');

  if (typeof THREE === 'undefined') {
    screenEl.insertAdjacentHTML('beforeend', '<div class="msg" style="color:#facc15">El modo 3D necesita conexión a internet para cargar Three.js.</div>');
    return;
  }

  var numPlayers = matchData.players.length;
  var players = matchData.players.map(function (p, i) {
    var c = PALETTE[i % PALETTE.length];
    return { name: p.name, color: c.color, css: c.css, scores: p.scores };
  });
  var courseData = {
    holes: [
      { hoyo: 1, par: 3 }, { hoyo: 2, par: 3 }, { hoyo: 3, par: 3 },
      { hoyo: 4, par: 3 }, { hoyo: 5, par: 3 }, { hoyo: 6, par: 3 },
      { hoyo: 7, par: 3 }, { hoyo: 8, par: 3 }, { hoyo: 9, par: 3 }
    ],
    players: players
  };

  var BALL_R = 0.055;
  // Duraciones (segundos) de cada fase de la rutina
  var D_SETUP = 0.6, D_LOOK = 0.6, D_SETTLE = 0.35, D_SWING = 1.4, D_HOLD = 1.5;

  var state = {
    currentHoleIndex: 0, nextStarterIndex: 0,
    matchSequence: [], currentTaskIndex: 0, currentTask: null,
    taskProgress: 0,
    routine: { phase: 'SETUP', t: 0 },
    clock: 0,
    scrubbing: false, wasPlaying: false,
    pOff: 0, pOffTarget: 0,
    isPlaying: false, cameraMode: 'TEE', spectator: false,
    orbitFocus: 'player',   // 'player' | 'ball'
    audioCtx: null, animFrameId: null, frameTimer: 0,
    pot: 1, holeWinnings: players.map(function () { return 0; }),
    holeResults: [],
    vendorPresent: false,
    vendorPos: new THREE.Vector3(),
    vendorPhase: 0
  };

  // Línea de tiempo del hoyo actual
  var shotTimeline = [];
  var timelineTotal = 0;

  // ---------- Renderer, escena, luces ----------
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(640, 480, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  screenEl.insertBefore(renderer.domElement, screenEl.firstChild);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec9f0);
  scene.fog = new THREE.Fog(0xcfe8ff, 70, 260);

  //var camera = new THREE.PerspectiveCamera(55, 640 / 480, 0.1, 600);
  //camera.position.set(1.5, 1.6, 2.8);
  //var camLook = new THREE.Vector3(0, 0.5, -7);
  
  //CAMARA ESPACIAL MAS SEPARADA
  var camera = new THREE.PerspectiveCamera(55, 640 / 480, 0.1, 600);
  camera.position.set(0, 2.1, 5.0);
  var camLook = new THREE.Vector3(0, 0.6, -9);



  var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3f7d2c, 0.72);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff2cc, 1.08);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  var campo = window.GolfCourse.crearCampo(scene);
  var HOLE = campo.HOLE;

  // Precargar modelos 3D antes de crear avatares
  var playerNames = players.map(function (p) { return p.name; });
  // Crear avatares (si los modelos aún no están en caché, se crea fallback;
  // una vez cargados en segundo plano, el próximo replay los usará).
  window.GolfAvatars.precargarActivos(playerNames).then(function () {
    // Recargar si ya estábamos mostrando algo (primer arranque tras precarga)
    if (!golfersBuilt) rebuildGolfers();
  });

  var golfers = [];
  var golfersBuilt = false;
  function rebuildGolfers() {
    golfers.forEach(function (g) { scene.remove(g); });
    golfers = players.map(function (p, i) {
      var g = window.GolfAvatars.crearHumano(p.color, p.name);
      scene.add(g);
      return g;
    });
    golfersBuilt = true;
  }
  rebuildGolfers();
  

  // Antonio, el vendedor de bolas (NPC ocasional)
  var vendor = window.GolfAvatars.crearVendedor();
  vendor.visible = false;
  scene.add(vendor);

  // ---------- Bolsa con palos ----------
  var bag = new THREE.Group();
  var bagMat = new THREE.MeshLambertMaterial({ color: 0xb23b3b, side: THREE.DoubleSide });
  var bagBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.85, 16, 1, true), bagMat);
  bagBody.position.y = 0.425; bagBody.castShadow = true; bag.add(bagBody);
  var bagInner = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.125, 0.84, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0x141414, side: THREE.DoubleSide }));
  bagInner.position.y = 0.42; bag.add(bagInner);
  var bagBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.06, 16), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  bagBase.position.y = 0.03; bagBase.castShadow = true; bag.add(bagBase);
  var bagRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 20), new THREE.MeshLambertMaterial({ color: 0x8c2626 }));
  bagRim.rotation.x = Math.PI / 2; bagRim.position.y = 0.85; bag.add(bagRim);
  var bagPocket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.06), new THREE.MeshLambertMaterial({ color: 0x8c2626 }));
  bagPocket.position.set(0, 0.34, 0.15); bagPocket.castShadow = true; bag.add(bagPocket);
  ['tee', 'iron', 'wedge', 'putt'].forEach(function (k, bci) {
    var bcl = window.GolfAvatars.makeClub(k);
    var angB = bci * Math.PI / 2 + 0.4;
    bcl.scale.setScalar(0.8);
    bcl.position.set(Math.cos(angB) * 0.05, 1.16, Math.sin(angB) * 0.05);
    bcl.rotation.z = Math.cos(angB) * 0.04;
    bcl.rotation.x = -Math.sin(angB) * 0.04;
    bag.add(bcl);
  });
  scene.add(bag);

  // ---------- Bolas, sombras, estela, marcador, partículas ----------
  var balls = players.map(function () {
    var b = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 14, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    b.castShadow = true;
    scene.add(b);
    return b;
  });
  var ballShadows = players.map(function () {
    var m = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    );
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
    return m;
  });

  var TRAIL_N = 26;
  var trailGeo = new THREE.BufferGeometry();
  var trailAttr = new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3);
  trailGeo.setAttribute('position', trailAttr);
  var trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
  trail.frustumCulled = false; trail.visible = false;
  scene.add(trail);
  var trailPts = [];

  var aimRing = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.32, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  aimRing.rotation.x = -Math.PI / 2; aimRing.visible = false; scene.add(aimRing);

  var particles = [];
  var partMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
  var sandMatP = new THREE.MeshBasicMaterial({ color: 0xe8d59a });
  var dirtMat = new THREE.MeshBasicMaterial({ color: 0x7a5230 });
  for (var pi = 0; pi < 10; pi++) {
    var pm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), partMat);
    pm.visible = false;
    particles.push(pm);
    scene.add(pm);
  }

  // ---------- Utilidades ----------
  function lerp(a, b, f) { return a + (b - a) * f; }
  function ease(x) { return x * x * (3 - 2 * x); }
  function easeOut(x) { return 1 - (1 - x) * (1 - x); }
  function dist2D(p, q) { return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.z - q.z) * (p.z - q.z)); }
  function groundY(d) { return (d <= campo.ON_GREEN ? campo.GREEN_TOP : 0); }
  function arcHeight(club) {
    if (club === 'tee') return 7;
    if (club === 'iron') return 5;
    if (club === 'wedge') return 2.6;
    return 0;
  }
  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    var m = Math.floor(s / 60), ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function swingT() {
    if (window.GOLF_TUNE.scrub >= 0) return window.GOLF_TUNE.scrub;
    var r = state.routine;
    if (r.phase === 'SWING') return state.taskProgress;
    if (r.phase === 'HOLD') return 1;
    return 0;
  }

  // ---------- Audio ----------
  function initAudio() {
    try { state.audioCtx = sharedAudio(); }
    catch (e) { state.audioCtx = null; }
  }
  function playSynthSound(type) {
    if (!state.audioCtx) return;
    var now = state.audioCtx.currentTime;
    if (type === 'swing') {
      var bufferSize = state.audioCtx.sampleRate * 0.18;
      var buffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
      var output = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      var noise = state.audioCtx.createBufferSource(); noise.buffer = buffer;
      var filter = state.audioCtx.createBiquadFilter(); filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.18);
      var gain = state.audioCtx.createGain();
      gain.gain.setValueAtTime(0.25, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
      noise.start(now);
    } else if (type === 'hit') {
      var osc = state.audioCtx.createOscillator(), g2 = state.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now); osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
      g2.gain.setValueAtTime(0.4, now); g2.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(g2); g2.connect(state.audioCtx.destination);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'putt') {
      var osc = state.audioCtx.createOscillator(), g2 = state.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now); osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      g2.gain.setValueAtTime(0.35, now); g2.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.connect(g2); g2.connect(state.audioCtx.destination);
      osc.start(now); osc.stop(now + 0.06);
    } else if (type === 'splash') {
      var bufferSize = state.audioCtx.sampleRate * 0.35;
      var buffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
      var output = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      var noise = state.audioCtx.createBufferSource(); noise.buffer = buffer;
      var filter = state.audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(450, now);
      var gain = state.audioCtx.createGain();
      gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
      noise.start(now);
    } else if (type === 'cheer') {
      [523.25, 659.25, 783.99, 1046.50].forEach(function (f, idx) {
        var osc = state.audioCtx.createOscillator(), g2 = state.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + idx * 0.07);
        g2.gain.setValueAtTime(0.12, now + idx * 0.07);
        g2.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
        osc.connect(g2); g2.connect(state.audioCtx.destination);
        osc.start(now + idx * 0.07); osc.stop(now + idx * 0.07 + 0.22);
      });
    } else if (type === 'groan') {
      var osc = state.audioCtx.createOscillator(), g2 = state.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(90, now + 0.4);
      g2.gain.setValueAtTime(0.2, now); g2.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.connect(g2); g2.connect(state.audioCtx.destination);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'bounce') {
      var osc = state.audioCtx.createOscillator(), g3 = state.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
      g3.gain.setValueAtTime(0.15, now); g3.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(g3); g3.connect(state.audioCtx.destination);
      osc.start(now); osc.stop(now + 0.05);
    }
  }

  var DIALOGUES = {
    birdie: ["¡Menudo golpazo! ¡Birdie!", "¡A la cazuela! Birdie.", "¡Impresionante!"],
    par: ["Par muy sólido.", "Gran control. Par.", "Golpe limpio. Par."],
    bogey: ["Un despiste... Bogey.", "A la hierba. Bogey.", "¡Rozó el borde! Bogey."],
    doubleBogey: ["¡Agua va!", "Atrapado en arena...", "¡Qué sufrimiento!"]
  };
  function getRandomDialogue(rng, type) {
    var list = DIALOGUES[type] || DIALOGUES.par;
    return list[Math.floor(rng() * list.length)];
  }

  // ---------- Plan de golpes ----------
  function makePlan(score, len, lay, rng) {
    var plan = [];
    var onG = function (d) { return d <= campo.ON_GREEN; };
    if (score === 1) { plan.push({ club: 'tee', toDist: 0, lie: 'hole' }); return plan; }
    if (score === 2) {
      plan.push({ club: 'tee', toDist: 0.8 + rng() * 0.9, lie: 'green' });
      plan.push({ club: 'putt', toDist: 0, lie: 'hole' });
      return plan;
    }
    var water = (score >= 5 && lay.water && rng() < 0.35);
    if (water) plan.push({ club: 'tee', toDist: -1, lie: 'water', hazard: 'water' });
    var t1 = Math.min(len * 0.35, Math.max(3, len * (0.12 + rng() * 0.10) + (score - 3) * 2.5));
    plan.push({ club: 'tee', toDist: t1, lie: onG(t1) ? 'green' : 'fairway' });
    var left = score - plan.length;
    var putts = left >= 2 ? (rng() < 0.5 ? 2 : 1) : 1;
    var mids = left - putts;
    var cur = t1;
    var bunkerIdx = (mids >= 2 && score >= 4 && rng() < 0.45) ? Math.floor(rng() * (mids - 1)) : -1;
    for (var m = 0; m < mids; m++) {
      var lastMid = (m === mids - 1);
      var nd = lastMid ? (putts === 1 ? 1.0 + rng() * 1.6 : 2.5 + rng() * 3.0)
                       : Math.max(4.5, cur * (0.32 + rng() * 0.22));
      var lie = onG(nd) ? 'green' : 'fairway';
      var hazard = null;
      var club = (cur > 20 ? 'iron' : (nd > 8 ? 'iron' : 'wedge'));
      if (m === bunkerIdx) { lie = 'bunker'; hazard = 'sand'; club = 'wedge'; nd = Math.max(3.5, nd); }
      plan.push({ club: club, toDist: nd, lie: lie, hazard: hazard });
      cur = nd;
    }
    if (putts === 2) {
      plan.push({ club: 'putt', toDist: 0.7 + rng() * 1.1, lie: 'green' });
      plan.push({ club: 'putt', toDist: 0, lie: 'hole' });
    } else {
      plan.push({ club: 'putt', toDist: 0, lie: 'hole' });
    }
    return plan;
  }

  function camFor(club, fromDist, hazard) {
    if (hazard === 'water') return 'TEE';
    if (club === 'putt') return 'PUTT';
    if (club === 'tee') return 'TEE';
    if (fromDist > 20) return 'WIDE';
    if (fromDist > 9) return 'SIDE';
    return 'NEAR';
  }

  function dialogueFor(tk, rng, holePar) {
    var p = tk.player;
    if (tk.club === 'putt') {
      if (tk.isLastPutt) {
        var df = tk.totalStrokes - holePar;
        if (df < 0) return p.name + ": " + getRandomDialogue(rng, 'birdie');
        if (df === 0) return p.name + ": " + getRandomDialogue(rng, 'par');
        if (df === 1) return p.name + ": " + getRandomDialogue(rng, 'bogey');
        return p.name + ": " + getRandomDialogue(rng, 'doubleBogey');
      }
      return p.name + ": Putt fallado, sigue en el green...";
    }
    if (tk.hazard === 'water') return p.name + ": ¡Al agua! Penalización, repite desde el punto anterior.";
    if (tk.hazard === 'sand') return p.name + ": A la arena del búnker.";
    if (tk._shank) return p.name + ": ¡Socketazo! La bola sale disparada al lateral.";
    if (tk.club === 'tee') return p.name + ": Salida desde el tee.";
    if (tk.club === 'wedge') return p.name + ": Wedge de aproximación.";
    return p.name + ": Hierro desde la calle.";
  }

  // ---------- Simulación del hoyo (N jugadores) ----------
  function buildHoleSequence() {
    state.matchSequence = [];
    var h = state.currentHoleIndex;
    campo.dressHole(h);
    var len = campo.HOLE_LEN[h];
    var lay = campo.layout();
    var scores = players.map(function (p) { return p.scores[h]; });
    var seedBase = (matchData.id || 'm') + '|' + h + '|';

    //var teeSpacing = 0.7;
    //var simBalls = players.map(function (p, i) {
    //  var offset = (i - (numPlayers - 1) / 2) * teeSpacing;
    //  return { i: i, pos: { x: offset, z: 0 }, dist: len, lie: 'tee', strokes: 0, done: false };
    //});
    // Todos los jugadores salen del MISMO punto del tee; la bola, siempre igual
    var TEE_SPOT = { x: 0.35, z: 0.3 };
    var simBalls = players.map(function (p, i) {
      return { i: i, pos: { x: TEE_SPOT.x, z: TEE_SPOT.z }, dist: len, lie: 'tee', strokes: 0, done: false };
    });
    //FIN

    var plans = scores.map(function (s, i) {
      return makePlan(s, len, lay, mulberry32(fnv(seedBase + 'p' + i)));
    });
    var shotRng = mulberry32(fnv(seedBase + 'shots'));

    // Antonio: casi siempre en el hoyo 7, a veces en el 5, nunca en el resto
    //var vr = mulberry32(fnv(seedBase + 'antonio'));
    //state.vendorPresent = (h === 6) ? (vr() < 0.75) : (h === 4) ? (vr() < 0.30) : false;
    //state.vendorPos.set((vr() < 0.5 ? 3.6 : -3.6), 0, -len * 0.35 + vr() * 8);
    //state.vendorPhase = vr() * 9;
    var vr = mulberry32(fnv(seedBase + 'antonio'));
    state.vendorPresent = (h === 6) ? (vr() < 0.85) : (h === 4) ? (vr() < 0.30) : false;
    if (h === 6) {
      // En el 7, Antonio viene por la riera, detrás del muro derecho
      state.vendorPos.set(10.6 + vr() * 1.6, 0, -len * (0.30 + vr() * 0.35));
    } else {
      state.vendorPos.set((vr() < 0.5 ? 3.6 : -3.6), 0, -len * 0.35 + vr() * 8);
    }
    state.vendorPhase = vr() * 9;

    var starter = state.nextStarterIndex;

    var teeOrder = [];
    for (var ti = 0; ti < numPlayers; ti++) teeOrder.push((starter + ti) % numPlayers);
    var teeUsed = players.map(function () { return false; });

    var guard = 0;
    while (guard++ < 80) {
      var active = simBalls.filter(function (b) { return !b.done; });
      if (!active.length) break;

      var b;
      if (active.length === 1) b = active[0];
      else {
        var pendingTee = active.filter(function (ab) { return !teeUsed[ab.i]; });
        if (pendingTee.length > 0) {
          b = null;
          for (var ti2 = 0; ti2 < teeOrder.length; ti2++) {
            var idx = teeOrder[ti2];
            if (!teeUsed[idx]) {
              var match = pendingTee.filter(function (ab) { return ab.i === idx; })[0];
              if (match) { b = match; break; }
            }
          }
          if (!b) b = pendingTee[0];
        } else {
          var maxD = -1; b = null;
          active.forEach(function (ab) {
            if (ab.dist > maxD + 0.05) { maxD = ab.dist; b = ab; }
            else if (Math.abs(ab.dist - maxD) < 0.05 && !b) b = ab;
          });
        }
      }

      var entry = plans[b.i][b.strokes];
      if (!entry) { b.done = true; continue; }
      teeUsed[b.i] = true;

      var from = { x: b.pos.x, z: b.pos.z };
      var fromDist = b.dist;
      var to, toDist = entry.toDist, lie = entry.lie, hazard = entry.hazard || null;
      var shank = (entry.club !== 'putt' && toDist !== 0 && scores[b.i] >= 6 && shotRng() < 0.4);

      if (hazard === 'water') {
        to = { x: lay.water.x + (shotRng() - 0.5) * 2, z: lay.water.z + (shotRng() - 0.5) * 2 };
      } else if (shank) {
        to = { x: from.x + (shotRng() < 0.5 ? 2.5 : -2.5), z: from.z - 1.5 };
        toDist = dist2D(to, { x: HOLE.x, z: HOLE.z });
        lie = 'fairway'; hazard = null;
      } else if (lie === 'bunker') {
        var bk = lay.bunkers[Math.floor(shotRng() * lay.bunkers.length)];
        to = { x: bk.x + (shotRng() - 0.5) * 1.2, z: bk.z + (shotRng() - 0.5) * 1.2 };
        toDist = dist2D(to, { x: HOLE.x, z: HOLE.z });
      } else if (toDist === 0) {
        to = { x: HOLE.x, z: HOLE.z };
      } else {
        var lat = (shotRng() - 0.5) * 2 * Math.min(2.2, toDist * 0.30);
        var dz = Math.sqrt(Math.max(0.04, toDist * toDist - lat * lat));
        to = { x: HOLE.x + lat, z: HOLE.z + dz };
      }

      var rest = { x: to.x, z: to.z };
      var isLast = (toDist === 0);
      if (!isLast && hazard !== 'water') {
        var rollLen = (entry.club === 'tee' ? 2.2 : entry.club === 'iron' ? 1.2 : entry.club === 'wedge' ? 0.5 : 0) * (0.7 + shotRng() * 0.6);
        if (lie === 'bunker') rollLen = 0;
        if (rollLen > 0.05) {
          var dx, dz2;
          if (toDist <= campo.ON_GREEN + 1) { dx = HOLE.x - to.x; dz2 = HOLE.z - to.z; }
          else { dx = to.x - from.x; dz2 = to.z - from.z; }
          var dl = Math.sqrt(dx * dx + dz2 * dz2) || 1;
          rest = { x: to.x + dx / dl * rollLen, z: to.z + dz2 / dl * rollLen };
          var rd = dist2D(rest, { x: HOLE.x, z: HOLE.z });
          if (rd < 0.45 && toDist > 0.45) {
            rest = { x: HOLE.x + (to.x - HOLE.x) / toDist * 0.45, z: HOLE.z + (to.z - HOLE.z) / toDist * 0.45 };
          }
        }
      }

      var club = (b.lie === 'bunker') ? 'wedge' : entry.club;
      var liesSnap = simBalls.map(function (sb) {
        return { x: sb.pos.x, z: sb.pos.z, dist: sb.dist, done: sb.done, onTee: sb.dist >= len - 0.5 };
      });

      var pr = shotRng();
      var profKey = window.GolfAvatars.perfilSwing({ club: club, _fromDist: fromDist });
      var tk = {
        player: players[b.i], playerIndex: b.i,
        strokeNum: b.strokes + 1, totalStrokes: scores[b.i],
        club: club, shotKind: club, type: club, hazard: hazard,
        camera: camFor(club, fromDist, hazard),
        _start: from, _target: to, _rest: rest,
        _toDist: toDist, _fromDist: fromDist,
        _lies: liesSnap,
        _onTee: fromDist >= len - 0.5,
        isLastPutt: (club === 'putt' && isLast),
        _shank: shank,
        _missSide: shotRng() < 0.5 ? 1 : -1,
        _practice: pr < window.GolfAvatars.PROF[profKey].pr,
        _practiceAmp: (club === 'putt' ? 0.30 + shotRng() * 0.20 : 0.60 + shotRng() * 0.30),
        _practiceDur: 1.2 + shotRng() * 0.5,
        subtitle: ''
      };
      tk.subtitle = dialogueFor(tk, shotRng, courseData.holes[h].par);
      state.matchSequence.push(tk);

      if (hazard === 'water') { b.pos = from; b.dist = fromDist; b.lie = 'tee'; }
      else {
        b.pos = rest;
        b.dist = dist2D(rest, { x: HOLE.x, z: HOLE.z });
        b.lie = (lie === 'bunker') ? 'bunker' : (b.dist <= campo.ON_GREEN ? 'green' : 'fairway');
      }
      b.strokes++;
      if (isLast) { b.done = true; b.pos = { x: HOLE.x, z: HOLE.z }; b.dist = 0; b.lie = 'hole'; }
    }

    var minScore = Math.min.apply(null, scores);
    var winners = [];
    scores.forEach(function (s, i) { if (s === minScore) winners.push(i); });
    if (winners.length === 1) state.nextStarterIndex = winners[0];
    else state.nextStarterIndex = (state.nextStarterIndex + 1) % numPlayers;

    resetReplay();
    updateHoleUI();
  }

  // ---------- Línea de tiempo ----------
  function buildShotTimeline() {
    shotTimeline = [];
    var acc = 0;
    state.matchSequence.forEach(function (tk) {
      var dur = D_SETUP + D_LOOK + (tk._practice ? tk._practiceDur : 0) + D_SETTLE + D_SWING + D_HOLD;
      shotTimeline.push({ start: acc, end: acc + dur, dur: dur });
      acc += dur;
    });
    timelineTotal = acc;
    tlTot.textContent = fmtTime(timelineTotal);
  }

  function indexAt(t) {
    for (var i = 0; i < shotTimeline.length; i++) {
      if (t < shotTimeline[i].end) return i;
    }
    return Math.max(0, shotTimeline.length - 1);
  }

  // Posiciona TODO el estado en un instante global del hoyo (determinista)
  function seekTo(tGlobal, snap) {
    if (!shotTimeline.length) return;
    tGlobal = Math.max(0, Math.min(timelineTotal, tGlobal));
    state.clock = tGlobal;
    var idx = indexAt(tGlobal);
    var changed = (idx !== state.currentTaskIndex) || !state.currentTask;
    state.currentTaskIndex = idx;
    state.currentTask = state.matchSequence[idx];
    if (changed) {
      state.cameraMode = state.currentTask.camera;
      setSubtitle(state.currentTask.subtitle);
      updateBadge();
      trailPts = [];
    }
    var sh = shotTimeline[idx];
    var tk = state.currentTask;
    var t = tGlobal - sh.start;
    var r = state.routine;
    var a = D_SETUP;
    var b = a + D_LOOK;
    var c = b + (tk._practice ? tk._practiceDur : 0);
    var d = c + D_SETTLE;
    var e = d + D_SWING;
    if (t < a) { r.phase = 'SETUP'; r.t = t; state.taskProgress = 0; }
    else if (t < b) { r.phase = 'LOOK'; r.t = t - a; state.taskProgress = 0; }
    else if (tk._practice && t < c) { r.phase = 'PRACTICE'; r.t = t - b; state.taskProgress = 0; }
    else if (t < d) { r.phase = 'SETTLE'; r.t = t - c; state.taskProgress = 0; }
    else if (t < e) { r.phase = 'SWING'; r.t = 0; state.taskProgress = (t - d) / D_SWING; }
    else { r.phase = 'HOLD'; r.t = Math.min(D_HOLD, t - e); state.taskProgress = 1; }
    state.pOffTarget = (r.phase === 'PRACTICE') ? 0.30 : 0;
    if (snap) state.pOff = state.pOffTarget;
  }

  // Eventos de sonido (instantes absolutos) de un golpe
  function shotEvents(idx) {
    var tk = state.matchSequence[idx];
    var sh = shotTimeline[idx];
    if (!tk || !sh) return [];
    var a = sh.start + D_SETUP;
    var b = a + D_LOOK;
    var c = b + (tk._practice ? tk._practiceDur : 0);
    var d = c + D_SETTLE;
    var e = d + D_SWING;
    var ev = [];
    if (tk._practice) ev.push({ t: b + tk._practiceDur * 0.45, s: 'swing' });
    ev.push({ t: d + 0.03, s: (tk.club === 'putt' ? 'putt' : 'swing') });
    ev.push({ t: e, s: tk.isLastPutt ? 'cheer' : (tk.hazard === 'water' ? 'splash' : (tk.hazard === 'sand' ? 'groan' : 'hit')) });
    if (tk.club !== 'putt') ev.push({ t: e + 0.05, s: 'bounce' });
    return ev;
  }

  function fireCrossings(prev, now) {
    var i1 = indexAt(prev), i2 = indexAt(now);
    var evs = shotEvents(i1);
    if (i2 !== i1) evs = evs.concat(shotEvents(i2));
    evs.forEach(function (ev) {
      if (ev.t > prev && ev.t <= now) playSynthSound(ev.s);
    });
  }

  function resetReplay() {
    state.clock = 0;
    state.pOff = 0; state.pOffTarget = 0;
    trailPts = [];
    buildShotTimeline();
    if (state.matchSequence.length > 0) {
      state.currentTaskIndex = -1;   // fuerza refresh en seekTo
      seekTo(0, true);
    } else {
      state.currentTask = null;
    }
  }

  function setSubtitle(txt) { commentaryBox.innerText = txt; }

  function updateBadge() {
    if (state.currentTask) {
      badgeBox.innerText = "TURNO: " + state.currentTask.player.name + " | GOLPE " +
        state.currentTask.strokeNum + "/" + state.currentTask.totalStrokes +
        " | " + Math.round(state.currentTask._fromDist) + " m";
      badgeBox.style.borderColor = state.currentTask.player.css;
      badgeBox.style.color = state.currentTask.player.css;
    }
    updateScoreStrip();
  }

  function updateScoreStrip() {
    var h = state.currentHoleIndex;
    var strokesDone = players.map(function () { return 0; });
    for (var i = 0; i < state.currentTaskIndex && i < state.matchSequence.length; i++) {
      strokesDone[state.matchSequence[i].playerIndex]++;
    }
    // el golpe en curso aún no cuenta
    var parts = players.map(function (p, i) {
      return p.name + ' ' + strokesDone[i] + '/' + p.scores[h];
    });
    scoreBox.innerText = 'H' + (h + 1) + ' · ' + parts.join(' · ') + ' · 💰' + state.pot + '€';
  }

  // ---------- Resultados y bote ----------
  function showHoleResult() {
    var holeInfo = courseData.holes[state.currentHoleIndex];
    var scores = players.map(function (p) { return p.scores[state.currentHoleIndex]; });
    var minScore = Math.min.apply(null, scores);
    var winners = [];
    scores.forEach(function (s, i) { if (s === minScore) winners.push(i); });
    var currentPot = state.pot;
    if (winners.length === 1) { state.holeWinnings[winners[0]] += currentPot; state.pot = 1; }
    else { state.pot = currentPot + 1; }
    state.holeResults.push({
      hole: state.currentHoleIndex + 1, scores: scores, winners: winners,
      potWon: winners.length === 1 ? currentPot : 0
    });
    var html = '<h2>🏌️ HOYO ' + holeInfo.hoyo + ' COMPLETADO</h2><div class="pot">🏆</div>';
    if (winners.length === 1) {
      html += '<div class="winner" style="color:' + players[winners[0]].css + '">' + players[winners[0]].name + ' GANA EL HOYO</div>';
      html += '<div class="coins">💰 Se lleva ' + currentPot + '€</div>';
    } else {
      html += '<div class="winner">EMPATE entre ' + winners.map(function (i) { return players[i].name; }).join(', ') + '</div>';
      html += '<div class="coins">💰 Bote siguiente: ' + state.pot + '€</div>';
    }
    html += '<div class="scores">';
    players.forEach(function (p, i) {
      html += '<span style="color:' + p.css + '">' + p.name + ': ' + scores[i] + ' golpes</span><br>';
    });
    html += '</div>';
    html += (state.currentHoleIndex < 8) ? '<button id="btnContinue">CONTINUAR</button>' : '<button id="btnSummary">🏆 VER RESUMEN FINAL</button>';
    holeResultScreen.innerHTML = html;
    holeResultScreen.classList.remove('hide');
    var bc = holeResultScreen.querySelector('#btnContinue');
    if (bc) bc.addEventListener('click', function () { holeResultScreen.classList.add('hide'); state.currentHoleIndex++; buildHoleSequence(); });
    var bs = holeResultScreen.querySelector('#btnSummary');
    if (bs) bs.addEventListener('click', function () { holeResultScreen.classList.add('hide'); showMatchSummary(); });
  }

  function showMatchSummary() {
    var totals = players.map(function (p) { return p.scores.reduce(function (a, b) { return a + b; }, 0); });
    var minT = Math.min.apply(null, totals);
    var winners = [];
    totals.forEach(function (t, i) { if (t === minT) winners.push(i); });
    var winnerName = winners.length === 1 ? players[winners[0]].name : "EMPATE";
    var html = '<h2>🏆 RESUMEN DE LA PARTIDA</h2>';
    html += '<div style="font-size:10px;margin:10px 0;line-height:1.8;text-align:left;max-width:460px"><strong>HOYO A HOYO:</strong><br>';
    state.holeResults.forEach(function (r) {
      var wText = r.winners.length === 1 ? players[r.winners[0]].name : 'EMPATE (' + r.winners.map(function (i) { return players[i].name; }).join(', ') + ')';
      html += 'Hoyo ' + r.hole + ': ';
      players.forEach(function (p, i) { html += '<span style="color:' + p.css + '">' + p.name + ' ' + r.scores[i] + '</span> '; });
      html += '→ ' + wText + (r.potWon > 0 ? ' (+' + r.potWon + '€)' : '') + '<br>';
    });
    html += '</div>';
    html += '<div style="font-size:12px;margin:12px 0;border-top:2px solid #eab308;padding-top:12px">';
    players.forEach(function (p, i) {
      var d = totals[i] - 27;
      html += '<span style="color:' + p.css + '">' + p.name + ': ' + totals[i] + ' (' + (d > 0 ? '+' : '') + d + ')</span><br>';
    });
    html += '</div>';
    html += '<div style="font-size:16px;color:#ffd700;margin:15px 0">🏆 GANADOR: ' + winnerName + '</div>';
    html += '<div style="font-size:13px;margin:10px 0">';
    players.forEach(function (p, i) {
      html += '💰 <span style="color:' + p.css + '">' + p.name + '</span>: ' + state.holeWinnings[i] + '€  ';
    });
    html += '</div>';
    html += '<button id="btnRestart">🔄 JUGAR DE NUEVO</button>';
    holeResultScreen.innerHTML = html;
    holeResultScreen.classList.remove('hide');
    var br = holeResultScreen.querySelector('#btnRestart');
    if (br) br.addEventListener('click', function () { holeResultScreen.classList.add('hide'); resetMatch(); });
  }

  // ---------- Controles ----------
  function togglePlay() { if (state.isPlaying) pauseAnimation(); else startAnimation(); }
  function ensureLoop() { if (!state.animFrameId) state.animFrameId = requestAnimationFrame(renderLoop); }
  function startAnimation() {
    initAudio();
    window.__GOLF_REPLAYS.forEach(function (other) {
      if (other !== container && other._cleanup) other._cleanup();
    });
    if (state.clock >= timelineTotal) seekTo(0, true);
    state.isPlaying = true;
    ensureLoop();
    playBtn.classList.add('hide');
    pauseBtn.classList.remove('hide');
  }
  function pauseAnimation() {
    state.isPlaying = false;
    playBtn.classList.remove('hide');
    pauseBtn.classList.add('hide');
  }
  function resetMatch() {
    pauseAnimation();
    state.holeWinnings = players.map(function () { return 0; });
    state.holeResults = [];
    state.pot = 1;
    state.currentHoleIndex = 0;
    state.nextStarterIndex = 0;
    buildHoleSequence();
    setSubtitle("¡Pulsa REPRODUCIR para empezar el hoyo 1!");
  }
  function nextHole() {
    if (state.currentHoleIndex < 8) { state.currentHoleIndex++; buildHoleSequence(); }
    else showMatchSummary();
  }
  function prevHole() { state.currentHoleIndex = Math.max(0, state.currentHoleIndex - 1); buildHoleSequence(); }
  function updateHoleUI() {
    container.querySelector('#retroHoleLabel').innerText = "HOYO " + (state.currentHoleIndex + 1) + "/9";
    updateScoreStrip();
  }

  // ---------- Barra de tiempo ----------
  tlBar.addEventListener('pointerdown', function () {
    state.wasPlaying = state.isPlaying;
    pauseAnimation();
    state.scrubbing = true;
  });
  tlBar.addEventListener('pointerup', function () {
    state.scrubbing = false;
    if (state.wasPlaying) startAnimation();
  });
  tlBar.addEventListener('input', function () {
    seekTo((tlBar.value / 1000) * timelineTotal, true);
  });
  tlBar.addEventListener('change', function () {
    state.scrubbing = false;
  });
  tlBar.addEventListener('keydown', function () {
    // teclado en el slider: pausa mientras se ajusta
    if (state.isPlaying) { state.wasPlaying = true; pauseAnimation(); }
  });
  tlBar.addEventListener('keyup', function () {
    if (state.wasPlaying) { state.wasPlaying = false; startAnimation(); }
  });

  // ---------- Escena por fotograma ----------
  var desiredPos = new THREE.Vector3();
  var desiredLook = new THREE.Vector3();
  var _focus = new THREE.Vector3();

  var orbit = { theta: 0.6, phi: 1.0, radius: 10, target: new THREE.Vector3() };
  var midV = new THREE.Vector3();
  var playerPos = new THREE.Vector3();

  function updateScene() {
    var task = state.currentTask;
    var r = state.routine;
    var t = swingT();
    state.frameTimer += 0.05;
    var time = state.frameTimer;

    campo.animar(time);

    if (!task) { renderer.render(scene, camera); return; }

    var profKey = window.GolfAvatars.perfilSwing(task);
    var prof = window.GolfAvatars.PROF[profKey];
    var bm = window.GOLF_TUNE.ballMul;
    for (var bbi = 0; bbi < balls.length; bbi++) balls[bbi].scale.setScalar(bm);

    var s = task._start, g = task._target;
    var gyS = groundY(task._fromDist) + (task._onTee ? campo.TEE_MAT_H : 0);
    var gyT = groundY(task._toDist);
    var sV = new THREE.Vector3(s.x, gyS, s.z);
    var gV = new THREE.Vector3(g.x, gyT + 0.02, g.z);
    var fwd = gV.clone().sub(sV); fwd.y = 0;
    if (fwd.lengthSq() < 0.0001) fwd.set(0, 0, -1);
    fwd.normalize();
    var sideV = new THREE.Vector3(-fwd.z, 0, fwd.x);
    midV.copy(sV).lerp(gV, 0.5);

    sun.position.set(midV.x + 26, 46, midV.z + 18);
    sun.target.position.copy(midV);

    var opt = { t: t, kind: task.club, prof: prof, settle: 1, lookYaw: 0, lookTorso: 0, headUp: 0, practiceDev: undefined, waggle: 0 };
    if (r.phase === 'SETUP') { opt.settle = ease(Math.min(1, r.t / D_SETUP)); opt.t = 0; }
    else if (r.phase === 'LOOK') {
      var lp = Math.sin(Math.PI * Math.min(1, r.t / D_LOOK));
      opt.lookYaw = -0.55 * lp; opt.lookTorso = -0.12 * lp; opt.headUp = 0.22 * lp; opt.t = 0;
    }
    else if (r.phase === 'PRACTICE') {
      opt.practiceDev = (window.GolfAvatars.chan(Math.min(1, r.t / task._practiceDur), window.GolfAvatars.KF_PRACT) - 0.45) * prof.a * task._practiceAmp;
      opt.t = 0;
    }
    else if (r.phase === 'SETTLE') { opt.waggle = r.t; opt.t = 0; }
    else if (r.phase === 'HOLD') { opt.t = 1; }

    playerPos.copy(sV).addScaledVector(sideV, -(prof.st + window.GOLF_TUNE.stOff)).addScaledVector(fwd, -state.pOff);
    var activeGolfer = golfers[task.playerIndex];
    activeGolfer.position.copy(playerPos);
    activeGolfer.lookAt(s.x, gyS, s.z);
    window.GolfAvatars.poseHumano(activeGolfer, opt);

    var otherIdx = 0;
    for (var gi = 0; gi < numPlayers; gi++) {
      if (gi === task.playerIndex) continue;
      //INI extras siempre juntos
      //var side = (otherIdx % 2 === 0) ? 1 : -1;
        //var depth = 0.4 + Math.floor(otherIdx / 2) * 0.9;
        //var lateral = 1.7 + (otherIdx % 2) * 0.8;
        // espectadores más separados
        //var depth = 0.6 + Math.floor(otherIdx / 2) * 1.0;
        //var lateral = 2.2 + (otherIdx % 2) * 0.9;
      
      var side = 1;                        // todos al mismo lado, juntos
      var depth = 0.8 + otherIdx * 0.55;   // fila escalonada hacia atrás
      var lateral = 2.3 + otherIdx * 0.75; // en columna, uno junto al otro
      //FIN  extras siempre juntos  

      var specPos = sV.clone().addScaledVector(sideV, side * lateral).addScaledVector(fwd, -depth);
      var olGy = groundY(task._lies[gi].dist) + (task._lies[gi].onTee ? campo.TEE_MAT_H : 0);
      golfers[gi].position.set(specPos.x, olGy, specPos.z);
      golfers[gi].lookAt(s.x, olGy, s.z);
      window.GolfAvatars.poseHumano(golfers[gi], {
        t: 0, kind: null, prof: window.GolfAvatars.PROF.CHIP, settle: 0.5,
        lookYaw: Math.sin(time * 0.5 + gi * 1.3) * 0.2,
        lookTorso: Math.sin(time * 0.35 + gi * 1.7) * 0.06,
        headUp: 0
      });
      otherIdx++;
    }

    //bag.position.copy(sV.clone().addScaledVector(sideV, 2.3 + (numPlayers - 2) * 0.3).addScaledVector(fwd, -1.1));
    //bolsa aparte del grupo
    bag.position.copy(sV.clone().addScaledVector(sideV, 4.4).addScaledVector(fwd, -2.2));

    bag.position.y = gyS;

    // ----- Antonio y su bocadillo -----
    if (state.vendorPresent) {
      vendor.visible = true;
      vendor.position.set(state.vendorPos.x, 0, state.vendorPos.z);
      vendor.lookAt(sV.x, 0, sV.z);
      var vt = time + state.vendorPhase;
      var bt = vt % 9;                 // ciclo de 9 s
      var speaking = bt < 3.5;         // habla ~3.5 s
      var pop = speaking ? Math.min(1, bt / 0.25) * Math.min(1, (3.5 - bt) / 0.25) : 0;
      window.GolfAvatars.poseVendedor(vendor, vt, speaking, pop);
      vendor.userData.bubble.quaternion.copy(camera.quaternion);  // siempre de cara a la cámara
    } else {
      vendor.visible = false;
    }


    // ---------- Bola ----------
    var isPutt = task.club === 'putt';
    var activeBallIdx = task.playerIndex;
    var bxp, byp, bzp, bScale = 1;
    var flightF = 0;
    if (r.phase === 'HOLD' && !isPutt) {
      var ht = Math.min(1, r.t / D_HOLD);
      var h1 = (task.club === 'tee' ? 0.45 : task.club === 'iron' ? 0.30 : 0.15);
      var ph, hopY = 0;
      if (ht < 0.25) { ph = (ht / 0.25) * 0.18; hopY = Math.sin(Math.PI * (ht / 0.25)) * h1; }
      else if (ht < 0.45) { ph = 0.18 + ((ht - 0.25) / 0.20) * 0.12; hopY = Math.sin(Math.PI * ((ht - 0.25) / 0.20)) * h1 * 0.35; }
      else { ph = 0.30 + easeOut((ht - 0.45) / 0.55) * 0.70; hopY = 0; }
      var gyR = groundY(dist2D(task._rest, { x: HOLE.x, z: HOLE.z }));
      bxp = lerp(g.x, task._rest.x, ph);
      bzp = lerp(g.z, task._rest.z, ph);
      byp = lerp(gyT, gyR, ph) + BALL_R * bm + hopY;
    } else if (r.phase === 'HOLD' && task.isLastPutt) {
      bxp = g.x; bzp = g.z; byp = campo.GREEN_TOP - 0.05; bScale = 0.7;
    } else if (isPutt) {
      var f = t <= 0.12 ? 0 : easeOut(Math.min(1, (t - 0.12) / 0.75));
      if (task.isLastPutt) {
        bxp = lerp(s.x, g.x, f); bzp = lerp(s.z, g.z, f); byp = gyS + BALL_R * bm;
        if (f > 0.95) { bxp = g.x; bzp = g.z; byp = campo.GREEN_TOP - 0.02; }
      } else {
        var mx = (s.x + g.x) / 2 + task._missSide * 0.7;
        var mz = (s.z + g.z) / 2;
        bxp = (1 - f) * (1 - f) * s.x + 2 * (1 - f) * f * mx + f * f * g.x;
        bzp = (1 - f) * (1 - f) * s.z + 2 * (1 - f) * f * mz + f * f * g.z;
        byp = gyS + BALL_R * bm;
      }
    } else {
      var f2 = t < 0.52 ? 0 : Math.min(1, (t - 0.52) / 0.48);
      flightF = Math.sin(Math.PI * f2);
      bxp = lerp(s.x, g.x, f2);
      bzp = lerp(s.z, g.z, f2);
      byp = lerp(gyS, gyT, f2) + BALL_R * bm + flightF * arcHeight(task.club) * (task._shank ? 0.2 : 1);
    }
    
    //balls[activeBallIdx].position.set(bxp, byp, bzp);
    //balls[activeBallIdx].scale.setScalar(bScale * bm);
    balls[activeBallIdx].visible = true;          // la bola activa siempre se ve
    ballShadows[activeBallIdx].visible = true;
    balls[activeBallIdx].position.set(bxp, byp, bzp);
    balls[activeBallIdx].scale.setScalar(bScale * bm);
    
    ballShadows[activeBallIdx].position.set(bxp, gyS + 0.015, bzp);
    var shS = Math.max(0.35, 1 - (byp - gyS - BALL_R * bm) * 0.09);
    ballShadows[activeBallIdx].scale.set(shS * bScale * bm, shS * bScale * bm, shS * bScale * bm);

    for (var bi = 0; bi < numPlayers; bi++) {
      if (bi === activeBallIdx) continue;
      
      //var ol = task._lies[bi];
      //if (ol.done) { balls[bi].visible = false; ballShadows[bi].visible = false; }
      //una sola bola en el tee
      var ol = task._lies[bi];
      if (ol.done || ol.onTee) { balls[bi].visible = false; ballShadows[bi].visible = false; }


      else {
        balls[bi].visible = true;
        ballShadows[bi].visible = true;
        var ogy = groundY(ol.dist) + (ol.onTee ? campo.TEE_MAT_H : 0);
        balls[bi].position.set(ol.x, ogy + BALL_R * bm, ol.z);
        ballShadows[bi].position.set(ol.x, ogy + 0.015, ol.z);
      }
    }

    // ---------- Estela determinista (reconstruida en scrub) ----------
    trailPts = [];
    if (!isPutt && r.phase === 'SWING' && t > 0.52) {
      var fcur = (t - 0.52) / 0.48;
      for (var ts2 = 0; ts2 < TRAIL_N; ts2++) {
        var ff2 = fcur * (ts2 / (TRAIL_N - 1));
        var px2 = lerp(s.x, g.x, ff2);
        var pz2 = lerp(s.z, g.z, ff2);
        var py2 = lerp(gyS, gyT, ff2) + BALL_R * bm + Math.sin(Math.PI * ff2) * arcHeight(task.club) * (task._shank ? 0.2 : 1);
        trailPts.push(new THREE.Vector3(px2, py2, pz2));
      }
    }
    if (trailPts.length > 1) {
      trail.visible = true;
      for (var tp = 0; tp < TRAIL_N; tp++) {
        var pv = trailPts[Math.min(tp, trailPts.length - 1)];
        trailAttr.setXYZ(tp, pv.x, pv.y, pv.z);
      }
      trailAttr.needsUpdate = true;
      trailGeo.setDrawRange(0, Math.min(TRAIL_N, trailPts.length));
    } else trail.visible = false;

    var addressing = (r.phase === 'SETTLE' || r.phase === 'SWING') && t < 0.52;
    aimRing.visible = addressing;
    if (aimRing.visible) {
      aimRing.position.set(g.x, gyT + 0.03, g.z);
      aimRing.material.color.set(task.player.css);
    }

    var impact = !isPutt && t > 0.52 && t < 0.85;
    var isSplash = (task.hazard === 'water');
    var isSand = (task.hazard === 'sand' || task._shank);
    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      var pmesh = particles[pi2];
      if (impact && (isSplash || isSand)) {
        pmesh.visible = true;
        pmesh.material = isSplash ? partMat : (task.hazard === 'sand' ? sandMatP : dirtMat);
        var ang = (pi2 / particles.length) * Math.PI * 2;
        var dt2 = (t - 0.52) / 0.33;
        pmesh.position.set(
          g.x + Math.cos(ang) * dt2 * 1.0,
          gyT + 0.08 + Math.sin(ang * 3) * 0.35 * dt2 + dt2 * 0.7 - dt2 * dt2 * 1.2,
          g.z + Math.sin(ang) * dt2 * 1.0
        );
      } else pmesh.visible = false;
    }

    // ---------- Cámaras ----------
    var follow = isPutt ? 0 : flightF * 0.55;
    
    //INI
    //if (state.spectator) {
    //  orbit.target.lerp(balls[activeBallIdx].position, 0.12);
    //  var sinPhi = Math.sin(orbit.phi);
    // LA ORBITA sigue al jugador cada frame
    if (state.spectator) {
      var foc = (state.orbitFocus === 'ball')
        ? balls[activeBallIdx].position
        : _focus.set(playerPos.x, playerPos.y + 1.1, playerPos.z);
      orbit.target.lerp(foc, 0.12);
      var sinPhi = Math.sin(orbit.phi);
    //FIN  
      camera.position.set(
        orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
        Math.max(0.3, orbit.target.y + orbit.radius * Math.cos(orbit.phi)),
        orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
      );
      camera.lookAt(orbit.target);
    } else {
      if (state.cameraMode === 'TEE') {
        desiredPos.copy(playerPos).addScaledVector(sideV, window.GOLF_TUNE.camTeeSide).addScaledVector(fwd, -window.GOLF_TUNE.camTeeBack);
        desiredPos.y = gyS + window.GOLF_TUNE.camTeeH;
        //desiredLook.copy(sV).addScaledVector(fwd, 7); desiredLook.y = gyS + 0.8;
        
        //CAMARA ESPACIAL MAS SEPARADA
        desiredLook.copy(sV).addScaledVector(fwd, 9); desiredLook.y = gyS + 1.0;

      } else if (state.cameraMode === 'WIDE') {
        desiredPos.copy(sV).addScaledVector(sideV, 1.8).addScaledVector(fwd, -6.0);
        desiredPos.y = Math.max(gyS, gyT) + 2.4;
        desiredLook.copy(midV); desiredLook.y = gyS + 1.0;
      } else if (state.cameraMode === 'SIDE') {
        desiredPos.copy(midV).addScaledVector(sideV, 6.0);
        desiredPos.y = gyS + 1.5;
        desiredLook.copy(midV); desiredLook.y = gyS + 0.6;
      } else if (state.cameraMode === 'NEAR') {
        desiredPos.copy(midV).addScaledVector(sideV, 3.0).addScaledVector(fwd, -1.2);
        desiredPos.y = gyS + 1.1;
        desiredLook.copy(midV); desiredLook.y = gyS + 0.3;
      } else {
        desiredPos.copy(sV).addScaledVector(sideV, 1.6).addScaledVector(fwd, -2.8);
        desiredPos.y = gyS + 0.95;
        desiredLook.copy(playerPos).lerp(gV, 0.45);
        desiredLook.y = gyT + 0.25;
      }
      desiredLook.lerp(balls[activeBallIdx].position, follow);
      camera.position.lerp(desiredPos, 0.12);
      camLook.lerp(desiredLook, 0.14);
      camera.lookAt(camLook);
    }

    renderer.render(scene, camera);
  }

  // ---------- Bucle: reloj virtual + seek ----------
  function renderLoop() {
    var dt = 0.0167;
    if (state.isPlaying && !state.scrubbing) {
      var prev = state.clock;
      var now = Math.min(prev + dt, timelineTotal);
      fireCrossings(prev, now);
      state.clock = now;
      if (now >= timelineTotal) {
        pauseAnimation();
        seekTo(timelineTotal, true);
        showHoleResult();
      }
    }
    seekTo(state.clock, false);
    state.pOff = lerp(state.pOff, state.pOffTarget, 0.12);
    updateScene();
    // Refresco de la barra
    if (timelineTotal > 0) {
      tlBar.value = Math.round((state.clock / timelineTotal) * 1000);
      tlCur.textContent = fmtTime(state.clock);
    }
    state.animFrameId = requestAnimationFrame(renderLoop);
  }

  // ---------- Modo espectador ----------
  var specBtn = container.querySelector('#retroSpecBtn');
  var specHint = container.querySelector('#specHint');
  specBtn.addEventListener('click', function () {
    state.spectator = !state.spectator;
    if (state.spectator) {
      var actG = golfers[state.currentTask ? state.currentTask.playerIndex : 0];
      var fp0 = (state.orbitFocus === 'ball' && state.currentTask)
        ? balls[state.currentTask.playerIndex].position
        : _focus.set(actG.position.x, actG.position.y + 1.1, actG.position.z);
      var off = camera.position.clone().sub(fp0);
      orbit.radius = Math.max(2.5, Math.min(40, off.length()));
      orbit.theta = Math.atan2(off.x, off.z);
      orbit.phi = Math.acos(Math.max(-1, Math.min(1, off.y / orbit.radius)));
      orbit.phi = Math.max(0.2, Math.min(1.45, orbit.phi));
      orbit.target.copy(fp0);
      specBtn.textContent = '📺 VOLVER A LA TV';
      specHint.textContent = '🖱️ Arrastra: girar · Rueda: zoom · F: foco JUGADOR';
      specHint.classList.remove('hide');
    } else {
      specBtn.textContent = '👁️ ESPECTADOR';
      specHint.classList.add('hide');
    }
  });
  //Tecla F para alternar foco
   document.addEventListener('keydown', function (e) {
    if ((e.key === 'f' || e.key === 'F') && state.spectator) {
      var ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      state.orbitFocus = (state.orbitFocus === 'player') ? 'ball' : 'player';
      specHint.textContent = '🖱️ Arrastra: girar · Rueda: zoom · F: foco ' +
        (state.orbitFocus === 'player' ? 'JUGADOR' : 'BOLA');
    }
  });


  var dragging = false, lastPX = 0, lastPY = 0;
  renderer.domElement.addEventListener('pointerdown', function (e) {
    if (!state.spectator) return;
    dragging = true; lastPX = e.clientX; lastPY = e.clientY;
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging || !state.spectator) return;
    orbit.theta -= (e.clientX - lastPX) * 0.005;
    orbit.phi = Math.max(0.2, Math.min(1.45, orbit.phi - (e.clientY - lastPY) * 0.005));
    lastPX = e.clientX; lastPY = e.clientY;
  });
  window.addEventListener('pointerup', function () { dragging = false; });
  renderer.domElement.addEventListener('wheel', function (e) {
    if (!state.spectator) return;
    e.preventDefault();
    orbit.radius = Math.max(2, Math.min(45, orbit.radius + e.deltaY * 0.02));
  }, { passive: false });
  // ---------- Pantalla completa del vídeo ----------
  var fsBtn = container.querySelector('#retroFsBtn');
  function fsWrapper() { return container.querySelector('.retro-wrapper'); }
  function fsActive() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFs() {
    var el = fsWrapper();
    if (!fsActive()) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }
  function resizeRenderer() {
    requestAnimationFrame(function () {
      var w = screenEl.clientWidth, h = screenEl.clientHeight;
      if (w > 0 && h > 0) {
        renderer.setSize(w, h, false);          // más resolución en pantalla completa
        camera.aspect = w / h;                  // sin deformación
        camera.updateProjectionMatrix();
      }
    });
  }
  function onFsChange() {
    fsBtn.textContent = fsActive() ? '🗗 SALIR' : '⛶ PANTALLA';
    resizeRenderer();
  }
  fsBtn.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  
  // ---------- Arranque ----------
  playBtn.addEventListener('click', togglePlay);
  pauseBtn.addEventListener('click', togglePlay);
  container.querySelector('#retroResetBtn').addEventListener('click', resetMatch);
  container.querySelector('#retroNextBtn').addEventListener('click', nextHole);
  container.querySelector('#retroPrevBtn').addEventListener('click', prevHole);

  buildHoleSequence();
  ensureLoop();
  window.__GOLF_REPLAYS.push(container);

  container._cleanup = function () {
    if (state.animFrameId) { cancelAnimationFrame(state.animFrameId); state.animFrameId = null; }
    state.isPlaying = false;
    playBtn.classList.remove('hide');
    pauseBtn.classList.add('hide');
    // Si este vídeo está a pantalla completa y se oculta, salimos limpiamente
    if (fsActive() === fsWrapper()) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  };
  container._resume = function () { ensureLoop(); };
};