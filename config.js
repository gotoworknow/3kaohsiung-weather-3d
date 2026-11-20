(function (global) {
  const PI = Math.PI;

  const App = {
    $: id => document.getElementById(id),
    PI,
    LAT: 22.6273,
    LNG: 120.3014,
    RZ0: 7.7,
    RZ1: 9.5,
    RZC: (7.7 + 9.5) / 2,
    KX: 0.4,
    KZ: -1.4,
    DOOR: [-3.9, 0.75],

    // 工具函式
    cl: (v, a, b) => Math.min(b, Math.max(a, v)),
    rnd: (a, b) => a + Math.random() * (b - a),
    fmt: h => {
      h = (h % 24 + 24) % 24;
      const m = Math.round(h * 60) % 1440;
      return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    },
    dirN: d => ['北', '東北', '東', '東南', '南', '西南', '西', '西北'][Math.round(d / 45) % 8],
    sgn: h => (h >= 0 ? '+' : '−') + Math.abs(h).toFixed(2) + ' m',
    midTW: () => Math.floor((Date.now() + 288e5) / 864e5) * 864e5 - 288e5,
    tpe: () => (Date.now() / 36e5 + 8) % 24,
    mon: () => new Date(Date.now() + 8 * 36e5).getUTCMonth(),
    seasonOf: m => (m >= 2 && m <= 4 ? 'spring' : m <= 7 && m >= 5 ? 'summer' : m <= 10 && m >= 8 ? 'autumn' : 'winter'),
    livePhase: () => (((Date.now() / 864e5 - 10962.76) / 29.530588) % 1 + 1) % 1,
    code: c => (c == 0 ? 'clear' : c <= 2 ? 'cloudy' : c == 3 ? 'overcast' : c <= 48 ? 'fog' : c <= 57 ? 'drizzle' : c <= 67 ? 'rain' : c <= 77 ? 'snow' : c <= 82 ? 'shower' : c <= 86 ? 'snow' : 'thunder'),

    // 天氣與亮度設定
    W: {
      clear: { n: '晴天', c: 0 },
      cloudy: { n: '多雲', c: 5 },
      overcast: { n: '陰天', c: 9, d: 0.35 },
      fog: { n: '霧', c: 4, f: 1, d: 0.1 },
      drizzle: { n: '毛毛雨', c: 8, d: 0.3, r: 150 },
      rain: { n: '雨天', c: 9, d: 0.45, r: 450 },
      shower: { n: '陣雨', c: 8, d: 0.4, r: 650 },
      thunder: { n: '雷雨', c: 10, d: 0.7, r: 700, t: 1 },
      snow: { n: '下雪', c: 8, d: 0.2, s: 500 }
    },
    BR: {
      clear: [1, 1], cloudy: [0.72, 0.9], overcast: [0.34, 0.75],
      fog: [0.38, 0.8], drizzle: [0.3, 0.72], rain: [0.24, 0.66],
      shower: [0.22, 0.64], thunder: [0.12, 0.55], snow: [0.5, 0.85]
    },
    SN: { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },

    // 四季配色與樹木參數
    GR: { spring: 0xb7e39a, summer: 0x86d36f, autumn: 0xe3c76d, winter: 0xdfe9ee },
    CR: { spring: 0xb6e388, summer: 0x2f8f4e, autumn: 0xf2b134, winter: 0xf3f7fa },
    FL: { spring: [0xff9fc0, 0xffffff, 0xffe27a], summer: [0xffd84d, 0xff8a8a], autumn: [0xe8864a], winter: [] },
    CS: { spring: 0.78, summer: 1.05, autumn: 0.95, winter: 0.01 },
    TR: { spring: 0x9c6f4e, summer: 0x8a5f40, autumn: 0x8a6347, winter: 0x6f5a4c },
    LC: {
      spring: { n: 0, z: 0.9, c: [0xb9ee8a, 0xa6e07a, 0xcdf5a0] },
      summer: { n: 0, z: 1.3, c: [0x1f6e3c, 0x2a8048, 0x17592f] },
      autumn: { n: 0, z: 1.1, c: [0xf2b134, 0xf28c1f, 0xd63a2b] },
      winter: { n: 0, z: 1, c: [0x8c5a2b] }
    },
    AUT: [0xf2b134, 0xf28c1f, 0xd63a2b],
    WIN: [0x6f4e37, 0x5c4033, 0x8b5a2b, 0x7a5230],
    FALLC: {
      spring: [0xb6e388, 0xa6e07a, 0xcdf5a0],
      summer: [0x2f8f4e, 0x1f6e3c, 0x2a8048],
      autumn: [0xf2b134, 0xf28c1f, 0xd63a2b],
      winter: [0x6f4e37, 0x5c4033, 0x8b5a2b]
    },
    FALLN: { spring: 50, summer: 40, autumn: 110, winter: 60 },

    // 港口每週排程
    WK: {
      1: { n: '週一：空貨櫃船漂浮，不靠港', v: 'cargo', dock: 0, fill: 'empty', cap: 3, yh: 3, ycap: 3, cm: 'off' },
      2: { n: '週二：堆場 3 層・船靠港・吊臂最高 1 層貨櫃', v: 'cargo', dock: 1, fill: 'rand', cap: 1, yh: 3, ycap: 3, cm: 'ops' },
      3: { n: '週三：堆場 2 層・船靠港・吊臂最高 2 層貨櫃', v: 'cargo', dock: 1, fill: 'rand', cap: 2, yh: 2, ycap: 2, cm: 'ops' },
      4: { n: '週四：堆場 1 層・船靠港・吊臂最高 3 層貨櫃', v: 'cargo', dock: 1, fill: 'rand', cap: 3, yh: 1, ycap: 1, cm: 'ops' },
      5: { n: '週五：滿載貨櫃船漂浮，不靠港', v: 'cargo', dock: 0, fill: 'full', cap: 3, yh: 0, ycap: 3, cm: 'off' },
      6: { n: '週六：白色雙層觀光遊艇停泊・吊臂固定鎖定', v: 'yacht', dock: 1, fill: 'empty', cap: 3, yh: 2, ycap: 3, cm: 'locked' },
      0: { n: '週日：觀光遊艇漂浮・吊臂整理堆場', v: 'yacht', dock: 0, fill: 'empty', cap: 3, yh: 'rand', ycap: 3, cm: 'tidy' }
    },

    // 共用氣象與執行狀態
    S: {
      temp: 29, app: 33, wx: 'cloudy', precip: 0, wind: 10, dir: 200,
      T: 12, season: 'auto', sr: 5.8, ss: 18.4, phase: 0.5, mode: 'live', weekday: 'auto'
    },
    runtime: {
      NIGHT: false, LV: 0, WY: -1.2, tm: 0,
      playing: false, autoRot: false, rotSp: 0.15,
      az: 0.5, el: 0.4, dist: 27, dg: null, lastTouch: -9
    },

    // 跨模組事件掛鉤 (解耦夜晚燈光、潮汐重算、UI 同步)
    _nightHandlers: [],
    _tideHandlers: [],
    _syncHandlers: [],
    onNightUpdate(fn) { this._nightHandlers.push(fn); },
    onTideReady(fn) { this._tideHandlers.push(fn); },
    onSyncUI(fn) { this._syncHandlers.push(fn); },
    emitNightUpdate(dt, w, lv, night) { this._nightHandlers.forEach(fn => fn(dt, w, lv, night)); },
    emitTideReady() { this._tideHandlers.forEach(fn => fn()); },
    emitSyncUI() { this._syncHandlers.forEach(fn => fn()); },

    // 預設地面高度查詢（由 waterfront.js 覆寫加上小橋高度）
    bridgeY: () => 0
  };

  global.TownApp = App;
})(window);