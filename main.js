(function (App) {
  const { W, S, runtime, cl, tpe, mon, seasonOf } = App;
  const { renderer, cv, sc, cam, climate, stage, atmosphere, waterfront, livingWorld, ui } = App;

  // ========== 鏡頭互動（滑鼠／觸控旋轉與滾輪縮放） ==========
  cv.addEventListener('pointerdown', e => {
    runtime.dg = [e.clientX, e.clientY];
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointerup', () => { runtime.dg = null; });
  cv.addEventListener('pointermove', e => {
    if (!runtime.dg) return;
    runtime.az -= (e.clientX - runtime.dg[0]) * 0.006;
    runtime.el = cl(runtime.el + (e.clientY - runtime.dg[1]) * 0.004, 0.08, 1.2);
    runtime.dg = [e.clientX, e.clientY];
  });
  cv.addEventListener('wheel', e => {
    runtime.dist = cl(runtime.dist + e.deltaY * 0.02, 10, 55);
  });

  function onResize() {
    renderer.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  }
  addEventListener('resize', onResize);
  onResize();

  // ========== 初始資料載入與定時更新 ==========
  ui.sync();
  waterfront.syncDay();
  climate.loadWeather();
  climate.loadTide();
  setInterval(() => { if (S.mode == 'live') climate.loadWeather(); }, 6e5);
  setInterval(() => climate.loadTide(), 36e5);

  // ========== 主動畫迴圈 ==========
  let t0 = performance.now(), hs = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - t0) / 1e3);
    t0 = now;
    runtime.tm += dt;

    if (S.mode == 'live') {
      S.T = tpe();
      if ((hs += dt) > 1) { hs = 0; ui.sync(); }
    } else if (S.mode == 'replay') {
      if (runtime.playing) S.T = (S.T + dt / 1.2) % 24;
      climate.applyHour(S.T);
      if ((hs += dt) > 0.1) { hs = 0; ui.sync(); }
    }

    const w = W[S.wx];
    const season = S.season == 'auto' ? seasonOf(mon()) : S.season;

    // 1. 天空、日月軌跡、風雨雪與儀表
    const atm = atmosphere.update(dt, w);

    // 2. 地景、季節樹木與草叢
    const snowF = w.s ? 1 : season == 'winter' ? 0.55 : 0;
    const wet = cl(Math.max(S.precip / 2, w.r ? 0.8 : 0), 0, 1);
    stage.update(dt, w, season, snowF, wet, atm.light, atm.gray, atm.wd, atm.dx, atm.dz);

    // 3. 高雄港與愛河
    waterfront.update(dt, w);

    // 4. 人物與動物
    livingWorld.update(dt, w, snowF, atm.dayOn);

    // 5. 統一通知各模組更新夜晚燈光與夜間生態
    runtime.LV += ((runtime.NIGHT ? 1 : 0) - runtime.LV) * Math.min(1, dt * 2);
    App.emitNightUpdate(dt, w, runtime.LV, runtime.NIGHT);

    // 6. 鏡頭位置與畫面渲染
    if (runtime.dg) runtime.lastTouch = runtime.tm;
    if (runtime.autoRot && !runtime.dg && runtime.tm - runtime.lastTouch > 2.5) runtime.az += dt * runtime.rotSp;
    cam.position.set(
      Math.sin(runtime.az) * Math.cos(runtime.el) * runtime.dist,
      2 + Math.sin(runtime.el) * runtime.dist,
      Math.cos(runtime.az) * Math.cos(runtime.el) * runtime.dist
    );
    cam.lookAt(0, 2, 0);
    renderer.render(sc, cam);

    // 7. 3D/2D 布告欄與 HUD 更新
    ui.update(dt, w, season);
  }

  requestAnimationFrame(loop);
})(window.TownApp);