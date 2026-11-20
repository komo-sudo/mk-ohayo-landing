/* Hero 1type: one cube per dollar (three.js). SK hynix up 4.8% on $1,000:
   shares make $48, a few cubes trickling into a small pile; OHAYO long 10x makes $480, cubes pour into a big pile
   beside it while the camera pulls back, and the two piles stay side by side for the contrast.

   Built to the ohayo-motion skill:
   - physics: real rigid bodies (Rapier, hero-cubes-sim.js in a worker). Each cube drops with its own spin, collides,
     rolls and slides; the piles settle at their natural angle, uneven like real grains. The simulation runs once,
     seeded and at a fixed step, so it is identical on every run; it is recorded at 30Hz and replayed.
   - time-driven: render(t) reads the recording (interpolated between frames); any moment can be sought with
     window.ohayoSeek.heroCubes(t). The clock waits if the simulation hasn't reached t yet (it runs ahead of
     real time in practice).
   - values drive visuals: the counters are the number of cubes that have hit the pile.
   - beats (0.5s, after a lead-in of one fall from above the frame): 1, 2 one cube each; 3 two cubes; 4-6 the
     shares trickle to $48; 8 the 10x slams in; 9-16 the pour (linear flow, short bend in); 17-19 it settles;
     21-25 a few top cubes breathe, then everything rests.
   - LED light: a cube lights up on impact (shares: grey-white, OHAYO: green) and fades over 450ms; the brightest
     few also spill their light onto neighbouring cubes and the floor. No bloom.
   - camera: a wide view on both piles that slowly orbits left to right (about 12 deg over the run, smoothstep);
     cubes are released above the top of the frame.
   - the physics engine (4MB) only loads when the 1type hero is shown; paused off screen, hidden with the 2type
     hero and on narrow screens, reduced motion shows the final state. Physical bouncing is an approved exception
     to the skill's "no bounce" rule. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.querySelector('.hero-cubes');
if (root) init(root);

function init(root) {
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const B = 0.5, HZ = 30;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const out = (x) => 1 - Math.pow(1 - x, 3);
  const css = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;

  /* ---------- schedule: when each cube should hit the pile; released one fall-time earlier ---------- */
  const SHARES = 48, OHAYO = 480;
  /* release: above the top of the frame; air drag caps the falling speed (~20 units/s at impact) */
  const DROP = { y: 28, v0: -4, g: 40, damp: 2 };
  let FALL = 0; { let y = DROP.y + 0.5, v = DROP.v0; const dt = 1 / 120; while (y > 2) { v -= DROP.g * dt; v /= 1 + dt * DROP.damp; y += v * dt; FALL += dt; } }
  const LEAD = Math.ceil(FALL / B) * B;               /* the timeline starts one fall earlier, so beat 1's cube is released at t = 0 */
  const hits = [];                                    /* [time, site] */
  [B, 2 * B, 3 * B, 3.5 * B].forEach((t) => hits.push([LEAD + t, 0]));   /* beats 1, 2, 3 (two) */
  for (let k = 1; k <= SHARES - 4; k++) hits.push([LEAD + 4 * B + 1.35 * Math.sqrt(k / (SHARES - 4)), 0]); /* trickle, denser */
  const SLAM = LEAD + 8 * B, POUR0 = LEAD + 9 * B, POUR1 = LEAD + 16.5 * B, BEND = 0.12, BREATHE = LEAD + 21 * B;
  const pourAt = (p) => {                             /* inverse of a linear flow with a short bend in */
    const c = 1 / (1 - BEND / 2), k = p / c < BEND / 2 ? Math.sqrt(2 * BEND * p / c) : p / c + BEND / 2;
    return POUR0 + (POUR1 - POUR0) * k;
  };
  for (let k = 1; k <= OHAYO; k++) hits.push([pourAt(k / OHAYO), 1]);
  const END = LEAD + 26 * B, n = hits.length;
  const drops = hits.map(([t, s]) => [Math.max(0, t - FALL), s]);
  const site = hits.map((h) => h[1]);
  const SITES = [{ x: -10, r: 0.25, slots: 7 }, { x: 5, r: 0.5, slots: 19 }];

  /* ---------- recording from the physics worker ---------- */
  const frames = [];                                  /* Float32Array(n * 7) per frame */
  let landT = new Float32Array(n).fill(Infinity), simDone = false, worker = null, tops = new Set();
  function startSim() {
    if (worker) return;
    worker = new Worker(new URL('./hero-cubes-sim.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { from, count, data, done } = e.data;
      for (let i = 0; i < count; i++) frames[from + i] = data.subarray(i * n * 7, (i + 1) * n * 7);
      landT = e.data.landT;
      if (done) {
        simDone = true; worker.terminate();
        /* the 5 highest OHAYO cubes at rest breathe at the end */
        const last = frames[frames.length - 1];
        tops = new Set([...Array(n).keys()].filter((k) => site[k] === 1).sort((a, b) => last[b * 7 + 1] - last[a * 7 + 1]).slice(0, 5));
      }
      if (waiting) { waiting = false; if (pendingSeek != null) { const s = pendingSeek; pendingSeek = null; seekTo(s); } else run(); }
    };
    worker.postMessage({ drops, end: END, sites: SITES, seed0: 7, drop: DROP });
  }
  const ready = (t) => frames[Math.min(Math.floor(END * HZ), Math.ceil(t * HZ))] !== undefined;

  /* ---------- three.js scene ---------- */
  const canvas = root.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;   /* soft, blurred penumbras */
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.15;   /* filmic roll-off instead of a hard clip */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  /* light: the overhead pool is the key (and casts the shadows); a cool rim from behind-left draws the cubes'
     outlines against the dark; a low ambient keeps the shadow sides from going dead flat */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x101010, 0.35));
  const rim = new THREE.DirectionalLight(0xdfe7ff, 1.8);
  rim.position.set(-16, 9, -24); scene.add(rim);
  /* ---------- the space: a near-black floor that fades into the page's black ---------- */
  scene.fog = new THREE.Fog(0x000000, 45, 110);                      /* the floor dissolves into black toward the horizon */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  /* floor grid: tiny unlit LED dots at the cubes' 1-unit pitch, for scale and depth */
  {
    const R = 60, dots = [], dot = new THREE.CircleGeometry(0.07, 12);
    dot.rotateX(-Math.PI / 2);
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) if (i * i + j * j <= R * R) dots.push([i - 1.5, j]);
    const grid = new THREE.InstancedMesh(dot, new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 }), dots.length);   /* lit like the floor, a step brighter */
    const gm = new THREE.Matrix4();
    dots.forEach(([x, z], k) => { gm.makeTranslation(x, 0.005, z); grid.setMatrixAt(k, gm); });
    scene.add(grid);
  }
  /* a soft overhead pool of light on the piles; everything around it falls off into the dark */
  const pool = new THREE.SpotLight(0xffffff, 420, 70, 0.55, 1, 1.6);
  pool.position.set(-1.5, 34, 4); pool.target.position.set(-1.5, 0, 0);
  pool.castShadow = true; pool.shadow.mapSize.set(2048, 2048); pool.shadow.camera.near = 14; pool.shadow.camera.far = 50;
  pool.shadow.radius = 10; pool.shadow.blurSamples = 10; pool.shadow.bias = -0.0004;   /* one light, one set of soft shadows */
  scene.add(pool, pool.target);

  const mesh_tones = [];
  const geo = new RoundedBoxGeometry(0.86, 0.86, 0.86, 3, 0.21);   /* matches the physics collider (rounded 0.21) */
  const glow = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  geo.setAttribute('aGlow', glow);
  /* near-black matte, shaded by real light only. A soft studio environment (cubes only, the floor stays black)
     keeps the faces apart. Each cube varies a little in tone and roughness, as real objects do. */
  const envMap = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.85, metalness: 0, envMap, envMapIntensity: 0.3 });
  const rough = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  geo.setAttribute('aRough', rough);
  {
    let sd = 11; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let k = 0; k < n; k++) { const v = 0.78 + r() * 0.44; mesh_tones.push(v); rough.setX(k, 0.82 + r() * 0.3); }
  }
  mat.onBeforeCompile = (sh) => {                     /* LED: per-cube emissive colour; per-cube roughness */
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aGlow;\nvarying vec3 vGlow;\nattribute float aRough;\nvarying float vRough;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;\nvRough = aRough;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGlow;\nvarying float vRough;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * vRough, 0.3, 1.0);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow;\ndiffuseColor.rgb = mix(diffuseColor.rgb, vGlow, clamp(max(vGlow.r, max(vGlow.g, vGlow.b)), 0.0, 1.0));');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  { const c = new THREE.Color(); mesh_tones.forEach((v, k) => mesh.setColorAt(k, c.setRGB(v, v, v))); }
  scene.add(mesh);
  /* floor typography: each pile's return, painted on the ground in front of it and facing the camera, so the floor
     itself shows the contrast. Driven by the piles: each cube is $1 on $1,000 = +0.1%, so the shares read +4.8%
     when their 48th cube lands and OHAYO reads +48.0% at its 480th. Lit like the floor (shadows and the LED spill
     fall across them), faded by the same fog. */
  const POS = css('--fg-positive', '#11ec8a'), PRI = css('--fg-primary', '#ff5a00');
  const RIGHT = new THREE.Vector3(Math.cos(-0.62), 0, -Math.sin(-0.62));   /* screen-right along the floor */
  function floorType(o) {
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024;
    const cx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(o.width, o.width * 1024 / 2048), mat);
    plane.rotation.x = -Math.PI / 2; plane.receiveShadow = true;
    const group = new THREE.Group(); group.add(plane);
    group.position.copy(o.at); group.rotation.y = -0.62;                   /* square to the camera */
    scene.add(group);
    let shown = null;
    return {
      mat, group,
      paint(usd, force) {                                                /* amount on $1,000; the return is amount / 10 % */
        const txt = '+$' + usd, pct = '+' + (usd / 10).toFixed(1) + '%';
        if (txt === shown && !force) return; shown = txt;
        cx.clearRect(0, 0, 2048, 1024);
        cx.textBaseline = 'alphabetic'; cx.textAlign = 'left';
        const font = (w, px) => w + ' ' + px + 'px "Pretendard Variable", Pretendard, Inter, sans-serif';
        cx.font = font(800, 470); const big = Math.min(470, Math.floor(470 * 2000 / cx.measureText(o.sample).width));   /* sized to the widest value */
        cx.fillStyle = POS; cx.globalAlpha = o.alpha; cx.font = font(800, big);
        cx.fillText(txt, 0, big * 0.98);                                 /* the amount, large */
        cx.globalAlpha = o.alpha * 0.8; cx.font = font(700, Math.round(big * 0.46));
        cx.fillText(pct, 10, big * 0.98 + big * 0.5);                    /* the return under it */
        cx.globalAlpha = 1; cx.fillStyle = o.capColor; cx.font = '700 118px Doto, "Courier New", monospace';
        cx.fillText(o.cap, 20, Math.min(1010, big * 1.48 + 150));       /* caption on the camera side, clear of the piles */
        tex.needsUpdate = true;
      }
    };
  }
  const TOWARD = new THREE.Vector3(Math.sin(-0.62), 0, Math.cos(-0.62));  /* toward the camera along the floor */
  const base = new THREE.Vector3(-1.5, 0.012, 10.5).addScaledVector(TOWARD, 2.5);
  const floorS = floorType({ width: 9, at: base.clone().addScaledVector(RIGHT, -9.5), sample: '+$48', cap: 'SK HYNIX · SHARES', capColor: 'rgba(255,255,255,0.3)', alpha: 0.4 });
  const floorU = floorType({ width: 13.5, at: base.clone().addScaledVector(RIGHT, 2.5), sample: '+$480', cap: 'OHAYO · LONG 10x', capColor: 'rgba(255,90,0,0.55)', alpha: 0.5 });
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('800 100px "Pretendard Variable"'), document.fonts.load('600 40px Doto')]).then(() => { floorS.paint(0, true); floorU.paint(0, true); });
  /* contact shading: ground-truth ambient occlusion darkens the gaps between cubes and where they meet the floor */
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));   /* MSAA, so edges stay clean through post-processing */
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1, undefined, { radius: 0.9, distanceExponent: 1.4, thickness: 1, scale: 1.2, samples: 8 });
  gtao.blendIntensity = 1;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  const LED = [new THREE.Color(css('--fg-subtle', '#b0b0b0')), new THREE.Color(css('--fg-positive', '#11ec8a'))];
  /* light spill: the brightest just-landed cubes become small lights that tint their neighbours and the floor,
     then go out with them. A fixed set of lights (always in the scene, intensity 0 when idle) so shaders never
     recompile; no bloom, the light only lands on surfaces. */
  const SPILL = 8, SPILL_I = 22, spills = [];
  for (let i = 0; i < SPILL; i++) { const l = new THREE.PointLight(0xffffff, 0, 6, 2); scene.add(l); spills.push(l); }
  const hot = [];                                    /* [glow, x, y, z, site] of cubes lit this frame */

  /* ---------- labels (DOM) ---------- */
  const x10 = root.querySelector('.hc-x');

  /* ---------- camera: a wide view on both piles that slowly orbits left to right ---------- */
  const AZ = -0.62, SWING = 0.1, EL = 0.42, DIST = 59, tgt = new THREE.Vector3(-1.5, 2.0, 0);
  function cameraAt(t) {                             /* +-0.1 rad (about 12 deg in all) over the whole run, smoothstep: starts and ends at rest */
    const k = clamp(t / END), az = AZ + SWING * (2 * k * k * (3 - 2 * k) - 1);
    camera.position.set(tgt.x + DIST * Math.cos(EL) * Math.sin(az), tgt.y + DIST * Math.sin(EL), tgt.z + DIST * Math.cos(EL) * Math.cos(az));
    camera.lookAt(tgt);
  }
  cameraAt(0);

  /* ---------- layout ---------- */
  let W = 0, Hh = 0, prCap = 1.5;
  function layout() {
    W = root.clientWidth; Hh = root.clientHeight;
    if (!W || !Hh) return false;
    const pr = Math.min(prCap, window.devicePixelRatio || 1);          /* sharp with MSAA; prCap steps down only if frames run slow */
    renderer.setPixelRatio(pr); renderer.setSize(W, Hh, false);
    composer.setPixelRatio(pr); composer.setSize(W, Hh);
    gtao.setSize(Math.round(W * pr / 2), Math.round(Hh * pr / 2));    /* the AO alone at half resolution: it is soft anyway, and the costliest pass */
    camera.aspect = W / Hh;
    camera.setViewOffset(W, Hh, -W * 0.01, Hh * 0.04, W, Hh);         /* both piles sit around the middle of the screen */
    camera.updateProjectionMatrix();
    return true;
  }
  const v3 = new THREE.Vector3();
  function project(x, y, z) { v3.set(x, y, z).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * Hh]; }
  const landedBy = (s, t) => { let c = 0; for (let k = 0; k < n; k++) if (site[k] === s && landT[k] <= t) c++; return c; };

  /* ---------- render(t) ---------- */
  const m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3();
  function render(t) {
    cameraAt(t);
    /* floor type first, so its textures are current in this frame */
    floorS.paint(landedBy(0, t)); floorU.paint(landedBy(1, t));          /* $1 per cube */
    floorS.mat.opacity = out(clamp((t - (LEAD + B)) / 0.3));
    floorU.mat.opacity = out(clamp((t - (SLAM + B)) / 0.3));
    const ft = Math.min(END * HZ, t * HZ), f0 = Math.floor(ft), f1 = Math.min(f0 + 1, frames.length - 1), a = ft - f0;
    const A = frames[f0], Bf = frames[f1] || A;
    const topY = [0, 0]; hot.length = 0;
    for (let k = 0; k < n; k++) {
      const o = k * 7;
      if (A[o + 1] < -50 || Bf[o + 1] < -50) { m4.compose(pos.set(0, -100, 0), qa.identity(), zero); mesh.setMatrixAt(k, m4); glow.setXYZ(k, 0, 0, 0); continue; }
      pos.set(A[o] + (Bf[o] - A[o]) * a, A[o + 1] + (Bf[o + 1] - A[o + 1]) * a, A[o + 2] + (Bf[o + 2] - A[o + 2]) * a);
      qa.set(A[o + 3], A[o + 4], A[o + 5], A[o + 6]); qb.set(Bf[o + 3], Bf[o + 4], Bf[o + 5], Bf[o + 6]); qa.slerp(qb, a);
      m4.compose(pos, qa, one); mesh.setMatrixAt(k, m4);
      const d = t - landT[k];
      if (d >= 0 && pos.y > topY[site[k]]) topY[site[k]] = pos.y;
      let g = d >= 0 && d < 0.45 ? 1 - out(d / 0.45) : 0;                           /* lights on impact */
      if (tops.has(k) && t > BREATHE) g = Math.max(g, 0.45 * Math.sin(Math.PI * clamp((t - BREATHE) / (4 * B))) * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t - BREATHE) / 1.6)));
      const col = LED[site[k]]; glow.setXYZ(k, col.r * g, col.g * g, col.b * g);
      if (g > 0.05) hot.push([g, pos.x, pos.y, pos.z, site[k]]);
    }
    mesh.instanceMatrix.needsUpdate = true; glow.needsUpdate = true;
    hot.sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < SPILL; i++) {
      const h = hot[i], l = spills[i];
      if (!h) { l.intensity = 0; continue; }
      l.color.copy(LED[h[4]]); l.position.set(h[1], h[2] + 0.2, h[3]);
      l.intensity = SPILL_I * h[0] * (h[4] ? 1 : 0.5);              /* shares glow dimmer than OHAYO's green */
    }
    composer.render();

    /* the amounts live on the floor plates now; only the 10x hangs over the OHAYO pile. It slams in on beat 8
       above where the pile will grow, then rides on the pile's top */
    const [ux, uy] = project(SITES[1].x, topY[1] + 1.3, 0);
    root.dataset.count = landedBy(0, t) + ',' + landedBy(1, t);              /* for checks: landed shares, OHAYO */
    const p5 = clamp((t - SLAM) / 0.4), e5 = out(p5);
    x10.style.opacity = out(clamp((t - SLAM) / 0.15));
    x10.style.transform = `translate(${ux.toFixed(1)}px, ${uy.toFixed(1)}px) translate(-50%, -100%) scale(${(1 + 0.8 * (1 - e5)).toFixed(3)})`;
    x10.style.filter = p5 > 0 && p5 < 1 ? `blur(${(6 * (1 - e5)).toFixed(2)}px)` : 'none';
  }

  /* ---------- clock: plays once when shown, pauses off screen, waits for the simulation ---------- */
  let raf = null, acc = 0, last = 0, visible = false, waiting = false, pendingSeek = null, slow = 0, avg = 0;
  const hidden = () => document.body.classList.contains('hero-2type') || document.body.classList.contains('hero-3type') || !root.clientWidth;
  function loop(ts) {
    const step = last ? (ts - last) / 1000 : 0; last = ts;
    /* adaptive resolution: when the running average frame time stays above 17ms (under 60fps), step the render
       ratio down by 0.25, never below 1; 30 frames to settle after each step */
    if (step > 0 && step < 0.1) { avg = avg ? avg * 0.9 + step * 0.1 : step; slow++; }
    if (slow > 30 && avg > 0.017 && prCap > 1) { prCap = Math.max(1, prCap - 0.25); slow = 0; avg = 0; layout(); }
    if (!ready(Math.min(acc + step, END))) { raf = null; waiting = true; return; }   /* resumes on the next chunk */
    acc = Math.min(END, acc + step); render(acc);
    raf = acc < END ? requestAnimationFrame(loop) : null;
  }
  function run() { if (raf || !visible || hidden() || acc >= END) return; if (!ready(acc)) { waiting = true; return; } last = 0; raf = requestAnimationFrame(loop); }
  function halt() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function restart() {
    halt(); acc = 0;
    if (hidden() || !layout()) return;
    startSim();
    if (noMotion) { seekTo(END); return; }
    run();
  }
  function seekTo(t) { halt(); acc = END; layout(); if ((simDone || ready(t)) && frames.length) render(t); else { pendingSeek = t; waiting = true; } }
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) run(); else halt(); }).observe(root);
  document.addEventListener('herochange', () => requestAnimationFrame(restart));
  window.addEventListener('resize', () => { if (!hidden() && layout() && frames.length) render(Math.min(acc, END)); });
  window.ohayoSeek = window.ohayoSeek || {};
  window.ohayoSeek.heroCubes = (t) => { startSim(); seekTo(t); };
  restart();
}
