(function () {
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var usd = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var press = function (buttons, active) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === active ? 'true' : 'false'); });
  };

  /* Hero: sample trade as a candlestick chart. Right axis shows the price move and your return at the chosen leverage. */
  var board = $('board');
  var positions = [
    { name: 'SK hynix', side: 'LONG', path: [0, -0.4, -0.9, -1.6, -1.2, -0.5, 0.3, 0.9, 0.6, 1.4, 2.2, 1.9, 2.8, 3.5, 3.1, 3.9, 4.6, 5.2, 5.6, 5.0, 4.4, 4.9, 4.82], max: 10, who: 'Trader Baek', ini: 'TB' },
    { name: 'NVDA', side: 'SHORT', max: 20, who: 'Semi Hunter', ini: 'SH', path: [0, 0.5, 1.2, 0.8, 0.1, -0.6, -0.3, -1.1, -1.8, -1.4, -2.2, -2.9, -2.5, -3.3, -3.8, -3.4, -3.0, -3.1] }
  ];
  var state = { amt: 1000, pos: 0, lev: 10 };
  var noMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var signed = function (n) { return (n < 0 ? '−' : '+') + usd(Math.abs(n)); };
  var signedPct = function (n) { return (n < 0 ? '−' : '+') + Math.abs(n).toFixed(1) + '%'; };
  var pct0 = function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(Math.round(n)) + '%'; };
  var cv = $('chart'), ctx = cv.getContext ? cv.getContext('2d') : null, raf = null;
  var GREEN = '#11ec8a', RED = '#ff4b4e';

  function candles(p) {
    if (p.c) return p.c;
    var pts = p.path, N = 44, out = [], prev = 0;
    for (var i = 1; i <= N; i++) {
      var x = i / N * (pts.length - 1), k = Math.floor(x), f = x - k;
      var v = pts[k] + (pts[Math.min(k + 1, pts.length - 1)] - pts[k]) * f;
      var c = i === N ? pts[pts.length - 1] : v + (Math.sin(i * 12.9898) + Math.sin(i * 4.1414)) * 0.14;
      out.push({ o: prev, c: c, h: Math.max(prev, c) + 0.1 + 0.28 * Math.abs(Math.sin(i * 7.77)), l: Math.min(prev, c) - 0.1 - 0.28 * Math.abs(Math.sin(i * 3.33)) });
      prev = c;
    }
    p.c = out;
    return out;
  }

  function drawChart(progress) {
    var p = positions[state.pos], isLong = p.side !== 'SHORT', dir = isLong ? 1 : -1;
    var cs = candles(p), last = cs[cs.length - 1].c;
    if (!ctx) return last;
    var rect = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    var w = Math.max(220, Math.floor(rect.width)), hgt = Math.max(160, Math.floor(rect.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hgt * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    var AX = 98, TP = 22, BT = 20, pw = w - AX, ph = hgt - TP - BT;
    var lo = isLong ? -3 : -6, hi = isLong ? 7.5 : 3;
    var y = function (v) { return TP + (hi - v) / (hi - lo) * ph; };
    var hline = function (v, color, dash) {
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(0, Math.round(y(v)) + 0.5); ctx.lineTo(pw, Math.round(y(v)) + 0.5); ctx.stroke(); ctx.setLineDash([]);
    };
    var FONT = '600 11px Inter, system-ui, sans-serif';
    ctx.font = FONT; ctx.textBaseline = 'middle';

    /* grid and the two right-hand scales: price, and your return */
    for (var g = Math.ceil(lo / 3) * 3; g <= hi; g += 3) {
      hline(g, '#1b1b1b');
      var mine = g * dir * state.lev;
      ctx.textAlign = 'left'; ctx.fillStyle = '#909090'; ctx.fillText(pct0(g), pw + 8, y(g));
      ctx.textAlign = 'right'; ctx.fillStyle = mine > 0 ? GREEN : mine < 0 ? RED : '#909090'; ctx.fillText(pct0(mine), w - 6, y(g));
    }
    ctx.strokeStyle = '#272727'; ctx.beginPath(); ctx.moveTo(pw + 0.5, 0); ctx.lineTo(pw + 0.5, hgt - BT); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#909090'; ctx.fillText('PRICE', pw + 8, 9);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ff5a00'; ctx.fillText('YOU ' + state.lev + 'x', w - 6, 9);
    ctx.textAlign = 'left'; ctx.fillStyle = '#6c6c6c'; ctx.fillText('ENTRY', 4, hgt - 9);
    ctx.textAlign = 'right'; ctx.fillText('CLOSE', pw - 4, hgt - 9);

    /* entry level */
    hline(0, '#b0b0b0', [4, 4]);
    /* candles */
    var n = Math.max(1, Math.round(progress * cs.length)), cw = pw / cs.length, bw = Math.max(3, Math.min(11, cw * 0.62)), i, k, x;
    for (i = 0; i < n; i++) {
      k = cs[i]; x = cw * i + cw / 2;
      ctx.strokeStyle = ctx.fillStyle = k.c >= k.o ? GREEN : RED;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, y(k.h)); ctx.lineTo(Math.round(x) + 0.5, y(k.l)); ctx.stroke();
      var top = y(Math.max(k.o, k.c)), bh = Math.max(1.5, Math.abs(y(k.o) - y(k.c)));
      ctx.fillRect(x - bw / 2, top, bw, bh);
    }
    var cur = progress >= 1 ? last : cs[n - 1].c;

    /* entry marker */
    /* keep the marker and its label clear of the first few candles */
    var far = isLong ? cs[0].l : cs[0].h;
    for (i = 0; i < 6; i++) far = isLong ? Math.min(far, cs[i].l) : Math.max(far, cs[i].h);
    var ex = cw / 2, ey = isLong ? y(far) + 8 : y(far) - 8, col = isLong ? GREEN : RED;
    ctx.fillStyle = col; ctx.beginPath();
    if (isLong) { ctx.moveTo(ex, ey); ctx.lineTo(ex - 6, ey + 10); ctx.lineTo(ex + 6, ey + 10); }
    else { ctx.moveTo(ex, ey); ctx.lineTo(ex - 6, ey - 10); ctx.lineTo(ex + 6, ey - 10); }
    ctx.fill();
    ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(p.side + ' ' + state.lev + 'x', ex + 10, isLong ? ey + 6 : ey - 6);

    /* close marker */
    if (progress >= 1) {
      var lx = cw * (cs.length - 1) + cw / 2;
      ctx.strokeStyle = '#fafafa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, y(last), 6, 0, 6.2832); ctx.stroke();
    }

    /* live tag across both scales: price move and your return on one line */
    var win = cur * dir >= 0, ty = Math.max(TP + 2, Math.min(hgt - BT - 2, y(cur)));
    hline(cur, win ? 'rgba(17,236,138,0.35)' : 'rgba(255,75,78,0.35)', [2, 3]);
    ctx.fillStyle = win ? GREEN : RED; ctx.fillRect(pw + 1, ty - 10, AX - 1, 20);
    ctx.fillStyle = '#050505'; ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(signedPct(cur), pw + 8, ty);
    ctx.textAlign = 'right'; ctx.fillText(signedPct(cur * dir * state.lev), w - 6, ty);
    return cur;
  }

  function paint(progress) {
    var p = positions[state.pos], dir = p.side === 'SHORT' ? -1 : 1;
    var pct = drawChart(progress);
    var ours = state.amt * state.lev * pct / 100 * dir, shares = state.amt * pct / 100;
    var color = ours < 0 ? 'var(--fg-negative)' : 'var(--fg-positive)';
    $('p-pnl').textContent = signed(ours); $('p-pnl').style.color = color;
    $('p-roe').textContent = signedPct(state.lev * pct * dir); $('p-roe').style.color = color;
    $('p-move').textContent = signedPct(pct);
    $('p-shares').textContent = signed(shares);
  }
  function renderStatic() {
    var p = positions[state.pos], room = 100 / state.lev;
    $('p-name').textContent = p.name;
    $('p-who').textContent = p.who; $('p-ini').textContent = p.ini;
    $('p-side').textContent = p.side + ' · ' + state.lev + 'x';
    $('p-side').className = 'side' + (p.side === 'SHORT' ? ' short' : '');
    $('p-size').textContent = usd(state.amt * state.lev);
    $('lev-out').textContent = state.lev + 'x';
  }
  function settle() { if (raf) cancelAnimationFrame(raf); raf = null; renderStatic(); paint(1); }
  function play() {
    if (raf) cancelAnimationFrame(raf);
    renderStatic();
    if (noMotion || !window.requestAnimationFrame) { paint(1); return; }
    var t0 = null;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var pr = Math.min(1, (ts - t0) / 3000);
      paint(pr);
      raf = pr < 1 ? requestAnimationFrame(step) : null;
    };
    raf = requestAnimationFrame(step);
  }
  var amtBtns = all('[data-amt]', board);
  amtBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.amt = Number(b.getAttribute('data-amt')); press(amtBtns, b); settle(); });
  });
  var posBtns = all('[data-pos]', board);
  posBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.pos = Number(b.getAttribute('data-pos')); press(posBtns, b);
      /* each ticker has its own real cap; a tab opens at that cap */
      var cap = positions[state.pos].max, r = $('lev-range');
      r.max = cap; r.value = cap; state.lev = cap; $('lev-max').textContent = cap + 'x max';
      play();
    });
  });
  $('lev-range').addEventListener('input', function () { state.lev = Number(this.value) || 1; settle(); });
  $('replay').addEventListener('click', play);
  window.addEventListener('resize', settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!raf) paint(1); });
  settle();
  /* The chart sits below the first screen, so draw it in (play) the first time it scrolls into view rather than on load. */
  if ('IntersectionObserver' in window && !noMotion) {
    var chartSeen = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { chartSeen.disconnect(); play(); }
    }, { threshold: 0.4 });
    chartSeen.observe($('chart'));
  }

  /* TradeView mock: pick someone, step through their trades on the chart, read why, react. Sample data. */
  /* Sample avatars, varied the way real profiles are: a face (Semi Hunter, same image as in the creators row),
     a generated wallet blockie, an illustrated character (DiceBear Notionists / Lorelei, CC0) and a scenery photo
     (Unsplash via picsum). One image per person everywhere on the page. */
  var TV_PHOTOS = { 'Semi Hunter': 'men-32.jpg', 'Chip Whale 0x7a…c41': 'chip-whale.svg', 'night_owl': 'night-owl.png', 'Macro Whale 0x91…e07': 'ocean-wave.jpg', 'mina_k': 'mina-k.png' };
  var tvData = [
    { name: 'Semi Hunter', tag: 'Creator', pos: 'NVDA · SHORT 20x', short: true, pnl: '+38.2%', fol: 41200, ini: 'SH',
      path: [0, 0.6, 1.3, 0.9, 0.2, -0.5, -0.2, -1.0, -1.7, -1.3, -2.1, -2.8, -2.4, -3.2, -3.7, -3.3, -3.0, -3.1],
      fills: [
        { i: 2, side: 'SELL', title: 'Opened short', note: 'Guidance was fine but the stock gave back the whole gap inside an hour. Short until it reclaims the open.', ai: 'Entry sits at the top of a failed gap after earnings.' },
        { i: 9, side: 'SELL', title: 'Added to the short', note: 'Still below the open. Adding here, stop above today\'s high.', ai: 'Added after a lower high formed. Size grew only once the trade was in profit.' },
        { i: 14, side: 'BUY', title: 'Closed', note: 'Target hit at last week\'s base. Out. Not chasing it lower.', ai: 'Exit lines up with the prior week\'s support zone.' }
      ], c: [['mina_k', 'Why add there and not on the bounce?'], ['dip_buyer', 'Same level I was watching. Thanks for writing it up.']] },
    { name: 'Chip Whale 0x7a…c41', tag: 'Whale', pos: 'SK hynix · LONG 10x', short: false, pnl: '+62.4%', fol: 3120, ini: 'CW',
      path: [0, -0.4, -0.9, -1.6, -1.2, -0.5, 0.3, 0.9, 0.6, 1.4, 2.2, 1.9, 2.8, 3.5, 3.1, 3.9, 4.6, 5.2, 5.6, 5.0, 4.4, 4.9, 4.8],
      fills: [
        { i: 3, side: 'BUY', title: 'Opened long', note: '', ai: 'Bought as price held the previous low for the third time. Reads like a support bounce.' },
        { i: 9, side: 'BUY', title: 'Added', note: '', ai: 'Added once the bounce cleared the morning high. Doubled size only after being in profit.' },
        { i: 18, side: 'SELL', title: 'Closed', note: '', ai: 'Sold into the spike, a day before the earnings call.' }
      ], c: [['night_owl', 'This wallet never writes notes but the adds are always after confirmation.'], ['soxl_sam', 'Third time it has sold the day before earnings.']] },
    { name: 'night_owl', tag: 'Top trader', pos: 'SOXL · LONG 5x', short: false, pnl: '+41.8%', fol: 1284, ini: 'NO',
      path: [0, -0.8, -1.9, -2.6, -1.8, -0.9, 0.4, 1.6, 1.1, 2.4, 3.3, 2.7, 3.9, 4.8, 4.2, 5.1],
      fills: [
        { i: 3, side: 'BUY', title: 'Opened long', note: 'Semis sold off all week on no news. Starting small, will add if it holds.', ai: 'Entry near the low of a five-day slide.' },
        { i: 9, side: 'SELL', title: 'Took half off', note: 'Half off at the gap. Rest rides with a stop at entry.', ai: 'Partial exit at the first resistance.' },
        { i: 15, side: 'SELL', title: 'Closed', note: 'Out of the rest. Won the daily board with this one.', ai: 'Final exit near the weekly high.' }
      ], c: [['chart_mina', 'Clean. The stop-at-entry part is what I always skip.'], ['newbie_k', 'Followed after seeing you on the leaderboard.']] },
    { name: 'Macro Whale 0x91…e07', tag: 'Whale', pos: 'NVDA · LONG 5x', short: false, pnl: '+27.3%', fol: 2210, ini: 'MW',
      path: [0, 0.3, -0.4, -1.1, -0.7, 0.2, 0.8, 0.5, 1.3, 2.0, 1.6, 2.4, 3.1, 2.8, 3.6],
      fills: [
        { i: 3, side: 'BUY', title: 'Opened long', note: '', ai: 'Bought the first red day after three green ones. Small size.' },
        { i: 8, side: 'BUY', title: 'Added', note: '', ai: 'Added when price took back the level it lost on the dip.' },
        { i: 14, side: 'SELL', title: 'Closed', note: '', ai: 'Closed before the weekend. This wallet rarely holds through one.' }
      ], c: [['dip_buyer', 'Same wallet that bought the August dip. Watching what it does Monday.'], ['mina_k', 'Never holds a weekend. Good habit to copy.']] },
    { name: 'mina_k', tag: 'Top trader', pos: 'SK hynix · SHORT 3x', short: true, pnl: '+19.6%', fol: 870, ini: 'MK',
      path: [0, 0.7, 1.4, 1.0, 0.3, -0.4, -1.2, -0.8, -1.9, -2.6, -2.2, -3.0, -3.6, -3.2],
      fills: [
        { i: 2, side: 'SELL', title: 'Opened short', note: 'Up nine days in a row and volume is fading. Small short, 3x only.', ai: 'Entry after a long run with falling volume.' },
        { i: 8, side: 'SELL', title: 'Added to the short', note: 'Broke last week\'s low. Adding a little.', ai: 'Added on the break of the prior low.' },
        { i: 12, side: 'BUY', title: 'Closed', note: 'Enough. Took it off before the export numbers.', ai: 'Exit ahead of a scheduled data release.' }
      ], c: [['night_owl', 'Low leverage on a counter-trend short. Sensible.'], ['newbie_k', 'Did not know you could short hynix at all.']] }
  ];
  var tvS = { who: 0, fill: 0, following: {}, votes: {} };
  function tvRows(filter) {
    var box = $('tv-rows'); box.innerHTML = '';
    tvData.forEach(function (t, idx) {
      if (filter !== 'all' && t.tag !== filter) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tv-row'; b.setAttribute('aria-pressed', idx === tvS.who ? 'true' : 'false');
      var ph = TV_PHOTOS[t.name];
      b.innerHTML = (ph ? '<img class="av av-photo" src="assets/img/avatars/' + ph + '" width="40" height="40" alt="">' : '<span class="av">' + t.ini + '</span>') + '<span><b>' + t.name + '</b><small>' + t.tag + ' · ' + t.pos.split(' · ')[0] + ' · ' + t.fol.toLocaleString('en-US') + ' followers</small></span><span><span class="led up">' + t.pnl + '</span><small>30D</small></span>';
      b.addEventListener('click', function () { tvS.who = idx; tvS.fill = 0; tvRows(filter); tvPaint(); });
      box.appendChild(b);
    });
  }
  function tvPaint() {
    /* Exchange-style chart: candles built from the trader's price path (open = previous close, small deterministic
       wicks), volume bars, a right-hand % axis with grid, the entry level dashed, a last-price tag, and execution
       markers the way exchanges print fills: BUY = green ▲ under the candle, SELL = red ▼ over it. The selected
       fill gets a crosshair and an expanded label. */
    var t = tvData[tvS.who], f = t.fills[tvS.fill], W = 560, H = 236, AX = 54, PT = 36, PB = 60, VOL = 22;   /* headroom so markers clear the edges and the volume strip */
    var n = t.path.length, UP = '#11ec8a', DN = '#ff4b4e', MUTED = '#909090', GRID = '#1c1c1c';
    var wick = function (i) { return 0.12 + ((i * 37 + 11) % 13) / 13 * 0.32; };
    var cdl = t.path.map(function (c, i) {
      var o = i ? t.path[i - 1] : c - 0.25, w = wick(i);
      return { o: o, c: c, h: Math.max(o, c) + w, l: Math.min(o, c) - w * 0.8, v: 0.35 + ((i * 53 + 7) % 17) / 17 * 0.65 };
    });
    var lo = Math.min.apply(null, cdl.map(function (k) { return k.l; })) - 0.5, hi = Math.max.apply(null, cdl.map(function (k) { return k.h; })) + 0.9;
    var PW = W - AX, step = (PW - 16) / n, cw = Math.max(4, step * 0.58);
    var X = function (i) { return 8 + step * (i + 0.5); }, Y = function (v) { return PT + (hi - v) / (hi - lo) * (H - PT - PB); };
    var font = 'font-family="Pretendard Variable, Pretendard, Inter, sans-serif" style="font-variant-numeric: tabular-nums"';
    var pct = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(Math.abs(v) < 10 && v % 1 ? 1 : 0) + '%'; };
    var svg = '<rect x="0" y="0" width="' + PW + '" height="' + H + '" fill="#000"/>';
    // grid + axis labels every 1% (2% when the range is wide)
    var tick = hi - lo > 7 ? 2 : 1;
    for (var g = Math.ceil(lo / tick) * tick; g <= hi; g += tick) {
      var gy = Y(g).toFixed(1);
      svg += '<line x1="0" x2="' + PW + '" y1="' + gy + '" y2="' + gy + '" stroke="' + GRID + '"/>' +
        '<text x="' + (PW + 8) + '" y="' + (+gy + 3.5) + '" font-size="10" fill="' + MUTED + '" ' + font + '>' + pct(g) + '</text>';
    }
    for (var gv = 4; gv < n; gv += 4) svg += '<line x1="' + X(gv).toFixed(1) + '" x2="' + X(gv).toFixed(1) + '" y1="' + PT + '" y2="' + (H - PB) + '" stroke="' + GRID + '"/>';
    svg += '<line x1="' + PW + '" x2="' + PW + '" y1="0" y2="' + H + '" stroke="#262626"/>';
    // entry level (0%)
    svg += '<line x1="0" x2="' + PW + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="#5a5a5a" stroke-dasharray="3 3"/>';
    // selected fill: crosshair under everything else
    var sx = X(f.i).toFixed(1);
    svg += '<line x1="' + sx + '" x2="' + sx + '" y1="' + PT + '" y2="' + (H - PB + VOL) + '" stroke="#fafafa" stroke-opacity="0.35" stroke-dasharray="2 3"/>';
    // volume
    cdl.forEach(function (k, i) {
      var vh = k.v * (VOL - 4), up = k.c >= k.o;
      svg += '<rect x="' + (X(i) - cw / 2).toFixed(1) + '" y="' + (H - 2 - vh).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + vh.toFixed(1) + '" fill="' + (up ? UP : DN) + '" fill-opacity="0.28"/>';
    });
    // candles
    cdl.forEach(function (k, i) {
      var up = k.c >= k.o, col = up ? UP : DN, x = X(i), top = Y(Math.max(k.o, k.c)), bot = Y(Math.min(k.o, k.c));
      svg += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Y(k.h).toFixed(1) + '" y2="' + Y(k.l).toFixed(1) + '" stroke="' + col + '"/>' +
        '<rect x="' + (x - cw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + Math.max(1, bot - top).toFixed(1) + '" fill="' + col + '" rx="0.5"/>';
    });
    // last price: dotted line to the axis and a tag in the candle's colour
    var last = cdl[n - 1], lc = last.c >= last.o ? UP : DN, ly = Y(last.c);
    svg += '<line x1="' + X(n - 1).toFixed(1) + '" x2="' + PW + '" y1="' + ly.toFixed(1) + '" y2="' + ly.toFixed(1) + '" stroke="' + lc + '" stroke-dasharray="1 2"/>' +
      '<rect x="' + (PW + 2) + '" y="' + (ly - 8).toFixed(1) + '" width="' + (AX - 4) + '" height="16" rx="2" fill="' + lc + '"/>' +
      '<text x="' + (PW + AX / 2) + '" y="' + (ly + 3.5).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#050505" ' + font + '>' + pct(last.c) + '</text>';
    // execution markers
    t.fills.forEach(function (m, k) {
      var buy = m.side === 'BUY', col = buy ? UP : DN, c = cdl[m.i], x = X(m.i), sel = k === tvS.fill;
      var ay = buy ? Y(c.l) + 6 : Y(c.h) - 6, d = buy ? 1 : -1;            /* arrow tip sits just off the wick */
      var tri = 'M' + x.toFixed(1) + ',' + ay.toFixed(1) + ' l' + (-6) + ',' + (9 * d) + ' l12,0 z';
      var label = sel ? (buy ? 'BUY' : 'SELL') + ' #' + (k + 1) : (buy ? 'B' : 'S');
      var lw = sel ? 50 : 16, ly2 = ay + d * 12 + (buy ? 0 : -16);
      svg += '<g class="mk' + (sel ? ' on' : '') + '" data-k="' + k + '" role="button" aria-label="' + (buy ? 'Buy' : 'Sell') + ' ' + (k + 1) + '">' +
        '<rect x="' + (x - 14).toFixed(1) + '" y="' + Math.min(ay, ly2).toFixed(1) + '" width="28" height="30" fill="transparent"/>' +
        '<path d="' + tri + '" fill="' + col + '"' + (sel ? ' stroke="#fafafa" stroke-width="1.2"' : '') + '/>' +
        '<rect x="' + (x - lw / 2).toFixed(1) + '" y="' + ly2.toFixed(1) + '" width="' + lw + '" height="16" rx="3" fill="' + (sel ? col : '#0d0d0d') + '" stroke="' + col + '"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + (ly2 + 11.5).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + (sel ? '#050505' : col) + '" ' + font + '>' + label + '</text></g>';
    });
    $('tv-svg').setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    $('tv-svg').innerHTML = svg;
    all('.mk', $('tv-svg')).forEach(function (g) { g.addEventListener('click', function () { tvS.fill = Number(g.getAttribute('data-k')); tvPaint(); }); });
    $('tv-name').textContent = t.name;
    $('tv-pos').textContent = t.pos; $('tv-pos').className = 'side' + (t.short ? ' short' : '');
    $('tv-step').textContent = 'Trade ' + (tvS.fill + 1) + ' of ' + t.fills.length + ' · ' + (f.side === 'BUY' ? 'buy' : 'sell');
    $('tv-title').textContent = f.title;
    $('tv-note-box').hidden = !f.note; $('tv-note').textContent = f.note;
    $('tv-ai').textContent = f.ai;
    $('tv-prev').disabled = tvS.fill === 0; $('tv-next').disabled = tvS.fill === t.fills.length - 1;
    var fol = !!tvS.following[tvS.who];
    $('tv-follow').textContent = fol ? 'Following ✓' : 'Follow';
    var key = tvS.who + '-' + tvS.fill, v = tvS.votes[key] || { u: 0, d: 0 };
    $('tv-upn').textContent = 128 + tvS.who * 17 + v.u; $('tv-downn').textContent = 61 + tvS.fill * 9 + v.d;
    $('tv-c1n').textContent = t.c[0][0]; $('tv-c1').textContent = t.c[0][1];
    $('tv-c2n').textContent = t.c[1][0]; $('tv-c2').textContent = t.c[1][1];
  }
  $('tv-prev').addEventListener('click', function () { if (tvS.fill > 0) { tvS.fill--; tvPaint(); } });
  $('tv-next').addEventListener('click', function () { if (tvS.fill < tvData[tvS.who].fills.length - 1) { tvS.fill++; tvPaint(); } });
  $('tv-follow').addEventListener('click', function () { tvS.following[tvS.who] = !tvS.following[tvS.who]; tvPaint(); });
  var tvVote = function (k) { return function () { var key = tvS.who + '-' + tvS.fill; tvS.votes[key] = tvS.votes[key] || { u: 0, d: 0 }; tvS.votes[key][k]++; tvPaint(); }; };
  $('tv-up').addEventListener('click', tvVote('u')); $('tv-down').addEventListener('click', tvVote('d'));
  var whoBtns = all('[data-who]');
  whoBtns.forEach(function (b) { b.addEventListener('click', function () { press(whoBtns, b); tvRows(b.getAttribute('data-who')); }); });
  tvRows('all'); tvPaint();

  /* Spotlight (ohayo-motion): a good day moves you up the board, people follow, OHAYO calls. Sample.
     Plays once when the board scrolls into view; the button replays it. Time-driven render(t), 0.5s beats:
       0-0.5s    your row (#14, +12%) is marked
       0.5-1.5s  your return counts +12% -> +196% (trail while fast); from 0.75s your row slides up to #2 while
                 the rows it passes shift down one slot (in-out, 40ms stagger), rank labels following
       1.5s      lands: ring + SPOTLIGHT types in; card 2 lights; followers count 12 -> 1,284 (to 2.75s)
       2.75s     card 3 lights. Reduced motion: the end state, still. */
  (function () {
    var lb = $('lb'), btn = $('sp-btn'), card2 = $('sp2'), card3 = $('sp3'), fol = $('sp-fol');
    if (!lb || !btn) return;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var out = function (x) { return 1 - Math.pow(1 - x, 3); };
    var inOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    // [name, return %, slot before, slot after, rank before, rank after]
    var ROWS = [['night_owl', 212, 0, 0, 1, 1], ['Chip Whale', 188, 1, 2, 2, 3], ['mina_k', 141, 2, 3, 3, 4],
                ['soxl_sam', 118, 3, 4, 4, 5], ['dip_buyer', 97, 4, 5, 5, 6], ['you', 12, 5, 1, 14, 2]];
    var els = [], rowH = 0, raf = null, t0 = 0, played = false, END = 3000;
    lb.innerHTML = ROWS.map(function (r) {
      var me = r[0] === 'you';
      return '<div class="lb-row' + (me ? ' you' : '') + '"><span class="led lb-rank"></span><span>' + (me ? 'You<span class="tagx"></span>' : r[0]) + '</span><span class="led up lb-ret"></span></div>';
    }).join('');
    els = [].slice.call(lb.children).map(function (el, k) { return { el: el, r: ROWS[k], rank: el.querySelector('.lb-rank'), ret: el.querySelector('.lb-ret'), tag: el.querySelector('.tagx') }; });
    function layout() {                                                     /* rows sit on fixed slots so they can travel */
      lb.style.position = 'relative'; els.forEach(function (e) { e.el.style.position = 'static'; e.el.style.transform = ''; });
      rowH = els[0].el.offsetHeight; lb.style.height = (rowH * ROWS.length) + 'px';
      els.forEach(function (e) { e.el.style.position = 'absolute'; e.el.style.left = '0'; e.el.style.right = '0'; e.el.style.top = '0'; });
    }
    function render(t) {
      var count = out(clamp((t - 500) / 1000)), slide = inOut(clamp((t - 750) / 750));
      var prev = out(clamp((t - 580) / 1000)), rate = (count - prev) / 0.08;    /* for the trail */
      els.forEach(function (e, k) {
        var r = e.r, me = r[0] === 'you', slot;
        if (me) slot = r[2] + (r[3] - r[2]) * slide;
        else slot = r[2] + (r[3] - r[2]) * inOut(clamp((t - 750 - (k - 1) * 40) / 700));
        e.el.style.transform = 'translateY(' + (slot * rowH).toFixed(2) + 'px)' + (me && slide > 0 && slide < 1 ? ' scale(1.02)' : '');
        e.el.style.zIndex = me ? 2 : 1;
        if (me) {
          var v = r[1] + (196 - r[1]) * count, rk = Math.round(r[4] + (r[5] - r[4]) * count);
          e.ret.textContent = '+' + Math.round(v) + '%'; e.rank.textContent = '#' + rk;
          var tr = clamp(rate / 2.2);
          e.ret.style.textShadow = tr > 0.08 ? '0 ' + (5 * tr).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 32%, transparent), 0 ' + (10 * tr).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 12%, transparent)' : 'none';
          e.el.classList.toggle('lit', t >= 1500);
          e.tag.textContent = 'SPOTLIGHT'.slice(0, Math.round(clamp((t - 1500) / 250) * 9));
        } else {
          e.ret.textContent = '+' + r[1] + '%';
          e.rank.textContent = '#' + (slide > 0.5 ? r[5] : r[4]);
        }
      });
      card2.classList.toggle('on', t >= 1500); card3.classList.toggle('on', t >= 2750);
      var f = out(clamp((t - 1500) / 1250)), fv = Math.round(12 + (1284 - 12) * f), fprev = out(clamp((t - 1580) / 1250));
      fol.textContent = fv.toLocaleString('en-US');
      var ft = clamp(((f - fprev) / 0.08) / 2.4);
      fol.style.textShadow = t > 1500 && ft > 0.08 ? '0 ' + (5 * ft).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 32%, transparent), 0 ' + (10 * ft).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 12%, transparent)' : 'none';
      btn.textContent = t >= END ? 'Replay the day' : 'Have a great trading day';
    }
    function loop(ts) { if (!t0) t0 = ts; var t = ts - t0; render(Math.min(t, END)); raf = t < END ? requestAnimationFrame(loop) : null; }
    function play() {
      if (raf) cancelAnimationFrame(raf);
      played = true; layout();
      if (noMotion) { render(END); return; }
      t0 = 0; render(0); raf = requestAnimationFrame(loop);
    }
    layout(); render(0);
    btn.addEventListener('click', play);
    window.addEventListener('resize', function () { var tr = els.map(function (e) { return e.el.style.transform; }); layout(); els.forEach(function (e, k) { e.el.style.transform = tr[k]; }); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting && !played) { play(); io.disconnect(); } }, { threshold: 0.55 });
      io.observe(lb);
    } else play();
  })();

  /* Get started: two app mockups (home, order) take turns in one spot (ohayo-motion: time-driven, out / in-out).
     Each phone's 12.5s turn:
       0-1.5s    it rises out of the dark, tipped back ~38deg with a slight turn and roll, settling flat; the screen
                 "wakes" over 1.0-1.5s
       2.5-11s   its feed scrolls like a finger flick (in-out): down to the first stop, pause, down to the end, pause
       11-12.5s  the entrance plays in reverse: the screen dims, the phone tips back and sinks into the dark
     Then the other phone takes its turn (home -> order -> home ...), forever. The clock only runs while the section
     is on screen; reduced motion shows the home phone, still. */
  (function () {
    var sec = document.getElementById('start');
    if (!sec) return;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var out = function (x) { return 1 - Math.pow(1 - x, 3); };
    var inOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var IN = 1500, SCROLL = 2500, EXIT = 11000, TURN = 12500;
    /* scroll keyframes within a turn, from SCROLL: [ms, 0..1 of the scrollable range] */
    var KEYS = {
      home: [[0, 0], [2500, 0.42], [4000, 0.42], [6500, 1], [8500, 1]],      /* Tournament, then Markets */
      order: [[0, 0], [2500, 0.62], [4000, 0.62], [6500, 1], [8500, 1]]     /* order form, then balances */
    };
    var phones = [].map.call(sec.querySelectorAll('.st-mock'), function (m, k) {
      return { el: m, body: m.querySelector('.st-phone'), scr: m.querySelector('.st-screen'), feed: m.querySelector('.st-feed'), win: m.querySelector('.st-feedwin'),
        keys: KEYS[m.getAttribute('data-mock')] || KEYS.home, mirror: k % 2 ? -1 : 1 };
    });
    function scrollAt(keys, c) {
      if (c <= 0) return 0;
      for (var k = 1; k < keys.length; k++) if (c <= keys[k][0]) {
        var a = keys[k - 1], b = keys[k]; return a[1] + (b[1] - a[1]) * inOut((c - a[0]) / (b[0] - a[0]));
      }
      return keys[keys.length - 1][1];
    }
    function pose(p, e) {                                                   /* e = entrance time 0..IN (exit = e reversed) */
      var m = inOut(clamp(e / IN)), lit = out(clamp(e / 1250)), wake = out(clamp((e - 1000) / 500)), s = p.mirror;
      p.body.style.transform = 'translateY(' + (120 * (1 - m)).toFixed(1) + 'px) rotateX(' + (38 * (1 - m)).toFixed(2) + 'deg) rotateY(' + (-14 * s * (1 - m)).toFixed(2) + 'deg) rotateZ(' + (5 * s * (1 - m)).toFixed(2) + 'deg) scale(' + (0.9 + 0.1 * m).toFixed(4) + ')';
      p.body.style.filter = lit < 1 ? 'brightness(' + lit.toFixed(3) + ')' : 'none';
      p.scr.style.opacity = (0.92 * (1 - wake)).toFixed(3);
    }
    function render(T) {
      var cyc = T % (TURN * phones.length), turn = Math.floor(cyc / TURN), t = cyc - turn * TURN;
      phones.forEach(function (p, k) {
        if (k !== turn) { p.el.style.visibility = 'hidden'; return; }
        p.el.style.visibility = 'visible';
        pose(p, t < EXIT ? Math.min(t, IN) : TURN - t);                    /* in, hold, then the same path backwards */
        var range = p.feed.offsetHeight - p.win.offsetHeight;
        p.feed.style.transform = 'translateY(' + (-scrollAt(p.keys, t - SCROLL) * range).toFixed(1) + 'px)';
      });
    }
    if (noMotion || !('IntersectionObserver' in window)) { render(IN); return; }
    render(0);
    /* a pausable clock: it only advances while the section is on screen */
    var raf = null, acc = 0, last = 0;
    function loop(ts) { if (last) acc += ts - last; last = ts; render(acc); raf = requestAnimationFrame(loop); }
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(loop); }
      else if (!es[0].isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
    }, { threshold: 0.3 }).observe(sec);
  })();

  /* Header: slide up out of view while scrolling down, back in on scroll up, always shown near the top or when it has focus. */
  (function () {
    var hdr = document.querySelector('header.top'), lastY = window.pageYOffset, ticking = false;
    if (!hdr) return;
    function update() {
      var y = window.pageYOffset;
      if (y < 80 || hdr.contains(document.activeElement)) hdr.classList.remove('is-hidden');
      else if (y > lastY + 4) hdr.classList.add('is-hidden');
      else if (y < lastY - 4) hdr.classList.remove('is-hidden');
      if (Math.abs(y - lastY) > 4) lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    hdr.addEventListener('focusin', function () { hdr.classList.remove('is-hidden'); });
  })();

  /* Section scrolling */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  all('[data-scroll]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var target = $(el.getAttribute('data-scroll'));
      if (!target) return;
      /* Scrolling down hides the header, so only leave room for it when the target is above. */
      var top = target.getBoundingClientRect().top, y = top + window.pageYOffset - (top > 0 ? 16 : 88);
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* One shared sign-up, then Discord */
  var dlg = $('reg');
  function openReg(which) {
    $('reg-form').hidden = false; $('reg-done').hidden = true;
    $('reg-err').textContent = '';
    $('reg-tournament').checked = which !== 'tradeview';
    $('reg-tradeview').checked = which !== 'tournament';
    $('discord-note').hidden = true;
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else { dlg.setAttribute('open', ''); }
    $('reg-email').focus();
  }
  function closeReg() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-open]') : null;
    if (b) openReg(b.getAttribute('data-open'));
  });
  all('[data-close]').forEach(function (b) { b.addEventListener('click', closeReg); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeReg(); });
  $('reg-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('reg-email').value.trim();
    var t = $('reg-tournament').checked, v = $('reg-tradeview').checked;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('reg-err').textContent = 'Enter a valid email address, like you@example.com.'; $('reg-email').focus(); return; }
    if (!t && !v) { $('reg-err').textContent = 'Pick at least one update to receive.'; return; }
    var topics = [];
    if (t) topics.push('daily tournaments open');
    if (v) topics.push('TradeView launches in January');
    $('done-title').textContent = "We'll email " + email + '.';
    $('done-body').textContent = "You'll hear from us when " + topics.join(' and when ') + '.';
    $('reg-form').hidden = true; $('reg-done').hidden = false;
    $('discord-btn').focus();
  });
  $('discord-btn').addEventListener('click', function () { $('discord-note').hidden = false; });

  /* Daily tournaments. All sample data. */
  var H = 3600000, t0 = Date.now();
  var tours = [
    { name: 'NVIDIA Earnings Cup', host: 'OHAYO', len: '24h', note: 'News day', tickers: ['NVDA'], pool: 5000, players: 412, status: 'live', at: t0 + 5.7 * H, minVol: 3500 },
    { name: 'SOXL Daily', host: 'OHAYO', len: '24h', note: '', tickers: ['SOXL'], pool: 2000, players: 268, status: 'live', at: t0 + 11.14 * H, minVol: 3500 },
    { name: 'Semi Hunter Open', host: 'Semi Hunter', len: '3 days', note: 'Creator', tickers: ['NVDA', 'MU', 'AMD'], pool: 10000, players: 1034, status: 'live', at: t0 + 51.3 * H, minVol: 10500 },
    { name: 'KORU Sprint', host: 'OHAYO', len: '6h', note: '', tickers: ['KORU'], pool: 1000, players: 0, status: 'soon', at: t0 + 3.21 * H, minVol: 900 },
    { name: 'SK hynix Daily', host: 'OHAYO', len: '24h', note: '', tickers: ['SK HYNIX'], pool: 2000, players: 0, status: 'soon', at: t0 + 9.5 * H, minVol: 3500 },
  ];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function clock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return (d ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s % 60);
  }
  var stText = { live: 'LIVE', soon: 'SOON', flag: 'DEC 15' };
  var ckText = { live: 'ends in', soon: 'opens in', flag: 'opens in' };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var progSample = [76, 54, 29];
  function tcard(t, i) {
    var live = t.status === 'live', ini = t.host === 'OHAYO' ? 'OH' : t.host.split(' ').map(function (s) { return s.charAt(0); }).join('').slice(0, 2);
    var prog = live ? '<div class="tc-prog"><div class="row"><small>Time played</small><small>' + progSample[i % 3] + '%</small></div><div class="track"><div class="bar" style="--p:' + progSample[i % 3] + '%"></div></div></div>'
      : (t.status === 'flag' ? '<div class="tc-prog"><div class="row"><small>Prize unlock</small><small>up to $500,000</small></div><div class="track"><div class="bar" style="--p:20%"></div></div></div>' : '');
    return '<article class="tcard">' +
      '<div class="tc-status"><span class="st st-' + t.status + '"><i></i>' + stText[t.status] + '</span><span class="badge">' + t.len + '</span></div>' +
      '<div class="tc-title">' + (t.host === 'Semi Hunter' ? '<img class="av av-photo" src="assets/img/avatars/men-32.jpg" width="40" height="40" alt="Semi Hunter">' : t.host === 'OHAYO' ? '<img class="av av-logo" src="assets/img/ohayo-avatar.svg" width="40" height="40" alt="OHAYO">' : '<span class="av">' + esc(ini) + '</span>') + '<div><b>' + esc(t.name) + '</b><small>Hosted by ' + esc(t.host) + (t.note ? ' · ' + esc(t.note) : '') + '</small></div></div>' +
      '<div class="tc-stats"><div><small>Prize pool</small><b class="led">' + usd(t.pool) + '</b></div>' +
        '<div><small>' + (live ? 'Ends in' : 'Opens in') + '</small><b class="led hot" data-clock="' + i + '">--:--:--</b></div>' +
        '<div><small>' + (live ? 'Players' : 'Min. volume') + '</small><b class="led">' + (live ? t.players.toLocaleString('en-US') : usd(t.minVol)) + '</b></div></div>' +
      prog +
      '<div class="tc-foot"><span class="tk">' + t.tickers.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</span>' +
        '<button type="button" class="linkbtn" data-open="tournament">Notify me</button></div>' +
      '</article>';
  }
  var liveHtml = '', soonHtml = '', liveN = 0, soonN = 0;
  tours.forEach(function (t, i) { if (t.status === 'live') { liveHtml += tcard(t, i); liveN++; } else { soonHtml += tcard(t, i); soonN++; } });
  $('live-cards').innerHTML = liveHtml; $('soon-cards').innerHTML = soonHtml;
  $('live-n').textContent = liveN; $('soon-n').textContent = soonN;

  var tabBtns = all('.t-tab');
  tabBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      tabBtns.forEach(function (o) { o.setAttribute('aria-selected', o === b ? 'true' : 'false'); });
      ['find', 'joined', 'results'].forEach(function (k) { $('tp-' + k).hidden = k !== b.getAttribute('data-tab'); });
    });
  });

  /* Strip under the hero: same tournaments, written twice so the loop is seamless */
  var stripHtml = tours.map(function (t, i) {
    var cls = t.status === 'live' ? 's-live' : 's-soon';
    var lead = t.status === 'live' ? '● LIVE' : (t.status === 'soon' ? 'OPENS IN' : 'DEC 15');
    var tail = t.status === 'live' ? ' left' : '';
    return '<span><span class="' + cls + '">' + lead + '</span> ' + esc(t.name) + ' · ' + usd(t.pool) + ' <span class="s-time"><span data-clock="' + i + '">--:--:--</span>' + tail + '</span></span>';
  }).join('');
  $('strip-run').innerHTML = stripHtml + stripHtml;

  function tick() {
    var now = Date.now();
    tours.forEach(function (t, i) {
      var left = t.at - now;
      if (left <= 0 && t.status !== 'flag') { t.at += 24 * H; left = t.at - now; }
      var text = left <= 0 ? 'LIVE NOW' : clock(left);
      all('[data-clock="' + i + '"]').forEach(function (el) { el.textContent = text; });
    });
  }
  tick();
  setInterval(tick, 1000);

  /* Next rank / next prize demo (no progress bar, as in the current app design) */
  var gSteps = [
    { rank: 14, prize: 120, nprize: 150, gap: 42 },
    { rank: 13, prize: 150, nprize: 300, gap: 65 },
    { rank: 12, prize: 150, nprize: 300, gap: 88 },
    { rank: 11, prize: 150, nprize: 300, gap: 120 },
    { rank: 10, prize: 300, nprize: 600, gap: 310 }
  ];
  var gi = 0;
  function paintGoal() {
    var s = gSteps[gi];
    $('g-rank').textContent = '#' + s.rank;
    $('g-next').textContent = '#' + (s.rank - 1);
    $('g-prize').textContent = usd(s.prize);
    $('g-nprize').textContent = usd(s.nprize);
    $('g-gap').textContent = usd(s.gap);
    $('g-btn').textContent = gi === gSteps.length - 1 ? 'Start over' : 'Add a winning trade';
  }
  $('g-btn').addEventListener('click', function () { gi = gi === gSteps.length - 1 ? 0 : gi + 1; paintGoal(); });

  /* Hero A: the short card comes forward on its own so "profit on a drop" is seen without a tap. First tap takes over. */
  /* Hero 3D scene: the canvas fills the hero; zoom the Spline camera by data-zoom once the scene has loaded.
     The viewer has no public zoom attribute, so this reaches its runtime (_spline.setZoom); the viewer version is pinned in index.html.
     At zoom 1 the cards' right edge sits about 540px right of the canvas centre (measured, with some margin), so narrower windows get less zoom to keep them on screen. */
  (function () {
    var v = document.querySelector('spline-viewer.hero-scene'), max = v && parseFloat(v.getAttribute('data-zoom')), tries = 0, app = null;
    if (!v) return;
    /* data-zoom is optional; without it the camera keeps the zoom set in Spline */
    function apply() { if (app && max > 0) app.setZoom(Math.max(1, Math.min(max, (v.clientWidth / 2 - 24) / 540))); }
    var t = setInterval(function () {
      if (v._loaded && v._spline && typeof v._spline.setZoom === 'function') { app = v._spline; apply(); clearInterval(t); }
      else if (++tries > 150) clearInterval(t);
    }, 200);
    window.addEventListener('resize', apply);
    /* At 1080px and below the CSS hides the scene (display: none). A hidden canvas has zero size and the WebGPU renderer then
       errors on every frame, so stop the render loop while hidden and resume it when the scene is shown again. */
    var hiddenMq = window.matchMedia('(max-width: 1080px)');
    /* hidden on narrow screens, and in the preview's 2type hero (body.hero-2type) */
    function isHidden() { return hiddenMq.matches || document.body.classList.contains('hero-2type'); }
    var stopped = false;
    /* resume only once the viewer's canvas has its size back, otherwise the first frames still render at zero size */
    function resume() {
      if (isHidden() || !stopped) return;
      var c = v.shadowRoot && v.shadowRoot.querySelector('canvas');
      if (v.clientWidth > 0 && c && c.width > 0 && c.height > 0) { app.play(); stopped = false; apply(); }
      else requestAnimationFrame(resume);
    }
    function syncRun() { if (!app) return; if (isHidden()) { if (!stopped) { app.stop(); stopped = true; } } else if (stopped) requestAnimationFrame(resume); }
    if (hiddenMq.addEventListener) hiddenMq.addEventListener('change', syncRun); else hiddenMq.addListener(syncRun);
    var waitApp = setInterval(function () { if (app) { clearInterval(waitApp); syncRun(); } }, 200);
    document.addEventListener('herochange', syncRun);
    /* Wheel over the scene scrolls the page only: stop the event at the viewer host (capture) so Spline's camera never sees it.
       No preventDefault, so the page still scrolls. */
    v.addEventListener('wheel', function (e) { e.stopPropagation(); }, { capture: true, passive: true });
  })();

  /* Tournament 3D scene: render only while the section is on screen (two live WebGPU scenes would otherwise run at once). */
  (function () {
    var v = document.querySelector('.t-scene spline-viewer');
    if (!v || !('IntersectionObserver' in window)) return;
    var app = null, visible = false, stopped = false;
    function sync() { if (!app) return; if (visible && stopped) { app.play(); stopped = false; } else if (!visible && !stopped) { app.stop(); stopped = true; } }
    /* Camera zoom: the cube field is a finite plane, so the scene's own 45deg view shows its edges on wide canvases.
       Narrow the field of view instead (setZoom has no effect on this scene's camera), keeping the horizontal coverage
       that fills a 1805 x 793 canvas at 32deg: wider canvases zoom in more, narrower ones less (never past the scene's 45deg). */
    var REF_ASPECT = 1805 / 793, REF_FOV = 32;
    function zoom() {
      var c = app && app._camera, w = v.clientWidth, h = v.clientHeight;
      if (!c || !w || !h || typeof c.updateProjectionMatrix !== 'function') return;
      var half = Math.atan(Math.tan(REF_FOV * Math.PI / 360) * REF_ASPECT / (w / h));
      c.fov = Math.min(45, half * 360 / Math.PI); c.updateProjectionMatrix();
      if (app.requestRender) app.requestRender();
    }
    var t = setInterval(function () { if (v._loaded && v._spline) { app = v._spline; clearInterval(t); zoom(); sync(); } }, 300);
    window.addEventListener('resize', function () { setTimeout(zoom, 120); }); /* after Spline's own resize */
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { rootMargin: '200px 0px' }).observe(v);
  })();

  var pcards = $('pcards'), flipT = null;
  if (pcards) pcards.addEventListener('click', function () { if (flipT) { clearInterval(flipT); flipT = null; } this.classList.toggle('swap'); });
  if (pcards && !noMotion) flipT = setInterval(function () { if (!document.hidden && !$('hero-a').hidden && !pcards.matches(':hover')) pcards.classList.toggle('swap'); }, 5000);


  /* 2type hero vector sequence (Figma storyboard 75:10785, cuts 1-6), 8s then a 2s hold, looping.
     Times below are on a 4s scale; SPEED stretches them (2 = 8s):
     1  0.00-0.80  "SK hynix up 4.8%" types in large in the centre, "$1,000 invested: Returns compared" fades in under it
     2  0.80-1.40  that heading shrinks up into its slot; "SHARES AT YOUR BROKER" appears large in the centre
     3  1.40-2.30  the caption moves to its slot (top left); the broker bar fills from the bottom up (58 dots), +$0 -> +$48
     4  2.30-2.70  "OHAYO · LONG 10x" appears large in the centre
     5  2.70-3.50  it moves to its slot (top right); the OHAYO block fills from the bottom up (576 dots), +$0 -> +$482
     6  3.50-3.95  a big orange multiplier counts up 0x -> 10x, centre
     Runs only while the 2type hero is shown. */
  (function () {
    var seq = document.querySelector('.hero-seq');
    if (!seq) return;
    var st = seq.querySelector('.hs-stage'), q = function (c) { return st.querySelector(c); };
    var head = q('.hs-head'), tw = q('.hs-w'), tg = q('.hs-g'), sub = q('.hs-sub'), capT = q('.hs-cap--them'), capU = q('.hs-cap--us');
    var vT = q('.hs-val--them'), vU = q('.hs-val--us'), dT = q('.hs-dots--them'), dU = q('.hs-dots--us'), x10 = q('.hs-x');
    var T1 = 'SK hynix ', T2 = 'up 4.8%', SPEED = 2, LOOP = 4000 * SPEED + 2000, raf = null, t0 = 0;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var seg = function (t, a, b) { return clamp((t - a) / (b - a)); };
    var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
    var easeInOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    /* translate from an element's slot centre to centre stage (540, cy); slots come from CSS, sizes measured once */
    function bigOffset(el, cy) { return { x: 540 - (el.offsetLeft + el.offsetWidth / 2), y: cy - (el.offsetTop + el.offsetHeight / 2) }; }
    var oHead, oT, oU;
    function measure() { oHead = bigOffset(head, 103); oT = bigOffset(capT, 109); oU = bigOffset(capU, 109); }
    function place(el, o, scale, k) { /* k = 0 at centre stage (large), 1 in its slot */
      el.style.transform = 'translate(' + (o.x * (1 - k)).toFixed(1) + 'px,' + (o.y * (1 - k)).toFixed(1) + 'px) scale(' + (scale + (1 - scale) * k).toFixed(3) + ')';
    }
    function fill(box, k) { /* light k dots, 24 per row, from the bottom row up */
      var full = Math.floor(k / 24), rem = k % 24, f = box.firstElementChild, part = box.lastElementChild;
      f.style.height = full * 6 + 'px'; part.style.bottom = full * 6 + 'px'; part.style.width = rem * 6 + 'px';
    }
    function fit() { var k = Math.min(1, seq.clientWidth / 1080 || 1); st.style.transform = 'scale(' + k + ')'; seq.style.height = Math.round(200 * k) + 'px'; }
    function render(t) {
      // 1: heading types in large, subtitle fades in; 2: the pair shrinks up into its slot
      var n = Math.round(seg(t, 0, 500) * (T1.length + T2.length));
      tw.textContent = T1.slice(0, n); tg.textContent = T2.slice(0, Math.max(0, n - T1.length));
      sub.style.opacity = seg(t, 450, 700);
      place(head, oHead, 2.28, easeInOut(seg(t, 800, 1100)));
      // 2-3: broker caption appears large, then moves to its slot; bar + count
      capT.style.opacity = seg(t, 950, 1150);
      place(capT, oT, 1.9, easeInOut(seg(t, 1400, 1650)));
      var p1 = easeOut(seg(t, 1600, 2300));
      vT.style.opacity = seg(t, 1600, 1700); vT.textContent = '+$' + Math.round(48 * p1); fill(dT, Math.round(58 * p1));
      // 4-5: OHAYO caption appears large, then moves to its slot; block + count
      capU.style.opacity = seg(t, 2300, 2500);
      place(capU, oU, 1.9, easeInOut(seg(t, 2700, 2950)));
      var p2 = easeOut(seg(t, 2900, 3500));
      vU.style.opacity = seg(t, 2900, 3000); vU.textContent = '+$' + Math.round(482 * p2); fill(dU, Math.round(576 * p2));
      // 6: the multiplier counts up 0x -> 10x
      var p3 = easeOut(seg(t, 3500, 3950));
      x10.style.opacity = seg(t, 3500, 3580); x10.textContent = Math.round(10 * p3) + 'x';
    }
    function loop(ts) { if (!t0) t0 = ts; render(((ts - t0) % LOOP) / SPEED); raf = requestAnimationFrame(loop); }
    function sync() {
      var on = document.body.classList.contains('hero-2type') && getComputedStyle(seq).display !== 'none'; /* parked: hidden by CSS */
      if (on) { fit(); measure(); if (noMotion) { render(4000); return; } if (!raf) { t0 = 0; raf = requestAnimationFrame(loop); } }
      else if (raf) { cancelAnimationFrame(raf); raf = null; }
    }
    document.addEventListener('herochange', sync);
    window.addEventListener('resize', fit);
    sync();
  })();

  /* 2type page intro (kinetic type, after the reference showreel; ohayo-motion skill). Runs once each time the 2type
     hero is shown, before the belt starts. 0.5s beats, sub-beats of 0.25s:
       0-1s      evidence first: a cream plate rises, "SK HYNIX · SHARES" and the number counts +0.0% -> +4.8%
       1-2s      an OHAYO-orange plate wipes over it, "OHAYO · LONG 10x", the same number keeps counting
                 +4.8% -> +48% with a speed trail, then lands extruded (the 10x payoff)
       2-2.5s    the plate stack wipes away upward and the headline drops in, word by word, at centre stage
       2.5-3.05s it glides and shrinks into the real h1 (FLIP: a transform, never a fade); the copy then follows
     Then body.hero-intro-on is cleared and 'herointrodone' fires, which starts the belt. */
  (function () {
    var fold = document.querySelector('.fold'), copy = document.querySelector('.hero-copy'), h1 = copy && copy.querySelector('h1');
    if (!fold || !h1) return;
    var ov = document.createElement('div'); ov.className = 'hero-intro'; ov.hidden = true; ov.setAttribute('aria-hidden', 'true');
    fold.appendChild(ov);
    /* the same $1,000 and the same +4.8% move as the belt: shares return +4.8%, OHAYO long 10x returns +48% */
    var PLATES = [
      { bg: '#f4f1e8', fg: '#111111', label: 'SK hynix · shares', a: 0, b: 4.8, ts: 0, count: [150, 700], dir: 0 },
      { bg: '#ff5a00', fg: '#000000', label: 'OHAYO · long 10x', a: 4.8, b: 48, ts: 1000, count: [1150, 1700], dir: 1, extrude: true }
    ];
    var EXTRUDE = ['#c8e34b', '#3b57e6'];
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var out = function (x) { return 1 - Math.pow(1 - x, 3); };
    var inOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var raf = null, t0 = 0, words = [], stack, plates, line, spans, flip, tA = 2000;
    var fmt = function (v) { return '+' + (v < 9.95 ? v.toFixed(1) : Math.round(v)) + '%'; };
    function extrude(n) { var a = []; for (var i = 1; i <= n; i++) a.push(i + 'px ' + i + 'px 0 ' + (i <= 6 ? EXTRUDE[0] : EXTRUDE[1])); return a.join(','); }
    function build() {
      words = (h1.textContent || '').trim().split(/\s+/).slice(0, 6);
      ov.innerHTML = ''; ov.style.height = fold.offsetHeight + 'px';
      stack = document.createElement('div'); stack.className = 'hi-stack'; ov.appendChild(stack);
      plates = PLATES.map(function (c) {
        var pl = document.createElement('div'), box = document.createElement('div'), lb = document.createElement('p'), wd = document.createElement('div');
        pl.className = 'hi-plate'; pl.style.background = c.bg; box.className = 'hi-num';
        lb.className = 'hi-label'; lb.style.color = c.fg; lb.textContent = c.label;
        wd.className = 'hi-word'; wd.style.color = c.fg; wd.textContent = fmt(c.a);
        box.appendChild(lb); box.appendChild(wd); pl.appendChild(box); stack.appendChild(pl);
        return { c: c, el: pl, box: box, word: wd, label: lb };
      });
      // the assembled line, styled exactly like the h1 and placed where the h1 sits (FLIP target)
      var cs = getComputedStyle(h1), fr = fold.getBoundingClientRect(), hr = h1.getBoundingClientRect();
      var ty = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform).m42;   /* undo the copy's pre-reveal offset */
      line = document.createElement('h2'); line.className = 'hi-line';
      ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'textWrap'].forEach(function (k) { line.style[k] = cs[k]; });
      var oneLine = hr.height < parseFloat(cs.lineHeight) * 1.5 || hr.height < parseFloat(cs.fontSize) * 1.6;
      line.style.width = (hr.width + 4) + 'px'; line.style.whiteSpace = oneLine ? 'nowrap' : 'normal';   /* same line breaks as the h1 */ line.style.left = (hr.left - fr.left) + 'px'; line.style.top = (hr.top - fr.top - ty) + 'px';
      line.innerHTML = words.map(function (w) { return '<span>' + w.replace(/[&<>]/g, '') + '</span>'; }).join(' ');
      ov.appendChild(line); spans = [].slice.call(line.children);
      var lw = hr.width, S = Math.min(2.2, (fr.width * 0.82) / lw);
      flip = { S: S, dx: fr.width / 2 - (hr.left - fr.left) - lw * S / 2, dy: fold.offsetHeight * 0.42 - (hr.top - fr.top - ty) - hr.height * S / 2 };
    }
    function render(t) {
      // 1. number plates: each wipes in (the first rises, the second slides over it), its number slams in with a
      //    speed blur and counts on the beat; the count leaves a trail while it runs; the OHAYO number lands extruded
      plates.forEach(function (p) {
        var c = p.c, w = out(clamp((t - c.ts) / 260));
        p.el.style.transform = c.dir ? 'translateX(' + (100 * (1 - w)).toFixed(2) + '%)' : 'translateY(' + (100 * (1 - w)).toFixed(2) + '%)';
        var s = out(clamp((t - c.ts - 120) / 300));
        p.box.style.transform = 'translateX(' + (-70 * (1 - s)).toFixed(1) + 'px) scale(' + (1.15 - 0.15 * s).toFixed(3) + ')';
        p.box.style.filter = s < 1 ? 'blur(' + (8 * (1 - s)).toFixed(2) + 'px)' : 'none';
        p.box.style.opacity = s > 0 ? 1 : 0;
        var k = clamp((t - c.count[0]) / (c.count[1] - c.count[0])), e = out(k), v = c.a + (c.b - c.a) * e;
        p.word.textContent = fmt(v);
        var speed = k > 0 && k < 1 ? 3 * (1 - k) * (1 - k) : 0;           /* d(out)/dk: fast at first, settling */
        var ghost = speed > 0.15 ? '0 ' + (7 * speed).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 30%, transparent), 0 ' + (14 * speed).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 12%, transparent)' : '';
        var ex = c.extrude ? extrude(Math.round(12 * out(clamp((t - c.count[1] + 100) / 250)))) : '';
        p.word.style.textShadow = [ghost, ex].filter(Boolean).join(',') || 'none';
      });
      // 2. the stack wipes away upward; the full headline drops in word by word at centre stage
      var wipe = inOut(clamp((t - tA) / 420));
      stack.style.transform = 'translateY(' + (-100 * wipe).toFixed(2) + '%)';
      spans.forEach(function (sp, k) {
        var d = out(clamp((t - tA - 80 - k * 70) / 280));
        sp.style.opacity = d; sp.style.transform = 'translateY(' + (36 * (1 - d)).toFixed(1) + 'px)';
        sp.style.filter = d < 1 ? 'blur(' + (6 * (1 - d)).toFixed(2) + 'px)' : 'none';
      });
      // 3. FLIP into the h1: from big at centre stage to the h1's own box
      var f = inOut(clamp((t - (tA + 500)) / 550)), S = flip.S + (1 - flip.S) * f;
      line.style.transform = 'translate(' + (flip.dx * (1 - f)).toFixed(1) + 'px,' + (flip.dy * (1 - f)).toFixed(1) + 'px) scale(' + S.toFixed(4) + ')';
      return t >= tA + 1050;
    }
    function finish() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      h1.style.transition = 'none'; copy.classList.add('is-in');            /* the h1 takes over in place, instantly */
      requestAnimationFrame(function () { ov.hidden = true; ov.innerHTML = ''; h1.style.transition = ''; });
      document.body.classList.remove('hero-intro-on'); document.dispatchEvent(new Event('herointrodone'));
    }
    function loop(ts) { if (!t0) t0 = ts; if (render(ts - t0)) finish(); else raf = requestAnimationFrame(loop); }
    function start() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      copy.classList.remove('is-in');
      if (noMotion) { finish(); return; }
      document.body.classList.add('hero-intro-on');
      requestAnimationFrame(function () { build(); ov.hidden = false; render(0); t0 = 0; raf = requestAnimationFrame(loop); });
    }
    document.addEventListener('herochange', function () {
      if (document.body.classList.contains('hero-2type')) start();
      else { if (raf) { cancelAnimationFrame(raf); raf = null; } ov.hidden = true; document.body.classList.remove('hero-intro-on'); }
    });
    if (document.body.classList.contains('hero-2type')) start();
  })();

  /* 2type hero belt scroll. Two runs alternate: long (Figma 90:13145, SK hynix up 4.8%, OHAYO long 10x) and
     short (Figma 91:16712, NVDA down 3.1%, OHAYO short 20x). The dot stays put while the 10% grid scrolls
     right-to-left and, as the move steepens, top-to-bottom (long: the dot climbs) or bottom-to-top (short: it
     falls). The tail is the dot's own recent path; its length follows the belt's speed.
     Everything sits on a 0.5s beat (ohayo-motion skill). One run = 32 beats = 16s:
       beats 0-3   ignition (after the showreel intro), at centre stage: a core dot lights, coloured arcs orbit it on
                   several radii while thin rings expand and fade, then it glides left into place as the orbit
                   tightens and collapses into the full dot
       beats 3-7   run-up: the label slides out of the dot; STOCKS types (beat 4), the OHAYO caption (beat 5),
                   both shrink into place (beat 6), amounts and dots join, staggered (beat 6.x)
       beats 7-27  the move: $1,000 in stocks and on OHAYO count together, one dot per dollar; fast counts trail
       beats 27-29 the belt brakes; the 10x / 20x lands on beat 27
       beats 29-32 hold; on the last beat an LED dot matrix floods out from the stage centre in a circular wave,
                   and on the next run's first beat a second wave from the centre switches it off again.
                   The grid never jumps between runs. */
  (function () {
    var belt = document.querySelector('.hero-belt');
    if (!belt) return;
    var fold = belt.parentElement, cv = belt.querySelector('canvas'), ctx = cv.getContext('2d');
    var label = belt.querySelector('.hb-label'), name = label.querySelector('.hb-name'), num = label.querySelector('b'), x10 = belt.querySelector('.hb-x');
    var fx = document.createElement('canvas'); fx.className = 'hb-fx'; belt.appendChild(fx); var fctx = fx.getContext('2d');
    var DOTS = [], LP = 24, LR = 6.7, WIPE = 1500;                                      /* LED wipe: dot pitch 24px (50% wider), dot radius 6.7px */
    var grid = fold.querySelector('.hero-grid'), copy = fold.querySelector('.hero-copy'), strip = fold.querySelector('.strip'), hero = fold.querySelector('.hero');
    var RUNS = [
      { name: 'SK hynix', move: 4.8, dir: 1, mult: 10, cap: 'OHAYO · LONG 10x', x: '10x', color: '--fg-positive' },
      { name: 'NVDA', move: 3.1, dir: -1, mult: 20, cap: 'OHAYO · SHORT 20x', x: '20x', color: '--fg-negative' }
    ];
    var GX = 234, GY = 167, OX = -377.7, OY = -404.5;          /* grid pitch and phase relative to the dot, from the storyboard */
    var B = 500, VX = 130, INTRO = 3 * B, LEAD = INTRO + 4 * B, RISE = 20 * B, STOP = 2 * B, HOLD = 3 * B, FADE = B, END = LEAD + RISE, LOOP = END + STOP + HOLD, PRE = 1000, STEP = 10;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var out = function (x) { return 1 - Math.pow(1 - x, 3); };                         /* skill easings: out, in-out */
    var inOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var mod = function (a, n) { return ((a % n) + n) % n; };
    /* precomputed world path, sampled every 10ms from -1s (flat run-up, so the tail exists at 0%).
       The belt accelerates through the move (up to 2.2x) and brakes to a stop after it. */
    var wx = [], wy = [], sp = [], n = (PRE + LOOP) / STEP + 1, x = -VX * PRE / 1000, y = 0;
    for (var i = 0; i < n; i++) {
      var t = i * STEP - PRE;
      var k = clamp((t - LEAD) / RISE), slope = k * k * (3 - 2 * k);   /* flat until LEAD, then the move */
      var ka = clamp((t - LEAD) / (RISE * 0.4)), kb = clamp((t - END) / STOP);
      var v = VX * (1 + 1.2 * ka * ka * (3 - 2 * ka)) * (1 - kb) * (1 - kb);
      wx.push(x); wy.push(y); sp.push(v * Math.sqrt(1 + slope * slope));
      x += v * STEP / 1000; y += v * slope * STEP / 1000;
    }
    var at = function (t) { return Math.min(n - 1, Math.max(0, Math.round((t + PRE) / STEP))); };
    var yTop = wy[at(END)];
    /* first moment the OHAYO amount stops reading +$0 (10 x pct x mult rounds to 1 or more), per run:
       the grid and the tail start from there */
    function zeroUntil(r) {
      if (r._z == null) { r._z = END; for (var q = 0; q < n; q++) if (10 * r.mult * r.move * clamp(wy[q] / yTop) >= 0.5) { r._z = q * STEP - PRE; break; } }
      return r._z;
    }
    var cols = [].map.call(belt.querySelectorAll('.hb-col'), function (el, c) {
      /* storyboard: STOCKS column 423px right of the dot, OHAYO 747px */
      return { el: el, val: el.querySelector('.hb-val'), box: el.querySelector('.hb-dots'), cap: el.querySelector('.hb-cap'), txt: '', us: !!c,
        dx: c ? 747 : 423, type: c ? [INTRO + 2 * B, INTRO + 3 * B] : [INTRO + B, INTRO + 2 * B], join: LEAD - B + (c ? 120 : 0) }; /* typing on beats 4 and 5; amounts join staggered by 120ms */
    });
    cols[0].txt = cols[0].cap.textContent;
    function fill(box, k, down) { /* light k dots, 12 per row, from the bottom row up (or the top row down) */
      var full = Math.floor(k / 12), rem = k % 12, f = box.firstElementChild, part = box.lastElementChild;
      f.style.height = full * 6 + 'px'; part.style.width = rem * 6 + 'px';
      part.style.top = down ? full * 6 + 'px' : ''; part.style.bottom = down ? 'auto' : full * 6 + 'px';
      box.style.height = Math.ceil(k / 12) * 6 + 'px'; /* the amount rides along with the stack */
    }
    var R = RUNS[0], col = '#11ec8a', rgb = '17,236,138', orange = '#ff5a00';
    var bx = 0, by = 0, W = 0, H = 0, dpr = 1, DX = 0, DY = 0, sc = 1, room = 1, raf = null, t0 = 0, run = 0;

    function setRun(r) {
      R = RUNS[r % RUNS.length];
      belt.classList.toggle('is-short', R.dir < 0);
      name.textContent = R.name; cols[1].txt = R.cap; x10.textContent = R.x;
      col = getComputedStyle(document.documentElement).getPropertyValue(R.color).trim() || col;
      orange = getComputedStyle(document.documentElement).getPropertyValue('--fg-primary').trim() || orange;
      var h = col.replace('#', ''); if (h.length === 6) rgb = [0, 2, 4].map(function (o) { return parseInt(h.substr(o, 2), 16); }).join(',');
      place();
    }
    function place() {
      cols.forEach(function (c) {
        var down = !c.us && R.dir < 0;
        c.el.style.left = (DX + c.dx * sc * room) + 'px';
        if (down) { c.el.style.top = (DY - 3.5 * sc) + 'px'; c.el.style.bottom = 'auto'; }   /* caption on top, loss hangs below */
        else { c.el.style.top = 'auto'; c.el.style.bottom = (H - (DY - 7.5 * sc)) + 'px'; }
        c.el.style.transform = 'scale(' + sc + ')';
      });
    }
    function layout() {
      var fr = fold.getBoundingClientRect(), gr = grid.getBoundingClientRect(), cr = copy.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      W = fold.clientWidth; H = strip ? strip.offsetTop : hr.bottom - fr.top;
      belt.style.height = H + 'px';
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      fx.width = cv.width; fx.height = cv.height;
      // LED wipe dots: whole cells only. The wave runs out from the stage centre, so each dot keeps its normalised
      // distance from the centre (0 centre, 1 corner) plus a little jitter so the wavefront isn't a perfect ring
      var copyBottom = cr.bottom - fr.top, heroBottom = Math.min(H, hr.bottom - fr.top);
      function DYw() { return copyBottom + (heroBottom - copyBottom) * 0.45; }
      // the wave starts where the ignition orbit starts: centre stage, at the dot's height
      var wcx = W / 2, wcy = DYw(), rC = Math.max(Math.hypot(wcx, wcy), Math.hypot(wcx, H - wcy));
      DOTS = []; var cols0 = Math.floor(W / LP), rows0 = Math.floor(H / LP), ox0 = (W - cols0 * LP) / 2, oy0 = (H - rows0 * LP) / 2;
      for (var gi = 0; gi < cols0; gi++) for (var gj = 0; gj < rows0; gj++) {
        var hsh = Math.sin(gi * 12.9898 + gj * 78.233) * 43758.5453; hsh -= Math.floor(hsh);
        var px0 = ox0 + (gi + 0.5) * LP, py0 = oy0 + (gj + 0.5) * LP, dn = Math.hypot(px0 - wcx, py0 - wcy) / rC;
        DOTS.push([px0, py0, dn + (hsh - 0.5) * 0.012, hsh, dn]);
      }

      DX = (cr.left - fr.left) + Math.min(160, gr.width * 0.15); /* storyboard: dot centre 160px right of the copy's left edge */
      DY = copyBottom + (heroBottom - copyBottom) * 0.45;
      sc = parseFloat(getComputedStyle(label).fontSize) / 32;
      label.style.left = (DX + 20 * sc) + 'px'; label.style.top = DY + 'px';
      room = Math.min(1, Math.max(0.5, (W - 24 - DX - 170 * sc) / 747)); /* squeeze the columns in on narrow screens */
      x10.style.left = (DX + 604 * sc * room) + 'px'; x10.style.top = (DY - 121.5 * sc) + 'px'; /* between the two graphs */
      place();
    }
    /* Ignition orbit, drawn around the dot. Arcs: radius (x the dot radius), width, share of the circle, spin in
       turns per second (sign = direction), start angle, colour slot. Rings: thin full circles that expand from the
       core and fade. Colours: the reference showreel's intro palette (cream, lime, violet, cobalt, coral, amber),
       slot 0 is the run's own colour (green long / red short). This effect alone may go beyond the DS palette. */
    var FX = ['', '#f4f1e8', '#c8e34b', '#8a7cff', '#3b57e6', '#ff6a4d', '#f2b84b'];
    var ARCS = [
      [2.6, 2.4, 0.22, 0.55, 0.10, 1], [3.1, 2.4, 0.12, -0.8, 0.55, 2], [3.9, 3.0, 0.30, 0.42, 0.85, 3],
      [4.6, 2.0, 0.10, -1.1, 0.30, 5], [5.4, 3.0, 0.26, 0.6, 0.70, 4], [6.3, 2.4, 0.16, -0.5, 0.05, 0],
      [7.4, 3.4, 0.20, 0.35, 0.45, 6], [8.6, 2.0, 0.08, -0.9, 0.62, 2], [10.2, 2.6, 0.14, 0.28, 0.20, 3]
    ], RINGS = [[0.15, 5], [0.32, 2], [0.5, 4]];
    function ignite(t, eIn, eOut, a, ox) {   /* ox: the orbit's current x (it travels from centre stage to the dot) */
      var cols3 = FX.slice(), r0 = 10.5 * sc, live = Math.min(eIn, 1 - eOut); cols3[0] = col;
      if (live <= 0.002) return;
      ctx.save(); ctx.lineCap = 'round';
      // expanding rings: born from the core, sweep outward over about 1.1s, thinning and fading as they go
      RINGS.forEach(function (rg) {
        var p = clamp((t / 1000 - rg[0]) / 1.1); if (p <= 0 || p >= 1) return;
        var e = out(p); ctx.globalAlpha = a * 0.55 * (1 - p) * (1 - eOut);
        ctx.strokeStyle = cols3[rg[1]]; ctx.lineWidth = Math.max(0.6, 2 * (1 - p)) * sc;
        ctx.beginPath(); ctx.arc(ox, DY, r0 * (1.5 + 46 * e), 0, Math.PI * 2); ctx.stroke();
      });
      // orbiting arcs: open out with the in-ease, spin faster and pull inward as they collapse into the dot
      ARCS.forEach(function (ar, k) {
        var rad = r0 * ar[0] * 1.5 * (0.55 + 0.45 * eIn) * (1 - 0.88 * eOut);   /* orbit spans ~3-11 dot radii */
        var len = Math.PI * 2 * ar[2] * live * (1 + 0.8 * eOut);
        var ang = Math.PI * 2 * (ar[4] + ar[3] * (t / 1000) * (1 + 2.5 * eOut)) - Math.PI / 2;
        ctx.globalAlpha = a * live * (0.65 + 0.35 * ((k % 3) / 2));
        ctx.strokeStyle = cols3[ar[5]]; ctx.lineWidth = ar[1] * sc;
        ctx.beginPath(); ctx.arc(ox, DY, rad, ang, ang + len * (ar[3] > 0 ? 1 : -1), ar[3] < 0); ctx.stroke();
      });
      ctx.restore();
    }
    function draw(t) {
      var i = at(t), s = R.dir, cx = bx + wx[i], cy = by + s * wy[i];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // grid: 1px white lines at 10%, shown only while the belt moves and once the % has left 0 (it fades in from
      // the moment the OHAYO amount first reads non-zero, and out again as the belt brakes)
      var ga = 0.1 * Math.min(clamp(sp[i] / VX), clamp((t - zeroUntil(R)) / 800));
      ctx.strokeStyle = 'rgba(255,255,255,' + ga.toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath();
      for (var gx = mod(DX + OX - cx, GX); gx < W; gx += GX) { ctx.moveTo(Math.round(gx) + 0.5, 0); ctx.lineTo(Math.round(gx) + 0.5, H); }
      for (var gy = mod(DY + OY + cy, GY); gy < H; gy += GY) { ctx.moveTo(0, Math.round(gy) + 0.5); ctx.lineTo(W, Math.round(gy) + 0.5); }
      ctx.stroke();
      // fade the dot, tail and label in at the start of a run and out at the end
      // scene 0: LONG / SHORT fades up over the moving grid, holds, and clears before the dot arrives
      var a = Math.min(clamp(t / 150), 1 - clamp((t - (LOOP - WIPE)) / 150));   /* clears in 150ms as the LED wipe starts */
      // ignition (beats 0-3): the orbit opens around a small core, then tightens and collapses into the full dot
      var eIn = out(clamp(t / (B + 100))), eOut = inOut(clamp((t - 2 * B) / B));
      var grow = 0.32 * out(clamp(t / 250)) + 0.68 * eOut;                 /* core 1/3 size, swelling to full on collapse */
      // it ignites at centre stage and glides left into the dot's place while the orbit collapses (0.8-1.5s)
      var ox = DX + (W / 2 - DX) * (1 - inOut(clamp((t - 800) / 700)));
      ctx.globalAlpha = a;
      if (t < INTRO + 50) ignite(t, eIn, eOut, a, ox);
      // tail: the dot's recent path; 85px at cruise, ~3x at full speed, gone when stopped
      // no tail while OHAYO reads +$0: just the dot; the tail grows out from the moment its amount turns non-zero
      var L = 85 * sp[i] / VX * sc * clamp((t - zeroUntil(R)) / 700), len = 0, j = i, px = DX, py = DY, pts = [[DX, DY]];
      while (j > 0 && len < L) {
        j--; var qx = DX + (wx[j] - wx[i]) * sc, qy = DY - s * (wy[j] - wy[i]) * sc;
        len += Math.hypot(qx - px, qy - py); px = qx; py = qy; pts.push([qx, qy]);
      }
      if (pts.length > 1) {
        var g = ctx.createLinearGradient(px, py, DX, DY);
        g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(0.65, col); g.addColorStop(1, col);
        ctx.strokeStyle = g; ctx.lineWidth = 21 * sc; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        for (var m = pts.length - 2; m >= 0; m--) ctx.lineTo(pts[m][0], pts[m][1]);
        ctx.stroke();
      }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox, DY, 10.5 * sc * Math.max(0.001, grow), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // the label slides out of the dot as it lands (beat 3)
      var lIn = out(clamp((t - INTRO) / 300));
      label.style.opacity = Math.min(a, lIn); label.style.transform = 'translate(' + (-14 * sc * (1 - lIn)).toFixed(1) + 'px,-50%)';
      var pct = R.move * clamp(wy[i] / yTop);                                /* size of the move so far, in % */
      // motion trail on fast counts: ghosts of the previous values trail below the number, scaled by how fast it moves
      var rate = Math.abs(pct - R.move * clamp(wy[at(t - 80)] / yTop)) / 0.08, trail = clamp(rate / (1.1 * R.move / 4.8));
      var ghost = trail < 0.06 ? 'none' : '0 ' + (5 * trail).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 32%, transparent), 0 ' + (10 * trail).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 12%, transparent)';
      num.style.textShadow = ghost;
      num.textContent = pct < 0.05 ? '+0%' : (s > 0 ? '+' : '-') + pct.toFixed(1) + '%';
      cols.forEach(function (c) {
        // $1,000: stocks move 1:1 with the ticker; OHAYO gains mult x the move either way
        var d = Math.round(10 * pct * (c.us ? R.mult : 1)), down = !c.us && s < 0;
        c.el.style.opacity = a;
        // scene 2: caption types in at 2x; scene 3: shrinks to 1x; scene 4: amount and dots join as the counting starts
        var nc = Math.round(clamp((t - c.type[0]) / (c.type[1] - c.type[0])) * c.txt.length);
        c.cap.textContent = c.txt.slice(0, nc);
        var k3 = inOut(clamp((t - (INTRO + 3 * B)) / 350));                  /* beat 6: shrink into place */
        c.cap.style.transform = 'scale(' + (2 - k3).toFixed(3) + ')';
        var k4 = out(clamp((t - c.join) / 300));                              /* amounts and dots join, staggered */
        c.val.style.opacity = k4; c.box.style.opacity = k4;
        c.val.style.transform = 'translateY(' + (6 * (1 - k4)).toFixed(1) + 'px)'; c.val.style.textShadow = ghost;
        c.val.textContent = (down && d ? '-$' : '+$') + d; fill(c.box, d, down);
      });
      // scene 5: the 10x / 20x lands the moment OHAYO reaches its total
      var p5 = clamp((t - END) / 400), e5 = out(p5);
      x10.style.opacity = a * p5; x10.style.transform = 'scale(' + (sc * (0.8 + 0.2 * e5)).toFixed(3) + ')';
    }
    /* LED wipe at the run boundary, modelled on the showreel's dot-grid scene: a crest of near-touching circles
       travels out from the stage centre; dots near the crest swell, dots away from it are small rotated squares.
       Colour follows the crest: cream on it, lime > amber > coral > the next run's colour inside it, near-black
       (unlit-looking) LEDs outside and far behind. Cover (last beat of a run): the crest sweeps out and leaves a medium field lit behind it.
       Reveal (first beat of the next run): a second crest sweeps out and switches the field off behind it.
       Whole dots only (ohayo-motion: never a half dot). */
    var CREST = 0.075, FRONT = 1.3, LED_DIM = ['#1c1c1c', '#2b2b2b'];   /* unlit-looking LEDs (replace cobalt/violet in the wipe) */                                        /* crest half-width; travel (1 = corner) */
    function fxColour(rel, nxt) {                                          /* rel = distance from the crest (<0 inside) */
      if (rel > 0.15) return LED_DIM[0]; if (rel > 0.05) return LED_DIM[1]; /* outside: near-black LEDs */
      if (rel > -0.05) return FX[1];                                       /* crest: cream */
      if (rel > -0.13) return FX[2]; if (rel > -0.22) return FX[6]; if (rel > -0.33) return FX[5];   /* lime, amber, coral */
      if (rel > -0.46) return nxt; if (rel > -0.62) return LED_DIM[1]; return LED_DIM[0];
    }
    function drawFx(t, cur, nxt) {
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H);
      var FXD = WIPE;                                                       /* each crest takes 3 beats (1.5s) to cross */
      var cover = t > LOOP - FXD ? (t - (LOOP - FXD)) / FXD : -1, reveal = run > 0 && t < FXD ? t / FXD : -1;
      if (cover < 0 && reveal < 0) return;
      var fC = cover >= 0 ? FRONT * out(cover) : FRONT, fR = reveal >= 0 ? FRONT * out(reveal) : -1;
      var HS = LP * 0.47, buckets = {};
      for (var d = 0; d < DOTS.length; d++) {
        var dn = DOTS[d][2], size, colr, relC = dn - fC;
        // cover crest: swell on the crest, a medium lit field behind it, nothing ahead of it yet
        var gC = Math.exp(-Math.pow(relC / CREST, 2));
        size = relC > 0 ? 0.95 * gC : Math.max(0.95 * gC, 0.42 + 0.12 * Math.cos(relC * 18));
        colr = fxColour(relC, nxt);
        if (fR >= 0) {                                                     /* reveal crest: swell, then off behind it */
          var relR = dn - fR, gR = Math.exp(-Math.pow(relR / CREST, 2));
          if (relR < 0) { size = 0.95 * gR * (relR > -0.18 ? 1 : 0); colr = fxColour(relR * 0.6, nxt); }
          else if (gR > 0.05) { size = Math.max(size, 0.95 * gR); colr = fxColour(relR, nxt); }
        }
        if (size < 0.06) continue;
        var hs = HS * size, kind = size > 0.62 ? 'o' : 'd', key = colr + kind;
        var bk = buckets[key] || (buckets[key] = { c: colr, k: kind, p: new Path2D(), w: 0 });
        var x = DOTS[d][0], y = DOTS[d][1];
        if (kind === 'o') { bk.p.moveTo(x + hs, y); bk.p.arc(x, y, hs, 0, Math.PI * 2); }
        else { var q = hs * 0.86; bk.p.moveTo(x, y - q); bk.p.lineTo(x + q, y); bk.p.lineTo(x, y + q); bk.p.lineTo(x - q, y); bk.p.closePath(); bk.w = Math.max(bk.w, hs * 0.45); }
      }
      fctx.lineJoin = 'round';
      for (var key2 in buckets) {
        var b3 = buckets[key2]; fctx.fillStyle = b3.c; fctx.fill(b3.p);
        if (b3.k === 'd') { fctx.strokeStyle = b3.c; fctx.lineWidth = b3.w; fctx.stroke(b3.p); }   /* rounds the squares' corners */
      }
    }
    function loop(ts) {
      if (!t0) t0 = ts;
      var e = ts - t0, r = Math.floor(e / LOOP);
      while (run < r) { bx += wx[n - 1]; by += R.dir * wy[n - 1]; run++; setRun(run); } /* carry the grid over, switch long <-> short */
      var tr = e - r * LOOP; draw(tr);
      var rc = function (i) { return getComputedStyle(document.documentElement).getPropertyValue(RUNS[(i + RUNS.length) % RUNS.length].color).trim(); };
      drawFx(tr, rc(tr < WIPE ? run - 1 : run), rc(tr < WIPE ? run : run + 1));   /* reveal uses the new run's colour */
      raf = requestAnimationFrame(loop);
    }
    function sync() {
      var on = document.body.classList.contains('hero-2type');
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fx.width, fx.height);   /* no LED dots left behind */
      if (on) {
        layout();
        if (noMotion) { draw(END + STOP); return; }
        if (document.body.classList.contains('hero-intro-on')) { ctx.clearRect(0, 0, cv.width, cv.height); [label].concat(cols.map(function (c) { return c.el; }), [x10]).forEach(function (el) { el.style.opacity = 0; }); return; } /* wait for the page intro */
        t0 = 0; run = 0; bx = by = 0; setRun(0); raf = requestAnimationFrame(loop);
      }
    }
    document.addEventListener('herochange', sync);
    document.addEventListener('herointrodone', sync);
    window.addEventListener('resize', function () { if (document.body.classList.contains('hero-2type')) { layout(); if (noMotion) draw(END + STOP); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (document.body.classList.contains('hero-2type')) layout(); });
    setRun(0);
    sync();
  })();

  /* Preview controls */
  var heads = {
    A: 'SK hynix. 10x. Here.',
    B: 'Long SK hynix at 10x. Short NVDA at 20x.',
    C: 'Same move. Ten times.',
    D: 'A new prize pool every day. Same tickers you trade.'
  };
  var hBtns = all('[data-h]');
  hBtns.forEach(function (b) {
    b.addEventListener('click', function () { press(hBtns, b); $('headline').textContent = heads[b.getAttribute('data-h')]; });
  });
  var heroBtns = all('[data-hero]');
  heroBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var isB = b.getAttribute('data-hero') === 'x10', h = isB ? 'C' : 'A';
      press(heroBtns, b);
      $('hero-a').hidden = isB; /* 2type: empty slot for the next hero concept, no 3D scene */
      /* 2type: the first screen (.fold) ends at the ticker strip; the creators row moves out to sit right after it.
         1type: it goes back inside the fold, above the strip. */
      var fold = document.querySelector('.fold'), crs = document.querySelector('section.creators'), strip = fold && fold.querySelector('.strip');
      if (fold && crs && strip) { if (isB) fold.after(crs); else fold.insertBefore(crs, strip); }
      document.body.classList.toggle('hero-2type', isB); document.dispatchEvent(new Event('herochange'));
      var line = document.querySelector('.hero-line');
      if (line) { line.classList.remove('is-drawn'); if (isB) requestAnimationFrame(function () { requestAnimationFrame(function () { line.classList.add('is-drawn'); }); }); }
      $('headline').textContent = heads[h];
      press(hBtns, hBtns.filter(function (x) { return x.getAttribute('data-h') === h; })[0]);
    });
  });
  $('preview-x').addEventListener('click', function () { $('preview').hidden = true; });
  /* Preview controls (headline A-D, hero A/B) only show with ?preview=1 */
  if (/[?&]preview=1/.test(location.search)) $('preview').hidden = false;
  /* 2type is the default hero for every visitor (body already carries .hero-2type from the inline script, so nothing
     flashes); this finishes the switch: headline C, creators row moved, intro and belt started. ?hero=1 opens 1type. */
  if (!/[?&]hero=1/.test(location.search)) heroBtns.filter(function (x) { return x.getAttribute('data-hero') === 'x10'; })[0].click();
})();
