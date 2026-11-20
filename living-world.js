(function (App) {
  const { PI, S, runtime, DOOR, KX, KZ, rnd, seasonOf, mon } = App;
  const { sc, M, add, lab, glowTex, turnTo, free, pick, stage } = App;
  const { trees, clumps } = stage;

  // ========== 通用移動與躲雨 ==========
  function walker(o, sp, r, pause) {
    const p = pick(r);
    o.position.set(p[0], 0, p[1]);
    return { o, sp, r, pause, t: pick(r), w: 0, ph: rnd(0, 6), mv: 0 };
  }

  function stepW(k, dt) {
    const o = k.o;
    if (k.w > 0) { k.w -= dt; k.mv = 0; return; }
    const dx = k.t[0] - o.position.x, dz = k.t[1] - o.position.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { k.w = rnd(k.pause[0], k.pause[1]); k.t = pick(k.r); k.mv = 0; return; }
    const nx = o.position.x + dx / d * k.sp * dt, nz = o.position.z + dz / d * k.sp * dt;
    let px = nx, pz = nz;
    if (!free(nx, nz, k.r)) {
      if (!k.sh && !k.sl) { k.t = pick(k.r); k.w = rnd(0.2, 0.8); k.mv = 0; return; }
      const sx = -dz / d * k.sp * dt, sz = dx / d * k.sp * dt, s1 = k.sd || 1;
      px = o.position.x + sx * s1; pz = o.position.z + sz * s1;
      if (!free(px, pz, k.r)) { k.sd = -s1; px = o.position.x - sx * s1; pz = o.position.z - sz * s1; if (!free(px, pz, k.r)) { px = nx; pz = nz; } }
    }
    o.position.x = px; o.position.z = pz; k.mv = 1; k.ph += dt * k.sp * 5;
    let df = Math.atan2(dx, dz) - o.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    o.rotation.y += df * Math.min(1, dt * 8);
  }

  function shel(k, need, dt) {
    if (need) {
      if (k.in) return true;
      k.sh = 1; k.t = DOOR; k.w = 0; stepW(k, dt);
      if (Math.hypot(k.o.position.x - DOOR[0], k.o.position.z - DOOR[1]) < 0.35) { k.in = 1; k.o.visible = false; }
      return true;
    }
    if (k.in) { k.in = 0; k.sh = 0; k.o.visible = true; k.o.position.set(DOOR[0], 0, DOOR[1]); k.t = pick(k.r); k.w = rnd(0.3, 1.2); return false; }
    if (k.sh) { k.sh = 0; k.t = pick(k.r); }
    return false;
  }

  // ========== 大人（主角）與愛心 ==========
  const heroFeet = [], heroArms = [], hero = new THREE.Group();
  sc.add(hero);
  const skin = M(0xffe6d0);
  add(new THREE.SphereGeometry(0.45, 24, 18), M(0xffb7c8), 0, 0.55, 0, hero).scale.set(1, 1.1, 1);
  add(new THREE.SphereGeometry(0.4, 24, 18), skin, 0, 1.3, 0, hero);
  add(new THREE.SphereGeometry(0.43, 24, 12, 0, PI * 2, 0, PI * 0.55), M(0x8b5e4b), 0, 1.34, -0.03, hero);
  [-0.14, 0.14].forEach(x => {
    add(new THREE.SphereGeometry(0.05, 10, 10), M(0x3b2e2a), x, 1.3, 0.37, hero);
    const c = add(new THREE.SphereGeometry(0.07, 10, 10), M(0xff9fa8), x * 1.9, 1.2, 0.33, hero); c.scale.z = 0.4;
    heroArms.push(add(new THREE.SphereGeometry(0.12, 10, 10), skin, x * 3.3, 0.7, 0.05, hero));
    heroFeet.push(add(new THREE.SphereGeometry(0.14, 10, 10), M(0xffffff), x * 1.4, 0.1, 0.1, hero));
  });
  const scarf = add(new THREE.TorusGeometry(0.3, 0.09, 8, 20), M(0xe85d6f), 0, 0.98, 0, hero);
  scarf.rotation.x = PI / 2;
  const umb = new THREE.Group(); hero.add(umb); umb.position.set(0.5, 0.7, 0.05);
  add(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), M(0x8b6b55), 0, 0.6, 0, umb);
  add(new THREE.ConeGeometry(0.95, 0.45, 16), M(0xff8a8a), 0, 1.4, 0, umb);
  const heroW = walker(hero, 1.3, 0.5, [0.6, 2.5]);
  Object.assign(heroW, { mode: 'idle', mt: rnd(3, 6), sl: 0, tg: null });

  const hc = document.createElement('canvas'); hc.width = hc.height = 64;
  {
    const x = hc.getContext('2d'); x.fillStyle = '#ff6f91'; x.beginPath(); x.moveTo(32, 56);
    x.bezierCurveTo(2, 34, 10, 6, 32, 22); x.bezierCurveTo(54, 6, 62, 34, 32, 56); x.fill();
  }
  const heartT = new THREE.CanvasTexture(hc);
  const hearts = [0, 1, 2, 3].map(() => {
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartT, transparent: true, depthWrite: false }));
    h.scale.setScalar(0.35); h.visible = false; sc.add(h); return h;
  });
  const armRest = new THREE.Vector3(0.462, 0.7, 0.05), armUp = new THREE.Vector3();

  // ========== 幼稚園男孩與圓球 ==========
  const boyFeet = [], boy = new THREE.Group(); sc.add(boy); boy.scale.setScalar(0.7);
  {
    const sk = M(0xffe6d0), yl = M(0xffd84d);
    add(new THREE.SphereGeometry(0.42, 20, 16), M(0x7ec8ff), 0, 0.45, 0, boy).scale.set(1, 1.05, 1);
    add(new THREE.SphereGeometry(0.46, 20, 16), sk, 0, 1.12, 0, boy);
    add(new THREE.SphereGeometry(0.48, 20, 10, 0, PI * 2, 0, PI * 0.5), yl, 0, 1.18, -0.02, boy);
    add(new THREE.SphereGeometry(0.28, 12, 6, 0, PI * 2, 0, PI * 0.5), yl, 0, 1.12, 0.38, boy).scale.set(1, 0.2, 1);
    [-0.15, 0.15].forEach(x => {
      add(new THREE.SphereGeometry(0.055, 10, 10), M(0x3b2e2a), x, 1.08, 0.43, boy);
      const c = add(new THREE.SphereGeometry(0.08, 10, 10), M(0xff9fa8), x * 2, 0.95, 0.38, boy); c.scale.z = 0.4;
      add(new THREE.SphereGeometry(0.12, 10, 10), sk, x * 3.2, 0.62, 0.05, boy);
      boyFeet.push(add(new THREE.SphereGeometry(0.14, 10, 10), M(0xff7a7a), x * 1.5, 0.1, 0.1, boy));
    });
  }
  const balls = [0xff6b6b, 0xffd84d, 0x6bb6ff].map(c => {
    const m = add(new THREE.SphereGeometry(0.16, 16, 12), M(c, { roughness: 0.5 }), 0, 0.16, 0), p = pick(0.3);
    m.position.set(p[0], 0.16, p[1]);
    return { m, vx: 0, vz: 0, vy: 0, st: 'rest' };
  });
  const boyK = walker(boy, 1.4, 0.35, [0.4, 1.2]);
  Object.assign(boyK, { mode: 'idle', mt: 2, sl: 1, jump: 0, ball: null, tg: null });

  // ========== 貓、狗與狗窩 ==========
  function mkPet(col, sz, isDog) {
    const g = new THREE.Group(); g.scale.setScalar(sz); g.userData.sz = sz; sc.add(g);
    const f = M(col), dk = M(0x3b2e2a);
    add(new THREE.SphereGeometry(0.22, 16, 12), f, 0, 0.34, 0, g).scale.set(0.8, 0.8, 1.5);
    add(new THREE.SphereGeometry(0.18, 16, 12), f, 0, 0.5, 0.34, g);
    [-1, 1].forEach(q => {
      add(new THREE.SphereGeometry(0.025, 8, 8), dk, q * 0.07, 0.53, 0.5, g);
      if (isDog) { const e = add(new THREE.SphereGeometry(0.07, 8, 8), M(0x9c6f4e), q * 0.16, 0.5, 0.32, g); e.scale.set(0.6, 1.4, 0.9); }
      else { const e = add(new THREE.ConeGeometry(0.06, 0.14, 4), f, q * 0.1, 0.68, 0.32, g); e.rotation.z = -q * 0.25; }
    });
    if (isDog) { add(new THREE.SphereGeometry(0.09, 10, 8), M(0xf3dcc0), 0, 0.46, 0.5, g); add(new THREE.SphereGeometry(0.03, 8, 8), dk, 0, 0.48, 0.58, g); }
    const tl = new THREE.Group(); tl.position.set(0, 0.38, -0.32); tl.rotation.x = -0.7; g.add(tl);
    add(new THREE.CylinderGeometry(0.03, 0.04, isDog ? 0.3 : 0.45, 6), f, 0, 0.18, 0, tl);
    const lg = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 6); lg.translate(0, -0.11, 0);
    const legs = [[-0.1, 0.15], [0.1, 0.15], [-0.1, -0.15], [0.1, -0.15]].map(a => add(lg, f, a[0], 0.22, a[1], g));
    return { g, tl, legs };
  }

  const cat = mkPet(0xffb86b, 1, 0), catW = walker(cat.g, 1.5, 0.3, [0.5, 3]);
  const dog = mkPet(0xe8c9a0, 1.5, 1), dogW = walker(dog.g, 1.9, 0.45, [0.4, 2]);
  catW.sp0 = catW.sp; dogW.sp0 = dogW.sp;
  [catW, dogW].forEach(k => Object.assign(k, { mode: 'idle', mt: rnd(2, 5), hit: 0, cnt: 0, pj: 0, nod: 0, up: 0, sl: 0 }));
  cat.g.rotation.order = dog.g.rotation.order = 'YXZ';
  const pets = [[cat, catW, 450], [dog, dogW, 650]];

  {
    const dwM = M(0xc98f6b), dwR = M(0xe07a5f);
    add(new THREE.BoxGeometry(1.5, 0.06, 1.4), M(0xa9764f), KX, 0.03, KZ);
    add(new THREE.BoxGeometry(1.5, 0.9, 0.08), dwM, KX, 0.45, KZ - 0.66);
    [-1, 1].forEach(q => {
      add(new THREE.BoxGeometry(0.08, 0.9, 1.4), dwM, KX + q * 0.71, 0.45, KZ);
      add(new THREE.BoxGeometry(0.95, 0.06, 1.6), dwR, KX + q * 0.365, 1.205, KZ).rotation.z = -q * 0.7;
    });
  }
  [cat, dog].forEach(P => { P.zz = lab('Zzz', 0.7, '#fff6c8'); P.zz.visible = false; sc.add(P.zz); });

  // ========== 小鳥 ==========
  const rbt = () => [rnd(-11, 11), rnd(2.5, 8), rnd(-10, 6)];
  const treePos = sp => {
    const t = sp.tr, c = t.cr[sp.ci], S1 = t.g.scale.x, Rr = c.geometry.parameters.radius * Math.max(c.scale.x, 0.55);
    const dx = sp.ox * Rr, dz = sp.oz * Rr, top = Math.sqrt(Math.max(0, Rr * Rr - dx * dx - dz * dz));
    return [t.g.position.x + (c.position.x + dx) * S1, (c.position.y + top) * S1 + 0.17, t.g.position.z + (c.position.z + dz) * S1];
  };
  const spotTree = () => {
    const t = trees[Math.floor(Math.random() * trees.length)], a = rnd(0, PI * 2), r = Math.sqrt(Math.random()) * 0.6;
    return { k: 'tree', tr: t, ci: Math.floor(Math.random() * t.cr.length), ox: Math.cos(a) * r, oz: Math.sin(a) * r };
  };
  const spotRoof = () => {
    for (;;) {
      const x = rnd(-1.6, 1.6), z = rnd(-1.2, 1.2);
      if (x > 0.7 && x < 1.5 && z > -1.1 && z < -0.1) continue;
      return { k: 'roof', x: -3 + x, y: 2.55 + 1.9 * (1 - Math.max(Math.abs(x) / 2.23, Math.abs(z) / 1.78)) + 0.2, z: -2 + z };
    }
  };
  const spotGround = () => { const p = pick(0.3); return { k: 'ground', x: p[0], y: 0.19, z: p[1] }; };
  const spotAir = () => { const p = rbt(); return { k: 'air', x: p[0], y: p[1], z: p[2] }; };
  const spotPos = sp => (sp.k == 'tree' ? treePos(sp) : [sp.x, sp.y, sp.z]);
  const chooseSpot = rainy => {
    const r = Math.random();
    return rainy ? (r < 0.65 ? spotTree() : spotRoof()) : r < 0.35 ? spotTree() : r < 0.55 ? spotRoof() : r < 0.85 ? spotGround() : spotAir();
  };
  const birds = [0x7ec8ff, 0xffd166, 0xff8fa3].map(c => {
    const g = new THREE.Group(); g.rotation.order = 'YXZ'; sc.add(g); const m = M(c);
    add(new THREE.SphereGeometry(0.2, 14, 10), m, 0, 0, 0, g).scale.set(0.9, 0.9, 1.3);
    add(new THREE.SphereGeometry(0.13, 12, 10), m, 0, 0.1, 0.24, g);
    add(new THREE.ConeGeometry(0.04, 0.12, 6), M(0xffa94d), 0, 0.09, 0.38, g).rotation.x = PI / 2;
    const wings = [-1, 1].map(q => {
      const p = new THREE.Group(); p.position.set(q * 0.15, 0.05, 0); g.add(p);
      add(new THREE.SphereGeometry(0.18, 10, 8), m, q * 0.18, 0, 0, p).scale.set(1, 0.12, 0.6);
      return { p, q };
    });
    g.position.set(rnd(-8, 8), rnd(3, 7), rnd(-8, 3));
    return { g, wings, st: 'fly', sp: spotAir(), v: rnd(2.2, 3.4), ph: rnd(0, 6), tm: 0, sub: 0, ss: 0, look: 0, ty: 0 };
  });

  // ========== 夜晚：小老鼠、手電筒與螢火蟲 ==========
  const mice = [0, 1, 2].map(() => {
    const g = new THREE.Group(); g.scale.setScalar(0.001); g.visible = false; sc.add(g);
    const m = M(0x9a9aa6), pk = M(0xffb3c1);
    add(new THREE.SphereGeometry(0.1, 12, 10), m, 0, 0.1, 0, g).scale.set(0.8, 0.8, 1.5);
    add(new THREE.SphereGeometry(0.07, 12, 10), m, 0, 0.1, 0.17, g);
    [-1, 1].forEach(q => {
      add(new THREE.SphereGeometry(0.045, 8, 8), pk, q * 0.06, 0.17, 0.14, g);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe14d, fog: false }));
      e.position.set(q * 0.035, 0.12, 0.235); g.add(e);
    });
    add(new THREE.CylinderGeometry(0.008, 0.014, 0.25, 6), pk, 0, 0.07, -0.27, g).rotation.x = PI / 2;
    const k = walker(g, 1.5, 0.12, [0.3, 1.6]); Object.assign(k, { on: 0, s: 0, cd: 0, fl: 0 });
    return { g, k };
  });

  const flh = new THREE.Group(); boy.add(flh);
  add(new THREE.CylinderGeometry(0.06, 0.08, 0.34, 10), M(0x444a58), 0.45, 0.5, 0.3, flh).rotation.x = PI / 2;
  {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
    lens.position.set(0.45, 0.5, 0.48); flh.add(lens);
  }
  flh.visible = false;

  const beam = new THREE.Group(), cg = new THREE.ConeGeometry(1.1, 4, 24, 1, true);
  cg.translate(0, -2, 0); cg.rotateX(-PI / 2);
  const bm = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  beam.add(new THREE.Mesh(cg, bm)); sc.add(beam);
  const spot = new THREE.SpotLight(0xfff0c0, 0, 12, 0.27, 0.5, 1.5); sc.add(spot, spot.target);
  const aim = new THREE.Vector3(), aimC = new THREE.Vector3();
  let beamOn = false;

  const NF = 60, ffB = [], ffP = new Float32Array(NF * 3), ffC = new Float32Array(NF * 3);
  for (let i = 0; i < NF; i++) { const a = rnd(0, PI * 2), r = Math.sqrt(Math.random()) * 8.5; ffB.push({ x: Math.cos(a) * r, y: rnd(0.4, 2.4), z: Math.sin(a) * r, p: rnd(0, 6), f: rnd(1.2, 2.6) }); }
  const ffG = new THREE.BufferGeometry(); ffG.setAttribute('position', new THREE.BufferAttribute(ffP, 3)); ffG.setAttribute('color', new THREE.BufferAttribute(ffC, 3));
  const ffO = new THREE.Points(ffG, new THREE.PointsMaterial({ map: glowTex('rgba(210,255,120,1)'), size: 0.45, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  ffO.frustumCulled = false; sc.add(ffO);
  let FV = 0;

  function ffUpdate(dt, w) {
    const tm = runtime.tm, NIGHT = runtime.NIGHT, se = S.season == 'auto' ? seasonOf(mon()) : S.season;
    const n = se == 'summer' ? 60 : se == 'winter' ? 6 : 28;
    FV += ((NIGHT && !w.r && !w.s ? 1 : 0) - FV) * Math.min(1, dt * 1.5);
    ffO.visible = FV > 0.02;
    if (!ffO.visible) return;
    ffG.setDrawRange(0, n);
    for (let i = 0; i < n; i++) {
      const b = ffB[i];
      ffP[i * 3] = b.x + Math.sin(tm * 0.4 + b.p) * 0.8;
      ffP[i * 3 + 1] = b.y + Math.sin(tm * 0.7 + b.p * 2) * 0.35;
      ffP[i * 3 + 2] = b.z + Math.cos(tm * 0.35 + b.p) * 0.8;
      const br = Math.pow(Math.max(0, Math.sin(tm * b.f + b.p)), 3) * FV;
      ffC[i * 3] = 0.8 * br; ffC[i * 3 + 1] = br; ffC[i * 3 + 2] = 0.3 * br;
    }
    ffG.attributes.position.needsUpdate = true; ffG.attributes.color.needsUpdate = true;
  }

  App.onNightUpdate((dt, w, LV, NIGHT) => {
    ffUpdate(dt, w);
    const k = boyK, P = boy.position, yaw = boy.rotation.y;
    const hx = P.x + 0.29 * Math.cos(yaw) + 0.21 * Math.sin(yaw), hz = P.z - 0.29 * Math.sin(yaw) + 0.21 * Math.cos(yaw), hy = P.y + 0.5;
    let tx = P.x + Math.sin(yaw) * 3.2, tz = P.z + Math.cos(yaw) * 3.2;
    if (k.mode == 'light' && k.mouse && k.mouse.k.on) { tx = k.mouse.g.position.x; tz = k.mouse.g.position.z; }
    const f = Math.min(1, dt * 6);
    aimC.x += (tx - aimC.x) * f; aimC.z += (tz - aimC.z) * f; aimC.y = 0; aim.copy(aimC);
    beamOn = LV > 0.3 && !k.in; flh.visible = LV > 0.05; beam.visible = beamOn;
    const len = Math.min(5, Math.max(1.6, Math.hypot(aimC.x - hx, aimC.z - hz, hy)));
    beam.position.set(hx, hy, hz); beam.lookAt(aimC); beam.scale.setScalar(len / 4); bm.opacity = 0.14 * LV;
    spot.position.set(hx, hy, hz); spot.target.position.copy(aimC); spot.intensity = beamOn ? 2.2 * LV : 0;

    mice.forEach(m => {
      const mk2 = m.k, g = m.g;
      if (NIGHT && !mk2.on) { mk2.on = 1; const p = pick(0.12); g.position.set(p[0], 0, p[1]); mk2.t = pick(0.12); mk2.w = 0; }
      if (!NIGHT && mk2.on) mk2.on = 0;
      mk2.s += (((NIGHT && mk2.on) ? 1 : 0) - mk2.s) * Math.min(1, dt * 2);
      g.visible = mk2.s > 0.04; g.scale.setScalar(Math.max(0.001, mk2.s));
      if (!g.visible) return;
      if (mk2.cd > 0) mk2.cd -= dt;
      if (beamOn && mk2.cd <= 0 && Math.hypot(g.position.x - aim.x, g.position.z - aim.z) < 0.9) {
        mk2.cd = 3.5; mk2.w = 0.9;
        const bx = g.position.x - P.x, bz = g.position.z - P.z, d = Math.hypot(bx, bz) || 1;
        let t = [g.position.x + bx / d * 4, g.position.z + bz / d * 4];
        if (!free(t[0], t[1], 0.12)) t = pick(0.12);
        mk2.t = t; mk2.fl = 2; mk2.sp = 3.4;
      }
      if (mk2.fl > 0) { mk2.fl -= dt; if (mk2.fl <= 0) mk2.sp = 1.5; }
      stepW(mk2, dt); g.position.y = mk2.mv ? Math.abs(Math.sin(mk2.ph * 2)) * 0.02 : 0;
    });
  });

  // ========== 行為 AI 更新 ==========
  const AIR = ['climb', 'roof', 'down', 'enter', 'sleepK', 'leave'];
  const roofPt = () => { const q = spotRoof(); return [q.x, q.y - 0.18, q.z]; };

  function flee(pk, from) {
    if (pk.in || pk.sh || pk.up || pk.mode == 'toA' || pk.fl > 0.8) return;
    const o = pk.o.position, ax = o.x - from.x, az = o.z - from.z, d = Math.hypot(ax, az) || 1;
    let t = [o.x + ax / d * 5, o.z + az / d * 5];
    if (!free(t[0], t[1], pk.r)) t = pick(pk.r);
    pk.t = t; pk.w = 0; pk.fl = 1.6; pk.sp = pk.sp0 * 1.8;
  }

  function startRoof(k) {
    if (k.in || k.up || k.mode == 'toA') return false;
    const x0 = rnd(-4.4, -1.6);
    k.A = [x0, 0.55]; k.t = [x0, 0.55]; k.mode = 'toA'; k.mt = 12; k.sl = 1; k.w = 0; return true;
  }

  function startKennel(k) {
    if (k.in || k.up || k.mode == 'toK') return false;
    k.A = [KX, 0.35]; k.t = k.A; k.mode = 'toK'; k.mt = 15; k.sl = 1; k.w = 0; return true;
  }

  function follow(k, dt, sp) {
    const g = k.o, o = g.position, t = k.path[0], dx = t[0] - o.x, dy = t[1] - o.y, dz = t[2] - o.z, d = Math.hypot(dx, dy, dz);
    if (d < 0.1) { k.path.shift(); return k.path.length == 0; }
    const f = Math.min(1, sp * dt / d), h = Math.hypot(dx, dz);
    o.x += dx * f; o.y += dy * f; o.z += dz * f;
    if (h > 0.05) { let df = Math.atan2(dx, dz) - g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); g.rotation.y += df * Math.min(1, dt * 10); }
    g.rotation.x = -Math.max(-1.3, Math.min(1.3, Math.atan2(dy, Math.max(h, 0.15)))) * 0.9;
    k.mv = 1; k.ph += dt * 8; return false;
  }

  function airMode(k, dt, need) {
    const g = k.o, NIGHT = runtime.NIGHT; k.mv = 0;
    if (k.mode == 'climb') {
      if (follow(k, dt, 1.7)) { k.mode = 'roof'; k.mt = rnd(8, 14); k.rm = rnd(2, 4); g.rotation.x = 0; }
    } else if (k.mode == 'roof') {
      if (k.path && k.path.length) { follow(k, dt, 0.9); if (!k.path.length) g.rotation.x = 0; }
      else {
        k.rm -= dt;
        if (k.rm <= 0) {
          if (NIGHT && !k.sleep && Math.random() < 0.6) { k.sleep = 1; k.rm = rnd(6, 12); }
          else { k.sleep = 0; k.rm = rnd(2.5, 5); if (Math.random() < 0.6) k.path = [roofPt()]; }
        }
      }
      if (need || (!NIGHT && (k.mt -= dt) <= 0)) {
        const x0 = Math.max(-4.4, Math.min(-1.6, g.position.x));
        k.path = [[x0, 2.62, -0.25], [x0, 0, -0.2], [x0, 0, 0.6]]; k.mode = 'down'; k.sleep = 0;
      }
    } else if (k.mode == 'enter') {
      if (follow(k, dt, 1.2)) { k.mode = 'sleepK'; k.sleep = 1; k.mt = rnd(15, 35); }
    } else if (k.mode == 'sleepK') {
      k.mv = 0; turnTo(g, g.position.x, g.position.z + 1, Math.min(1, dt * 3)); g.rotation.x = 0;
      if (!NIGHT || (k.mt -= dt) <= 0) { k.sleep = 0; k.path = [[KX, 0.06, KZ + 0.75], [KX, 0, 0.35]]; k.mode = 'leave'; }
    } else if (k.mode == 'leave') {
      if (follow(k, dt, 1.4)) { g.position.y = 0; g.rotation.x = 0; k.mode = 'idle'; k.mt = rnd(2, 4); k.sl = 0; }
    } else if (follow(k, dt, 1.9)) { g.position.y = 0; g.rotation.x = 0; k.mode = 'idle'; k.up = 0; k.mt = rnd(2, 4); k.sl = 0; }
  }

  function behave(isCat, k, dt, w) {
    const o = k.o.position, NIGHT = runtime.NIGHT; k.mv = 0;
    if (k.fl > 0 && k.mode != 'idle' && k.mode != 'toA') { k.mode = 'idle'; k.mt = 1; k.sl = 0; }
    const m = k.mode, sp = f => { if (!(k.fl > 0)) k.sp = k.sp0 * f; }, end = t => { k.mode = 'idle'; k.mt = t; k.sl = 0; };

    if (m == 'idle') {
      sp(1); k.sl = 0; stepW(k, dt);
      if ((k.mt -= dt) <= 0) {
        k.mt = rnd(3, 7); const r = Math.random();
        if (isCat) {
          const gb = birds.filter(b => b.st == 'ground');
          if (NIGHT) { if (!w.r) startRoof(k); }
          else if (r < 0.25 && gb.length) { k.tg = gb[Math.floor(Math.random() * gb.length)]; k.mode = 'cb'; k.mt = rnd(5, 8); }
          else if (r < 0.5 && clumps.length) {
            const c = clumps[Math.floor(Math.random() * clumps.length)], dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz) || 1;
            const t = [c.x + dx / d * 0.85, c.z + dz / d * 0.85];
            if (free(t[0], t[1], k.r)) { k.cl = c; k.t = t; k.mode = 'gs'; k.mt = 10; k.w = 0; }
          } else if (r < 0.65 && !w.r) startRoof(k);
        } else {
          if (NIGHT) { if (r < 0.5) startKennel(k); else if (!boyK.in) { k.mode = 'fb'; k.mt = rnd(15, 30); } }
          else if (r < 0.3 && !catW.in && !catW.up) { k.mode = 'dc'; k.mt = rnd(5, 9); }
          else if (r < 0.6) {
            const rest = balls.filter(b => b.st == 'rest');
            if (rest.length) { k.ball = rest[Math.floor(Math.random() * rest.length)]; k.mode = 'db'; k.mt = 10; k.cnt = 2 + Math.floor(Math.random() * 4); }
          }
        }
      }
    } else if (m == 'cb') {
      const b = k.tg, bp = b.g.position, dd = Math.hypot(bp.x - o.x, bp.z - o.z);
      if (b.st != 'ground' || (k.mt -= dt) <= 0) end(rnd(2, 4));
      else if (dd < 1.2) { b.sp = chooseSpot(!!w.r || NIGHT); b.st = 'fly'; b.v = rnd(2.6, 3.8); k.pj = 0.3; end(rnd(2, 4)); }
      else { sp(1.7); k.sl = 1; k.t = [bp.x, bp.z]; k.w = 0; stepW(k, dt); }
    } else if (m == 'gs') {
      sp(1.2); k.sl = 1;
      if ((k.mt -= dt) <= 0) end(2);
      else if (Math.hypot(o.x - k.t[0], o.z - k.t[1]) < 0.25) { k.mode = 'paw'; k.mt = rnd(2, 3.5); k.sl = 0; }
      else { k.w = 0; stepW(k, dt); }
    } else if (m == 'paw') {
      const c = k.cl; let df = Math.atan2(c.x - o.x, c.z - o.z) - k.o.rotation.y;
      df = Math.atan2(Math.sin(df), Math.cos(df)); k.o.rotation.y += df * Math.min(1, dt * 8);
      c.sk = Math.max(c.sk || 0, 0.9);
      if ((k.mt -= dt) <= 0) end(rnd(2, 5));
    } else if (m == 'toA') {
      k.sl = 1; if (!(k.fl > 0)) k.sp = k.sp0 * 1.5; k.t = k.A; k.w = 0;
      if ((k.mt -= dt) <= 0) end(2);
      else if (Math.hypot(o.x - k.A[0], o.z - k.A[1]) < 0.25) {
        const x0 = k.A[0]; k.path = [[x0, 0, -0.2], [x0, 2.62, -0.25], roofPt()];
        k.o.rotation.y = PI; k.mode = 'climb'; k.up = 1; k.sl = 0;
      } else stepW(k, dt);
    } else if (m == 'dc') {
      const tp = catW.o.position, dd = Math.hypot(tp.x - o.x, tp.z - o.z);
      if (catW.in || catW.up || (k.mt -= dt) <= 0) end(rnd(2, 4));
      else {
        sp(1.5); k.sl = 1; k.t = [tp.x, tp.z]; k.w = 0;
        if (dd < 2.4) { flee(catW, o); if (catW.mode == 'idle' && Math.random() < dt * 0.5) startRoof(catW); }
        if (dd < 0.7) { k.mode = 'cheer'; k.mt = 1; k.sl = 0; } else stepW(k, dt);
      }
    } else if (m == 'db') {
      const b = k.ball;
      if (!b || b.st == 'held' || (k.mt -= dt) <= 0 || k.cnt <= 0) end(rnd(2, 5));
      else {
        const bp = b.m.position, dd = Math.hypot(bp.x - o.x, bp.z - o.z); sp(1.5); k.sl = 1; k.t = [bp.x, bp.z]; k.w = 0; k.hit -= dt;
        if (dd < 0.6 && k.hit <= 0 && (b.st == 'rest' || Math.hypot(b.vx, b.vz) < 2.2)) {
          const a = k.o.rotation.y + rnd(-0.7, 0.7), v = rnd(2.6, 4.6);
          b.vx = Math.sin(a) * v; b.vz = Math.cos(a) * v; b.vy = rnd(1.2, 2.6); b.st = 'fly'; k.cnt--; k.hit = 0.5; k.nod = 0.3;
        }
        stepW(k, dt);
      }
    } else if (m == 'toK') {
      k.sl = 1; if (!(k.fl > 0)) k.sp = k.sp0 * 1.2; k.t = k.A; k.w = 0;
      if ((k.mt -= dt) <= 0) end(2);
      else if (Math.hypot(o.x - k.A[0], o.z - k.A[1]) < 0.25) { k.path = [[KX, 0.06, KZ + 0.75], [KX, 0.06, KZ - 0.1]]; k.mode = 'enter'; k.sl = 0; }
      else stepW(k, dt);
    } else if (m == 'fb') {
      if (!NIGHT || boyK.in || (k.mt -= dt) <= 0) end(rnd(2, 4));
      else {
        const by = boy.rotation.y, tx = boy.position.x - Math.sin(by) * 1.1, tz = boy.position.z - Math.cos(by) * 1.1, dd = Math.hypot(tx - o.x, tz - o.z);
        if (dd > 0.35) { sp(dd > 2 ? 1.6 : 1.1); k.sl = 1; k.t = [tx, tz]; k.w = 0; stepW(k, dt); }
        else turnTo(k.o, boy.position.x + Math.sin(by), boy.position.z + Math.cos(by), Math.min(1, dt * 4));
      }
    } else if (m == 'cheer' || m == 'petted') { if ((k.mt -= dt) <= 0) end(rnd(2, 4)); }
  }

  function petUpdate(a, dt, w) {
    const P = a[0], k = a[1], isCat = P === cat, need = (w.r || 0) >= a[2], o = k.o.position, tm = runtime.tm;
    if (k.fl > 0) { k.fl -= dt; if (k.fl <= 0) k.sp = k.sp0; }
    if (AIR.includes(k.mode)) airMode(k, dt, need);
    else { if (need && k.mode != 'idle') { k.mode = 'idle'; k.mt = 1; k.sl = 0; k.sp = k.sp0; } if (!shel(k, need, dt)) behave(isCat, k, dt, w); }
    if (k.in) { P.zz.visible = false; return; }
    const air = AIR.includes(k.mode), sz = P.g.userData.sz;
    P.g.scale.set(sz, sz * (k.sleep ? 0.65 + Math.sin(tm * 2) * 0.03 : 1), sz);
    P.legs.forEach(l => l.visible = !k.sleep);
    P.zz.visible = !!k.sleep;
    if (k.sleep) P.zz.position.set(o.x, o.y + (isCat ? 0.8 : 1.4) + Math.sin(tm * 2) * 0.08, o.z);
    if (k.pj > 0) k.pj = Math.max(0, k.pj - dt);
    if (k.nod > 0) k.nod = Math.max(0, k.nod - dt);
    if (!air) {
      o.y = App.bridgeY(o.x, o.z) + (k.mv ? Math.abs(Math.sin(k.ph * 1.5)) * 0.04 : 0) + (k.mode == 'cheer' ? Math.abs(Math.sin(tm * 12)) * 0.12 : 0) + (k.pj > 0 ? Math.sin(PI * (1 - k.pj / 0.3)) * 0.3 : 0);
      P.g.rotation.x = k.nod > 0 ? Math.sin(PI * (1 - k.nod / 0.3)) * 0.4 : 0;
    }
    P.legs.forEach((l, i) => l.rotation.x = k.mv ? Math.sin(k.ph * 1.5 + ((i % 2) + (i > 1 ? 1 : 0)) * PI) * 0.6 : 0);
    if (k.mode == 'paw') P.legs[1].rotation.x = -(0.6 + 0.6 * Math.sin(tm * 14));
    P.tl.rotation.z = Math.sin(tm * (k.mv ? 10 : k.mode == 'petted' ? 18 : 4) + k.ph) * 0.5;
  }

  function heroUpdate(dt, w, snowF) {
    const k = heroW, P = hero.position, tm = runtime.tm;
    let petting = false;
    umb.visible = !!(w.r || w.s) || S.precip > 0.2;
    scarf.visible = S.temp < 20 || snowF > 0;
    if (shel(k, !!w.t, dt)) {
      k.mode = 'idle'; k.mt = 1; k.tg = null;
      if (k.in) { hearts.forEach(h => h.visible = false); return; }
    } else {
      k.mv = 0;
      if (k.mode == 'idle') {
        k.sp = 1.3; k.sl = 0; stepW(k, dt);
        if ((k.mt -= dt) <= 0) {
          k.mt = rnd(4, 9); const rr = Math.random();
          if (rr > 0.7) { k.rs = [rnd(2.2, 4.6), 3.6]; k.mode = 'read'; k.mt = 14; k.look = 0; }
          else if (rr < 0.5) {
            const c = [];
            if (catW.mode == 'idle' && !catW.in && !catW.up) c.push([catW.o, catW, 0.95]);
            if (dogW.mode == 'idle' && !dogW.in) c.push([dogW.o, dogW, 1.25]);
            if (!boyK.in && boyK.mode == 'idle') c.push([boy, boyK, 1.5]);
            if (c.length) { k.tg = c[Math.floor(Math.random() * c.length)]; k.mode = 'go'; k.mt = 10; }
          }
        }
      } else if (k.mode == 'read') {
        const g = k.rs, d2 = Math.hypot(g[0] - P.x, g[1] - P.z);
        if (!k.look && d2 > 0.35) { k.sp = 1.5; k.sl = 1; k.t = g; k.w = 0; if ((k.mt -= dt) <= 0) { k.mode = 'idle'; k.mt = rnd(3, 6); } else stepW(k, dt); }
        else { if (!k.look) { k.look = 1; k.mt = rnd(3, 6); } turnTo(hero, P.x, P.z - 5, Math.min(1, dt * 6)); if ((k.mt -= dt) <= 0) { k.mode = 'idle'; k.look = 0; k.mt = rnd(4, 8); } }
      } else if (k.mode == 'go') {
        const g = k.tg, tp = g[0].position, dd = Math.hypot(tp.x - P.x, tp.z - P.z);
        if (g[1].in || g[1].up || g[1].mode != 'idle' || (k.mt -= dt) <= 0) { k.mode = 'idle'; k.mt = rnd(3, 6); k.sl = 0; }
        else if (dd < 0.9) { g[1].mode = g[1] === boyK ? 'cheer' : 'petted'; g[1].mt = rnd(2.5, 4); g[1].w = 0; k.mode = 'pet'; k.sl = 0; }
        else { k.sp = 1.9; k.sl = 1; k.t = [tp.x, tp.z]; k.w = 0; stepW(k, dt); }
      }
      if (k.mode == 'pet') {
        const g = k.tg, tp = g[0].position;
        if (g[1].mode != (g[1] === boyK ? 'cheer' : 'petted') || g[1].in) { k.mode = 'idle'; k.mt = rnd(4, 8); }
        else {
          petting = true; turnTo(hero, tp.x, tp.z, Math.min(1, dt * 8)); turnTo(g[0], P.x, P.z, Math.min(1, dt * 6));
          hearts.forEach((h, i) => {
            const ph = (tm * 0.9 + i * 0.25) % 1;
            h.visible = true; h.position.set(tp.x + Math.sin(i * 2.1) * 0.25, tp.y + g[2] + ph * 0.7, tp.z + Math.cos(i * 2.1) * 0.15);
            h.material.opacity = 1 - ph;
          });
        }
      }
    }
    if (!petting) hearts.forEach(h => h.visible = false);
    heroArms[1].position.lerp(petting ? armUp.set(0.4, 0.62 + 0.12 * Math.sin(tm * 9), 0.45) : armRest, Math.min(1, dt * 10));
    P.y = App.bridgeY(P.x, P.z) + (k.mv ? Math.abs(Math.sin(k.ph)) * 0.07 : 0);
    heroFeet.forEach((f, i) => f.position.z = 0.1 + (k.mv ? Math.sin(k.ph + i * PI) * 0.18 : 0));
  }

  function boyUpdate(dt, w) {
    const k = boyK, P = boy.position, tm = runtime.tm, NIGHT = runtime.NIGHT;
    balls.forEach(b => {
      if (b.st != 'fly') return;
      const m = b.m; b.vy -= 9.8 * dt; m.position.y += b.vy * dt;
      if (m.position.y <= 0.16) { m.position.y = 0.16; if (b.vy < -1.2) b.vy = -b.vy * 0.5; else b.vy = 0; }
      const on = m.position.y <= 0.17 && b.vy == 0, fr = Math.exp(-(on ? 1.4 : 0.1) * dt);
      b.vx *= fr; b.vz *= fr;
      const nx = m.position.x + b.vx * dt, nz = m.position.z + b.vz * dt;
      if (free(nx, m.position.z, 0.15)) m.position.x = nx; else b.vx *= -0.6;
      if (free(m.position.x, nz, 0.15)) m.position.z = nz; else b.vz *= -0.6;
      m.rotation.x += b.vz * dt / 0.16; m.rotation.z -= b.vx * dt / 0.16;
      if (on && Math.hypot(b.vx, b.vz) < 0.08) { b.vx = b.vz = 0; b.st = 'rest'; }
    });
    if (k.jump > 0) k.jump = Math.max(0, k.jump - dt);
    if (shel(k, !!w.t, dt)) {
      if (k.ball) { k.ball.st = 'rest'; k.ball.m.position.set(P.x, 0.16, P.z); k.ball = null; }
      k.mode = 'idle'; k.mt = 1; if (k.in) return;
    } else {
      k.mv = 0;
      if (k.mode == 'idle') {
        k.sp = 1.4; stepW(k, dt);
        if ((k.mt -= dt) <= 0) {
          const r = Math.random(), rest = balls.filter(b => b.st == 'rest'); k.mt = rnd(3, 7);
          if (r > 0.88) { k.rs = [rnd(2.2, 4.6), 3.6]; k.mode = 'read'; k.mt = 14; k.look = 0; }
          else if (NIGHT) { const on = mice.filter(m => m.k.on && m.k.s > 0.5); if (on.length && r < 0.6) { k.mouse = on[Math.floor(Math.random() * on.length)]; k.mode = 'light'; k.mt = rnd(4, 7); } }
          else if (r < 0.3 && rest.length) { k.ball = rest[Math.floor(Math.random() * rest.length)]; k.mode = 'fetch'; k.mt = 10; }
          else if (r < 0.7) {
            const kind = Math.floor(Math.random() * 3), gb = birds.filter(b => b.st == 'ground'), bs = gb.length ? gb : birds;
            k.tg = kind == 0 && !catW.in && !catW.up ? { o: catW.o, pk: catW } : kind == 1 && !dogW.in ? { o: dogW.o, pk: dogW } : { o: bs[Math.floor(Math.random() * bs.length)].g, pk: null };
            k.mode = 'chase'; k.mt = rnd(6, 10);
          }
        }
      } else if (k.mode == 'fetch') {
        const m = k.ball.m;
        if (k.ball.st != 'rest' || (k.mt -= dt) <= 0) { k.mode = 'idle'; k.mt = 1; k.ball = null; }
        else { k.sp = 1.9; k.t = [m.position.x, m.position.z]; k.w = 0; if (Math.hypot(m.position.x - P.x, m.position.z - P.z) < 0.5) { k.ball.st = 'held'; k.mode = 'hold'; k.mt = rnd(0.7, 1.5); } else stepW(k, dt); }
      } else if (k.mode == 'read') {
        const g = k.rs, d2 = Math.hypot(g[0] - P.x, g[1] - P.z);
        if (!k.look && d2 > 0.35) { k.sp = 1.4; k.sl = 1; k.t = g; k.w = 0; if ((k.mt -= dt) <= 0) { k.mode = 'idle'; k.mt = rnd(2, 4); } else stepW(k, dt); }
        else { if (!k.look) { k.look = 1; k.mt = rnd(3, 5); } turnTo(boy, P.x, P.z - 5, Math.min(1, dt * 6)); if ((k.mt -= dt) <= 0) { k.mode = 'idle'; k.look = 0; k.mt = rnd(2, 4); } }
      } else if (k.mode == 'light') {
        const m = k.mouse;
        if (!m || !m.k.on || !NIGHT || (k.mt -= dt) <= 0) { k.mode = 'idle'; k.mt = rnd(2, 5); k.sl = 0; }
        else { const mp = m.g.position, dd = Math.hypot(mp.x - P.x, mp.z - P.z); if (dd > 1.8) { k.sp = 1.2; k.sl = 1; k.t = [mp.x, mp.z]; k.w = 0; stepW(k, dt); } else turnTo(boy, mp.x, mp.z, Math.min(1, dt * 6)); }
      } else if (k.mode == 'hold') {
        k.mt -= dt; k.ball.m.position.set(P.x + Math.sin(boy.rotation.y) * 0.4, 0.75, P.z + Math.cos(boy.rotation.y) * 0.4);
        if (k.mt <= 0) {
          const a = rnd(0, PI * 2), v = rnd(3, 6.5), b = k.ball; boy.rotation.y = a;
          b.m.position.set(P.x + Math.sin(a) * 0.4, 0.9, P.z + Math.cos(a) * 0.4);
          b.vx = Math.sin(a) * v; b.vz = Math.cos(a) * v; b.vy = rnd(3, 5.5); b.st = 'fly'; k.ball = null; k.jump = 0.3; k.mode = 'idle'; k.mt = rnd(0.6, 2.5);
        }
      } else if (k.mode == 'chase') {
        const g = k.tg;
        if (!g || (k.mt -= dt) <= 0 || (g.pk && (g.pk.in || g.pk.up))) { k.mode = 'idle'; k.mt = rnd(2, 5); }
        else {
          const tp = g.o.position, dd = Math.hypot(tp.x - P.x, tp.z - P.z); k.sp = 2.1; k.t = [tp.x, tp.z]; k.w = 0;
          if (g.pk && dd < 2.6) flee(g.pk, P);
          birds.forEach(b => { if (b.st != 'fly' && Math.hypot(b.g.position.x - P.x, b.g.position.z - P.z) < 1.4) { b.sp = chooseSpot(!!w.r || NIGHT); b.st = 'fly'; b.v = rnd(2.6, 3.8); } });
          if (g.pk && dd < 0.7) { k.mode = 'cheer'; k.mt = 1; } else stepW(k, dt);
        }
      } else { k.mt -= dt; if (k.mt <= 0) { k.mode = 'idle'; k.mt = rnd(2, 4); } }
    }
    P.y = App.bridgeY(P.x, P.z) + (k.mv ? Math.abs(Math.sin(k.ph)) * 0.06 : 0) + (k.mode == 'cheer' ? Math.abs(Math.sin(tm * 12)) * 0.25 : 0) + (k.jump > 0 ? Math.sin(PI * (1 - k.jump / 0.3)) * 0.25 : 0);
    boyFeet.forEach((f, i) => f.position.z = 0.1 + (k.mv ? Math.sin(k.ph + i * PI) * 0.2 : 0));
  }

  function birdsUpdate(dt, w, dayOn) {
    const tm = runtime.tm, NIGHT = runtime.NIGHT, rainy = !!w.r || !dayOn;
    birds.forEach(b => {
      const g = b.g, wf = tz => b.wings.forEach(q => q.p.rotation.z += (tz * q.q - q.p.rotation.z) * Math.min(1, dt * 14));
      const look = () => {
        b.look -= dt; if (b.look < 0) { b.ty = rnd(-PI, PI); b.look = rnd(1, 3); }
        let df = b.ty - g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); g.rotation.y += df * Math.min(1, dt * 4);
      };
      if (b.st == 'fly') {
        if (rainy && b.sp.k != 'tree' && b.sp.k != 'roof') b.sp = chooseSpot(true);
        const tp = spotPos(b.sp), bx = tp[0] - g.position.x, by = tp[1] - g.position.y, bz = tp[2] - g.position.z, bd = Math.hypot(bx, by, bz);
        if (bd < 0.2) {
          if (b.sp.k == 'air') b.sp = chooseSpot(rainy);
          else { b.st = b.sp.k == 'ground' ? 'ground' : 'perch'; b.tm = rnd(4, 10); b.sub = 0; b.ss = rnd(1, 2); g.position.set(tp[0], tp[1], tp[2]); g.rotation.x = 0; }
        } else {
          g.scale.y = 1;
          const f = Math.min(1, b.v * Math.min(1, bd / 1.5 + 0.35) * dt / bd);
          g.position.x += bx * f; g.position.y += by * f; g.position.z += bz * f;
          let df = Math.atan2(bx, bz) - g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); g.rotation.y += df * Math.min(1, dt * 3);
          g.rotation.x = -Math.atan2(by, Math.hypot(bx, bz)) * 0.6;
          b.ph += dt * (14 + b.v * 2);
          b.wings.forEach(q => q.p.rotation.z = q.q * Math.sin(b.ph) * 0.7);
        }
      } else if (b.st == 'perch') {
        const tp = spotPos(b.sp); g.position.set(tp[0], tp[1], tp[2]);
        if (NIGHT) { g.rotation.x = 0; g.scale.y = 0.85 + Math.sin(tm * 2 + b.ph) * 0.04; }
        else { look(); g.rotation.x = Math.sin(tm * 3 + b.ph) * 0.05; g.scale.y = 1; }
        wf(-1.1);
        if (!rainy && (b.tm -= dt) <= 0) { b.sp = chooseSpot(false); b.st = 'fly'; b.v = rnd(2.2, 3.6); }
      } else {
        wf(-1.1);
        if (rainy) { b.sp = chooseSpot(true); b.st = 'fly'; return; }
        if (b.sub == 0) {
          g.rotation.x = 0.6 * Math.max(0, Math.sin(tm * 9 + b.ph)); look();
          if ((b.ss -= dt) <= 0) {
            const nx = g.position.x + rnd(-1.4, 1.4), nz = g.position.z + rnd(-1.4, 1.4);
            if (free(nx, nz, 0.3)) { b.sub = 1; b.u = 0; b.h0 = [g.position.x, g.position.z]; b.h1 = [nx, nz]; b.ty = Math.atan2(nx - g.position.x, nz - g.position.z); }
            else b.ss = 0.3;
          }
          if ((b.tm -= dt) <= 0 && b.sub == 0) { b.sp = chooseSpot(false); b.st = 'fly'; b.v = rnd(2.2, 3.6); }
        } else {
          b.u += dt / 0.35; const u = Math.min(1, b.u);
          g.position.x = b.h0[0] + (b.h1[0] - b.h0[0]) * u; g.position.z = b.h0[1] + (b.h1[1] - b.h0[1]) * u;
          g.position.y = 0.19 + Math.sin(PI * u) * 0.3; g.rotation.x = 0;
          let df = b.ty - g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); g.rotation.y += df * Math.min(1, dt * 12);
          wf(-0.5);
          if (u >= 1) { g.position.y = 0.19; b.sub = 0; b.ss = Math.random() < 0.4 ? 0.05 : rnd(1.2, 3); }
        }
      }
    });
  }

  App.livingWorld = {
    update(dt, w, snowF, dayOn) {
      heroUpdate(dt, w, snowF);
      boyUpdate(dt, w);
      pets.forEach(a => petUpdate(a, dt, w));
      birdsUpdate(dt, w, dayOn);
    }
  };
})(window.TownApp);