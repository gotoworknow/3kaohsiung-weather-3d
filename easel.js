(function (App) {
  const { $, PI, runtime } = App;
  const { sc, M, add } = App;

// 隨機挑選北側草地空位（避開港口、馬路、屋門口、樹木與長草叢）
  const E_RADIUS = 1.15;
  function pickEaselSpot() {
    const clumps = (App.stage && App.stage.clumps) || [];
    for (let pass = 0; pass < 2; pass++) {
      const minClump = pass === 0 ? 1.4 : 0.7;
      for (let i = 0; i < 200; i++) {
        const a = App.rnd(0, PI * 2), d = Math.sqrt(Math.random()) * 8.2;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (x < -6.8 || z > 1.6) continue;
        if (Math.hypot(x + 3.9, z - 0.75) < 1.8) continue; // 保留小屋門口動線
        if (!App.free(x, z, E_RADIUS)) continue;
        if (clumps.some(c => Math.hypot(x - c.x, z - c.z) < minClump)) continue;
        return [x, z];
      }
    }
    return [4.8, -1.4];
  }

  const [EX, EZ] = pickEaselSpot();
  if (typeof App.addObstacle === 'function') App.addObstacle(EX, EZ, E_RADIUS);

  const PRIMARY_BASE = 'https://willow-god.github.io/daily-image/';
  const BACKUP_BASE = 'https://raw.githubusercontent.com/willow-god/daily-image/page/';

  // ========== 3D 木質三腳畫架模型 ==========
  const easelGrp = new THREE.Group();
  easelGrp.position.set(EX, 0, EZ);
  // 朝向前方廣場與主視角方向，帶一點自然隨機偏角
  easelGrp.rotation.y = Math.atan2(2 - EX, 9 - EZ) + App.rnd(-0.45, 0.45);
  sc.add(easelGrp);

  const wood = M(0xb98a5a);
  const woodDk = M(0x9c6f4e);
  const Vy = new THREE.Vector3(0, 1, 0);

  function addBar(p1, p2, rTop, rBot, mat) {
    const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(rTop, rBot, len, 8);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(Vy, dir.normalize());
    m.castShadow = m.receiveShadow = true;
    easelGrp.add(m);
    return m;
  }

  // 前兩腳與後支撐腳、橫桿
  addBar([-0.85, 0, 0.24], [-0.1, 2.95, -0.22], 0.05, 0.065, wood);
  addBar([0.85, 0, 0.24], [0.1, 2.95, -0.22], 0.05, 0.065, wood);
  addBar([0, 0, -1.05], [0, 2.85, -0.22], 0.048, 0.062, woodDk);
  addBar([-0.62, 0.78, 0.12], [0.62, 0.78, 0.12], 0.04, 0.04, woodDk);

  // 傾斜畫板群組（與前腳斜率一致，緊貼木架）
  const boardGrp = new THREE.Group();
  boardGrp.position.set(0, 1.85, 0.05);
  boardGrp.rotation.x = -0.155;
  easelGrp.add(boardGrp);

  // 木頭托盤與可愛小調色盤
  add(new THREE.BoxGeometry(2.6, 0.11, 0.26), woodDk, 0, -0.83, 0.09, boardGrp);
  add(new THREE.BoxGeometry(0.45, 0.13, 0.18), woodDk, 0, 0.81, 0.02, boardGrp);
  const pal = add(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 14), M(0xf5e6cc), 0.92, -0.76, 0.12, boardGrp);
  pal.scale.set(1.2, 1, 0.85);
  [0xe0566b, 0xffd84d, 0x5fa8ff].forEach((c, i) => {
    add(new THREE.SphereGeometry(0.035, 8, 6), M(c), 0.84 + i * 0.08, -0.74, 0.12 + (i % 2) * 0.04, boardGrp);
  });

  // 畫板背板與 16:10 畫布
  add(new THREE.BoxGeometry(2.48, 1.56, 0.08), M(0xf2e4cc), 0, 0, 0, boardGrp);

  const artCanvas = document.createElement('canvas');
  artCanvas.width = 768;
  artCanvas.height = 480;
  const artCtx = artCanvas.getContext('2d');
  const artTex = new THREE.CanvasTexture(artCanvas);
  const artMat = new THREE.MeshStandardMaterial({
    map: artTex,
    roughness: 0.85,
    emissive: 0xffffff,
    emissiveMap: artTex,
    emissiveIntensity: 0.1
  });
  const artMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 1.44), artMat);
  artMesh.position.set(0, 0, 0.045);
  artMesh.receiveShadow = true;
  boardGrp.add(artMesh);

  // 夜晚小夾燈
  const clipMat = M(0x4b4f5c), shadeMat = M(0x3f6b5a);
  add(new THREE.BoxGeometry(0.2, 0.1, 0.16), clipMat, 0, 0.81, 0.03, boardGrp);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), clipMat, 0, 0.91, 0.18, boardGrp).rotation.x = 1.15;
  const lampShade = add(new THREE.ConeGeometry(0.18, 0.16, 14), shadeMat, 0, 0.92, 0.36, boardGrp);
  lampShade.rotation.x = -0.35;
  const lampBulb = add(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf1e6cc }), 0, 0.86, 0.34, boardGrp);
  lampBulb.castShadow = false;

  const easelLight = new THREE.PointLight(0xffd890, 0, 4.5, 1.6);
  easelLight.position.set(0, 0.65, 0.42);
  boardGrp.add(easelLight);

  App.onNightUpdate((dt, w, LV) => {
    easelLight.intensity = 1.35 * LV;
    artMat.emissiveIntensity = 0.1 + 0.48 * LV;
    lampBulb.material.color.set(LV > 0.25 ? 0xffe08a : 0xf1e6cc);
  });

  // ========== 畫布繪製：暖色畫紙濾鏡 ＋ 離線預設圖 ==========
  let offlineDataUrl = '';

  function drawFrameCaption(title, dateText) {
    const ctx = artCtx, W = 768, H = 480, pad = 18;
    ctx.strokeStyle = '#d8c5a8';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, W - pad * 2, H - 64);

    ctx.fillStyle = '#fdf8ec';
    ctx.fillRect(0, H - 46, W, 46);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a4a42';
    ctx.font = 'bold 21px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'left';
    const label = '🎨 ' + (title || '每日一圖');
    ctx.fillText(label.length > 26 ? label.slice(0, 25) + '…' : label, pad, H - 22);

    ctx.fillStyle = '#9a8474';
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(dateText || '', W - pad, H - 22);
  }

  function applyWarmPaperFilter(ctx, x, y, w, h) {
    // 柔暖米色濾鏡，降低攝影刺眼高對比以融入小鎮色調
    ctx.fillStyle = 'rgba(255, 240, 210, 0.16)';
    ctx.fillRect(x, y, w, h);

    // 柔和四角暈影
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.28, x + w / 2, y + h / 2, w * 0.65);
    g.addColorStop(0, 'rgba(255, 248, 232, 0)');
    g.addColorStop(1, 'rgba(250, 238, 214, 0.24)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // 細微畫紙紋理線條
    ctx.fillStyle = 'rgba(255, 252, 245, 0.05)';
    for (let i = 0; i < h; i += 6) ctx.fillRect(x, y + i, w, 1);
  }

  function drawLoadingPainting() {
    const ctx = artCtx;
    ctx.fillStyle = '#fdf8ec';
    ctx.fillRect(0, 0, 768, 480);
    ctx.fillStyle = '#f3e8d2';
    ctx.fillRect(18, 18, 732, 398);
    ctx.fillStyle = '#8a7a6e';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎨 每日一圖讀取中…', 384, 215);
    drawFrameCaption('每日一圖', '載入中');
    artTex.needsUpdate = true;
  }

  function drawOfflinePainting() {
    const ctx = artCtx, pad = 18, px = pad, py = pad, pw = 732, ph = 398;
    ctx.fillStyle = '#fdf8ec';
    ctx.fillRect(0, 0, 768, 480);

    const sky = ctx.createLinearGradient(0, py, 0, py + ph);
    sky.addColorStop(0, '#9bd6ff');
    sky.addColorStop(0.65, '#ffe8d6');
    sky.addColorStop(1, '#ffd5b8');
    ctx.fillStyle = sky;
    ctx.fillRect(px, py, pw, ph);

    // 暖陽與雲朵
    ctx.fillStyle = 'rgba(255, 224, 130, 0.9)';
    ctx.beginPath(); ctx.arc(590, 118, 42, 0, PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    [[180, 110, 34], [210, 102, 40], [245, 112, 30], [430, 92, 28], [460, 88, 34]].forEach(c => {
      ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, PI * 2); ctx.fill();
    });

    // 遠方 85 大樓可愛剪影與海面
    ctx.fillStyle = '#8db7c9';
    ctx.fillRect(520, 188, 34, 130);
    ctx.fillRect(505, 232, 64, 86);
    ctx.beginPath(); ctx.moveTo(537, 168); ctx.lineTo(529, 188); ctx.lineTo(545, 188); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#6dbad8';
    ctx.fillRect(px, 315, pw, 101);
    ctx.fillStyle = '#b7e39a';
    ctx.beginPath(); ctx.moveTo(px, 330); ctx.quadraticCurveTo(220, 275, 420, 330); ctx.lineTo(px, 360); ctx.closePath(); ctx.fill();

    // 小紅屋頂
    ctx.fillStyle = '#fff1dc'; ctx.fillRect(160, 268, 80, 48);
    ctx.fillStyle = '#f5a39b'; ctx.beginPath(); ctx.moveTo(150, 268); ctx.lineTo(200, 232); ctx.lineTo(250, 268); ctx.closePath(); ctx.fill();

    applyWarmPaperFilter(ctx, px, py, pw, ph);
    drawFrameCaption('高雄晴空小鎮（離線預設畫作）', 'Offline');
    artTex.needsUpdate = true;
    offlineDataUrl = artCanvas.toDataURL('image/png');
  }

  function drawImageToEasel(img, item) {
    const ctx = artCtx, pad = 18, px = pad, py = pad, pw = 732, ph = 398;
    ctx.fillStyle = '#fdf8ec';
    ctx.fillRect(0, 0, 768, 480);

    // Cover 等比例填滿裁切
    const ir = img.width / img.height, br = pw / ph;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
    else { sh = img.width / br; sy = (img.height - sh) / 2; }

    ctx.drawImage(img, sx, sy, sw, sh, px, py, pw, ph);
    applyWarmPaperFilter(ctx, px, py, pw, ph);
    drawFrameCaption(item.title, item.date);
    artTex.needsUpdate = true;
  }

  // ========== API 串接（daily.webp + picture/index.json） ==========
  let gallery = [];
  let curIndex = 0;
  let loadSeq = 0;
  let activeBase = PRIMARY_BASE;

  function fmtDateStr(s) {
    const clean = String(s || '').replace(/[^\d]/g, '');
    if (clean.length >= 8) return clean.slice(0, 4) + '-' + clean.slice(4, 6) + '-' + clean.slice(6, 8);
    return String(s || '');
  }

  function fallbackLast30Dates(base) {
    const list = [];
    const now = new Date(Date.now() + 288e5);
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 864e5);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const ds = `${y}-${m}-${day}`;
      list.push({
        date: ds,
        title: i === 0 ? '今日 Bing 精選桌布' : `${ds} 歷史精選桌布`,
        copyright: 'Bing 每日一圖（willow-god/daily-image）',
        url: i === 0 ? base + 'daily.webp' : base + `picture/${ds}.webp`,
        backupUrl: i === 0 ? BACKUP_BASE + 'daily.webp' : BACKUP_BASE + `picture/${ds}.webp`
      });
    }
    return list;
  }

  function normalizeIndex(raw, base) {
    let entries = [];
    if (Array.isArray(raw)) entries = raw;
    else if (raw && typeof raw === 'object') {
      const arr = raw.images || raw.data || raw.list || raw.items;
      if (Array.isArray(arr)) entries = arr;
      else entries = Object.entries(raw).map(([k, v]) => (typeof v === 'string' ? { date: k, title: v } : Object.assign({ date: k }, v)));
    }

    const items = entries.map((e, idx) => {
      const date = fmtDateStr(e.date || e.enddate || e.time || e.day || '');
      let title = e.title || e.caption || e.name || e.desc || '';
      let copyright = e.copyright || e.copyrightonly || e.author || '';
      if (!title && copyright) {
        const parts = copyright.split(/[（(]©/);
        title = parts[0].trim();
      }
      if (!title) title = idx === 0 ? '今日 Bing 精選桌布' : `${date || '歷史'} 精選桌布`;

      let rel = e.url || e.path || e.webp || e.file || e.src || '';
      if (rel && !/^https?:\/\//i.test(rel)) {
        rel = rel.replace(/^\/+/, '');
        if (!rel.includes('/')) rel = 'picture/' + rel;
      } else if (!rel && date) {
        rel = idx === 0 ? 'daily.webp' : `picture/${date}.webp`;
      }
      return {
        date: date || '今日',
        title,
        copyright: copyright || '© Bing / 原作者（僅供個人學習展示）',
        url: rel ? (/^https?:\/\//i.test(rel) ? rel : base + rel) : base + 'daily.webp',
        backupUrl: rel ? (/^https?:\/\//i.test(rel) ? rel : BACKUP_BASE + rel) : BACKUP_BASE + 'daily.webp'
      };
    }).filter(it => it.url);

    items.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    if (items.length) {
      items[0].url = base + 'daily.webp';
      items[0].backupUrl = BACKUP_BASE + 'daily.webp';
      return items.slice(0, 30);
    }
    return fallbackLast30Dates(base);
  }

  function loadImageCORS(url, backupUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ img, usedUrl: url });
      img.onerror = () => {
        if (backupUrl && backupUrl !== url) {
          const img2 = new Image();
          img2.crossOrigin = 'anonymous';
          img2.onload = () => resolve({ img: img2, usedUrl: backupUrl });
          img2.onerror = reject;
          img2.src = backupUrl;
        } else reject(new Error('Image load failed'));
      };
      img.src = url;
    });
  }

  async function selectArtwork(idx) {
    if (!gallery.length) return;
    curIndex = Math.max(0, Math.min(gallery.length - 1, idx));
    const item = gallery[curIndex];
    const seq = ++loadSeq;

    renderModalMeta(item, true);

    try {
      const { img, usedUrl } = await loadImageCORS(item.url, item.backupUrl);
      if (seq !== loadSeq) return;
      drawImageToEasel(img, item);
      renderModalMeta(item, false, usedUrl);
    } catch (e) {
      if (seq !== loadSeq) return;
      drawOfflinePainting();
      renderModalMeta({
        date: item.date,
        title: item.title + '（目前無法連線，顯示離線預設圖）',
        copyright: '離線展示圖・高雄氣象小鎮'
      }, false, offlineDataUrl);
    }
  }

  async function initDailyImage() {
    drawLoadingPainting();
    try {
      let res = await fetch(PRIMARY_BASE + 'picture/index.json');
      if (!res.ok) {
        activeBase = BACKUP_BASE;
        res = await fetch(BACKUP_BASE + 'picture/index.json');
      }
      if (res.ok) {
        const json = await res.json();
        gallery = normalizeIndex(json, activeBase);
      } else {
        gallery = fallbackLast30Dates(PRIMARY_BASE);
      }
    } catch (e) {
      gallery = fallbackLast30Dates(PRIMARY_BASE);
    }
    populateDateSelect();
    selectArtwork(0);
  }

  // ========== 2D 每日一圖賞析視窗 ==========
  function populateDateSelect() {
    const sel = $('easel-date-select');
    if (!sel) return;
    sel.innerHTML = gallery.map((it, i) => `<option value="${i}">${i === 0 ? '★ 今日 ' : ''}${it.date}</option>`).join('');
    sel.value = String(curIndex);
  }

  function renderModalMeta(item, loading, imgSrc) {
    const sel = $('easel-date-select');
    if (sel) sel.value = String(curIndex);
    if ($('easel-modal-date')) $('easel-modal-date').textContent = (curIndex === 0 ? '📅 今日精選 ・ ' : '📅 歷史回顧 ・ ') + item.date;
    if ($('easel-modal-title')) $('easel-modal-title').textContent = loading ? '讀取畫作中…' : item.title;
    if ($('easel-modal-copyright')) $('easel-modal-copyright').textContent = item.copyright;
    const imgEl = $('easel-modal-img');
    if (imgEl && imgSrc) imgEl.src = imgSrc;
    if ($('easel-prev')) $('easel-prev').disabled = curIndex >= gallery.length - 1;
    if ($('easel-next')) $('easel-next').disabled = curIndex <= 0;
  }

  function openModal() {
    const modal = $('easel-modal');
    if (!modal) return;
    modal.className = 'is-open';
    const item = gallery[curIndex];
    if (item && !$('easel-modal-img').src) selectArtwork(curIndex);
  }

  function closeModal() {
    const modal = $('easel-modal');
    if (modal) modal.className = '';
  }

  if ($('easel-modal-close')) $('easel-modal-close').onclick = closeModal;
  if ($('easel-modal')) $('easel-modal').onclick = e => { if (e.target.id === 'easel-modal') closeModal(); };
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  if ($('easel-prev')) $('easel-prev').onclick = () => selectArtwork(curIndex + 1);
  if ($('easel-next')) $('easel-next').onclick = () => selectArtwork(curIndex - 1);
  if ($('easel-today')) $('easel-today').onclick = () => selectArtwork(0);
  if ($('easel-date-select')) $('easel-date-select').onchange = e => selectArtwork(+e.target.value);
  if ($('easel-random')) {
    $('easel-random').onclick = () => {
      if (gallery.length <= 1) return;
      let r;
      do { r = Math.floor(Math.random() * gallery.length); } while (r === curIndex);
      selectArtwork(r);
    };
  }

  initDailyImage();

  App.easel = {
    group: easelGrp,
    openModal,
    refreshToday: () => initDailyImage()
  };
})(window.TownApp);