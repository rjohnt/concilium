/* v7 "Rises" — from the consensus ring, a tower assembles out of hundreds of
   blocks while persona lights orbit the build. Crane-up camera. */
(function () {
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  (function () {  // in-scene night gradient (post path composites opaque)
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 512;
    const g = cv.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#33271d"); gr.addColorStop(0.46, "#221810"); gr.addColorStop(1, "#0e0a06");
    g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
    scene.background = new THREE.CanvasTexture(cv);
  })();
  scene.fog = new THREE.Fog(0x191009, 10, 30);
  const camera = new THREE.PerspectiveCamera(36, 1920 / 1080, 0.1, 120);

  const SEATCOLORS = [0x1e9c86, 0x7a57d1, 0xd9962a, 0x2f82c7];
  const CORAL = 0xe85d34;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(770611);

  scene.environment = CPOST.createEnvironment(renderer, "night");

  /* ---- ground + consensus ring ------------------------------------ */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(16, 72),
    new THREE.MeshStandardMaterial({ color: 0x241910, roughness: 0.92, metalness: 0.02 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a20, emissive: CORAL, emissiveIntensity: 1.0, roughness: 0.35, metalness: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.07, 24, 160), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  scene.add(ring);
  const ringGlow = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.95, 96),
    new THREE.MeshBasicMaterial({ color: CORAL, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ringGlow.rotation.x = -Math.PI / 2;
  ringGlow.position.y = 0.03;
  scene.add(ringGlow);

  /* ---- the tower: instanced blocks --------------------------------- */
  const LEVELS = 16, FOOT = 3, S = 0.66, GAP = 0.05;
  const blocks = [];      // {x,y,z, delay, glowIdx|-1}
  const glowBlocks = [];  // persona-emissive accents
  for (let ly = 0; ly < LEVELS; ly++) {
    // footprint shrinks twice as it rises: 3x3 → 2x2 (top third) for a stepped silhouette
    const fp = ly < 10 ? FOOT : 2;
    const off = ((fp - 1) * (S + GAP)) / 2;
    for (let ix = 0; ix < fp; ix++) {
      for (let iz = 0; iz < fp; iz++) {
        const x = ix * (S + GAP) - off;
        const z = iz * (S + GAP) - off;
        const y = ly * (S + GAP) + S / 2 + 0.06;
        const delay = ly * 0.55 + rand() * 0.5;
        const ci = Math.floor(rand() * 4);        // every block belongs to a role
        const shade = 0.82 + rand() * 0.34;       // deterministic tonal variety
        if (rand() < 0.16 && glowBlocks.length < 22) {
          glowBlocks.push({ x, y, z, delay, c: SEATCOLORS[ci] });
        } else {
          blocks.push({ x, y, z, delay, ci, shade });
        }
      }
    }
  }
  const blockGeo = new THREE.BoxGeometry(S, S, S);
  // white base material — per-instance colors carry the four persona hues
  const blockMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.06, clearcoat: 0.5, clearcoatRoughness: 0.35 });
  const inst = new THREE.InstancedMesh(blockGeo, blockMat, blocks.length);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const cTmp = new THREE.Color();
  blocks.forEach((b, i) => {
    cTmp.setHex(SEATCOLORS[b.ci]).multiplyScalar(b.shade);
    inst.setColorAt(i, cTmp);
  });
  inst.instanceColor.needsUpdate = true;
  scene.add(inst);
  const dummy = new THREE.Object3D();

  const glowMeshes = glowBlocks.map((b) => {
    const m = new THREE.Mesh(blockGeo, new THREE.MeshStandardMaterial({
      color: b.c, emissive: b.c, emissiveIntensity: 0.85, roughness: 0.4, metalness: 0.05 }));
    scene.add(m);
    return m;
  });

  /* ---- four orbiting "crane" lights --------------------------------- */
  const cranes = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20),
      new THREE.MeshStandardMaterial({ color: SEATCOLORS[i], emissive: SEATCOLORS[i], emissiveIntensity: 2.2, roughness: 0.3 }));
    g.add(orb);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshBasicMaterial({ color: SEATCOLORS[i], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(tail);
    const lt = new THREE.PointLight(SEATCOLORS[i], 1.0, 7);
    g.add(lt);
    scene.add(g);
    cranes.push({ g, ph: (i * Math.PI) / 2 });
  }

  /* ---- summit beacon ------------------------------------------------ */
  const TOWER_TOP = LEVELS * (S + GAP) + 0.1;
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.5, 3.0, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc39a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beacon.position.y = TOWER_TOP + 1.4;
  scene.add(beacon);

  /* ---- motes / sky dust --------------------------------------------- */
  const COUNT = 150;
  const pos = new Float32Array(COUNT * 3);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    const r = 2.5 + rand() * 9, th = rand() * Math.PI * 2;
    pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = rand() * 12; pos[i * 3 + 2] = Math.sin(th) * r;
    seeds.push({ r, th, h: pos[i * 3 + 1], sp: 0.04 + rand() * 0.08, ph: rand() * 6.28 });
  }
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(mgeo, new THREE.PointsMaterial({
    color: 0xffd9b8, size: 0.05, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false })));
  const moteSeeds = seeds, moteGeo = mgeo;

  /* ---- lights -------------------------------------------------------- */
  const hemi = new THREE.HemisphereLight(0xffe6cf, 0x140d08, 0.42);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe9d2, 0.85);
  key.position.set(6, 10, 4);
  scene.add(key);
  const coralUp = new THREE.PointLight(CORAL, 2.2, 9);
  coralUp.position.set(0, 0.4, 0);
  scene.add(coralUp);

  /* ---- build timing --------------------------------------------------
     blocks rise during [3.5 .. 15]; consensus flare 15.5; beacon 16+   */
  const BUILD0 = 3.5, BUILD_SPAN = 11.0;
  const maxDelay = LEVELS * 0.55 + 0.5;

  function blockY(b, t) {
    const k = smooth(BUILD0 + (b.delay / maxDelay) * BUILD_SPAN,
                     BUILD0 + (b.delay / maxDelay) * BUILD_SPAN + 0.85, t);
    if (k <= 0) return null;             // not yet spawned
    const over = 1 + Math.sin(k * Math.PI) * 0.06;
    return { y: lerp(b.y - 2.2, b.y, k) * over, k };
  }

  /* ---- camera shots ---------------------------------------------------
     S1 [0–3.5]   god view, looking straight down at the glowing ring
     S2 [3.5–15]  crane-up spiral riding alongside the build front
     S3 [15–19]   sweep out to a low hero wide as the beacon fires
     S4 [19–24]   slow majestic pull-back (lockup overlays)            */
  function camAt(t) {
    if (t < 3.5) {
      const k = smooth(0, 3.5, t);
      camera.position.set(lerp(0.01, 1.6, k), lerp(13, 9.5, k), lerp(0.01, 2.2, k));
      camera.lookAt(0, 0, 0);
    } else if (t < 15) {
      const u = (t - 3.5) / 11.5;
      const a = -0.6 + u * 2.6;
      const buildFront = clamp(u * TOWER_TOP * 1.05, 0.8, TOWER_TOP);
      camera.position.set(Math.cos(a) * 7.6, buildFront + 1.4, Math.sin(a) * 7.6);
      camera.lookAt(0, buildFront * 0.75, 0);
    } else if (t < 19) {
      const k = smooth(15, 19, t);
      const a = 2.0 + k * 0.7;
      camera.position.set(
        Math.cos(a) * lerp(7.6, 22.5, k),
        lerp(TOWER_TOP + 1.4, 6.6, k),
        Math.sin(a) * lerp(7.6, 22.5, k));
      camera.lookAt(0, lerp(TOWER_TOP * 0.75, TOWER_TOP * 0.46, k), 0);
    } else {
      const k = (t - 19) * 0.05;
      const a = 2.7 + k * 0.5;
      camera.position.set(Math.cos(a) * (22.5 + k * 5), 6.6 + k * 1.4, Math.sin(a) * (22.5 + k * 5));
      camera.lookAt(0, TOWER_TOP * 0.46, 0);
    }
  }

  function renderAt(t) {
    camAt(t);

    // blocks assemble
    let placed = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const st = blockY(b, t);
      if (!st) { dummy.position.set(b.x, -50, b.z); dummy.scale.setScalar(0.001); }
      else {
        dummy.position.set(b.x, st.y, b.z);
        dummy.scale.setScalar(0.2 + st.k * 0.8);
        if (st.k >= 1) placed++;
      }
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;

    glowMeshes.forEach((m, i) => {
      const b = glowBlocks[i];
      const st = blockY(b, t);
      if (!st) { m.position.set(b.x, -50, b.z); m.scale.setScalar(0.001); }
      else { m.position.set(b.x, st.y, b.z); m.scale.setScalar(0.2 + st.k * 0.8); }
      m.material.emissiveIntensity = 0.85 + Math.sin(t * 2.2 + i) * 0.18;
    });

    // crane lights spiral up with the build front
    const u = clamp((t - BUILD0) / BUILD_SPAN, 0, 1);
    const craneH = lerp(0.7, TOWER_TOP + 0.6, u);
    cranes.forEach((c, i) => {
      const a = c.ph + t * (0.9 - i * 0.07);
      const r = 3.4 + Math.sin(t * 0.7 + i) * 0.35;
      c.g.position.set(Math.cos(a) * r, craneH + Math.sin(t * 1.3 + i) * 0.4, Math.sin(a) * r);
      const off = smooth(17.5, 19.5, t); // cranes retire after the build
      c.g.scale.setScalar(1 - off * 0.999 + 0.001);
    });

    // consensus flare + beacon at completion
    const done = smooth(14.5, 16.0, t);
    ringMat.emissiveIntensity = 1.0 + done * 2.2 + Math.sin(t * 5) * 0.12 * done;
    ringGlow.material.opacity = 0.18 + done * 0.3;
    beacon.material.opacity = smooth(15.6, 17.0, t) * 0.28 * (1 + Math.sin(t * 3.4) * 0.15);
    beacon.scale.set(1 + done * 0.2, 1, 1 + done * 0.2);
    hemi.intensity = 0.42 + done * 0.5;
    coralUp.intensity = 2.2 + done * 4;

    // motes
    const mp = moteGeo.attributes.position;
    for (let i = 0; i < moteSeeds.length; i++) {
      const s = moteSeeds[i], th = s.th + t * s.sp;
      mp.array[i * 3] = Math.cos(th) * s.r;
      mp.array[i * 3 + 1] = s.h + Math.sin(t * 0.4 + s.ph) * 0.25;
      mp.array[i * 3 + 2] = Math.sin(th) * s.r;
    }
    mp.needsUpdate = true;

    // gentle dim under the endcard (lockup overlays at ~19.4)
    const fade = smooth(19.4, 21.0, t);
    renderer.toneMappingExposure = (1.0 + done * 0.15) * lerp(1, 0.34, fade);

    post.render(t);
  }

  const post = CPOST.create(renderer, scene, camera, {
    threshold: 0.6, knee: 0.28, strengthH: 0.8, strengthQ: 0.75,
    vignette: 0.34, grain: 0.026, ca: 0.09,
  });

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
