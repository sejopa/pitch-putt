/* ============================================================
   CAMPO · texturas, materiales, green excavado, castillo,
   palmera, muro y vestido por hoyo. Expone window.GolfCourse
   ============================================================ */
(function () {

  var HOLE_LEN = [55, 48, 62, 52, 45, 40, 66, 50, 58];
  var GREEN_R = 7, GREEN_TOP = 0.12, CUP_R = 0.09, ON_GREEN = 6.5, TEE_MAT_H = 0.04;
  var HOLE = new THREE.Vector3(0, 0, -55);

  // Textura de la bandera: fondo blanco + número del hoyo en rojo
  function flagTexture(num) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 144;
    var x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 256, 144);
    x.fillStyle = '#e03131';
    x.font = 'bold 104px Arial, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(num), 138, 78);
    var t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }


  // ---------- Texturas procedurales ----------
  function grassTexture(base, stripe) {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    x.fillStyle = stripe; x.fillRect(0, 0, 32, 128); x.fillRect(64, 0, 32, 128);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function stoneTexture() {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    var x = c.getContext('2d');
    x.fillStyle = '#c9a982'; x.fillRect(0, 0, 128, 64);
    for (var i = 0; i < 40; i++) {
      var w = 8 + Math.random() * 16, h2 = 5 + Math.random() * 8;
      x.fillStyle = Math.random() > 0.5 ? '#b8977a' : '#d4b58e';
      x.fillRect(Math.random() * 128, Math.random() * 64, w, h2);
    }
    x.strokeStyle = '#a8846a'; x.lineWidth = 1;
    for (var r = 0; r < 5; r++) { x.beginPath(); x.moveTo(0, r * 13 + 6); x.lineTo(128, r * 13 + 6); x.stroke(); }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    return t;
  }

  // ---------- Materiales y geometrías compartidas ----------
  var roughTex = grassTexture('#3f7d2c', '#468731'); roughTex.repeat.set(30, 30);
  var fairTex = grassTexture('#4f9438', '#5aa341'); fairTex.repeat.set(4, 14);
  var roughMat = new THREE.MeshLambertMaterial({ map: roughTex });
  var fairMat = new THREE.MeshLambertMaterial({ map: fairTex });
  var stoneMat = new THREE.MeshLambertMaterial({ map: stoneTexture() });
  var matTurf = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
  var concreteMat = new THREE.MeshLambertMaterial({ color: 0xb5aea2 });
  var hillMat = new THREE.MeshLambertMaterial({ color: 0x8fa8c0 });
  var sandMat = new THREE.MeshLambertMaterial({ color: 0xe8d59a });
  var sandLipMat = new THREE.MeshLambertMaterial({ color: 0xcbb47c, side: THREE.DoubleSide });
  var waterMat = new THREE.MeshLambertMaterial({ color: 0x2a7fc9, transparent: true, opacity: 0.9 });
  var trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  var leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b2a });
  var trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.5, 6);
  var crownGeo = new THREE.ConeGeometry(1.8, 3.6, 8);
  var moundGeo = new THREE.SphereGeometry(1, 12, 8);

  // ---------- Castillo (foto real) ----------
  function makeCastle() {
    var g = new THREE.Group();
    var wallC = new THREE.MeshLambertMaterial({ color: 0xd8c3ae });
    var wallC2 = new THREE.MeshLambertMaterial({ color: 0xcbb39c });
    var roofC = new THREE.MeshLambertMaterial({ color: 0xb8a08c });
    var winC = new THREE.MeshLambertMaterial({ color: 0x6b5a4a });
    function crenellate(w, d, y, cx, cz, step) {
      var n = Math.floor(w / step);
      for (var i = 0; i <= n; i++) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(step * 0.5, 0.8, d), wallC);
        m.position.set(cx - w / 2 + i * step, y + 0.4, cz);
        g.add(m);
      }
    }
    var main = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 12), wallC);
    main.position.y = 4.5; g.add(main);
    crenellate(26, 1.0, 9, 0, 6.0, 2.2);
    crenellate(26, 1.0, 9, 0, -6.0, 2.2);
    for (var a = 0; a < 7; a++) {
      var win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.3), winC);
      win.position.set(-9 + a * 3, 6.6, 6.05);
      g.add(win);
    }
    var t1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 11, 12), wallC2);
    t1.position.set(-13, 5.5, 6); g.add(t1);
    var t1cap = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.8, 12), wallC2);
    t1cap.position.set(-13, 11.2, 6); g.add(t1cap);
    for (var i2 = 0; i2 < 8; i2++) {
      var ang2 = i2 / 8 * Math.PI * 2;
      var mer = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), wallC2);
      mer.position.set(-13 + Math.cos(ang2) * 2.1, 12.0, 6 + Math.sin(ang2) * 2.1);
      mer.rotation.y = -ang2;
      g.add(mer);
    }
    var t2 = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 3), new THREE.MeshLambertMaterial({ color: 0xe8e2d8 }));
    t2.position.set(6, 11, -2); g.add(t2);
    var t2r = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 4), roofC);
    t2r.position.set(6, 14.5, -2); t2r.rotation.y = Math.PI / 4; g.add(t2r);
    var gate = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 6), wallC2);
    gate.position.set(-6, 2.5, 10); g.add(gate);
    crenellate(8, 0.8, 5, -6, 13.0, 1.6);
    [-9.5, -2.5].forEach(function (gx) {
      var gt = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 6.5, 10), wallC2);
      gt.position.set(gx, 3.2, 12); g.add(gt);
      var gtc = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.6, 10), roofC);
      gtc.position.set(gx, 7.2, 12); g.add(gtc);
    });
    var pw = new THREE.Mesh(new THREE.BoxGeometry(30, 2.2, 1.2), wallC2);
    pw.position.set(2, 1.1, 14); g.add(pw);
    crenellate(30, 1.2, 2.2, 2, 14, 2.4);
    return g;
  }

  // ---------- Palmera (foto real) ----------
  var frondGeo = (function () {
    var geo = new THREE.PlaneGeometry(0.5, 4.6, 1, 8);
    var pos = geo.attributes.position;
    for (var v = 0; v < pos.count; v++) {
      var y = pos.getY(v);
      var t2 = (y + 2.3) / 4.6;
      pos.setZ(v, -1.6 * t2 * t2);
    }
    geo.translate(0, 2.3, 0);
    return geo;
  })();
  var frondMat = new THREE.MeshLambertMaterial({ color: 0x3f7d3b, side: THREE.DoubleSide });
  function makePalm(hgt) {
    var g = new THREE.Group();
    var pTrunk = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
    var segs = 6;
    for (var i = 0; i < segs; i++) {
      var seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.02, 0.26 - i * 0.02, hgt / segs, 8), pTrunk);
      seg.position.y = (i + 0.5) * (hgt / segs);
      seg.position.x = Math.sin(i * 0.5) * 0.12;
      seg.castShadow = true;
      g.add(seg);
    }
    var nf = 11;
    for (var f = 0; f < nf; f++) {
      var fr = new THREE.Mesh(frondGeo, frondMat);
      fr.position.set(Math.sin((segs - 1) * 0.5) * 0.12, hgt, 0);
      fr.rotation.order = 'YXZ';
      fr.rotation.y = (f / nf) * Math.PI * 2;
      fr.rotation.x = -1.1 + (f % 3) * 0.18;
      fr.castShadow = true;
      g.add(fr);
    }
    return g;
  }

  // ---------- Muro de piedra ----------
  function makeStoneWall(wlen, hgt, cren) {
    var g = new THREE.Group();
    var m = new THREE.Mesh(new THREE.BoxGeometry(wlen, hgt, 0.7), stoneMat);
    m.position.y = hgt / 2; m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    if (cren) {
      var n = Math.floor(wlen / 1.6);
      for (var i = 0; i <= n; i++) {
        var mer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.7), stoneMat);
        mer.position.set(-wlen / 2 + i * 1.6, hgt + 0.25, 0);
        g.add(mer);
      }
    }
    return g;
  }

  // ---------- Layout determinista por hoyo ----------
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
  function holeLayout(h) {
    var r = mulberry32(fnv('layout|' + h));
    var len = HOLE_LEN[h];
    var bunkers = [];
    var nb = 1 + (r() < 0.6 ? 1 : 0);
    for (var i = 0; i < nb; i++) {
      var side = r() < 0.5 ? -1 : 1;
      var z = (i === 0) ? -len + 4 + r() * 6 : -len * (0.45 + r() * 0.3);
      bunkers.push({ x: side * (6.5 + r() * 4.5), z: z, r: 2.4 + r() * 1.6 });
    }
    var water = (h === 2 || h === 6) ? { x: -11, z: -len * 0.55, r: 6 } : null;
    return { len: len, bunkers: bunkers, water: water };
  }

  // ---------- Constructor del escenario ----------
  function crearCampo(scene) {
    var currentLayout = null;

    var ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), roughMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    var group = new THREE.Group();
    scene.add(group);

    // Green excavado (abertura real, no disco encima)
    var greenShape = new THREE.Shape();
    greenShape.absarc(0, 0, GREEN_R, 0, Math.PI * 2, false);
    var cupPath = new THREE.Path();
    cupPath.absarc(0, 0, CUP_R, 0, Math.PI * 2, true);
    greenShape.holes.push(cupPath);
    var greenTopGeo = new THREE.ShapeGeometry(greenShape, 48);
    greenTopGeo.rotateX(-Math.PI / 2);
    var greenTop = new THREE.Mesh(greenTopGeo, new THREE.MeshLambertMaterial({ color: 0x5cb04c }));
    greenTop.receiveShadow = true;
    scene.add(greenTop);
    var greenSide = new THREE.Mesh(
      new THREE.CylinderGeometry(GREEN_R, GREEN_R + 0.5, GREEN_TOP, 44, 1, true),
      new THREE.MeshLambertMaterial({ color: 0x4a8f3f, side: THREE.DoubleSide })
    );
    greenSide.position.y = GREEN_TOP / 2;
    scene.add(greenSide);
    var fringe = new THREE.Mesh(
      new THREE.RingGeometry(GREEN_R + 0.3, GREEN_R + 1.6, 40),
      new THREE.MeshLambertMaterial({ color: 0x4a8f3f, side: THREE.DoubleSide })
    );
    fringe.rotation.x = -Math.PI / 2;
    scene.add(fringe);
    var cupWall = new THREE.Mesh(
      new THREE.CylinderGeometry(CUP_R, CUP_R * 0.92, 0.10, 20, 1, true),
      new THREE.MeshLambertMaterial({ color: 0x1c1c1c, side: THREE.DoubleSide })
    );
    cupWall.position.y = GREEN_TOP - 0.05;
    scene.add(cupWall);
    var cupFloor = new THREE.Mesh(
      new THREE.CircleGeometry(CUP_R * 0.92, 20),
      new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
    );
    cupFloor.rotation.x = -Math.PI / 2;
    cupFloor.position.y = GREEN_TOP - 0.098;
    scene.add(cupFloor);
    var rimRing = new THREE.Mesh(
      new THREE.RingGeometry(CUP_R, CUP_R + 0.07, 24),
      new THREE.MeshLambertMaterial({ color: 0x4a9440, side: THREE.DoubleSide })
    );
    rimRing.rotation.x = -Math.PI / 2;
    rimRing.position.y = GREEN_TOP + 0.002;
    scene.add(rimRing);
    
    var pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 2.1, 8),
      new THREE.MeshLambertMaterial({ color: 0xf5f5f5 })
    );
    pole.castShadow = true;
    scene.add(pole);
    var flagGeo = new THREE.PlaneGeometry(0.85, 0.48, 12, 1);
    flagGeo.translate(0.42, 0, 0);
    var flagMat = new THREE.MeshBasicMaterial({ map: flagTexture(1), side: THREE.DoubleSide });
    var flag = new THREE.Mesh(flagGeo, flagMat);
    scene.add(flag);
    var flagBase = flagGeo.attributes.position.array.slice();

    // Nubes
    var clouds = [];
    var cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (var ci = 0; ci < 4; ci++) {
      var cg = new THREE.Group();
      for (var cb = 0; cb < 3; cb++) {
        var puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 + Math.random() * 1.5, 10, 8), cloudMat);
        puff.position.set(cb * 2.6 - 2.6, Math.random(), Math.random());
        puff.scale.y = 0.55;
        cg.add(puff);
      }
      cg.position.set(-60 + ci * 40, 26 + Math.random() * 8, -70 - Math.random() * 40);
      clouds.push(cg);
      scene.add(cg);
    }

    function dressHole(h) {
      while (group.children.length) group.remove(group.children[0]);
      var len = HOLE_LEN[h];
      var lay = holeLayout(h);

      var fw = new THREE.Mesh(new THREE.PlaneGeometry(15, len + 18), fairMat);
      fw.rotation.x = -Math.PI / 2;
      fw.position.set(0, 0.02, -len / 2 + 3);
      fw.receiveShadow = true;
      group.add(fw);

      var tmat = new THREE.Mesh(new THREE.BoxGeometry(2.6, TEE_MAT_H, 1.8), matTurf);
      tmat.position.set(0, TEE_MAT_H / 2, 0.3);
      tmat.receiveShadow = true;
      group.add(tmat);
      var slab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.03, 0.8), concreteMat);
      slab.position.set(0, 0.015, 1.5);
      slab.receiveShadow = true;
      group.add(slab);

      var mr = mulberry32(fnv('mound|' + h));
      for (var i = 0; i < 5; i++) {
        var mnd = new THREE.Mesh(moundGeo, roughMat);
        var sd = mr() < 0.5 ? -1 : 1;
        mnd.position.set(sd * (13 + mr() * 10), -0.55, -mr() * len);
        mnd.scale.set(3 + mr() * 3, 1.1 + mr() * 1.2, 3 + mr() * 3);
        mnd.receiveShadow = true;
        group.add(mnd);
      }

      var tr = mulberry32(fnv('tree|' + h));
      for (var t2 = 0; t2 < 22; t2++) {
        var sd2 = t2 % 2 === 0 ? -1 : 1;
        var tx = sd2 * (11 + tr() * 16);
        var tz = 4 - tr() * (len + 22);
        var th2 = 4 + tr() * 3.5;
        var trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.scale.y = th2 / 5;
        trunk.position.set(tx, th2 * 0.25, tz);
        trunk.castShadow = true;
        var crown = new THREE.Mesh(crownGeo, leafMat);
        crown.scale.setScalar(0.8 + tr() * 0.7);
        crown.position.set(tx, th2 * 0.8, tz);
        crown.castShadow = true;
        group.add(trunk); group.add(crown);
      }

      lay.bunkers.forEach(function (b) {
        var bm = new THREE.Mesh(new THREE.CircleGeometry(b.r, 22), sandMat);
        bm.rotation.x = -Math.PI / 2;
        bm.position.set(b.x, 0.045, b.z);
        bm.receiveShadow = true;
        group.add(bm);
        var lip = new THREE.Mesh(new THREE.RingGeometry(b.r * 0.82, b.r, 22), sandLipMat);
        lip.rotation.x = -Math.PI / 2;
        lip.position.set(b.x, 0.05, b.z);
        group.add(lip);
      });

      if (lay.water) {
        var wm = new THREE.Mesh(new THREE.CircleGeometry(lay.water.r, 28), waterMat);
        wm.rotation.x = -Math.PI / 2;
        wm.position.set(lay.water.x, 0.04, lay.water.z);
        group.add(wm);
      }

      // Referencias reales por hoyo
      if (h === 0) {
        var castle = makeCastle();
        castle.position.set(26, 0, -len - 55);
        castle.rotation.y = -0.5;
        group.add(castle);
        var wall1 = makeStoneWall(14, 0.9, false);
        wall1.position.set(9, 0, -6);
        wall1.rotation.y = 0.25;
        group.add(wall1);
      }
      if (h === 1) {
        var palm = makePalm(15);
        palm.position.set(-6, 0, -len + 6);
        group.add(palm);
        var wall2 = makeStoneWall(34, 1.7, true);
        wall2.position.set(-13, 0, -len * 0.5);
        wall2.rotation.y = Math.PI / 2;
        group.add(wall2);
        var castle2 = makeCastle();
        castle2.position.set(30, 0, -len - 40);
        castle2.rotation.y = -0.7;
        castle2.scale.setScalar(0.85);
        group.add(castle2);
      }
      if (h >= 2) {
        var palm2 = makePalm(12 + (h % 3) * 2);
        palm2.position.set((h % 2 === 0 ? -1 : 1) * 12, 0, -len * 0.7);
        group.add(palm2);
      }
      for (var hi2 = 0; hi2 < 3; hi2++) {
        var hmesh = new THREE.Mesh(moundGeo, hillMat);
        hmesh.scale.set(60 + hi2 * 25, 10 + hi2 * 4, 30);
        hmesh.position.set(-40 + hi2 * 55, -2, -150 - hi2 * 20);
        group.add(hmesh);
      }

      greenTop.position.set(0, GREEN_TOP, -len);
      greenSide.position.set(0, GREEN_TOP / 2, -len);
      fringe.position.set(0, GREEN_TOP - 0.005, -len);
      cupWall.position.set(0, GREEN_TOP - 0.05, -len);
      cupFloor.position.set(0, GREEN_TOP - 0.098, -len);
      rimRing.position.set(0, GREEN_TOP + 0.002, -len);
      pole.position.set(0, (GREEN_TOP - 0.09) + 1.05, -len);
      flag.position.set(0, GREEN_TOP + 1.86, -len);
      
      // Número del hoyo en la bandera
      if (flag.material.map) flag.material.map.dispose();
      flag.material.map = flagTexture(h + 1);
      flag.material.needsUpdate = true;

      HOLE.set(0, 0, -len);
      currentLayout = lay;
    }

    function animar(time) {
      var fp = flagGeo.attributes.position;
      for (var i = 0; i < fp.count; i++) {
        var bx = flagBase[i * 3];
        fp.array[i * 3 + 2] = Math.sin(bx * 5 + time * 2.2) * 0.09 * bx;
      }
      fp.needsUpdate = true;
      for (var c = 0; c < clouds.length; c++) {
        clouds[c].position.x += 0.012;
        if (clouds[c].position.x > 90) clouds[c].position.x = -90;
      }
    }

    return {
      scene: scene,
      group: group,
      HOLE: HOLE,
      HOLE_LEN: HOLE_LEN,
      GREEN_R: GREEN_R, GREEN_TOP: GREEN_TOP, CUP_R: CUP_R,
      ON_GREEN: ON_GREEN, TEE_MAT_H: TEE_MAT_H,
      dressHole: dressHole,
      holeLayout: holeLayout,
      layout: function () { return currentLayout; },
      animar: animar
    };
  }

  window.GolfCourse = {
    crearCampo: crearCampo,
    makeCastle: makeCastle,
    makePalm: makePalm,
    makeStoneWall: makeStoneWall,
    holeLayout: holeLayout,
    HOLE_LEN: HOLE_LEN
  };
})();