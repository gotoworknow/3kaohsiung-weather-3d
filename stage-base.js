(function (App) {
  const { PI, cl, rnd, GR, CR, FL, CS, TR, AUT, WIN, FALLC, FALLN, RZ0, RZ1, runtime } = App;

  // 渲染器、場景、鏡頭與基礎燈光
  const R = new THREE.WebGLRenderer({ antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(R.domElement);

  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
  sc.fog = new THREE.Fog(0xffffff, 35, 90);

  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.95 }, o || {}));

  function add(g, m, x, y, z, p) {
    const o = new THREE.Mesh(g, m);
    o.position.set(x || 0, y || 0, z || 0);
    o.castShadow = o.receiveShadow = true;
    (p || sc).add(o);
    return o;
  }

  const hemi = new THREE.HemisphereLight(0xffffff, 0xffe8d0, 0.6);
  sc.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
  sun.shadow.bias = -0.0006;
  sc.add(sun);

  function lab(t, s, col) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const x = c.getContext('2d');
    x.font = 'bold 34px sans-serif';
    x.fillStyle = col || '#6b5a50';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(t, 64, 32);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sp.renderOrder = 100;
    sp.scale.set(s * 2, s, 1);
    return sp;
  }

  function labDyn(w) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const x = c.getContext('2d'), t = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    sp.renderOrder = 100;
    sp.scale.set(w * 2, w, 1);
    let cur = '';
    return {
      sp,
      set(text, col) {
        if (text == cur) return;
        cur = text;
        x.clearRect(0, 0, 128, 64);
        x.font = 'bold 34px sans-serif';
        x.fillStyle = col || '#6b5a50';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(text, 64, 32);
        t.needsUpdate = true;
      }
    };
  }

  function glowTex(c) {
    const k = document.createElement('canvas');
    k.width = k.height = 128;
    const x = k.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, c);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(k);
  }

  function turnTo(o, x, z, r) {
    let df = Math.atan2(x - o.position.x, z - o.position.z) - o.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    o.rotation.y += df * r;
  }

  const tmp = new THREE.Color();
  const concrete = M(0xc9ced4);

  // 地面與切面
  const gM = M(0xb7e39a), soil = M(0xb89572);
  const gMs = M(0xb7e39a, { transparent: true, opacity: 0.35, depthWrite: false });
  const soilS = M(0xb89572, { transparent: true, opacity: 0.35, depthWrite: false });
  const cutShape = rad => { const sh = new THREE.Shape(), th = Math.acos(-9.4 / rad); sh.absarc(0, 0, rad, -th, th, false); return sh; };
  const D11 = [];
  for (let i = 0; i < 160; i++) { const a = i / 160 * PI * 2; D11.push([Math.cos(a) * 11, Math.sin(a) * 11]); }
  const clipP = (P, ins, isc) => {
    const o = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], ia = ins(a), ib = ins(b);
      if (ia) { o.push(a); if (!ib) o.push(isc(a, b)); }
      else if (ib) o.push(isc(a, b));
    }
    return o;
  };
  const clipX = (P, X) => clipP(P, p => p[0] >= X, (a, b) => { const t = (X - a[0]) / (b[0] - a[0]); return [X, a[1] + t * (b[1] - a[1])]; });
  const clipZmax = (P, Z) => clipP(P, p => p[1] <= Z, (a, b) => { const t = (Z - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), Z]; });
  const clipZmin = (P, Z) => clipP(P, p => p[1] >= Z, (a, b) => { const t = (Z - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), Z]; });

  const baseP = clipX(D11, -9.4);
  const RIVP = clipZmax(clipZmin(baseP, RZ0), RZ1);
  [clipZmax(baseP, RZ0), clipZmin(baseP, RZ1)].forEach((P, i) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(P.map(p => new THREE.Vector2(p[0], -p[1]))), { depth: 2.4, bevelEnabled: false });
    g.rotateX(-PI / 2);
    g.translate(0, -2.4, 0);
    add(g, i ? [gMs, soilS] : [gM, soil], 0, 0, 0);
  });

  const farG = new THREE.ShapeGeometry(cutShape(150), 90);
  farG.rotateX(-PI / 2);
  const far = new THREE.Mesh(farG, M(0xa8d99a));
  far.position.y = -2.4;
  far.receiveShadow = true;
  sc.add(far);

  // 道路與水窪
  const rM = M(0xd8cfc5);
  add(new THREE.BoxGeometry(18.6, 0.08, 2.2), rM, 0, 0.04, 4.2);
  for (let i = -4; i <= 4; i++) add(new THREE.BoxGeometry(0.9, 0.09, 0.12), M(0xfff7e6), i * 2, 0.05, 4.2);
  const pud = [[-4, 4.6, 0.9], [1, 3.7, 0.7], [5, 4.5, 1]].map(a => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(a[2], 20), M(0xaed4ff, { roughness: 0.05, transparent: true, opacity: 0.7 }));
    m.rotation.x = -PI / 2;
    m.position.set(a[0], 0.1, a[1]);
    m.scale.y = 0.6;
    sc.add(m);
    return m;
  });

  // 小屋
  const roofM = M(0xf5a39b), winM = M(0xcfeaff, { emissive: 0xffcf70, emissiveIntensity: 0 });
  const house = new THREE.Group();
  house.position.set(-3, 0, -2);
  sc.add(house);
  add(new THREE.BoxGeometry(4, 2.6, 3.4), M(0xfff1dc), 0, 1.3, 0, house);
  const roof = add(new THREE.ConeGeometry(3.15, 1.9, 4), roofM, 0, 3.5, 0, house);
  roof.rotation.y = PI / 4;
  roof.scale.z = 0.8;
  add(new THREE.BoxGeometry(0.8, 1.4, 0.12), M(0xc98f6b), -0.9, 0.7, 1.72, house);
  add(new THREE.BoxGeometry(0.9, 0.8, 0.12), winM, 0.9, 1.5, 1.72, house);
  add(new THREE.BoxGeometry(0.9, 0.8, 0.12), winM, -0.9, 2.0, -1.72, house);
  add(new THREE.BoxGeometry(0.5, 1.2, 0.5), M(0xe7c9a9), 1.1, 3.6, -0.6, house);

  // 障礙物與樹木（樹冠使用 4 組材質以支援秋天混綠效果）
  const INS = [[-9.7, -7.2, 0.5], [1.9, 2.3, 0.6], [3.4, 2.3, 0.6], [4.9, 2.3, 0.6], [5.9, 6.3, 0.6], [6.7, 6.2, 0.6], [-8.6, -1, 1.3], [-7.15, -1.1, 1.7], [7.2, 7.3, 0.5], [0.4, -1.4, 1.1]];
  const trees = [], crMs = [0, 1, 2, 3].map(() => M(0x6ccb79)), trM = M(0x9c6f4e);
  for (let n = 0, tr = 0, N = 4 + Math.floor(Math.random() * 4); n < N && tr < 400; tr++) {
    const a = rnd(0, PI * 2), d = Math.sqrt(Math.random()) * 9, x = Math.cos(a) * d, z = Math.sin(a) * d, sc0 = rnd(0.85, 1.3);
    if (x < -7.4 || z > 1.8 || (x > -5.8 && x < -0.2 && z > -4.4 && z < 0.8)) continue;
    if (INS.some(o => Math.hypot(x - o[0], z - o[1]) < o[2] + 1.2 * sc0) || trees.some(t => Math.hypot(x - t.g.position.x, z - t.g.position.z) < 2.5)) continue;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(sc0);
    sc.add(g);
    const th0 = rnd(1.3, 1.8), rm = rnd(0.9, 1.2), ti = trees.length;
    add(new THREE.CylinderGeometry(0.18, 0.28, th0, 10), trM, 0, th0 / 2, 0, g);
    const cr = [
      [0, th0 + 0.5, 0, rm, ti % 2],
      [rnd(0.5, 0.8), th0 + rnd(0.1, 0.4), rnd(-0.4, 0.4), rm * rnd(0.6, 0.8), (ti + 1) % 2 ? 2 : 3],
      [-rnd(0.5, 0.8), th0 + rnd(0, 0.3), rnd(-0.4, 0.4), rm * rnd(0.6, 0.8), ti % 3 == 0 ? 2 : 0]
    ].map(c => add(new THREE.SphereGeometry(c[3], 20, 16), crMs[c[4]], c[0], c[1], c[2], g));
    trees.push({ g, cr, ph: rnd(0, 6), th: th0 });
    n++;
  }

  // 樹木四季：枝條、果實、飄落葉與地面落葉
  const ell = (rx, ry) => { const g = new THREE.CircleGeometry(1, 14); g.scale(rx, ry, 1); return g; };
  const lfM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  const Dm = new THREE.Object3D(), Vy = new THREE.Vector3(0, 1, 0), brM = M(0x7a5f4a);
  const frM = [M(0xe8413c, { roughness: 0.5 }), M(0xf79a3a, { roughness: 0.5 })];

  trees.forEach(t => {
    const th0 = t.th;
    for (let i = 0; i < 9; i++) {
      const a = rnd(0, PI * 2), L = rnd(0.9, 1.7), dir = new THREE.Vector3(Math.cos(a), rnd(0.5, 1.1), Math.sin(a)).normalize();
      const bg = new THREE.CylinderGeometry(0.02, 0.05, L, 5);
      bg.translate(0, L / 2, 0);
      const b = new THREE.Mesh(bg, brM);
      b.position.set(0, th0 * rnd(0.5, 1), 0);
      b.quaternion.setFromUnitVectors(Vy, dir);
      b.castShadow = true;
      t.g.add(b);
      const d2 = new THREE.Vector3(dir.x + rnd(-0.8, 0.8), dir.y + rnd(-0.2, 0.5), dir.z + rnd(-0.8, 0.8)).normalize();
      const tg = new THREE.CylinderGeometry(0.012, 0.03, L * 0.5, 4);
      tg.translate(0, L * 0.25, 0);
      const w2 = new THREE.Mesh(tg, brM);
      w2.position.copy(dir).multiplyScalar(L * 0.6).add(b.position);
      w2.quaternion.setFromUnitVectors(Vy, d2);
      w2.castShadow = true;
      t.g.add(w2);
    }
    t.fr = [];
    for (let i = 0; i < 8; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), frM[i % 2]);
      f.castShadow = true;
      f.visible = false;
      t.g.add(f);
      t.fr.push(f);
    }
  });

  const litter = new THREE.InstancedMesh(ell(0.11, 0.14), lfM, 140);
  litter.setColorAt(0, new THREE.Color(0xffffff));
  litter.count = 0;
  sc.add(litter);

  const NFALL = 110, fall = new THREE.InstancedMesh(ell(0.09, 0.12), lfM, NFALL);
  fall.setColorAt(0, new THREE.Color(0xffffff));
  sc.add(fall);
  const fx = [], fy = [], fz = [], fv = [], fph = [], frs = [];
  for (let i = 0; i < NFALL; i++) {
    fx.push(0); fy.push(0.04); fz.push(0); fv.push(rnd(0.5, 1)); fph.push(rnd(0, 6)); frs.push(rnd(0, 8));
    fall.setColorAt(i, new THREE.Color(AUT[i % 3]));
  }

  function spawnLeaf(i) {
    const t = trees[Math.floor(Math.random() * trees.length)];
    const c = t.cr[Math.floor(Math.random() * t.cr.length)];
    const rad = c.geometry.parameters.radius * 0.95;
    const d = new THREE.Vector3(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)).normalize();
    const S1 = t.g.scale.x;
    fx[i] = t.g.position.x + (c.position.x + d.x * rad) * S1;
    fy[i] = (c.position.y + d.y * rad) * S1;
    fz[i] = t.g.position.z + (c.position.z + d.z * rad) * S1;
    fv[i] = rnd(0.5, 1);
  }

  function fallUpdate(dt, wd, dx, dz, on) {
    const tm = runtime.tm;
    fall.count = on;
    if (!on) return;
    for (let i = 0; i < on; i++) {
      let rest = fy[i] <= 0.045;
      if (rest) {
        frs[i] -= dt;
        if (frs[i] <= 0) spawnLeaf(i);
      } else {
        fy[i] -= fv[i] * dt;
        fx[i] += (dx * wd * 0.05 + Math.sin(tm * 1.6 + fph[i]) * 0.4) * dt;
        fz[i] += (dz * wd * 0.05 + Math.cos(tm * 1.3 + fph[i]) * 0.3) * dt;
        if (fy[i] <= 0.045) { fy[i] = 0.04; frs[i] = rnd(3, 8); }
      }
      Dm.position.set(fx[i], fy[i], fz[i]);
      Dm.scale.setScalar(1);
      rest = fy[i] <= 0.045;
      if (rest) Dm.rotation.set(-PI / 2, 0, fph[i]);
      else Dm.rotation.set(Math.sin(tm * 2 + fph[i]), tm * 1.5 + fph[i], Math.sin(tm * 1.7 + fph[i]));
      Dm.updateMatrix();
      fall.setMatrixAt(i, Dm.matrix);
    }
    fall.instanceMatrix.needsUpdate = true;
  }

  function treeSeason(se) {
    const cs = CS[se];
    const fp = FALLC[se];
    for (let i = 0; i < NFALL; i++) fall.setColorAt(i, tmp.set(fp[i % fp.length]));
    fall.instanceColor.needsUpdate = true;

    trees.forEach(t => {
      t.fr.forEach(f => {
        f.visible = se == 'summer';
        if (f.visible) {
          const c = t.cr[Math.floor(Math.random() * t.cr.length)];
          const rad = c.geometry.parameters.radius * cs;
          const d = new THREE.Vector3(rnd(-1, 1), rnd(-0.5, 0.6), rnd(-1, 1)).normalize();
          f.position.copy(c.position).addScaledVector(d, rad * 1.02);
        }
      });
    });

    const n = se == 'winter' ? 140 : se == 'autumn' ? 45 : 20;
    const pal = se == 'winter' ? WIN : se == 'autumn' ? AUT : FALLC[se];
    litter.count = n;
    for (let i = 0; i < n; i++) {
      let x, z;
      do {
        const a = rnd(0, PI * 2), r = Math.sqrt(Math.random()) * 9.3;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      } while ((x > -5.4 && x < -0.6 && z > -3.9 && z < 0.2) || (z > 3 && z < 5.4) || x < -9.1 || z > 7.2);
      Dm.position.set(x, 0.035, z);
      Dm.rotation.set(-PI / 2, 0, rnd(0, PI * 2));
      Dm.scale.setScalar(rnd(0.8, 1.3));
      Dm.updateMatrix();
      litter.setMatrixAt(i, Dm.matrix);
      litter.setColorAt(i, tmp.set(pal[i % pal.length]));
    }
    litter.instanceMatrix.needsUpdate = true;
    if (litter.instanceColor) litter.instanceColor.needsUpdate = true;
  }

  // 花與小草
  const fl = [], tuft = [];
  for (let i = 0; i < 110; i++) {
    const a = rnd(0, PI * 2), r = Math.sqrt(Math.random()) * 9.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (x < -9.1 || z > 7.2 || (z > 2.9 && z < 5.5) || (x > -5.3 && x < -0.7 && z > -3.9 && z < 0.1)) continue;
    if (i % 3 == 0) fl.push(add(new THREE.SphereGeometry(0.1, 8, 8), M(0xffffff), x, 0.12, z));
    else tuft.push(add(new THREE.ConeGeometry(0.12, 0.35, 6), M(0x86d36f), x, 0.17, z));
  }

  // 障礙物與可行走區域判定（含愛河小橋與南岸草地）
  const OBS = INS.concat(trees.map(t => [t.g.position.x, t.g.position.z, 0.7 * t.g.scale.x]));
  const free = (x, z, r) => {
    if (Math.abs(x) <= Math.max(0.25, 0.8 - r * 0.65) && z > 7.55 - r && z < 10.55) return true;
    if (z >= 9.8 + r * 0.4 && x * x + z * z <= (10.8 - r * 0.5) ** 2 && (z >= 10.25 || Math.abs(x) >= 0.85 + r * 0.4)) return true;
    if (x * x + z * z > 9.4 * 9.4 || x - r < -9.2 || z + r > 7.55) return false;
    if (x > -5.3 - r && x < -0.7 + r && z > -3.9 - r && z < 0.2 + r) return false;
    return OBS.every(o => Math.hypot(x - o[0], z - o[1]) > o[2] + r);
  };
  const pick = r => {
    for (let i = 0; i < 60; i++) {
      let x, z;
      if (Math.random() < 0.14) {
        x = rnd(-3.5, 3.5);
        z = rnd(9.8, 10.65);
      } else {
        const a = rnd(0, PI * 2), d = Math.sqrt(Math.random()) * 9;
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
      }
      if (free(x, z, r)) return [x, z];
    }
    return [0, 5];
  };

  // 路燈
  const lampM = M(0x4b4f5c), shadeM = M(0x3f6b5a);
  const lamps = [-7.9, 0.9, 6.2].map(x => {
    const g = new THREE.Group();
    g.position.set(x, 0, 2.7);
    sc.add(g);
    add(new THREE.CylinderGeometry(0.06, 0.1, 4.6, 10), lampM, 0, 2.3, 0, g);
    add(new THREE.BoxGeometry(0.07, 0.07, 0.6), lampM, 0, 4.6, 0.28, g);
    add(new THREE.ConeGeometry(0.46, 0.32, 18), shadeM, 0, 4.78, 0.55, g);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), lampM, 0, 4.64, 0.55, g);
    const hd = add(new THREE.SphereGeometry(0.17, 12, 10), M(0xfff2c0, { emissive: 0xffcf70, emissiveIntensity: 0 }), 0, 4.45, 0.55, g);
    const pl = new THREE.PointLight(0xffd596, 0, 13, 1.4);
    pl.position.set(0, 4.35, 0.55);
    g.add(pl);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,225,150,.9)'), transparent: true, fog: false, depthWrite: false, opacity: 0 }));
    gl.scale.setScalar(2.6);
    gl.position.set(0, 4.45, 0.55);
    g.add(gl);
    OBS.push([x, 2.7, 0.3]);
    return { pl, hd, gl };
  });

  // 長草叢（單一 InstancedMesh，關閉 castShadow，支援季節混色）
  const grassMat = M(0xffffff, { side: THREE.DoubleSide });
  const bladeG = new THREE.ConeGeometry(0.06, 1, 4);
  bladeG.translate(0, 0.5, 0);
  const blades = [], clumps = [];

  for (let n = 0, tr = 0, N = 12 + Math.floor(Math.random() * 6); n < N && tr < 500; tr++) {
    const p = pick(0.9);
    if (p[1] > 2.1 && p[1] < 6.3) continue;
    if (clumps.some(c => Math.hypot(c.x - p[0], c.z - p[1]) < 1.7)) continue;
    const bl = [], cnt = 24 + Math.floor(Math.random() * 16);
    for (let i = 0; i < cnt; i++) {
      const a = rnd(0, PI * 2), r = Math.random() * 0.6;
      const b = {
        idx: blades.length,
        x: p[0] + Math.cos(a) * r,
        z: p[1] + Math.sin(a) * r,
        h: rnd(0.55, 0.9) * (1 - r * 0.35),
        ph: rnd(0, 6),
        s: rnd(0.75, 1.25),
        tone: [0.8, 0.9, 1][i % 3],
        mix: Math.random()
      };
      blades.push(b);
      bl.push(b);
    }
    clumps.push({ x: p[0], z: p[1], bl });
    n++;
  }

  const grassInst = new THREE.InstancedMesh(bladeG, grassMat, Math.max(1, blades.length));
  grassInst.count = blades.length;
  grassInst.castShadow = false;
  grassInst.frustumCulled = false;
  blades.forEach((b, i) => {
    Dm.position.set(b.x, 0, b.z);
    Dm.rotation.set(0, 0, 0);
    Dm.scale.set(1, b.h, 1);
    Dm.updateMatrix();
    grassInst.setMatrixAt(i, Dm.matrix);
    grassInst.setColorAt(i, tmp.setRGB(b.tone, b.tone, b.tone));
  });
  grassInst.instanceMatrix.needsUpdate = true;
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  sc.add(grassInst);

  App.onNightUpdate((dt, w, LV) => {
    lamps.forEach(l => {
      l.pl.intensity = 1.3 * LV;
      l.hd.material.emissiveIntensity = 1.3 * LV;
      l.gl.material.opacity = 0.85 * LV;
      l.gl.visible = LV > 0.02;
    });
  });

  let pSeason = '', pGrassKey = '';

  App.renderer = R;
  App.cv = R.domElement;
  App.sc = sc;
  App.cam = cam;
  App.hemi = hemi;
  App.sun = sun;
  App.tmp = tmp;
  App.M = M;
  App.add = add;
  App.lab = lab;
  App.labDyn = labDyn;
  App.glowTex = glowTex;
  App.turnTo = turnTo;
  App.concrete = concrete;
  App.RIVP = RIVP;
  App.far = far;
  App.free = free;
  App.pick = pick;
  App.stage = {
    trees,
    clumps,
    update(dt, w, season, snowF, wet, light, gray, wd, dx, dz) {
      const tm = runtime.tm;
      winM.emissiveIntensity = cl((1 - light) * 1.0 + gray * 0.4, 0, 1);

      if (pSeason != season) {
        pSeason = season;
        treeSeason(season);
        const fc = FL[season];
        fl.forEach((f, i) => {
          f.visible = fc.length > 0;
          if (fc.length) f.material.color.set(fc[i % fc.length]);
        });
      }

      gM.color.set(GR[season]).lerp(tmp.set(0xf4f8fb), snowF * 0.85);
      gMs.color.copy(gM.color);
      trM.color.set(TR[season]);

      const crPal = Array.isArray(CR[season]) ? CR[season] : [CR[season], CR[season], CR[season], CR[season]];
      crMs.forEach((m, i) => m.color.set(crPal[i]).lerp(tmp.set(0xffffff), w.s ? 0.8 : 0));
      roofM.color.set(0xf5a39b).lerp(tmp.set(0xffffff), snowF * 0.9);

      const grassKey = season + '|' + snowF;
      if (grassKey != pGrassKey) {
        pGrassKey = grassKey;
        const cDry = new THREE.Color(0xc7ad6e);
        const cAutG1 = new THREE.Color(0x9ec45a);
        const cAutG2 = new THREE.Color(0xb5cb5e);
        const cSnow = new THREE.Color(0xf4f8fb);

        tuft.forEach((f, i) => {
          f.material.color.copy(gM.color);
          if (season == 'autumn' && i % 5 < 2) f.material.color.copy(i % 2 ? cAutG1 : cAutG2).lerp(cSnow, snowF * 0.85);
          else if (season == 'winter' && i % 3 == 0) f.material.color.lerp(cDry, 0.45 * (1 - snowF * 0.85));
          f.material.color.multiplyScalar(0.9);
        });

        if (blades.length) {
          blades.forEach((b, i) => {
            const col = new THREE.Color().copy(gM.color);
            if (season == 'autumn' && b.mix < 0.45) {
              col.copy(b.mix < 0.22 ? cAutG1 : cAutG2).lerp(cSnow, snowF * 0.85);
            } else if (season == 'winter' && b.mix < 0.45) {
              col.lerp(cDry, 0.5 * (1 - snowF * 0.85));
            }
            col.multiplyScalar(b.tone);
            grassInst.setColorAt(i, col);
          });
          if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
        }
      }

      rM.color.set(0xd8cfc5).lerp(tmp.set(0x8f95a3), wet).lerp(tmp.set(0xf2f6fa), snowF * 0.9);
      rM.roughness = 0.95 - 0.7 * wet;
      pud.forEach(p => p.visible = wet > 0.4 && snowF < 0.5);

      const cs = CS[season];
      trees.forEach(t => {
        t.g.rotation.z = Math.sin(tm * 1.6 + t.ph) * (0.008 + wd * 0.0016);
        t.g.rotation.x = Math.cos(tm * 1.3 + t.ph) * (0.006 + wd * 0.001);
        t.cr.forEach(c => {
          c.scale.setScalar(c.scale.x + (cs - c.scale.x) * 0.05);
          c.visible = c.scale.x > 0.06;
        });
      });

      fallUpdate(dt, wd, dx, dz, FALLN[season]);

      if (blades.length) {
        const ls = cl(wd / 40, 0, 1), lean = 0.06 + ls * 0.75, fr = 1.3 + wd * 0.12;
        clumps.forEach(c => {
          if (c.sk > 0) c.sk = Math.max(0, c.sk - dt * 0.7);
          c.bl.forEach(b => {
            const A = lean * b.s + Math.sin(tm * fr + b.ph + c.x * 0.4) * (0.05 + ls * 0.22) + (c.sk || 0) * Math.sin(tm * 22 + b.ph) * 0.35;
            const P = Math.sin(tm * fr * 0.7 + b.ph * 2) * (0.03 + ls * 0.06);
            Dm.position.set(b.x, 0, b.z);
            Dm.rotation.set(A * dz + P * dx, 0, -(A * dx - P * dz));
            Dm.scale.set(1, b.h, 1);
            Dm.updateMatrix();
            grassInst.setMatrixAt(b.idx, Dm.matrix);
          });
        });
        grassInst.instanceMatrix.needsUpdate = true;
      }
    }
  };
})(window.TownApp);