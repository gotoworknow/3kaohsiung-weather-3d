(function (App) {
  const { LAT, LNG, S, midTW, livePhase, code, fmt, sgn, PI } = App;

  let AS = { key: -1 };

  function astro() {
    const mid = midTW();
    const key = Math.round(mid / 864e5);
    if (AS.key == key) return AS;

    const tt = SunCalc.getTimes(new Date(mid + 12 * 36e5), LAT, LNG);
    let mr = null, ms = null;
    let prev = SunCalc.getMoonPosition(new Date(mid), LAT, LNG).altitude;
    for (let i = 1; i <= 48; i++) {
      const al = SunCalc.getMoonPosition(new Date(mid + i * 18e5), LAT, LNG).altitude;
      if (mr == null && prev < 0 && al >= 0) mr = (i - 1 + (-prev) / (al - prev)) / 2;
      if (ms == null && prev >= 0 && al < 0) ms = (i - 1 + prev / (prev - al)) / 2;
      prev = al;
    }
    return AS = { key, sr: (tt.sunrise - mid) / 36e5, ss: (tt.sunset - mid) / 36e5, mr, ms };
  }

  function demoHR() {
    return Array.from({ length: 24 }, (_, i) => +(26 + 5 * Math.sin((i - 9) * PI / 12)).toFixed(1));
  }

  function demoHD() {
    const t = demoHR();
    return {
      t,
      a: t.map(v => +(v + 3).toFixed(1)),
      p: t.map((_, i) => (i >= 14 && i <= 17 ? +(2 + i % 3).toFixed(1) : 0)),
      c: t.map((_, i) => (i >= 14 && i <= 17 ? 81 : i < 8 ? 3 : 1)),
      ws: t.map((_, i) => 8 + (i % 5) * 2),
      wd: t.map((_, i) => 200 + i * 4)
    };
  }

  const climate = {
    HD: demoHD(),
    HR: null,
    tide: {
      data: null,
      src: '估算',
      info: { mean: 0, hi: { t: 0, h: 0 }, lo: { t: 0, h: 0 }, ev: [] }
    },
    astro,
    demoHD,

    applyHour(T) {
      const HD = climate.HD;
      const i = Math.min(23, Math.floor(T));
      const j = Math.min(23, i + 1);
      const f = T - i;
      const L = a => a[i] + (a[j] - a[i]) * f;
      S.temp = L(HD.t);
      S.app = L(HD.a);
      S.precip = L(HD.p);
      S.wind = L(HD.ws);
      const d0 = HD.wd[i];
      const df = ((HD.wd[j] - d0 + 540) % 360) - 180;
      S.dir = (d0 + df * f + 360) % 360;
      S.wx = code(HD.c[f < 0.5 ? i : j]);
    },

    async loadWeather() {
      const st = App.$('status-text');
      if (st) st.textContent = '讀取 Open-Meteo 即時資料…';
      try {
        const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=22.6273&longitude=120.3014&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=Asia%2FTaipei&forecast_days=1');
        const j = await r.json();
        const c = j.current;
        const hm = s => { const t = s.split('T')[1].split(':'); return +t[0] + t[1] / 60; };
        Object.assign(S, {
          temp: c.temperature_2m,
          app: c.apparent_temperature,
          precip: c.precipitation,
          wind: c.wind_speed_10m,
          dir: c.wind_direction_10m,
          wx: code(c.weather_code),
          sr: hm(j.daily.sunrise[0]),
          ss: hm(j.daily.sunset[0]),
          season: 'auto',
          phase: livePhase()
        });
        const hh = j.hourly;
        const g = k => hh[k].slice(0, 24);
        climate.HD = {
          t: g('temperature_2m'),
          a: g('apparent_temperature'),
          p: g('precipitation'),
          c: g('weather_code'),
          ws: g('wind_speed_10m'),
          wd: g('wind_direction_10m')
        };
        climate.HR = climate.HD.t;
        if (st) st.textContent = '✅ 即時資料 · 高雄 22.6273, 120.3014 · ' + c.time.replace('T', ' ');
      } catch (e) {
        Object.assign(S, {
          temp: 29, app: 33, precip: 0, wind: 10, dir: 200, wx: 'cloudy',
          sr: 5.8, ss: 18.4, season: 'auto', phase: livePhase()
        });
        climate.HD = demoHD();
        climate.HR = climate.HD.t;
        if (st) st.textContent = '⚠️ 無法連線，改用示範資料（請用本機瀏覽器開啟，或檢查網路）';
      }
      App.emitSyncUI();
    },

    tideH(T) {
      const TD = climate.tide.data;
      if (TD) {
        const i = Math.min(23, Math.max(0, Math.floor(T)));
        const j = Math.min(23, i + 1);
        const f = Math.min(1, T - i);
        const u = (1 - Math.cos(PI * f)) / 2;
        return TD[i] + (TD[j] - TD[i]) * u;
      }
      const ta = midTW() / 36e5 + T;
      return 0.27 * Math.sin(2 * PI * ta / 12.4206 + 1.1) + 0.12 * Math.sin(2 * PI * ta / 24.8412 + 2.3);
    },

    tideCalc() {
      let hi = { t: 0, h: -9 }, lo = { t: 0, h: 9 }, sum = 0, n = 0;
      const hs = [];
      for (let t = 0; t <= 24; t += 0.05) {
        const h = climate.tideH(t);
        hs.push(h);
        if (h > hi.h) hi = { t, h };
        if (h < lo.h) lo = { t, h };
        sum += h;
        n++;
      }
      const ev = [];
      for (let i = 1; i < hs.length - 1; i++) {
        const t = i * 0.05;
        if (hs[i] > hs[i - 1] && hs[i] >= hs[i + 1]) ev.push({ k: '高', t, h: hs[i] });
        else if (hs[i] < hs[i - 1] && hs[i] <= hs[i + 1]) ev.push({ k: '低', t, h: hs[i] });
      }
      climate.tide.info = { mean: sum / n, hi, lo, ev };
    },

    tideBuild() {
      climate.tideCalc();
      App.emitTideReady();
    },

    tideY(h) {
      return -1.15 + (h - climate.tide.info.mean) * 1.6;
    },

    tideText() {
      const TE = climate.tide.info;
      const h = climate.tideH(S.T);
      const up = climate.tideH(S.T + 0.1) >= h;
      return '🌊 現在 ' + sgn(h) + (up ? ' ↑漲潮' : ' ↓退潮') +
        '｜最高潮 ' + fmt(TE.hi.t) + ' ' + sgn(TE.hi.h) +
        '｜最低潮 ' + fmt(TE.lo.t) + ' ' + sgn(TE.lo.h) + '（' + climate.tide.src + '）';
    },

    async loadTide() {
      try {
        const r = await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=22.6143&longitude=120.2733&hourly=sea_level_height_msl&timezone=Asia%2FTaipei&forecast_days=1');
        const j = await r.json();
        const a = (j.hourly.sea_level_height_msl || []).slice(0, 24);
        if (a.length == 24 && a.every(v => typeof v == 'number' && isFinite(v))) {
          climate.tide.data = a;
          climate.tide.src = 'Open-Meteo Marine';
        } else {
          climate.tide.data = null;
          climate.tide.src = '估算';
        }
      } catch (e) {
        climate.tide.data = null;
        climate.tide.src = '估算（離線）';
      }
      climate.tideBuild();
    }
  };

  climate.HR = climate.HD.t;
  climate.tideCalc();
  App.climate = climate;
})(window.TownApp);
