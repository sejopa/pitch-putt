/* ============================================================
   AVATARES · cuerpos, ropa, caras y palos + pose/swing
   Expone window.GolfAvatars
   ============================================================ */
(function () {

  // ---------- Rostros procedurales ----------
  var CARAS_CONFIG = {
    "SEJOPA":    { skin: 0xe8b078, hair: 0x2b2b2b, cap: null,     patch: false, beard: 0.25, beardColor: 0x3a3a3a, brow: 0x2b2b2b, smile: 0.70, nose: 1.00 },
    "HAL":       { skin: 0xe8b078, hair: 0x4a3527, cap: 0x141414, patch: true,  beard: 0.60, beardColor: 0x8f8f8f, brow: 0x4a3527, smile: 0.55, nose: 1.10 },
    "CARABALLO": { skin: 0xdfa870, hair: 0x9a9a9a, cap: null,     patch: false, beard: 0.50, beardColor: 0x9a9a9a, brow: 0x6a6a6a, smile: 1.10, nose: 1.15 }
  };
  var CARAS_ORDEN = ["SEJOPA", "HAL", "CARABALLO"];
  function caraConfigFor(name, i) {
    return CARAS_CONFIG[name] || CARAS_CONFIG[CARAS_ORDEN[i % CARAS_ORDEN.length]] || null;
  }

  // ---------- Ropa inspirada en las fotos reales ----------
  var OUTFITS = {
    "HAL":       { jacket: 0x1e56c8, zip: true,  pants: 0x5f7fa8, shoes: 0xf5f5f5, cap: 0x141414, patch: true,  sleeves: 1, hood: false, inner: 0xffffff },
    "SEJOPA":    { jacket: 0xb9bdc4, zip: false, pants: 0x2f3a4f, shoes: 0xdedede, cap: null,     patch: false, sleeves: 1, hood: true,  inner: 0x111111 },
    "CARABALLO": { jacket: 0x8f9484, zip: true,  pants: 0x3a3f4a, shoes: 0xe8e8e8, cap: null,     patch: false, sleeves: 1, hood: false, inner: 0x5a6b52 }
  };
  function outfitFor(name) { return OUTFITS[name] || null; }

  // ---------- Canales de animación (swing) ----------
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

  // Perfiles de swing por tipo de golpe (pitch & putt, sin drives)
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

  // ---------- Palos (colineales: grip + varilla + cabeza) ----------
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

  // Zócalo del palo resuelto analíticamente (cabeza junto a la bola)
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

  // ---------- IK de 2 huesos (manos siempre sobre el grip) ----------
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

  // ---------- Humano completo (cuerpo + ropa + cara) ----------
  function makeHuman(teamHex, fc, of) {
    var g = new THREE.Group();
    var jacketC = of && of.jacket != null ? of.jacket : teamHex;
    var pantsC = of && of.pants != null ? of.pants : 0x2f3a4f;
    var shoesC = of && of.shoes != null ? of.shoes : 0xf2f2f2;
    var jacket = new THREE.MeshLambertMaterial({ color: jacketC });
    var jacketDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(jacketC).multiplyScalar(0.85) });
    var pants = new THREE.MeshLambertMaterial({ color: pantsC });
    var shoeM = new THREE.MeshLambertMaterial({ color: shoesC });
    var skin = new THREE.MeshLambertMaterial({ color: 0xe8b078 });

    var hips = new THREE.Group();
    hips.position.y = 0.98;
    var pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.28, 12), pants);
    pelvis.castShadow = true;
    hips.add(pelvis);
    var belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 12), new THREE.MeshLambertMaterial({ color: 0x222222 }));
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
      hipJ.add(knee);
      return { hip: hipJ, knee: knee };
    }
    var legF = leg(-0.10);
    var legB = leg(0.10);
    hips.add(legF.hip); hips.add(legB.hip);

    var twistG = new THREE.Group();
    twistG.position.y = 0.14;
    hips.add(twistG);
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.50, 14), jacket);
    torso.position.y = 0.23;
    torso.castShadow = true;
    twistG.add(torso);
    //banda de equipo curvada (sin alas)
    var stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.183, 0.183, 0.06, 14, 1, true, -0.55, 1.10),
      new THREE.MeshLambertMaterial({ color: teamHex, side: THREE.DoubleSide })
    );
    stripe.position.set(0, 0.40, 0);
    twistG.add(stripe);

    if (of && of.zip) {
      var zip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.44, 0.02), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
      zip.position.set(0, 0.24, 0.165);
      twistG.add(zip);
    }
    var collarC = of && of.inner != null ? of.inner : 0xffffff;
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.06, 10), new THREE.MeshLambertMaterial({ color: collarC }));
    collar.position.y = 0.47;
    twistG.add(collar);
    if (of && of.hood) {
      var hood = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), jacketDark);
      hood.position.set(0, 0.50, -0.10);
      hood.scale.set(1, 0.6, 1);
      twistG.add(hood);
    }
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 10), skin);
    neck.position.y = 0.51;
    twistG.add(neck);

    // Cabeza + rostro procedural
    var headG = new THREE.Group();
    headG.position.y = 0.62;
    var skinC = fc && fc.skin != null ? fc.skin : 0xe8b078;
    var hairC = fc && fc.hair != null ? fc.hair : 0x3a2a1a;
    var browC = fc && fc.brow != null ? fc.brow : hairC;
    var beardC = fc && fc.beardColor != null ? fc.beardColor : hairC;
    var smileW = fc && fc.smile != null ? fc.smile : 0.6;
    var noseS = fc && fc.nose != null ? fc.nose : 1.0;
    var skinMat = new THREE.MeshLambertMaterial({ color: skinC });
    var skinDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(skinC).multiplyScalar(0.88) });
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), skinMat);
    head.scale.set(0.95, 1.08, 1.0);
    head.castShadow = true;
    headG.add(head);
    var earG = new THREE.SphereGeometry(0.02, 8, 6);
    var earL = new THREE.Mesh(earG, skinMat); earL.position.set(-0.104, -0.005, 0.01);
    var earR = new THREE.Mesh(earG, skinMat); earR.position.set(0.104, -0.005, 0.01);
    headG.add(earL); headG.add(earR);
    var eyeWG = new THREE.SphereGeometry(0.016, 10, 8);
    var eyeWM = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    var irisM = new THREE.MeshBasicMaterial({ color: 0x2a1a0a });
    var browM = new THREE.MeshLambertMaterial({ color: browC });
    [-1, 1].forEach(function (sd) {
      var ew = new THREE.Mesh(eyeWG, eyeWM); ew.position.set(sd * 0.042, 0.012, 0.096); headG.add(ew);
      var ir = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), irisM); ir.position.set(sd * 0.042, 0.012, 0.110); headG.add(ir);
      var bw = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.009, 0.012), browM);
      bw.position.set(sd * 0.042, 0.038, 0.100);
      bw.rotation.z = sd * -0.12;
      headG.add(bw);
    });
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.017 * noseS, 8, 6), skinDark);
    nose.position.set(0, -0.012, 0.112);
    headG.add(nose);
    var mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.030, 0.007, 8, 14, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x7a3a32 })
    );
    mouth.rotation.z = Math.PI;
    mouth.scale.set(smileW, 0.7 + smileW * 0.5, 1);
    mouth.position.set(0, -0.042, 0.102);
    headG.add(mouth);
    if (fc && fc.beard > 0) {
      var beard = new THREE.Mesh(
        //barba debajo de la boca
        new THREE.SphereGeometry(0.116, 14, 10, 0, Math.PI * 2, Math.PI * (0.66 - fc.beard * 0.06), Math.PI * (0.30 + fc.beard * 0.08)),
        new THREE.MeshLambertMaterial({ color: beardC })
      );
      beard.scale.set(0.97, 1.06, 1.0);
      beard.position.y = -0.012;
      headG.add(beard);
    }

    var capColor = (of && of.cap != null) ? of.cap : ((fc && fc.cap != null) ? fc.cap : 0xffffff);
    var hasPatch = (of && of.patch) || (fc && fc.patch);
    // Pelo SOLO detrás (azimut PI..2PI): nunca tapa la cara
    var hairBackGeo = new THREE.SphereGeometry(0.118, 12, 10, Math.PI, Math.PI, Math.PI * 0.30, Math.PI * 0.58);
    var hairMat2 = new THREE.MeshLambertMaterial({ color: hairC });
    if (capColor !== 0xffffff || hasPatch) {
      var capD = new THREE.Mesh(new THREE.SphereGeometry(0.122, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: capColor }));
      capD.position.y = 0.015;
      headG.add(capD);
      var brim2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.014, 0.15), new THREE.MeshLambertMaterial({ color: capColor }));
      brim2.position.set(0, 0.012, 0.14);
      headG.add(brim2);
      if (hasPatch) {
        var patch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.012), new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
        patch.position.set(0, 0.055, 0.112);
        headG.add(patch);
      }
      headG.add(new THREE.Mesh(hairBackGeo, hairMat2));
    } else {
      var hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.118, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), hairMat2);
      headG.add(hairTop);
      headG.add(new THREE.Mesh(hairBackGeo, hairMat2));
    }

    twistG.add(headG);

    var swing = new THREE.Group();
    swing.position.y = 0.42;
    twistG.add(swing);

    var sleeveMat = (of && of.sleeves) ? jacket : skin;
    function arm(sx) {
      var sh = new THREE.Group();
      sh.position.set(sx, 0, 0);
      sh.add(joint(0.062, jacket));
      sh.add(limb(0.30, 0.05, 0.042, jacket));
      var el = new THREE.Group();
      el.position.y = -0.30;
      el.add(joint(0.045, sleeveMat));
      el.add(limb(0.27, 0.04, 0.032, sleeveMat));
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), skin);
      hand.position.y = window.GOLF_TUNE.handY;
      hand.castShadow = true;
      el.add(hand);
      sh.add(el);
      return { sh: sh, el: el, hand: hand };
    }
    var armL = arm(-0.19);
    var armR = arm(0.19);
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

  // Pose completa: rutina, swing, ensayo, mirada, IK de brazos
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
  function lerpN(a, b, f) { return a + (b - a) * f; }

  function crearHumano(teamHex, name, idx) {
    return makeHuman(teamHex, caraConfigFor(name, idx), outfitFor(name));
  }

    // ---------- ANTONIO, EL VENDEDOR DE BOLAS ----------
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
    var skin = new THREE.MeshLambertMaterial({ color: 0xe0b090 });
    var hairW = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    var vest = new THREE.MeshLambertMaterial({ color: 0x7a4a2a, side: THREE.DoubleSide });
    var shirtM = new THREE.MeshLambertMaterial({ color: 0xe8dcc8 });
    var pants = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
    var shoes = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
    var straw = new THREE.MeshLambertMaterial({ color: 0xd8c08a });

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
      hj.add(kn);
      hj.rotation.x = 0.05;
      return hj;
    }
    hips.add(vleg(-0.10)); hips.add(vleg(0.10));

    var torsoG = new THREE.Group();
    torsoG.position.y = 0.13;
    torsoG.rotation.x = 0.12;   // ligera chepa de señor mayor
    hips.add(torsoG);
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.5, 14), shirtM);
    torso.position.y = 0.23;
    torsoG.add(torso);
    var vestM = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.165, 0.46, 14, 1, true, 0.55, Math.PI * 2 - 1.1), vest);
    vestM.position.y = 0.23;
    torsoG.add(vestM);

    var headG = new THREE.Group();
    headG.position.y = 0.60;
    torsoG.add(headG);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), skin);
    head.scale.set(0.95, 1.05, 1.0);
    headG.add(head);
    // Calvo con pelo blanco en laterales y nuca
    headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 8, Math.PI, Math.PI, Math.PI * 0.42, Math.PI * 0.30), hairW));
    var earG = new THREE.SphereGeometry(0.02, 8, 6);
    var el1 = new THREE.Mesh(earG, skin); el1.position.set(-0.104, -0.005, 0.01);
    var el2 = new THREE.Mesh(earG, skin); el2.position.set(0.104, -0.005, 0.01);
    headG.add(el1); headG.add(el2);
    var eyeM = new THREE.MeshBasicMaterial({ color: 0x2a1a0a });
    var o1 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), eyeM); o1.position.set(-0.04, 0.02, 0.10);
    var o2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), eyeM); o2.position.set(0.04, 0.02, 0.10);
    headG.add(o1); headG.add(o2);
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), skin);
    nose.position.set(0, -0.005, 0.115);
    headG.add(nose);
    var must = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.010, 8, 12, Math.PI), hairW);
    must.rotation.z = Math.PI;
    must.position.set(0, -0.028, 0.105);
    headG.add(must);
    // Sombrero de paja
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
    armL.rotation.x = 0.5; armL.rotation.z = 0.5;   // sostiene el cubo delante

    // Cubo con bolas colgado del brazo izquierdo
    var bucket = new THREE.Group();
    var bkt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.11, 0.22, 14, 1, true),
      new THREE.MeshLambertMaterial({ color: 0x2a6db2, side: THREE.DoubleSide })
    );
    bucket.add(bkt);
    for (var bi2 = 0; bi2 < 6; bi2++) {
      var bl = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      bl.position.set(((bi2 % 3) - 1) * 0.06, 0.10 + (bi2 > 2 ? 0.05 : 0), (Math.floor(bi2 / 3) - 0.5) * 0.06);
      bucket.add(bl);
    }
    bucket.position.set(0, -0.62, 0.10);
    armL.add(bucket);

    // Bolas sueltas junto a sus pies
    for (var lb = 0; lb < 3; lb++) {
      var lbm = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      lbm.position.set(-0.35 + lb * 0.12, 0.042, 0.35 + (lb % 2) * 0.1);
      g.add(lbm);
    }

    // Bocadillo
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
    caraConfigFor: caraConfigFor,
    outfitFor: outfitFor,
    CARAS_CONFIG: CARAS_CONFIG,
    OUTFITS: OUTFITS
  };
})();