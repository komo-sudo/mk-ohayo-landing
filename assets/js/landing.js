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

  /* TradeView mock: pick someone, step through their trades on the chart, read why, react. Sample data. */
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
      b.innerHTML = '<span class="av">' + t.ini + '</span><span><b>' + t.name + '</b><small>' + t.tag + ' · ' + t.pos.split(' · ')[0] + ' · ' + t.fol.toLocaleString('en-US') + ' followers</small></span><span><span class="led up">' + t.pnl + '</span><small>30D</small></span>';
      b.addEventListener('click', function () { tvS.who = idx; tvS.fill = 0; tvRows(filter); tvPaint(); });
      box.appendChild(b);
    });
  }
  function tvPaint() {
    var t = tvData[tvS.who], f = t.fills[tvS.fill], W = 560, H = 190, P = 22;
    var lo = Math.min.apply(null, t.path) - 0.8, hi = Math.max.apply(null, t.path) + 0.8;
    var X = function (i) { return P + i / (t.path.length - 1) * (W - 2 * P); }, Y = function (v) { return P + (hi - v) / (hi - lo) * (H - 2 * P); };
    var line = t.path.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
    var svg = '<line x1="0" x2="' + W + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="#404040" stroke-dasharray="4 4"/>' +
      '<polyline points="' + line + '" fill="none" stroke="#b0b0b0" stroke-width="2" stroke-linejoin="round"/>';
    t.fills.forEach(function (m, k) {
      var buy = m.side === 'BUY', col = buy ? '#11ec8a' : '#ff4b4e', sel = k === tvS.fill;
      svg += '<g class="mk" data-k="' + k + '" transform="translate(' + X(m.i).toFixed(1) + ',' + Y(t.path[m.i]).toFixed(1) + ')">' +
        (sel ? '<circle r="17" fill="none" stroke="#fafafa" stroke-width="2"/>' : '') +
        '<circle r="12" fill="' + col + '"/><text y="5" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#050505">' + (buy ? '+' : '−') + '</text></g>';
    });
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

  /* Spotlight: a good day moves you up the board, people follow, OHAYO calls. Sample. */
  var spOn = false, spTimer = null;
  function lbPaint() {
    var rows = spOn
      ? [['#1', 'night_owl', '+212%'], ['#2', 'you', '+196%'], ['#3', 'Chip Whale', '+188%'], ['#4', 'mina_k', '+141%'], ['#5', 'soxl_sam', '+118%'], ['#6', 'dip_buyer', '+97%']]
      : [['#1', 'night_owl', '+212%'], ['#2', 'Chip Whale', '+188%'], ['#3', 'mina_k', '+141%'], ['#4', 'soxl_sam', '+118%'], ['#5', 'dip_buyer', '+97%'], ['#14', 'you', '+12%']];
    $('lb').innerHTML = rows.map(function (r) {
      var me = r[1] === 'you';
      return '<div class="lb-row' + (me ? ' you' + (spOn ? ' lit' : '') : '') + '"><span class="led">' + r[0] + '</span><span>' + (me ? 'You' + (spOn ? '<span class="tagx">SPOTLIGHT</span>' : '') : r[1]) + '</span><span class="led up">' + r[2] + '</span></div>';
    }).join('');
    $('sp-btn').textContent = spOn ? 'Start over' : 'Have a great trading day';
  }
  $('sp-btn').addEventListener('click', function () {
    spOn = !spOn; lbPaint();
    if (spTimer) { clearInterval(spTimer); spTimer = null; }
    $('sp2').className = 'card sp-step' + (spOn ? ' on' : ''); $('sp3').className = 'card sp-step';
    if (!spOn) { $('sp-fol').textContent = '12'; return; }
    var n = 12;
    spTimer = setInterval(function () {
      n = Math.min(1284, n + 97); $('sp-fol').textContent = n.toLocaleString('en-US');
      if (n >= 1284) { clearInterval(spTimer); spTimer = null; $('sp3').className = 'card sp-step on'; }
    }, 90);
  });
  lbPaint();

  /* Section scrolling */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  all('[data-scroll]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var target = $(el.getAttribute('data-scroll'));
      if (!target) return;
      var y = target.getBoundingClientRect().top + window.pageYOffset - 64;
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
    var prog = live ? '<div class="tc-prog"><div class="row"><small>Time played</small><small>' + progSample[i % 3] + '%</small></div><div class="track"><div class="bar" style="width:' + progSample[i % 3] + '%"></div></div></div>'
      : (t.status === 'flag' ? '<div class="tc-prog"><div class="row"><small>Prize unlock</small><small>up to $500,000</small></div><div class="track"><div class="bar" style="width:20%"></div></div></div>' : '');
    return '<article class="tcard">' +
      '<div class="tc-status"><span class="st st-' + t.status + '"><i></i>' + stText[t.status] + '</span><span class="badge">' + t.len + '</span></div>' +
      '<div class="tc-title"><span class="av">' + esc(ini) + '</span><div><b>' + esc(t.name) + '</b><small>Hosted by ' + esc(t.host) + (t.note ? ' · ' + esc(t.note) : '') + '</small></div></div>' +
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
    if (!v || !(max > 0)) return;
    function apply() { if (app) app.setZoom(Math.max(1, Math.min(max, (v.clientWidth / 2 - 24) / 540))); }
    var t = setInterval(function () {
      if (v._loaded && v._spline && typeof v._spline.setZoom === 'function') { app = v._spline; apply(); clearInterval(t); }
      else if (++tries > 150) clearInterval(t);
    }, 200);
    window.addEventListener('resize', apply);
    /* Wheel over the scene scrolls the page only: stop the event at the viewer host (capture) so Spline's camera never sees it.
       No preventDefault, so the page still scrolls. */
    v.addEventListener('wheel', function (e) { e.stopPropagation(); }, { capture: true, passive: true });
  })();

  var pcards = $('pcards'), flipT = null;
  if (pcards) pcards.addEventListener('click', function () { if (flipT) { clearInterval(flipT); flipT = null; } this.classList.toggle('swap'); });
  if (pcards && !noMotion) flipT = setInterval(function () { if (!document.hidden && !$('hero-a').hidden && !pcards.matches(':hover')) pcards.classList.toggle('swap'); }, 5000);

  /* Hero B (team vote): the same move at your broker and here, on an up day and a down day */
  var hbData = [
    { them: '+$48', themNeg: false, us: '+$482', x: '×10', label: 'OHAYO · LONG 10x', cols: 10, rows: 10 },
    { them: '−$31', themNeg: true, us: '+$620', x: 'SHORT ×20', label: 'OHAYO · SHORT 20x', cols: 10, rows: 20 }
  ];
  var hbBtns = all('[data-hb]');
  function hbPaint(i) {
    var d = hbData[i], t = $('hb-dots-them'), u = $('hb-dots-us');
    $('hb-them').textContent = d.them; $('hb-them').style.color = d.themNeg ? 'var(--fg-negative)' : 'var(--fg-subtle)';
    t.style.setProperty('--cols', 5); t.style.setProperty('--rows', 2); t.style.color = d.themNeg ? 'var(--fg-negative)' : '';
    $('hb-us').textContent = d.us; $('hb-x').textContent = d.x; $('hb-label').textContent = d.label;
    u.style.setProperty('--cols', d.cols); u.style.setProperty('--rows', d.rows);
  }
  hbBtns.forEach(function (b) { b.addEventListener('click', function () { press(hbBtns, b); hbPaint(Number(b.getAttribute('data-hb'))); }); });
  hbPaint(0);

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
      $('hero-a').hidden = isB; $('hero-b').hidden = !isB;
      $('headline').textContent = heads[h];
      press(hBtns, hBtns.filter(function (x) { return x.getAttribute('data-h') === h; })[0]);
    });
  });
  $('notes-btn').addEventListener('click', function () { var on = !document.body.classList.contains('notes'); document.body.classList.toggle('notes', on); this.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  $('preview-x').addEventListener('click', function () { $('preview').hidden = true; });
  /* Preview controls (headline A-D, hero A/B, designer notes) only show with ?preview=1 */
  if (/[?&]preview=1/.test(location.search)) { $('preview').hidden = false; }
})();
