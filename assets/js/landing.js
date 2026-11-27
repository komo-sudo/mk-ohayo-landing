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
  /* The Try it board is on the landing only; the detail pages (tournament.html, tradeview.html) skip it. */
  if (board) {
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
  /* The chart as an SVG string, for trader t with fill `sel` selected (shared by the TradeView board and the
     3type TradeView intro card). */
  function tvChart(t, sel) {
    /* Exchange-style chart: candles built from the trader's price path (open = previous close, small deterministic
       wicks), volume bars, a right-hand % axis with grid, the entry level dashed, a last-price tag, and execution
       markers the way exchanges print fills: BUY = green ▲ under the candle, SELL = red ▼ over it. The selected
       fill gets a crosshair and an expanded label. */
    var f = t.fills[sel], W = 560, H = 236, AX = 54, PT = 36, PB = 60, VOL = 22;   /* headroom so markers clear the edges and the volume strip */
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
      var buy = m.side === 'BUY', col = buy ? UP : DN, c = cdl[m.i], x = X(m.i), on = k === sel;
      var ay = buy ? Y(c.l) + 6 : Y(c.h) - 6, d = buy ? 1 : -1;            /* arrow tip sits just off the wick */
      var tri = 'M' + x.toFixed(1) + ',' + ay.toFixed(1) + ' l' + (-6) + ',' + (9 * d) + ' l12,0 z';
      var label = on ? (buy ? 'BUY' : 'SELL') + ' #' + (k + 1) : (buy ? 'B' : 'S');
      var lw = on ? 50 : 16, ly2 = ay + d * 12 + (buy ? 0 : -16);
      svg += '<g class="mk' + (on ? ' on' : '') + '" data-k="' + k + '" role="button" aria-label="' + (buy ? 'Buy' : 'Sell') + ' ' + (k + 1) + '">' +
        '<rect x="' + (x - 14).toFixed(1) + '" y="' + Math.min(ay, ly2).toFixed(1) + '" width="28" height="30" fill="transparent"/>' +
        '<path d="' + tri + '" fill="' + col + '"' + (on ? ' stroke="#fafafa" stroke-width="1.2"' : '') + '/>' +
        '<rect x="' + (x - lw / 2).toFixed(1) + '" y="' + ly2.toFixed(1) + '" width="' + lw + '" height="16" rx="3" fill="' + (on ? col : '#0d0d0d') + '" stroke="' + col + '"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + (ly2 + 11.5).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + (on ? '#050505' : col) + '" ' + font + '>' + label + '</text></g>';
    });
    return { box: '0 0 ' + W + ' ' + H, svg: svg };
  }
  function tvPaint() {
    var t = tvData[tvS.who], f = t.fills[tvS.fill], ch = tvChart(t, tvS.fill);
    $('tv-svg').setAttribute('viewBox', ch.box);
    $('tv-svg').innerHTML = ch.svg;
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
  /* The TradeView board lives on the landing (1/2type) and on tradeview.html; other pages skip it. */
  if ($('tv-svg')) {
    $('tv-prev').addEventListener('click', function () { if (tvS.fill > 0) { tvS.fill--; tvPaint(); } });
    $('tv-next').addEventListener('click', function () { if (tvS.fill < tvData[tvS.who].fills.length - 1) { tvS.fill++; tvPaint(); } });
    $('tv-follow').addEventListener('click', function () { tvS.following[tvS.who] = !tvS.following[tvS.who]; tvPaint(); });
    var tvVote = function (k) { return function () { var key = tvS.who + '-' + tvS.fill; tvS.votes[key] = tvS.votes[key] || { u: 0, d: 0 }; tvS.votes[key][k]++; tvPaint(); }; };
    $('tv-up').addEventListener('click', tvVote('u')); $('tv-down').addEventListener('click', tvVote('d'));
    var whoBtns = all('[data-who]');
    whoBtns.forEach(function (b) { b.addEventListener('click', function () { press(whoBtns, b); tvRows(b.getAttribute('data-who')); }); });
    tvRows('all'); tvPaint();
    /* phones (<= 600px): no filter, every trader listed; the picker collapses to the selected trader as a compact row
       with a dropdown. Tapping it opens the list; tapping a trader selects it (the row's own handler) and closes the
       list; a tap outside or Esc closes it too. */
    (function () {
      var side = document.querySelector('.tv-side'), small = window.matchMedia('(max-width: 600px)');
      if (!side) return;
      function sync() {
        var open = side.classList.contains('is-open');
        all('.tv-row', side).forEach(function (r) { if (r.getAttribute('aria-pressed') === 'true') r.setAttribute('aria-expanded', small.matches ? String(open) : null); else r.removeAttribute('aria-expanded'); });
        if (!small.matches) all('.tv-row', side).forEach(function (r) { r.removeAttribute('aria-expanded'); });
      }
      function setOpen(v) { side.classList.toggle('is-open', v); sync(); }
      side.addEventListener('click', function (e) {               /* runs after the row's own select handler */
        if (!small.matches) return;
        var row = e.target.closest && e.target.closest('.tv-row'); if (!row) return;
        setOpen(!side.classList.contains('is-open'));
      });
      document.addEventListener('click', function (e) {         /* a tap outside closes it; the row re-renders on select, */
        var path = e.composedPath ? e.composedPath() : [];      /* so test the event's original path, not the (detached) target */
        if (side.classList.contains('is-open') && path.indexOf(side) === -1 && !side.contains(e.target)) setOpen(false);
      });
      side.addEventListener('keydown', function (e) { if (e.key === 'Escape' && side.classList.contains('is-open')) setOpen(false); });
      var fit = function () { if (small.matches && !whoBtns[0].matches('[aria-pressed="true"]')) whoBtns[0].click(); if (!small.matches) side.classList.remove('is-open'); sync(); };
      (small.addEventListener ? small.addEventListener('change', fit) : small.addListener(fit)); fit();
    })();
  }
  /* 3type TradeView cards (.tvp-svg): the first trader's chart, first trade selected. The page hero stays on it. */
  all('.tvp-svg').forEach(function (el) { var ch = tvChart(tvData[0], 0); el.setAttribute('viewBox', ch.box); el.innerHTML = ch.svg; });

  /* Landing TradeView intro ([data-tvp-cycle]; ohayo-motion): steps through every buy and sell of the trade so each
     one's reason gets read. Per trade, 3s:
       0       the chart redraws with the next marker selected; it lands (0.8 -> 1 scale, 400ms, out)
       0       the text block slides out (200ms, in-out), swaps, slides in from 8px below (350ms, out)
       3s      next trade; after the last, back to the first.
     A trade holds about 2.5s still: reading time for its reason, not a pause in a motion sequence.
     Clicking a marker jumps to it and restarts the 3s. Runs only on screen; reduced motion shows trade 1, still. */
  all('[data-tvp-cycle]').forEach(function (board) {
    var svg = board.querySelector('.tvp-svg'), box = board.querySelector('.tvp-text');
    if (!svg || !box) return;
    var t = tvData[0], k = 0, timer = null, on = false, HOLD = 3000;
    var q = function (a) { return board.querySelector('[data-tvp-' + a + ']'); };
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function fillText(i) {
      var f = t.fills[i];
      q('step').textContent = 'Trade ' + (i + 1) + ' of ' + t.fills.length + ' · ' + (f.side === 'BUY' ? 'buy' : 'sell');
      q('title').textContent = f.title;
      q('notebox').hidden = !f.note; q('note').textContent = f.note;
      q('ai').textContent = f.ai;
    }
    /* Keep the block as tall as its longest trade, so the section never shifts while it steps */
    var tallest = 0;
    t.fills.forEach(function (f, i) { fillText(i); tallest = Math.max(tallest, box.offsetHeight); });
    box.style.minHeight = tallest + 'px';
    function chart(i, land) {
      var ch = tvChart(t, i); svg.innerHTML = ch.svg;
      all('.mk', svg).forEach(function (g) { g.addEventListener('click', function () { go(Number(g.getAttribute('data-k'))); }); });
      var mk = svg.querySelector('.mk.on');
      if (land && mk && mk.animate) mk.animate([{ transform: 'scale(0.8)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], { duration: 400, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
    }
    function show(i, anim) {
      k = i; chart(i, anim);
      if (!anim || !box.animate) { fillText(i); return; }
      box.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-6px)', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' }).onfinish = function () {
        fillText(i);
        box.animate([{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      };
    }
    function schedule() { clearTimeout(timer); timer = on && !still ? setTimeout(function () { show((k + 1) % t.fills.length, true); schedule(); }, HOLD) : null; }
    function go(i) { if (i !== k) show(i, !still); schedule(); }
    show(0, false);
    if (still) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { on = es[0].isIntersecting; schedule(); }, { threshold: 0.3 }).observe(board);
    } else { on = true; schedule(); }
  });

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
     Each phone's 4s turn, on the 0.5s beat grid:
       0-0.5s    it fades up from opacity 0 while rising, tipped back ~38deg with a slight turn and roll, settling flat; screen and
                 frame fade as one
       0.5-3.5s  its feed scrolls like a finger flick (in-out): 1s down to the first stop, 0.5s pause, 1s down to the end, 0.5s pause
       3.5-4s    the entrance plays in reverse: the whole phone (screen and frame together) tips back, sinks and fades out to opacity 0
     Then the other phone takes its turn (home -> order -> home ...), forever. The clock only runs while the section
     is on screen; reduced motion shows the home phone, still. */
  (function () {
    var sec = document.getElementById('start');
    if (!sec) return;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var out = function (x) { return 1 - Math.pow(1 - x, 3); };
    var inOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var IN = 500, SCROLL = 500, EXIT = 3500, TURN = 4000;
    /* scroll keyframes within a turn, from SCROLL: [ms, 0..1 of the scrollable range] */
    var KEYS = {
      home: [[0, 0], [1000, 0.42], [1500, 0.42], [2500, 1], [3000, 1]],      /* Tournament, then Markets */
      order: [[0, 0], [1000, 0.62], [1500, 0.62], [2500, 1], [3000, 1]]     /* order form, then balances */
    };
    var phones = [].map.call(sec.querySelectorAll('.st-mock'), function (m, k) {
      return { el: m, body: m.querySelector('.st-phone'), feed: m.querySelector('.st-feed'), win: m.querySelector('.st-feedwin'),
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
      /* motion eases out (fastest at the start) and opacity rises from 0 with it, so the phone is never seen
         half-lit and standing still; the exit runs the same path backwards, down to opacity 0 */
      var m = out(clamp(e / IN)), a = clamp(e / (IN * 0.67)), op = a * a * (3 - 2 * a), s = p.mirror;
      p.body.style.transform = 'translateY(' + (120 * (1 - m)).toFixed(1) + 'px) rotateX(' + (38 * (1 - m)).toFixed(2) + 'deg) rotateY(' + (-14 * s * (1 - m)).toFixed(2) + 'deg) rotateZ(' + (5 * s * (1 - m)).toFixed(2) + 'deg) scale(' + (0.9 + 0.1 * m).toFixed(4) + ')';
      p.body.style.opacity = op.toFixed(3);
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

  /* Dot-wave backgrounds (.dot-wave canvases): a field of dark grey dots (24px pitch) with a slow wave rolling across it.
     data-dir="right" rolls left to right (creators + Try it), "up" rolls bottom to top (Spotlight). Each dot's level
     follows a travelling sine bent gently along the other axis, so the crests read as soft, uneven ripples rather than
     straight bars. Levels stay between #141414 and #2c2c2c on black, so it never competes with the cards.
     data-through="id" stretches the field down to the foot of that later section. Draws at 30fps at 1x resolution, one
     fill per grey level, only while the field really overlaps the screen; reduced motion draws one still frame. */
  [].forEach.call(document.querySelectorAll('.dot-wave'), function (cv) {
    var sec = cv.parentNode, end = document.getElementById(cv.getAttribute('data-through') || ''), up = cv.getAttribute('data-dir') === 'up';
    var g = cv.getContext('2d'), P = 24, W = 0, H = 0, dpr = 1, raf = null, last = 0, t0 = 0;
    var LO = 20, HI = 44, V = 60, K = 2 * Math.PI / 520;   /* wavelength 520px drifting at 60px/s: a crest every ~8.7s */
    function size() {
      /* 1x resolution: dim 2-4px dots on black read the same, and a retina canvas of a two-section field is ~4x the pixels */
      dpr = 1; W = sec.clientWidth;
      H = Math.round(end ? end.getBoundingClientRect().bottom - sec.getBoundingClientRect().top : sec.clientHeight);
      cv.style.height = H + 'px';
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    /* one path per grey level (25 levels): every dot of a level is added to its path and each path is filled once,
       so a frame is ~25 fills instead of one per dot; the bend per row / column is computed once per line */
    var NL = HI - LO + 1;
    function draw(t) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      var ox = (W % P) / 2 + P / 2, oy = (H % P) / 2 + P / 2, paths = [];
      for (var q = 0; q < NL; q++) paths.push(new Path2D());
      for (var y = oy; y < H; y += P) {
        var bendY = up ? 0 : Math.sin(y / 170) * 1.1 + Math.sin(y / 61) * 0.35;
        for (var x = ox; x < W; x += P) {
          var bend = up ? Math.sin(x / 170) * 1.1 + Math.sin(x / 61) * 0.35 : bendY;   /* bent along the other axis */
          var along = up ? -y : x;                                    /* "up": travel toward smaller y */
          var w = 0.5 + 0.5 * Math.sin((along - t * V) * K + bend);
          w = w * w * w;                                              /* narrow crests, long calm troughs */
          var lv = Math.round((HI - LO) * w), r = 1.6 + 0.5 * lv / (HI - LO);
          paths[lv].moveTo(x + r, y); paths[lv].arc(x, y, r, 0, 6.2832);
        }
      }
      for (q = 0; q < NL; q++) { var v = LO + q; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fill(paths[q]); }
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (ts - last < 33) return; last = ts;
      if (W !== sec.clientWidth || !cv.width) size();                 /* shown after being hidden */
      draw((ts - t0) / 1000);
    }
    size();
    window.addEventListener('resize', function () { size(); draw((performance.now() - t0) / 1000); });
    if (noMotion || !('IntersectionObserver' in window)) { draw(0); return; }
    t0 = performance.now(); draw(0);
    if ('ResizeObserver' in window) new ResizeObserver(function () { var h = H; size(); if (H !== h) draw((performance.now() - t0) / 1000); }).observe(end || sec);
    /* only while the field really overlaps the screen: a canvas whose edge just touches the viewport counts as
       "intersecting" with zero area, which kept a field running under the section next to it */
    new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting && es[0].intersectionRect.height > 1;
      if (on && !raf) raf = requestAnimationFrame(loop);
      else if (!on && raf) { cancelAnimationFrame(raf); raf = null; }
    }, { threshold: [0, 0.01, 0.05] }).observe(cv);
  });

  /* Final CTA candidate 2 (Figma 120:7090, "iPhone mockup - Trading chart - Perspective"): the same phone posed in 3D,
     rebuilt from the Figma layers. A 550 x 980 scene with perspective 2000px; every layer carries the device's pose
     (rotateX 9deg, rotateY -18deg, rotateZ -6deg) and is pushed back along Z to fake the body's thickness: 47 titanium
     sidewall/bevel slices, the rear seam and glass, the power button and two antenna bands. The front device is the
     flat phone PNG plus the live chart canvas, so the screen animates exactly like candidate 1. */
  (function () {
    var scene = document.querySelector('.fp2-scene');
    if (!scene) return;
    var POSE = ' rotateX(9deg) rotateY(-18deg) rotateZ(-6deg)', DZ = 0.93935, DX = 0.30902, DY = 0.14878;
    var SIDE = ['797c82', '72757b', '6b6e74', '51545a', '53565c', '54575d', '56595f', '575a60', '585b61', '5a5d63', '5b5e64', '5c5f65',
      '5d6066', '5e6167', '5f6268', '606369', '61646a', '61646a', '62656b', '62656b', '63666c', '63666c', '63666c', '63666c', '63666c',
      '63666c', '63666c', '62656b', '62656b', '61646a', '61646a', '606369', '5f6268', '5e6167', '5d6066', '5c5f65', '5b5e64', '5a5d63',
      '585b61', '575a60', '56595f', '54575d', '53565c', '82858b', '797c82', '707379', '676a70'];
    var html = '';
    function layer(x, y, w, h, z, css, origin) {
      html += '<i style="left:' + x.toFixed(2) + 'px;top:' + y.toFixed(2) + 'px;width:' + w + 'px;height:' + h + 'px;' +
        'transform:translateZ(' + z.toFixed(2) + 'px)' + POSE + ';' + (origin ? 'transform-origin:' + origin + ';' : '') + css + '"></i>';
    }
    /* back to front: rear glass, seam, bevels and sidewalls, then the buttons and bands that sit on the side */
    layer(89.33, 75.14, 401, 844, -45.09, 'background:#25272b;border-radius:57px;box-shadow:inset 0 0 0 1.2px #767b86,5px 14px 28px rgba(0,0,0,.28)');
    layer(86.87, 72.92, 405, 848, -43.68, 'border-radius:59px;box-shadow:inset 0 0 0 .9px #878c95');
    for (var k = SIDE.length; k >= 1; k--) layer(72.81 + DX * (k - 1), 66.15 + DY * (k - 1), 405, 848, -DZ * k, 'background:#' + SIDE[k - 1] + ';border-radius:59px');
    for (k = 34; k >= 16; k--) layer(480.44 + DX * (k - 16), 292.38 + DY * (k - 16), 5, 88, -DZ * k, 'background:#' + (k === 16 ? '959aa5' : '595e69') + ';border-radius:2px', '-200.5px 200px');
    for (k = 39; k >= 8; k--) {
      layer(477.97 + DX * (k - 8), 165.19 + DY * (k - 8), 2.4, 5, -DZ * k, 'background:#292b30', '-200.5px 326px');
      layer(477.97 + DX * (k - 8), 811.19 + DY * (k - 8), 2.4, 5, -DZ * k, 'background:#292b30', '-200.5px -320px');
    }
    scene.insertAdjacentHTML('afterbegin', html);
  })();

  /* Final CTA phone (Figma 117:5169): the BTC chart screen runs live. A seeded random walk ticks the price every 200ms;
     the last 15m candle grows with it and a new candle opens every 2.5s, when the chart (candles, volumes, time grid)
     slides one slot left (300ms, out easing). The header price, change, mark price, the chart's ticker line, the
     dotted last-price line and its tag all follow the same number. The scale and every position match the PNG
     (465 x 908 px space): 500 USD per 51px with 76,000 at y 392, candle slots 5.58px (12 per 3h grid column of 67px).
     Runs only while the phone is on screen; reduced motion draws the opening frame, still.
     Every .fin-live canvas gets its own copy: candidate 1 (flat phone) and candidate 2 (the tilted phone, Figma 120:7090,
     where the canvas sits inside the 3D-posed device). */
  [].forEach.call(document.querySelectorAll('.fin-live'), function (cv) {
    var g = cv.getContext('2d'), X0 = 45, Y0 = 168, SW = 375, SH = 632;
    var GREEN = 'rgb(17,236,138)', RED = 'rgb(255,75,78)', GRID = 'rgb(26,26,26)', MUTED = 'rgb(144,144,144)';
    var FONT = getComputedStyle(document.body).fontFamily;
    var S = 5.58, XL = 297, BODY = 3, TOP = 76000, PX = 51 / 500, YT = 392, VB = 776, OPEN24 = 74827;
    var TICK = 200, BAR = 2500, SLIDE = 300;
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var yOf = function (p) { return YT + (TOP - p) * PX; };
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    /* opening history (the picture's shape): calm near 75,850, a sharp sell-off to ~73,450, then a climb back to 74,928 */
    var bars = [], N = 46, t0min = 13 * 60 - (N - 1) * 15, p = 75880;
    for (var i = 0; i < N; i++) {
      /* after the drop the climb is choppy: a slow drift up with swings of a few hundred dollars */
      var target = i < 17 ? 75880 - i * 12 : i === 17 ? 73700 : 74050 + (i - 18) * 32 + Math.sin(i * 1.3) * 260 + Math.sin(i * 0.47) * 180;
      var o = p, c = target + (rnd() - 0.5) * (i < 17 ? 140 : 320);
      if (i === 45) c = 74928;
      var h = Math.max(o, c) + rnd() * 60, l = Math.min(o, c) - rnd() * 60;
      if (i === 17) { o = 75620; l = 73420; }
      bars.push({ t: t0min + i * 15, o: o, h: h, l: l, c: c, v: i === 17 ? 6800 : i === 18 ? 2600 : 300 + rnd() * 900 });
      p = c;
    }
    var price = 74928, vel = 0, mark = 74930, slideFrom = 0, slideT = -1e9, lastTick = 0, lastBar = 0, raf = null, clock = 0, prevTs = 0;

    function tick() {
      /* mean-reverting walk around 74,900 with a little momentum, so it drifts and pulls back like a real tape */
      vel = vel * 0.6 + (rnd() - 0.5) * 26 + (74900 - price) * 0.004;
      price = Math.max(73600, Math.min(75900, price + vel));
      var b = bars[bars.length - 1];
      b.c = price; b.h = Math.max(b.h, price); b.l = Math.min(b.l, price); b.v += 20 + rnd() * 70;
      mark = price + (rnd() - 0.5) * 6;
    }
    function newBar() {
      var b = bars[bars.length - 1];
      bars.push({ t: b.t + 15, o: b.c, h: b.c, l: b.c, c: b.c, v: 40 + rnd() * 120 });
      if (bars.length > 70) bars.shift();
      slideFrom = S; slideT = clock;
    }
    function text(str, x, y, size, weight, color, align) {
      g.font = weight + ' ' + size + 'px ' + FONT; g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
      g.fillText(str, x, y);
    }
    function draw() {
      var k = cv.width / SW;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
      var up = price >= OPEN24, col = up ? GREEN : RED, chg = price - OPEN24, pct = chg / OPEN24 * 100;
      var sgn = function (n) { return (n >= 0 ? '+' : '−'); };

      /* header: price, change, mark price, stats */
      g.fillStyle = '#000'; g.fillRect(X0, 172, SW, 92);
      text(fmt(price), 65, 207, 30.5, 700, col);
      text(sgn(pct) + Math.abs(pct).toFixed(2) + '%', 65, 230, 12, 500, col);
      text('Mark Price', 66, 255, 11.5, 400, MUTED);
      g.font = '400 11.5px ' + FONT; var mw = g.measureText('Mark Price ').width;
      text(fmt(mark), 66 + mw, 255, 11.5, 500, '#fafafa');
      text('24H Volume', 233, 187, 12.5, 400, MUTED); text('$2.2B', 399, 189, 14.5, 600, '#fafafa', 'right');
      text('Open Interest', 233, 211, 12.5, 400, MUTED); text('$3.1B', 399, 213, 14.5, 600, '#fafafa', 'right');
      text('Funding', 233, 235, 12.5, 400, MUTED); text('0.0013%', 399, 237, 14.5, 600, '#fafafa', 'right');

      /* chart panel */
      g.fillStyle = '#000'; g.fillRect(X0, 312, SW, 488);
      var e = clock - slideT, sh = e < SLIDE ? slideFrom * (1 - (1 - Math.pow(1 - e / SLIDE, 3))) : 0;  /* slide-in offset */
      var last = bars[bars.length - 1], xOf = function (t) { return XL + (t - last.t) / 15 * S + sh; };
      g.save(); g.beginPath(); g.rect(X0, 312, SW, 488); g.clip();
      g.strokeStyle = GRID; g.lineWidth = 1;
      for (var y = YT; y < 660; y += 51) { g.beginPath(); g.moveTo(X0, Math.round(y) + 0.5); g.lineTo(X0 + SW, Math.round(y) + 0.5); g.stroke(); }
      var first3h = Math.floor((last.t - 600) / 180) * 180;
      for (var tm = first3h; tm < last.t + 400; tm += 180) {
        var gx = Math.round(xOf(tm)) + 0.5;
        if (gx < X0 || gx > 352) continue;
        g.beginPath(); g.moveTo(gx, 312); g.lineTo(gx, 776); g.stroke();
        var hh = ((tm / 60) % 24 + 24) % 24;
        text((hh < 10 ? '0' : '') + hh + ':00', gx, 790, 11.5, 400, MUTED, 'center');
      }
      g.restore();
      g.save(); g.beginPath(); g.rect(X0, 312, 352 - X0, 488); g.clip();
      bars.forEach(function (b) {
        var x = xOf(b.t), bc = b.c >= b.o ? GREEN : RED;
        if (x < X0 - 4) return;
        g.fillStyle = bc;
        g.fillRect(Math.round(x) , yOf(b.h), 1, Math.max(1, yOf(b.l) - yOf(b.h)));
        var yt = yOf(Math.max(b.o, b.c)), hb = Math.max(1, Math.abs(yOf(b.o) - yOf(b.c)));
        g.fillRect(Math.round(x) - 1, yt, BODY, hb);
        var vh = Math.min(68, b.v / 4000 * 36);
        g.fillRect(Math.round(x) - 1, VB - vh, BODY, vh);
      });
      g.restore();
      /* price scale, last-price line and tag */
      for (var q = 0; q < 6; q++) text(fmt(TOP - q * 500), 406, YT + q * 51 + 5, 12, 400, MUTED, 'right');
      text('4 K', 406, 745, 12, 400, MUTED, 'right');
      var ly = Math.round(yOf(price)) + 0.5;
      g.strokeStyle = col; g.globalAlpha = 0.7; g.setLineDash([1.5, 2.5]); g.beginPath(); g.moveTo(X0, ly); g.lineTo(358, ly); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
      g.fillStyle = col; g.fillRect(359, ly - 10, 48, 20);
      text(fmt(price), 383, ly + 4.5, 12, 700, '#000', 'center');
      /* ticker line, volume SMA label and the collapse caret */
      var line = fmt(price) + ' ' + sgn(chg) + fmt(Math.abs(chg)) + ' (' + sgn(pct) + Math.abs(pct).toFixed(2) + '%)';
      text(line, 53, 330, 12, 500, col);
      text('Volume SMA', 53, 354, 12, 500, MUTED);
      g.fillStyle = 'rgb(28,28,28)'; g.beginPath(); g.roundRect ? g.roundRect(53, 363, 22, 14, 4) : g.rect(53, 363, 22, 14); g.fill();
      g.strokeStyle = '#d0d0d0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(60, 372); g.lineTo(64, 368); g.lineTo(68, 372); g.stroke();
    }
    function size() {
      /* layout size (not the projected box), so the tilted copy keeps full resolution */
      var w = cv.offsetWidth, h = cv.offsetHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      draw();
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (prevTs) clock += Math.min(100, ts - prevTs); prevTs = ts;
      while (clock - lastTick >= TICK) { lastTick += TICK; tick(); }
      if (clock - lastBar >= BAR) { lastBar += BAR; newBar(); }
      draw();
    }
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    size();
    if (noMotion || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !raf) { prevTs = 0; raf = requestAnimationFrame(loop); }
      else if (!es[0].isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
    }).observe(cv);
  });

  /* Final CTA candidate 4 (Figma 118:24391): the desktop trading screen runs live. One canvas over the 1920 x 1128
     picture repaints, in the picture's own pixel space, everything that moves on a real terminal:
       - the ticker row (each name drifts; BTC follows the live price), the market header (mark, oracle, 24h change,
         24h volume, open interest, funding countdown), the chart's footer clock (UTC+9, ticking each second)
       - the weekly BTC chart: candles, volume, OHLC legend, dotted last-price line and tag, date labels and grid,
         on the picture's scale (130,000 at y 315, 40.3px per 10,000; one week per 5.32px, a half-year per grid column);
         the chart runs fast-forward like candidate 1: the live candle builds a full week's swing over 2.5s, then a
         new week opens and the chart (candles, volume, grid, date labels) slides one slot left (300ms, out easing)
       - the order book: ten asks and nine bids around the price with flickering sizes, cumulative totals and depth
         bars, the mid price (green or red with the last tick) and the mark price
     A seeded walk ticks every 200ms. Runs only while it is on screen; reduced motion draws the opening frame. */
  (function () {
    var box = document.querySelector('.fin-web');
    if (!box) return;
    var cv = box.querySelector('.fw-live'), g = cv.getContext('2d'), W = 1920, H = 1128;
    var GREEN = 'rgb(17,236,138)', RED = 'rgb(255,75,78)', GREY = 'rgb(144,144,144)', LIGHT = 'rgb(176,176,176)', WHITE = 'rgb(250,250,250)';
    var GRID = 'rgb(22,22,22)', ASKBG = 'rgb(46,14,14)', BIDBG = 'rgb(2,28,17)', VUP = 'rgb(8,118,69)', VDN = 'rgb(128,38,39)';
    var FONT = getComputedStyle(document.body).fontFamily;
    var seed = 11, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var fmt = function (n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
    var sgn = function (n) { return n >= 0 ? '+' : '-'; };
    function text(str, x, y, size, weight, color, align) {
      g.font = (weight || 400) + ' ' + size + 'px ' + FONT; g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'middle';
      g.fillText(str, x, y); return g.measureText(str).width;
    }
    /* chart geometry (picture pixels) */
    var PX0 = 110, PX1 = 1228, PY0 = 296, PY1 = 712, S = 138.4 / 26, X2023 = 160.5, VB = 703;
    var yOf = function (p) { return 315 + (130000 - p) / 10000 * 40.3; };
    /* weekly history traced from the picture: [week, close] key points (week 0 = first week of 2023) */
    var KEY = [[-9, 43400], [0, 45000], [13, 50800], [26, 51500], [36, 49800], [42, 57800], [49, 61500], [53, 65200], [57, 83800],
      [67, 82600], [77, 75100], [83, 77500], [90, 99800], [95, 107500], [100, 113600], [105, 97500], [113, 102400], [119, 114700],
      [127, 122200], [131, 118500], [135, 124700], [139, 108800], [142, 97500], [148, 102400], [151, 87500], [154, 80100],
      [158, 84400], [164, 91900], [170, 78400], [178, 80900], [181, 91200], [185, 93500], [189, 81886]];
    var bars = [], WK0 = -9, WKL = 189, prev = 43000;
    for (var w = WK0; w <= WKL; w++) {
      var k = 1; while (KEY[k][0] < w) k++;
      var a = KEY[k - 1], b = KEY[k], f = (w - a[0]) / Math.max(1, b[0] - a[0]);
      var c = a[1] + (b[1] - a[1]) * f + (w === WKL ? 0 : (rnd() - 0.5) * a[1] * 0.045);
      var o = prev, hi = Math.max(o, c) * (1 + rnd() * 0.018), lo = Math.min(o, c) * (1 - rnd() * 0.018);
      var big = Math.abs(c - o) / o;
      bars.push({ w: w, o: o, h: hi, l: lo, c: c, v: 15 + rnd() * 25 + big * 900 + (w > 120 ? 20 : 0) });
      prev = c;
    }
    var last = bars[bars.length - 1]; last.o = 86500; last.h = 88900; last.l = 79800; last.c = 81886; last.v = 70;
    /* market state */
    var price = 81886, vel = 0, dir = -1, OPEN24 = 82484, vol24 = 2981386093.89, oi = 3575752134.93;
    var tick = [ ['BTC', 0, 0, 1], ['ETH', -107.2, 1939.8, 1], ['HYPE', 0.80, 71.98, 2], ['ZEC', -35.13, 949.2, 1], ['XYZ100', 155.0, 28221, 0],
      ['NVDA', 5.16, 188.40, 2], ['SOL', -6.21, 148.27, 2], ['AAPL', 1.02, 262.55, 2], ['TSLA', -8.44, 365.10, 2] ];
    var TX = [97, 316, 519, 729, 922, 1147, 1350, 1544, 1751];
    tick.forEach(function (t) { t.push(t[2] - t[1]); });                        /* [name, chg, last, decimals, prevClose] */
    var asks = [], bids = [];
    for (var i = 0; i < 10; i++) asks.push(0.2 + rnd() * 6); for (i = 0; i < 9; i++) bids.push(0.1 + rnd() * 2);
    var TICK = 200, BAR = 2500, SLIDE = 300, clock = 0, lastTick = 0, lastBar = 0, slideT = -1e9, raf = null, prevTs = 0, target = 81900;
    function newBar() {
      target = Math.max(68000, Math.min(104000, target + (rnd() - 0.5) * 9000));
      bars.push({ w: last.w + 1, o: last.c, h: last.c, l: last.c, c: last.c, v: 12 + rnd() * 20 });
      last = bars[bars.length - 1]; if (bars.length > 260) bars.shift();
      OPEN24 = OPEN24 * 0.85 + last.o * 0.15;                                  /* the 24h reference follows the market */
      slideT = clock;
    }
    var T0 = 11 * 3600 + 41 * 60 + 40, FUND = 58 * 60 + 14;

    function step() {
      /* weekly scale: swings of a few hundred dollars a tick, drifting toward a target that wanders week to week */
      vel = vel * 0.7 + (rnd() - 0.5) * 380 + (target - price) * 0.012;
      var np = Math.max(62000, Math.min(112000, price + vel));
      dir = np > price ? 1 : np < price ? -1 : dir; price = np;
      last.c = price; last.h = Math.max(last.h, price); last.l = Math.min(last.l, price); last.v = Math.min(79, last.v + rnd() * 4);
      vol24 += 5000 + rnd() * 90000; oi += (rnd() - 0.5) * 400000;
      for (var j = 1; j < tick.length; j++) if (rnd() < 0.35) { var t = tick[j]; t[2] *= 1 + (rnd() - 0.5) * 0.0012; t[1] = t[2] - t[4]; }
      for (j = 0; j < 4; j++) { asks[Math.floor(rnd() * 10)] = 0.05 + rnd() * (rnd() < 0.15 ? 12 : 5); bids[Math.floor(rnd() * 9)] = 0.05 + rnd() * (rnd() < 0.15 ? 6 : 2); }
    }
    function hms(t) { t = ((t % 86400) + 86400) % 86400; var h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s2 = Math.floor(t) % 60;
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s2 < 10 ? '0' : '') + s2; }

    function draw() {
      var k = cv.width / W;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(k, 0, 0, k, 0, 0);
      var chg = price - OPEN24, pct = chg / OPEN24 * 100, col = chg >= 0 ? GREEN : RED, sec = clock / 1000;

      /* ticker row */
      g.fillStyle = '#000'; g.fillRect(88, 58, W - 88, 28);
      var bt = tick[0]; bt[2] = price; bt[4] = 86527; bt[1] = price - bt[4];
      tick.forEach(function (t, j) {
        var x = TX[j], c2 = t[1] >= 0 ? GREEN : RED, d = t[3];
        x += text(t[0], x, 73, 12.5, 400, LIGHT) + 14;
        x += text(sgn(t[1]) + fmt(Math.abs(t[1]), d === 0 ? 1 : d) + ' / ' + sgn(t[1]) + Math.abs(t[1] / t[4] * 100).toFixed(2) + '%', x, 73, 12.5, 500, c2) + 10;
        text(fmt(t[2], d), x, 73, 12.5, 400, LIGHT);
      });

      /* market header */
      g.fillStyle = '#000'; g.fillRect(228, 126, 740, 26);
      text(fmt(price), 235, 138, 15, 500, dir >= 0 ? GREEN : RED);
      text(fmt(price - 2), 311, 138, 15, 500, WHITE);
      var cx = 387 + text(sgn(chg) + fmt(Math.abs(chg)), 387, 138, 15, 500, col);
      cx += text(' / ', cx, 138, 15, 500, GREY);
      text(sgn(chg) + Math.abs(pct).toFixed(2) + '%', cx, 138, 15, 500, col);
      text('$' + fmt(vol24, 2), 512, 138, 15, 500, WHITE);
      text('$' + fmt(oi, 2), 670, 138, 15, 500, WHITE);
      var fund = hms(FUND - sec);
      cx = 825 + text('0.0013%', 825, 138, 15, 500, GREEN); cx += text(' / ', cx, 138, 15, 500, GREY); text(fund, cx, 138, 15, 500, WHITE);

      /* chart */
      g.fillStyle = '#000'; g.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0); g.fillRect(PX1 + 1, PY0, 64, 440); g.fillRect(PX0, PY1, PX1 - PX0, 24);
      var e = clock - slideT, sh = e < SLIDE ? S * Math.pow(1 - e / SLIDE, 3) : 0;
      var xOf = function (wk) { return X2023 + (wk - (last.w - WKL)) * S + sh; };   /* the live week always sits at x 1166 */
      g.save(); g.beginPath(); g.rect(PX0, PY0, PX1 - PX0, PY1 - PY0 + 24); g.clip();
      g.fillStyle = GRID;
      for (var y = 311.5; y < 705; y += 32.65) g.fillRect(PX0, Math.round(y), PX1 - PX0, 1);
      var firstHalf = Math.floor((last.w - 230) / 26) * 26;
      for (var hw = firstHalf; hw <= last.w + 26; hw += 26) {
        var gx = Math.round(xOf(hw));
        if (gx < PX0 || gx > PX1) continue;
        g.fillStyle = GRID; g.fillRect(gx, PY0, 1, PY1 - PY0);
        var yr = 2023 + Math.floor(hw / 52), lbl = (((hw % 52) + 52) % 52) === 0 ? String(yr) : 'Jul';
        text(lbl, gx, 724, 12.5, 400, GREY, 'center');
      }
      g.restore();
      g.save(); g.beginPath(); g.rect(PX0, PY0, PX1 - PX0, PY1 - PY0); g.clip();
      bars.forEach(function (b) {
        var x = Math.round(xOf(b.w)); if (x < PX0 - 6 || x > PX1) return;
        var up = b.c >= b.o, vh = Math.min(80, b.v);
        g.fillStyle = up ? VUP : VDN; g.fillRect(x - 1, VB - vh, 3, vh);
        g.fillStyle = up ? GREEN : RED;
        g.fillRect(x, yOf(b.h), 1, Math.max(1, yOf(b.l) - yOf(b.h)));
        g.fillRect(x - 1, yOf(Math.max(b.o, b.c)), 3, Math.max(1, Math.abs(yOf(b.o) - yOf(b.c))));
      });
      var lc = last.c >= last.o ? GREEN : RED;                                  /* the tag follows the weekly candle's colour */
      var ly = Math.round(yOf(price)) + 0.5;
      g.strokeStyle = lc; g.globalAlpha = 0.6; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(PX0, ly); g.lineTo(PX1, ly); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      g.restore();
      for (var q = 0; q <= 10; q++) text(fmt(130000 - q * 10000), 1236, 315 + q * 40.3, 12.5, 400, GREY);
      g.fillStyle = lc; g.fillRect(1232, ly - 9.5, 48, 19); text(fmt(price), 1256, ly, 12.5, 500, '#fff', 'center');
      /* OHLC legend */
      var lx = 122, vc = last.c >= last.o ? GREEN : RED, d2 = last.c - last.o;
      [['O', last.o], ['H', last.h], ['L', last.l], ['C', last.c]].forEach(function (it) {
        lx += text(it[0], lx, 312, 12.5, 400, GREY) + 4; lx += text(fmt(it[1]), lx, 312, 12.5, 400, vc) + 8;
      });
      lx += text(sgn(d2) + fmt(Math.abs(d2)) + ' (' + sgn(d2) + Math.abs(d2 / last.o * 100).toFixed(2) + '%)', lx, 312, 12.5, 400, vc) + 8;
      lx += text('Vol', lx, 312, 12.5, 400, GREY) + 4; text(fmt(last.v * 1.87, 3) + ' K', lx, 312, 12.5, 400, vc);
      lx = 122 + text('Volume SMA', 122, 336, 12.5, 400, GREY) + 4; text('130.913 K', lx, 336, 12.5, 400, RED);
      g.fillStyle = 'rgb(28,28,28)'; g.fillRect(122, 350, 23, 15);
      g.strokeStyle = '#bbb'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(129, 360); g.lineTo(133.5, 355.5); g.lineTo(138, 360); g.stroke();
      /* footer clock */
      g.fillStyle = '#000'; g.fillRect(1040, 744, 116, 22); text(hms(T0 + sec) + ' (UTC+9)', 1150, 754, 13.5, 400, GREY, 'right');

      /* order book */
      g.fillStyle = '#000'; g.fillRect(1302, 368, 264, 22); g.fillRect(1302, 425, 264, 655);
      cx = 1310 + text('0.0013%', 1310, 380, 12.5, 500, WHITE); cx += text(' / ', cx, 380, 12.5, 500, GREY); text(fund, cx, 380, 12.5, 500, WHITE);
      var base = Math.round(price), tot = [], run = 0, ROW = 31.7, MAXW = 264, maxT;
      for (i = 9; i >= 0; i--) { run += asks[i]; tot[i] = run; }
      var btot = [], brun = 0; for (i = 0; i < 9; i++) { brun += bids[i]; btot[i] = brun; }
      maxT = Math.max(tot[0], btot[8]);
      for (i = 0; i < 10; i++) {
        var ry = 442 + i * ROW;
        g.fillStyle = ASKBG; g.fillRect(1302, ry - ROW / 2, Math.max(2, tot[i] / maxT * MAXW), ROW);
        text(fmt(base + 10 - i), 1311, ry, 12.5, 400, RED);
        text(fmt(asks[i], 5), 1474, ry, 12.5, 400, GREY, 'right');
        text(fmt(tot[i], 5), 1557, ry, 12.5, 400, GREY, 'right');
      }
      text(fmt(base), 1310, 764, 16, 500, dir >= 0 ? GREEN : RED);
      cx = 1311 + text('Mark Price ', 1311, 786, 12.5, 400, GREY); text(fmt(price + 1), cx, 786, 13.5, 600, WHITE);
      g.save(); g.beginPath(); g.rect(1302, 803, 264, 277); g.clip();
      for (i = 0; i < 9; i++) {
        ry = 819 + i * ROW;
        g.fillStyle = BIDBG; g.fillRect(1302, ry - ROW / 2, Math.max(2, btot[i] / maxT * MAXW), ROW);
        text(fmt(base - 1 - i), 1311, ry, 12.5, 400, GREEN);
        text(fmt(bids[i], 5), 1474, ry, 12.5, 400, GREY, 'right');
        text(fmt(btot[i], 5), 1557, ry, 12.5, 400, GREY, 'right');
      }
      g.restore();
    }
    function size() {
      var w = box.clientWidth; if (!w) return;
      box.style.setProperty('--s', (w / W).toFixed(5));
      var dpr = Math.min(2, window.devicePixelRatio || 1), r = Math.min(1.5, w / W * dpr * 1.1);
      cv.width = Math.round(W * r); cv.height = Math.round(H * r);
      draw();
    }
    /* the screen only changes on a tick (every 200ms) and while a new week slides in (300ms), so it is redrawn then and
       nowhere else: about 5 redraws a second instead of one per display frame; the slide itself is capped at 60fps */
    var lastDraw = 0;
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (prevTs) clock += Math.min(100, ts - prevTs); prevTs = ts;
      var dirty = false;
      while (clock - lastTick >= TICK) { lastTick += TICK; step(); dirty = true; }
      if (clock - lastBar >= BAR) { lastBar += BAR; newBar(); dirty = true; }
      if (clock - slideT < SLIDE + 20 && ts - lastDraw >= 16) dirty = true;
      if (dirty) { lastDraw = ts; draw(); }
    }
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    size();
    if (noMotion || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !raf) { prevTs = 0; raf = requestAnimationFrame(loop); }
      else if (!es[0].isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
    }).observe(box);
  })();

  /* Section reveal (Creators, Compare): once half the section is on screen (or as much as a short screen can show),
     the items appear one after another (scale and opacity 0 -> 1, out easing, a beat shared among them), then on the
     next beat the title block plays the same, its lines 80ms apart, with any note under the items. Once. */
  function reveal(sec, items, heads, extra, titleFirst) {
    if (!sec || noMotion || !('IntersectionObserver' in window)) return;
    /* default: items first, title on the next beat (1s). titleFirst: title first, the items a beat later (0.5s) */
    var gap = Math.round(500 / Math.max(1, items.length)), tItems = titleFirst ? 500 : 0, tHead = titleFirst ? 0 : 1000;
    items.forEach(function (el, k) { el.classList.add('rv-item'); el.style.setProperty('--d', (tItems + k * gap) + 'ms'); });
    heads.forEach(function (el, k) { el.classList.add('rv-head'); el.style.setProperty('--d', (tHead + k * 80) + 'ms'); });
    extra.forEach(function (el) { el.classList.add('rv-head'); el.style.setProperty('--d', tHead + 'ms'); });
    sec.classList.add('rv-pre');
    var need = function () { return Math.min(0.5, 0.9 * window.innerHeight / Math.max(1, sec.offsetHeight)); };
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || es[0].intersectionRatio < need()) return;
      io.disconnect(); requestAnimationFrame(function () { sec.classList.add('rv-in'); });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] });
    io.observe(sec);
  }
  var cr = document.querySelector('section.creators'), cmp = document.getElementById('compare'), arr = function (l) { return [].slice.call(l || []); };
  if (cr) reveal(cr, arr(cr.querySelectorAll('.creator')), arr(cr.querySelectorAll('.sec-head > *')), arr(cr.querySelectorAll('.cr-note')));
  if (cmp) reveal(cmp, arr(cmp.querySelectorAll('.table-wrap tr')), arr(cmp.querySelectorAll('.sec-head > *')), [], true);   /* title, then the table */

  /* TradeView assembly (ohayo-motion: 0.5s beats, out easing, 400ms pieces): the title reveals, then a beat later the
     mock builds itself like UI components snapping together (times below are from the mock's start). Once.
       Every piece also comes in from a random depth: bigger and slightly blurred (settling down) or smaller (growing up).
       0-0.5s    the two panel shells rise 16px into place from a little further back (the detail panel 100ms later)
       0.5s      the filter chips pop in one by one (0.6 -> 1, 60ms apart); the header's name slides in from the left
                 and the Follow button from the right
       1-2s      the trader rows slot in from the left, 80ms apart; the chart draws left to right (1s, in-out)
       2s        the trade markers pop on the chart (0 -> 1, 80ms apart); trade step, title and arrows rise in
       2.5s      the two notes wipe in from the left, rule first, sliding 20px into place
       3-3.5s    the vote row and the comments rise in, 80ms apart; the sample note under the list fades in */
  (function () {
    var sec = document.getElementById('tradeview'), app = sec && sec.querySelector('.tv-app');
    if (!app || noMotion || !('IntersectionObserver' in window) || !app.animate) return;
    sec.classList.add('tv-pre');
    var O = 'cubic-bezier(0.2, 0.7, 0.2, 1)', IO2 = 'cubic-bezier(0.45, 0, 0.55, 1)';
    var anims = [], UI = 500, OFF = 0;                                  /* the title plays first; the mock starts a beat later */
    function play(el, kf, at, dur, ease) { if (el) anims.push(el.animate(kf, { duration: dur || 400, delay: OFF + at, easing: ease || O, fill: 'backwards' })); }
    /* depth: each piece starts either closer to the camera (scale 1.16, a little blurred, settling down onto the panel)
       or further back (scale 0.84, growing up into place), picked at random per piece from a fixed seed, so the
       assembly reads in 3D and plays the same every time */
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var depth = function () { return rnd() < 0.5 ? { s: 1.16, b: 4 } : { s: 0.84, b: 0 }; };
    var moveK = function (tr) {
      var d = depth();
      return [{ opacity: 0, transform: tr + ' scale(' + d.s + ')', filter: 'blur(' + d.b + 'px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }];
    };
    var rise = function (d) { return moveK('translateY(' + d + 'px)'); };
    var slide = function (d) { return moveK('translateX(' + d + 'px)'); };
    var popK = function (s0) { return [{ opacity: 0, transform: 'scale(' + s0 + ')' }, { opacity: 1, transform: 'none' }]; };
    var q = function (sel) { return [].slice.call(app.querySelectorAll(sel)); };
    var heads = [].slice.call(sec.querySelectorAll('.sec-head > *'));
    function build() {
      anims = []; seed = 7;                                             /* a fixed seed: the same depth mix every visit */
      /* title first, the same reveal as the other sections: scale and opacity 0 -> 1 from the left edge, 80ms apart */
      OFF = 0; heads.forEach(function (h, k) { h.style.transformOrigin = '0 50%'; play(h, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'none' }], k * 80); });
      OFF = UI;                                                          /* then the mock */
      play(app.querySelector('.tv-side'), [{ opacity: 0, transform: 'translateY(16px) scale(0.94)' }, { opacity: 1, transform: 'none' }], 0);   /* shells: from further back */
      play(app.querySelector('.tv-detail'), [{ opacity: 0, transform: 'translateY(16px) scale(0.94)' }, { opacity: 1, transform: 'none' }], 100);
      q('.tv-filter .chip').forEach(function (c, k) {                    /* chips: a stronger pop, from 1.3 down or 0.6 up */
        var big = rnd() < 0.5; play(c, [{ opacity: 0, transform: 'scale(' + (big ? 1.3 : 0.6) + ')', filter: 'blur(' + (big ? 4 : 0) + 'px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], 500 + k * 60);
      });
      var top = q('.tv-top > *'); play(top[0], slide(-24), 500); play(top[1], slide(24), 560);
      q('#tv-rows .tv-row').forEach(function (r, k) { play(r, slide(-32), 1000 + k * 80); });
      play(app.querySelector('.tv-svg'), [{ opacity: 1, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], 1000, 1000, IO2);
      q('.tv-svg .mk').forEach(function (m, k) { play(m, popK(0), 2000 + k * 80); });
      q('.tv-fill > *').forEach(function (f, k) { play(f, rise(12), 2000 + k * 80); });
      q('.tv-detail .why').forEach(function (w, k) {
        var d = depth();
        play(w, [{ opacity: 0, transform: 'translateX(-20px) scale(' + d.s + ')', filter: 'blur(' + d.b + 'px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)', clipPath: 'inset(0 0 0 0)' }], 2500 + k * 80);
      });
      q('.talk > *').forEach(function (t, k) { play(t, rise(12), 3000 + k * 80); });
      play(app.querySelector('.tv-side > .muted'), [{ opacity: 0 }, { opacity: 1 }], 3000);
      sec.classList.remove('tv-pre');                                   /* the animations hold the start state from here */
    }
    /* Plays once, when 50% of the section is on screen (or as much as a short screen can show): title + assembly ~4.4s */
    var started = false;
    var need = function () { return Math.min(0.5, 0.9 * window.innerHeight / Math.max(1, sec.offsetHeight)); };
    var io = new IntersectionObserver(function (es) {
      if (started || !es[0].isIntersecting || es[0].intersectionRatio < need()) return;
      started = true; io.disconnect(); build();
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] });
    io.observe(sec);
  })();

  /* Today's board strip: once scrolling carries it into the top 60% of the viewport it fades out, opacity 1 -> 0 as its top
     edge goes from 60% of the viewport height up to the top edge (smoothstep, tied to scroll position, so it reverses on
     the way back down). At 0 it stops taking clicks. */
  (function () {
    var strip = document.querySelector('.fold > .strip'), ticking = false;
    if (!strip) return;
    function update() {
      var zone = window.innerHeight * 0.6, x = strip.getBoundingClientRect().top / zone;
      x = x < 0 ? 0 : x > 1 ? 1 : x;
      var op = x * x * (3 - 2 * x);
      strip.style.opacity = op === 1 ? '' : op.toFixed(3);
      strip.style.visibility = op === 0 ? 'hidden' : '';
      ticking = false;
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    update();
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

  /* Mobile menu (<= 900px, where the header menu is hidden): the hamburger opens a full-screen menu built from
     whichever header menu the page shows (3type page links, or the 1/2type section buttons). Esc or the close button
     closes it; focus moves in and comes back to the hamburger. */
  (function () {
    var btn = document.querySelector('.menu-btn');
    if (!btn) return;
    var skip = document.body.classList.contains('hero-v3') ? 'v3-hide' : 'v3-only';   /* the menu this hero type shows */
    var nav = all('header.top nav.main').filter(function (n) { return !n.classList.contains(skip); })[0];
    if (!nav) { btn.hidden = true; return; }
    var m = document.createElement('div'); m.className = 'mnav'; m.id = 'mnav'; m.hidden = true;
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Menu');
    var logo = document.querySelector('header.top .wordmark');
    m.innerHTML = '<div class="mnav-top"></div><nav class="mnav-list" aria-label="Pages"></nav><div class="mnav-cta"><a class="btn btn-primary" href="https://app.ohayo.global" target="_blank" rel="noopener">Get the app</a></div>';
    if (logo) m.firstChild.appendChild(logo.cloneNode(true));
    var x = document.createElement('button'); x.type = 'button'; x.className = 'menu-btn'; x.setAttribute('aria-label', 'Close menu');
    x.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    m.firstChild.appendChild(x);
    var list = m.querySelector('.mnav-list');
    all('a, button', nav).forEach(function (src, k) {
      var c = src.cloneNode(true); c.style.setProperty('--k', k); c.removeAttribute('data-scroll');   /* scrolling goes through the original */
      if (src.tagName === 'BUTTON') c.addEventListener('click', function () { close(); src.click(); });   /* section scroll buttons */
      else c.addEventListener('click', function () { close(true); });
      list.appendChild(c);
    });
    document.body.appendChild(m);
    function open() {
      m.hidden = false; btn.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(function () { m.classList.add('is-open'); var f = list.querySelector('a, button'); if (f) f.focus({ preventScroll: true }); });
    }
    function close(leaving) {
      m.classList.remove('is-open'); m.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = '';
      if (!leaving) btn.focus({ preventScroll: true });
    }
    btn.addEventListener('click', open); x.addEventListener('click', function () { close(); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', function () { if (!m.hidden && window.innerWidth > 900) close(true); });
  })();

  /* Section scrolling */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  all('[data-scroll]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      /* 3type moves some sections to their own pages: go there instead (e.g. Today's board -> tournament.html) */
      if (el.hasAttribute('data-v3-href') && document.body.classList.contains('hero-v3')) { location.assign(el.getAttribute('data-v3-href')); return; }
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
  if ($('live-cards')) {   /* the full Tournament section: landing (1/2type) and tournament.html */
    $('live-cards').innerHTML = liveHtml; $('soon-cards').innerHTML = soonHtml;
    $('live-n').textContent = liveN; $('soon-n').textContent = soonN;
  }

  /* Card strips (.carousel): fade a side into black only while there are more cards beyond it (the phone tier
     masks with --fl / --fr; wider screens ignore them) */
  all('.carousel').forEach(function (car) {
    function edges() {
      var more = car.scrollWidth - car.clientWidth - car.scrollLeft;
      car.style.setProperty('--fl', car.scrollLeft > 4 ? '40px' : '0px');
      car.style.setProperty('--fr', more > 4 ? '72px' : '0px');
    }
    car.addEventListener('scroll', edges, { passive: true }); window.addEventListener('resize', edges); edges();
  });

  /* Tabs (the usual pattern for in-page tabs whose panels differ in height): switch the panel, then keep the reader
     at the top of the new content. If the tab row is not already near the top of the screen (just under the floating
     header, or within the top third), scroll so it sits there, smoothly (instant with reduced motion). The new panel
     fades in over 200ms so the swap reads as one step. */
  var tabBtns = all('.t-tab'), tabRow = document.querySelector('.t-tabs');
  tabBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      tabBtns.forEach(function (o) { o.setAttribute('aria-selected', o === b ? 'true' : 'false'); });
      var shown = null;
      ['find', 'joined', 'results'].forEach(function (k) { var pn = $('tp-' + k); pn.hidden = k !== b.getAttribute('data-tab'); if (!pn.hidden) shown = pn; });
      if (shown && !noMotion && shown.animate) shown.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      if (!tabRow) return;
      var top = tabRow.getBoundingClientRect().top, want = 88;           /* 76px floating header + 12px */
      if (top < want - 4 || top > window.innerHeight * 0.34) {
        window.scrollTo({ top: window.pageYOffset + top - want, behavior: noMotion ? 'auto' : 'smooth' });
      }
    });
  });

  /* Strip under the hero: same tournaments, written twice so the loop is seamless */
  var stripHtml = tours.map(function (t, i) {
    var cls = t.status === 'live' ? 's-live' : 's-soon';
    var lead = t.status === 'live' ? '● LIVE' : (t.status === 'soon' ? 'OPENS IN' : 'DEC 15');
    var tail = t.status === 'live' ? ' left' : '';
    return '<span><span class="' + cls + '">' + lead + '</span> ' + esc(t.name) + ' · ' + usd(t.pool) + ' <span class="s-time"><span data-clock="' + i + '">--:--:--</span>' + tail + '</span></span>';
  }).join('');
  if ($('strip-run')) $('strip-run').innerHTML = stripHtml + stripHtml;   /* the strip is on the landing only */

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
  if ($('g-btn')) $('g-btn').addEventListener('click', function () { gi = gi === gSteps.length - 1 ? 0 : gi + 1; paintGoal(); });

  /* 3type Tournament intro card ([data-p-live]; ohayo-motion): the live board keeps moving, driven by real time.
       Ends in    counts down once a second (data-p-clock = seconds left at load; wraps to 24h at zero).
       Players    +1 to +3 every 2-5s; the new number settles in (.p-bump, 400ms, out).
       Return %   every 1.5s each row eases (600ms, out) to a new value inside its own band. The bands never overlap,
                  so the ranks stay as shown: a rank change within seconds wouldn't be believable.
     Wakes only when something changes (a frame loop only while returns ease), stops off screen.
     Reduced motion: the clock still counts (it is information), players and returns stay still. */
  all('[data-p-live]').forEach(function (card) {
    var clk = card.querySelector('[data-p-clock]'), ply = card.querySelector('[data-p-players]');
    if (!clk || !ply) return;
    var BAND = [6, 3.5, 3.5, 6];                                    /* 206-218 · 192.5-199.5 · 184.5-191.5 · 135-147 */
    var rets = all('[data-p-ret]', card).map(function (el, k) {
      var b = Number(el.getAttribute('data-p-ret'));
      return { el: el, base: b, amp: BAND[k] || 3, from: b, to: b, t0: -1e9, shown: b };
    });
    var end = Date.now() + Number(clk.getAttribute('data-p-clock')) * 1000, players = Number(ply.textContent.replace(/,/g, ''));
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var out = function (x) { return 1 - Math.pow(1 - x, 3); };
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var on = false, raf = null, timer = null, nextP = 0, nextR = 0;
    function bump(el, text) { el.textContent = text; el.classList.remove('p-bump'); void el.offsetWidth; el.classList.add('p-bump'); }
    function step() {
      raf = timer = null;
      if (!on) return;
      var ts = performance.now(), now = Date.now();
      if (end - now <= 0) end += 24 * 3600 * 1000;
      var left = Math.ceil((end - now) / 1000);
      clk.textContent = p2(Math.floor(left / 3600)) + ':' + p2(Math.floor(left / 60) % 60) + ':' + p2(left % 60);
      if (!still) {
        if (ts >= nextP) {
          if (nextP) { players += 1 + Math.floor(Math.random() * 3); bump(ply, players.toLocaleString('en-US')); }
          nextP = ts + 2000 + Math.random() * 3000;
        }
        if (ts >= nextR) {
          rets.forEach(function (r) { r.from = r.shown; r.to = r.base + (Math.random() * 2 - 1) * r.amp; r.t0 = ts; });
          nextR = ts + 1500;
        }
        rets.forEach(function (r) {
          r.shown = r.from + (r.to - r.from) * out(Math.min(1, (ts - r.t0) / 600));
          var s = '+' + Math.round(r.shown) + '%';
          if (r.el.textContent !== s) r.el.textContent = s;
        });
      }
      var easing = !still && rets.some(function (r) { return ts - r.t0 < 600; });
      if (easing) { raf = requestAnimationFrame(step); return; }
      var wait = ((end - Date.now()) % 1000) + 5;                  /* until the countdown's next whole second */
      if (!still) wait = Math.min(wait, nextP - ts, nextR - ts);
      timer = setTimeout(step, Math.max(16, wait));
    }
    function run(v) {
      on = v;
      if (!v) { if (raf) cancelAnimationFrame(raf); if (timer) clearTimeout(timer); raf = timer = null; return; }
      if (!raf && !timer) step();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { run(es[0].isIntersecting); }).observe(card);
    } else run(true);
  });

  /* Tournament page hero facts ([data-tf]). After a reference the designer chose (a kinetic-type reel: one word per
     beat, hard cuts, the frame flipping black/white): the user asked for cuts and inversion here, which overrides
     ohayo-motion's "transform, don't cut" for this piece only. The dot style stays: every line is set in dots on a
     6px grid aligned to the dot-wave's 24px one.
     Per fact, on a 0.5s beat (time-driven from one clock):
       beat 0      the small lead line cuts in on the dark band ("No", "Ranked 3 ways:", ...)
       beat 1..n   each punch cuts in big under it, and the band inverts on every punch (white, dark, white...);
                   "profit | return | volume" replace one another
       data-type   the punch is typed instead, one letter per 60ms (like "repea" -> "repeat.")
       hold        3 beats on the last state, dots still breathing with the background wave
     After the 4th fact the stage empties and the headline (data-tf-head) cuts in chunk by chunk on the beat, the
     section inverting on each chunk, holds 4 beats, then hides again for fact 1. The whole section inverts (the
     canvas covers it; .tf-inv flips the headline), the floating header excepted.
     Between facts: a cut to the next fact's lead on the dark band. Every line enters with a 160ms dot smear from the right
     (out easing), like the reel's motion blur. When the band is white it carries the dot-wave inverted (same grid,
     speed and wavelength), so the field reads as one surface flipping, not a white box laid on it.
     About 11.5s a loop. Inversions never exceed two a second (photosensitivity limit is three). Runs only on
     screen: 60fps around a cut or while typing, 30fps at rest. Reduced motion: the four facts as a plain list. */
  all('[data-tf]').forEach(function (list) {
    var stage = list.parentNode, sec = stage.closest('section'), cv = sec && sec.querySelector('.tf-canvas');
    var num = sec && sec.querySelector('[data-tf-n]'), head = sec && sec.querySelector('[data-tf-head]');
    if (!cv || !sec || noMotion) return;
    /* the headline as beat chunks: the text stays the same for readers, only wrapped */
    var chunks = head ? head.getAttribute('data-tf-head').split('|') : [], words = [];
    if (head) {
      head.textContent = '';
      chunks.forEach(function (c, k) {
        var sp = document.createElement('span'); sp.className = 'tf-w'; sp.textContent = c; head.appendChild(sp); words.push(sp);
        if (k < chunks.length - 1) head.appendChild(document.createTextNode(' '));
      });
    }
    var facts = all('li', list).map(function (li) {
      return { lead: li.getAttribute('data-lead'), punch: li.getAttribute('data-punch').split('|'), type: li.hasAttribute('data-type'),
               layout: li.getAttribute('data-layout') || 'stack', bigFirst: li.hasAttribute('data-big-first') };
    });
    var g = cv.getContext('2d'), P = 6, B = 500, HOLDB = 3, HEADHOLD = 4, SMEAR = 160, TYPE = 60;
    var V = 60, K = 2 * Math.PI / 520;
    var W = 0, H = 0, dpr = 1, cols = 0, rows = 0, x0 = 0, y0 = 0, secDx = 0, secDy = 0, tx = 0, tw = 0, sTop = 0, sH = 0;
    var out = function (x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return 1 - Math.pow(1 - x, 3); };
    var font = function (px) { return '900 ' + px + 'px "Pretendard Variable", Pretendard, Inter, sans-serif'; };
    var off, o, timeline = [], LOOP = 0;
    /* coverage of some runs of text ({ s, px, x, y }: string, size, left, baseline), per grid cell */
    function mask(runs) {
      o.clearRect(0, 0, W, H); o.fillStyle = '#fff'; o.textBaseline = 'alphabetic';
      runs.forEach(function (r) { if (r.s) { o.font = font(r.px); o.fillText(r.s, r.x, r.y); } });
      var d = o.getImageData(0, 0, W, H).data, cov = new Float32Array(cols * rows);
      for (var r = 0; r < rows; r++) {
        var cy = Math.round(y0 + r * P); if (cy < 1 || cy >= H - 1) continue;
        for (var c = 0; c < cols; c++) {
          var cx = Math.round(x0 + c * P); if (cx < 1 || cx >= W - 1) continue;
          var sum = 0;
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) sum += d[((cy + dy) * W + cx + dx) * 4 + 3];
          cov[r * cols + c] = sum / 9 / 255;
        }
      }
      return cov;
    }
    function layout() {
      var cr = cv.getBoundingClientRect(), sr = sec.getBoundingClientRect(), st = stage.getBoundingClientRect();
      W = Math.round(cr.width); H = Math.round(cr.height);
      if (!W || !H) return false;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      secDx = cr.left - sr.left; secDy = cr.top - sr.top;
      tx = Math.round(st.left - cr.left); tw = Math.round(st.width);   /* text starts at the content column */
      sTop = st.top - cr.top; sH = st.height;                         /* facts sit in the stage, inside the section canvas */
      var bgOx = (sec.clientWidth % 24) / 2 + 12, bgOy = (sec.clientHeight % 24) / 2 + 12;
      x0 = ((bgOx - secDx) % P + P) % P; y0 = ((bgOy - secDy) % P + P) % P;
      cols = Math.floor((W - x0) / P) + 1; rows = Math.floor((H - y0) / P) + 1;
      off = document.createElement('canvas'); off.width = W; off.height = H; o = off.getContext('2d', { willReadFrequently: true });
      var m = document.createElement('canvas').getContext('2d');      /* measuring only; mask() changes o.font */
      /* states on the beat. Layouts after the Figma storyboard (75:10785, a 1440 x 1020 frame, weight 900):
           line   "No entry fee"              one line, 166px, centred on the content column
           stack  "Ranked 3 ways:" / "profit"  66px over 166px, left
           two    "Join late," / "count ..."   two lines of 120px, left (big-first: "5" at 160px)
         Every block's last baseline sits on one line, 70% down the section (the storyboard's ~690 of 1020 under a
         65px header); sizes scale with the column (1080 = 100%) and shrink if a short screen can't hold them. */
      timeline = []; var t = 0;
      var w = function (str, px) { m.font = font(px); return m.measureText(str).width; };
      var anchor = Math.max(sTop + 60, Math.min(sTop + sH - 24, H * 0.70));
      facts.forEach(function (f, fi) {
        var k = Math.min(1, tw / 1080), above = f.layout === 'line' ? 130 : 270;
        k = Math.min(k, (anchor - sTop) / above);
        var Lr, punchRuns;
        if (f.layout === 'line') {
          var px = Math.round(166 * k), gap = w(f.lead + ' ', px), total = gap + w(f.punch[0], px);
          var x = Math.round(tx + (tw - total) / 2);
          Lr = [{ s: f.lead, px: px, x: x, y: anchor }];
          punchRuns = function (p) { return [{ s: p, px: px, x: x + gap, y: anchor }]; };
        } else if (f.layout === 'stack') {
          var sm = Math.round(66 * k), bg = Math.round(166 * k);
          Lr = [{ s: f.lead, px: sm, x: tx, y: anchor - bg * 1.22 }];
          punchRuns = function (p) { return [{ s: p, px: bg, x: tx, y: anchor }]; };
        } else {
          var lp = Math.round(120 * k), lb = Math.round(160 * k);
          Lr = [{ s: f.lead, px: lp, x: tx, y: anchor - lp * 1.5 }];
          punchRuns = function (p) {
            if (!f.bigFirst) return [{ s: p, px: lp, x: tx, y: anchor }];
            var head = p.slice(0, 1), rest = p.slice(1);
            return [{ s: head, px: lb, x: tx, y: anchor }, { s: rest, px: lp, x: tx + w(head, lb), y: anchor }];
          };
        }
        var L = mask(Lr);
        timeline.push({ t: t, fact: fi, head: 0, lead: L, punch: null, inv: false, enter: 'lead' }); t += B;
        f.punch.forEach(function (p, j) {
          var inv = j % 2 === 0;
          if (f.type) {
            for (var n = 1; n <= p.length; n++) {
              if (p[n - 1] === ' ' && n < p.length) continue;
              timeline.push({ t: t + (n - 1) * TYPE, fact: fi, head: 0, lead: L, punch: mask(punchRuns(p.slice(0, n))), inv: inv, enter: n === 1 ? 'punch' : null });
            }
            t += Math.ceil((p.length * TYPE) / B) * B;
          } else {
            timeline.push({ t: t, fact: fi, head: 0, lead: L, punch: mask(punchRuns(p)), inv: inv, enter: 'punch' }); t += B;
          }
        });
        t += (HOLDB - 1) * B;
      });
      /* finale: the stage empties and the headline cuts in chunk by chunk, inverting on each, then holds */
      chunks.forEach(function (c, k) { timeline.push({ t: t, fact: -1, head: k + 1, lead: null, punch: null, inv: k % 2 === 0, enter: null }); t += B; });
      if (chunks.length) t += (HEADHOLD - 1) * B;
      LOOP = t;
      return true;
    }
    function draw(ts, now) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      var e = now % LOOP, i = 0;
      while (i + 1 < timeline.length && timeline[i + 1].t <= e) i++;
      var s = timeline[i], since = e - s.t;
      /* the line that just cut in smears in from the right: offset in cells, plus a fading trail behind it */
      var enterAt = s.t; for (var j = i; j >= 0 && timeline[j].fact === s.fact; j--) { if (timeline[j].enter) { enterAt = timeline[j].t; break; } }
      var enterWhich = timeline[j] ? timeline[j].enter : null, ep = out((e - enterAt) / SMEAR), shift = Math.round((1 - ep) * 9);
      var tsec = ts / 1000;
      if (s.inv) {
        g.fillStyle = '#fafafa'; g.fillRect(0, 0, W, H);
        /* the dot-wave, inverted: dark dots on the white band, same grid and wave */
        var field = new Path2D(), field2 = new Path2D();
        var fx0 = ((((sec.clientWidth % 24) / 2 + 12) - secDx) % 24 + 24) % 24, fy0 = ((((sec.clientHeight % 24) / 2 + 12) - secDy) % 24 + 24) % 24;
        for (var fy = fy0; fy < H; fy += 24) {
          var bY = Math.sin((fy + secDy) / 170) * 1.1 + Math.sin((fy + secDy) / 61) * 0.35;
          for (var fx = fx0; fx < W; fx += 24) {
            var w0 = 0.5 + 0.5 * Math.sin((fx + secDx - tsec * V) * K + bY); w0 = w0 * w0 * w0;
            var rr = 1.6 + 0.5 * w0, pth = w0 > 0.5 ? field2 : field;
            pth.moveTo(fx + rr, fy); pth.arc(fx, fy, rr, 0, 6.2832);
          }
        }
        g.fillStyle = '#e2e2e2'; g.fill(field); g.fillStyle = '#cfcfcf'; g.fill(field2);
      }
      var lv = [], STEPS = 10;
      for (var q = 0; q <= STEPS; q++) lv.push(new Path2D());
      var Lm = s.lead, Pm = s.punch;
      for (var r = 0; r < rows; r++) {
        var y = y0 + r * P, bendY = Math.sin((y + secDy) / 170) * 1.1 + Math.sin((y + secDy) / 61) * 0.35, row = r * cols;
        for (var c = 0; c < cols; c++) {
          var a = 0;
          var sl = enterWhich === 'lead' ? shift : 0, sp = enterWhich === 'punch' ? shift : 0;
          if (Lm) a = Math.max(a, smear(Lm, row, c, sl, ep, enterWhich === 'lead'));
          if (Pm) a = Math.max(a, smear(Pm, row, c, sp, ep, enterWhich === 'punch'));
          if (a < 0.06) continue;
          var x = x0 + c * P, w = 0.5 + 0.5 * Math.sin((x + secDx - tsec * V) * K + bendY); w = w * w * w;
          var k = Math.round(STEPS * Math.min(1, a * (0.8 + 0.2 * w))), rad = 0.6 + 1.9 * a;
          lv[k].moveTo(x + rad, y); lv[k].arc(x, y, rad, 0, 6.2832);
        }
      }
      for (q = 1; q <= STEPS; q++) {
        var f = q / STEPS, cc = s.inv ? Math.round(200 - 195 * f) : Math.round(44 + 206 * f);
        g.fillStyle = 'rgb(' + cc + ',' + cc + ',' + cc + ')'; g.fill(lv[q]);
      }
      if (num && s.fact >= 0) { var nn = (s.fact < 9 ? '0' : '') + (s.fact + 1); if (num.textContent !== nn) num.textContent = nn; }
      if (s !== shown) {                                               /* the DOM side of the beat: section and headline */
        shown = s;
        sec.classList.toggle('tf-inv', s.inv);
        sec.classList.toggle('tf-head', s.fact < 0);
        words.forEach(function (w, k) { w.classList.toggle('on', k < s.head); });
      }
      return since < SMEAR + 40 || (s.fact >= 0 && facts[s.fact].type && s.punch && since < B);   /* busy: draw at 60fps */
    }
    function smear(m, row, c, sh, ep, entering) {
      var cc = c + sh; if (cc < 0 || cc >= cols) return 0;
      var v = m[row + cc];
      if (entering && ep < 1) {                                         /* trail behind the moving line */
        for (var k = 1; k <= 3; k++) { var c2 = cc + k; if (c2 < cols) v = Math.max(v, m[row + c2] * (1 - ep) * (0.55 - k * 0.13)); }
      }
      return v;
    }
    var t0 = 0, raf = null, last = 0, busy = true, ready = false, visible = false, shown = null;
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      var now = ts - t0;
      if (!busy && ts - last < 33) {                                    /* at rest: 30fps, but never late for a cut */
        var e = now % LOOP, nxt = null;
        for (var i = 0; i < timeline.length; i++) if (timeline[i].t > e) { nxt = timeline[i].t; break; }
        if (nxt === null || nxt - e > 20) return;
      }
      last = ts; busy = draw(ts, now);
    }
    function start() { if (!raf && ready) { if (!t0) t0 = performance.now(); sec.classList.add('tf-run'); raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      ready = layout(); if (ready && visible) start();
    });
    window.addEventListener('resize', function () { if (ready) layout(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(cv);
    } else visible = true;
  });

  /* Tournament page hero, storyboard Figma 75:10785 ([data-tk]; ohayo-motion: 0.5s beats, out / in-out, things
     transform into their place instead of cutting). The markup is the last cut. Everything runs in Figma pixels
     inside .tk-frame (1440 x 1020), scaled so x 180 sits on the content column. Ghost copies, set at the largest size
     they reach so scaling only ever goes down (crisp type), fly into the slots; a slot shows once its ghost lands.
       0.0-0.5   C1  headline at 200px, words rise in (first loop only)
       1.5-2.1   C2  headline words fly into the 66px slot; 1.8-2.3 the lede rises in at 88px
       2.8-3.4   C3  lede words shrink into the 18px slot
       3.6-6.0   C4  (Figma 158:50828) the seven layers under the title swing in on a left-edge hinge,
                     rotateY 90deg -> 0 (closing), 600ms each (out), top to bottom, one every 300ms
       6.0-9.3   hold (the dot-wave keeps moving)
       9.3-9.9   the layers fade out and the headline grows back to C1; loop (9.9s)
     Runs only on screen; reduced motion and narrow screens (<= 900px) show the last cut, still. */
  all('[data-tk]').forEach(function (frame) {
    var sec = frame.closest('section'), fx = frame.querySelector('.tk-fx');
    if (!sec || !fx) return;
    var slot = function (k) { return frame.querySelector('[data-slot="' + k + '"]'); };
    var inOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var outE = function (x) { return 1 - Math.pow(1 - x, 3); };
    var EASE = { o: outE, io: inOut, l: function (x) { return x; } };
    var LOOP = 9900, s = 1, pops = [], POP0 = 3600, POPS = 300, POPD = 600, HOLD_END = 9300;
    /* wrap the words of the multi-word slots, so each can be measured and flown separately */
    function words(el) {
      if (el.querySelector('.tk-w')) return all('.tk-w', el);
      var txt = el.textContent.trim().split(/\s+/); el.textContent = '';
      return txt.map(function (w, i) {
        var sp = document.createElement('span'); sp.className = 'tk-w'; sp.textContent = w; el.appendChild(sp);
        if (i < txt.length - 1) el.appendChild(document.createTextNode(' '));
        return sp;
      });
    }
    var headW = words(slot('head')), ledeW = words(slot('lede'));
    /* Two layouts. Desktop (> 900px): the 1440 frame in Figma pixels, x 180 on the content column. Tablet and
       mobile (<= 900px): a 390px portrait frame whose last cut is the stacked type in the CSS tier; C1 and C2 are
       set for it in build(). Either way the frame scales to fit the width and the height: the tallest moment
       (needH, the C1 headline or the finished list) plus 40px clear at the foot. */
    var mobile = false, needH = 835;
    function place() {
      mobile = window.innerWidth <= 900;
      frame.style.left = '0px'; frame.style.top = '0px';
      if (mobile) {
        var top = 80;
        /* the frame scales to the width; the composition then spreads down to fill the screen's height: the free
           height goes 40% before the list and 20% before each of its last three rows (--tk-a, --tk-b) */
        frame.style.setProperty('--tk-a', '0px'); frame.style.setProperty('--tk-b', '0px');
        var lst = frame.querySelector('.tk-list'), base = lst.offsetTop + lst.offsetHeight + 24;
        var sw = sec.clientWidth / 390, free = Math.max(0, (sec.clientHeight - top - 40) / sw - base);
        frame.style.setProperty('--tk-a', (free * 0.4).toFixed(1) + 'px'); frame.style.setProperty('--tk-b', (free * 0.2).toFixed(1) + 'px');
        needH = Math.max(needH, base + free);
        s = Math.min(sw, (sec.clientHeight - top - 40) / needH);
        frame.style.transform = 'translate(' + ((sec.clientWidth - 390 * s) / 2) + 'px,' + top + 'px) scale(' + s + ')';
        return true;
      }
      var wrapW = Math.min(sec.clientWidth, 1120) - 40, left = (sec.clientWidth - wrapW) / 2;
      s = Math.min(wrapW / 1080, (sec.clientHeight - 65 - 40) / needH);
      frame.style.transform = 'translate(' + (left - 180 * s) + 'px,65px) scale(' + s + ')';
      return true;
    }
    if (noMotion || !place()) { window.addEventListener('resize', place); return; }

    /* where a word sits in a layout we don't show at rest (C1 headline 200px, C2 lede 88px, the panel's 120px
       lines): a hidden clone in the frame, read back in frame pixels */
    function layoutOf(text, css) {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;visibility:hidden;white-space:normal;' + css;
      text.forEach(function (w, i) { var sp = document.createElement('span'); sp.className = 'tk-w'; sp.textContent = w; d.appendChild(sp); if (i < text.length - 1) d.appendChild(document.createTextNode(' ')); });
      frame.appendChild(d);
      var r = all('.tk-w', d).map(function (sp) { return { x: d.offsetLeft + sp.offsetLeft, y: d.offsetTop + sp.offsetTop }; });
      d.remove(); return r;
    }
    /* where a slot (or a word in it) sits in frame pixels. A word's offsets are measured from its offsetParent: the
       slot itself when the slot is positioned (desktop), but the frame when the slots are plain flow (phones), so
       the slot's own offset is added only in the first case (adding it twice made words jump when they landed) */
    var slotXY = function (el, w) {
      if (!w) return { x: el.offsetLeft, y: el.offsetTop };
      return w.offsetParent === el ? { x: el.offsetLeft + w.offsetLeft, y: el.offsetTop + w.offsetTop } : { x: w.offsetLeft, y: w.offsetTop };
    };
    var tracks = [];
    /* a ghost: text at its base size; keys [t ms, x, y, scale, rotate deg (Figma: + is counter-clockwise),
       rotateY deg, opacity, easing into this key] */
    function ghost(text, base, css, keys) {
      var g = document.createElement('span'); g.className = 'tk-g'; g.textContent = text;
      g.style.cssText = 'font-size:' + base + 'px;' + (css || ''); g.style.opacity = 0;
      fx.appendChild(g); tracks.push({ el: g, keys: keys }); return g;
    }
    var K = function (t, x, y, k, r, ry, o, e) { return { t: t, x: x, y: y, k: k, r: r || 0, ry: ry || 0, o: o === undefined ? 1 : o, e: e || 'io' }; };
    var shows = [];                                                     /* slot visibility: [el, from, fadeOutFrom] */
    function build() {
      fx.textContent = ''; tracks = []; shows = [];
      var headTxt = headW.map(function (w) { return w.textContent; }), ledeTxt = ledeW.map(function (w) { return w.textContent; });
      /* the C1 / C2 sizes: desktop from Figma (200px headline, 88px lede), mobile set for 390px (64 / 24px);
         the slot sizes come from the CSS, so the flight always lands on what the page shows */
      var hs = slot('head'), ls = slot('lede');
      var HB = mobile ? 64 : 200, LB = mobile ? 24 : 88, X0 = mobile ? 20 : 180, W0 = mobile ? 350 : 1080, Y0 = mobile ? 24 : 78;
      var hk = parseFloat(getComputedStyle(hs).fontSize) / HB, lk = parseFloat(getComputedStyle(ls).fontSize) / LB;
      var big = layoutOf(headTxt, 'left:' + X0 + 'px;top:' + Y0 + 'px;width:' + W0 + 'px;font-size:' + HB + 'px;font-weight:700;line-height:0.92;letter-spacing:-0.02em;');   /* tight as in Figma (715px for 4 lines) */
      var bigBottom = big.reduce(function (m, p) { return Math.max(m, p.y + HB); }, 0);
      var list = frame.querySelector('.tk-list');
      needH = mobile ? Math.max(bigBottom, list.offsetTop + list.offsetHeight) + 24 : 835;   /* desktop: as before */
      /* C1 / C2: headline words, big -> the slot */
      headW.forEach(function (w, i) {
        var a = big[i], b = slotXY(hs, w), k = hk, d = i * 25;
        ghost(w.textContent, HB, 'font-weight:700;letter-spacing:-0.02em;line-height:1', [
          K(0, a.x, a.y + 30, 1, 0, 0, 0), K(500 + i * 40, a.x, a.y, 1, 0, 0, 1, 'o'), K(1500 + d, a.x, a.y, 1),
          K(2100 + d, b.x, b.y, k), K(2101 + headW.length * 25, b.x, b.y, k, 0, 0, 0, 'l'),
          K(HOLD_END - 1, b.x, b.y, k, 0, 0, 0, 'l'), K(HOLD_END, b.x, b.y, k), K(LOOP, a.x, a.y, 1)]);
      });
      shows.push([hs, 2100 + headW.length * 25, HOLD_END, true]);
      /* C2 / C3: lede words, big -> the slot (desktop at y 305; mobile just under the headline's slot) */
      var lTop = mobile ? hs.offsetTop + hs.offsetHeight + 24 : 305;
      var lb = layoutOf(ledeTxt, 'left:' + X0 + 'px;top:' + lTop + 'px;width:' + W0 + 'px;font-size:' + LB + 'px;font-weight:400;line-height:1.36;');
      ledeW.forEach(function (w, i) {
        var a = lb[i], b = slotXY(ls, w), k = lk;
        ghost(w.textContent, LB, 'font-weight:400;letter-spacing:0;color:var(--fg-subtle);line-height:1', [
          K(1800 + i * 15, a.x, a.y + 20, 1, 0, 0, 0), K(2300 + i * 15, a.x, a.y, 1, 0, 0, 1, 'o'), K(2800 + i * 8, a.x, a.y, 1),
          K(3400 + i * 8, b.x, b.y, k), K(3400 + ledeW.length * 8 + 1, b.x, b.y, k, 0, 0, 0, 'l')]);
      });
      shows.push([ls, 3400 + ledeW.length * 8]);
      /* C4 (Figma 158:50828): the layers under the title, popping in top to bottom (render) */
      pops = all('[data-pop]', frame);
    }
    function at(keys, t) {
      if (t < keys[0].t || t > keys[keys.length - 1].t) return null;
      for (var i = 1; i < keys.length; i++) {
        var a = keys[i - 1], b = keys[i];
        if (t <= b.t) {
          var p = b.t === a.t ? 1 : EASE[b.e]((t - a.t) / (b.t - a.t)), m = function (u, v) { return u + (v - u) * p; };
          return { x: m(a.x, b.x), y: m(a.y, b.y), k: m(a.k, b.k), r: m(a.r, b.r), ry: m(a.ry, b.ry), o: m(a.o, b.o) };
        }
      }
      return null;
    }
    var t0 = 0, raf = null, loops = 0;
    function render(now) {
      var e = now % LOOP, first = now < LOOP;
      tracks.forEach(function (tr) {
        var v = at(tr.keys, e);
        /* after the first loop the headline is already big at 0-0.5s (it grew back at the end) */
        if (!first && tr.keys[0].t === 0 && tr.keys[0].o === 0 && e < tr.keys[1].t) v = at(tr.keys, tr.keys[1].t);
        if (!v || v.o <= 0.001) { if (tr.el.style.opacity !== '0') tr.el.style.opacity = 0; return; }
        tr.el.style.opacity = v.o;
        tr.el.style.transform = 'translate(' + v.x.toFixed(1) + 'px,' + v.y.toFixed(1) + 'px) rotate(' + (-v.r).toFixed(2) + 'deg) rotateY(' + v.ry.toFixed(2) + 'deg) scale(' + v.k.toFixed(4) + ')';
      });
      shows.forEach(function (sh) {
        var el = sh[0], on = e >= sh[1], o = on ? 1 : 0;
        if (sh[2] !== undefined && e >= sh[2]) o = 0;                   /* the headline hands back to its ghost */
        else if (on && !sh[3] && e >= HOLD_END) o = Math.max(0, 1 - (e - HOLD_END) / 400);   /* the list fades out */
        if (el.style.opacity !== String(o)) el.style.opacity = o;
      });
      /* C4: each layer swings shut like a door hinged on its left edge, rotateY 90deg (edge on, the free side
         coming from behind) -> 0 (600ms, out, no overshoot), fading in on the way, top to bottom in reading order,
         one every 300ms */
      pops.forEach(function (el, i) {
        var p = Math.max(0, Math.min(1, (e - POP0 - i * POPS) / POPD)), v = outE(p);
        if (e >= HOLD_END) v = Math.max(0, 1 - (e - HOLD_END) / 400);   /* the loop's end: fade out with the rest */
        el.style.opacity = e >= HOLD_END ? v : Math.min(1, v * 1.6);   /* visible early in the swing, not only at its end */
        el.style.transform = e >= HOLD_END ? '' : 'perspective(900px) rotateY(' + (90 * (1 - v)).toFixed(2) + 'deg)';
      });
    }
    function frameFn(ts) { raf = requestAnimationFrame(frameFn); render(ts - t0); }
    var built = false;
    function start() { if (!raf && built) { if (!t0) t0 = performance.now(); raf = requestAnimationFrame(frameFn); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    var visible = false;
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      place(); build(); place(); built = true; render(0); if (visible) start();   /* place first: it sets the spacing the slots are measured with */
    });
    window.addEventListener('resize', function () { place(); build(); place(); built = true; if (visible) start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(sec);
    } else visible = true;
  });

  /* TradeView page hero fan (.tvf-fan): the ring turns by CSS; pause it while the hero is off screen */
  all('.tvf-fan').forEach(function (fan) {
    /* tablet and mobile (<= 900px): size the fan to the room under the copy, so it never runs over the text. Its
       centre sits on the bottom-right corner, so it reaches 530px above the foot (radius 400 + half a card 130);
       --fs scales it between 0.4 and 1. Desktop doesn't use --fs. */
    var sec = fan.closest('section'), copy = sec && sec.querySelector('.tvf-copy');
    function fit() {
      if (!sec || !copy) return;
      var room = sec.clientHeight - (copy.offsetTop + copy.offsetHeight) - 24;
      sec.style.setProperty('--fs', Math.max(0.4, Math.min(1, room / 530)).toFixed(3));
    }
    fit(); window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) { fan.classList.toggle('is-off', !es[0].isIntersecting); }).observe(fan);
  });

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
    /* runs only while some of it is really on screen (not just touching the edge, no look-ahead margin): the scene sits
       at the foot of the section, right above TradeView, so a margin kept it rendering under the next section */
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && es[0].intersectionRatio > 0.02; sync(); }, { threshold: [0, 0.02, 0.1] }).observe(v);
  })();



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
     Everything sits on a 0.5s beat (ohayo-motion skill). One run = 22 beats = 11s:
       beats 0-3   ignition (after the showreel intro), at centre stage: a core dot lights, coloured arcs orbit it on
                   several radii while thin rings expand and fade, then it glides left into place as the orbit
                   tightens and collapses into the full dot
       beats 3-7   run-up, one entrance per beat, each landing with a grow-and-settle kick (out, 300ms) while the
                   dot pulses on the beat: the label pops out of the dot (3); STOCKS slides in (4), the OHAYO caption
                   (5), both shrink into place (6), amounts and dots join and pop, staggered (6.x); the move (7)
       beats 7-17  the move: $1,000 in stocks and on OHAYO count together, one dot per dollar, climbing linearly;
                   each amount pops as it crosses a round number ($5 stocks, $50 OHAYO, 0.5%); fast counts trail
       beats 17-19 the belt brakes; the 10x / 20x slams in on beat 17 (1.8x -> 1x) as the dot pulses
       beats 19-22 hold; on the last beat an LED dot matrix floods out from the stage centre in a circular wave,
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
    var B = 500, VX = 130, INTRO = 3 * B, LEAD = INTRO + 4 * B, RISE = 10 * B, STOP = 2 * B, HOLD = 3 * B, FADE = B, END = LEAD + RISE, LOOP = END + STOP + HOLD, PRE = 1000, STEP = 10;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var out = function (x) { return 1 - Math.pow(1 - x, 3); };                         /* skill easings: out, in-out */
    var inOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var mod = function (a, n) { return ((a % n) + n) % n; };
    /* precomputed world path, sampled every 10ms from -1s (flat run-up, so the tail exists at 0%).
       x: the belt accelerates through the move (up to 2.2x) and brakes to a stop after it.
       y: the move climbs linearly, one steady flow. Only its first tenth bends in (a short ease-in), so the tail
       turns from flat into the climb without a corner. */
    var BEND = 0.1;
    function climb(k) {                                                   /* 0..1 of the move at 0..1 of RISE */
      var c = 1 / (1 - BEND / 2);
      return k < BEND ? c * k * k / (2 * BEND) : c * (k - BEND / 2);
    }
    var wx = [], wy = [], sp = [], n = (PRE + LOOP) / STEP + 1, x = -VX * PRE / 1000, y = 0, vs = [];
    for (var i = 0; i < n; i++) {
      var t = i * STEP - PRE;
      var ka = clamp((t - LEAD) / (RISE * 0.4)), kb = clamp((t - END) / STOP);
      var v = VX * (1 + 1.2 * ka * ka * (3 - 2 * ka)) * (1 - kb) * (1 - kb);
      wx.push(x); vs.push(v); x += v * STEP / 1000;
    }
    /* climb height: what the old smoothstep slope reached over the move, so the dot rises as far as before */
    var YT = 0; for (i = 0; i < n; i++) { var tt = i * STEP - PRE, kk = clamp((tt - LEAD) / RISE); YT += vs[i] * kk * kk * (3 - 2 * kk) * STEP / 1000; if (tt >= END) break; }
    var iEnd = Math.round((END + PRE) / STEP), endSlope = 0;
    for (i = 0; i < n; i++) {
      var t2 = i * STEP - PRE;
      if (i <= iEnd) y = YT * climb(clamp((t2 - LEAD) / RISE));
      else y += endSlope * (wx[i] - wx[i - 1]);                           /* keep the last climb angle while braking */
      if (i === iEnd) endSlope = (y - wy[i - 1]) / Math.max(1e-6, wx[i] - wx[i - 1]);
      wy.push(y);
    }
    for (i = 0; i < n; i++) { var j0 = Math.max(0, i - 1), dx = wx[i] - wx[j0], dy = wy[i] - wy[j0]; sp.push(i ? Math.hypot(dx, dy) / (STEP / 1000) : VX); }
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
        dx: c ? 747 : 423, type: c ? [INTRO + 2 * B, INTRO + 3 * B] : [INTRO + B, INTRO + 2 * B], join: LEAD - B + (c ? 120 : 0) }; /* captions enter on beats 4 and 5; amounts join staggered by 120ms */
    });
    cols[0].txt = cols[0].cap.textContent;
    function fill(box, k, down) { /* light k dots, 12 per row (phones: 24), from the bottom row up (or the top row down) */
      var per = MOB ? 24 : 12;                                            /* phones (Figma 178:51218): 24 a row, both stacks */
      var full = Math.floor(k / per), rem = k % per, f = box.firstElementChild, part = box.lastElementChild;
      box.style.width = MOB ? per * 6 + 'px' : '';
      f.style.height = full * 6 + 'px'; part.style.width = rem * 6 + 'px';
      part.style.top = down ? full * 6 + 'px' : ''; part.style.bottom = down ? 'auto' : full * 6 + 'px';
      box.style.height = Math.ceil(k / per) * 6 + 'px'; /* the amount rides along with the stack */
    }
    var R = RUNS[0], col = '#11ec8a', rgb = '17,236,138', orange = '#ff5a00';
    var bx = 0, by = 0, W = 0, H = 0, dpr = 1, DX = 0, DY = 0, sc = 1, room = 1, raf = null, t0 = 0, run = 0, HX = 0, CL = 0, cw0 = 0;
    var MOB = false, CS = 1, CY = 0, COLX = null, HB = 0;   /* phones: the profit graph gets its own row (see layout) */

    var V2 = function () { return document.body.classList.contains('hero-v2'); };
    var runAt = function (r) { return RUNS[(((r + (V2() ? 1 : 0)) % RUNS.length) + RUNS.length) % RUNS.length]; };   /* 2type: short first */
    function setRun(r) {
      R = runAt(r);
      belt.classList.toggle('is-short', R.dir < 0);
      name.textContent = R.name; cols[1].txt = R.cap; x10.textContent = R.x;
      col = getComputedStyle(document.documentElement).getPropertyValue(R.color).trim() || col;
      orange = getComputedStyle(document.documentElement).getPropertyValue('--fg-primary').trim() || orange;
      var h = col.replace('#', ''); if (h.length === 6) rgb = [0, 2, 4].map(function (o) { return parseInt(h.substr(o, 2), 16); }).join(',');
      cache = {};
      place();
    }
    function place() {
      cols.forEach(function (c) {
        var down = !c.us && R.dir < 0;
        c.el.style.left = (MOB ? COLX[c.us ? 1 : 0] : DX + c.dx * sc * room) + 'px';
        if (down) { c.el.style.top = (CY - 3.5 * CS) + 'px'; c.el.style.bottom = 'auto'; }   /* caption on top, loss hangs below */
        else { c.el.style.top = 'auto'; c.el.style.bottom = (H - (CY - 7.5 * CS)) + 'px'; }
        c.el.style.transform = 'scale(' + CS + ')';
        /* the caption enters at 2x from its left edge; on phones only as large as the room to the screen's edge
           allows (12px clear), so OHAYO · SHORT 20X never runs off the right */
        if (c.cap.textContent !== c.txt) c.cap.textContent = c.txt;
        var left = MOB ? COLX[c.us ? 1 : 0] : 0;
        c.big = MOB ? Math.max(1, Math.min(2, (W - 12 - left) / Math.max(1, c.cap.scrollWidth * CS * 1.3))) : 2;   /* 1.3: the pop at its peak */
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
      if (V2()) {
        /* 2type (Figma 141:47868): the chart's head sits 390px right of the copy's left edge; the profit graph stays put:
           STOCKS 367px and OHAYO 547px right of the head, the 10x between them */
        HX = (cr.left - fr.left) + 390 * sc; CL = cr.left - fr.left;
        room = Math.min(1, Math.max(0.5, (W - 24 - HX - 170 * sc) / 547));
        cols[0].dx = 367; cols[1].dx = 547; DX = HX;
        x10.style.left = (HX + 420 * sc * room) + 'px';
        label.style.left = (HX + 14 * sc) + 'px';
      } else { cols[0].dx = 423; cols[1].dx = 747; }
      /* the profit graph rides the chart's line on wider screens; phones (<= 600px, 2type) split the stage in two:
         a short, quieter chart with its label up top (the flowing history matters less here), and below it, across
         the width and larger, the profit graph: STOCKS left, the 10x between, OHAYO right */
      MOB = V2() && W <= 600; CS = sc; CY = DY; COLX = null;
      if (MOB) {
        /* phones, after Figma 178:51218: a 360 x 360 stage sitting on the ticker strip, scaled to the width (or to
           the room under the copy). Label top left (28, 28); 10x / 20x left middle (28, 150); STOCKS bottom left
           (28, caption at 270, a loss hangs below it); OHAYO right (188), amount on top of its block, caption at
           270 too. Both stacks 24 dots a row. The flowing chart stays behind, faded. */
        HB = heroBottom;
        var k = Math.min(W / 360, (heroBottom - copyBottom - 8) / 360), top = heroBottom - 360 * k, lft = (W - 360 * k) / 2;
        CS = k;
        CY = top + 266 * k;
        COLX = [lft + 28 * k, lft + 188 * k];
        label.style.left = (lft + 28 * k) + 'px'; label.style.top = (top + 39 * k) + 'px';
        x10.style.left = (lft + 28 * k) + 'px'; x10.style.top = (top + 128 * k) + 'px';
        DY = top + 190 * k; HX = lft + 360 * k * 0.66; DX = HX;
      }
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
    /* 1 just after the value (% x f) crossed a multiple of unit, decaying to 0 over 250ms */
    function popAt(i, unit, f) {
      var v = function (q) { return Math.floor(R.move * f * clamp(wy[q] / yTop) / unit + 1e-9); };
      for (var j = 0; j < 25 && i - j > 0; j++) if (v(i - j) !== v(i - j - 1)) return 1 - out(clamp(j * STEP / 250));
      return 0;
    }
    /* 2type background: a candle chart instead of the dot, tail and grid. The camera scrolls with the belt (the chart
       flows right to left at one steady speed, like a live chart) but never moves vertically: the head
       candle climbs (long) or falls (short) on screen, and the ticker + % label rides beside it. 15px candle slots,
       built from the same move as the counters (0..1 of the move), with a small deterministic wiggle so up and down
       candles mix; history before the run idles around the start level. The profit graph to the right stays fixed. */
    var CP = 15, CHIST = 160, cache = {}, CSS = null;
    function css() {                                                     /* read once: no style lookups inside a frame */
      if (!CSS) { var rs = getComputedStyle(document.documentElement);
        CSS = { font: getComputedStyle(document.body).fontFamily, red: rs.getPropertyValue('--fg-negative').trim() || '#ff4b4e', grn: rs.getPropertyValue('--fg-positive').trim() || '#11ec8a' }; }
      return CSS;
    }
    /* the chart flows like a live chart: one steady speed for the whole run (no run-up, no braking), 130px/s */
    var lx = []; for (var li = 0; li < n; li++) lx.push(VX * (li * STEP - PRE) / 1000);
    var wig = function (k) { return 0.08 * Math.sin(k * 1.7) + 0.06 * Math.sin(k * 0.61 + 1.3) + 0.05 * Math.sin(k * 3.1 + 0.4); };
    function val(i) { return clamp(wy[i] / yTop) + wig(i * 0.09) * (0.6 + 0.4 * Math.sin(i * 0.013)); }
    function candles() {                                                 /* per run: finished candles + running state per sample */
      if (cache.c) return cache;
      var bars = {}, run2 = [];
      for (var q = 0; q < n; q++) {
        var k = Math.floor((lx[q] + 1e4 * CP) / CP) - 1e4, v2 = val(q), b = bars[k];
        if (!b) { var pv = bars[k - 1] ? bars[k - 1].c : v2; b = bars[k] = { o: pv, h: Math.max(pv, v2), l: Math.min(pv, v2), c: v2 }; }
        b.c = v2; b.h = Math.max(b.h, v2); b.l = Math.min(b.l, v2);
        run2.push({ k: k, o: b.o, h: b.h, l: b.l, c: b.c });
      }
      var k0 = run2[0].k, prev = run2[0].o;
      for (var hk = k0 - 1; hk >= k0 - CHIST; hk--) {                  /* history: idles around 0 with a slow swell */
        var c2 = prev, o2 = 0.1 * Math.sin(hk * 0.23) + 0.07 * Math.sin(hk * 0.71) + wig(hk);
        bars[hk] = { o: o2, c: c2, h: Math.max(o2, c2) + 0.03 + 0.05 * Math.abs(Math.sin(hk * 2.3)), l: Math.min(o2, c2) - 0.03 - 0.05 * Math.abs(Math.cos(hk * 1.9)) };
        prev = o2;
      }
      cache = { c: bars, r: run2, k0: k0 - CHIST };
      return cache;
    }
    function drawChart(t, i, a) {
      var C = candles(), s = R.dir, RANGE = 190 * sc, y0 = DY + (s > 0 ? 70 : -110) * sc, ySpan = s > 0 ? -RANGE : RANGE;
      var yOf = function (v) { return y0 + ySpan * v; };
      var wNow = lx[i], head = C.r[i], fadeL = CL - 40 * sc;
      var alphaX = function (x) { return clamp((x - fadeL) / (260 * sc)); };
      // faint panel: horizontal rules fixed, vertical rules + date labels flowing with the chart (138px a half-year)
      ctx.globalAlpha = a; ctx.lineWidth = 1;
      for (var hy = DY - 220 * sc, hj = 0; hy < DY + 170 * sc; hy += 52 * sc, hj++) {
        var hg = ctx.createLinearGradient(fadeL, 0, W, 0), ha = 0.05 * Math.min(1, hj / 1.5, (DY + 170 * sc - hy) / (78 * sc));
        hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.25, 'rgba(255,255,255,' + ha.toFixed(3) + ')'); hg.addColorStop(1, 'rgba(255,255,255,' + (ha * 0.6).toFixed(3) + ')');
        ctx.strokeStyle = hg; ctx.beginPath(); ctx.moveTo(fadeL, Math.round(hy) + 0.5); ctx.lineTo(W, Math.round(hy) + 0.5); ctx.stroke();
      }
      var G = 138 * sc, gw = wNow;                                     /* each run starts its own calendar (the LED wipe hides the seam) */
      ctx.font = '500 ' + (12 * sc).toFixed(1) + 'px ' + css().font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var gk = Math.floor((gw * sc - HX) / G) - 1; ; gk++) {
        var gx = HX + gk * G - gw * sc; if (gx > W) break; if (gx < -G) continue;
        var ga = a * alphaX(gx);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.05 * ga / Math.max(a, 1e-3)).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(Math.round(gx) + 0.5, DY - 220 * sc); ctx.lineTo(Math.round(gx) + 0.5, DY + 170 * sc); ctx.stroke();
        ctx.fillStyle = 'rgba(144,144,144,' + (0.45 * ga).toFixed(3) + ')';
        var gE = Math.floor(lx[n - 1] * sc / G / 2) * 2;                     /* calendar pinned so the run ends in 2026 */
        ctx.fillText(gk % 2 ? 'Jul' : String(2026 + Math.floor((gk - gE) / 2)), gx, DY + 186 * sc);
      }
      // candles: finished ones from the cache, the head one as it stands at this sample
      var bw = Math.max(3, 7 * sc), up, red = css().red, grn = css().grn;
      for (var k = head.k; k >= C.k0; k--) {
        var b = k === head.k ? head : C.c[k]; if (!b) continue;
        var x = HX + ((k + 0.5) * CP - wNow) * sc - CP * 0.5 * sc; if (x < -20) break;
        var ax = alphaX(x); if (ax <= 0) continue;
        up = (b.c >= b.o) === (s > 0);                                    /* the price rises: long up, short down */
        ctx.globalAlpha = a * ax * 0.92; ctx.fillStyle = up ? grn : red;
        var yh = yOf(b.h), yl = yOf(b.l), yo = yOf(b.o), yc = yOf(b.c);
        ctx.fillRect(Math.round(x) - 0.5, Math.min(yh, yl), Math.max(1, sc), Math.max(1, Math.abs(yl - yh)));
        ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1.5, Math.abs(yc - yo)));
      }
      ctx.globalAlpha = 1;
      /* the label rides the price, not the candle: x stays just right of the head slot (no hop when a new candle opens),
         y follows the average of the last 400ms of price (a moving average, still a pure function of t), so it glides
         with the move instead of shaking with every tick */
      var acc2 = 0, cnt = 0; for (var q = Math.max(0, i - 40); q <= i; q++) { acc2 += val(q); cnt++; }
      return { x: HX + CP * 0.5 * sc, y: yOf(acc2 / cnt) };
    }
    function draw(t) {
      var i = at(t), s = R.dir, cx = bx + wx[i], cy = by + s * wy[i];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // grid: 1px white lines at 10%, shown only while the belt moves and once the % has left 0 (it fades in from
      // the moment the OHAYO amount first reads non-zero, and out again as the belt brakes)
      var v2 = V2();
      var ga = v2 ? 0 : 0.1 * Math.min(clamp(sp[i] / VX), clamp((t - zeroUntil(R)) / 800));
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
      var hd = null;
      if (v2) { hd = drawChart(t, i, Math.min(clamp(t / 400), 1 - clamp((t - (LOOP - WIPE)) / 150)) * (MOB ? 0.35 : 1)); if (!MOB) { label.style.top = hd.y + 'px'; label.style.left = (hd.x + 14 * sc) + 'px'; } }   /* phones: the chart sits faded behind the profit graph and the label stays pinned (layout) */
      ctx.globalAlpha = a;
      if (!v2 && t < INTRO + 50) ignite(t, eIn, eOut, a, ox);
      // tail: the dot's recent path; 85px at cruise, ~3x at full speed, gone when stopped
      // no tail while OHAYO reads +$0: just the dot; the tail grows out from the moment its amount turns non-zero
      var L = 85 * sp[i] / VX * sc * clamp((t - zeroUntil(R)) / 700), len = 0, j = i, px = DX, py = DY, pts = [[DX, DY]];
      while (j > 0 && len < L) {
        j--; var qx = DX + (wx[j] - wx[i]) * sc, qy = DY - s * (wy[j] - wy[i]) * sc;
        len += Math.hypot(qx - px, qy - py); px = qx; py = qy; pts.push([qx, qy]);
      }
      if (pts.length > 1 && !v2) {
        var g = ctx.createLinearGradient(px, py, DX, DY);
        g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(0.65, col); g.addColorStop(1, col);
        ctx.strokeStyle = g; ctx.lineWidth = 21 * sc; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        for (var m = pts.length - 2; m >= 0; m--) ctx.lineTo(pts[m][0], pts[m][1]);
        ctx.stroke();
      }
      // run-up beat kicks (beats 3-7): each beat lands one entrance, and the dot pulses with it
      var kick = function (at0) { var d = t - at0; return d >= 0 && d < 300 ? 1 - out(d / 300) : 0; };
      var pulse = Math.max(kick(INTRO), kick(INTRO + B), kick(INTRO + 2 * B), kick(INTRO + 3 * B), kick(LEAD), kick(END));   /* and on the 10x / 20x landing */
      if (!v2) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox, DY, 10.5 * sc * Math.max(0.001, grow) * (1 + 0.35 * pulse), 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      // the label slides out of the dot as it lands (beat 3)
      var lIn = out(clamp((t - INTRO) / 300));
      label.style.opacity = Math.min(a, lIn);
      label.style.transform = 'translate(' + (-14 * sc * (1 - lIn)).toFixed(1) + 'px,-50%) scale(' + (1 + 0.3 * kick(INTRO)).toFixed(3) + ')';   /* beat 3: the name pops out of the dot */
      var pct = R.move * clamp(wy[i] / yTop);                                /* size of the move so far, in % */
      // motion trail on fast counts: ghosts of the previous values trail below the number, scaled by how fast it moves
      var rate = Math.abs(pct - R.move * clamp(wy[at(t - 80)] / yTop)) / 0.08, trail = clamp(rate / (1.1 * R.move / 4.8));
      var ghost = trail < 0.06 ? 'none' : '0 ' + (5 * trail).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 32%, transparent), 0 ' + (10 * trail).toFixed(1) + 'px 0 color-mix(in srgb, currentColor 12%, transparent)';
      num.style.textShadow = ghost;
      // round-number pops: a value grows a little and settles (250ms, out, no overshoot) each time it crosses a round
      // step (the % every 0.5, stocks every $5, OHAYO every $50). Values drive it, so the flow itself stays linear.
      num.style.transform = 'scale(' + (1 + 0.06 * popAt(i, 0.5, 1)).toFixed(3) + ')';
      num.textContent = pct < 0.05 ? '+0%' : (s > 0 ? '+' : '-') + pct.toFixed(1) + '%';
      cols.forEach(function (c) {
        // $1,000: stocks move 1:1 with the ticker; OHAYO gains mult x the move either way
        var d = Math.round(10 * pct * (c.us ? R.mult : 1)), down = !c.us && s < 0;
        c.el.style.opacity = a;
        // scene 2: caption types in at 2x; scene 3: shrinks to 1x; scene 4: amount and dots join as the counting starts
        // caption enters like the ticker name: whole, sliding out from the left as it fades up, with a pop (beat 4 / 5)
        var cIn = out(clamp((t - c.type[0]) / 300));
        if (c.cap.textContent !== c.txt) c.cap.textContent = c.txt;
        c.cap.style.opacity = cIn;
        var k3 = inOut(clamp((t - (INTRO + 3 * B)) / 350));                  /* beat 6: shrink into place */
        c.cap.style.transform = 'translateX(' + (-14 * (1 - cIn)).toFixed(1) + 'px) scale(' + ((c.big - (c.big - 1) * k3) * (1 + 0.3 * kick(c.type[0]))).toFixed(3) + ')';
        var k4 = out(clamp((t - c.join) / 300));                              /* amounts and dots join, staggered */
        c.val.style.opacity = k4; c.box.style.opacity = k4;
        var pop = c.us ? popAt(i, 5, R.mult) : popAt(i, 0.5, 1);                /* $50 on OHAYO, $5 on stocks */
        c.val.style.transform = 'translateY(' + (6 * (1 - k4)).toFixed(1) + 'px) scale(' + ((1 + (c.us ? 0.08 : 0.05) * pop) * (1 + 0.3 * kick(c.join))).toFixed(3) + ')';   /* + a pop as it joins */ c.val.style.textShadow = ghost;
        c.val.textContent = (down && d ? '-$' : '+$') + d; fill(c.box, d, down);
      });
      // scene 5: the 10x / 20x lands the moment OHAYO reaches its total
      // it slams in big and settles (like the run-up entrances, scaled up): 1.8x -> 1x over 400ms (out, no overshoot),
      // visible within 150ms, with a blur that follows the shrink's speed and is gone by the time it rests
      var p5 = clamp((t - END) / 400), e5 = out(p5), s5 = 1 + 0.8 * (1 - e5);
      x10.style.opacity = a * out(clamp((t - END) / 150));
      var xw = x10.offsetWidth;                                             /* scale about its centre, rest exactly where the left-origin layout puts it */
      x10.style.transform = 'translateX(' + (xw * (CS - 1) / 2).toFixed(1) + 'px) scale(' + (CS * s5).toFixed(3) + ')';
      x10.style.filter = p5 > 0 && p5 < 1 ? 'blur(' + (6 * (1 - e5)).toFixed(2) + 'px)' : 'none';
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
    var fxLit = true;                                                     /* the wipe layer holds pixels from the last frame */
    function drawFx(t, cur, nxt) {
      var FXD = WIPE;                                                       /* each crest takes 3 beats (1.5s) to cross */
      var cover = t > LOOP - FXD ? (t - (LOOP - FXD)) / FXD : -1, reveal = run > 0 && t < FXD ? t / FXD : -1;
      if (cover < 0 && reveal < 0) {                                        /* idle between wipes: clear once, then skip */
        if (fxLit) { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fx.width, fx.height); fxLit = false; }
        return;
      }
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H); fxLit = true;
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
    var lastFrame = 0;
    function loop(ts) {
      if (!t0) t0 = ts;
      if (ts - lastFrame < 15.5) { raf = requestAnimationFrame(loop); return; }   /* 60fps at most, even on 120/144Hz screens */
      lastFrame = ts;
      var e = ts - t0, r = Math.floor(e / LOOP);
      while (run < r) { bx += wx[n - 1]; by += R.dir * wy[n - 1]; cw0 += wx[n - 1]; run++; setRun(run); } /* carry the grid over, switch long <-> short */
      var tr = e - r * LOOP; draw(tr);
      var rc = function (i) { var k = runAt(i).color; return runCol[k] || (runCol[k] = getComputedStyle(document.documentElement).getPropertyValue(k).trim()); };
      drawFx(tr, rc(tr < WIPE ? run - 1 : run), rc(tr < WIPE ? run : run + 1));   /* reveal uses the new run's colour */
      raf = requestAnimationFrame(loop);
    }
    var runCol = {};                                  /* run colours, read from the tokens once */
    /* Pause while the hero is off screen: two full-stage canvases redrawn every frame are the page's heaviest work.
       The clock resumes where it stopped (t0 shifts by the time away), so the run picks up mid-move. */
    var onScreen = true, pausedAt = 0;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (!onScreen && raf) { cancelAnimationFrame(raf); raf = null; pausedAt = performance.now(); }
      else if (onScreen && pausedAt) { if (t0) t0 += performance.now() - pausedAt; pausedAt = 0; raf = requestAnimationFrame(loop); }
    }).observe(belt);
    function sync() {
      var on = document.body.classList.contains('hero-2type');
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      pausedAt = 0;
      fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fx.width, fx.height);   /* no LED dots left behind */
      if (on) {
        layout();
        if (noMotion) { draw(END + STOP); return; }
        if (document.body.classList.contains('hero-intro-on')) { ctx.clearRect(0, 0, cv.width, cv.height); [label].concat(cols.map(function (c) { return c.el; }), [x10]).forEach(function (el) { el.style.opacity = 0; }); return; } /* wait for the page intro */
        t0 = 0; run = 0; bx = by = 0; cw0 = 0; setRun(0);
        if (onScreen) raf = requestAnimationFrame(loop); else pausedAt = performance.now();   /* starts once it scrolls into view */
      }
    }
    document.addEventListener('herochange', sync);
    document.addEventListener('herointrodone', sync);
    window.addEventListener('resize', function () { if (document.body.classList.contains('hero-2type')) { layout(); if (noMotion) draw(END + STOP); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (document.body.classList.contains('hero-2type')) layout(); });
    setRun(0);
    sync();
  })();

  /* Preview bar: shows by default (?preview=0 hides it). Hero 1type / 2type: 2type is a copy of 1type, marked by
     body.hero-v2 (?hero=2 opens it); everything 1type does runs as is, 2type-only changes hang off that class.
     3type (?hero=3) is a copy of 2type: it keeps hero-v2 and adds body.hero-v3 for 3type-only changes.
     Switching reloads the page on the chosen type. */
  var heroBtns = all('[data-hero]');
  heroBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      /* Types can differ in page structure, and scroll/background setup runs once at load, so switching reloads
         the page with ?hero=1|2|3 (other query params kept) instead of toggling classes in place. */
      if (b.getAttribute('aria-pressed') === 'true') return;
      var u = new URL(location.href);
      u.searchParams.set('hero', b.getAttribute('data-hero'));
      u.hash = '';
      location.assign(u.toString());
    });
  });
  press(heroBtns, heroBtns.filter(function (x) { return x.getAttribute('data-hero') === (document.body.classList.contains('hero-v3') ? '3' : document.body.classList.contains('hero-v2') ? '2' : '1'); })[0]);
  if ($('preview')) {   /* the landing only; the 3type detail pages have no preview bar */
    $('preview-x').addEventListener('click', function () { $('preview').hidden = true; });
    if (!/[?&]preview=0/.test(location.search)) $('preview').hidden = false;
  }
  /* The hero (body.hero-2type, set by the inline script before first paint): 'herochange' starts the page intro and the belt */
  document.dispatchEvent(new Event('herochange'));
})();
