(function (App) {
  const { PI, WK, S, RZ0, RZ1, RZC, runtime, rnd, fmt, sgn, midTW } = App;
  const { sc, M, add, labDyn, glowTex, concrete, RIVP, climate } = App;

  // ========== 西側高雄港：海面、碼頭、潮位尺 ==========
  add(new THREE.BoxGeometry(0.5, 2.4, 167.6), concrete, -9.7, -1.2, -76.2).castShadow = false;
  add(new THREE.BoxGeometry(0.5, 2.4, 150.4), concrete, -9.7, -1.2, 84.8).castShadow = false;

  const seaBig = new THREE.Mesh(new THREE.PlaneGeometry(170, 340), M(0x4aa3c8, { roughness: 0.5 }));
  seaBig.rotation.x = -PI / 2;
  seaBig.position.set(-94.95, -1.2, 0);
  sc.add(seaBig);

  const seaPatch = new THREE.Mesh(new THREE.PlaneGeometry(40, 40, 40, 40), M(0x58b4d8, { roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.93 }));
  seaPatch.rotation.x = -PI / 2;
  seaPatch.position.set(-29.95, -1.15, 0);
  seaPatch.receiveShadow = true;
  sc.add(seaPatch);

  [-5.4, -6.4].forEach(z => add(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 10), M(0xe0b94a), -9.1, 0.17, z));
  [-3, -1, 1, 3].forEach(z => { add(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8), M(0x2b2b2b), -10.02, -0.75, z).castShadow = false; });

  const stf = new THREE.Group();
  stf.position.set(-10.15, 0, -7.2);
  sc.add(stf);
  for (let i = 0; i < 12; i++) add(new THREE.BoxGeometry(0.14, 0.2, 0.14), M(i % 2 ? 0xffffff : 0xe0566b), 0, -2.3 + i * 0.2 + 0.1, 0, stf);
  const stfTk = [-0.5, -0.25, 0, 0.25, 0.5].map(v => {
    const d = labDyn(0.38);
    d.set((v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2), v == 0 ? '#3b82c4' : '#2d6a8a');
    d.sp.position.set(-0.55, 0, 0);
    stf.add(d.sp);
    const k = add(new THREE.BoxGeometry(0.22, 0.035, 0.035), M(v == 0 ? 0x3b82c4 : 0x333840), -0.18, 0, 0, stf);
    return { v, d, k };
  });

  // ========== 貨櫃船、貨櫃堆場與觀光遊艇 ==========
  const shipLs = [], shipWinM = M(0x2b3a55, { emissive: 0xffd27a, emissiveIntensity: 0 });
  const ship = new THREE.Group();
  ship.position.set(-11.3, 0, 0);
  sc.add(ship);
  {
    const sh = new THREE.Shape();
    [[-1.2, -5.25], [1.2, -5.25], [1.2, 3.2], [0, 5.25], [-1.2, 3.2]].forEach((q, i) => (i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false });
    g.rotateX(-PI / 2); g.translate(0, -0.8, 0);
    add(g, [M(0x7a828c), M(0x2d4f7c)], 0, 0, 0, ship);
    add(new THREE.BoxGeometry(2, 1.5, 1.4), M(0xf4f4f4), 0, 1.45, 4, ship);
    add(new THREE.BoxGeometry(2.04, 0.28, 1.44), shipWinM, 0, 1.85, 4, ship);
    add(new THREE.CylinderGeometry(0.3, 0.35, 1, 12), M(0xe0566b), 0, 2.7, 4.45, ship);
    const lampL2 = (c, gc, x, y, z, sz) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(sz, 8, 6), new THREE.MeshBasicMaterial({ color: 0x666b78 }));
      m.position.set(x, y, z); ship.add(m);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(gc), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      gl.scale.setScalar(sz * 16); gl.position.copy(m.position); ship.add(gl);
      shipLs.push({ m, g: gl, c });
    };
    [-3, -1, 1, 3].forEach(z => [-1.17, 1.17].forEach(x => lampL2(0xfff2b0, 'rgba(255,235,170,.95)', x, 0.85, z, 0.07)));
  }

  const cPal = [0xd64545, 0x3b82c4, 0xf2b134, 0x4caf50, 0xe8e8e8, 0xf28c1f].map(c => M(c, { roughness: 0.7 }));
  const cG = new THREE.BoxGeometry(0.66, 0.46, 0.92);
  const mkC = () => { const m = new THREE.Mesh(cG, cPal[Math.floor(Math.random() * 6)]); m.castShadow = true; return m; };
  const shipSt = [], yardSt = [];
  for (let i = 0; i < 6; i++) {
    for (let a = -1; a <= 1; a++) {
      const st = { kind: 'ship', lx: a * 0.72, lz: -2.8 + i * 0.95, list: [] }, h = Math.floor(Math.random() * 4);
      for (let l = 0; l < h; l++) { const c = mkC(); c.position.set(st.lx, 0.95 + l * 0.47, st.lz); ship.add(c); st.list.push(c); }
      shipSt.push(st);
    }
  }
  add(new THREE.BoxGeometry(1, 0.03, 4.3), M(0x9aa0a8), -7.15, 0.015, -1.1).castShadow = false;
  [-2.6, -1.6, -0.6, 0.4].forEach(z => {
    const st = { kind: 'yard', x: -7.15, z, list: [] }, h = Math.floor(Math.random() * 3);
    for (let l = 0; l < h; l++) { const c = mkC(); c.position.set(st.x, 0.23 + l * 0.47, z); sc.add(c); st.list.push(c); }
    yardSt.push(st);
  });

  const yachtWinM = M(0x2b4a7a, { emissive: 0xffd27a, emissiveIntensity: 0 });
  const yacht = new THREE.Group();
  yacht.position.set(-17.5, 0, 0); yacht.visible = false; sc.add(yacht);
  {
    const sh = new THREE.Shape();
    [[-1, -3.2], [1, -3.2], [1, 1.8], [0, 3.4], [-1, 1.8]].forEach((q, i) => (i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false });
    g.rotateX(-PI / 2); g.translate(0, -0.5, 0);
    const wh = M(0xf8f8f8);
    add(g, [M(0xe4eaee), wh], 0, 0, 0, yacht);
    [-1, 1].forEach(x => add(new THREE.BoxGeometry(0.04, 0.1, 4.6), M(0x2d6a8a), x * 1.005, 0.05, -0.1, yacht));
    add(new THREE.BoxGeometry(1.7, 0.7, 4), wh, 0, 0.85, 0.4, yacht);
    add(new THREE.BoxGeometry(1.74, 0.28, 3.6), yachtWinM, 0, 0.9, 0.4, yacht);
    add(new THREE.BoxGeometry(1.5, 0.6, 2.6), wh, 0, 1.5, 0.2, yacht);
    add(new THREE.BoxGeometry(1.54, 0.24, 2.3), yachtWinM, 0, 1.55, 0.2, yacht);
    add(new THREE.BoxGeometry(1.7, 0.08, 3), M(0x7ec8ff), 0, 1.85, 0.2, yacht);
    [-1.2, 1.6].forEach(z => [-0.7, 0.7].forEach(x => add(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 5), M(0xdadde2), x, 2.05, z, yacht)));
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), M(0xdadde2), 0, 2.3, 0.2, yacht);
    add(new THREE.BoxGeometry(0.34, 0.2, 0.02), M(0xe0566b), 0.18, 2.6, 0.2, yacht);
    [-1.9, -2.3, -2.7].forEach(z => {
      const hw = (z + 3.4) / 1.6 - 0.06;
      [-hw, hw].forEach(x => add(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), M(0xdadde2), x, 0.65, z, yacht));
    });
  }

  // ========== 起重架與每週排程 ==========
  const crane = new THREE.Group();
  crane.position.set(-8.6, 0, -1); sc.add(crane);
  const craneM = M(0xe8663d), dkM = M(0x4b4f5c);
  [[-0.8, -0.7], [-0.8, 0.7], [0.8, -0.7], [0.8, 0.7]].forEach(q => add(new THREE.BoxGeometry(0.2, 4.3, 0.2), craneM, q[0], 2.15, q[1], crane));
  [-0.8, 0.8].forEach(x => add(new THREE.BoxGeometry(0.22, 0.22, 1.6), craneM, x, 4.3, 0, crane));
  [-0.7, 0.7].forEach(z => { add(new THREE.BoxGeometry(5.4, 0.26, 0.26), craneM, -1, 4.45, z, crane); add(new THREE.BoxGeometry(1.8, 0.14, 0.14), craneM, 0, 1.9, z, crane); });
  add(new THREE.BoxGeometry(0.9, 0.6, 1.1), dkM, 0.9, 4.9, 0, crane);
  const trol = add(new THREE.BoxGeometry(0.7, 0.2, 1.6), dkM, 0, 4.2, 0, crane);
  const spr = new THREE.Group(); crane.add(spr);
  add(new THREE.BoxGeometry(0.75, 0.08, 1), dkM, 0, 0, 0, spr);
  const cabG = new THREE.CylinderGeometry(0.015, 0.015, 1, 5), cabs = [-0.35, 0.35].map(z => add(cabG, dkM, 0, 2, z, crane));

  const cLt = [[-2.8, 2.6], [1.35, 2.2]].map(a => {
    const sp = new THREE.SpotLight(0xfff2cc, 0, 9, 0.7, 0.5, 1.2);
    sp.position.set(a[0], 4.3, 0); crane.add(sp);
    const tg = new THREE.Object3D(); tg.position.set(a[0], 0, 0); crane.add(tg); sp.target = tg;
    add(new THREE.BoxGeometry(0.3, 0.18, 0.34), dkM, a[0], 4.28, 0, crane);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.28), new THREE.MeshBasicMaterial({ color: 0xffffee }));
    lens.position.set(a[0], 4.17, 0); crane.add(lens);
    const bg = new THREE.ConeGeometry(1, 1, 16, 1, true); bg.translate(0, -0.5, 0);
    const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.set(a[0], 4.17, 0); beam.scale.set(a[1] * 0.45, 4.3, a[1] * 0.45); crane.add(beam);
    return { sp, beam };
  });

  const cs = { st: 'wait', t: 2, ph: 0, tx: -2.7, hy: 3.3, src: null, dst: null, c: null }, HT = 3.3;
  let curDay = -1, craneMode = 'ops', shipCap = 3, yardCap = 3, lastV = '';
  const lockLamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  lockLamp.position.set(0.9, 5.35, 0); lockLamp.visible = false; crane.add(lockLamp);

  const slotPos = (k, l) => (k.kind == 'ship' ? ship.localToWorld(new THREE.Vector3(k.lx, 0.95 + l * 0.47, k.lz)) : new THREE.Vector3(k.x, 0.23 + l * 0.47, k.z));
  function craneChoose() {
    const pk = a => a[Math.floor(Math.random() * a.length)];
    let src, dst;
    if (craneMode == 'tidy') {
      const ys = yardSt.filter(k => k.list.length).sort((a, b) => b.list.length - a.list.length);
      const yp = yardSt.filter(k => k.list.length < yardCap).sort((a, b) => a.list.length - b.list.length);
      if (!ys.length || !yp.length || ys[0].list.length - yp[0].list.length < 2) return false;
      src = ys[0]; dst = yp[0];
    } else if (craneMode == 'ops') {
      if (Math.abs(ship.position.x + 11.3) > 0.2) return false;
      const sf = shipSt.filter(k => k.list.length), yf = yardSt.filter(k => k.list.length);
      const sp = shipSt.filter(k => k.list.length < shipCap), yp = yardSt.filter(k => k.list.length < yardCap);
      const r = Math.random();
      if (r < 0.35 && sf.length && yp.length) { src = pk(sf); dst = pk(yp); }
      else if (r < 0.7 && yf.length && sp.length) { src = pk(yf); dst = pk(sp); }
      else if (sf.length && sp.length > 1) { src = pk(sf); dst = pk(sp.filter(k => k !== src)); }
      else if (sf.length && yp.length) { src = pk(sf); dst = pk(yp); }
      else if (yf.length && sp.length) { src = pk(yf); dst = pk(sp); }
      else return false;
    } else return false;
    cs.src = src; cs.dst = dst; cs.ph = 0; cs.st = 'run';
    return true;
  }

  function craneUpdate(dt, w) {
    ship.updateMatrixWorld(true);
    if (cs.st == 'wait') {
      cs.t -= dt;
      if (cs.t <= 0 && (w.t || S.wind > 45 || !craneChoose())) cs.t = 2;
      if (craneMode == 'off' || craneMode == 'locked') {
        const m = 1.6 * dt, tt = craneMode == 'locked' ? 0.9 : -1.2;
        crane.position.z += Math.max(-m, Math.min(m, -1 - crane.position.z));
        cs.tx += Math.max(-2 * dt, Math.min(2 * dt, tt - cs.tx));
        cs.hy = Math.min(HT, cs.hy + 1.8 * dt);
      }
    } else {
      const P = cs.ph;
      let done = false;
      if (P == 0 || P == 4 || P == 8) { cs.hy = Math.min(HT, cs.hy + (P == 4 ? 1.4 : 1.8) * dt); done = cs.hy >= HT - 0.01; }
      else if (P == 1 || P == 5 || P == 2 || P == 6) {
        const k = P < 4 ? cs.src : cs.dst, pp = slotPos(k, P < 4 ? k.list.length - 1 : k.list.length);
        const dz = pp.z - crane.position.z, dx = pp.x - crane.position.x - cs.tx;
        if (P == 1 || P == 5) {
          const m = 1.6 * dt, m2 = 2 * dt;
          crane.position.z += Math.max(-m, Math.min(m, dz));
          cs.tx += Math.max(-m2, Math.min(m2, dx));
          done = Math.abs(dz) < 0.03 && Math.abs(dx) < 0.03;
        } else {
          const d = pp.y + 0.27 - cs.hy, m = 1.5 * dt;
          cs.hy += Math.max(-m, Math.min(m, d));
          done = Math.abs(d) < 0.02;
        }
      } else if (P == 3) {
        const c = cs.src.list.pop(); cs.c = c; spr.attach(c); c.position.set(0, -0.27, 0); c.rotation.set(0, 0, 0); done = true;
      } else if (P == 7) {
        const c = cs.c, k = cs.dst;
        if (k.kind == 'ship') { ship.add(c); c.position.set(k.lx, 0.95 + k.list.length * 0.47, k.lz); }
        else { sc.add(c); c.position.set(k.x, 0.23 + k.list.length * 0.47, k.z); }
        c.rotation.set(0, 0, 0); k.list.push(c); cs.c = null; done = true;
      }
      if (done && ++cs.ph > 8) { cs.st = 'wait'; cs.t = rnd(1.5, 4); }
    }
    lockLamp.visible = craneMode == 'locked' && Math.sin(runtime.tm * 5) > 0;
    trol.position.x = cs.tx;
    spr.position.set(cs.tx, cs.hy, 0);
    cabs.forEach(c => { const L = 4.1 - cs.hy; c.scale.y = L; c.position.set(cs.tx, cs.hy + L / 2, c.position.z); });
  }

  // ========== 港邊 3D 潮汐公佈欄 ==========
  const hGrp = new THREE.Group();
  hGrp.position.set(-9.7, 0, -7.2); hGrp.rotation.y = -PI / 2; hGrp.scale.setScalar(0.85); sc.add(hGrp);
  {
    const wd2 = M(0xb98a5a);
    [-2, 2].forEach(x => add(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 8), wd2, x, 1.2, -0.1, hGrp));
    add(new THREE.BoxGeometry(4.8, 3, 0.14), wd2, 0, 2.1, 0, hGrp);
    add(new THREE.BoxGeometry(5.1, 0.16, 0.55), M(0x2d6a8a), 0, 3.7, 0, hGrp);
  }
  const hc2 = document.createElement('canvas'); hc2.width = 800; hc2.height = 480;
  const hCtx = hc2.getContext('2d'), hTex = new THREE.CanvasTexture(hc2);
  const hScr = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.7), new THREE.MeshBasicMaterial({ map: hTex }));
  hScr.position.set(0, 2.1, 0.09); hGrp.add(hScr);
  const hBulb = add(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf1e6cc }), 0, 3.52, 0.35, hGrp);
  hBulb.castShadow = false;
  const hLamp = new THREE.PointLight(0xffd890, 0, 7, 1.6); hLamp.position.set(0, 3.4, 0.7); hGrp.add(hLamp);
  let hKey = '';

  function drawHarbor() {
    const TE = climate.tide.info, TDsrc = climate.tide.src;
    const key = TDsrc + '|' + TE.hi.t.toFixed(2) + '|' + TE.ev.length + '|' + Math.floor(S.T * 6);
    if (key == hKey) return;
    hKey = key;

    const tbl = App.$('tide-table');
    if (tbl) tbl.innerHTML = TE.ev.map(e => '<span style="color:' + (e.k == '高' ? '#e0566b' : '#3b82c4') + '">' + (e.k == '高' ? '▲ 高潮' : '▼ 低潮') + ' ' + fmt(e.t) + ' ' + sgn(e.h) + '</span>').join('　');

    hCtx.fillStyle = '#eaf6ff'; hCtx.fillRect(0, 0, 800, 480);
    hCtx.fillStyle = '#2d6a8a'; hCtx.fillRect(0, 0, 800, 64);
    hCtx.textBaseline = 'middle'; hCtx.fillStyle = '#ffffff'; hCtx.font = 'bold 36px sans-serif'; hCtx.textAlign = 'left';
    hCtx.fillText('⚓ 高雄港 今日潮汐表', 24, 34);
    const d = new Date(midTW() + 12 * 36e5);
    hCtx.textAlign = 'right'; hCtx.font = '28px sans-serif';
    hCtx.fillText((d.getUTCMonth() + 1) + '/' + d.getUTCDate(), 776, 34);

    hCtx.textAlign = 'left'; hCtx.fillStyle = '#8a7a6e'; hCtx.font = 'bold 22px sans-serif';
    hCtx.fillText('潮別', 24, 92); hCtx.fillText('時間', 170, 92); hCtx.fillText('潮高', 270, 92);
    TE.ev.slice(0, 6).forEach((e, i) => {
      const y = 136 + i * 52, up = e.k == '高', col = up ? '#e0566b' : '#3b82c4';
      hCtx.font = 'bold 28px sans-serif'; hCtx.fillStyle = col; hCtx.fillText(up ? '▲ 高潮' : '▼ 低潮', 24, y);
      hCtx.fillStyle = '#5a4a42'; hCtx.fillText(fmt(e.t), 170, y); hCtx.fillText(sgn(e.h), 270, y);
      const ref = up ? TE.hi : TE.lo;
      if (Math.abs(e.t - ref.t) < 0.06) { hCtx.fillStyle = col; hCtx.font = 'bold 20px sans-serif'; hCtx.fillText(up ? '最高' : '最低', 392, y); }
    });

    const x0 = 490, x1 = 780, y0 = 110, y1 = 390, N = 96, hs = [];
    for (let i = 0; i <= N; i++) hs.push(climate.tideH(i / N * 24));
    const mn = Math.min(...hs) - 0.08, mx = Math.max(...hs) + 0.08;
    const px = t => x0 + (x1 - x0) * t / 24, py = v => y1 - (v - mn) / (mx - mn) * (y1 - y0);

    hCtx.strokeStyle = '#c9dbe6'; hCtx.lineWidth = 2; hCtx.setLineDash([]);
    hCtx.beginPath(); hCtx.moveTo(x0, y1); hCtx.lineTo(x1, y1); hCtx.moveTo(x0, py(TE.mean)); hCtx.lineTo(x1, py(TE.mean)); hCtx.stroke();
    hCtx.fillStyle = '#8a7a6e'; hCtx.font = '18px sans-serif'; hCtx.textAlign = 'center';
    [0, 6, 12, 18, 24].forEach(t => hCtx.fillText(t, px(t), y1 + 22));

    hCtx.strokeStyle = '#3b82c4'; hCtx.lineWidth = 5; hCtx.lineJoin = 'round';
    hCtx.beginPath(); hs.forEach((v, i) => { const X = px(i / N * 24), Y = py(v); i ? hCtx.lineTo(X, Y) : hCtx.moveTo(X, Y); }); hCtx.stroke();

    const cx = px(S.T), cy = py(climate.tideH(S.T));
    hCtx.strokeStyle = '#e0566b'; hCtx.lineWidth = 3; hCtx.setLineDash([8, 6]);
    hCtx.beginPath(); hCtx.moveTo(cx, y0); hCtx.lineTo(cx, y1); hCtx.stroke(); hCtx.setLineDash([]);
    hCtx.fillStyle = '#e0566b'; hCtx.beginPath(); hCtx.arc(cx, cy, 9, 0, PI * 2); hCtx.fill();

    const hN = climate.tideH(S.T), upN = climate.tideH(S.T + 0.1) >= hN;
    hCtx.textAlign = 'left'; hCtx.fillStyle = '#2d6a8a'; hCtx.font = 'bold 26px sans-serif';
    hCtx.fillText('現在 ' + sgn(hN) + (upN ? ' ↑漲潮' : ' ↓退潮'), 24, 438);
    hCtx.fillStyle = '#8a7a6e'; hCtx.font = '18px sans-serif'; hCtx.textAlign = 'right';
    hCtx.fillText('資料：' + TDsrc, 776, 462);
    hTex.needsUpdate = true;
  }

  function dayIdx() {
    const v = S.weekday;
    return (v === undefined || v === '' || v == 'auto') ? new Date(midTW() + 12 * 36e5).getUTCDay() : +v;
  }

  function applyMode(d) {
    const cf = WK[d];
    shipCap = cf.cap; yardCap = cf.ycap; craneMode = cf.cm;
    [...shipSt, ...yardSt].forEach(k => { k.list.forEach(c => c.parent && c.parent.remove(c)); k.list.length = 0; });
    if (cs.c) { cs.c.parent && cs.c.parent.remove(cs.c); cs.c = null; }
    shipSt.forEach(k => {
      const h = cf.fill == 'full' ? 3 : cf.fill == 'rand' ? Math.floor(Math.random() * (cf.cap + 1)) : 0;
      for (let l = 0; l < h; l++) { const c = mkC(); c.position.set(k.lx, 0.95 + l * 0.47, k.lz); ship.add(c); k.list.push(c); }
    });
    const yh = yardSt.map(() => (cf.yh == 'rand' ? Math.floor(Math.random() * 4) : cf.yh));
    if (cf.yh == 'rand' && Math.max(...yh) - Math.min(...yh) < 2) { yh[0] = 3; yh[yh.length - 1] = 0; }
    yardSt.forEach((k, i) => {
      for (let l = 0; l < yh[i]; l++) { const c = mkC(); c.position.set(k.x, 0.23 + l * 0.47, k.z); sc.add(c); k.list.push(c); }
    });
    cs.st = 'wait'; cs.ph = 0; cs.t = 2; cs.src = cs.dst = null;
    if (lastV != cf.v) {
      lastV = cf.v;
      const pv = cf.v == 'cargo' ? ship : yacht;
      pv.position.x = cf.dock ? (cf.v == 'cargo' ? -11.3 : -11.05) : -17.5;
      pv.position.z = 0;
    }
    const wdn = App.$('weekday-desc');
    if (wdn) wdn.textContent = cf.n;
  }

  function vessel(v, act, dock, dx, dt, wy, k) {
    if (!act) return;
    const tm = runtime.tm, tx = dock ? dx : -17.5 + Math.sin(tm * 0.1) * 0.6, tz = dock ? 0 : -1 + Math.sin(tm * 0.08) * 3;
    const ry = dock ? 0 : Math.sin(tm * 0.15) * 0.12, f = Math.min(1, dt * 0.7);
    v.position.x += (tx - v.position.x) * f; v.position.z += (tz - v.position.z) * f; v.rotation.y += (ry - v.rotation.y) * f;
    v.position.y = wy + Math.sin(tm * 0.8 + k) * 0.04;
    v.rotation.z = Math.sin(tm * 0.6 + k) * 0.015;
    v.rotation.x = Math.cos(tm * 0.5 + k) * 0.01;
  }

  // ========== 愛河（感潮水流、小橋、鴨子、潮位線） ==========
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfd8de, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.3 });
  [RZ0, RZ1].forEach(z => add(new THREE.BoxGeometry(2 * (Math.sqrt(121 - z * z) - 0.05), 2.4, 0.2), z == RZ1 ? glassM : concrete, 0, -1.2, z).castShadow = false);

  function mkFlowTex(kind) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    if (kind == 'water') {
      x.fillStyle = '#5fb7d9'; x.fillRect(0, 0, 256, 128);
      x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 3; x.lineCap = 'round';
      for (let i = 0; i < 9; i++) { const y = rnd(8, 120), x0 = rnd(0, 200); x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + rnd(20, 50), y); x.stroke(); }
    } else {
      x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 8; x.lineCap = 'round'; x.lineJoin = 'round';
      [70, 190].forEach(a => { x.beginPath(); x.moveTo(a, 40); x.lineTo(a + 36, 64); x.lineTo(a, 88); x.stroke(); });
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

const rvT = mkFlowTex('water'), arT = mkFlowTex('arrow');
  const shp = P => new THREE.Shape(P.map(p => new THREE.Vector2(p[0], -p[1])));
  // 合併主河道與出海口為單一多邊形，避免半透明時西側交界處重複疊加
  const FULL_RIVP = [[-10.05, RZ0], ...RIVP.filter(p => p[0] > 0), [-10.05, RZ1]];
  const RPW = new THREE.ShapeGeometry(shp(FULL_RIVP));
  RPW.rotateX(-PI / 2);

  rvT.repeat.set(0.25, 0.5); arT.repeat.set(0.22, 0.55); arT.offset.y = 0.5 + RZC * 0.55;
  const rvM = new THREE.Mesh(RPW, new THREE.MeshStandardMaterial({
    map: rvT,
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  }));
  rvM.receiveShadow = true;
  rvM.renderOrder = 3;
  sc.add(rvM);

  const arM = new THREE.Mesh(RPW, new THREE.MeshBasicMaterial({ map: arT, transparent: true, opacity: 0, depthWrite: false }));
  arM.renderOrder = 4;
  sc.add(arM);

  add(new THREE.BoxGeometry(2.3, 2.4, 0.2), concrete, -8.85, -1.2, RZ0).castShadow = false;
  add(new THREE.BoxGeometry(4.6, 2.4, 0.2), glassM, -7.7, -1.2, RZ1).castShadow = false;

  const volM = new THREE.MeshStandardMaterial({ color: 0x5fb7d9, transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false }), bedM = M(0xa58d6a);
  const vols = [FULL_RIVP].map(P => {
    const g = new THREE.ExtrudeGeometry(shp(P), { depth: 2.3, bevelEnabled: false }); g.rotateX(-PI / 2);
    const m = new THREE.Mesh(g, volM); m.position.y = -2.3; m.renderOrder = 2; sc.add(m);
    const bg = new THREE.ShapeGeometry(shp(P)); bg.rotateX(-PI / 2);
    const bm = new THREE.Mesh(bg, bedM); bm.position.y = -2.3; bm.receiveShadow = true; sc.add(bm);
    return m;
  });

  const NPT = 90, pPos = new Float32Array(NPT * 3), pf = [], pG = new THREE.BufferGeometry();
  pG.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  for (let i = 0; i < NPT; i++) pf.push({ x: rnd(-9.8, 5), f: rnd(0.05, 0.9), z: rnd(RZ0 + 0.15, RZ1 - 0.15) });
  const pts = new THREE.Points(pG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false }));
  pts.frustumCulled = false; sc.add(pts);

  const kerbM = M(0xcfc8bb), railM = M(0x2aa6a0), railT = M(0xe0566b), railB = M(0xf2b134);
  [[RZ0, -0.1], [RZ1, 0.1]].forEach(a => {
    const zz = a[0] + a[1], xm = Math.sqrt(121 - a[0] * a[0]) - 0.12;
    add(new THREE.BoxGeometry(2 * xm, 0.22, 0.2), kerbM, 0, 0.11, zz).castShadow = false;
    const gaps = [[-1.05, 1.05]];
    for (let x = -xm; x <= xm; x += 0.75) { if (!gaps.some(g => x > g[0] && x < g[1])) add(new THREE.BoxGeometry(0.07, 0.5, 0.07), railM, x, 0.47, zz); }
    [-xm, xm].concat(gaps.flat()).forEach(x => add(new THREE.BoxGeometry(0.09, 0.55, 0.09), railM, x, 0.49, zz));
    const segs = []; { let st = -xm; gaps.forEach(g => { segs.push([st, g[0]]); st = g[1]; }); segs.push([st, xm]); }
    segs.forEach(q => { const L = q[1] - q[0], cx = (q[0] + q[1]) / 2; add(new THREE.BoxGeometry(L, 0.05, 0.05), railT, cx, 0.68, zz); add(new THREE.BoxGeometry(L, 0.04, 0.04), railB, cx, 0.5, zz); });
  });

  const brg = new THREE.Group(), brM2 = M(0xd9c7a8); sc.add(brg);
  add(new THREE.BoxGeometry(1.7, 0.16, 2), brM2, 0, 0.3, RZC, brg);
  add(new THREE.BoxGeometry(1.7, 0.14, 0.88), brM2, 0, 0.15, RZ0 - 0.5, brg).rotation.x = -0.36;
  add(new THREE.BoxGeometry(1.7, 0.14, 0.88), brM2, 0, 0.15, RZ1 + 0.53, brg).rotation.x = 0.36;
  [RZ0 + 0.05, RZ1 - 0.05].forEach(z => add(new THREE.BoxGeometry(1.7, 0.7, 0.35), kerbM, 0, -0.05, z, brg));
  [-0.82, 0.82].forEach(x => {
    for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.07, 0.42, 0.07), railM, x, 0.59, RZ0 + 0.1 + i * 0.4, brg);
    add(new THREE.BoxGeometry(0.05, 0.05, 1.8), railT, x, 0.78, RZC, brg);
  });

  App.bridgeY = (x, z) => (
    Math.abs(x) < 0.9
      ? (z >= RZ0 - 0.1 && z <= RZ1 + 0.1 ? 0.3 : z > RZ0 - 0.9 && z < RZ0 - 0.1 ? 0.3 * (z - (RZ0 - 0.9)) / 0.8 : z > RZ1 + 0.1 && z < RZ1 + 0.95 ? 0.3 * (RZ1 + 0.95 - z) / 0.85 : 0)
      : 0
  );

  const ducks = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(), yl = M(0xffd84d);
    add(new THREE.SphereGeometry(0.2, 12, 10), yl, 0, 0.12, 0, g).scale.set(0.9, 0.7, 1.2);
    add(new THREE.SphereGeometry(0.12, 10, 8), yl, 0, 0.3, 0.17, g);
    add(new THREE.ConeGeometry(0.05, 0.1, 6), M(0xf28c1f), 0, 0.29, 0.3, g).rotation.x = PI / 2;
    g.scale.setScalar(1.1); g.position.set(rnd(-4.5, 4.5), 0, rnd(RZ0 + 0.5, RZ1 - 0.5)); g.rotation.y = PI / 2;
    sc.add(g); ducks.push({ g, ph: rnd(0, 6) });
  }

  const rvLines = [];
  [['hi', 0xe0566b], ['lo', 0x3b82c4], ['zero', 0x555a66]].forEach(a => {
    const m = add(new THREE.BoxGeometry(2 * 7.7, 0.04, 0.03), new THREE.MeshBasicMaterial({ color: a[1] }), 0, 0, 7.81);
    m.castShadow = m.receiveShadow = false; m.userData.k = a[0]; rvLines.push(m);
  });
  const mkWT = w => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 84;
    const t = new THREE.CanvasTexture(c), sp = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.2625), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    sp.renderOrder = 100; sc.add(sp); return { c, t, sp };
  };
  function setWallTag(g, text, col) {
    const x = g.c.getContext('2d'), r = 22;
    x.clearRect(0, 0, 320, 84); x.fillStyle = 'rgba(255,250,240,.93)'; x.strokeStyle = col; x.lineWidth = 5;
    x.beginPath(); x.moveTo(r + 4, 4); x.lineTo(316 - r, 4); x.arcTo(316, 4, 316, 4 + r, r); x.lineTo(316, 80 - r); x.arcTo(316, 80, 316 - r, 80, r);
    x.lineTo(4 + r, 80); x.arcTo(4, 80, 4, 80 - r, r); x.lineTo(4, 4 + r); x.arcTo(4, 4, 4 + r, 4, r); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#5a4a42'; let u = 0; for (const ch of text) u += ch.charCodeAt(0) > 255 ? 1 : 0.58;
    x.font = 'bold ' + Math.min(34, Math.floor(290 / u)) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 160, 44); g.t.needsUpdate = true;
  }
  const rvHiT = mkWT(1.9), rvLoT = mkWT(1.9), rvZT = mkWT(1.9);

  function refreshTideMarks() {
    const TE = climate.tide.info;
    stfTk.forEach(t => { t.d.sp.position.y = t.k.position.y = climate.tideY(t.v); });
    rvLines.forEach(m => m.position.y = climate.tideY(m.userData.k == 'hi' ? TE.hi.h : m.userData.k == 'lo' ? TE.lo.h : 0));
    setWallTag(rvZT, '0 m 基準面', '#555a66'); rvZT.sp.position.set(6.2, climate.tideY(0) + 0.2, 7.815);
    setWallTag(rvHiT, '最高潮位 ' + sgn(TE.hi.h), '#e0566b'); setWallTag(rvLoT, '最低潮位 ' + sgn(TE.lo.h), '#3b82c4');
    rvHiT.sp.position.set(6.2, climate.tideY(TE.hi.h) + 0.2, 7.815);
    rvLoT.sp.position.set(6.2, climate.tideY(TE.lo.h) + 0.2, 7.815);
    hKey = '';
  }

  refreshTideMarks();
  App.onTideReady(refreshTideMarks);

  App.onNightUpdate((dt, w, lv, NIGHT) => {
    hLamp.intensity = NIGHT ? 1.6 : 0; hBulb.material.color.set(NIGHT ? 0xffe08a : 0xf1e6cc);
    cLt.forEach(l => { l.sp.intensity = NIGHT ? 2.4 : 0; l.beam.material.opacity = NIGHT ? 0.13 : 0; });
    shipWinM.emissiveIntensity = NIGHT ? 1 : 0; yachtWinM.emissiveIntensity = NIGHT ? 1 : 0;
    shipLs.forEach(l => { l.g.material.opacity = NIGHT ? 0.9 : 0; l.m.material.color.set(NIGHT ? l.c : 0x666b78); });
  });

  let rvV = 0;

  App.waterfront = {
    harborBoard: hGrp,
    drawHarbor,
    syncDay() { const d0 = dayIdx(); if (d0 != curDay) { curDay = d0; applyMode(d0); } },
    update(dt, w) {
      const tm = runtime.tm, wy = runtime.WY = climate.tideY(climate.tideH(S.T));
      seaBig.position.y = wy - 0.07; seaPatch.position.y = wy;
      const p = seaPatch.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.4 + tm * 1.2) * 0.05 + Math.cos(p.getY(i) * 0.45 + tm * 0.9) * 0.05);
      p.needsUpdate = true;

      const d0 = dayIdx();
      if (d0 != curDay) { curDay = d0; applyMode(d0); }
      const cf = WK[curDay];
      ship.visible = cf.v == 'cargo'; yacht.visible = cf.v == 'yacht';
      vessel(ship, cf.v == 'cargo', cf.dock, -11.3, dt, wy, 0);
      vessel(yacht, cf.v == 'yacht', cf.dock, -11.05, dt, wy, 1);
      craneUpdate(dt, w);

      const r = (climate.tideH(S.T + 0.05) - climate.tideH(S.T - 0.05)) / 0.1, tg = Math.max(-1.8, Math.min(1.8, r * 9));
      rvV += (tg - rvV) * Math.min(1, dt * 2);
      rvM.position.y = wy - 0.02; arM.position.y = wy - 0.01;
      vols.forEach(m => m.scale.y = Math.max(0.05, (wy + 2.3) / 2.3));

      pf.forEach((q, i) => {
        q.x += rvV * (0.3 + 0.7 * q.f) * dt;
        if (q.x > 5.2) q.x = -9.8; if (q.x < -9.8) q.x = 5.2;
        pPos[i * 3] = q.x; pPos[i * 3 + 1] = -2.2 + q.f * (wy + 2.05); pPos[i * 3 + 2] = q.z;
      });
      pG.attributes.position.needsUpdate = true;
      rvT.offset.x -= rvT.repeat.x * rvV * dt;
      arT.repeat.x = (rvV >= 0 ? 1 : -1) * 0.22;
      arT.offset.x -= arT.repeat.x * rvV * dt;
      arM.material.opacity = Math.min(0.55, Math.abs(rvV) * 0.4);

      ducks.forEach(d => {
        const g = d.g;
        g.position.x += rvV * dt;
        if (g.position.x > 5.2) g.position.x = -9.2; if (g.position.x < -9.2) g.position.x = 5.2;
        g.position.y = wy + 0.02 + Math.sin(tm * 2 + d.ph) * 0.03;
        g.position.z += Math.sin(tm * 0.5 + d.ph) * 0.1 * dt;
        g.position.z = Math.max(RZ0 + 0.4, Math.min(RZ1 - 0.4, g.position.z));
        if (Math.abs(rvV) > 0.05) {
          let df = (rvV > 0 ? PI / 2 : -PI / 2) - g.rotation.y;
          df = Math.atan2(Math.sin(df), Math.cos(df));
          g.rotation.y += df * Math.min(1, dt * 3);
        }
        g.rotation.z = Math.sin(tm * 1.6 + d.ph) * 0.05;
      });
    }
  };
})(window.TownApp);