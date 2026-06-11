/* v9 "Rotunda" — the council at dawn inside an open-air rotunda. Long
   shadows, a god-ray shaft, and a slow walk-in dolly between the columns. */
(function () {
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a1a16, 11, 30);
  const camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 120);

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
  const rand = mulberry32(990611);

  /* ---- floor + dais -------------------------------------------------- */
  const stone = new THREE.MeshStandardMaterial({ color: 0xcdb795, roughness: 0.85, metalness: 0.02 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0xb29c7c, roughness: 0.88, metalness: 0.02 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 80), stoneDark);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.0;
  scene.add(floor);
  // three dais steps up to the table
  [[4.6, -0.84], [3.9, -0.6], [3.2, -0.36]].forEach(([r, y]) => {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.12, 0.24, 72), stone);
    step.position.y = y;
    scene.add(step);
  });

  /* ---- columns + entablature ring ------------------------------------ */
  const COLR = 6.2, NCOL = 10;
  const colMat = new THREE.MeshStandardMaterial({ color: 0xd8c4a2, roughness: 0.78, metalness: 0.02 });
  const sunDir = new THREE.Vector3(-1, 0, 0.35).normalize(); // sun low in +x → shadows toward −x
  for (let i = 0; i < NCOL; i++) {
    const a = (i / NCOL) * Math.PI * 2 + Math.PI / NCOL;
    const x = Math.cos(a) * COLR, z = Math.sin(a) * COLR;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 4.8, 24), colMat);
    col.position.set(x, 1.16, z);
    scene.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.18, 0.74), colMat);
    cap.position.set(x, 3.62, z);
    scene.add(cap);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), colMat);
    foot.position.set(x, -1.16 + 0.9, z); // base on the outer floor
    foot.position.y = -0.9;
    scene.add(foot);
    // long dawn shadow: stretched dark plane from each column away from the sun
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 7.5),
      new THREE.MeshBasicMaterial({ color: 0x140c08, transparent: true, opacity: 0.32, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(x - sunDir.x * 3.9, -0.985, z + sunDir.z * 3.9);
    sh.rotation.z = Math.atan2(-sunDir.x, sunDir.z) + Math.PI / 2;
    scene.add(sh);
  }
  // entablature ring on top
  const ent = new THREE.Mesh(new THREE.TorusGeometry(COLR, 0.34, 14, 90), colMat);
  ent.rotation.x = Math.PI / 2;
  ent.position.y = 3.95;
  scene.add(ent);

  /* ---- council table + seated figures -------------------------------- */
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4128, roughness: 0.5, metalness: 0.16 });
  const table = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.91, 0.17, 96), woodMat);
  slab.position.y = -0.1; table.add(slab);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.05, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x6d5232, roughness: 0.42, metalness: 0.3 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.06; table.add(rim);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 0.6, 40), woodMat);
  column.position.y = -0.45; table.add(column);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x4a3322, emissive: CORAL, emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.3 });
  const cring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.045, 20, 140), ringMat);
  cring.rotation.x = -Math.PI / 2; cring.position.y = 0.005; table.add(cring);
  table.position.y = -0.1;
  scene.add(table);

  const chairMat = new THREE.MeshStandardMaterial({ color: 0x6a4f30, roughness: 0.55, metalness: 0.12 });
  const figures = [];
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const place = new THREE.Group();
    place.position.set(Math.cos(a) * 2.42, -0.12, Math.sin(a) * 2.42);
    place.rotation.y = Math.PI / 2 - a;
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.12, 28), chairMat);
    cushion.position.y = -0.3; place.add(cushion);
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.74, 24, 1, true, -Math.PI / 3.1, (Math.PI * 2) / 3.1),
      new THREE.MeshStandardMaterial({ color: 0x6a4f30, roughness: 0.58, metalness: 0.12, side: THREE.DoubleSide }));
    back.position.y = 0.1; back.rotation.y = Math.PI / 2 + Math.PI / 3.4; place.add(back);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.7, 16), chairMat);
    base.position.y = -0.68; place.add(base);
    const mat = new THREE.MeshStandardMaterial({
      color: SEATCOLORS[i], emissive: SEATCOLORS[i], emissiveIntensity: 0.22, roughness: 0.4, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.3, 8, 20), mat);
    body.position.set(0, 0.14, -0.03);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.185, 24, 24), mat);
    head.position.set(0, 0.57, -0.05);
    place.add(body, head);
    // long figure shadows toward −x
    const fsh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6),
      new THREE.MeshBasicMaterial({ color: 0x140c08, transparent: true, opacity: 0.26, depthWrite: false }));
    fsh.rotation.x = -Math.PI / 2;
    fsh.rotation.z = Math.PI / 2;
    fsh.position.set(-1.5, -0.04, 0);
    place.add(fsh);
    scene.add(place);
    figures.push({ mat });
  }

  /* ---- god-ray shaft + dust ------------------------------------------ */
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.6, 9, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc28a, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  shaft.position.set(2.6, 3.4, -0.9);
  shaft.rotation.z = 0.55;
  shaft.rotation.x = 0.1;
  scene.add(shaft);

  const COUNT = 160;
  const pos = new Float32Array(COUNT * 3);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    const r = 0.6 + rand() * 5.4, th = rand() * Math.PI * 2;
    pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = -0.6 + rand() * 4.4; pos[i * 3 + 2] = Math.sin(th) * r;
    seeds.push({ r, th, h: pos[i * 3 + 1], sp: 0.03 + rand() * 0.07, ph: rand() * 6.28 });
  }
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(mgeo, new THREE.PointsMaterial({
    color: 0xffd9ad, size: 0.04, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false })));

  /* ---- dawn light ----------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x2c1c12, 0.5));
  const sun = new THREE.DirectionalLight(0xffb37a, 1.7);
  sun.position.set(9, 2.6, -3.2);
  scene.add(sun);
  const cool = new THREE.DirectionalLight(0x9db6d8, 0.32);
  cool.position.set(-6, 5, 5);
  scene.add(cool);
  const coralFill = new THREE.PointLight(CORAL, 0, 10);
  coralFill.position.set(0, 0.9, 0);
  scene.add(coralFill);

  /* ---- camera shots ----------------------------------------------------
     S1 [0–7]   walk-in dolly: between two columns, toward the table
     S2 [7–14]  slow 70° arc around the council at eye height
     S3 [14–20] rise + push as the ring ignites (lockup overlays)      */
  function camAt(t) {
    if (t < 7) {
      const k = smooth(0, 7, t);
      const dir = 1.257; // squarely between two columns
      const d = lerp(11.5, 5.6, k);
      camera.position.set(Math.cos(dir) * d, lerp(1.05, 1.5, k), Math.sin(dir) * d);
      camera.lookAt(0, 0.45, 0);
    } else if (t < 14) {
      const k = smooth(7, 8.2, t);
      const a = 1.257 + (t - 7) * 0.155;
      const r = lerp(5.6, 6.0, k);
      camera.position.set(Math.cos(a) * r, lerp(1.5, 2.2, k), Math.sin(a) * r);
      camera.lookAt(0, 0.35, 0);
    } else {
      const k = smooth(14, 19, t);
      const a = 1.257 + 7 * 0.155 + (t - 14) * 0.075;
      camera.position.set(
        Math.cos(a) * lerp(6.0, 4.9, k),
        lerp(2.2, 3.1, k),
        Math.sin(a) * lerp(6.0, 4.9, k));
      camera.lookAt(0, 0.25, 0);
    }
  }

  function renderAt(t) {
    camAt(t);

    // figures warm into the dawn; gentle breathing
    for (let i = 0; i < 4; i++) {
      const wake = smooth(2 + i * 0.6, 4 + i * 0.6, t);
      figures[i].mat.emissiveIntensity = 0.22 + wake * 0.3 + smooth(14, 16, t) * 0.5;
    }

    // the ring ignites for the verdict
    const ignite = smooth(13.5, 15.5, t);
    ringMat.emissiveIntensity = 0.25 + ignite * 2.4 + Math.sin(t * 4.4) * 0.1 * ignite;
    coralFill.intensity = ignite * 3.2;

    // god ray breathes; sun climbs a touch over the piece
    shaft.material.opacity = 0.1 + Math.sin(t * 0.7) * 0.02 + ignite * 0.05;
    sun.position.y = 2.6 + t * 0.045;
    sun.intensity = 1.7 + smooth(0, 8, t) * 0.25;

    // dust
    const mp = mgeo.attributes.position;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i], th = s.th + t * s.sp;
      mp.array[i * 3] = Math.cos(th) * s.r;
      mp.array[i * 3 + 1] = s.h + Math.sin(t * 0.35 + s.ph) * 0.2;
      mp.array[i * 3 + 2] = Math.sin(th) * s.r;
    }
    mp.needsUpdate = true;

    const fade = smooth(15.8, 17.4, t);
    renderer.toneMappingExposure = (1.0 + ignite * 0.1) * lerp(1, 0.3, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
