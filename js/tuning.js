/* ============================================================
   PANEL DE AJUSTES EN VIVO · expone window.GOLF_TUNE
   Tecla T o botón flotante 🛠. Persiste en localStorage.
   ============================================================ */
(function () {
  var TUNE_DEFAULTS = {
    handY: -0.27, gripLeadY: 0.10, gripTrailY: 0.18,
    sockTeeDY: 0, sockTeeDZ: 0,
    sockIronDY: 0, sockIronDZ: 0,
    sockWedgeDY: 0, sockWedgeDZ: 0,
    sockPuttDY: 0, sockPuttDZ: 0,
    stOff: 0, bendMul: 1, ballMul: 1,
    //camTeeBack: 2.6, camTeeSide: -0.9, camTeeH: 1.6,
    //nuevos valores por defecto de cámara
    camTeeBack: 4.2, camTeeSide: 0.5, camTeeH: 1.9,
    scrub: -1
  };

  window.GOLF_TUNE = Object.assign({}, TUNE_DEFAULTS);
  try {
    var saved = localStorage.getItem('golfTune');
    if (saved) Object.assign(window.GOLF_TUNE, JSON.parse(saved));
  } catch (e) {}

  function tuneSave() {
    try { localStorage.setItem('golfTune', JSON.stringify(window.GOLF_TUNE)); } catch (e) {}
  }
  function tuneReset() {
    Object.assign(window.GOLF_TUNE, TUNE_DEFAULTS);
    tuneSave();
  }

  var TUNE_RANGES = {
    handY: [-0.45, -0.15, 0.005],
    gripLeadY: [0, 0.24, 0.005], gripTrailY: [0, 0.26, 0.005],
    sockTeeDY: [-0.15, 0.15, 0.005], sockTeeDZ: [-0.15, 0.15, 0.005],
    sockIronDY: [-0.15, 0.15, 0.005], sockIronDZ: [-0.15, 0.15, 0.005],
    sockWedgeDY: [-0.15, 0.15, 0.005], sockWedgeDZ: [-0.15, 0.15, 0.005],
    sockPuttDY: [-0.15, 0.15, 0.005], sockPuttDZ: [-0.15, 0.15, 0.005],
    stOff: [-0.2, 0.2, 0.005], bendMul: [0.5, 1.5, 0.01], ballMul: [0.5, 2, 0.05],
    camTeeBack: [1, 6, 0.05], camTeeSide: [-3, 3, 0.05], camTeeH: [0.5, 4, 0.05],
    scrub: [-1, 1, 0.01]
  };

  var tunePanel = null;

  function buildTunePanel() {
    if (tunePanel) return tunePanel;
    var p = document.createElement('div');
    p.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;width:280px;max-height:92vh;overflow:auto;background:rgba(10,14,30,0.96);color:#facc15;font:11px/1.5 monospace;border:2px solid #eab308;border-radius:8px;padding:10px;display:none;';
    var t = document.createElement('div');
    t.textContent = '🛠 AJUSTES EN VIVO · T oculta';
    t.style.cssText = 'font-weight:bold;color:#4ade80;margin-bottom:4px;';
    p.appendChild(t);
    var note = document.createElement('div');
    note.textContent = 'scrub: -1 normal · 0 address · 0.52 impacto · 1 finish';
    note.style.cssText = 'color:#a8d8ea;margin-bottom:8px;font-size:10px;';
    p.appendChild(note);

    Object.keys(TUNE_DEFAULTS).forEach(function (key) {
      var rg = TUNE_RANGES[key] || [-1, 1, 0.01];
      var row = document.createElement('div');
      row.style.marginBottom = '3px';
      var lab = document.createElement('span');
      lab.textContent = key + ' ';
      var val = document.createElement('b');
      val.style.color = '#fff';
      val.textContent = (+window.GOLF_TUNE[key]).toFixed(3);
      var sl = document.createElement('input');
      sl.type = 'range'; sl.min = rg[0]; sl.max = rg[1]; sl.step = rg[2];
      sl.value = window.GOLF_TUNE[key];
      sl.style.cssText = 'width:100%;display:block;margin:0;';
      sl.addEventListener('input', function () {
        window.GOLF_TUNE[key] = parseFloat(sl.value);
        val.textContent = (+sl.value).toFixed(3);
      });
      sl.addEventListener('change', tuneSave);
      row.appendChild(lab); row.appendChild(val); row.appendChild(sl);
      p.appendChild(row);
    });

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';
    function mkBtn(txt, fn) {
      var b = document.createElement('button');
      b.textContent = txt;
      b.style.cssText = 'font:10px monospace;padding:4px 8px;background:#3730a3;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      b.addEventListener('click', fn);
      btns.appendChild(b);
    }
    var out = document.createElement('textarea');
    out.readOnly = true;
    out.style.cssText = 'width:100%;height:80px;margin-top:6px;font:9px monospace;background:#0b1020;color:#a8d8ea;border:1px solid #312e81;border-radius:4px;';
    mkBtn('💾 Guardar', tuneSave);
    mkBtn('📋 Copiar', function () {
      out.value = JSON.stringify(window.GOLF_TUNE, null, 1);
      out.select();
      try { document.execCommand('copy'); } catch (e) {}
    });
    mkBtn('♻️ Reset', function () {
      tuneReset();
      if (tunePanel) { tunePanel.remove(); tunePanel = null; }
      var np = buildTunePanel();
      np.style.display = 'block';
    });
    p.appendChild(btns);
    p.appendChild(out);
    document.body.appendChild(p);
    tunePanel = p;
    return p;
  }

  function toggleTunePanel() {
    var p = buildTunePanel();
    p.style.display = (p.style.display === 'none') ? 'block' : 'none';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 't' || e.key === 'T') {
      var ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      toggleTunePanel();
    }
  });

  var tuneFab = document.createElement('button');
  tuneFab.textContent = '🛠';
  tuneFab.title = 'Ajustes en vivo (tecla T)';
  tuneFab.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999;font-size:18px;width:44px;height:44px;border-radius:50%;background:#3730a3;color:#fff;border:2px solid #eab308;cursor:pointer;';
  tuneFab.addEventListener('click', toggleTunePanel);
  document.body.appendChild(tuneFab);

  window.GolfTune = { save: tuneSave, reset: tuneReset, toggle: toggleTunePanel, defaults: TUNE_DEFAULTS, ranges: TUNE_RANGES };
})();