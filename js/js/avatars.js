/* ============================================================
   AVATARES CARTOON DE ALTA CALIDAD · geometría rica en código
   + pipeline opcional de activos GLB externos + exportador GLB
   Mantiene la API pública: crearHumano, poseHumano, makeClub…
   ============================================================ */
(function () {

  // ---------- Utilidades de construcción ----------
  function matL(c) { return new THREE.MeshLambertMaterial({ color: c }); }
  function ell(rx, ry, rz, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mat);
    m.scale.set(rx, ry, rz);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    return m;
  }
  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    return m;
  }
  function shadeHex(hex, amt) {
    var c = new THREE.Color(hex);
    c.offsetHSL(0, 0, amt / 255);
    return c.getHex();
  }
  function limb(len, r1, r2, mat) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 10), mat);
    m.position.y = -len / 2;
    m.castShadow = true;
    return m;
  }
  function joint(r, mat) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    m.castShadow = true;
    return m;
  }

  // ---------- Identidades (colores + estilos, sin rutas externas) ----------
  var CARAS_CONFIG = {
    "SEJOPA":    { skin: 0xe8b078, hair: 0xa8a8a8, hairStyle: 'swept', cap: null, patch: false, beard: 0.00, beardColor: 0xa8a8a8, brow: 0x4a4a4a, browThick: 1.5, smile: 1.15, nose: 1.05, eye: 0x3a2a1a },
    "HAL":       { skin: 0xe0a878, hair: 0x4a3527, hairStyle: 'cap',  cap: 0x23232e, patch: true, beard: 0.55, beardColor: 0x9a9a9a, brow: 0x4a3527, browThick: 1.0, smile: 0.60, nose: 1.10, eye: 0x3a2a1a },
    "CARABALLO": { skin: 0xdfa878, hair: 0x3a2a1a, hairStyle: 'quiff', cap: null, patch: false, beard: 0.25, beardColor: 0x4a3a2a, brow: 0x3a2a1a, browThick: 1.0, smile: 0.85, nose: 1.00, eye: 0x2a1a0a }
  };
  var CARAS_ORDEN = ["SEJOPA", "HAL", "CARABALLO"];
  function caraConfigFor(name, i) {
    return CARAS_CONFIG[name] || CARAS_CONFIG[CARAS_ORDEN[i % CARAS_ORDEN.length]] || null;
  }

  var OUTFITS = {
    "CARABALLO": { style: 'hoodie', jacket: 0xc7cbd1, inner: 0x141414, zip: true, zipColor: 0xb8b8b8, pants: 0x2e3d5c, shoes: 0x8a7a6a },
    "HAL":       { style: 'track',  jacket: 0x1e56c8, inner: 0xffffff, zip: true, zipColor: 0xf0f0f0, stripes: 0xffffff, watch: true, pants: 0x4a6a9a, shoes: 0x2a4a9a, shoeStripe: 0xffffff },
    "SEJOPA":    { style: 'bomber', jacket: 0x9aa0a6, rib: 0x3a3a3e, inner: 0x4a4a4a, zip: true, zipColor: 0x888888, pants: 0x232327, shoes: 0x4a4a4e }
  };
  function outfitFor(name) { return OUTFITS[name] || null; }

  // ---------- Pipeline opcional de GLB externos (si algún día los añades) ----------
  var CARAS_MODELOS_CONFIG = {   // deja las rutas a null para usar el constructor cartoon
    "SEJOPA":    { head_model: null, skin_texture: null, accessory: null },
    "HAL":       { head_model: null, skin_texture: null, accessory: null },
    "CARABALLO": { head_model: null, skin_texture: null, accessory: null }
  };
  var AssetCache = {
    models: {}, textures: {}, loading: {}, errors: {}, loader: null, texLoader: null,
    init: function () {
      if (this.loader || typeof THREE.GLTFLoader === 'undefined') return;
      this.loader = new THREE.GLTFLoader();
      this.texLoader = new THREE.TextureLoader();
    },
    loadModel: function (url) {
      if (!url || this.errors[url]) return Promise.resolve(null);
      if (this.models[url]) return Promise.resolve(this.models[url]);
      if (this.loading[url]) return this.loading[url];
      this.init();
      if (!this.loader) return Promise.resolve(null);
      var self = this;
      var p = new Promise(function (resolve) {
        self.loader.load(url, function (g) { self.models[url] = g; delete self.loading[url]; resolve(g); },
          undefined, function () { self.errors[url] = true; delete self.loading[url]; resolve(null); });
      });
      this.loading[url] = p;
      return p;
    },
    cloneModel: function (gltf) {
      if (!gltf) return null;
      var c = gltf.scene.clone(true);
      c.traverse(function (n) {
        if (n.isMesh) {
          if (Array.isArray(n.material)) n.material = n.material.map(function (m) { return m.clone(); });
          else if (n.material) n.material = n.material.clone();
          n.castShadow = true; n.receiveShadow = true;
        }
      });
      return c;
    }
  };
  function precargarActivos(nombres) {
    var ps = [];
    nombres.forEach(function (n) {
      var fc = CARAS_MODELOS_CONFIG[n];
      if (fc && fc.head_model) ps.push(AssetCache.loadModel(fc.head_model));
      if (fc && fc.accessory) ps.push(AssetCache.loadModel(fc.accessory));
    });
    return Promise.all(ps);
  }

  // ---------- CABEZA CARTOON DETALLADA ----------
  function hairBackShell(fc, tStart) {
    var m = new THREE.Mesh(
      new THREE.SphereGeometry(0.112, 16, 10, Math.PI, Math.PI, Math.PI * tStart, Math.PI * (0.95 - tStart)),
      matL(fc.hair)
    );
    m.scale.set(1.02, 1.05, 1.02);
    m.position.y = -0.005;
    return m;
  }

  function buildCartoonHead(fc) {
    var g = new THREE.Group();
    var skin = matL(fc.skin);
    var skinD = matL(shadeHex(fc.skin, -18));
    var hairC = matL(fc.hair);

    g.add(ell(0.105, 0.112, 0.100, skin, 0, 0.010, 0));            // cráneo
    g.add(ell(0.078, 0.062, 0.072, skin, 0, -0.070, 0.028));      // mandíbula/mentón
    g.add(ell(0.036, 0.030, 0.030, skin, -0.058, -0.028, 0.070)); // mejillas
    g.add(ell(0.036, 0.030, 0.030, skin,  0.058, -0.028, 0.070));
    g.add(ell(0.012, 0.028, 0.020, skin, -0.104, -0.005, 0.010)); // orejas
    g.add(ell(0.012, 0.028, 0.020, skin,  0.104, -0.005, 0.010));
    g.add(ell(0.016 * fc.nose, 0.020 * fc.nose, 0.018 * fc.nose, skinD, 0, -0.012, 0.100)); // nariz

    [-1, 1].forEach(function (sd) {                                 // ojos + cejas
      g.add(ell(0.020, 0.024, 0.013, matL(0xf5f5f5), sd * 0.042, 0.020, 0.086));
      g.add(ell(0.010, 0.011, 0.008, matL(fc.eye), sd * 0.042, 0.020, 0.096));
      g.add(ell(0.005, 0.005, 0.004, matL(0x101010), sd * 0.042, 0.020, 0.101));
      var bt = fc.browThick || 1;
      var brow = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0055 * bt, 6, 10, Math.PI * 0.7), matL(fc.brow));
      brow.position.set(sd * 0.044, 0.050, 0.090);
      brow.rotation.set(0.15, sd * 0.25, sd * -0.35 + Math.PI * 0.15);
      g.add(brow);
    });

    var mw = fc.smile || 0.7;                                       // boca
    var mouth = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.0075, 8, 16, Math.PI), matL(0x8a4a3a));
    mouth.rotation.z = Math.PI;
    mouth.scale.set(mw, 0.8 + mw * 0.4, 1);
    mouth.position.set(0, -0.048, 0.092);
    g.add(mouth);
    if (mw > 0.9) g.add(ell(0.022, 0.007, 0.006, matL(0xf8f8f8), 0, -0.050, 0.096)); // dientes

    if (fc.beard > 0) {                                             // barba + bigote
      var beard = new THREE.Mesh(
        new THREE.SphereGeometry(0.112, 18, 12, 0, Math.PI * 2, Math.PI * 0.68, Math.PI * 0.30),
        matL(fc.beardColor)
      );
      beard.scale.set(0.98, 1.02, 1.0);
      beard.position.y = -0.010;
      g.add(beard);
      g.add(ell(0.020, 0.008, 0.010, matL(fc.beardColor), -0.018, -0.030, 0.096));
      g.add(ell(0.020, 0.008, 0.010, matL(fc.beardColor),  0.018, -0.030, 0.096));
    }

    var style = fc.hairStyle || 'short';                            // pelo / gorra
    if (style === 'cap') {
      var capM = matL(fc.cap);
      var dome = new THREE.Mesh(new THREE.SphereGeometry(0.116, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), capM);
      dome.position.y = 0.012;
      g.add(dome);
      var brim = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.012, 20, 1, false, -0.95, 1.9), capM);
      brim.scale.set(1, 1, 1.7);
      brim.position.set(0, 0.040, 0.055);
      g.add(brim);
      if (fc.patch) {
        g.add(box(0.056, 0.046, 0.010, matL(0xb03030), 0, 0.062, 0.104));
        g.add(box(0.046, 0.036, 0.012, matL(0xf0f0f0), 0, 0.062, 0.108));
        var bird = box(0.018, 0.012, 0.013, matL(0x1a1a1a), 0, 0.062, 0.114);
        bird.rotation.z = 0.3;
        g.add(bird);
      }
      g.add(hairBackShell(fc, 0.42));
    } else if (style === 'quiff') {
      g.add(hairBackShell(fc, 0.35));
      g.add(ell(0.100, 0.030, 0.092, hairC, 0, 0.098, -0.008));
      var quiff = ell(0.048, 0.052, 0.055, hairC, 0, 0.112, 0.052);
      quiff.rotation.x = -0.55;
      g.add(quiff);
      g.add(ell(0.030, 0.030, 0.040, hairC, -0.045, 0.100, 0.055));
      g.add(ell(0.030, 0.030, 0.040, hairC,  0.045, 0.100, 0.055));
    } else if (style === 'swept') {
      g.add(hairBackShell(fc, 0.35));
      var top = ell(0.104, 0.042, 0.104, hairC, 0, 0.092, -0.018);
      top.rotation.x = 0.25;
      g.add(top);
      g.add(ell(0.080, 0.028, 0.060, hairC, 0, 0.108, -0.045));
      [-0.05, 0, 0.05].forEach(function (sx) {
        g.add(ell(0.016, 0.020, 0.070, hairC, sx, 0.100, 0.010));
      });
    } else {
      g.add(hairBackShell(fc, 0.35));
      g.add(ell(0.100, 0.034, 0.096, hairC, 0, 0.096, -0.004));
    }
    return g;
  }

  // ---------- TORSO CON ROPA DETALLADA ----------
  function buildCartoonTorso(of, teamHex) {
    var g = new THREE.Group();
    var jacket = matL(of.jacket);
    var jacketD = matL(shadeHex(of.jacket, -22));
    var inner = matL(of.inner);

    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.50, 16), jacket);
    torso.position.y = 0.23; torso.castShadow = true;
    g.add(torso);
    g.add(ell(0.075, 0.06, 0.07, jacket, -0.16, 0.44, 0));   // hombros
    g.add(ell(0.075, 0.06, 0.07, jacket,  0.16, 0.44, 0));
    g.add(ell(0.075, 0.05, 0.06, inner, 0, 0.47, 0.02));     // camiseta interior
    if (of.zip) g.add(box(0.016, 0.44, 0.012, matL(of.zipColor || 0xd8d8d8), 0, 0.24, 0.175));

    var stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.188, 0.055, 16, 1, true, -0.55, 1.10), matL(teamHex));
    stripe.material.side = THREE.DoubleSide;
    stripe.position.y = 0.36;
    g.add(stripe);

    if (of.style === 'hoodie') {
      var hood = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), jacketD);
      hood.scale.set(1.0, 0.75, 0.85);
      hood.position.set(0, 0.44, -0.10);
      hood.rotation.x = 0.55;
      g.add(hood);
      [-0.045, 0.045].forEach(function (sx) {
        g.add(box(0.010, 0.14, 0.010, matL(0xe8e8e8), sx, 0.40, 0.165));
        g.add(ell(0.010, 0.016, 0.010, matL(0xc8c8c8), sx, 0.33, 0.168));
      });
      var pk = box(0.20, 0.10, 0.03, jacketD, 0, 0.10, 0.150);
      pk.rotation.x = -0.10;
      g.add(pk);
    } else if (of.style === 'track') {
      g.add(box(0.05, 0.04, 0.008, matL(0xffffff), 0.085, 0.34, 0.170));
      var coll = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.06, 14, 1, true), jacket);
      coll.material.side = THREE.DoubleSide;
      coll.position.y = 0.485;
      g.add(coll);
    } else if (of.style === 'bomber') {
      var ribM = matL(of.rib || 0x3a3a3e);
      var coll2 = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 18), ribM);
      coll2.rotation.x = Math.PI / 2;
      coll2.position.y = 0.485;
      g.add(coll2);
      var hem = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.150, 0.06, 16), ribM);
      hem.position.y = 0.015;
      g.add(hem);
    }
    return g;
  }

  // ---------- Palos, zócalos e IK (sin cambios) ----------
  var KIND_GEOM = {
    tee:   { tilt: 0.20, L: 0.96, headDrop: 0.05 },
    iron:  { tilt: 0.20, L: 0.90, headDrop: 0.05 },
    wedge: { tilt: 0.20, L: 0.86, headDrop: 0.05 },
    putt:  { tilt: 0.15, L: 0.88, headDrop: 0.03 }
  };
  var steelMat = new THREE.MeshPhongMaterial({ color: 0xcfd6dd, shininess: 90, specular: 0x999999 });
  var gripMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  var headDark = new THREE.MeshPhongMaterial({ color: 0x22262b, shininess: 70, specular: 0x555555 });
  var headSteel = new THREE.MeshPhongMaterial({ color: 0x9aa2ab, shininess: 110, specular: 0xffffff });

  function makeClub(kind) {
    var kg = KIND_GEOM[kind] || KIND_GEOM.iron;
    var c = new THREE.Group();
    var inner = new THREE.Group();
    inner.rotation.x = -kg.tilt;
    c.add(inner);
    var gripLen = 0.26;
    var grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.020, gripLen, 10), gripMat);
    grip.position.y = gripLen / 2;
    inner.add(grip);
    var gcap = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 6), gripMat);
    gcap.position.y = gripLen;
    inner.add(gcap);
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.007, kg.L, 10), steelMat);
    shaft.position.y = -kg.L / 2;
    shaft.castShadow = true;
    inner.add(shaft);
    var hosel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), steelMat);
    hosel.position.y = -kg.L - 0.015;
    inner.add(hosel);
    var headY = -(kg.L + kg.headDrop);
    var head;
    if (kind === 'tee') {
      head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), headDark);
      head.scale.set(1.0, 0.72, 1.35);
      head.position.set(0.02, headY, 0.02);
      var face = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.09), headSteel);
      face.position.set(-0.045, headY, 0.02);
      inner.add(face);
    } else if (kind === 'iron') {
      head = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.075, 0.11), headSteel);
      head.position.set(0, headY, 0.01);
      head.rotation.x = -0.35;
    } else if (kind === 'wedge') {
      head = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.085, 0.10), headSteel);
      head.position.set(0, headY, 0.01);
      head.rotation.x = -0.70;
    } else {
      head = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.05, 0.16), headSteel);
      head.position.set(0, headY, 0.01);
      var aline = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      aline.position.set(0, headY + 0.028, 0.01);
      inner.add(aline);
    }
    head.castShadow = true;
    inner.add(head);
    return c;
  }

  var _SOCK = new THREE.Vector3();
  var CARRY_POS = new THREE.Vector3(0, -0.30, 0.12);
  function socketFor(kind, P, out) {
    var kg = KIND_GEOM[kind] || KIND_GEOM.iron;
    var bend0 = 0.55 * P.bd;
    var shoulderY = 1.12 + 0.42 * Math.cos(bend0);
    var shoulderZ = 0.42 * Math.sin(bend0);
    var sy = kg.headDrop + Math.cos(kg.tilt) * (kg.L + kg.headDrop) - shoulderY;
    var sz = (P.st + window.GOLF_TUNE.stOff) - shoulderZ - Math.sin(kg.tilt) * (kg.L + kg.headDrop);
    return out.set(0, sy, sz);
  }

  var _w = new THREE.Vector3(), _u = new THREE.Vector3(), _ed = new THREE.Vector3(), _fd = new THREE.Vector3();
  var _E = new THREE.Vector3(), _H1 = new THREE.Vector3(), _H2 = new THREE.Vector3();
  var _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
  var _DOWN = new THREE.Vector3(0, -1, 0);
  var _off1 = new THREE.Vector3(), _off2 = new THREE.Vector3();

  function ikArm(sh, el, S, H, L1, L2, pole) {
    _w.copy(H).sub(S);
    var d = _w.length();
    d = Math.max(Math.abs(L1 - L2) + 0.02, Math.min(L1 + L2 - 0.02, d));
    _w.normalize();
    var cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    cosA = Math.max(-1, Math.min(1, cosA));
    var a = Math.acos(cosA);
    _u.copy(pole).addScaledVector(_w, -pole.dot(_w));
    if (_u.lengthSq() < 1e-6) _u.set(0, 0, -1).addScaledVector(_w, _w.z);
    _u.normalize();
    _ed.copy(_w).multiplyScalar(Math.cos(a)).addScaledVector(_u, Math.sin(a));
    _q.setFromUnitVectors(_DOWN, _ed);
    sh.quaternion.copy(_q);
    _E.copy(S).addScaledVector(_ed, L1);
    _fd.copy(H).sub(_E).normalize();
    _qi.copy(_q).invert();
    _fd.applyQuaternion(_qi);
    el.quaternion.setFromUnitVectors(_DOWN, _fd);
  }

  // ---------- Canales y perfiles (sin cambios) ----------
  function chan(t, kf) {
    for (var i = 0; i < kf.length - 1; i++) {
      if (t <= kf[i + 1][0]) {
        var f = ease((t - kf[i][0]) / (kf[i + 1][0] - kf[i][0]));
        return kf[i][1] + (kf[i + 1][1] - kf[i][1]) * f;
      }
    }
    return kf[kf.length - 1][1];
  }
  function ease(x) { return x * x * (3 - 2 * x); }
  function lerpN(a, b, f) { return a + (b - a) * f; }
  var KF_SWING    = [[0,0.45],[0.26,-2.10],[0.38,-2.20],[0.52,0.45],[0.64,0.95],[0.80,2.30],[1,2.45]];
  var KF_PRACT    = [[0,0.45],[0.30,-1.60],[0.45,-1.70],[0.70,0.60],[0.85,1.60],[1,0.45]];
  var KF_SHOULDER = [[0,0],[0.30,-1.45],[0.40,-1.55],[0.52,0.15],[0.75,1.25],[1,1.35]];
  var KF_HIP      = [[0,0],[0.30,-0.55],[0.40,-0.60],[0.52,0.30],[0.75,1.05],[1,1.15]];
  var KF_WEIGHT   = [[0,0],[0.30,-0.07],[0.40,-0.09],[0.52,0.08],[0.75,0.15],[1,0.17]];
  var KF_SEAT     = [[0,-0.12],[0.40,-0.16],[0.52,-0.10],[0.75,-0.02],[1,0.0]];
  var KF_TILT     = [[0,0.02],[0.40,0.05],[0.52,-0.04],[0.75,-0.12],[1,-0.16]];
  var KF_BEND     = [[0,0.55],[0.30,0.60],[0.40,0.62],[0.52,0.50],[0.75,0.28],[1,0.16]];
  var KF_HEAD     = [[0,0],[0.40,-0.45],[0.52,-0.35],[0.75,0.55],[1,0.75]];
  var KF_COCK     = [[0,0.06],[0.30,1.05],[0.40,1.15],[0.50,0.35],[0.55,0.0],[0.75,-0.45],[1,-0.55]];
  var KF_LEGF_HIP = [[0,0.16],[0.40,0.20],[0.52,0.06],[0.75,0.02],[1,0.02]];
  var KF_LEGF_KNE = [[0,-0.24],[0.40,-0.30],[0.52,-0.10],[0.75,-0.05],[1,-0.05]];
  var KF_LEGB_HIP = [[0,0.16],[0.40,0.10],[0.52,0.16],[0.75,-0.45],[1,-0.55]];
  var KF_LEGB_KNE = [[0,-0.24],[0.40,-0.28],[0.52,-0.20],[0.75,0.55],[1,0.70]];
  var PROF = {
    TEE:      { a: 0.85, sh: 0.80, hp: 0.75, ck: 0.85, bd: 1.00, lg: 1.00, st: 0.52, pr: 0.55 },
    FULL:     { a: 0.78, sh: 0.72, hp: 0.68, ck: 0.80, bd: 1.00, lg: 1.00, st: 0.52, pr: 0.30 },
    APPROACH: { a: 0.60, sh: 0.52, hp: 0.48, ck: 0.60, bd: 0.95, lg: 0.95, st: 0.48, pr: 0.30 },
    CHIP:     { a: 0.36, sh: 0.28, hp: 0.20, ck: 0.30, bd: 0.90, lg: 0.85, st: 0.44, pr: 0.35 },
    PUTT:     { a: 0.10, sh: 0.05, hp: 0.02, ck: 0.00, bd: 0.78, lg: 0.60, st: 0.40, pr: 0.25 }
  };
  function perfilSwing(tk) {
    if (tk.club === 'putt') return 'PUTT';
    if (tk.club === 'tee') return 'TEE';
    if (tk._fromDist <= 10) return 'CHIP';
    if (tk._fromDist <= 24) return 'APPROACH';
    return 'FULL';
  }

  // ---------- HUMANO COMPLETO ----------
  function makeHuman(teamHex, name) {
    var fc = caraConfigFor(name, 0) || { skin: 0xe8b078, hair: 0x3a2a1a, hairStyle: 'short', brow: 0x3a2a1a, smile: 0.7, nose: 1, eye: 0x3a2a1a, beard: 0, beardColor: 0x3a2a1a, browThick: 1 };
    var of = outfitFor(name) || { style: 'track', jacket: teamHex, inner: 0xffffff, zip: false, pants: 0x2f3a4f, shoes: 0xf2f2f2 };
    var g = new THREE.Group();
    var skin = matL(fc.skin);
    var pants = matL(of.pants);
    var shoeM = matL(of.shoes);
    var jacket = matL(of.jacket);

    var hips = new THREE.Group();
    hips.position.y = 0.98;
    hips.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.28, 12), pants));
    var belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 12), matL(0x222222));
    belt.position.y = 0.12;
    hips.add(belt);

    function leg(sx) {
      var hipJ = new THREE.Group();
      hipJ.position.set(sx, -0.12, 0);
      hipJ.add(joint(0.075, pants));
      hipJ.add(limb(0.44, 0.075, 0.06, pants));
      var knee = new THREE.Group();
      knee.position.y = -0.44;
      knee.add(joint(0.06, pants));
      knee.add(limb(0.40, 0.055, 0.042, pants));
      knee.add(joint(0.045, pants).translateY(-0.40));
      var shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.27), shoeM);
      shoe.position.set(0, -0.385, 0.06);
      shoe.castShadow = true;
      knee.add(shoe);
      if (of.shoeStripe) {
        var s1 = box(0.012, 0.03, 0.16, matL(of.shoeStripe), 0.056, -0.385, 0.06);
        var s2 = box(0.012, 0.03, 0.16, matL(of.shoeStripe), -0.056, -0.385, 0.06);
        knee.add(s1); knee.add(s2);
      }
      hipJ.add(knee);
      return { hip: hipJ, knee: knee };
    }
    var legF = leg(-0.10);
    var legB = leg(0.10);
    hips.add(legF.hip); hips.add(legB.hip);

    var twistG = new THREE.Group();
    twistG.position.y = 0.14;
    hips.add(twistG);
    twistG.add(buildCartoonTorso(of, teamHex));
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 10), skin);
    neck.position.y = 0.51;
    twistG.add(neck);

    var headG = new THREE.Group();
    headG.position.y = 0.62;
    headG.add(buildCartoonHead(fc));
    headG.scale.setScalar(1.15);
    twistG.add(headG);

    var swing = new THREE.Group();
    swing.position.y = 0.42;
    twistG.add(swing);

    function arm(sx, isLeft) {
      var sh = new THREE.Group();
      sh.position.set(sx, 0, 0);
      sh.add(joint(0.062, jacket));
      sh.add(limb(0.30, 0.05, 0.042, jacket));
      if (of.stripes) {
        for (var si = 0; si < 3; si++) {
          var stb = box(0.010, 0.28, 0.010, matL(of.stripes), (si - 1) * 0.018, -0.15, 0.045);
          sh.add(stb);
        }
      }
      var el = new THREE.Group();
      el.position.y = -0.30;
      el.add(joint(0.045, skin));
      el.add(limb(0.27, 0.04, 0.032, skin));
      if (of.style === 'bomber' || of.style === 'hoodie') {
        var cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 10), matL(of.rib || shadeHex(of.jacket, -22)));
        cuff.position.y = -0.24;
        el.add(cuff);
      }
      if (of.watch && isLeft) {
        var watch = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 14), matL(0x1a1a1a));
        watch.rotation.x = Math.PI / 2;
        watch.position.y = -0.20;
        el.add(watch);
      }
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), skin);
      hand.position.y = window.GOLF_TUNE.handY;
      hand.castShadow = true;
      el.add(hand);
      sh.add(el);
      return { sh: sh, el: el, hand: hand };
    }
    var armL = arm(-0.19, true);
    var armR = arm(0.19, false);
    swing.add(armL.sh); swing.add(armR.sh);

    var socket = new THREE.Group();
    socket.position.copy(CARRY_POS);
    swing.add(socket);
    var clubs = { tee: makeClub('tee'), iron: makeClub('iron'), wedge: makeClub('wedge'), putt: makeClub('putt') };
    Object.keys(clubs).forEach(function (k) { clubs[k].visible = false; socket.add(clubs[k]); });

    g.add(hips);
    g.userData = {
      swing: swing, twistG: twistG, hips: hips, head: headG,
      handL: armL.hand, handR: armR.hand,
      clubSocket: socket, clubs: clubs, matShirt: jacket,
      armLsh: armL.sh, armRsh: armR.sh, armLel: armL.el, armRel: armR.el,
      SL: new THREE.Vector3(-0.19, 0, 0), SR: new THREE.Vector3(0.19, 0, 0),
      poleL: new THREE.Vector3(-0.45, -1.0, -0.35),
      poleR: new THREE.Vector3(-0.25, -1.0, -0.45),
      legF: legF, legB: legB
    };
    return g;
  }

  function handTargetsOnClub(u, h1, h2) {
    _off1.set(-0.02, window.GOLF_TUNE.gripLeadY, 0).applyEuler(u.clubSocket.rotation);
    _off2.set(0.02, window.GOLF_TUNE.gripTrailY, 0).applyEuler(u.clubSocket.rotation);
    h1.copy(u.clubSocket.position).add(_off1);
    h2.copy(u.clubSocket.position).add(_off2);
  }

  function poseHumano(h, o) {
    var u = h.userData;
    var P = o.prof;
    var s = o.settle;
    var kind = o.kind || 'iron';
    var T = window.GOLF_TUNE;
    socketFor(kind, P, _SOCK);
    var dk = kind.charAt(0).toUpperCase() + kind.slice(1);
    _SOCK.y += T['sock' + dk + 'DY'] || 0;
    _SOCK.z += T['sock' + dk + 'DZ'] || 0;
    u.clubSocket.position.lerpVectors(CARRY_POS, _SOCK, s);
    var dev = (chan(o.t, KF_SWING) - 0.45) * P.a;
    if (o.practiceDev !== undefined) dev = o.practiceDev;
    if (o.waggle) dev += Math.sin(o.waggle * 9) * 0.025;
    var bend = lerpN(0.12, chan(o.t, KF_BEND) * P.bd * T.bendMul, s);
    u.twistG.rotation.x = bend;
    u.swing.rotation.x = -bend;
    u.swing.rotation.z = dev;
    u.twistG.rotation.y = chan(o.t, KF_SHOULDER) * P.sh + (o.lookTorso || 0);
    u.hips.rotation.y = chan(o.t, KF_HIP) * P.hp;
    u.hips.position.x = chan(o.t, KF_WEIGHT) * P.hp * s;
    u.hips.position.z = chan(o.t, KF_SEAT) * P.bd * s;
    u.twistG.rotation.z = chan(o.t, KF_TILT) * P.a;
    u.head.rotation.x = lerpN(0.02, -bend * 0.55 + 0.12, s) + (o.headUp || 0);
    u.head.rotation.y = (chan(o.t, KF_HEAD) * P.sh - u.twistG.rotation.y) + (o.lookYaw || 0);
    u.clubSocket.rotation.z = chan(o.t, KF_COCK) * P.ck + (o.waggle ? Math.sin(o.waggle * 11) * 0.05 : 0);
    u.legF.hip.rotation.x = chan(o.t, KF_LEGF_HIP) * P.lg * lerpN(0.35, 1, s);
    u.legF.knee.rotation.x = chan(o.t, KF_LEGF_KNE) * P.lg * lerpN(0.35, 1, s);
    u.legB.hip.rotation.x = chan(o.t, KF_LEGB_HIP) * P.lg * lerpN(0.35, 1, s);
    u.legB.knee.rotation.x = chan(o.t, KF_LEGB_KNE) * P.lg * lerpN(0.35, 1, s);
    u.handL.position.y = T.handY;
    u.handR.position.y = T.handY;
    var L2 = -T.handY;
    handTargetsOnClub(u, _H1, _H2);
    ikArm(u.armLsh, u.armLel, u.SL, _H1, 0.30, L2, u.poleL);
    ikArm(u.armRsh, u.armRel, u.SR, _H2, 0.30, L2, u.poleR);
    var show = !!o.kind;
    u.clubs.tee.visible = show && kind === 'tee';
    u.clubs.iron.visible = show && kind === 'iron';
    u.clubs.wedge.visible = show && kind === 'wedge';
    u.clubs.putt.visible = show && kind === 'putt';
  }

  function crearHumano(teamHex, name) {
    return makeHuman(teamHex, name);
  }

  // ---------- ANTONIO (sin cambios) ----------
  function roundRectPath(x, rx, ry, rw, rh, rr) {
    x.beginPath();
    x.moveTo(rx + rr, ry);
    x.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
    x.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
    x.arcTo(rx, ry + rh, rx, ry, rr);
    x.arcTo(rx, ry, rx + rw, ry, rr);
    x.closePath();
  }
  function bubbleTexture(text) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    var x = c.getContext('2d');
    x.clearRect(0, 0, 512, 192);
    x.fillStyle = '#ffffff'; x.strokeStyle = '#222222'; x.lineWidth = 6;
    roundRectPath(x, 10, 10, 492, 118, 40); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(120, 126); x.lineTo(88, 184); x.lineTo(196, 126); x.closePath();
    x.fillStyle = '#ffffff'; x.fill(); x.strokeStyle = '#222222'; x.stroke();
    x.fillStyle = '#ffffff'; x.fillRect(124, 112, 68, 18);
    x.fillStyle = '#111111';
    x.font = 'bold 50px Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 256, 70);
    return new THREE.CanvasTexture(c);
  }
  function makeVendedor() {
    var g = new THREE.Group();
    var skin = matL(0xe0b090);
    var hairW = matL(0xe8e8e8);
    var vest = matL(0x7a4a2a); vest.side = THREE.DoubleSide;
    var shirtM = matL(0xe8dcc8);
    var pants = matL(0x4a4a4a);
    var shoes = matL(0x5a3a22);
    var straw = matL(0xd8c08a);

    var hips = new THREE.Group();
    hips.position.y = 0.95;
    hips.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.26, 12), pants));
    function vleg(sx) {
      var hj = new THREE.Group(); hj.position.set(sx, -0.11, 0);
      hj.add(limb(0.44, 0.07, 0.055, pants));
      var kn = new THREE.Group(); kn.position.y = -0.44;
      kn.add(joint(0.055, pants));
      kn.add(limb(0.40, 0.05, 0.04, pants));
      var sh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.26), shoes);
      sh.position.set(0, -0.385, 0.06);
      kn.add(sh);
      hj.add(kn); hj.rotation.x = 0.05;
      return hj;
    }
    hips.add(vleg(-0.10)); hips.add(vleg(0.10));
    var torsoG = new THREE.Group();
    torsoG.position.y = 0.13;
    torsoG.rotation.x = 0.12;
    hips.add(torsoG);
    torsoG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.5, 14), shirtM));
    var vestM = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.165, 0.46, 14, 1, true, 0.55, Math.PI * 2 - 1.1), vest);
    vestM.position.y = 0.23;
    torsoG.add(vestM);
    var headG = new THREE.Group();
    headG.position.y = 0.60;
    torsoG.add(headG);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), skin);
    head.scale.set(0.95, 1.05, 1);
    headG.add(head);
    headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 8, Math.PI, Math.PI, Math.PI * 0.42, Math.PI * 0.30), hairW));
    headG.add(ell(0.02, 0.02, 0.02, skin, -0.104, -0.005, 0.01));
    headG.add(ell(0.02, 0.02, 0.02, skin, 0.104, -0.005, 0.01));
    headG.add(ell(0.012, 0.012, 0.012, matL(0x2a1a0a), -0.04, 0.02, 0.10));
    headG.add(ell(0.012, 0.012, 0.012, matL(0x2a1a0a), 0.04, 0.02, 0.10));
    headG.add(ell(0.02, 0.02, 0.02, skin, 0, -0.005, 0.115));
    var must = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.010, 8, 12, Math.PI), hairW);
    must.rotation.z = Math.PI;
    must.position.set(0, -0.028, 0.105);
    headG.add(must);
    var brimH = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 18), straw);
    brimH.position.y = 0.075;
    headG.add(brimH);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), straw);
    dome.position.y = 0.08; dome.scale.y = 0.7;
    headG.add(dome);
    function varm(sx) {
      var sh = new THREE.Group();
      sh.position.set(sx, 0.44, 0);
      sh.add(joint(0.06, shirtM));
      sh.add(limb(0.30, 0.048, 0.04, shirtM));
      var el = new THREE.Group(); el.position.y = -0.30;
      el.add(joint(0.04, skin));
      el.add(limb(0.26, 0.038, 0.03, skin));
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skin);
      hand.position.y = -0.26;
      el.add(hand);
      sh.add(el);
      return sh;
    }
    var armL = varm(-0.19);
    var armR = varm(0.19);
    torsoG.add(armL); torsoG.add(armR);
    armL.rotation.x = 0.5; armL.rotation.z = 0.5;
    var bucket = new THREE.Group();
    bucket.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.22, 14, 1, true), matL(0x2a6db2)));
    for (var bi2 = 0; bi2 < 6; bi2++) {
      var bl = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), matL(0xffffff));
      bl.position.set(((bi2 % 3) - 1) * 0.06, 0.10 + (bi2 > 2 ? 0.05 : 0), (Math.floor(bi2 / 3) - 0.5) * 0.06);
      bucket.add(bl);
    }
    bucket.position.set(0, -0.62, 0.10);
    armL.add(bucket);
    for (var lb = 0; lb < 3; lb++) {
      var lbm = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), matL(0xffffff));
      lbm.position.set(-0.35 + lb * 0.12, 0.042, 0.35 + (lb % 2) * 0.1);
      g.add(lbm);
    }
    var bubble = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.64),
      new THREE.MeshBasicMaterial({ map: bubbleTexture('Queréis bolas?'), transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    bubble.position.set(0, 2.05, 0.15);
    bubble.visible = false;
    g.add(bubble);
    g.add(hips);
    g.userData = { torso: torsoG, head: headG, waveArm: armR, bucketArm: armL, bubble: bubble };
    return g;
  }
  function poseVendedor(g, t, speaking, pop) {
    var u = g.userData;
    u.torso.rotation.x = 0.12 + Math.sin(t * 1.1) * 0.02;
    u.head.rotation.y = Math.sin(t * 0.5) * 0.35;
    u.head.rotation.x = 0.05 + Math.sin(t * 0.9) * 0.05;
    u.waveArm.rotation.z = speaking ? 1.9 + Math.sin(t * 7) * 0.25 : 0.15 + Math.sin(t * 1.3) * 0.05;
    u.waveArm.rotation.x = speaking ? -0.2 : 0.1;
    u.bucketArm.rotation.x = 0.5 + Math.sin(t * 1.1 + 1) * 0.03;
    u.bubble.visible = speaking;
    var scl = 0.6 + 0.4 * pop;
    u.bubble.scale.set(scl, scl, scl);
  }

  // ---------- EXPORTADOR GLB (convierte el avatar en archivo real) ----------
    function exportarGLB(name, teamHex) {
    return new Promise(function (resolve, reject) {
      if (typeof THREE.GLTFExporter === 'undefined') {
        reject(new Error('GLTFExporter no cargado (revisa el <script> en index.html)'));
        return;
      }
      try {
        var g = makeHuman(teamHex || 0x888888, name);
        poseHumano(g, { t: 0, kind: 'iron', prof: PROF.FULL, settle: 1 });
        g.updateMatrixWorld(true);
        var exporter = new THREE.GLTFExporter();
        // three r128: parse(input, onDone, options) — SIN callback de error en medio
        exporter.parse(g, function (result) {
          try {
            var isBinary = (result instanceof ArrayBuffer);
            if (isBinary) console.log('[GLB] ' + name + ' → ' + result.byteLength + ' bytes');
            else console.log('[GLTF] ' + name + ' → JSON, ' + JSON.stringify(result).length + ' chars');
            var blob = isBinary
              ? new Blob([result], { type: 'model/gltf-binary' })
              : new Blob([JSON.stringify(result, null, 1)], { type: 'model/gltf+json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'avatar_' + name.toLowerCase() + (isBinary ? '.glb' : '.gltf');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
            resolve(isBinary);
          } catch (e2) { reject(e2); }
        }, { binary: true, onlyVisible: true });
      } catch (e) { reject(e); }
    });
  }

  window.GolfAvatars = {
    crearHumano: crearHumano,
     crearVendedor: makeVendedor,
    poseVendedor: poseVendedor,
    makeHuman: makeHuman,
    makeClub: makeClub,
    KIND_GEOM: KIND_GEOM,
    PROF: PROF,
    perfilSwing: perfilSwing,
    poseHumano: poseHumano,
    chan: chan,
    KF_PRACT: KF_PRACT,
    precargarActivos: precargarActivos,
    exportarGLB: exportarGLB,
    makeVendedor: makeVendedor,
    poseVendedor: poseVendedor,
    CARAS_CONFIG: CARAS_CONFIG,
    OUTFITS: OUTFITS,
    AssetCache: AssetCache
  };
})();