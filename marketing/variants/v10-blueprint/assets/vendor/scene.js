/* v10 "Blueprint" — the whole council room starts as a wireframe plan and
   solidifies into reality at consensus: first it's decided, then it's built. */
(function () {
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x140d09, 10, 30);
  const camera = new THREE.PerspectiveCamera(36, 1920 / 1080, 0.1, 120);

  const SEATCOLORS = [0x1e9c86, 0x7a57d1, 0xd9962a, 0x2f82c7];
  const CORAL = 0xe85d34;
  const LINE = 0xf1e2cc;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  /* ---- blueprint pairs: every object = wire lines + hidden solid ----
     pairs[] = { lines, lineMat, solid, solidMat, delay } — solidify is
     staggered by `delay` inside the build window.                      */
  const pairs = [];
  function addPair(geo, solidOpts, lineColor, delay, px, py, pz, ry) {
    const group = new THREE.Group();
    group.position.set(px || 0, py || 0, pz || 0);
    if (ry) group.rotation.y = ry;
    const solidMat = new THREE.MeshStandardMaterial(Object.assign({ transparent: true, opacity: 0 }, solidOpts));
    const solid = new THREE.Mesh(geo, solidMat);
    group.add(solid);
    const lineMat = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.7 });
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), lineMat);
    group.add(lines);
    scene.add(group);
    pairs.push({ lineMat, solidMat, delay });
    return group;
  }

  /* the council set ---------------------------------------------------- */
  addPair(new THREE.CylinderGeometry(2.05, 2.11, 0.17, 48),
    { color: 0xe6d6bd, roughness: 0.6, metalness: 0.08 }, LINE, 0.0, 0, -0.1, 0);
  addPair(new THREE.CylinderGeometry(0.36, 0.52, 0.9, 24),
    { color: 0xd9c6a8, roughness: 0.62, metalness: 0.08 }, LINE, 0.15, 0, -0.65, 0);
  addPair(new THREE.CylinderGeometry(0.95, 1.1, 0.15, 32),
    { color: 0xd9c6a8, roughness: 0.62, metalness: 0.08 }, LINE, 0.3, 0, -1.12, 0);
  addPair(new THREE.TorusGeometry(1.5, 0.05, 12, 64),
    { color: 0x8a4a2c, emissive: CORAL, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.2 },
    CORAL, 0.5, 0, 0.005, 0).rotation.x = -Math.PI / 2;

  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const x = Math.cos(a) * 2.62, z = Math.sin(a) * 2.62;
    const ry = Math.PI / 2 - a;
    // chair (cushion + back as one boxy hint, keeps line-count readable)
    addPair(new THREE.CylinderGeometry(0.36, 0.4, 0.12, 18),
      { color: 0xcdb795, roughness: 0.65, metalness: 0.05 }, LINE, 0.6 + i * 0.12,
      x, -0.3, z, ry);
    addPair(new THREE.BoxGeometry(0.66, 0.52, 0.09),
      { color: 0xcdb795, roughness: 0.65, metalness: 0.05 }, LINE, 0.7 + i * 0.12,
      x + Math.cos(a) * 0.26, 0.0, z + Math.sin(a) * 0.26, ry);
    // figure: body + head in persona color — wires are persona-colored too
    addPair(new THREE.CapsuleGeometry(0.235, 0.32, 4, 12),
      { color: SEATCOLORS[i], emissive: SEATCOLORS[i], emissiveIntensity: 0.5, roughness: 0.4 },
      SEATCOLORS[i], 1.0 + i * 0.16, x, 0.16, z, ry);
    addPair(new THREE.SphereGeometry(0.2, 14, 12),
      { color: SEATCOLORS[i], emissive: SEATCOLORS[i], emissiveIntensity: 0.5, roughness: 0.36 },
      SEATCOLORS[i], 1.1 + i * 0.16, x, 0.62, z, ry);
  }

  /* surrounding "planned structures" for depth ------------------------- */
  const protoStructs = [
    { g: new THREE.BoxGeometry(1.4, 3.2, 1.4), x: 6.4, z: -2.4 },
    { g: new THREE.BoxGeometry(1.1, 2.1, 1.1), x: -6.0, z: -3.4 },
    { g: new THREE.BoxGeometry(1.8, 4.4, 1.8), x: -7.4, z: 2.8 },
    { g: new THREE.BoxGeometry(1.2, 2.6, 1.2), x: 6.8, z: 3.6 },
    { g: new THREE.CylinderGeometry(0.9, 0.9, 3.4, 18), x: 2.2, z: -7.2 },
    { g: new THREE.CylinderGeometry(0.7, 0.7, 2.4, 18), x: -2.8, z: 7.0 },
  ];
  protoStructs.forEach((s, i) => {
    const h = s.g.parameters.height || s.g.parameters.radiusTop * 2 || 2;
    addPair(s.g, { color: 0xd9c6a8, roughness: 0.7, metalness: 0.06 }, LINE,
      1.6 + i * 0.22, s.x, (s.g.parameters.height || 2.4) / 2 - 1.2, s.z, i * 0.6);
  });

  /* blueprint floor grid ------------------------------------------------ */
  const gridGroup = new THREE.Group();
  const gmat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.16 });
  const gpts = [];
  for (let i = -12; i <= 12; i += 1.5) {
    gpts.push(new THREE.Vector3(i, 0, -12), new THREE.Vector3(i, 0, 12));
    gpts.push(new THREE.Vector3(-12, 0, i), new THREE.Vector3(12, 0, i));
  }
  const ggeo = new THREE.BufferGeometry().setFromPoints(gpts);
  gridGroup.add(new THREE.LineSegments(ggeo, gmat));
  gridGroup.position.y = -1.19;
  scene.add(gridGroup);
  // solid floor that appears under the built world
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2a1d12, roughness: 0.9, metalness: 0.02, transparent: true, opacity: 0 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(15, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  scene.add(floor);

  /* lights ---------------------------------------------------------------- */
  const hemi = new THREE.HemisphereLight(0xffe6cf, 0x140d08, 0.22);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xfff0dd, 4, 32, 0.85, 0.6, 1.1);
  key.position.set(2, 10, 4); key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const coralFill = new THREE.PointLight(CORAL, 0, 16);
  coralFill.position.set(0, 1.6, 0);
  scene.add(coralFill);

  /* ---- camera shots -------------------------------------------------------
     S1 [0–6]    high spiral descent over the plan
     S2 [6–13.5] low glide through the wireframe world (among structures)
     S3 [13.5–20] settle to the hero council frame while it solidifies
     S4 [20–26]  slow push under the lockup                                */
  function camAt(t) {
    if (t < 6) {
      const k = smooth(0, 6, t);
      const a = -0.7 + t * 0.12;
      camera.position.set(Math.cos(a) * lerp(11.5, 8.6, k), lerp(7.2, 4.2, k), Math.sin(a) * lerp(11.5, 8.6, k));
      camera.lookAt(0, -0.4, 0);
    } else if (t < 13.5) {
      const u = (t - 6) / 7.5;
      const a = 0.02 + u * 1.98;
      camera.position.set(Math.cos(a) * 6.4, 1.0 + Math.sin(u * Math.PI) * 0.35, Math.sin(a) * 6.4);
      camera.lookAt(0, 0.3, 0);
    } else if (t < 20) {
      const k = smooth(13.5, 16, t);
      const a = 2.0 + (t - 13.5) * lerp(0.153, 0.028, k);
      camera.position.set(
        Math.cos(a) * lerp(6.4, 7.6, k),
        lerp(1.0, 3.3, k),
        Math.sin(a) * lerp(6.4, 7.6, k));
      camera.lookAt(0, lerp(0.3, 0.12, k), 0);
    } else {
      const a = 2.39 + (t - 20) * 0.045;
      const k = (t - 20) / 6;
      camera.position.set(Math.cos(a) * (7.6 - k), 3.3 - k * 0.3, Math.sin(a) * (7.6 - k));
      camera.lookAt(0, 0.12, 0);
    }
  }

  /* solidify window: [14, 18.5], staggered by pair.delay (0..2.4) */
  function renderAt(t) {
    camAt(t);

    let builtAmt = 0;
    pairs.forEach((p) => {
      const t0 = 14 + p.delay * 1.6;
      const k = smooth(t0, t0 + 1.1, t);
      p.solidMat.opacity = k;
      p.lineMat.opacity = 0.7 * (1 - k) * (0.65 + 0.35 * Math.sin(t * 2.1 + p.delay * 7));
      builtAmt += k;
    });
    builtAmt /= pairs.length;

    // world light blooms as it becomes real
    hemi.intensity = 0.22 + builtAmt * 0.3;
    key.intensity = 4 + builtAmt * 2.2;
    coralFill.intensity = builtAmt * 3.4;
    floorMat.opacity = builtAmt * 0.85;
    gmat.opacity = 0.16 * (1 - builtAmt) + 0.02;

    const fade = smooth(20.2, 21.8, t);
    renderer.toneMappingExposure = (1.0 + builtAmt * 0.03) * lerp(1, 0.3, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
