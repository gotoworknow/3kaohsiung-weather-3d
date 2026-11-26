(function (App) {
  const { $, PI, W, SN, S, runtime, fmt, dirN } = App;
  const { sc, cam, cv, M, add, climate, atmosphere, waterfront } = App;

  // ========== 左側設定面板 ==========
  const CT = [
    ['temp', '2m 氣溫 °C', -5, 45, 0.1],
    ['app', '體感溫度 °C', -10, 55, 0.1],
    ['precip', '降雨量 mm', 0, 50, 0.1],
    ['wind', '風速 10m km/h', 0, 60, 0.5],
    ['dir', '風向（來向）°', 0, 359, 1],
    ['T', '時間', 0, 24, 0.05]
  ];

  $('controls-container').innerHTML =
    '<div class="control-row"><label>天氣狀態</label><select id="select-weather">' +
      Object.keys(W).map(k => `<option value="${k}">${W[k].n}</option>`).join('') +
    '</select></div>' +
    '<div class="control-row"><label>季節</label><select id="select-season"><option value="auto">自動（依日期）</option>' +
      Object.keys(SN).map(k => `<option value="${k}">${SN[k]}</option>`).join('') +
    '</select></div>' +
    CT.map(c => `<div class="control-row"><label>${c[1]}<b id="val-${c[0]}"></b></label><input type="range" id="input-${c[0]}" min="${c[2]}" max="${c[3]}" step="${c[4]}"></div>`).join('') +
    '<div class="control-row small-text" id="astro-summary"></div>';

  function sync() {
    CT.forEach(c => {
      const k = c[0], v = S[k];
      $('input-' + k).value = v;
      $('val-' + k).textContent = k == 'T' ? fmt(v) : k == 'dir' ? Math.round(v) + '° ' + dirN(v) : (+v).toFixed(1);
    });
    $('select-weather').value = S.wx;
    $('select-season').value = S.season;
    const A = climate.astro(), f = n => (n == null ? '—' : fmt(n));
    $('astro-summary').innerHTML = '☀ 日出 ' + f(A.sr) + '　日落 ' + f(A.ss) + '<br>🌙 月出 ' + f(A.mr) + '　月落 ' + f(A.ms) + '<br>月亮亮面 ' + Math.round((1 - Math.cos(2 * PI * S.phase)) / 2 * 100) + '%（SunCalc）';
  }

  function setPlay(v) {
    runtime.playing = v;
    $('btn-play-day').textContent = v ? '⏸ 暫停' : '▶ 播放一天';
    $('board-play').textContent = v ? '⏸ 暫停' : '▶ 自動播放';
  }

  function setMode(m) {
    if (m == S.mode) return;
    S.mode = m;
    $('mode-live').className = m == 'live' ? 'is-active' : '';
    $('mode-manual').className = m == 'manual' ? 'is-active' : '';
    $('mode-replay').className = m == 'replay' ? 'is-active' : '';
    if (m != 'replay') setPlay(false);
    if (m == 'live') { S.season = 'auto'; climate.loadWeather(); }
  }

  CT.forEach(c => $('input-' + c[0]).oninput = e => {
    S[c[0]] = +e.target.value;
    setMode(c[0] == 'T' && S.mode != 'manual' ? 'replay' : 'manual');
    sync();
  });
  $('select-weather').onchange = e => { S.wx = e.target.value; setMode('manual'); };
  $('select-season').onchange = e => { S.season = e.target.value; setMode('manual'); };
  $('btn-play-day').onclick = () => { if (S.mode != 'replay') setMode('replay'); setPlay(!runtime.playing); };
  $('mode-live').onclick = () => { S.mode = 'x'; setMode('live'); };
  $('mode-manual').onclick = () => setMode('manual');
  $('mode-replay').onclick = () => setMode('replay');
  $('mode-live').className = 'is-active';

  $('chk-sun-path').onchange = e => atmosphere.setSunPathVisible(e.target.checked);
  $('chk-solstice-path').onchange = e => atmosphere.setSolsticeVisible(e.target.checked);
  $('chk-auto-rotate').onchange = e => { runtime.autoRot = e.target.checked; runtime.lastTouch = -9; };
  $('select-rotate-speed').onchange = e => { runtime.rotSp = +e.target.value; };
  $('select-weekday').onchange = e => { S.weekday = e.target.value; waterfront.syncDay(); };

  $('panel-hide').onclick = () => { $('control-panel').className = 'is-hidden'; $('panel-toggle').style.display = 'block'; };
  $('panel-toggle').onclick = () => { $('control-panel').className = ''; $('panel-toggle').style.display = 'none'; };
  if (innerWidth < 700) $('panel-hide').onclick();

  // ========== 小鎮 3D 布告欄（含夜晚燈光） ==========
  const bGrp = new THREE.Group();
  bGrp.position.set(3.4, 0, 2.3); bGrp.rotation.y = 0.1; bGrp.scale.setScalar(0.8); sc.add(bGrp);
  const wood = M(0xb98a5a);
  [-1.9, 1.9].forEach(x => add(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8), wood, x, 1.1, -0.1, bGrp));
  add(new THREE.BoxGeometry(4.4, 2.5, 0.14), wood, 0, 1.95, 0, bGrp);
  add(new THREE.BoxGeometry(4.7, 0.16, 0.5), M(0x9c4f46), 0, 3.3, 0, bGrp);
  const bBulb = add(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf1e6cc }), 0, 3.15, 0.3, bGrp);
  bBulb.castShadow = false;
  const bLamp = new THREE.PointLight(0xffd890, 0, 7, 1.6);
  bLamp.position.set(0, 3.05, 0.6); bGrp.add(bLamp);

  const bc = document.createElement('canvas'); bc.width = 780; bc.height = 420;
  const bx = bc.getContext('2d'), bTex = new THREE.CanvasTexture(bc);
  const bScr = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.2), new THREE.MeshBasicMaterial({ map: bTex }));
  bScr.position.set(0, 1.95, 0.09); bGrp.add(bScr);
  let bKey = '';

  function drawBoard() {
    const HR = climate.HR;
    const h = Math.min(23, Math.max(0, Math.floor(S.T))), key = h + '|' + (+S.temp).toFixed(1) + '|' + HR[0] + HR[12];
    if (key == bKey) return;
    bKey = key;
    const vals = HR.concat([+S.temp]), mn = Math.floor(Math.min(...vals)) - 1, mx = Math.ceil(Math.max(...vals)) + 1;
    const x0 = 80, x1 = 740, y0 = 120, y1 = 350, px = i => x0 + (x1 - x0) * i / 23, py = v => y1 - (v - mn) / (mx - mn) * (y1 - y0);

    bx.fillStyle = '#fff7e6'; bx.fillRect(0, 0, 780, 420);
    bx.fillStyle = '#5a4a42'; bx.font = 'bold 34px sans-serif'; bx.textAlign = 'left'; bx.fillText('高雄・今日氣溫', 30, 56);
    bx.fillStyle = '#e0566b'; bx.font = 'bold 44px sans-serif'; bx.textAlign = 'right'; bx.fillText((+S.temp).toFixed(1) + '°C', 750, 60);
    bx.strokeStyle = '#e6d9c2'; bx.lineWidth = 2; bx.fillStyle = '#8a7a6e'; bx.font = '20px sans-serif';
    for (let k = 0; k <= 3; k++) {
      const v = mn + (mx - mn) * k / 3, y = py(v);
      bx.beginPath(); bx.moveTo(x0, y); bx.lineTo(x1, y); bx.stroke();
      bx.textAlign = 'right'; bx.fillText(Math.round(v), x0 - 8, y + 7);
    }
    bx.textAlign = 'center';
    [0, 6, 12, 18, 23].forEach(i => bx.fillText(String(i).padStart(2, '0'), px(i), y1 + 30));

    bx.lineWidth = 6; bx.lineJoin = 'round'; bx.strokeStyle = '#e0566b'; bx.setLineDash([]);
    bx.beginPath(); for (let i = 0; i < h; i++) bx[i ? 'lineTo' : 'moveTo'](px(i), py(HR[i])); bx.lineTo(px(h), py(+S.temp)); bx.stroke();
    bx.strokeStyle = '#5b83d9'; bx.setLineDash([16, 12]);
    bx.beginPath(); bx.moveTo(px(h), py(+S.temp)); for (let i = h + 1; i < 24; i++) bx.lineTo(px(i), py(HR[i])); bx.stroke();
    bx.setLineDash([]);
    bx.fillStyle = '#e0566b'; bx.beginPath(); bx.arc(px(h), py(+S.temp), 11, 0, PI * 2); bx.fill();
    bx.fillStyle = '#a08c7c'; bx.font = '20px sans-serif'; bx.textAlign = 'left'; bx.fillText('點我看詳細布告欄', 30, 408);
    bTex.needsUpdate = true;
  }

  App.onNightUpdate((dt, w, lv, NIGHT) => {
    bLamp.intensity = NIGHT ? 1.6 : 0;
    bBulb.material.color.set(NIGHT ? 0xffe08a : 0xf1e6cc);
  });

  // ========== 2D 詳細布告欄與 Chart.js ==========
  let curH = 0, chart = null, tcChart = null, ck = 0, fa = 0, cKey = '', tcKey = '';
  $('bulletin-header').onclick = () => { $('bulletin-board').className = ''; };
  $('board-time-slider').oninput = e => { S.T = +e.target.value; setMode('replay'); sync(); };
  $('board-play').onclick = () => { if (S.mode != 'replay') setMode('replay'); setPlay(!runtime.playing); };
  $('board-live').onclick = () => { S.mode = 'x'; setMode('live'); };

  function openBB() {
    $('bulletin-board').className = 'is-open';
    cKey = ''; tcKey = '';
    if (chart) chart.resize();
    if (tcChart) tcChart.resize();
  }

  if (typeof Chart !== 'undefined') {
    try {
      chart = new Chart($('temp-chart'), {
        type: 'line',
        data: {
          labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00'),
          datasets: [
            { label: '已發生（00:00～所選時間）', data: [], borderColor: '#e0566b', backgroundColor: '#e0566b', borderWidth: 3, tension: 0.35, pointRadius: c => (c.dataIndex == curH ? 5 : 0) },
            { label: '預測', data: [], borderColor: '#5b83d9', backgroundColor: '#5b83d9', borderWidth: 3, borderDash: [7, 5], tension: 0.35, pointRadius: c => (c.dataIndex == curH ? 5 : 0) }
          ]
        },
        options: {
          onClick: (e, el, ch) => { const q = ch.getElementsAtEventForMode(e, 'index', { intersect: false }, true); if (q.length) { S.T = q[0].index; setMode('replay'); sync(); } },
          animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { boxWidth: 18, font: { size: 11 } } } },
          scales: { x: { ticks: { maxTicksLimit: 7, font: { size: 10 } } }, y: { title: { display: true, text: '氣溫 °C' }, ticks: { font: { size: 10 } } } }
        }
      });
    } catch (e) { chart = null; }

    try {
      tcChart = new Chart($('tide-chart'), {
        type: 'line',
        data: {
          labels: Array.from({ length: 97 }, (_, i) => String(Math.floor(i / 4)).padStart(2, '0') + ':' + String((i % 4) * 15).padStart(2, '0')),
          datasets: [
            { label: '潮位 (m)', data: [], borderColor: '#3b82c4', backgroundColor: 'rgba(59,130,196,.18)', fill: true, borderWidth: 3, tension: 0.35, pointRadius: 0 },
            { label: '高潮', data: [], borderColor: '#e0566b', backgroundColor: '#e0566b', pointRadius: 6, showLine: false },
            { label: '低潮', data: [], borderColor: '#2d6a8a', backgroundColor: '#2d6a8a', pointRadius: 6, pointStyle: 'rectRot', showLine: false },
            { label: '現在', data: [], borderColor: '#f2b134', backgroundColor: '#f2b134', pointRadius: 7, showLine: false }
          ]
        },
        options: {
          onClick: (e, el, ch) => { const q = ch.getElementsAtEventForMode(e, 'index', { intersect: false }, true); if (q.length) { S.T = q[0].index / 4; setMode('replay'); sync(); } },
          animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { title: { display: true, text: '高雄港 今日潮汐', font: { size: 12 } }, legend: { labels: { boxWidth: 14, font: { size: 10 } } } },
          scales: { x: { ticks: { maxTicksLimit: 7, font: { size: 10 } } }, y: { title: { display: true, text: '潮位 m' }, ticks: { font: { size: 10 } } } }
        }
      });
    } catch (e) { tcChart = null; }
  }

  function tideChartUpdate() {
    if (!tcChart) return;
    const TE = climate.tide.info, TDsrc = climate.tide.src;
    const ci = Math.min(96, Math.max(0, Math.round(S.T * 4))), key = TDsrc + '|' + TE.ev.length + '|' + TE.hi.t.toFixed(2) + '|' + ci;
    if (key == tcKey) return;
    tcKey = key;
    const ln = [], hi = [], lo = [], cur = [];
    for (let i = 0; i <= 96; i++) { const v = +climate.tideH(i / 4).toFixed(3); ln.push(v); hi.push(null); lo.push(null); cur.push(i == ci ? v : null); }
    TE.ev.forEach(e => { const i = Math.round(e.t * 4); (e.k == '高' ? hi : lo)[i] = ln[i]; });
    const d = tcChart.data.datasets;
    d[0].data = ln; d[1].data = hi; d[2].data = lo; d[3].data = cur;
    tcChart.update('none');
  }

  function chartUpdate() {
    if (!chart) return;
    const HR = climate.HR;
    const h = Math.min(23, Math.max(0, Math.floor(S.T))), key = h + '|' + (+S.temp).toFixed(1) + '|' + HR[0] + HR[12];
    if (key == cKey) return;
    cKey = key; curH = h;
    const a = [], b = [];
    for (let i = 0; i < 24; i++) { a.push(i < h ? HR[i] : i == h ? +S.temp : null); b.push(i < h ? null : i == h ? +S.temp : HR[i]); }
    chart.data.datasets[0].data = a; chart.data.datasets[1].data = b;
    chart.update('none');
  }

// 3D 物件點擊偵測（布告欄 + 每日一圖畫架）
  const ray = new THREE.Raycaster(), mv2 = new THREE.Vector2();
  let pd = null;
  const isChildOf = (obj, root) => {
    for (let p = obj; p; p = p.parent) if (p === root) return true;
    return false;
  };
  const hitTarget = e => {
    mv2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mv2, cam);
    const targets = [bGrp, waterfront.harborBoard];
    if (App.easel && App.easel.group) targets.push(App.easel.group);
    const hits = ray.intersectObjects(targets, true);
    if (!hits.length) return null;
    if (App.easel && App.easel.group && isChildOf(hits[0].object, App.easel.group)) return 'easel';
    return 'board';
  };
  cv.addEventListener('pointerdown', e => { pd = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', e => {
    if (pd && Math.hypot(e.clientX - pd[0], e.clientY - pd[1]) < 6) {
      const t = hitTarget(e);
      if (t === 'easel') App.easel.openModal();
      else if (t === 'board') openBB();
    }
    pd = null;
  });
  cv.addEventListener('pointermove', e => { if (!runtime.dg) cv.style.cursor = hitTarget(e) ? 'pointer' : ''; });
  
  App.onSyncUI(sync);

  App.ui = {
    sync,
    openBB,
    update(dt, w, season) {
      if ((ck += dt) >= 0.1) {
        ck = 0;
        const t = ((S.T % 24) + 24) % 24, hh = Math.floor(t), mm = Math.floor((t - hh) * 60), ss = Math.floor(((t - hh) * 60 - mm) * 60);
        const p = n => String(n).padStart(2, '0');
        $('board-clock').textContent = p(hh) + ':' + p(mm) + ':' + p(ss);
        $('board-summary').textContent = (+S.temp).toFixed(1) + '°C　體感 ' + (+S.app).toFixed(1) + '°C　' + w.n;
        chartUpdate();
        drawBoard();
        $('tide-summary').textContent = climate.tideText();
        waterfront.drawHarbor();
        tideChartUpdate();
        if (document.activeElement !== $('board-time-slider')) $('board-time-slider').value = S.T;
      }

      if ((fa += dt) > 0.4) {
        fa = 0;
        $('hud-bar').textContent = `高雄市・${w.n}・${(+S.temp).toFixed(1)}°C（體感 ${(+S.app).toFixed(1)}°C）・降雨 ${(+S.precip).toFixed(1)}mm・風 ${Math.round(S.wind)}km/h ${dirN(S.dir)}風・${SN[season]}・${fmt(S.T)}`;
      }
    }
  };
})(window.TownApp);