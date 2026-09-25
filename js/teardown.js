/*
 * TEARDOWN: o iPhone da foto se desmonta com o scroll.
 *
 * A própria foto (assets/iphone.png) é recortada em peças: tampa de vidro, platô das câmeras,
 * lentes, botões e estrutura. Os componentes internos (bateria, placa, MagSafe, tela...) são
 * desenhados num retângulo "plano" do aparelho e projetados na perspectiva da foto por uma
 * homografia (CSS matrix3d). Cada peça desliza ao longo do eixo perpendicular ao aparelho,
 * formando uma vista explodida; no fim ele se monta de novo.
 *
 * Coordenadas de "imagem" = pixels da foto (2009 x 783).
 * Coordenadas "locais" = traseira do aparelho vista de frente, LW x LH, origem no canto das câmeras.
 */
(() => {
  'use strict';

  const IMG_W = 2009, IMG_H = 783;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEBUG = /[?&]debug\b/.test(location.search);

  const section = document.getElementById('inicio');
  const sticky = section.querySelector('.stage');
  const stage = sticky.querySelector('.td-stage');
  const srcImg = stage.querySelector('.td-src');
  const heroCopy = sticky.querySelector('.hero-copy');
  const hint = sticky.querySelector('.scroll-hint');
  const bar = sticky.querySelector('.td-progress i');
  const caps = [...sticky.querySelectorAll('[data-in]')];

  // ---------------------------------------------------------------- helpers
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function solveHomography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [X, Y] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
    }
    const n = 8;
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const h = b.map((v, i) => v / A[i][i]);
    return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
  }
  function invert3(m) {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
      [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
      [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
      [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
    ];
  }
  const project = (m, x, y) => { const w = m[2][0] * x + m[2][1] * y + m[2][2]; return [(m[0][0] * x + m[0][1] * y + m[0][2]) / w, (m[1][0] * x + m[1][1] * y + m[1][2]) / w]; };
  const cssMatrix = (m) => `matrix3d(${m[0][0]},${m[1][0]},0,${m[2][0]},${m[0][1]},${m[1][1]},0,${m[2][1]},0,0,1,0,${m[0][2]},${m[1][2]},0,${m[2][2]})`;

  function roundRectPts(x, y, w, h, r, n = 10) {
    const pts = [];
    const arc = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
    return pts;
  }
  const ellipsePts = (cx, cy, rx, ry, n = 56) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  function capsulePts([ax, ay], [bx, by], w, n = 10) {
    const u = norm([bx - ax, by - ay]), a0 = Math.atan2(u[1], u[0]), r = w / 2, pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 - Math.PI / 2 + (i / n) * Math.PI; pts.push([bx + Math.cos(a) * r, by + Math.sin(a) * r]); }
    for (let i = 0; i <= n; i++) { const a = a0 + Math.PI / 2 + (i / n) * Math.PI; pts.push([ax + Math.cos(a) * r, ay + Math.sin(a) * r]); }
    return pts;
  }
  function roundPolyPts(poly, r, n = 8) {
    const out = [];
    poly.forEach((B, i) => {
      const A = poly[(i - 1 + poly.length) % poly.length], C = poly[(i + 1) % poly.length];
      const u1 = norm([A[0] - B[0], A[1] - B[1]]), u2 = norm([C[0] - B[0], C[1] - B[1]]);
      const p1 = [B[0] + u1[0] * r, B[1] + u1[1] * r], p2 = [B[0] + u2[0] * r, B[1] + u2[1] * r];
      for (let k = 0; k <= n; k++) {
        const t = k / n, s = 1 - t;
        out.push([s * s * p1[0] + 2 * s * t * B[0] + t * t * p2[0], s * s * p1[1] + 2 * s * t * B[1] + t * t * p2[1]]);
      }
    });
    return out;
  }
  function bbox(pts, pad = 4) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
    return { x: x0, y: y0, w: Math.ceil(x1 + pad) - x0, h: Math.ceil(y1 + pad) - y0 };
  }
  const centroid = (pts) => { let x = 0, y = 0; pts.forEach((p) => { x += p[0]; y += p[1]; }); return [x / pts.length, y / pts.length]; };
  const trace = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function rng(seed) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------------------------------------------------------------- geometria medida na foto
  const LW = 780, LH = 1630;
  // cantos da tampa de vidro (canto vivo, antes do arredondamento): câmeras/longe, câmeras/perto, conector/perto, conector/longe
  const QUAD = [[1460, 8], [1857, 215], [675, 691], [294, 456]];
  const H = solveHomography([[0, 0], [LW, 0], [LW, LH], [0, LH]], QUAD);
  const HINV = invert3(H);
  const toImg = (x, y) => project(H, x, y);
  const toLocal = (x, y) => project(HINV, x, y);

  const PHONE_C = [1060, 380];
  const PHONE_HULL = [[320, 462], [350, 428], [1370, 32], [1460, 10], [1790, 165], [1826, 212], [1826, 240], [1790, 298], [680, 735], [620, 723], [320, 521]];
  const GLASS = roundRectPts(0, 0, LW, LH, 118, 12).map(([x, y]) => toImg(x, y));
  const PLATEAU = roundPolyPts([[1167, 131], [1500, 5], [1784, 187], [1485, 313]], 50);
  const PLATEAU_HOLE = PLATEAU;             // abertura da tampa de vidro para o conjunto de câmeras
  const LENSES = [
    { id: 'lensLeft', cx: 1299, cy: 121, rx: 93, ry: 50 },
    { id: 'lensTop', cx: 1447, cy: 55, rx: 90, ry: 45 },
    { id: 'lensRight', cx: 1506, cy: 150, rx: 89, ry: 49 },
  ].map((l) => ({ ...l, pts: ellipsePts(l.cx, l.cy, l.rx, l.ry) }));
  const BUTTONS = [
    { id: 'btn1', a: [1336, 452], b: [1418, 418], w: 28 },
    { id: 'btn2', a: [1458, 403], b: [1538, 370], w: 28 },
    { id: 'btn3', a: [1586, 350], b: [1626, 334], w: 26 },
  ].map((b) => ({ ...b, pts: capsulePts(b.a, b.b, b.w) }));
  const LOGO_C = toLocal(1040, 352);         // MagSafe fica centrado no logo

  // retângulos locais [x, y, w, h]
  const CAM_RECT = [24, 24, 372, 392];
  const BOARD = { x0: 26, x1: LW - 26, y0: 24, yMid: 430, y1: 575, xm: 416 };
  const BATT_RECT = [52, 612, LW - 104, 800];
  const MAG_RECT = [LOGO_C[0] - 270, LOGO_C[1] - 270, 540, 600];
  const TAPTIC_RECT = [70, 1446, 260, 100];
  const SPEAKER_RECT = [452, 1446, 250, 104];
  const FLEX_RECT = [300, 1420, 170, 190];

  // ---------------------------------------------------------------- desenhos
  const metal = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const steel = (ctx, x, y, w, h) => metal(ctx, x, y, x + w, y + h, [[0, '#eef0f2'], [0.45, '#a9aeb5'], [0.55, '#c8ccd1'], [1, '#7c828a']]);
  const K_PATH = 'M48 8H95L78 93L183 8H230L101 112L193 183H145L71 126L60 183H13Z';

  const draw = {
    tray(ctx, w, h) {
      rr(ctx, 0, 0, w, h, 118); ctx.fillStyle = metal(ctx, 0, 0, w, h, [[0, '#1d1f23'], [1, '#0d0e10']]); ctx.fill();
      rr(ctx, 26, 26, w - 52, h - 52, 96); ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#08090a';
      rr(ctx, ...CAM_RECT, 60); ctx.fill();
      rr(ctx, ...BATT_RECT, 30); ctx.fill();
      rr(ctx, 40, 1430, w - 80, 150, 30); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 6; i++) ctx.fillRect(60 + i * 118, 1600, 60, 6);
      ctx.fillStyle = '#3a3d42';
      [[64, 590], [716, 590], [64, 1412], [716, 1412], [440, 440], [740, 300], [240, 1590], [560, 1590]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); });
    },
    camera(ctx, w, h) {
      rr(ctx, 0, 0, w, h, 54); ctx.fillStyle = metal(ctx, 0, 0, w, h, [[0, '#2b2e33'], [1, '#131417']]); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 3; ctx.stroke();
      // flex das câmeras
      ctx.fillStyle = '#c27d1c'; ctx.fillRect(w - 40, h * 0.55, 60, 70);
      LENS_LOCAL.forEach(([lx, ly], i) => {
        const x = lx - CAM_RECT[0], y = ly - CAM_RECT[1], r = i === 1 ? 74 : 70;
        ctx.beginPath(); ctx.arc(x, y, r + 16, 0, 7); ctx.fillStyle = '#0c0d0f'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = steel(ctx, x - r, y - r, 2 * r, 2 * r); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, 7); ctx.fillStyle = '#050507'; ctx.fill();
        const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 2, x, y, r * 0.7);
        g.addColorStop(0, '#6d8fe0'); g.addColorStop(0.35, '#1c2d5c'); g.addColorStop(1, '#050507');
        ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 7); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.26, r * 0.12, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
      });
    },
    board(ctx) {
      const { x0, x1, y0, yMid, y1, xm } = BOARD, ox = x0, oy = y0;
      ctx.translate(-ox, -oy);
      ctx.beginPath();
      ctx.moveTo(xm + 40, y0); ctx.lineTo(x1 - 90, y0); ctx.quadraticCurveTo(x1, y0, x1, y0 + 90);
      ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, yMid); ctx.lineTo(xm, yMid); ctx.lineTo(xm, y0 + 40); ctx.quadraticCurveTo(xm, y0, xm + 40, y0); ctx.closePath();
      ctx.fillStyle = '#0b2a15'; ctx.fill();
      ctx.save(); ctx.clip();
      const R = rng(11);
      ctx.lineCap = 'round';
      for (let i = 0; i < 220; i++) {
        let x = lerp(x0, x1, R()), y = lerp(y0, y1, R());
        ctx.strokeStyle = R() > 0.8 ? 'rgba(212,168,74,.6)' : 'rgba(61,160,80,.45)'; ctx.lineWidth = R() > 0.7 ? 2.4 : 1.2;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) { const l = 14 + R() * 60, d = Math.floor(R() * 3); if (d === 0) x += l; else if (d === 1) y += l; else { x += l * 0.7; y += l * 0.7; } ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
      // blindagens e chip
      const shield = (x, y, w, h) => { rr(ctx, x, y, w, h, 10); ctx.fillStyle = steel(ctx, x, y, w, h); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke(); };
      shield(xm + 34, 70, 250, 250);
      shield(xm + 34, 340, 150, 70);
      shield(60, yMid + 30, 250, 110);
      shield(360, yMid + 30, 200, 110);
      rr(ctx, xm + 94, 130, 130, 130, 10); ctx.fillStyle = '#121316'; ctx.fill();
      rr(ctx, xm + 122, 158, 74, 74, 6); ctx.fillStyle = metal(ctx, 0, 158, 0, 232, [[0, '#e3c16d'], [1, '#9d7a2c']]); ctx.fill();
      ctx.fillStyle = '#0a0b0d';
      [[xm + 60, 26 + 330], [590, yMid + 150], [x1 - 70, 180], [120, yMid + 150]].forEach(([x, y]) => { rr(ctx, x, y, 70, 30, 5); ctx.fill(); });
      const r2 = rng(5);
      for (let i = 0; i < 90; i++) {
        const x = lerp(x0 + 10, x1 - 20, r2()), y = lerp(y0 + 10, y1 - 20, r2());
        if (y < yMid && x < xm + 10) continue;
        ctx.fillStyle = ['#1b1b1d', '#b49467', '#3a3d42', '#d4a84a'][Math.floor(r2() * 4)];
        ctx.fillRect(x, y, 6 + r2() * 12, 4 + r2() * 7);
      }
      ctx.fillStyle = 'rgba(220,240,225,.55)'; ctx.font = '700 18px Montserrat, sans-serif'; ctx.fillText('KTEC', x1 - 90, y1 - 18);
    },
    battery(ctx, w, h) {
      rr(ctx, 0, 0, w, h, 26); ctx.fillStyle = metal(ctx, 0, 0, w, h, [[0, '#1d2024'], [1, '#101113']]); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#c27d1c'; ctx.fillRect(w - 180, -22, 120, 36);
      ctx.fillStyle = '#e9ecef'; ctx.font = '800 64px Montserrat, sans-serif'; ctx.fillText('Li-ion', 60, 150);
      ctx.fillStyle = '#9ca3a9'; ctx.font = '600 24px Manrope, sans-serif';
      ['Polymer Battery · 3,87 V', 'Não descarte no fogo', 'Não perfure nem amasse'].forEach((t, i) => ctx.fillText(t, 62, 205 + i * 38));
      ctx.strokeStyle = '#5b6168'; ctx.lineWidth = 2; ctx.strokeRect(62, 360, 120, 120);
      for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) if ((i * 7 + j * 3) % 4 === 0) { ctx.fillStyle = '#8c939a'; ctx.fillRect(68 + i * 11, 366 + j * 11, 9, 9); }
      ctx.fillStyle = '#3dcc3d'; ctx.fillRect(0, h - 120, w, 10);
      ctx.fillStyle = '#3dcc3d'; ctx.font = 'italic 800 30px Montserrat, sans-serif'; ctx.fillText('KTEC · TESTADO', 62, h - 50);
    },
    magsafe(ctx, w) {
      const cx = w / 2, cy = 270;
      for (let i = 0; i < 18; i++) {
        const a0 = (i / 18) * Math.PI * 2 + 0.03, a1 = ((i + 1) / 18) * Math.PI * 2 - 0.03;
        ctx.beginPath(); ctx.arc(cx, cy, 262, a0, a1); ctx.arc(cx, cy, 224, a1, a0, true); ctx.closePath();
        ctx.fillStyle = i % 2 ? '#6f747b' : '#8d9299'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 214, 0, 7); ctx.fillStyle = '#121316'; ctx.fill();
      for (let r = 196; r > 70; r -= 5) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.strokeStyle = (r / 5) % 2 ? '#e0a36a' : '#9a5426'; ctx.lineWidth = 3.4; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy, 68, 0, 7); ctx.fillStyle = '#0c0d0f'; ctx.fill();
      rr(ctx, cx - 40, cy + 285, 80, 34, 8); ctx.fillStyle = '#7b8087'; ctx.fill();
      ctx.fillStyle = '#c27d1c'; ctx.save(); ctx.translate(cx + 210, cy + 170); ctx.rotate(0.6); ctx.fillRect(0, 0, 40, 150); ctx.restore();
    },
    taptic(ctx, w, h) {
      rr(ctx, 0, 0, w, h, 16); ctx.fillStyle = steel(ctx, 0, 0, w, h); ctx.fill();
      rr(ctx, 26, 22, w - 52, h - 44, 8); ctx.fillStyle = '#15171a'; ctx.fill();
      ctx.fillStyle = '#9ca3a9'; ctx.font = '700 20px Manrope, sans-serif'; ctx.fillText('Taptic Engine', 44, h / 2 + 7);
    },
    speaker(ctx, w, h) {
      rr(ctx, 0, 0, w, h, 16); ctx.fillStyle = metal(ctx, 0, 0, 0, h, [[0, '#26282d'], [1, '#101114']]); ctx.fill();
      ctx.fillStyle = '#3a3d44';
      for (let x = 22; x < w - 14; x += 18) for (let y = 22; y < h - 14; y += 18) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
    },
    flex(ctx, w, h) {
      ctx.fillStyle = '#c27d1c'; rr(ctx, w / 2 - 24, 0, 48, h - 60, 8); ctx.fill();
      rr(ctx, 10, h - 78, w - 20, 70, 22); ctx.fillStyle = steel(ctx, 10, h - 78, w - 20, 70); ctx.fill();
      rr(ctx, 44, h - 56, w - 88, 26, 13); ctx.fillStyle = '#0a0a0c'; ctx.fill();
    },
    display(ctx, w, h) {
      rr(ctx, 0, 0, w, h, 118); ctx.fillStyle = '#050506'; ctx.fill();
      ctx.save(); rr(ctx, 16, 16, w - 32, h - 32, 104); ctx.clip();
      ctx.fillStyle = '#020403'; ctx.fillRect(0, 0, w, h);
      const blob = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
      blob(w * 0.1, h * 0.92, w * 1.1, 'rgba(61,204,61,.6)');
      blob(w, h * 0.3, w * 0.9, 'rgba(120,40,60,.8)');
      blob(w * 0.5, h * 0.55, w * 0.6, 'rgba(61,204,61,.25)');
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 36px Manrope, sans-serif'; ctx.fillText('Ijuí · RS', w / 2, 250);
      ctx.fillStyle = '#fff'; ctx.font = '700 200px Montserrat, sans-serif'; ctx.fillText('9:41', w / 2, 440);
      const s = 1.7; ctx.save(); ctx.translate(w / 2 - 122 * s, h * 0.52 - 96 * s); ctx.scale(s, s);
      const p = new Path2D(K_PATH); ctx.lineJoin = 'miter'; ctx.miterLimit = 12;
      ctx.shadowColor = 'rgba(61,204,61,.9)'; ctx.shadowBlur = 28; ctx.strokeStyle = '#3dcc3d'; ctx.lineWidth = 15; ctx.stroke(p);
      ctx.shadowBlur = 0; ctx.strokeStyle = '#030604'; ctx.lineWidth = 4; ctx.stroke(p); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'italic 900 100px Montserrat, sans-serif'; ctx.fillText('KTEC', w / 2, h * 0.52 + 270);
      ctx.fillStyle = '#3dcc3d'; ctx.font = 'italic 600 32px Montserrat, sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
      ctx.fillText('CELULARES', w / 2 + 5, h * 0.52 + 322);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      rr(ctx, w / 2 - 115, 44, 230, 66, 33); ctx.fillStyle = '#000'; ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.45)'; [[120, h - 170], [w - 120, h - 170]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 50, 0, 7); ctx.fill(); });
      rr(ctx, w / 2 - 125, h - 48, 250, 11, 6); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
      ctx.restore();
    },
  };
  const LENS_LOCAL = LENSES.map((l) => toLocal(l.cx, l.cy + l.ry * 0.55));

  // ---------------------------------------------------------------- roteiro do movimento
  // L: distância ao longo de N (perpendicular ao aparelho na foto; negativo = para cima, lado da traseira)
  // U: ao longo do comprimento (positivo = lado das câmeras); r: giro; rx/ry: inclinação; s: escala; t: janela do scroll
  const U_AX = norm([(QUAD[0][0] + QUAD[1][0] - QUAD[2][0] - QUAD[3][0]) / 2, (QUAD[0][1] + QUAD[1][1] - QUAD[2][1] - QUAD[3][1]) / 2]);
  const N_AX = [-U_AX[1], U_AX[0]];
  const MOTION = {
    display:   { L: 500,   U: 50,   r: -2,  rx: -10, t: [0.3, 0.52] },
    tray:      { L: 0,     U: 0,    r: -1,  t: [0.3, 0.52] },
    frame:     { L: 0,     U: 0,    r: -1,  t: [0.3, 0.52] },
    btn1:      { L: 170,   U: 620,  r: 36,  s: 1.3, t: [0.12, 0.34] },
    btn2:      { L: 90,    U: 700,  r: -24, s: 1.3, t: [0.13, 0.35] },
    btn3:      { L: 10,    U: 770,  r: 48,  s: 1.3, t: [0.14, 0.36] },
    camera:    { L: -500,  U: 250,  r: 6,   rx: 8,  t: [0.22, 0.46] },
    board:     { L: -470,  U: 380,  r: 7,   rx: -6, t: [0.24, 0.48] },
    battery:   { L: -470,  U: -300, r: -4,  rx: 10, t: [0.22, 0.48] },
    taptic:    { L: -260,  U: -640, r: 16,  t: [0.26, 0.5] },
    speaker:   { L: -120,  U: -560, r: -12, t: [0.27, 0.51] },
    flex:      { L: -190,  U: -740, r: 28,  t: [0.28, 0.52] },
    magsafe:   { L: -780,  U: -720, r: -8,  rx: 14, t: [0.16, 0.42] },
    glass:     { L: -960,  U: 100,  r: -3,  rx: 12, t: [0.04, 0.3] },
    plateau:   { L: -1150, U: 270,  r: 5,   rx: 10, t: [0.07, 0.33] },
    lensTop:   { L: -1300, U: 430,  r: 24,  s: 1.15, t: [0.1, 0.38] },
    lensLeft:  { L: -1240, U: 170,  r: -22, s: 1.15, t: [0.11, 0.39] },
    lensRight: { L: -1110, U: 570,  r: 30,  s: 1.15, t: [0.12, 0.4] },
  };
  const L_MIN = -1300, L_MAX = 500;
  const SHIFT = -(L_MIN + L_MAX) / 2;
  for (const m of Object.values(MOTION)) {
    const L = m.L + SHIFT, U = m.U || 0;
    m.d = [L * N_AX[0] + U * U_AX[0], L * N_AX[1] + U * U_AX[1]];
  }

  // Peças destacadas em cada etapa (mesma ordem das legendas)
  const STEP_PIECES = [['display'], ['battery'], ['camera', 'plateau', 'lensTop', 'lensLeft', 'lensRight'], ['board'], ['flex', 'speaker', 'taptic'], ['glass']];
  const STEP_WIN = [0.54, 0.84];
  const OUTRO = [0.85, 0.93];                // reenquadra a vista explodida para a legenda final (o aparelho continua desmontado)

  // ---------------------------------------------------------------- construção das peças
  const pieces = [];

  function addImgPiece(id, clipPts, img, { cuts = [], fills = [], patch = null, rim = null, c } = {}) {
    const bb = clipPts ? bbox(clipPts) : { x: 0, y: 0, w: IMG_W, h: IMG_H };
    const cv = document.createElement('canvas');
    cv.width = bb.w; cv.height = bb.h;
    const ctx = cv.getContext('2d');
    ctx.translate(-bb.x, -bb.y);
    ctx.save();
    if (clipPts) { trace(ctx, clipPts); ctx.clip(); }
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    ctx.globalCompositeOperation = 'destination-out';
    cuts.forEach((pts) => { trace(ctx, pts); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
    fills.forEach(([pts, color]) => { trace(ctx, pts); ctx.fillStyle = color; ctx.fill(); });
    if (patch) {
      ctx.save();
      if (clipPts) { trace(ctx, clipPts); ctx.clip(); }
      ctx.fillStyle = ctx.strokeStyle = patch.style(ctx);
      ctx.lineWidth = 26; ctx.lineJoin = 'round';
      patch.shapes.forEach((pts) => { trace(ctx, pts); ctx.fill(); ctx.stroke(); });
      ctx.restore();
    }
    if (rim) {
      // espessura do vidro na borda da abertura
      ctx.save();
      if (clipPts) { trace(ctx, clipPts); ctx.clip(); }
      trace(ctx, rim);
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(20,6,10,.9)"; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = "rgba(255,190,205,.35)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    const cc = c || centroid(clipPts || GLASS);
    cv.className = 'piece';
    Object.assign(cv.style, { left: bb.x + 'px', top: bb.y + 'px', width: bb.w + 'px', height: bb.h + 'px', transformOrigin: `${cc[0] - bb.x}px ${cc[1] - bb.y}px` });
    stage.appendChild(cv);
    const cb = clipPts ? bb : { x: 300, y: 10, w: 1530, h: 730 };
    pieces.push({ id, el: cv, kind: 'img', c: cc, m: MOTION[id], corners: [[cb.x, cb.y], [cb.x + cb.w, cb.y], [cb.x + cb.w, cb.y + cb.h], [cb.x, cb.y + cb.h]] });
  }

  function addLocalPiece(id, rect, drawFn) {
    const [x, y, w, h] = rect, pad = 24;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w + pad * 2); cv.height = Math.ceil(h + pad * 2);
    const ctx = cv.getContext('2d');
    ctx.translate(pad, pad);
    drawFn(ctx, w, h);
    cv.className = 'piece';
    Object.assign(cv.style, { width: cv.width + 'px', height: cv.height + 'px', transformOrigin: '0 0' });
    stage.appendChild(cv);
    pieces.push({
      id, el: cv, kind: 'local', c: toImg(x + w / 2, y + h / 2), m: MOTION[id],
      corners: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map((q) => toImg(q[0], q[1])),
      mat: `${cssMatrix(H)} translate(${x - pad}px, ${y - pad}px)`,
    });
  }

  function addScrew(id, localPos, seed) {
    const [X, Y] = toImg(localPos[0], localPos[1]);
    const R = rng(seed), size = 24;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(size * 0.4, size * 0.35, 1, size / 2, size / 2, size / 2);
    g.addColorStop(0, '#f4f5f7'); g.addColorStop(0.6, '#9ba0a8'); g.addColorStop(1, '#5d6168');
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 7); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#3a3d42'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(18, 12); ctx.moveTo(12, 6); ctx.lineTo(12, 18); ctx.stroke();
    cv.className = 'piece';
    Object.assign(cv.style, { left: X - size / 2 + 'px', top: Y - size / 2 + 'px', width: size + 'px', height: size + 'px', transformOrigin: '50% 50%' });
    stage.appendChild(cv);
    const ang = R() * Math.PI * 2, dist = 380 + R() * 320;
    MOTION[id] = { d: [Math.cos(ang) * dist, Math.sin(ang) * dist * 0.75], r: (R() - 0.5) * 1400, s: 1.6, t: [0.2 + R() * 0.06, 0.44 + R() * 0.08], screw: true };
    pieces.push({ id, el: cv, kind: 'img', c: [X, Y], m: MOTION[id], corners: [[X, Y]] });
  }

  function build(img) {
    const lensCuts = LENSES.map((l) => l.pts);
    const btnCuts = BUTTONS.map((b) => b.pts);

    // de baixo para cima
    addLocalPiece('display', [0, 0, LW, LH], draw.display);
    addLocalPiece('tray', [0, 0, LW, LH], draw.tray);
    addImgPiece('frame', null, img, {
      cuts: [GLASS, PLATEAU, ...lensCuts, ...btnCuts],
      fills: BUTTONS.map((b) => [capsulePts(b.a, b.b, b.w * 0.55), '#1a0c10']),
      c: PHONE_C,
    });
    BUTTONS.forEach((b) => addImgPiece(b.id, b.pts, img));
    addLocalPiece('camera', CAM_RECT, draw.camera);
    addLocalPiece('board', [BOARD.x0, BOARD.y0, BOARD.x1 - BOARD.x0, BOARD.y1 - BOARD.y0], draw.board);
    addLocalPiece('battery', BATT_RECT, draw.battery);
    addLocalPiece('taptic', TAPTIC_RECT, draw.taptic);
    addLocalPiece('speaker', SPEAKER_RECT, draw.speaker);
    addLocalPiece('flex', FLEX_RECT, draw.flex);
    [[64, 590], [716, 590], [64, 1412], [716, 1412], [440, 440], [740, 300]].forEach((pos, i) => addScrew(`screw${i}`, pos, 17 + i * 13));
    addLocalPiece('magsafe', MAG_RECT, draw.magsafe);
    // tampa com a abertura das câmeras (vazada), com uma borda sutil no recorte
    addImgPiece('glass', GLASS, img, {
      cuts: [PLATEAU_HOLE, ...lensCuts],
      rim: PLATEAU_HOLE,
    });
    addImgPiece('plateau', PLATEAU, img, {
      cuts: lensCuts,
      fills: LENSES.map((l) => [ellipsePts(l.cx, l.cy + l.ry * 0.12, l.rx * 0.9, l.ry * 0.86), '#12070a']),
    });
    LENSES.forEach((l) => addImgPiece(l.id, l.pts, img));

    pieces.forEach((pc, i) => { pc.phase = i * 1.37; pc.hl = false; });
    srcImg.style.visibility = 'hidden';
    if (DEBUG) drawDebug();
  }

  function drawDebug() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', IMG_W); svg.setAttribute('height', IMG_H);
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:99';
    const poly = (pts, col) => { const p = document.createElementNS(svg.namespaceURI, 'polygon'); p.setAttribute('points', pts.map((q) => q.join(',')).join(' ')); p.setAttribute('fill', 'none'); p.setAttribute('stroke', col); p.setAttribute('stroke-width', 2); svg.appendChild(p); };
    poly(GLASS, '#0f0'); poly(PLATEAU, '#0ff'); LENSES.forEach((l) => poly(l.pts, '#ff0')); BUTTONS.forEach((b) => poly(b.pts, '#f0f')); poly(PHONE_HULL, '#f80');
    stage.appendChild(svg);
  }

  // ---------------------------------------------------------------- enquadramento por frame
  let vw = 0, vh = 0, portrait = false, FIT = null;
  const THETA_STACK = 90 - (Math.atan2(N_AX[1], N_AX[0]) * 180) / Math.PI;

  function fitTo(pts, theta, box) {
    const c = Math.cos((theta * Math.PI) / 180), s = Math.sin((theta * Math.PI) / 180);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      const dx = x - PHONE_C[0], dy = y - PHONE_C[1];
      const rx = c * dx - s * dy, ry = s * dx + c * dy;
      x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); y0 = Math.min(y0, ry); y1 = Math.max(y1, ry);
    }
    const k = Math.min((box[2] - box[0]) / (x1 - x0), (box[3] - box[1]) / (y1 - y0));
    return { theta, k, tx: (box[0] + box[2]) / 2 - (k * (x0 + x1)) / 2, ty: (box[1] + box[3]) / 2 - (k * (y0 + y1)) / 2 };
  }
  const mixFit = (a, b, t) => ({ theta: lerp(a.theta, b.theta, t), k: lerp(a.k, b.k, t), tx: lerp(a.tx, b.tx, t), ty: lerp(a.ty, b.ty, t) });

  function measure() {
    vw = sticky.clientWidth; vh = sticky.clientHeight;
    portrait = vw / vh < 0.85;
    if (!pieces.length) return;
    const exploded = [];
    for (const pc of pieces) {
      if (pc.m.screw) continue;
      pc.corners.forEach(([x, y]) => exploded.push([x + pc.m.d[0], y + pc.m.d[1]]));
    }
    const top = 76;
    const introTop = Math.max(heroCopy.offsetTop + heroCopy.offsetHeight + 28, vh * 0.42);
    if (portrait || vw <= 860) {
      const th = portrait ? THETA_STACK : 0;
      const bottomRoom = Math.min(270, vh * 0.34);
      FIT = {
        intro: fitTo(PHONE_HULL, 0, [-vw * 0.12, introTop, vw * 1.12, vh - 70]),
        explode: fitTo(exploded, th, [8, top, vw - 8, vh - bottomRoom]),
        outro: fitTo(exploded, th, [8, top, vw - 8, vh - Math.min(380, vh * 0.46)]),
      };
    } else {
      const left = Math.max(vw * 0.4, 520);
      FIT = {
        intro: fitTo(PHONE_HULL, 0, [vw * 0.17, introTop, vw * 0.83, vh - 40]),
        explode: fitTo(exploded, 0, [left, top + 6, vw - 36, vh - 24]),
        outro: fitTo(exploded, 0, [left, top + 6, vw - 36, vh - 24]),
      };
    }
  }

  let current = 0, target = 0, time = 0, visible = true, activeStep = -2;

  function render() {
    const p = current;
    const g = ease(seg(p, 0.03, 0.36));
    const g2 = ease(seg(p, OUTRO[0], OUTRO[1]));
    const f = mixFit(mixFit(FIT.intro, FIT.explode, g), FIT.outro, g2);
    stage.style.transform = `translate(${f.tx}px, ${f.ty}px) rotate(${f.theta}deg) scale(${f.k}) translate(${-PHONE_C[0]}px, ${-PHONE_C[1]}px)`;

    // o aparelho só se monta de novo quando a pessoa volta para o topo (o scroll para cima refaz o caminho)
    const floatAmt = ease(seg(p, 0.5, 0.62));
    const tt = time / 1000;

    const inSteps = p >= STEP_WIN[0] && p < STEP_WIN[1];
    const step = inSteps ? Math.min(5, Math.floor(seg(p, STEP_WIN[0], STEP_WIN[1]) * 6)) : -1;
    const hl = step >= 0 ? STEP_PIECES[step] : [];

    for (const pc of pieces) {
      const m = pc.m;
      const e = ease(seg(p, m.t[0], m.t[1]));
      const fl = pc.id === 'frame' || pc.id === 'tray' ? floatAmt * 0.4 : floatAmt;
      const on = hl.includes(pc.id);
      const lift = on ? -60 : 0;
      const fx = Math.sin(tt * 0.9 + pc.phase) * 14 * fl, fy = Math.cos(tt * 0.7 + pc.phase) * 12 * fl;
      const dx = m.d[0] * e + fx + lift * N_AX[0] * e, dy = m.d[1] * e + fy + lift * N_AX[1] * e;
      const rz = (m.r || 0) * e + Math.sin(tt * 0.6 + pc.phase) * 1.6 * fl;
      const s = 1 + ((m.s || 1) - 1) * e;
      const tilt = `perspective(2200px) rotateX(${(m.rx || 0) * e}deg) rotateY(${(m.ry || 0) * e}deg) rotateZ(${rz}deg) scale(${s})`;
      if (pc.kind === 'img') {
        pc.el.style.transform = `translate(${dx}px, ${dy}px) ${tilt}`;
      } else {
        const [cx, cy] = pc.c;
        pc.el.style.transform = `translate(${cx + dx}px, ${cy + dy}px) ${tilt} translate(${-cx}px, ${-cy}px) ${pc.mat}`;
      }
      if (pc.id === 'display') pc.el.style.opacity = clamp01(e * 5);
      if (m.screw) pc.el.style.opacity = e > 0.001 ? 1 : 0;   // ficam à vista, flutuando com as outras peças
      if (on !== pc.hl) { pc.hl = on; pc.el.classList.toggle('hl', on); }
    }

    for (const c of caps) {
      const a = parseFloat(c.dataset.in), b = parseFloat(c.dataset.out), fd = 0.025;
      const op = Math.min(a <= 0 ? 1 : clamp01((p - a) / fd), clamp01((b - p) / fd));
      c.style.opacity = op;
      c.style.setProperty('--y', `${(1 - op) * 22}px`);
      c.classList.toggle('on', op > 0.5);
    }
    if (step !== activeStep) activeStep = step;
    hint.style.opacity = 1 - clamp01(p / 0.03);
    bar.style.transform = `scaleY(${p})`;
    sticky.style.setProperty('--glow', g.toFixed(3));
  }

  function readScroll() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - vh;
    target = total > 0 ? clamp01(-r.top / total) : 0;
  }

  function loop(now) {
    time = now;
    readScroll();
    const diff = target - current;
    current = reduceMotion ? target : current + diff * 0.12;
    if (Math.abs(diff) < 0.0001) current = target;
    if (visible) render();
    requestAnimationFrame(loop);
  }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(section);
  new IntersectionObserver(([e]) => { document.body.classList.toggle('in-hero', e.isIntersecting); }, { rootMargin: '0px 0px -100% 0px' }).observe(section);
  addEventListener('resize', () => { measure(); render(); });

  function start() {
    build(srcImg);
    measure();
    vh = sticky.clientHeight;
    readScroll(); current = target;
    render();
    requestAnimationFrame(loop);
    // redesenha tela/bateria com as fontes da marca quando carregarem
    document.fonts?.ready.then(() => {
      pieces.filter((pc) => pc.kind === 'local').forEach((pc) => {
        const fn = draw[pc.id]; if (!fn) return;
        const ctx = pc.el.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pc.el.width, pc.el.height);
        ctx.translate(24, 24); fn(ctx, pc.el.width - 48, pc.el.height - 48);
      });
      measure(); render();
    });
  }

  if (srcImg.complete && srcImg.naturalWidth) start(); else srcImg.addEventListener('load', start, { once: true });
})();
