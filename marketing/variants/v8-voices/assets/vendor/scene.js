/* v8 "Voices" — a storm of persona-colored particles (a thousand opinions)
   resolves into the four seated council figures: chaos → consensus. */
(function () {
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x180f0a, 9, 24);
  const camera = new THREE.PerspectiveCamera(36, 1920 / 1080, 0.1, 100);

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
  const rand = mulberry32(880611);

  /* ---- particle system: swirl params + council-figure targets ------ */
  const N = 6000;
  const CHAIR_R = 2.62;
  const seatAngle = (i) => -Math.PI / 2 + (i * Math.PI) / 2;

  // local→world for a seat: rotate by (π/2 − a) then translate
  function seatTransform(i, lx, ly, lz) {
    const a = seatAngle(i);
    const ry = Math.PI / 2 - a;
    const wx = lx * Math.cos(ry) + lz * Math.sin(ry);
    const wz = -lx * Math.sin(ry) + lz * Math.cos(ry);
    return [wx + Math.cos(a) * CHAIR_R, ly, wz + Math.sin(a) * CHAIR_R];
  }
  // sample a point on a figure (body capsule r.235 half-h.16 at y.16; head r.2 at y.62)
  function sampleFigure(i) {
    const th = rand() * Math.PI * 2;
    if (rand() < 0.3) { // head
      const ph = Math.acos(2 * rand() - 1);
      return seatTransform(i,
        0.2 * Math.sin(ph) * Math.cos(th),
        0.62 + 0.2 * Math.cos(ph),
        -0.06 + 0.2 * Math.sin(ph) * Math.sin(th));
    }
    const v = rand();
    if (v < 0.62) { // cylinder side
      return seatTransform(i,
        0.235 * Math.cos(th),
        0.16 + lerp(-0.16, 0.16, rand()),
        -0.03 + 0.235 * Math.sin(th));
    }
    // hemispherical caps
    const top = v < 0.81 ? 1 : -1;
    const ph = Math.acos(rand()) * top;
    return seatTransform(i,
      0.235 * Math.sin(ph) * Math.cos(th),
      0.16 + top * 0.16 + 0.235 * Math.cos(ph) * top,
      -0.03 + 0.235 * Math.sin(ph) * Math.sin(th));
  }

  const swirl = [];        // per-particle orbit params
  const targets = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const morphAt = new Float32Array(N);
  const positions = new Float32Array(N * 3);
  const cTmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const g = i % 4;
    swirl.push({
      r: 1.6 + rand() * 3.4,
      tilt: (rand() - 0.5) * 1.1,
      h: -0.8 + rand() * 4.0,
      sp: (0.25 + rand() * 0.55) * (rand() < 0.5 ? 1 : -1),
      ph: rand() * Math.PI * 2,
      wob: 0.2 + rand() * 0.5,
    });
    const tp = sampleFigure(g);
    targets[i * 3] = tp[0]; targets[i * 3 + 1] = tp[1]; targets[i * 3 + 2] = tp[2];
    cTmp.setHex(SEATCOLORS[g]).multiplyScalar(0.9 + rand() * 0.5);
    colors[i * 3] = cTmp.r; colors[i * 3 + 1] = cTmp.g; colors[i * 3 + 2] = cTmp.b;
    morphAt[i] = 8.0 + rand() * 3.2;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pgeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const pts = new THREE.Points(pgeo, new THREE.PointsMaterial({
    size: 0.085, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(pts);

  /* ---- the table materialises beneath the resolved council --------- */
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x33251a, roughness: 0.5, metalness: 0.3 });
  const table = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.11, 0.17, 96), woodMat);
  slab.position.y = -0.1; table.add(slab);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.05, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x463422, roughness: 0.42, metalness: 0.38 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.06; table.add(rim);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 0.9, 40), woodMat);
  column.position.y = -0.65; table.add(column);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a20, emissive: CORAL, emissiveIntensity: 0.08, roughness: 0.35, metalness: 0.25 });
  const cring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.045, 20, 140), ringMat);
  cring.rotation.x = -Math.PI / 2; cring.position.y = 0.005; table.add(cring);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.55, metalness: 0.18 });
  for (let i = 0; i < 4; i++) {
    const a = seatAngle(i);
    const place = new THREE.Group();
    place.position.set(Math.cos(a) * CHAIR_R, 0, Math.sin(a) * CHAIR_R);
    place.rotation.y = Math.PI / 2 - a;
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.12, 28), chairMat);
    cushion.position.y = -0.3; place.add(cushion);
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.78, 24, 1, true, -Math.PI / 3.1, (Math.PI * 2) / 3.1),
      new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.58, metalness: 0.18, side: THREE.DoubleSide }));
    back.position.y = 0.12; back.rotation.y = Math.PI / 2 + Math.PI / 3.4; place.add(back);
    table.add(place);
  }
  table.position.y = -6; // hidden below until the council resolves
  scene.add(table);

  /* ---- lights -------------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0xffe6cf, 0x140d08, 0.4));
  const key = new THREE.SpotLight(0xfff0dd, 8, 30, 0.8, 0.55, 1.1);
  key.position.set(0, 9.5, 3); key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const coralFill = new THREE.PointLight(CORAL, 0, 14);
  coralFill.position.set(0, 1.4, 0);
  scene.add(coralFill);

  /* ---- camera shots ----------------------------------------------------
     S1 [0–7.5]  inside the storm — fast low orbit, particles streaking by
     S2 [7.5–13] pull back + rise as the council resolves
     S3 [13–22]  hero frame, slow push at the verdict                   */
  function camAt(t) {
    if (t < 7.5) {
      const a = t * 0.5 - 1.2;
      const r = 5.0 + Math.sin(t * 0.5) * 0.4;
      camera.position.set(Math.cos(a) * r, 1.1 + Math.sin(t * 0.33) * 0.5, Math.sin(a) * r);
      camera.lookAt(0, 1.0, 0);
    } else if (t < 13) {
      const k = smooth(7.5, 13, t);
      const a = (7.5 * 0.5 - 1.2) + (t - 7.5) * lerp(0.5, 0.06, k);
      camera.position.set(
        Math.cos(a) * lerp(5.0, 8.0, k),
        lerp(1.1, 3.3, k),
        Math.sin(a) * lerp(5.0, 8.0, k));
      camera.lookAt(0, lerp(1.0, 0.15, k), 0);
    } else {
      const a = 2.62 + (t - 13) * 0.06;
      const push = smooth(14, 16.5, t);
      const r = 8.0 - push * 1.2;
      camera.position.set(Math.cos(a) * r, 3.3 - push * 0.4, Math.sin(a) * r);
      camera.lookAt(0, 0.15, 0);
    }
  }

  function renderAt(t) {
    camAt(t);

    // particles: swirl → figure targets
    const p = pgeo.attributes.position;
    for (let i = 0; i < N; i++) {
      const s = swirl[i];
      const th = s.ph + t * s.sp;
      const sx = Math.cos(th) * s.r;
      const sy = s.h + Math.sin(t * s.wob + s.ph * 2) * 0.5 + Math.sin(th * 2) * s.tilt;
      const sz = Math.sin(th) * s.r;
      const m = smooth(morphAt[i], morphAt[i] + 1.5, t);
      const breathe = Math.sin(t * 1.3 + (i % 4) * 1.7) * 0.018;
      p.array[i * 3] = lerp(sx, targets[i * 3], m);
      p.array[i * 3 + 1] = lerp(sy, targets[i * 3 + 1] + breathe, m);
      p.array[i * 3 + 2] = lerp(sz, targets[i * 3 + 2], m);
    }
    p.needsUpdate = true;
    // particles tighten and brighten as they become figures
    const resolved = smooth(8.5, 11.5, t);
    pts.material.size = lerp(0.085, 0.034, resolved);
    pts.material.opacity = 0.85 + resolved * 0.15;

    // the table rises to meet the resolved council
    table.position.y = lerp(-6, 0, smooth(9.0, 12.0, t));

    // verdict: ring + coral light
    const verdict = smooth(14, 16, t);
    ringMat.emissiveIntensity = 0.08 + resolved * 0.25 + verdict * 2.4;
    coralFill.intensity = verdict * 3.4;

    const fade = smooth(17.4, 18.8, t);
    renderer.toneMappingExposure = (1.0 + verdict * 0.15) * lerp(1, 0.12, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
