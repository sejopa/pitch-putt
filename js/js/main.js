/* ============================================================
   INTERFAZ · tarjetas, estadísticas, gráficas y modo sandbox
   ============================================================ */
(function () {
  var HOLES = 9, PAR = 27, games = [], coll = true;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function sum(a) { return a.reduce(function (x, y) { return x + (+y || 0); }, 0); }
  function fmtDate(d) {
    try { return new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return d; }
  }
  function diff(t) { var d = t - PAR; return d > 0 ? "+" + d : String(d); }

  function statsFor(gs) {
    var wins = {}, tot = {}, cnt = {}, best = null;
    gs.forEach(function (g) {
      var p = g.players || [];
      if (p.length < 2) return;
      var t = p.map(function (x) { return sum(x.scores); });
      p.forEach(function (x, i) {
        var k = x.name;
        tot[k] = (tot[k] || 0) + t[i];
        cnt[k] = (cnt[k] || 0) + 1;
        if (!best || t[i] < best.t) best = { t: t[i], n: k };
      });
      for (var h = 0; h < HOLES; h++) {
        var minS = Infinity, winners = [];
        p.forEach(function (x, i) {
          if (x.scores[h] < minS) { minS = x.scores[h]; winners = [i]; }
          else if (x.scores[h] === minS) winners.push(i);
        });
        if (winners.length === 1) wins[p[winners[0]].name] = (wins[p[winners[0]].name] || 0) + 1;
      }
    });
    var s = '<div class="stat"><b>' + gs.length + '</b><span>partidas jugadas</span></div>';
    Object.keys(cnt).forEach(function (k) {
      s += '<div class="stat"><b>' + (wins[k] || 0) + ' 🏆</b><span>' + esc(k) + ' · media ' + (tot[k] / cnt[k]).toFixed(1) + '</span></div>';
    });
    if (best) s += '<div class="stat"><b>' + best.t + '</b><span>mejor ronda (' + esc(best.n) + ')</span></div>';
    return s;
  }

  function charts(g) {
    var p = g.players || [];
    if (p.length < 2) return "";
    var n = HOLES, nm = p.map(function (x) { return x.name; });
    var sc = p.map(function (x) { return x.scores; });
    var palette = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];
    var col = nm.map(function (_, i) { return palette[i % palette.length]; });
    var lg = '<div class="lg">' + nm.map(function (name, i) {
      return '<span><i style="background:' + col[i] + '"></i>' + esc(name) + '</span>';
    }).join("") + '</div>';
    var W = 340, L = 24, R = 8, T0 = 14, B = 22, iw = W - L - R;
    var H1 = 170, ih = H1 - T0 - B;
    var allScores = [];
    sc.forEach(function (s) { allScores = allScores.concat(s); });
    var mx = Math.max(5, Math.max.apply(null, allScores));
    var Y = function (x) { return T0 + ih - x / mx * ih; };
    var s1 = '<svg viewBox="0 0 ' + W + ' ' + H1 + '" class="ch">';
    for (var v = 0; v <= mx; v++) {
      s1 += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" style="stroke:var(--line)"/>' +
            '<text x="' + (L - 5) + '" y="' + (Y(v) + 3) + '" text-anchor="end" style="fill:var(--mut);font-size:9px">' + v + '</text>';
    }
    var gw = iw / n, bw = gw / (p.length + 0.6);
    for (var i = 0; i < n; i++) {
      var cx = L + gw * i + gw / 2;
      for (var k = 0; k < p.length; k++) {
        var val = sc[k][i], x = cx - (p.length - 1) * bw / 2 + k * bw - bw * 0.4;
        s1 += '<rect x="' + x + '" y="' + Y(val) + '" width="' + (bw * 0.8) + '" height="' + (Y(0) - Y(val)) + '" rx="2" style="fill:' + col[k] + '"/>' +
              '<text x="' + (x + bw * 0.4) + '" y="' + (Y(val) - 3) + '" text-anchor="middle" style="fill:var(--ink);font-size:8px">' + val + '</text>';
      }
      s1 += '<text x="' + cx + '" y="' + (H1 - 7) + '" text-anchor="middle" style="fill:var(--mut);font-size:9px">' + (i + 1) + '</text>';
    }
    s1 += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(3) + '" y2="' + Y(3) + '" style="stroke:var(--win);stroke-dasharray:4 3;stroke-width:1.3"/><text x="' + (W - R) + '" y="' + (Y(3) - 3) + '" text-anchor="end" style="fill:var(--win);font-size:8px">par 3</text></svg>';
    var cum = sc.map(function (r) { var c = 0; return r.map(function (x) { c += x - 3; return c; }); });
    var all = []; cum.forEach(function (c) { all = all.concat(c); });
    all.push(0);
    var lo = Math.min.apply(null, all) - 1, hi = Math.max.apply(null, all) + 1;
    var H2 = 160, ih2 = H2 - T0 - B;
    var Y2 = function (x) { return T0 + ih2 - (x - lo) / (hi - lo) * ih2; };
    var X2 = function (j) { return L + iw * (j + 0.5) / n; };
    var fmt = function (x) { return x > 0 ? "+" + x : String(x); };
    var s2 = '<svg viewBox="0 0 ' + W + ' ' + H2 + '" class="ch">';
    var step = Math.max(1, Math.ceil((hi - lo) / 6));
    for (v = Math.ceil(lo); v <= hi; v += step) {
      s2 += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y2(v) + '" y2="' + Y2(v) + '" style="stroke:var(--line)"/><text x="' + (L - 5) + '" y="' + (Y2(v) + 3) + '" text-anchor="end" style="fill:var(--mut);font-size:9px">' + fmt(v) + '</text>';
    }
    s2 += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y2(0) + '" y2="' + Y2(0) + '" style="stroke:var(--win);stroke-dasharray:4 3;stroke-width:1.3"/><text x="' + (W - R) + '" y="' + (Y2(0) - 3) + '" text-anchor="end" style="fill:var(--win);font-size:8px">par</text>';
    for (k = 0; k < p.length; k++) {
      s2 += '<polyline fill="none" style="stroke:' + col[k] + ';stroke-width:2.2;stroke-linejoin:round" points="' +
            cum[k].map(function (c, j) { return X2(j) + "," + Y2(c); }).join(" ") + '"/>';
      cum[k].forEach(function (c, j) { s2 += '<circle cx="' + X2(j) + '" cy="' + Y2(c) + '" r="2.6" style="fill:' + col[k] + '"/>'; });
      var last = cum[k][n - 1];
      s2 += '<text x="' + (X2(n - 1) + 5) + '" y="' + (Y2(last) + (k % 2 ? 11 : -5)) + '" text-anchor="end" style="fill:' + col[k] + ';font-size:9px;font-weight:700">' + fmt(last) + '</text>';
    }
    for (i = 0; i < n; i++) s2 += '<text x="' + X2(i) + '" y="' + (H2 - 7) + '" text-anchor="middle" style="fill:var(--mut);font-size:9px">' + (i + 1) + '</text>';
    s2 += '</svg>';
    var cats = [
      ["Birdie o mejor", function (x) { return x <= 2; }, "#2f9e5a"],
      ["Par", function (x) { return x === 3; }, "#4c8bd6"],
      ["Bogey", function (x) { return x === 4; }, "#e0a030"],
      ["Doble o más", function (x) { return x >= 5; }, "#d9534f"]
    ];
    var dist = p.map(function (pl, q) {
      var segs = cats.map(function (c) {
        var cnt = sc[q].filter(c[1]).length;
        return cnt ? '<span style="flex:' + cnt + ';background:' + c[2] + '" title="' + c[0] + '">' + cnt + '</span>' : "";
      }).join("");
      return '<div class="dr"><b style="color:' + col[q] + '">' + esc(pl.name) + '</b><div class="bar">' + segs + '</div></div>';
    }).join("");
    var dleg = '<div class="lg sm">' + cats.map(function (c) {
      return '<span><i style="background:' + c[2] + '"></i>' + c[0] + '</span>';
    }).join("") + '</div>';
    var tt = sc.map(function (s) { return sum(s); });
    var wByPlayer = nm.map(function () { return 0; });
    var ties = 0;
    for (i = 0; i < n; i++) {
      var minS2 = Infinity, winners2 = [];
      sc.forEach(function (s, q) {
        if (s[i] < minS2) { minS2 = s[i]; winners2 = [q]; }
        else if (s[i] === minS2) winners2.push(q);
      });
      if (winners2.length === 1) wByPlayer[winners2[0]]++;
      else ties++;
    }
    var rows = [["Total"]];
    tt.forEach(function (t) { rows[0].push(t); });
    var rp = ["Respecto al par"];
    tt.forEach(function (t) { rp.push(diff(t)); });
    rows.push(rp);
    var ma = ["Media por hoyo"];
    tt.forEach(function (t) { ma.push((t / n).toFixed(2)); });
    rows.push(ma);
    var wg = ["Hoyos ganados"];
    wByPlayer.forEach(function (w) { wg.push(w); });
    rows.push(wg);
    var mnRow = ["Mejor hoyo"];
    sc.forEach(function (s) { var m = Math.min.apply(null, s); mnRow.push(m + " · h" + (s.indexOf(m) + 1)); });
    rows.push(mnRow);
    var mxRow = ["Peor hoyo"];
    sc.forEach(function (s) { var m = Math.max.apply(null, s); mxRow.push(m + " · h" + (s.indexOf(m) + 1)); });
    rows.push(mxRow);
    var tbl = '<table class="st"><tr><th></th>' + nm.map(function (nn) { return '<th>' + esc(nn) + '</th>'; }).join("") + '</tr>' +
      rows.map(function (r) { return '<tr><td>' + r[0] + '</td>' + r.slice(1).map(function (vv) { return '<td>' + vv + '</td>'; }).join("") + '</tr>'; }).join("") +
      '</table><div class="lg sm" style="margin-top:6px">Hoyos empatados (todos): ' + ties + '</div>';
    return '<div class="cg">' + lg +
      '<div class="ct">Golpes por hoyo</div>' + s1 +
      '<div class="ct">Evolución respecto al par</div>' + s2 +
      '<div class="ct">Tipo de resultado</div>' + dist + dleg +
      '<div class="ct">Estadísticas de la partida</div>' + tbl + '</div>';
  }

  function gameCard(g) {
    var p = g.players || [];
    var t = p.map(function (x) { return sum(x.scores); });
    var palette = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];
    var minT = Math.min.apply(null, t);
    var winners = [];
    t.forEach(function (tt, i) { if (tt === minT) winners.push(i); });
    var sc = p.map(function (x, i) {
      var isW = winners.indexOf(i) >= 0 && winners.length === 1;
      return '<div class="' + (isW ? "w" : "") + '" style="color:' + palette[i % palette.length] + '">' + esc(x.name) + (isW ? " 🏆" : "") +
             '<br><b>' + t[i] + '</b> <small>(' + diff(t[i]) + ')</small></div>';
    }).join("");
    var h = "";
    for (var i = 1; i <= HOLES; i++) h += "<th>" + i + "</th>";
    var rows = p.map(function (x, i) {
      return "<tr><td style='color:" + palette[i % palette.length] + "'>" + esc(x.name) + "</td>" + x.scores.map(function (v) { return "<td>" + esc(v) + "</td>"; }).join("") + "<td><b>" + sum(x.scores) + "</b></td></tr>";
    }).join("");
    var matchJson = JSON.stringify(g).replace(/'/g, "&#39;");
    return '<div class="card" data-id="' + esc(g.id) + '" data-match=\'' + matchJson + '\'>' +
      '<div class="row"><b>Partida ' + esc(g.num || "–") + '</b><small>' + fmtDate(g.date) + '</small></div>' +
      '<small style="color:var(--mut)">' + esc(g.course || "Sin campo") + '</small>' +
      '<div class="score">' + sc + '</div>' +
      '<div class="det hide">' +
        '<button class="retro-btn" onclick="event.stopPropagation(); window.toggleRetro(this, \'' + esc(g.id) + '\')">🎮 Ver Replay 3D</button>' +
        '<div id="retro-' + esc(g.id) + '" class="retro-container hide"></div>' +
        charts(g) +
        '<div class="ct">Detalle por hoyo</div><div class="scroll" style="margin-top:0"><table><tr><th>Hoyo</th>' + h + '<th>Total</th></tr>' + rows + '</table></div>' +
      '</div></div>';
  }

  function render() {
    var list = $("list");
    if (!coll) { list.innerHTML = '<div class="msg">No se puede acceder a la base de datos compartida.</div>'; return; }
    if (!games.length) { list.innerHTML = '<div class="msg">Todavía no hay partidas. Añade una en partidas.js o usa ?test=avatar</div>'; return; }
    var by = {};
    games.forEach(function (g) { var k = g.season || ""; (by[k] = by[k] || []).push(g); });
    var ks = Object.keys(by).sort().reverse();
    list.innerHTML = ks.map(function (k) {
      return '<h2 class="sh">' + (k ? "Temporada " + esc(k) : "Sin temporada") + '</h2>' +
             '<div class="stats">' + statsFor(by[k]) + '</div>' + by[k].map(gameCard).join("");
    }).join("");
  }

  window.toggleRetro = function (btn, gameId) {
    var card = btn.closest(".card");
    var container = document.getElementById("retro-" + gameId);
    var matchData = JSON.parse(card.getAttribute("data-match").replace(/&#39;/g, "'"));
    if (!container.classList.contains("hide")) {
      container.classList.add("hide");
      if (container._cleanup) container._cleanup();
    } else {
      container.classList.remove("hide");
      if (!container._initialized) { window.initRetroReplay(container, matchData); container._initialized = true; }
      else if (container._resume) container._resume();
    }
  };

  $("list").addEventListener("click", function (e) {
    var card = e.target.closest(".card");
    if (!card) return;
    if (e.target.classList.contains("retro-btn")) return;
    var d = card.querySelector(".det");
    if (d && !e.target.closest(".det")) {
      var willHide = !d.classList.contains("hide");
      d.classList.toggle("hide");
      var rc = d.querySelector(".retro-container");
      if (rc) {
        if (willHide && rc._cleanup) rc._cleanup();
        else if (!willHide && rc._resume) rc._resume();
      }
    }
  });

  // ---------- Carga de datos o SANDBOX ----------
  var params = new URLSearchParams(window.location.search);
  var sandbox = params.get('test') === 'avatar';

  if (sandbox) {
    var fake = {
      id: 'sandbox', num: 0, date: '2026-01-01', season: 'sandbox',
      course: 'Sandbox de Avatares (?test=avatar)',
      players: [
        { name: 'SEJOPA',    scores: [3, 4, 3, 5, 3, 4, 3, 3, 4] },
        { name: 'HAL',       scores: [4, 3, 4, 4, 4, 3, 4, 4, 3] },
        { name: 'CARABALLO', scores: [5, 4, 4, 3, 4, 4, 4, 5, 4] }
      ]
    };
    games = [fake];
    document.querySelector('.sub').textContent = 'Modo SANDBOX de avatares · pulsa 🛠 (tecla T) y usa scrub para posar';
    render();
    var card = document.querySelector('.card');
    if (card) {
      card.querySelector('.det').classList.remove('hide');
      var rc = card.querySelector('.retro-container');
      rc.classList.remove('hide');
          window.initRetroReplay(rc, fake);
      rc._initialized = true;
      // Botones para descargar cada avatar como .glb real
      var exp = document.createElement('div');
      exp.style.cssText = 'margin:12px 0;display:flex;gap:8px;flex-wrap:wrap;';
      ['SEJOPA', 'HAL', 'CARABALLO'].forEach(function (n, i) {
        var b = document.createElement('button');
        b.textContent = '⬇ GLB ' + n;
        b.style.cssText = 'padding:8px 12px;font:11px monospace;background:#3730a3;color:#fff;border:none;border-radius:6px;cursor:pointer;';
        b.addEventListener('click', function () {
          var col = [0xef4444, 0x3b82f6, 0x10b981][i];
          window.GolfAvatars.exportarGLB(n, col).catch(function (e) { alert('Error exportando: ' + e); });
        });
        exp.appendChild(b);
      });
      card.appendChild(exp);
    }
  } else {
    games = (window.PARTIDAS || []).map(function (g, i) { var o = Object.assign({}, g); o.id = "p" + i; return o; })
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || ((b.num || 0) - (a.num || 0)); });
    render();
  }
})();