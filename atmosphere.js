(function (App) {
  const { PI, LAT, LNG, BR, S, runtime, cl, rnd, fmt, midTW } = App;
  const { sc, cam, hemi, sun, tmp, M, add, labDyn, glowTex, far, climate } = App;

  // 雲
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [[0, 0, 0, 1.5], [1.4, -0.1, 0.2, 1.1], [-1.4, -0.2, 0, 1.1], [0.5, 0.5, 0, 1.1]].forEach(a => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(a[3], 14, 10), m);
      s.position.set(a[0], a[1], a[2]);
      s.scale.y = 0.7;
      g.add(s);
    });
    g.position.set(rnd(-22, 22), rnd(7, 10), rnd(-14, -2));
    g.scale.setScalar(rnd(0.9, 1.4));
    sc.add(g);
    clouds.push({ g, m });
  }

  // 雨、雪、星星
  const NR = 700, rp = new Float32Array(NR * 6), rv = [];
  for (let i = 0; i < NR; i++) rv.push({ x: rnd(-14, 14), y: rnd(0, 14), z: rnd(-14, 14), v: rnd(14, 20) });
  const rainG = new THREE.BufferGeometry();
  rainG.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.7 }));
  rain.frustumCulled = false;
  sc.add(rain);

  const NS = 500, sp = new Float32Array(NS * 3), sv = [];
  for (let i = 0; i < NS; i++) sv.push({ x: rnd(-14, 14), y: rnd(0, 14), z: rnd(-14, 14), v: rnd(1, 2), p: rnd(0, 6) });
  const snowG = new THREE.BufferGeometry();
  snowG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.9 }));
  snow.frustumCulled = false;
  sc.add(snow);

  const stp = [];
  for (let i = 0; i < 220; i++) {
    const a = rnd(0, PI * 2), b = rnd(0.15, 1.3);
    stp.push(Math.cos(a) * Math.cos(b) * 70, Math.sin(b) * 70, Math.sin(a) * Math.cos(b) * 70 - 20);
  }
  const stG = new THREE.BufferGeometry();
  stG.setAttribute('position', new THREE.Float32BufferAttribute(stp, 3));
  const stars = new THREE.Points(stG, new THREE.PointsMaterial({ color: 0xfff6d8, size: 2.2, sizeAttenuation: false, transparent: true, fog: false }));
  sc.add(stars);

  // 太陽與月亮
  const sunM = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 18), new THREE.MeshBasicMaterial({ color: 0xffe38a, fog: false }));
  sc.add(sunM);
  const sunG = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,225,140,.85)'), transparent: true, fog: false, depthWrite: false }));
  sunG.scale.setScalar(5.2);
  sunM.add(sunG);

  const mk = document.createElement('canvas');
  mk.width = mk.height = 128;
  const mx = mk.getContext('2d'), mTex = new THREE.CanvasTexture(mk);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: mTex, transparent: true, fog: false, depthWrite: false }));
  moon.scale.setScalar(2);
  sc.add(moon);
  let lastPh = -1;
  function drawMoon(p) {
    if (Math.abs(p - lastPh) < 0.004) return;
    lastPh = p;
    const w = p >= 0.5, q = w ? 1 - p : p, k = Math.cos(2 * PI * q);
    mx.clearRect(0, 0, 128, 128);
    mx.save();
    if (w) { mx.translate(128, 0); mx.scale(-1, 1); }
    mx.fillStyle = '#4a5275';
    mx.beginPath();
    mx.arc(64, 64, 52, 0, PI * 2);
    mx.fill();
    mx.fillStyle = '#fff3c4';
    mx.beginPath();
    mx.arc(64, 64, 52, -PI / 2, PI / 2, false);
    mx.ellipse(64, 64, Math.abs(k) * 52, 52, 0, PI / 2, -PI / 2, k > 0);
    mx.fill();
    mx.restore();
    mTex.needsUpdate = true;
  }

  // 太陽軌跡、夏冬至軌跡、日月標籤
  const DH = 14.5, DV = 10;
  const domePt = (az, al) => [-Math.sin(az) * Math.cos(al) * DH, Math.sin(al) * DV, Math.cos(az) * Math.cos(al) * DH];
  const pathGrp = new THREE.Group();
  sc.add(pathGrp);
  let pathLine = null, pathKey = -1;
  const pathM = new THREE.LineDashedMaterial({ color: 0xff9f43, dashSize: 0.55, gapSize: 0.35, transparent: true, opacity: 0.9, fog: false });

  function mkTag(w, parent) {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 84;
    const t = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(w || 3.6, (w || 3.6) * 0.2625, 1);
    sp.renderOrder = 100;
    (parent || pathGrp).add(sp);
    return { c, t, sp };
  }

  function setTag(g, text, col) {
    const x = g.c.getContext('2d'), r = 22;
    x.clearRect(0, 0, 320, 84);
    x.fillStyle = 'rgba(255,250,240,.93)';
    x.strokeStyle = col;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(r + 4, 4); x.lineTo(316 - r, 4); x.arcTo(316, 4, 316, 4 + r, r);
    x.lineTo(316, 80 - r); x.arcTo(316, 80, 316 - r, 80, r);
    x.lineTo(4 + r, 80); x.arcTo(4, 80, 4, 80 - r, r);
    x.lineTo(4, 4 + r); x.arcTo(4, 4, 4 + r, 4, r);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#5a4a42';
    let u = 0;
    for (const ch of text) u += ch.charCodeAt(0) > 255 ? 1 : 0.58;
    x.font = 'bold ' + Math.min(34, Math.floor(290 / u)) + 'px sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, 160, 44);
    g.t.needsUpdate = true;
  }

  function setTag2(g, l1, l2, col) {
    const x = g.c.getContext('2d'), r = 22;
    x.clearRect(0, 0, 320, 84);
    x.fillStyle = 'rgba(255,250,240,.93)';
    x.strokeStyle = col;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(r + 4, 4); x.lineTo(316 - r, 4); x.arcTo(316, 4, 316, 4 + r, r);
    x.lineTo(316, 80 - r); x.arcTo(316, 80, 316 - r, 80, r);
    x.lineTo(4 + r, 80); x.arcTo(4, 80, 4, 80 - r, r);
    x.lineTo(4, 4 + r); x.arcTo(4, 4, 4 + r, 4, r);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#5a4a42';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const fit = (t, m) => { let u = 0; for (const ch of t) u += ch.charCodeAt(0) > 255 ? 1 : 0.58; return Math.min(m, Math.floor(290 / u)); };
    x.font = 'bold ' + fit(l1, 28) + 'px sans-serif';
    x.fillText(l1, 160, 26);
    x.font = 'bold ' + fit(l2, 26) + 'px sans-serif';
    x.fillText(l2, 160, 59);
    g.t.needsUpdate = true;
  }

  const sunCols = [0xff9a5c, 0xffd84d, 0xe0566b], sunHex = ['#ff9a5c', '#e0a800', '#e0566b'];
  const tgs = [mkTag(), mkTag(4.6), mkTag()];
  const mk3 = sunCols.map(c => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshBasicMaterial({ color: c, fog: false }));
    pathGrp.add(m);
    return m;
  });
  const dots = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }));
    pathGrp.add(m);
    dots.push(m);
  }
  [['東 E', 16.5, 0], ['西 W', -16.5, 0], ['北 N', 0, -16.5], ['南 S', 0, 16.5]].forEach(a => {
    const g = mkTag(a[0].length > 4 ? 4.6 : 2.2);
    setTag(g, a[0], '#8a7a6e');
    g.sp.position.set(a[1], 0.5, a[2]);
  });

  const infoC = document.createElement('canvas');
  infoC.width = 512; infoC.height = 220;
  const infoX = infoC.getContext('2d'), infoTex = new THREE.CanvasTexture(infoC);
const infoT = new THREE.Sprite(new THREE.SpriteMaterial({ map: infoTex, transparent: true, depthWrite: false, fog: false }));
infoT.scale.set(5.6, 5.6 * 220 / 512, 1);
infoT.renderOrder = 100;
infoT.position.set(15.8, 2.2, 0); // 原本為 -2.4，抬高至地平線上方
pathGrp.add(infoT);
  let todayInfo = null;
  const solInfo = [null, null];

  function drawSunInfo() {
    const rows = [solInfo[0], todayInfo && { n: '今天', alt: todayInfo.alt, sr: todayInfo.sr, ss: todayInfo.ss, col: '#e0a800' }, solInfo[1]].filter(Boolean);
    const x = infoX, r = 26;
    x.clearRect(0, 0, 512, 220);
    x.fillStyle = 'rgba(255,250,240,.94)';
    x.strokeStyle = '#c89b6d';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(r + 4, 4); x.lineTo(508 - r, 4); x.arcTo(508, 4, 508, 4 + r, r);
    x.lineTo(508, 216 - r); x.arcTo(508, 216, 508 - r, 216, r);
    x.lineTo(4 + r, 216); x.arcTo(4, 216, 4, 216 - r, r);
    x.lineTo(4, 4 + r); x.arcTo(4, 4, 4 + r, 4, r);
    x.closePath();
    x.fill();
    x.stroke();
    x.textBaseline = 'middle';
    x.textAlign = 'left';
    x.fillStyle = '#5a4a42';
    x.font = 'bold 26px sans-serif';
    x.fillText('太陽軌跡：正午高度角・日出–日落', 24, 38);
    rows.forEach((q, i) => {
      const y = 92 + i * 48;
      x.fillStyle = q.col;
      x.beginPath();
      x.arc(36, y, 10, 0, PI * 2);
      x.fill();
      x.fillStyle = '#5a4a42';
      x.font = 'bold 30px sans-serif';
      x.fillText(q.n, 58, y + 2);
      x.fillText(q.alt + '°', 150, y + 2);
      x.font = '26px sans-serif';
      x.fillText(fmt(q.sr) + ' – ' + fmt(q.ss), 235, y + 2);
    });
    infoTex.needsUpdate = true;
  }

  function buildSunPath(AI) {
    const mid = midTW();
    const P = t => { const q = SunCalc.getPosition(new Date(mid + t * 36e5), LAT, LNG); return [domePt(q.azimuth, q.altitude), q.altitude]; };
    const pts = [];
    for (let t = AI.sr; t < AI.ss; t += 1 / 6) pts.push(...P(t)[0]);
    pts.push(...P(AI.ss)[0]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    if (pathLine) { pathGrp.remove(pathLine); pathLine.geometry.dispose(); }
    pathLine = new THREE.Line(g, pathM);
    pathLine.computeLineDistances();
    pathLine.frustumCulled = false;
    pathGrp.add(pathLine);

    const r = P(AI.sr), n = P(12), e = P(AI.ss);
    [[r[0], '日出 ' + fmt(AI.sr)], [n[0], '中午 12:00 ・ 高度角 ' + Math.round(n[1] * 57.3) + '°'], [e[0], '日落 ' + fmt(AI.ss)]].forEach((a, i) => {
      mk3[i].position.set(a[0][0], a[0][1], a[0][2]);
      tgs[i].sp.visible = i != 1;
      tgs[i].sp.position.set(a[0][0], a[0][1] + 1, a[0][2]);
      setTag(tgs[i], a[1], sunHex[i]);
    });
    todayInfo = { alt: Math.round(n[1] * 57.3), sr: AI.sr, ss: AI.ss };
    drawSunInfo();
    dots.forEach((m, i) => {
      const t = Math.ceil(AI.sr) + i;
      m.visible = t <= AI.ss && t != 12;
      if (m.visible) { const d = P(t)[0]; m.position.set(d[0], d[1], d[2]); }
    });
  }

  const solGrp = new THREE.Group();
  pathGrp.add(solGrp);
  const solMs = [0xff5a3c, 0x3b8be0].map((c, i) => new THREE.LineDashedMaterial({ color: c, dashSize: i ? 0.3 : 0.45, gapSize: 0.3, transparent: true, opacity: 0.85, fog: false }));
  (function buildSolstice() {
    const y = new Date(midTW() + 12 * 36e5).getUTCFullYear();
    [[5, 21, '夏至'], [11, 21, '冬至']].forEach((a, i) => {
      const mid = Date.UTC(y, a[0], a[1]) - 288e5;
      const tt = SunCalc.getTimes(new Date(mid + 12 * 36e5), LAT, LNG);
      const sr = (tt.sunrise - mid) / 36e5, ss = (tt.sunset - mid) / 36e5;
      const pts = [];
      const P = t => { const q = SunCalc.getPosition(new Date(mid + t * 36e5), LAT, LNG); return [domePt(q.azimuth, q.altitude), q.altitude]; };
      let best = -9, bp = null;
      for (let t = sr; t < ss; t += 1 / 6) {
        const r = P(t);
        pts.push(...r[0]);
        if (r[1] > best) { best = r[1]; bp = r[0]; }
      }
      pts.push(...P(ss)[0]);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const ln = new THREE.Line(g, solMs[i]);
      ln.computeLineDistances();
      ln.frustumCulled = false;
      solGrp.add(ln);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: i ? 0x3b8be0 : 0xff5a3c, fog: false }));
      dot.position.set(bp[0], bp[1], bp[2]);
      solGrp.add(dot);
      solInfo[i] = { n: a[2], alt: Math.round(best * 57.3), sr, ss, col: i ? '#3b8be0' : '#ff5a3c' };
    });
  })();
  drawSunInfo();

  // 地平線圓環
  {
    const rp2 = [];
    for (let i = 0; i <= 128; i++) { const a = i / 128 * PI * 2; rp2.push(Math.cos(a) * DH, -1.25, Math.sin(a) * DH); }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp2, 3));
    pathGrp.add(new THREE.Line(rg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false })));
  }

  const sunT = mkTag(3, sc), moonT = mkTag(3.4, sc);
  let smK = '';
  const lunD = n => (n <= 10 ? '初' + '一二三四五六七八九十'[n - 1] : n < 20 ? '十' + '一二三四五六七八九'[n - 11] : n == 20 ? '二十' : n < 30 ? '廿' + '一二三四五六七八九'[n - 21] : '三十');
  function lunarStr(d) {
    try {
      const p = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { month: 'long', day: 'numeric', timeZone: 'Asia/Taipei' }).formatToParts(d);
      const m = p.find(q => q.type == 'month'), dd = p.find(q => q.type == 'day');
      return m && dd ? '農曆' + m.value + lunD(+dd.value) : '';
    } catch (e) { return ''; }
  }
  const phaseN = p => (p < 0.03 || p > 0.97 ? '新月' : p < 0.22 ? '眉月' : p < 0.28 ? '上弦月' : p < 0.47 ? '盈凸月' : p < 0.53 ? '滿月' : p < 0.72 ? '虧凸月' : p < 0.78 ? '下弦月' : '殘月');

  function sunMoonTags(sp3, mp3, mi) {
    const D = new Date(midTW() + S.T * 36e5);
    const tw = new Date(D.getTime() + 288e5);
    const ts = (tw.getUTCMonth() + 1) + '/' + tw.getUTCDate() + ' ' + fmt(S.T);
    const key = Math.floor(S.T * 12) + '|' + tw.getUTCDate() + '|' + Math.round(mi.phase * 100);
    sunT.sp.visible = sunM.visible;
    sunT.sp.position.set(sp3[0], sp3[1] - 1, sp3[2]);
    moonT.sp.visible = moon.visible && runtime.NIGHT;
    moonT.sp.position.set(mp3[0], mp3[1] - 1.2, mp3[2]);
    if (key == smK) return;
    smK = key;
    const lu = lunarStr(D);
    setTag(sunT, '☀ ' + ts, '#e0a800');
    setTag2(moonT, '🌙 ' + ts, (lu ? lu + '・' : '') + phaseN(mi.phase), '#8d7fc4');
  }

  // 柔和風線
  const WN = 48, WM = 16;
  const wP = new Float32Array(WN * (WM + 1) * 6), wC = new Float32Array(WN * (WM + 1) * 8), wU = new Float32Array(WN * (WM + 1) * 4), wI = [];
  const TX = new Float32Array(WM + 1), TY = new Float32Array(WM + 1), TZ = new Float32Array(WM + 1);
  for (let n = 0; n < WN; n++) {
    for (let j = 0; j <= WM; j++) {
      const a = (n * (WM + 1) + j) * 2;
      wU[a * 2] = 0; wU[a * 2 + 1] = j / WM; wU[a * 2 + 2] = 1; wU[a * 2 + 3] = j / WM;
      if (j < WM) wI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const wG = new THREE.BufferGeometry();
  wG.setAttribute('position', new THREE.BufferAttribute(wP, 3));
  wG.setAttribute('color', new THREE.BufferAttribute(wC, 4));
  wG.setAttribute('uv', new THREE.BufferAttribute(wU, 2));
  wG.setIndex(wI);
  const gk = document.createElement('canvas');
  gk.width = 64; gk.height = 4;
  {
    const x = gk.getContext('2d'), g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 4);
  }
  const wMesh = new THREE.Mesh(wG, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gk), vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  wMesh.frustumCulled = false;
  sc.add(wMesh);

  const wk = [];
  function wReset(k, init) {
    k.o = rnd(-12, 12); k.h = rnd(0.4, 4.6); k.ph = rnd(0, 6.3); k.ph2 = rnd(0, 6.3);
    k.amp = rnd(0.3, 0.9); k.s = rnd(0.7, 1.3); k.len = rnd(3, 5.5);
    k.u = init ? rnd(-13, 13 + k.len) : rnd(-14, -11);
  }
  for (let n = 0; n < WN; n++) { const k = {}; wReset(k, 1); wk.push(k); }
  let wAng = 0, wInit = false;

  function windUpdate(dt, wd, dx, dz) {
    const ta = Math.atan2(dz, dx);
    if (!wInit) { wAng = ta; wInit = true; }
    let df = ta - wAng;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    wAng += df * Math.min(1, dt * 1.5);
    const fx = Math.cos(wAng), fz = Math.sin(wAng), v = 0.9 + wd * 0.14;
    const NIGHT = runtime.NIGHT;
    const A = cl(0.2 + wd / 60, 0.2, 0.55) * (NIGHT ? 0.55 : 1);
    const cr = NIGHT ? 0.62 : 0.9, cg = NIGHT ? 0.7 : 0.96;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;

    for (let n = 0; n < WN; n++) {
      const k = wk[n];
      k.u += v * k.s * dt;
      if (k.u - k.len > 14) wReset(k, 0);
      for (let j = 0; j <= WM; j++) {
        const uj = k.u - j * k.len / WM, lat = k.o + Math.sin(uj * 0.55 + k.ph) * k.amp;
        TX[j] = fx * uj - fz * lat;
        TZ[j] = fz * uj + fx * lat;
        TY[j] = Math.max(0.15, k.h + Math.sin(uj * 0.45 + k.ph2) * 0.35);
      }
      for (let j = 0; j <= WM; j++) {
        const a = (n * (WM + 1) + j) * 2;
        const j0 = Math.max(0, j - 1), j1 = Math.min(WM, j + 1);
        const tx = TX[j1] - TX[j0], ty = TY[j1] - TY[j0], tz = TZ[j1] - TZ[j0];
        const vx = TX[j] - cx, vy = TY[j] - cy, vz = TZ[j] - cz;
        let sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
        const hw = 0.08 * (0.55 + 0.45 * Math.sin(PI * j / WM)) / (Math.hypot(sx, sy, sz) || 1);
        sx *= hw; sy *= hw; sz *= hw;
        const o3 = a * 3;
        wP[o3] = TX[j] - sx; wP[o3 + 1] = TY[j] - sy; wP[o3 + 2] = TZ[j] - sz;
        wP[o3 + 3] = TX[j] + sx; wP[o3 + 4] = TY[j] + sy; wP[o3 + 5] = TZ[j] + sz;
        const uj = k.u - j * k.len / WM;
        const al = A * Math.pow(Math.sin(PI * j / WM), 0.8) * (1 - 0.35 * j / WM) * cl((13.5 - Math.abs(uj)) / 4, 0, 1);
        for (let q = 0; q < 2; q++) {
          const b = a * 4 + q * 4;
          wC[b] = cr; wC[b + 1] = cg; wC[b + 2] = 1; wC[b + 3] = al;
        }
      }
    }
    wG.attributes.position.needsUpdate = true;
    wG.attributes.color.needsUpdate = true;
  }

  // 三大氣象儀表：溫度計、雨量杯、風向旗/風速儀
  const th = new THREE.Group();
  th.position.set(5.9, 0, 6.3);
  th.rotation.y = 0.7;
  sc.add(th);
  add(new THREE.BoxGeometry(0.75, 3.5, 0.12), M(0xfff6ea), 0, 1.75, 0, th);
  add(new THREE.CylinderGeometry(0.09, 0.09, 2.5, 12), M(0xdff3ff, { transparent: true, opacity: 0.6 }), 0, 1.85, 0.08, th);
  const lg = new THREE.CylinderGeometry(0.055, 0.055, 1, 12);
  lg.translate(0, 0.5, 0);
  const liq = add(lg, M(0xff5d5d), 0, 0.6, 0.09, th);
  add(new THREE.SphereGeometry(0.17, 16, 12), M(0xff5d5d), 0, 0.58, 0.09, th);
  const bead = add(new THREE.SphereGeometry(0.09, 12, 10), M(0xffa84d), 0.2, 1, 0.12, th);
  [0, 10, 20, 30, 40].forEach(t => {
    const y = 0.6 + t / 40 * 2.5;
    add(new THREE.BoxGeometry(0.14, 0.03, 0.03), M(0x6b5a50), -0.2, y, 0.1, th);
    const s = App.lab(t + '°', 0.42);
    s.position.set(-0.52, y, 0.12);
    th.add(s);
  });
  const thC = document.createElement('canvas');
  thC.width = 256; thC.height = 128;
  const thX = thC.getContext('2d'), thT = new THREE.CanvasTexture(thC);
  const thP = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshBasicMaterial({ map: thT, transparent: true }));
  thP.renderOrder = 100;
  thP.position.set(0, 3.95, 0.12);
  th.add(thP);
  let thK = '';
  function thDraw() {
    const a = (+S.temp).toFixed(1), b = (+S.app).toFixed(1), k = a + '|' + b;
    if (k == thK) return;
    thK = k;
    thX.clearRect(0, 0, 256, 128);
    thX.fillStyle = 'rgba(255,250,240,.96)';
    thX.fillRect(4, 4, 248, 120);
    thX.strokeStyle = '#c89b6d';
    thX.lineWidth = 6;
    thX.strokeRect(4, 4, 248, 120);
    thX.textAlign = 'center';
    thX.textBaseline = 'middle';
    thX.fillStyle = '#e0566b';
    thX.font = 'bold 58px monospace';
    thX.fillText(a + '°C', 128, 48);
    thX.fillStyle = '#e59a3d';
    thX.font = 'bold 30px sans-serif';
    thX.fillText('體感 ' + b + '°C', 128, 98);
    thT.needsUpdate = true;
  }

  const gg = new THREE.Group();
  gg.position.set(6.7, 0, 6.2);
  gg.rotation.y = 0.7;
  sc.add(gg);
  add(new THREE.CylinderGeometry(0.38, 0.34, 2.1, 20, 1, true), M(0xdff3ff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 1.05, 0, gg);
  const wg = new THREE.CylinderGeometry(0.33, 0.33, 1, 20);
  wg.translate(0, 0.5, 0);
  const water = add(wg, M(0x5fa8ff, { transparent: true, opacity: 0.85 }), 0, 0.04, 0, gg);
  const gTk = [0, 1, 2, 3, 4, 5].map(i => {
    const y = 0.04 + i / 5 * 1.95;
    add(new THREE.BoxGeometry(0.14, 0.025, 0.025), M(0x6b5a50), 0.4, y, 0, gg);
    const d = labDyn(0.4);
    d.sp.position.set(0.72, y, 0);
    gg.add(d.sp);
    return d;
  });
  const gl = labDyn(0.55);
  gl.sp.position.set(0, 2.55, 0);
  gg.add(gl.sp);
  let gMax = 5;
  const GL = [5, 10, 20, 50, 100, 200, 500];
  function gaugeFit(p) {
    const tg = GL.find(v => p <= v * 0.85) || 500;
    if (tg > gMax) gMax = tg;
    else if (tg < gMax && p < gMax * 0.4) gMax = tg;
    gTk.forEach((d, i) => { const v = gMax * i / 5; d.set(Number.isInteger(v) ? String(v) : v.toFixed(1)); });
    gl.set('降雨 ' + p.toFixed(1) + ' mm', '#2d6a8a');
  }

  const vane = new THREE.Group();
  vane.position.set(7.2, 0, 7.3);
  sc.add(vane);
  add(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), M(0xfff6ea), 0, 1.8, 0, vane);
  add(new THREE.SphereGeometry(0.13, 10, 10), M(0xffd27a), 0, 3.65, 0, vane);
  const fp = new THREE.Group();
  fp.position.set(0, 3.2, 0);
  vane.add(fp);
  const fg = new THREE.PlaneGeometry(1.7, 0.9, 16, 4);
  fg.translate(0.85, 0, 0);
  const fo = fg.attributes.position.array.slice();
  add(fg, M(0xff8a8a, { side: THREE.DoubleSide }), 0, 0, 0, fp);

  add(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), M(0x8a8f98), 0, 3.8, 0, vane);
  const anem = new THREE.Group();
  anem.position.set(0, 3.98, 0);
  vane.add(anem);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = i * PI * 2 / 3;
    anem.add(arm);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 5), M(0xdadde2), 0.2, 0, 0, arm).rotation.z = PI / 2;
    const cup = add(new THREE.SphereGeometry(0.1, 10, 8, 0, PI * 2, 0, PI / 2), M(0xe0566b, { side: THREE.DoubleSide }), 0.4, 0, 0, arm);
    cup.rotation.x = PI / 2;
  }

  add(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6), M(0x8a8f98), 0, 4.2, 0, vane);
  const planeV = new THREE.Group();
  planeV.position.set(0, 4.45, 0);
  vane.add(planeV);
  {
    const wh = M(0xf4f4f4), rd = M(0xe0566b), bl = M(0x3b82c4);
    add(new THREE.CylinderGeometry(0.06, 0.05, 0.8, 10), wh, 0, 0, 0, planeV).rotation.z = PI / 2;
    add(new THREE.ConeGeometry(0.06, 0.16, 10), rd, -0.47, 0, 0, planeV).rotation.z = PI / 2;
    add(new THREE.BoxGeometry(0.26, 0.03, 1.1), rd, -0.05, 0, 0, planeV);
    add(new THREE.BoxGeometry(0.2, 0.22, 0.03), bl, 0.38, 0.13, 0, planeV);
    add(new THREE.BoxGeometry(0.15, 0.03, 0.42), bl, 0.38, 0.03, 0, planeV);
  }
  const prop = new THREE.Group();
  prop.position.set(-0.57, 0, 0);
  planeV.add(prop);
  add(new THREE.BoxGeometry(0.02, 0.42, 0.05), M(0x333840), 0, 0, 0, prop);
  add(new THREE.BoxGeometry(0.02, 0.05, 0.42), M(0x333840), 0, 0, 0, prop);

  const NIGHTC = new THREE.Color(0x20284a), DAY = new THREE.Color(0xa6dcff);
  const WARM = new THREE.Color(0xffc3ad), GRAYC = new THREE.Color(0xaab2bd);
  const skyC = new THREE.Color();
  let bs = 1, ba = 1, flash = 0, ang = 0, liqH = 1, beadH = 1, wat = 0;

  App.atmosphere = {
    setSunPathVisible(v) { pathGrp.visible = v; },
    setSolsticeVisible(v) { solGrp.visible = v; },
    update(dt, w) {
      const tm = runtime.tm;
      const gray = w.d || 0;
      const D0 = new Date(midTW() + S.T * 36e5);
      const spPos = SunCalc.getPosition(D0, LAT, LNG);
      const mpPos = SunCalc.getMoonPosition(D0, LAT, LNG);
      const mi = SunCalc.getMoonIllumination(D0);
      const AI = climate.astro();

      S.sr = AI.sr;
      S.ss = AI.ss;
      S.phase = mi.phase;
      if (pathKey != AI.key) { pathKey = AI.key; buildSunPath(AI); }

      const sA = spPos.altitude, mAlt = mpPos.altitude;
      const dayOn = sA > -0.0145, sh = Math.sin(sA);
      const light = dayOn ? cl(sh * 3, 0, 1) : 0;
      const twi = dayOn ? 1 - light : cl(1 + sA / 0.15, 0, 1);
      const mUp = mAlt > -0.03;

      const dome = (az, al, H, V) => [-Math.sin(az) * Math.cos(al) * H, Math.sin(al) * V, Math.cos(az) * Math.cos(al) * H];
      const sd = dome(spPos.azimuth, sA, 1, 1);
      const md2 = dome(mpPos.azimuth, mAlt, 1, 1);
      const sp3 = dome(spPos.azimuth, sA, DH, DV);
      const mp3 = dome(mpPos.azimuth, mAlt, DH, DV);

      const bk = BR[S.wx] || BR.clear;
      bs += (bk[0] - bs) * Math.min(1, dt * 1.5);
      ba += (bk[1] - ba) * Math.min(1, dt * 1.5);

      const NIGHT = runtime.NIGHT = !dayOn;
      pathM.opacity = NIGHT ? 0.45 : 0.9;
      solMs.forEach(m => m.opacity = NIGHT ? 0.4 : 0.85);

      sunM.visible = sA > -0.02;
      sunM.position.set(sp3[0], sp3[1], sp3[2]);
      sunM.material.color.set(0xffe38a).lerp(tmp.set(0xffa86b), 1 - light);
      sunM.material.transparent = true;
      sunM.material.opacity = cl(0.15 + bs, 0, 1);
      sunG.material.opacity = cl(bs * 1.1, 0, 1);

      moon.visible = mUp;
      moon.position.set(mp3[0], mp3[1], mp3[2]);
      moon.material.opacity = cl(1 - light * 0.7, 0.3, 1);
      drawMoon(mi.phase);
      sunMoonTags(sp3, mp3, mi);

      // 天空與光照
      skyC.copy(NIGHTC).lerp(DAY, light).lerp(WARM, twi * 0.55);
      skyC.lerp(tmp.copy(GRAYC).multiplyScalar(0.3 + 0.7 * light), gray);
      if (w.t && Math.random() < 0.006) flash = 1;
      flash = Math.max(0, flash - dt * 3);
      skyC.lerp(tmp.set(0xffffff), flash * 0.5);
      sc.background = skyC;
      sc.fog.color.copy(skyC);
      sc.fog.near = w.f ? 4 : 35;
      sc.fog.far = w.f ? 28 : 90;
      far.material.color.copy(skyC).lerp(tmp.set(0x8fc98a), 0.35 * (0.3 + 0.7 * light));

      const up = dayOn && sh > 0;
      const ld = up ? sd : mUp ? md2 : [0, 0.4, -0.9];
      sun.position.set(ld[0] * 30, Math.max(ld[1], 0.12) * 30, ld[2] * 30);
      sun.color.set(up ? 0xfff0d8 : 0x9fb4ff).lerp(tmp.set(0xffa070), up ? (1 - light) * 0.7 : 0);
      sun.intensity = up ? 0.15 + 1.15 * light * bs : mUp ? (0.1 + 0.35 * mi.fraction) * (0.5 + 0.5 * Math.sin(Math.max(mAlt, 0.1))) : 0.08;
      hemi.intensity = (0.3 + 0.45 * light) * ba + (mUp ? 0.1 : 0) + flash * 1.5;
      hemi.color.copy(skyC).lerp(tmp.set(0xffffff), 0.5);
      stars.material.opacity = cl(1 - light * 1.3, 0, 1) * (1 - gray * 1.2) * (1 - (w.f || 0));

      // 風向、雲、雨雪
      const wd = S.wind, wr = S.dir * PI / 180, dx = -Math.sin(wr), dz = Math.cos(wr);
      const nc = w.c;
      clouds.forEach((c, i) => {
        c.g.visible = i < nc;
        const sp2 = 0.2 + wd * 0.12, p = c.g.position;
        p.x += dx * sp2 * dt;
        p.z += dz * sp2 * dt;
        if (p.x > 26) p.x = -26; else if (p.x < -26) p.x = 26;
        if (p.z > 4) p.z = -18; else if (p.z < -18) p.z = 4;
        c.m.transparent = true;
        c.m.opacity = cl(Math.min(26 - Math.abs(p.x), p.z + 18, 4 - p.z) / 4, 0, 1);
        c.m.color.set(0xffffff).lerp(tmp.set(0x7f8793), gray * 1.2);
      });

      const rc = w.r || 0, sc2 = w.s || 0;
      rainG.setDrawRange(0, rc * 2);
      snowG.setDrawRange(0, sc2);
      rain.visible = rc > 0;
      snow.visible = sc2 > 0;
      if (rc) {
        for (let i = 0; i < rc; i++) {
          const q = rv[i];
          q.y -= q.v * dt;
          if (q.y < 0) { q.y = 14; q.x = rnd(-14, 14); q.z = rnd(-14, 14); }
          const o = i * 6, l = wd * 0.02;
          rp[o] = q.x; rp[o + 1] = q.y; rp[o + 2] = q.z;
          rp[o + 3] = q.x - dx * l; rp[o + 4] = q.y + 0.55; rp[o + 5] = q.z - dz * l;
        }
        rainG.attributes.position.needsUpdate = true;
      }
      if (sc2) {
        for (let i = 0; i < sc2; i++) {
          const q = sv[i];
          q.y -= q.v * dt;
          if (q.y < 0) { q.y = 14; q.x = rnd(-14, 14); q.z = rnd(-14, 14); }
          sp[i * 3] = q.x + Math.sin(tm + q.p) * 0.5 + dx * wd * 0.02 * q.y * 0.2;
          sp[i * 3 + 1] = q.y;
          sp[i * 3 + 2] = q.z;
        }
        snowG.attributes.position.needsUpdate = true;
      }

      // 風向旗與風線
      const tg = Math.atan2(-dz, dx);
      let df = tg - ang;
      df = Math.atan2(Math.sin(df), Math.cos(df));
      ang += df * 0.05;
      fp.rotation.y = ang;
      anem.rotation.y += (0.15 + wd * 0.25) * dt;
      planeV.rotation.y = ang;
      prop.rotation.x += (1 + wd * 0.8) * dt;

      const pa = fg.attributes.position, k = 2 + wd * 0.35, am = cl(0.05 + wd * 0.012, 0.05, 0.5), tH = -0.95 + 1.35 * cl(wd / 35, 0, 1);
      for (let i = 0; i < pa.count; i++) {
        const x = fo[i * 3];
        pa.setZ(i, Math.sin(x * 4 - tm * k) * am * x);
        pa.setY(i, fo[i * 3 + 1] + tH * (x / 1.7) * (x / 1.7) + Math.sin(x * 5 - tm * k * 1.3) * am * 0.3 * x);
      }
      pa.needsUpdate = true;
      fg.computeVertexNormals();
      windUpdate(dt, wd, dx, dz);

      // 溫度計與量杯
      liqH += (cl(S.temp / 40, 0, 1) * 2.5 - liqH) * 0.08;
      beadH += (cl(S.app / 40, 0, 1) * 2.5 - beadH) * 0.08;
      liq.scale.y = Math.max(0.01, liqH);
      bead.position.y = 0.6 + beadH;
      thDraw();
      gaugeFit(+S.precip);
      wat += (cl(S.precip / gMax, 0, 1) * 1.95 - wat) * 0.08;
      water.scale.y = Math.max(0.001, wat);
      water.visible = wat > 0.01;
      const cx = cam.position.x, cz = cam.position.z;
      th.rotation.y = Math.atan2(cx - th.position.x, cz - th.position.z);
      gg.rotation.y = Math.atan2(cx - gg.position.x, cz - gg.position.z);

      return { light, dayOn, gray, wd, dx, dz };
    }
  };
})(window.TownApp);