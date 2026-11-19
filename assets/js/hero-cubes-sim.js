/* Physics for the hero cube piles (module worker). Rapier rigid bodies: every cube is dropped with its own spin,
   collides, rolls and slides, and the piles settle at their natural angle. Simulated once, faster than real time,
   at a fixed 1/120s step from a seeded random source, so the result is identical on every run. Frames are recorded
   at 30Hz and posted in chunks as they are ready: [x, y, z, qx, qy, qz, qw] per cube per frame. A cube's landing
   time is its first hard impact (its fall is stopped). */
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs';

onmessage = async (e) => {
  const { drops, end, sites, seed0, drop } = e.data;        /* drops: [spawnTime, site] in spawn order */
  await RAPIER.init();
  let seed = seed0 | 0;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const G = drop.g, DT = 1 / 120, HZ = 30, STEP_PER_FRAME = 120 / HZ;   /* fine steps keep stacks stable */
  const world = new RAPIER.World({ x: 0, y: -G, z: 0 });
  world.timestep = DT;
  world.numSolverIterations = 8;
  world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0).setFriction(2).setRestitution(0));

  const n = drops.length, HALF = 0.28, ROUND = 0.15;  /* collider = 0.86 cube with well-rounded edges, like the mesh */
  const bodies = new Array(n).fill(null), vyPrev = new Float32Array(n), landT = new Float32Array(n).fill(Infinity);
  /* spawn slots: a golden-angle disc per site, so cubes released close together don't overlap */
  const slots = sites.map((s) => { const a = []; for (let k = 0; k < s.slots; k++) { const r = s.r * Math.sqrt((k + 0.5) / s.slots), th = k * 2.39996; a.push([s.x + r * Math.cos(th), r * Math.sin(th)]); } return a; });
  const slotI = sites.map(() => 0);

  const frames = Math.floor(end * HZ) + 1;
  let next = 0, step = 0, frame = 0, chunk = [], chunkFrom = 0;
  const record = () => {
    const f = new Float32Array(n * 7);
    for (let k = 0; k < n; k++) {
      const b = bodies[k], o = k * 7;
      if (!b) { f[o + 1] = -100; f[o + 6] = 1; continue; }
      const p = b.translation(), q = b.rotation();
      f[o] = p.x; f[o + 1] = p.y; f[o + 2] = p.z; f[o + 3] = q.x; f[o + 4] = q.y; f[o + 5] = q.z; f[o + 6] = q.w;
    }
    chunk.push(f);
  };
  const flush = (done) => {
    if (!chunk.length && !done) return;
    const buf = new Float32Array(chunk.length * n * 7); chunk.forEach((f, i) => buf.set(f, i * n * 7));
    postMessage({ from: chunkFrom, count: chunk.length, data: buf, landT: landT.slice(), done }, [buf.buffer]);
    chunkFrom += chunk.length; chunk = [];
  };

  record(); frame = 1;                                 /* frame f is time f / HZ */
  while (frame < frames) {
    const t = step * DT;
    while (next < n && drops[next][0] <= t) {          /* release the cubes due now */
      const s = drops[next][1], sl = slots[s][slotI[s]++ % slots[s].length];
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, w = Math.sqrt(1 - u * u), ang = rnd() * Math.PI;   /* random orientation */
      const sa = Math.sin(ang / 2);
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(sl[0] + (rnd() - 0.5) * 0.3, drop.y + rnd() * 1.0, sl[1] + (rnd() - 0.5) * 0.3)
        .setRotation({ x: w * Math.cos(th) * sa, y: u * sa, z: w * Math.sin(th) * sa, w: Math.cos(ang / 2) })
        .setLinvel((rnd() - 0.5) * 0.3, drop.v0, (rnd() - 0.5) * 0.3)
        .setAngvel({ x: (rnd() - 0.5) * 5, y: (rnd() - 0.5) * 5, z: (rnd() - 0.5) * 5 })
        .setAngularDamping(5).setLinearDamping(drop.damp)
        .setCcdEnabled(true));
      world.createCollider(RAPIER.ColliderDesc.roundCuboid(HALF, HALF, HALF, ROUND).setFriction(2).setRestitution(0.03).setDensity(1), body);
      bodies[next] = body; vyPrev[next] = drop.v0; next++;
    }
    world.step();
    step++;
    for (let k = 0; k < next; k++) {                   /* first hard impact = landing */
      if (landT[k] !== Infinity) continue;
      const vy = bodies[k].linvel().y;
      /* a hard impact, or a gentle arrival (stopped falling after being out for a while): every cube counts */
      if (vy - vyPrev[k] > 6 || (vy > -1.5 && step * DT - drops[k][0] > 0.3)) landT[k] = step * DT;
      vyPrev[k] = vy;
    }
    if (step % STEP_PER_FRAME === 0) { record(); frame++; if (chunk.length >= 15) flush(false); }
  }
  flush(true);
};
